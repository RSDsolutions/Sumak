-- ============================================================
-- SUMAK — Migration 025 — Productos administrables
-- ============================================================
-- Migra los productos del catalogo estatico de src/data.ts a una
-- tabla relacional, para que admin y operaciones puedan:
--   - Crear, editar, eliminar productos
--   - Cambiar precios, imagenes, descripciones
--   - Aplicar descuentos por porcentaje
--   - Mostrar/ocultar productos en la tienda publica
--
-- La tabla queda vacia despues de aplicar la migracion. El seed
-- inicial se importa desde el catalogo estatico via la pagina
-- /admin/productos cuando la tabla esta vacia (boton "Importar
-- catalogo inicial"). Eso evita duplicar 700 lineas de SQL aqui
-- y aprovecha el catalogo TS como source-of-truth inicial.
--
-- Storage:
--   bucket producto-imagenes (publico) para subir imagenes nuevas.
--
-- RLS:
--   SELECT: cualquier persona (la tienda publica lee sin auth).
--   INSERT/UPDATE/DELETE: solo admin u operaciones.
--
-- Idempotente.
-- ============================================================

-- 1) Tabla productos
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  slug text not null unique,
  nombre text not null,
  categoria text not null,
  categoria_key text not null,
  pvp numeric(10,2) not null check (pvp >= 0),
  precio_distribuidor numeric(10,2) check (precio_distribuidor is null or precio_distribuidor >= 0),
  descripcion text not null default '',
  imagen text,
  tagline text,
  presentacion text,
  detalle_largo text,
  modo_uso text,
  precauciones text,
  revista_pagina text,
  beneficios jsonb not null default '[]'::jsonb,
  ingredientes jsonb not null default '[]'::jsonb,
  destacado boolean not null default false,
  nuevo boolean not null default false,
  bestseller boolean not null default false,
  proximamente boolean not null default false,
  activo boolean not null default true,
  -- Descuento opcional (porcentaje sobre PVP)
  descuento_porcentaje numeric(5,2) check (descuento_porcentaje is null or (descuento_porcentaje >= 0 and descuento_porcentaje <= 100)),
  descuento_activo boolean not null default false,
  descuento_label text,
  -- Orden de visualizacion (menor = primero)
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint productos_beneficios_array check (jsonb_typeof(beneficios) = 'array'),
  constraint productos_ingredientes_array check (jsonb_typeof(ingredientes) = 'array')
);

create index if not exists productos_categoria_key_idx on public.productos(categoria_key);
create index if not exists productos_orden_idx on public.productos(orden);
create index if not exists productos_activo_idx on public.productos(activo) where activo = true;

-- 2) Trigger updated_at
create or replace function public.productos_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists productos_updated_at on public.productos;
create trigger productos_updated_at
  before update on public.productos
  for each row execute function public.productos_set_updated_at();

-- 3) RLS
alter table public.productos enable row level security;

drop policy if exists "Productos lectura publica" on public.productos;
create policy "Productos lectura publica" on public.productos
  for select using (true);

drop policy if exists "Productos escritura staff" on public.productos;
create policy "Productos escritura staff" on public.productos
  for all
  using (public.is_operaciones_or_admin())
  with check (public.is_operaciones_or_admin());

-- 4) Storage bucket producto-imagenes
-- Publico para que los <img src> funcionen sin firmar URLs.
insert into storage.buckets (id, name, public)
values ('producto-imagenes', 'producto-imagenes', true)
on conflict (id) do update set public = true;

-- Politicas del bucket: read publico, write solo admin/operaciones.
drop policy if exists "producto-imagenes lectura publica" on storage.objects;
create policy "producto-imagenes lectura publica" on storage.objects
  for select using (bucket_id = 'producto-imagenes');

drop policy if exists "producto-imagenes upload staff" on storage.objects;
create policy "producto-imagenes upload staff" on storage.objects
  for insert
  with check (bucket_id = 'producto-imagenes' and public.is_operaciones_or_admin());

drop policy if exists "producto-imagenes update staff" on storage.objects;
create policy "producto-imagenes update staff" on storage.objects
  for update
  using (bucket_id = 'producto-imagenes' and public.is_operaciones_or_admin())
  with check (bucket_id = 'producto-imagenes' and public.is_operaciones_or_admin());

drop policy if exists "producto-imagenes delete staff" on storage.objects;
create policy "producto-imagenes delete staff" on storage.objects
  for delete
  using (bucket_id = 'producto-imagenes' and public.is_operaciones_or_admin());

-- 5) RPC para seed inicial bulk (admin importa el catalogo estatico
--    desde el frontend cuando la tabla esta vacia). Idempotente: hace
--    upsert por codigo, asi que si se invoca con productos existentes
--    no falla.
create or replace function public.seed_productos_bulk(p_productos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_item jsonb;
begin
  if not public.is_operaciones_or_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_productos) <> 'array' then
    raise exception 'p_productos debe ser un array JSON' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_productos) loop
    insert into public.productos (
      codigo, slug, nombre, categoria, categoria_key, pvp, precio_distribuidor,
      descripcion, imagen, tagline, presentacion, detalle_largo, modo_uso,
      precauciones, revista_pagina, beneficios, ingredientes,
      destacado, nuevo, bestseller, proximamente, orden
    )
    values (
      v_item->>'codigo',
      v_item->>'slug',
      v_item->>'nombre',
      v_item->>'categoria',
      v_item->>'categoria_key',
      coalesce((v_item->>'pvp')::numeric, 0),
      nullif(v_item->>'precio_distribuidor', '')::numeric,
      coalesce(v_item->>'descripcion', ''),
      nullif(v_item->>'imagen', ''),
      nullif(v_item->>'tagline', ''),
      nullif(v_item->>'presentacion', ''),
      nullif(v_item->>'detalle_largo', ''),
      nullif(v_item->>'modo_uso', ''),
      nullif(v_item->>'precauciones', ''),
      nullif(v_item->>'revista_pagina', ''),
      coalesce(v_item->'beneficios', '[]'::jsonb),
      coalesce(v_item->'ingredientes', '[]'::jsonb),
      coalesce((v_item->>'destacado')::boolean, false),
      coalesce((v_item->>'nuevo')::boolean, false),
      coalesce((v_item->>'bestseller')::boolean, false),
      coalesce((v_item->>'proximamente')::boolean, false),
      coalesce((v_item->>'orden')::int, 0)
    )
    on conflict (codigo) do nothing;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'procesados', v_count);
end $$;

revoke all on function public.seed_productos_bulk(jsonb) from public;
grant execute on function public.seed_productos_bulk(jsonb) to authenticated;

comment on function public.seed_productos_bulk(jsonb) is
  'Importa un array de productos. Solo admin/operaciones. Idempotente: ON CONFLICT (codigo) DO NOTHING preserva productos existentes.';

-- ============================================================
-- VERIFICACION
--   select count(*) from public.productos;
--   select bucket_id, public from storage.buckets where id='producto-imagenes';
-- ============================================================
