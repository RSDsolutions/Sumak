-- ============================================================================
-- SUMAK — Migration 20261116000001
-- Manifiesto de Carga Maestro: Especialización en Salud Renal y Terapia Botánica Andina
-- ============================================================================
-- 1. Actualización estructural:
--    - Ampliación de video_provider ('zoom', 'tiktok') en academy_lessons y academy_live_sessions
--    - Soporte de metadata jsonb en academy_modules y module_id opcional en academy_resources
--    - Creación de tabla public.academy_botanical_sheets (Fichas Botánicas)
--    - Creación de tabla pivote public.academy_lesson_botanicals (Lección <-> Ficha Botánica)
--    - Creación de tabla pivote public.academy_lesson_products (Lección <-> Productos SUMAK)
-- 2. Carga de Datos Maestro (Seed Idempotente):
--    - Tipo de Diploma y Plantilla para el Programa Especializado
--    - Categoría "Salud Renal y Fitoterapia Andina"
--    - Programa: "Especialización en Salud Renal y Terapia Botánica Andina"
--    - Curso 1 (Beginner, 70%) + Módulos 1 y 2 + Lecciones 1.1 a 2.2 + Evaluación 1
--    - Curso 2 (Advanced, 75%, Prerrequisito Curso 1) + Módulos 3 y 4 + Lecciones 3.1 a 4.2 + Examen Final
--    - Fichas Botánicas: Chancapiedra, Cola de Caballo, Flor de Arenilla, Canchalagua, Flor de Jamaica
--    - Vinculación de Productos SUMAK dosificados en Lecciones 2.1, 2.2, 3.1, 4.1 y 4.2
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1: ACTUALIZACIÓN DE ESQUEMA (DDL)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Ampliar CHECK constraint de video_provider para soportar 'zoom' y 'tiktok'
alter table public.academy_lessons
  drop constraint if exists academy_lessons_video_provider_check;

alter table public.academy_lessons
  add constraint academy_lessons_video_provider_check
  check (
    video_provider is null or video_provider in (
      'youtube', 'vimeo', 'cloudflare', 'mux', 'bunny', 'zoom', 'tiktok', 'custom'
    )
  );

alter table public.academy_live_sessions
  drop constraint if exists academy_live_sessions_video_provider_check;

alter table public.academy_live_sessions
  add constraint academy_live_sessions_video_provider_check
  check (
    video_provider is null or video_provider in (
      'youtube', 'vimeo', 'cloudflare', 'mux', 'bunny', 'zoom', 'tiktok', 'custom'
    )
  );

-- 1.2 Añadir metadata jsonb a academy_modules y soporte de module_id en academy_resources
alter table public.academy_modules
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.academy_resources
  add column if not exists module_id uuid references public.academy_modules(id) on delete cascade;

create index if not exists academy_resources_module_idx
  on public.academy_resources (module_id);

-- 1.3 Tabla: public.academy_botanical_sheets (Fichas Botánicas y Fitofarmacología)
create table if not exists public.academy_botanical_sheets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  common_name text not null,
  scientific_name text not null,
  image_url text,
  part_used text,
  active_compounds jsonb not null default '[]'::jsonb,
  properties text[] not null default '{}',
  traditional_uses text[] not null default '{}',
  toxicity_level text not null default 'low'
    check (toxicity_level in ('low', 'moderate', 'high', 'strict_caution')),
  toxicity_notes text,
  clinical_precautions text not null,
  contraindications text[] not null default '{}',
  related_product_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_botanical_sheets_slug_idx
  on public.academy_botanical_sheets (slug);

drop trigger if exists academy_botanical_sheets_updated_at on public.academy_botanical_sheets;
create trigger academy_botanical_sheets_updated_at
  before update on public.academy_botanical_sheets
  for each row execute function public.academy_set_updated_at();

alter table public.academy_botanical_sheets enable row level security;

drop policy if exists "Fichas botánicas: lectura pública" on public.academy_botanical_sheets;
create policy "Fichas botánicas: lectura pública" on public.academy_botanical_sheets
  for select using (is_active or public.is_academy_staff());

drop policy if exists "Fichas botánicas: staff gestiona" on public.academy_botanical_sheets;
create policy "Fichas botánicas: staff gestiona" on public.academy_botanical_sheets
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

grant select on public.academy_botanical_sheets to anon, authenticated;

-- 1.4 Tabla Pivote: public.academy_lesson_botanicals (Lección <-> Ficha Botánica)
create table if not exists public.academy_lesson_botanicals (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  botanical_id uuid not null references public.academy_botanical_sheets(id) on delete cascade,
  clinical_role text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(lesson_id, botanical_id)
);

create index if not exists academy_lesson_botanicals_lesson_idx
  on public.academy_lesson_botanicals (lesson_id);

alter table public.academy_lesson_botanicals enable row level security;

drop policy if exists "Lección botánicas: lectura pública" on public.academy_lesson_botanicals;
create policy "Lección botánicas: lectura pública" on public.academy_lesson_botanicals
  for select using (true);

drop policy if exists "Lección botánicas: staff gestiona" on public.academy_lesson_botanicals;
create policy "Lección botánicas: staff gestiona" on public.academy_lesson_botanicals
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

grant select on public.academy_lesson_botanicals to anon, authenticated;

-- 1.5 Tabla Pivote: public.academy_lesson_products (Lección <-> Catálogo Productos SUMAK)
create table if not exists public.academy_lesson_products (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  product_code text not null,
  product_name text not null,
  product_slug text not null,
  dosage text not null,
  administration_route text,
  precautions text,
  protocol_phase text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(lesson_id, product_code)
);

create index if not exists academy_lesson_products_lesson_idx
  on public.academy_lesson_products (lesson_id);

alter table public.academy_lesson_products enable row level security;

drop policy if exists "Lección productos: lectura pública" on public.academy_lesson_products;
create policy "Lección productos: lectura pública" on public.academy_lesson_products
  for select using (true);

drop policy if exists "Lección productos: staff gestiona" on public.academy_lesson_products;
create policy "Lección productos: staff gestiona" on public.academy_lesson_products
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

