-- ============================================================================
-- SUMAK — Migration 20261116000002
-- ETAPA 1: Cirugía y Saneamiento del Sistema de Certificados y Diplomas (8 Bugs)
-- ETAPA 2: Carga Maestra Completa de los 10 Módulos Clínicos y Botánicos
--          (Dr. Luis Paredes y Dr. Miguel Loor)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ETAPA 1: SANEAMIENTO INTEGRAL DE CREDENCIALES, CERTIFICADOS Y DIPLOMAS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Fix BUG-3: CHECK constraint de status en academy_diploma_issuances incluye 'pending_pdf'
do $$
begin
  alter table public.academy_diploma_issuances
    drop constraint if exists academy_diploma_issuances_status_check;
exception when others then
  null;
end $$;

do $$
begin
  alter table public.academy_diploma_issuances
    add constraint academy_diploma_issuances_status_check
    check (status in ('issued', 'valid', 'revoked', 'superseded', 'invalidated', 'pending_pdf'));
exception when duplicate_object then
  null;
end $$;

-- Asegurar que document_hash y pdf_storage_path permitan NULL temporal mientras status = 'pending_pdf'
alter table public.academy_diploma_issuances
  alter column document_hash drop not null,
  alter column pdf_storage_path drop not null;

-- 1.2 Fix BUG-2: Diploma Type Default para Certificados ('CERT_CURSO') + Plantilla Activa
insert into public.academy_diploma_types (
  name,
  internal_code,
  description,
  is_active,
  template_version,
  sort_order,
  requirements
) values (
  'Certificado de Curso SUMAK',
  'CERT_CURSO',
  'Certificado oficial emitido automáticamente al completar el 100% de las lecciones obligatorias y evaluaciones de un curso en SUMAK Academy.',
  true,
  1,
  0,
  '{"min_progress_pct": 100, "requires_assessment": true}'::jsonb
) on conflict (internal_code) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true;

do $$
declare
  v_type_id uuid;
begin
  select id into v_type_id from public.academy_diploma_types where internal_code = 'CERT_CURSO';
  if v_type_id is not null then
    insert into public.academy_diploma_templates (
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
    ) values (
      v_type_id,
      1,
      'A4',
      'landscape',
      'CERTIFICADO DE APROBACIÓN',
      'ACADEMIA SUMAK VIDA',
      'Se certifica que {{participant_name}} ha completado y aprobado satisfactoriamente el curso {{course_name}}.',
      'SUMAK VIDA ECUADOR S.A. · Laboratorio Sumak Jambi',
      'Dr. Luis Paredes',
      'Gerente General · Formador de Formadores',
      true
    ) on conflict (diploma_type_id, version) do update set
      is_active = true;
  end if;
end $$;

-- Saneamiento previo: si existen credenciales duplicadas activas para el mismo (user_id, diploma_type_id, course_id, program_id, credential_type),
-- marcar las más antiguas como 'superseded' conservando únicamente la más reciente.
with ranked_credentials as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        coalesce(diploma_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(credential_type, 'diploma')
      order by issued_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.academy_diploma_issuances
  where status not in ('revoked', 'superseded', 'invalidated')
)
update public.academy_diploma_issuances
set status = 'superseded'
where id in (select id from ranked_credentials where rn > 1);

-- Índice único libre de colisiones por NULL para evitar duplicados en certificados y diplomas
drop index if exists public.academy_credential_no_duplicate;
create unique index academy_credential_no_duplicate
  on public.academy_diploma_issuances (
    user_id,
    coalesce(diploma_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(credential_type, 'diploma')
  )
  where status not in ('revoked', 'superseded', 'invalidated');

-- 1.3 Fix BUG-7 y BUG-8: Consolidar complete_academy_course_if_eligible filtrando por is_required = true
create or replace function public.complete_academy_course_if_eligible(
  p_course_id uuid,
  p_user_id uuid default auth.uid()
)
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
  if p_user_id is null or (p_user_id <> auth.uid() and not public.is_academy_staff()) then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;

  select * into v_enrollment
  from public.academy_enrollments
  where user_id = p_user_id
    and course_id = p_course_id
    and status in ('active', 'completed')
  for update;

  if not found then
    return jsonb_build_object('completed', false, 'reason', 'not_enrolled');
  end if;

  if v_enrollment.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true);
  end if;

  -- Contar únicamente lecciones publicadas y obligatorias (is_required = true)
  select count(*) into v_total_lessons
  from public.academy_lessons l
  join public.academy_modules m on m.id = l.module_id
  where m.course_id = p_course_id
    and m.is_published = true
    and l.is_published = true
    and coalesce(l.is_required, true) = true;

  select count(*) into v_completed_lessons
  from public.academy_progress p
  join public.academy_lessons l on l.id = p.lesson_id
  join public.academy_modules m on m.id = l.module_id
  where p.user_id = p_user_id
    and p.course_id = p_course_id
    and m.course_id = p_course_id
    and m.is_published = true
    and l.is_published = true
    and coalesce(l.is_required, true) = true
    and p.status = 'completed';

  select count(*) into v_total_assessments
  from public.academy_assessments
  where course_id = p_course_id
    and is_published = true;

  select count(distinct a.assessment_id) into v_passed_assessments
  from public.academy_attempts a
  where a.user_id = p_user_id
    and a.passed = true
    and a.status = 'graded'
    and exists (
      select 1 from public.academy_assessments x
      where x.id = a.assessment_id
        and x.course_id = p_course_id
        and x.is_published = true
    );

  if v_total_lessons = 0 or v_completed_lessons < v_total_lessons or v_passed_assessments < v_total_assessments then
    return jsonb_build_object(
      'completed', false,
      'lessons', jsonb_build_object('completed', v_completed_lessons, 'total', v_total_lessons),
      'assessments', jsonb_build_object('passed', v_passed_assessments, 'total', v_total_assessments)
    );
  end if;

  update public.academy_enrollments
  set status = 'completed',
      progress_percentage = 100,
      completed_at = coalesce(completed_at, now())
  where id = v_enrollment.id;

  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    p_user_id,
    'course_completed',
    'enrollment',
    v_enrollment.id,
    jsonb_build_object('course_id', p_course_id)
  );

  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

revoke all on function public.complete_academy_course_if_eligible(uuid, uuid) from public;
grant execute on function public.complete_academy_course_if_eligible(uuid, uuid) to authenticated;

-- 1.4 Fix BUG-2 y BUG-8 en issue_academy_course_certificate
create or replace function public.issue_academy_course_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_enrollment   record;
  v_course       record;
  v_total        int;
  v_completed    int;
  v_name         text;
  v_cert_type    uuid;
  v_template_id  uuid;
  v_cert_number  text;
  v_verify_code  text;
  v_verify_token text;
  v_existing_id  uuid;
  v_new_id       uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;

  -- Intentar completar el curso primero si ya cumplió requisitos
  perform public.complete_academy_course_if_eligible(p_course_id, v_user_id);

  select * into v_enrollment
  from public.academy_enrollments
  where user_id = v_user_id and course_id = p_course_id;

  if not found then
    return jsonb_build_object('issued', false, 'reason', 'not_enrolled');
  end if;

  if v_enrollment.status <> 'completed' then
    return jsonb_build_object('issued', false, 'reason', 'not_completed', 'progress', v_enrollment.progress_percentage);
  end if;

  select id, title, generates_certificate into v_course
  from public.academy_courses
  where id = p_course_id;

  if not found then
    return jsonb_build_object('issued', false, 'reason', 'course_not_found');
  end if;

  -- Contar solo lecciones publicadas y obligatorias (is_required = true)
  select count(*) into v_total
  from public.academy_lessons l
  join public.academy_modules m on m.id = l.module_id
  where m.course_id = p_course_id
    and l.is_published = true
    and m.is_published = true
    and coalesce(l.is_required, true) = true;

  select count(*) into v_completed
  from public.academy_progress p
  join public.academy_lessons l on l.id = p.lesson_id
  join public.academy_modules m on m.id = l.module_id
  where p.user_id = v_user_id
    and p.course_id = p_course_id
    and p.status = 'completed'
    and l.is_published = true
    and m.is_published = true
    and coalesce(l.is_required, true) = true;

  if v_total > 0 and v_completed < v_total then
    return jsonb_build_object('issued', false, 'reason', 'incomplete_lessons', 'completed', v_completed, 'total', v_total);
  end if;

  -- Verificar si ya existe certificado válido o pendiente para este curso
  select id into v_existing_id
  from public.academy_diploma_issuances
  where user_id = v_user_id
    and course_id = p_course_id
    and credential_type = 'certificate'
    and status not in ('revoked', 'superseded', 'invalidated')
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object('issued', false, 'reason', 'already_issued', 'certificate_id', v_existing_id);
  end if;

  -- Obtener diploma_type y template de CERT_CURSO
  select id into v_cert_type
  from public.academy_diploma_types
  where internal_code = 'CERT_CURSO' and is_active = true
  limit 1;

  if v_cert_type is null then
    return jsonb_build_object('issued', false, 'reason', 'no_certificate_type_configured');
  end if;

  select id into v_template_id
  from public.academy_diploma_templates
  where diploma_type_id = v_cert_type and is_active = true
  order by version desc
  limit 1;

  select nombre_completo into v_name from public.profiles where id = v_user_id;
  v_cert_number := public.academy_next_credential_number('certificate');
  v_verify_code := 'SUMAK-' || upper(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));
  v_verify_token := encode(gen_random_bytes(32), 'hex');

  insert into public.academy_diploma_issuances (
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
  ) values (
    'certificate',
    v_cert_number,
    v_verify_code,
    v_verify_token,
    v_user_id,
    v_cert_type,
    v_template_id,
    p_course_id,
    coalesce(v_name, 'Estudiante SUMAK'),
    v_course.title,
    v_course.title,
    'pending_sha256',
    null,
    'pending_pdf',
    v_user_id,
    1
  )
  on conflict do nothing
  returning id into v_new_id;

  if v_new_id is null then
    return jsonb_build_object('issued', false, 'reason', 'already_issued');
  end if;

  insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'credential_issued',
    'certificate',
    v_new_id,
    jsonb_build_object('course_id', p_course_id, 'credential_type', 'certificate', 'certificate_number', v_cert_number)
  );

  return jsonb_build_object(
    'issued', true,
    'certificate_id', v_new_id,
    'certificate_number', v_cert_number,
    'verification_code', v_verify_code,
    'verification_token', v_verify_token,
    'status', 'pending_pdf'
  );
end;
$$;

revoke all on function public.issue_academy_course_certificate(uuid) from public;
grant execute on function public.issue_academy_course_certificate(uuid) to authenticated;

-- 1.5 Fix BUG-1: Recrear get_my_academy_certificates consultando academy_diploma_issuances
drop function if exists public.get_my_academy_certificates();

