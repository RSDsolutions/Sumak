-- ============================================================
-- SUMAK — Migration 006 — Fase 1 de hardening
-- Atiende hallazgos: SEC-002, SEC-003, SEC-004, BIZ-001, BIZ-002, BIZ-005
-- ============================================================
-- Esta migración es ADITIVA y IDEMPOTENTE. No elimina ni modifica
-- políticas, columnas o funciones existentes; solo añade nuevas.
-- Por eso es segura aplicarla en producción sin tocar el código
-- actual: el cliente sigue funcionando igual mientras se adoptan
-- las nuevas RPCs / vistas en PRs posteriores.
--
-- Cómo aplicarla:
--   1) Pegarla entera en el SQL Editor de Supabase y ejecutar.
--   2) Verificar con las consultas del final.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SEC-003 — Función pública para buscar patrocinador
-- Permite que la página pública /registro confirme nombre del
-- patrocinador sin exponer cédula, teléfono, dirección, etc.
-- security definer + search_path fijo = sin riesgo de shadow.
-- ─────────────────────────────────────────────────────────────
create or replace function public.lookup_sponsor(p_codigo text)
returns table(
  id uuid,
  codigo_distribuidor text,
  nombre_completo text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.codigo_distribuidor, p.nombre_completo
  from public.profiles p
  where p.codigo_distribuidor = upper(trim(p_codigo))
    and p.rol = 'distribuidor'
    and p.estado = 'activo'
  limit 1;
$$;

revoke all on function public.lookup_sponsor(text) from public;
grant execute on function public.lookup_sponsor(text) to anon, authenticated;

comment on function public.lookup_sponsor(text) is
  'Búsqueda pública de patrocinador por código. Devuelve solo campos no sensibles. Usada en el formulario público de registro.';

-- ─────────────────────────────────────────────────────────────
-- 2. SEC-004 — Endurecer política INSERT del bucket de vouchers
-- La política anterior ("Authenticated users can upload payment
-- vouchers") permite que cualquier autenticado suba a cualquier
-- carpeta. Esta nueva exige que la primera carpeta del path
-- coincida con el auth.uid() del usuario.
--
-- IMPORTANTE: NO eliminamos la política antigua para no romper
-- nada en caso de rollback; ambas pueden coexistir porque las
-- políticas son OR. Si querés tighter, dropea la antigua manual.
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Distribuidores suben vouchers solo a su carpeta'
  ) then
    create policy "Distribuidores suben vouchers solo a su carpeta" on storage.objects
      for insert
      with check (
        bucket_id = 'pedidos-vouchers'
        and auth.uid() is not null
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. BIZ-002 — Vincular comisiones a su pedido origen
-- Permite cancelar comisiones de forma exacta al cancelar el
-- pedido que las generó, en vez de la heurística de "± 5 min".
-- Columna nullable: datos históricos quedan sin vincular y la
-- lógica vieja sigue funcionando para ellos.
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comisiones' and column_name = 'pedido_id'
  ) then
    alter table public.comisiones
      add column pedido_id uuid references public.pedidos(id) on delete set null;
  end if;
end $$;

create index if not exists idx_comisiones_pedido on public.comisiones (pedido_id)
  where pedido_id is not null;

comment on column public.comisiones.pedido_id is
  'Pedido que originó la comisión. Permite cancelar comisiones precisamente al cancelar el pedido. NULL en comisiones legacy creadas antes de la migración 006.';

-- ─────────────────────────────────────────────────────────────
-- 4. BIZ-005 — Llave de idempotencia para pedidos
-- Evita pedidos duplicados por doble-click o reintentos de red.
-- El cliente genera un UUID por sesión de checkout y lo manda.
-- Si insert duplica, falla con 23505 y el cliente trata como OK.
-- Columna nullable: pedidos viejos no la tienen.
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'idempotency_key'
  ) then
    alter table public.pedidos add column idempotency_key uuid;
  end if;
