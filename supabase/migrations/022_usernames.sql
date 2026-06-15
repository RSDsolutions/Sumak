-- ============================================================
-- SUMAK — Migration 022 — Usernames
-- ============================================================
-- Agrega un identificador propio (username) para cada usuario,
-- separado del nombre completo y del codigo SUMAK-XXXXX.
--
-- Reglas del username:
--   - 3 a 30 caracteres
--   - solo minusculas, digitos y guion bajo
--   - no puede empezar ni terminar con guion bajo
--   - unico (case-insensitive) en profiles y entre afiliaciones
--     pendientes/aprobadas
--
-- Tablas afectadas:
--   - public.profiles      -> nueva columna username text + constraint + indice unique
--   - public.afiliaciones  -> nueva columna username text + constraint
--
-- RPCs nuevas:
--   - public.check_username_available(text) -> boolean
--       Para validar en vivo en el formulario de registro.
--   - public.get_email_for_login(text) -> text
--       Para que el login acepte username y traduzca a email antes
--       de llamar a supabase.auth.signInWithPassword.
--
-- Actualiza:
--   - public.finish_approve_afiliacion -> copia username desde
--     afiliacion al profile al aprobar.
--
-- Idempotente: usa IF NOT EXISTS donde corresponde y CREATE OR
-- REPLACE para funciones.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) profiles.username
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists username text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'profiles_username_format'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (
        username is null or (
          char_length(username) between 3 and 30
          and username ~ '^[a-z0-9_]+$'
          and username !~ '^_'
          and username !~ '_$'
        )
      );
  end if;
end $$;

-- Unicidad case-insensitive (guardamos siempre en minusculas, pero
-- el indice funcional protege contra inserts inesperados).
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

-- ─────────────────────────────────────────────────────────────
-- 2) afiliaciones.username
-- ─────────────────────────────────────────────────────────────
alter table public.afiliaciones
  add column if not exists username text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'afiliaciones_username_format'
       and conrelid = 'public.afiliaciones'::regclass
  ) then
    alter table public.afiliaciones
      add constraint afiliaciones_username_format
      check (
        username is null or (
          char_length(username) between 3 and 30
          and username ~ '^[a-z0-9_]+$'
          and username !~ '^_'
          and username !~ '_$'
        )
      );
  end if;
end $$;

-- Indice para acelerar el check de disponibilidad cuando hay muchas
-- solicitudes pendientes. No es unique a proposito: si una solicitud
-- se rechaza, el username queda libre para volver a usarse.
create index if not exists afiliaciones_username_idx
  on public.afiliaciones (lower(username))
  where username is not null;

-- ─────────────────────────────────────────────────────────────
-- 3) RPC: check_username_available
--    Devuelve true si el username puede usarse en un registro nuevo.
--    Es PUBLIC porque el formulario de afiliacion es anonimo.
-- ─────────────────────────────────────────────────────────────
create or replace function public.check_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    p_username is not null
    and char_length(p_username) between 3 and 30
    and p_username ~ '^[a-z0-9_]+$'
    and p_username !~ '^_'
    and p_username !~ '_$'
    and not exists (
      select 1 from public.profiles
       where lower(username) = lower(p_username)
    )
    and not exists (
      select 1 from public.afiliaciones
       where lower(username) = lower(p_username)
         and estado in ('pendiente', 'aprobada')
    );
$$;

revoke all on function public.check_username_available(text) from public;
grant execute on function public.check_username_available(text) to anon, authenticated;

comment on function public.check_username_available(text) is
  'Valida si un username esta disponible para una nueva solicitud de afiliacion. Considera ocupado si esta en profiles o en una afiliacion pendiente/aprobada.';

-- ─────────────────────────────────────────────────────────────
-- 4) RPC: get_email_for_login
--    Traduce username -> email para el login. Solo devuelve email
--    si el profile esta activo (no suspendido). Si no existe,
--    devuelve NULL (el frontend muestra "credenciales incorrectas"
--    como con email + clave invalidos).
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_email_for_login(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
    from public.profiles
   where lower(username) = lower(p_username)
     and estado = 'activo'
   limit 1;
$$;

revoke all on function public.get_email_for_login(text) from public;
grant execute on function public.get_email_for_login(text) to anon, authenticated;

comment on function public.get_email_for_login(text) is
  'Devuelve el email asociado a un username para permitir login. NULL si no existe o esta suspendido.';

-- ─────────────────────────────────────────────────────────────
-- 5) Reescribir finish_approve_afiliacion para copiar username
--    Mantiene exactamente la misma firma y logica que migracion 017,
--    solo agrega la columna username en el INSERT a profiles.
-- ─────────────────────────────────────────────────────────────
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

  -- INSERT con username copiado desde la afiliacion (mig 022).
  insert into public.profiles (
    id, codigo_distribuidor, username, nombre_completo, cedula, email, telefono,
    direccion, ciudad, codigo_patrocinador, patrocinador_id, paquete,
    puntos, rol, estado, fecha_aprobacion
  ) values (
    p_user_id, p_codigo, v_afiliacion.username, v_afiliacion.nombre_completo,
    v_afiliacion.cedula, v_afiliacion.email, v_afiliacion.telefono,
    v_afiliacion.direccion, v_afiliacion.ciudad, v_afiliacion.codigo_patrocinador,
    v_patrocinador_id, v_afiliacion.paquete_seleccionado::text, v_paquete_puntos,
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

-- ============================================================
-- VERIFICACION
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='profiles' and column_name='username';
--   select public.check_username_available('test_user');
--   select pg_get_function_arguments('public.finish_approve_afiliacion'::regproc);
-- ============================================================
