-- ============================================================
-- SUMAK — Migration 015 — Revoke PUBLIC en RPCs admin-only
-- ============================================================
-- Las migraciones 011/012 revocaron grants explicitos a anon, pero
-- PostgreSQL otorga EXECUTE a PUBLIC por default y anon/authenticated
-- heredan de ahi. Esta migracion cierra ese leak.
--
-- NO se aplica a:
--   • lookup_sponsor — el form publico de Registro lo necesita
--   • is_admin / is_operaciones_or_admin — RLS las usa en su evaluacion
--     y requieren EXECUTE para el rol que dispara la policy.
-- ============================================================

-- Crons / utilitarios internos: no callable via API
revoke execute on function public.cancelar_pedidos_pago_vencidos() from public;
revoke execute on function public.rls_auto_enable() from public;

-- finish_approve_afiliacion (5-arg): solo service_role
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='finish_approve_afiliacion' and p.pronargs=5) then
    execute 'revoke execute on function public.finish_approve_afiliacion(uuid, uuid, text, uuid, boolean) from public';
  end if;
end $$;

-- Las siguientes son llamadas via API por usuarios autenticados, pero
-- no por anon. Revocar de PUBLIC mantiene authenticated funcional (tiene
-- grant explicito) y bloquea anon.
revoke execute on function public.approve_afiliacion(uuid, uuid, text, uuid, boolean) from public;
revoke execute on function public.cancel_pedido(uuid, text) from public;
revoke execute on function public.mark_pedido_entregado(uuid) from public;
revoke execute on function public.report_pedido_issue(uuid, text) from public;

do $$ begin
  if exists (select 1 from pg_proc where proname='submit_pedido') then
    execute 'revoke execute on function public.submit_pedido(uuid, jsonb, text, text, text, text) from public';
  end if;
end $$;

-- ============================================================
-- Nota: is_admin / is_operaciones_or_admin SE MANTIENEN callable
-- por authenticated porque las policies RLS las invocan y necesitan
-- EXECUTE granted al rol caller. El advisor las flagea pero es by
-- design — las funciones solo devuelven booleano basado en auth.uid().
-- ============================================================
