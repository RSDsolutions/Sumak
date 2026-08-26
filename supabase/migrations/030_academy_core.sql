-- ============================================================
-- SUMAK — Migration 030 — Academia SUMAK: Core Schema
-- ============================================================
-- Crea el módulo completo de Academia SUMAK dentro del ecosistema
-- existente. Todas las tablas usan prefijo academy_ para evitar
-- colisiones con las tablas MLM existentes.
--
-- Reutiliza:
--   - auth.users como fuente de identidad
--   - profiles existentes (no duplica datos personales)
--   - is_admin() existente como base de is_academy_admin()
--   - set_updated_at() trigger existente (patrón reutilizado)
--
-- NO modifica:
--   - profiles.rol (el sistema de roles MLM permanece intacto)
--   - Ninguna tabla existente
--   - Ninguna política RLS existente
--
-- Idempotente (usa IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. EXTENSIÓN pgcrypto (para gen_random_bytes)
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 1. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Reutilizable trigger para updated_at en tablas de academia
create or replace function public.academy_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Verifica si el usuario autenticado es admin de academia.
-- Un admin de SUMAK (profiles.rol = 'admin') es automáticamente
-- academy_admin. Alternativamente, un usuario puede tener el rol
-- 'academy_admin' en academy_roles.
create or replace function public.is_academy_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return (
    -- Admin global de SUMAK
    public.is_admin()
    or
    -- Rol específico de academia
    exists (
      select 1 from public.academy_roles
      where user_id = auth.uid()
        and role = 'academy_admin'
        and revoked_at is null
    )
  );
end;
$$;

-- Verifica si el usuario autenticado es instructor.
create or replace function public.is_academy_instructor()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from public.academy_roles
    where user_id = auth.uid()
      and role = 'instructor'
      and revoked_at is null
  );
end;
$$;

-- Verifica si el usuario autenticado es admin o instructor de academia.
create or replace function public.is_academy_staff()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return (
    public.is_academy_admin()
    or
    public.is_academy_instructor()
  );
end;
$$;

-- Verifica si el usuario autenticado tiene acceso a un curso específico.
-- Evalúa: modalidad del curso + inscripción + rol del usuario.
create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_mode text;
  v_instructor_id uuid;
begin
  -- Staff siempre tiene acceso
  if public.is_academy_staff() then
    return true;
  end if;

  select access_mode, instructor_id
    into v_mode, v_instructor_id
    from public.academy_courses
    where id = p_course_id;

  if not found then
    return false;
  end if;

  -- Instructor del curso siempre tiene acceso
  if v_instructor_id = auth.uid() then
    return true;
  end if;

  case v_mode
    when 'public' then
      return true;
    when 'free_registered' then
      return auth.uid() is not null;
    when 'sumak_exclusive' then
      -- Solo usuarios con profile (distribuidores activos)
      return exists (
        select 1 from public.profiles
        where id = auth.uid()
          and estado = 'activo'
      );
    when 'premium', 'assigned' then
      -- Requiere inscripción activa
      return exists (
        select 1 from public.academy_enrollments
        where user_id = auth.uid()
          and course_id = p_course_id
          and status = 'active'
      );
    when 'hidden' then
      return false; -- solo staff (ya resuelto arriba)
    else
      return false;
  end case;
end;
$$;

-- Permisos de funciones helper
revoke all on function public.is_academy_admin() from public;
grant execute on function public.is_academy_admin() to authenticated;

revoke all on function public.is_academy_instructor() from public;
grant execute on function public.is_academy_instructor() to authenticated;

revoke all on function public.is_academy_staff() from public;
grant execute on function public.is_academy_staff() to authenticated;

revoke all on function public.has_course_access(uuid) from public;
grant execute on function public.has_course_access(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: academy_roles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'instructor', 'academy_admin')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Solo un rol activo de cada tipo por usuario
create unique index if not exists academy_roles_active_unique
  on public.academy_roles (user_id, role)
  where revoked_at is null;

create index if not exists academy_roles_user_id_idx
  on public.academy_roles (user_id);

alter table public.academy_roles enable row level security;

drop policy if exists "Roles: usuario lee los suyos" on public.academy_roles;
create policy "Roles: usuario lee los suyos" on public.academy_roles
  for select using (user_id = auth.uid() or public.is_academy_admin());

drop policy if exists "Roles: admin gestiona" on public.academy_roles;
create policy "Roles: admin gestiona" on public.academy_roles
  for all using (public.is_academy_admin())
  with check (public.is_academy_admin());

comment on table public.academy_roles is
  'Roles académicos independientes del sistema MLM. Un usuario puede ser student, instructor y/o academy_admin simultáneamente.';

-- ─────────────────────────────────────────────────────────────
-- 3. TABLA: academy_categories
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon_name text,              -- nombre del ícono de lucide-react
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_categories_slug_idx
  on public.academy_categories (slug);

drop trigger if exists academy_categories_updated_at on public.academy_categories;
create trigger academy_categories_updated_at
  before update on public.academy_categories
  for each row execute function public.academy_set_updated_at();

alter table public.academy_categories enable row level security;

drop policy if exists "Categorías: lectura pública" on public.academy_categories;
create policy "Categorías: lectura pública" on public.academy_categories
  for select using (true);

