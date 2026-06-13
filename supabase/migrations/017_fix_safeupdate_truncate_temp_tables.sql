-- ============================================================
-- SUMAK — Migration 017 — Fix safeupdate "DELETE requires WHERE"
-- ============================================================
-- Las RPCs submit_pedido y finish_approve_afiliacion usaban
--   delete from tmp_uplineN;
-- para vaciar una tabla temporal antes de re-llenarla. Esto activa
-- el error SQLSTATE 21000 ("DELETE requires a WHERE clause") que
-- lanza la extension safeupdate de Supabase (activada por default
-- en algunos pooler configs).
--
-- Fix: usar TRUNCATE en lugar de DELETE. TRUNCATE no tiene clausula
-- WHERE inherente y safeupdate no lo bloquea. Ademas es mas rapido
-- en tablas temporales.
--
-- Estrategia: recreamos solo las dos funciones afectadas con el
-- mismo body, cambiando la linea ofensiva. El resto de su logica
-- (idempotencia, calculo de comisiones por nivel, generacion del
-- pedido inicial al aprobar afiliacion, etc.) no se toca.
--
-- Idempotente.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) submit_pedido — fix
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
set search_path to 'public'
as $function$
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
      raise exception 'Cantidad invalida para %', v_item.codigo using errcode = 'P0001';
    end if;
    if v_item.precio is null or v_item.precio < 0 then
      raise exception 'Precio invalido para %', v_item.codigo using errcode = 'P0001';
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
    -- Fix safeupdate: TRUNCATE en lugar de DELETE sin WHERE.
    truncate tmp_upline2;

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
      'Comision nivel ' || u.nivel
    from tmp_upline2 u
    where v_eligible_upline is not null
      and u.upline_id = any(v_eligible_upline)
      and round((v_puntos * u.porcentaje / 100.0)::numeric, 2) > 0;
  end if;

  return jsonb_build_object('ok', true, 'pedido_id', v_pedido_id, 'duplicated', false);

exception when others then
  raise;
end;
$function$;

-- ─────────────────────────────────────────────────────────────
-- 2) finish_approve_afiliacion (5-arg) — fix
-- Solo aplicamos el fix si la version 5-arg existe (que es lo que
-- la app usa via approve_afiliacion wrapper). El TRUNCATE corrige
-- el mismo problema que en submit_pedido.
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
          {"nivel":1,"porcentaje":15},{"nivel":2,"porcentaje":10},
          {"nivel":3,"porcentaje":8},{"nivel":4,"porcentaje":5},
          {"nivel":5,"porcentaje":4},{"nivel":6,"porcentaje":3},
          {"nivel":7,"porcentaje":2},{"nivel":8,"porcentaje":2},
          {"nivel":9,"porcentaje":1},{"nivel":10,"porcentaje":1},
          {"nivel":11,"porcentaje":1},{"nivel":12,"porcentaje":1},
          {"nivel":13,"porcentaje":1},{"nivel":14,"porcentaje":1}
        ]'::jsonb;
        v_upline_id uuid;
        v_upline_record record;
        v_eligible_upline uuid[];
        v_start_of_month timestamptz := date_trunc('month', now());
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

        if v_patrocinador_id is not null and v_paquete_precio > 0 then
          insert into public.comisiones (
            beneficiario_id, origen_id, pedido_id, tipo, monto, estado, descripcion
          ) values (
            v_patrocinador_id, p_user_id, v_pedido_id, 'afiliacion',
            round((v_paquete_precio * 0.40)::numeric, 2),
            'pendiente',
            'Comision referido (40%) - ' || v_afiliacion.nombre_completo || ' - paquete ' || v_afiliacion.paquete_seleccionado::text
          );
        end if;

        if v_paquete_puntos > 0 then
          v_upline_id := p_user_id;

          create temporary table if not exists tmp_upline (
            nivel int, upline_id uuid, porcentaje int
          ) on commit drop;
          -- Fix safeupdate: TRUNCATE en lugar de DELETE sin WHERE.
          truncate tmp_upline;

          for v_upline_record in select * from jsonb_to_recordset(v_porcentajes) as x(nivel int, porcentaje int) order by nivel
          loop
            select patrocinador_id into v_upline_id from public.profiles where id = v_upline_id;
            exit when v_upline_id is null;
            insert into tmp_upline values (v_upline_record.nivel, v_upline_id, v_upline_record.porcentaje);
          end loop;

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
            'Comision nivel ' || u.nivel || ' - paquete ' || v_afiliacion.paquete_seleccionado::text
          from tmp_upline u
          where v_eligible_upline is not null
            and u.upline_id = any(v_eligible_upline)
            and round((v_paquete_puntos * u.porcentaje / 100.0)::numeric, 2) > 0;
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
-- VERIFICACION
--   select proname,
--          case when prosrc like '%truncate tmp_upline%' then 'OK'
--               when prosrc like '%delete from tmp_upline%' then 'BAD'
--               else 'no usa' end as estado
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname='public'
--      and p.proname in ('submit_pedido','finish_approve_afiliacion');
-- ============================================================
