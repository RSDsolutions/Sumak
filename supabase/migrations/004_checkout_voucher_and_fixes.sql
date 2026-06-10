-- ============================================================
-- SUMAK — Migration 004
-- Checkout con voucher, activación incluye 'procesando',
-- admin Dr. Luis Paredes y nodo binario garantizado del admin
-- ============================================================
-- Idempotente — se puede ejecutar varias veces sin romper datos.
-- Pégalo entero en el SQL Editor de Supabase y ejecuta.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PEDIDOS: columna voucher_url (comprobante de pago)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'voucher_url') then
    alter table public.pedidos add column voucher_url text;
  end if;
end $$;

comment on column public.pedidos.voucher_url is
  'Ruta del archivo en el bucket pedidos-vouchers — foto del voucher de transferencia/depósito subida por el distribuidor en el checkout.';

-- ─────────────────────────────────────────────────────────────
-- 2. STORAGE BUCKET para los vouchers de pago
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('pedidos-vouchers', 'pedidos-vouchers', false)
on conflict do nothing;

-- Distribuidores autenticados pueden subir vouchers
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can upload payment vouchers'
  ) then
    create policy "Authenticated users can upload payment vouchers" on storage.objects
      for insert with check (
        bucket_id = 'pedidos-vouchers' and auth.uid() is not null
      );
  end if;
end $$;

-- Distribuidores pueden leer sus propios vouchers; admin puede leer todos
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users read own payment vouchers'
  ) then
    create policy "Users read own payment vouchers" on storage.objects
      for select using (
        bucket_id = 'pedidos-vouchers' and (
          public.is_admin() or auth.uid()::text = (storage.foldername(name))[1]
        )
      );
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. ACTIVACIÓN MENSUAL incluye 'procesando' (no solo 'entregado')
-- Antes: solo pedidos entregados contaban. Ahora cualquier pedido
-- no-cancelado/no-pendiente de $100+ activa el mes.
-- ─────────────────────────────────────────────────────────────
create or replace function public.distribuidor_activo_mes(
  p_distribuidor_id uuid,
  p_mes date default date_trunc('month', current_date)::date
)
returns boolean as $$
  select exists (
    select 1 from public.pedidos
    where distribuidor_id = p_distribuidor_id
      and estado in ('procesando','enviado','entregado')
      and total >= 100
      and created_at >= p_mes
      and created_at < (p_mes + interval '1 month')
  );
$$ language sql stable;

create or replace view public.activacion_mensual as
select
  p.id as distribuidor_id,
  p.codigo_distribuidor,
  p.nombre_completo,
  p.email,
  p.rol,
  coalesce(sum(case when pe.estado in ('procesando','enviado','entregado') then pe.total else 0 end), 0) as total_mes,
  count(case when pe.estado in ('procesando','enviado','entregado') then 1 end) as pedidos_calificados_mes,
  bool_or(pe.estado in ('procesando','enviado','entregado') and pe.total >= 100) as activo
from public.profiles p
left join public.pedidos pe on pe.distribuidor_id = p.id
  and pe.created_at >= date_trunc('month', current_date)
  and pe.created_at < date_trunc('month', current_date) + interval '1 month'
group by p.id, p.codigo_distribuidor, p.nombre_completo, p.email, p.rol;

grant select on public.activacion_mensual to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. ADMIN: nombre canónico Dr. Luis Paredes
-- ─────────────────────────────────────────────────────────────
update public.profiles
   set nombre_completo = 'Dr. Luis Paredes'
 where rol = 'admin'
   and nombre_completo is distinct from 'Dr. Luis Paredes';

-- ─────────────────────────────────────────────────────────────
-- 5. ADMIN: nodo en red_binaria (root) si no existe
-- Necesario para que los frontales puedan colgar de él
-- y la red se visualice correctamente.
-- ─────────────────────────────────────────────────────────────
insert into public.red_binaria (distribuidor_id, padre_id, posicion, nivel)
select p.id, null, null, 1
  from public.profiles p
 where p.rol = 'admin'
   and not exists (
     select 1 from public.red_binaria rb
     where rb.distribuidor_id = p.id
   );

-- ─────────────────────────────────────────────────────────────
-- 6. ADMIN: huérfanos en la red — los nodos sin padre que no son
-- el admin se cuelgan automáticamente como frontales del admin.
-- Esto repara redes preexistentes donde se aprobaron frontales
-- antes de que el admin tuviera nodo en red_binaria.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  admin_node_id uuid;
begin
  select rb.id into admin_node_id
    from public.red_binaria rb
    join public.profiles p on p.id = rb.distribuidor_id
   where p.rol = 'admin'
   limit 1;

  if admin_node_id is not null then
    update public.red_binaria
       set padre_id = admin_node_id,
           posicion = null,
           nivel = 2
     where padre_id is null
       and id <> admin_node_id;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 7. PROFILES sin patrocinador → cuelgan del admin
-- (excluye al propio admin). Esto cierra la cadena de comisiones
-- por nivel para que el admin también reciba sus niveles.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  admin_id uuid;
begin
  select id into admin_id from public.profiles where rol = 'admin' limit 1;
  if admin_id is not null then
    update public.profiles
       set patrocinador_id = admin_id
     where rol = 'distribuidor'
       and patrocinador_id is null
       and id <> admin_id;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN sugerida tras correr la migración:
--
--   select id, nombre_completo, rol from public.profiles where rol = 'admin';
--   select count(*) from public.red_binaria where padre_id is null;
--   -- esperado: 1 (solo el admin)
--   select count(*) from public.pedidos where voucher_url is not null;
-- ============================================================
