-- ============================================================
-- SUMAK — Migration 012 — Cleanup de Supabase advisor (security)
-- ============================================================
-- Resuelve los hallazgos reportados por get_advisors(security):
--   (A) ERROR  — view public.activacion_mensual con SECURITY DEFINER
--   (B) WARN   — funciones con search_path mutable
--   (C) WARN   — RPCs SECURITY DEFINER callable por anon (sin auth)
--
-- Idempotente. Cada bloque verifica existencia antes de actuar.
-- ============================================================

-- (A) Vista activacion_mensual: pasarla a SECURITY INVOKER
-- ALTER VIEW soportado en Postgres 15+. Si la propiedad ya esta seteada,
-- es un no-op silencioso.
do $$ begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname='activacion_mensual') then
    execute 'alter view public.activacion_mensual set (security_invoker = true)';
  end if;
end $$;

-- (B) Fijar search_path = public en funciones flageadas.
-- Lo hacemos via ALTER FUNCTION ... SET (no requiere recrear el body).
do $$ begin
  if exists (select 1 from pg_proc where proname='pedidos_lock_entregado') then
    execute 'alter function public.pedidos_lock_entregado() set search_path = public';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='is_admin' and pronargs=0) then
    execute 'alter function public.is_admin() set search_path = public';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='set_updated_at' and pronargs=0) then
    execute 'alter function public.set_updated_at() set search_path = public';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='distribuidor_activo_mes') then
    execute 'alter function public.distribuidor_activo_mes(uuid, date) set search_path = public';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='cancelar_pedidos_pago_vencidos') then
    execute 'alter function public.cancelar_pedidos_pago_vencidos() set search_path = public';
  end if;
end $$;

-- (C) Revocar EXECUTE a anon en RPCs SECURITY DEFINER que no son publicas.
-- Las RPCs validan internamente con is_admin() / auth.uid() pero exponerlas
-- a anon es ruido innecesario en la API y posible vector de DoS.
-- IMPORTANTE: lookup_sponsor SE MANTIENE callable por anon — el form publico
-- de registro lo necesita para validar el codigo de patrocinador antes de
-- enviar la solicitud.

-- Aprobacion: solo admin via wrapper approve_afiliacion, y la subyacente
-- finish_approve_afiliacion no debe ser callable directamente.
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='approve_afiliacion' and p.pronargs=5) then
    execute 'revoke execute on function public.approve_afiliacion(uuid, uuid, text, uuid, boolean) from anon';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='finish_approve_afiliacion' and p.pronargs=4) then
    execute 'revoke execute on function public.finish_approve_afiliacion(uuid, uuid, text, uuid) from anon, authenticated';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='finish_approve_afiliacion' and p.pronargs=5) then
    execute 'revoke execute on function public.finish_approve_afiliacion(uuid, uuid, text, uuid, boolean) from anon, authenticated';
  end if;
end $$;

-- Cancelacion / recepcion / incidencia de pedidos: solo authenticated.
do $$ begin
  if exists (select 1 from pg_proc where proname='cancel_pedido') then
    execute 'revoke execute on function public.cancel_pedido(uuid, text) from anon';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='mark_pedido_entregado') then
    execute 'revoke execute on function public.mark_pedido_entregado(uuid) from anon';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='report_pedido_issue') then
    execute 'revoke execute on function public.report_pedido_issue(uuid, text) from anon';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='submit_pedido') then
    execute 'revoke execute on function public.submit_pedido(uuid, jsonb, text, text, text, text) from anon';
  end if;
end $$;

-- Helpers de autorizacion: no tienen sentido para anon.
do $$ begin
  if exists (select 1 from pg_proc where proname='is_admin' and pronargs=0) then
    execute 'revoke execute on function public.is_admin() from anon';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='is_operaciones_or_admin' and pronargs=0) then
    execute 'revoke execute on function public.is_operaciones_or_admin() from anon';
  end if;
end $$;

-- Crons / utilitarios admin: no deben ser callable desde la API.
do $$ begin
  if exists (select 1 from pg_proc where proname='cancelar_pedidos_pago_vencidos') then
    execute 'revoke execute on function public.cancelar_pedidos_pago_vencidos() from anon, authenticated';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc where proname='rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;
end $$;

-- ============================================================
-- VERIFICACION (post-aplicacion):
--   select proname, proconfig from pg_proc where proname in (
--     'pedidos_lock_entregado','is_admin','set_updated_at',
--     'distribuidor_activo_mes','cancelar_pedidos_pago_vencidos'
--   );  -- proconfig debe incluir search_path=public
--
--   select grantee, privilege_type from information_schema.routine_privileges
--    where routine_schema='public' and routine_name='cancel_pedido';
--   -- no debe aparecer grantee='anon'
-- ============================================================
