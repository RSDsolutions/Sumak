-- ============================================================
-- SUMAK — Migration 026 — Comisiones nivel: cadena binaria,
-- porcentajes oficiales y estado 'retenida'
-- ============================================================
-- Cambios criticos del modelo de comisiones por nivel:
--
-- 1) La cadena para "comision por nivel" pasa de profiles.patrocinador_id
--    (linea de patrocinio) a red_binaria.padre_id (arbol binario).
--    El cliente confirmo que para Sumak ambas son lo mismo conceptual
--    y la fuente de verdad es la red binaria. Esto resuelve el caso
--    de seeds historicos sin patrocinador_id que dejaban a uplines
--    binarios sin comisiones.
--
-- 2) Porcentajes oficiales corregidos:
--      nivel 1: 5%   nivel 2: 20%   nivel 3: 5%   nivel 4: 4%
--      nivel 5: 3%   nivel 6: 2%    nivel 7: 1%   nivel 8-14: 0.5%
--    (Antes el codigo usaba 15/10/8/5/4/3/2/2/1/1/1/1/1/1)
--
-- 3) Nuevo estado 'retenida' en comisiones.estado:
--    - Si el beneficiario NO tiene pedido propio >= $100 en el mes,
--      la comision se inserta igual pero como 'retenida' (visible,
--      no pagable).
--    - Cuando el beneficiario llega a >= $100 entregado/procesando
--      en el mismo mes, sus retenidas pasan a 'pendiente'
--      automaticamente via trigger.
--    - mark_comision_pagada rechaza retenidas con mensaje claro.
--    - RPC liberar_comisiones_retenidas() permite liberacion manual
--      por admin/operaciones (defensiva, normalmente el trigger basta).
--
-- 4) finish_approve_afiliacion: la afiliacion sigue pagando bono
--    directo (40%) y comisiones nivel, pero ahora con cadena binaria,
--    porcentajes nuevos y soporte para 'retenida'.
--
-- Idempotente. No toca comisiones historicas pagadas/canceladas.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) Estado 'retenida' en comisiones.estado
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select conname from pg_constraint
     where conrelid = 'public.comisiones'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%estado%'
  loop
    execute 'alter table public.comisiones drop constraint ' || quote_ident(v_constraint);
  end loop;
end $$;

alter table public.comisiones
  add constraint comisiones_estado_check
  check (estado in ('pendiente','pagado','cancelado','retenida'));

comment on column public.comisiones.estado is
  'Estado de la comision: pendiente (pagable), pagado, cancelado, '
  'retenida (visible pero NO pagable hasta que el beneficiario active >= $100 en el mes).';

-- ─────────────────────────────────────────────────────────────
-- 2) Helper: chequea si un distribuidor esta activo en un mes
-- (tiene >= 1 pedido total >= 100 en procesando/enviado/entregado
-- dentro del mes que contiene la fecha dada).
-- ─────────────────────────────────────────────────────────────
create or replace function public.distribuidor_activo_en_mes_de(
  p_distribuidor_id uuid,
  p_fecha timestamptz
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pedidos
     where distribuidor_id = p_distribuidor_id
       and estado in ('procesando','enviado','entregado')
       and total >= 100
       and created_at >= date_trunc('month', p_fecha)
       and created_at <  date_trunc('month', p_fecha) + interval '1 month'
  );
$$;

