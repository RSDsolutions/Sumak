-- ============================================================
-- SUMAK - Migration: Integral Certificate System Fix
-- ============================================================
-- Fixes:
--   1. CHECK constraint to include 'pending_pdf' status
--   2. Default diploma_type for course certificates
--   3. Default diploma_template for course certificates
--   4. Recreates issue_academy_course_certificate with proper fields
--   5. Recreates get_my_academy_certificates to query unified table
--   6. Fixes verify_diploma_public to handle NULL diploma_type_id
--   7. Consolidates complete_academy_program_if_eligible
--   8. Fixes unique index for certificate deduplication
-- ============================================================

-- 1. Ensure the status CHECK constraint includes 'pending_pdf'
-- Drop existing constraint if any and recreate with all valid statuses
DO $$
BEGIN
  -- Try to drop the old constraint (may not exist)
  ALTER TABLE public.academy_diploma_issuances
    DROP CONSTRAINT IF EXISTS academy_diploma_issuances_status_check;
EXCEPTION WHEN others THEN
  NULL;
END;
$$;

-- Add the updated constraint
DO $$
BEGIN
  ALTER TABLE public.academy_diploma_issuances
    ADD CONSTRAINT academy_diploma_issuances_status_check
    CHECK (status IN ('issued', 'valid', 'revoked', 'superseded', 'invalidated', 'pending_pdf'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

-- 2. Create default diploma_type for course certificates (idempotent)
INSERT INTO public.academy_diploma_types (
  name,
  internal_code,
  description,
  is_active,
  template_version
) VALUES (
  'Certificado de Curso',
  'CERT_CURSO',
  'Certificado emitido automáticamente al completar un curso de la Academia SUMAK.',
  true,
  1
) ON CONFLICT (internal_code) DO NOTHING;

-- 3. Create default diploma_template for course certificates
DO $$
DECLARE
  v_type_id uuid;
BEGIN
  SELECT id INTO v_type_id FROM public.academy_diploma_types WHERE internal_code = 'CERT_CURSO';
  IF v_type_id IS NOT NULL THEN
    INSERT INTO public.academy_diploma_templates (
      diploma_type_id,
      version,
      page_size,
      orientation,
      title_text,
      subtitle_text,
      body_text,
      footer_text,
      signatory_name,
      signatory_title,
      is_active
    ) VALUES (
      v_type_id,
      1,
      'A4',
      'landscape',
      'CERTIFICADO DE CURSO',
      'ACADEMIA SUMAK',
      'Se certifica que {{participant_name}} ha completado satisfactoriamente el curso {{course_name}}.',
      'SUMAK VIDA ECUADOR S.A.',
      'Dr. Luis Paredes',
      'Formador de formadores',
      true
    ) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 4. Fix unique index for certificates (includes course_id properly)
DROP INDEX IF EXISTS public.academy_credential_no_duplicate;
CREATE UNIQUE INDEX academy_credential_no_duplicate
  ON public.academy_diploma_issuances (
    user_id,
    coalesce(diploma_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid),
    credential_type
  )
  WHERE status NOT IN ('revoked', 'superseded', 'invalidated');

-- 5. Recreate issue_academy_course_certificate with all required fields
CREATE OR REPLACE FUNCTION public.issue_academy_course_certificate(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_enrollment  record;
  v_course      record;
  v_total       int;
  v_completed   int;
  v_name        text;
  v_cert_type   uuid;
  v_template_id uuid;
  v_cert_number text;
  v_verify_code text;
  v_verify_token text;
  v_new_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING errcode = 'P0001';
  END IF;

  -- Check enrollment
  SELECT * INTO v_enrollment
  FROM public.academy_enrollments
  WHERE user_id = v_user_id AND course_id = p_course_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'not_enrolled');
  END IF;

  IF v_enrollment.status <> 'completed' THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'not_completed', 'progress', v_enrollment.progress_percentage);
  END IF;

  -- Get course info
  SELECT id, title INTO v_course
  FROM public.academy_courses WHERE id = p_course_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'course_not_found');
  END IF;

  -- Count lessons
  SELECT count(*) INTO v_total
  FROM public.academy_lessons l
  JOIN public.academy_modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id AND l.is_published AND m.is_published;

  SELECT count(*) INTO v_completed
  FROM public.academy_progress
  WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'completed';

  IF v_total > 0 AND v_completed < v_total THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'incomplete_lessons', 'completed', v_completed, 'total', v_total);
  END IF;

  -- Get certificate type and template
  SELECT id INTO v_cert_type FROM public.academy_diploma_types WHERE internal_code = 'CERT_CURSO' AND is_active;
  IF v_cert_type IS NULL THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'no_certificate_type_configured');
  END IF;

  SELECT id INTO v_template_id
  FROM public.academy_diploma_templates
  WHERE diploma_type_id = v_cert_type AND is_active
  ORDER BY version DESC LIMIT 1;

  -- Check for existing certificate
  PERFORM 1 FROM public.academy_diploma_issuances
  WHERE user_id = v_user_id
    AND course_id = p_course_id
    AND credential_type = 'certificate'
    AND status NOT IN ('revoked', 'superseded', 'invalidated');

  IF FOUND THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'already_issued');
  END IF;

  -- Generate numbers and codes
  SELECT nombre_completo INTO v_name FROM public.profiles WHERE id = v_user_id;
  v_cert_number := public.academy_next_credential_number('certificate');
  v_verify_code := 'SUMAK-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  v_verify_token := encode(gen_random_bytes(32), 'hex');

  -- Insert certificate
  INSERT INTO public.academy_diploma_issuances (
    credential_type,
    diploma_number,
    verification_code,
    verification_token,
    user_id,
    diploma_type_id,
    template_id,
    course_id,
    participant_name,
    course_name,
    program_name,
    status,
    issued_by,
    template_version
  ) VALUES (
    'certificate',
    v_cert_number,
    v_verify_code,
    v_verify_token,
    v_user_id,
    v_cert_type,
    v_template_id,
    p_course_id,
    coalesce(v_name, 'Estudiante'),
    v_course.title,
    v_course.title,
    'pending_pdf',
    v_user_id,
    1
  )
  RETURNING id INTO v_new_id;

  -- Audit log
  INSERT INTO public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (v_user_id, 'credential_issued', 'certificate', v_new_id,
    jsonb_build_object('course_id', p_course_id, 'credential_type', 'certificate', 'certificate_number', v_cert_number));

  RETURN jsonb_build_object(
    'issued', true,
    'certificate_id', v_new_id,
    'certificate_number', v_cert_number,
    'verification_code', v_verify_code,
    'verification_token', v_verify_token,
    'status', 'pending_pdf'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_academy_course_certificate(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.issue_academy_course_certificate(uuid) TO authenticated;

-- 6. Recreate get_my_academy_certificates to query unified table
DROP FUNCTION IF EXISTS public.get_my_academy_certificates();

CREATE OR REPLACE FUNCTION public.get_my_academy_certificates()
RETURNS TABLE (
  id uuid,
  certificate_number text,
  verification_code text,
  course_id uuid,
  course_name text,
  participant_name text,
  status text,
  issued_at timestamptz,
  pdf_storage_path text,
  credential_type text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    di.id,
    di.diploma_number AS certificate_number,
    di.verification_code,
    di.course_id,
    coalesce(di.course_name, c.title, di.program_name) AS course_name,
    di.participant_name,
    di.status,
    di.issued_at,
    di.pdf_storage_path,
    di.credential_type
  FROM public.academy_diploma_issuances di
  LEFT JOIN public.academy_courses c ON c.id = di.course_id
  WHERE di.user_id = auth.uid()
    AND di.credential_type = 'certificate'
  ORDER BY di.issued_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_academy_certificates() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_academy_certificates() TO authenticated;

-- 7. Fix verify_diploma_public to handle NULL diploma_type_id (certificates)
CREATE OR REPLACE FUNCTION public.verify_diploma_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_diploma record;
BEGIN
  IF p_token IS NULL OR length(p_token) < 10 THEN
    RETURN jsonb_build_object('found', false, 'status', 'NOT_FOUND');
  END IF;

  -- Search by verification_token OR verification_code
  SELECT
    d.diploma_number, d.verification_code, d.participant_name,
    d.program_name, d.course_name, d.status, d.issued_at,
    d.credential_type, d.revoked_at,
    dt.name AS diploma_type_name
  INTO v_diploma
  FROM public.academy_diploma_issuances d
  LEFT JOIN public.academy_diploma_types dt ON dt.id = d.diploma_type_id
  WHERE d.verification_token = p_token
     OR d.verification_code = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'status', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'status', upper(v_diploma.status),
    'diploma_number', v_diploma.diploma_number,
    'verification_code', v_diploma.verification_code,
    'participant_name', v_diploma.participant_name,
    'program_name', coalesce(v_diploma.course_name, v_diploma.program_name),
    'diploma_type', coalesce(v_diploma.diploma_type_name, 'Certificado de Curso'),
    'credential_type', v_diploma.credential_type,
    'issued_at', v_diploma.issued_at,
    'issuer', 'SUMAK Ecuador',
    'revoked_at', v_diploma.revoked_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_diploma_public(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_diploma_public(text) TO anon, authenticated;

-- 8. Consolidate complete_academy_program_if_eligible
CREATE OR REPLACE FUNCTION public.complete_academy_program_if_eligible(p_program_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_enrollment  public.academy_program_enrollments;
  v_program     public.academy_programs;
  v_required    integer;
  v_completed   integer;
  v_name        text;
  v_cert_type   uuid;
  v_template_id uuid;
  v_diploma_num text;
  v_verify_code text;
  v_verify_token text;
BEGIN
  IF p_user_id IS NULL OR (p_user_id <> auth.uid() AND NOT public.is_academy_staff()) THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_enrollment FROM public.academy_program_enrollments
  WHERE program_id = p_program_id AND user_id = p_user_id AND status IN ('active', 'completed') FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('completed', false, 'reason', 'not_enrolled'); END IF;
  IF v_enrollment.status = 'completed' THEN RETURN jsonb_build_object('completed', true, 'already_completed', true); END IF;

  SELECT * INTO v_program FROM public.academy_programs WHERE id = p_program_id;

  SELECT count(*) INTO v_required FROM public.academy_program_courses WHERE program_id = p_program_id AND is_required;
  SELECT count(*) INTO v_completed FROM public.academy_program_courses pc
  JOIN public.academy_enrollments e ON e.course_id = pc.course_id AND e.user_id = p_user_id AND e.status = 'completed'
  WHERE pc.program_id = p_program_id AND pc.is_required;

  IF v_required > 0 AND round((v_completed::numeric / v_required) * 100, 2) < coalesce(v_program.completion_percentage_required, 100) THEN
    RETURN jsonb_build_object('completed', false, 'completed_courses', v_completed, 'required_courses', v_required);
  END IF;

  -- Mark as completed
  UPDATE public.academy_program_enrollments SET status = 'completed', completed_at = coalesce(completed_at, now()) WHERE id = v_enrollment.id;
  INSERT INTO public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, 'program_completed', 'program_enrollment', v_enrollment.id, jsonb_build_object('program_id', p_program_id));

  -- Issue diploma if program has a diploma type
  IF v_program.diploma_type_id IS NOT NULL THEN
    SELECT nombre_completo INTO v_name FROM public.profiles WHERE id = p_user_id;

    -- Get template
    SELECT id INTO v_template_id
    FROM public.academy_diploma_templates
    WHERE diploma_type_id = v_program.diploma_type_id AND is_active
    ORDER BY version DESC LIMIT 1;

    -- Generate codes
    v_diploma_num := public.academy_next_credential_number('diploma');
    v_verify_code := 'SUMAK-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    v_verify_token := encode(gen_random_bytes(32), 'hex');

    INSERT INTO public.academy_diploma_issuances (
      credential_type,
      diploma_type_id,
      template_id,
      user_id,
      participant_name,
      program_name,
      program_id,
      diploma_number,
      verification_code,
      verification_token,
      status,
      issued_by,
      template_version
    ) VALUES (
      'diploma',
      v_program.diploma_type_id,
      v_template_id,
      p_user_id,
      coalesce(v_name, 'Participante'),
      v_program.title,
      p_program_id,
      v_diploma_num,
      v_verify_code,
      v_verify_token,
      'pending_pdf',
      p_user_id,
      1
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('completed', true, 'already_completed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_academy_program_if_eligible(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_academy_program_if_eligible(uuid, uuid) TO authenticated;
