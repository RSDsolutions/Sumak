create or replace function public.academy_can_manage_course(p_course_id uuid)
returns boolean
language plpgsql
security definer
volatile
set search_path = public
as $$
begin
  return public.is_academy_admin()
    or exists (
      select 1 from public.academy_courses
      where id = p_course_id and instructor_id = auth.uid()
    );
end;
$$;

create or replace function public.academy_can_manage_module(p_module_id uuid)
returns boolean
language plpgsql
security definer
volatile
set search_path = public
as $$
begin
  return exists (
    select 1 from public.academy_modules m
    where m.id = p_module_id and public.academy_can_manage_course(m.course_id)
  );
end;
$$;

create or replace function public.academy_can_manage_lesson(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
volatile
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.academy_lessons l
    join public.academy_modules m on m.id = l.module_id
    where l.id = p_lesson_id and public.academy_can_manage_course(m.course_id)
  );
end;
$$;

create or replace function public.academy_can_manage_assessment(p_assessment_id uuid)
returns boolean
language plpgsql
security definer
volatile
set search_path = public
as $$
begin
  return exists (
    select 1 from public.academy_assessments a
    where a.id = p_assessment_id and public.academy_can_manage_course(a.course_id)
  );
end;
$$;

revoke all on function public.academy_can_manage_course(uuid) from public;
revoke all on function public.academy_can_manage_module(uuid) from public;
revoke all on function public.academy_can_manage_lesson(uuid) from public;
revoke all on function public.academy_can_manage_assessment(uuid) from public;
grant execute on function public.academy_can_manage_course(uuid) to authenticated;
grant execute on function public.academy_can_manage_module(uuid) to authenticated;
grant execute on function public.academy_can_manage_lesson(uuid) to authenticated;
grant execute on function public.academy_can_manage_assessment(uuid) to authenticated;

-- Categories remain an Academy-admin responsibility.
drop policy if exists "Categorías: admin gestiona" on public.academy_categories;
create policy "Categorías: admin gestiona" on public.academy_categories
  for all using (public.is_academy_admin())
  with check (public.is_academy_admin());

drop policy if exists "Módulos: lectura con acceso al curso" on public.academy_modules;
create policy "Módulos: lectura con acceso al curso" on public.academy_modules
  for select using (public.has_course_access(course_id));

drop policy if exists "Cursos: staff gestiona" on public.academy_courses;
create policy "Cursos: staff gestiona" on public.academy_courses
  for all using (public.academy_can_manage_course(id))
  with check (public.is_academy_admin() or instructor_id = auth.uid());

drop policy if exists "Módulos: staff gestiona" on public.academy_modules;
create policy "Módulos: staff gestiona" on public.academy_modules
  for all using (public.academy_can_manage_course(course_id))
  with check (public.academy_can_manage_course(course_id));

drop policy if exists "Lecciones: staff gestiona" on public.academy_lessons;
create policy "Lecciones: staff gestiona" on public.academy_lessons
  for all using (public.academy_can_manage_module(module_id))
  with check (public.academy_can_manage_module(module_id));

drop policy if exists "Recursos: staff gestiona" on public.academy_resources;
create policy "Recursos: staff gestiona" on public.academy_resources
  for all using (public.academy_can_manage_lesson(lesson_id))
  with check (public.academy_can_manage_lesson(lesson_id));

drop policy if exists "Evaluaciones: staff gestiona" on public.academy_assessments;
create policy "Evaluaciones: staff gestiona" on public.academy_assessments
  for all using (public.academy_can_manage_course(course_id))
  with check (public.academy_can_manage_course(course_id));

drop policy if exists "Preguntas: staff gestiona" on public.academy_questions;
create policy "Preguntas: staff gestiona" on public.academy_questions
  for all using (public.academy_can_manage_assessment(assessment_id))
  with check (public.academy_can_manage_assessment(assessment_id));

drop policy if exists "Opciones: staff gestiona" on public.academy_question_options;
create policy "Opciones: staff gestiona" on public.academy_question_options
  for all using (
    exists (
      select 1
      from public.academy_questions q
      where q.id = question_id and public.academy_can_manage_assessment(q.assessment_id)
    )
  )
  with check (
    exists (
      select 1
      from public.academy_questions q
      where q.id = question_id and public.academy_can_manage_assessment(q.assessment_id)
    )
  );

comment on function public.academy_can_manage_course(uuid) is 'Permite a admin Academy o al instructor asignado gestionar el curso.';
