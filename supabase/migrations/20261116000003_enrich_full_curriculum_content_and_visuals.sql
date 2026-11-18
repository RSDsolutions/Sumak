-- =============================================================================
-- MIGRATION: 20261116000003_enrich_full_curriculum_content_and_visuals.sql
-- DESCRIPCIÓN:
--   1. Limpieza de cursos legacy y consolidación de los 7 cursos oficiales.
--   2. Actualización de políticas RLS para acceso fluido a cursos, módulos,
--      lecciones, fichas botánicas y productos vinculados.
--   3. Enriquecimiento completo del portafolio de 6 productos SUMAK (Módulo 11).
--   4. Creación/actualización de las 24 Fichas Botánicas completas (Módulos 6 y 7 + Renales).
--   5. Enriquecimiento al 100% de todas las lecciones de los 11 Módulos del Manual
--      Académico SUMAK Vida Ecuador con infografías HTML/Tailwind, imágenes HD,
--      fotos locales de ingredientes (/ingredientes/*.png) y envases (/products/*.png).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LIMPIEZA DE CURSOS LEGACY Y AJUSTE DE POLÍTICAS RLS
-- ─────────────────────────────────────────────────────────────────────────────

delete from public.academy_diploma_issuances
where course_id in (
  select id from public.academy_courses
  where slug in (
    'test', 'test-2', 'curso-dev', 'bases-fisiologicas-y-prevencion-renal',
    'sumak-salud-y-bienestar', 'afiliarse-a-sumak', 'introduccion-a-sumak',
    'escalar-en-sumak', 'tomar-las-riendas-de-sumak'
  )
);

delete from public.academy_courses
where slug in (
  'test', 'test-2', 'curso-dev', 'bases-fisiologicas-y-prevencion-renal',
  'sumak-salud-y-bienestar', 'afiliarse-a-sumak', 'introduccion-a-sumak',
  'escalar-en-sumak', 'tomar-las-riendas-de-sumak'
);

delete from public.academy_programs
where slug in ('ts', 'p', 's', 'especializacion-en-salud-renal-y-terapia-botanica-andina');

delete from public.academy_categories
where slug in ('test', '1', 'categoria-de-demostracion', 'sumak-curso-de-demostracion');

grant execute on function public.has_course_access(uuid) to anon, authenticated;

update public.academy_courses
set
  status = 'published',
  access_mode = 'public',
  cover_image_url = case slug
    when 'bases-fisiologicas-prevencion-renal-sumak' then 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1000&q=80'
    when 'fitoterapia-avanzada-protocolos-renales-sumak' then 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80'
    when 'salud-urinaria-prostata-equilibrio-femenino' then 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80'
    when 'hepatologia-integrativa-higado-graso-regeneracion' then 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80'
    when 'gastroenterologia-funcional-gastritis-colitis-sumak' then 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1000&q=80'
    when 'vademecum-herbolaria-toxicologia-botanica-sumak' then 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1000&q=80'
    when 'salud-metabolica-pancreas-diabetes-hipertension-sumak' then 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80'
    else cover_image_url
  end,
  sort_order = case slug
    when 'bases-fisiologicas-prevencion-renal-sumak' then 1
    when 'fitoterapia-avanzada-protocolos-renales-sumak' then 2
    when 'salud-urinaria-prostata-equilibrio-femenino' then 3
    when 'hepatologia-integrativa-higado-graso-regeneracion' then 4
    when 'gastroenterologia-funcional-gastritis-colitis-sumak' then 5
    when 'vademecum-herbolaria-toxicologia-botanica-sumak' then 6
    when 'salud-metabolica-pancreas-diabetes-hipertension-sumak' then 7
    else sort_order
  end
where slug in (
  'bases-fisiologicas-prevencion-renal-sumak',
  'fitoterapia-avanzada-protocolos-renales-sumak',
  'salud-urinaria-prostata-equilibrio-femenino',
  'hepatologia-integrativa-higado-graso-regeneracion',
  'gastroenterologia-funcional-gastritis-colitis-sumak',
  'vademecum-herbolaria-toxicologia-botanica-sumak',
  'salud-metabolica-pancreas-diabetes-hipertension-sumak'
);

update public.academy_programs
set
  access_mode = 'public',
  cover_image_url = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80'
where slug = 'especializacion-salud-renal-sumak';

drop policy if exists "Cursos: lectura según acceso" on public.academy_courses;
create policy "Cursos: lectura según acceso" on public.academy_courses
  for select using (
    public.is_academy_staff()
    or (status = 'published' and access_mode in ('public', 'free_registered', 'sumak_exclusive', 'premium'))
  );

drop policy if exists "Módulos: lectura con acceso al curso" on public.academy_modules;
create policy "Módulos: lectura con acceso al curso" on public.academy_modules
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_courses c
      where c.id = course_id
        and c.status = 'published'
    )
  );

drop policy if exists "Lecciones: lectura según acceso" on public.academy_lessons;
create policy "Lecciones: lectura según acceso" on public.academy_lessons
  for select using (
    public.is_academy_staff()
    or is_published = true
  );

drop policy if exists "Programas: lectura según publicación" on public.academy_programs;
create policy "Programas: lectura según publicación" on public.academy_programs
  for select using (
    public.is_academy_staff()
    or status = 'published'
  );

drop policy if exists "Programa cursos: lectura con programa" on public.academy_program_courses;
create policy "Programa cursos: lectura con programa" on public.academy_program_courses
  for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENRIQUECIMIENTO DE LA TABLA public.productos (MÓDULO 11 DEL MANUAL)
-- ─────────────────────────────────────────────────────────────────────────────

update public.productos
set
  presentacion = 'Botella de 500 ml / 1000 ml',
  pvp = 25.00,
  modo_uso = 'Tomar 30 ml (2 cucharadas) diluidos en un vaso de agua, 1 a 2 veces al día. Agitar antes de usar. Conservar refrigerado una vez abierto.',
  ingredientes = $json$[
    "Resveratrol de Uva — antioxidante polifenólico cardioprotector y regenerador celular",
    "Pectina de Manzana Verde — fibra soluble prebiótica reguladora digestiva y lipídica",
    "Extracto de Guanábana — soporte inmunológico y citoprotector natural",
    "Extracto de Arándano Azul — rico en antocianinas protectoras urinarias y microvasculares",
    "Extracto de Noni — iridoides inmunomoduladores y revitalizantes celulares",
    "Extracto de Moringa — aporte denso de aminoácidos esenciales y antioxidantes",
    "Extracto de Diente de León — depurativo hepatorrenal y estimulante biliar suave",
    "Extracto de Té Rojo — apoyo metabólico y oxidación saludable de lípidos",
    "Extracto de Aloe Vera — mucílagos protectores y regeneradores de la mucosa gástrica",
    "Vitaminas y Minerales esenciales"
  ]$json$::jsonb
where codigo = '00001';

update public.productos
set
  presentacion = 'Botella de 1000 ml',
  pvp = 25.00,
  modo_uso = 'Tomar 30 ml (2 cucharadas) diluidos en un vaso de agua, 1 a 2 veces al día. Agitar antes de usar.',
  ingredientes = $json$[
    "Extracto de Tamarindo — regulador osmótico suave y depurativo hepato-biliar",
    "Extracto de Semilla de Papaya — acción antiparasitaria y protectora del lumen intestinal",
    "Extracto de Uña de Gato — inmunomodulador y antiinflamatorio sistémico",
    "Extracto de Noni — revitalizante celular rico en iridoides y polifenoles",
    "Extracto de Guayaba — rico en vitamina C, quercetina y taninos protectores",
    "Extracto de Sábila — mucílagos cicatrizantes y suavizantes del epitelio digestivo",
    "Extracto de Piña — aporta bromelina digestiva y desinflamatoria",
    "Extracto de Chía — ácidos grasos Omega-3 vegetales y fibra soluble",
    "Extracto de Menta — acción carminativa y antiespasmódica gastrointestinal",
    "Extracto de Ortiga — depurativo sanguíneo y remineralizante orgánico",
    "Minerales esenciales: Calcio (Ca), Magnesio (Mg), Zinc (Zn), Selenio (Se), Potasio (K), Cromo (Cr)"
  ]$json$::jsonb
where codigo = '00002';

update public.productos
set
  presentacion = 'Frasco · polvo micropulverizado',
  pvp = 25.00,
  modo_uso = 'Disolver 2 cucharadas (10 g) en un vaso de agua o jugo en ayunas, 1 vez al día.',
  ingredientes = $json$[
    "Probióticos Vegetales — restauran el equilibrio de la microbiota intestinal",
    "Piña (bromelina) — enzima proteolítica digestiva y antiinflamatoria",
    "Polvo de Avena — rico en betaglucanos y fibra soluble protectora",
    "Polvo de Chía — mucílagos de arrastre mecánico y ácidos grasos Omega-3",
    "Polvo de Moringa — nutrición celular densa y clorofila antioxidante",
    "Polvo de Alfalfa — enzimas digestivas, clorofila y vitamina K",
    "Polvo de Cúrcuma — curcuminoides hepatoprotectores y desinflamatorios",
    "Polvo de Hoja de Sen — activa suavemente la motilidad del colon",
    "Micropulverizado de Sábila — suavizante y regenerador epitelial",
    "Minerales: Calcio (Ca), Hierro (Fe), Magnesio (Mg), Potasio (K), Selenio (Se), Zinc (Zn), Ácido Fólico (B9), Vitamina B6"
  ]$json$::jsonb
where codigo = '00005';

update public.productos
set
  presentacion = 'Botellas de 1000 ml, 500 ml y 250 ml',
  pvp = 25.00,
  modo_uso = 'Tomar 30 ml por la mañana y 30 ml por la noche. Agitar bien antes de tomar. Conservar refrigerado una vez abierto.',
  ingredientes = $json$[
    "Hierbabuena — alivia gases, relaja espasmos intestinales y refresca la mucosa",
    "Paico — acción antiparasitaria tradicional contra amebas y lombrices",
    "Ampo — depurativo ancestral que desinflama y neutraliza toxinas digestivas",
    "Ciruela pasa — rica en sorbitol y fibra soluble que lubrica el tránsito fecal",
    "Ajenjo — tónico amargo digestivo que estimula la bilis y frena fermentaciones",
    "Sábila — desinflama el colon, regenera el epitelio y suaviza la evacuación",
    "Chía — mucílagos de arrastre mecánico y aporte de ácidos grasos Omega-3",
    "Jengibre — estimula el peristaltismo, reduce náuseas y desinflama la pared",
    "Linaza — rica en lignanos y mucílagos que lubrican el canal anal",
    "Hoja de Zen (Sen) — estimula las contracciones naturales del colon contra la atonía",
    "Semilla de papaya — carpaina antiparasitaria y limpiadora del lumen intestinal",
    "Noni — fortalece la inmunidad intestinal (GALT) y aporta iridoides antioxidantes",
    "Limón — alcalinizante metabólico, rico en vitamina C y antiséptico natural",
    "Manzana verde — pectina prebiótica que nutre la microbiota benéfica",
    "Edulcorante no calórico — sabor agradable sin calorías, 100% apto para diabéticos"
  ]$json$::jsonb
where codigo = '00016';

update public.productos
set
  presentacion = '100 cápsulas de 500 mg c/u',
  pvp = 20.00,
  modo_uso = 'Tomar 1 cápsula 2 veces al día antes de los alimentos, acompañada con un vaso de agua.',
  ingredientes = $json$[
    "Té del Indio — tónico regulador pélvico y digestivo andino",
    "Chancapiedra — acción litolítica y relajante del músculo liso ureteral",
    "Menta — antiespasmódica y alivio de cólicos pélvicos",
    "Flor Blanca — equilibrio del ciclo femenino y bienestar ginecológico",
    "Malva — mucílagos demulcentes que suavizan el urotelio irritado",
    "Sábila (Aloe Vera) — desinflamatoria y regeneradora de tejidos",
    "Cola de Caballo — diurético suave remineralizante rico en sílice",
    "Uña de Gato — inmunomodulador y antiinflamatorio urogenital",
    "Sangre de Drago — taspina cicatrizante tisular microlesional",
    "Ajenjo — depurativo y regulador del equilibrio interno",
    "Flor de Arenilla — favorece la excreción de sedimentos y sales urinarias",
    "Canchalagua — depurativo tradicional de la sangre y la linfa",
    "Minerales: Calcio (Ca), Hierro (Fe), Potasio (K), Magnesio (Mg), Zinc (Zn), Selenio (Se)",
    "Vitaminas: Ácido Fólico (B9), Vitamina B6, Vitamina C, Vitamina E"
  ]$json$::jsonb
where codigo = '00011';

update public.productos
set
  presentacion = 'Frasco gotero de 60 ml — concentrado con Oxígeno Líquido',
  pvp = 25.00,
  modo_uso = 'Tomar 20 a 30 gotas diluidas en agua, 1 a 2 veces al día.',
  ingredientes = $json$[
    "Esencia de Totumo — soporte broncorrespiratorio y oxigenación tisular",
    "Esencia de Borrajas — rica en ácido gamma-linolénico (Omega-6 antiinflamatorio)",
    "Esencia de Jengibre — estimula la microcirculación periférica y vitalidad",
    "Esencia de Ajo — vasodilatador natural y protector endotelial",
    "Esencia de Toronjil — equilibrio del sistema nervioso y calma cardiovascular",
    "Esencia de Menta — apertura respiratoria y frescura celular",
    "Miel de Abeja — vehículo bioactivo y energético natural",
    "Magnesio (Mg), Oxígeno Líquido, Vitaminas B1, B2, B6, B12, C, D3 y E"
  ]$json$::jsonb
where codigo = '00004';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VADEMÉCUM BOTÁNICO COMPLETO (24 FICHAS INDIVIDUALES: MÓDULOS 6, 7 Y RENAL)
-- ─────────────────────────────────────────────────────────────────────────────

-- Eliminar fichas agrupadas antiguas para mantener fichas 100% individuales
delete from public.academy_botanical_sheets
where slug in ('perejil-apio-pepino', 'linaza-clavo-malva');

insert into public.academy_botanical_sheets (
  slug, common_name, scientific_name, image_url, part_used,
  active_compounds, properties, traditional_uses,
  toxicity_level, toxicity_notes, clinical_precautions, contraindications, related_product_code
) values
-- 1. Mala Madre (Módulo 6)
(
  'mala-madre-kalanchoe',
  'Mala Madre (Hoja del Aire / Aranto)',
  'Kalanchoe daigremontiana / Bryophyllum spp.',
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=600&q=80',
  'Hojas carnosas (Uso exclusivamente tópico externo)',
  $json$[
    {"name": "Bufadienólidos (Glucósidos cardíacos)", "action": "Compuestos esteroideos con potente acción cardiotóxica capaces de alterar el ritmo del corazón"},
    {"name": "Flavonoides (Quercetina, Kaempferol)", "action": "Actividad antioxidante y antiinflamatoria local en aplicación externa"},
    {"name": "Ácidos fenólicos y triterpenos", "action": "Efecto cicatrizante y calmante cutáneo superficial"}
  ]$json$::jsonb,
  array['Antiinflamatoria tópica local', 'Cicatrizante cutánea tradicional', 'Refrescante en cataplasmas externos'],
  array['Aplicación tradicional externa sobre golpes leves o irritaciones cutáneas', 'PROHIBIDA su ingesta en infusiones, jugos o licuados caseros'],
  'strict_caution',
  'Contiene bufadienólidos cardiotóxicos. Su ingesta oral puede provocar arritmias cardíacas graves, bloqueo auriculoventricular e intoxicación severa.',
  'PROHIBIDA SU INGESTA CASERA. No preparar en tés, licuados ni extractos orales. Aunque en redes sociales se promocione para tumores o gastritis, el riesgo cardiotóxico y hepatotóxico supera cualquier supuesto beneficio oral.',
  array['Ingesta oral en cualquier dosis', 'Pacientes con cardiopatías o uso de digoxina', 'Embarazo, lactancia y niños'],
  null
),
-- 2. Noni (Módulo 6)
(
  'noni',
  'Noni',
  'Morinda citrifolia',
  '/ingredientes/noni.png',
  'Fruto maduro (en extractos estandarizados y pasteurizados)',
  $json$[
    {"name": "Iridoides (Ácido deacetilasperulosídico)", "action": "Actividad inmunomoduladora, antioxidante y citoprotectora celular"},
    {"name": "Polifenoles y Escopoletina", "action": "Modulación de la respuesta inflamatoria y soporte endotelial"},
    {"name": "Potasio (K+) en alta concentración", "action": "Electrolito intracelular que exige función renal conservada para su excreción"}
  ]$json$::jsonb,
  array['Inmunomoduladora y antioxidante celular', 'Revitalizante y adaptógena metabólica', 'Coadyuvante en fórmulas digestivas estandarizadas'],
  array['Apoyo a las defensas naturales del organismo', 'Uso seguro dentro de formulaciones controladas como Té Extractos de la Vida, REGEN 24 y Colon Renova'],
  'moderate',
  'El fruto crudo o en jugos caseros concentrados posee altísimo contenido de potasio y se ha asociado a reportes clínicos de hepatotoxicidad idiosincrática.',
  'Evitar el consumo excesivo de jugos caseros concentrados de noni. Es muy alto en potasio (peligroso en insuficiencia renal crónica) y existen reportes de lesión hepática aguda cuando se abusa de preparados artesanales.',
  array['Insuficiencia renal crónica o hiperpotasemia', 'Enfermedad hepática activa sin supervisión médica', 'Uso concomitante con diuréticos ahorradores de potasio'],
  '00001'
),
-- 3. Sábila (Módulo 6)
(
  'sabila-aloe-vera',
  'Sábila (Aloe Vera)',
  'Aloe vera (Aloe barbadensis Miller)',
  '/ingredientes/aloe-vera.png',
  'Exclusivamente el Gel / Cristal interno transparente (sin cáscara ni látex amarillo)',
  $json$[
    {"name": "Acemanano y Mucílagos (Gel transparente)", "action": "Polisacáridos demulcentes que recubren, hidratan y regeneran la mucosa gástrica e intestinal"},
    {"name": "Aloína y Antraquinonas (Látex amarillo / Acíbar)", "action": "Compuestos hidroxiantracénicos altamente irritantes y laxantes drásticos que deben eliminarse"}
  ]$json$::jsonb,
  array['Demulcente y citoprotectora de la mucosa gástrica', 'Cicatrizante y antiinflamatoria epitelial', 'Suavizante del tránsito intestinal'],
  array['Protección de la mucosa en gastritis y acidez usando solo el cristal transparente bien lavado', 'Presente de forma purificada en Té Extractos de la Vida, REGEN 24, Fibramak Plus, Colon Renova y Madre Silvestre'],
  'moderate',
  'Diferenciar estrictamente el GEL transparente (seguro y regenerador) del LÁTEX AMARILLO o acíbar (aloína), el cual causa diarrea severa, cólicos, pérdida de potasio y daño renal/hepático.',
  'Al preparar en casa, retirar toda la cáscara verde y lavar abundantemente el cristal bajo el chorro de agua hasta eliminar el 100% del líquido amarillo (aloína). No usar el látex amarillo como laxante crónico.',
  array['Consumo de cáscara o látex amarillo (aloína)', 'Embarazo y lactancia (el acíbar estimula contracciones)', 'Obstrucción intestinal o enfermedad renal severa'],
  '00002'
),
-- 4. Nopal (Módulo 6)
(
  'nopal-opuntia',
  'Nopal (Tuna)',
  'Opuntia ficus-indica',
  '/ingredientes/nopal.png',
  'Cladodios jóvenes (pencas tiernas limpias sin espinas)',
  $json$[
    {"name": "Fibra dietética soluble e insoluble", "action": "Retarda la absorción intestinal de glucosa y lípidos postprandiales"},
    {"name": "Mucílagos y Pectinas", "action": "Forman un gel viscoso que protege la mucosa digestiva y genera saciedad"},
    {"name": "Polifenoles y Betalaínas", "action": "Acción antioxidante y moduladora metabólica hepática"}
  ]$json$::jsonb,
  array['Hipoglucemiante coadyuvante postprandial', 'Reguladora del perfil lipídico y colesterol', 'Prebiótica y protectora digestiva'],
  array['Ingrediente clave del Licuado Natural para el Hígado Graso (1/2 penca pequeña)', 'Apoyo nutricional en resistencia a la insulina, diabetes tipo 2 y sobrepeso'],
  'low',
  'Alimento vegetal muy seguro. Por su alto contenido de mucílagos y fibra puede reducir o retrasar la absorción de medicamentos orales si se toman al mismo tiempo.',
  'En pacientes que utilizan insulina o hipoglucemiantes orales (metformina, glibenclamida), el nopal puede sumar su efecto reductor de glucosa; monitorear la glucemia para evitar hipoglucemias y separar su ingesta al menos 1 a 2 horas de los fármacos.',
  array['Hipoglucemia no controlada', 'Tomar simultáneamente con medicamentos de estrecho margen terapéutico'],
  '00009'
),
-- 5. Canela (Módulos 6 y 7 unificados)
(
  'canela-ceilan',
  'Canela (Ceilán vs. Cassia)',
  'Cinnamomum verum (Ceilán) y Cinnamomum cassia',
  'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=600&q=80',
  'Corteza interna seca en rama o polvo (Infusión: 1 trozo pequeño en 250 ml por 8-10 min)',
  $json$[
    {"name": "Cinamaldehído y Eugenol", "action": "Acción carminativa, digestiva, antiflatulenta y sensibilizadora de receptores de insulina"},
    {"name": "Polifenoles procianidínicos", "action": "Antioxidantes que apoyan el metabolismo de la glucosa"},
    {"name": "Cumarina (Alta en C. cassia / Muy baja en C. verum)", "action": "Compuesto hepatotóxico en dosis altas o prolongadas; por ello se prefiere siempre Canela de Ceilán"}
  ]$json$::jsonb,
  array['Carminativa y antiespasmódica digestiva', 'Coadyuvante en sensibilidad a la insulina', 'Aromática y termogénica suave'],
  array['Infusión digestiva: 1 trozo pequeño de rama en 250 ml de agua por 8 a 10 minutos', 'Componente de la Infusión de Tuza de Maíz, Licuado de Hígado Graso y Desayuno Saludable'],
  'moderate',
  'La Canela Cassia (común comercial) contiene altos niveles de cumarina, que en exceso causa daño hepático. Preferir siempre Canela de Ceilán (Cinnamomum verum) en dosis culinarias.',
  'Usar en cantidades culinarias o infusiones suaves (1/2 cucharadita o 1 trozo pequeño de rama). No consumir megadosis de canela en polvo en ayunas por riesgo de irritación gástrica, hepatotoxicidad por cumarina e hipoglucemia al combinarse con antidiabéticos.',
  array['Enfermedad hepática activa (evitar Canela Cassia en dosis altas)', 'Úlcera gástrica sangrante', 'Embarazo (evitar extractos concentrados)'],
  null
),
-- 6. Chía (Módulo 6)
(
  'chia-salvia',
  'Chía',
  'Salvia hispanica',
  '/ingredientes/chia.png',
  'Semillas enteras previamente hidratadas en agua',
  $json$[
    {"name": "Ácido Alfa-Linolénico (ALA - Omega 3 vegetal)", "action": "Efecto antiinflamatorio sistémico, cardioprotector y regulador de triglicéridos"},
    {"name": "Mucílagos hidrofílicos solubles", "action": "Absorben hasta 10 veces su peso en agua formando un gel lubricante del bolo fecal"},
    {"name": "Fibra insoluble y Antioxidantes (Ácido clorogénico)", "action": "Efecto escoba en el colon y retardo del vaciamiento de azúcares"}
  ]$json$::jsonb,
  array['Lubricante y reguladora del tránsito intestinal', 'Fuente de Omega-3 vegetal cardioprotector', 'Saciante y estabilizadora glucémica'],
  array['Remojar 1 cucharada en agua durante 15-20 minutos antes de consumir', 'Presente en REGEN 24, Fibramak Plus y Sumak Colon Renova'],
  'low',
  'Las semillas secas se expanden rápidamente al contacto con líquidos y pueden causar obstrucción esofágica si se tragan secas sin hidratar.',
  'REGLA OBLIGATORIA: Hidratar siempre las semillas de chía en agua o líquido durante al menos 15 minutos antes de ingerirlas, especialmente en personas con dificultad para tragar (disfagia). Separar 2 horas de la toma de medicamentos.',
  array['Ingesta de semillas secas sin hidratar (riesgo de impactación esofágica)', 'Obstrucción intestinal aguda', 'Precaución con anticoagulantes y antihipertensivos en dosis muy altas'],
  '00005'
),
-- 7. Pepino (Módulo 6)
(
  'pepino-cucumis',
  'Pepino',
  'Cucumis sativus',
  'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=600&q=80',
  'Fruto fresco (pulpa y cáscara bien lavada)',
  $json$[
    {"name": "Agua biológica (>95%) y Potasio", "action": "Hidratación celular profunda y estímulo suave de la diuresis acuosa"},
    {"name": "Vitamina K (Filoquinona)", "action": "Cofactor hepático en la síntesis de factores de coagulación sanguínea"},
    {"name": "Vitamina C y Cucurbitacinas", "action": "Acción antioxidante y refrescante de tejidos"}
  ]$json$::jsonb,
  array['Hidratante y refrescante celular', 'Alcalinizante suave y bajo en calorías', 'Aporte de fibra y electrolitos'],
  array['Alimento clave del grupo de vegetales verdes para salud hepática y plato de 9 pulgadas', 'Ensaladas frescas y jugos verdes hidratantes'],
  'low',
  'Muy seguro como alimento. Su cáscara aporta vitamina K, por lo que no se deben hacer cambios bruscos de consumo si se toma warfarina.',
  'En pacientes anticoagulados con warfarina (antagonista de la vitamina K), mantener una ingesta diaria constante sin atracones repentinos de jugos verdes concentrados para no alterar el INR.',
  array['Cambios bruscos de consumo en pacientes con warfarina'],
  null
),
-- 8. Apio (Módulo 6)
(
  'apio-graveolens',
  'Apio',
  'Apium graveolens',
  '/ingredientes/apio.png',
  'Tallos y hojas frescas (1 rama por porción en licuados o ensaladas)',
  $json$[
    {"name": "Ftálidos (3-n-butilftálido)", "action": "Relajación del músculo liso arterial y apoyo en la regulación de la presión sanguínea"},
    {"name": "Agua, Fibra, Folato y Potasio", "action": "Depuración hidrosalina suave y soporte del tránsito digestivo"},
    {"name": "Vitamina K y Apigenina", "action": "Efecto antioxidante, antiinflamatorio y cofactor de coagulación"}
  ]$json$::jsonb,
  array['Diurético acuoso suave y depurativo', 'Coadyuvante vascular e hipotensor ligero', 'Digestivo y remineralizante'],
  array['Ingrediente esencial del Licuado Natural para el Hígado Graso (1 rama fresca)', 'Presente en Fibramak Chupapanza'],
  'low',
  'El apio contiene alérgenos específicos (Api g 1) capaces de desencadenar reacciones alérgicas en personas sensibles (síndrome polen-alimento) y furanocumarinas fotosensibilizantes en exceso.',
  'Lavarlo y desinfectarlo minuciosamente. Vigilar su consumo en personas con alergia conocida al apio o polen de abedul/artemisa, y mantener consumo estable si se utilizan anticoagulantes (por su contenido de vitamina K).',
  array['Alergia alimentaria al apio', 'Insuficiencia renal severa con restricción de potasio', 'Cambios bruscos de ingesta con warfarina'],
  '00009'
),
-- 9. Perejil (Módulo 6)
(
  'perejil-crispum',
  'Perejil',
  'Petroselinum crispum',
  '/ingredientes/perejil.png',
  'Hojas frescas (1 puñado pequeño culinario; evitar extractos concentrados)',
  $json$[
    {"name": "Vitamina K y Vitamina C en alta densidad", "action": "Interviene en la coagulación sanguínea y ofrece potente acción antioxidante"},
    {"name": "Apigenina y Luteolina", "action": "Flavonoides con actividad antiinflamatoria y hepatoprotectora"},
    {"name": "Aceites volátiles (Apiol y Miristicina)", "action": "En dosis concentradas estimulan el músculo uterino y son nefrotóxicos"}
  ]$json$::jsonb,
  array['Depurativo suave en dosis culinarias', 'Antioxidante rico en vitamina C y flavonoides', 'Carminativo y refrescante'],
  array['Uso culinario prudente (1 puñado pequeño) en el Licuado para Hígado Graso', 'Presente de forma balanceada en Fibramak Chupapanza'],
  'moderate',
  'Seguro en cantidades de cocina, pero sus aceites esenciales concentrados (apiol y miristicina) estimulan contracciones uterinas y su altísima vitamina K interfiere con la warfarina.',
  'Usar exclusivamente en porciones culinarias pequeñas (1 ramita o puñado pequeño). Las infusiones muy concentradas, extractos o semillas de perejil están estrictamente contraindicados en el embarazo y en pacientes que toman warfarina.',
  array['Embarazo (cantidades medicinales o concentradas por riesgo abortivo)', 'Tratamiento con anticoagulantes tipo warfarina', 'Nefritis aguda o insuficiencia renal severa'],
  '00009'
),
-- 10. Romero (Módulo 6)
(
  'romero-salvia',
  'Romero',
  'Salvia rosmarinus (Rosmarinus officinalis)',
  '/ingredientes/romero.png',
  'Hojas secas o frescas en infusión suave (Nunca ingerir aceite esencial)',
  $json$[
    {"name": "Ácido rosmarínico, Ácido carnósico y Carnosol", "action": "Potentes antioxidantes fenólicos neuroprotectores y hepatoprotectores"},
    {"name": "1,8-Cineol (Eucaliptol) y Alcanfor", "action": "Monoterpenos estimulantes circulatorios y carminativos; neurotóxicos si se ingiere el aceite esencial puro"}
  ]$json$::jsonb,
  array['Colerético y digestivo hepatobiliar', 'Antioxidante y tónico circulatorio', 'Carminativo contra gases postprandiales'],
  array['Infusión aromática suave después de comidas copiosas', 'Condimento mediterráneo y andino protector de lípidos'],
  'low',
  'La hoja en infusión suave o como condimento es de baja toxicidad, pero el ACEITE ESENCIAL puro de romero NUNCA debe ingerirse porque puede desencadenar convulsiones.',
  'No ingerir jamás el aceite esencial de romero. En infusión de hojas, usar con precaución y evitar excesos en personas con antecedentes de epilepsia/convulsiones, hipertensión no controlada o durante el embarazo.',
  array['Ingesta de aceite esencial puro', 'Epilepsia o antecedentes convulsivos', 'Embarazo y lactancia en dosis medicinales concentradas'],
  null
),
-- 11. Ruda (Módulo 6)
(
  'ruda-graveolens',
  'Ruda',
  'Ruta graveolens',
  'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
  'Planta aérea (PROHIBIDA su ingesta oral)',
  $json$[
    {"name": "Furanocumarinas (Psoralenos y Bergapteno)", "action": "Compuestos fototóxicos que provocan quemaduras graves y ampollas al contacto con la piel y el sol"},
    {"name": "Alcaloides quinolínicos y acridónicos (Arborinina, Graveolina)", "action": "Potente acción espasmogénica sobre el músculo uterino (abortiva) y toxicidad hepatorrenal"},
    {"name": "Metil-nonil-cetona (Aceite volátil)", "action": "Neurotóxico, gastroirritante severo y hemorrágico uterino"}
  ]$json$::jsonb,
  array['Uso exclusivamente externo/ambiental en rituales culturales', 'PROHIBIDA como bebida medicinal o infusión oral'],
  array['Conocimiento toxicológico para prevenir intoxicaciones graves por remedios caseros mal indicados'],
  'strict_caution',
  'Planta de ALTA TOXICIDAD. Provoca contracciones uterinas violentas, hemorragia, aborto, necrosis hepática, fallo renal agudo y fotodermatitis ampollosa.',
  'PROHIBIDA SU INGESTA. Nunca tomar té de ruda para "bajar la menstruación" o aliviar cólicos. Causa intoxicación multiorgánica grave y daño hepático/renal potencialmente mortal. Evitar también frotar la planta fresca en la piel expuesta al sol.',
  array['Prohibida su ingesta oral en toda persona', 'Embarazo (altamente abortiva y teratogénica)', 'Contacto cutáneo expuesto a radiación solar (fotosensibilidad severa)'],
  null
),
-- 12. Manzanilla (Módulo 7)
(
  'manzanilla-matricaria',
  'Manzanilla',
  'Matricaria chamomilla',
  '/ingredientes/manzanilla.png',
  'Flores secas (Infusión: 1 cucharadita en 250 ml de agua caliente, tapar 5 a 10 min)',
  $json$[
    {"name": "Alfa-bisabolol y Camazuleno", "action": "Sesquiterpenos con acción antiinflamatoria, antiespasmódica y reparadora de la mucosa gástrica"},
    {"name": "Apigenina y Flavonoides", "action": "Efecto ansiolítico suave, relajante muscular digestivo y calmante"},
    {"name": "Mucílagos florales", "action": "Suavizan la garganta y el epitelio estomacal irritado"}
  ]$json$::jsonb,
  array['Antiespasmódica y antiinflamatoria gástrica', 'Carminativa suave contra gases y cólicos', 'Relajante digestiva y nerviosa ligera'],
  array['Preparación prudente: 1 cucharadita de flores secas por taza (250 ml), reposar tapada 5 a 10 minutos y colar', 'Remedio natural de primera línea en gastritis, colitis e Infusión de Bienestar y Vitalidad'],
  'low',
  'Planta muy noble y segura. Puede causar reacción alérgica cruzada únicamente en personas alérgicas a la familia Asteraceae (margaritas, crisantemos, ambrosía).',
  'Preparar en infusión suave tapada durante 5 a 10 minutos sin hervir las flores. Evitar si existe alergia conocida al polen de margaritas o ambrosía, y no aplicar infusiones caseras directamente dentro de los ojos.',
  array['Alergia conocida a plantas de la familia Asteraceae (margaritas, ambrosía)'],
  null
),
-- 13. Orégano (Módulo 7)
(
  'oregano-vulgare',
  'Orégano',
  'Origanum vulgare',
  'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=600&q=80',
  'Hojas secas (Infusión: 1/2 a 1 cucharadita en 250 ml de agua caliente, 5 a 8 min)',
  $json$[
    {"name": "Carvacrol y Timol", "action": "Fenoles monoterpénicos con actividad carminativa, antimicrobiana suave y antiespasmódica"},
    {"name": "Ácido rosmarínico y Flavonoides", "action": "Acción antioxidante y digestiva postprandial"}
  ]$json$::jsonb,
  array['Carminativa y antiflatulenta', 'Digestiva y antiespasmódica intestinal', 'Antiséptica suave en infusión moderada'],
  array['Preparación prudente: 1/2 a 1 cucharadita de hojas secas en 250 ml de agua recién hervida, reposar 5 a 8 minutos y colar', 'Alivio de digestiones pesadas y distensión por gases'],
  'low',
  'Seguro en infusión suave de hojas. No ingerir el aceite esencial puro de orégano sin dilución ni supervisión por ser fuertemente irritante de las mucosas.',
  'No concentrar la infusión más allá de 1 cucharadita por taza, ya que muy cargado puede irritar la mucosa en pacientes con gastritis aguda o úlcera.',
  array['Gastritis erosiva aguda (si se prepara muy concentrado)', 'Ingesta de aceite esencial puro sin diluir'],
  null
),
-- 14. Menta (Módulo 7)
(
  'menta-piperita',
  'Menta / Hierbabuena',
  'Mentha piperita / Mentha spicata',
  '/ingredientes/menta.png',
  'Hojas secas o frescas (Infusión: 1 cucharadita en 250 ml de agua caliente, 5 a 7 min)',
  $json$[
    {"name": "Mentol y Mentona", "action": "Bloquean canales de calcio en el músculo liso colónico, aliviando espasmos, pero relajan el esfínter esofágico inferior"},
    {"name": "Ácido rosmarínico y Lutelina", "action": "Acción carminativa, refrescante y digestiva"}
  ]$json$::jsonb,
  array['Antiespasmódica del colon e intestino', 'Carminativa contra gases y pesadez', 'Refrescante y aromática'],
  array['Preparación prudente: 1 cucharadita de hojas en 250 ml de agua caliente, reposar 5 a 7 minutos', 'Presente en REGEN 24, Colon Renova, Madre Silvestre y Vive-Oxi-100'],
  'moderate',
  'ADVERTENCIA CLAVE: El mentol relaja el esfínter esofágico inferior, por lo que EMPEORA el reflujo gastroesofágico (ERGE), la acidez y la hernia hiatal.',
  'Evitar las infusiones de menta en pacientes que sufren de reflujo gastroesofágico, regurgitación ácida o acidez estomacal severa, ya que facilita el retorno del ácido hacia el esófago.',
  array['Reflujo gastroesofágico (ERGE) y hernia hiatal', 'Niños menores de 2 años (evitar vapores o mentol cerca de fosas nasales)', 'Cálculos biliares sintomáticos'],
  '00016'
),
-- 15. Clavo de olor (Módulo 7)
(
  'clavo-de-olor',
  'Clavo de Olor',
  'Syzygium aromaticum',
  'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=600&q=80',
  'Botones florales secos enteros (Infusión: solo 1 a 2 clavos enteros en 250 ml, 5 min)',
  $json$[
    {"name": "Eugenol (70-85% del aceite esencial)", "action": "Analgésico local, carminativo e inhibidor de la agregación plaquetaria; irritante gástrico en exceso"},
    {"name": "Taninos y Beta-cariofileno", "action": "Acción antiinflamatoria y astringente suave"}
  ]$json$::jsonb,
  array['Carminativa y antiflatulenta en dosis mínimas', 'Analgésica dental tradicional (uso tópico diluido)', 'Aromática digestiva'],
  array['Preparación prudente: usar únicamente 1 a 2 clavos enteros por taza (250 ml) durante 5 minutos y retirar'],
  'moderate',
  'El eugenol es un irritante directo de la mucosa gástrica si se concentra y posee efecto antiagregante plaquetario que aumenta el riesgo de sangrado.',
  'Nunca hervir puñados de clavo de olor ni ingerir aceite esencial de clavo. Está contraindicado en gastritis aguda, úlceras pépticas y en pacientes que toman anticoagulantes o antiagregantes (warfarina, aspirina, clopidogrel) por riesgo de hemorragia.',
  array['Gastritis aguda y úlcera péptica', 'Uso de anticoagulantes o trastornos de coagulación', 'Embarazo y niños pequeños'],
  null
),
-- 16. Linaza (Módulo 7)
(
  'linaza-usitatissimum',
  'Linaza',
  'Linum usitatissimum',
  '/ingredientes/linaza.png',
  'Semillas enteras o molidas al momento (1 cucharadita en 250 ml de agua, hidratar 10 a 15 min)',
  $json$[
    {"name": "Mucílagos hidrosolubles", "action": "Forman una capa viscosa demulcente que protege la mucosa gástrica y lubrica las heces en estreñimiento y hemorroides"},
    {"name": "Ácido Alfa-Linolénico (Omega-3) y Lignanos (SDG)", "action": "Acción antiinflamatoria vascular, moduladora hormonal suave y cardioprotectora"}
  ]$json$::jsonb,
  array['Demulcente protectora gástrica y esofágica', 'Laxante mecánico suave y formadora de volumen', 'Coadyuvante en hemorroides y estreñimiento'],
  array['Preparación prudente: 1 cucharadita de semillas en 250 ml de agua tibia o al ambiente, dejar hidratar 10 a 15 minutos', 'Presente en Sumak Colon Renova y Fibramak Chupapanza'],
  'low',
  'Sus mucílagos atrapan fármacos en el tubo digestivo reduciendo su absorción si se toman a la misma hora.',
  'REGLA DE ORO: Separar la toma de agua o semillas de linaza al menos 2 HORAS antes o después de cualquier medicamento oral. Acompañar siempre con suficiente agua durante el día.',
  array['Toma simultánea con medicamentos orales (separar 2 horas)', 'Obstrucción intestinal o dolor abdominal agudo de causa desconocida'],
  '00016'
),
-- 17. Lavanda (Módulo 7)
(
  'lavanda-angustifolia',
  'Lavanda',
  'Lavandula angustifolia',
  'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?auto=format&fit=crop&w=600&q=80',
  'Flores secas (Infusión muy suave: solo 1 pizca de flores en 250 ml de agua, 5 min)',
  $json$[
    {"name": "Linalool y Acetato de linalilo", "action": "Monoterpenos con acción sedante suave sobre el sistema nervioso central y espasmolítica digestiva"},
    {"name": "Ácido ursólico y Taninos", "action": "Efecto antioxidante y calmante"}
  ]$json$::jsonb,
  array['Relajante nerviosa y favorecedora del sueño', 'Antiespasmódica en cólicos por estrés', 'Aromática calmante'],
  array['Preparación prudente: colocar solo 1 pizca pequeña de flores secas en 250 ml de agua caliente durante 5 minutos y colar'],
  'low',
  'Puede producir somnolencia y potenciar el efecto sedante de fármacos depresores del sistema nervioso central.',
  'Usar solo 1 pizca por taza (si se concentra resulta amarga e irritante). No combinar con medicamentos sedantes, ansiolíticos (benzodiacepinas), somníferos ni alcohol, y evitar antes de conducir.',
  array['Uso concomitante con sedantes, somníferos o alcohol', 'Ingesta de aceite esencial de lavanda', 'Embarazo y lactancia'],
  null
),
-- 18. Malva blanca (Módulo 7)
(
  'malva-blanca',
  'Malva Blanca',
  'Malva parviflora / Malva sylvestris',
  '/ingredientes/malva.png',
  'Hojas y flores secas (Infusión: 1 cucharadita en 250 ml de agua caliente, 5 a 10 min)',
  $json$[
    {"name": "Mucílagos vegetales (10-15%)", "action": "Recubren y suavizan las mucosas irritadas del estómago, intestino y vías urinarias"},
    {"name": "Antocianinas (Malvidina) y Flavonoides", "action": "Acción desinflamatoria local y antioxidante"}
  ]$json$::jsonb,
  array['Demulcente y emoliente de mucosas digestivas y urinarias', 'Suavizante en gastritis, reflujo y estreñimiento', 'Antiinflamatoria suave'],
  array['Preparación prudente: 1 cucharadita de hojas y flores en 250 ml de agua recién hervida, reposar 5 a 10 minutos', 'Ingrediente clave de las cápsulas Madre Silvestre'],
  'low',
  'Por su riqueza en mucílagos disminuye la absorción intestinal de medicamentos si se ingieren juntos.',
  'REGLA DE ORO: Separar la infusión de malva blanca al menos 2 HORAS de la toma de cualquier medicamento oral para no interferir con su absorción.',
  array['Toma simultánea con medicamentos (separar 2 horas)'],
  '00011'
),
-- 19. Cola de caballo (Módulos 3 y 7 unificados)
(
  'cola-de-caballo',
  'Cola de Caballo',
  'Equisetum arvense',
  '/ingredientes/cola-de-caballo.png',
  'Tallos estériles aéreos (Ciclos cortos; preferir formulaciones estandarizadas)',
  $json$[
    {"name": "Sílice orgánico soluble (Ácido silícico)", "action": "Remineralizante y regenerador del tejido conectivo y urotelial"},
    {"name": "Flavonoides (Isoquercitrina) y Saponinas", "action": "Efecto diurético que aumenta la eliminación de agua y modifica electrolitos"},
    {"name": "Tiaminasa (en planta cruda no procesada)", "action": "Enzima que destruye la vitamina B1 (tiamina) si se consume por periodos prolongados"}
  ]$json$::jsonb,
  array['Diurética suave y depurativa urinaria', 'Remineralizante del tejido conjuntivo', 'Coadyuvante en retención hídrica leve'],
  array['Uso puntual en ciclos cortos o dentro de fórmulas estandarizadas como Madre Silvestre'],
  'moderate',
  'Contiene tiaminasa (riesgo de déficit de vitamina B1 en uso crónico), altera electrolitos y modifica la excreción renal de litio.',
  'No consumir en infusiones caseras por más de 1 a 2 semanas seguidas. Está estrictamente contraindicada en insuficiencia renal o cardíaca (donde no se debe forzar el volumen urinario) y en pacientes en tratamiento con litio o diuréticos.',
  array['Insuficiencia renal crónica o aguda', 'Insuficiencia cardíaca descompensada', 'Tratamiento con Litio o digoxina', 'Embarazo y lactancia'],
  '00011'
),
-- 20. Pelo de choclo (Módulo 7)
(
  'pelo-de-choclo',
  'Pelo de Choclo (Estigmas de Maíz)',
  'Zea mays',
  '/ingredientes/maiz-morado.png',
  'Estigmas secos de maíz (Infusión: 1 pizca en 250 ml de agua caliente, 5 a 10 min)',
  $json$[
    {"name": "Flavonoides (Maysina) y Polifenoles", "action": "Efecto diurético acuoso suave y calmante de la mucosa vesical"},
    {"name": "Sales de potasio y Mucílagos", "action": "Favorecen el flujo urinario y suavizan la irritación leve del tracto urinario"}
  ]$json$::jsonb,
  array['Diurética suave y calmante vesical', 'Coadyuvante hídrico en molestias urinarias leves'],
  array['Preparación prudente: 1 pizca de estigmas secos limpios en 250 ml de agua recién hervida, tapar 5 a 10 minutos y colar'],
  'low',
  'ADVERTENCIA CLÍNICA: El agua de pelo de choclo aumenta suavemente la orina, pero NO es un antibiótico ni elimina bacterias en una cistitis o pielonefritis.',
  'No utilizar nunca el pelo de choclo para sustituir el tratamiento médico antibiótico en una infección urinaria activa. Si hay fiebre, dolor lumbar o sangre en la orina, acudir al médico de inmediato.',
  array['Sustitución de antibióticos en infección urinaria bacteriana', 'Insuficiencia renal o cardíaca con restricción de líquidos'],
  null
),
-- 21. Chancapiedra (Renal)
(
  'chancapiedra',
  'Chancapiedra',
  'Phyllanthus niruri',
  '/ingredientes/chancapiedra.png',
  'Planta aérea entera',
  $json$[
    {"name": "Lignanos (Filantina e Hipofilantina)", "action": "Inhiben la agregación de cristales de oxalato de calcio y protegen el hepatocito"},
    {"name": "Alcaloides y Terpenos", "action": "Relajan el músculo liso ureteral facilitando la expulsión indolora de arenillas"}
  ]$json$::jsonb,
  array['Litolítica (rompe-cálculos) y anti-litogénica', 'Espasmolítica de las vías urinarias', 'Hepatoprotectora'],
  array['Prevención y apoyo en arenillas de oxalato de calcio y ácido úrico', 'Ingrediente central de Madre Silvestre'],
  'low',
  'Segura en dosis terapéuticas estándar.',
  'Acompañar siempre con abundante hidratación. En cólico nefrítico obstructivo agudo con fiebre o anuria, acudir a urgencias médicas.',
  array['Embarazo y lactancia', 'Obstrucción ureteral completa aguda'],
  '00011'
),
-- 22. Flor de Arenilla (Renal)
(
  'flor-de-arenilla',
  'Flor de Arenilla',
  'Herniaria glabra / Pollichia campestris',
  '/ingredientes/flor-de-arenilla.png',
  'Sumidades floridas',
  $json$[
    {"name": "Saponinas triterpénicas y Flavonoides", "action": "Disminuyen la tensión superficial urinaria favoreciendo el arrastre de sedimentos y sales"}
  ]$json$::jsonb,
  array['Desarenadora renal tradicional', 'Diurética suave y desinflamatoria urotelial'],
  array['Sinergia con Chancapiedra en Madre Silvestre para limpieza de sedimentos urinarios'],
  'low',
  'Baja toxicidad en formulaciones estandarizadas.',
  'Mantener ingesta adecuada de agua durante su uso.',
  array['Insuficiencia renal severa anúrica'],
  '00011'
),
-- 23. Canchalagua (Renal)
(
  'canchalagua',
  'Canchalagua Andina',
  'Schkuhria pinnata',
  '/ingredientes/canchalagua.png',
  'Planta aérea',
  $json$[
    {"name": "Lactonas sesquiterpénicas y Flavonoides", "action": "Acción depurativa del eje hepato-renal, linfático y cutáneo"}
  ]$json$::jsonb,
  array['Depurativa sanguínea y linfática andina', 'Coadyuvante metabólica y antiinflamatoria'],
  array['Integrada en Madre Silvestre para reducir la carga de toxinas hacia el riñón'],
  'low',
  'Evitar dosis excesivas de decocciones amargas concentradas.',
  'No usar en embarazo ni en úlcera gastroduodenal activa.',
  array['Embarazo y lactancia', 'Úlcera péptica activa'],
  '00011'
),
-- 24. Flor de Jamaica (Renal / Cardiovascular)
(
  'flor-de-jamaica',
  'Flor de Jamaica (Hibiscus)',
  'Hibiscus sabdariffa',
  '/ingredientes/flor-de-jamaica.png',
  'Cálices florales secos',
  $json$[
    {"name": "Antocianinas (Delfinidina y Cianidina)", "action": "Inhibición natural suave de la enzima convertidora de angiotensina (ECA) y protección endotelial"},
    {"name": "Ácidos orgánicos (Hibíscico, Cítrico, Málico)", "action": "Acción uricosúrica y diurética refrescante"}
  ]$json$::jsonb,
  array['Coadyuvante antihipertensiva natural', 'Uricosúrica y antioxidante vascular'],
  array['Componente clave de la Bebida Andina SUMAK junto al Maíz Morado'],
  'low',
  'Muy segura; puede reducir ligeramente la presión arterial.',
  'Monitorear la presión en personas con hipotensión arterial marcada.',
  array['Hipotensión arterial severa'],
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
  related_product_code = excluded.related_product_code,
  is_active = true;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ENRIQUECIMIENTO DE PORTADAS DE LECCIONES DE CURSOS 1 Y 2 (SALUD RENAL)
-- ─────────────────────────────────────────────────────────────────────────────

update public.academy_lessons
set thumbnail_url = 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=900&q=80'
where id in ('80df7bdf-8d17-4025-ae32-2cfa77bc6d21', '083a404e-e864-4335-80bb-e4cdbd4206d1', 'f07ec2d2-7060-4cf2-836e-86156a9431fa');

update public.academy_lessons
set thumbnail_url = '/products/fibramak-plus.png'
where id = '5ee858b5-0146-464f-8f90-be737b6c7531';

update public.academy_lessons
set thumbnail_url = '/products/te-extractos-de-la-vida-v2.png'
where id = 'aae49411-4783-4066-9e01-eac62c5f64a5';

update public.academy_lessons
set thumbnail_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80'
where id in ('7a5e57b9-7721-4bc7-bbed-1e425c6e0f9e', '47c7ebe2-478f-4606-97b7-9c52e50bd6f7', '40f38b42-6ef1-483f-85f2-44ca5b8d9810');

update public.academy_lessons
set thumbnail_url = '/products/bebida-andina.png'
where id = '52d69960-e51c-4265-833c-79391edac9da';

update public.academy_lessons
set thumbnail_url = '/products/vive-oxi-100.png'
where id = '91236e7a-e029-4a9d-a9fc-4dbeb22f37b0';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MÓDULO 1 DEL MANUAL: CUIDADO DE LAS VÍAS URINARIAS EN HOMBRE Y MUJER
--    Curso: salud-urinaria-prostata-equilibrio-femenino
-- ─────────────────────────────────────────────────────────────────────────────

-- LECCIÓN 1.1: Anatomía y Salud Urinaria Femenina
update public.academy_lessons
set
  title = 'Anatomía y Salud Urinaria Femenina: Prevención de Cistitis y Hábitos Clínicos',
  description = 'Estructura y función del sistema urinario, particularidad anatómica de la uretra femenina, los 6 hábitos de prevención y signos de alarma médica.',
  thumbnail_url = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 30,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=80" alt="Anatomía y Cuidado Urinario Femenino" />

  <h2>1. Estructura y Función del Sistema Urinario</h2>
  <p>El sistema urinario es el encargado de <strong>producir, transportar, almacenar temporalmente y eliminar la orina</strong>, depurando la sangre de desechos metabólicos y manteniendo el equilibrio de agua y electrolitos del cuerpo. Está conformado por 4 órganos principales:</p>
  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <h4 class="font-black text-[#12361B] m-0">1. Riñones (Órganos pares)</h4>
      <p class="text-sm text-[#2D5A37] mt-1 mb-0">Filtran la sangre de forma continua y producen la orina eliminando urea, creatinina, ácido úrico y exceso de sales.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">2. Uréteres</h4>
      <p class="text-sm text-[#7C4C18] mt-1 mb-0">Dos conductos musculares finos que transportan la orina gota a gota desde cada riñón hasta la vejiga.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">3. Vejiga Urinaria</h4>
      <p class="text-sm text-[#2C526A] mt-1 mb-0">Órgano muscular hueco situado en la pelvis que almacena la orina hasta el momento de la micción.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#ECF6EE] border border-emerald-200">
      <h4 class="font-black text-[#0D381E] m-0">4. Uretra</h4>
      <p class="text-sm text-[#245834] mt-1 mb-0">Conducto final encargado de expulsar la orina desde la vejiga hacia el exterior del cuerpo.</p>
    </div>
  </div>

  <h2>2. Particularidad Anatómica Femenina y Problemas Frecuentes</h2>
  <p>En la mujer, la <strong>uretra es significativamente más corta</strong> (aproximadamente 3 a 4 cm) y su abertura externa se encuentra muy cerca de la vagina y la región anal. Esta cercanía anatómica facilita que bacterias intestinales (principalmente <em>Escherichia coli</em>) asciendan hacia la vejiga.</p>
  <p><strong>Problemas urinarios más frecuentes en la mujer:</strong></p>
  <ul>
    <li><strong>Cistitis:</strong> Inflamación e infección de la vejiga urinaria.</li>
    <li><strong>Ardor o dolor al orinar (disuria):</strong> Sensación quemante al paso de la orina.</li>
    <li><strong>Urgencia miccional y polaquiuria:</strong> Ganas constantes e intensas de ir al baño, eliminando pequeñas cantidades de orina en cada ocasión.</li>
    <li><strong>Orina turbia, con mal olor o aspecto anormal:</strong> Cambios en la transparencia, coloración u olor fuerte.</li>
    <li><strong>Dolor o presión en la parte baja del abdomen:</strong> Molestia persistente en la región suprapúbica o pélvica.</li>
  </ul>

  <h2>3. Los 6 Hábitos Exactos de Prevención Urinaria en la Mujer</h2>
  <div class="grid sm:grid-cols-2 gap-3 my-4">
    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200"><strong>1. Beber suficiente agua:</strong> Mantener una hidratación constante durante todo el día para limpiar las vías urinarias por arrastre.</div>
    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200"><strong>2. No aguantar la orina:</strong> Vaciar la vejiga cada vez que el cuerpo lo pida; retener la orina favorece la multiplicación bacteriana.</div>
    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200"><strong>3. Limpiarse de adelante hacia atrás:</strong> Después de orinar o evacuar, para evitar arrastrar bacterias desde el ano hacia la uretra.</div>
    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200"><strong>4. Zona genital limpia y seca:</strong> Usar ropa interior de algodón transpirable y evitar prendas excesivamente ajustadas o húmedas.</div>
    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200"><strong>5. Evitar productos íntimos perfumados:</strong> No usar aerosoles, talcos, duchas vaginales ni jabones agresivos que alteren la flora protectora.</div>
    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200"><strong>6. Orinar después de las relaciones sexuales:</strong> Ayuda a expulsar mecánicamente los microorganismos que hayan podido ingresar a la uretra.</div>
  </div>

  <h2>4. Alimentación para la Salud Urinaria</h2>
  <ul>
    <li>Consumir diariamente abundantes <strong>frutas y verduras frescas</strong> ricas en agua, fibra y antioxidantes.</li>
    <li>Elegir siempre el <strong>agua pura como bebida principal</strong>.</li>
    <li>Evitar el exceso de <strong>azúcares refinados, bebidas gaseosas y alcohol</strong>, que irritan la vejiga y favorecen la inflamación.</li>
    <li><strong>No abusar de la sal (sodio)</strong> ni de alimentos ultraprocesados.</li>
    <li><strong>Regla de oro:</strong> Las infusiones naturales son un apoyo de hidratación y bienestar, pero <strong>nunca deben sustituir el tratamiento médico</strong> cuando existe una infección activa.</li>
  </ul>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "contraindication",
      "title": "¿Cuándo consultar al médico de inmediato? — Prohibido Automedicarse con Antibióticos",
      "message": "Acuda a evaluación médica inmediata si presenta: 1) Ardor intenso al orinar que no mejora, 2) Sangre visible en la orina (hematuria), 3) Fiebre o escalofríos, 4) Dolor fuerte en la espalda baja o en los costados (región lumbar), 5) Náuseas o vómitos, o 6) Infecciones urinarias repetitivas. REGLA FUNDAMENTAL DEL DR. LUIS PAREDES: NUNCA se automedique con antibióticos; tomar antibióticos sin receta ni urocultivo genera resistencia bacteriana grave y oculta infecciones renales (pielonefritis)."
    }
  }$json$::jsonb
where id = '31411584-fffc-4fc1-ad08-64fae16c4374';


-- LECCIÓN 1.2: Vías Urinarias Masculinas y Salud Prostática
update public.academy_lessons
set
  title = 'Vías Urinarias Masculinas, Salud Prostática y los 7 Hábitos de Protección',
  description = 'Relación anatómica próstata-uretra, los 5 síntomas prostáticos clave, controles preventivos y los 7 hábitos generales de protección urinaria.',
  thumbnail_url = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 30,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80" alt="Salud Prostática y Control Médico Masculino" />

  <h2>1. Relación Anatómica de la Próstata con la Uretra Masculina</h2>
  <p>En el varón, la <strong>próstata</strong> es una glándula del sistema reproductor masculino ubicada estratégicamente justo debajo de la vejiga urinaria y <strong>rodeando como un anillo la primera porción de la uretra</strong> (uretra prostática). Debido a esta disposición anatómica, cuando la próstata se inflama (prostatitis) o aumenta de tamaño con la edad (hiperplasia prostática), comprime directamente el conducto uretral y dificulta el paso libre de la orina desde la vejiga.</p>

  <h2>2. Los 5 Síntomas Prostáticos de Alerta</h2>
  <div class="grid sm:grid-cols-2 gap-3.5 my-4">
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">1. Dificultad al iniciar la micción</h4>
      <p class="text-sm text-[#2C526A] mt-1 mb-0">Demora o necesidad de hacer esfuerzo abdominal para que comience a salir el chorro de orina.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">2. Chorro urinario débil</h4>
      <p class="text-sm text-[#7C4C18] mt-1 mb-0">Disminución del calibre y la fuerza del chorro, o flujo intermitente que se corta y vuelve a empezar.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <h4 class="font-black text-[#12361B] m-0">3. Nicturia (Levantarse de noche)</h4>
      <p class="text-sm text-[#2D5A37] mt-1 mb-0">Necesidad de despertarse 2 o más veces durante la madrugada para ir a orinar, interrumpiendo el sueño reparador.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#FBF4E8] border border-amber-300">
      <h4 class="font-black text-[#4D3A13] m-0">4. Sensación de vaciado incompleto</h4>
      <p class="text-sm text-[#6E5421] mt-1 mb-0">Percepción de que la vejiga sigue con orina residual inmediatamente después de haber terminado de orinar.</p>
    </div>
    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 sm:col-span-2">
      <h4 class="font-black text-rose-950 m-0">5. Urgencia y aumento de la frecuencia miccional</h4>
      <p class="text-sm text-rose-900 mt-1 mb-0">Deseo repentino e impostergable de orinar e incremento en el número de veces que se acude al baño durante el día.</p>
    </div>
  </div>

  <h2>3. Crecimiento Prostático por Edad y Controles Tempranos</h2>
  <p>A partir de los 40 a 45 años es frecuente que la próstata experimente un crecimiento progresivo. Es fundamental comprender que <strong>no todo síntoma prostático significa cáncer de próstata</strong> (la mayoría corresponde a crecimiento prostático benigno o inflamación), pero <strong>todo cambio al orinar requiere evaluación médica temprana</strong> para proteger la vejiga y evitar que la retención de orina dañe los riñones.</p>

  <h2>4. Los 7 Hábitos Generales de Protección Urinaria y Prostática</h2>
  <ol>
    <li><strong>Hidratación diaria adecuada:</strong> Beber agua pura durante el día (reduciendo la ingesta 2 horas antes de dormir si hay nicturia).</li>
    <li><strong>No retener la orina:</strong> Acudir al baño oportunamente sin forzar la capacidad de la vejiga.</li>
    <li><strong>Higiene genital adecuada:</strong> Aseo diario suave sin productos irritantes.</li>
    <li><strong>Actividad física regular:</strong> Caminar y ejercitarse a diario, evitando pasar muchas horas seguidas sentado para no congestionar la pelvis.</li>
    <li><strong>Mantener un peso corporal saludable:</strong> El exceso de grasa abdominal aumenta la presión pélvica y la inflamación sistémica.</li>
    <li><strong>Evitar el alcohol y el tabaco:</strong> Ambos irritan directamente la próstata y la mucosa vesical.</li>
    <li><strong>Controlar la diabetes y la hipertensión arterial:</strong> La glucosa alta y la presión elevada dañan los vasos sanguíneos y nervios que regulan la vejiga y los riñones.</li>
  </ol>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "info",
      "title": "Prevención Masculina Sin Tabúes",
      "message": "El control urológico preventivo anual a partir de los 40-45 años (o desde los 40 si existen antecedentes familiares) permite detectar a tiempo cualquier alteración prostática cuando su manejo es sencillo, seguro y altamente efectivo."
    }
  }$json$::jsonb
where id = 'f64b8c57-b5af-445a-a342-ba5930e9c5e9';


-- LECCIÓN 1.3: Receta Tradicional y Protocolo SUMAK
update public.academy_lessons
set
  title = 'Receta Tradicional de Tuza de Maíz, Ajo y Canela + Protocolo SUMAK',
  description = 'Preparación paso a paso de la infusión tradicional de 1 litro con tuza de maíz, cáscara de ajo y canela, y sinergia con Té Extractos de la Vida y Madre Silvestre.',
  thumbnail_url = '/products/capsula-madre-silvestre.png',
  estimated_minutes = 25,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1000&q=80" alt="Infusión Tradicional de Tuza de Maíz y Canela" />

  <h2>1. Sabiduría Tradicional para el Confort de las Vías Urinarias</h2>
  <p>En la herbolaria tradicional andina, la decocción suave de <strong>tuza de maíz</strong> (el corazón fibroso de la mazorca), combinada con la <strong>paja o cáscara seca de ajo</strong> y una rama de <strong>canela</strong>, se emplea como bebida tibia de apoyo para favorecer el confort pélvico y acompañar la hidratación diaria del sistema urinario tanto en mujeres como en varones.</p>

  <h2>2. Sinergia con el Protocolo Fitoterapéutico SUMAK</h2>
  <p>Para potenciar el cuidado urogenital con extractos estandarizados de calidad de laboratorio, el Dr. Luis Paredes integra dos fórmulas maestras de SUMAK Vida Ecuador:</p>
  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB] flex items-center gap-4">
      <img src="/products/te-extractos-de-la-vida-v2.png" alt="Té Extractos de la Vida" class="w-20 h-20 object-contain shrink-0 bg-white rounded-xl p-1 border border-emerald-200 !my-0" />
      <div>
        <h4 class="font-black text-[#12361B] m-0">Té Extractos de la Vida</h4>
        <p class="text-xs text-[#2D5A37] mt-1 mb-0">Aporta Arándano Azul, Diente de León, Aloe Vera y Resveratrol. <strong>Dosis:</strong> 30 ml diluidos en un vaso de agua, 1 a 2 veces al día.</p>
      </div>
    </div>
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200 flex items-center gap-4">
      <img src="/products/capsula-madre-silvestre.png" alt="Madre Silvestre" class="w-20 h-20 object-contain shrink-0 bg-white rounded-xl p-1 border border-amber-200 !my-0" />
      <div>
        <h4 class="font-black text-[#5B3407] m-0">Madre Silvestre (Cápsulas)</h4>
        <p class="text-xs text-[#7C4C18] mt-1 mb-0">12 plantas (Chancapiedra, Flor de Arenilla, Cola de Caballo, Malva, Uña de Gato) + 10 vitaminas/minerales. <strong>Dosis:</strong> 1 cápsula 2 veces al día antes de los alimentos.</p>
      </div>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "recipe_card": {
      "title": "Infusión Tradicional de Tuza de Maíz, Ajo y Canela (1 Litro)",
      "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
      "prep_time": "20 minutos (10 min hervor + 10 min reposo)",
      "servings": "1 Litro (3 a 4 tazas al día)",
      "benefits": ["Hidratación urinaria suave", "Confort pélvico y prostático", "Receta tradicional andina"],
      "posology": "Tomar tibia o a temperatura ambiente a lo largo del día como agua de tiempo complementaria. No sustituye antibióticos en caso de infección bacteriana.",
      "ingredients": [
        {"name": "Tuza de maíz limpia y seca", "dose": "1 puñado", "notes": "Corazón de la mazorca", "image_url": "/ingredientes/maiz-morado.png"},
        {"name": "Paja o cáscara seca de ajo limpia", "dose": "1 puñado pequeño", "notes": "Bien lavada", "image_url": "/ingredientes/ajo.png"},
        {"name": "Canela en rama", "dose": "1 rama pequeña", "notes": "Preferir Ceilán"},
        {"name": "Agua potable", "dose": "1 litro", "notes": "Base de decocción"}
      ],
      "steps": [
        "Lavar muy bien la tuza de maíz y la paja o cáscara seca de ajo bajo el chorro de agua para retirar cualquier partícula de polvo.",
        "Colocar 1 litro de agua potable en una olla limpia y llevar al fuego.",
        "Incorporar el puñado de tuza de maíz, el puñado pequeño de cáscara seca de ajo y la rama pequeña de canela.",
        "Dejar hervir a fuego medio-bajo durante exactamente 10 minutos.",
        "Apagar el fuego, tapar la olla y dejar reposar durante 10 minutos adicionales para completar la infusión.",
        "Colar cuidadosamente antes de servir y consumir tibia o al ambiente sin exceso de azúcar."
      ]
    }
  }$json$::jsonb
where id = '8dea6ca4-25b0-4b89-a29a-a4cf121d4548';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. MÓDULOS 2, 3 Y 4 DEL MANUAL: HÍGADO GRASO, HISTOLOGÍA, CIRROSIS Y CÁNCER
--    Curso: hepatologia-integrativa-higado-graso-regeneracion
-- ─────────────────────────────────────────────────────────────────────────────

-- LECCIÓN 2.1: Fisiología Hepática y Esteatosis
update public.academy_lessons
set
  title = 'Fisiología Hepática, las 5 Funciones Vitales y Diagnóstico de Esteatosis (>5% Grasa)',
  description = 'Anatomía del hígado en el cuadrante superior derecho, sus 5 funciones bioquímicas, tipos de hígado graso, factores metabólicos, síntomas y los 4 métodos de diagnóstico clínico.',
  thumbnail_url = 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1000&q=80" alt="Laboratorio Clínico y Diagnóstico Hepático" />

  <h2>1. Anatomía y las 5 Funciones Vitales del Hígado</h2>
  <p>El hígado es el órgano interno más grande del cuerpo humano, situado en la parte superior derecha del abdomen (hipocondrio derecho), debajo del diafragma. Actúa como el gran laboratorio bioquímico central del organismo cumpliendo <strong>5 funciones vitales insustituibles</strong>:</p>
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <h4 class="font-black text-[#12361B] m-0">1. Procesar nutrientes</h4>
      <p class="text-xs sm:text-sm text-[#2D5A37] mt-1 mb-0">Transforma los carbohidratos, aminoácidos y lípidos absorbidos en el intestino para que las células puedan utilizarlos.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">2. Eliminar tóxicos y medicamentos</h4>
      <p class="text-xs sm:text-sm text-[#7C4C18] mt-1 mb-0">Filtra la sangre portal, neutraliza toxinas metabólicas, amoníaco, alcohol y metaboliza los fármacos.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">3. Producir bilis</h4>
      <p class="text-xs sm:text-sm text-[#2C526A] mt-1 mb-0">Fabrica y secreta bilis hacia el intestino delgado, indispensable para emulsionar y digerir las grasas y absorber vitaminas liposolubles.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#ECF6EE] border border-emerald-200">
      <h4 class="font-black text-[#0D381E] m-0">4. Fabricar proteínas de coagulación</h4>
      <p class="text-xs sm:text-sm text-[#245834] mt-1 mb-0">Sintetiza albúmina y los factores esenciales para la coagulación de la sangre que evitan hemorragias.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#FBF4E8] border border-amber-300 sm:col-span-2 lg:col-span-2">
      <h4 class="font-black text-[#4D3A13] m-0">5. Almacenar energía y vitaminas</h4>
      <p class="text-xs sm:text-sm text-[#6E5421] mt-1 mb-0">Guarda energía en forma de glucógeno para mantener estable la glucosa en ayunas, además de almacenar vitaminas (A, D, E, K, B12) y hierro.</p>
    </div>
  </div>

  <h2>2. ¿Qué es el Hígado Graso (Esteatosis Hepática) y cuáles son sus Tipos?</h2>
  <p><strong>Criterio diagnóstico exacto:</strong> Se diagnostica hígado graso cuando <strong>más del 5% del peso total del hígado</strong> corresponde a grasa (triglicéridos) acumulada dentro de las células hepáticas (hepatocitos). Existen <strong>2 tipos principales</strong>:</p>
  <ul>
    <li><strong>Hígado Graso No Alcohólico (MASLD / EHGNA):</strong> Es el más común; ocurre en personas que no abusan del alcohol y está causado por mala alimentación (exceso de azúcares, fructosa y harinas refinadas), obesidad y desórdenes metabólicos.</li>
    <li><strong>Hígado Graso Alcohólico:</strong> Provocado directamente por el consumo frecuente o excesivo de bebidas alcohólicas, ya que el metabolismo del etanol bloquea la oxidación de las grasas en el hepatocito.</li>
  </ul>

  <h2>3. Factores Metabólicos de Riesgo y Síntomas</h2>
  <p><strong>Factores de riesgo principales:</strong> Sobrepeso u obesidad abdominal, diabetes mellitus tipo 2, resistencia a la insulina, colesterol y triglicéridos elevados en sangre, y estilo de vida sedentario.</p>
  <p><strong>Síntomas clínicos:</strong> En sus inicios suele ser silencioso, pero frecuentemente se manifiesta con <strong>cansancio o fatiga inexplicable</strong>, sensación de <strong>pesadez o inflamación abdominal</strong> después de comer, y molestia o dolor sordo en la <strong>parte superior derecha del abdomen</strong>.</p>

  <h2>4. Los 4 Métodos de Diagnóstico Clínico</h2>
  <ol>
    <li><strong>Análisis de sangre (Perfil hepático):</strong> Permite evaluar las enzimas hepáticas (transaminasas AST/TGO, ALT/TGP, GGT, fosfatasa alcalina y bilirrubinas), además de glucosa y perfil lipídico.</li>
    <li><strong>Ecografía abdominal:</strong> Estudio de imagen no invasivo de primera línea que detecta el aumento de ecogenicidad ("hígado brillante") por infiltración grasa.</li>
    <li><strong>Pruebas especializadas para medir fibrosis:</strong> Como la elastografía de transición (FibroScan), que mide la rigidez del tejido hepático sin dolor.</li>
    <li><strong>Biopsia hepática:</strong> Análisis microscópico de una pequeña muestra de tejido para confirmar el grado exacto de inflamación celular y fibrosis en casos complejos.</li>
  </ol>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "warning",
      "title": "El Peligro Silencioso de la Fructosa Industrial y las Harinas Refinadas",
      "message": "No es necesario tomar alcohol para desarrollar hígado graso: el exceso de bebidas azucaradas, jugos procesados, panadería blanca y frituras es transformado directamente por el hígado en triglicéridos (lipogénesis de novo), superando el umbral del 5% de grasa intracelular."
    }
  }$json$::jsonb
where id = '41fd00a2-7d61-4e98-ab13-a7e68aef8f91';


-- LECCIÓN 2.2: Las 4 Etapas y Comparativa Histológica Celular
update public.academy_lessons
set
  title = 'Las 4 Etapas Evolutivas del Hígado y Comparativa Histológica Celular',
  description = 'Infografía histológica comparativa desde el hígado sano hasta la cirrosis irreversible: cambios en el hepatocito, núcleo desplazado, tejido cicatricial, síntomas y complicaciones.',
  thumbnail_url = 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 40,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1000&q=80" alt="Comparativa Histológica y Celular del Hígado" />

  <h2>1. Infografía Histológica y Celular: Del Hígado Sano a la Cirrosis</h2>
  <p>A continuación se detalla la progresión macroscópica (superficie del órgano) y microscópica (estructura celular del hepatocito) a través de los 5 estados clínicos documentados en el Manual Académico SUMAK:</p>

  <div class="space-y-4 my-6">
    <!-- 0. Hígado Sano -->
    <div class="p-5 rounded-2xl bg-[#EBF5EE] border-2 border-emerald-400 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-[#1A4E26] text-white px-3 py-1 rounded-full">0. Hígado Sano (Healthy Liver)</span>
        <span class="text-xs font-bold bg-emerald-200 text-emerald-950 px-3 py-1 rounded-full">ESTADO ÓPTIMO FISIOLÓGICO</span>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mt-2 text-sm text-[#12361B]">
        <div><strong>Vista Macroscópica:</strong> Superficie externa completamente lisa, brillante y de color marrón rojizo uniforme.</div>
        <div><strong>Histología Celular:</strong> <strong>Hepatocitos sanos (Healthy hepatocytes)</strong> bien alineados, citoplasma limpio sin vacuolas lipídicas y <strong>núcleo redondo en posición central normal</strong>.</div>
      </div>
    </div>

    <!-- Etapa 1: Esteatosis -->
    <div class="p-5 rounded-2xl bg-[#FEF6E9] border-2 border-amber-300 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-amber-600 text-white px-3 py-1 rounded-full">Etapa 1: Esteatosis Hepática (Hígado Graso Simple)</span>
        <span class="text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full">✓ 100% REVERSIBLE</span>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mt-2 text-sm text-[#5B3407]">
        <div><strong>Vista Macroscópica:</strong> Hígado aumentado de tamaño (hepatomegalia) y de tonalidad amarillenta por acúmulo de lípidos (>5%).</div>
        <div><strong>Histología Celular:</strong> <strong>Hepatocito hinchado (<em>Bloated hepatocyte</em>)</strong> lleno de pequeñas y grandes gotas de grasa intracelular (<em>Small and large fat droplets</em>). <strong>Se revierte por completo</strong> con dieta saludable, ejercicio y control de peso.</div>
      </div>
    </div>

    <!-- Etapa 2: Esteatohepatitis -->
    <div class="p-5 rounded-2xl bg-orange-50 border-2 border-orange-300 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-orange-600 text-white px-3 py-1 rounded-full">Etapa 2: Esteatohepatitis (MASH / NASH)</span>
        <span class="text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full">⚠ REVERSIBLE CON CONTROL OPORTUNO</span>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mt-2 text-sm text-orange-950">
        <div><strong>Fisiopatología:</strong> A la acumulación de grasa se suma <strong>inflamación activa y daño directo de las células hepáticas</strong>.</div>
        <div><strong>Histología Celular:</strong> Macrogota de grasa que empuja al <strong>núcleo desplazado hacia la periferia (<em>Displaced nucleus</em>)</strong>, presencia de <strong>hepatocitos inflamados muriendo (<em>Inflamed dying hepatocyte</em>)</strong> y aparición de las primeras fibras de cicatriz (fibrosis inicial).</div>
      </div>
    </div>

    <!-- Etapa 3: Fibrosis -->
    <div class="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-rose-600 text-white px-3 py-1 rounded-full">Etapa 3: Fibrosis Hepática</span>
        <span class="text-xs font-black bg-rose-200 text-rose-950 px-3 py-1 rounded-full">⚠ PUEDE ESTABILIZARSE Y MEJORAR A TIEMPO</span>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mt-2 text-sm text-rose-950">
        <div><strong>Fisiopatología:</strong> La inflamación persistente provoca la acumulación de <strong>tejido conectivo cicatricial blanco (<em>Scar tissue</em>)</strong> que reemplaza progresivamente al tejido sano.</div>
        <div><strong>Evolución Clínica:</strong> El tejido fibroso endurece el órgano y dificulta el flujo sanguíneo. Si se elimina la causa a tiempo, la fibrosis puede detenerse, estabilizarse e incluso regresar parcialmente.</div>
      </div>
    </div>

    <!-- Etapa 4: Cirrosis -->
    <div class="p-5 rounded-2xl bg-rose-950 text-white border-2 border-rose-700 shadow-md">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-[#D4AF37] text-[#0B2913] px-3 py-1 rounded-full">Etapa 4: Cirrosis Hepática</span>
        <span class="text-xs font-black bg-red-600 text-white px-3 py-1 rounded-full">⛔ DAÑO ESTRUCTURAL IRREVERSIBLE</span>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mt-2 text-sm text-rose-100">
        <div><strong>Vista Macroscópica:</strong> Hígado encogido, endurecido, con <strong>superficie abultada y nodular (<em>Bumpy, nodular surface</em>)</strong> deformada por bandas gruesas de cicatriz.</div>
        <div><strong>Histología Celular:</strong> Nódulos de regeneración atrapados en tejido fibroso denso y abundantes <strong>restos de células muertas (<em>Dead cell debris</em>)</strong>.</div>
      </div>
    </div>
  </div>

  <h2>2. Causas, Síntomas y Complicaciones de la Cirrosis Hepática</h2>
  <p><strong>Causas principales de Cirrosis:</strong> 1) Hígado graso avanzado no controlado, 2) Consumo crónico de alcohol, 3) Infección crónica por virus de <strong>Hepatitis B o Hepatitis C</strong>, y 4) Enfermedades hepáticas hereditarias, metabólicas o autoinmunes.</p>

  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <h4 class="font-black text-slate-900 m-0">Síntomas de la Cirrosis</h4>
      <ul class="text-sm text-slate-700 mt-2 mb-0 space-y-1">
        <li>Cansancio y debilidad severa.</li>
        <li>Pérdida de apetito y pérdida de peso involuntaria.</li>
        <li><strong>Ictericia:</strong> Coloración amarilla en la piel y en la parte blanca de los ojos (esclerótica) por acumulación de bilirrubina.</li>
        <li><strong>Ascitis:</strong> Hinchazón del abdomen por acumulación anormal de líquido libre, junto con edema en piernas.</li>
        <li>Aparición fácil de <strong>hematomas (moretones) o sangrados</strong> por falta de proteínas de coagulación.</li>
        <li><strong>Confusión mental, desorientación o somnolencia (Encefalopatía hepática)</strong> por toxinas que llegan al cerebro.</li>
      </ul>
    </div>
    <div class="p-4 rounded-2xl bg-red-50/70 border border-red-200">
      <h4 class="font-black text-red-950 m-0">Complicaciones Graves</h4>
      <ul class="text-sm text-red-900 mt-2 mb-0 space-y-1">
        <li><strong>Hipertensión portal y hemorragias digestivas graves</strong> por ruptura de várices esofágicas o gástricas.</li>
        <li><strong>Infecciones graves</strong> (como peritonitis bacteriana espontánea).</li>
        <li><strong>Insuficiencia hepática</strong> y síndrome hepatorrenal.</li>
        <li>Alto riesgo de desarrollar <strong>cáncer de hígado (carcinoma hepatocelular)</strong>.</li>
      </ul>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "toxicity",
      "title": "Ventana Terapéutica: Actuar en las Etapas 1 y 2 Salva la Vida del Hígado",
      "message": "Mientras el hígado se encuentra en Etapa 1 (Esteatosis) o Etapa 2 (Esteatohepatitis), el hepatocito conserva su capacidad de regeneración. Una vez instalada la Etapa 4 (Cirrosis con superficie nodular), las cicatrices son irreversibles y el objetivo médico pasa a ser evitar la descompensación."
    }
  }$json$::jsonb
where id = 'b359f3f3-89df-4f7c-84ea-9859efb1dadd';


-- LECCIÓN 2.3: Cáncer de Hígado, Prevención y Cuidado Hepático
update public.academy_lessons
set
  title = 'Cáncer de Hígado (Carcinoma Hepatocelular), Factores de Riesgo y las 8 Reglas de Cuidado',
  description = 'Factores de riesgo oncológico (cirrosis, Hepatitis B/C, aflatoxinas), señales de alerta, métodos diagnósticos y las 8 reglas de oro para proteger el hígado.',
  thumbnail_url = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 30,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80" alt="Prevención Oncológica y Cuidado Clínico del Hígado" />

  <h2>1. ¿Qué es el Cáncer de Hígado (Carcinoma Hepatocelular)?</h2>
  <p>El cáncer primario de hígado más frecuente es el <strong>carcinoma hepatocelular</strong>, caracterizado por el crecimiento y multiplicación descontrolada de células malignas originadas en el propio tejido hepático, generalmente sobre un hígado que ha sufrido inflamación y daño crónico durante años.</p>

  <h2>2. Factores de Riesgo y Señales de Alerta</h2>
  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">Factores de Riesgo Demostrados</h4>
      <ul class="text-sm text-[#7C4C18] mt-2 mb-0 space-y-1">
        <li><strong>Cirrosis hepática</strong> de cualquier origen.</li>
        <li>Infección crónica por virus de <strong>Hepatitis B o Hepatitis C</strong>.</li>
        <li>Consumo excesivo y prolongado de <strong>alcohol</strong>.</li>
        <li><strong>Esteatohepatitis (hígado graso inflamado)</strong> con fibrosis avanzada, obesidad y diabetes.</li>
        <li>Enfermedades metabólicas hereditarias (como hemocromatosis).</li>
        <li>Exposición a <strong>aflatoxinas</strong> (toxinas cancerígenas producidas por hongos en maíz, maní, granos o semillas almacenados en lugares húmedos).</li>
      </ul>
    </div>
    <div class="p-4 rounded-2xl bg-red-50 border border-red-200">
      <h4 class="font-black text-red-950 m-0">Señales Clínicas de Alerta</h4>
      <ul class="text-sm text-red-900 mt-2 mb-0 space-y-1">
        <li><strong>Pérdida de peso inexplicable</strong> sin estar haciendo dieta.</li>
        <li><strong>Pérdida marcada del apetito (inapetencia)</strong> y saciedad muy rápida.</li>
        <li><strong>Dolor, pesadez o masa palpable</strong> en la parte superior derecha del abdomen.</li>
        <li><strong>Ictericia</strong> (color amarillo en piel y ojos) y orina muy oscura.</li>
        <li><strong>Cansancio extremo</strong> y debilidad progresiva.</li>
      </ul>
    </div>
  </div>

  <h2>3. Métodos de Diagnóstico Oncológico</h2>
  <p>La detección y confirmación médica se realiza mediante: <strong>1) Análisis de sangre</strong> (función hepática y marcadores tumorales como la alfafetoproteína AFP), <strong>2) Ecografía abdominal</strong> (control semestral en pacientes con cirrosis), <strong>3) Tomografía computarizada (TC)</strong> trifásica, <strong>4) Resonancia magnética (RM)</strong> y <strong>5) Biopsia hepática</strong> en lesiones que requieren confirmación histológica.</p>

  <h2>4. Las 8 Reglas de Oro para Cuidar el Hígado</h2>
  <div class="grid sm:grid-cols-2 gap-3 my-4">
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>1. Alimentación natural:</strong> Priorizar frutas frescas, verduras, legumbres y granos integrales ricos en fibra y antioxidantes.</div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>2. Reducir azúcares y grasas:</strong> Disminuir al mínimo bebidas azucaradas, bollería, frituras y grasas saturadas o trans.</div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>3. Actividad física regular:</strong> Realizar ejercicio aeróbico y de fuerza para oxidar la grasa intrahepática.</div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>4. Mantener un peso saludable:</strong> Reducir entre el 7% y el 10% del peso corporal revierte la esteatosis.</div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>5. Evitar el alcohol:</strong> Eliminar el consumo de bebidas alcohólicas, especialmente si ya existe hígado graso.</div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>6. Vacunación contra Hepatitis B:</strong> Aplicarse el esquema completo de la vacuna contra el virus de la Hepatitis B.</div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>7. Pruebas de detección:</strong> Realizarse pruebas de tamizaje para Hepatitis B y C según orientación médica.</div>
    <div class="p-3.5 rounded-xl bg-[#FEF6E9] border border-amber-300"><strong>8. No automedicarse:</strong> No tomar medicamentos, analgésicos ni suplementos o hierbas concentradas sin consultar al médico.</div>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "warning",
      "title": "Prevención de Aflatoxinas en la Alimentación Diaria",
      "message": "Nunca consuma granos, maíz, maní, nueces o cereales que presenten moho, olor a humedad o mal estado de almacenamiento. Las aflatoxinas producidas por el hongo Aspergillus flavus son potentes carcinógenos hepáticos que no se destruyen completamente con la cocción normal."
    }
  }$json$::jsonb
where id = '86bcaf28-5b54-4d32-a10a-92174a2faec2';


-- LECCIÓN 2.4: Recetario Hepatoprotector y Productos SUMAK
update public.academy_lessons
set
  title = 'Recetario Hepatoprotector (Licuado de Nopal y Manzana + Bebida de Papaya) y Protocolo SUMAK',
  description = 'Tabla fitoquímica de ingredientes hepatoprotectores, las 2 recetas paso a paso (Licuado Natural para el Hígado Graso y Bebida de Papaya y Manzana) y sinergia con Té Extractos de la Vida, REGEN 24 y Vive-Oxi-100.',
  thumbnail_url = 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=1000&q=80" alt="Licuado Verde Hepatoprotector de Nopal, Apio y Manzana Verde" />

  <h2>1. ¿Por qué funciona cada ingrediente en el Licuado para el Hígado Graso?</h2>
  <p>El Dr. Luis Paredes selecciona 4 matrices vegetales sinérgicas que actúan reduciendo la absorción intestinal de grasas y azúcares simples mientras aportan antioxidantes al hepatocito:</p>

  <div class="overflow-x-auto border border-slate-200 rounded-2xl my-4">
    <table class="w-full text-left text-xs sm:text-sm">
      <thead class="bg-[#0F2E18] text-white font-bold">
        <tr>
          <th class="p-3.5">Ingrediente Funcional</th>
          <th class="p-3.5">Compuestos Clave</th>
          <th class="p-3.5">Por qué se utiliza en el Hígado Graso</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr class="bg-white">
          <td class="p-3.5 font-black text-[#1A4E26] flex items-center gap-2">
            <img src="/ingredientes/nopal.png" alt="Nopal" class="w-8 h-8 object-contain !my-0" /> Nopal (Tuna)
          </td>
          <td class="p-3.5 font-semibold">Mucílagos, fibra soluble y pectinas</td>
          <td class="p-3.5">Forma una malla viscosa en el intestino que atrapa grasas y azúcares de la dieta, reduciendo el pico de glucosa e insulina que fabrica grasa en el hígado.</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3.5 font-black text-[#1A4E26] flex items-center gap-2">
            <img src="/ingredientes/manzana-verde.png" alt="Manzana Verde" class="w-8 h-8 object-contain !my-0" /> Manzana Verde (con cáscara)
          </td>
          <td class="p-3.5 font-semibold">Pectina, ácido málico y quercetina</td>
          <td class="p-3.5">Favorece la eliminación fecal de ácidos biliares y colesterol, nutre la microbiota intestinal y aporta antioxidantes sin exceso de azúcar.</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3.5 font-black text-[#1A4E26] flex items-center gap-2">
            <img src="/ingredientes/apio.png" alt="Apio" class="w-8 h-8 object-contain !my-0" /> Apio y Perejil Fresco
          </td>
          <td class="p-3.5 font-semibold">Apigenina, luteolina, ftálidos y folato</td>
          <td class="p-3.5">Aportan fitonutrientes antiinflamatorios, agua biológica y potasio que apoyan la depuración hidrosalina y disminuyen el estrés oxidativo hepático.</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3.5 font-black text-[#1A4E26]">Canela en polvo o rama</td>
          <td class="p-3.5 font-semibold">Cinamaldehído y polifenoles</td>
          <td class="p-3.5">Mejora la sensibilidad celular a la insulina y armoniza el perfil metabólico de los carbohidratos.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>2. Protocolo Hepatoprotector SUMAK Asociado</h2>
  <p>Junto a la corrección alimentaria y los licuados funcionales, el protocolo clínico integra: <strong>1) Té Extractos de la Vida</strong> (por su Diente de León, Moringa, Pectina de Manzana y Resveratrol), <strong>2) REGEN 24</strong> (para descongestionar el eje intestino-hígado con Tamarindo, Alcachofa/Ortiga y 6 minerales) y <strong>3) Vive-Oxi-100</strong> (para mejorar la oxigenación mitocondrial del tejido hepático).</p>
</div>
$html$,
  metadata = $json${
    "recipe_cards": [
      {
        "title": "Receta 1: Licuado Natural para el Hígado Graso (Depura, Desinflama y Regenera)",
        "image_url": "https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80",
        "prep_time": "5 minutos",
        "servings": "1 porción (1 vaso de 250-300 ml)",
        "benefits": ["Depura lípidos", "Desinflama el hepatocito", "Conserva 100% la fibra sin colar"],
        "posology": "Tomar 1 vaso junto con el desayuno, de 3 a 5 días por semana. REGLA ESTRICTA: Consumir SIN COLAR y SIN añadir azúcar, miel ni panela.",
        "ingredients": [
          {"name": "Apio fresco", "dose": "1 rama", "notes": "Tallo y hojas limpias", "image_url": "/ingredientes/apio.png"},
          {"name": "Perejil fresco", "dose": "1 puñado pequeño", "notes": "Dosis culinaria segura", "image_url": "/ingredientes/perejil.png"},
          {"name": "Manzana verde con cáscara", "dose": "1/2 unidad", "notes": "Sin semillas", "image_url": "/ingredientes/manzana-verde.png"},
          {"name": "Nopal (Tuna) limpio sin espinas", "dose": "1/2 penca pequeña", "notes": "Rico en mucílagos", "image_url": "/ingredientes/nopal.png"},
          {"name": "Canela en polvo (o 1 trocito en rama)", "dose": "1/2 cucharadita", "notes": "Preferir Ceilán"},
          {"name": "Agua potable y gotas de limón (opcional)", "dose": "250 a 300 ml", "notes": "Base líquida", "image_url": "/ingredientes/limon.png"}
        ],
        "steps": [
          "Lavar y desinfectar minuciosamente la rama de apio, el puñado pequeño de perejil, la media manzana verde y la media penca de nopal.",
          "Cortar la media manzana verde en trozos conservando su cáscara (retirar únicamente el corazón y las semillas).",
          "Picar la media penca de nopal y la rama de apio en trozos pequeños para facilitar el licuado.",
          "Colocar el apio, el perejil, la manzana verde y el nopal en la licuadora junto con los 250-300 ml de agua potable.",
          "Agregar la 1/2 cucharadita de canela en polvo y unas gotas de jugo de limón opcionales; licuar a alta velocidad hasta obtener una mezcla homogénea.",
          "Servir y beber de inmediato SIN COLAR para aprovechar toda la fibra soluble e insoluble, y sin ningún tipo de endulzante."
        ]
      },
      {
        "title": "Receta 2: Bebida Natural Digestiva y Hepática de Papaya y Manzana",
        "image_url": "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80",
        "prep_time": "5 minutos",
        "servings": "1 vaso",
        "benefits": ["Aporta papaína digestiva", "Suave con el estómago e hígado", "Sin azúcar añadida"],
        "posology": "Tomar recién preparado en la mañana como desayuno ligero o media mañana, sin colar y sin azúcar.",
        "ingredients": [
          {"name": "Papaya madura picada", "dose": "1 taza", "notes": "Enzima papaína", "image_url": "/ingredientes/papaya.png"},
          {"name": "Manzana bien lavada", "dose": "1/2 unidad", "notes": "Con cáscara y sin semillas", "image_url": "/ingredientes/manzana-verde.png"},
          {"name": "Agua potable", "dose": "1 vaso (250 ml)", "notes": "Sin azúcar"}
        ],
        "steps": [
          "Lavar perfectamente la manzana, retirar las semillas y cortarla en cubos.",
          "Pelar y picar 1 taza de papaya madura fresca.",
          "Colocar la papaya, la media manzana y el vaso de agua potable en la licuadora.",
          "Licuar hasta conseguir una textura cremosa y servir inmediatamente sin colar y sin añadir azúcar."
        ]
      }
    ]
  }$json$::jsonb
where id = 'c6cc4eff-9aa8-4547-a669-70fa42e98ca8';


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. MÓDULO 5 DEL MANUAL: GASTRITIS, ÚLCERAS, H. PYLORI, COLITIS Y HEMORROIDES
--    Curso: gastroenterologia-funcional-gastritis-colitis-sumak
-- ─────────────────────────────────────────────────────────────────────────────

-- LECCIÓN 3.1: Gastritis y Úlceras Pépticas
update public.academy_lessons
set
  title = 'Gastritis y Úlceras Pépticas: Las 7 Causas, 6 Síntomas, Remedios Naturales y Signos de Alarma',
  description = 'Fisiopatología de la mucosa gástrica, las 7 causas y 6 síntomas de la gastritis, 8 recomendaciones de prevención, 5 alimentos y 5 remedios naturales, y diferencia entre úlcera gástrica y duodenal.',
  thumbnail_url = 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1000&q=80" alt="Mucosa Gástrica y Nutrición Protectora Demulcente" />

  <h2>1. ¿Qué es la Gastritis y por qué se produce?</h2>
  <p>La <strong>gastritis</strong> es la inflamación del revestimiento interno del estómago (<strong>mucosa gástrica</strong>). Normalmente el estómago posee una barrera de moco y bicarbonato que lo protege de sus propios ácidos digestivos; cuando esta capa protectora se debilita o daña, los jugos ácidos entran en contacto directo con la pared estomacal provocando irritación, ardor e inflamación.</p>

  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">Las 7 Causas de la Gastritis</h4>
      <ol class="text-sm text-[#7C4C18] mt-2 mb-0 space-y-1">
        <li><strong>Mala alimentación</strong> y saltar horarios de comida (ayunos prolongados).</li>
        <li>Consumo excesivo de <strong>alimentos muy picantes, ácidos, frituras y grasas</strong>.</li>
        <li><strong>Estrés crónico y ansiedad</strong> sostenida.</li>
        <li>Consumo de <strong>alcohol</strong>.</li>
        <li>Hábito de <strong>fumar (tabaco)</strong>.</li>
        <li>Uso frecuente o prolongado de analgésicos antiinflamatorios (<strong>AINEs como ibuprofeno, naproxeno o aspirina</strong>).</li>
        <li>Infección por la bacteria <strong><em>Helicobacter pylori</em></strong>.</li>
      </ol>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">Los 6 Síntomas Clásicos</h4>
      <ol class="text-sm text-[#2C526A] mt-2 mb-0 space-y-1">
        <li><strong>Ardor o dolor punzante</strong> en la parte superior del abdomen ("boca del estómago" / epigastrio).</li>
        <li><strong>Náuseas o vómitos</strong> ocasionales.</li>
        <li><strong>Inflamación o distensión</strong> estomacal.</li>
        <li><strong>Acidez o reflujo</strong> hacia el pecho o la garganta.</li>
        <li><strong>Pérdida de apetito (inapetencia)</strong>.</li>
        <li><strong>Sensación de llenura rápida</strong> después de ingerir poca comida.</li>
      </ol>
    </div>
  </div>

  <h2>2. Las 8 Recomendaciones de Prevención + 5 Alimentos + 5 Remedios Naturales</h2>
  <p><strong>8 Recomendaciones de Prevención:</strong> 1) Comer en horarios fijos y regulares, 2) Masticar despacio cada bocado, 3) Realizar comidas pequeñas y moderadas, 4) Evitar café cargado, picantes, gaseosas y frituras, 5) No acostarse inmediatamente después de comer (esperar 2 a 3 horas), 6) No automedicarse con analgésicos irritantes, 7) Gestionar el estrés diario y descansar bien, 8) Lavar y desinfectar bien el agua y los alimentos.</p>

  <p><strong>Los 5 Alimentos Recomendados para Reparar el Estómago:</strong> <strong>1) Avena</strong> (rica en mucílagos protectores), <strong>2) Banano maduro</strong> (suavizante alcalino natural), <strong>3) Papaya</strong> (aporta papaína digestiva), <strong>4) Yogur natural</strong> (bajo en azúcar, aporta probióticos) y <strong>5) Verduras cocidas al vapor</strong> (zanahoria, zapallo, calabacín).</p>

  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <div class="flex items-center gap-2 font-black text-[#12361B]"><img src="/ingredientes/manzanilla.png" alt="Manzanilla" class="w-6 h-6 object-contain !my-0" /> 1. Té de manzanilla</div>
      <p class="text-xs text-[#2D5A37] mt-1 mb-0">Desinflama la mucosa gástrica, calma el dolor y alivia los espasmos del estómago.</p>
    </div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <div class="flex items-center gap-2 font-black text-[#12361B]"><img src="/ingredientes/aloe-vera.png" alt="Sábila" class="w-6 h-6 object-contain !my-0" /> 2. Jugo de sábila</div>
      <p class="text-xs text-[#2D5A37] mt-1 mb-0">Usando solo el gel transparente: recubre, refresca y acelera la cicatrización del epitelio gástrico.</p>
    </div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <div class="flex items-center gap-2 font-black text-[#12361B]"><img src="/ingredientes/avena.png" alt="Avena" class="w-6 h-6 object-contain !my-0" /> 3. Agua de avena</div>
      <p class="text-xs text-[#2D5A37] mt-1 mb-0">Sus betaglucanos forman una película protectora que neutraliza la irritación por ácido.</p>
    </div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <div class="flex items-center gap-2 font-black text-[#12361B]"><img src="/ingredientes/jengibre.png" alt="Jengibre" class="w-6 h-6 object-contain !my-0" /> 4. Té de jengibre suave</div>
      <p class="text-xs text-[#2D5A37] mt-1 mb-0">En dosis moderadas reduce las náuseas, combate la inflamación y mejora el vaciamiento gástrico.</p>
    </div>
    <div class="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB] sm:col-span-2 lg:col-span-2">
      <div class="flex items-center gap-2 font-black text-[#12361B]"><img src="/ingredientes/papaya.png" alt="Papaya" class="w-6 h-6 object-contain !my-0" /> 5. Papaya madura</div>
      <p class="text-xs text-[#2D5A37] mt-1 mb-0">Rica en la enzima papaína: facilita la digestión de las proteínas y refresca el estómago irritado sin causar acidez.</p>
    </div>
  </div>

  <h2>3. Úlceras Pépticas: Úlcera Gástrica vs. Úlcera Duodenal</h2>
  <p>Cuando la inflamación y el ácido erosionan profundamente la mucosa hasta crear una <strong>herida o llaga abierta</strong>, se forma una <strong>úlcera péptica</strong>. Según su ubicación anatómica se clasifican en:</p>
  <ul>
    <li><strong>Úlcera Gástrica:</strong> Se localiza en el interior del <strong>estómago</strong>; el dolor suele empeorar poco después de comer cuando el alimento estimula la secreción ácida sobre la herida.</li>
    <li><strong>Úlcera Duodenal:</strong> Se localiza en el <strong>duodeno</strong> (la primera parte del intestino delgado justo a la salida del estómago); suele doler con el estómago vacío o de madrugada.</li>
  </ul>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "contraindication",
      "title": "Signos de Alarma Urgente en Gastritis y Úlceras Pépticas",
      "message": "Acuda a un servicio de urgencias médicas de inmediato si presenta: 1) Vómito con sangre roja o con aspecto oscuro de 'posos de café' (hematemesis), 2) Heces negras, brillantes y de olor fétido (melenas, signo de sangrado digestivo alto), 3) Mareos intensos, palidez o desmayo, o 4) Dolor abdominal súbito, agudo e insoportable."
    }
  }$json$::jsonb
where id = 'b7425296-d7b3-4c6b-a8a6-3effc945d828';


-- LECCIÓN 3.2: Protocolo Clínico de Helicobacter pylori
update public.academy_lessons
set
  title = 'Protocolo Clínico de Helicobacter Pylori: Transmisión, Diagnóstico y Erradicación',
  description = 'Mecanismo de daño mucosal de H. pylori, relación con úlceras, cáncer gástrico y linfoma MALT, las 3 vías de transmisión, los 3 métodos diagnósticos y tratamiento erradicador.',
  thumbnail_url = 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 30,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1000&q=80" alt="Diagnóstico Microbiológico y Erradicación de Helicobacter pylori" />

  <h2>1. ¿Cómo daña <em>Helicobacter pylori</em> al Estómago?</h2>
  <p><em>Helicobacter pylori</em> es una bacteria con forma de espiral que coloniza la capa de moco del estómago. Gracias a que produce la enzima <strong>ureasa</strong>, transforma la urea en amoníaco para neutralizar el ácido a su alrededor y poder sobrevivir. Este proceso destruye el moco protector, inflama crónicamente las células y expone la pared gástrica al ácido.</p>
  <p><strong>Relación con enfermedades graves:</strong> Si no se diagnostica y erradica a tiempo, la infección crónica por <em>H. pylori</em> es la causa principal de <strong>gastritis crónica activa, úlceras gástricas y duodenales</strong>, y es un factor de riesgo directo para el desarrollo de <strong>cáncer gástrico (adenocarcinoma) y linfoma gástrico tipo MALT</strong>.</p>

  <h2>2. Las 3 Vías de Transmisión y los 3 Métodos Diagnósticos</h2>
  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">Las 3 Vías de Transmisión</h4>
      <ol class="text-sm text-[#7C4C18] mt-2 mb-0 space-y-1.5">
        <li><strong>Saliva o vómito (Vía oral-oral):</strong> Contacto directo por compartir cubiertos, vasos o utensilios contaminados.</li>
        <li><strong>Agua o alimentos contaminados (Vía fecal-oral):</strong> Consumir agua sin hervir/filtrar o verduras y frutas crudas mal lavadas.</li>
        <li><strong>Higiene deficiente:</strong> Falta de lavado de manos con agua y jabón después de ir al baño o antes de cocinar y comer.</li>
      </ol>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">Los 3 Métodos Diagnósticos Clínicos</h4>
      <ol class="text-sm text-[#2C526A] mt-2 mb-0 space-y-1.5">
        <li><strong>Prueba de aliento con urea:</strong> Método rápido, indoloro y de altísima precisión para detectar infección activa y confirmar su curación.</li>
        <li><strong>Prueba de antígeno en heces:</strong> Análisis de laboratorio que detecta proteínas específicas de la bacteria en una muestra fecal.</li>
        <li><strong>Endoscopia digestiva con biopsia:</strong> Permite observar directamente las lesiones de la mucosa y tomar muestras para estudio histológico.</li>
      </ol>
    </div>
  </div>

  <h2>3. Tratamiento Médico de Erradicación + Apoyo Complementario</h2>
  <ul>
    <li><strong>Esquema médico obligatorio:</strong> Requiere una combinación prescrita por el médico de <strong>antibióticos específicos (2 o 3 combinados) + un inhibidor de la secreción de ácido (IBP) + sales de bismuto</strong> durante 10 a 14 días.</li>
    <li><strong>Completar el tratamiento y confirmar la erradicación:</strong> Es indispensable tomar todas las dosis hasta el último día y realizar una <strong>prueba de confirmación (aliento o antígeno fecal)</strong> semanas después para verificar que la bacteria fue eliminada al 100%.</li>
    <li><strong>Apoyo natural complementario:</strong> Durante y después del tratamiento, acompañar con alimentos protectores de la mucosa (agua de avena, gel de sábila purificado, brócoli al vapor rico en sulforafano), probióticos y fórmulas regeneradoras como <strong>REGEN 24 y Té Extractos de la Vida</strong>.</li>
  </ul>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "warning",
      "title": "Regla Clínica en Helicobacter pylori: Confirmar siempre la Erradicación",
      "message": "Ningún remedio casero por sí solo erradica al 100% a Helicobacter pylori cuando ya existe úlcera o gastritis atrófica. Cumpla el esquema médico completo, cuide la higiene familiar del agua y los utensilios para evitar la reinfección, y utilice la fitoterapia SUMAK para regenerar la mucosa dañada."
    }
  }$json$::jsonb
where id = '4b33ceae-d7bd-4824-8e5e-837c8fab3ab5';


-- LECCIÓN 3.3: Colitis y Enfermedad Hemorroidal
update public.academy_lessons
set
  title = 'Colitis (Los 4 Tipos Clínicos) vs. Colon Irritable y Enfermedad Hemorroidal',
  description = 'Diferencia entre colitis inflamatoria y síndrome de intestino irritable, los 4 tipos de colitis (infecciosa, ulcerosa, microscópica e isquémica) y los 3 tipos de hemorroides.',
  thumbnail_url = 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1000&q=80" alt="Salud del Colon, Colitis y Prevención Hemorroidal" />

  <h2>1. Colitis vs. Síndrome de Intestino Irritable (Colon Irritable)</h2>
  <p><strong>Diferencia clínica fundamental:</strong> En la <strong>Colitis</strong> existe una <strong>inflamación real, física y demostrable</strong> del revestimiento interno del intestino grueso (colon), que puede causar úlceras o sangrado. En cambio, en el <strong>Síndrome de Intestino Irritable (SII)</strong> existe un trastorno funcional de la sensibilidad y los movimientos del colon (estreñimiento, diarrea o gases), pero <strong>sin inflamación estructural ni lesiones en la mucosa</strong>.</p>
  <p><strong>5 Causas de Colitis:</strong> 1) Infecciones por bacterias, virus o parásitos, 2) Enfermedades inflamatorias intestinales autoinmunes, 3) Disminución del riego sanguíneo al colon, 4) Reacciones a medicamentos o intolerancias alimentarias, 5) Estrés severo que desregula la barrera intestinal.</p>
  <p><strong>5 Síntomas de Colitis:</strong> 1) Cólicos y dolor abdominal, 2) Diarrea recurrente, 3) Distensión abdominal e hinchazón por gases, 4) Presencia de <strong>moco o sangre en las heces</strong>, 5) <strong>Tenesmo rectal</strong> (urgencia y sensación de no haber terminado de evacuar).</p>

  <h2>2. Los 4 Tipos Clínicos de Colitis</h2>
  <div class="grid sm:grid-cols-2 gap-3.5 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <h4 class="font-black text-[#12361B] m-0">1. Colitis Infecciosa</h4>
      <p class="text-sm text-[#2D5A37] mt-1 mb-0">Causada por la ingesta de agua o alimentos contaminados con bacterias (<em>Salmonella, E. coli, Shigella</em>) o parásitos (<em>Entamoeba histolytica</em>).</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">2. Colitis Ulcerosa</h4>
      <p class="text-sm text-[#7C4C18] mt-1 mb-0">Enfermedad inflamatoria intestinal crónica de origen inmunológico que produce inflamación continua y úlceras sangrantes en la mucosa del colon y recto.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">3. Colitis Microscópica</h4>
      <p class="text-sm text-[#2C526A] mt-1 mb-0">Produce diarrea acuosa crónica; a simple vista el colon parece normal en la colonoscopia y <strong>solo se identifica mediante biopsia al microscopio</strong>.</p>
    </div>
    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200">
      <h4 class="font-black text-rose-950 m-0">4. Colitis Isquémica</h4>
      <p class="text-sm text-rose-900 mt-1 mb-0">Ocurre cuando hay una <strong>disminución repentina o crónica del flujo sanguíneo</strong> en las arterias que irrigan el colon, provocando dolor abdominal y sangrado.</p>
    </div>
  </div>

  <h2>3. Enfermedad Hemorroidal (Hemorroides): Causas, Síntomas y los 3 Tipos</h2>
  <p>Las <strong>hemorroides</strong> son cojinetes vasculares (venas y arteriolas) normales del canal anal que, al someterse a alta presión venosa, se dilatan, inflaman y desplazan hacia afuera.</p>
  <p><strong>Las 6 Causas de Hemorroides:</strong> 1) Estreñimiento crónico con heces duras, 2) Pujar con fuerza excesiva al evacuar, 3) Permanecer sentado durante mucho tiempo en el inodoro (por ejemplo, usando el celular), 4) Embarazo (por presión del útero sobre las venas pélvicas), 5) Dieta baja en fibra e insuficiente consumo de agua, 6) Sobrepeso y sedentarismo.</p>
  <p><strong>Los 5 Síntomas:</strong> 1) Sangrado rojo brillante al final de la evacuación, 2) Picazón o irritación anal (prurito), 3) Dolor o molestia intensa al sentarse, 4) Bultos sensibles o inflamados en el borde del ano, 5) Sensación de presión o pesadez anal.</p>
  <ul>
    <li><strong>1. Hemorroides Internas:</strong> Se ubican dentro del recto; generalmente no duelen pero sangran con facilidad y pueden salir (prolapsar) al pujar.</li>
    <li><strong>2. Hemorroides Externas:</strong> Se sitúan debajo de la piel que rodea el ano; pican, arden y duelen cuando se irritan.</li>
    <li><strong>3. Hemorroides Trombosadas:</strong> Ocurren cuando la sangre se coagula (forma un trombo) dentro de una hemorroide externa, generando un bulto duro, violáceo y sumamente doloroso.</li>
  </ul>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "info",
      "title": "El Secreto para Curar las Hemorroides está en la Textura de la Evacuación",
      "message": "Ninguna crema local resolverá las hemorroides si el paciente sigue estreñido y pujando. La clave clínica es lograr una evacuación suave, hidratada y sin esfuerzo mediante fibra soluble con mucílagos (linaza, chía, avena, Fibramak Plus y Colon Renova) acompañada de 2 litros de agua al día."
    }
  }$json$::jsonb
where id = 'b34a97de-eaaf-4f8b-bdac-f2f547f2f849';


-- LECCIÓN 3.4a: Guía Clínica Especial: Ajo, Sábila y Manzana Verde + Matriz 5x3
update public.academy_lessons
set
  title = 'Guía Clínica Especial del Dr. Luis Paredes: Ajo, Sábila y Manzana Verde + Matriz por Enfermedad',
  description = 'Análisis individual de componentes y precauciones del Ajo, la Sábila (gel vs látex amarillo/aloína) y la Manzana Verde (pectina vs FODMAP), por qué NO licuarlos juntos en ayunas y la Tabla Rápida de 5 enfermedades.',
  thumbnail_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80" alt="Guía Clínica de Tolerancia: Ajo, Sábila y Manzana Verde" />

  <h2>1. Análisis Clínico Individual: Ajo, Sábila y Manzana Verde</h2>
  <p>En redes sociales circula el mito de licuar ajo crudo, sábila y manzana verde juntos en ayunas para "curar todo el estómago y el colon". El <strong>Dr. Luis Paredes</strong> explica la ciencia real detrás de cada ingrediente y cómo usarlos sin dañar la mucosa:</p>

  <div class="grid sm:grid-cols-3 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <div class="flex items-center gap-2 mb-2">
        <img src="/ingredientes/ajo.png" alt="Ajo" class="w-10 h-10 object-contain bg-white rounded-xl p-1 border border-amber-200 !my-0" />
        <h4 class="font-black text-[#5B3407] m-0">1. Ajo</h4>
      </div>
      <p class="text-xs text-[#7C4C18] m-0"><strong>Componente:</strong> Alicina y compuestos azufrados.<br/><strong>Modo correcto:</strong> Consumir <strong>cocinado</strong> en las comidas.<br/><strong>Precaución:</strong> Crudo y en exceso en ayunas quema e irrita la mucosa con gastritis o úlceras, da reflujo y aumenta el riesgo de sangrado con <strong>anticoagulantes</strong>.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <div class="flex items-center gap-2 mb-2">
        <img src="/ingredientes/aloe-vera.png" alt="Sábila" class="w-10 h-10 object-contain bg-white rounded-xl p-1 border border-emerald-200 !my-0" />
        <h4 class="font-black text-[#12361B] m-0">2. Sábila (Aloe)</h4>
      </div>
      <p class="text-xs text-[#2D5A37] m-0"><strong>Componente:</strong> Acemanano (gel) vs. <strong>Aloína</strong> (látex amarillo).<br/><strong>Modo correcto:</strong> Usar <strong>SOLO el gel transparente</strong> muy bien lavado.<br/><strong>Precaución:</strong> La cáscara y el látex amarillo causan cólicos severos, diarrea intensa, desequilibrio electrolítico y riesgo de daño renal y hepático.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <div class="flex items-center gap-2 mb-2">
        <img src="/ingredientes/manzana-verde.png" alt="Manzana Verde" class="w-10 h-10 object-contain bg-white rounded-xl p-1 border border-sky-200 !my-0" />
        <h4 class="font-black text-[#102D3E] m-0">3. Manzana Verde</h4>
      </div>
      <p class="text-xs text-[#2C526A] m-0"><strong>Componente:</strong> Pectina (fibra soluble), fructosa y sorbitol.<br/><strong>Modo correcto:</strong> Cocida o en compota si hay gastritis/colitis.<br/><strong>Precaución:</strong> Por su fructosa y sorbitol (<strong>FODMAP</strong>), cruda puede fermentar y causar gases y distensión en colon irritable.</p>
    </div>
  </div>

  <h2>2. Matriz Clínica Completa: Guía Rápida según la Enfermedad (5 Patologías x 3 Ingredientes)</h2>
  <div class="overflow-x-auto border border-slate-200 rounded-2xl my-4">
    <table class="w-full text-left text-xs sm:text-sm">
      <thead class="bg-[#0F2E18] text-white font-bold">
        <tr>
          <th class="p-3.5">Enfermedad Digestiva</th>
          <th class="p-3.5">🧄 Ajo</th>
          <th class="p-3.5">🌿 Sábila (Gel transparente)</th>
          <th class="p-3.5">🍏 Manzana Verde</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr class="bg-white">
          <td class="p-3.5 font-black text-[#111111]">1. Colitis</td>
          <td class="p-3.5 text-red-800 font-medium">⛔ Evitar crudo; fermenta, produce gases e irrita el colon inflamado (usar solo muy poco y bien cocido si se tolera).</td>
          <td class="p-3.5 text-amber-900 font-medium">⚠️ Solo gel transparente puro en poca cantidad; jamás usar el látex amarillo (aloína) porque agrava la diarrea y los cólicos.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ Preferir <strong>cocida o en compota sin cáscara</strong> para aportar pectina suave sin provocar fermentación ni gases.</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3.5 font-black text-[#111111]">2. Helicobacter pylori</td>
          <td class="p-3.5 text-amber-900 font-medium">⚠️ Cocido en las comidas como apoyo culinario; crudo en ayunas irrita la mucosa ya lesionada y <strong>no sustituye los antibióticos</strong>.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ El cristal transparente bien lavado ayuda como coadyuvante para refrescar y proteger la mucosa durante el tratamiento médico.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ Bien lavada (mejor cocida si hay ardor) aporta pectina prebiótica que apoya la flora intestinal durante el uso de antibióticos.</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3.5 font-black text-[#111111]">3. Gastritis</td>
          <td class="p-3.5 text-red-800 font-medium">⛔ Prohibido tomar ajo crudo picado o licuado en ayunas; provoca ardor intenso, acidez y empeora la inflamación gástrica.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ Excelente aliado usando <strong>exclusivamente el gel transparente</strong> sin rastro de acíbar amarillo para recubrir el estómago.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ Consumir madura, cocida o al vapor; evitar manzanas muy ácidas o verdes crudas en plena crisis de ardor estomacal.</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3.5 font-black text-[#111111]">4. Estreñimiento</td>
          <td class="p-3.5 text-slate-700">Uso normal cocinado dentro de la dieta; no tiene efecto formador de bolo fecal.</td>
          <td class="p-3.5 text-amber-900 font-medium">⚠️ El gel transparente hidrata suavemente; <strong>no usar el látex amarillo como laxante</strong> por riesgo de dependencia y pérdida de potasio.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ Muy beneficiosa <strong>con cáscara</strong> (si no hay colitis activa) y acompañada de abundante agua para estimular el tránsito.</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3.5 font-black text-[#111111]">5. Hemorroides</td>
          <td class="p-3.5 text-amber-900 font-medium">⚠️ Moderado y cocinado; evitar excesos de ajo crudo o picantes que aumenten el ardor anal al evacuar.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ El gel transparente tomado suaviza la heces (y aplicado frío externamente alivia el ardor); prohibido el látex amarillo porque la diarrea irrita las hemorroides.</td>
          <td class="p-3.5 text-emerald-900 font-medium">✅ Aporta fibra soluble (pectina) que ablanda las heces y evita el esfuerzo de pujar al evacuar.</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "warning",
      "title": "¿Por qué NO licuar Ajo + Sábila + Manzana Verde juntos en ayunas como bebida universal?",
      "message": "El Dr. Luis Paredes advierte que licuar estos 3 ingredientes crudos en ayunas no 'desintoxica' el cuerpo (esa función la cumplen naturalmente el hígado y los riñones). Por el contrario, el ajo crudo irrita la gastritis, el látex de la sábila mal lavada inflama el colon y la manzana cruda fermenta en el intestino irritable. Cada ingrediente debe usarse por separado, bien preparado y según la enfermedad específica."
    }
  }$json$::jsonb
where id = 'd4d7cadc-6239-44f9-80c0-cf1a74c12669';


-- LECCIÓN 3.4b: Recetas Reparadoras (Agua de Avena, Manzanilla y Batido Digestivo) + Productos SUMAK
update public.academy_lessons
set
  title = 'Recetario Digestivo Reparador (Agua de Avena, Manzanilla y Batido de Brócoli y Piña) + Protocolo SUMAK',
  description = 'Las 3 recetas digestivas paso a paso del Manual Académico y la integración clínica de Té Extractos de la Vida, REGEN 24, Fibramak Plus y Sumak Colon Renova.',
  thumbnail_url = '/products/colon-renova.png',
  estimated_minutes = 30,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1000&q=80" alt="Recetario Digestivo Reparador SUMAK" />

  <h2>1. Protocolo Integral de Reparación Gastrointestinal SUMAK</h2>
  <p>Para lograr una recuperación digestiva completa (desinflamar la mucosa gástrica, erradicar parásitos/toxinas del colon y normalizar la evacuación sin dolor), el protocolo combina las <strong>3 recetas caseras demulcentes</strong> con las <strong>4 fórmulas especializadas de SUMAK Vida Ecuador</strong>:</p>

  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB] flex items-center gap-3.5">
      <img src="/products/te-extractos-de-la-vida-v2.png" alt="Té Extractos de la Vida" class="w-16 h-16 object-contain bg-white rounded-xl p-1 border border-emerald-200 !my-0" />
      <div>
        <h4 class="font-black text-[#12361B] m-0">1. Té Extractos de la Vida</h4>
        <p class="text-xs text-[#2D5A37] mt-1 mb-0">Aloe Vera, Pectina de Manzana, Guanábana y Moringa. <strong>30 ml 1-2 veces/día.</strong></p>
      </div>
    </div>
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200 flex items-center gap-3.5">
      <img src="/products/regen-24.png" alt="REGEN 24" class="w-16 h-16 object-contain bg-white rounded-xl p-1 border border-amber-200 !my-0" />
      <div>
        <h4 class="font-black text-[#5B3407] m-0">2. REGEN 24</h4>
        <p class="text-xs text-[#7C4C18] mt-1 mb-0">Tamarindo, Semilla de Papaya, Sábila, Piña, Uña de Gato y 6 minerales. <strong>30 ml 1-2 veces/día.</strong></p>
      </div>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200 flex items-center gap-3.5">
      <img src="/products/fibramak-plus.png" alt="Fibramak Plus" class="w-16 h-16 object-contain bg-white rounded-xl p-1 border border-sky-200 !my-0" />
      <div>
        <h4 class="font-black text-[#102D3E] m-0">3. Fibramak Plus</h4>
        <p class="text-xs text-[#2C526A] mt-1 mb-0">Probióticos vegetales, Bromelina de Piña, Avena, Chía, Cúrcuma y Sábila. <strong>2 cdas (10 g) en ayunas.</strong></p>
      </div>
    </div>
    <div class="p-4 rounded-2xl bg-[#ECF6EE] border border-emerald-200 flex items-center gap-3.5">
      <img src="/products/colon-renova.png" alt="Sumak Colon Renova" class="w-16 h-16 object-contain bg-white rounded-xl p-1 border border-emerald-200 !my-0" />
      <div>
        <h4 class="font-black text-[#0D381E] m-0">4. Sumak Colon Renova</h4>
        <p class="text-xs text-[#245834] mt-1 mb-0">15 activos herbales (Hierbabuena, Paico, Ampo, Ciruela, Linaza, Sábila). <strong>30 ml mañana y 30 ml noche.</strong></p>
      </div>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "recipe_cards": [
      {
        "title": "Receta 1: Agua de Avena Protectora de la Mucosa Gástrica",
        "image_url": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=80",
        "prep_time": "10 minutos",
        "servings": "1 vaso (250 ml)",
        "benefits": ["Recubre el estómago con betaglucanos", "Calma el ardor de la gastritis", "Regula el tránsito"],
        "posology": "Tomar 1 vaso en ayunas o 20 minutos antes del desayuno, a temperatura ambiente o tibia.",
        "ingredients": [
          {"name": "Hojuelas de avena natural", "dose": "2 cucharadas soperas", "notes": "Sin azúcar ni saborizantes", "image_url": "/ingredientes/avena.png"},
          {"name": "Agua potable", "dose": "1 vaso (250 ml)", "notes": "Tibia o al ambiente"}
        ],
        "steps": [
          "Colocar las 2 cucharadas de hojuelas de avena en un vaso con 250 ml de agua potable (o hervirlas suavemente durante 5 minutos y dejar enfriar).",
          "Dejar reposar para que la avena libere sus mucílagos y betaglucanos solubles.",
          "Licuar brevemente o remover bien y tomar en ayunas sin añadir azúcar ni leche entera."
        ]
      },
      {
        "title": "Receta 2: Té Digestivo y Antiinflamatorio de Manzanilla",
        "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
        "prep_time": "5 minutos",
        "servings": "1 taza (250 ml)",
        "benefits": ["Desinflama la mucosa", "Alivia cólicos y gases", "Relaja el espasmo gástrico"],
        "posology": "Tomar 1 taza tibia después de las comidas principales, sin azúcar.",
        "ingredients": [
          {"name": "Flores secas de manzanilla", "dose": "1 cucharada (o 1 cdta colmada)", "notes": "Matricaria chamomilla", "image_url": "/ingredientes/manzanilla.png"},
          {"name": "Agua caliente recién hervida", "dose": "1 taza (250 ml)", "notes": "No hervir la flor"}
        ],
        "steps": [
          "Calentar 1 taza de agua potable hasta que llegue al punto de ebullición y apagar el fuego.",
          "Agregar la cucharada de flores de manzanilla, tapar la taza y dejar reposar durante 5 minutos.",
          "Colar y beber tibio a sorbos pequeños."
        ]
      },
      {
        "title": "Receta 3: Batido Digestivo de Brócoli, Piña, Arándanos y Banana",
        "image_url": "https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80",
        "prep_time": "10 minutos",
        "servings": "1 vaso grande",
        "benefits": ["Aporta sulforafano y bromelina", "Antioxidante mucosal", "Fácil digestión al cocer el brócoli al vapor"],
        "posology": "Tomar recién preparado en la mañana como parte del desayuno, sin añadir azúcar.",
        "ingredients": [
          {"name": "Floretes de brócoli fresco", "dose": "1 taza pequeña", "notes": "Cocinados al vapor y fríos"},
          {"name": "Piña madura en trozos", "dose": "1 rodaja gruesa", "notes": "Aporta bromelina", "image_url": "/ingredientes/pina.png"},
          {"name": "Arándanos frescos", "dose": "1/2 taza", "notes": "Ricos en antocianinas", "image_url": "/ingredientes/arandano.png"},
          {"name": "Banana madura", "dose": "1/2 unidad", "notes": "Suavizante gástrico"},
          {"name": "Agua potable", "dose": "1 vaso (250 ml)", "notes": "Sin azúcar"}
        ],
        "steps": [
          "Paso 1: Lavar el brócoli, cocinarlo ligeramente al vapor durante 3 a 4 minutos y dejarlo enfriar por completo antes de licuar (para ablandar la fibra evitando gases).",
          "Paso 2: Reunir en el vaso de la licuadora el brócoli ya frío junto con los arándanos lavados, la piña picada, la media banana y el vaso de agua.",
          "Paso 3: Licuar a velocidad alta hasta obtener una mezcla totalmente suave y homogénea.",
          "Paso 4: Servir y tomar al momento sin colar y sin agregar azúcar ni endulzantes."
        ]
      }
    ]
  }$json$::jsonb
where id = '1a25f857-f006-4e8c-ae68-8f66b8fa6237';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. MÓDULOS 6, 7 Y 11 DEL MANUAL: VADEMÉCUM BOTÁNICO, 10 INFUSIONES Y 6 PRODUCTOS
--    Curso: vademecum-herbolaria-toxicologia-botanica-sumak
-- ─────────────────────────────────────────────────────────────────────────────

-- LECCIÓN 4.1: Plantas de Toxicidad Alta y Moderada (Mala Madre, Ruda, Noni, Sábila, Canela)
update public.academy_lessons
set
  title = 'Toxicología Botánica Crítica: Mala Madre, Ruda, Noni, Sábila (Gel vs. Aloína) y Canela',
  description = 'Por qué "natural" no significa exento de riesgo: bufadienólidos cardiotóxicos de la Mala Madre, furanocumarinas y alcaloides abortivos de la Ruda, potasio del Noni, aloína de la Sábila y cumarina de la Canela.',
  thumbnail_url = 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 40,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1000&q=80" alt="Botánica Médica y Toxicología Clínica de Plantas" />

  <h2>1. Principio Rector de la Fitoterapia Científica SUMAK</h2>
  <p>En la medicina natural responsable, <strong>toda planta medicinal contiene principios bioactivos con acción farmacológica real</strong>. Conocer qué parte de la planta usar, en qué dosis y cuáles tienen compuestos tóxicos es indispensable para proteger el corazón, el hígado y los riñones del paciente.</p>

  <h2>2. Las 5 Plantas de Mayor Vigilancia Toxicológica (Módulo 6 — Parte 1)</h2>
  <div class="space-y-4 my-4">
    <div class="p-4 rounded-2xl bg-rose-950 text-white border border-rose-700">
      <h4 class="font-black text-[#D4AF37] m-0">1. Mala Madre (<em>Kalanchoe / Bryophyllum spp.</em>) — PROHIBIDA SU INGESTA CASERA</h4>
      <p class="text-xs sm:text-sm text-rose-100 mt-1 mb-0"><strong>Compuestos:</strong> Flavonoides, ácidos fenólicos y <strong>bufadienólidos (glucósidos cardiotóxicos)</strong>.<br/><strong>Riesgo clínico:</strong> Los bufadienólidos actúan sobre el músculo cardíaco de forma similar a la digoxina, pudiendo causar arritmias graves, bloqueos cardíacos e intoxicación severa. Su uso tradicional seguro es únicamente tópico externo.</p>
    </div>

    <div class="p-4 rounded-2xl bg-rose-950 text-white border border-rose-700">
      <h4 class="font-black text-[#D4AF37] m-0">2. Ruda (<em>Ruta graveolens</em>) — PROHIBIDA SU INGESTA</h4>
      <p class="text-xs sm:text-sm text-rose-100 mt-1 mb-0"><strong>Compuestos:</strong> <strong>Furanocumarinas</strong>, alcaloides quinolínicos y aceite esencial rico en metil-nonil-cetona.<br/><strong>Riesgo clínico:</strong> Provoca intensas <strong>contracciones uterinas (efecto abortivo y hemorrágico)</strong>, toxicidad hepática y renal aguda, neurotoxicidad y <strong>fotosensibilidad grave</strong> (quemaduras al contacto con la piel y el sol).</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-300">
      <div class="flex items-center gap-2.5"><img src="/ingredientes/noni.png" alt="Noni" class="w-9 h-9 object-contain !my-0" /><h4 class="font-black text-[#5B3407] m-0">3. Noni (<em>Morinda citrifolia</em>) — Precaución en Riñón e Hígado</h4></div>
      <p class="text-xs sm:text-sm text-[#7C4C18] mt-1 mb-0"><strong>Compuestos:</strong> Iridoides (ácido deacetilasperulosídico), polifenoles y altísimo contenido de <strong>potasio</strong>.<br/><strong>Precaución:</strong> Los jugos caseros concentrados pueden causar hiperpotasemia peligrosa en enfermos renales y se han documentado casos de lesión hepática por abuso artesanal. Usar solo en fórmulas estandarizadas.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <div class="flex items-center gap-2.5"><img src="/ingredientes/aloe-vera.png" alt="Sábila" class="w-9 h-9 object-contain !my-0" /><h4 class="font-black text-[#12361B] m-0">4. Sábila (<em>Aloe vera</em>) — Gel Transparente vs. Látex Amarillo</h4></div>
      <p class="text-xs sm:text-sm text-[#2D5A37] mt-1 mb-0"><strong>Compuestos:</strong> El <strong>gel transparente</strong> contiene acemanano y mucílagos cicatrizantes; el <strong>látex amarillo (acíbar)</strong> debajo de la cáscara contiene <strong>aloína e hidroxiantracénicos</strong>.<br/><strong>Precaución:</strong> Retirar siempre la cáscara y lavar el gel hasta eliminar todo rastro amarillo; la aloína produce diarrea drástica, pérdida de electrolitos y daño renal/hepático.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#FBF4E8] border border-amber-200">
      <h4 class="font-black text-[#4D3A13] m-0">5. Canela (<em>Cinnamomum verum</em> vs. <em>Cinnamomum cassia</em>)</h4>
      <p class="text-xs sm:text-sm text-[#6E5421] mt-1 mb-0"><strong>Compuestos:</strong> Cinamaldehído, eugenol y <strong>cumarina</strong>.<br/><strong>Precaución:</strong> Preferir siempre la <strong>Canela de Ceilán (<em>C. verum</em>)</strong> sobre la Canela Cassia comercial, ya que la Cassia contiene concentraciones elevadas de cumarina hepatotóxica si se consume en exceso.</p>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "toxicity",
      "title": "Alerta Toxicológica del Dr. Luis Paredes: Mala Madre y Ruda",
      "message": "Jamás recomiende ni consuma infusiones o batidos de Mala Madre (Kalanchoe) ni de Ruda (Ruta graveolens). Los bufadienólidos de la Mala Madre son cardiotóxicos y los alcaloides/furanocumarinas de la Ruda son abortivos, hepatotóxicos y nefrotóxicos."
    }
  }$json$::jsonb
where id = 'c16c01dd-6e14-47e3-88e8-5be5220f3a0b';


-- LECCIÓN 4.2: Nopal, Chía, Pepino, Apio, Perejil y Romero
update public.academy_lessons
set
  title = 'Fitofarmacología de Nopal, Chía, Romero y el Trío Verde (Pepino, Apio, Perejil y Vitamina K)',
  description = 'Estudio detallado de las 6 plantas restantes del Módulo 6: mucílagos e interacciones de Nopal y Chía, Vitamina K y anticoagulantes en Pepino/Apio/Perejil, y uso seguro del Romero.',
  thumbnail_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80" alt="Plantas Funcionales: Nopal, Chía, Apio, Perejil, Pepino y Romero" />

  <h2>1. Las 6 Plantas Funcionales y sus Reglas Clínicas de Seguridad (Módulo 6 — Parte 2)</h2>
  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <div class="flex items-center gap-2"><img src="/ingredientes/nopal.png" alt="Nopal" class="w-8 h-8 object-contain !my-0" /><h4 class="font-black text-[#12361B] m-0">6. Nopal (<em>Opuntia ficus-indica</em>)</h4></div>
      <p class="text-xs text-[#2D5A37] mt-1.5 mb-0"><strong>Compuestos:</strong> Fibra soluble, mucílagos y pectinas.<br/><strong>Precaución:</strong> Suma su efecto reductor de glucosa a los fármacos antidiabéticos (vigilar hipoglucemia) y debe separarse 1 a 2 horas de medicamentos orales.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <div class="flex items-center gap-2"><img src="/ingredientes/chia.png" alt="Chía" class="w-8 h-8 object-contain !my-0" /><h4 class="font-black text-[#5B3407] m-0">7. Chía (<em>Salvia hispanica</em>)</h4></div>
      <p class="text-xs text-[#7C4C18] mt-1.5 mb-0"><strong>Compuestos:</strong> Ácido alfa-linolénico (ALA - Omega 3 vegetal) y mucílagos.<br/><strong>Precaución:</strong> <strong>Hidratar obligatoriamente en agua (15 min)</strong> antes de consumir para evitar obstrucción esofágica.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">8. Pepino (<em>Cucumis sativus</em>)</h4>
      <p class="text-xs text-[#2C526A] mt-1.5 mb-0"><strong>Compuestos:</strong> Agua biológica (>95%), vitamina C y <strong>vitamina K</strong>.<br/><strong>Precaución:</strong> Si el paciente toma anticoagulantes como <strong>warfarina</strong>, mantener una ingesta diaria constante de vegetales verdes sin excesos repentinos.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#ECF6EE] border border-emerald-200">
      <div class="flex items-center gap-2"><img src="/ingredientes/apio.png" alt="Apio" class="w-8 h-8 object-contain !my-0" /><h4 class="font-black text-[#0D381E] m-0">9. Apio (<em>Apium graveolens</em>)</h4></div>
      <p class="text-xs text-[#245834] mt-1.5 mb-0"><strong>Compuestos:</strong> Agua, fibra, folato, potasio, <strong>vitamina K</strong> y ftálidos.<br/><strong>Precaución:</strong> Posible alergia alimentaria en personas sensibles y vigilar su aporte de vitamina K con anticoagulantes.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#FBF4E8] border border-amber-300">
      <div class="flex items-center gap-2"><img src="/ingredientes/perejil.png" alt="Perejil" class="w-8 h-8 object-contain !my-0" /><h4 class="font-black text-[#4D3A13] m-0">10. Perejil (<em>Petroselinum crispum</em>)</h4></div>
      <p class="text-xs text-[#6E5421] mt-1.5 mb-0"><strong>Compuestos:</strong> Altísima <strong>vitamina K</strong>, vitamina C, apigenina y aceites volátiles (apiol/miristicina).<br/><strong>Precaución:</strong> Cantidades medicinales concentradas están <strong>contraindicadas en el embarazo</strong> y alteran el efecto de la warfarina.</p>
    </div>

    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <div class="flex items-center gap-2"><img src="/ingredientes/romero.png" alt="Romero" class="w-8 h-8 object-contain !my-0" /><h4 class="font-black text-slate-900 m-0">11. Romero (<em>Salvia rosmarinus</em>)</h4></div>
      <p class="text-xs text-slate-700 mt-1.5 mb-0"><strong>Compuestos:</strong> Ácido rosmarínico, ácido carnósico, carnosol y 1,8-cineol.<br/><strong>Precaución:</strong> <strong>Jamás ingerir el aceite esencial puro</strong>; usar con precaución en personas con epilepsia y durante el embarazo.</p>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "warning",
      "title": "Interacción Clínica Clave: El Trío Verde (Pepino, Apio y Perejil) y la Warfarina",
      "message": "El perejil, el apio y la cáscara del pepino son ricos en Vitamina K, la cual participa en la coagulación de la sangre. En pacientes que toman Warfarina, tomar de golpe grandes jarras de extractos verdes concentrados bloquea el efecto del anticoagulante y favorece trombosis."
    }
  }$json$::jsonb
where id = '4cb417b3-0e09-4620-931d-a9fa8521395d';


-- LECCIÓN 4.3: Las 10 Infusiones Tradicionales, Receta Básica y 3 Bloques por Sistemas (Módulo 7)
update public.academy_lessons
set
  title = 'Módulo 7: Las 10 Infusiones Tradicionales, Receta Básica y Orientación Clínica por Sistemas',
  description = 'Regla maestra de la infusión perfecta (250 ml), tabla completa de las 10 infusiones tradicionales con dosis y tiempos exactos, y los 3 bloques de orientación clínica por sistemas.',
  thumbnail_url = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 45,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1000&q=80" alt="Fitoterapia Práctica: Las 10 Infusiones Tradicionales" />

  <h2>1. Cuadro Maestro de las 10 Infusiones Tradicionales (Módulo 7)</h2>
  <div class="overflow-x-auto border border-slate-200 rounded-2xl my-4">
    <table class="w-full text-left text-xs sm:text-sm">
      <thead class="bg-[#0F2E18] text-white font-bold">
        <tr>
          <th class="p-3">Planta Medicinal</th>
          <th class="p-3">Dosis y Tiempo en 250 ml</th>
          <th class="p-3">Compuestos y Beneficios</th>
          <th class="p-3">Precaución Clínica Estricta</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr class="bg-white">
          <td class="p-3 font-black text-[#1A4E26]">1. Manzanilla (<em>Matricaria chamomilla</em>)</td>
          <td class="p-3 font-semibold">1 cdta flores secas • 5 a 10 min</td>
          <td class="p-3">Alfa-bisabolol, camazuleno, apigenina. Calma gastritis, cólicos y ansiedad leve.</td>
          <td class="p-3 text-amber-900">Evitar en alergia a margaritas/ambrosía (Asteraceae).</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3 font-black text-[#1A4E26]">2. Orégano (<em>Origanum vulgare</em>)</td>
          <td class="p-3 font-semibold">1/2 a 1 cdta hojas secas • 5 a 8 min</td>
          <td class="p-3">Carvacrol y timol. Carminativo contra gases y digestiones lentas.</td>
          <td class="p-3 text-amber-900">No concentrar en gastritis aguda; no ingerir aceite esencial.</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3 font-black text-[#1A4E26]">3. Menta (<em>Mentha piperita</em>)</td>
          <td class="p-3 font-semibold">1 cdta hojas secas • 5 a 7 min</td>
          <td class="p-3">Mentol y mentona. Alivia espasmos del colon y gases intestinales.</td>
          <td class="p-3 text-red-800 font-bold">⛔ EMPEORA el reflujo gastroesofágico y la acidez (relaja el esfínter esofágico).</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3 font-black text-[#1A4E26]">4. Canela (<em>Cinnamomum verum</em>)</td>
          <td class="p-3 font-semibold">1 trozo pequeño en rama • 8 a 10 min</td>
          <td class="p-3">Cinamaldehído. Digestiva, antiflatulenta y apoyo en sensibilidad a insulina.</td>
          <td class="p-3 text-amber-900">Preferir Ceilán sobre Cassia (cumarina hepatotóxica en exceso).</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3 font-black text-[#1A4E26]">5. Clavo de olor (<em>Syzygium aromaticum</em>)</td>
          <td class="p-3 font-semibold">1 a 2 clavos enteros • 5 min</td>
          <td class="p-3">Eugenol. Antiflatulento y aromático en dosis mínimas.</td>
          <td class="p-3 text-red-800 font-bold">⛔ Irritante gástrico y riesgo de sangrado con anticoagulantes.</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3 font-black text-[#1A4E26]">6. Linaza (<em>Linum usitatissimum</em>)</td>
          <td class="p-3 font-semibold">1 cdta semillas en 250 ml agua • Hidratar 10-15 min</td>
          <td class="p-3">Mucílagos, Omega-3 y lignanos. Suaviza mucosa gástrica y heces.</td>
          <td class="p-3 text-red-800 font-bold">⛔ Separar 2 HORAS de cualquier medicamento oral.</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3 font-black text-[#1A4E26]">7. Lavanda (<em>Lavandula angustifolia</em>)</td>
          <td class="p-3 font-semibold">1 pizca de flores secas • 5 min</td>
          <td class="p-3">Linalool. Relajante nerviosa y calmante de cólicos por tensión.</td>
          <td class="p-3 text-amber-900">Causa somnolencia; no combinar con sedantes, somníferos ni alcohol.</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3 font-black text-[#1A4E26]">8. Malva blanca (<em>Malva parviflora</em>)</td>
          <td class="p-3 font-semibold">1 cdta hojas/flores • 5 a 10 min</td>
          <td class="p-3">Mucílagos demulcentes. Recubre estómago, garganta y vías urinarias.</td>
          <td class="p-3 text-red-800 font-bold">⛔ Separar 2 HORAS de los medicamentos (reduce su absorción).</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3 font-black text-[#1A4E26]">9. Cola de caballo (<em>Equisetum arvense</em>)</td>
          <td class="p-3 font-semibold">1 cdta planta seca • 5 a 8 min (ciclos cortos)</td>
          <td class="p-3">Sílice y flavonoides. Efecto diurético tradicional.</td>
          <td class="p-3 text-red-800 font-bold">⛔ Contiene tiaminasa y altera electrolitos; contraindicada en fallo renal/cardíaco y con litio.</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3 font-black text-[#1A4E26]">10. Pelo de choclo (<em>Zea mays</em>)</td>
          <td class="p-3 font-semibold">1 pizca de estigmas secos • 5 a 10 min</td>
          <td class="p-3">Flavonoides y sales de potasio. Diurético suave y confort urinario.</td>
          <td class="p-3 text-red-800 font-bold">⛔ NO elimina bacterias ni sustituye antibióticos en infección urinaria.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>2. Los 3 Bloques de Orientación Clínica por Sistemas</h2>
  <div class="grid sm:grid-cols-3 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <h4 class="font-black text-[#12361B] m-0">Bloque 1: Diabetes e Hígado Graso</h4>
      <p class="text-xs text-[#2D5A37] mt-2 mb-0">Tomar todas las infusiones <strong>100% sin azúcar, miel ni panela</strong>. Apoyarse en canela de Ceilán en dosis suave y mucílagos de linaza/chía/nopal para modular la absorción de glucosa, sin suspender jamás la insulina o metformina indicadas.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">Bloque 2: Gastritis, Reflujo, Colon y Hemorroides</h4>
      <p class="text-xs text-[#7C4C18] mt-2 mb-0">Priorizar manzanilla, malva blanca y agua de linaza (separadas 2h de fármacos). <strong>Evitar menta y clavo de olor si hay reflujo</strong>, y cumplir la regla de <strong>no acostarse hasta 2 a 3 horas después de comer</strong>.</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">Bloque 3: Vías Urinarias, Próstata y Ovarios / SOP</h4>
      <p class="text-xs text-[#2C526A] mt-2 mb-0">El pelo de choclo, la manzanilla y la malva apoyan el confort pélvico y la hidratación, pero <strong>ninguna infusión reemplaza a los antibióticos</strong> ante una infección urinaria ni al control ginecológico/urológico.</p>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "recipe_card": {
      "title": "Receta Básica Universal de Infusión Prudente (Estándar Clínico SUMAK)",
      "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
      "prep_time": "5 a 10 minutos",
      "servings": "1 taza estándar (250 ml)",
      "benefits": ["Dosis exacta sin sobrecarga hepática", "Preserva aceites esenciales al tapar", "Seguridad fitoterapéutica"],
      "posology": "Tomar 1 a 2 tazas al día según tolerancia, sin endulzar y separada 2 horas de los medicamentos crónicos.",
      "ingredients": [
        {"name": "Planta seca seleccionada (hojas o flores)", "dose": "1 cucharadita (o 1 pizca en lavanda/estigmas)", "notes": "No mezclar muchas plantas a la vez", "image_url": "/ingredientes/manzanilla.png"},
        {"name": "Agua potable recién hervida", "dose": "250 ml (1 taza)", "notes": "Verter sobre la planta"}
      ],
      "steps": [
        "Hervir 250 ml (1 taza) de agua potable y retirar del fuego.",
        "Colocar la medida prudente de la planta seca (1 cucharadita rasa; o solo 1-2 clavos / 1 pizca según la ficha) en la taza.",
        "Verter el agua caliente sobre la planta y TAPAR inmediatamente la taza para no perder los compuestos volátiles.",
        "Dejar reposar entre 5 y 10 minutos exactamente (no dejar concentrar por horas).",
        "Colar bien antes de beber y no mezclar múltiples plantas desconocidas en una misma preparación."
      ]
    }
  }$json$::jsonb
where id = '5f609d0b-1c5c-4cbb-a511-a2eb02222795';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. MÓDULO 11 DEL MANUAL: PORTAFOLIO OFICIAL Y FICHAS TÉCNICAS DE LOS 6 PRODUCTOS SUMAK
--    Se añade como Módulo 3 / Lección 4.4 dentro del Curso de Vademécum SUMAK
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_course_id uuid;
  v_mod11_id uuid;
  v_les11_id uuid;
begin
  select id into v_course_id from public.academy_courses where slug = 'vademecum-herbolaria-toxicologia-botanica-sumak' limit 1;

  if v_course_id is not null then
    select id into v_mod11_id from public.academy_modules
    where course_id = v_course_id and sort_order = 3 limit 1;

    if v_mod11_id is null then
      insert into public.academy_modules (course_id, title, description, sort_order, is_published)
      values (
        v_course_id,
        'Módulo 3: Portafolio Oficial y Fichas Técnicas de los 6 Productos SUMAK',
        'Vademécum técnico completo de Té Extractos de la Vida, REGEN 24, Fibramak Plus, Sumak Colon Renova, Madre Silvestre y Vive-Oxi-100.',
        3,
        true
      ) returning id into v_mod11_id;
    else
      update public.academy_modules
      set
        title = 'Módulo 3: Portafolio Oficial y Fichas Técnicas de los 6 Productos SUMAK',
        description = 'Vademécum técnico completo de Té Extractos de la Vida, REGEN 24, Fibramak Plus, Sumak Colon Renova, Madre Silvestre y Vive-Oxi-100.',
        is_published = true
      where id = v_mod11_id;
    end if;

    select id into v_les11_id from public.academy_lessons
    where module_id = v_mod11_id and sort_order = 1 limit 1;

    if v_les11_id is null then
      insert into public.academy_lessons (
        module_id, title, description, content_type, text_content,
        thumbnail_url, sort_order, is_published, is_free_preview, is_required, estimated_minutes, metadata
      ) values (
        v_mod11_id,
        'Vademécum Técnico de los 6 Productos Oficiales SUMAK: Ingredientes, Micronutrientes y Posología',
        'Desglose íntegro de composición botánica, vitaminas, minerales, presentaciones y modo de uso clínico de los 6 productos naturales de SUMAK Vida Ecuador.',
        'text',
        '',
        '/products/te-extractos-de-la-vida-v2.png',
        1, true, true, true, 45, '{}'::jsonb
      ) returning id into v_les11_id;
    end if;

    update public.academy_lessons
    set
      title = 'Vademécum Técnico de los 6 Productos Oficiales SUMAK: Ingredientes, Micronutrientes y Posología',
      description = 'Desglose íntegro de composición botánica, vitaminas, minerales, presentaciones y modo de uso clínico de los 6 productos naturales de SUMAK Vida Ecuador.',
      thumbnail_url = '/products/te-extractos-de-la-vida-v2.png',
      estimated_minutes = 45,
      text_content = $html$
<div class="space-y-8">
  <h2>Portafolio Oficial de Biotecnología Fitoterapéutica SUMAK Vida Ecuador</h2>
  <p>Este módulo reúne las <strong>6 fichas técnicas oficiales completas</strong> del catálogo SUMAK, detallando cada planta medicinal, su función fisiológica, el complejo de vitaminas y minerales, las presentaciones y la posología exacta.</p>

  <!-- 1. TÉ EXTRACTOS DE LA VIDA -->
  <div class="p-6 rounded-2xl bg-[#EBF5EE] border-2 border-[#C8D8CB] space-y-4">
    <div class="flex flex-col sm:flex-row items-center gap-5">
      <img src="/products/te-extractos-de-la-vida-v2.png" alt="Té Extractos de la Vida" class="w-28 h-28 object-contain bg-white rounded-2xl p-2 border border-emerald-200 !my-0 shrink-0" />
      <div>
        <span class="text-xs font-black uppercase tracking-widest bg-[#1A4E26] text-white px-3 py-1 rounded-full">1. Té Extractos de la Vida • Cód. 00001</span>
        <h3 class="text-xl font-black text-[#12361B] mt-2 mb-1">Presentación: 500 ml / 1000 ml | PVP: $25.00</h3>
        <p class="text-sm font-bold text-[#1A4E26] m-0">Posología: Tomar 30 ml (2 cucharadas) diluidos en un vaso de agua, 1 a 2 veces al día.</p>
      </div>
    </div>
    <p class="text-sm text-[#2D5A37] m-0"><strong>Los 10 Ingredientes Activos y su Función:</strong> <strong>1) Resveratrol de Uva</strong> (antioxidante cardiovascular y celular), <strong>2) Pectina de Manzana Verde</strong> (fibra prebiótica digestiva y reguladora lipídica), <strong>3) Extracto de Guanábana</strong> (soporte inmunológico y citoprotector), <strong>4) Extracto de Arándano Azul</strong> (antocianinas protectoras urinarias y microvasculares), <strong>5) Extracto de Noni</strong> (iridoides inmunomoduladores), <strong>6) Extracto de Moringa</strong> (aminoácidos esenciales y antioxidantes), <strong>7) Extracto de Diente de León</strong> (depurativo hepatorrenal y biliar), <strong>8) Extracto de Té Rojo</strong> (metabolismo lipídico), <strong>9) Extracto de Aloe Vera</strong> (mucílagos regeneradores gástricos) y <strong>10) Vitaminas y Minerales esenciales</strong>.</p>
  </div>

  <!-- 2. REGEN 24 -->
  <div class="p-6 rounded-2xl bg-[#FEF6E9] border-2 border-amber-200 space-y-4">
    <div class="flex flex-col sm:flex-row items-center gap-5">
      <img src="/products/regen-24.png" alt="REGEN 24" class="w-28 h-28 object-contain bg-white rounded-2xl p-2 border border-amber-200 !my-0 shrink-0" />
      <div>
        <span class="text-xs font-black uppercase tracking-widest bg-[#92400E] text-white px-3 py-1 rounded-full">2. REGEN 24 • Cód. 00002</span>
        <h3 class="text-xl font-black text-[#5B3407] mt-2 mb-1">Presentación: Botella de 1000 ml | PVP: $25.00</h3>
        <p class="text-sm font-bold text-[#7C4C18] m-0">Posología: Tomar 30 ml diluidos en un vaso de agua, 1 a 2 veces al día.</p>
      </div>
    </div>
    <p class="text-sm text-[#7C4C18] m-0"><strong>Los 10 Extractos Botánicos:</strong> <strong>1) Tamarindo</strong> (regulador osmótico suave y biliar), <strong>2) Semilla de Papaya</strong> (acción antiparasitaria y limpiadora), <strong>3) Uña de Gato</strong> (antiinflamatorio e inmunomodulador), <strong>4) Noni</strong> (revitalizante celular), <strong>5) Guayaba</strong> (rica en vitamina C y quercetina), <strong>6) Sábila</strong> (cicatrizante epitelial), <strong>7) Piña</strong> (bromelina digestiva), <strong>8) Chía</strong> (Omega-3 y mucílagos), <strong>9) Menta</strong> (antiespasmódica y carminativa), <strong>10) Ortiga</strong> (depurativa y remineralizante) + <strong>6 Minerales Esenciales: Calcio (Ca), Magnesio (Mg), Zinc (Zn), Selenio (Se), Potasio (K) y Cromo (Cr)</strong>.</p>
  </div>

  <!-- 3. FIBRAMAK PLUS -->
  <div class="p-6 rounded-2xl bg-[#EAF2F7] border-2 border-sky-200 space-y-4">
    <div class="flex flex-col sm:flex-row items-center gap-5">
      <img src="/products/fibramak-plus.png" alt="Fibramak Plus" class="w-28 h-28 object-contain bg-white rounded-2xl p-2 border border-sky-200 !my-0 shrink-0" />
      <div>
        <span class="text-xs font-black uppercase tracking-widest bg-[#1E3A5F] text-white px-3 py-1 rounded-full">3. Fibramak Plus • Cód. 00005</span>
        <h3 class="text-xl font-black text-[#102D3E] mt-2 mb-1">Presentación: Polvo micropulverizado | PVP: $25.00</h3>
        <p class="text-sm font-bold text-[#2C526A] m-0">Posología: Disolver 2 cucharadas (10 g) en un vaso de agua o jugo en ayunas.</p>
      </div>
    </div>
    <p class="text-sm text-[#2C526A] m-0"><strong>Los 9 Activos Funcionales:</strong> <strong>1) Probióticos vegetales</strong> (restauran la flora intestinal), <strong>2) Piña / Bromelina</strong> (enzima digestiva y desinflamatoria), <strong>3) Polvo de Avena</strong> (betaglucanos protectores), <strong>4) Polvo de Chía</strong> (mucílagos y Omega-3), <strong>5) Polvo de Moringa</strong> (nutrición celular), <strong>6) Polvo de Alfalfa</strong> (enzimas y clorofila), <strong>7) Polvo de Cúrcuma</strong> (curcuminoides hepatoprotectores), <strong>8) Polvo de Hoja de Zen/Sen</strong> (motilidad colónica), <strong>9) Micropulverizado de Sábila</strong> + <strong>8 Micronutrientes: Calcio (Ca), Hierro (Fe), Magnesio (Mg), Zinc (Zn), Potasio (K), Selenio (Se), Ácido Fólico (B9) y Vitamina B6</strong>.</p>
  </div>

  <!-- 4. SUMAK COLON RENOVA -->
  <div class="p-6 rounded-2xl bg-[#ECF6EE] border-2 border-emerald-300 space-y-4">
    <div class="flex flex-col sm:flex-row items-center gap-5">
      <img src="/products/colon-renova.png" alt="Sumak Colon Renova" class="w-28 h-28 object-contain bg-white rounded-2xl p-2 border border-emerald-200 !my-0 shrink-0" />
      <div>
        <span class="text-xs font-black uppercase tracking-widest bg-[#0D381E] text-white px-3 py-1 rounded-full">4. Sumak Colon Renova • Cód. 00016</span>
        <h3 class="text-xl font-black text-[#0D381E] mt-2 mb-1">Presentaciones: 1000 ml, 500 ml y 250 ml | PVP: $25.00</h3>
        <p class="text-sm font-bold text-[#245834] m-0">Posología: Tomar 30 ml por la mañana y 30 ml por la noche.</p>
      </div>
    </div>
    <p class="text-sm text-[#245834] m-0"><strong>Los 15 Ingredientes Completos con sus 4 Beneficios por Planta:</strong><br/>
    1) <strong>Hierbabuena:</strong> Alivia gases, relaja espasmos, refresca la mucosa y mejora la digestión.<br/>
    2) <strong>Paico:</strong> Antiparasitario tradicional, combate amebas/lombrices, calma cólicos y desinflama.<br/>
    3) <strong>Ampo:</strong> Depurativo ancestral, neutraliza toxinas, desinflama el tracto y protege el epitelio.<br/>
    4) <strong>Ciruela pasa:</strong> Rica en sorbitol natural, ablanda el bolo fecal, corrige el estreñimiento y nutre la flora.<br/>
    5) <strong>Ajenjo:</strong> Tónico amargo, estimula la bilis, frena fermentaciones y expulsa parásitos.<br/>
    6) <strong>Sábila:</strong> Regenera la mucosa colónica, desinflama, hidrata y suaviza la evacuación.<br/>
    7) <strong>Chía:</strong> Forma gel mucilaginoso, arrastra residuos adheridos, aporta Omega-3 y regula el tránsito.<br/>
    8) <strong>Jengibre:</strong> Activa el peristaltismo, reduce náuseas, mejora la circulación digestiva y desinflama.<br/>
    9) <strong>Linaza:</strong> Aporta lignanos y mucílagos, lubrica el canal anal, previene hemorroides y protege el estómago.<br/>
    10) <strong>Hoja de Zen (Sen):</strong> Estimula las contracciones naturales del colon y vence la atonía intestinal.<br/>
    11) <strong>Semilla de papaya:</strong> Aporta carpaina antiparasitaria, limpia el lumen intestinal y apoya al hígado.<br/>
    12) <strong>Noni:</strong> Refuerza la inmunidad intestinal, aporta antioxidantes, revitaliza y modula la inflamación.<br/>
    13) <strong>Limón:</strong> Alcalinizante metabólico, aporta vitamina C, estimula enzimas y es antiséptico natural.<br/>
    14) <strong>Manzana verde:</strong> Rica en pectina prebiótica, alimenta bacterias benéficas y regula lípidos.<br/>
    15) <strong>Edulcorante no calórico:</strong> Sabor agradable sin calorías ni pico glucémico, <strong>100% apto para diabéticos</strong>.</p>
  </div>

  <!-- 5. MADRE SILVESTRE -->
  <div class="p-6 rounded-2xl bg-[#FBF4E8] border-2 border-amber-300 space-y-4">
    <div class="flex flex-col sm:flex-row items-center gap-5">
      <img src="/products/capsula-madre-silvestre.png" alt="Madre Silvestre" class="w-28 h-28 object-contain bg-white rounded-2xl p-2 border border-amber-200 !my-0 shrink-0" />
      <div>
        <span class="text-xs font-black uppercase tracking-widest bg-[#785E2A] text-white px-3 py-1 rounded-full">5. Madre Silvestre • Cód. 00011</span>
        <h3 class="text-xl font-black text-[#4D3A13] mt-2 mb-1">Presentación: 100 cápsulas de 500 mg | PVP: $20.00</h3>
        <p class="text-sm font-bold text-[#6E5421] m-0">Posología: Tomar 1 cápsula 2 veces al día antes de los alimentos.</p>
      </div>
    </div>
    <p class="text-sm text-[#6E5421] m-0"><strong>Las 12 Plantas Medicinales:</strong> <strong>1) Té del Indio, 2) Chancapiedra, 3) Menta, 4) Flor Blanca, 5) Malva, 6) Sábila, 7) Cola de Caballo, 8) Uña de Gato, 9) Sangre de Drago, 10) Ajenjo, 11) Flor de Arenilla y 12) Canchalagua</strong> + <strong>10 Vitaminas y Minerales: Calcio (Ca), Hierro (Fe), Potasio (K), Magnesio (Mg), Zinc (Zn), Selenio (Se), Ácido Fólico (B9), Vitamina B6, Vitamina C y Vitamina E</strong>.</p>
  </div>

  <!-- 6. VIVE-OXI-100 -->
  <div class="p-6 rounded-2xl bg-[#EBF5EE] border-2 border-[#1A4E26]/40 space-y-4">
    <div class="flex flex-col sm:flex-row items-center gap-5">
      <img src="/products/vive-oxi-100.png" alt="Vive-Oxi-100" class="w-28 h-28 object-contain bg-white rounded-2xl p-2 border border-emerald-200 !my-0 shrink-0" />
      <div>
        <span class="text-xs font-black uppercase tracking-widest bg-[#1A4E26] text-white px-3 py-1 rounded-full">6. Vive-Oxi-100 • Cód. 00004</span>
        <h3 class="text-xl font-black text-[#12361B] mt-2 mb-1">Presentación: Frasco gotero de 60 ml | PVP: $25.00</h3>
        <p class="text-sm font-bold text-[#1A4E26] m-0">Posología: Tomar 20 a 30 gotas diluidas en agua, 1 a 2 veces al día.</p>
      </div>
    </div>
    <p class="text-sm text-[#2D5A37] m-0"><strong>Los 8 Activos Principales:</strong> <strong>1) Esencia de Totumo</strong> (salud respiratoria), <strong>2) Esencia de Borraja</strong> (rica en Omega-6 antiinflamatorio), <strong>3) Esencia de Jengibre</strong> (circulación y vitalidad), <strong>4) Esencia de Ajo</strong> (protección vascular), <strong>5) Esencia de Toronjil</strong> (calma neurovegetativa), <strong>6) Esencia de Menta</strong> (apertura respiratoria), <strong>7) Miel de Abeja</strong> y <strong>8) Magnesio (Mg)</strong> + <strong>Vitaminas B1, B2, B6, C, D3, E + Oxígeno Líquido biodisponible</strong>.</p>
  </div>
</div>
$html$,
      metadata = $json${
        "clinical_callout": {
          "severity": "info",
          "title": "Calidad de Laboratorio y Estandarización SUMAK Jambi",
          "message": "Todas las formulaciones del portafolio oficial SUMAK Vida Ecuador están elaboradas con extractos purificados y dosificados que garantizan la ausencia de partes tóxicas (como la aloína cruda) y la sinergia exacta de vitaminas y oligoelementos."
        }
      }$json$::jsonb
    where id = v_les11_id;

    -- Vincular los 6 productos oficiales a la Lección 4.4 (Módulo 11)
    insert into public.academy_lesson_products (lesson_id, product_code, product_name, product_slug, dosage, administration_route, precautions, protocol_phase, sort_order)
    values
      (v_les11_id, '00001', 'Té Extractos de la Vida', 'te-extractos-de-la-vida', '30 ml (2 cucharadas) diluidos en un vaso de agua, 1 a 2 veces al día', 'Vía oral diluido en agua. Conservar refrigerado tras abrir.', 'No recomendado en embarazo o lactancia.', 'Antioxidante y Depurativo Sistémico', 1),
      (v_les11_id, '00002', 'REGEN 24', 'regen-24', '30 ml (2 cucharadas) diluidos en un vaso de agua, 1 a 2 veces al día', 'Vía oral diluido en agua.', 'No recomendado en obstrucción intestinal o embarazo.', 'Regeneración Digestiva y Mineralización', 2),
      (v_les11_id, '00005', 'Fibramak Plus', 'fibramak-plus', 'Disolver 2 cucharadas (10 g) en un vaso de agua o jugo en ayunas', 'Vía oral disuelto en líquido con abundante agua en el día.', 'Acompañar con hidratación constante.', 'Fibra Prebiótica y Probióticos Vegetales', 3),
      (v_les11_id, '00016', 'Fórmula Herbal Colon Renova', 'colon-renova', '30 ml por la mañana y 30 ml por la noche', 'Vía oral. Conservar refrigerado una vez abierto.', 'Solo para adultos. Apto para diabéticos (edulcorante no calórico).', 'Limpieza Profunda y Antiparasitaria del Colon', 4),
      (v_les11_id, '00011', 'Madre Silvestre', 'capsula-madre-silvestre', '1 cápsula 2 veces al día antes de los alimentos', 'Vía oral con un vaso completo de agua.', 'No usar durante el embarazo.', 'Equilibrio Urogenital, Renal y Femenino', 5),
      (v_les11_id, '00004', 'Vive-Oxi-100', 'vive-oxi-100', '20 a 30 gotas diluidas en agua, 1 a 2 veces al día', 'Vía oral sublingual o diluida en agua.', 'No exceder la dosis diaria recomendada.', 'Oxigenación Celular y Vitalidad Neurovascular', 6)
    on conflict (lesson_id, product_code) do update set
      dosage = excluded.dosage,
      administration_route = excluded.administration_route,
      precautions = excluded.precautions,
      protocol_phase = excluded.protocol_phase,
      sort_order = excluded.sort_order;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. MÓDULOS 8, 9 Y 10 DEL MANUAL: PÁNCREAS, HIPERTENSIÓN, DIABETES Y NUTRICIÓN CROMÁTICA
--     Curso: salud-metabolica-pancreas-diabetes-hipertension-sumak
-- ─────────────────────────────────────────────────────────────────────────────

-- LECCIÓN 5.1: Páncreas, Pancreatitis y Método del Plato (Harvard y 9 Pulgadas)
update public.academy_lessons
set
  title = 'Páncreas, Pancreatitis (Aguda y Crónica) y Método del Plato Saludable de Harvard y 9 Pulgadas',
  description = 'Anatomía del páncreas (cabeza, cola, duodeno, conductos biliares), doble función digestiva y hormonal, pancreatitis aguda y crónica, y el Plato Saludable de Harvard junto al Plato de 9 pulgadas.',
  thumbnail_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 40,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80" alt="El Plato para Comer Saludable de Harvard y Método de 9 Pulgadas" />

  <h2>1. Anatomía y Doble Función Vital del Páncreas</h2>
  <p>El <strong>páncreas</strong> es una glándula alargada situada transversalmente en la parte superior del abdomen, detrás del estómago. Anatómicamente se divide en <strong>cabeza</strong> (encajada en la curva del <strong>duodeno</strong> y conectada con los <strong>conductos biliares / colédoco</strong>), <strong>cuerpo</strong> y <strong>cola</strong> (que se extiende hacia el bazo). Cumple dos funciones esenciales:</p>
  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C8D8CB]">
      <h4 class="font-black text-[#12361B] m-0">1. Función Exocrina (Digestiva)</h4>
      <p class="text-sm text-[#2D5A37] mt-1 mb-0">Produce y vierte hacia el duodeno el jugo pancreático rico en <strong>enzimas digestivas</strong>: <strong>amilasa</strong> (digiere carbohidratos), <strong>lipasa</strong> (digiere grasas) y <strong>tripsina/quimotripsina</strong> (digiere proteínas).</p>
    </div>
    <div class="p-4 rounded-2xl bg-[#EAF2F7] border border-sky-200">
      <h4 class="font-black text-[#102D3E] m-0">2. Función Endocrina (Hormonal)</h4>
      <p class="text-sm text-[#2C526A] mt-1 mb-0">A través de los islotes de Langerhans secreta directamente a la sangre dos hormonas reguladoras: la <strong>insulina</strong> (permite la entrada de glucosa a las células y baja el azúcar en sangre) y el <strong>glucagón</strong> (libera glucosa cuando hay ayuno).</p>
    </div>
  </div>

  <h2>2. Pancreatitis Aguda y Crónica: Síntomas, Causas y Tratamiento</h2>
  <p>La <strong>pancreatitis</strong> es la inflamación del páncreas que ocurre cuando sus propias enzimas digestivas se activan dentro de la glándula antes de salir al duodeno, autodigiriendo el tejido pancreático. Puede ser <strong>aguda</strong> (aparición súbita y grave) o <strong>crónica</strong> (daño progresivo e irreversible).</p>
  <ul>
    <li><strong>Síntomas característicos:</strong> Dolor intenso y constante en la parte alta del abdomen (epigastrio) que <strong>se irradia en forma de cinturón hacia la espalda</strong>, acompañado de náuseas, vómitos repetidos, fiebre, abdomen sensible y taquicardia (pulso acelerado).</li>
    <li><strong>Causas principales:</strong> 1) <strong>Cálculos biliares</strong> que obstruyen la salida común del conducto biliar y pancreático, 2) Consumo excesivo de <strong>alcohol</strong>, 3) <strong>Triglicéridos muy altos</strong> en la sangre, 4) Ciertos medicamentos, 5) Factores genéticos y 6) Consumo de tabaco.</li>
    <li><strong>Tratamiento hospitalario y cuidados:</strong> La pancreatitis aguda es una urgencia que requiere <strong>hospitalización médica</strong> (hidratación intravenosa intensiva, analgesia, reposo digestivo temporal y extracción de cálculos biliares si los hubiera). Para prevenirla: dieta muy baja en grasas saturadas y frituras, cero alcohol, cero tabaco y control estricto de los triglicéridos.</li>
  </ul>

  <h2>3. Infografía Nutricional: El Plato para Comer Saludable (Harvard) + Plato de 9 Pulgadas</h2>
  <div class="p-5 rounded-2xl bg-[#FBF4E8] border-2 border-[#D4AF37]/60 space-y-4 my-4">
    <h3 class="text-lg font-black text-[#4D3A13] m-0">Los 6 Componentes del Plato para Comer Saludable (Harvard)</h3>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
      <div class="p-3.5 rounded-xl bg-white border border-emerald-200"><strong>1. Vegetales:</strong> Abundantes y variados. <em>Nota clave de Harvard:</em> <strong>Las papas y las papas fritas NO cuentan como vegetales</strong> por su alto impacto en la glucosa sanguínea.</div>
      <div class="p-3.5 rounded-xl bg-white border border-rose-200"><strong>2. Frutas:</strong> Consumir frutas enteras de todos los colores, prefiriéndolas siempre enteras con su fibra antes que en jugos azucarados.</div>
      <div class="p-3.5 rounded-xl bg-white border border-amber-200"><strong>3. Granos integrales (1/4 del plato):</strong> Avena integral, quinua, cebada, arroz integral y pan integral; limitar el arroz blanco y el pan blanco refinado.</div>
      <div class="p-3.5 rounded-xl bg-white border border-sky-200"><strong>4. Proteína saludable (1/4 del plato):</strong> Pescado, aves (pollo/pavo), legumbres (frijoles, lentejas, garbanzos) y nueces; limitar las carnes rojas y evitar tocino, salchichas y embutidos.</div>
      <div class="p-3.5 rounded-xl bg-white border border-yellow-300"><strong>5. Aceites saludables:</strong> Usar aceite de oliva extra virgen o canola para cocinar y en ensaladas; limitar la mantequilla y evitar por completo las grasas trans.</div>
      <div class="p-3.5 rounded-xl bg-white border border-blue-200"><strong>6. Agua:</strong> Tomar agua pura, té o infusiones sin azúcar; limitar la leche/lácteos a 1-2 porciones al día y evitar las bebidas azucaradas.</div>
    </div>

    <div class="p-4 rounded-xl bg-[#0F2E18] text-white mt-3">
      <h4 class="font-black text-[#D4AF37] m-0">Regla Exacta del Plato de 9 Pulgadas (23 cm) para Control Glucémico y Pancreático</h4>
      <div class="grid sm:grid-cols-3 gap-3 mt-2 text-xs">
        <div class="p-3 rounded-lg bg-white/10 border border-white/15"><strong>50% (1/2 del plato):</strong> Verduras sin almidón (brócoli, espinaca, lechuga, pepino, tomate, coliflor, vainitas).</div>
        <div class="p-3 rounded-lg bg-white/10 border border-white/15"><strong>25% (1/4 del plato):</strong> Proteína saludable magra (pescado, pechuga de ave sin piel, huevo o legumbres).</div>
        <div class="p-3 rounded-lg bg-white/10 border border-white/15"><strong>25% (1/4 del plato):</strong> Carbohidratos complejos o granos enteros + lácteos bajos en grasa y sin azúcar.</div>
      </div>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "contraindication",
      "title": "Urgencia Médica en Dolor Pancreático en Cinturón",
      "message": "Un dolor abdominal superior intenso que atraviesa hacia la espalda acompañado de vómitos tras una comida copiosa o grasosa es signo clásico de pancreatitis aguda. No administre purgantes ni infusiones calientes; acuda inmediatamente al hospital."
    }
  }$json$::jsonb
where id = 'e31e7546-e0b6-4ea3-8a39-5068576c6e34';


-- LECCIÓN 5.2: Hipertensión Arterial y Los 6 Pilares / Dieta DASH
update public.academy_lessons
set
  title = 'Hipertensión Arterial: Comparativa Vascular, los 6 Pilares de Control y la Dieta DASH',
  description = 'Fisiopatología de la arteria sana vs. arteria con hipertensión, por qué es el enemigo silencioso, los 6 pilares de prevención y la tabla exacta de la Dieta DASH.',
  thumbnail_url = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1000&q=80" alt="Salud Cardiovascular, Control de Presión Arterial y Dieta DASH" />

  <h2>1. Comparativa Anatómica: Arteria Sana vs. Arteria con Hipertensión</h2>
  <p>La <strong>hipertensión arterial</strong> es el aumento crónico de la fuerza que ejerce la sangre contra las paredes de las arterias. Se le conoce como el <em>"enemigo silencioso"</em> porque durante años puede no dar síntomas mientras lesiona el corazón, el cerebro y los riñones.</p>

  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-5 rounded-2xl bg-[#EBF5EE] border-2 border-emerald-400">
      <span class="text-xs font-black uppercase tracking-widest bg-[#1A4E26] text-white px-3 py-1 rounded-full">Arteria Sana</span>
      <h4 class="font-black text-[#12361B] mt-2 mb-1">Pared Flexible y Diámetro Amplio</h4>
      <p class="text-sm text-[#2D5A37] m-0">La túnica muscular arterial es elástica, el endotelio está íntegro y la luz interna (diámetro) es amplia, permitiendo que la sangre fluya sin resistencia excesiva y oxigene todos los órganos.</p>
    </div>
    <div class="p-5 rounded-2xl bg-rose-50 border-2 border-rose-400">
      <span class="text-xs font-black uppercase tracking-widest bg-rose-700 text-white px-3 py-1 rounded-full">Arteria con Hipertensión</span>
      <h4 class="font-black text-rose-950 mt-2 mb-1">Pared Engrosada y Diámetro Estrecho</h4>
      <p class="text-sm text-rose-900 m-0">La pared arterial se vuelve rígida y engrosada (hipertrofia vascular), el <strong>diámetro interno se estrecha drásticamente</strong>, aumenta la presión contra el endotelio y el corazón debe trabajar forzado en cada latido.</p>
    </div>
  </div>

  <h2>2. Los 6 Pilares para el Control de la Hipertensión Arterial</h2>
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 my-4">
    <div class="p-4 rounded-xl bg-[#EBF5EE] border border-[#C8D8CB]"><strong>1. Dieta DASH:</strong> Bajar drásticamente el sodio (sal) y aumentar los alimentos ricos en potasio, magnesio, calcio y fibra.</div>
    <div class="p-4 rounded-xl bg-[#FEF6E9] border border-amber-200"><strong>2. Ejercicio físico regular:</strong> Realizar como mínimo <strong>150 minutos por semana</strong> de actividad aeróbica moderada (caminata rápida, baile, natación).</div>
    <div class="p-4 rounded-xl bg-[#EAF2F7] border border-sky-200"><strong>3. Peso corporal saludable:</strong> Reducir el exceso de peso disminuye directamente los milímetros de mercurio (mmHg) de la presión.</div>
    <div class="p-4 rounded-xl bg-[#ECF6EE] border border-emerald-200"><strong>4. Limitar el alcohol:</strong> El consumo de alcohol eleva la presión arterial y resta eficacia a los medicamentos antihipertensivos.</div>
    <div class="p-4 rounded-xl bg-rose-50 border border-rose-200"><strong>5. No fumar (Cero tabaco):</strong> Cada cigarrillo produce vasoconstricción inmediata y acelera la aterosclerosis.</div>
    <div class="p-4 rounded-xl bg-[#FBF4E8] border border-amber-300"><strong>6. Controlar el estrés:</strong> Practicar respiración profunda, higiene del sueño y pausas activas para reducir la descarga de adrenalina y cortisol.</div>
  </div>

  <h2>3. Tabla Clínica de la Dieta DASH: Alimentos Beneficiosos vs. Alimentos a Evitar</h2>
  <div class="overflow-x-auto border border-slate-200 rounded-2xl my-4">
    <table class="w-full text-left text-xs sm:text-sm">
      <thead class="bg-[#0F2E18] text-white font-bold">
        <tr>
          <th class="p-3.5 w-1/2">✅ Alimentos Beneficiosos (Ricos en Potasio, Magnesio y Fibra)</th>
          <th class="p-3.5 w-1/2">⛔ Alimentos a Evitar (Altos en Sodio Oculto y Grasas Saturadas)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr class="bg-white">
          <td class="p-3.5 text-emerald-950"><strong>Frutas y verduras frescas en abundancia:</strong> Banano, aguacate, espinaca, brócoli, tomate, cítricos y frutos rojos.</td>
          <td class="p-3.5 text-red-900"><strong>Exceso de sal de mesa y condimentos industriales:</strong> Cubitos de caldo, sazonadores con glutamato y salsas comerciales (soya, ketchup).</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3.5 text-emerald-950"><strong>Granos integrales y legumbres:</strong> Avena, quinua, arroz integral, lentejas, frijoles y garbanzos.</td>
          <td class="p-3.5 text-red-900"><strong>Carnes procesadas y embutidos:</strong> Jamón, salchichas, mortadela, tocino, chorizo y carnes ahumadas o saladas.</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3.5 text-emerald-950"><strong>Proteínas magras y grasas buenas:</strong> Pescado rico en Omega-3, aves sin piel, frutos secos sin sal (nueces, almendras), semillas y aceite de oliva.</td>
          <td class="p-3.5 text-red-900"><strong>Enlatados, snacks y ultraprocesados:</strong> Sopas de sobre/vaso, papas fritas de funda, quesos muy salados, comida rápida, bollería y gaseosas.</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "info",
      "title": "El Equilibrio Sodio-Potasio en la Dieta DASH y el Apoyo con Bebida Andina SUMAK",
      "message": "Disminuir el sodio a menos de 1,500-2,000 mg/día mientras se incrementa el potasio natural de las verduras y frutas relaja las paredes arteriales. En el protocolo SUMAK, la Bebida Andina (Flor de Jamaica y Maíz Morado) y Vive-Oxi-100 (con Magnesio, Ajo y Toronjil) son los aliados ideales de la salud vascular."
    }
  }$json$::jsonb
where id = '5ec71707-a2c8-4914-a8ef-ecbeff2a02ce';


-- LECCIÓN 5.3: Diabetes Tipo 1, Tipo 2 y Gestacional (Dr. Miguel Loor y Dr. Luis Paredes)
update public.academy_lessons
set
  title = 'Diabetes Tipo 1, Tipo 2, Gestacional y Pancreatogénica: Órganos Diana y Manejo Integrativo (Dr. Miguel Loor)',
  description = 'Comparativa celular de Páncreas Sano vs. Diabético, función de la insulina, los 4 tipos de diabetes, los 4 órganos dañados, las 7 causas de Diabetes Tipo 2 y tabla de tratamiento médico vs. natural.',
  thumbnail_url = 'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 40,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1579684453423-f84349ef60b0?auto=format&fit=crop&w=1000&q=80" alt="Control Glucémico y Manejo Integrativo de la Diabetes Mellitus" />

  <h2>1. Comparativa Celular: Páncreas Sano vs. Páncreas Diabético y Rol de la Insulina</h2>
  <p>La <strong>insulina</strong> es la hormona producida por las células beta del páncreas que funciona como la "llave maestra" para abrir las células del cuerpo y permitir que la glucosa de la sangre entre y se transforme en energía.</p>

  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-5 rounded-2xl bg-[#EBF5EE] border-2 border-emerald-400">
      <span class="text-xs font-black uppercase tracking-widest bg-[#1A4E26] text-white px-3 py-1 rounded-full">Páncreas Sano</span>
      <h4 class="font-black text-[#12361B] mt-2 mb-1">Células Beta Normales → Insulina Eficaz → Glucosa Normal</h4>
      <p class="text-sm text-[#2D5A37] m-0">Las células beta pancreáticas detectan el azúcar tras comer, secretan la cantidad exacta de insulina, los receptores celulares se abren y la glucosa sanguínea se mantiene en rangos normales.</p>
    </div>
    <div class="p-5 rounded-2xl bg-rose-50 border-2 border-rose-400">
      <span class="text-xs font-black uppercase tracking-widest bg-rose-700 text-white px-3 py-1 rounded-full">Páncreas Diabético</span>
      <h4 class="font-black text-rose-950 mt-2 mb-1">Células Beta Dañadas / Resistencia → Exceso de Glucosa</h4>
      <p class="text-sm text-rose-900 m-0">Cuando las células beta están destruidas o agotadas, o las células del cuerpo tienen resistencia a la insulina, la glucosa no puede entrar a la célula y <strong>se acumula en exceso en la sangre (hiperglucemia)</strong> dañando los vasos sanguíneos.</p>
    </div>
  </div>

  <h2>2. Los 4 Tipos de Diabetes y los 4 Órganos Diana Dañados</h2>
  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <h4 class="font-black text-slate-900 m-0">Clasificación de los 4 Tipos de Diabetes</h4>
      <ol class="text-sm text-slate-700 mt-2 mb-0 space-y-1">
        <li><strong>Diabetes Tipo 1:</strong> Enfermedad autoinmune en la que el sistema inmunitario destruye las células beta del páncreas; no hay producción de insulina (requiere aplicación diaria de insulina).</li>
        <li><strong>Diabetes Tipo 2:</strong> La más frecuente (90%); combina <strong>resistencia a la insulina</strong> y disminución progresiva de su secreción, muy ligada al sobrepeso y estilo de vida.</li>
        <li><strong>Diabetes Gestacional:</strong> Elevación de la glucosa que aparece por primera vez durante el <strong>embarazo</strong> por acción de las hormonas placentarias.</li>
        <li><strong>Diabetes Pancreatogénica (Tipo 3c):</strong> Causada por daño directo al páncreas (pancreatitis crónica, cirugías o tumores pancreáticos).</li>
      </ol>
    </div>
    <div class="p-4 rounded-2xl bg-red-50/70 border border-red-200">
      <h4 class="font-black text-red-950 m-0">Los 4 Órganos Diana que Daña el Azúcar Alto</h4>
      <ol class="text-sm text-red-900 mt-2 mb-0 space-y-1">
        <li><strong>1. Riñones (Nefropatía diabética):</strong> Daña los glomérulos filtrantes y es la primera causa de insuficiencia renal crónica y diálisis.</li>
        <li><strong>2. Ojos (Retinopatía diabética):</strong> Lesiona los microvasos de la retina provocando visión borrosa, cataratas y riesgo de ceguera.</li>
        <li><strong>3. Nervios (Neuropatía diabética):</strong> Daña los nervios periféricos causando hormigueo, ardor o pérdida de sensibilidad en los pies (pie diabético).</li>
        <li><strong>4. Corazón y Arterias:</strong> Acelera infartos cardíacos, accidentes cerebrovasculares (ACV) y mala circulación.</li>
      </ol>
    </div>
  </div>

  <h2>3. Las 7 Causas de la Diabetes Tipo 2 y sus Síntomas Clásicos</h2>
  <p><strong>Las 7 Causas de Diabetes Tipo 2:</strong> 1) Consumo excesivo de azúcares refinados, dulces, gaseosas y harinas blancas, 2) Sobrepeso y obesidad abdominal, 3) Sedentarismo (falta de actividad física), 4) Estrés constante y mal dormir, 5) Antecedentes familiares y genética, 6) Desequilibrios hormonales (como SOP) y 7) Colesterol y triglicéridos elevados.</p>
  <p><strong>Síntomas de alerta:</strong> Sed constante e intensa (<strong>polidipsia</strong>), ganas frecuentes de orinar especialmente de noche (<strong>poliuria</strong>), cansancio y sueño después de comer, <strong>visión borrosa</strong>, hambre frecuente (polifagia), heridas que tardan en sanar y pérdida de peso involuntaria.</p>

  <h2>4. Tabla Comparativa: Tratamiento Médico vs. Tratamiento Natural Complementario</h2>
  <div class="overflow-x-auto border border-slate-200 rounded-2xl my-4">
    <table class="w-full text-left text-xs sm:text-sm">
      <thead class="bg-[#0F2E18] text-white font-bold">
        <tr>
          <th class="p-3.5 w-1/2">🏥 Tratamiento Médico Convencional (Dr. Miguel Loor)</th>
          <th class="p-3.5 w-1/2">🌿 Tratamiento Natural Complementario SUMAK (Dr. Luis Paredes)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr class="bg-white">
          <td class="p-3.5"><strong>1. Insulina:</strong> Indispensable en Diabetes Tipo 1 y en casos seleccionados de Tipo 2 o Gestacional.</td>
          <td class="p-3.5"><strong>1. Alimentación natural de bajo índice glucémico:</strong> Método del plato de 9 pulgadas, abundantes vegetales verdes y fibra soluble (nopal, chía, linaza).</td>
        </tr>
        <tr class="bg-[#F8FBF8]">
          <td class="p-3.5"><strong>2. Medicamentos orales:</strong> Hipoglucemiantes y sensibilizadores recetados por el médico (como metformina, entre otros).</td>
          <td class="p-3.5"><strong>2. Canela (preferir Ceilán):</strong> Sus polifenoles y cinamaldehído apoyan la sensibilidad de los receptores celulares a la insulina.</td>
        </tr>
        <tr class="bg-white">
          <td class="p-3.5"><strong>3. Dieta clínica, ejercicio prescrito y control con glucómetro:</strong> Medición periódica de glucosa capilar y hemoglobina glicosilada (HbA1c).</td>
          <td class="p-3.5"><strong>3. Moringa (<em>Moringa oleifera</em>) + Ejercicio y Control del Estrés:</strong> Aporte de antioxidantes, proteínas vegetales, cromo y magnesio (presentes en Moringa SUMAK, REGEN 24 y Té Extractos de la Vida).</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "warning",
      "title": "Sinergia Segura: Nunca Abandonar el Control Glucémico",
      "message": "El Dr. Miguel Loor y el Dr. Luis Paredes recalcan que el tratamiento natural (alimentación, Canela, Moringa, Nopal y fórmulas SUMAK sin azúcar como Colon Renova) trabaja en equipo con el control médico. Nunca suspenda la insulina ni sus medicamentos sin supervisión y mida su glucosa regularmente."
    }
  }$json$::jsonb
where id = '9881d181-81fc-46cd-be72-8369c1966706';


-- LECCIÓN 5.4a: El Color de los Alimentos (Infografía de los 5 Colores)
update public.academy_lessons
set
  title = 'El Color de los Alimentos: Infografía Cromática de los 5 Grupos, Fitonutrientes y Órganos que Protegen',
  description = 'Desglose completo de los 5 colores de los alimentos del Manual Académico (Morados, Blancos, Amarillos, Rojos y Verdes), sus vitaminas, minerales, antioxidantes y cada alimento específico.',
  thumbnail_url = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80" alt="Nutrición Cromática: El Color de los Alimentos" />

  <h2>1. La Farmacia Natural de los 5 Colores en tu Plato</h2>
  <p>El color natural de cada fruta, verdura y hortaliza refleja qué familia de <strong>fitoquímicos, vitaminas y antioxidantes</strong> predomina en su interior y qué órgano específico protege de manera prioritaria:</p>

  <div class="space-y-4 my-6">
    <!-- 1. MORADOS -->
    <div class="p-5 rounded-2xl bg-purple-50 border-2 border-purple-300 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-purple-800 text-white px-3 py-1 rounded-full">1. Color Morado / Azul</span>
        <span class="text-xs font-bold bg-purple-200 text-purple-950 px-3 py-1 rounded-full">🧠 FUNCIÓN CEREBRAL Y MEMORIA</span>
      </div>
      <p class="text-xs sm:text-sm text-purple-950 mt-2 mb-1"><strong>Nutrientes y Fitonutrientes Clave:</strong> <strong>Antocianinas, Fibra dietética, Vitamina C, Vitamina K y Polifenoles</strong> (como el resveratrol) que combaten el envejecimiento neuronal y oxidativo.</p>
      <p class="text-xs sm:text-sm text-purple-900 m-0"><strong>Alimentos Representativos del Manual:</strong> <strong>Berenjena, Cebolla morada, Uvas oscuras y Col morada</strong> (además de arándanos y maíz morado).</p>
    </div>

    <!-- 2. BLANCOS -->
    <div class="p-5 rounded-2xl bg-slate-50 border-2 border-slate-300 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-slate-700 text-white px-3 py-1 rounded-full">2. Color Blanco</span>
        <span class="text-xs font-bold bg-slate-200 text-slate-900 px-3 py-1 rounded-full">🦠 SALUD INTESTINAL Y MICROBIOTA</span>
      </div>
      <p class="text-xs sm:text-sm text-slate-900 mt-2 mb-1"><strong>Nutrientes y Fitonutrientes Clave:</strong> <strong>Fibra prebiótica (inulina), Vitamina C, Vitaminas del complejo B, Selenio, Potasio y Compuestos azufrados</strong>.</p>
      <p class="text-xs sm:text-sm text-slate-700 m-0"><strong>Alimentos Representativos del Manual:</strong> <strong>Ajo (rico en alicina), Cebolla perla, Coliflor, Pera y Champiñón (destacado por su aporte de proteína vegetal y selenio)</strong>.</p>
    </div>

    <!-- 3. AMARILLOS -->
    <div class="p-5 rounded-2xl bg-[#FEF6E9] border-2 border-amber-300 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-amber-600 text-white px-3 py-1 rounded-full">3. Color Amarillo / Naranja</span>
        <span class="text-xs font-bold bg-amber-200 text-amber-950 px-3 py-1 rounded-full">🛡️ SISTEMA INMUNITARIO Y DEFENSAS</span>
      </div>
      <p class="text-xs sm:text-sm text-[#5B3407] mt-2 mb-1"><strong>Nutrientes y Fitonutrientes Clave:</strong> <strong>Vitamina C, Carotenoides (betacarotenos), Potasio, Fibra, Manganeso y Vitaminas del grupo B</strong>.</p>
      <p class="text-xs sm:text-sm text-[#7C4C18] m-0"><strong>Alimentos Representativos del Manual:</strong> <strong>Limón, Maíz, Banano, Piña (rica en bromelina y manganeso) y Pimentón amarillo</strong>.</p>
    </div>

    <!-- 4. ROJOS -->
    <div class="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-rose-600 text-white px-3 py-1 rounded-full">4. Color Rojo</span>
        <span class="text-xs font-bold bg-rose-200 text-rose-950 px-3 py-1 rounded-full">❤️ SALUD DEL CORAZÓN Y CIRCULACIÓN</span>
      </div>
      <p class="text-xs sm:text-sm text-rose-950 mt-2 mb-1"><strong>Nutrientes y Fitonutrientes Clave:</strong> <strong>Licopeno, Antocianinas, Fibra, Vitamina C, Potasio y Folato (Ácido fólico)</strong>.</p>
      <p class="text-xs sm:text-sm text-rose-900 m-0"><strong>Alimentos Representativos del Manual:</strong> <strong>Tomate (fuente principal de licopeno), Frijoles rojos, Sandía, Cereza y Fresa</strong>.</p>
    </div>

    <!-- 5. VERDES -->
    <div class="p-5 rounded-2xl bg-[#EBF5EE] border-2 border-emerald-400 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-xs font-black uppercase tracking-widest bg-[#1A4E26] text-white px-3 py-1 rounded-full">5. Color Verde</span>
        <span class="text-xs font-bold bg-emerald-200 text-emerald-950 px-3 py-1 rounded-full">🌿 SALUD DEL HÍGADO Y DEPURACIÓN</span>
      </div>
      <p class="text-xs sm:text-sm text-[#12361B] mt-2 mb-1"><strong>Nutrientes y Fitonutrientes Clave:</strong> <strong>Fibra, Vitamina C, Vitamina K, Folato, Potasio, Carotenoides y Clorofila</strong>.</p>
      <p class="text-xs sm:text-sm text-[#2D5A37] m-0"><strong>Alimentos Representativos del Manual:</strong> <strong>Pepino, Brócoli, Aguacate (destacado por sus grasas monoinsaturadas saludables), Espinaca (rica en hierro vegetal y folato) y Kiwi</strong>.</p>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "clinical_callout": {
      "severity": "info",
      "title": "Regla Práctica del Arcoíris Nutricional SUMAK",
      "message": "Procure incluir al menos 3 colores distintos de vegetales y frutas en cada comida principal. Cuanto más variado sea el color natural de su plato, más completa será la sinergia de polifenoles, carotenoides y minerales que protegerán su cerebro, intestino, defensas, corazón e hígado."
    }
  }$json$::jsonb
where id = 'dd788ec9-4eb0-4c6d-b7f5-94cde0d0860f';


-- LECCIÓN 5.4b: Recetas Magistrales: Desayuno Saludable para Limpiar Colon/Estómago e Infusión de Vitalidad
update public.academy_lessons
set
  title = 'Recetas Magistrales: Desayuno Saludable para Limpiar Colon y Estómago + Infusión de Bienestar y Vitalidad',
  description = 'Desglose fitoquímico profundo de la Zanahoria (falcarinol), Beterraba (betalaínas y nitratos), Canela y Uvas/Arándanos (resveratrol), y las 2 recetas paso a paso del Módulo 10.',
  thumbnail_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
  estimated_minutes = 35,
  text_content = $html$
<div class="space-y-6">
  <img src="https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=1000&q=80" alt="Desayuno Funcional para Limpiar el Colon y el Estómago" />

  <h2>1. Análisis Fitoquímico de los 4 Ingredientes Base del Desayuno Limpiador</h2>
  <p>El <strong>Desayuno Saludable para Limpiar el Colon y el Estómago</strong> formulado en el Manual Académico combina 4 ingredientes cuyos compuestos bioactivos reparan el epitelio digestivo, mejoran la circulación y barren residuos intestinales:</p>

  <div class="grid sm:grid-cols-2 gap-4 my-4">
    <div class="p-4 rounded-2xl bg-[#FEF6E9] border border-amber-200">
      <h4 class="font-black text-[#5B3407] m-0">1. Zanahoria (<em>Daucus carota</em>)</h4>
      <p class="text-xs sm:text-sm text-[#7C4C18] mt-1.5 mb-0">Rica en <strong>betacarotenos (provitamina A)</strong> esenciales para regenerar las mucosas del estómago e intestino, fibra soluble prebiótica y compuestos poliacetilénicos únicos como el <strong>falcarinol y el falcarindiol</strong>, estudiados por su acción citoprotectora y antiinflamatoria en el colon.</p>
    </div>

    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200">
      <h4 class="font-black text-rose-950 m-0">2. Beterraba / Remolacha (<em>Beta vulgaris</em>)</h4>
      <p class="text-xs sm:text-sm text-rose-900 mt-1.5 mb-0">Aporta <strong>betalaínas (betanina)</strong> con potente efecto antioxidante y depurativo hepático, <strong>nitratos naturales</strong> (que en el cuerpo se transforman en óxido nítrico dilatando los vasos sanguíneos y mejorando la presión arterial) y un alto contenido de <strong>ácido fólico (folato)</strong> y fibra.</p>
    </div>

    <div class="p-4 rounded-2xl bg-[#FBF4E8] border border-amber-300">
      <h4 class="font-black text-[#4D3A13] m-0">3. Canela (<em>Cinnamomum verum</em>)</h4>
      <p class="text-xs sm:text-sm text-[#6E5421] mt-1.5 mb-0">Sus aceites esenciales ricos en <strong>cinamaldehído y eugenol</strong> reducen la fermentación y los gases intestinales, combaten espasmos digestivos y ayudan a modular la respuesta glucémica del desayuno.</p>
    </div>

    <div class="p-4 rounded-2xl bg-purple-50 border border-purple-200">
      <div class="flex items-center gap-2"><img src="/ingredientes/uva.png" alt="Uvas y Arándanos" class="w-8 h-8 object-contain !my-0" /><h4 class="font-black text-purple-950 m-0">4. Uvas Rojas o Arándanos</h4></div>
      <p class="text-xs sm:text-sm text-purple-900 mt-1.5 mb-0">Concentran <strong>resveratrol y antocianinas</strong>, polifenoles de élite que protegen la microcirculación, reducen la inflamación de la pared colónica y nutren las bacterias benéficas de la microbiota.</p>
    </div>
  </div>
</div>
$html$,
  metadata = $json${
    "recipe_cards": [
      {
        "title": "Receta Magistral 1: Desayuno Saludable para Limpiar el Colon y el Estómago",
        "image_url": "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80",
        "prep_time": "8 minutos",
        "servings": "1 vaso grande (1 porción)",
        "benefits": ["Aporta falcarinol, betalaínas y resveratrol", "Limpia el colon sin irritar el estómago", "Mejora la circulación"],
        "posology": "Tomar recién licuado en ayunas o como primera bebida de la mañana, sin colar para aprovechar toda la fibra prebiótica.",
        "ingredients": [
          {"name": "Zanahoria mediana bien lavada", "dose": "1 unidad", "notes": "Betacarotenos y falcarinol"},
          {"name": "Beterraba (remolacha) pequeña", "dose": "1/2 unidad", "notes": "Betalaínas y nitratos naturales"},
          {"name": "Uvas rojas o arándanos frescos", "dose": "1/2 taza", "notes": "Resveratrol y antocianinas", "image_url": "/ingredientes/uva.png"},
          {"name": "Canela en polvo", "dose": "1/2 cucharadita", "notes": "Cinamaldehído y eugenol"},
          {"name": "Agua potable o agua de coco natural", "dose": "1 vaso (250 ml)", "notes": "Hidratación celular", "image_url": "/ingredientes/coco.png"},
          {"name": "Jugo de limón (opcional) + Chía hidratada (opcional)", "dose": "Jugo de 1/2 limón + 1 cda chía", "notes": "Refuerzo de fibra y vitamina C", "image_url": "/ingredientes/chia.png"}
        ],
        "steps": [
          "Lavar, pelar ligeramente y cortar en trozos la zanahoria mediana y la media beterraba pequeña.",
          "Lavar muy bien la media taza de uvas rojas o arándanos frescos.",
          "Colocar la zanahoria, la beterraba y las uvas/arándanos en el vaso de la licuadora junto con el vaso de agua potable (o agua de coco).",
          "Añadir la 1/2 cucharadita de canela en polvo y el jugo de 1/2 limón opcional.",
          "Licuar a máxima velocidad hasta obtener un batido uniforme y suave.",
          "Si desea mayor arrastre de fibra en el colon, incorporar 1 cucharada de semillas de chía previamente hidratadas en agua y tomar en ayunas sin colar."
        ]
      },
      {
        "title": "Receta Magistral 2: Infusión de Bienestar y Vitalidad (1 Litro)",
        "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
        "prep_time": "15 a 18 minutos",
        "servings": "1 Litro (3 a 4 tazas)",
        "benefits": ["Antiinflamatoria sistémica", "Digestiva y carminativa", "Refuerza defensas y energía"],
        "posology": "Beber tibia a lo largo de la mañana o después de las comidas. En pacientes con diabetes, omitir por completo la miel.",
        "ingredients": [
          {"name": "Agua potable", "dose": "1 litro", "notes": "Base de la infusión"},
          {"name": "Jengibre fresco en rodajas", "dose": "1 trozo pequeño (2-3 cm)", "notes": "Gingeroles activos", "image_url": "/ingredientes/jengibre.png"},
          {"name": "Canela en rama", "dose": "1 rama", "notes": "Preferir Ceilán"},
          {"name": "Cúrcuma en polvo (o raíz rallada)", "dose": "1 cucharadita", "notes": "Curcuminoides", "image_url": "/ingredientes/curcuma.png"},
          {"name": "Hojas frescas de hierbabuena o menta", "dose": "5 hojas", "notes": "Digestiva y refrescante", "image_url": "/ingredientes/menta.png"},
          {"name": "Flores secas de manzanilla", "dose": "1 cucharadita", "notes": "Suavizante gástrica", "image_url": "/ingredientes/manzanilla.png"},
          {"name": "Jugo de limón + Miel de abeja (opcional)", "dose": "Jugo de 1/2 limón + 1 cdta miel", "notes": "Omitir miel en diabetes", "image_url": "/ingredientes/limon.png"}
        ],
        "steps": [
          "Paso 1: Poner a calentar 1 litro de agua potable en una olla hasta que comience a hervir.",
          "Paso 2: Agregar el trozo pequeño de jengibre fresco laminado, la rama de canela y la cucharadita de cúrcuma.",
          "Paso 3: Dejar hervir a fuego bajo durante 5 a 8 minutos para extraer los principios activos de las raíces y la corteza.",
          "Paso 4: Apagar el fuego e incorporar inmediatamente las 5 hojas de hierbabuena (o menta) y la cucharadita de manzanilla seca.",
          "Paso 5: Tapar la olla y dejar reposar en infusión durante 10 minutos.",
          "Paso 6: Colar la preparación y añadir el jugo de 1/2 limón cuando la bebida esté tibia.",
          "Paso 7: Endulzar opcionalmente con 1 cucharadita de miel de abeja pura (solo si no padece diabetes) y servir."
        ]
      }
    ]
  }$json$::jsonb
where id = '8c1a357e-e376-433c-bd71-cbe207ddec87';


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. VINCULACIÓN EXHAUSTIVA DE FICHAS BOTÁNICAS Y PRODUCTOS A LAS LECCIONES
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_bot_id uuid;
begin
  -- Limpiar vínculos botánicos previos de las lecciones de los cursos 3 a 7 para reinsertar las 24 fichas individuales limpias
  delete from public.academy_lesson_botanicals
  where lesson_id in (
    '31411584-fffc-4fc1-ad08-64fae16c4374', 'f64b8c57-b5af-445a-a342-ba5930e9c5e9', '8dea6ca4-25b0-4b89-a29a-a4cf121d4548',
    '41fd00a2-7d61-4e98-ab13-a7e68aef8f91', 'b359f3f3-89df-4f7c-84ea-9859efb1dadd', '86bcaf28-5b54-4d32-a10a-92174a2faec2', 'c6cc4eff-9aa8-4547-a669-70fa42e98ca8',
    'b7425296-d7b3-4c6b-a8a6-3effc945d828', '4b33ceae-d7bd-4824-8e5e-837c8fab3ab5', 'b34a97de-eaaf-4f8b-bdac-f2f547f2f849', 'd4d7cadc-6239-44f9-80c0-cf1a74c12669', '1a25f857-f006-4e8c-ae68-8f66b8fa6237',
    'c16c01dd-6e14-47e3-88e8-5be5220f3a0b', '4cb417b3-0e09-4620-931d-a9fa8521395d', '5f609d0b-1c5c-4cbb-a511-a2eb02222795',
    'e31e7546-e0b6-4ea3-8a39-5068576c6e34', '5ec71707-a2c8-4914-a8ef-ecbeff2a02ce', '9881d181-81fc-46cd-be72-8369c1966706', 'dd788ec9-4eb0-4c6d-b7f5-94cde0d0860f', '8c1a357e-e376-433c-bd71-cbe207ddec87'
  );

  -- Lección 1.3 (Urinario): Pelo de choclo, Chancapiedra, Cola de caballo, Canela
  for v_bot_id in select id from public.academy_botanical_sheets where slug in ('pelo-de-choclo', 'chancapiedra', 'cola-de-caballo', 'canela-ceilan') loop
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values ('8dea6ca4-25b0-4b89-a29a-a4cf121d4548', v_bot_id, 'Confort urogenital, apoyo diurético suave y sinergia en Madre Silvestre', 1)
    on conflict (lesson_id, botanical_id) do nothing;
  end loop;

  -- Lección 2.4 (Hígado Graso): Nopal, Apio, Perejil, Canela
  for v_bot_id in select id from public.academy_botanical_sheets where slug in ('nopal-opuntia', 'apio-graveolens', 'perejil-crispum', 'canela-ceilan') loop
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values ('c6cc4eff-9aa8-4547-a669-70fa42e98ca8', v_bot_id, 'Ingrediente activo del Licuado Natural para el Hígado Graso', 1)
    on conflict (lesson_id, botanical_id) do nothing;
  end loop;

  -- Lección 3.1 y 3.4a/3.4b (Gastritis / Digestivo): Sábila, Manzanilla, Linaza, Malva blanca
  for v_bot_id in select id from public.academy_botanical_sheets where slug in ('sabila-aloe-vera', 'manzanilla-matricaria', 'linaza-usitatissimum', 'malva-blanca') loop
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values
      ('d4d7cadc-6239-44f9-80c0-cf1a74c12669', v_bot_id, 'Protección demulcente de la mucosa gástrica y colónica', 1),
      ('1a25f857-f006-4e8c-ae68-8f66b8fa6237', v_bot_id, 'Reparación epitelial y regulación suave del tránsito intestinal', 1)
    on conflict (lesson_id, botanical_id) do nothing;
  end loop;

  -- Lección 4.1 (Módulo 6 - Parte 1: Las 5 plantas de vigilancia toxicológica)
  for v_bot_id in select id from public.academy_botanical_sheets where slug in ('mala-madre-kalanchoe', 'ruda-graveolens', 'noni', 'sabila-aloe-vera', 'canela-ceilan') loop
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values ('c16c01dd-6e14-47e3-88e8-5be5220f3a0b', v_bot_id, 'Ficha oficial del Módulo 6: Botánica y Toxicología Crítica', 1)
    on conflict (lesson_id, botanical_id) do nothing;
  end loop;

  -- Lección 4.2 (Módulo 6 - Parte 2: Las 6 plantas funcionales y el trío verde)
  for v_bot_id in select id from public.academy_botanical_sheets where slug in ('nopal-opuntia', 'chia-salvia', 'pepino-cucumis', 'apio-graveolens', 'perejil-crispum', 'romero-salvia') loop
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values ('4cb417b3-0e09-4620-931d-a9fa8521395d', v_bot_id, 'Ficha oficial del Módulo 6: Interacciones con fármacos y Vitamina K', 1)
    on conflict (lesson_id, botanical_id) do nothing;
  end loop;

  -- Lección 4.3 (Módulo 7: Las 10 Infusiones Tradicionales completas)
  for v_bot_id in select id from public.academy_botanical_sheets where slug in (
    'manzanilla-matricaria', 'oregano-vulgare', 'menta-piperita', 'canela-ceilan', 'clavo-de-olor',
    'linaza-usitatissimum', 'lavanda-angustifolia', 'malva-blanca', 'cola-de-caballo', 'pelo-de-choclo'
  ) loop
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values ('5f609d0b-1c5c-4cbb-a511-a2eb02222795', v_bot_id, 'Ficha oficial de las 10 Infusiones Tradicionales del Módulo 7', 1)
    on conflict (lesson_id, botanical_id) do nothing;
  end loop;

  -- Lección 5.3 y 5.4b (Diabetes y Recetas Metabólicas): Canela, Nopal, Chía, Manzanilla, Menta
  for v_bot_id in select id from public.academy_botanical_sheets where slug in ('canela-ceilan', 'nopal-opuntia', 'chia-salvia', 'manzanilla-matricaria', 'menta-piperita') loop
    insert into public.academy_lesson_botanicals (lesson_id, botanical_id, clinical_role, sort_order)
    values
      ('9881d181-81fc-46cd-be72-8369c1966706', v_bot_id, 'Apoyo metabólico complementario en sensibilidad a la insulina y fibra soluble', 1),
      ('8c1a357e-e376-433c-bd71-cbe207ddec87', v_bot_id, 'Componente bioactivo del Desayuno Saludable y la Infusión de Vitalidad', 1)
    on conflict (lesson_id, botanical_id) do nothing;
  end loop;
end $$;
