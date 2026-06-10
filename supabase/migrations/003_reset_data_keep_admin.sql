-- ============================================================
-- SUMAK — Migration 003
-- RESET: borra todos los datos operativos dejando solo al admin
-- ============================================================
-- ⚠️  ESTE SCRIPT BORRA DATOS DE FORMA IRREVERSIBLE.
--    Úsalo cuando quieras arrancar la plataforma desde cero
--    conservando únicamente la(s) cuenta(s) admin.
--
-- Lo que hace, en orden:
--   1) Borra todas las solicitudes de afiliación (pendientes,
--      aprobadas y rechazadas)
--   2) Borra ítems y pedidos
--   3) Borra comisiones
--   4) Borra volúmenes binarios y historial de rangos
--   5) Borra todos los nodos de red_binaria
--   6) Borra todos los profiles excepto los de rol = 'admin'
--   7) Borra los usuarios de auth.users que ya no tienen profile
--      (los huérfanos de profile que no eran admin)
--
-- Después de correrlo, el ÚNICO usuario activo será el admin.
-- Las contraseñas y el login del admin permanecen intactos.
--
-- Cómo correrlo: pégalo entero en el SQL Editor de Supabase y
-- ejecuta. Es seguro re-correrlo (idempotente).
-- ============================================================

begin;

-- 1) Solicitudes de afiliación: borra todas
delete from public.afiliaciones;

-- 2) Pedidos: borra ítems primero y luego los pedidos
delete from public.pedido_items;
delete from public.pedidos;

-- 3) Comisiones
delete from public.comisiones;

-- 4) Volúmenes binarios e historial de rangos
delete from public.volumenes_binarios;
delete from public.rangos_historia;

-- 5) Nodos de red binaria: todos
delete from public.red_binaria;

-- 6) Profiles: todos menos los admin
--    Los profiles enlazan a auth.users con ON DELETE CASCADE,
--    pero queremos también limpiar auth.users abajo. Borrar
--    profiles primero deja huérfanos en auth.users que tratamos
--    en el paso 7.
delete from public.profiles where rol <> 'admin';

-- 7) auth.users: borra los que ya no tienen profile y NO son admin
--    (todos los que dejamos en paso 6 quedaron sin profile y son
--    los que queremos eliminar del sistema de auth también)
delete from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- 8) Resetea la secuencia del numero_pedido para que el próximo
--    pedido vuelva a empezar en 1
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'numero_pedido'
  ) then
    -- reinicia la secuencia asociada al SERIAL
    perform setval(pg_get_serial_sequence('public.pedidos', 'numero_pedido'), 1, false);
  end if;
end $$;

commit;

-- ─── VERIFICACIÓN ───────────────────────────────────────────
-- Tras correr el script puedes ejecutar estas consultas para
-- confirmar que todo quedó limpio:
--
--   select count(*) as total_profiles, count(*) filter (where rol='admin') as admins from public.profiles;
--   select count(*) from public.afiliaciones;
--   select count(*) from public.pedidos;
--   select count(*) from public.comisiones;
--   select count(*) from public.red_binaria;
--   select count(*) from auth.users;
--
-- Deberías ver: 1 (o N) admins, y 0 en todas las demás.
-- ============================================================
