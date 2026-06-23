-- ============================================================
-- SUMAK — Migration 027 — Admin siempre activo
-- ============================================================
-- Regla de negocio: los usuarios con rol='admin' se consideran
-- siempre activos para efectos de comisiones. No necesitan tener
-- pedido propio >= $100 en el mes para cobrar.
--
-- Esto afecta:
--   - submit_pedido / finish_approve_afiliacion: las comisiones que
--     llegan al admin nacen como 'pendiente' (no 'retenida').
--   - liberar_comisiones_retenidas: tambien acepta liberar las del
--     admin sin requerir pedido suyo.
--
-- Idempotente. Solo reescribe distribuidor_activo_en_mes_de.
-- ============================================================

create or replace function public.distribuidor_activo_en_mes_de(
  p_distribuidor_id uuid,
  p_fecha timestamptz
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Admin siempre activo (regla de negocio Sumak)
  select case
    when exists (
      select 1 from public.profiles
       where id = p_distribuidor_id and rol = 'admin'
    ) then true
    else exists (
      select 1 from public.pedidos
       where distribuidor_id = p_distribuidor_id
         and estado in ('procesando','enviado','entregado')
         and total >= 100
         and created_at >= date_trunc('month', p_fecha)
         and created_at <  date_trunc('month', p_fecha) + interval '1 month'
    )
  end;
$$;

comment on function public.distribuidor_activo_en_mes_de(uuid, timestamptz) is
  'Devuelve true si el distribuidor califica como activo en el mes de la fecha. Admin esta siempre activo. Para distribuidor normal: tiene pedido >= 100 entregado/procesando/enviado en el mes.';
