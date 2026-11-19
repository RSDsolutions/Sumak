-- =============================================================================
-- MIGRACIÓN: 20261118000004_fix_certificates_diplomas_automation_and_pending.sql
-- DESCRIPCIÓN:
--   1. Limpia datos de prueba residuales (curso "Ejemplo", diplomas "TEST"/"TEST 2").
--   2. Asegura que los 7 cursos oficiales del programa tengan `is_required = true`
--      y `generates_certificate = true`, y plantillas activas para certificados y diplomas.
--   3. Crea `recalculate_academy_course_progress(p_course_id, p_user_id)` para
--      mantener `academy_enrollments.progress_percentage` actualizado en cada lección
--      y evaluación.
--   4. Consolida `complete_academy_course_if_eligible(p_course_id, p_user_id)` para que
--      al cumplir 100% de lecciones y evaluaciones:
--        a) Marque el curso como `completed` (100%).
--        b) Emita AUTOMÁTICAMENTE el Certificado de Curso en `academy_diploma_issuances`.
--        c) Evalúe y emita AUTOMÁTICAMENTE el Diploma de Programa si completó los cursos.
--   5. Consolida `complete_academy_program_if_eligible(p_program_id, p_user_id)` para que
--      auto-registre `academy_program_enrollments` si el estudiante completó los cursos
--      del programa y emita el Diploma del Programa sin duplicados.
--   6. Añade trigger en `academy_attempts` para que al aprobar una evaluación se
--      ejecute automáticamente `complete_academy_course_if_eligible`.
--   7. Actualiza `get_my_program_progress` para calcular el progreso ponderado real
--      de los cursos en progreso.
--   8. Crea `sync_and_get_my_academy_credentials()` para sincronizar y devolver
--      certificados emitidos, diplomas emitidos, certificados pendientes (en curso)
--      y diplomas pendientes (en curso).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. LIMPIEZA DE DATOS DE PRUEBA RESIDUALES ("Ejemplo", "TEST", "TEST 2")
-- ---------------------------------------------------------------------------
DELETE FROM public.academy_diploma_issuances
WHERE program_name IN ('TEST', 'TEST 2')
   OR course_name IN ('TEST', 'TEST 2', 'Ejemplo');

DELETE FROM public.academy_enrollments
WHERE course_id IN (
  SELECT id FROM public.academy_courses WHERE slug = 'ejemplo' OR title = 'Ejemplo'
);

DELETE FROM public.academy_courses
WHERE slug = 'ejemplo' OR title = 'Ejemplo';

DELETE FROM public.academy_diploma_types
WHERE internal_code = 'TEST';

-- ---------------------------------------------------------------------------
-- 2. ASEGURAR PLANTILLAS Y CONFIGURACIÓN DE CURSOS Y PROGRAMA OFICIAL
-- ---------------------------------------------------------------------------
UPDATE public.academy_courses
SET generates_certificate = true
WHERE status = 'published';

-- En el programa oficial, todos los cursos publicados vinculados forman parte requerida del diploma
UPDATE public.academy_program_courses
SET is_required = true
WHERE program_id IN (
  SELECT id FROM public.academy_programs WHERE status = 'published'
);

-- Asegurar plantilla activa para DIP_SALUD_RENAL_SUMAK y cualquier diploma_type activo
INSERT INTO public.academy_diploma_templates (
  diploma_type_id,
  version,
  page_size,
  orientation,
  title_text,
  subtitle_text,
  signatory_name,
  signatory_title,
  is_active
)
SELECT
  dt.id,
  1,
  'a4',
  'landscape',
  dt.name,
  'ACADEMIA SUMAK VIDA ECUADOR',
  'Dr. Luis Paredes',
  'Director Médico y Formador SUMAK Academy',
  true
FROM public.academy_diploma_types dt
WHERE dt.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.academy_diploma_templates t
    WHERE t.diploma_type_id = dt.id AND t.is_active = true
  );