revoke all on function public.distribuidor_activo_en_mes_de(uuid, timestamptz) from public;
grant execute on function public.distribuidor_activo_en_mes_de(uuid, timestamptz) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3) Helper: cadena de uplines por red binaria (hasta N niveles)
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_binary_upline_chain(
  p_distribuidor_id uuid,
  p_max_levels int default 14
) returns table(nivel int, upline_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with recursive chain as (
    select rb.padre_id as parent_node_id,
           1 as nivel
      from public.red_binaria rb
     where rb.distribuidor_id = p_distribuidor_id
       and rb.padre_id is not null
    union all
    select parent_rb.padre_id,
           c.nivel + 1
      from chain c
      join public.red_binaria parent_rb on parent_rb.id = c.parent_node_id
     where parent_rb.padre_id is not null
       and c.nivel < p_max_levels
  )
  select c.nivel,
         padre_rb.distribuidor_id as upline_id
    from chain c
    join public.red_binaria padre_rb on padre_rb.id = c.parent_node_id
   order by c.nivel;
$$;

revoke all on function public.get_binary_upline_chain(uuid, int) from public;
grant execute on function public.get_binary_upline_chain(uuid, int) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 4) Trigger: cuando un pedido activa al distribuidor (>= $100 en
-- procesando/enviado/entregado), liberar sus retenidas del mes.
-- ─────────────────────────────────────────────────────────────
create or replace function public.liberar_retenidas_por_activacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes_inicio timestamptz;
  v_mes_fin timestamptz;
  v_liberadas int;
begin
  -- Solo nos interesan pedidos que cuentan como activacion
  if NEW.total is null or NEW.total < 100 then
    return NEW;
  end if;
  if NEW.estado not in ('procesando','enviado','entregado') then
    return NEW;
  end if;

  v_mes_inicio := date_trunc('month', NEW.created_at);
  v_mes_fin   := v_mes_inicio + interval '1 month';

  update public.comisiones
     set estado = 'pendiente'
   where beneficiario_id = NEW.distribuidor_id
     and estado = 'retenida'
     and created_at >= v_mes_inicio
     and created_at <  v_mes_fin;

  get diagnostics v_liberadas = row_count;
  if v_liberadas > 0 then
    raise notice 'Liberadas % comisiones retenidas de % por activacion (pedido %)',
      v_liberadas, NEW.distribuidor_id, NEW.id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists pedidos_liberar_retenidas_ins on public.pedidos;
create trigger pedidos_liberar_retenidas_ins
  after insert on public.pedidos
  for each row
  execute function public.liberar_retenidas_por_activacion();

drop trigger if exists pedidos_liberar_retenidas_upd on public.pedidos;
create trigger pedidos_liberar_retenidas_upd
  after update of estado, total on public.pedidos
  for each row
  when (NEW.estado in ('procesando','enviado','entregado') and NEW.total >= 100)
  execute function public.liberar_retenidas_por_activacion();

comment on function public.liberar_retenidas_por_activacion() is
  'Trigger func: cuando un pedido se inserta o pasa a procesando/enviado/entregado con total >= 100, libera comisiones retenidas del distribuidor para ese mes (pasan a estado pendiente).';

-- ─────────────────────────────────────────────────────────────
-- 5) RPC defensiva para liberar manualmente (admin/operaciones)
-- ─────────────────────────────────────────────────────────────
create or replace function public.liberar_comisiones_retenidas(
  p_distribuidor_id uuid,
  p_mes date default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes_inicio timestamptz;
  v_mes_fin timestamptz;
  v_liberadas int;
begin
  if not public.is_operaciones_or_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_mes_inicio := date_trunc('month', coalesce(p_mes::timestamptz, now()));
  v_mes_fin   := v_mes_inicio + interval '1 month';

  -- Solo libera si el distribuidor califica como activo en ese mes
  if not public.distribuidor_activo_en_mes_de(p_distribuidor_id, v_mes_inicio) then
    return jsonb_build_object(
      'ok', false,
      'error', 'El distribuidor no esta activo en el mes indicado (sin pedido >= $100 entregado/procesando).',
      'liberadas', 0
    );
  end if;

  update public.comisiones
     set estado = 'pendiente'
   where beneficiario_id = p_distribuidor_id
     and estado = 'retenida'
     and created_at >= v_mes_inicio
     and created_at <  v_mes_fin;

  get diagnostics v_liberadas = row_count;
  return jsonb_build_object('ok', true, 'liberadas', v_liberadas);
end;
$$;

revoke all on function public.liberar_comisiones_retenidas(uuid, date) from public;
grant execute on function public.liberar_comisiones_retenidas(uuid, date) to authenticated;

comment on function public.liberar_comisiones_retenidas(uuid, date) is
  'Libera (estado retenida -> pendiente) las comisiones de un distribuidor para un mes especifico. Solo admin/operaciones. Verifica que el distribuidor este activo (pedido >= $100) en ese mes.';

-- ─────────────────────────────────────────────────────────────
-- 6) mark_comision_pagada: bloquear retenidas explicitamente
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
  if v_comision.estado = 'retenida' then
    raise exception 'Comision retenida: el beneficiario no ha activado >= $100 en el mes. Debe activarse antes de pagar.' using errcode = '22023';
  end if;

  update public.comisiones
     set estado = 'pagado',
         pagado_at = now(),
         pagado_por = auth.uid(),
         voucher_url = p_voucher_url,
         voucher_numero = nullif(trim(coalesce(p_voucher_numero, '')), '')
   where id = p_id;

  return jsonb_build_object('ok', true, 'already_paid', false);
