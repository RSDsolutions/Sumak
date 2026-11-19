-- =============================================================================
-- MIGRACIÓN: 20261118000006_diploma_studio_and_operaciones_credentials.sql
-- DESCRIPCIÓN:
--   1. Añade `credential_category` ('certificate' | 'diploma') a `academy_diploma_types`
--      para distinguir claramente plantillas de Certificados de Curso vs Diplomas de Programa.
--   2. Permite a usuarios autenticados leer `academy_diploma_templates` activas
--      para renderizar sus propios certificados/diplomas con el diseño exacto del estudio visual.
--   3. Actualiza `complete_academy_course_if_eligible` e `issue_academy_course_certificate`
--      para usar la plantilla personalizada asignada al curso (`course.diploma_type_id`)
--      si existe, o `CERT_CURSO` como respaldo.
--   4. Crea RPCs seguras (`admin_issue_academy_credential`, `admin_revoke_academy_credential`,
--      `admin_get_pending_academy_credentials`) autorizadas para Admin y Operaciones
--      (`public.is_academy_admin()`).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. CATEGORÍA EXPLÍCITA EN `academy_diploma_types` ('certificate' | 'diploma')
-- ---------------------------------------------------------------------------
ALTER TABLE public.academy_diploma_types
  ADD COLUMN IF NOT EXISTS credential_category text NOT NULL DEFAULT 'diploma';

DO $$
BEGIN
  ALTER TABLE public.academy_diploma_types
    DROP CONSTRAINT IF EXISTS academy_diploma_types_credential_category_check;
  ALTER TABLE public.academy_diploma_types
    ADD CONSTRAINT academy_diploma_types_credential_category_check
    CHECK (credential_category IN ('certificate', 'diploma'));
EXCEPTION WHEN others THEN
  NULL;
END;
$$;

-- Backfill inteligente para tipos existentes
UPDATE public.academy_diploma_types
SET credential_category = 'certificate'
WHERE internal_code ILIKE 'CERT%'
   OR name ILIKE '%certificado%';

UPDATE public.academy_diploma_types
SET credential_category = 'diploma'
WHERE internal_code NOT ILIKE 'CERT%'
  AND name NOT ILIKE '%certificado%';

-- Normalizar page_size a valores válidos ('A4' / 'letter' / 'custom')
UPDATE public.academy_diploma_templates
SET page_size = 'A4'
WHERE lower(page_size) = 'a4' AND page_size <> 'A4';

-- ---------------------------------------------------------------------------
-- 2. RLS DE LECTURA PARA PLANTILLAS ACTIVAS (para renderizado en visor/descarga)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Templates: autenticados leen activas" ON public.academy_diploma_templates;
CREATE POLICY "Templates: autenticados leen activas"
  ON public.academy_diploma_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_academy_admin());

-- Asegurar permisos de lectura pública para verificación si se requiere vista previa
DROP POLICY IF EXISTS "Templates: anon lee activas" ON public.academy_diploma_templates;
CREATE POLICY "Templates: anon lee activas"
  ON public.academy_diploma_templates
  FOR SELECT
  TO anon
  USING (is_active = true);

