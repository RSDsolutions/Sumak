-- ============================================================
-- SUMAK — Migration 005
-- Checkout en dos pasos:
--   1) Mostrar cuentas bancarias y reservar el pedido en estado
--      'pendiente_pago' por 15 minutos.
--   2) Distribuidor sube voucher + número de comprobante → el
--      pedido pasa a 'procesando' (visible al admin).
-- ============================================================
-- Idempotente — puede correrse varias veces.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PEDIDOS: columnas para el flujo de pago
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'voucher_numero') then
    alter table public.pedidos add column voucher_numero text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'pago_expira_en') then
    alter table public.pedidos add column pago_expira_en timestamptz;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'banco_destino') then
    alter table public.pedidos add column banco_destino text;
  end if;
end $$;

comment on column public.pedidos.voucher_numero is
  'Número de comprobante / referencia de la transferencia o depósito que el distribuidor escribió al confirmar el pago.';
comment on column public.pedidos.pago_expira_en is
  'Mientras el pedido está en estado pendiente_pago, esta marca indica cuándo se cancelará automáticamente (15 min tras la reserva).';
comment on column public.pedidos.banco_destino is
  'Banco o cuenta de destino que el distribuidor eligió para realizar el pago (texto libre del nombre del banco).';

-- ─────────────────────────────────────────────────────────────
-- 2. ENUM estado: añadir 'pendiente_pago' si no existe
-- (los pedidos pueden ser un enum o columna text; soportamos ambos)
-- ─────────────────────────────────────────────────────────────
do $$
declare
  has_enum boolean;
begin
  select exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'pedido_estado'
  ) into has_enum;

  if has_enum then
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'pedido_estado' and e.enumlabel = 'pendiente_pago'
    ) then
      alter type pedido_estado add value 'pendiente_pago' before 'pendiente';
    end if;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. ÍNDICE para que el cron de expiración sea barato
-- ─────────────────────────────────────────────────────────────
create index if not exists pedidos_pendiente_pago_expira_idx
  on public.pedidos (pago_expira_en)
  where pago_expira_en is not null;

-- ─────────────────────────────────────────────────────────────
-- 4. FUNCIÓN: cancela los pedidos pendiente_pago vencidos
-- Puede llamarse desde un cron o desde el front al cargar.
-- ─────────────────────────────────────────────────────────────
create or replace function public.cancelar_pedidos_pago_vencidos()
returns integer as $$
declare
  cnt integer;
begin
  with cancelados as (
    update public.pedidos
       set estado = 'cancelado',
           pago_expira_en = null
     where estado::text = 'pendiente_pago'
       and pago_expira_en is not null
       and pago_expira_en < now()
     returning id
  )
  select count(*) into cnt from cancelados;
  return cnt;
end;
$$ language plpgsql security definer;

grant execute on function public.cancelar_pedidos_pago_vencidos() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. ACTIVACIÓN MENSUAL: pendiente_pago NO califica
-- (solo procesando / enviado / entregado, igual que antes)
-- Lo dejamos explícito por si el enum estaba como text.
-- ─────────────────────────────────────────────────────────────
create or replace function public.distribuidor_activo_mes(
  p_distribuidor_id uuid,
  p_mes date default date_trunc('month', current_date)::date
)
returns boolean as $$
  select exists (
    select 1 from public.pedidos
    where distribuidor_id = p_distribuidor_id
      and estado::text in ('procesando','enviado','entregado')
      and total >= 100
      and created_at >= p_mes
      and created_at < (p_mes + interval '1 month')
  );
$$ language sql stable;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN sugerida tras correr la migración:
--
--   select column_name from information_schema.columns
--    where table_name = 'pedidos' and table_schema = 'public';
--   -- debe incluir voucher_numero, pago_expira_en, banco_destino
--
--   select public.cancelar_pedidos_pago_vencidos();
-- ============================================================
