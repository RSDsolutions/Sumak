-- ============================================================
-- SUMAK — Migration 020 — Indices para FKs sin cobertura (PERF-002)
-- ============================================================
-- Advisor detecto 8 foreign keys sin indice. Cada uno causa seq-scan
-- al hacer JOINs sobre las tablas. Agregamos los indices faltantes.
--
-- CREATE INDEX IF NOT EXISTS es idempotente. CONCURRENTLY no se usa
-- porque la DB esta en bajo trafico hoy; en una base mas grande
-- conviene CREATE INDEX CONCURRENTLY (no bloquea writes).
-- ============================================================

create index if not exists idx_comisiones_beneficiario on public.comisiones (beneficiario_id);
create index if not exists idx_comisiones_origen on public.comisiones (origen_id);
create index if not exists idx_comisiones_pagado_por on public.comisiones (pagado_por);
create index if not exists idx_pedido_items_pedido on public.pedido_items (pedido_id);
create index if not exists idx_pedidos_distribuidor on public.pedidos (distribuidor_id);
create index if not exists idx_pedidos_enviado_por on public.pedidos (enviado_por);
create index if not exists idx_profiles_patrocinador on public.profiles (patrocinador_id);
create index if not exists idx_rangos_historia_distribuidor on public.rangos_historia (distribuidor_id);

-- ============================================================
-- VERIFICACION
--   select indexname from pg_indexes
--    where schemaname='public'
--      and indexname like 'idx_%'
--    order by indexname;
--
-- Y el advisor get_advisors('performance') debe pasar de 8 entradas
-- 'unindexed_foreign_keys' a 0.
-- ============================================================
