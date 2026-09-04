create or replace function public.complete_academy_program_if_eligible(p_program_id uuid, p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_enrollment public.academy_program_enrollments;
  v_required integer;
  v_completed integer;
begin
  if p_user_id is null or p_user_id <> auth.uid() and not public.is_academy_staff() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  select * into v_enrollment from public.academy_program_enrollments
  where program_id = p_program_id and user_id = p_user_id and status in ('active', 'completed') for update;
  if not found then return jsonb_build_object('completed', false, 'reason', 'not_enrolled'); end if;
  if v_enrollment.status = 'completed' then return jsonb_build_object('completed', true, 'already_completed', true); end if;
  select count(*) into v_required from public.academy_program_courses where program_id = p_program_id and is_required;
  select count(*) into v_completed from public.academy_program_courses pc
  join public.academy_enrollments e on e.course_id = pc.course_id and e.user_id = p_user_id and e.status = 'completed'
  where pc.program_id = p_program_id and pc.is_required;
  if v_required = 0 or v_completed < v_required then
    return jsonb_build_object('completed', false, 'completed_courses', v_completed, 'required_courses', v_required);
  end if;
  update public.academy_program_enrollments set status = 'completed', completed_at = coalesce(completed_at, now()) where id = v_enrollment.id;
  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (p_user_id, 'program_completed', 'program_enrollment', v_enrollment.id, jsonb_build_object('program_id', p_program_id));
  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

revoke all on function public.complete_academy_program_if_eligible(uuid, uuid) from public;
grant execute on function public.complete_academy_program_if_eligible(uuid, uuid) to authenticated;

create or replace function public.issue_academy_course_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_course public.academy_courses;
  v_certificate public.academy_certificates;
  v_name text;
  v_enrollment public.academy_enrollments;
begin
  if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
  select * into v_course from public.academy_courses where id = p_course_id and status = 'published' and generates_certificate;
  if not found then raise exception 'Curso no elegible para certificado' using errcode = 'P0002'; end if;
  perform public.complete_academy_course_if_eligible(p_course_id, v_user_id);
  select * into v_enrollment from public.academy_enrollments where user_id = v_user_id and course_id = p_course_id;
  if not found or v_enrollment.status <> 'completed' then raise exception 'El curso aún no está completado' using errcode = 'P0003'; end if;
  select nombre_completo into v_name from public.profiles where id = v_user_id;
  insert into public.academy_certificates (user_id, course_id, certificate_number, participant_name, course_name)
  values (v_user_id, p_course_id, public.academy_next_certificate_number(), coalesce(v_name, 'Participante'), v_course.title)
  on conflict (user_id, course_id) do update set course_name = excluded.course_name
  returning * into v_certificate;
  return to_jsonb(v_certificate);
end;
$$;

grant execute on function public.issue_academy_course_certificate(uuid) to authenticated;

create or replace function public.academy_complete_programs_after_course()
returns trigger
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_program_id uuid;
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    for v_program_id in select program_id from public.academy_program_courses where course_id = new.course_id and is_required loop
      perform public.complete_academy_program_if_eligible(v_program_id, new.user_id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists academy_program_completion_after_course on public.academy_enrollments;
create trigger academy_program_completion_after_course
  after update of status on public.academy_enrollments
  for each row execute function public.academy_complete_programs_after_course();
