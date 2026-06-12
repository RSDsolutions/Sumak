-- ============================================================
-- SUMAK — Migration 010 — Vouchers de pago y envío
-- ============================================================
-- Dos features juntas:
--
-- (A) Voucher de PAGO DE COMISIÓN (comisiones.*):
--   Cuando admin/operaciones marca una comisión como "pagada",
--   puede registrar voucher (foto del comprobante) + N° de
--   referencia. El beneficiario (distribuidor) ve estos datos
--   en /dashboard/comisiones para tener evidencia.
--
-- (B) Voucher de ENVÍO DE PEDIDO (pedidos.envio_*):
--   Cuando admin/operaciones marca un pedido como "enviado",
--   puede registrar voucher (foto de la guía) + N° de tracking.
--   El distribuidor lo ve en /dashboard/pedidos para seguir su
--   envío con confianza.
--
-- En ambos casos los archivos van a buckets distintos con RLS:
--   • comisiones-vouchers
--   • pedidos-envios
-- ============================================================
-- Idempotente.
-- ============================================================

-- 1) Columnas nuevas en comisiones ----------------------------
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comisiones' and column_name = 'voucher_url') then
    alter table public.comisiones add column voucher_url text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comisiones' and column_name = 'voucher_numero') then
    alter table public.comisiones add column voucher_numero text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comisiones' and column_name = 'pagado_por') then
    alter table public.comisiones add column pagado_por uuid references public.profiles(id);
  end if;
end $$;

comment on column public.comisiones.voucher_url is
  'Ruta del comprobante de pago en el bucket comisiones-vouchers. Subido por admin/operaciones al marcar la comisión como pagada. Visible para el beneficiario.';
comment on column public.comisiones.voucher_numero is
  'Número de transferencia/referencia del pago de esta comisión. Visible para el beneficiario.';
comment on column public.comisiones.pagado_por is
  'Profile.id del admin/operaciones que registró el pago. Audit ligero.';

-- 2) Storage bucket para los vouchers de comisiones ------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comisiones-vouchers', 'comisiones-vouchers', false,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) Políticas de storage --------------------------------------
-- Cargar: solo admin u operaciones pueden subir (en /<comision_id>/file).
drop policy if exists "Ops/admin suben vouchers de comision" on storage.objects;
create policy "Ops/admin suben vouchers de comision" on storage.objects
  for insert with check (
    bucket_id = 'comisiones-vouchers'
    and public.is_operaciones_or_admin()
  );

-- Leer: ops/admin todos; beneficiario solo los de sus comisiones.
-- El path es `<comision_id>/<filename>`, así que el primer segmento
-- es el comision_id y verificamos beneficiario via join.
drop policy if exists "Lectura vouchers comision" on storage.objects;
create policy "Lectura vouchers comision" on storage.objects
  for select using (
    bucket_id = 'comisiones-vouchers'
    and (
      public.is_operaciones_or_admin()
      or exists (
        select 1 from public.comisiones c
        where c.id::text = (storage.foldername(name))[1]
          and c.beneficiario_id = auth.uid()
      )
    )
  );

-- Borrar/Update: solo ops/admin (raro, pero por completitud).
drop policy if exists "Ops/admin actualizan vouchers comision" on storage.objects;
create policy "Ops/admin actualizan vouchers comision" on storage.objects
  for update using (
    bucket_id = 'comisiones-vouchers'
    and public.is_operaciones_or_admin()
  );

drop policy if exists "Ops/admin borran vouchers comision" on storage.objects;
create policy "Ops/admin borran vouchers comision" on storage.objects
  for delete using (
    bucket_id = 'comisiones-vouchers'
    and public.is_operaciones_or_admin()
  );

-- ============================================================
-- (B) Voucher de ENVÍO DE PEDIDO
-- ============================================================
-- 4) Columnas nuevas en pedidos ------------------------------
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'envio_voucher_url') then
    alter table public.pedidos add column envio_voucher_url text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'envio_numero') then
    alter table public.pedidos add column envio_numero text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'enviado_por') then
    alter table public.pedidos add column enviado_por uuid references public.profiles(id);
  end if;
end $$;

comment on column public.pedidos.envio_voucher_url is
  'Ruta de la foto de la guía/comprobante de envío en el bucket pedidos-envios. Subida por admin/operaciones al cambiar el estado a enviado. Visible para el distribuidor.';
comment on column public.pedidos.envio_numero is
  'Número de guía / tracking del envío. Visible para el distribuidor.';
comment on column public.pedidos.enviado_por is
  'Profile.id del admin/operaciones que registró el envío.';

-- 5) Storage bucket para los vouchers de envío -----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pedidos-envios', 'pedidos-envios', false,
  5242880,
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 6) Políticas de storage para envíos --------------------------
-- Cargar: solo admin u operaciones (path: <pedido_id>/<filename>).
drop policy if exists "Ops/admin suben vouchers de envio" on storage.objects;
create policy "Ops/admin suben vouchers de envio" on storage.objects
  for insert with check (
    bucket_id = 'pedidos-envios'
    and public.is_operaciones_or_admin()
  );

-- Leer: ops/admin todos; distribuidor solo el de su pedido.
drop policy if exists "Lectura vouchers envio" on storage.objects;
create policy "Lectura vouchers envio" on storage.objects
  for select using (
    bucket_id = 'pedidos-envios'
    and (
      public.is_operaciones_or_admin()
      or exists (
        select 1 from public.pedidos p
        where p.id::text = (storage.foldername(name))[1]
          and p.distribuidor_id = auth.uid()
      )
    )
  );

drop policy if exists "Ops/admin actualizan vouchers envio" on storage.objects;
create policy "Ops/admin actualizan vouchers envio" on storage.objects
  for update using (
    bucket_id = 'pedidos-envios'
    and public.is_operaciones_or_admin()
  );

drop policy if exists "Ops/admin borran vouchers envio" on storage.objects;
create policy "Ops/admin borran vouchers envio" on storage.objects
  for delete using (
    bucket_id = 'pedidos-envios'
    and public.is_operaciones_or_admin()
  );

-- ============================================================
-- VERIFICACIÓN
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'comisiones'
--      and column_name in ('voucher_url','voucher_numero','pagado_por');
--   -- 3 filas
--
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'pedidos'
--      and column_name in ('envio_voucher_url','envio_numero','enviado_por');
--   -- 3 filas
--
--   select id, file_size_limit, allowed_mime_types from storage.buckets
--    where id in ('comisiones-vouchers','pedidos-envios');
-- ============================================================