end;
$$;

revoke all on function public.mark_comision_pagada(uuid, text, text) from public;
grant execute on function public.mark_comision_pagada(uuid, text, text) to authenticated;

comment on function public.mark_comision_pagada(uuid, text, text) is
  'Marca una comision como pagada. Solo admin u operaciones. Rechaza comisiones retenidas (el beneficiario debe activarse primero).';

-- ─────────────────────────────────────────────────────────────
-- 7) Reescritura de submit_pedido con cadena binaria + nuevos
-- porcentajes + estado retenida cuando el upline no esta activo.
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
  -- Porcentajes oficiales del cliente (mig 026):
  --   1:5% 2:20% 3:5% 4:4% 5:3% 6:2% 7:1% 8-14:0.5% c/u
  v_porcentajes constant jsonb := '[
    {"nivel":1,"porcentaje":5.0},
    {"nivel":2,"porcentaje":20.0},
    {"nivel":3,"porcentaje":5.0},
    {"nivel":4,"porcentaje":4.0},
    {"nivel":5,"porcentaje":3.0},
    {"nivel":6,"porcentaje":2.0},
    {"nivel":7,"porcentaje":1.0},
    {"nivel":8,"porcentaje":0.5},
    {"nivel":9,"porcentaje":0.5},
    {"nivel":10,"porcentaje":0.5},
    {"nivel":11,"porcentaje":0.5},
    {"nivel":12,"porcentaje":0.5},
    {"nivel":13,"porcentaje":0.5},
    {"nivel":14,"porcentaje":0.5}
  ]'::jsonb;
  v_upline_record record;
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
      raise exception 'Cantidad invalida para %', v_item.codigo using errcode = 'P0001';
    end if;
    if v_item.precio is null or v_item.precio < 0 then
      raise exception 'Precio invalido para %', v_item.codigo using errcode = 'P0001';
    end if;
    v_total := v_total + (v_item.precio * v_item.cantidad);
  end loop;
  v_puntos := round(v_total)::integer;

  -- crear pedido (procesando, el trigger de liberacion se dispara aqui
  -- si total >= 100, liberando retenidas previas del propio comprador)
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

  -- ── Comisiones nivel (cadena binaria, porcentajes nuevos) ──
  -- SIEMPRE se generan; estado depende de la activacion del beneficiario
  -- en el mes del pedido. Si beneficiario activo => 'pendiente', si
  -- no => 'retenida' (pasa a pendiente cuando active via trigger).
  if v_puntos > 0 then
    insert into public.comisiones (
      beneficiario_id, origen_id, pedido_id, tipo, nivel_red,
      monto, estado, descripcion
    )
    select
      bu.upline_id,
      v_user_id,
      v_pedido_id,
      'nivel',
      bu.nivel,
      round((v_puntos * (pc.value->>'porcentaje')::numeric / 100.0)::numeric, 2),
      case when public.distribuidor_activo_en_mes_de(bu.upline_id, now())
           then 'pendiente'
           else 'retenida'
      end,
      'Comision nivel ' || bu.nivel
    from public.get_binary_upline_chain(v_user_id, 14) bu
    join lateral (
      select value from jsonb_array_elements(v_porcentajes) j(value)
       where (j.value->>'nivel')::int = bu.nivel
       limit 1
    ) pc on true
   where round((v_puntos * (pc.value->>'porcentaje')::numeric / 100.0)::numeric, 2) > 0;
  end if;

  return jsonb_build_object('ok', true, 'pedido_id', v_pedido_id, 'duplicated', false);
