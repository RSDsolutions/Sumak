-- ============================================================
-- SUMAK — Migration 002
-- Store improvements, monthly activation, binary tree integrity
-- ============================================================
-- This migration is IDEMPOTENT — safe to run multiple times.
-- Run this in the Supabase SQL editor after migration 001.

-- ─────────────────────────────────────────────────────────────
-- 1. PEDIDOS: human-readable order number + puntos column
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'numero_pedido') then
    alter table public.pedidos add column numero_pedido serial;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'puntos_generados') then
    alter table public.pedidos add column puntos_generados integer default 0;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. BINARY TREE INTEGRITY
-- Non-admin parent nodes can only have ONE child per posicion
-- (izquierda / derecha). Admin nodes can have UNLIMITED frontals
-- (posicion = NULL) — this is allowed by the partial unique index.
-- ─────────────────────────────────────────────────────────────
drop index if exists idx_red_binaria_padre_posicion;
create unique index idx_red_binaria_padre_posicion
  on public.red_binaria (padre_id, posicion)
  where posicion is not null and padre_id is not null;

comment on column public.red_binaria.posicion is
  'NULL = frontal del admin (admin puede tener N hijos frontales sin posición). Para nodos no-admin debe ser ''izquierda'' o ''derecha'' y es única por padre.';

-- ─────────────────────────────────────────────────────────────
-- 3. PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_pedidos_dist_estado_fecha
  on public.pedidos (distribuidor_id, estado, created_at desc);

create index if not exists idx_pedidos_created
  on public.pedidos (created_at desc);

create index if not exists idx_pedido_items_pedido
  on public.pedido_items (pedido_id);

create index if not exists idx_comisiones_beneficiario_fecha
  on public.comisiones (beneficiario_id, created_at desc);

create index if not exists idx_comisiones_origen
  on public.comisiones (origen_id);

create index if not exists idx_red_padre
  on public.red_binaria (padre_id);

create index if not exists idx_profiles_patrocinador
  on public.profiles (patrocinador_id);

create index if not exists idx_profiles_rol
  on public.profiles (rol);

-- ─────────────────────────────────────────────────────────────
-- 4. MONTHLY ACTIVATION ($100 in a single delivered order)
-- ─────────────────────────────────────────────────────────────
create or replace function public.distribuidor_activo_mes(
  p_distribuidor_id uuid,
  p_mes date default date_trunc('month', current_date)::date
)
returns boolean as $$
  select exists (
    select 1 from public.pedidos
    where distribuidor_id = p_distribuidor_id
      and estado = 'entregado'
      and total >= 100
      and created_at >= p_mes
      and created_at < (p_mes + interval '1 month')
  );
$$ language sql stable;

-- View: monthly activation summary
create or replace view public.activacion_mensual as
select
  p.id as distribuidor_id,
  p.codigo_distribuidor,
  p.nombre_completo,
  p.email,
  p.rol,
  coalesce(sum(case when pe.estado = 'entregado' then pe.total else 0 end), 0) as total_mes,
  count(case when pe.estado = 'entregado' then 1 end) as pedidos_entregados_mes,
  bool_or(pe.estado = 'entregado' and pe.total >= 100) as activo
from public.profiles p
left join public.pedidos pe on pe.distribuidor_id = p.id
  and pe.created_at >= date_trunc('month', current_date)
  and pe.created_at < date_trunc('month', current_date) + interval '1 month'
group by p.id, p.codigo_distribuidor, p.nombre_completo, p.email, p.rol;

grant select on public.activacion_mensual to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. ORDER STATS VIEW (for the admin)
-- ─────────────────────────────────────────────────────────────
create or replace view public.pedidos_resumen_mes as
select
  date_trunc('month', created_at)::date as mes,
  count(*) as total_pedidos,
  count(case when estado = 'entregado' then 1 end) as entregados,
  coalesce(sum(case when estado = 'entregado' then total else 0 end), 0) as ingresos
from public.pedidos
group by date_trunc('month', created_at)
order by mes desc;

grant select on public.pedidos_resumen_mes to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. FUNCTION: get upline chain (up to 14 levels)
-- Helps optimize commission calculation
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_upline_chain(p_distribuidor_id uuid, p_max_levels integer default 14)
returns table(nivel integer, distribuidor_id uuid)
as $$
declare
  current_id uuid;
  current_sponsor uuid;
  current_level integer := 1;
begin
  current_id := p_distribuidor_id;
  while current_level <= p_max_levels loop
    select patrocinador_id into current_sponsor
    from public.profiles
    where id = current_id;
    if current_sponsor is null then
      exit;
    end if;
    return query select current_level, current_sponsor;
    current_id := current_sponsor;
    current_level := current_level + 1;
  end loop;
end;
$$ language plpgsql stable;

-- ─────────────────────────────────────────────────────────────
-- 7. TRIGGER: prevent duplicate binary positions under non-admin
-- (the partial unique index above already enforces this,
-- this trigger provides a friendlier error message)
-- ─────────────────────────────────────────────────────────────
create or replace function public.check_binary_position()
returns trigger as $$
declare
  parent_is_admin boolean;
begin
  if new.padre_id is null then
    return new;
  end if;
  -- Get the parent's distribuidor's role
  select pr.rol = 'admin' into parent_is_admin
  from public.red_binaria rb
  join public.profiles pr on pr.id = rb.distribuidor_id
  where rb.id = new.padre_id;

  if parent_is_admin then
    -- Admin parent: posicion must be NULL (frontal), but we allow either for flexibility
    return new;
  else
    -- Non-admin parent: posicion must be izquierda or derecha and not duplicated
    if new.posicion is null then
      raise exception 'Nodos bajo distribuidores no-admin deben tener posicion (izquierda o derecha).';
    end if;
    if exists (
      select 1 from public.red_binaria
      where padre_id = new.padre_id and posicion = new.posicion and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
      raise exception 'La posicion % ya está ocupada bajo este distribuidor.', new.posicion;
    end if;
    return new;
  end if;
end;
$$ language plpgsql;

drop trigger if exists check_binary_position_trigger on public.red_binaria;
create trigger check_binary_position_trigger
  before insert or update on public.red_binaria
  for each row execute function public.check_binary_position();

-- ─────────────────────────────────────────────────────────────
-- 8. PUBLIC POLICY for reading distributor profiles (for the public store)
-- This lets distributors see each other's public info (name, code) for sponsor lookup
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Authenticated users can read basic profile info'
  ) then
    create policy "Authenticated users can read basic profile info" on public.profiles
      for select using (
        auth.uid() is not null
      );
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
-- After applying this migration, your platform supports:
-- • Multi-product orders with detail (already supported, now indexed)
-- • Monthly $100 activation tracking via distribuidor_activo_mes()
-- • Admin can have UNLIMITED frontals (10, 100, 1000+)
-- • Non-admin nodes are strictly binary (izquierda + derecha only)
-- • Performance indexes on all critical queries
-- • Human-readable order numbers