drop policy if exists "Categorías: admin gestiona" on public.academy_categories;
create policy "Categorías: admin gestiona" on public.academy_categories
  for all using (public.is_academy_admin())
  with check (public.is_academy_admin());

-- ─────────────────────────────────────────────────────────────
-- 4. TABLA: academy_courses
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  short_description text,            -- para cards
  cover_image_url text,
  instructor_id uuid references auth.users(id) on delete set null,
  category_id uuid references public.academy_categories(id) on delete set null,
  level text not null default 'all'
    check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  estimated_duration_minutes int,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  access_mode text not null default 'free_registered'
    check (access_mode in (
      'public', 'free_registered', 'sumak_exclusive',
      'premium', 'assigned', 'hidden'
    )),
  prerequisites text,               -- texto descriptivo
  passing_percentage numeric(5,2) not null default 70.00
    check (passing_percentage >= 0 and passing_percentage <= 100),
  generates_certificate boolean not null default false,
  diploma_type_id uuid,              -- FK se agrega después (referencia circular)
  published_at timestamptz,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_courses_slug_idx
  on public.academy_courses (slug);
create index if not exists academy_courses_status_idx
  on public.academy_courses (status) where status = 'published';
create index if not exists academy_courses_category_idx
  on public.academy_courses (category_id);
create index if not exists academy_courses_instructor_idx
  on public.academy_courses (instructor_id);
create index if not exists academy_courses_access_mode_idx
  on public.academy_courses (access_mode);

drop trigger if exists academy_courses_updated_at on public.academy_courses;
create trigger academy_courses_updated_at
  before update on public.academy_courses
  for each row execute function public.academy_set_updated_at();

alter table public.academy_courses enable row level security;

-- Cursos publicados son visibles según access_mode; drafts solo staff
drop policy if exists "Cursos: lectura según acceso" on public.academy_courses;
create policy "Cursos: lectura según acceso" on public.academy_courses
  for select using (
    public.is_academy_staff()
    or (status = 'published' and access_mode = 'public')
    or (status = 'published' and auth.uid() is not null)
  );

drop policy if exists "Cursos: staff gestiona" on public.academy_courses;
create policy "Cursos: staff gestiona" on public.academy_courses
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 5. TABLA: academy_modules
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_modules_course_idx
  on public.academy_modules (course_id);

drop trigger if exists academy_modules_updated_at on public.academy_modules;
create trigger academy_modules_updated_at
  before update on public.academy_modules
  for each row execute function public.academy_set_updated_at();

alter table public.academy_modules enable row level security;

drop policy if exists "Módulos: lectura con acceso al curso" on public.academy_modules;
create policy "Módulos: lectura con acceso al curso" on public.academy_modules
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_courses c
      where c.id = course_id
        and c.status = 'published'
        and (c.access_mode = 'public' or auth.uid() is not null)
    )
  );

drop policy if exists "Módulos: staff gestiona" on public.academy_modules;
create policy "Módulos: staff gestiona" on public.academy_modules
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 6. TABLA: academy_lessons
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  title text not null,
  description text,
  content_type text not null default 'video'
    check (content_type in (
      'video', 'text', 'pdf', 'presentation', 'image',
      'external_link', 'assessment', 'mixed'
    )),
  -- Contenido textual (para type=text o mixed)
  text_content text,
  -- Abstracción de video (proveedor-agnóstico)
  video_provider text
    check (video_provider is null or video_provider in (
      'youtube', 'vimeo', 'cloudflare', 'mux', 'bunny', 'custom'
    )),
  video_external_id text,
  video_url text,
  thumbnail_url text,
  duration_seconds int,
  -- Contenido archivo (PDF, presentación, imagen)
  file_url text,
  file_name text,
  -- Enlace externo
  external_url text,
  -- Evaluación asociada
  assessment_id uuid,               -- FK se agrega después
  -- Orden y estado
  sort_order int not null default 0,
  is_published boolean not null default true,
  is_free_preview boolean not null default false,  -- visible sin inscripción
  estimated_minutes int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_lessons_module_idx
  on public.academy_lessons (module_id);

drop trigger if exists academy_lessons_updated_at on public.academy_lessons;
create trigger academy_lessons_updated_at
  before update on public.academy_lessons
  for each row execute function public.academy_set_updated_at();

alter table public.academy_lessons enable row level security;

drop policy if exists "Lecciones: lectura según acceso" on public.academy_lessons;
create policy "Lecciones: lectura según acceso" on public.academy_lessons
  for select using (
    public.is_academy_staff()
    or is_free_preview
    or exists (
      select 1 from public.academy_modules m
      join public.academy_courses c on c.id = m.course_id
      where m.id = module_id
        and c.status = 'published'
        and public.has_course_access(c.id)
    )
  );

drop policy if exists "Lecciones: staff gestiona" on public.academy_lessons;
create policy "Lecciones: staff gestiona" on public.academy_lessons
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 7. TABLA: academy_resources
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  file_name text,
  file_type text,                    -- 'pdf', 'doc', 'xlsx', etc.
  file_size_bytes bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists academy_resources_lesson_idx
  on public.academy_resources (lesson_id);

alter table public.academy_resources enable row level security;

