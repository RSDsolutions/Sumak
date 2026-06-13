-- ============================================================
-- SUMAK — Migration 011 — Ajustes de scope operaciones + estados pedido
-- ============================================================
-- Objetivos:
--
-- (A) Acotar el rol "operaciones" a su scope real (comisiones e ingresos):
--     ✘ no puede aprobar/rechazar solicitudes de afiliacion
--     ✘ no puede suspender/activar distribuidores
--     ✘ no puede cancelar pedidos
--   ✔ sigue marcando comisiones como pagadas (con voucher)
--   ✔ sigue procesando pedidos (pendiente -> procesando -> enviado, con voucher)
--
-- (B) Flujo de recepcion por parte del distribuidor:
--   ✔ public.mark_pedido_entregado  — distribuidor confirma recepcion
--   ✔ public.report_pedido_issue    — distribuidor reporta problema
--   ✔ columnas incidencia + incidencia_at + recibido_at
--
-- (C) Bloquear modificaciones a pedidos ya 'entregado'. Una vez
--     confirmada la recepcion, la venta queda inmutable (RLS + trigger).
--
-- Idempotente.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) Restringir cancel_pedido a admin (revertir cambio de 007)
-- ─────────────────────────────────────────────────────────────
create or replace function public.cancel_pedido(
  p_pedido_id uuid,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido record;
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede cancelar pedidos' using errcode = '42501';
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido % no encontrado', p_pedido_id using errcode = 'P0001';
  end if;

  if v_pedido.estado = 'cancelado' then
    return jsonb_build_object('ok', true, 'already_cancelled', true);
  end if;

  if v_pedido.estado = 'entregado' then
    raise exception 'No se puede cancelar un pedido ya entregado' using errcode = '22023';
  end if;

  if v_pedido.estado in ('procesando','enviado') and v_pedido.puntos_generados > 0 then
    update public.profiles
      set puntos = greatest(0, coalesce(puntos, 0) - v_pedido.puntos_generados)
      where id = v_pedido.distribuidor_id;
  end if;

  update public.comisiones
    set estado = 'cancelado'
    where pedido_id = p_pedido_id
      and estado = 'pendiente';

  update public.pedidos
    set estado = 'cancelado',
        notas = coalesce(notas || ' | ', '') || 'Cancelado: ' || coalesce(p_motivo, 'sin motivo')
    where id = p_pedido_id;

  return jsonb_build_object('ok', true, 'already_cancelled', false);
end;
$$;

revoke all on function public.cancel_pedido(uuid, text) from public;
grant execute on function public.cancel_pedido(uuid, text) to authenticated;

comment on function public.cancel_pedido(uuid, text) is
  'Cancela un pedido y revierte sus efectos. SOLO ADMIN (operaciones perdio este permiso en 011). Nunca permite cancelar un pedido entregado.';

-- ─────────────────────────────────────────────────────────────
-- 2) Restringir aprobacion de afiliaciones a admin
--
-- Caso real (jun-2026): algunos entornos tienen la firma de 4 args
-- (finish_approve_afiliacion(uuid,uuid,text,uuid)) heredada de la
-- migracion 006 sin haber aplicado 008; otros ya tienen la firma
-- de 5 args con p_abrir_como_frontal. Hacemos el wrapper agnostico
-- a la firma: detectamos cuantos args tiene y llamamos con EXECUTE
-- dinamico. Idempotente y robusto.
-- ─────────────────────────────────────────────────────────────

