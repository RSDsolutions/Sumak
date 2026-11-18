-- =============================================================================
-- MIGRACIÓN: 20261118000003_academy_student_credential_verification.sql
-- DESCRIPCIÓN:
--   RPC pública de solo lectura (`get_public_student_credential`) para validar
--   el código QR del Carnet / Credencial Estudiantil de SUMAK Academy sin
--   exponer datos sensibles del perfil ni mezclar con la tarjeta de distribuidor.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_student_credential(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_active_courses integer := 0;
  v_completed_courses integer := 0;
  v_diplomas_count integer := 0;
  v_student_code text;
  v_year text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    p.id,
    p.nombre_completo,
    p.username,
    p.avatar_url,
    p.ciudad,
    p.estado,
    p.fecha_registro
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_active_courses, v_completed_courses
  FROM public.academy_enrollments
  WHERE user_id = p_user_id;

  SELECT COUNT(*)
  INTO v_diplomas_count
  FROM public.academy_diploma_issuances
  WHERE user_id = p_user_id
    AND status IN ('issued', 'valid', 'pending_pdf');

  v_year := COALESCE(EXTRACT(YEAR FROM v_profile.fecha_registro)::text, EXTRACT(YEAR FROM now())::text);
  v_student_code := 'ACAD-' || v_year || '-' || UPPER(SUBSTRING(REPLACE(v_profile.id::text, '-', '') FROM 1 FOR 6));

  RETURN jsonb_build_object(
    'user_id', v_profile.id,
    'full_name', COALESCE(v_profile.nombre_completo, v_profile.username, 'Estudiante SUMAK Academy'),
    'avatar_url', v_profile.avatar_url,
    'ciudad', v_profile.ciudad,
    'status', CASE WHEN COALESCE(v_profile.estado, 'activo') = 'activo' THEN 'ACTIVO' ELSE UPPER(v_profile.estado) END,
    'registered_at', v_profile.fecha_registro,
    'student_code', v_student_code,
    'active_courses_count', COALESCE(v_active_courses, 0),
    'completed_courses_count', COALESCE(v_completed_courses, 0),
    'diplomas_count', COALESCE(v_diplomas_count, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_credential(uuid) TO anon, authenticated;

COMMIT;
