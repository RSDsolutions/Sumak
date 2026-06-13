# Sprint 0 — Notas de cierre y acciones manuales

> **Origen:** Plan `vamos-con-el-plan-bright-simon.md`
> **Corte:** 2026-06-13
> **Estado:** Implementación completa de Sprint 0 + SEC-001.

---

## Migraciones aplicadas (DB + repo)

| Mig | Descripción | Aplicada en DB | En repo |
|---|---|---|---|
| 012 | Advisor cleanup (search_path, view security_invoker, revoke anon) | ✅ | ✅ |
| 013 | Backport `numero_pedido serial` | ✅ | ✅ |
| 014 | Backport `finish_approve_afiliacion` 5-arg | ✅ | ✅ |
| 015 | Revoke PUBLIC en RPCs sensibles | ✅ | ✅ |
| 016 | Ocultar `is_admin()` de anon | ✅ | ✅ |
| 019 | Recalcular niveles binarios (BIZ-001) | ✅ | ✅ |
| 020 | 8 índices FK faltantes (PERF-002) | ✅ | ✅ |
| 021 | RPCs admin (admin_kpis, mark_comision_pagada, set_distribuidor_estado, set_pedido_estado) | ✅ | ✅ |

## Edge Functions desplegadas

| Function | Propósito | Verify JWT |
|---|---|---|
| `approve-afiliacion` | Crea auth.user + llama RPC + rollback. Reemplaza el flujo cliente en `SolicitudDetalle` | ✅ |
| `sign-voucher-url` | Genera signed URLs para buckets (allowlist) sin exponer service_role | ✅ |

## Archivos frontend refactorizados

10 archivos perdieron toda referencia a `supabaseAdmin`:

- `src/lib/supabase.ts` — eliminado el export `supabaseAdmin`, agregado helper `callEdgeFunction`
- `src/pages/admin/AdminDashboard.tsx` — usa RPC `admin_kpis()`
- `src/pages/admin/AdminMisComisiones.tsx` — usa `supabase` (RLS admin)
- `src/pages/admin/AdminComisiones.tsx` — RPC `mark_comision_pagada(...)`
- `src/pages/admin/AdminPedidos.tsx` — Edge Function `sign-voucher-url`, RLS para updates
- `src/pages/admin/AdminRed.tsx`, `AdminEscalera.tsx`, `Distribuidores.tsx` — solo lectura via `supabase`
- `src/pages/admin/DistribuidorDetalle.tsx` — RPC `admin_set_distribuidor_estado(...)`
- `src/pages/admin/SolicitudDetalle.tsx` — Edge Function `approve-afiliacion` + `sign-voucher-url`
- `src/pages/admin/Solicitudes.tsx` — listado via `supabase`

## Verificación bundle

```bash
grep -c "service_role" dist/assets/*.js | grep -v ":0$"
# 0 matches en bundle JS

grep -c "VITE_SUPABASE_SERVICE_ROLE" dist/assets/*.js | grep -v ":0$"
# 0 matches de env var
```

✅ El bundle JavaScript servido al browser ya **no contiene** el service_role key ni su env var.

---

## Acciones manuales pendientes para vos

### 1. SEC-002 — Activar leaked password protection

**5 minutos en el dashboard, sin código.**

1. Entrá al dashboard del proyecto `pdzviwvurafyvbetjkhr` en Supabase.
2. **Authentication → Sign In / Up → Password-based Authentication**.
3. Activá el toggle **"Prevent sign-ups with breached passwords"**.

Eso hace que Supabase consulte HaveIBeenPwned cada vez que alguien intente registrarse. Si la password está en la base de leaks, rechaza el signup.

### 2. Rotar `service_role` key (sugerencia)

Aunque el bundle ya no la contiene, durante la auditoría escribiste la key viejo en el chat. Por hygiene, rotala:

1. Dashboard → **Settings → API**.
2. Click en **"Reset service_role JWT"** (genera una nueva, la vieja queda invalidada).
3. Actualizá la env var del proyecto Vercel:
   - **NO** uses `VITE_SUPABASE_SERVICE_ROLE_KEY` más en el frontend (ya no se usa).
   - Si tenés Edge Functions, ellas ya leen automáticamente la nueva via `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` que Supabase inyecta.
4. Eliminá `VITE_SUPABASE_SERVICE_ROLE_KEY` del `.env.local` y de Vercel (ya no es necesaria).

### 3. Limpiar backup `red_binaria_bk_pre_019`

Una semana después de hoy, si todo funciona bien:

```sql
drop table if exists public.red_binaria_bk_pre_019;
```

---

## Smoke test sugerido

Antes de declarar Sprint 0 cerrado, validá manualmente:

- [ ] **Admin login** → `/admin` muestra KPIs correctos (afiliaciones pendientes, distribuidores activos, comisiones, pedidos).
- [ ] **Admin Comisiones** → marcá una comisión como pagada con voucher → debe persistir.
- [ ] **Admin Mis Comisiones** → carga el listado de comisiones propias.
- [ ] **Admin Pedidos** → cambiar estado, abrir voucher signed URL.
- [ ] **Admin Distribuidor Detalle** → suspender/activar un distribuidor de prueba.
- [ ] **Admin Solicitud Detalle** → aprobar una afiliación de prueba (Edge Function).
- [ ] **Admin Red + Escalera** → renderean el árbol y los rangos.
- [ ] **Operaciones login** → solo ve sus secciones, no Mis Comisiones del admin, no suspende distribuidores.
- [ ] **Distribuidor login** → Mi Red carga el subtree completo, sin "Aún no estás en la red".

---

## Métricas finales

| Antes | Después | Cambio |
|---|---|---|
| `service_role` en bundle | ✅ presente | ❌ eliminado |
| Migraciones huérfanas en DB | 5 | 0 |
| Foreign keys sin índice (advisor) | 8 | 0 |
| Niveles binarios incorrectos | 4 | 0 |
| Vista `activacion_mensual` SECURITY DEFINER | ⚠️ ERROR | ✅ INVOKER |
| Funciones con search_path mutable | 5 | 0 |

## Lo que NO se hizo (Sprint 1 y posteriores)

- Refactor de 11 policies RLS con `(select auth.uid())` para evitar re-evaluación por fila (PERF-001)
- Consolidación de policies permissive duplicadas (PERF-003)
- Drop de índices duplicados en `volumenes_binarios` (PERF-004)
- Tests automáticos (Vitest + Playwright)
- Notificaciones in-app
- Export CSV de reportes
- Cálculo de comisión binaria mensual (cron)
- Email transaccional

Esos quedan para Sprint 1+ según prioridad del equipo.