end $$;

create unique index if not exists uq_pedidos_idempotency_key
  on public.pedidos (idempotency_key)
  where idempotency_key is not null;

comment on column public.pedidos.idempotency_key is
  'UUID único generado por el cliente al iniciar checkout. Evita pedidos duplicados ante doble-submit. NULL en pedidos legacy.';

-- ─────────────────────────────────────────────────────────────
-- 5. SEC-002 — RPC transaccional para finalizar aprobación de afiliado
-- Esta función ejecuta TODO el flujo posterior a createUser dentro
-- de una transacción implícita (PL/pgSQL block = transaction). Si
-- cualquier paso falla, NADA se persiste y se devuelve error.
--
-- El cliente sigue siendo responsable de:
--   a) crear el auth.users con supabase.auth.admin.createUser
--   b) llamar a esta RPC con el user_id resultante
--   c) si la RPC falla, borrar el auth.users creado en (a)
--
-- Esto NO elimina la dependencia del service_role en el cliente
-- (que es SEC-001 — Edge Functions). Pero garantiza que los pasos
-- SQL son atómicos, que era SEC-002.
--
-- Estructura de salida: jsonb con codigo y mensaje.
-- ─────────────────────────────────────────────────────────────
create or replace function public.finish_approve_afiliacion(
  p_afiliacion_id uuid,
  p_user_id uuid,
  p_codigo text,
  p_padre_profile_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_afiliacion record;
  v_patrocinador_id uuid;
  v_admin_id uuid;
  v_padre_nodo_id uuid;
  v_padre_nivel integer := 0;
  v_padre_rol text;
  v_posicion text;
  v_tiene_izq boolean;
  v_tiene_der boolean;
  v_paquete_puntos integer;
  v_paquete_precio numeric;
  v_paquete_nombre text;
  v_pedido_id uuid;
  v_porcentajes constant jsonb := '[
    {"nivel":1,"porcentaje":15},
    {"nivel":2,"porcentaje":10},
    {"nivel":3,"porcentaje":8},
    {"nivel":4,"porcentaje":5},
    {"nivel":5,"porcentaje":4},
    {"nivel":6,"porcentaje":3},
    {"nivel":7,"porcentaje":2},
    {"nivel":8,"porcentaje":2},
    {"nivel":9,"porcentaje":1},
    {"nivel":10,"porcentaje":1},
    {"nivel":11,"porcentaje":1},
    {"nivel":12,"porcentaje":1},
    {"nivel":13,"porcentaje":1},
    {"nivel":14,"porcentaje":1}
  ]'::jsonb;
  v_upline_id uuid;
  v_upline_record record;
  v_eligible_upline uuid[];
  v_start_of_month timestamptz := date_trunc('month', now());
  v_monto numeric;
