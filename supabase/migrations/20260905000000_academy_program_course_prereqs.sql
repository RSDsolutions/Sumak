create table if not exists public.academy_program_course_prereqs (
    id uuid primary key default gen_random_uuid(),
    program_course_id uuid not null references public.academy_program_courses(id) on delete cascade,
    prereq_program_course_id uuid not null references public.academy_program_courses(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique(program_course_id, prereq_program_course_id)
);

create index if not exists academy_program_course_prereqs_pc_idx on public.academy_program_course_prereqs(program_course_id);
create index if not exists academy_program_course_prereqs_prereq_idx on public.academy_program_course_prereqs(prereq_program_course_id);

alter table public.academy_program_course_prereqs enable row level security;

drop policy if exists "Prerrequisitos: lectura con programa" on public.academy_program_course_prereqs;
create policy "Prerrequisitos: lectura con programa" on public.academy_program_course_prereqs for select using (
    exists (
        select 1 from public.academy_program_courses pc
        join public.academy_programs p on p.id = pc.program_id
        where pc.id = program_course_id and (public.is_academy_staff() or (p.status = 'published' and auth.uid() is not null))
    )
);

drop policy if exists "Prerrequisitos: staff gestiona" on public.academy_program_course_prereqs;
create policy "Prerrequisitos: staff gestiona" on public.academy_program_course_prereqs for all using (public.is_academy_staff()) with check (public.is_academy_staff());

grant select on public.academy_program_course_prereqs to anon, authenticated;

-- Agregar columna para examen final si no existe
alter table public.academy_programs add column if not exists final_exam_assessment_id uuid;

