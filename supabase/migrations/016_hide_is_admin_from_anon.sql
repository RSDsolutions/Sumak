-- ============================================================
-- SUMAK — Migration 016 — Ocultar is_admin de anon
-- ============================================================
-- is_admin() y is_operaciones_or_admin() son helpers usados por
-- RLS policies. authenticated tiene grant explicito y RLS funciona.
-- Revocando solo PUBLIC, anon pierde acceso (no tiene explicit grant)
-- y se silencia el anon-callable warning del advisor.
-- ============================================================

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_operaciones_or_admin() from public;