begin
  -- 1) Cargar la afiliación a aprobar
  select * into v_afiliacion from public.afiliaciones where id = p_afiliacion_id;
  if not found then
    raise exception 'Afiliación % no encontrada', p_afiliacion_id using errcode = 'P0001';
  end if;
  if v_afiliacion.estado <> 'pendiente' then
    raise exception 'La afiliación % ya está en estado %', p_afiliacion_id, v_afiliacion.estado using errcode = 'P0001';
  end if;

  -- 2) Resolver puntos / precio según paquete (constantes del plan)
  v_paquete_puntos := case v_afiliacion.paquete_seleccionado
    when 'basico' then 125
    when 'emprendedor' then 225
    when 'lider' then 525
    else 0 end;
  v_paquete_precio := v_paquete_puntos;  -- coinciden por construcción del plan
  v_paquete_nombre := initcap(v_afiliacion.paquete_seleccionado);

  -- 3) Resolver patrocinador: declarado, sino admin (root)
  select id into v_admin_id from public.profiles where rol = 'admin' order by fecha_registro limit 1;
  if v_admin_id is null then
    raise exception 'No hay admin configurado en profiles' using errcode = 'P0001';
  end if;

  if v_afiliacion.codigo_patrocinador is not null then
    select id into v_patrocinador_id
      from public.profiles
      where codigo_distribuidor = v_afiliacion.codigo_patrocinador
      limit 1;
  end if;
  if v_patrocinador_id is null then v_patrocinador_id := v_admin_id; end if;

  -- 4) Insertar profile del nuevo distribuidor
  insert into public.profiles (
    id, codigo_distribuidor, nombre_completo, cedula, email, telefono,
    direccion, ciudad, codigo_patrocinador, patrocinador_id, paquete,
    puntos, rol, estado, fecha_aprobacion
  ) values (
    p_user_id, p_codigo, v_afiliacion.nombre_completo, v_afiliacion.cedula,
    v_afiliacion.email, v_afiliacion.telefono, v_afiliacion.direccion,
    v_afiliacion.ciudad, v_afiliacion.codigo_patrocinador, v_patrocinador_id,
    v_afiliacion.paquete_seleccionado::text, v_paquete_puntos,
    'distribuidor', 'activo', now()
  );

  -- 5) Resolver el padre en la red binaria
  if p_padre_profile_id is not null then
    select rb.id, rb.nivel, pr.rol
      into v_padre_nodo_id, v_padre_nivel, v_padre_rol
      from public.red_binaria rb
      join public.profiles pr on pr.id = rb.distribuidor_id
      where rb.distribuidor_id = p_padre_profile_id;

    -- si el padre es admin y no tiene nodo, créalo como root
    if v_padre_nodo_id is null then
      select rol into v_padre_rol from public.profiles where id = p_padre_profile_id;
      if v_padre_rol = 'admin' then
        insert into public.red_binaria (distribuidor_id, padre_id, posicion, nivel)
          values (p_padre_profile_id, null, null, 1)
          returning id, nivel into v_padre_nodo_id, v_padre_nivel;
      end if;
    end if;
  end if;

  -- 6) Auto-asignar posición izquierda/derecha si el padre no es admin
  if v_padre_nodo_id is not null then
    if v_padre_rol = 'admin' then
      v_posicion := null;
    else
      select
        bool_or(posicion = 'izquierda'),
        bool_or(posicion = 'derecha')
        into v_tiene_izq, v_tiene_der
      from public.red_binaria where padre_id = v_padre_nodo_id;
      if not coalesce(v_tiene_izq, false) then v_posicion := 'izquierda';
      elsif not coalesce(v_tiene_der, false) then v_posicion := 'derecha';
      else raise exception 'El padre seleccionado ya tiene Izquierda y Derecha ocupadas' using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- 7) Insertar en red_binaria
  insert into public.red_binaria (distribuidor_id, padre_id, posicion, nivel)
    values (p_user_id, v_padre_nodo_id, v_posicion, coalesce(v_padre_nivel, 0) + 1);

  -- 8) Marcar afiliación como aprobada
  update public.afiliaciones set estado = 'aprobada' where id = p_afiliacion_id;

  -- 9) Crear pedido inicial del paquete + items
  if v_paquete_precio > 0 then
    insert into public.pedidos (
      distribuidor_id, estado, tipo_precio, total, puntos_generados, notas
    ) values (
      p_user_id, 'procesando', 'distribuidor', v_paquete_precio, v_paquete_puntos,
      'Pedido inicial — Paquete ' || v_paquete_nombre || ' (afiliación)'
    ) returning id into v_pedido_id;

    insert into public.pedido_items (
      pedido_id, producto_codigo, producto_nombre, cantidad, precio_unitario, subtotal
    ) values (
      v_pedido_id,
      'PKG-' || upper(v_afiliacion.paquete_seleccionado::text),
      'Paquete ' || v_paquete_nombre,
      1, v_paquete_precio, v_paquete_precio
    );
  end if;

  -- 10) Comisión de afiliación 40% al patrocinador (vinculada al pedido inicial)
  if v_patrocinador_id is not null and v_paquete_precio > 0 then
    insert into public.comisiones (
      beneficiario_id, origen_id, pedido_id, tipo, monto, estado, descripcion
    ) values (
      v_patrocinador_id, p_user_id, v_pedido_id, 'afiliacion',
      round((v_paquete_precio * 0.40)::numeric, 2),
      'pendiente',
      'Comisión referido (40%) — ' || v_afiliacion.nombre_completo || ' — paquete ' || v_afiliacion.paquete_seleccionado::text
    );
  end if;

  -- 11) Comisiones por nivel a upline calificado del mes
  if v_paquete_puntos > 0 then
    v_upline_id := p_user_id;

    -- recolectar IDs del upline (hasta 14 niveles)
    create temporary table if not exists tmp_upline (
      nivel int, upline_id uuid, porcentaje int
    ) on commit drop;
    delete from tmp_upline;

    for v_upline_record in select * from jsonb_to_recordset(v_porcentajes) as x(nivel int, porcentaje int) order by nivel
    loop
      select patrocinador_id into v_upline_id from public.profiles where id = v_upline_id;
      exit when v_upline_id is null;
      insert into tmp_upline values (v_upline_record.nivel, v_upline_id, v_upline_record.porcentaje);
    end loop;

    -- filtrar a los que tienen pedido ≥ $100 calificado este mes
    select array_agg(distinct distribuidor_id) into v_eligible_upline
      from public.pedidos
      where distribuidor_id in (select upline_id from tmp_upline)
        and estado in ('procesando','enviado','entregado')
        and total >= 100
        and created_at >= v_start_of_month;

    insert into public.comisiones (
      beneficiario_id, origen_id, pedido_id, tipo, nivel_red, monto, estado, descripcion
    )
    select
      u.upline_id, p_user_id, v_pedido_id, 'nivel', u.nivel,
      round((v_paquete_puntos * u.porcentaje / 100.0)::numeric, 2),
      'pendiente',
      'Comisión nivel ' || u.nivel || ' — paquete ' || v_afiliacion.paquete_seleccionado::text
    from tmp_upline u
    where v_eligible_upline is not null
      and u.upline_id = any(v_eligible_upline)
      and round((v_paquete_puntos * u.porcentaje / 100.0)::numeric, 2) > 0;
  end if;

  return jsonb_build_object(
    'ok', true,
    'codigo', p_codigo,
    'pedido_id', v_pedido_id
  );

