create table if not exists public.academy_programs (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	slug text unique not null,
	description text,
	cover_image_url text,
	status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
	access_mode text not null default 'free_registered' check (access_mode in ('public', 'free_registered', 'sumak_exclusive', 'assigned', 'hidden')),
	completion_percentage_required numeric(5,2) not null default 100 check (completion_percentage_required between 0 and 100),
	diploma_type_id uuid references public.academy_diploma_types(id) on delete set null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.academy_program_courses (
	id uuid primary key default gen_random_uuid(),
	program_id uuid not null references public.academy_programs(id) on delete cascade,
	course_id uuid not null references public.academy_courses(id) on delete cascade,
	sort_order integer not null default 0,
	is_required boolean not null default true,
	created_at timestamptz not null default now(),
	unique(program_id, course_id)
);

create index if not exists academy_program_courses_program_idx on public.academy_program_courses(program_id, sort_order);
create index if not exists academy_program_courses_course_idx on public.academy_program_courses(course_id);

drop trigger if exists academy_programs_updated_at on public.academy_programs;
create trigger academy_programs_updated_at before update on public.academy_programs for each row execute function public.academy_set_updated_at();

alter table public.academy_programs enable row level security;
alter table public.academy_program_courses enable row level security;

drop policy if exists "Programas: lectura según publicación" on public.academy_programs;
create policy "Programas: lectura según publicación" on public.academy_programs for select using (public.is_academy_staff() or (status = 'published' and (access_mode = 'public' or auth.uid() is not null)));
drop policy if exists "Programas: staff gestiona" on public.academy_programs;
create policy "Programas: staff gestiona" on public.academy_programs for all using (public.is_academy_staff()) with check (public.is_academy_staff());

drop policy if exists "Programa cursos: lectura con programa" on public.academy_program_courses;
create policy "Programa cursos: lectura con programa" on public.academy_program_courses for select using (exists (select 1 from public.academy_programs p where p.id = program_id and (public.is_academy_staff() or (p.status = 'published' and auth.uid() is not null))));
drop policy if exists "Programa cursos: staff gestiona" on public.academy_program_courses;
create policy "Programa cursos: staff gestiona" on public.academy_program_courses for all using (public.is_academy_staff()) with check (public.is_academy_staff());

grant select on public.academy_programs, public.academy_program_courses to anon, authenticated;