-- Gate publico: la app cliente debe usar SIEMPRE esta funcion.
-- Internamente invoca finish_approve_afiliacion (4-arg o 5-arg
-- segun la version vigente en la DB).
create or replace function public.approve_afiliacion(
  p_afiliacion_id uuid,
  p_user_id uuid,
  p_codigo text,
  p_padre_profile_id uuid default null,
  p_abrir_como_frontal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_nargs int;
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede aprobar afiliaciones' using errcode = '42501';
  end if;

  select max(pronargs) into v_nargs
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'finish_approve_afiliacion';

  if v_nargs is null then
    raise exception 'finish_approve_afiliacion no existe en esta DB. Corre las migraciones 006 y 008 antes que 011.' using errcode = '42883';
  end if;

  if v_nargs >= 5 then
    execute 'select public.finish_approve_afiliacion($1,$2,$3,$4,$5)'
      into v_result
      using p_afiliacion_id, p_user_id, p_codigo, p_padre_profile_id, p_abrir_como_frontal;
  else
    -- Firma vieja (006): no soporta p_abrir_como_frontal. Si se pidio
    -- abrir como frontal, avisamos para que el operador corra 008.
    if p_abrir_como_frontal then
      raise notice 'Tu DB usa finish_approve_afiliacion(4 args). Para soportar "abrir como frontal" corre la migracion 008. Procediendo con asignacion automatica.';
    end if;
    execute 'select public.finish_approve_afiliacion($1,$2,$3,$4)'
      into v_result
      using p_afiliacion_id, p_user_id, p_codigo, p_padre_profile_id;
  end if;
  return v_result;
end;
$$;

revoke all on function public.approve_afiliacion(uuid, uuid, text, uuid, boolean) from public;
grant execute on function public.approve_afiliacion(uuid, uuid, text, uuid, boolean)
  to authenticated, service_role;

comment on function public.approve_afiliacion(uuid, uuid, text, uuid, boolean) is
  'Wrapper con gate admin-only para aprobar afiliacion. La app cliente debe usar esta funcion en lugar de finish_approve_afiliacion directamente. Detecta la firma (4 o 5 args) en runtime via EXECUTE.';

-- Revocar el permiso a authenticated en finish_approve_afiliacion para
-- AMBAS firmas posibles (si existen). Hacemos cada revoke en un bloque
-- separado para que la ausencia de una no rompa la otra.
do $$ begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'finish_approve_afiliacion' and p.pronargs = 5
  ) then
    execute 'revoke execute on function public.finish_approve_afiliacion(uuid, uuid, text, uuid, boolean) from authenticated';
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'finish_approve_afiliacion' and p.pronargs = 4
  ) then
    execute 'revoke execute on function public.finish_approve_afiliacion(uuid, uuid, text, uuid) from authenticated';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3) Restringir UPDATE en profiles: operaciones ya NO puede
--    suspender/activar distribuidores. Solo admin o el propio user.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Actualización de profiles" on public.profiles;
create policy "Actualización de profiles"
  on public.profiles
  for update using (
    id = auth.uid()
    or public.is_admin()
  );

-- Operaciones tampoco puede insertar profiles (ya no aprueba afiliaciones).
drop policy if exists "Ops/admin insertan profiles" on public.profiles;
create policy "Admin inserta profiles"
  on public.profiles
  for insert with check (public.is_admin());

-- Operaciones tampoco gestiona red_binaria (su trabajo es financiero).
drop policy if exists "Ops/admin administran red" on public.red_binaria;
create policy "Admin administra red"
  on public.red_binaria
  for all using (public.is_admin())
  with check (public.is_admin());

-- Afiliaciones: operaciones pierde el update (no aprueba/rechaza).
drop policy if exists "Ops/admin actualizan afiliaciones" on public.afiliaciones;
create policy "Admin actualiza afiliaciones"
  on public.afiliaciones
  for update using (public.is_admin());

drop policy if exists "Ops/admin leen afiliaciones" on public.afiliaciones;
create policy "Admin lee afiliaciones"
  on public.afiliaciones
  for select using (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 4) Columnas nuevas en pedidos para flujo recibir / incidencia
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'recibido_at') then
    alter table public.pedidos add column recibido_at timestamp with time zone;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'incidencia') then
    alter table public.pedidos add column incidencia text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'incidencia_at') then
    alter table public.pedidos add column incidencia_at timestamp with time zone;
  end if;
end $$;

comment on column public.pedidos.recibido_at is
  'Timestamp cuando el distribuidor confirmo la recepcion. Cierra el pedido en entregado.';
comment on column public.pedidos.incidencia is
  'Descripcion del problema reportado por el distribuidor en un pedido enviado. Si es no-null hay una incidencia abierta.';
comment on column public.pedidos.incidencia_at is
  'Cuando se reporto la incidencia.';

