-- ============================================================
-- SUMAK — Migration 004b
-- Fix "Bucket not found": crea el bucket pedidos-vouchers
-- y sus políticas. Úsalo si la 004 no creó el bucket en tu
-- proyecto o si solo quieres re-aplicar esta parte.
-- ============================================================
-- Idempotente. Pégalo entero en el SQL Editor de Supabase.
-- ============================================================

-- 1. Crear el bucket pedidos-vouchers (privado)
insert into storage.buckets (id, name, public)
values ('pedidos-vouchers', 'pedidos-vouchers', false)
on conflict (id) do nothing;

-- 2. Política de INSERT — cualquier usuario autenticado puede subir
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated users can upload payment vouchers'
  ) then
    create policy "Authenticated users can upload payment vouchers" on storage.objects
      for insert with check (
        bucket_id = 'pedidos-vouchers' and auth.uid() is not null
      );
  end if;
end $$;

-- 3. Política de SELECT — distribuidor lee los suyos, admin lee todos
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users read own payment vouchers'
  ) then
    create policy "Users read own payment vouchers" on storage.objects
      for select using (
        bucket_id = 'pedidos-vouchers' and (
          public.is_admin() or auth.uid()::text = (storage.foldername(name))[1]
        )
      );
  end if;
end $$;

-- ─── VERIFICACIÓN ─────────────────────────────────────────────
-- Después de correr esto, verifica con:
--
--   select id, name, public from storage.buckets where id = 'pedidos-vouchers';
--   -- Debe devolver una fila.
--
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname in ('Authenticated users can upload payment vouchers',
--                          'Users read own payment vouchers');
--   -- Debe devolver 2 filas.
-- ============================================================
