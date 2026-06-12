-- ============================================================
-- SUMAK — Migration 007 — Rol "operaciones"
-- ============================================================
-- Introduce un tercer rol además de 'distribuidor' y 'admin' para
-- delegar la operación diaria sin entregar acceso completo de admin.
--
-- El rol 'operaciones' puede:
--   ✔ ver y procesar TODOS los pedidos (cambiar estado, cancelar)
--   ✔ ver y marcar TODAS las comisiones (pagar, cancelar)
--   ✔ ver, aprobar y rechazar TODAS las solicitudes de afiliación
--   ✔ ver el listado de distribuidores (lectura para contexto)
--   ✔ insertar profiles nuevos (durante la aprobación de afiliados)
--   ✔ administrar la red binaria (necesario al aprobar afiliados)
--
-- El rol 'operaciones' NO puede:
--   ✘ ver/editar comisiones personales del admin (/admin/mis-comisiones)
--   ✘ promover otros usuarios a admin u operaciones
--   ✘ modificar configuración del sistema
--
-- Esta migración es IDEMPOTENTE (puede correrse varias veces).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Ampliar el check constraint de profiles.rol
-- ─────────────────────────────────────────────────────────────
do $$ begin
  -- En PostgreSQL los check constraints no se "ALTER" — hay que dropear
  -- y recrear. Esta operación es segura porque los datos existentes
  -- ('distribuidor', 'admin') siguen siendo válidos en el nuevo set.
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_rol_check'
  ) then
    alter table public.profiles drop constraint profiles_rol_check;
  end if;
  alter table public.profiles
    add constraint profiles_rol_check
    check (rol in ('distribuidor', 'admin', 'operaciones'));
end $$;

comment on column public.profiles.rol is
  'Rol del usuario: distribuidor (red), admin (control total) u operaciones (gestiona pedidos/comisiones/solicitudes sin acceso a configuración).';

-- ─────────────────────────────────────────────────────────────
-- 2. Helper de autorización para el nuevo rol
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_operaciones_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and rol in ('admin', 'operaciones')
      and estado = 'activo'
  );
$$;

revoke all on function public.is_operaciones_or_admin() from public;
grant execute on function public.is_operaciones_or_admin() to authenticated;

comment on function public.is_operaciones_or_admin() is
  'true si el usuario autenticado es admin u operaciones (ambos en estado activo). Usada por las políticas RLS de pedidos, comisiones, afiliaciones, red_binaria y profiles para el workflow operativo.';

-- ─────────────────────────────────────────────────────────────
-- 3. Políticas RLS — PEDIDOS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Users can read own pedidos" on public.pedidos;
drop policy if exists "Users can insert own pedidos" on public.pedidos;
drop policy if exists "Admins can update pedidos" on public.pedidos;
-- Idempotencia: dropear también las políticas con nombres nuevos por si
-- una corrida previa quedó a medias.
drop policy if exists "Distribuidor lee sus pedidos, ops/admin todos" on public.pedidos;
drop policy if exists "Distribuidor inserta sus pedidos" on public.pedidos;
drop policy if exists "Ops/admin actualizan pedidos" on public.pedidos;

create policy "Distribuidor lee sus pedidos, ops/admin todos"
  on public.pedidos
  for select using (
    distribuidor_id = auth.uid()
    or public.is_operaciones_or_admin()
  );

create policy "Distribuidor inserta sus pedidos"
  on public.pedidos
  for insert with check (distribuidor_id = auth.uid());

create policy "Ops/admin actualizan pedidos"
  on public.pedidos
  for update using (public.is_operaciones_or_admin());

-- ─────────────────────────────────────────────────────────────
-- 4. Políticas RLS — COMISIONES
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Users can read own comisiones" on public.comisiones;
drop policy if exists "Admins can manage comisiones" on public.comisiones;
drop policy if exists "Beneficiario lee sus comisiones, ops/admin todas" on public.comisiones;
drop policy if exists "Ops/admin administran comisiones" on public.comisiones;

create policy "Beneficiario lee sus comisiones, ops/admin todas"
  on public.comisiones
  for select using (
    beneficiario_id = auth.uid()
    or public.is_operaciones_or_admin()
  );

create policy "Ops/admin administran comisiones"
  on public.comisiones
  for all using (public.is_operaciones_or_admin())
  with check (public.is_operaciones_or_admin());