drop policy if exists "Recursos: lectura con acceso a lección" on public.academy_resources;
create policy "Recursos: lectura con acceso a lección" on public.academy_resources
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_lessons l
      join public.academy_modules m on m.id = l.module_id
      join public.academy_courses c on c.id = m.course_id
      where l.id = lesson_id
        and c.status = 'published'
        and public.has_course_access(c.id)
    )
  );

drop policy if exists "Recursos: staff gestiona" on public.academy_resources;
create policy "Recursos: staff gestiona" on public.academy_resources
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 8. TABLA: academy_live_sessions (Biblioteca de Videoconferencias)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  session_date timestamptz,
  instructor_id uuid references auth.users(id) on delete set null,
  category_id uuid references public.academy_categories(id) on delete set null,
  -- Video (misma abstracción de proveedor)
  video_provider text
    check (video_provider is null or video_provider in (
      'youtube', 'vimeo', 'cloudflare', 'mux', 'bunny', 'custom'
    )),
  video_external_id text,
  video_url text,
  thumbnail_url text,
  duration_seconds int,
  -- Relación opcional con curso
  course_id uuid references public.academy_courses(id) on delete set null,
  -- Estado y acceso
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  access_mode text not null default 'free_registered'
    check (access_mode in (
      'public', 'free_registered', 'sumak_exclusive',
      'premium', 'assigned', 'hidden'
    )),
  -- Metadata
  tags text[] default '{}',
  view_count int not null default 0,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_live_sessions_status_idx
  on public.academy_live_sessions (status) where status = 'published';
create index if not exists academy_live_sessions_category_idx
  on public.academy_live_sessions (category_id);
create index if not exists academy_live_sessions_date_idx
  on public.academy_live_sessions (session_date desc);
create index if not exists academy_live_sessions_course_idx
  on public.academy_live_sessions (course_id);

drop trigger if exists academy_live_sessions_updated_at on public.academy_live_sessions;
create trigger academy_live_sessions_updated_at
  before update on public.academy_live_sessions
  for each row execute function public.academy_set_updated_at();

alter table public.academy_live_sessions enable row level security;

drop policy if exists "Lives: lectura según acceso" on public.academy_live_sessions;
create policy "Lives: lectura según acceso" on public.academy_live_sessions
  for select using (
    public.is_academy_staff()
    or (status = 'published' and access_mode = 'public')
    or (status = 'published' and auth.uid() is not null)
  );

drop policy if exists "Lives: staff gestiona" on public.academy_live_sessions;
create policy "Lives: staff gestiona" on public.academy_live_sessions
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 9. TABLA: academy_enrollments
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'completed', 'dropped', 'suspended')),
  progress_percentage numeric(5,2) not null default 0
    check (progress_percentage >= 0 and progress_percentage <= 100),
  enrolled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un usuario solo puede tener una inscripción activa por curso
  unique(user_id, course_id)
);

create index if not exists academy_enrollments_user_idx
  on public.academy_enrollments (user_id);
create index if not exists academy_enrollments_course_idx
  on public.academy_enrollments (course_id);
create index if not exists academy_enrollments_status_idx
  on public.academy_enrollments (status) where status = 'active';

drop trigger if exists academy_enrollments_updated_at on public.academy_enrollments;
create trigger academy_enrollments_updated_at
  before update on public.academy_enrollments
  for each row execute function public.academy_set_updated_at();

alter table public.academy_enrollments enable row level security;

drop policy if exists "Inscripciones: usuario lee las suyas" on public.academy_enrollments;
create policy "Inscripciones: usuario lee las suyas" on public.academy_enrollments
  for select using (user_id = auth.uid() or public.is_academy_staff());

drop policy if exists "Inscripciones: usuario se inscribe" on public.academy_enrollments;
create policy "Inscripciones: usuario se inscribe" on public.academy_enrollments
  for insert with check (
    user_id = auth.uid()
    and public.has_course_access(course_id)
  );

drop policy if exists "Inscripciones: solo staff actualiza" on public.academy_enrollments;
create policy "Inscripciones: solo staff actualiza" on public.academy_enrollments
  for update using (
    -- El usuario puede actualizar last_accessed_at de su propia inscripción
    user_id = auth.uid()
    or public.is_academy_staff()
  );

drop policy if exists "Inscripciones: staff gestiona" on public.academy_enrollments;
create policy "Inscripciones: staff gestiona" on public.academy_enrollments
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 10. TABLA: academy_progress
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  progress_percentage numeric(5,2) not null default 0
    check (progress_percentage >= 0 and progress_percentage <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  last_accessed_at timestamptz default now(),
  -- Tiempo de reproducción de video (cuando sea técnicamente posible)
  playback_seconds int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un progreso por lección por usuario
  unique(user_id, lesson_id)
);

create index if not exists academy_progress_user_idx
  on public.academy_progress (user_id);
create index if not exists academy_progress_lesson_idx
  on public.academy_progress (lesson_id);
create index if not exists academy_progress_course_idx
  on public.academy_progress (course_id);
create index if not exists academy_progress_user_course_idx
  on public.academy_progress (user_id, course_id);

drop trigger if exists academy_progress_updated_at on public.academy_progress;
create trigger academy_progress_updated_at
  before update on public.academy_progress
  for each row execute function public.academy_set_updated_at();

alter table public.academy_progress enable row level security;