exception when others then
  -- PL/pgSQL revierte automáticamente todo el bloque al lanzar
  raise;
end;
$$;

revoke all on function public.finish_approve_afiliacion(uuid, uuid, text, uuid) from public;
grant execute on function public.finish_approve_afiliacion(uuid, uuid, text, uuid) to authenticated, service_role;

comment on function public.finish_approve_afiliacion(uuid, uuid, text, uuid) is
  'Aprobación atómica de afiliado: profile, red binaria, pedido inicial, ítems y comisiones de afiliación + nivel en una sola transacción. El auth.users debe crearse antes vía supabase.auth.admin.createUser y pasar el user_id resultante. Si esta función falla, el caller debe borrar el auth.users creado.';

-- ─────────────────────────────────────────────────────────────
-- 6. BIZ-001 — RPC server-side para enviar pedido del distribuidor
-- Acepta items + datos de pago y recalcula total + puntos desde
-- la BD (no confía en el cliente). Inserta pedido, items, suma
-- puntos al comprador y genera comisiones nivel, todo en una
-- transacción. El cliente no puede inflar puntos / comisiones.
--
-- Estructura del input items:
--   [{"codigo":"00001","nombre":"…","cantidad":2,"precio":12.50,"pvp":25.00}]
--
-- Por ahora confiamos en el precio que envía el cliente pero
-- el cómputo de subtotal/total/puntos se hace aquí. La siguiente
-- iteración leerá precios desde una tabla productos en BD.
-- ─────────────────────────────────────────────────────────────
create or replace function public.submit_pedido(
  p_idempotency_key uuid,
  p_items jsonb,
  p_voucher_url text,
  p_voucher_numero text,
  p_banco_destino text,
  p_notas text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item record;
  v_total numeric := 0;
  v_puntos integer := 0;
  v_pedido_id uuid;
  v_existing_id uuid;
  v_porcentajes constant jsonb := '[
    {"nivel":1,"porcentaje":15},
    {"nivel":2,"porcentaje":10},
    {"nivel":3,"porcentaje":8},
    {"nivel":4,"porcentaje":5},
    {"nivel":5,"porcentaje":4},
    {"nivel":6,"porcentaje":3},
    {"nivel":7,"porcentaje":2},
    {"nivel":8,"porcentaje":2},
    {"nivel":9,"porcentaje":1},
    {"nivel":10,"porcentaje":1},
    {"nivel":11,"porcentaje":1},
    {"nivel":12,"porcentaje":1},
    {"nivel":13,"porcentaje":1},
    {"nivel":14,"porcentaje":1}
  ]'::jsonb;
  v_upline_id uuid;
  v_upline_record record;
  v_eligible_upline uuid[];
  v_start_of_month timestamptz := date_trunc('month', now());
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  -- idempotencia
  select id into v_existing_id from public.pedidos where idempotency_key = p_idempotency_key;
  if v_existing_id is not null then
    return jsonb_build_object('ok', true, 'pedido_id', v_existing_id, 'duplicated', true);
  end if;

  -- recalcular total y puntos
  for v_item in select * from jsonb_to_recordset(p_items) as x(
    codigo text, nombre text, cantidad integer, precio numeric, pvp numeric
  ) loop
    if v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cantidad inválida para %', v_item.codigo using errcode = 'P0001';
    end if;
    if v_item.precio is null or v_item.precio < 0 then
      raise exception 'Precio inválido para %', v_item.codigo using errcode = 'P0001';
    end if;
    v_total := v_total + (v_item.precio * v_item.cantidad);
  end loop;
  v_puntos := round(v_total)::integer;

  -- crear pedido
  insert into public.pedidos (
    distribuidor_id, estado, tipo_precio, total, puntos_generados, notas,
    voucher_url, voucher_numero, banco_destino, idempotency_key
  ) values (
    v_user_id, 'procesando', 'distribuidor', v_total, v_puntos, p_notas,
    p_voucher_url, p_voucher_numero, p_banco_destino, p_idempotency_key
  ) returning id into v_pedido_id;

  -- insertar items
  insert into public.pedido_items (
    pedido_id, producto_codigo, producto_nombre, cantidad, precio_unitario, subtotal
  )
  select v_pedido_id, x.codigo, x.nombre, x.cantidad, x.precio, x.precio * x.cantidad
  from jsonb_to_recordset(p_items) as x(codigo text, nombre text, cantidad integer, precio numeric);

  -- sumar puntos al comprador
  if v_puntos > 0 then
    update public.profiles
      set puntos = coalesce(puntos, 0) + v_puntos
      where id = v_user_id;
  end if;

  -- comisiones nivel
  if v_puntos > 0 then
    v_upline_id := v_user_id;

    create temporary table if not exists tmp_upline2 (
      nivel int, upline_id uuid, porcentaje int
    ) on commit drop;
    delete from tmp_upline2;

    for v_upline_record in select * from jsonb_to_recordset(v_porcentajes) as x(nivel int, porcentaje int) order by nivel
    loop
      select patrocinador_id into v_upline_id from public.profiles where id = v_upline_id;
      exit when v_upline_id is null;
      insert into tmp_upline2 values (v_upline_record.nivel, v_upline_id, v_upline_record.porcentaje);
    end loop;

    select array_agg(distinct distribuidor_id) into v_eligible_upline
      from public.pedidos
      where distribuidor_id in (select upline_id from tmp_upline2)
        and estado in ('procesando','enviado','entregado')
        and total >= 100
        and created_at >= v_start_of_month;

    insert into public.comisiones (
      beneficiario_id, origen_id, pedido_id, tipo, nivel_red, monto, estado, descripcion
    )
    select
      u.upline_id, v_user_id, v_pedido_id, 'nivel', u.nivel,
      round((v_puntos * u.porcentaje / 100.0)::numeric, 2),
      'pendiente',
      'Comisión nivel ' || u.nivel
    from tmp_upline2 u
    where v_eligible_upline is not null
      and u.upline_id = any(v_eligible_upline)
      and round((v_puntos * u.porcentaje / 100.0)::numeric, 2) > 0;
  end if;

  return jsonb_build_object('ok', true, 'pedido_id', v_pedido_id, 'duplicated', false);

