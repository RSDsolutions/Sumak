-- Create academy-resources bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-resources',
  'academy-resources',
  true,
  52428800, -- 50MB
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'image/jpeg', 'image/png']
) on conflict (id) do update set 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'image/jpeg', 'image/png'];

-- RLS para storage.objects


-- Política de lectura: todos pueden leer objetos de academy-resources si están logueados (o público porque es public = true)
create policy "Cualquiera puede leer recursos de academia"
on storage.objects for select
to public
using (bucket_id = 'academy-resources');

-- Política de inserción: solo admin o instructor
create policy "Admin e instructores pueden subir recursos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'academy-resources' and
  exists (
    select 1 from profiles
    where id = auth.uid()
    and rol in ('admin', 'instructor')
  )
);

-- Política de actualización: solo admin o instructor
create policy "Admin e instructores pueden actualizar recursos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'academy-resources' and
  exists (
    select 1 from profiles
    where id = auth.uid()
    and rol in ('admin', 'instructor')
  )
)
with check (
  bucket_id = 'academy-resources' and
  exists (
    select 1 from profiles
    where id = auth.uid()
    and rol in ('admin', 'instructor')
  )
);

-- Política de borrado: solo admin o instructor
create policy "Admin e instructores pueden borrar recursos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'academy-resources' and
  exists (
    select 1 from profiles
    where id = auth.uid()
    and rol in ('admin', 'instructor')
  )
);
