drop policy if exists "Lives: lectura según acceso" on public.academy_live_sessions;
create policy "Lives: lectura según acceso" on public.academy_live_sessions
  for select using (
    public.is_academy_staff()
    or (
      status = 'published'
      and (
        access_mode = 'public'
        or (access_mode = 'free_registered' and auth.uid() is not null)
        or (access_mode = 'sumak_exclusive' and exists (select 1 from public.profiles where id = auth.uid() and estado = 'activo'))
        or (course_id is not null and public.has_course_access(course_id))
      )
    )
  );

comment on policy "Lives: lectura según acceso" on public.academy_live_sessions is 'Las lives premium o asignadas requieren acceso al curso relacionado.';