create or replace function public.get_my_academy_certificates()
returns table (
  id uuid,
  certificate_number text,
  verification_code text,
  verification_token text,
  course_id uuid,
  course_name text,
  participant_name text,
  status text,
  issued_at timestamptz,
  pdf_storage_path text,
  credential_type text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    di.id,
    di.diploma_number as certificate_number,
    di.verification_code,
    di.verification_token,
    di.course_id,
    coalesce(di.course_name, c.title, di.program_name) as course_name,
    di.participant_name,
    di.status,
    di.issued_at,
    di.pdf_storage_path,
    di.credential_type
  from public.academy_diploma_issuances di
  left join public.academy_courses c on c.id = di.course_id
  where di.user_id = auth.uid()
    and di.credential_type = 'certificate'
  order by di.issued_at desc;
$$;

revoke all on function public.get_my_academy_certificates() from public;
grant execute on function public.get_my_academy_certificates() to authenticated;

-- 1.6 Fix BUG-6: verify_diploma_public usa LEFT JOIN y soporta tanto verification_token como verification_code
create or replace function public.verify_diploma_public(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_diploma record;
  v_clean text := trim(coalesce(p_token, ''));
begin
  if length(v_clean) < 5 then
    return jsonb_build_object('found', false, 'status', 'NOT_FOUND');
  end if;

  select
    d.id,
    d.diploma_number,
    d.verification_code,
    d.participant_name,
    d.program_name,
    d.course_name,
    d.status,
    d.issued_at,
    d.credential_type,
    d.revoked_at,
    d.revocation_reason,
    dt.name as diploma_type_name
  into v_diploma
  from public.academy_diploma_issuances d
  left join public.academy_diploma_types dt on dt.id = d.diploma_type_id
  where d.verification_token = v_clean
     or upper(d.verification_code) = upper(v_clean)
     or upper(d.diploma_number) = upper(v_clean)
  limit 1;

  if not found then
    return jsonb_build_object('found', false, 'status', 'NOT_FOUND');
  end if;

  return jsonb_build_object(
    'found', true,
    'status', case when v_diploma.status = 'pending_pdf' then 'VALID' else upper(v_diploma.status) end,
    'diploma_number', v_diploma.diploma_number,
    'verification_code', v_diploma.verification_code,
    'participant_name', v_diploma.participant_name,
    'program_name', coalesce(v_diploma.course_name, v_diploma.program_name),
    'diploma_type', coalesce(v_diploma.diploma_type_name, 'Certificado de Curso SUMAK'),
    'credential_type', coalesce(v_diploma.credential_type, 'diploma'),
    'issued_at', v_diploma.issued_at,
    'issuer', 'SUMAK Vida Ecuador S.A.',
    'revoked_at', v_diploma.revoked_at,
    'revocation_reason', case when v_diploma.status = 'revoked' then v_diploma.revocation_reason else null end
  );
end;
$$;

revoke all on function public.verify_diploma_public(text) from public;
grant execute on function public.verify_diploma_public(text) to anon, authenticated;

-- 1.7 Fix BUG-7: Consolidar complete_academy_program_if_eligible
create or replace function public.complete_academy_program_if_eligible(
  p_program_id uuid,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_enrollment   public.academy_program_enrollments;
  v_program      public.academy_programs;
  v_required     integer;
  v_completed    integer;
  v_name         text;
  v_dip_type     uuid;
  v_template_id  uuid;
  v_diploma_num  text;
  v_verify_code  text;
  v_verify_token text;
begin
  if p_user_id is null or (p_user_id <> auth.uid() and not public.is_academy_staff()) then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;

  select * into v_enrollment
  from public.academy_program_enrollments
  where program_id = p_program_id
    and user_id = p_user_id
    and status in ('active', 'completed')
  for update;

  if not found then
    return jsonb_build_object('completed', false, 'reason', 'not_enrolled');
  end if;

  if v_enrollment.status = 'completed' then
    return jsonb_build_object('completed', true, 'already_completed', true);
  end if;

  select * into v_program from public.academy_programs where id = p_program_id;

  select count(*) into v_required
  from public.academy_program_courses
  where program_id = p_program_id and is_required = true;

  select count(*) into v_completed
  from public.academy_program_courses pc
  join public.academy_enrollments e
    on e.course_id = pc.course_id
   and e.user_id = p_user_id
   and e.status = 'completed'
  where pc.program_id = p_program_id
    and pc.is_required = true;

  if v_required > 0 and round((v_completed::numeric / v_required) * 100, 2) < coalesce(v_program.completion_percentage_required, 100) then
    return jsonb_build_object(
      'completed', false,
      'completed_courses', v_completed,
      'required_courses', v_required
    );
  end if;

  update public.academy_program_enrollments
  set status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = v_enrollment.id;

  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    p_user_id,
    'program_completed',
    'program_enrollment',
    v_enrollment.id,
    jsonb_build_object('program_id', p_program_id)
  );

  v_dip_type := v_program.diploma_type_id;
  if v_dip_type is null then
    select id into v_dip_type from public.academy_diploma_types where is_active = true order by sort_order asc limit 1;
  end if;

  if v_dip_type is not null then
    select nombre_completo into v_name from public.profiles where id = p_user_id;

    select id into v_template_id
    from public.academy_diploma_templates
    where diploma_type_id = v_dip_type and is_active = true
    order by version desc limit 1;

    v_diploma_num := public.academy_next_credential_number('diploma');
    v_verify_code := 'SUMAK-' || upper(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));
    v_verify_token := encode(gen_random_bytes(32), 'hex');

    insert into public.academy_diploma_issuances (
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
      document_hash,
      pdf_storage_path,
      status,
      issued_by,
      template_version
    ) values (
      'diploma',
      v_dip_type,
      v_template_id,
      p_user_id,
      coalesce(v_name, 'Participante SUMAK'),
      v_program.title,
      p_program_id,
      v_diploma_num,
      v_verify_code,
      v_verify_token,
      'pending_sha256',
      null,
      'pending_pdf',
      p_user_id,
      1
    ) on conflict do nothing;
  end if;

  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

revoke all on function public.complete_academy_program_if_eligible(uuid, uuid) from public;
grant execute on function public.complete_academy_program_if_eligible(uuid, uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- ETAPA 2: CARGA MAESTRA DE FICHAS BOTÁNICAS (11 PLANTAS TOXICOLÓGICAS + 9 INFUSIONES)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.academy_botanical_sheets (
  slug, common_name, scientific_name, image_url, part_used,
  active_compounds, properties, traditional_uses,
  toxicity_level, toxicity_notes, clinical_precautions, contraindications, related_product_code
) values
-- 1. Mala Madre
(
  'mala-madre-kalanchoe',
  'Mala Madre (Hoja del Aire / Aranto)',
  'Kalanchoe daigremontiana / Bryophyllum pinnatum',
  '/ingredientes/aloe-vera.png',
  'Hojas carnosas (Uso exclusivamente tópico tradicional)',
  '[
    {"name": "Bufadienólidos (Glucósidos Cardiotónicos)", "action": "Inhiben la bomba Na+/K+ ATPasa del miocardio de forma similar a la digoxina, pudiendo inducir arritmias ventriculares y bloqueo cardíaco."},
    {"name": "Flavonoides y Ácidos Orgánicos", "action": "Acción antiinflamatoria y cicatrizante cuando se emplea de forma tópica externa."}
  ]'::jsonb,
  array['Cicatrizante tópico externo', 'Antiinflamatorio local en emplastos'],
  array['Uso externo tradicional en golpes, quemaduras superficiales y heridas cutáneas'],
  'strict_caution',
  'TOXICIDAD ALTA POR VÍA ORAL — Contiene bufadienólidos cardiotóxicos de estrecho margen de seguridad.',
  'PROHIBIDA SU INGESTIÓN CASERA. No preparar en jugos, licuados ni infusiones orales. Existe riesgo real de intoxicación digitálica, bradicardia severa, hiperpotasemia y paro cardíaco.',
  array['Ingestión oral prohibida', 'Cardiopatías', 'Embarazo y lactancia', 'Niños y adultos mayores'],
  null
),
-- 2. Ruda
(
  'ruda-graveolens',
  'Ruda',
  'Ruta graveolens',
  '/ingredientes/ajenjo.png',
  'Ramas aéreas (Uso externo o ambiental)',
  '[
    {"name": "Furanocumarinas (Bergapteno, Psoraleno)", "action": "Fototoxicidad severa al contacto con radiación UV y hepatotoxicidad."},
    {"name": "Alcaloides Quinoleínicos (Arborinina, Graveolina) y Rutina", "action": "Estimulación violenta de la fibra muscular lisa uterina (efecto oxitócico/abortivo) y neurotoxicidad."}
  ]'::jsonb,
  array['Emenagoga potente (riesgo abortivo)', 'Antiespasmódica tópica', 'Rubefaciente'],
  array['Uso ritual o tópico muy diluido; históricamente mal empleada en cólicos menstruales'],
  'strict_caution',
  'TOXICIDAD ALTA — Abortiva, neurotóxica, hepatotóxica y nefrotóxica por vía oral.',
  'PROHIBIDA SU INGESTIÓN ORAL. Provoca contracciones uterinas hemorrágicas, daño tubular renal agudo, necrosis hepática y quemaduras por fotosensibilidad.',
  array['Embarazo (Abortiva)', 'Lactancia', 'Enfermedad renal o hepática', 'Ingesta oral'],
  null
),
-- 3. Noni
(
  'noni',
  'Noni',
  'Morinda citrifolia',
  '/ingredientes/noni.png',
  'Fruto maduro procesado y estandarizado',
  '[
    {"name": "Iridoides (Ácido Desacetilasperulosídico) y Escopoletina", "action": "Modulación inmunológica, actividad antioxidante y regulación de citoquinas."},
    {"name": "Sales de Potasio y Antraquinonas Trazas", "action": "Aporte electrolítico elevado; requiere función renal conservada para su excreción."}
  ]'::jsonb,
  array['Inmunomodulador celular', 'Antioxidante adaptógeno', 'Coadyuvante metabólico'],
  array['Convalecencia, fatiga crónica y soporte de defensas en formulaciones controladas'],
  'moderate',
  'Moderado — Alto contenido de potasio; existen reportes clínicos de hepatotoxicidad en consumo excesivo de extractos artesanales no controlados.',
  'Evitar el consumo de fermentos caseros de Noni. En pacientes con Insuficiencia Renal Crónica (riesgo de hiperpotasemia severa) o hepatopatía activa, no administrar sin autorización médica.',
  array['Insuficiencia renal con hiperpotasemia', 'Hepatitis activa o cirrosis descompensada'],
  '00001'
),
-- 4. Sábila
(
  'sabila-aloe-vera',
  'Sábila (Aloe Vera)',
  'Aloe vera (Aloe barbadensis Miller)',
  '/ingredientes/aloe-vera.png',
  'Gel parenquimatoso interno (Cristal transparente libre de acíbar)',
  '[
    {"name": "Acemanano (Polisacárido Mucilaginoso)", "action": "Recubre, citoprotege y regenera la mucosa gástrica, esofágica y urotelial."},
    {"name": "Aloína y Barbaloína (en el látex amarillo / acíbar)", "action": "Glucósidos hidroxiantracénicos irritantes que provocan diarrea secretora, cólico y pérdida de potasio."}
  ]'::jsonb,
  array['Demulcente y cicatrizante gástrico (Gel)', 'Prebiótico suave', 'Antiinflamatorio mucoso'],
  array['Gastritis, reflujo gastroesofágico y regeneración epitelial digestiva'],
  'moderate',
  'Diferenciar estrictamente el GEL transparente (seguro y regenerador) del LÁTEX AMARILLO / ALOÍNA (purgante tóxico).',
  'Lavar y eliminar por completo la corteza verde y el líquido amarillo (aloína) antes de usar en casa, o emplear productos estandarizados libres de aloína. El látex amarillo está prohibido en embarazo, lactancia, colitis ulcerosa y enfermedad renal.',
  array['Embarazo y lactancia (si contiene aloína)', 'Obstrucción intestinal', 'Enfermedad inflamatoria intestinal aguda'],
  '00005'
),
-- 5. Canela
(
  'canela-ceilan',
  'Canela (Ceilán vs. Cassia)',
  'Cinnamomum verum (Ceilán) / Cinnamomum cassia',
  '/ingredientes/cardamomo.png',
  'Corteza interna seca en rama o polvo',
  '[
    {"name": "Cinamaldehído y Polifenoles Procianidínicos", "action": "Sensibilizador de los receptores de insulina (GLUT4) y carminativo digestivo."},
    {"name": "Cumarina (Elevada en C. cassia, mínima en C. verum)", "action": "Compuesto aromático que en dosis altas prolongadas resulta hepatotóxico."}
  ]'::jsonb,
  array['Sensibilizador a la insulina (hipoglucemiante coadyuvante)', 'Carminativo y termogénico suave', 'Antiespasmódico digestivo'],
  array['Apoyo en resistencia a la insulina, digestión lenta y enfriamiento corporal'],
  'moderate',
  'Preferir siempre Canela de Ceilán (Cinnamomum verum). La Canela Cassia comercial contiene hasta 60 veces más cumarina hepatotóxica.',
  'No exceder de 1/2 a 1 cucharadita diaria. Precaución en pacientes con daño hepático previo o que toman fármacos antidiabéticos (monitorear glucemia) o anticoagulantes.',
  array['Hepatopatía severa (C. cassia)', 'Úlcera gástrica activa en altas dosis'],
  null
),
-- 6. Chía
(
  'chia-salvia',
  'Chía',
  'Salvia hispanica',
  '/ingredientes/chia.png',
  'Semillas maduras hidratadas',
  '[
    {"name": "Ácido Alfa-Linolénico (Omega-3 Vegetal ALA)", "action": "Antiinflamatorio endotelial, reductor de triglicéridos y cardioprotector."},
    {"name": "Mucílagos Hidrosolubles (Fibra Soluble)", "action": "Forman un gel viscoso que captura glucosa, colesterol biliar y lubrica el bolo fecal."}
  ]'::jsonb,
  array['Regulador del tránsito intestinal', 'Hipolipemiante y cardioprotector', 'Modulador del índice glucémico postprandial'],
  array['Estreñimiento crónico, dislipidemias y control de saciedad en síndrome metabólico'],
  'low',
  'Baja toxicidad bioquímica, pero RIESGO MECÁNICO si se ingiere seca sin hidratar.',
  'REGLA OBLIGATORIA: Hidratar siempre las semillas de chía en agua o líquido durante al menos 15-20 minutos antes de ingerirlas. Tragarlas secas puede causar impactación y obstrucción esofágica grave (absorben hasta 27 veces su peso en agua).',
  array['Disfagia o estenosis esofágica (en seco)', 'Oclusión intestinal aguda'],
  '00005'
),
-- 7. Nopal
(
  'nopal-opuntia',
  'Nopal (Tuna)',
  'Opuntia ficus-indica',
  '/ingredientes/nopal.png',
  'Cladodios jóvenes (pencas limpias sin espinas)',
  '[
    {"name": "Pectinas, Mucílagos y Hemicelulosa", "action": "Retardan la absorción intestinal de carbohidratos simples y ácidos biliares."},
    {"name": "Betalaínas y Quercetina", "action": "Protección antioxidante de los islotes pancreáticos y del hepatocito."}
  ]'::jsonb,
  array['Hipoglucemiante coadyuvante', 'Hepatoprotector en esteatosis', 'Prebiótico formador de volumen'],
  array['Diabetes tipo 2, hígado graso no alcohólico y dislipidemia'],
  'low',
  'Alimento-medicina seguro en pautas culinarias y licuados funcionales.',
  'Por su alta riqueza en fibra mucilaginosa, puede reducir o retrasar la absorción de medicamentos orales (separar su toma al menos 1 a 2 horas de los fármacos). En diabéticos medicados con glibenclamida/insulina, vigilar posibles hipoglucemias por efecto sumatorio.',
  array['Obstrucción intestinal'],
  '00009'
),
-- 8. Pepino, Apio y Perejil (Tríada Verde y Vitamina K)
(
  'perejil-apio-pepino',
  'Perejil, Apio y Pepino (Complejo Verde)',
  'Petroselinum crispum / Apium graveolens / Cucumis sativus',
  '/ingredientes/perejil.png',
  'Hojas frescas, tallos y fruto hidratante',
  '[
    {"name": "Filoquinona (Vitamina K1) en Perejil y Apio", "action": "Cofactor hepático de los factores de coagulación II, VII, IX y X (antagoniza a la warfarina)."},
    {"name": "Apiol, Miristicina y Ftálidos (3-n-butilftálido)", "action": "Vasodilatación suave, efecto acuarético renal y estimulación uterina en dosis concentradas de perejil."}
  ]'::jsonb,
  array['Depurativo hidrosalino', 'Vasodilatador coadyuvante (ftálidos del apio)', 'Alcalinizante metabólico'],
  array['Licuados verdes hepatoprotectores y reducción de retención de líquidos'],
  'moderate',
  'Culinariamente seguros, pero el Perejil concentrado es oxitócico y rico en Vitamina K.',
  'INTERACCIÓN CRÍTICA: Pacientes anticoagulados con Warfarina (Coumadin) o Acenocumarol NO deben iniciar jugos verdes concentrados de perejil/apio sin control de INR, ya que la Vitamina K bloquea el efecto anticoagulante y favorece trombosis. El perejil en dosis medicinales está contraindicado en el embarazo.',
  array['Tratamiento con Warfarina/Acenocumarol (cambios bruscos de ingesta)', 'Embarazo (extractos o dosis altas de perejil)', 'Nefritis aguda severa'],
  '00009'
),
-- 9. Romero
(
  'romero-salvia',
  'Romero',
  'Salvia rosmarinus (Rosmarinus officinalis)',
  '/ingredientes/romero.png',
  'Hojas e inflorescencias secas',
  '[
    {"name": "Ácido Rosmarínico y Carnosol", "action": "Potente antioxidante neuroprotector, colerético y antiinflamatorio hepatobiliar."},
    {"name": "1,8-Cineol, Alcanfor y Alfa-Pineno (Aceite Esencial)", "action": "Tónico circulatorio; en dosis altas de aceite esencial puro es neurotóxico y epileptógeno."}
  ]'::jsonb,
  array['Colerético y colagogo hepático', 'Tónico circulatorio y cognitivo', 'Carminativo digestivo'],
  array['Dispepsia biliar, fatiga mental y baños desinflamatorios'],
  'moderate',
  'Infusión de hoja seca segura; ACEITE ESENCIAL PURO neurotóxico por vía oral.',
  'Jamás ingerir aceite esencial de romero. En infusión, usar con precaución en pacientes con hipertensión no controlada, antecedentes de epilepsia/convulsiones y evitar en el embarazo.',
  array['Epilepsia (aceite esencial o dosis altas)', 'Embarazo', 'Obstrucción completa de vías biliares'],
  null
),
-- 10. Manzanilla
(
  'manzanilla-matricaria',
  'Manzanilla Dulce',
  'Matricaria chamomilla',
  '/ingredientes/manzanilla.png',
  'Capítulos florales secos',
  '[
    {"name": "Alfa-Bisabolol y Camazuleno", "action": "Acción antiinflamatoria directa sobre la mucosa gástrica e inhibición de pepsina."},
    {"name": "Apigenina (Flavonoide)", "action": "Modulación suave de receptores GABA-A (ansiolítico y espasmolítico digestivo)."}
  ]'::jsonb,
  array['Gastroprotectora y antiinflamatoria', 'Antiespasmódica digestiva', 'Sedante suave'],
  array['Gastritis nerviosa, dispepsia, cólicos intestinales e insomnio leve'],
  'low',
  'Una de las plantas más seguras de la farmacopea en infusión estándar (1 cdta por taza).',
  'Evitar únicamente en personas con alergia conocida a la familia Asteraceae (ambrosía, crisantemos). Preparar en infusión tapada de 5 minutos sin hervir las flores.',
  array['Hipersensibilidad a plantas Asteraceae'],
  null
),
-- 11. Menta
(
  'menta-piperita',
  'Menta / Hierbabuena',
  'Mentha piperita / Mentha spicata',
  '/ingredientes/menta.png',
  'Hojas frescas o secas',
  '[
    {"name": "Mentol y Mentona", "action": "Bloquean los canales de calcio en el músculo liso colónico (aliviando el espasmo en colon irritable), pero relajan el esfínter esofágico inferior."}
  ]'::jsonb,
  array['Antiespasmódica colónica', 'Carminativa (expulsión de gases)', 'Analgésica digestiva'],
  array['Síndrome de Intestino Irritable (SII), distensión abdominal y náuseas'],
  'moderate',
  'Segura en colon irritable, pero empeora el reflujo gastroesofágico.',
  'CONTRAINDICACIÓN FUNCIONAL CLAVE: No administrar infusión concentrada de menta en pacientes con Reflujo Gastroesofágico (ERGE), hernia hiatal o acidez severa, ya que el mentol relaja el esfínter esofágico inferior y facilita el ascenso del ácido hacia el esófago.',
  array['Reflujo gastroesofágico (ERGE) activo', 'Hernia hiatal sintomática', 'Lactantes y niños pequeños (aceite esencial cerca de fosas nasales)'],
  '00002'
),
-- 12. Clavo de Olor y Linaza
(
  'linaza-clavo-malva',
  'Linaza y Malva Blanca (Mucílagos Demulcentes)',
  'Linum usitatissimum / Malva parviflora',
  '/ingredientes/linaza.png',
  'Semillas de linaza hidratadas y flores/hojas de malva',
  '[
    {"name": "Mucílagos Ácidos y Neutros (Arabinoxilanos)", "action": "Forman un hidrogel protector sobre úlceras, gastritis y hemorroides internas."},
    {"name": "Secoisolariciresinol Diglucósido (Lignanos de Linaza)", "action": "Modulación antioxidante y regulación del tránsito colónico sin irritar."}
  ]'::jsonb,
  array['Demulcente y reparador de mucosas', 'Laxante mecánico suave no irritante', 'Antiinflamatorio urogenital y digestivo'],
  array['Gastritis erosiva, estreñimiento con hemorroides y cistitis irritativa'],
  'low',
  'Excelente perfil de seguridad cuando se hidrata adecuadamente.',
  'REGLA DE ORO FARMACOLÓGICA: Tanto la Linaza como la Malva Blanca reducen la absorción intestinal de medicamentos si se toman al mismo tiempo. Separar siempre su ingesta al menos 2 horas antes o después de cualquier fármaco (hormona tiroidea, antihipertensivos, antibióticos).',
  array['Toma simultánea con medicamentos de estrecho margen terapéutico', 'Obstrucción intestinal'],
  '00016'
)
on conflict (slug) do update set
  common_name = excluded.common_name,
  scientific_name = excluded.scientific_name,
  image_url = excluded.image_url,
  part_used = excluded.part_used,
  active_compounds = excluded.active_compounds,
  properties = excluded.properties,
  traditional_uses = excluded.traditional_uses,
  toxicity_level = excluded.toxicity_level,
  toxicity_notes = excluded.toxicity_notes,
  clinical_precautions = excluded.clinical_precautions,
  contraindications = excluded.contraindications,
  related_product_code = excluded.related_product_code;


