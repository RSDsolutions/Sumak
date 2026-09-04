-- ============================================================
-- SUMAK - Migration 20260904100000 - Fix academy permissions
-- ============================================================
-- Asegurar que authenticated puede ejecutar is_admin() tras el revoke a public
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_operaciones_or_admin() to authenticated;

-- Asegurar permisos base sobre las tablas de academy (el RLS controla el acceso real)
grant select, insert, update, delete on table public.academy_courses to authenticated;
grant select, insert, update, delete on table public.academy_modules to authenticated;
grant select, insert, update, delete on table public.academy_lessons to authenticated;
grant select, insert, update, delete on table public.academy_resources to authenticated;
grant select, insert, update, delete on table public.academy_assessments to authenticated;
grant select, insert, update, delete on table public.academy_questions to authenticated;
grant select, insert, update, delete on table public.academy_question_options to authenticated;
grant select, insert, update, delete on table public.academy_progress to authenticated;
grant select, insert, update, delete on table public.academy_certificates to authenticated;
grant select, insert, update, delete on table public.academy_enrollments to authenticated;
grant select, insert, update, delete on table public.academy_roles to authenticated;
