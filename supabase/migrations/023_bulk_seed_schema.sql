-- ============================================================
-- SUMAK — Migration 023 — Bulk seed schema
-- ============================================================
-- Schema para sembrar distribuidores existentes con datos minimos
-- (username + email + nivel sugerido) y ubicarlos despues
-- manualmente desde la pantalla de admin/operaciones.
--
-- Cambios:
--   1. profiles.nombre_completo y profiles.cedula pasan a NULLABLE
--      para permitir seeds minimos. El usuario completa al primer login.
--   2. Secuencia sumak_codigo_seq + RPC next_codigo_distribuidor()
--      reemplazan el count(*)+1 race-prone usado al aprobar afiliaciones.
--   3. Tabla ubicaciones_pendientes con profile_id + nivel_sugerido.
--      RLS: solo admin/operaciones leen y escriben.
--   4. Columnas de auditoria ubicado_por/ubicado_at en red_binaria.
--   5. RPC place_user_in_tree(profile, padre, posicion) para ubicar
--      un pendiente en el binario. Idempotente, con FOR UPDATE lock.
--   6. RPC discard_pending_user(profile) para limpiar errores (solo admin).
--
-- Idempotente.
-- ============================================================

-- 1) nombre_completo y cedula nullable
alter table public.profiles alter column nombre_completo drop not null;
alter table public.profiles alter column cedula drop not null;

-- 2) Secuencia para codigos SUMAK
create sequence if not exists public.sumak_codigo_seq start 1;

select setval('public.sumak_codigo_seq',
  greatest(
    (select coalesce(max(substring(codigo_distribuidor from 'SUMAK-(\d+)')::int), 0) from public.profiles),
    1
  )
);

create or replace function public.next_codigo_distribuidor()
returns text language sql security definer set search_path = public as $$
  select 'SUMAK-' || lpad(nextval('public.sumak_codigo_seq')::text, 5, '0');
$$;
revoke all on function public.next_codigo_distribuidor() from public;
grant execute on function public.next_codigo_distribuidor() to authenticated, service_role;

-- 3) Tabla ubicaciones_pendientes
create table if not exists public.ubicaciones_pendientes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  nivel_sugerido int not null check (nivel_sugerido between 1 and 50),
  notas text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists ubicaciones_pendientes_created_idx on public.ubicaciones_pendientes(created_at);
alter table public.ubicaciones_pendientes enable row level security;

drop policy if exists "Solo admin/operaciones gestionan pendientes" on public.ubicaciones_pendientes;
create policy "Solo admin/operaciones gestionan pendientes"
  on public.ubicaciones_pendientes for all
  using (public.is_operaciones_or_admin())
  with check (public.is_operaciones_or_admin());

-- 4) Auditoria en red_binaria
alter table public.red_binaria add column if not exists ubicado_por uuid references public.profiles(id);
alter table public.red_binaria add column if not exists ubicado_at timestamptz;

-- 5) RPC place_user_in_tree
create or replace function public.place_user_in_tree(
  p_profile_id uuid,
  p_padre_profile_id uuid,
  p_posicion text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_padre_nodo_id uuid;
  v_padre_nivel int := 0;
  v_padre_rol text;
  v_posicion_final text;
  v_existing_id uuid;
begin
  if not public.is_operaciones_or_admin() then
    raise exception 'Solo admin u operaciones pueden ubicar' using errcode = '42501';
  end if;

  -- Idempotencia
  select id into v_existing_id from public.red_binaria where distribuidor_id = p_profile_id;
  if v_existing_id is not null then
    return jsonb_build_object('ok', true, 'already_placed', true, 'nodo_id', v_existing_id);
  end if;

  if not exists (select 1 from public.ubicaciones_pendientes where profile_id = p_profile_id) then
    raise exception 'El profile % no esta marcado como pendiente de ubicacion', p_profile_id using errcode = 'P0001';
  end if;

  if p_padre_profile_id is not null then
    select rb.id, rb.nivel, pr.rol
      into v_padre_nodo_id, v_padre_nivel, v_padre_rol
      from public.red_binaria rb
      join public.profiles pr on pr.id = rb.distribuidor_id
      where rb.distribuidor_id = p_padre_profile_id
      for update;

    if v_padre_nodo_id is null then
      select rol into v_padre_rol from public.profiles where id = p_padre_profile_id;
      if v_padre_rol = 'admin' then
        insert into public.red_binaria (distribuidor_id, padre_id, posicion, nivel)
          values (p_padre_profile_id, null, null, 1)
          returning id, nivel into v_padre_nodo_id, v_padre_nivel;
      else
        raise exception 'El padre seleccionado no tiene nodo binario y no es admin' using errcode = 'P0001';
      end if;
    end if;
  else
    raise exception 'Padre requerido' using errcode = 'P0001';
  end if;

  if v_padre_rol = 'admin' or p_posicion = 'frontal' then
    v_posicion_final := null;
  elsif p_posicion in ('izquierda','derecha') then
    if exists (select 1 from public.red_binaria where padre_id = v_padre_nodo_id and posicion = p_posicion) then
      raise exception 'La posicion % bajo el padre ya esta ocupada', p_posicion using errcode = 'P0001';
    end if;
    v_posicion_final := p_posicion;
  else
    raise exception 'Posicion invalida: %', p_posicion using errcode = 'P0001';
  end if;

  insert into public.red_binaria (
    distribuidor_id, padre_id, posicion, nivel, ubicado_por, ubicado_at
  ) values (
    p_profile_id, v_padre_nodo_id, v_posicion_final, v_padre_nivel + 1, auth.uid(), now()
  );

  delete from public.ubicaciones_pendientes where profile_id = p_profile_id;

  return jsonb_build_object('ok', true, 'already_placed', false, 'nivel', v_padre_nivel + 1, 'posicion', v_posicion_final);
end;
$$;

revoke all on function public.place_user_in_tree(uuid, uuid, text) from public;
grant execute on function public.place_user_in_tree(uuid, uuid, text) to authenticated;

-- 6) RPC discard_pending_user (solo admin)
create or replace function public.discard_pending_user(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede descartar' using errcode = '42501';
  end if;
  if not exists (select 1 from public.ubicaciones_pendientes where profile_id = p_profile_id) then
    raise exception 'No esta pendiente o ya fue ubicado' using errcode = 'P0001';
  end if;
  delete from public.profiles where id = p_profile_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.discard_pending_user(uuid) from public;
grant execute on function public.discard_pending_user(uuid) to authenticated;
