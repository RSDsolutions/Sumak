-- ============================================================
-- SUMAK - Migration 20260904111500 - Academy Completion Engine Improvements
-- ============================================================
-- Modifica complete_academy_course_if_eligible para respetar is_required = true
-- ============================================================

create or replace function public.complete_academy_course_if_eligible(p_course_id uuid, p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_enrollment public.academy_enrollments;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_total_assessments integer;
  v_passed_assessments integer;
begin
  if p_user_id is null or p_user_id <> auth.uid() and not public.is_academy_staff() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;

  select * into v_enrollment
  from public.academy_enrollments
  where user_id = p_user_id and course_id = p_course_id and status in ('active', 'completed')
  for update;
  if not found then
    raise exception 'Inscripción no disponible' using errcode = 'P0002';
  end if;
  if v_enrollment.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true);
  end if;

  select count(*) into v_total_lessons
  from public.academy_lessons l
  join public.academy_modules m on m.id = l.module_id
  where m.course_id = p_course_id and m.is_published and l.is_published and l.is_required = true;
  
  select count(*) into v_completed_lessons
  from public.academy_progress p
  join public.academy_lessons l on l.id = p.lesson_id
  join public.academy_modules m on m.id = l.module_id
  where p.user_id = p_user_id and p.course_id = p_course_id
    and m.course_id = p_course_id and m.is_published and l.is_published and l.is_required = true and p.status = 'completed';
    
  select count(*) into v_total_assessments
  from public.academy_assessments
  where course_id = p_course_id and is_published;
  
  select count(distinct a.assessment_id) into v_passed_assessments
  from public.academy_attempts a
  where a.user_id = p_user_id and a.passed = true and a.status = 'graded'
    and exists (select 1 from public.academy_assessments x where x.id = a.assessment_id and x.course_id = p_course_id and x.is_published);

  if v_total_lessons = 0 or v_completed_lessons < v_total_lessons or v_passed_assessments < v_total_assessments then
    return jsonb_build_object('completed', false, 'lessons', jsonb_build_object('completed', v_completed_lessons, 'total', v_total_lessons), 'assessments', jsonb_build_object('passed', v_passed_assessments, 'total', v_total_assessments));
  end if;

  update public.academy_enrollments
  set status = 'completed', progress_percentage = 100, completed_at = coalesce(completed_at, now())
  where id = v_enrollment.id;
  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (p_user_id, 'course_completed', 'enrollment', v_enrollment.id, jsonb_build_object('course_id', p_course_id));
  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

revoke all on function public.complete_academy_course_if_eligible(uuid, uuid) from public;
grant execute on function public.complete_academy_course_if_eligible(uuid, uuid) to authenticated;