drop policy if exists "Progreso: usuario lee el suyo" on public.academy_progress;
create policy "Progreso: usuario lee el suyo" on public.academy_progress
  for select using (user_id = auth.uid() or public.is_academy_staff());

-- El usuario puede crear/actualizar su propio progreso,
-- pero solo para cursos donde tiene acceso.
drop policy if exists "Progreso: usuario registra el suyo" on public.academy_progress;
create policy "Progreso: usuario registra el suyo" on public.academy_progress
  for insert with check (
    user_id = auth.uid()
    and public.has_course_access(course_id)
  );

drop policy if exists "Progreso: usuario actualiza el suyo" on public.academy_progress;
create policy "Progreso: usuario actualiza el suyo" on public.academy_progress
  for update using (user_id = auth.uid());

drop policy if exists "Progreso: staff gestiona" on public.academy_progress;
create policy "Progreso: staff gestiona" on public.academy_progress
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 11. TABLA: academy_assessments
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  module_id uuid references public.academy_modules(id) on delete set null,
  title text not null,
  description text,
  -- Configuración
  total_points numeric(8,2) not null default 100,
  passing_score numeric(5,2) not null default 70
    check (passing_score >= 0 and passing_score <= 100),
  max_attempts int,                  -- NULL = ilimitados
  time_limit_minutes int,            -- NULL = sin límite
  randomize_questions boolean not null default false,
  show_results boolean not null default true,
  is_final_exam boolean not null default false,
  -- Disponibilidad
  available_from timestamptz,
  available_until timestamptz,
  -- Estado
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_assessments_course_idx
  on public.academy_assessments (course_id);
create index if not exists academy_assessments_module_idx
  on public.academy_assessments (module_id);

drop trigger if exists academy_assessments_updated_at on public.academy_assessments;
create trigger academy_assessments_updated_at
  before update on public.academy_assessments
  for each row execute function public.academy_set_updated_at();

alter table public.academy_assessments enable row level security;

drop policy if exists "Evaluaciones: lectura con acceso" on public.academy_assessments;
create policy "Evaluaciones: lectura con acceso" on public.academy_assessments
  for select using (
    public.is_academy_staff()
    or (is_published and public.has_course_access(course_id))
  );

drop policy if exists "Evaluaciones: staff gestiona" on public.academy_assessments;
create policy "Evaluaciones: staff gestiona" on public.academy_assessments
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- Agregar FK de lessons.assessment_id ahora que assessments existe
alter table public.academy_lessons
  drop constraint if exists academy_lessons_assessment_fk;
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'academy_lessons_assessment_fk'
  ) then
    alter table public.academy_lessons
      add constraint academy_lessons_assessment_fk
      foreign key (assessment_id) references public.academy_assessments(id)
      on delete set null;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 12. TABLA: academy_questions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'single_choice'
    check (question_type in (
      'single_choice', 'multiple_choice', 'true_false'
    )),
  points numeric(6,2) not null default 1,
  explanation text,                  -- explicación post-respuesta
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_questions_assessment_idx
  on public.academy_questions (assessment_id);

drop trigger if exists academy_questions_updated_at on public.academy_questions;
create trigger academy_questions_updated_at
  before update on public.academy_questions
  for each row execute function public.academy_set_updated_at();

alter table public.academy_questions enable row level security;

-- Las preguntas son visibles a quien tiene acceso al assessment
drop policy if exists "Preguntas: lectura con acceso" on public.academy_questions;
create policy "Preguntas: lectura con acceso" on public.academy_questions
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_assessments a
      where a.id = assessment_id
        and a.is_published
        and public.has_course_access(a.course_id)
    )
  );

drop policy if exists "Preguntas: staff gestiona" on public.academy_questions;
create policy "Preguntas: staff gestiona" on public.academy_questions
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 13. TABLA: academy_question_options
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.academy_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists academy_options_question_idx
  on public.academy_question_options (question_id);

alter table public.academy_question_options enable row level security;

-- IMPORTANTE: is_correct NO debe ser visible para estudiantes.
-- Los estudiantes ven las opciones pero sin is_correct.
-- La calificación se hace server-side en Edge Function.
drop policy if exists "Opciones: lectura parcial" on public.academy_question_options;
create policy "Opciones: lectura parcial" on public.academy_question_options
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_questions q
      join public.academy_assessments a on a.id = q.assessment_id
      where q.id = question_id
        and a.is_published
        and public.has_course_access(a.course_id)
    )
  );
-- NOTA: is_correct es filtrado en la query del frontend (select sin is_correct).
-- RLS no puede ocultar columnas individuales, eso se maneja a nivel de aplicación.
-- Alternativa: vista segura. Se implementa si se requiere.

drop policy if exists "Opciones: staff gestiona" on public.academy_question_options;
create policy "Opciones: staff gestiona" on public.academy_question_options
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 14. TABLA: academy_attempts
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
  -- Resultados (calculados en backend)
  score numeric(8,2),               -- puntuación obtenida
  max_score numeric(8,2),            -- puntuación máxima posible
  percentage numeric(5,2),           -- porcentaje
  passed boolean,
  -- Estado
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'graded')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by text default 'system',   -- 'system' o UUID del instructor
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_attempts_user_idx
  on public.academy_attempts (user_id);
create index if not exists academy_attempts_assessment_idx
  on public.academy_attempts (assessment_id);