-- ─────────────────────────────────────────────────────────────
-- 5) RPC mark_pedido_entregado — el distribuidor confirma recepcion
-- ─────────────────────────────────────────────────────────────
create or replace function public.mark_pedido_entregado(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido % no encontrado', p_pedido_id using errcode = 'P0001';
  end if;
  if v_pedido.distribuidor_id <> auth.uid() then
    raise exception 'Solo el distribuidor del pedido puede confirmar su recepcion' using errcode = '42501';
  end if;
  if v_pedido.estado <> 'enviado' then
    raise exception 'El pedido debe estar enviado para confirmar la recepcion (actual: %)', v_pedido.estado using errcode = '22023';
  end if;

  update public.pedidos
    set estado = 'entregado',
        recibido_at = now(),
        incidencia = null,
        incidencia_at = null
    where id = p_pedido_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.mark_pedido_entregado(uuid) from public;
grant execute on function public.mark_pedido_entregado(uuid) to authenticated;

comment on function public.mark_pedido_entregado(uuid) is
  'El distribuidor dueno del pedido confirma que lo recibio. Pasa de enviado a entregado. A partir de aqui el pedido es inmutable.';

-- ─────────────────────────────────────────────────────────────
-- 6) RPC report_pedido_issue — distribuidor reporta problema
-- ─────────────────────────────────────────────────────────────
create or replace function public.report_pedido_issue(
  p_pedido_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido record;
  v_motivo text;
begin
  v_motivo := trim(coalesce(p_motivo, ''));
  if length(v_motivo) < 5 then
    raise exception 'Describe el problema con al menos 5 caracteres' using errcode = '22023';
  end if;
  if length(v_motivo) > 1000 then
    v_motivo := left(v_motivo, 1000);
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido % no encontrado', p_pedido_id using errcode = 'P0001';
  end if;
  if v_pedido.distribuidor_id <> auth.uid() then
    raise exception 'Solo el distribuidor del pedido puede reportar un problema' using errcode = '42501';
  end if;
  if v_pedido.estado not in ('enviado','procesando') then
    raise exception 'Solo se puede reportar un problema en pedidos en transito (actual: %)', v_pedido.estado using errcode = '22023';
  end if;

  update public.pedidos
    set incidencia = v_motivo,
        incidencia_at = now(),
        notas = coalesce(notas || ' | ', '') || 'Incidencia reportada: ' || v_motivo
    where id = p_pedido_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.report_pedido_issue(uuid, text) from public;
grant execute on function public.report_pedido_issue(uuid, text) to authenticated;

comment on function public.report_pedido_issue(uuid, text) is
  'El distribuidor reporta un problema con su pedido en transito. No cambia el estado. Marca incidencia en el pedido para que admin/operaciones lo vean.';

-- ─────────────────────────────────────────────────────────────
-- 7) Permitir al distribuidor llamar esos RPCs requiere que el
--    distribuidor pueda updatear su propio pedido para los flags
--    de incidencia (la RPC corre como SECURITY DEFINER, por lo
--    que el UPDATE pasa RLS, pero por completitud anadimos una
--    policy de UPDATE para el distribuidor SOLO en pedidos en
--    estado pendiente — caso de cancelar antes de pagar, etc.)
--    Ya existe la policy ops/admin para todo lo demas.
-- ─────────────────────────────────────────────────────────────
-- No agregamos policy nueva — el SECURITY DEFINER de los RPC ya
-- maneja todo. Documentamos.

-- ─────────────────────────────────────────────────────────────
-- 8) Trigger: pedido 'entregado' es INMUTABLE
--    Una vez recibido, nadie (ni admin) puede cambiar estado
--    ni montos / items relacionados. Esto cierra la venta.
-- ─────────────────────────────────────────────────────────────
create or replace function public.pedidos_lock_entregado()
returns trigger
language plpgsql
as $$
begin
  -- Permitir UPDATEs a 'updated_at' u otros campos meta? No — congelamos
  -- el pedido por completo cuando esta entregado.
  if OLD.estado = 'entregado' then
    -- Pero permitimos pasar a 'cancelado' bajo ninguna circunstancia.
    raise exception 'No se puede modificar un pedido entregado (es inmutable). Pedido: %', OLD.id
      using errcode = '22023';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_pedidos_lock_entregado on public.pedidos;
create trigger trg_pedidos_lock_entregado
  before update on public.pedidos
  for each row
  when (OLD.estado = 'entregado')
  execute function public.pedidos_lock_entregado();

comment on function public.pedidos_lock_entregado() is
  'Trigger que impide cualquier UPDATE sobre un pedido en estado entregado. Garantiza inmutabilidad de la venta una vez recibida por el distribuidor.';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACION
--   select proname, pg_get_function_arguments(oid)
--    from pg_proc where proname in (
--      'cancel_pedido','approve_afiliacion','mark_pedido_entregado','report_pedido_issue'
--    );
--
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='pedidos'
--      and column_name in ('recibido_at','incidencia','incidencia_at');
--   -- 3 filas
--
--   select tgname from pg_trigger where tgname = 'trg_pedidos_lock_entregado';
--   -- 1 fila
-- ============================================================
