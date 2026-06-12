-- ============================================================
-- SUMAK — Migration 008
-- Actualiza public.finish_approve_afiliacion para aceptar el flag
-- p_abrir_como_frontal (compatible con 007_frontales_para_todos).
--
-- Cuando p_abrir_como_frontal = true:
--   • El nuevo nodo se cuelga del padre elegido con posicion=null
--     (frontal del patrocinador, no ocupa izquierda ni derecha).
--   • Útil para distribuidores que ya tienen izq+der ocupadas y
--     quieren seguir afiliando directos.
--   • Si el padre es admin, también se inserta como frontal
--     (comportamiento histórico).
--
-- Cuando p_abrir_como_frontal = false (default):
--   • Se conserva el comportamiento anterior: el padre admin =>
--     frontal; otro padre => auto-asigna izq/der; si ambos están
--     ocupados se levanta excepción.
--
-- Esta migración es idempotente (DROP + CREATE).
-- ============================================================

drop function if exists public.finish_approve_afiliacion(uuid, uuid, text, uuid);

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
begin
  -- 1) Cargar la afiliación a aprobar
  select * into v_afiliacion from public.afiliaciones where id = p_afiliacion_id;
  if not found then
    raise exception 'Afiliación % no encontrada', p_afiliacion_id using errcode = 'P0001';
  end if;
  if v_afiliacion.estado <> 'pendiente' then
    raise exception 'La afiliación % ya está en estado %', p_afiliacion_id, v_afiliacion.estado using errcode = 'P0001';
  end if;

  -- 2) Resolver puntos / precio según paquete
  v_paquete_puntos := case v_afiliacion.paquete_seleccionado
    when 'basico' then 125
    when 'emprendedor' then 225
    when 'lider' then 525
    else 0 end;
  v_paquete_precio := v_paquete_puntos;
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

  -- 6) Auto-asignar posición izquierda/derecha — o frontal si:
  --    • el padre es admin (comportamiento original)
  --    • p_abrir_como_frontal=true (cualquier padre, gracias a 007_frontales_para_todos)
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
        'El padre seleccionado ya tiene Izquierda y Derecha ocupadas. Marcá "Abrir como frontal" o elegí otro patrocinador.'
        using errcode = 'P0001';
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
  raise;
end;
$$;

revoke all on function public.finish_approve_afiliacion(uuid, uuid, text, uuid, boolean) from public;
grant execute on function public.finish_approve_afiliacion(uuid, uuid, text, uuid, boolean)
  to authenticated, service_role;

comment on function public.finish_approve_afiliacion(uuid, uuid, text, uuid, boolean) is
  'Aprobación atómica de afiliado (v2): profile, red binaria, pedido inicial, ítems y comisiones de afiliación + nivel en una sola transacción. Acepta p_abrir_como_frontal para colgar el nodo como frontal de un padre no-admin.';

-- ============================================================
-- VERIFICACIÓN
--   select pg_get_function_arguments('public.finish_approve_afiliacion'::regproc);
--   -- debe incluir p_abrir_como_frontal boolean DEFAULT false
-- ============================================================