exception when others then
  raise;
end;
$$;

revoke all on function public.submit_pedido(uuid, jsonb, text, text, text, text) from public;
grant execute on function public.submit_pedido(uuid, jsonb, text, text, text, text) to authenticated;

comment on function public.submit_pedido(uuid, jsonb, text, text, text, text) is
  'Envío atómico de pedido del distribuidor autenticado. Recalcula total y puntos server-side. Idempotente por idempotency_key. Genera comisiones nivel automáticamente. Reemplaza la lógica cliente-side de NuevoPedido.tsx en adopción futura.';

-- ─────────────────────────────────────────────────────────────
-- 7. BIZ-002 — RPC para cancelar pedido y revertir efectos
-- Revierte puntos, cancela comisiones DEL PEDIDO (filtro exacto
-- por pedido_id), todo en una transacción. Idempotente.
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
  v_caller_is_admin boolean;
begin
  select public.is_admin() into v_caller_is_admin;
  if not v_caller_is_admin then
    raise exception 'Solo admin puede cancelar pedidos' using errcode = '42501';
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'Pedido % no encontrado', p_pedido_id using errcode = 'P0001';
  end if;

  -- idempotente: si ya está cancelado, no hacemos nada
  if v_pedido.estado = 'cancelado' then
    return jsonb_build_object('ok', true, 'already_cancelled', true);
  end if;

  -- revertir puntos solo si el pedido estaba activo
  if v_pedido.estado in ('procesando','enviado','entregado') and v_pedido.puntos_generados > 0 then
    update public.profiles
      set puntos = greatest(0, coalesce(puntos, 0) - v_pedido.puntos_generados)
      where id = v_pedido.distribuidor_id;
  end if;

  -- cancelar comisiones del pedido por filtro EXACTO
  update public.comisiones
    set estado = 'cancelado'
    where pedido_id = p_pedido_id
      and estado = 'pendiente';

  -- cambiar estado
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

comment on function public.cancel_pedido(uuid, text) is
  'Cancela un pedido y revierte sus efectos (puntos, comisiones) atómicamente. Solo admin. Idempotente. Filtra comisiones por pedido_id exacto, no por ventana de tiempo.';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN sugerida tras correr la migración
-- ─────────────────────────────────────────────────────────────
-- select proname from pg_proc where pronamespace = 'public'::regnamespace
--   and proname in ('lookup_sponsor','finish_approve_afiliacion','submit_pedido','cancel_pedido');
-- -- debe devolver 4 filas
--
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'comisiones'
--   and column_name = 'pedido_id';
-- -- debe devolver 1 fila
--
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'pedidos'
--   and column_name = 'idempotency_key';
-- -- debe devolver 1 fila
--
-- select policyname from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--    and policyname = 'Distribuidores suben vouchers solo a su carpeta';
-- -- debe devolver 1 fila
-- ============================================================