grant select on public.academy_lesson_products to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2: VADEMÉCUM Y FICHAS BOTÁNICAS (public.academy_botanical_sheets)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.academy_botanical_sheets (
  slug, common_name, scientific_name, image_url, part_used,
  active_compounds, properties, traditional_uses,
  toxicity_level, toxicity_notes, clinical_precautions, contraindications, related_product_code
) values
(
  'chancapiedra',
  'Chancapiedra',
  'Phyllanthus niruri',
  '/ingredientes/chancapiedra.png',
  'Planta entera aérea (hojas, tallos y raíz)',
  '[
    {"name": "Lignanos (Filantina e Hipofilantina)", "action": "Inhiben la endocitosis de cristales de oxalato de calcio en células tubulares renales y protegen el hepatocito."},
    {"name": "Flavonoides (Quercetina, Rutina)", "action": "Acción antioxidante glomerular y reducción de la peroxidación lipídica."},
    {"name": "Taninos y Alcaloides Securinega", "action": "Efecto espasmolítico y relajante del músculo liso ureteral y vesical."}
  ]'::jsonb,
  array['Litolítica (disgregadora de cálculos)', 'Relajante del músculo liso ureteral', 'Inhibidora de la agregación cristalina', 'Hepatoprotectora y uricosúrica'],
  array['Expulsión indolora de arenilla y microlitiasis renal', 'Prevención de recurrencia de cálculos de oxalato de calcio y ácido úrico', 'Desinflamación de vías urinarias bajas'],
  'low',
  'Toxicidad baja en dosis terapéuticas estandarizadas.',
  'Evitar en embarazo avanzado (posible efecto relajante uterino) y en estadios avanzados de insuficiencia renal (ERC Estadio 4-5) sin supervisión médica directa. Monitorear glucemia y presión arterial si el paciente usa hipotensores.',
  array['Embarazo', 'Lactancia materna', 'Insuficiencia renal estadio 5 o anuria'],
  '00011'
),
(
  'cola-de-caballo',
  'Cola de Caballo',
  'Equisetum arvense',
  '/ingredientes/cola-de-caballo.png',
  'Tallos estériles aéreos',
  '[
    {"name": "Sílice Orgánico Biodisponible (Ácido silícico 5-8%)", "action": "Regenera el tejido conectivo urotelial y fortalece el parénquima renal."},
    {"name": "Flavonoides (Isoquercitrina, Kaempferol)", "action": "Aumentan la filtración hídrica glomerular sin depleción brusca de electrolitos."},
    {"name": "Saponinas (Equisetonina) y Sales de Potasio", "action": "Diuresis acuosa ahorradora de potasio y acción antiinflamatoria urinaria."}
  ]'::jsonb,
  array['Diurético suave remineralizante', 'Antiinflamatorio del tracto urinario', 'Astringente y cicatrizante urotelial', 'Ahorrador natural de potasio'],
  array['Edema por retención hídrica leve a moderada', 'Coadyuvante en cistitis, uretritis y lavado mecánico de sedimento renal', 'Remineralización ósea y articular'],
  'moderate',
  'Moderado — La planta cruda contiene tiaminasa (enzima que degrada la vitamina B1). Debe emplearse únicamente en extractos procesados/estandarizados como en Madre Silvestre.',
  'No usar en pacientes con cardiopatías graves descompensadas o insuficiencia renal severa donde exista restricción hídrica o hiperpotasemia.',
  array['Edema de origen cardíaco o renal severo', 'Deficiencia severa de vitamina B1 activa', 'Embarazo y lactancia'],
  '00011'
),
(
  'flor-de-arenilla',
  'Flor de Arenilla',
  'Herniaria glabra / Pollichia campestris (Andina)',
  '/ingredientes/flor-de-arenilla.png',
  'Sumidades floridas y hojas',
  '[
    {"name": "Saponósidos Triterpénicos", "action": "Modifican la tensión superficial de la orina evitando la precipitación de sales."},
    {"name": "Cumarinas (Umbeliferona, Herniarina)", "action": "Antiespasmódico específico de los conductos ureterales."}
  ]'::jsonb,
  array['Desarenadora renal selectiva', 'Antiespasmódica urogenital', 'Depurativa de sedimentos urinarios'],
  array['Eliminación de barro y arenilla renal', 'Alivio del ardor miccional y pesadez lumbar'],
  'low',
  'Excelente tolerabilidad gástrica y renal en infusión o cápsula microdosificada.',
  'Acompañar siempre de ingesta adecuada de agua mineralizada o pura (mínimo 1.5 a 2 litros diarios) para facilitar el arrastre mecánico.',
  array['Obstrucción biliar o ureteral aguda completa'],
  '00011'
),
(
  'canchalagua',
  'Canchalagua Andina',
  'Schkuhria pinnata',
  '/ingredientes/canchalagua.png',
  'Planta aérea deshidratada',
  '[
    {"name": "Lactonas Sesquiterpénicas (Helenalinoides)", "action": "Actividad antiinflamatoria sistémica y depurativa hemolinfática."},
    {"name": "Compuestos Poliacetilénicos y Flavonoides", "action": "Antiséptico natural y reductor de endotoxinas circulantes."}
  ]'::jsonb,
  array['Depurativo sanguíneo y linfático', 'Regulador hepatorrenal', 'Antiséptico y antiinflamatorio'],
  array['Reducción de sobrecarga tóxica en el eje hígado-riñón', 'Acné y dermatosis por toxemia intestinal'],
  'low',
  'Segura en las dosis formuladas dentro de mezclas sinérgicas.',
  'Por su principio amargo, administrar preferentemente junto o justo antes de los alimentos con abundante agua.',
  array['Embarazo', 'Úlcera péptica sangrante activa'],
  '00011'
),
(
  'flor-de-jamaica',
  'Flor de Jamaica',
  'Hibiscus sabdariffa',
  '/ingredientes/flor-de-jamaica.png',
  'Cálices florales',
  '[
    {"name": "Antocianinas (Delfinidina-3-sambubiósido)", "action": "Inhibición natural de la Enzima Convertidora de Angiotensina (ECA), reduciendo la presión intraglomerular."},
    {"name": "Ácidos Orgánicos (Hibíscico, Cítrico, Málico)", "action": "Efecto uricosúrico comprobado que estimula la excreción renal de ácido úrico."}
  ]'::jsonb,
  array['Inhibidor natural de la ECA (antihipertensivo suave)', 'Uricosúrico (reduce ácido úrico)', 'Protector endotelial glomerular'],
  array['Manejo coadyuvante de hipertensión secundaria y nefropatía por uratos', 'Prevención de cristales de ácido úrico'],
  'low',
  'Muy baja toxicidad; seguro como bebida funcional cotidiana.',
  'En pacientes con hipotensión arterial marcada o medicación antihipertensiva de alta dosis, monitorear la presión arterial para evitar hipotensión ortostática.',
  array['Hipotensión severa sintomática'],
  '00003'
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
-- PARTE 3: MANIFIESTO DE CARGA MAESTRO (PROGRAMA, CURSOS, MÓDULOS, LECCIONES)
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_cat_id uuid;
  v_dip_type_id uuid;
  v_program_id uuid;
  v_course1_id uuid;
  v_course2_id uuid;
  v_pc1_id uuid;
  v_pc2_id uuid;
  v_mod1_id uuid;
  v_mod2_id uuid;
  v_mod3_id uuid;
  v_mod4_id uuid;
  v_les11_id uuid;
  v_les12_id uuid;
  v_les13_id uuid;
  v_les21_id uuid;
  v_les22_id uuid;
  v_les31_id uuid;
  v_les32_id uuid;
  v_les33_id uuid;
  v_les41_id uuid;
  v_les42_id uuid;
  v_eval1_id uuid;
  v_eval_final_id uuid;
  v_bot_chancapiedra uuid;
  v_bot_cola_caballo uuid;
  v_bot_arenilla uuid;
  v_bot_canchalagua uuid;
  v_bot_jamaica uuid;
  v_q_id uuid;
