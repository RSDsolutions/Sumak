-- ============================================================
-- SUMAK — Migration 013 — Backport columna numero_pedido (mig 002)
-- ============================================================
-- En la DB actual no existe pedidos.numero_pedido, aunque el resto de
-- migracion 002 si fue aplicada. Esto provoca que el frontend caiga al
-- fallback (NV-<8 chars del UUID>) en lugar del NV-000001 humano.
--
-- Agregamos la columna SERIAL. Los pedidos existentes obtienen numero
-- de forma autoincremental empezando en 1.
--
-- Idempotente.
-- ============================================================

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'numero_pedido') then
    alter table public.pedidos add column numero_pedido serial;
  end if;
end $$;

comment on column public.pedidos.numero_pedido is
  'Numero secuencial humano-amigable. Se muestra como NV-000123 en la UI. Asignado automaticamente por la secuencia al insertar.';

-- ============================================================
-- VERIFICACION:
--   select column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name='pedidos' and column_name='numero_pedido';
--
--   select id, numero_pedido from public.pedidos order by created_at desc limit 5;
-- ============================================================