-- ─────────────────────────────────────────────────────────────
-- 5. Políticas RLS — AFILIACIONES
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Admins can read afiliaciones" on public.afiliaciones;
drop policy if exists "Admins can update afiliaciones" on public.afiliaciones;
drop policy if exists "Ops/admin leen afiliaciones" on public.afiliaciones;
drop policy if exists "Ops/admin actualizan afiliaciones" on public.afiliaciones;

create policy "Ops/admin leen afiliaciones"
  on public.afiliaciones
  for select using (public.is_operaciones_or_admin());

create policy "Ops/admin actualizan afiliaciones"
  on public.afiliaciones
  for update using (public.is_operaciones_or_admin());

-- la política "Public can insert afiliaciones" se mantiene intacta —
-- cualquier persona del público puede solicitar afiliación.

-- ─────────────────────────────────────────────────────────────
-- 6. Políticas RLS — PROFILES
-- Operaciones puede crear profiles (al aprobar afiliados) y leer/
-- actualizar profiles de distribuidores (suspender, activar). No
-- puede leer profiles de otros admins/operaciones por la cláusula
-- explícita.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Lectura de profiles" on public.profiles;
drop policy if exists "Ops/admin insertan profiles" on public.profiles;
drop policy if exists "Actualización de profiles" on public.profiles;

create policy "Lectura de profiles"
  on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (public.is_operaciones_or_admin() and rol = 'distribuidor')
  );

create policy "Ops/admin insertan profiles"
  on public.profiles
  for insert with check (
    public.is_operaciones_or_admin()
    -- Por seguridad sólo permiten crear distribuidores. La promoción
    -- a admin/operaciones se hace manualmente con un UPDATE directo.
    and rol = 'distribuidor'
  );

create policy "Actualización de profiles"
  on public.profiles
  for update using (
    id = auth.uid()
    or public.is_admin()
    or (public.is_operaciones_or_admin() and rol = 'distribuidor')
  );

-- ─────────────────────────────────────────────────────────────
-- 7. Políticas RLS — RED_BINARIA
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Users can read own red" on public.red_binaria;
drop policy if exists "Admins can manage red" on public.red_binaria;
drop policy if exists "Lectura de la red" on public.red_binaria;
drop policy if exists "Ops/admin administran red" on public.red_binaria;

create policy "Lectura de la red"
  on public.red_binaria
  for select using (
    public.is_operaciones_or_admin()
    or distribuidor_id = auth.uid()
    or padre_id in (
      select id from public.red_binaria where distribuidor_id = auth.uid()
    )
  );

create policy "Ops/admin administran red"
  on public.red_binaria
  for all using (public.is_operaciones_or_admin())
  with check (public.is_operaciones_or_admin());

-- ─────────────────────────────────────────────────────────────
-- 8. RPC cancel_pedido — permitir operaciones
-- (Fase 1 sólo aceptaba admin)
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
  v_caller_ok boolean;
begin
  select public.is_operaciones_or_admin() into v_caller_ok;
  if not v_caller_ok then
    raise exception 'Solo admin u operaciones pueden cancelar pedidos' using errcode = '42501';
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido % no encontrado', p_pedido_id using errcode = 'P0001';
  end if;

  if v_pedido.estado = 'cancelado' then
    return jsonb_build_object('ok', true, 'already_cancelled', true);
  end if;

  if v_pedido.estado in ('procesando','enviado','entregado') and v_pedido.puntos_generados > 0 then
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

exception when others then
  raise;
end;
$$;

revoke all on function public.cancel_pedido(uuid, text) from public;
grant execute on function public.cancel_pedido(uuid, text) to authenticated;

-- finish_approve_afiliacion ya es SECURITY DEFINER y está GRANT a authenticated;
-- al estar el rol operaciones autenticado, puede llamarla. No requiere cambio.

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN sugerida tras correr la migración
-- ─────────────────────────────────────────────────────────────
-- 1) check constraint actualizado:
--    select pg_get_constraintdef(oid) from pg_constraint
--      where conname = 'profiles_rol_check';
--    -- debe incluir 'operaciones'
--
-- 2) helper creado:
--    select proname from pg_proc where proname = 'is_operaciones_or_admin';
--    -- 1 fila
--
-- 3) políticas reescritas:
--    select policyname from pg_policies
--      where schemaname = 'public'
--        and tablename in ('pedidos','comisiones','afiliaciones','profiles','red_binaria')
--      order by tablename, policyname;
--
-- ── Para SEEDER del usuario operaciones inicial: ver
-- ── 007b_seed_operaciones_user.sql
-- ============================================================
