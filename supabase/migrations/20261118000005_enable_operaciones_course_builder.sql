-- =============================================================================
-- MIGRACIÓN: 20261118000005_enable_operaciones_course_builder.sql
-- DESCRIPCIÓN:
--   Habilita a la secretaria operacional (`rol = 'operaciones'`,
--   `public.is_operaciones_or_admin()`) para crear, editar y publicar cursos,
--   módulos, lecciones, recursos, evaluaciones y programas de SUMAK Academy.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_academy_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    public.is_admin()
    OR public.is_operaciones_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.academy_roles
      WHERE user_id = auth.uid()
        AND role = 'academy_admin'
        AND revoked_at IS NULL
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_can_manage_course(p_course_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.is_academy_admin()
    OR public.is_operaciones_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.academy_courses
      WHERE id = p_course_id AND instructor_id = auth.uid()
    );
END;
$$;

DROP POLICY IF EXISTS "Admin e instructores pueden subir recursos" ON storage.objects;
CREATE POLICY "Admin e instructores pueden subir recursos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'academy-resources'
    AND public.is_academy_staff()
  );

DROP POLICY IF EXISTS "Admin e instructores pueden actualizar recursos" ON storage.objects;
CREATE POLICY "Admin e instructores pueden actualizar recursos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'academy-resources'
    AND public.is_academy_staff()
  )
  WITH CHECK (
    bucket_id = 'academy-resources'
    AND public.is_academy_staff()
  );

DROP POLICY IF EXISTS "Admin e instructores pueden borrar recursos" ON storage.objects;
CREATE POLICY "Admin e instructores pueden borrar recursos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'academy-resources'
    AND public.is_academy_staff()
  );

COMMIT;
