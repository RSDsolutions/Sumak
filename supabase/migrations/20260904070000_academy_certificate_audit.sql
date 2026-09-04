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
  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (v_user_id, 'certificate_issued', 'certificate', v_certificate.id, jsonb_build_object('course_id', p_course_id, 'certificate_number', v_certificate.certificate_number));
  return to_jsonb(v_certificate);
end;
$$;

grant execute on function public.issue_academy_course_certificate(uuid) to authenticated;