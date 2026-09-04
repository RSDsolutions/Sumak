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
  where m.course_id = p_course_id and m.is_published and l.is_published;
  select count(*) into v_completed_lessons
  from public.academy_progress p
  join public.academy_lessons l on l.id = p.lesson_id
  join public.academy_modules m on m.id = l.module_id
  where p.user_id = p_user_id and p.course_id = p_course_id
    and m.course_id = p_course_id and m.is_published and l.is_published and p.status = 'completed';
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

create or replace function public.update_academy_progress(
  p_lesson_id uuid,
  p_course_id uuid,
  p_status text,
  p_percentage numeric,
  p_playback_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_progress public.academy_progress;
  v_now timestamptz := now();
begin
  if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
  if p_status not in ('in_progress', 'completed') or p_percentage < 0 or p_percentage > 100 then raise exception 'Progreso inválido' using errcode = 'P0002'; end if;
  if p_playback_seconds < 0 then raise exception 'Tiempo de reproducción inválido' using errcode = 'P0003'; end if;
  if not exists (select 1 from public.academy_lessons l join public.academy_modules m on m.id = l.module_id where l.id = p_lesson_id and m.course_id = p_course_id and l.is_published and m.is_published and public.has_course_access(p_course_id)) then raise exception 'Lección no disponible' using errcode = 'P0004'; end if;
  insert into public.academy_progress (user_id, lesson_id, course_id, status, progress_percentage, started_at, completed_at, last_accessed_at, playback_seconds)
  values (v_user_id, p_lesson_id, p_course_id, p_status, p_percentage, v_now, case when p_status = 'completed' then v_now end, v_now, p_playback_seconds)
  on conflict (user_id, lesson_id) do update set
    course_id = excluded.course_id,
    status = case when public.academy_progress.status = 'completed' then 'completed' else excluded.status end,
    progress_percentage = greatest(public.academy_progress.progress_percentage, excluded.progress_percentage),
    completed_at = case when public.academy_progress.completed_at is not null then public.academy_progress.completed_at when excluded.status = 'completed' then excluded.completed_at else null end,
    last_accessed_at = excluded.last_accessed_at,
    playback_seconds = greatest(public.academy_progress.playback_seconds, excluded.playback_seconds)
  returning * into v_progress;
  update public.academy_enrollments set last_accessed_at = v_now, started_at = coalesce(started_at, v_now) where user_id = v_user_id and course_id = p_course_id;
  perform public.complete_academy_course_if_eligible(p_course_id, v_user_id);
  return to_jsonb(v_progress);
end;
$$;

grant execute on function public.update_academy_progress(uuid, uuid, text, numeric, integer) to authenticated;