create index if not exists academy_attempts_user_assessment_idx
  on public.academy_attempts (user_id, assessment_id);

drop trigger if exists academy_attempts_updated_at on public.academy_attempts;
create trigger academy_attempts_updated_at
  before update on public.academy_attempts
  for each row execute function public.academy_set_updated_at();

alter table public.academy_attempts enable row level security;

drop policy if exists "Intentos: usuario lee los suyos" on public.academy_attempts;
create policy "Intentos: usuario lee los suyos" on public.academy_attempts
  for select using (user_id = auth.uid() or public.is_academy_staff());

-- Solo el usuario puede crear su propio intento
drop policy if exists "Intentos: usuario crea los suyos" on public.academy_attempts;
create policy "Intentos: usuario crea los suyos" on public.academy_attempts
  for insert with check (user_id = auth.uid());

-- Resultados NO se actualizan desde frontend. Solo backend (Edge Function con service_role).
drop policy if exists "Intentos: staff gestiona" on public.academy_attempts;
create policy "Intentos: staff gestiona" on public.academy_attempts
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 15. TABLA: academy_answers
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.academy_attempts(id) on delete cascade,
  question_id uuid not null references public.academy_questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',  -- permite opción múltiple
  is_correct boolean,                -- calculado en backend
  points_earned numeric(6,2),        -- calculado en backend
  created_at timestamptz not null default now(),
  unique(attempt_id, question_id)    -- una respuesta por pregunta por intento
);

create index if not exists academy_answers_attempt_idx
  on public.academy_answers (attempt_id);

alter table public.academy_answers enable row level security;

drop policy if exists "Respuestas: usuario lee las suyas" on public.academy_answers;
create policy "Respuestas: usuario lee las suyas" on public.academy_answers
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

-- El usuario puede insertar respuestas para sus propios intentos
drop policy if exists "Respuestas: usuario inserta las suyas" on public.academy_answers;
create policy "Respuestas: usuario inserta las suyas" on public.academy_answers
  for insert with check (
    exists (
      select 1 from public.academy_attempts a
      where a.id = attempt_id
        and a.user_id = auth.uid()
        and a.status = 'in_progress'
    )
  );

-- is_correct y points_earned se actualizan solo desde backend
drop policy if exists "Respuestas: staff gestiona" on public.academy_answers;
create policy "Respuestas: staff gestiona" on public.academy_answers
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 16. TABLA: academy_certificates
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  certificate_number text unique not null,    -- SUMAK-CERT-2026-000001
  issued_at timestamptz not null default now(),
  participant_name text not null,
  course_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, course_id)         -- un certificado por curso por usuario
);

create index if not exists academy_certificates_user_idx
  on public.academy_certificates (user_id);
create index if not exists academy_certificates_course_idx
  on public.academy_certificates (course_id);

alter table public.academy_certificates enable row level security;

drop policy if exists "Certificados: usuario lee los suyos" on public.academy_certificates;
create policy "Certificados: usuario lee los suyos" on public.academy_certificates
  for select using (user_id = auth.uid() or public.is_academy_staff());

-- Solo backend crea certificados
drop policy if exists "Certificados: staff gestiona" on public.academy_certificates;
create policy "Certificados: staff gestiona" on public.academy_certificates
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 17. TABLA: academy_diploma_types
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_diploma_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  internal_code text unique not null,         -- e.g. 'DIP_TIPO_1'
  is_active boolean not null default true,
  -- Requisitos configurables
  requirements jsonb not null default '{}'::jsonb,
  /*
    Estructura de requirements:
    {
      "min_progress_pct": 100,          -- % mínimo de progreso
      "requires_assessment": true,       -- requiere evaluación aprobada
      "min_assessment_score": 80,        -- nota mínima de evaluación
      "required_course_ids": [],         -- cursos requeridos (UUIDs)
      "min_courses_completed": 1,        -- mínimo de cursos completados
      "requires_attendance": false,      -- requiere asistencia
      "custom_rules": []                 -- reglas adicionales
    }
  */
  template_version int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists academy_diploma_types_updated_at on public.academy_diploma_types;
create trigger academy_diploma_types_updated_at
  before update on public.academy_diploma_types
  for each row execute function public.academy_set_updated_at();

alter table public.academy_diploma_types enable row level security;

-- Tipos de diploma son lectura pública (metadatos)
drop policy if exists "Tipos diploma: lectura pública" on public.academy_diploma_types;
create policy "Tipos diploma: lectura pública" on public.academy_diploma_types
  for select using (true);

drop policy if exists "Tipos diploma: admin gestiona" on public.academy_diploma_types;
create policy "Tipos diploma: admin gestiona" on public.academy_diploma_types
  for all using (public.is_academy_admin())
  with check (public.is_academy_admin());