begin
  -- 1. Tipo de Diploma del Programa
  insert into public.academy_diploma_types (
    name, internal_code, description, is_active, template_version, sort_order,
    requirements
  ) values (
    'Diploma de Especialización en Salud Renal y Terapia Botánica Andina',
    'DIP_SALUD_RENAL_SUMAK',
    'Otorgado al aprobar el 100% de los cursos y el Examen Final Integrador del Programa de Salud Renal SUMAK.',
    true, 1, 1,
    '{"min_progress_pct": 100, "requires_assessment": true, "min_assessment_score": 75}'::jsonb
  )
  on conflict (internal_code) do update set
    name = excluded.name,
    description = excluded.description
  returning id into v_dip_type_id;

  insert into public.academy_diploma_templates (
    diploma_type_id, version, page_size, orientation,
    title_text, subtitle_text, body_text, footer_text,
    signatory_name, signatory_title, is_active
  ) values (
    v_dip_type_id, 1, 'A4', 'landscape',
    'DIPLOMA DE ESPECIALIZACIÓN',
    'SALUD RENAL Y TERAPIA BOTÁNICA ANDINA',
    'Por cuanto {{participant_name}} ha completado y aprobado satisfactoriamente el 100% del programa académico y las evaluaciones clínicas de {{program_name}}, demostrando dominio en fisiología del Eje Intestino-Hígado-Riñón y protocolos fitoterapéuticos SUMAK.',
    'SUMAK VIDA ECUADOR S.A. · Laboratorio Sumak Jambi',
    'Dr. Luis Paredes',
    'Gerente General · Formador de Formadores',
    true
  ) on conflict (diploma_type_id, version) do nothing;

  -- 2. Categoría Académica
  insert into public.academy_categories (
    name, slug, description, icon_name, sort_order, is_active
  ) values (
    'Salud Renal y Fitoterapia Andina',
    'salud-renal-fitoterapia',
    'Programas clínicos sobre fisiología emuntoria, eje intestino-hígado-riñón y protocolos botánicos SUMAK.',
    'HeartPulse',
    1,
    true
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description
  returning id into v_cat_id;

  -- 3. Programa Académico Principal
  insert into public.academy_programs (
    title, slug, description, status, access_mode,
    completion_percentage_required, diploma_type_id, sort_order
  ) values (
    'Especialización en Salud Renal y Terapia Botánica Andina',
    'especializacion-salud-renal-sumak',
    'Programa integral fundamentado en la medicina tradicional andino-amazónica y la biotecnología fitoterapéutica de Sumak Jambi, enfocado en el Eje Intestino-Hígado-Riñón y protocolos de depuración emuntoria.',
    'published',
    'free_registered',
    100,
    v_dip_type_id,
    1
  )
  on conflict (slug) do update set
    title = excluded.title,
    description = excluded.description,
    status = 'published',
    access_mode = excluded.access_mode,
    completion_percentage_required = 100,
    diploma_type_id = v_dip_type_id
  returning id into v_program_id;

  -- 4. CURSO 1: Bases Fisiológicas y Prevención Renal: El Enfoque Ancestral SUMAK
  insert into public.academy_courses (
    title, slug, short_description, description,
    category_id, level, estimated_duration_minutes, status, access_mode,
    prerequisites, passing_percentage, generates_certificate, diploma_type_id,
    published_at, sort_order, metadata
  ) values (
    'Bases Fisiológicas y Prevención Renal: El Enfoque Ancestral SUMAK',
    'bases-fisiologicas-prevencion-renal-sumak',
    'Comprende la anatomía glomerular, el Eje Intestino-Riñón (Gut-Kidney Axis) y la Fase 1 de desintoxicación sistémica.',
    'Curso fundacional diseñado por el Dr. Luis Paredes para dominar la fisiología renal desde la cosmovisión andina y la medicina integrativa. Aprenderás por qué no se debe drenar el riñón sin antes descongestionar el colon, cómo proteger el endotelio glomerular y cómo aplicar correctamente la Fase 1 del Protocolo SUMAK.',
    v_cat_id,
    'beginner',
    180,
    'published',
    'free_registered',
    'Ninguno. Curso inicial abierto a distribuidores, terapeutas y estudiantes de salud preventiva.',
    70.00,
    true,
    v_dip_type_id,
    now(),
    1,
    '{
      "objectives": [
        "Comprender la función de filtración glomerular, presión osmótica y equilibrio hidrosalino.",
        "Identificar cómo la disbiosis colónica produce toxinas urémicas (indoxil sulfato y p-cresil sulfato) que lesionan la nefrona.",
        "Diferenciar entre diuréticos sintéticos depletores de potasio y la diuresis osmótica botánica ahorradora de electrolitos.",
        "Ejecutar con seguridad clínica la Fase 1 de desintoxicación con Fibramak Plus, Colón Renova y Té Extractos de la Vida."
      ],
      "clinical_focus": "Eje Intestino-Hígado-Riñón y Fase 1 Emuntoria"
    }'::jsonb
  )
  on conflict (slug) do update set
    title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    category_id = v_cat_id,
    level = 'beginner',
    passing_percentage = 70.00,
    generates_certificate = true,
    status = 'published',
    metadata = excluded.metadata
  returning id into v_course1_id;

  -- 5. CURSO 2: Fitoterapia Avanzada y Protocolos Renales con Chancapiedra y Plantas Andinas
  insert into public.academy_courses (
    title, slug, short_description, description,
    category_id, level, estimated_duration_minutes, status, access_mode,
    prerequisites, passing_percentage, generates_certificate, diploma_type_id,
    published_at, sort_order, metadata
  ) values (
    'Fitoterapia Avanzada y Protocolos Renales con Chancapiedra y Plantas Andinas',
    'fitoterapia-avanzada-protocolos-renales-sumak',
    'Domina la litolisis botánica con Madre Silvestre, regulación de la ECA y ácido úrico con Bebida Andina y oxigenación con Vive-Oxi-100.',
    'Curso clínico-terapéutico avanzado que profundiza en los mecanismos moleculares de la Chancapiedra (Phyllanthus niruri), Cola de Caballo, Flor de Arenilla y Canchalagua. Incluye el protocolo completo de 3 fases para expulsión indolora de arenilla lumbar, manejo coadyuvante de hipertensión secundaria e hipoxia medular renal.',
    v_cat_id,
    'advanced',
    240,
    'published',
    'free_registered',
    'Requiere haber aprobado el Curso 1: Bases Fisiológicas y Prevención Renal.',
    75.00,
    true,
    v_dip_type_id,
    now(),
    2,
    '{
      "objectives": [
        "Dominar la fitofarmacología de Phyllanthus niruri y Equisetum arvense en la disgregación de cristales de oxalato de calcio.",
        "Aplicar el Protocolo Clínico de 3 Fases (60 días) con dosificación exacta y precauciones estrictas.",
        "Comprender el mecanismo inhibidor de la ECA y uricosúrico de la Flor de Jamaica y Maíz Morado en Bebida Andina.",
        "Integrar Vive-Oxi-100 en la protección contra la hipoxia tisular de la médula renal."
      ],
      "clinical_focus": "Litolisis, Diuresis Ahorradora de Potasio y Oxigenación Medular"
    }'::jsonb
  )
  on conflict (slug) do update set
    title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    category_id = v_cat_id,
    level = 'advanced',
    passing_percentage = 75.00,
    generates_certificate = true,
    status = 'published',
    metadata = excluded.metadata
  returning id into v_course2_id;

  -- 6. Vincular Curso 1 y Curso 2 al Programa + Prerrequisito (Curso 2 requiere Curso 1)
  insert into public.academy_program_courses (program_id, course_id, sort_order, is_required)
  values (v_program_id, v_course1_id, 1, true)
  on conflict (program_id, course_id) do update set sort_order = 1, is_required = true
  returning id into v_pc1_id;

  insert into public.academy_program_courses (program_id, course_id, sort_order, is_required)
  values (v_program_id, v_course2_id, 2, true)
  on conflict (program_id, course_id) do update set sort_order = 2, is_required = true
  returning id into v_pc2_id;

  insert into public.academy_program_course_prereqs (program_course_id, prereq_program_course_id)
  values (v_pc2_id, v_pc1_id)
  on conflict (program_course_id, prereq_program_course_id) do nothing;

  -- Limpiar módulos previos de estos dos cursos si se re-ejecuta para evitar duplicados
  delete from public.academy_modules where course_id in (v_course1_id, v_course2_id);
  delete from public.academy_assessments where course_id in (v_course1_id, v_course2_id);

  -- ───────────────────────────────────────────────────────────────────────────
  -- MÓDULO 1 (Curso 1): Anatomía, Fisiología y el Eje Intestino-Riñón
  -- ───────────────────────────────────────────────────────────────────────────
  insert into public.academy_modules (course_id, title, description, sort_order, is_published, metadata)
  values (
    v_course1_id,
    'Módulo 1: Anatomía, Fisiología y el Eje Intestino-Riñón',
    'Fundamentos de la nefrona, presión osmótica glomerular y la conexión directa entre permeabilidad colónica y daño renal.',
    1, true,
    '{"pdf_backup_title": "Guía Maestra del Eje Intestino-Riñón (PDF)", "pdf_backup_url": "/ Guia_Eje_Intestino_Rinon.pdf"}'::jsonb
  ) returning id into v_mod1_id;

  -- Lección 1.1
  insert into public.academy_lessons (
    module_id, title, description, content_type, video_provider, video_external_id,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod1_id,
    'El Filtro de la Vida: Anatomía y Funciones Ocultas del Riñón',
    'Estudio de la unidad funcional renal (nefrona), filtración glomerular y regulación del medio interno.',
    'video',
    'youtube',
    '8kX62n6yNXA',
    '<h2>1. Más allá de un simple filtro: El Riñón en la Fisiología Integrativa</h2>
    <p>Cada riñón humano alberga aproximadamente <strong>1 millón de nefronas</strong>, compuestas por el corpúsculo renal (glomérulo y cápsula de Bowman) y el sistema tubular (túbulo contorneado proximal, asa de Henle, túbulo contorneado distal y túbulo colector). Diariamente, los riñones filtran cerca de <strong>180 litros de plasma sanguíneo</strong> para producir entre 1.5 y 2 litros de orina.</p>
    <h3>Funciones Vitales que todo Asesor de Salud SUMAK debe dominar:</h3>
    <ul>
      <li><strong>Depuración selectiva:</strong> Excreción de urea, creatinina, ácido úrico y metabolitos hepáticos.</li>
      <li><strong>Equilibrio hidrosalino y ácido-base:</strong> Regulación milimétrica del pH sanguíneo (7.35 - 7.45) mediante la reabsorción de bicarbonato y secreción de hidrogeniones.</li>
      <li><strong>Control endocrino y vascular:</strong> Secreción de <em>eritropoyetina</em> (formación de glóbulos rojos), activación de la <em>Vitamina D3 (calcitriol)</em> y regulación de la presión arterial mediante el sistema Renina-Angiotensina-Aldosterona (SRAA).</li>
    </ul>
    <h3>¿Por qué se lesiona la barrera de filtración glomerular?</h3>
    <p>Los podocitos y la membrana basal glomerular poseen una carga eléctrica negativa que repele las proteínas plasmáticas (como la albúmina). Cuando la sangre llega hiperconcentrada de radicales libres, glucosa elevada (glicación) y exceso de cloruro de sodio industrial, aumenta la presión hidrostática intraglomerular, provocando hiperfiltración, microalbuminuria y esclerosis progresiva.</p>',
    1, true, true, true, 20,
    '{
      "clinical_callout": {
        "severity": "warning",
        "title": "Alerta Fisiológica: Impacto del Sodio Procesado y la Presión Osmótica Glomerular",
        "message": "El consumo elevado de cloruro de sodio refinado, glutamato monosódico y conservantes industriales eleva la osmolaridad plasmática y fuerza la hipertensión intraglomerular. Esto destruye silenciosamente los podocitos mucho antes de que la creatinina sérica se eleve en los análisis de laboratorio convencionales (un aumento de creatinina recién es visible cuando ya se ha perdido más del 50% de la función nefronal)."
      }
    }'::jsonb
  ) returning id into v_les11_id;

  -- Lección 1.2
  insert into public.academy_lessons (
    module_id, title, description, content_type,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod1_id,
    'El Eje Gut-Kidney: Por qué no se puede drenar el riñón sin limpiar el colon',
    'Fisiopatología de las toxinas urémicas de origen colónico y el principio rector de la medicina SUMAK.',
    'text',
    '<h2>El Eje Intestino-Hígado-Riñón (Gut-Kidney Axis)</h2>
    <p>Uno de los errores más frecuentes en la práctica naturista convencional es administrar diuréticos intensivos a un paciente cuyo tracto gastrointestinal se encuentra impactado o disbiótico. En la doctrina clínica del <strong>Dr. Luis Paredes y el Laboratorio Sumak Jambi</strong>, rige una ley biológica inquebrantable:</p>
    <blockquote>"Jamás se debe forzar el drenaje renal sin antes descongestionar el colon y depurar la circulación portal-linfática."</blockquote>
    <h3>Mecanismo Bioquímico de la Autointoxicación Entero-Renal</h3>
    <ol>
      <li><strong>Impactación y Disbiosis Colónica:</strong> El estreñimiento crónico, el exceso de harinas refinadas y la parasitosis alteran la microbiota intestinal, favoreciendo bacterias proteolíticas patógenas.</li>
      <li><strong>Generación de Toxinas Urémicas:</strong> La fermentación putrefactiva de aminoácidos aromáticos (triptófano y tirosina) en un colon sucio produce <strong>indoxil sulfato</strong>, <strong>p-cresil sulfato</strong> y <strong>trimetilamina N-óxido (TMAO)</strong>.</li>
      <li><strong>Hiperpermeabilidad Intestinal (Leaky Gut):</strong> La inflamación de la mucosa permite que estas endotoxinas crucen hacia la vena porta, saturando la capacidad de conjugación del hígado (Fase I y II).</li>
      <li><strong>Impacto en la Nefrona:</strong> Las toxinas urémicas libres en sangre llegan a los túbulos renales proximales, donde activan el factor nuclear NF-κB, desencadenando estrés oxidativo severo, fibrosis túbulo-intersticial y caída de la Tasa de Filtración Glomerular (TFG).</li>
    </ol>
    <h3>Aplicación Práctica en el Protocolo SUMAK</h3>
    <p>Cuando limpiamos primero el colon durante los primeros 10 días, reducimos hasta en un 60% la carga de toxinas indólicas que llegan a la arteria renal. De esta manera, cuando iniciamos la fase litolítica con plantas nefríticas, el riñón dispone de reserva funcional libre para disolver y excretar cálculos sin inflamarse.</p>',
    2, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "contraindication",
        "title": "Regla de Oro Clínica SUMAK",
        "message": "No inicies protocolos de movilización intensa de cálculos o drenaje renal profundo en pacientes con estreñimiento severo (menos de 1 evacuación cada 48 horas) sin antes restaurar el tránsito intestinal con fibra prebiótica y mucílagos."
      }
    }'::jsonb
  ) returning id into v_les12_id;

  -- Recurso adjunto para Lección 1.2 (Guia_Eje_Intestino_Rinon.pdf)
  insert into public.academy_resources (
    lesson_id, module_id, title, description, file_url, file_name, file_type, file_size_bytes, sort_order
  ) values (
    v_les12_id,
    v_mod1_id,
    'Guía Clínica del Eje Intestino-Riñón (PDF)',
    'Esquema fisiopatológico de toxinas urémicas, checklist de interrogatorio digestivo-renal y pautas nutricionales.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'Guia_Eje_Intestino_Rinon.pdf',
    'pdf',
    458200,
    1
  );

  -- Lección 1.3
  insert into public.academy_lessons (
    module_id, title, description, content_type, video_provider, video_external_id,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod1_id,
    'Hidratación y Carga Electrolítica Correcta vs. Diuréticos Sintéticos',
    'Comparativa clínica entre diuréticos de asa/tiazídicos y los fitodiuréticos ahorradores de potasio.',
    'mixed',
    'youtube',
    'f2P6M_WW_4Q',
    '<h2>Diferencia entre "Orinar Más" y "Depurar el Riñón"</h2>
    <p>Muchos pacientes confunden el aumento brusco del volumen urinario provocado por fármacos sintéticos (como la furosemida o hidroclorotiazida) con una verdadera limpieza renal. A nivel celular, el efecto es radicalmente distinto:</p>
    <h3>1. Diuréticos Sintéticos (Depletores de Electrolitos)</h3>
    <ul>
      <li>Bloquean de forma agresiva los cotransportadores de sodio-potasio-cloro en el Asa de Henle o el túbulo distal.</li>
      <li>Provocan <strong>hipopotasemia</strong> (calambres, arritmias, fatiga muscular) e <strong>hiperuricemia secundaria</strong> (aumentan el ácido úrico en sangre al competir por la secreción tubular).</li>
      <li>A largo plazo pueden inducir nefritis intersticial y deshidratación intracelular.</li>
    </ul>
    <h3>2. Fitodiuresis Andina Ahorradora de Potasio</h3>
    <ul>
      <li>Plantas como la <strong>Cola de Caballo (<em>Equisetum arvense</em>)</strong>, el <strong>Diente de León (<em>Taraxacum officinale</em>)</strong> y la <strong>Flor de Jamaica</strong> aportan de forma natural sales de potasio, sílice orgánico y flavonoides.</li>
      <li>Aumentan el flujo sanguíneo renal y la filtración de agua libre (diuresis acuosa y osmótica suave) manteniendo intacta la reserva de potasio y magnesio intracelular.</li>
    </ul>',
    3, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "info",
        "title": "Pauta de Hidratación Terapéutica",
        "message": "Para calcular el requerimiento basal de agua pura durante el protocolo SUMAK, multiplica el peso del paciente en kg por 35 ml (Ej: 70 kg × 35 ml = 2,450 ml/día), salvo en pacientes con restricción hídrica médica por insuficiencia cardíaca o renal avanzada."
      }
    }'::jsonb
  ) returning id into v_les13_id;

  -- ───────────────────────────────────────────────────────────────────────────
  -- MÓDULO 2 (Curso 1): Desintoxicación Sistémica y Soporte Inicial
  -- ───────────────────────────────────────────────────────────────────────────
  insert into public.academy_modules (course_id, title, description, sort_order, is_published, metadata)
  values (
    v_course1_id,
    'Módulo 2: Desintoxicación Sistémica y Soporte Inicial',
    'Aplicación práctica de la Fase 1 del Protocolo SUMAK: desimpactación intestinal, eliminación de parásitos y protección endotelial.',
    2, true,
    '{}'::jsonb
  ) returning id into v_mod2_id;

  -- Lección 2.1
  insert into public.academy_lessons (
    module_id, title, description, content_type, video_provider, video_external_id,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod2_id,
    'Fase 1 del Protocolo SUMAK: Limpieza intestinal con Fibramak Plus y Colón Renova',
    'Criterios de selección clínica entre Fibramak Plus (polvo prebiótico) y Colón Renova (extracto líquido antiparasitario).',
    'video',
    'youtube',
    '1V_xRb0x9aw',
    '<h2>Fase 1 (Días 1 al 10): Desbloqueo del Emuntorio Primario</h2>
    <p>El objetivo de los primeros 10 días del protocolo es barrer la placa mucoide intestinal, reducir la carga parasitaria/amebiana y restablecer el peristaltismo fisiológico para frenar el paso de toxinas hacia el riñón.</p>
    <h3>¿Cuándo elegir Fibramak Plus vs. Colón Renova?</h3>
    <ul>
      <li><strong>Fibramak Plus (Polvo Funcional):</strong> Ideal para pacientes con tránsito lento crónico, gastritis concomitante, colon irritable o mucosa sensible. Sus <em>Probióticos Vegetales, Avena, Chía, Sábila, Cúrcuma y Bromelina de Piña</em> desinflaman la pared intestinal mientras limpian suavemente.</li>
      <li><strong>Fórmula Herbal Colón Renova (Líquido):</strong> Indicado en adultos con sospecha de parasitosis intestinal, abdomen globoso, halitosis o estreñimiento rebelde. Combina 15 extractos botánicos (<em>Paico, Ajenjo, Semilla de Papaya, Ciruela Pasa, Sen dosificado, Hierbabuena y Noni</em>) para una depuración profunda.</li>
    </ul>',
    1, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "toxicity",
        "title": "Precaución Clínica Obligatoria en Limpieza Colónica",
        "message": "Por la presencia de principios activos estimulantes del peristaltismo (Hoja de Sen dosificada, Paico y Ajenjo), Colón Renova es exclusivo para adultos y está estrictamente contraindicado en mujeres embarazadas, madres en lactancia, menores de 12 años y pacientes con dolor abdominal agudo o sospecha de obstrucción intestinal."
      }
    }'::jsonb
  ) returning id into v_les21_id;

  -- Lección 2.2
  insert into public.academy_lessons (
    module_id, title, description, content_type,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod2_id,
    'Protección Endotelial y Antioxidantes con Té Extractos de la Vida',
    'Sinergia del Arándano Azul (PACs), Resveratrol, Diente de León y Pectina de Manzana en la defensa urotelial.',
    'text',
    '<h2>Blindaje de la Nefrona y Prevención de Infecciones Urinarias (ITU)</h2>
    <p>En paralelo a la limpieza intestinal de la Fase 1, debemos proteger el endotelio de los capilares glomerulares y el urotelio vesical mediante <strong>Té Extractos de la Vida [Cód. 00001]</strong>.</p>
    <h3>Mecanismos Fitofarmacológicos Clave:</h3>
    <ol>
      <li><strong>Efecto Antiadherente Bacteriano (Arándano Azul):</strong> Aporta Proantocianidinas Tipo A (PACs) que inhiben las fimbrias P de la bacteria <em>Escherichia coli</em> (responsable del 80% de las infecciones urinarias), impidiendo que se ancle a las paredes de la vejiga y uréteres.</li>
      <li><strong>Protección Microvascular (Resveratrol de Uva + Moringa):</strong> Activa las sirtuinas (SIRT1) y el óxido nítrico endotelial, reduciendo la rigidez de las arteriolas aferente y eferente del glomérulo.</li>
      <li><strong>Drenaje Biliar-Renal (Diente de León + Aloe Vera):</strong> Estimula la coleresis hepática y la diuresis suave sin irritar el parénquima renal.</li>
      <li><strong>Quelación Intestinal de Toxinas (Pectina de Manzana Verde):</strong> Atrapa ácidos biliares oxidados y metales pesados en el lumen intestinal para que se excreten por las heces en lugar de sobrecargar el riñón.</li>
    </ol>',
    2, true, false, true, 20,
    '{
      "clinical_callout": {
        "severity": "info",
        "title": "Conservación y Biodisponibilidad",
        "message": "Por ser una formulación natural libre de conservantes sintéticos agresivos, una vez abierta la botella de 1000 ml de Té Extractos de la Vida debe mantenerse refrigerada y agitarse suavemente antes de cada toma de 30 ml."
      }
    }'::jsonb
  ) returning id into v_les22_id;

  -- Evaluación 1 (Curso 1 - Módulo 2)
  insert into public.academy_assessments (
    course_id, module_id, title, description,
    total_points, passing_score, max_attempts, time_limit_minutes,
    randomize_questions, show_results, is_final_exam, is_published, sort_order
  ) values (
    v_course1_id, v_mod2_id,
    'Prueba de Autoevaluación — Módulo 1 y 2',
    'Evalúa tu dominio sobre la fisiología de la nefrona, el Eje Intestino-Riñón y la Fase 1 de desintoxicación SUMAK.',
    100, 70, 3, 25,
    false, true, false, true, 1
  ) returning id into v_eval1_id;

  -- Preguntas Evaluación 1
  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval1_id,
    '¿Por qué el protocolo clínico SUMAK exige limpiar el colon antes de iniciar un drenaje renal profundo?',
    'single_choice', 25,
    'La disbiosis y el estreñimiento generan toxinas urémicas (indoxil sulfato y p-cresil sulfato) que pasan a la sangre y sobrecargan el glomérulo renal.',
    1
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, 'Para frenar la producción colónica de toxinas urémicas (indoxil sulfato y p-cresil sulfato) que inflaman la nefrona', true, 1),
    (v_q_id, 'Porque los riñones están conectados anatómicamente al colon transverso por un conducto directo', false, 2),
    (v_q_id, 'Únicamente para bajar de peso antes de tomar vitaminas', false, 3);

  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval1_id,
    '¿Cuál es la ventaja clínica de los fitodiuréticos andinos (como la Cola de Caballo y el Diente de León) frente a los diuréticos sintéticos de asa?',
    'single_choice', 25,
    'Los fitodiuréticos andinos promueven una diuresis acuosa/osmótica suave aportando potasio y sílice, evitando la hipopotasemia severa.',
    2
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, 'Generan una diuresis suave ahorradora de potasio y remineralizante sin descompensar los electrolitos', true, 1),
    (v_q_id, 'Bloquean totalmente la producción de orina durante la noche', false, 2),
    (v_q_id, 'Aumentan el ácido úrico en la sangre para proteger las articulaciones', false, 3);

  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval1_id,
    '¿En qué grupo de pacientes está estrictamente CONTRAINDICADO el uso de Colón Renova o Fibramak Plus en dosis purgantes?',
    'single_choice', 25,
    'Por contener senósidos y extractos antiparasitarios estimulantes del peristaltismo, no debe administrarse en embarazo, lactancia, menores de 12 años ni obstrucción intestinal.',
    3
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, 'Mujeres embarazadas, menores de 12 años y pacientes con obstrucción intestinal', true, 1),
    (v_q_id, 'Adultos sedentarios con tránsito intestinal lento', false, 2),
    (v_q_id, 'Personas que consumen más de 2 litros de agua al día', false, 3);

  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval1_id,
    '¿Qué componente activo del Té Extractos de la Vida impide que la bacteria Escherichia coli se adhiera a las paredes de la vejiga?',
    'single_choice', 25,
    'Las Proantocianidinas Tipo A (PACs) del Extracto de Arándano Azul bloquean las fimbrias bacterianas de E. coli.',
    4
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, 'Las Proantocianidinas Tipo A (PACs) del Extracto de Arándano Azul', true, 1),
    (v_q_id, 'El cloruro de sodio refinado', false, 2),
    (v_q_id, 'La cafeína anhidra sintética', false, 3);


  -- ───────────────────────────────────────────────────────────────────────────
  -- MÓDULO 3 (Curso 2): Litolisis, Arenillas y Fitofarmacología Andina
  -- ───────────────────────────────────────────────────────────────────────────
  insert into public.academy_modules (course_id, title, description, sort_order, is_published, metadata)
  values (
    v_course2_id,
    'Módulo 3: Litolisis, Arenillas y Fitofarmacología Andina',
    'Mecanismos moleculares de disolución de cálculos renales, relajación ureteral y aplicación clínica de Madre Silvestre.',
    1, true,
    '{}'::jsonb
  ) returning id into v_mod3_id;

  -- Lección 3.1
  insert into public.academy_lessons (
    module_id, title, description, content_type, video_provider, video_external_id,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod3_id,
    'Chancapiedra (Phyllanthus niruri) y Mecanismos de Disolución de Cálculos de Oxalato de Calcio',
    'Fitofarmacología de los lignanos (filantina e hipofilantina) y formulación maestra de Madre Silvestre.',
    'video',
    'youtube',
    'dQw4w9WgXcQ',
    '<h2>Mecanismo Litolítico de <em>Phyllanthus niruri</em> en Madre Silvestre</h2>
    <p>El 75% al 80% de los cálculos renales están formados por sales de <strong>oxalato de calcio</strong> (monohidrato y dihidrato) y fosfato de calcio. La ciencia fitoterapéutica moderna ha demostrado que la <strong>Chancapiedra (<em>Phyllanthus niruri</em>)</strong> actúa en tres etapas críticas de la biomineralización:</p>
    <ol>
      <li><strong>Inhibición de la Nucleación y Agregación Cristalina:</strong> Los lignanos (filantina e hipofilantina) y triterpenos modifican la estructura cristalina del oxalato de calcio, transformando los cristales puntiagudos de oxalato monohidrato (COM, altamente adherentes) en formas dihidratadas (COD) redondeadas y fáciles de eliminar por la orina.</li>
      <li><strong>Bloqueo de la Endocitosis Tubular:</strong> Impide que los microcristales se internalicen en las células epiteliales del túbulo renal, frenando la formación de las placas de Randall.</li>
      <li><strong>Efecto Espasmolítico Ureteral:</strong> Sus alcaloides relajan la musculatura lisa del uréter y el cuello vesical, permitiendo el descenso de arenillas y microlitos sin desencadenar el dolor agudo del cólico nefrítico.</li>
    </ol>
    <h3>La Sinergia de Madre Silvestre [Cód. 00011]</h3>
    <p>En <strong>Madre Silvestre</strong>, la Chancapiedra no actúa sola: está potenciada con <em>Flor de Arenilla, Cola de Caballo, Canchalagua, Uña de Gato (antiinflamatorio de citoquinas), Malva, Sábila (mucílagos protectores del urotelio) y Sangre de Drago (cicatrizante de microlesiones por roce de cristales)</em>.</p>',
    1, true, true, true, 30,
    '{
      "clinical_callout": {
        "severity": "contraindication",
        "title": "Precaución Clínica Estricta — Madre Silvestre",
        "message": "Contraindicado en gestación (embarazo), lactancia y fallo renal terminal (Estadio 5 / Anuria no dializada). En pacientes con cálculos coraliformes mayores a 8-10 mm con hidronefrosis obstructiva aguda, derivar a evaluación ecográfica urológica inmediata antes de forzar diuresis."
      }
    }'::jsonb
  ) returning id into v_les31_id;

  -- Lección 3.2
  insert into public.academy_lessons (
    module_id, title, description, content_type,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod3_id,
    'Sinergia de la Cola de Caballo, Flor de Arenilla y Canchalagua en la Diuresis Ahorradora de Potasio',
    'Estudio de compuestos fenólicos, saponinas, sílice orgánico y precauciones por tiaminasa.',
    'text',
    '<h2>Tríada Botánica Andina para el Drenaje Renal Seguro</h2>
    <p>Cuando los cristales de cálculo comienzan a disgregarse por acción de la Chancapiedra, necesitamos un flujo urinario constante y alcalinizado que arrastre el sedimento sin irritar el conducto urinario ni agotar el potasio sérico:</p>
    <ul>
      <li><strong>Cola de Caballo (<em>Equisetum arvense</em>):</strong> Su riqueza en sílice orgánico (ácido silícico) y flavonoides (isoquercitrina) estimula la diuresis acuosa mientras regenera las fibras elásticas del urotelio.</li>
      <li><strong>Flor de Arenilla:</strong> Sus saponósidos triterpénicos reducen la tensión superficial de la orina, manteniendo las sales en suspensión coloidal para que no precipiten en el cáliz renal.</li>
      <li><strong>Canchalagua (<em>Schkuhria pinnata</em>):</strong> Depurador hemolinfático andino que reduce la carga de radicales libres y endotoxinas que llegan a la arteriola aferente.</li>
    </ul>',
    2, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "toxicity",
        "title": "Advertencia de Toxicidad Botánica: Tiaminasa en Equisetum arvense",
        "message": "La Cola de Caballo en estado silvestre crudo contiene tiaminasa, una enzima capaz de destruir la Vitamina B1 (tiamina) si se consume en decocciones caseras descontroladas por largos periodos. Por ello, en SUMAK se emplea procesada en dosis estandarizadas y acompañada de vitaminas del Complejo B y minerales."
      }
    }'::jsonb
  ) returning id into v_les32_id;

  -- Lección 3.3
  insert into public.academy_lessons (
    module_id, title, description, content_type, video_provider, video_external_id,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod3_id,
    'Protocolo Clínico de 3 Fases para la Expulsión Indolora de Arenilla Lumbar',
    'Cronograma terapéutico de 60 días combinando limpieza colónica, litolisis renal y regeneración celular.',
    'mixed',
    'youtube',
    '8kX62n6yNXA',
    '<h2>Implementación Paso a Paso del Protocolo Renal SUMAK (60 Días)</h2>
    <p>Para lograr resultados clínicos consistentes y evitar crisis curativas dolorosas, el protocolo se estructura en tres fases secuenciales de 60 días totales:</p>
    <ol>
      <li><strong>Fase 1 — Desintoxicación Sistémica (Días 1 a 10):</strong> Desimpactación del colon y drenaje linfático inicial con <em>Colón Renova o Fibramak Plus</em> + <em>Té Extractos de la Vida</em>.</li>
      <li><strong>Fase 2 — Litolisis y Drenaje Renal (Días 11 a 35):</strong> Disolución de arenillas y desinflamación urotelial con <em>Madre Silvestre</em> + <em>Bebida Andina</em>.</li>
      <li><strong>Fase 3 — Oxigenación y Regeneración (Días 36 a 60):</strong> Restauración bioenergética de la médula renal y endotelio con <em>Vive-Oxi-100</em> + <em>Té Extractos de la Vida</em>.</li>
    </ol>',
    3, true, false, true, 30,
    '{
      "clinical_callout": {
        "severity": "info",
        "title": "Preparación de Infusión Coadyuvante de Agua Alcalina",
        "message": "Durante la Fase 2 (Días 11 al 35), indique al paciente tomar las cápsulas de Madre Silvestre con un vaso grande (250 ml) de agua tibia previa a las comidas principales para optimizar la biodisponibilidad de los lignanos."
      },
      "recipe_card": {
        "title": "Protocolo Clínico-Terapéutico Renal SUMAK en 3 Fases",
        "prep_time": "Programa de 60 días",
        "servings": "Adulto (Dosificación Estandarizada)",
        "ingredients": [
          {"name": "Colón Renova o Fibramak Plus", "dose": "30 ml (mañana y noche) o 2 cdas en ayunas", "notes": "Fase 1 (Días 1 al 10)"},
          {"name": "Té Extractos de la Vida", "dose": "30 ml en 250 ml de agua, 2 veces al día", "notes": "Fase 1 y Fase 3"},
          {"name": "Madre Silvestre (Cápsulas 500 mg)", "dose": "1 cápsula 2 veces al día antes de los alimentos", "notes": "Fase 2 (Días 11 al 35) con abundante agua tibia"},
          {"name": "Bebida Andina (Jamaica + Maíz Morado)", "dose": "30 ml en 250 ml de agua, 1 a 2 veces al día", "notes": "Fase 2 (Días 11 al 35)"},
          {"name": "Vive-Oxi-100 (Gotero Concentrado)", "dose": "20 a 30 gotas en medio vaso de agua pura, 2 veces al día", "notes": "Fase 3 (Días 36 al 60)"}
        ],
        "steps": [
          "Días 1 al 10 (Fase 1 - Eje Digestivo): Administrar Fibramak Plus en ayunas (o Colón Renova mañana y noche) junto con Té Extractos de la Vida a media mañana y media tarde para reducir toxinas urémicas.",
          "Días 11 al 35 (Fase 2 - Litolisis Selectiva): Iniciar Madre Silvestre (1 cápsula 30 min antes del desayuno y almuerzo con agua tibia) acompañada de Bebida Andina para disolver arenillas y excretar ácido úrico.",
          "Días 36 al 60 (Fase 3 - Oxigenación Medular): Incorporar 25 gotas de Vive-Oxi-100 dos veces al día y dosis de mantenimiento de Té Extractos de la Vida para consolidar la regeneración endotelial."
        ]
      }
    }'::jsonb
  ) returning id into v_les33_id;

  -- ───────────────────────────────────────────────────────────────────────────
  -- MÓDULO 4 (Curso 2): Oxigenación Celular, Hipertensión Secundaria y Casos Clínicos
  -- ───────────────────────────────────────────────────────────────────────────
  insert into public.academy_modules (course_id, title, description, sort_order, is_published, metadata)
  values (
    v_course2_id,
    'Módulo 4: Oxigenación Celular, Hipertensión Secundaria y Casos Clínicos',
    'Regulación de la Enzima Convertidora de Angiotensina (ECA), control de hiperuricemia y oxigenación de tejidos hipóxicos.',
    2, true,
    '{}'::jsonb
  ) returning id into v_mod4_id;

  -- Lección 4.1
  insert into public.academy_lessons (
    module_id, title, description, content_type, video_provider, video_external_id,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod4_id,
    'Bebida Andina (Hibiscus y Maíz Morado) en la Regulación de la Angiotensina y Ácido Úrico',
    'Antocianinas protectoras de la microvasculatura renal y excreción uricosúrica.',
    'video',
    'youtube',
    'f2P6M_WW_4Q',
    '<h2>El Vínculo entre Riñón, Hipertensión Arterial y Ácido Úrico</h2>
    <p>El riñón y la presión arterial mantienen una relación bidireccional: la hipertensión daña los capilares glomerulares (nefroangioesclerosis), y un riñón inflamado o isquémico activa el sistema <strong>Renina-Angiotensina-Aldosterona (SRAA)</strong>, elevando aún más la presión sistémica.</p>
    <h3>Acción Terapéutica de Bebida Andina [Cód. 00003]:</h3>
    <ul>
      <li><strong>Flor de Jamaica (<em>Hibiscus sabdariffa</em>):</strong> Sus antocianinas (delfinidina-3-sambubiósido) actúan como inhibidores competitivos naturales de la Enzima Convertidora de Angiotensina (ECA), disminuyendo la vasoconstricción de la arteriola eferente. Además, promueve un potente efecto <em>uricosúrico</em>, facilitando la eliminación de cristales de urato monosódico.</li>
      <li><strong>Maíz Morado Andino y Uvas Rojas/Azules:</strong> Aportan cianidina-3-glucósido (C3G) y resveratrol, que regeneran el glicocálix endotelial y previenen la microinflamación vascular.</li>
    </ul>',
    1, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "warning",
        "title": "Monitoreo en Pacientes Polimedicados",
        "message": "En pacientes que ya toman fármacos antihipertensivos (IECA/ARA-II), Bebida Andina actúa como coadyuvante nutricional; se recomienda llevar un registro diario de presión arterial y no suspender bruscamente la medicación prescrita por su cardiólogo."
      }
    }'::jsonb
  ) returning id into v_les41_id;

  -- Lección 4.2
  insert into public.academy_lessons (
    module_id, title, description, content_type,
    text_content, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
  ) values (
    v_mod4_id,
    'Oxigenación Tisular Profunda en Tejidos Hipóxicos con Vive-Oxi-100',
    'Fisiología de la hipoxia medular renal y bioenergética celular con oxígeno líquido, magnesio y complejo B.',
    'text',
    '<h2>La Paradoja del Oxígeno en la Médula Renal</h2>
    <p>Aunque los riñones reciben el 20% del gasto cardíaco total, la <strong>médula renal interna</strong> opera fisiológicamente con una presión parcial de oxígeno muy baja ($pO_2$ de apenas 10 a 20 mmHg) debido al mecanismo de contracorriente y al altísimo consumo energético de las bombas ATPasa de $Na^+/K^+$ en la rama ascendente gruesa del Asa de Henle.</p>
    <p>Esto hace que los túbulos renales sean extremadamente vulnerables a la <strong>hipoxia e isquemia tisular</strong> causada por diabetes, hipertensión, estrés oxidativo o deshidratación.</p>
    <h3>Intervención en Fase 3 con Vive-Oxi-100 [Cód. 00004]</h3>
    <ul>
      <li><strong>Oxígeno Líquido Biodisponible + Cloruro de Magnesio:</strong> Optimiza la respiración mitocondrial y la síntesis de ATP en el epitelio tubular, previniendo la transición epitelio-mesenquimal hacia la fibrosis.</li>
      <li><strong>Complejo B (B1, B2, B6, B12) y Vitaminas C, D, E:</strong> La Vitamina B6 (piridoxina) junto al Magnesio reduce la síntesis endógena hepática de oxalatos y aumenta la solubilidad del calcio en la orina.</li>
      <li><strong>Esencias Botánicas (Totumo, Borrajas, Jengibre, Ajo, Toronjil y Menta):</strong> Mejoran la microcirculación periférica y la vasodilatación capilar.</li>
    </ul>',
    2, true, false, true, 25,
    '{
      "clinical_callout": {
        "severity": "info",
        "title": "Sinergia Magnesio + Vitamina B6 contra los Oxalatos",
        "message": "El aporte combinado de Magnesio y Vitamina B6 presente en Vive-Oxi-100 y Madre Silvestre es uno de los pilares bioquímicos más eficaces para evitar la recidiva (reaparición) de cálculos de oxalato de calcio tras la limpieza inicial."
      }
    }'::jsonb
  ) returning id into v_les42_id;

  -- Examen Final del Programa (Curso 2 - Integrador)
  insert into public.academy_assessments (
    course_id, module_id, title, description,
    total_points, passing_score, max_attempts, time_limit_minutes,
    randomize_questions, show_results, is_final_exam, is_published, sort_order
  ) values (
    v_course2_id, v_mod4_id,
    'Evaluación Integradora de Terapia Renal y Botánica SUMAK',
    'Examen Final del Programa (60 minutos, mínimo 75% aprobatorio para habilitar la emisión automática del Certificado y Diploma con Código QR).',
    100, 75, 3, 60,
    true, true, true, true, 1
  ) returning id into v_eval_final_id;

  -- Asociar el examen final al programa
  update public.academy_programs
  set final_exam_assessment_id = v_eval_final_id
  where id = v_program_id;

  -- Preguntas clave del Examen Final Integrador
  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval_final_id,
    '¿Cuáles son los lignanos bioactivos de la Chancapiedra (Phyllanthus niruri) responsables de inhibir la agregación de cristales de oxalato de calcio y relajar el uréter?',
    'single_choice', 20,
    'La filantina y la hipofilantina son los lignanos característicos de Phyllanthus niruri con acción litolítica y espasmolítica ureteral.',
    1
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, 'Filantina e hipofilantina', true, 1),
    (v_q_id, 'Cafeína y teobromina', false, 2),
    (v_q_id, 'Ácido acetilsalicílico y atropina', false, 3);

  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval_final_id,
    '¿Por qué la Cola de Caballo (Equisetum arvense) tiene un nivel de toxicidad moderado en estado crudo y qué precaución clínica debe respetarse?',
    'single_choice', 20,
    'Contiene tiaminasa en estado crudo (degrada la vitamina B1) y está contraindicada en cardiopatías graves o insuficiencia renal severa.',
    2
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, 'Por su contenido de tiaminasa en crudo; debe usarse en extractos estandarizados y evitarse en cardiopatías graves o insuficiencia renal severa', true, 1),
    (v_q_id, 'Porque eleva drásticamente el colesterol LDL en pacientes jóvenes', false, 2),
    (v_q_id, 'Porque bloquea la absorción de vitamina C en el estómago', false, 3);

  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval_final_id,
    '¿Cuál es la dosificación clínica correcta de Madre Silvestre (Cápsulas) en la Fase 2 del Protocolo Renal SUMAK?',
    'single_choice', 20,
    '1 cápsula 2 veces al día antes de los alimentos con abundante agua tibia.',
    3
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, '1 cápsula 2 veces al día antes de los alimentos con abundante agua tibia', true, 1),
    (v_q_id, '6 cápsulas juntas en seco antes de dormir sin tomar agua', false, 2),
    (v_q_id, '1 cápsula cada 15 días únicamente cuando hay fiebre', false, 3);

  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval_final_id,
    '¿Cómo actúa el extracto de Flor de Jamaica (Hibiscus sabdariffa) presente en la Bebida Andina sobre la fisiología renal y vascular?',
    'single_choice', 20,
    'Inhibe de forma natural la enzima convertidora de angiotensina (ECA) regulando la presión intraglomerular y ejerce efecto uricosúrico.',
    4
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, 'Inhibe la enzima convertidora de angiotensina (ECA) y promueve la excreción urinaria de ácido úrico (efecto uricosúrico)', true, 1),
    (v_q_id, 'Aumenta la retención de sodio para elevar la presión arterial', false, 2),
    (v_q_id, 'Cristaliza el ácido úrico dentro del túbulo colector', false, 3);

  insert into public.academy_questions (assessment_id, question_text, question_type, points, explanation, sort_order)
  values (
    v_eval_final_id,
    '¿Cuál es la dosificación exacta de Vive-Oxi-100 en la Fase 3 de oxigenación tisular y regeneración celular?',
    'single_choice', 20,
    'Vive-Oxi-100 se administra a razón de 20 a 30 gotas diluidas en medio vaso de agua pura, 2 veces al día.',
    5
  ) returning id into v_q_id;
  insert into public.academy_question_options (question_id, option_text, is_correct, sort_order) values
    (v_q_id, '20 a 30 gotas diluidas en medio vaso de agua pura, 2 veces al día', true, 1),
    (v_q_id, 'Medio frasco directo sin diluir una vez al mes', false, 2),
    (v_q_id, '2 gotas por semana mezcladas con bebidas gaseosas', false, 3);


  -- ───────────────────────────────────────────────────────────────────────────
  -- PARTE 4: VINCULACIÓN DE FICHAS BOTÁNICAS Y PRODUCTOS A LAS LECCIONES
  -- ───────────────────────────────────────────────────────────────────────────

  select id into v_bot_chancapiedra from public.academy_botanical_sheets where slug = 'chancapiedra';
  select id into v_bot_cola_caballo from public.academy_botanical_sheets where slug = 'cola-de-caballo';
  select id into v_bot_arenilla from public.academy_botanical_sheets where slug = 'flor-de-arenilla';
  select id into v_bot_canchalagua from public.academy_botanical_sheets where slug = 'canchalagua';
  select id into v_bot_jamaica from public.academy_botanical_sheets where slug = 'flor-de-jamaica';

  -- Vincular Fichas Botánicas a Lecciones 3.1, 3.2 y 4.1
  insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order) values
    (v_les31_id, v_bot_chancapiedra, 'Activo litolítico principal de Madre Silvestre: disgrega cristales de oxalato de calcio y relaja el uréter.', 1),
    (v_les31_id, v_bot_cola_caballo, 'Sinergista diurético ahorrador de potasio y regenerador urotelial en Madre Silvestre.', 2),
    (v_les32_id, v_bot_cola_caballo, 'Aporta sílice orgánico e isoquercitrina para diuresis remineralizante.', 1),
    (v_les32_id, v_bot_arenilla, 'Reduce la tensión superficial urinaria para el barrido de arenillas.', 2),
    (v_les32_id, v_bot_canchalagua, 'Depurativo hemolinfático que descarga el eje hepatorrenal.', 3),
    (v_les41_id, v_bot_jamaica, 'Inhibidor natural de la ECA y uricosúrico en Bebida Andina.', 1)
  on conflict (lesson_id, botanical_id) do nothing;

  -- Vincular Productos SUMAK Dosificados (academy_lesson_products)
  -- Lección 2.1 -> Colón Renova y Fibramak Plus
  insert into public.academy_lesson_products (
    lesson_id, producto_id, product_code, product_name, product_slug,
    dosage, administration_route, precautions, protocol_phase, sort_order
  ) values
  (
    v_les21_id,
    (select id from public.productos where codigo = '00016' limit 1),
    '00016',
    'Fórmula Herbal Colón Renova',
    'colon-renova',
    '30 ml por la mañana y 30 ml por la noche',
    'Vía oral. Agitar bien antes de tomar y acompañar con un vaso de agua.',
    'No apto para menores de 12 años ni mujeres embarazadas o en lactancia. Contraindicado en obstrucción intestinal.',
    'Fase 1: Desintoxicación Sistémica (Días 1 a 10)',
    1
  ),
  (
    v_les21_id,
    (select id from public.productos where codigo = '00005' limit 1),
    '00005',
    'Fibramak Plus',
    'fibramak-plus',
    '2 cucharadas (10 g) en ayunas disueltas en un vaso de agua o jugo natural',
    'Vía oral preferentemente por la mañana con abundante hidratación durante el día.',
    'No apto para menores de 12 años en dosis purgantes ni mujeres embarazadas sin supervisión.',
    'Fase 1: Desintoxicación Sistémica (Días 1 a 10)',
    2
  ),
  -- Lección 2.2 -> Té Extractos de la Vida y REGEN 24
  (
    v_les22_id,
    (select id from public.productos where codigo = '00001' limit 1),
    '00001',
    'Té Extractos de la Vida',
    'te-extractos-de-la-vida',
    '30 ml (2 cucharadas soperas) diluidos en un vaso con agua (250 ml), 1 a 2 veces al día',
    'Vía oral a media mañana y media tarde. Conservar refrigerado tras abrir.',
    'No recomendado en embarazo o lactancia sin supervisión profesional.',
    'Fase 1 y Mantenimiento Endotelial',
    1
  ),
  (
    v_les22_id,
    (select id from public.productos where codigo = '00002' limit 1),
    '00002',
    'REGEN 24',
    'regen-24',
    '30 ml (2 cucharadas) diluidas en un vaso de agua, 1 a 2 veces al día',
    'Vía oral como coadyuvante de nutrición celular y tránsito digestivo.',
    'No recomendado en embarazo, lactancia o pacientes con obstrucción intestinal.',
    'Soporte Digestivo-Inmunológico',
    2
  ),
  -- Lección 3.1 -> Madre Silvestre
  (
    v_les31_id,
    (select id from public.productos where codigo = '00011' limit 1),
    '00011',
    'Madre Silvestre (Cápsulas)',
    'capsula-madre-silvestre',
    '1 cápsula 2 veces al día antes de los alimentos con abundante agua tibia',
    'Vía oral 30 minutos antes del desayuno y del almuerzo.',
    'Contraindicado en gestación, lactancia y fallo renal terminal (Estadio 5 o anuria).',
    'Fase 2: Litolisis y Drenaje Renal (Días 11 a 35)',
    1
  ),
  -- Lección 4.1 -> Bebida Andina
  (
    v_les41_id,
    (select id from public.productos where codigo = '00003' limit 1),
    '00003',
    'Bebida Andina',
    'bebida-andina',
    '30 ml diluidos en 250 ml de agua, 1 a 2 veces al día',
    'Vía oral junto o después de las comidas principales.',
    'En pacientes con hipotensión arterial marcada o polimedicados con antihipertensivos, monitorear presión arterial.',
    'Fase 2: Regulación Vascular y Ácido Úrico (Días 11 a 35)',
    1
  ),
  -- Lección 4.2 -> Vive-Oxi-100
  (
    v_les42_id,
    (select id from public.productos where codigo = '00004' limit 1),
    '00004',
    'Vive-Oxi-100',
    'vive-oxi-100',
    '20 a 30 gotas diluidas en medio vaso de agua pura, 2 veces al día',
    'Vía oral en la mañana y en la tarde.',
    'No exceder la dosis diaria recomendada. Conservar en lugar fresco y protegido de la luz.',
    'Fase 3: Oxigenación y Regeneración (Días 36 a 60)',
    1
  )
  on conflict (lesson_id, product_code) do update set
    dosage = excluded.dosage,
    administration_route = excluded.administration_route,
    precautions = excluded.precautions,
    protocol_phase = excluded.protocol_phase;

end $$;
