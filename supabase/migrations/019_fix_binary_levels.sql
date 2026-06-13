-- ============================================================
-- SUMAK — Migration 019 — Recalcular niveles binarios (BIZ-001)
-- ============================================================
-- Bug detectado durante la auditoria: algunos nodos en red_binaria
-- tienen 'nivel' desfasado vs su jerarquia real (ej. SUMAK-00003 con
-- nivel=2 cuando debiera ser nivel=3 por estar bajo SUMAK-00002 que
-- es nivel=2). Causa: aprobaciones hechas con versiones anteriores
-- de finish_approve_afiliacion donde v_padre_nivel se leia mal.
--
-- Impacto: las queries de 'niveles activos' en el tramo 2 cuentan
-- mal el alcance de la red.
--
-- Fix: recalcular nivel desde la raiz con CTE recursivo. Idempotente:
-- la siguiente vez que se corra y todos los niveles esten OK, el
-- UPDATE no afecta filas (where r.nivel <> j.nivel_real).
--
-- Pre-update sugerido: crear backup manual antes de aplicar:
--   create table red_binaria_bk_pre_019 as table public.red_binaria;
-- Drop ese backup tras una semana de operacion sin problemas.
-- ============================================================

with recursive jerarquia as (
  -- Raices: nodos del admin (padre_id is null)
  select id, distribuidor_id, padre_id, 1::int as nivel_real
    from public.red_binaria
   where padre_id is null
  union all
  -- Descendientes: nivel = padre + 1
  select r.id, r.distribuidor_id, r.padre_id, j.nivel_real + 1
    from public.red_binaria r
    join jerarquia j on r.padre_id = j.id
)
update public.red_binaria r
   set nivel = j.nivel_real
  from jerarquia j
 where r.id = j.id
   and r.nivel <> j.nivel_real;

-- ============================================================
-- VERIFICACION (debe devolver 0)
--   with recursive j as (
--     select id, padre_id, 1::int as nivel_real from public.red_binaria where padre_id is null
--     union all
--     select r.id, r.padre_id, j.nivel_real+1 from public.red_binaria r join j on r.padre_id=j.id
--   )
--   select count(*) from public.red_binaria r join j on r.id=j.id where r.nivel <> j.nivel_real;
-- ============================================================
