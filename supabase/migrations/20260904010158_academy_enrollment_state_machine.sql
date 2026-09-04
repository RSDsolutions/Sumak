alter table public.academy_enrollments
	add column if not exists requested_at timestamptz not null default now(),
	add column if not exists approved_at timestamptz,
	add column if not exists approved_by uuid references auth.users(id) on delete set null,
	add column if not exists activated_at timestamptz,
	add column if not exists expires_at timestamptz,
	add column if not exists rejected_at timestamptz,
	add column if not exists rejection_reason text,
	add column if not exists payment_status text not null default 'not_required';

alter table public.academy_enrollments drop constraint if exists academy_enrollments_status_check;
alter table public.academy_enrollments add constraint academy_enrollments_status_check check (status in ('pending', 'approved', 'payment_pending', 'active', 'completed', 'expired', 'rejected', 'cancelled', 'dropped', 'suspended'));

create index if not exists academy_enrollments_expires_idx on public.academy_enrollments (expires_at) where status = 'active';

create or replace function public.has_course_access(p_course_id uuid)
returns boolean language plpgsql security definer volatile set search_path = public as $$
declare v_mode text; v_instructor_id uuid;
begin
	if public.is_academy_staff() then return true; end if;
	select access_mode, instructor_id into v_mode, v_instructor_id from public.academy_courses where id = p_course_id and status = 'published';
	if not found then return false; end if;
	if v_instructor_id = auth.uid() then return true; end if;
	if v_mode = 'public' then return auth.uid() is not null; end if;
	if v_mode = 'sumak_exclusive' and exists (select 1 from public.profiles where id = auth.uid() and estado = 'activo') then return true; end if;
	return exists (select 1 from public.academy_enrollments where user_id = auth.uid() and course_id = p_course_id and status = 'active' and expires_at > now());
end;
$$;

create or replace function public.request_academy_enrollment(p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_course public.academy_courses; v_enrollment public.academy_enrollments;
begin
	if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
	select * into v_course from public.academy_courses where id = p_course_id and status = 'published';
	if not found then raise exception 'Curso no disponible' using errcode = 'P0002'; end if;
	select * into v_enrollment from public.academy_enrollments where user_id = v_user_id and course_id = p_course_id;
	if found then return jsonb_build_object('ok', true, 'already_exists', true, 'enrollment', to_jsonb(v_enrollment)); end if;
	insert into public.academy_enrollments(user_id, course_id, status, payment_status) values(v_user_id, p_course_id, 'pending', case when coalesce(v_course.price, 0) > 0 then 'unpaid' else 'not_required' end) returning * into v_enrollment;
	insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata) values(v_user_id, 'enrollment_requested', 'enrollment', v_enrollment.id, jsonb_build_object('course_id', p_course_id));
	return jsonb_build_object('ok', true, 'enrollment', to_jsonb(v_enrollment));
end;
$$;
grant execute on function public.request_academy_enrollment(uuid) to authenticated;

create or replace function public.review_academy_enrollment(p_enrollment_id uuid, p_decision text, p_rejection_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_enrollment public.academy_enrollments; v_course public.academy_courses; v_status text; v_payment text;
begin
	if v_actor is null or not public.is_academy_staff() then raise exception 'No autorizado' using errcode = 'P0001'; end if;
	if p_decision not in ('approve', 'reject') then raise exception 'Decisión inválida' using errcode = 'P0002'; end if;
	if p_decision = 'reject' and length(trim(coalesce(p_rejection_reason, ''))) < 5 then raise exception 'El rechazo requiere un motivo' using errcode = 'P0003'; end if;
	select * into v_enrollment from public.academy_enrollments where id = p_enrollment_id and status = 'pending' for update;
	if not found then raise exception 'Solicitud no disponible' using errcode = 'P0004'; end if;
	select * into v_course from public.academy_courses where id = v_enrollment.course_id;
	if p_decision = 'reject' then v_status := 'rejected'; v_payment := v_enrollment.payment_status;
	elsif coalesce(v_course.price, 0) > 0 then v_status := 'payment_pending'; v_payment := 'unpaid';
	else v_status := 'active'; v_payment := 'not_required'; end if;
	update public.academy_enrollments set status = v_status, payment_status = v_payment, approved_at = case when p_decision = 'approve' then now() end, approved_by = case when p_decision = 'approve' then v_actor end, rejected_at = case when p_decision = 'reject' then now() end, rejection_reason = case when p_decision = 'reject' then trim(p_rejection_reason) end, activated_at = case when v_status = 'active' then now() end, expires_at = case when v_status = 'active' then now() + interval '3 months' end where id = p_enrollment_id returning * into v_enrollment;
	insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata) values(v_actor, case when p_decision = 'approve' then 'enrollment_approved' else 'enrollment_rejected' end, 'enrollment', p_enrollment_id, jsonb_build_object('status', v_status));
	return to_jsonb(v_enrollment);
end;
$$;
grant execute on function public.review_academy_enrollment(uuid, text, text) to authenticated;

create or replace function public.expire_academy_enrollments()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
	update public.academy_enrollments set status = 'expired' where status = 'active' and expires_at is not null and expires_at <= now();
	get diagnostics v_count = row_count;
	return v_count;
end;
$$;
revoke all on function public.expire_academy_enrollments() from public;

create or replace function public.has_course_access(p_course_id uuid)
returns boolean language plpgsql security definer volatile set search_path = public as $$
declare v_instructor_id uuid;
begin
	if public.is_academy_staff() then return true; end if;
	select instructor_id into v_instructor_id from public.academy_courses where id = p_course_id and status = 'published';
	if not found then return false; end if;
	if v_instructor_id = auth.uid() then return true; end if;
	return exists (select 1 from public.academy_enrollments where user_id = auth.uid() and course_id = p_course_id and status in ('active', 'completed') and (status = 'completed' or expires_at > now()));
end;
$$;

create or replace function public.enroll_academy_program(p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_program public.academy_programs; v_enrollment public.academy_program_enrollments;
begin
	if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
	select * into v_program from public.academy_programs where id = p_program_id and status = 'published';
	if not found then raise exception 'Programa no disponible' using errcode = 'P0002'; end if;
	if v_program.access_mode = 'sumak_exclusive' and not exists (select 1 from public.profiles where id = v_user_id and estado = 'activo') then raise exception 'Usuario no elegible' using errcode = 'P0003'; end if;
	if v_program.access_mode in ('assigned', 'hidden') then raise exception 'Programa no disponible para inscripción' using errcode = 'P0004'; end if;
	insert into public.academy_program_enrollments(user_id, program_id, status) values(v_user_id, p_program_id, 'active') on conflict(user_id, program_id) do update set status = case when public.academy_program_enrollments.status = 'dropped' then 'active' else public.academy_program_enrollments.status end returning * into v_enrollment;
	insert into public.academy_enrollments(user_id, course_id, status, payment_status)
	select v_user_id, pc.course_id, 'pending', case when coalesce(c.price, 0) > 0 then 'unpaid' else 'not_required' end
	from public.academy_program_courses pc join public.academy_courses c on c.id = pc.course_id
	where pc.program_id = p_program_id and c.status = 'published'
	on conflict(user_id, course_id) do nothing;
	return to_jsonb(v_enrollment);
end;
$$;
