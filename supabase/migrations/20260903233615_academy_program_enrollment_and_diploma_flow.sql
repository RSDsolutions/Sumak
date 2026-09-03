create table if not exists public.academy_program_enrollments (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	program_id uuid not null references public.academy_programs(id) on delete cascade,
	status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
	enrolled_at timestamptz not null default now(),
	completed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique(user_id, program_id)
);

create index if not exists academy_program_enrollments_user_idx on public.academy_program_enrollments(user_id);
create index if not exists academy_program_enrollments_program_idx on public.academy_program_enrollments(program_id);

drop trigger if exists academy_program_enrollments_updated_at on public.academy_program_enrollments;
create trigger academy_program_enrollments_updated_at before update on public.academy_program_enrollments for each row execute function public.academy_set_updated_at();

alter table public.academy_program_enrollments enable row level security;
drop policy if exists "Matrículas programa: lectura propia" on public.academy_program_enrollments;
create policy "Matrículas programa: lectura propia" on public.academy_program_enrollments for select using (user_id = auth.uid() or public.is_academy_staff());
drop policy if exists "Matrículas programa: staff gestiona" on public.academy_program_enrollments;
create policy "Matrículas programa: staff gestiona" on public.academy_program_enrollments for all using (public.is_academy_staff()) with check (public.is_academy_staff());

create or replace function public.enroll_academy_program(p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
	v_user_id uuid := auth.uid();
	v_program public.academy_programs;
	v_enrollment public.academy_program_enrollments;
begin
	if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
	select * into v_program from public.academy_programs where id = p_program_id and status = 'published';
	if not found then raise exception 'Programa no disponible' using errcode = 'P0002'; end if;
	if v_program.access_mode = 'sumak_exclusive' and not exists (select 1 from public.profiles where id = v_user_id and estado = 'activo') then raise exception 'Usuario no elegible' using errcode = 'P0003'; end if;
	if v_program.access_mode in ('assigned', 'hidden') then raise exception 'Programa no disponible para inscripción' using errcode = 'P0004'; end if;

	insert into public.academy_program_enrollments(user_id, program_id, status)
	values(v_user_id, p_program_id, 'active')
	on conflict(user_id, program_id) do update set status = case when public.academy_program_enrollments.status = 'dropped' then 'active' else public.academy_program_enrollments.status end
	returning * into v_enrollment;

	insert into public.academy_enrollments(user_id, course_id, status)
	select v_user_id, pc.course_id, 'active'
	from public.academy_program_courses pc
	join public.academy_courses c on c.id = pc.course_id
	where pc.program_id = p_program_id and c.status = 'published' and c.access_mode in ('public', 'free_registered', 'sumak_exclusive')
	on conflict(user_id, course_id) do nothing;
	return to_jsonb(v_enrollment);
end;
$$;

grant execute on function public.enroll_academy_program(uuid) to authenticated;
revoke insert, update, delete on public.academy_program_enrollments from authenticated;

create or replace function public.get_my_program_progress(p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
	v_user_id uuid := auth.uid();
	v_required integer;
	v_completed integer;
	v_percentage numeric(5,2);
	v_courses jsonb;
begin
	if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
	if not exists (select 1 from public.academy_programs where id = p_program_id and status = 'published') then raise exception 'Programa no disponible' using errcode = 'P0002'; end if;
	select count(*) into v_required from public.academy_program_courses where program_id = p_program_id and is_required;
	select count(*) into v_completed from public.academy_program_courses pc join public.academy_enrollments e on e.course_id = pc.course_id and e.user_id = v_user_id and e.status = 'completed' where pc.program_id = p_program_id and pc.is_required;
	v_percentage := case when v_required = 0 then 0 else round((v_completed::numeric / v_required) * 100, 2) end;
	select coalesce(jsonb_agg(jsonb_build_object('course_id', pc.course_id, 'title', c.title, 'is_required', pc.is_required, 'status', coalesce(e.status, 'not_enrolled'), 'progress_percentage', coalesce(e.progress_percentage, 0)) order by pc.sort_order), '[]'::jsonb) into v_courses
	from public.academy_program_courses pc join public.academy_courses c on c.id = pc.course_id left join public.academy_enrollments e on e.course_id = pc.course_id and e.user_id = v_user_id where pc.program_id = p_program_id;
	return jsonb_build_object('program_id', p_program_id, 'required_courses', v_required, 'completed_courses', v_completed, 'percentage', v_percentage, 'eligible', v_required > 0 and v_percentage >= (select completion_percentage_required from public.academy_programs where id = p_program_id), 'courses', v_courses);
end;
$$;
