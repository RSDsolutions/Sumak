-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  codigo_distribuidor text unique,
  nombre_completo text not null,
  cedula text unique not null,
  email text unique not null,
  telefono text,
  direccion text,
  ciudad text,
  codigo_patrocinador text,
  patrocinador_id uuid references public.profiles(id),
  paquete text check (paquete in ('basico','emprendedor','lider')),
  puntos integer default 0,
  estado text not null default 'activo' check (estado in ('activo','suspendido')),
  rol text not null default 'distribuidor' check (rol in ('distribuidor','admin')),
  avatar_url text,
  fecha_registro timestamp with time zone default now(),
  fecha_aprobacion timestamp with time zone
);

-- AFILIACIONES table (pending requests from public form)
create table public.afiliaciones (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  cedula text not null,
  email text not null,
  telefono text not null,
  direccion text not null,
  ciudad text not null,
  codigo_patrocinador text,
  paquete_seleccionado text not null check (paquete_seleccionado in ('basico','emprendedor','lider')),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  doc_cedula_frente text,
  doc_cedula_reverso text,
  doc_planilla text,
  doc_voucher text,
  notas_admin text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RED_BINARIA table (binary tree)
create table public.red_binaria (
  id uuid primary key default gen_random_uuid(),
  distribuidor_id uuid references public.profiles(id) on delete cascade unique,
  padre_id uuid references public.red_binaria(id),
  posicion text check (posicion in ('izquierda','derecha')),
  nivel integer not null default 1,
  created_at timestamp with time zone default now()
);

-- PEDIDOS table
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  distribuidor_id uuid references public.profiles(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','procesando','enviado','entregado','cancelado')),
  tipo_precio text not null default 'distribuidor' check (tipo_precio in ('pvp','distribuidor')),
  total decimal(10,2) not null,
  notas text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- PEDIDO_ITEMS table
create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references public.pedidos(id) on delete cascade,
  producto_codigo text not null,
  producto_nombre text not null,
  cantidad integer not null,
  precio_unitario decimal(10,2) not null,
  subtotal decimal(10,2) not null
);

-- COMISIONES table
create table public.comisiones (
  id uuid primary key default gen_random_uuid(),
  beneficiario_id uuid references public.profiles(id) on delete cascade,
  origen_id uuid references public.profiles(id),
  tipo text not null check (tipo in ('afiliacion','binaria','nivel')),
  nivel_red integer,
  monto decimal(10,2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','pagado','cancelado')),
  descripcion text,
  created_at timestamp with time zone default now(),
  pagado_at timestamp with time zone
);

-- VOLUMENES_BINARIOS table (monthly binary volumes)
create table public.volumenes_binarios (
  id uuid primary key default gen_random_uuid(),
  distribuidor_id uuid references public.profiles(id) on delete cascade,
  mes date not null,
  volumen_izquierda decimal(10,2) default 0,
  volumen_derecha decimal(10,2) default 0,
  volumen_pareado decimal(10,2) default 0,
  comision_calculada decimal(10,2) default 0,
  procesado boolean default false,
  created_at timestamp with time zone default now(),
  unique(distribuidor_id, mes)
);

-- RANGOS_HISTORIA table
create table public.rangos_historia (
  id uuid primary key default gen_random_uuid(),
  distribuidor_id uuid references public.profiles(id) on delete cascade,
  rango text not null,
  tramo text not null check (tramo in ('1','2')),
  bono_monto decimal(10,2),
  bono_pagado boolean default false,
  fecha_alcanzado timestamp with time zone default now()
);

-- ─── STORAGE BUCKET ───────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documentos-afiliacion', 'documentos-afiliacion', false)
on conflict do nothing;

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.afiliaciones enable row level security;
alter table public.red_binaria enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.comisiones enable row level security;
alter table public.volumenes_binarios enable row level security;
alter table public.rangos_historia enable row level security;

-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  );
$$ language sql security definer;

-- PROFILES policies
create policy "Users can read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "Admins can insert profiles" on public.profiles
  for insert with check (public.is_admin());
create policy "Admins can update profiles" on public.profiles
  for update using (public.is_admin() or id = auth.uid());

-- AFILIACIONES policies
create policy "Public can insert afiliaciones" on public.afiliaciones
  for insert with check (true);
create policy "Admins can read afiliaciones" on public.afiliaciones
  for select using (public.is_admin());
create policy "Admins can update afiliaciones" on public.afiliaciones
  for update using (public.is_admin());

-- RED_BINARIA policies
create policy "Users can read own red" on public.red_binaria
  for select using (public.is_admin() or
    distribuidor_id = auth.uid() or
    padre_id in (select id from public.red_binaria where distribuidor_id = auth.uid())
  );
create policy "Admins can manage red" on public.red_binaria
  for all using (public.is_admin());

-- PEDIDOS policies
create policy "Users can read own pedidos" on public.pedidos
  for select using (distribuidor_id = auth.uid() or public.is_admin());
create policy "Users can insert own pedidos" on public.pedidos
  for insert with check (distribuidor_id = auth.uid());
create policy "Admins can update pedidos" on public.pedidos
  for update using (public.is_admin());

-- PEDIDO_ITEMS policies
create policy "Users can read own items" on public.pedido_items
  for select using (
    pedido_id in (select id from public.pedidos where distribuidor_id = auth.uid())
    or public.is_admin()
  );
create policy "Users can insert items" on public.pedido_items
  for insert with check (
    pedido_id in (select id from public.pedidos where distribuidor_id = auth.uid())
  );

-- COMISIONES policies
create policy "Users can read own comisiones" on public.comisiones
  for select using (beneficiario_id = auth.uid() or public.is_admin());
create policy "Admins can manage comisiones" on public.comisiones
  for all using (public.is_admin());

-- VOLUMENES_BINARIOS policies
create policy "Users can read own volumenes" on public.volumenes_binarios
  for select using (distribuidor_id = auth.uid() or public.is_admin());
create policy "Admins can manage volumenes" on public.volumenes_binarios
  for all using (public.is_admin());

-- RANGOS_HISTORIA policies
create policy "Users can read own rangos" on public.rangos_historia
  for select using (distribuidor_id = auth.uid() or public.is_admin());
create policy "Admins can manage rangos" on public.rangos_historia
  for all using (public.is_admin());

-- Storage policies
create policy "Admins can read documents" on storage.objects
  for select using (bucket_id = 'documentos-afiliacion' and public.is_admin());
create policy "Anyone can upload documents" on storage.objects
  for insert with check (bucket_id = 'documentos-afiliacion');

-- ─── TRIGGER: auto-update updated_at ──────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger afiliaciones_updated_at before update on public.afiliaciones
  for each row execute function public.set_updated_at();
create trigger pedidos_updated_at before update on public.pedidos
  for each row execute function public.set_updated_at();

-- ─── SEED: Create first admin ─────────────────────────────────
-- NOTE: Run this AFTER creating the admin user via Supabase Auth dashboard
-- INSERT INTO public.profiles (id, codigo_distribuidor, nombre_completo, cedula, email, rol)
-- VALUES ('<auth-user-uuid>', 'SUMAK-00001', 'Dr. Luis Paredes', '0000000000', 'admin@sumak.com.ec', 'admin');
