-- ============================================================
-- SUMAK — Migration 021 — RPCs admin para eliminar service_role del frontend (SEC-001)
-- ============================================================
-- El cliente supabaseAdmin del frontend usa service_role key incluida
-- en el bundle JavaScript. Para eliminarlo, exponemos RPCs SECURITY
-- DEFINER que validan rol internamente con is_admin() o
-- is_operaciones_or_admin().
--
-- 4 RPCs nuevas:
--   admin_kpis()                              -> dashboard counts
--   mark_comision_pagada(...)                 -> pago de comision por fila
--   admin_set_distribuidor_estado(...)        -> suspender/activar
--   admin_set_pedido_estado(...)              -> cambiar estado pedido
--
-- Idempotente.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) admin_kpis() — counts agregados del dashboard admin
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_mes_inicio timestamptz := date_trunc('month', now());
begin
  if not public.is_operaciones_or_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'afiliaciones_pendientes', (select count(*) from public.afiliaciones where estado='pendiente'),
    'afiliaciones_hoy',        (select count(*) from public.afiliaciones where created_at >= date_trunc('day', now())),
    'distribuidores_activos',  (select count(*) from public.profiles where rol='distribuidor' and estado='activo'),
    'distribuidores_suspendidos', (select count(*) from public.profiles where rol='distribuidor' and estado='suspendido'),
    'distribuidores_nuevos_mes', (select count(*) from public.profiles where rol='distribuidor' and fecha_registro >= v_mes_inicio),
    'comisiones_pendientes_monto', coalesce((select sum(monto) from public.comisiones where estado='pendiente'), 0),
    'comisiones_pendientes_count', (select count(*) from public.comisiones where estado='pendiente'),
    'comisiones_pagadas_mes_monto', coalesce((select sum(monto) from public.comisiones where estado='pagado' and pagado_at >= v_mes_inicio), 0),
    'comisiones_pagadas_mes_count', (select count(*) from public.comisiones where estado='pagado' and pagado_at >= v_mes_inicio),
    'pedidos_pendientes',      (select count(*) from public.pedidos where estado='pendiente'),
    'pedidos_procesando',      (select count(*) from public.pedidos where estado='procesando'),
    'pedidos_enviados',        (select count(*) from public.pedidos where estado='enviado'),
    'pedidos_mes_count',       (select count(*) from public.pedidos where created_at >= v_mes_inicio and estado <> 'cancelado'),
    'pedidos_mes_total',       coalesce((select sum(total) from public.pedidos where created_at >= v_mes_inicio and estado <> 'cancelado'), 0),
    'incidencias_abiertas',    (select count(*) from public.pedidos where incidencia is not null)
  ) into v;
  return v;
end $$;

revoke all on function public.admin_kpis() from public;
grant execute on function public.admin_kpis() to authenticated;

comment on function public.admin_kpis() is
  'Devuelve counts y montos agregados del dashboard admin/operaciones. Valida is_operaciones_or_admin internamente. Reemplaza llamadas individuales con supabaseAdmin desde AdminDashboard.';