-- FK diferida de courses.diploma_type_id
alter table public.academy_courses
  drop constraint if exists academy_courses_diploma_type_fk;
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'academy_courses_diploma_type_fk'
  ) then
    alter table public.academy_courses
      add constraint academy_courses_diploma_type_fk
      foreign key (diploma_type_id) references public.academy_diploma_types(id)
      on delete set null;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 18. TABLA: academy_diploma_templates
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_diploma_templates (
  id uuid primary key default gen_random_uuid(),
  diploma_type_id uuid not null references public.academy_diploma_types(id) on delete cascade,
  version int not null default 1,
  -- Layout
  page_size text not null default 'A4'
    check (page_size in ('A4', 'letter', 'custom')),
  orientation text not null default 'landscape'
    check (orientation in ('portrait', 'landscape')),
  background_image_url text,
  logo_url text,
  -- Contenido con placeholders
  title_text text not null default '{{diploma_type_name}}',
  subtitle_text text,
  body_text text,                    -- {{participant_name}}, {{course_name}}, etc.
  footer_text text,
  -- Firma
  signatory_name text,
  signatory_title text,
  signatory_signature_url text,      -- imagen de firma gráfica
  -- Estado
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Una versión activa por tipo
  unique(diploma_type_id, version)
);

create index if not exists academy_diploma_templates_type_idx
  on public.academy_diploma_templates (diploma_type_id);

alter table public.academy_diploma_templates enable row level security;

drop policy if exists "Templates: admin lee" on public.academy_diploma_templates;
create policy "Templates: admin lee" on public.academy_diploma_templates
  for select using (public.is_academy_admin());

drop policy if exists "Templates: admin gestiona" on public.academy_diploma_templates;
create policy "Templates: admin gestiona" on public.academy_diploma_templates
  for all using (public.is_academy_admin())
  with check (public.is_academy_admin());

-- ─────────────────────────────────────────────────────────────
-- 19. TABLA: academy_diploma_issuances (TABLA CRÍTICA)
-- ─────────────────────────────────────────────────────────────

-- Secuencia para números de diploma
create sequence if not exists public.academy_diploma_seq
  start with 1 increment by 1 no cycle;

create table if not exists public.academy_diploma_issuances (
  id uuid primary key default gen_random_uuid(),
  -- Identificación
  diploma_number text unique not null,          -- 'SUMAK-DIP-2026-000001'
  verification_code text unique not null,       -- 'SUMAK-8F4K-29PX-7Q2M'
  verification_token text unique not null,      -- token largo CSPRNG (URL)
  -- Relaciones
  user_id uuid not null references auth.users(id) on delete restrict,
  diploma_type_id uuid not null references public.academy_diploma_types(id) on delete restrict,
  template_id uuid not null references public.academy_diploma_templates(id) on delete restrict,
  course_id uuid references public.academy_courses(id) on delete restrict,
  -- Datos capturados al momento de emisión (snapshot inmutable)
  participant_name text not null,
  program_name text not null,
  -- Integridad
  document_hash text not null,                  -- SHA-256 del PDF
  hash_algorithm text not null default 'sha256',
  pdf_storage_path text not null,               -- ruta en bucket privado
  template_version int not null,
  -- Estado
  status text not null default 'issued'
    check (status in ('issued', 'valid', 'revoked', 'superseded', 'invalidated')),
  -- Auditoría de emisión
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id) on delete set null,
  -- Auditoría de revocación
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text,
  -- Reemisión
  superseded_by uuid references public.academy_diploma_issuances(id) on delete set null,
  original_diploma_id uuid references public.academy_diploma_issuances(id) on delete set null,
  -- Metadata
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
  -- NOTA: NO tiene updated_at intencional — los diplomas emitidos son inmutables.
  -- Solo status, revoked_at, revoked_by, revocation_reason y superseded_by se actualizan.
);

-- Prevenir duplicados: un usuario no puede tener 2 diplomas válidos del mismo tipo para el mismo curso
create unique index if not exists academy_diploma_no_duplicate
  on public.academy_diploma_issuances (user_id, diploma_type_id, coalesce(course_id, '00000000-0000-0000-0000-000000000000'))
  where status not in ('revoked', 'superseded', 'invalidated');

create index if not exists academy_diploma_user_idx
  on public.academy_diploma_issuances (user_id);
create index if not exists academy_diploma_type_idx
  on public.academy_diploma_issuances (diploma_type_id);
create index if not exists academy_diploma_status_idx
  on public.academy_diploma_issuances (status);
create index if not exists academy_diploma_verification_token_idx
  on public.academy_diploma_issuances (verification_token);
create index if not exists academy_diploma_verification_code_idx
  on public.academy_diploma_issuances (verification_code);

alter table public.academy_diploma_issuances enable row level security;

-- El usuario puede leer SUS propios diplomas
drop policy if exists "Diplomas: usuario lee los suyos" on public.academy_diploma_issuances;
create policy "Diplomas: usuario lee los suyos" on public.academy_diploma_issuances
  for select using (user_id = auth.uid() or public.is_academy_admin());

-- NADIE excepto backend (service_role) puede insertar/actualizar diplomas.
-- Ni siquiera academy_admin por RLS — la inserción la hace la Edge Function
-- con service_role key.
-- Si admin necesita emitir vía UI, lo hace a través de la Edge Function.

drop policy if exists "Diplomas: admin puede leer todos" on public.academy_diploma_issuances;
create policy "Diplomas: admin puede leer todos" on public.academy_diploma_issuances
  for select using (public.is_academy_admin());

-- NOTA: No hay política INSERT/UPDATE/DELETE para roles autenticados.
-- Todas las operaciones de escritura se realizan vía Edge Functions con service_role.

