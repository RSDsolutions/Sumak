-- =============================================================================
-- MIGRATION: Limpieza de cursos legacy y saneamiento del catálogo oficial SUMAK
-- =============================================================================

-- 1. Eliminar referencias restrictivas en academy_diploma_issuances de cursos de prueba
delete from public.academy_diploma_issuances
where course_id in (
  select id from public.academy_courses
  where slug in (
    'test',
    'test-2',
    'curso-dev',
    'bases-fisiologicas-y-prevencion-renal',
    'sumak-salud-y-bienestar',
    'afiliarse-a-sumak',
    'introduccion-a-sumak',
    'escalar-en-sumak',
    'tomar-las-riendas-de-sumak'
  )
);

-- 2. Eliminar cursos legacy/prueba de academy_courses (cascade elimina módulos, lecciones, evaluaciones, inscripciones y progreso asociados)
delete from public.academy_courses
where slug in (
  'test',
  'test-2',
  'curso-dev',
  'bases-fisiologicas-y-prevencion-renal',
  'sumak-salud-y-bienestar',
  'afiliarse-a-sumak',
  'introduccion-a-sumak',
  'escalar-en-sumak',
  'tomar-las-riendas-de-sumak'
);

-- 3. Eliminar programas draft/prueba antiguos de academy_programs
delete from public.academy_programs
where slug in (
  'ts',
  'p',
  's',
  'especializacion-en-salud-renal-y-terapia-botanica-andina'
);

-- 4. Eliminar categorías dummy/prueba de academy_categories
delete from public.academy_categories
where slug in (
  'test',
  '1',
  'categoria-de-demostracion',
  'sumak-curso-de-demostracion'
);

-- 5. Asegurar que los 7 cursos del catálogo oficial tengan status 'published', access_mode 'public' y sort_order secuencial
update public.academy_courses
set
  status = 'published',
  access_mode = 'public',
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

-- 6. Actualizar RLS policies para que cualquier usuario (autenticado o visitante) pueda explorar el catálogo de cursos publicados
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

-- 7. Actualizar RLS policies para programas oficiales y sus cursos asociados
update public.academy_programs
set access_mode = 'public'
where slug = 'especializacion-salud-renal-sumak';

drop policy if exists "Programas: lectura según publicación" on public.academy_programs;
create policy "Programas: lectura según publicación" on public.academy_programs
  for select using (
    public.is_academy_staff()
    or status = 'published'
  );

drop policy if exists "Programa cursos: lectura con programa" on public.academy_program_courses;
create policy "Programa cursos: lectura con programa" on public.academy_program_courses
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_programs p
      where p.id = program_id
        and p.status = 'published'
    )
  );

