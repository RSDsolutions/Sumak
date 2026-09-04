-- ============================================================
-- SUMAK - Migration 20260904110000 - Academy Lesson Improvements
-- ============================================================
-- Agrega columna is_required a academy_lessons (obligatoria/opcional).
-- El resto de campos necesarios para las mejoras ya existen en la BD.
-- ============================================================

-- Agregar is_required a academy_lessons (por defecto true = obligatoria)
alter table public.academy_lessons
  add column if not exists is_required boolean not null default true;

comment on column public.academy_lessons.is_required is
  'Si true, la lección es obligatoria para completar el curso. Si false, es opcional.';

-- Agregar explanation a academy_questions para retroalimentación post-respuesta
alter table public.academy_questions
  add column if not exists explanation text;

comment on column public.academy_questions.explanation is
  'Explicación que se muestra al estudiante después de responder (retroalimentación).';
