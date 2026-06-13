-- ============================================================
-- SUMAK — Migration 018 — Fix recursion infinita en RLS de red_binaria
-- ============================================================
-- Bug: cuando un distribuidor autenticado leia red_binaria, Postgres
-- lanzaba "42P17: infinite recursion detected in policy for relation
-- red_binaria".
--
-- Causa: la policy "Lectura de la red" (creada en mig 007) tenia:
--   padre_id IN (SELECT id FROM red_binaria WHERE distribuidor_id = auth.uid())
-- El SELECT anidado vuelve a aplicar la misma policy -> recursion.
--
-- Esto rompia /dashboard/red (Mi Red) que mostraba "Aun no estas en
-- la red" aun cuando el distribuidor tenia referidos, porque cada
-- query de red_binaria desde el frontend del distribuidor reventaba.
--
-- Fix: drop "Lectura de la red". Ya existe "authenticated_read_red"
-- con using (true) que permite a cualquier rol autenticado leer la
-- red (necesario para Mi Red, AdminRed, etc.). El admin sigue
-- gestionando via "Admin administra red".
--
-- Trade-off de privacidad: cualquier autenticado ve toda la
-- red_binaria. Esto es aceptable porque la app ya muestra arboles
-- multinivel a los distribuidores y el endpoint no expone datos
-- sensibles directamente (solo IDs y posiciones).
--
-- Idempotente.
-- ============================================================

drop policy if exists "Lectura de la red" on public.red_binaria;

-- Aseguramos que existe la policy simple permisiva. Si ya esta no hace
-- nada (se reusa el nombre). Esta replica la pattern de Supabase para
-- jerarquias arboles donde la recursion en RLS no se puede evaluar.
do $$ begin
  if not exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='red_binaria'
       and policyname='authenticated_read_red'
  ) then
    execute 'create policy "authenticated_read_red" on public.red_binaria '
         || 'for select to authenticated using (true)';
  end if;
end $$;

-- ============================================================
-- VERIFICACION
--   select policyname from pg_policies
--    where schemaname='public' and tablename='red_binaria';
--   -- NO debe aparecer "Lectura de la red"
--
--   -- Simular el caller y probar que no revienta:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uid>","role":"authenticated"}';
--   select count(*) from public.red_binaria;
-- ============================================================
