-- ============================================================
-- SUMAK — Migration 028 — Foto de perfil (avatar) por usuario
-- ============================================================
-- Permite que cada usuario (distribuidor, admin u operaciones)
-- suba su propia foto de perfil. La columna profiles.avatar_url
-- ya existe desde la migracion 001 — aqui solo se crea el bucket
-- de storage y sus politicas.
--
-- Storage:
--   bucket avatares (publico) — publico para que el <img src>
--   funcione sin firmar URLs, igual que producto-imagenes.
--
-- Convencion de ruta: cada usuario sube dentro de su propia
-- carpeta "${auth.uid()}/archivo.ext", asi la politica solo
-- necesita comparar el primer segmento de la ruta con el uid.
--
-- RLS:
--   SELECT: publico (cualquiera puede ver fotos de perfil).
--   INSERT/UPDATE/DELETE: el propio usuario en su carpeta, o admin
--   (para poder moderar/quitar una foto inapropiada).
--
-- Idempotente.
-- ============================================================

-- 1) Bucket avatares
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares', 'avatares', true,
  3145728, -- 3 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2) Politicas del bucket
drop policy if exists "avatares lectura publica" on storage.objects;
create policy "avatares lectura publica" on storage.objects
  for select using (bucket_id = 'avatares');

drop policy if exists "avatares upload propio" on storage.objects;
create policy "avatares upload propio" on storage.objects
  for insert
  with check (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

drop policy if exists "avatares update propio" on storage.objects;
create policy "avatares update propio" on storage.objects
  for update
  using (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  )
  with check (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

drop policy if exists "avatares delete propio" on storage.objects;
create policy "avatares delete propio" on storage.objects
  for delete
  using (
    bucket_id = 'avatares'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

-- ─── VERIFICACIÓN ─────────────────────────────────────────────
-- Después de correr esto, verifica con:
--
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'avatares';
--   -- Debe devolver 1 fila con public=true.
--
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname like 'avatares %';
--   -- Debe devolver 4 filas.
-- ============================================================