end;
$$;

comment on function public.submit_pedido(uuid, jsonb, text, text, text, text) is
  'Envio atomico de pedido del distribuidor autenticado. Camina la cadena binaria (red_binaria.padre_id) hasta 14 niveles y genera comisiones nivel con porcentajes oficiales del cliente (5/20/5/4/3/2/1/0.5x7). Las comisiones se crean siempre; estado pendiente o retenida segun la activacion mensual del beneficiario. Idempotente por idempotency_key.';

-- ─────────────────────────────────────────────────────────────
-- 8) Reescritura de finish_approve_afiliacion (5-arg) con la
-- nueva logica de comisiones nivel. El bono directo (40%) no cambia.
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='finish_approve_afiliacion' and p.pronargs=5) then
    execute $body$
      create or replace function public.finish_approve_afiliacion(
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
      as $fn$
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
          {"nivel":1,"porcentaje":5.0},
          {"nivel":2,"porcentaje":20.0},
          {"nivel":3,"porcentaje":5.0},
          {"nivel":4,"porcentaje":4.0},
          {"nivel":5,"porcentaje":3.0},
          {"nivel":6,"porcentaje":2.0},
          {"nivel":7,"porcentaje":1.0},
          {"nivel":8,"porcentaje":0.5},
          {"nivel":9,"porcentaje":0.5},
          {"nivel":10,"porcentaje":0.5},
          {"nivel":11,"porcentaje":0.5},
          {"nivel":12,"porcentaje":0.5},
          {"nivel":13,"porcentaje":0.5},
          {"nivel":14,"porcentaje":0.5}
        ]'::jsonb;
      begin
        select * into v_afiliacion from public.afiliaciones where id = p_afiliacion_id;
        if not found then
          raise exception 'Afiliacion % no encontrada', p_afiliacion_id using errcode = 'P0001';
        end if;
        if v_afiliacion.estado <> 'pendiente' then
          raise exception 'La afiliacion % ya esta en estado %', p_afiliacion_id, v_afiliacion.estado using errcode = 'P0001';
        end if;

        v_paquete_puntos := case v_afiliacion.paquete_seleccionado
          when 'basico' then 125
          when 'emprendedor' then 225
          when 'lider' then 525
          else 0 end;
        v_paquete_precio := v_paquete_puntos;
        v_paquete_nombre := initcap(v_afiliacion.paquete_seleccionado);

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

        if p_padre_profile_id is not null then
          select rb.id, rb.nivel, pr.rol
            into v_padre_nodo_id, v_padre_nivel, v_padre_rol
            from public.red_binaria rb
            join public.profiles pr on pr.id = rb.distribuidor_id
            where rb.distribuidor_id = p_padre_profile_id;

          if v_padre_nodo_id is null then
            select rol into v_padre_rol from public.profiles where id = p_padre_profile_id;
            if v_padre_rol = 'admin' then
              insert into public.red_binaria (distribuidor_id, padre_id, posicion, nivel)
                values (p_padre_profile_id, null, null, 1)
                returning id, nivel into v_padre_nodo_id, v_padre_nivel;
            end if;
          end if;
        end if;

        if v_padre_nodo_id is not null then
          if v_padre_rol = 'admin' or coalesce(p_abrir_como_frontal, false) then
            v_posicion := null;
          else
            select
              bool_or(posicion = 'izquierda'),
              bool_or(posicion = 'derecha')
              into v_tiene_izq, v_tiene_der
            from public.red_binaria where padre_id = v_padre_nodo_id;
            if not coalesce(v_tiene_izq, false) then v_posicion := 'izquierda';
            elsif not coalesce(v_tiene_der, false) then v_posicion := 'derecha';
            else raise exception
              'El padre seleccionado ya tiene Izquierda y Derecha ocupadas. Marca "Abrir como frontal" o elegi otro patrocinador.'
              using errcode = 'P0001';
            end if;
          end if;
        end if;

        insert into public.red_binaria (distribuidor_id, padre_id, posicion, nivel)
          values (p_user_id, v_padre_nodo_id, v_posicion, coalesce(v_padre_nivel, 0) + 1);

        update public.afiliaciones set estado = 'aprobada' where id = p_afiliacion_id;

        if v_paquete_precio > 0 then
          insert into public.pedidos (
            distribuidor_id, estado, tipo_precio, total, puntos_generados, notas
          ) values (
            p_user_id, 'procesando', 'distribuidor', v_paquete_precio, v_paquete_puntos,
            'Pedido inicial - Paquete ' || v_paquete_nombre || ' (afiliacion)'
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

        -- Bono directo de afiliacion (40% del paquete) al patrocinador
        if v_patrocinador_id is not null and v_paquete_precio > 0 then
          insert into public.comisiones (
            beneficiario_id, origen_id, pedido_id, tipo, monto, estado, descripcion
          ) values (
            v_patrocinador_id, p_user_id, v_pedido_id, 'afiliacion',
            round((v_paquete_precio * 0.40)::numeric, 2),
            case when public.distribuidor_activo_en_mes_de(v_patrocinador_id, now())
                 then 'pendiente'
                 else 'retenida'
            end,
            'Comision referido (40%) - ' || v_afiliacion.nombre_completo || ' - paquete ' || v_afiliacion.paquete_seleccionado::text
          );
        end if;

        -- Comisiones nivel: cadena binaria + porcentajes nuevos + estado retenida
        if v_paquete_puntos > 0 then
          insert into public.comisiones (
            beneficiario_id, origen_id, pedido_id, tipo, nivel_red,
            monto, estado, descripcion
          )
          select
            bu.upline_id,
            p_user_id,
            v_pedido_id,
            'nivel',
            bu.nivel,
            round((v_paquete_puntos * (pc.value->>'porcentaje')::numeric / 100.0)::numeric, 2),
            case when public.distribuidor_activo_en_mes_de(bu.upline_id, now())
                 then 'pendiente'
                 else 'retenida'
            end,
            'Comision nivel ' || bu.nivel || ' - paquete ' || v_afiliacion.paquete_seleccionado::text
          from public.get_binary_upline_chain(p_user_id, 14) bu
          join lateral (
            select value from jsonb_array_elements(v_porcentajes) j(value)
             where (j.value->>'nivel')::int = bu.nivel
             limit 1
          ) pc on true
         where round((v_paquete_puntos * (pc.value->>'porcentaje')::numeric / 100.0)::numeric, 2) > 0;
        end if;

        return jsonb_build_object('ok', true, 'codigo', p_codigo, 'pedido_id', v_pedido_id);

      exception when others then
        raise;
      end;
      $fn$;
    $body$;
  end if;
end $$;

-- ============================================================
-- VERIFICACION POST-MIGRATION
-- ============================================================
-- 1) CHECK constraint:
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conrelid='public.comisiones'::regclass and contype='c';
--
-- 2) Funciones presentes:
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.proname in (
--      'distribuidor_activo_en_mes_de','get_binary_upline_chain',
--      'liberar_retenidas_por_activacion','liberar_comisiones_retenidas',
--      'mark_comision_pagada','submit_pedido','finish_approve_afiliacion'
--    );
--
-- 3) Triggers en pedidos:
--   select tgname from pg_trigger
--    where tgrelid='public.pedidos'::regclass
--      and tgname like 'pedidos_liberar%';
--
-- 4) Smoke test: que un pedido recien insertado dispare la liberacion:
--   begin;
--     insert into pedidos(distribuidor_id, estado, tipo_precio, total, puntos_generados)
--       values ('<test_uuid>', 'procesando', 'distribuidor', 100, 100);
--     -- ver que las retenidas del distribuidor del mes pasaron a pendiente
--   rollback;
-- ============================================================