-- ─────────────────────────────────────────────────────────────
-- 20. TABLA: academy_audit_logs
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,              -- 'diploma_issued', 'diploma_revoked', etc.
  entity_type text not null,         -- 'diploma', 'certificate', 'assessment', etc.
  entity_id uuid,
  result text not null default 'success'
    check (result in ('success', 'failure', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists academy_audit_logs_actor_idx
  on public.academy_audit_logs (actor_id);
create index if not exists academy_audit_logs_entity_idx
  on public.academy_audit_logs (entity_type, entity_id);
create index if not exists academy_audit_logs_action_idx
  on public.academy_audit_logs (action);
create index if not exists academy_audit_logs_created_idx
  on public.academy_audit_logs (created_at desc);

alter table public.academy_audit_logs enable row level security;

-- Solo admin puede leer logs
drop policy if exists "Audit: admin lee" on public.academy_audit_logs;
create policy "Audit: admin lee" on public.academy_audit_logs
  for select using (public.is_academy_admin());

-- Inserción solo vía service_role (Edge Functions).
-- No hay política INSERT para authenticated — los logs no se crean desde frontend.

-- ─────────────────────────────────────────────────────────────
-- 21. RPC: Verificación pública de diploma (no requiere auth)
-- ─────────────────────────────────────────────────────────────
create or replace function public.verify_diploma_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diploma record;
begin
  if p_token is null or length(p_token) < 10 then
    return jsonb_build_object(
      'found', false,
      'status', 'NOT_FOUND'
    );
  end if;

  select
    d.diploma_number,
    d.verification_code,
    d.participant_name,
    d.program_name,
    d.status,
    d.issued_at,
    dt.name as diploma_type_name,
    d.revoked_at,
    d.revocation_reason
  into v_diploma
  from public.academy_diploma_issuances d
  join public.academy_diploma_types dt on dt.id = d.diploma_type_id
  where d.verification_token = p_token;

  if not found then
    return jsonb_build_object(
      'found', false,
      'status', 'NOT_FOUND'
    );
  end if;

  -- Solo datos públicos, no sensibles
  return jsonb_build_object(
    'found', true,
    'status', upper(v_diploma.status),
    'diploma_number', v_diploma.diploma_number,
    'verification_code', v_diploma.verification_code,
    'participant_name', v_diploma.participant_name,
    'program_name', v_diploma.program_name,
    'diploma_type', v_diploma.diploma_type_name,
    'issued_at', v_diploma.issued_at,
    'issuer', 'SUMAK Ecuador',
    'revoked_at', v_diploma.revoked_at,
    'revocation_reason', case
      when v_diploma.status = 'revoked' then v_diploma.revocation_reason
      else null
    end
  );
end;
$$;

-- Accesible sin autenticación (verificación pública)
revoke all on function public.verify_diploma_public(text) from public;
grant execute on function public.verify_diploma_public(text) to anon;
grant execute on function public.verify_diploma_public(text) to authenticated;

comment on function public.verify_diploma_public(text) is
  'Verificación pública de diploma. Recibe verification_token, devuelve datos públicos. No requiere autenticación. No expone datos sensibles.';

-- ─────────────────────────────────────────────────────────────
-- 22. RPC: Número de diploma secuencial
-- ─────────────────────────────────────────────────────────────
create or replace function public.academy_next_diploma_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_year text;
begin
  v_seq := nextval('public.academy_diploma_seq');
  v_year := to_char(now(), 'YYYY');
  return 'SUMAK-DIP-' || v_year || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

revoke all on function public.academy_next_diploma_number() from public;
-- Solo service_role puede llamar esta función (Edge Functions)

comment on function public.academy_next_diploma_number() is
  'Genera el siguiente número de diploma secuencial. Solo accesible vía service_role.';

-- ─────────────────────────────────────────────────────────────
-- 23. RPC: Siguiente número de certificado
-- ─────────────────────────────────────────────────────────────
create sequence if not exists public.academy_certificate_seq
  start with 1 increment by 1 no cycle;

create or replace function public.academy_next_certificate_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_year text;
begin
  v_seq := nextval('public.academy_certificate_seq');
  v_year := to_char(now(), 'YYYY');
  return 'SUMAK-CERT-' || v_year || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

revoke all on function public.academy_next_certificate_number() from public;

-- ─────────────────────────────────────────────────────────────
-- 24. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────

-- Bucket público para imágenes de cursos, thumbnails, materiales públicos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-content',
  'academy-content',
  true,
  10485760,  -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
        'application/pdf', 'video/mp4']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760;

-- Bucket PRIVADO para diplomas PDF (acceso solo via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-diplomas',
  'academy-diplomas',
  false,     -- PRIVADO
  5242880,   -- 5MB
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880;

-- Bucket PRIVADO para assets de plantillas (fondos, logos, firmas)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-templates',
  'academy-templates',
  false,     -- PRIVADO
  10485760,  -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760;

-- ─── Storage policies: academy-content (público) ────────────

drop policy if exists "academy-content lectura pública" on storage.objects;
create policy "academy-content lectura pública" on storage.objects
  for select using (bucket_id = 'academy-content');

drop policy if exists "academy-content upload staff" on storage.objects;
create policy "academy-content upload staff" on storage.objects
  for insert
  with check (bucket_id = 'academy-content' and public.is_academy_staff());

drop policy if exists "academy-content update staff" on storage.objects;
create policy "academy-content update staff" on storage.objects
  for update
  using (bucket_id = 'academy-content' and public.is_academy_staff())
  with check (bucket_id = 'academy-content' and public.is_academy_staff());

drop policy if exists "academy-content delete staff" on storage.objects;
create policy "academy-content delete staff" on storage.objects
  for delete
  using (bucket_id = 'academy-content' and public.is_academy_staff());

-- ─── Storage policies: academy-diplomas (PRIVADO) ───────────
-- NO hay políticas para authenticated. Solo service_role puede leer/escribir.
-- Los usuarios acceden a sus diplomas mediante signed URLs generadas por Edge Functions.

drop policy if exists "academy-diplomas admin lee" on storage.objects;
create policy "academy-diplomas admin lee" on storage.objects
  for select using (bucket_id = 'academy-diplomas' and public.is_academy_admin());

-- INSERT/UPDATE/DELETE solo via service_role (Edge Functions)

-- ─── Storage policies: academy-templates (PRIVADO) ──────────

drop policy if exists "academy-templates admin lee" on storage.objects;
create policy "academy-templates admin lee" on storage.objects
  for select using (bucket_id = 'academy-templates' and public.is_academy_admin());

drop policy if exists "academy-templates admin upload" on storage.objects;
create policy "academy-templates admin upload" on storage.objects
  for insert
  with check (bucket_id = 'academy-templates' and public.is_academy_admin());

drop policy if exists "academy-templates admin update" on storage.objects;
create policy "academy-templates admin update" on storage.objects
  for update
  using (bucket_id = 'academy-templates' and public.is_academy_admin())
  with check (bucket_id = 'academy-templates' and public.is_academy_admin());

drop policy if exists "academy-templates admin delete" on storage.objects;
create policy "academy-templates admin delete" on storage.objects
  for delete
  using (bucket_id = 'academy-templates' and public.is_academy_admin());

-- ─────────────────────────────────────────────────────────────
-- 25. COMMENTS
-- ─────────────────────────────────────────────────────────────
comment on table public.academy_categories is 'Categorías de cursos y videoconferencias de la Academia SUMAK.';
comment on table public.academy_courses is 'Cursos estructurados de la Academia SUMAK. access_mode controla quién puede acceder.';
comment on table public.academy_modules is 'Módulos (secciones) dentro de un curso.';
comment on table public.academy_lessons is 'Lecciones individuales. Soporta múltiples tipos de contenido (video, texto, PDF, etc.) con abstracción de proveedor de video.';
comment on table public.academy_resources is 'Recursos descargables asociados a una lección.';
comment on table public.academy_live_sessions is 'Biblioteca de clases y videoconferencias. Independiente de los cursos estructurados.';
comment on table public.academy_enrollments is 'Inscripciones de usuarios a cursos. Un usuario tiene máximo una inscripción activa por curso.';
comment on table public.academy_progress is 'Progreso individual por lección. Permite "continuar donde lo dejaste".';
comment on table public.academy_assessments is 'Evaluaciones configurables por curso/módulo.';
comment on table public.academy_questions is 'Preguntas de evaluación. Tipos: single_choice, multiple_choice, true_false.';
comment on table public.academy_question_options is 'Opciones de respuesta. is_correct NUNCA debe exponerse al estudiante vía frontend.';
comment on table public.academy_attempts is 'Intentos de evaluación. Los resultados se calculan en backend (Edge Function).';
comment on table public.academy_answers is 'Respuestas del estudiante a cada pregunta en un intento.';
comment on table public.academy_certificates is 'Certificados de finalización de curso.';
comment on table public.academy_diploma_types is 'Tipos de diploma configurables. Los 5 tipos iniciales más los que se agreguen.';
comment on table public.academy_diploma_templates is 'Plantillas versionadas para cada tipo de diploma. Usa placeholders {{...}}.';
comment on table public.academy_diploma_issuances is 'TABLA CRÍTICA: Diplomas emitidos. Inmutables excepto estado y revocación. Cada diploma tiene hash SHA-256 del PDF, token de verificación CSPRNG, y número secuencial único.';
comment on table public.academy_audit_logs is 'Logs de auditoría para operaciones sensibles de la academia (emisión, revocación, cambios de plantilla, etc.).';

-- ============================================================
-- VERIFICACIÓN post-migración
-- ============================================================
-- Tablas creadas:
--   select table_name from information_schema.tables
--     where table_schema = 'public' and table_name like 'academy_%'
--     order by table_name;
--   -- Debe retornar 18 tablas
--
-- Funciones creadas:
--   select proname from pg_proc
--     where proname like 'academy_%' or proname like 'is_academy_%' or proname = 'has_course_access' or proname = 'verify_diploma_public'
--     order by proname;
--
-- Buckets creados:
--   select id, name, public from storage.buckets where id like 'academy%';
--   -- Debe retornar 3 buckets (1 público, 2 privados)
--
-- Políticas:
--   select policyname, tablename from pg_policies
--     where schemaname = 'public' and tablename like 'academy_%'
--     order by tablename, policyname;
--
-- Secuencias:
--   select * from pg_sequences where schemaname = 'public' and sequencename like 'academy_%';
-- ============================================================