-- ─────────────────────────────────────────────────────────────
-- 2) mark_comision_pagada(...) — pago de una comision por admin/ops
-- ─────────────────────────────────────────────────────────────
create or replace function public.mark_comision_pagada(
  p_id uuid,
  p_voucher_url text default null,
  p_voucher_numero text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comision record;
begin
  if not public.is_operaciones_or_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_comision from public.comisiones where id = p_id for update;
  if not found then
    raise exception 'Comision % no encontrada', p_id using errcode = 'P0001';
  end if;
  if v_comision.estado = 'pagado' then
    return jsonb_build_object('ok', true, 'already_paid', true);
  end if;
  if v_comision.estado = 'cancelado' then
    raise exception 'No se puede pagar una comision cancelada' using errcode = '22023';
  end if;

  update public.comisiones
     set estado = 'pagado',
         pagado_at = now(),
         pagado_por = auth.uid(),
         voucher_url = p_voucher_url,
         voucher_numero = nullif(trim(coalesce(p_voucher_numero, '')), '')
   where id = p_id;

  return jsonb_build_object('ok', true, 'already_paid', false);
end $$;

revoke all on function public.mark_comision_pagada(uuid, text, text) from public;
grant execute on function public.mark_comision_pagada(uuid, text, text) to authenticated;

comment on function public.mark_comision_pagada(uuid, text, text) is
  'Marca una comision como pagada. Solo admin u operaciones. Idempotente: si ya esta pagada no hace nada y devuelve already_paid=true. Bloquea pagar comisiones canceladas.';

-- ─────────────────────────────────────────────────────────────
-- 3) admin_set_distribuidor_estado(...) — suspender/activar distribuidor
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_set_distribuidor_estado(
  p_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede suspender o activar distribuidores' using errcode = '42501';
  end if;
  if p_estado not in ('activo', 'suspendido') then
    raise exception 'Estado invalido: % (esperado: activo | suspendido)', p_estado using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = p_id for update;
  if not found then
    raise exception 'Profile % no encontrado', p_id using errcode = 'P0001';
  end if;
  if v_profile.rol <> 'distribuidor' then
    raise exception 'Solo se puede cambiar el estado de profiles con rol distribuidor (actual: %)', v_profile.rol using errcode = '22023';
  end if;

  update public.profiles
     set estado = p_estado
   where id = p_id;

  return jsonb_build_object('ok', true, 'estado_nuevo', p_estado);
end $$;

revoke all on function public.admin_set_distribuidor_estado(uuid, text) from public;
grant execute on function public.admin_set_distribuidor_estado(uuid, text) to authenticated;

comment on function public.admin_set_distribuidor_estado(uuid, text) is
  'Cambia el estado de un distribuidor a activo o suspendido. SOLO ADMIN. Bloquea cambiar estado de admin u operaciones.';

-- ─────────────────────────────────────────────────────────────
-- 4) admin_set_pedido_estado(...) — cambiar estado de un pedido
-- Para cancelar usar la RPC cancel_pedido existente (que revierte
-- puntos y comisiones). Para marcar enviado usar la mutacion directa
-- en AdminPedidos que sube el voucher (todavia con supabaseAdmin).
-- Esta RPC cubre transiciones simples: pendiente -> procesando,
-- procesando -> enviado (sin voucher, caso edge), no cubre cancelado
-- ni entregado.
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_set_pedido_estado(
  p_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido record;
begin
  if not public.is_operaciones_or_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_estado not in ('pendiente', 'procesando', 'enviado') then
    raise exception 'Estado invalido para esta RPC: %. Para cancelar usar cancel_pedido. Entregado lo marca el distribuidor con mark_pedido_entregado.', p_estado using errcode = '22023';
  end if;

  select * into v_pedido from public.pedidos where id = p_id for update;
  if not found then
    raise exception 'Pedido % no encontrado', p_id using errcode = 'P0001';
  end if;
  if v_pedido.estado = 'entregado' then
    raise exception 'No se puede modificar un pedido entregado (es inmutable)' using errcode = '22023';
  end if;
  if v_pedido.estado = 'cancelado' then
    raise exception 'No se puede modificar un pedido cancelado' using errcode = '22023';
  end if;

  update public.pedidos
     set estado = p_estado
   where id = p_id;

  return jsonb_build_object('ok', true, 'estado_anterior', v_pedido.estado, 'estado_nuevo', p_estado);
end $$;

revoke all on function public.admin_set_pedido_estado(uuid, text) from public;
grant execute on function public.admin_set_pedido_estado(uuid, text) to authenticated;

comment on function public.admin_set_pedido_estado(uuid, text) is
  'Cambia el estado de un pedido (pendiente/procesando/enviado). admin u operaciones. Bloquea cancelado (usar cancel_pedido), entregado (lo marca el distribuidor). No toca pedidos ya entregados o cancelados.';

-- ============================================================
-- VERIFICACION
--   select proname, pronargs from pg_proc
--    where proname in (
--      'admin_kpis','mark_comision_pagada',
--      'admin_set_distribuidor_estado','admin_set_pedido_estado'
--    );
-- ============================================================