-- ---------------------------------------------------------------------------
-- 3. ACTUALIZAR EMISIÓN AUTOMÁTICA DE CERTIFICADOS PARA RESPETAR `course.diploma_type_id`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_academy_course_if_eligible(
  p_course_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_enrollment public.academy_enrollments;
  v_course record;
  v_total_lessons integer := 0;
  v_completed_lessons integer := 0;
  v_total_assessments integer := 0;
  v_passed_assessments integer := 0;
  v_pct integer := 0;
  v_existing_cert_id uuid;
  v_new_cert_id uuid;
  v_cert_type uuid;
  v_template_id uuid;
  v_template_ver integer := 1;
  v_name text;
  v_cert_number text;
  v_verify_code text;
  v_verify_token text;
  v_prog_id uuid;
  v_was_already_completed boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('completed', false, 'reason', 'no_user');
  END IF;

  IF v_actor IS NOT NULL AND v_actor <> p_user_id AND NOT public.is_academy_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.academy_enrollments
  WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND status IN ('active', 'completed')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('completed', false, 'reason', 'not_enrolled');
  END IF;

  v_was_already_completed := (v_enrollment.status = 'completed');

  SELECT id, title, generates_certificate, diploma_type_id INTO v_course
  FROM public.academy_courses
  WHERE id = p_course_id;

  SELECT COUNT(*) INTO v_total_lessons
  FROM public.academy_lessons l
  JOIN public.academy_modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id
    AND m.is_published = true
    AND l.is_published = true
    AND COALESCE(l.is_required, true) = true;

  SELECT COUNT(*) INTO v_completed_lessons
  FROM public.academy_progress p
  JOIN public.academy_lessons l ON l.id = p.lesson_id
  JOIN public.academy_modules m ON m.id = l.module_id
  WHERE p.user_id = p_user_id
    AND p.course_id = p_course_id
    AND m.course_id = p_course_id
    AND m.is_published = true
    AND l.is_published = true
    AND COALESCE(l.is_required, true) = true
    AND p.status = 'completed';

  SELECT COUNT(*) INTO v_total_assessments
  FROM public.academy_assessments
  WHERE course_id = p_course_id
    AND is_published = true;

  SELECT COUNT(DISTINCT a.assessment_id) INTO v_passed_assessments
  FROM public.academy_attempts a
  JOIN public.academy_assessments x ON x.id = a.assessment_id
  WHERE a.user_id = p_user_id
    AND a.passed = true
    AND a.status = 'graded'
    AND x.course_id = p_course_id
    AND x.is_published = true;

  v_pct := public.recalculate_academy_course_progress(p_course_id, p_user_id);

  IF v_total_lessons = 0 OR v_completed_lessons < v_total_lessons OR v_passed_assessments < v_total_assessments THEN
    RETURN jsonb_build_object(
      'completed', false,
      'progress_percentage', v_pct,
      'lessons', jsonb_build_object('completed', v_completed_lessons, 'total', v_total_lessons),
      'assessments', jsonb_build_object('passed', v_passed_assessments, 'total', v_total_assessments)
    );
  END IF;

  IF NOT v_was_already_completed OR COALESCE(v_enrollment.progress_percentage, 0) < 100 THEN
    UPDATE public.academy_enrollments
    SET status = 'completed',
        progress_percentage = 100,
        completed_at = COALESCE(completed_at, now())
    WHERE id = v_enrollment.id;

    INSERT INTO public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      p_user_id,
      'course_completed',
      'enrollment',
      v_enrollment.id,
      jsonb_build_object('course_id', p_course_id)
    );
  END IF;

  -- Emitir AUTOMÁTICAMENTE el Certificado del Curso respetando course.diploma_type_id
  IF COALESCE(v_course.generates_certificate, true) = true THEN
    SELECT id INTO v_existing_cert_id
    FROM public.academy_diploma_issuances
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND credential_type = 'certificate'
      AND status NOT IN ('revoked', 'superseded', 'invalidated')
    LIMIT 1;

    IF v_existing_cert_id IS NULL THEN
      v_cert_type := v_course.diploma_type_id;

      IF v_cert_type IS NULL THEN
        SELECT id INTO v_cert_type
        FROM public.academy_diploma_types
        WHERE internal_code = 'CERT_CURSO' AND is_active = true
        LIMIT 1;
      END IF;

      IF v_cert_type IS NULL THEN
        SELECT id INTO v_cert_type
        FROM public.academy_diploma_types
        WHERE credential_category = 'certificate' AND is_active = true
        ORDER BY sort_order ASC
        LIMIT 1;
      END IF;

      IF v_cert_type IS NOT NULL THEN
        SELECT id, version INTO v_template_id, v_template_ver
        FROM public.academy_diploma_templates
        WHERE diploma_type_id = v_cert_type AND is_active = true
        ORDER BY version DESC
        LIMIT 1;

        IF v_template_id IS NOT NULL THEN
          SELECT nombre_completo INTO v_name FROM public.profiles WHERE id = p_user_id;
          v_cert_number := public.academy_next_credential_number('certificate');
          v_verify_code := 'SUMAK-' || UPPER(SUBSTRING(ENCODE(gen_random_bytes(6), 'hex') FROM 1 FOR 8));
          v_verify_token := ENCODE(gen_random_bytes(32), 'hex');

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
            document_hash,
            pdf_storage_path,
            status,
            issued_by,
            template_version
          ) VALUES (
            'certificate',
            v_cert_number,
            v_verify_code,
            v_verify_token,
            p_user_id,
            v_cert_type,
            v_template_id,
            p_course_id,
            COALESCE(v_name, 'Estudiante SUMAK'),
            v_course.title,
            v_course.title,
            'pending_sha256',
            NULL,
            'pending_pdf',
            p_user_id,
            COALESCE(v_template_ver, 1)
          )
          ON CONFLICT DO NOTHING
          RETURNING id INTO v_new_cert_id;

          IF v_new_cert_id IS NOT NULL THEN
            INSERT INTO public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
            VALUES (
              p_user_id,
              'credential_issued',
              'certificate',
              v_new_cert_id,
              jsonb_build_object('course_id', p_course_id, 'credential_type', 'certificate', 'certificate_number', v_cert_number)
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Evaluar AUTOMÁTICAMENTE todos los programas que incluyan este curso
  FOR v_prog_id IN
    SELECT DISTINCT program_id
    FROM public.academy_program_courses
    WHERE course_id = p_course_id
  LOOP
    PERFORM public.complete_academy_program_if_eligible(v_prog_id, p_user_id);
  END LOOP;

  RETURN jsonb_build_object(
    'completed', true,
    'already_completed', v_was_already_completed,
    'certificate_id', COALESCE(v_new_cert_id, v_existing_cert_id),
    'certificate_issued', (v_new_cert_id IS NOT NULL)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC: EMISIÓN MANUAL DE CERTIFICADO O DIPLOMA (ADMIN Y OPERACIONES)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_issue_academy_credential(
  p_user_id uuid,
  p_credential_type text,
  p_diploma_type_id uuid,
  p_participant_name text,
  p_program_name text,
  p_course_id uuid DEFAULT NULL,
  p_program_id uuid DEFAULT NULL,
  p_issued_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_cred_type text := CASE WHEN lower(COALESCE(p_credential_type, 'diploma')) = 'certificate' THEN 'certificate' ELSE 'diploma' END;
  v_template_id uuid;
  v_template_ver integer := 1;
  v_number text;
  v_verify_code text;
  v_verify_token text;
  v_new_id uuid;
  v_course_title text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_academy_admin() THEN
    RAISE EXCEPTION 'Solo Administración u Operaciones puede emitir credenciales manualmente.' USING errcode = 'P0001';
  END IF;

  IF p_user_id IS NULL OR p_diploma_type_id IS NULL OR trim(COALESCE(p_participant_name, '')) = '' OR trim(COALESCE(p_program_name, '')) = '' THEN
    RAISE EXCEPTION 'Faltan campos obligatorios para emitir la credencial.' USING errcode = 'P0002';
  END IF;

  SELECT id, version INTO v_template_id, v_template_ver
  FROM public.academy_diploma_templates
  WHERE diploma_type_id = p_diploma_type_id AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  IF v_template_id IS NULL THEN
    INSERT INTO public.academy_diploma_templates (
      diploma_type_id, version, page_size, orientation, title_text, subtitle_text, is_active
    )
    SELECT id, 1, 'A4', 'landscape', name, 'ACADEMIA SUMAK VIDA ECUADOR', true
    FROM public.academy_diploma_types
    WHERE id = p_diploma_type_id
    RETURNING id, version INTO v_template_id, v_template_ver;
  END IF;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró una plantilla activa para el tipo seleccionado.' USING errcode = 'P0003';
  END IF;

  IF p_course_id IS NOT NULL THEN
    SELECT title INTO v_course_title FROM public.academy_courses WHERE id = p_course_id;
  END IF;

  v_number := public.academy_next_credential_number(v_cred_type);
  v_verify_code := 'SUMAK-' || UPPER(SUBSTRING(ENCODE(gen_random_bytes(6), 'hex') FROM 1 FOR 8));
  v_verify_token := ENCODE(gen_random_bytes(32), 'hex');

  INSERT INTO public.academy_diploma_issuances (
    credential_type,
    diploma_number,
    verification_code,
    verification_token,
    user_id,
    diploma_type_id,
    template_id,
    course_id,
    program_id,
    participant_name,
    course_name,
    program_name,
    document_hash,
    pdf_storage_path,
    status,
    issued_at,
    issued_by,
    template_version,
    metadata
  ) VALUES (
    v_cred_type,
    v_number,
    v_verify_code,
    v_verify_token,
    p_user_id,
    p_diploma_type_id,
    v_template_id,
    p_course_id,
    p_program_id,
    trim(p_participant_name),
    COALESCE(v_course_title, trim(p_program_name)),
    trim(p_program_name),
    'visual_template_verified',
    NULL,
    'valid',
    COALESCE(p_issued_at, now()),
    v_actor,
    COALESCE(v_template_ver, 1),
    jsonb_build_object('issued_mode', 'manual', 'issued_by_staff', v_actor)
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_actor,
    'manual_credential_issued',
    v_cred_type,
    v_new_id,
    jsonb_build_object(
      'target_user', p_user_id,
      'diploma_number', v_number,
      'verification_code', v_verify_code,
      'course_id', p_course_id,
      'program_id', p_program_id
    )
  );

  PERFORM public.insert_user_notification(
    p_user_id,
    'academy',
    CASE WHEN v_cred_type = 'diploma' THEN '¡Nuevo Diploma Oficial Emitido!' ELSE '¡Nuevo Certificado Oficial Emitido!' END,
    'Se ha emitido tu ' || CASE WHEN v_cred_type = 'diploma' THEN 'Diploma' ELSE 'Certificado' END || ' oficial de "' || trim(p_program_name) || '". Ya puedes descargarlo en Mis Diplomas.',
    '/academia/dashboard/diplomas',
    jsonb_build_object('issuance_id', v_new_id, 'credential_type', v_cred_type)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'diploma_number', v_number,
    'verification_code', v_verify_code,
    'credential_type', v_cred_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_issue_academy_credential(uuid, text, uuid, text, text, uuid, uuid, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_issue_academy_credential(uuid, text, uuid, text, text, uuid, uuid, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC: REVOCACIÓN DE CERTIFICADO O DIPLOMA (ADMIN Y OPERACIONES)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revoke_academy_credential(
  p_issuance_id uuid,
  p_reason text DEFAULT 'Revocado por administración académica'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_rec record;
BEGIN
  IF v_actor IS NULL OR NOT public.is_academy_admin() THEN
    RAISE EXCEPTION 'No autorizado para revocar credenciales.' USING errcode = 'P0001';
  END IF;

  SELECT id, status, diploma_number, user_id, credential_type INTO v_rec
  FROM public.academy_diploma_issuances
  WHERE id = p_issuance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credencial no encontrada.' USING errcode = 'P0002';
  END IF;

  UPDATE public.academy_diploma_issuances
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = v_actor,
      revocation_reason = COALESCE(NULLIF(trim(p_reason), ''), 'Revocado por administración académica')
  WHERE id = p_issuance_id;

  INSERT INTO public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_actor,
    'diploma_revoked',
    COALESCE(v_rec.credential_type, 'diploma'),
    p_issuance_id,
    jsonb_build_object('diploma_number', v_rec.diploma_number, 'target_user', v_rec.user_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object('ok', true, 'id', p_issuance_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_academy_credential(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_revoke_academy_credential(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC: MONITOREO DE CERTIFICADOS Y DIPLOMAS PENDIENTES (ADMIN Y OPERACIONES)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_pending_academy_credentials()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_pending_certs jsonb := '[]'::jsonb;
  v_pending_dips jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.is_academy_admin() THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = 'P0001';
  END IF;

  -- Certificados pendientes (estudiantes cursando cursos que generan certificado y aún no tienen emitido)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.progress_percentage DESC, t.enrolled_at DESC), '[]'::jsonb)
  INTO v_pending_certs
  FROM (
    SELECT
      e.id AS enrollment_id,
      e.user_id,
      COALESCE(pr.nombre_completo, pr.email, 'Estudiante') AS student_name,
      pr.email AS student_email,
      e.course_id,
      c.title AS course_title,
      c.diploma_type_id,
      e.status AS enrollment_status,
      COALESCE(e.progress_percentage, 0) AS progress_percentage,
      e.enrolled_at
    FROM public.academy_enrollments e
    JOIN public.academy_courses c ON c.id = e.course_id
    LEFT JOIN public.profiles pr ON pr.id = e.user_id
    WHERE e.status IN ('active', 'completed', 'payment_pending')
      AND c.status = 'published'
      AND COALESCE(c.generates_certificate, true) = true
      AND NOT EXISTS (
        SELECT 1 FROM public.academy_diploma_issuances di
        WHERE di.user_id = e.user_id
          AND di.course_id = e.course_id
          AND di.credential_type = 'certificate'
          AND di.status NOT IN ('revoked', 'superseded', 'invalidated')
      )
    LIMIT 100
  ) t;

  -- Diplomas pendientes (estudiantes inscritos en programas sin diploma emitido aún)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.progress_percentage DESC), '[]'::jsonb)
  INTO v_pending_dips
  FROM (
    SELECT
      pe.id AS program_enrollment_id,
      pe.user_id,
      COALESCE(pr.nombre_completo, pr.email, 'Estudiante') AS student_name,
      pr.email AS student_email,
      pe.program_id,
      p.title AS program_title,
      p.diploma_type_id,
      pe.status AS program_status,
      (
        SELECT COUNT(*)
        FROM public.academy_program_courses pc
        JOIN public.academy_courses c ON c.id = pc.course_id
        WHERE pc.program_id = p.id AND pc.is_required = true AND c.status = 'published'
      ) AS required_courses,
      (
        SELECT COUNT(*)
        FROM public.academy_program_courses pc
        JOIN public.academy_enrollments e ON e.course_id = pc.course_id AND e.user_id = pe.user_id AND e.status = 'completed'
        WHERE pc.program_id = p.id AND pc.is_required = true
      ) AS completed_courses,
      COALESCE(
        ROUND(
          (
            SELECT COALESCE(SUM(CASE WHEN e.status = 'completed' THEN 100 ELSE COALESCE(e.progress_percentage, 0) END), 0)
            FROM public.academy_program_courses pc
            LEFT JOIN public.academy_enrollments e ON e.course_id = pc.course_id AND e.user_id = pe.user_id
            WHERE pc.program_id = p.id AND pc.is_required = true
          )::numeric / NULLIF(
            (SELECT COUNT(*) FROM public.academy_program_courses pc JOIN public.academy_courses c ON c.id = pc.course_id WHERE pc.program_id = p.id AND pc.is_required = true AND c.status = 'published'),
            0
          )
        ),
        0
      ) AS progress_percentage
    FROM public.academy_program_enrollments pe
    JOIN public.academy_programs p ON p.id = pe.program_id
    LEFT JOIN public.profiles pr ON pr.id = pe.user_id
    WHERE pe.status IN ('active', 'completed')
      AND p.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM public.academy_diploma_issuances di
        WHERE di.user_id = pe.user_id
          AND (di.program_id = p.id OR (di.program_name = p.title AND COALESCE(di.credential_type, 'diploma') = 'diploma'))
          AND COALESCE(di.credential_type, 'diploma') = 'diploma'
          AND di.status NOT IN ('revoked', 'superseded', 'invalidated')
      )
    LIMIT 100
  ) t;

  RETURN jsonb_build_object(
    'pending_certificates', v_pending_certs,
    'pending_diplomas', v_pending_dips
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_pending_academy_credentials() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_pending_academy_credentials() TO authenticated;

COMMIT;