-- ─────────────────────────────────────────────────────────────────────────────
-- ETAPA 2.2: SEED DE LOS 5 NUEVOS CURSOS CLÍNICOS (10 MÓDULOS COMPLETOS)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_cat_id uuid;
  v_dip_type_id uuid;
  v_program_id uuid;
  v_c_urinaria uuid;
  v_c_higado uuid;
  v_c_gastro uuid;
  v_c_herbolaria uuid;
  v_c_metabolica uuid;
  v_mod_id uuid;
  v_mod2_id uuid;
  v_mod3_id uuid;
  v_les_id uuid;
  v_eval_id uuid;
  v_q_id uuid;
  v_bot_id uuid;
begin
  select id into v_cat_id from public.academy_categories where slug = 'salud-renal-fitoterapia' limit 1;
  select id into v_dip_type_id from public.academy_diploma_types where internal_code = 'DIP_SALUD_RENAL_SUMAK' limit 1;
  select id into v_program_id from public.academy_programs where slug = 'especializacion-salud-renal-sumak' limit 1;

  -- ===========================================================================
  -- CURSO A: Salud Urinaria, Próstata y Equilibrio Femenino (Dr. Luis Paredes)
  -- ===========================================================================
  insert into public.academy_courses (
    title, slug, short_description, description,
    category_id, level, estimated_duration_minutes, status, access_mode,
    prerequisites, passing_percentage, generates_certificate, diploma_type_id,
    published_at, sort_order, metadata
  ) values (
    'Salud Urinaria, Próstata y Equilibrio Femenino',
    'salud-urinaria-prostata-equilibrio-femenino',
    'Anatomía comparada de vías urinarias en mujer y hombre, prevención de cistitis, hiperplasia prostática y fitoterapia con Tuza de Maíz y Madre Silvestre.',
    'Curso clínico dictado por el Dr. Luis Paredes sobre el cuidado integral del sistema urogenital femenino y masculino. Aborda por qué las infecciones urinarias son más frecuentes en la mujer, los signos de alarma que prohíben la automedicación antibiótica, la relación uretra-próstata en el varón y la preparación paso a paso de la infusión desinflamatoria de tuza de maíz.',
    v_cat_id, 'beginner', 150, 'published', 'free_registered',
    'Sin requisitos previos.', 70.00, true, v_dip_type_id, now(), 3,
    '{"speaker": "Dr. Luis Paredes", "objectives": ["Diferenciar la anatomía uretral femenina y masculina.", "Identificar síntomas prostáticos tempranos (nicturia, chorro débil).", "Preparar correctamente la infusión de tuza de maíz, cáscara de ajo y canela."]}'::jsonb
  ) on conflict (slug) do update set
    title = excluded.title, short_description = excluded.short_description, description = excluded.description, status = 'published'
  returning id into v_c_urinaria;

  delete from public.academy_modules where course_id = v_c_urinaria;
  delete from public.academy_assessments where course_id = v_c_urinaria;

  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_urinaria, 'Módulo 1: Cuidado de las Vías Urinarias en Hombre y Mujer', 'Fisiología urinaria, prevención de infecciones recurrentes, salud prostática y protocolo fitoterapéutico.', 1, true)
  returning id into v_mod_id;

  -- Lección 1
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Anatomía Urinaria, Cistitis en la Mujer y Signos de Alarma',
    'Estructura de riñones, uréteres, vejiga y uretra; prevención en la mujer y cuándo acudir de urgencia al médico.',
    'text',
    '<h2>1. Arquitectura del Sistema Urinario</h2>
    <p>El aparato urinario está integrado por <strong>dos riñones</strong> (que filtran la sangre y producen la orina), <strong>dos uréteres</strong> (conductos musculares que transportan la orina en ondas peristálticas), la <strong>vejiga urinaria</strong> (reservorio muscular elástico) y la <strong>uretra</strong> (conducto excretor final).</p>
    <h3>¿Por qué la mujer sufre más infecciones urinarias (Cistitis)?</h3>
    <ul>
      <li><strong>Uretra anatómicamente corta (3 a 4 cm):</strong> Facilita el ascenso rápido de bacterias uropatógenas como <em>Escherichia coli</em> hacia la vejiga.</li>
      <li><strong>Proximidad anatómica:</strong> Cercanía inmediata del meato uretral con el introito vaginal y la región perianal.</li>
      <li><strong>Cambios hormonales:</strong> En la menopausia, la caída de estrógenos adelgaza el urotelio y reduce los lactobacilos protectores.</li>
    </ul>
    <h3>Hábitos Preventivos Esenciales en la Mujer</h3>
    <ol>
      <li>Higiene íntima siempre <strong>de adelante hacia atrás</strong> (nunca en sentido inverso).</li>
      <li><strong>Micción post-coital:</strong> Orinar después de la relación sexual para barrer mecánicamente bacterias de la uretra.</li>
      <li>No retener la orina por periodos prolongados y usar ropa interior de algodón transpirable.</li>
    </ol>',
    1, true, true, true, 20,
    '{
      "clinical_callout": {
        "severity": "contraindication",
        "title": "Signos de Alarma Médica y Prohibición de Automedicación con Antibióticos",
        "message": "Acuda inmediatamente a valoración médica si presenta fiebre alta con escalofríos, dolor lumbar intenso unilateral (sospecha de pielonefritis), sangre visible en la orina (hematuria) o vómitos. JAMÁS se automedique con antibióticos sobrantes: esto genera resistencia bacteriana severa y enmascara infecciones renales graves."
      }
    }'::jsonb
  );

  -- Lección 2
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Vías Urinarias Masculinas y Salud de la Próstata',
    'Relación anatómica entre uretra prostática y vejiga; síntomas de hiperplasia prostática benigna (HPB).',
    'text',
    '<h2>La Encrucijada Uretra-Próstata en el Varón</h2>
    <p>En el hombre, la uretra mide entre 18 y 20 cm y atraviesa directamente el centro de la <strong>glándula prostática</strong> (uretra prostática) justo debajo del cuello de la vejiga. A partir de los 40-45 años, el crecimiento prostático comprime este conducto como un anillo, impidiendo el vaciamiento completo de la vejiga.</p>
    <h3>Síntomas de Alerta Prostática (SUI):</h3>
    <ul>
      <li><strong>Disminución del calibre y fuerza del chorro urinario</strong> (chorro débil o entrecortado).</li>
      <li><strong>Nicturia:</strong> Necesidad de levantarse 2 o más veces en la madrugada a orinar.</li>
      <li><strong>Goteo post-miccional</strong> y sensación de vaciado vesical incompleto.</li>
      <li><strong>Urgencia miccional</strong> o demora al iniciar la micción.</li>
    </ul>
    <p>La retención crónica de orina residual en la vejiga favorece la formación de cálculos vesicales, infecciones urinarias masculinas y sobrecarga retrógrada hacia los riñones (hidronefrosis).</p>',
    2, true, false, true, 20,
    '{
      "clinical_callout": {
        "severity": "warning",
        "title": "Control Preventivo Masculino a partir de los 40 años",
        "message": "Todo varón mayor de 40 años (o desde los 35 si tiene antecedentes familiares) debe realizar su control anual de Antígeno Prostático Específico (PSA) y ecografía urológica vesico-prostática con medición de residuo post-miccional."
      }
    }'::jsonb
  );

  -- Lección 3 (Receta + Productos)
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Receta Ancestral de Tuza de Maíz y Sinergia con Madre Silvestre',
    'Preparación paso a paso de la decocción desinflamatoria urogenital y pauta con productos SUMAK.',
    'text',
    '<h2>Fitoterapia Tradicional para Desinflamar Vías Urinarias y Próstata</h2>
    <p>El Dr. Luis Paredes rescate una de las fórmulas caseras andinas más nobles y seguras como apoyo hidratante para aliviar la pesadez vesical, el ardor miccional leve y la congestión pélvica: la decocción suave de <strong>Tuza de Maíz, Cáscara de Ajo y Canela</strong>, complementada con la potencia estandarizada de <strong>Madre Silvestre</strong> y <strong>Té Extractos de la Vida</strong>.</p>',
    3, true, false, true, 20,
    '{
      "recipe_card": {
        "title": "Infusión Tradicional de Tuza de Maíz, Cáscara de Ajo y Canela",
        "prep_time": "20 min (10 min hervor + 10 min reposo)",
        "servings": "1 Litro (Agua de tiempo durante el día)",
        "ingredients": [
          {"name": "Tuza de maíz limpia (coronta) y/o pelo de choclo", "dose": "1 puñado mediano", "notes": "Diurético suave y calmante urotelial"},
          {"name": "Paja o cáscara externa limpia de ajo", "dose": "1 puñado pequeño", "notes": "Rica en quercetina y compuestos azufrados suaves"},
          {"name": "Canela en rama (preferiblemente Ceilán)", "dose": "1 rama mediana", "notes": "Antiespasmódica y termorreguladora pélvica"},
          {"name": "Agua filtrada", "dose": "1 Litro", "notes": "Vehículo de extracción"}
        ],
        "steps": [
          "Lavar perfectamente la tuza de maíz y las cáscaras secas externas del ajo.",
          "Colocar 1 litro de agua en una olla de acero inoxidable o vidrio junto con la tuza de maíz, la cáscara de ajo y la rama de canela.",
          "Hervir a fuego suave con la olla tapada durante 10 minutos.",
          "Apagar el fuego y dejar reposar tapado durante 10 minutos adicionales.",
          "Colar y beber tibio como agua de tiempo (2 a 3 tazas repartidas en el día), acompañando el protocolo con Madre Silvestre y Té Extractos de la Vida."
        ]
      }
    }'::jsonb
  ) returning id into v_les_id;

  insert into public.academy_lesson_products (lesson_id, product_code, product_name, product_slug, dosage, administration_route, precautions, protocol_phase, sort_order) values
    (v_les_id, '00001', 'Té Extractos de la Vida', 'te-extractos-de-la-vida', '30 ml (2 cucharadas) en un vaso con agua, 1 a 2 veces al día', 'Vía oral. Aporta Arándano Azul (PACs) contra E. coli.', 'Conservar refrigerado tras abrir.', 'Protección Urotelial', 1),
    (v_les_id, '00011', 'Madre Silvestre (Cápsulas)', 'capsula-madre-silvestre', '1 cápsula 2 veces al día antes de las comidas con agua tibia', 'Vía oral.', 'No usar en embarazo, lactancia ni insuficiencia renal terminal.', 'Desinflamación Pélvica y Urinaria', 2)
  on conflict (lesson_id, product_code) do nothing;


  -- ===========================================================================
  -- CURSO B: Hepatología Integrativa: Hígado Graso, Cirrosis y Regeneración
  -- ===========================================================================
  insert into public.academy_courses (
    title, slug, short_description, description,
    category_id, level, estimated_duration_minutes, status, access_mode,
    prerequisites, passing_percentage, generates_certificate, diploma_type_id,
    published_at, sort_order, metadata
  ) values (
    'Hepatología Integrativa: Hígado Graso, Cirrosis y Regeneración',
    'hepatologia-integrativa-higado-graso-regeneracion',
    'Domina las funciones vitales del hígado, la evolución histológica en 4 etapas (Esteatosis, Esteatohepatitis, Fibrosis y Cirrosis) y licuados hepatoprotectores.',
    'Curso médico-nutricional del Dr. Luis Paredes que detalla el diagnóstico, prevención y reversión temprana del Hígado Graso (MASLD/NAFLD). Estudiarás el criterio diagnóstico (>5% de grasa hepática), la diferencia entre fases reversibles e irreversibles, los factores de riesgo de carcinoma hepatocelular y las recetas funcionales de apio, perejil, manzana verde y nopal.',
    v_cat_id, 'intermediate', 180, 'published', 'free_registered',
    'Sin requisitos previos.', 75.00, true, v_dip_type_id, now(), 4,
    '{"speaker": "Dr. Luis Paredes", "objectives": ["Distinguir histológica y clínicamente las 4 etapas del daño hepático.", "Reconocer signos de hipertensión portal y descompensación cirrótica.", "Prescribir licuados hepatoprotectores ricos en fibra sin colar."]}'::jsonb
  ) on conflict (slug) do update set
    title = excluded.title, short_description = excluded.short_description, description = excluded.description, status = 'published'
  returning id into v_c_higado;

  delete from public.academy_modules where course_id = v_c_higado;
  delete from public.academy_assessments where course_id = v_c_higado;

  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_higado, 'Módulo 1: Hígado Graso y sus 4 Etapas Clínicas', 'Fisiología hepatobiliar, progresión de esteatosis a cirrosis, métodos diagnósticos y nutrición regenerativa.', 1, true)
  returning id into v_mod_id;

  -- Lección 1
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Funciones Vitales del Hígado y Diagnóstico de Esteatosis (>5% Grasa)',
    'Los 5 pilares bioquímicos del hepatocito y diferencias entre hígado graso metabólico y alcohólico.',
    'text',
    '<h2>El Laboratorio Central del Cuerpo Humano</h2>
    <p>El hígado ejecuta más de 500 funciones bioquímicas indispensables para la vida, agrupadas en cuatro ejes maestros:</p>
    <ol>
      <li><strong>Desintoxicación y Biotransformación (Fases I y II):</strong> Filtra la sangre procedente de la vena porta intestinal, neutralizando amoníaco (convirtiéndolo en urea), fármacos, hormonas, pesticidas y toxinas bacterianas.</li>
      <li><strong>Producción de Bilis (800 a 1000 ml/día):</strong> Emulsiona las grasas dietéticas y sirve como vehículo para excretar colesterol oxidado y bilirrubina.</li>
      <li><strong>Metabolismo de Nutrientes y Almacenamiento:</strong> Regula la glucemia (glucogenogénesis/glucogenólisis) y almacena Vitaminas A, D, E, K, B12, hierro y cobre.</li>
      <li><strong>Síntesis de Proteínas Plasmáticas y Coagulación:</strong> Produce la <em>albúmina</em> (que mantiene la presión oncótica para evitar edemas/ascitis) y los factores de coagulación sanguínea.</li>
    </ol>
    <h3>¿Cuándo hablamos clínicamente de Hígado Graso?</h3>
    <p>Se diagnostica esteatosis hepática cuando la acumulación de triglicéridos intracelulares <strong>supera el 5% del peso total del hígado</strong> (o más del 5% de los hepatocitos muestran vacuolas grasas). Se divide en <strong>Hígado Graso Metabólico / No Alcohólico (MASLD)</strong> —asociado a exceso de fructosa industrial, harinas refinadas, resistencia a la insulina y obesidad visceral— e <strong>Hígado Graso Alcohólico</strong>.</p>',
    1, true, true, true, 20,
    '{
      "clinical_callout": {
        "severity": "info",
        "title": "El Peligro del Jarabe de Maíz de Alta Fructosa",
        "message": "A diferencia de la glucosa (que es utilizada por todos los músculos del cuerpo), la fructosa líquida industrial de gaseosas y jugos procesados se metaboliza casi en un 100% en el hígado, activando la lipogénesis de novo y fabricando grasa hepática e hiperuricemia en pocas semanas."
      }
    }'::jsonb
  );

  -- Lección 2
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Las 4 Etapas Evolutivas: De la Esteatosis Reversible a la Cirrosis',
    'Progresión histológica celular y ventana de oportunidad terapéutica en las etapas 1, 2 y 3.',
    'text',
    '<h2>Las 4 Etapas Histológicas de la Enfermedad Hepática</h2>
    <ul>
      <li><strong>Etapa 1 — Esteatosis Hepática Simple (100% Reversible):</strong> Acumulación de gotas de grasa dentro de los hepatocitos sin inflamación ni cicatrización significativa. Es silenciosa y totalmente reversible mediante nutrición, ejercicio y depuración metabólica.</li>
      <li><strong>Etapa 2 — Esteatohepatitis / MASH (Reversible con intervención intensiva):</strong> La grasa acumulada se oxida (lipotoxicidad), desencadenando inflamación lobulillar, balonización y muerte de hepatocitos. Suelen elevarse las transaminasas (TGO/AST y TGP/ALT).</li>
      <li><strong>Etapa 3 — Fibrosis Hepática (Estabilizable y parcialmente regresiva):</strong> Las células estrelladas de Ito depositan bandas de colágeno y tejido cicatricial conectivo alrededor de los vasos sanguíneos. Si se elimina la causa a tiempo, se frena su avance hacia cirrosis.</li>
      <li><strong>Etapa 4 — Cirrosis Hepática (Daño Estructural Irreversible):</strong> El tejido funcional es reemplazado por nódulos de regeneración rodeados de tabiques fibrosos densos. El hígado se vuelve duro y nodular, bloqueando el flujo de la vena porta (hipertensión portal).</li>
    </ul>',
    2, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "contraindication",
        "title": "Signos de Descompensación en Etapa 4 (Cirrosis)",
        "message": "La cirrosis descompensada se manifiesta con: 1) Ictericia (piel y escleras amarillas por bilirrubina alta), 2) Ascitis (líquido libre en el abdomen), 3) Sangrado digestivo por várices esofágicas, y 4) Encefalopatía hepática (confusión mental, somnolencia y temblor por acumulación de amoníaco en el cerebro). Requiere manejo hospitalario especializado."
      }
    }'::jsonb
  );

  -- Lección 3
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Carcinoma Hepatocelular y Métodos de Diagnóstico Clínico',
    'Factores de riesgo de cáncer de hígado (cirrosis, VHB, VHC, aflatoxinas) y pruebas de laboratorio/imagen.',
    'text',
    '<h2>Prevención del Cáncer de Hígado (Carcinoma Hepatocelular)</h2>
    <p>El carcinoma hepatocelular es el tumor primario más frecuente del hígado y aparece en más del 80% de los casos sobre un hígado previamente cirrótico o con esteatohepatitis crónica avanzada.</p>
    <h3>Factores de Riesgo Mayores:</h3>
    <ul>
      <li>Cirrosis de cualquier causa (metabólica, alcohólica o viral).</li>
      <li>Infección crónica por virus de <strong>Hepatitis B (VHB)</strong> o <strong>Hepatitis C (VHC)</strong>.</li>
      <li>Exposición alimentaria a <strong>Aflatoxinas</strong> (micotoxinas producidas por el hongo <em>Aspergillus flavus</em> en granos, maní o maíz almacenados en humedad).</li>
    </ul>
    <h3>Protocolo Diagnóstico Completo:</h3>
    <ol>
      <li><strong>Perfil Hepático en Sangre:</strong> TGO (AST), TGP (ALT), GGT, Fosfatasa Alcalina, Bilirrubinas, Albúmina, Tiempo de Protrombina (INR) y plaquetas.</li>
      <li><strong>Ecografía Abdominal:</strong> Evalúa la ecogenicidad ("hígado brillante") y morfología.</li>
      <li><strong>Elastografía de Transición (FibroScan):</strong> Mide de forma no invasiva la rigidez del hígado en kilopascales (kPa) para cuantificar el grado exacto de fibrosis (F0 a F4).</li>
      <li><strong>Tomografía / Resonancia Magnética y Biopsia Hepática:</strong> Confirmación definitiva en lesiones focales.</li>
    </ol>',
    3, true, false, true, 20,
    '{}'::jsonb
  );

  -- Lección 4 (Recetas + Productos)
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Recetas Hepatoprotectoras (Apio, Perejil, Manzana, Nopal) y Protocolo SUMAK',
    'Licuados funcionales sin colar para barrido biliar y sinergia con Té Extractos de la Vida, REGEN 24 y Vive-Oxi-100.',
    'text',
    '<h2>Nutrición Terapéutica para Revertir la Esteatosis</h2>
    <p>El secreto bioquímico de los licuados hepatoprotectores del Dr. Luis Paredes reside en <strong>NO COLAR la preparación</strong>: la fibra insoluble y las pectinas de la manzana verde y el nopal secuestran las sales biliares cargadas de colesterol y toxinas en el duodeno, obligando al hígado a movilizar sus depósitos de grasa intracelular.</p>
    <p><strong>Receta Complementaria Digestivo-Hepática:</strong> Licuar <em>1 taza de papaya madura picada + 1/2 manzana verde con cáscara + 1 vaso de agua pura (sin azúcar añadida)</em>, ideal para pacientes con hígado graso acompañado de digestión pesada y estreñimiento.</p>',
    4, true, false, true, 25,
    '{
      "recipe_card": {
        "title": "Licuado Verde Hepatoprotector de Apio, Perejil, Manzana Verde y Nopal",
        "prep_time": "5 minutos (Preparar y beber al instante)",
        "servings": "1 Vaso de 250-300 ml (3 a 5 días por semana en el desayuno)",
        "ingredients": [
          {"name": "Apio fresco (tallo y hojas)", "dose": "1 rama mediana", "notes": "Aporta ftálidos y luteolina antiinflamatoria"},
          {"name": "Perejil fresco desinfectado", "dose": "1 puñado pequeño", "notes": "Estimula el glutatión hepático (precaución con warfarina)"},
          {"name": "Manzana verde con cáscara", "dose": "1/2 unidad", "notes": "Rica en ácido málico y pectina quelante biliar"},
          {"name": "Penca de nopal tierno sin espinas", "dose": "1/2 penca pequeña", "notes": "Mucílagos reguladores de glucosa y triglicéridos"},
          {"name": "Canela en polvo (Ceilán) + Agua pura", "dose": "1/2 cdta en 250-300 ml de agua", "notes": "Sensibilizador de receptores de insulina"}
        ],
        "steps": [
          "Lavar y desinfectar cuidadosamente el apio, el perejil, la media manzana verde (conservando su cáscara) y la media penca de nopal limpia.",
          "Trocear los ingredientes e introducirlos en la licuadora junto con media cucharadita de canela y 250 a 300 ml de agua pura.",
          "Licuar a alta velocidad hasta obtener una textura homogénea.",
          "Servir y beber INMEDIATAMENTE SIN COLAR junto con el desayuno, de 3 a 5 días por semana."
        ]
      }
    }'::jsonb
  ) returning id into v_les_id;

  insert into public.academy_lesson_products (lesson_id, product_code, product_name, product_slug, dosage, administration_route, precautions, protocol_phase, sort_order) values
    (v_les_id, '00001', 'Té Extractos de la Vida', 'te-extractos-de-la-vida', '30 ml diluidos en un vaso de agua, 2 veces al día', 'Vía oral. Aporta Diente de León, Pectina de Manzana y Resveratrol.', 'Refrigerar una vez abierto.', 'Drenaje Biliar y Antioxidación Hepática', 1),
    (v_les_id, '00002', 'REGEN 24', 'regen-24', '30 ml diluidos en un vaso de agua antes del almuerzo', 'Vía oral.', 'No recomendado en embarazo ni obstrucción intestinal.', 'Desintoxicación Enterohepática', 2),
    (v_les_id, '00004', 'Vive-Oxi-100', 'vive-oxi-100', '20 a 30 gotas en medio vaso de agua pura, 2 veces al día', 'Vía oral.', 'No exceder dosis recomendada.', 'Respiración Mitocondrial del Hepatocito', 3)
  on conflict (lesson_id, product_code) do nothing;


  -- ===========================================================================
  -- CURSO C: Gastroenterología Funcional: Gastritis, Úlceras, Colitis y H. Pylori
  -- ===========================================================================
  insert into public.academy_courses (
    title, slug, short_description, description,
    category_id, level, estimated_duration_minutes, status, access_mode,
    prerequisites, passing_percentage, generates_certificate, diploma_type_id,
    published_at, sort_order, metadata
  ) values (
    'Gastroenterología Funcional: Gastritis, Úlceras, Colitis, H. Pylori y Hemorroides',
    'gastroenterologia-funcional-gastritis-colitis-sumak',
    'Manejo clínico de gastritis, úlceras, erradicación de Helicobacter pylori, 4 tipos de colitis, hemorroides y por qué NO mezclar ajo + sábila + manzana en ayunas.',
    'Curso especializado del Dr. Luis Paredes sobre fisiopatología y regeneración del tubo digestivo superior e inferior. Incluye el protocolo diagnóstico y terapéutico de Helicobacter pylori, clasificación clínica de las colitis, guía científica de incompatibilidad de remedios caseros agresivos en ayunas y recetas mucilaginosas reparadoras.',
    v_cat_id, 'intermediate', 210, 'published', 'free_registered',
    'Sin requisitos previos.', 75.00, true, v_dip_type_id, now(), 5,
    '{"speaker": "Dr. Luis Paredes", "objectives": ["Identificar causas y signos de sangrado digestivo en gastritis y úlceras.", "Diagnosticar y acompañar el tratamiento erradicador de Helicobacter pylori.", "Explicar científicamente por qué no se debe mezclar ajo crudo, sábila mal purgada y manzana verde en ayunas."]}'::jsonb
  ) on conflict (slug) do update set
    title = excluded.title, short_description = excluded.short_description, description = excluded.description, status = 'published'
  returning id into v_c_gastro;

  delete from public.academy_modules where course_id = v_c_gastro;
  delete from public.academy_assessments where course_id = v_c_gastro;

  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_gastro, 'Módulo 1: Estómago, Mucosa Gástrica y Helicobacter Pylori', 'Barrera mucosa gástrica, gastritis aguda/crónica, úlceras pépticas y protocolo integral contra H. pylori.', 1, true)
  returning id into v_mod_id;

  -- Lección 1.1
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Gastritis: Factores Agresores de la Mucosa y Nutrición Demulcente',
    'Causas farmacológicas (AINEs), infecciosas y emocionales; alimentos protectores vs irritantes.',
    'text',
    '<h2>Fisiopatología de la Gastritis</h2>
    <p>La gastritis es la inflamación histológica de la mucosa gástrica cuando se rompe el equilibrio entre los factores defensivos (moco, bicarbonato, prostaglandinas y flujo sanguíneo mucoso) y los factores agresivos (ácido clorhídrico y pepsina).</p>
    <h3>Causas Principales:</h3>
    <ul>
      <li><strong>Abuso de AINEs (Antiinflamatorios No Esteroideos):</strong> Ibuprofeno, naproxeno, diclofenaco, ketorolaco y aspirina inhiben la enzima COX-1, bloqueando la síntesis de prostaglandinas que fabrican el moco protector del estómago.</li>
      <li><strong>Infección por <em>Helicobacter pylori</em>.</strong></li>
      <li><strong>Estrés neuroendocrino crónico, alcohol, tabaco, café en ayunas y picantes irritantes.</strong></li>
    </ul>
    <h3>Alimentos Recomendados y Remedios Suaves:</h3>
    <ul>
      <li><strong>Alimentos reparadores:</strong> Avena cocida o en mucílago, banano maduro (rico en leucocianidina), papaya, verduras cocidas al vapor (zanahoria, zapallo) y yogur natural probiótico si hay tolerancia.</li>
      <li><strong>Fitoterapia calmante:</strong> Infusión tibia de manzanilla, gel puro de sábila (cristal lavado sin aloína), agua de avena en ayunas e infusión muy suave de jengibre.</li>
    </ul>',
    1, true, true, true, 20,
    '{}'::jsonb
  );

  -- Lección 1.2
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Úlceras Pépticas y Protocolo Integral contra Helicobacter Pylori',
    'Diferencias entre úlcera gástrica y duodenal, signos de alarma hemorrágica y diagnóstico/erradicación de H. pylori.',
    'text',
    '<h2>Úlcera Gástrica vs. Úlcera Duodenal y <em>Helicobacter pylori</em></h2>
    <p>Una úlcera péptica es una excavación profunda de la pared digestiva que supera la capa muscular de la mucosa. Mientras el dolor de la <strong>úlcera gástrica</strong> suele empeorar inmediatamente al comer, el de la <strong>úlcera duodenal</strong> aparece 2 a 3 horas después de las comidas o a medianoche.</p>
    <h3><em>Helicobacter pylori</em>: La Bacteria Espiralada</h3>
    <ul>
      <li><strong>Vías de transmisión:</strong> Agua o alimentos contaminados y contacto directo por saliva o utensilios mal higienizados.</li>
      <li><strong>Riesgo oncológico:</strong> Su inflamación crónica no tratada predispone a gastritis atrófica, metaplasia intestinal, <strong>adenocarcinoma gástrico</strong> y <strong>linfoma MALT</strong>.</li>
      <li><strong>Diagnóstico de certeza:</strong> Test de aliento con urea marcada, prueba de antígeno monoclonal en heces y endoscopia digestiva alta con biopsia (evitar diagnósticos falsos solo por anticuerpos IgG en sangre que quedan positivos por años).</li>
      <li><strong>Tratamiento y verificación:</strong> Esquema médico combinado (antibióticos específicos + inhibidor de bomba de protones + sales de bismuto) acompañado de probióticos y verificación obligatoria de erradicación 4 semanas después de finalizar.</li>
    </ul>',
    2, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "contraindication",
        "title": "Signos de Alarma de Hemorragia Digestiva Alta (Urgencia Médica)",
        "message": "Derive a emergencias hospitalarias de inmediato si el paciente presenta: 1) Hematemesis (vómito con sangre roja o en borra de café), 2) Melenas (heces negras, alquitranadas y fétidas por sangre digerida), 3) Pérdida de peso inexplicable o 4) Disfagia (dificultad para tragar)."
      }
    }'::jsonb
  );

  -- Módulo 2 de Gastroenterología
  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_gastro, 'Módulo 2: Colitis, Hemorroides y Mitos de Combinaciones Naturales', 'Los 4 tipos de colitis, enfermedad hemorroidal, tabla de incompatibilidad de Ajo+Sábila+Manzana y recetas digestivas.', 2, true)
  returning id into v_mod2_id;

  -- Lección 2.1
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod2_id,
    'Los 4 Tipos de Colitis, Colon Irritable y Enfermedad Hemorroidal',
    'Diferenciación entre trastorno funcional (SII) y colitis orgánica; manejo de hemorroides internas y externas.',
    'text',
    '<h2>Colitis Orgánica vs. Síndrome de Intestino Irritable (SII)</h2>
    <p>Mientras el Síndrome de Intestino Irritable es un trastorno funcional del eje microbiota-intestino-cerebro (dolor que alivia al evacuar y alternancia entre diarrea y estreñimiento sin lesión anatómica), la <strong>Colitis</strong> implica inflamación real de la mucosa colónica en 4 variantes:</p>
    <ol>
      <li><strong>Colitis Infecciosa:</strong> Causada por bacterias (<em>Salmonella, Shigella, Campylobacter</em>) o parásitos/amebas (<em>Entamoeba histolytica</em>).</li>
      <li><strong>Colitis Ulcerosa:</strong> Enfermedad inflamatoria intestinal autoinmune con úlceras continuas en recto y colon, caracterizada por diarrea con moco y sangre.</li>
      <li><strong>Colitis Microscópica (Colágena o Linfocítica):</strong> Causa diarrea acuosa crónica con colonoscopia visualmente normal que se detecta por biopsia.</li>
      <li><strong>Colitis Isquémica:</strong> Reducción brusca del flujo sanguíneo mesentérico en adultos mayores o pacientes vasculares.</li>
    </ol>
    <h3>Enfermedad Hemorroidal (Internas, Externas y Trombosadas)</h3>
    <p>Son dilataciones varicosas de los plexos venosos hemorroidales por hipertensión venosa al pujar en el estreñimiento crónico. El pilar del tratamiento es ablandar las heces con fibra soluble (mucílagos), beber 2 litros de agua y <strong>no permanecer sentado ni pujar más de 3-5 minutos en el inodoro</strong>.</p>',
    1, true, false, true, 20,
    '{}'::jsonb
  );

  -- Lección 2.2 (Guía Clínica de Tolerancia: Por qué NO mezclar Ajo + Sábila + Manzana)
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod2_id,
    'Guía Clínica de Tolerancia: Por qué NO mezclar Ajo + Sábila + Manzana Verde en Ayunas',
    'Desmitificación científica de mezclas agresivas virales y pauta individualizada según la patología digestiva.',
    'text',
    '<h2>El Error de las Mezclas Agresivas en Ayunas</h2>
    <p>En redes sociales suele recomendarse licuar <strong>Ajo crudo + Sábila entera + Manzana verde en ayunas</strong> como "cura universal" para gastritis, úlceras y colitis. El Dr. Luis Paredes advierte por qué esta combinación puede empeorar gravemente a un paciente con mucosa lesionada:</p>
    <table class="w-full text-sm border-collapse border border-slate-200 my-4">
      <thead>
        <tr class="bg-slate-100">
          <th class="border border-slate-200 p-2">Ingrediente</th>
          <th class="border border-slate-200 p-2">Efecto Adverso en Mucosa Inflamada</th>
          <th class="border border-slate-200 p-2">Interacción / Riesgo Clínico</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="border border-slate-200 p-2"><strong>Ajo Crudo en Ayunas</strong></td>
          <td class="border border-slate-200 p-2">La alicina concentrada quema e irrita directamente la úlcera o gastritis erosiva y relaja el esfínter esofágico (reflujo).</td>
          <td class="border border-slate-200 p-2">Efecto antiagregante plaquetario: aumenta el riesgo de <strong>sangrado digestivo</strong> si el paciente toma aspirina o anticoagulantes.</td>
        </tr>
        <tr>
          <td class="border border-slate-200 p-2"><strong>Sábila con Látex (Aloína)</strong></td>
          <td class="border border-slate-200 p-2">Si no se extrae solo el gel transparente y lleva restos de acíbar amarillo, provoca espasmo colónico violento y diarrea.</td>
          <td class="border border-slate-200 p-2">Depleción severa de potasio (hipopotasemia), deshidratación y daño tubular renal.</td>
        </tr>
        <tr>
          <td class="border border-slate-200 p-2"><strong>Manzana Verde Cruda</strong></td>
          <td class="border border-slate-200 p-2">Rica en fructosa libre y sorbitol (carbohidratos FODMAP altamente fermentables).</td>
          <td class="border border-slate-200 p-2">En pacientes con <strong>Colon Irritable o SIBO</strong>, fermenta rápidamente produciendo gases, distensión y dolor abdominal.</td>
        </tr>
      </tbody>
    </table>
    <h3>Regla Clínica de Uso Separado:</h3>
    <ul>
      <li><strong>En Gastritis / Úlcera:</strong> Usar únicamente <em>Gel puro de Sábila lavado</em> o <em>Agua de Avena</em> (CERO ajo crudo).</li>
      <li><strong>En Colon Irritable con Gases:</strong> Usar infusión de manzanilla y verduras cocidas (evitar manzana cruda y ajo crudo en fase aguda).</li>
    </ul>',
    2, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "toxicity",
        "title": "Alerta en Pacientes con Úlcera Sangrante o Anticoagulados",
        "message": "Jamás administre ajo crudo machacado en ayunas a un paciente con gastritis erosiva, úlcera péptica activa o tratamiento con warfarina/clopidogrel/aspirina: el riesgo de gastritis hemorrágica se multiplica."
      }
    }'::jsonb
  );

  -- Lección 2.3 (Recetas + Productos)
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod2_id,
    'Recetas Reparadoras (Agua de Avena, Manzanilla y Batido Verde Digestivo) + Fórmulas SUMAK',
    'Preparaciones suaves avaladas para gastritis y colon, vinculadas con Fibramak Plus, Colón Renova y REGEN 24.',
    'text',
    '<h2>Fórmulas Caseras de Alta Tolerancia Mucosa</h2>
    <ul>
      <li><strong>1. Agua de Avena Mucilaginosa:</strong> Remojar 2 cucharadas de hojuelas de avena integral en 1 vaso de agua tibia durante 15-20 minutos, licuar y beber en ayunas para tapizar el estómago con beta-glucanos.</li>
      <li><strong>2. Té de Manzanilla Antiinflamatorio:</strong> Infusionar 1 cucharada de flores de manzanilla en 1 taza de agua recién hervida (apagada y tapada por 5 minutos). Colar y beber tibio después de las comidas.</li>
    </ul>',
    3, true, false, true, 20,
    '{
      "recipe_card": {
        "title": "Batido Verde Digestivo y Prebiótico de Alta Tolerancia",
        "prep_time": "10 minutos",
        "servings": "1 Vaso grande (Desayuno o media mañana)",
        "ingredients": [
          {"name": "Brócoli cocido al vapor y enfriado", "dose": "1/2 taza de arbolitos", "notes": "Aporta sulforafano bactericida contra H. pylori sin irritar"},
          {"name": "Arándanos azules frescos", "dose": "1/2 taza", "notes": "Polifenoles cicatrizantes de la mucosa"},
          {"name": "Piña madura y Banana", "dose": "1 rodaja de piña + 1/2 banana madura", "notes": "Bromelina digestiva y leucocianidina"},
          {"name": "Agua pura", "dose": "1 vaso (250 ml)", "notes": "Base líquida libre de lácteos"}
        ],
        "steps": [
          "Cocinar los arbolitos de brócoli al vapor durante 3 a 4 minutos (para inactivar bociógenos y ablandar la fibra) y dejar enfriar.",
          "Colocar en la licuadora el brócoli frío, los arándanos, la piña, la media banana madura y el vaso de agua.",
          "Licuar hasta lograr una crema suave y tomar despacio ensalivando cada sorbo."
        ]
      }
    }'::jsonb
  ) returning id into v_les_id;

  insert into public.academy_lesson_products (lesson_id, product_code, product_name, product_slug, dosage, administration_route, precautions, protocol_phase, sort_order) values
    (v_les_id, '00005', 'Fibramak Plus', 'fibramak-plus', '2 cucharadas (10 g) disueltas en agua o jugo por la mañana', 'Vía oral con abundante agua en el día.', 'Apto para restaurar el tránsito intestinal con probióticos vegetales, avena, chía y sábila.', 'Reparación y Tránsito Digestivo', 1),
    (v_les_id, '00016', 'Fórmula Herbal Colón Renova', 'colon-renova', '30 ml mañana y 30 ml noche (en protocolo antiparasitario de adultos)', 'Vía oral.', 'Exclusivo adultos. No usar en embarazo, lactancia, úlcera sangrante ni obstrucción intestinal.', 'Limpieza Profunda y Antiparasitaria', 2),
    (v_les_id, '00002', 'REGEN 24', 'regen-24', '30 ml diluidos en un vaso de agua, 1 a 2 veces al día', 'Vía oral.', 'No recomendado en embarazo o lactancia.', 'Regeneración Mucosa e Inmunidad', 3)
  on conflict (lesson_id, product_code) do nothing;


  -- ===========================================================================
  -- CURSO D: Vademécum de Herbolaria, Toxicología Botánica y Fitoterapia Práctica
  -- ===========================================================================
  insert into public.academy_courses (
    title, slug, short_description, description,
    category_id, level, estimated_duration_minutes, status, access_mode,
    prerequisites, passing_percentage, generates_certificate, diploma_type_id,
    published_at, sort_order, metadata
  ) values (
    'Vademécum de Herbolaria, Toxicología Botánica y Fitoterapia Práctica',
    'vademecum-herbolaria-toxicologia-botanica-sumak',
    'Domina la toxicología clínica de 11 plantas comunes (Mala Madre, Ruda, Noni, Sábila, Canela, Chía, Nopal, Perejil...) y las 10 infusiones de uso responsable.',
    'Curso de seguridad clínica fitoterapéutica dictado por el Dr. Luis Paredes. Porque "natural no siempre significa inocuo", aprenderás a identificar las plantas de toxicidad cardiaca, abortiva o hepatorrenal prohibidas por vía oral, las interacciones críticas con anticoagulantes (warfarina) e hipoglucemiantes, y la regla maestra para preparar infusiones medicinales seguras.',
    v_cat_id, 'advanced', 240, 'published', 'free_registered',
    'Sin requisitos previos.', 75.00, true, v_dip_type_id, now(), 6,
    '{"speaker": "Dr. Luis Paredes", "objectives": ["Reconocer por qué Mala Madre (Kalanchoe) y Ruda están prohibidas por vía oral.", "Prevenir interacciones entre perejil/apio/clavo y fármacos anticoagulantes.", "Aplicar la regla maestra de infusión (1 cdta en 250 ml por 5-10 min) y la separación de 2 horas en mucílagos."]}'::jsonb
  ) on conflict (slug) do update set
    title = excluded.title, short_description = excluded.short_description, description = excluded.description, status = 'published'
  returning id into v_c_herbolaria;

  delete from public.academy_modules where course_id = v_c_herbolaria;
  delete from public.academy_assessments where course_id = v_c_herbolaria;

  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_herbolaria, 'Módulo 1: Botánica y Toxicología de 11 Plantas Comunes', 'Clasificación toxicológica, principios activos de riesgo y contraindicaciones médicas estrictas.', 1, true)
  returning id into v_mod_id;

  -- Lección 1.1 (Plantas Prohibidas por Vía Oral: Mala Madre y Ruda)
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Plantas de Toxicidad Alta: Mala Madre (Kalanchoe) y Ruda (Ruta graveolens)',
    'Cardiotoxicidad por bufadienólidos, efecto abortivo y hepatonefrotoxicidad.',
    'text',
    '<h2>Por qué "Natural" no es sinónimo de "Inocuo"</h2>
    <p>En la práctica comunitaria existen dos plantas ornamentales y tradicionales cuya ingestión casera representa un peligro médico grave:</p>
    <ol>
      <li><strong>Mala Madre / Aranto (<em>Kalanchoe / Bryophyllum spp.</em>):</strong> Contiene <em>bufadienólidos</em> (glucósidos esteroideos cardiotónicos). Su ingestión en licuados o infusiones puede provocar intoxicación cardiaca severa, arritmias y paro cardiorrespiratorio. Su uso tradicional debe limitarse exclusivamente a emplastos tópicos externos.</li>
      <li><strong>Ruda (<em>Ruta graveolens</em>):</strong> Rica en <em>furanocumarinas y alcaloides quinoleínicos</em>. Por vía oral es <strong>abortiva</strong> (induce contracciones uterinas hemorrágicas), neurotóxica, hepatotóxica y nefrotóxica, además de causar dermatitis fototóxica al sol.</li>
    </ol>',
    1, true, true, true, 25,
    '{
      "clinical_callout": {
        "severity": "toxicity",
        "title": "Prohibición Absoluta de Ingesta Oral Casera",
        "message": "Nunca recomiende ni permita la ingestión oral de infusiones, extractos o licuados de Mala Madre (Kalanchoe) ni de Ruda (Ruta graveolens). Ante cualquier ingesta accidental con mareo, vómito, dolor abdominal o alteración del pulso, acudir de inmediato a toxicología de urgencias."
      }
    }'::jsonb
  ) returning id into v_les_id;

  select id into v_bot_id from public.academy_botanical_sheets where slug = 'mala-madre-kalanchoe';
  if v_bot_id is not null then
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values (v_les_id, v_bot_id, 'Planta cardiotóxica por vía oral (bufadienólidos); prohibida su ingestión casera.', 1) on conflict do nothing;
  end if;
  select id into v_bot_id from public.academy_botanical_sheets where slug = 'ruda-graveolens';
  if v_bot_id is not null then
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values (v_les_id, v_bot_id, 'Planta abortiva, hepatotóxica y nefrotóxica; prohibida su ingestión oral.', 2) on conflict do nothing;
  end if;

  -- Lección 1.2 (Noni, Sábila, Canela, Chía, Nopal, Pepino, Apio, Perejil y Romero)
  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Noni, Sábila, Canela, Chía, Nopal, Romero y el Complejo Verde (Vitamina K)',
    'Criterios de preparación segura, hidratación de mucílagos e interacciones con fármacos anticoagulantes y antidiabéticos.',
    'text',
    '<h2>Reglas Clínicas para las 9 Plantas Funcionales de Uso Frecuente</h2>
    <ul>
      <li><strong>Noni (<em>Morinda citrifolia</em>):</strong> Muy rico en potasio; evitar fermentos artesanales en pacientes con enfermedad renal crónica o hepatopatía.</li>
      <li><strong>Sábila (<em>Aloe vera</em>):</strong> Usar únicamente el gel cristalino interno; desechar siempre el látex amarillo (aloína) por su efecto purgante irritante.</li>
      <li><strong>Canela:</strong> Preferir <em>Cinnamomum verum</em> (Ceilán) sobre <em>C. cassia</em> para evitar el exceso de cumarina hepatotóxica.</li>
      <li><strong>Chía (<em>Salvia hispanica</em>):</strong> Hidratar siempre 15-20 minutos antes de tragar para evitar obstrucción esofágica.</li>
      <li><strong>Nopal (<em>Opuntia ficus-indica</em>):</strong> Separar de medicamentos orales y vigilar glucemia si se usa junto a hipoglucemiantes.</li>
      <li><strong>Pepino, Apio y Perejil:</strong> El perejil y el apio son ricos en <strong>Vitamina K</strong> (antagonizan a la Warfarina); el perejil concentrado está contraindicado en embarazo.</li>
      <li><strong>Romero (<em>Salvia rosmarinus</em>):</strong> No ingerir aceite esencial puro; precaución en epilepsia y embarazo.</li>
    </ul>',
    2, true, false, true, 30,
    '{
      "clinical_callout": {
        "severity": "warning",
        "title": "Interacción Crítica: Jugos Verdes (Perejil/Apio) y Warfarina",
        "message": "Todo paciente que tome anticoagulantes antagonistas de la Vitamina K (Warfarina / Acenocumarol) debe mantener estable su ingesta de hojas verdes y evitar batidos concentrados de perejil o apio que anulan el efecto anticoagulante."
      }
    }'::jsonb
  ) returning id into v_les_id;

  insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
  select v_les_id, id, 'Ficha toxicológica y de uso prudente del Módulo 1 de Herbolaria.', row_number() over ()
  from public.academy_botanical_sheets
  where slug in ('noni', 'sabila-aloe-vera', 'canela-ceilan', 'chia-salvia', 'nopal-opuntia', 'perejil-apio-pepino', 'romero-salvia')
  on conflict do nothing;

  -- Módulo 2 de Herbolaria Práctica
  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_herbolaria, 'Módulo 2: Fitoterapia Práctica — 10 Infusiones y Reglas de Uso Responsable', 'Dosificación estándar de infusiones (1 cdta / 250 ml), tiempos de reposo y separación de fármacos.', 2, true)
  returning id into v_mod2_id;

  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod2_id,
    'Las 10 Infusiones Medicinales y la Regla Maestra de Preparación',
    'Manzanilla, Orégano, Menta, Clavo de olor, Linaza, Lavanda, Malva blanca, Cola de caballo, Pelo de choclo y Romero.',
    'text',
    '<h2>Regla Maestra de la Infusión Responsable</h2>
    <p>Para extraer los aceites esenciales y flavonoides sin arrastrar taninos irritantes ni concentrar alcaloides tóxicos, toda infusión casera debe respetar 4 principios:</p>
    <ol>
      <li><strong>Proporción estándar:</strong> 1 cucharadita (aprox. 2 a 3 gramos) de planta seca por cada taza (250 ml) de agua recién hervida.</li>
      <li><strong>No hervir las hojas/flores:</strong> Apagar el fuego, verter el agua sobre la planta, <strong>tapar durante 5 a 10 minutos</strong> y colar.</li>
      <li><strong>No mezclar múltiples plantas al azar</strong> ni superar 2 a 3 tazas al día por ciclos cortos.</li>
      <li><strong>Separación farmacológica:</strong> Las semillas mucilaginosas como la <strong>Linaza</strong> y la <strong>Malva Blanca</strong> deben tomarse separadas por al menos <strong>2 horas</strong> de cualquier medicamento oral.</li>
    </ol>
    <h3>Precauciones Específicas de las 10 Infusiones:</h3>
    <ul>
      <li><strong>Menta (<em>Mentha piperita</em>):</strong> Excelente en espasmo colónico, pero <strong>contraindicada en reflujo gastroesofágico y acidez</strong> porque relaja el esfínter esofágico inferior.</li>
      <li><strong>Clavo de olor (<em>Syzygium aromaticum</em>):</strong> Rico en eugenol; en exceso irrita la mucosa gástrica y suma efecto anticoagulante.</li>
      <li><strong>Cola de caballo (<em>Equisetum arvense</em>):</strong> No usar en insuficiencia renal o cardíaca severa ni junto a sales de litio o digoxina.</li>
    </ul>',
    1, true, false, true, 25,
    '{}'::jsonb
  ) returning id into v_les_id;

  insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
  select v_les_id, id, 'Infusión medicinal de uso responsable (Módulo 2).', row_number() over ()
  from public.academy_botanical_sheets
  where slug in ('manzanilla-matricaria', 'menta-piperita', 'linaza-clavo-malva', 'cola-de-caballo')
  on conflict do nothing;


  -- ===========================================================================
  -- CURSO E: Salud Metabólica, Páncreas, Diabetes, Hipertensión y Nutrición Cromática
  -- ===========================================================================
  insert into public.academy_courses (
    title, slug, short_description, description,
    category_id, level, estimated_duration_minutes, status, access_mode,
    prerequisites, passing_percentage, generates_certificate, diploma_type_id,
    published_at, sort_order, metadata
  ) values (
    'Salud Metabólica, Páncreas, Diabetes, Hipertensión y Nutrición Cromática',
    'salud-metabolica-pancreas-diabetes-hipertension-sumak',
    'Fisiología pancreática, Plato Saludable de Harvard, Dieta DASH en hipertensión, Diabetes Tipo 1/2/Gestacional (Dr. Miguel Loor) y los 5 colores de los alimentos.',
    'Curso multidisciplinario impartido por el Dr. Luis Paredes y el Dr. Miguel Loor. Integra el cuidado exocrino y endocrino del páncreas, prevención de pancreatitis, control de hipertensión arterial con los 6 pilares de la Dieta DASH, manejo clínico de la diabetes mellitus y la ciencia de los fitonutrientes por color con el Desayuno Regenerador de Colon y Estómago.',
    v_cat_id, 'intermediate', 220, 'published', 'free_registered',
    'Sin requisitos previos.', 75.00, true, v_dip_type_id, now(), 7,
    '{"speaker": "Dr. Luis Paredes & Dr. Miguel Loor", "objectives": ["Aplicar el método del Plato Saludable de Harvard (plato de 9 pulgadas) y la Dieta DASH.", "Diferenciar Diabetes Tipo 1, Tipo 2 y Gestacional y proteger sus órganos diana.", "Preparar el Desayuno Saludable Regenerador y la Infusión de Bienestar y Vitalidad."]}'::jsonb
  ) on conflict (slug) do update set
    title = excluded.title, short_description = excluded.short_description, description = excluded.description, status = 'published'
  returning id into v_c_metabolica;

  delete from public.academy_modules where course_id = v_c_metabolica;
  delete from public.academy_assessments where course_id = v_c_metabolica;

  -- Módulo 1: Páncreas e Hipertensión
  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_metabolica, 'Módulo 1: Páncreas, Pancreatitis e Hipertensión Arterial', 'Función exocrina y endocrina del páncreas, Plato de Harvard de 9 pulgadas y los 6 pilares de la Dieta DASH.', 1, true)
  returning id into v_mod_id;

  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Anatomía del Páncreas, Pancreatitis y el Plato Saludable de Harvard (9 Pulgadas)',
    'Cabeza y cola del páncreas, insulina/glucagón, causas de pancreatitis y distribución exacta del plato metabólico.',
    'text',
    '<h2>Doble Función del Páncreas: Exocrina y Endocrina</h2>
    <p>Ubicado transversalmente detrás del estómago (dividido en cabeza, cuerpo y cola), el páncreas cumple dos misiones vitales:</p>
    <ul>
      <li><strong>Función Exocrina ( Digestiva ):</strong> Secreta jugo pancreático rico en bicarbonato y enzimas (amilasa, lipasa y tripsina) hacia el duodeno para digerir carbohidratos, grasas y proteínas.</li>
      <li><strong>Función Endocrina ( Hormonal ):</strong> En los Islotes de Langerhans, las <strong>células Alfa</strong> secretan <em>glucagón</em> y las <strong>células Beta</strong> secretan <em>insulina</em> para regular la glucosa en sangre.</li>
    </ul>
    <h3>Pancreatitis Aguda y Crónica</h3>
    <p>Se produce cuando las enzimas digestivas se activan prematuramente dentro del propio páncreas, autodigiriendo su tejido. Sus 3 causas principales son: <strong>cálculos biliares impactados en el colédoco</strong>, <strong>hipertrigliceridemia severa (>500-1000 mg/dl)</strong> y <strong>consumo de alcohol</strong>. Su síntoma clásico es dolor epigástrico intenso que se irradia en cinturón hacia la espalda acompañado de vómitos.</p>
    <h3>El Plato para Comer Saludable de Harvard (Plato de 9 Pulgadas)</h3>
    <ul>
      <li><strong>50% del plato (Mitad completa):</strong> Verduras y vegetales sin almidón de distintos colores (brócoli, espinaca, pepino, tomate, zanahoria).</li>
      <li><strong>25% del plato (Un cuarto):</strong> Proteína saludable de alta calidad (pescado, aves, legumbres, quinua, huevo).</li>
      <li><strong>25% del plato (Un cuarto):</strong> Carbohidratos complejos y granos integrales (avena, arroz integral, quinua), evitando harinas blancas y azúcares.</li>
    </ul>',
    1, true, true, true, 25,
    '{}'::jsonb
  );

  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod_id,
    'Hipertensión Arterial y los 6 Pilares de la Dieta DASH',
    'Prevención del enemigo silencioso cardiovascular y protocolo nutricional reductor de sodio y rico en potasio/magnesio.',
    'text',
    '<h2>Los 6 Pilares Clínicos contra la Hipertensión Arterial (Enfoque DASH)</h2>
    <ol>
      <li><strong>Reducción drástica del sodio oculto:</strong> Limitar embutidos, enlatados, cubos de caldo y snacks ultraprocesados (<1,500 a 2,000 mg de sodio/día).</li>
      <li><strong>Incremento de Potasio, Magnesio y Calcio celular:</strong> Mediante vegetales verdes, frutas bajas en índice glucémico, semillas y <em>Bebida Andina SUMAK (Flor de Jamaica + Maíz Morado)</em>.</li>
      <li><strong>Actividad física aeróbica regular:</strong> Mínimo <strong>150 minutos semanales</strong> de caminata rápida, natación o bicicleta.</li>
      <li><strong>Control del peso corporal y perímetro abdominal.</strong></li>
      <li><strong>Cero tabaco y eliminación del alcohol.</strong></li>
      <li><strong>Gestión del estrés e higiene del sueño:</strong> Reducir picos nocturnos de cortisol y adrenalina.</li>
    </ol>',
    2, true, false, true, 20,
    '{}'::jsonb
  );

  -- Módulo 2: Diabetes (Dr. Miguel Loor)
  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_metabolica, 'Módulo 2: Diabetes Tipo 1, Tipo 2 y Gestacional (Dr. Miguel Loor)', 'Fisiopatología de la resistencia a la insulina, protección de órganos diana y enfoque terapéutico integrativo.', 2, true)
  returning id into v_mod2_id;

  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod2_id,
    'Diabetes Mellitus: Clasificación, Órganos Diana y Manejo Integrativo (Dr. Miguel Loor)',
    'Diferencias entre Tipo 1, Tipo 2 y Gestacional; síntomas clásicos (4 P) y sinergia con Moringa y Canela.',
    'text',
    '<h2>Clasificación Clínica de la Diabetes Mellitus (Dr. Miguel Loor)</h2>
    <ul>
      <li><strong>Diabetes Tipo 1:</strong> Destrucción autoinmune de las células Beta pancreáticas con déficit absoluto de insulina; requiere insulinoterapia desde el diagnóstico.</li>
      <li><strong>Diabetes Tipo 2 (90% de los casos):</strong> Inicia con <em>resistencia periférica a la insulina</em> en músculo e hígado asociada a inflamación visceral, seguida de agotamiento progresivo de las células Beta.</li>
      <li><strong>Diabetes Gestacional:</strong> Intolerancia a la glucosa diagnosticada durante el embarazo por hormonas contrarreguladoras placentarias.</li>
    </ul>
    <h3>Síntomas Cardinales y los 4 Órganos Diana a Proteger</h3>
    <p>Se manifiesta con las "4 P": <strong>Polidipsia</strong> (sed excesiva), <strong>Poliuria</strong> (micción frecuente), <strong>Polifagia</strong> y <strong>Pérdida de peso</strong>, además de visión borrosa y fatiga. La hiperglucemia sostenida daña la microvasculatura de 4 órganos vitales: <strong>Riñones (nefropatía diabética)</strong>, <strong>Retina (retinopatía)</strong>, <strong>Nervios periféricos (neuropatía)</strong> y <strong>Corazón/Arterias</strong>.</p>
    <p>El tratamiento integrativo combina el control médico farmacológico con ejercicio de fuerza/aeróbico, control del estrés y fitonutrientes sensibilizadores como la <strong>Moringa Oleifera SUMAK</strong> y la <strong>Canela de Ceilán</strong>.</p>',
    1, true, false, true, 25,
    '{}'::jsonb
  ) returning id into v_les_id;

  insert into public.academy_lesson_products (lesson_id, product_code, product_name, product_slug, dosage, administration_route, precautions, protocol_phase, sort_order) values
    (v_les_id, '00006', 'Moringa en Polvo / Original Moringa', 'moringa-en-polvo', '1 a 2 cucharadas (5 a 10 g) al día en agua, batidos o sopas (o 2 cápsulas después de comidas)', 'Vía oral.', 'Monitorear glucemia junto a su médico tratante.', 'Soporte Nutricional y Metabólico', 1),
    (v_les_id, '00003', 'Bebida Andina', 'bebida-andina', '30 ml diluidos en 250 ml de agua, 1 a 2 veces al día', 'Vía oral.', 'Apoya la microcirculación y presión arterial.', 'Protección Endotelial y Vascular', 2)
  on conflict (lesson_id, product_code) do nothing;

  -- Módulo 3: Nutrición Cromática y Desayuno Regenerador
  insert into public.academy_modules (course_id, title, description, sort_order, is_published)
  values (v_c_metabolica, 'Módulo 3: Nutrición Cromática y Desayuno Regenerador', 'Los 5 colores de los alimentos según su fitonutriente y órgano diana, más las 2 recetas estrella matutinas.', 3, true)
  returning id into v_mod3_id;

  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod3_id,
    'Farmacia de los 5 Colores: Fitonutrientes y Órganos que Protegen',
    'Morados (Cerebro), Blancos (Intestino), Amarillos (Inmunidad), Rojos (Corazón) y Verdes (Hígado).',
    'text',
    '<h2>Nutrición Cromática SUMAK: Cada Color Nutre un Sistema</h2>
    <ul>
      <li>🟣 <strong>Alimentos Morados / Azules (Cerebro y Endotelio):</strong> Ricos en <em>antocianinas, resveratrol y polifenoles</em> (berenjena, cebolla morada, uvas rojas, arándanos, col morada, maíz morado). Protegen las neuronas del estrés oxidativo y mejoran la memoria.</li>
      <li>⚪ <strong>Alimentos Blancos (Intestino y Microbiota):</strong> Aportan <em>alicina, compuestos azufrados, quercetina y selenio</em> (ajo, cebolla perla, coliflor, pera, champiñones). Modulan la flora intestinal y las defensas.</li>
      <li>🟡 <strong>Alimentos Amarillos / Naranjas (Sistema Inmune y Mucosas):</strong> Concentran <em>Vitamina C, carotenoides, bromelina y manganeso</em> (limón, maíz, banano, piña, pimentón amarillo, zanahoria).</li>
      <li>🔴 <strong>Alimentos Rojos (Corazón y Próstata):</strong> Ricos en <em>licopeno, ácido elágico y folato</em> (tomate cocido, frijoles rojos, sandía, cereza, fresa).</li>
      <li>🟢 <strong>Alimentos Verdes (Hígado y Desintoxicación):</strong> Aportan <em>clorofila, folato, vitamina K, hierro, sulforafano y grasas monoinsaturadas</em> (pepino, brócoli, aguacate, espinaca, kiwi).</li>
    </ul>',
    1, true, false, true, 20,
    '{}'::jsonb
  );

  insert into public.academy_lessons (
    module_id, title, description, content_type, text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod3_id,
    'Recetas Estrella: Desayuno Saludable para Limpiar Colon/Estómago e Infusión de Vitalidad',
    'Zanahoria (falcarinol) + Beterraba (betalaínas) + Uvas/Arándanos + Chía en ayunas, e Infusión de Jengibre, Cúrcuma, Menta y Manzanilla.',
    'text',
    '<h2>Dos Fórmulas Funcionales para Iniciar el Día</h2>
    <p>Además del batido matutino regenerador, puedes preparar la <strong>Infusión de Bienestar y Vitalidad</strong>: hervir en 1 litro de agua rodajas de jengibre fresco, 1 rama de canela y 1 cucharadita de cúrcuma durante 5 a 7 minutos; apagar el fuego, añadir 5 hojas de hierbabuena/menta y 1 cucharadita de manzanilla, tapar 5 minutos, colar y agregar el jugo de medio limón antes de beber.</p>',
    2, true, false, true, 25,
    '{
      "recipe_card": {
        "title": "Desayuno Saludable para Limpiar Colon y Estómago",
        "prep_time": "10 minutos (En ayunas)",
        "servings": "1 Vaso nutritivo completo",
        "ingredients": [
          {"name": "Zanahoria mediana cruda pelada", "dose": "1 unidad", "notes": "Aporta falcarinol y betacarotenos reparadores de mucosa"},
          {"name": "Beterraba (remolacha) cruda o al vapor", "dose": "1/2 unidad mediana", "notes": "Rica en betalaínas hepatoprotectoras y nitratos vasodilatadores"},
          {"name": "Uvas rojas con semilla o Arándanos", "dose": "1/2 taza", "notes": "Resveratrol y proantocianidinas antioxidantes"},
          {"name": "Canela en polvo + Jugo de limón", "dose": "1/2 cdta de canela + 1/2 limón", "notes": "Modulación glucémica y vitamina C"},
          {"name": "Semillas de chía previamente hidratadas", "dose": "1 cucharada sopera", "notes": "Hidratar 15 min antes en el vaso de agua o agua de coco"}
        ],
        "steps": [
          "Hidratar previamente 1 cucharada de semillas de chía en un vaso (250 ml) de agua pura o agua de coco natural durante 15 minutos.",
          "Trocear la zanahoria mediana y la media beterraba, y colocarlas en la licuadora junto con la media taza de uvas rojas o arándanos y la media cucharadita de canela.",
          "Añadir el agua con la chía hidratada y licuar a máxima potencia hasta obtener una textura suave.",
          "Exprimir el jugo de medio limón al momento de servir y tomar en ayunas sin colar."
        ]
      }
    }'::jsonb
  );

  -- Vincular los 5 nuevos cursos como módulos electivos/complementarios del Programa Principal si existe
  if v_program_id is not null then
    insert into public.academy_program_courses (program_id, course_id, sort_order, is_required) values
      (v_program_id, v_c_urinaria, 3, false),
      (v_program_id, v_c_higado, 4, false),
      (v_program_id, v_c_gastro, 5, false),
      (v_program_id, v_c_herbolaria, 6, false),
      (v_program_id, v_c_metabolica, 7, false)
    on conflict (program_id, course_id) do nothing;
  end if;

end $$;