-- ---------------------------------------------------------------------------
-- 3. FUNCIÓN DE RECÁLCULO EXACTO DE PROGRESO DE CURSO
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_academy_course_progress(
  p_course_id uuid,
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_lessons integer := 0;
  v_completed_lessons integer := 0;
  v_total_assessments integer := 0;
  v_passed_assessments integer := 0;
  v_total_units integer := 0;
  v_completed_units integer := 0;
  v_pct integer := 0;
BEGIN
  IF p_course_id IS NULL OR p_user_id IS NULL THEN
    RETURN 0;
  END IF;

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

  v_total_units := v_total_lessons + v_total_assessments;
  v_completed_units := LEAST(v_completed_lessons, v_total_lessons) + LEAST(v_passed_assessments, v_total_assessments);

  IF v_total_units > 0 THEN
    v_pct := ROUND((v_completed_units::numeric / v_total_units::numeric) * 100)::integer;
  ELSE
    v_pct := 0;
  END IF;

  UPDATE public.academy_enrollments
  SET progress_percentage = CASE WHEN status = 'completed' THEN 100 ELSE LEAST(100, GREATEST(0, v_pct)) END
  WHERE user_id = p_user_id
    AND course_id = p_course_id;

  RETURN v_pct;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_academy_course_progress(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. EMISIÓN AUTOMÁTICA DE DIPLOMA DE PROGRAMA SI CUMPLE REQUISITOS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_academy_program_if_eligible(
  p_program_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_program public.academy_programs;
  v_required integer := 0;
  v_completed integer := 0;
  v_enrolled_in_any boolean := false;
  v_prog_enrollment_id uuid;
  v_existing_diploma_id uuid;
  v_new_diploma_id uuid;
  v_name text;
  v_dip_type uuid;
  v_template_id uuid;
  v_diploma_num text;
  v_verify_code text;
  v_verify_token text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('completed', false, 'reason', 'no_user');
  END IF;

  -- Permitir ejecución por el propio usuario, staff, o triggers internos (v_actor IS NULL)
  IF v_actor IS NOT NULL AND v_actor <> p_user_id AND NOT public.is_academy_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_program
  FROM public.academy_programs
  WHERE id = p_program_id AND status = 'published';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('completed', false, 'reason', 'program_not_found');
  END IF;

  -- Contar cursos obligatorios del programa
  SELECT COUNT(*) INTO v_required
  FROM public.academy_program_courses pc
  JOIN public.academy_courses c ON c.id = pc.course_id
  WHERE pc.program_id = p_program_id
    AND pc.is_required = true
    AND c.status = 'published';

  IF v_required = 0 THEN
    RETURN jsonb_build_object('completed', false, 'reason', 'no_required_courses');
  END IF;

  -- Contar cuántos de esos cursos obligatorios ya completó el estudiante
  SELECT COUNT(*) INTO v_completed
  FROM public.academy_program_courses pc
  JOIN public.academy_courses c ON c.id = pc.course_id
  JOIN public.academy_enrollments e
    ON e.course_id = pc.course_id
   AND e.user_id = p_user_id
   AND e.status = 'completed'
  WHERE pc.program_id = p_program_id
    AND pc.is_required = true
    AND c.status = 'published';

  -- Verificar si el usuario está inscrito al menos en un curso del programa o en el programa
  SELECT EXISTS (
    SELECT 1 FROM public.academy_program_enrollments pe
    WHERE pe.program_id = p_program_id AND pe.user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.academy_program_courses pc
    JOIN public.academy_enrollments e ON e.course_id = pc.course_id
    WHERE pc.program_id = p_program_id
      AND e.user_id = p_user_id
      AND e.status IN ('active', 'completed', 'payment_pending')
  ) INTO v_enrolled_in_any;

  IF NOT v_enrolled_in_any THEN
    RETURN jsonb_build_object('completed', false, 'reason', 'not_enrolled');
  END IF;

  -- Asegurar registro en academy_program_enrollments si ya está cursando el programa
  INSERT INTO public.academy_program_enrollments (user_id, program_id, status)
  VALUES (p_user_id, p_program_id, 'active')
  ON CONFLICT (user_id, program_id) DO NOTHING;

  -- Comprobar porcentaje requerido para completar el programa
  IF ROUND((v_completed::numeric / v_required::numeric) * 100, 2) < COALESCE(v_program.completion_percentage_required, 100) THEN
    RETURN jsonb_build_object(
      'completed', false,
      'completed_courses', v_completed,
      'required_courses', v_required
    );
  END IF;

  -- Marcar inscripción al programa como completada
  UPDATE public.academy_program_enrollments
  SET status = 'completed',
      completed_at = COALESCE(completed_at, now())
  WHERE program_id = p_program_id
    AND user_id = p_user_id
  RETURNING id INTO v_prog_enrollment_id;

  -- Verificar si ya tiene un diploma emitido para este programa
  SELECT id INTO v_existing_diploma_id
  FROM public.academy_diploma_issuances
  WHERE user_id = p_user_id
    AND (program_id = p_program_id OR (program_name = v_program.title AND credential_type = 'diploma'))
    AND COALESCE(credential_type, 'diploma') = 'diploma'
    AND status NOT IN ('revoked', 'superseded', 'invalidated')
  LIMIT 1;

  IF v_existing_diploma_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'completed', true,
      'already_completed', true,
      'diploma_id', v_existing_diploma_id
    );
  END IF;

  -- Determinar tipo de diploma y plantilla
  v_dip_type := v_program.diploma_type_id;
  IF v_dip_type IS NULL THEN
    SELECT id INTO v_dip_type
    FROM public.academy_diploma_types
    WHERE is_active = true AND internal_code <> 'CERT_CURSO'
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  IF v_dip_type IS NULL THEN
    SELECT id INTO v_dip_type
    FROM public.academy_diploma_types
    WHERE is_active = true
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  SELECT id INTO v_template_id
  FROM public.academy_diploma_templates
  WHERE diploma_type_id = v_dip_type AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  SELECT nombre_completo INTO v_name FROM public.profiles WHERE id = p_user_id;
  v_diploma_num := public.academy_next_credential_number('diploma');
  v_verify_code := 'SUMAK-' || UPPER(SUBSTRING(ENCODE(gen_random_bytes(6), 'hex') FROM 1 FOR 8));
  v_verify_token := ENCODE(gen_random_bytes(32), 'hex');

  INSERT INTO public.academy_diploma_issuances (
    credential_type,
    diploma_type_id,
    template_id,
    user_id,
    participant_name,
    program_name,
    course_name,
    program_id,
    diploma_number,
    verification_code,
    verification_token,
    document_hash,
    pdf_storage_path,
    status,
    issued_by,
    template_version
  ) VALUES (
    'diploma',
    v_dip_type,
    v_template_id,
    p_user_id,
    COALESCE(v_name, 'Estudiante SUMAK'),
    v_program.title,
    v_program.title,
    p_program_id,
    v_diploma_num,
    v_verify_code,
    v_verify_token,
    'pending_sha256',
    NULL,
    'pending_pdf',
    p_user_id,
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_new_diploma_id;

  IF v_new_diploma_id IS NOT NULL THEN
    INSERT INTO public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
    VALUES (
      p_user_id,
      'program_completed',
      'diploma',
      v_new_diploma_id,
      jsonb_build_object(
        'program_id', p_program_id,
        'diploma_number', v_diploma_num,
        'verification_code', v_verify_code
      )
    );

    PERFORM public.insert_user_notification(
      p_user_id,
      'academy',
      '¡Diploma de Programa Emitido!',
      '¡Felicitaciones! Has completado todos los cursos del programa "' || v_program.title || '" y tu Diploma Oficial ya está disponible.',
      '/academia/dashboard/diplomas',
      jsonb_build_object('program_id', p_program_id, 'diploma_id', v_new_diploma_id, 'event', 'diploma_issued')
    );
  END IF;

  RETURN jsonb_build_object(
    'completed', true,
    'already_completed', false,
    'diploma_id', COALESCE(v_new_diploma_id, v_existing_diploma_id),
    'diploma_number', v_diploma_num,
    'verification_code', v_verify_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_academy_program_if_eligible(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. FINALIZACIÓN AUTOMÁTICA DE CURSO + EMISIÓN DE CERTIFICADO + CHECK DE PROGRAMA
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

  SELECT id, title, generates_certificate INTO v_course
  FROM public.academy_courses
  WHERE id = p_course_id;

  -- Contar lecciones publicadas y obligatorias
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

  -- Contar evaluaciones publicadas del curso
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

  -- Actualizar siempre el progreso porcentual real
  v_pct := public.recalculate_academy_course_progress(p_course_id, p_user_id);

  IF v_total_lessons = 0 OR v_completed_lessons < v_total_lessons OR v_passed_assessments < v_total_assessments THEN
    RETURN jsonb_build_object(
      'completed', false,
      'progress_percentage', v_pct,
      'lessons', jsonb_build_object('completed', v_completed_lessons, 'total', v_total_lessons),
      'assessments', jsonb_build_object('passed', v_passed_assessments, 'total', v_total_assessments)
    );
  END IF;

  -- Marcar inscripción del curso como completada al 100%
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

  -- Emitir AUTOMÁTICAMENTE el Certificado del Curso si aún no existe
  IF COALESCE(v_course.generates_certificate, true) = true THEN
    SELECT id INTO v_existing_cert_id
    FROM public.academy_diploma_issuances
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND credential_type = 'certificate'
      AND status NOT IN ('revoked', 'superseded', 'invalidated')
    LIMIT 1;

    IF v_existing_cert_id IS NULL THEN
      SELECT id INTO v_cert_type
      FROM public.academy_diploma_types
      WHERE internal_code = 'CERT_CURSO' AND is_active = true
      LIMIT 1;

      IF v_cert_type IS NOT NULL THEN
        SELECT id INTO v_template_id
        FROM public.academy_diploma_templates
        WHERE diploma_type_id = v_cert_type AND is_active = true
        ORDER BY version DESC
        LIMIT 1;

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
          1
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

GRANT EXECUTE ON FUNCTION public.complete_academy_course_if_eligible(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. TRIGGER EN `academy_attempts`: COMPLETAR CURSO Y EMITIR CERTIFICADO AL APROBAR EXAMEN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.academy_on_attempt_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  IF NEW.passed = true AND NEW.status = 'graded' THEN
    SELECT course_id INTO v_course_id
    FROM public.academy_assessments
    WHERE id = NEW.assessment_id;

    IF v_course_id IS NOT NULL THEN
      PERFORM public.complete_academy_course_if_eligible(v_course_id, NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_complete_course_after_assessment ON public.academy_attempts;
CREATE TRIGGER tg_complete_course_after_assessment
  AFTER INSERT OR UPDATE OF passed, status ON public.academy_attempts
  FOR EACH ROW
  WHEN (NEW.passed = true AND NEW.status = 'graded')
  EXECUTE FUNCTION public.academy_on_attempt_graded();

-- Actualizar trigger de academy_enrollments para evaluar programas también cuando el curso pasa a completed
CREATE OR REPLACE FUNCTION public.academy_complete_programs_after_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id uuid;
BEGIN
  IF NEW.status IN ('active', 'completed') THEN
    FOR v_program_id IN
      SELECT DISTINCT program_id
      FROM public.academy_program_courses
      WHERE course_id = NEW.course_id
    LOOP
      -- Asegurar inscripción al programa si el usuario está cursando uno de sus cursos
      INSERT INTO public.academy_program_enrollments (user_id, program_id, status)
      VALUES (NEW.user_id, v_program_id, 'active')
      ON CONFLICT (user_id, program_id) DO NOTHING;

      IF NEW.status = 'completed' THEN
        PERFORM public.complete_academy_program_if_eligible(v_program_id, NEW.user_id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. CORREGIR `enroll_academy_program` Y `get_my_program_progress`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_academy_program(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_program public.academy_programs;
  v_enrollment public.academy_program_enrollments;
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_program
  FROM public.academy_programs
  WHERE id = p_program_id AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Programa no disponible' USING errcode = 'P0002';
  END IF;

  INSERT INTO public.academy_program_enrollments(user_id, program_id, status)
  VALUES (v_user_id, p_program_id, 'active')
  ON CONFLICT (user_id, program_id) DO UPDATE
    SET status = CASE
      WHEN public.academy_program_enrollments.status = 'dropped' THEN 'active'
      ELSE public.academy_program_enrollments.status
    END
  RETURNING * INTO v_enrollment;

  -- Inscribir automáticamente en los cursos gratuitos del programa como 'active'
  -- y los de pago como 'payment_pending'
  INSERT INTO public.academy_enrollments(
    user_id,
    course_id,
    status,
    payment_status,
    requested_at,
    approved_at,
    activated_at,
    expires_at
  )
  SELECT
    v_user_id,
    pc.course_id,
    CASE WHEN COALESCE(c.price, 0) > 0 THEN 'payment_pending' ELSE 'active' END,
    CASE WHEN COALESCE(c.price, 0) > 0 THEN 'pending_payment' ELSE 'not_required' END,
    v_now,
    CASE WHEN COALESCE(c.price, 0) > 0 THEN NULL ELSE v_now END,
    CASE WHEN COALESCE(c.price, 0) > 0 THEN NULL ELSE v_now END,
    CASE WHEN COALESCE(c.price, 0) > 0 THEN NULL ELSE v_now + interval '3 months' END
  FROM public.academy_program_courses pc
  JOIN public.academy_courses c ON c.id = pc.course_id
  WHERE pc.program_id = p_program_id
    AND c.status = 'published'
  ON CONFLICT (user_id, course_id) DO NOTHING;

  PERFORM public.complete_academy_program_if_eligible(p_program_id, v_user_id);

  RETURN to_jsonb(v_enrollment);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_program_progress(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_required integer := 0;
  v_completed integer := 0;
  v_weighted_sum numeric := 0;
  v_percentage numeric(5,2) := 0;
  v_courses jsonb;
  v_eligible boolean := false;
  v_program record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_program
  FROM public.academy_programs
  WHERE id = p_program_id AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Programa no disponible' USING errcode = 'P0002';
  END IF;

  SELECT COUNT(*) INTO v_required
  FROM public.academy_program_courses pc
  JOIN public.academy_courses c ON c.id = pc.course_id
  WHERE pc.program_id = p_program_id
    AND pc.is_required = true
    AND c.status = 'published';

  SELECT
    COUNT(*) FILTER (WHERE e.status = 'completed'),
    COALESCE(SUM(CASE WHEN e.status = 'completed' THEN 100 ELSE COALESCE(e.progress_percentage, 0) END), 0)
  INTO v_completed, v_weighted_sum
  FROM public.academy_program_courses pc
  JOIN public.academy_courses c ON c.id = pc.course_id
  LEFT JOIN public.academy_enrollments e
    ON e.course_id = pc.course_id
   AND e.user_id = v_user_id
  WHERE pc.program_id = p_program_id
    AND pc.is_required = true
    AND c.status = 'published';

  IF v_required > 0 THEN
    IF v_completed >= v_required THEN
      v_percentage := 100;
    ELSE
      v_percentage := LEAST(99, ROUND(v_weighted_sum / v_required, 0));
    END IF;
  ELSE
    v_percentage := 0;
  END IF;

  WITH course_status AS (
    SELECT
      pc.id AS program_course_id,
      pc.course_id,
      c.title,
      c.slug,
      pc.is_required,
      pc.sort_order,
      COALESCE(e.status, 'not_enrolled') AS status,
      CASE WHEN e.status = 'completed' THEN 100 ELSE COALESCE(e.progress_percentage, 0) END AS progress_percentage
    FROM public.academy_program_courses pc
    JOIN public.academy_courses c ON c.id = pc.course_id
    LEFT JOIN public.academy_enrollments e
      ON e.course_id = pc.course_id
     AND e.user_id = v_user_id
    WHERE pc.program_id = p_program_id
      AND c.status = 'published'
  ),
  prereqs AS (
    SELECT
      req.program_course_id,
      jsonb_agg(
        jsonb_build_object(
          'prereq_program_course_id', req.prereq_program_course_id,
          'prereq_course_id', prereq_pc.course_id,
          'prereq_title', prereq_c.title,
          'is_completed', COALESCE(pe.status, 'not_enrolled') = 'completed'
        )
      ) AS missing_prerequisites
    FROM public.academy_program_course_prereqs req
    JOIN public.academy_program_courses prereq_pc ON prereq_pc.id = req.prereq_program_course_id
    JOIN public.academy_courses prereq_c ON prereq_c.id = prereq_pc.course_id
    LEFT JOIN public.academy_enrollments pe
      ON pe.course_id = prereq_pc.course_id
     AND pe.user_id = v_user_id
    GROUP BY req.program_course_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'program_course_id', cs.program_course_id,
        'course_id', cs.course_id,
        'title', cs.title,
        'slug', cs.slug,
        'is_required', cs.is_required,
        'status', cs.status,
        'progress_percentage', cs.progress_percentage,
        'is_locked', CASE
          WHEN p.missing_prerequisites IS NOT NULL AND
               EXISTS (SELECT 1 FROM jsonb_array_elements(p.missing_prerequisites) AS req WHERE (req->>'is_completed')::boolean = false)
          THEN true ELSE false END,
        'prerequisites', COALESCE(p.missing_prerequisites, '[]'::jsonb)
      ) ORDER BY cs.sort_order
    ), '[]'::jsonb
  ) INTO v_courses
  FROM course_status cs
  LEFT JOIN prereqs p ON p.program_course_id = cs.program_course_id;

  v_eligible := v_required > 0 AND ROUND((v_completed::numeric / v_required::numeric) * 100, 2) >= COALESCE(v_program.completion_percentage_required, 100);

  RETURN jsonb_build_object(
    'program_id', p_program_id,
    'required_courses', v_required,
    'completed_courses', v_completed,
    'percentage', v_percentage,
    'eligible', v_eligible,
    'courses', v_courses
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPC UNIFICADA: SINCRONIZAR Y OBTENER CERTIFICADOS Y DIPLOMAS (EMITIDOS + PENDIENTES)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_and_get_my_academy_credentials()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_enr record;
  v_prog record;
  v_pending_certificates jsonb := '[]'::jsonb;
  v_pending_diplomas jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING errcode = 'P0001';
  END IF;

  -- 1. Sincronizar cada curso en el que el usuario está inscrito
  FOR v_enr IN
    SELECT course_id
    FROM public.academy_enrollments
    WHERE user_id = v_user_id
      AND status IN ('active', 'completed')
  LOOP
    PERFORM public.complete_academy_course_if_eligible(v_enr.course_id, v_user_id);
  END LOOP;

  -- 2. Sincronizar cada programa publicado donde el usuario tenga cursos o esté inscrito
  FOR v_prog IN
    SELECT p.id
    FROM public.academy_programs p
    WHERE p.status = 'published'
      AND (
        EXISTS (SELECT 1 FROM public.academy_program_enrollments pe WHERE pe.program_id = p.id AND pe.user_id = v_user_id)
        OR EXISTS (
          SELECT 1
          FROM public.academy_program_courses pc
          JOIN public.academy_enrollments e ON e.course_id = pc.course_id
          WHERE pc.program_id = p.id
            AND e.user_id = v_user_id
            AND e.status IN ('active', 'completed', 'payment_pending', 'pending')
        )
      )
  LOOP
    PERFORM public.complete_academy_program_if_eligible(v_prog.id, v_user_id);
  END LOOP;

  -- 3. Construir lista de Certificados Pendientes (cursos en progreso sin certificado emitido aún)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'enrollment_id', e.id,
        'course_id', c.id,
        'title', c.title,
        'slug', c.slug,
        'enrollment_status', e.status,
        'payment_status', e.payment_status,
        'progress_percentage', COALESCE(e.progress_percentage, 0),
        'total_lessons', (
          SELECT COUNT(*)
          FROM public.academy_lessons l
          JOIN public.academy_modules m ON m.id = l.module_id
          WHERE m.course_id = c.id AND m.is_published = true AND l.is_published = true AND COALESCE(l.is_required, true) = true
        ),
        'completed_lessons', (
          SELECT COUNT(*)
          FROM public.academy_progress p
          JOIN public.academy_lessons l ON l.id = p.lesson_id
          JOIN public.academy_modules m ON m.id = l.module_id
          WHERE p.user_id = v_user_id AND p.course_id = c.id AND m.course_id = c.id
            AND m.is_published = true AND l.is_published = true AND COALESCE(l.is_required, true) = true
            AND p.status = 'completed'
        ),
        'total_assessments', (
          SELECT COUNT(*)
          FROM public.academy_assessments a
          WHERE a.course_id = c.id AND a.is_published = true
        ),
        'passed_assessments', (
          SELECT COUNT(DISTINCT att.assessment_id)
          FROM public.academy_attempts att
          JOIN public.academy_assessments a ON a.id = att.assessment_id
          WHERE att.user_id = v_user_id AND att.passed = true AND att.status = 'graded'
            AND a.course_id = c.id AND a.is_published = true
        )
      ) ORDER BY e.last_accessed_at DESC NULLS LAST, e.enrolled_at DESC
    ),
    '[]'::jsonb
  ) INTO v_pending_certificates
  FROM public.academy_enrollments e
  JOIN public.academy_courses c ON c.id = e.course_id
  WHERE e.user_id = v_user_id
    AND c.status = 'published'
    AND COALESCE(c.generates_certificate, true) = true
    AND e.status IN ('active', 'payment_pending', 'pending', 'approved')
    AND NOT EXISTS (
      SELECT 1
      FROM public.academy_diploma_issuances di
      WHERE di.user_id = v_user_id
        AND di.course_id = c.id
        AND di.credential_type = 'certificate'
        AND di.status NOT IN ('revoked', 'superseded', 'invalidated')
    );

  -- 4. Construir lista de Diplomas Pendientes (programas que el alumno está cursando sin diploma emitido aún)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'program_id', p.id,
        'title', p.title,
        'slug', p.slug,
        'description', p.description,
        'required_courses', (
          SELECT COUNT(*)
          FROM public.academy_program_courses pc
          JOIN public.academy_courses c ON c.id = pc.course_id
          WHERE pc.program_id = p.id AND pc.is_required = true AND c.status = 'published'
        ),
        'completed_courses', (
          SELECT COUNT(*)
          FROM public.academy_program_courses pc
          JOIN public.academy_courses c ON c.id = pc.course_id
          JOIN public.academy_enrollments e ON e.course_id = pc.course_id AND e.user_id = v_user_id AND e.status = 'completed'
          WHERE pc.program_id = p.id AND pc.is_required = true AND c.status = 'published'
        ),
        'enrolled_courses', (
          SELECT COUNT(*)
          FROM public.academy_program_courses pc
          JOIN public.academy_courses c ON c.id = pc.course_id
          JOIN public.academy_enrollments e ON e.course_id = pc.course_id AND e.user_id = v_user_id AND e.status IN ('active', 'completed', 'payment_pending', 'pending')
          WHERE pc.program_id = p.id AND pc.is_required = true AND c.status = 'published'
        ),
        'progress_percentage', (
          SELECT CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE LEAST(99, ROUND(COALESCE(SUM(CASE WHEN e.status = 'completed' THEN 100 ELSE COALESCE(e.progress_percentage, 0) END), 0)::numeric / COUNT(*), 0))
          END
          FROM public.academy_program_courses pc
          JOIN public.academy_courses c ON c.id = pc.course_id
          LEFT JOIN public.academy_enrollments e ON e.course_id = pc.course_id AND e.user_id = v_user_id
          WHERE pc.program_id = p.id AND pc.is_required = true AND c.status = 'published'
        )
      ) ORDER BY p.sort_order ASC
    ),
    '[]'::jsonb
  ) INTO v_pending_diplomas
  FROM public.academy_programs p
  WHERE p.status = 'published'
    AND (
      EXISTS (SELECT 1 FROM public.academy_program_enrollments pe WHERE pe.program_id = p.id AND pe.user_id = v_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.academy_program_courses pc
        JOIN public.academy_enrollments e ON e.course_id = pc.course_id
        WHERE pc.program_id = p.id
          AND e.user_id = v_user_id
          AND e.status IN ('active', 'completed', 'payment_pending', 'pending')
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.academy_diploma_issuances di
      WHERE di.user_id = v_user_id
        AND (di.program_id = p.id OR (di.program_name = p.title AND COALESCE(di.credential_type, 'diploma') = 'diploma'))
        AND COALESCE(di.credential_type, 'diploma') = 'diploma'
        AND di.status NOT IN ('revoked', 'superseded', 'invalidated')
    );

  RETURN jsonb_build_object(
    'pending_certificates', v_pending_certificates,
    'pending_diplomas', v_pending_diplomas
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_and_get_my_academy_credentials() TO authenticated;

-- Recalcular progreso actual de todas las inscripciones activas
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT user_id, course_id FROM public.academy_enrollments WHERE status IN ('active', 'completed') LOOP
    PERFORM public.recalculate_academy_course_progress(r.course_id, r.user_id);
  END LOOP;
END $$;

COMMIT;
