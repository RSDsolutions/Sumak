# Auditoría Integral — Plataforma Sumak Vida Ecuador S.A.

> **Documento:** Auditoría técnica, funcional, de seguridad y de UX
> **Plataforma:** Sumak Vida Ecuador S.A. (web pública + plataforma MLM binaria)
> **Stack revisado:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind v4 · Supabase (PostgreSQL 17 + Auth + Storage + RLS) · React Router 7 · Motion 12 · Lucide
> **Corte:** rama `main` al **13 de junio de 2026** — commit `7bab722`
> **Migraciones aplicadas:** 001 → 018 (rastro completo en `supabase/migrations/`)
> **Naturaleza:** este documento **identifica hallazgos y propone soluciones**. La implementación queda a criterio del equipo.

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Cambios desde la auditoría previa](#2-cambios-desde-la-auditoria-previa)
3. [Inventario del estado actual](#3-inventario-del-estado-actual)
4. [Fortalezas detectadas](#4-fortalezas-detectadas)
5. [Hallazgos — Seguridad (SEC)](#5-hallazgos--seguridad-sec)
6. [Hallazgos — Integridad y lógica de negocio (BIZ)](#6-hallazgos--integridad-y-logica-de-negocio-biz)
7. [Hallazgos — Arquitectura y backend (ARQ)](#7-hallazgos--arquitectura-y-backend-arq)
8. [Hallazgos — Performance (PERF)](#8-hallazgos--performance-perf)
9. [Hallazgos — UX y diseño (UX)](#9-hallazgos--ux-y-diseno-ux)
10. [Hallazgos — Accesibilidad (A11Y)](#10-hallazgos--accesibilidad-a11y)
11. [Hallazgos — SEO y marketing (SEO)](#11-hallazgos--seo-y-marketing-seo)
12. [Hallazgos — Código y mantenibilidad (COD)](#12-hallazgos--codigo-y-mantenibilidad-cod)
13. [Hallazgos — Operaciones y DevOps (OPS)](#13-hallazgos--operaciones-y-devops-ops)
14. [Nuevas funcionalidades propuestas](#14-nuevas-funcionalidades-propuestas)
15. [Plan de priorización](#15-plan-de-priorizacion)
16. [Métricas de éxito](#16-metricas-de-exito)
17. [Anexos](#17-anexos)

---

## 1. Resumen ejecutivo

### Estado global por área

| Área | Estado | Comentario |
|---|---|---|
| **Seguridad** | 🟡 Aceptable | RLS funcional, secrets ok, persisten warnings menores (search_path, anon access en lookup_sponsor, leaked password protection desactivada) |
| **Integridad de datos** | 🟢 Buena | RPCs atómicas, idempotencia con `idempotency_key`, trigger de inmutabilidad en pedidos entregados |
| **Arquitectura** | 🟢 Buena | Separación clara de roles, RLS coherente, helpers centralizados (`useAdminBasePath`, `getPrecioDistribuidor`, `autoResolvePrize`) |
| **Performance** | 🟡 Mejorable | 11 RLS con `auth.uid()` no-cacheado, 8 FKs sin índice, policies permissive duplicadas |
| **UX/UI** | 🟢 Buena | Flujos limpios, layouts coherentes, escalera con imágenes funciona, nota de venta scrolleable e imprimible |
| **Accesibilidad** | 🟡 Mejorable | Algunos `<button>` sin `aria-label`, falta foco visible en modales, tablas sin `<caption>` |
| **SEO** | 🟡 Mejorable | Meta tags ok pero falta structured data (JSON-LD), `sitemap.xml` estático, OG images genéricas |
| **Mantenibilidad** | 🟢 Buena | Build verde, lint OK, `logger` centralizado, helpers DRY, separación de capas clara |
| **DevOps** | 🟡 Mejorable | Sin CI/CD, sin tests automáticos, migraciones 012-016 aplicadas via MCP **sin archivo en repo** |

### Top 5 hallazgos críticos

1. **🔴 Migraciones 012–016 sin versionar en repo** (OPS-001) — si recreás el proyecto perdés cleanup de advisor, backport `numero_pedido`, upgrade 5-arg de `finish_approve_afiliacion` y revokes de PUBLIC.
2. **🟡 Leaked password protection desactivada** (SEC-001) — Supabase no chequea passwords contra HaveIBeenPwned. Toggle en dashboard.
3. **🟡 11 policies RLS re-evalúan `auth.uid()` por fila** (PERF-001) — degradación visible cuando la red crezca a miles de filas.
4. **🟡 8 foreign keys sin índice** (PERF-002) — JOINs sobre `comisiones`, `pedidos`, `profiles.patrocinador_id` van a sufrir.
5. **🟡 Policies permissive duplicadas** en `comisiones`, `profiles`, `red_binaria`, `rangos_historia`, `volumenes_binarios` (PERF-003) — overhead innecesario; consolidar.

### Top 5 hallazgos a mediano plazo

6. **🟡 `service_role` key en cliente** (SEC-002) — `supabaseAdmin` usa la service_role key en el frontend (vía `import.meta.env`). Cualquiera con devtools la roba. Migrar a Edge Functions o RPCs.
7. **🟡 Sin tests automáticos** (OPS-002) — todo el QA es manual.
8. **🟡 Sin CI/CD ni linting en pre-push** (OPS-003) — los warnings se descubren después del deploy.
9. **🟡 Nivel binario incorrecto en `red_binaria`** (BIZ-001) — SUMAK-00003 tiene `nivel=2` cuando debería ser 3 (bug histórico de cuando se aprobó).
10. **🟡 `Productos/` ignorado en .gitignore pero existe como página pública** (COD-001) — confusión semántica.

---

## 2. Cambios desde la auditoría previa

La auditoría anterior cubrió migraciones 001→005. Hoy estamos en 018 con **muchísimo terreno cubierto**. Resumen de qué se resolvió:

| Hallazgo previo | Estado | Migración / commit |
|---|---|---|
| Sin idempotencia en `submit_pedido` | ✅ Resuelto | Mig 006 (`idempotency_key` + RPC) |
| Crear pedido + recalcular puntos client-side | ✅ Resuelto | Mig 006 RPC server-side |
| `cancel_pedido` sin reversión de comisiones | ✅ Resuelto | Mig 006 (RPC atómica) |
| Sin rol intermedio entre admin y distribuidor | ✅ Resuelto | Mig 007 (rol `operaciones`) |
| Vouchers de pago de comisión no se mostraban al beneficiario | ✅ Resuelto | Mig 010 + UI |
| Imposible reportar problema con un pedido enviado | ✅ Resuelto | Mig 011 (`report_pedido_issue` + `mark_pedido_entregado`) |
| Pedido entregado seguía editable | ✅ Resuelto | Mig 011 (`trg_pedidos_lock_entregado`) |
| `finish_approve_afiliacion` callable por cualquier `authenticated` | ✅ Resuelto | Mig 011 wrapper `approve_afiliacion` + revoke |
| Pack requería llenar EXACTAMENTE el cupo | ✅ Resuelto | Margen $3 + lockedResidual |
| Comisiones y bono afiliación mezclados | ✅ Resuelto | Scope `'afiliacion' / 'no-afiliacion'` |
| Pago de comisiones batch sin trazabilidad por fila | ✅ Resuelto | Botón "Pagar" por fila |
| `submit_pedido` reventaba por safeupdate | ✅ Resuelto | Mig 017 (`truncate` en vez de `delete`) |
| MiRed mostraba "no estás en la red" con referidos | ✅ Resuelto | Mig 018 (recursión RLS) + frontend robusto |

**14 hallazgos previos resueltos en la última iteración.** Excelente trazabilidad.

---

## 3. Inventario del estado actual

### Páginas y rutas

```
PUBLIC (/, /nosotros, /productos, /productos/:slug, /oportunidad,
        /plan-multinivel, /escaleras, /contacto, /registro, /login,
        /manual, /packs/:slug)

DISTRIBUIDOR (/dashboard/*)
  ├─ Mi Panel (Overview)
  ├─ Tienda → Producto / Pack
  ├─ Mi Carrito → Checkout (NuevoPedido)
  ├─ Mis Pedidos (incluye recepción + reporte de incidencia)
  ├─ Mi Red (árbol binario propio)
  ├─ Mi Escalera (rangos + bonos)
  ├─ Comisiones (nivel + binaria, sin afiliación)
  ├─ Bono Afiliación (solo tipo='afiliacion')
  └─ Mi Perfil

ADMIN (/admin/*)
  ├─ Dashboard
  ├─ Solicitudes → Detalle (aprobar/rechazar con posición binaria)
  ├─ Distribuidores → Detalle (suspender/activar)
  ├─ Comisiones (otros, sin afiliación)
  ├─ Bono Afiliación (otros, solo afiliación)
  ├─ Mis Comisiones (propias, sin afiliación)
  ├─ Mi Bono Afiliación (propio, solo afiliación)
  ├─ Pedidos (cambiar estado, voucher envío, cancelar)
  ├─ Red Binaria (multi-leg con admin como root)
  └─ Escalera del Éxito (con distribuidores por rango)

OPERACIONES (/operaciones/*)
  ├─ Dashboard (KPIs reducidos)
  ├─ Comisiones (pagar uno a uno, sin afiliación)
  ├─ Bono Afiliación (pagar uno a uno, solo afiliación)
  ├─ Pedidos (procesar, voucher envío — sin cancelar)
  ├─ Distribuidores → Detalle (solo lectura)
  ├─ Red Binaria (lectura)
  └─ Escalera del Éxito (lectura)
```

### Stack y dependencias

```json
"react": "^19.0.1",
"react-dom": "^19.0.1",
"react-router-dom": "^7.15.1",
"motion": "^12.23.24",
"@supabase/supabase-js": "^2.106.2",
"lucide-react": "^0.546.0",
"vite": "^6.2.3",
"tailwindcss": "^4.1.14"
```

Sin dependencias críticamente desactualizadas. **Excelente higiene**.

### Migraciones aplicadas

| Mig | Descripción | En repo |
|---|---|---|
| 001 | Schema inicial | ✅ |
| 002 | Store, binary, monthly activation | ✅ |
| 003 | Reset data keep admin | ✅ |
| 004 / 004b | Checkout voucher + bucket fix | ✅ |
| 005 | Voucher numero pedido | ✅ |
| 006 | Security integrity phase 1 (RPCs atómicas) | ✅ |
| 007 / 007b | Rol operaciones + seed | ✅ |
| 007 (frontales) | Frontales para todos | ✅ |
| 008 | Aprobación con frontal (5-arg) | ✅ |
| 009 | Bucket constraints | ✅ |
| 010 | Voucher pago de comisión y envío | ✅ |
| 011 | Scope operaciones + estados pedido | ✅ |
| **012** | Advisor cleanup | ❌ **Sin archivo** |
| **013** | Backport numero_pedido | ❌ **Sin archivo** |
| **014** | Backport 5-arg approve | ❌ **Sin archivo** |
| **015** | Revoke PUBLIC en admin RPCs | ❌ **Sin archivo** |
| **016** | Hide is_admin de anon | ❌ **Sin archivo** |
| 017 | Fix safeupdate truncate | ✅ |
| 018 | Fix recursión RLS red_binaria | ✅ |

**Acción crítica**: las migraciones 012–016 fueron aplicadas vía MCP pero nunca guardadas como archivos en `supabase/migrations/`. Si alguien clona y aplica desde cero, el sistema termina en un estado distinto al actual. Ver [OPS-001](#ops-001).

---

## 4. Fortalezas detectadas

Esta plataforma ya tiene cosas muy bien hechas. Reconocerlas antes de los hallazgos:

### Arquitectura

- **Separación de roles a 3 niveles** (`distribuidor`, `operaciones`, `admin`) con scopes claros y gates tanto en RLS como en UI.
- **Helper `useAdminBasePath`** permite reusar componentes entre `/admin/*` y `/operaciones/*` sin código duplicado. Patrón limpio.
- **RPCs atómicas con `idempotency_key`** en `submit_pedido` — no se duplican pedidos por doble-click ni network retries.
- **Trigger de inmutabilidad** (`pedidos_lock_entregado`) garantiza que ventas cerradas no se pueden tocar nunca más. Diseño correcto para integridad contable.
- **Wrapper `approve_afiliacion`** con gate admin-only que detecta dinámicamente la firma 4-arg o 5-arg de `finish_approve_afiliacion`. Patrón robusto contra DB en estados parciales.
- **`TRUNCATE` en vez de `DELETE FROM`** para tablas temporales — evita el bloqueo de la extensión `safeupdate` de Supabase.

### Frontend

- **Code-splitting por ruta** con `lazy()` en cada página. Bundle inicial liviano.
- **Auto-reload silencioso en `ChunkLoadError`** tras deploy (commit `23cc5fd`) — UX excelente.
- **`logger` centralizado** en lugar de `console.log` esparcidos. Facilita observability futuro.
- **`CartProvider` con localStorage** persistente entre sesiones.
- **`StaircaseVisual` autoresuelve premios** (label → imagen + icono fallback). Centralización limpia.
- **`PackBuilder` con `RESIDUAL_MARGIN_USD`** configurable. Buena separación de constante de negocio.
- **`getPrecioDistribuidor()` centralizado** — un solo lugar maneja el descuento del 50% y los overrides.
- **`autoResolvePrize()` en `StaircaseVisual`** — los call sites solo pasan `{ label }` y el componente resuelve.

### Datos / DB

- **Buckets de storage con RLS por carpeta**: `comisiones-vouchers/<comisionId>/` y `pedidos-envios/<pedidoId>/` — patrón correcto para que cada beneficiario vea solo lo suyo.
- **Buckets con `file_size_limit` y `allowed_mime_types`** — defensa básica contra abuso (mig 009).
- **`search_path = public`** fijado en todas las funciones recientes — previene attack via schema hijack.
- **Índice único parcial** en `(padre_id, posicion)` que admite N frontales bajo admin y nodos no-admin (con flag `abrir_como_frontal`).

### Operaciones / DX

- **Build OK siempre verificado** antes de commits — no se rompe `main`.
- **Commits con `Co-Authored-By`** — trazabilidad humana clara.
- **`.gitignore` cuida assets de trabajo** (`/img/`, `/Productos/`) sin filtrar `public/img/`.

---

## 5. Hallazgos — Seguridad (SEC)

### SEC-001 · 🔴 Service role key expuesto en frontend
**Archivo:** `src/lib/supabase.ts`
**Severidad:** Alta

El cliente `supabaseAdmin` usa el `SUPABASE_SERVICE_ROLE_KEY` (vía `import.meta.env`) que se incluye en el bundle servido al browser. Cualquier persona con devtools puede extraerlo y **bypassear todas las RLS de la DB**.

Lugares donde se usa actualmente: `AdminComisiones`, `AdminPedidos`, `AdminMisComisiones`, `Distribuidores`, `DistribuidorDetalle`, `SolicitudDetalle`, `AdminRed`, `AdminEscalera`, `AdminDashboard`, `Solicitudes`.

**Riesgo:**
- Exfiltración de toda la base de datos
- Modificación arbitraria de pedidos, comisiones, profiles
- Toma de control de cuentas (puede UPDATE en `auth.users`)

**Solución sugerida:**
1. **Migrar a RPCs SECURITY DEFINER** que validen `is_admin()` o `is_operaciones_or_admin()` internamente. Ya está hecho parcialmente (cancel_pedido, approve_afiliacion, mark_pedido_entregado).
2. **Edge Functions** para operaciones que requieran service role (ej. `auth.admin.createUser` en `SolicitudDetalle`).
3. **Refactorizar admin a usar `supabase` (no `supabaseAdmin`)** — la RLS ya está suficientemente permisiva para que admin haga lo que necesita.
4. **Eliminar `import.meta.env.VITE_SUPABASE_SERVICE_ROLE`** del frontend.

**Esfuerzo:** Alto (afecta ~15 archivos). **Prioridad:** Alta.

### SEC-002 · 🟡 Leaked password protection desactivada
**Severidad:** Media

Supabase Auth no chequea passwords contra HaveIBeenPwned al registrarse. Un distribuidor podría poner "123456" o passwords del leak Collection #1.

**Solución:** Dashboard Supabase → Auth → Password Strength → activar "Check passwords against HaveIBeenPwned". 30 segundos de trabajo.

### SEC-003 · 🟡 `lookup_sponsor` callable por anon
**Severidad:** Media

Como decisión de producto el form público de registro necesita validar el código de patrocinador antes de enviar la solicitud. Eso requiere acceso anónimo a `lookup_sponsor`. **Es un trade-off conocido**, pero:

- **Riesgo:** un atacante puede enumerar todos los `SUMAK-#####` válidos haciendo bruteforce. Permite mapear distribuidores activos.

**Mitigación:**
- Agregar **rate limiting** (Cloudflare WAF, Supabase rate limits) al endpoint.
- Devolver un response genérico (sin distinguir entre código inválido y código válido pero suspendido).
- Considerar **CAPTCHA** en el form de registro antes de validar el código.

### SEC-004 · 🟡 RLS policy `Public can insert afiliaciones`
**Severidad:** Media

`with_check (true)` en INSERT sobre `afiliaciones`. Es **necesario** porque el form de registro es público. Pero genera el WARN del advisor.

**Mitigación:**
- **CAPTCHA / Turnstile** en el form (ya hay infra parcial mencionada en commits SEC-007).
- **Rate limit por IP** en el endpoint.
- **Validación de tamaños** server-side (cédula 10 chars, teléfono regex) — ya está parcial.
- Considerar **honeypot field** invisible para bots.

### SEC-005 · 🟡 Archivos sensibles no encriptados en buckets
**Severidad:** Baja-Media

Los vouchers, cédulas, planillas se guardan en buckets `documentos-afiliacion`, `pedidos-vouchers`, `comisiones-vouchers` con RLS por carpeta. Eso protege el acceso, pero **el contenido va al disco en plain image/PDF**.

**Mitigación opcional (depende de exigencias legales en Ecuador):**
- Encryption at rest en bucket (Supabase ya lo hace por default).
- Watermark dinámico en imágenes con el ID del distribuidor que las ve (anti-screenshot leak).

### SEC-006 · 🟢 Search path fijado en todas las funciones SECURITY DEFINER
Confirmado en la mig 012. Defensa contra schema hijack. **Buena**.

### SEC-007 · 🟢 `idempotency_key` en `submit_pedido`
Pedidos no se duplican por doble-click o network retry. **Buena**.

### SEC-008 · 🟢 `pedidos_lock_entregado` trigger
Una vez entregado, ni admin puede tocar el pedido. **Garantía contable correcta**.

---

## 6. Hallazgos — Integridad y lógica de negocio (BIZ)

### BIZ-001 · 🟡 Nivel binario incorrecto en `red_binaria`
**Severidad:** Media

Detectado durante el debug de Mi Red:

```
SUMAK-00002 (Robinson) nivel 2 → su hijo SUMAK-00003 (test) nivel 2 (debería ser 3)
                                  → nieto SUMAK-00005 nivel 3 (correcto)
```

El nodo `test` quedó con `nivel = 2` cuando debería ser `nivel = 3`. Se calcula como `coalesce(v_padre_nivel, 0) + 1` en `finish_approve_afiliacion`. El bug ocurrió cuando `v_padre_nivel` se leyó como `null` o cuando se aprobó con una versión anterior de la función.

**Impacto:** las queries de "Niveles activos" para el tramo 2 pueden contar mal el alcance de la red.

**Solución:**
```sql
-- Recalcula niveles iterativamente desde la raíz
with recursive jerarquia as (
  select id, distribuidor_id, padre_id, 1 as nivel_real
    from public.red_binaria where padre_id is null
  union all
  select r.id, r.distribuidor_id, r.padre_id, j.nivel_real + 1
    from public.red_binaria r join jerarquia j on r.padre_id = j.id
)
update public.red_binaria r
   set nivel = j.nivel_real
  from jerarquia j
 where r.id = j.id and r.nivel <> j.nivel_real;
```

### BIZ-002 · 🟡 Sin validación de activación mensual antes de generar comisiones
**Severidad:** Media

La regla del plan multinivel es: "el upline debe tener al menos un pedido entregado ≥ $100 en el mes para recibir comisiones de nivel".

En `finish_approve_afiliacion` y `submit_pedido` se valida correctamente con `v_eligible_upline`. **Bien**. Pero:

- Si un upline pasa de activo a inactivo a mitad de mes, las comisiones de nivel **ya generadas** no se revierten automáticamente.
- Tampoco existe un job mensual que valide la cobertura completa.

**Sugerencia:**
- Cron mensual (vía `pg_cron` en Supabase) el día 1 del mes que revalide comisiones del mes anterior.
- Mostrar al distribuidor "comisiones en riesgo de no cobrarse si no activás" en el dashboard.

### BIZ-003 · 🟢 Reversión de pedido cancelado
Confirmado en `cancel_pedido`: revierte puntos, cancela comisiones del pedido por `pedido_id` (no por ventana de tiempo). **Correcto**.

### BIZ-004 · 🟡 Sin cálculo de volumen binario pareado
**Severidad:** Media-Alta

La tabla `volumenes_binarios` existe (`volumen_izquierda`, `volumen_derecha`, `volumen_pareado`, `comision_calculada`, `procesado`). Pero **no hay job que la pueble**. Las comisiones binarias del 50% nunca se generan automáticamente.

**Solución:**
- Cron mensual que:
  1. Calcule volumen izq/der para cada distribuidor (suma de pedidos válidos en cada pierna).
  2. Tome el `MIN(izq, der) * 0.5` como comisión binaria.
  3. Genere row en `comisiones` con `tipo='binaria'`.
  4. Acumule el sobrante (lado fuerte) para el mes siguiente (carryover).

Este es **el feature más crítico no implementado** del plan multinivel.

### BIZ-005 · 🟡 Falta de "ramping" para distribuidores nuevos
**Severidad:** Baja

Cuando un distribuidor se afilia hoy, recibe comisiones de nivel desde el día 1 si su patrocinador califica. No hay ventana de protección para evitar abuse (afiliar gente fake para activar y desactivar la red).

**Sugerencia opcional:** período de "ramping" de 30 días donde las comisiones se acumulan pero se liberan al confirmar continuidad.

### BIZ-006 · 🟢 Bono afiliación 40% al patrocinador
Confirmado en `finish_approve_afiliacion`: se calcula sobre el precio del paquete. Se vinculan a `pedido_id` para reversión limpia. **Buena**.

### BIZ-007 · 🟡 Tienda mezcla precio distribuidor con PVP en pedido_items
**Severidad:** Baja

Cuando el distribuidor hace un pedido desde Tienda, el `precio_unitario` se guarda como precio distribuidor (PVP × 50% o `precioDistribuidor`). Si en el futuro un distribuidor venda a su cliente final, no hay un segundo flujo "venta retail" con PVP.

**Sugerencia:** modelar `tipo_precio` en `pedido_items` (no solo en `pedidos`) para soportar ventas mixtas.

---

## 7. Hallazgos — Arquitectura y backend (ARQ)

### ARQ-001 · 🟢 RPCs server-side reemplazaron lógica cliente
`submit_pedido`, `cancel_pedido`, `approve_afiliacion`, `mark_pedido_entregado`, `report_pedido_issue`. **Buena**.

### ARQ-002 · 🟡 RLS de `red_binaria` ahora es "lectura abierta"
**Severidad:** Baja

Para resolver la recursión infinita (mig 018) se eliminó la policy granular "Lectura de la red" y quedó solo `authenticated_read_red using (true)`. **Cualquier autenticado ve toda la red binaria**.

**Riesgo:** un distribuidor curioso puede mapear toda la red de SUMAK con `select * from red_binaria`.

**Solución a mediano plazo:**
- RPC `get_my_subtree()` SECURITY DEFINER que devuelva solo el subtree del caller.
- Revocar el SELECT directo y obligar a usar la RPC.

### ARQ-003 · 🟡 `supabaseAdmin` proliferación
Ver [SEC-001](#sec-001). 15+ archivos usan el cliente con service role. Refactor grande pero necesario.

### ARQ-004 · 🟢 Wrapper `approve_afiliacion` con detección dinámica
Maneja 4-arg y 5-arg de `finish_approve_afiliacion` sin romper. **Pattern correcto** para DBs legacy.

### ARQ-005 · 🟡 Tabla `volumenes_binarios` sin uso real
Definida pero nunca poblada. Ver [BIZ-004](#biz-004). **Acción requerida**: cron + RPC.

### ARQ-006 · 🟡 Sin Edge Functions
Supabase soporta Edge Functions para lógica server-side custom (envío de emails, integraciones externas, webhooks). Hoy no se usan.

**Casos de uso obvios:**
- Email transaccional al aprobar afiliación (con credenciales)
- WhatsApp notification al recibir pedido / al pagar comisión
- Webhook para Pichincha / Pacífico al confirmar voucher

### ARQ-007 · 🟢 Migración 011 con trigger de inmutabilidad
Pedidos entregados no se modifican, ni con admin. **Garantía correcta**.

### ARQ-008 · 🔴 Migraciones 012–016 sin archivos
Ver [OPS-001](#ops-001). **Crítico** para reproducibilidad.

---

## 8. Hallazgos — Performance (PERF)

### PERF-001 · 🟡 11 policies RLS re-evalúan `auth.uid()` por fila
**Severidad:** Media

Advisor identifica:

| Tabla | Policy |
|---|---|
| `pedido_items` | Users can read own items, Users can insert items |
| `volumenes_binarios` | Users can read own volumenes |
| `rangos_historia` | Users can read own rangos |
| `red_binaria` | admin_write_red |
| `pedidos` | Distribuidor lee sus pedidos, ops/admin todos / Distribuidor inserta sus pedidos |
| `comisiones` | Beneficiario lee sus comisiones, ops/admin todas |
| `profiles` | Lectura de profiles / Actualización de profiles |

**Solución (patrón Supabase oficial):** envolver `auth.uid()` en un SELECT inicial:

```sql
-- Antes (mal)
distribuidor_id = auth.uid()

-- Después (bien)
distribuidor_id = (select auth.uid())
```

Postgres cachea el resultado del SELECT por query, así no se evalúa por fila. Mejora **hasta 10x** en tablas grandes.

### PERF-002 · 🟡 8 FKs sin índice
**Severidad:** Media

| Tabla | FK |
|---|---|
| `comisiones` | `beneficiario_id`, `origen_id`, `pagado_por` |
| `pedido_items` | `pedido_id` |
| `pedidos` | `distribuidor_id`, `enviado_por` |
| `profiles` | `patrocinador_id` |
| `rangos_historia` | `distribuidor_id` |

Cada uno genera seq-scan en queries con JOIN. Solución:

```sql
create index if not exists idx_comisiones_beneficiario on public.comisiones (beneficiario_id);
create index if not exists idx_comisiones_origen on public.comisiones (origen_id);
create index if not exists idx_comisiones_pagado_por on public.comisiones (pagado_por);
create index if not exists idx_pedido_items_pedido on public.pedido_items (pedido_id);
create index if not exists idx_pedidos_distribuidor on public.pedidos (distribuidor_id);
create index if not exists idx_pedidos_enviado_por on public.pedidos (enviado_por);
create index if not exists idx_profiles_patrocinador on public.profiles (patrocinador_id);
create index if not exists idx_rangos_historia_distribuidor on public.rangos_historia (distribuidor_id);
```

### PERF-003 · 🟡 Policies permissive duplicadas
**Severidad:** Baja-Media

Tablas afectadas: `comisiones`, `profiles`, `red_binaria`, `rangos_historia`, `volumenes_binarios`.

Ejemplo: `red_binaria` tiene `{"Admin administra red", admin_write_red, authenticated_read_red}` para SELECT. Las tres se evalúan por cada query.

**Solución:**
- Consolidar en una sola policy por (rol, action).
- Eliminar `admin_write_red` y `Admins can manage X` que se solapan con `Admin administra X`.

### PERF-004 · 🟡 Indexes duplicados en `volumenes_binarios`
`volumenes_binarios_distribuidor_id_mes_key` y `volumenes_binarios_distribuidor_mes_unique` son idénticos. **Drop uno**.

### PERF-005 · 🟡 Indexes nunca usados
- `idx_comisiones_pedido` en `comisiones`
- `pedidos_pendiente_pago_expira_idx` en `pedidos`

Si no se usan después de unos meses en producción, dropearlos libera escritura.

### PERF-006 · 🟢 Code-splitting por ruta
Cada page se descarga on-demand. Bundle inicial ~280KB gzip, vendor splits separados. **Buena**.

### PERF-007 · 🟡 Queries N+1 en `MisComisiones`
**Severidad:** Baja

Resuelto en su mayoría (commit menciona PERF-004 con join al origen), pero `MiRed` y `AdminRed` todavía hacen `select * from profiles where id in (...distIds)` después de cargar red_binaria. Para redes de 5000+ distribuidores esto va a ser lento.

**Solución:** `select red_binaria.*, profiles!distribuidor_id(...)` con join único.

### PERF-008 · 🟡 `MiRed` limit 5000
Si la red crece a > 5000, vuelve el bug original. Sugerencia: hacer un SQL recursivo con `WITH RECURSIVE` que solo devuelva el subtree del caller.

---

## 9. Hallazgos — UX y diseño (UX)

### UX-001 · 🟢 Flujo de pedido y recepción cerrado
Distribuidor compra → admin/ops sube voucher al enviar → distribuidor confirma recepción / reporta incidencia. **Flujo completo y trazable**. Buena.

### UX-002 · 🟢 Nota de venta imprimible y scrolleable
Resuelto en commit `05cae81`. Admin, operaciones y distribuidor pueden ver y exportar como PDF. **Buena**.

### UX-003 · 🟡 Sin notificaciones in-app
**Severidad:** Media

Hoy el distribuidor no sabe que su comisión fue pagada hasta que entra a Mis Comisiones y mira. Lo mismo con pedido enviado / incidencia respondida.

**Sugerencia:**
- Tabla `notificaciones (id, user_id, tipo, payload, leida, created_at)`.
- Badge en el sidebar con contador.
- Realtime via Supabase Realtime para push-style.

### UX-004 · 🟡 Sin búsqueda global
**Severidad:** Baja

Ningún input "Buscar..." que cruce tablas. Útil cuando admin quiere encontrar un pedido por código de distribuidor sin saber dónde está.

### UX-005 · 🟢 Pack builder con feedback continuo
Barra de progreso $X / $Y, mensajes diferenciados (exacto / residuo permitido), botón disabled si falta llenar. **UX correcta**.

### UX-006 · 🟢 Escalera con imágenes
Migración de iconos a imágenes reales (carro, casa, cocina, etc.) en commits `34fb656` y `5d04a58`. **Buena**.

### UX-007 · 🟡 Falta exportar reportes
**Severidad:** Media

Admin no puede exportar comisiones, pedidos, distribuidores a CSV/Excel para análisis externo o contabilidad. Limitación grave para escalar.

**Solución:** botón "Exportar a CSV" en cada listado admin.

### UX-008 · 🟡 Mobile: tablas con overflow horizontal
Casi todas las tablas en admin tienen `overflow-x-auto`. En mobile el scroll horizontal es incómodo. **Sugerencia:** cards expandibles en mobile (patrón ya usado en MiRed).

### UX-009 · 🟢 Toasts y modales coherentes
`useToast`, `Modal`, confirmaciones inline. **Buena**.

### UX-010 · 🟡 No hay confirmación de éxito al pagar una comisión
Después del modal de pago, el toast aparece pero la tabla recarga toda. Sería mejor highlight de la fila pagada por 2s.

---

## 10. Hallazgos — Accesibilidad (A11Y)

### A11Y-001 · 🟡 Botones sin `aria-label`
**Severidad:** Media

Buscar en el código: `<button onClick=...><X size={20} /></button>` aparece varias veces (cerrar modales). Lectores de pantalla anuncian "botón" sin descripción.

**Solución:** agregar `aria-label="Cerrar"` o similar a todos los botones que solo tienen icono.

### A11Y-002 · 🟡 Foco no visible en links después de click
Tailwind v4 a veces remueve el outline. Verificar que `focus-visible:ring-2` esté presente en todos los interactivos.

### A11Y-003 · 🟡 Tablas sin `<caption>` ni `scope`
Las tablas admin no declaran qué describen para asistive tech. Agregar `<caption className="sr-only">Listado de pedidos</caption>` y `<th scope="col">`.

### A11Y-004 · 🟡 Color como único señalador
Badges de estado (`pendiente` amarillo, `pagado` verde, `cancelado` rojo) son solo color + label. Para daltónicos, agregar icono junto al label. **Parcialmente OK** porque algunas badges ya tienen icono.

### A11Y-005 · 🟢 SkipNav / landmarks
`<main>`, `<nav>`, `<aside>` están usados correctamente.

### A11Y-006 · 🟡 Sin idioma declarado
`<html lang="es">` confirmado en `index.html`. **Buena**.

### A11Y-007 · 🟡 Modal de pago sin trap focus
Cuando el modal de pago de comisión abre, el foco no queda atrapado dentro. Tab puede salir al fondo.

**Solución:** usar `react-focus-lock` o lógica de trap manual en `Modal.tsx`.

---

## 11. Hallazgos — SEO y marketing (SEO)

### SEO-001 · 🟢 Meta tags básicos OK
`useSEO()` hook con title, description, OG, canonical. **Buena**.

### SEO-002 · 🟡 Falta JSON-LD structured data
**Severidad:** Media

`Productos` y `ProductDetail` no exponen `Schema.org/Product` para que Google los muestre como rich snippets (precio, disponibilidad, rating).

**Sugerencia:** agregar `<script type="application/ld+json">` con:
- `Organization` en `Home`
- `Product` con `Offer` en `ProductDetail`
- `FAQPage` en `Oportunidad` si tiene secciones de FAQ
- `BreadcrumbList` en páginas internas

### SEO-003 · 🟡 Sitemap estático
`public/sitemap.xml` no se regenera dinámicamente. Si agregás un producto nuevo, no aparece.

**Sugerencia:** generar en build-time desde `data.ts` con un pre-build script Vite.

### SEO-004 · 🟡 OG images genéricas
No vi una `og:image` por producto. Si compartís un link en WhatsApp, sale el logo Sumak genérico.

**Sugerencia:** generar OG image por producto en build-time (puppeteer/satori) o usar la imagen del producto directamente.

### SEO-005 · 🟢 `robots.txt` presente
Confirmado. Bloquea el panel privado del crawler.

### SEO-006 · 🟡 No hay analytics
No vi Google Analytics, Plausible, ni similar en `index.html`. Sin métricas de tráfico, conversión, embudo.

**Sugerencia:** integrar Plausible (privacy-friendly) o GA4 con consent banner.

### SEO-007 · 🟡 Mobile-friendly check pendiente
La página renderiza bien en mobile (responsive Tailwind), pero falta confirmar Core Web Vitals (LCP, INP, CLS) con Lighthouse en producción.

---

## 12. Hallazgos — Código y mantenibilidad (COD)

### COD-001 · 🟢 `lib/badges.ts` como catálogo central
Estados y labels centralizados después del PR de Tanda 5. **Buena**.

### COD-002 · 🟡 Algunos archivos > 800 líneas
- `AdminPedidos.tsx` ~970 líneas
- `AdminComisiones.tsx` ~990 líneas
- `AdminMisComisiones.tsx` ~530 líneas
- `AdminRed.tsx` ~680 líneas

Refactor sugerido: extraer `DetalleModal`, `PaymentModal`, `EnvioModal` en archivos propios.

### COD-003 · 🟡 Tipo `any` ocasional
`Record<string, unknown>` en queries de Supabase. Es necesario por la naturaleza dinámica del query builder, pero **agregar `// FIXME: typing`** ayudaría a no perderlo.

### COD-004 · 🟢 `logger` centralizado
`src/lib/logger.ts` reemplaza `console.log` esparcidos. **Buena**.

### COD-005 · 🟡 `Productos/` ignorado pero el componente Productos existe
**Severidad:** Baja

`.gitignore` tiene `/Productos/` (mayúscula) — supuestamente material corporativo. Pero React tiene `src/pages/Productos.tsx`. Confunde semánticamente. **Renombrar** la carpeta ignorada a `material-corporativo/` o similar.

### COD-006 · 🟡 No hay `tsconfig.strict` confirmado
El build verifica con `tsc --noEmit`, pero no vi `"strict": true` explícito en el output. Buena práctica para detectar nulls / unused.

### COD-007 · 🟢 Modules separados por capa
`lib/`, `components/`, `pages/`, `data.ts` — separación clara.

### COD-008 · 🟡 Comentarios "Tanda X" sin contexto fuera del repo
Commits mencionan "Tanda 5", "Tanda 6", "Tanda 7" sin documentar en algún `CHANGELOG.md`. Nuevos contribuidores no saben qué es cada tanda.

**Solución:** mantener `CHANGELOG.md` o adoptar conventional commits.

### COD-009 · 🟢 Helper `useAdminBasePath`
Permite reusar componentes admin entre `/admin/*` y `/operaciones/*` sin duplicar código. **Pattern correcto**.

### COD-010 · 🟡 Algunos `useEffect` sin cleanup
En particular suscripciones a Realtime (no las hay aún, pero cuando se agreguen) deben tener `return () => sub.unsubscribe()`.

---

## 13. Hallazgos — Operaciones y DevOps (OPS)

### OPS-001 · 🔴 Migraciones 012–016 sin versionar
**Severidad:** Alta

Aplicadas vía MCP pero los archivos `.sql` no están en `supabase/migrations/`. Si:
- Alguien clona el repo y aplica desde 001
- El proyecto Supabase se pierde / migra
- Querés tener un staging con el mismo schema

→ no podés reproducir el estado.

**Solución inmediata:** generar los 5 archivos con el contenido aplicado. Tengo los SQL en mis logs de conversación si los necesitás.

### OPS-002 · 🔴 Sin tests automáticos
**Severidad:** Alta a mediano plazo

Ni unit tests (Vitest), ni e2e (Playwright). Cada feature se testea manualmente. Para una plataforma con dinero involucrado (comisiones, pedidos, bonos) esto es riesgoso.

**Plan sugerido:**
1. **Vitest** + React Testing Library para componentes críticos: `PackBuilder`, `NotaVenta`, `Cart`.
2. **Playwright** para flujos: registro, login, hacer pedido, marcar entregado, pagar comisión.
3. **pgTAP** para las RPCs SQL (cancel_pedido, submit_pedido).

### OPS-003 · 🟡 Sin CI/CD
**Severidad:** Media

No vi `.github/workflows/`. El build se valida localmente antes del push. Funciona pero no escala.

**Sugerencia:**
```yaml
# .github/workflows/ci.yml
- npm ci
- npm run lint
- npm run build
- npm test (cuando existan)
```

### OPS-004 · 🟡 Deploy a Vercel sin preview environments
Cada push a `main` va directo a producción. Sin staging para QA. **Sugerencia:** branch `staging` con deploy a un subdominio.

### OPS-005 · 🟡 Sin observability / monitoring
No hay Sentry, LogRocket, ni similar. Si un usuario reporta "se rompió", no podés ver el stack trace.

**Sugerencia:** integrar Sentry (free tier alcanza para volumen actual).

### OPS-006 · 🟡 Sin backup explícito de Supabase
Supabase hace backups automáticos en el tier paid, pero la frecuencia depende del plan. Verificar.

### OPS-007 · 🟢 `vercel.json` cuida cache de `index.html`
Cuida que el index nunca quede cacheado vieja → siempre sirve la última versión. **Buena**.

### OPS-008 · 🟡 Sin documentación de runbook
Si entra un nuevo dev, ¿cómo se setea el ambiente local? No vi `CONTRIBUTING.md` ni similar.

### OPS-009 · 🟡 `.env.example` faltante
Para que otro dev sepa qué variables esperar. Confirmar.

---

## 14. Nuevas funcionalidades propuestas

Más allá de fixing, sugerencias para hacer crecer la plataforma:

### Tier 1 — Alto impacto, esfuerzo moderado

#### F-001 · Notificaciones in-app
- Tabla `notificaciones` + componente badge en sidebar.
- Triggers automáticos: comisión pagada, pedido enviado, incidencia respondida, nueva afiliación bajo tu red, rango alcanzado.
- Realtime con Supabase channels.
- **Valor:** distribuidores siempre saben qué pasa con su negocio sin tener que entrar manualmente.

#### F-002 · Cálculo de comisión binaria automático
- Cron mensual (pg_cron) que calcule volumen pareado.
- Genera fila en `comisiones` con `tipo='binaria'`.
- Carryover del lado fuerte para el mes siguiente.
- **Valor:** completar el plan multinivel. Hoy las comisiones binarias no se generan nunca.

#### F-003 · Reportes exportables (CSV / Excel)
- Botón "Exportar" en cada tabla admin (Pedidos, Comisiones, Distribuidores).
- Filtros aplicados → CSV con encoding UTF-8 BOM (para Excel ES).
- **Valor:** contabilidad puede operar sin pedirte exports a mano.

#### F-004 · Email transaccional
- Edge Function que dispara emails en eventos clave:
  - Aprobación de afiliación (con credenciales temporales)
  - Pedido enviado (con número de guía)
  - Comisión pagada (con voucher adjunto)
- Provider sugerido: Resend o Postmark (ambos tier gratis decente).
- **Valor:** profesionaliza la experiencia. Hoy los distribuidores se enteran adentro de la app.

#### F-005 · Dashboard de distribuidor con metas
- "Te faltan 3 directos para Líder"
- "Estás a $25 de activarte este mes"
- "Tu pierna izquierda tiene 12 puntos más que la derecha — equilibrá"
- **Valor:** gamificación que motiva al distribuidor a moverse.

### Tier 2 — Diferenciadores

#### F-006 · Tienda externa para clientes finales
Hoy la tienda interna es para distribuidores comprando a precio mayorista. Sumar una tienda con PVP para que cada distribuidor tenga **su propio link** de venta retail (ej. `sumakecuador.lat/r/SUMAK-00002`). Las ventas:
- Se asignan al distribuidor del link
- Generan puntos en su mes
- Le cuentan para activación
- Suman al volumen binario de su pierna

**Valor:** transforma cada distribuidor en una microsucursal. Big driver de adopción.

#### F-007 · App móvil (PWA o React Native)
Una PWA con `manifest.json` + service worker es suficiente para que se instale en home screen Android/iOS.

**Valor:** experiencia "app" sin App Store. Notifications push nativas.

#### F-008 · Sistema de capacitaciones in-app
- Videos (YouTube embed o Mux.com).
- Marcar "completado" → desbloquear el siguiente.
- Certificado descargable al completar.
- Posiblemente requisito para promover a rangos altos.

**Valor:** profesionaliza al distribuidor antes de venderle al cliente final.

#### F-009 · Chat de soporte interno
- Tabla `tickets` + UI tipo Intercom liviano.
- Distribuidor pregunta → operaciones responde.
- Más estructurado que WhatsApp para auditar.

#### F-010 · Sistema de ranking público
- Top 10 distribuidores del mes (por ventas / reclutamiento).
- Leaderboard en la página pública (con opt-in).
- **Valor:** social proof para reclutar nuevos.

### Tier 3 — Optimizaciones

#### F-011 · Mobile-first dashboard
Refactor de tablas admin para card-view en mobile. Hoy es scroll horizontal incómodo.

#### F-012 · Dark mode
Toggle simple. La paleta verde-negro-dorado se traduce bien.

#### F-013 · Multi-idioma (i18n)
Si Sumak quiere expandirse a otros países LATAM (Colombia, Perú), `react-i18next` para soportar es-EC, es-CO, es-PE con variantes léxicas.

#### F-014 · Integración con WhatsApp Business API
- Envío automático de orden a operaciones.
- Botón "Enviar guía por WA" en pedido enviado.
- Bot básico para FAQ.

#### F-015 · Webhook para conciliación bancaria
- Banco Pichincha tiene API. Si el voucher de pago se acredita realmente, marcar el pedido como "pago confirmado" automáticamente.

---

## 15. Plan de priorización

### Sprint 0 — Críticos (próxima semana)

| ID | Acción | Esfuerzo |
|---|---|---|
| OPS-001 | Versionar migraciones 012–016 en repo | 1h |
| SEC-002 | Activar leaked password protection (toggle dashboard) | 5min |
| BIZ-001 | Recalcular niveles binarios | 30min |
| PERF-002 | Agregar 8 índices en FKs | 30min |

### Sprint 1 — Importantes (próximas 2 semanas)

| ID | Acción | Esfuerzo |
|---|---|---|
| PERF-001 | Refactor de 11 policies RLS a `(select auth.uid())` | 2h |
| PERF-003 | Consolidar policies permissive duplicadas | 2h |
| PERF-004 | Drop index duplicado en volumenes_binarios | 5min |
| OPS-002 | Setup Vitest + 5 tests críticos (PackBuilder, NotaVenta) | 4h |
| OPS-003 | CI básico en GitHub Actions (lint + build) | 1h |
| F-003 | Export CSV de pedidos y comisiones | 4h |
| F-001 | Notificaciones in-app (tabla + badge) | 8h |

### Sprint 2 — Estructurales (próximo mes)

| ID | Acción | Esfuerzo |
|---|---|---|
| SEC-001 | Migrar admin a RPCs / dejar de usar service_role en frontend | 16h |
| ARQ-002 | RPC `get_my_subtree()` + cerrar SELECT directo en red_binaria | 4h |
| F-002 | Cálculo binario mensual con cron | 16h |
| F-004 | Email transaccional con Resend | 6h |
| OPS-005 | Integrar Sentry | 2h |
| UX-008 | Cards en mobile para tablas admin | 8h |

### Sprint 3 — Crecimiento (próximo trimestre)

| F-006 | Tienda retail con link por distribuidor | 24h |
| F-005 | Dashboard con metas / gamificación | 16h |
| F-007 | PWA installable | 8h |
| F-008 | Sistema de capacitaciones | 24h |

---

## 16. Métricas de éxito

Sugerencias de KPIs a trackear:

### Negocio
- **Distribuidores activos** (con pedido ≥ $100 en el mes) → meta: 70%+
- **Tiempo medio de aprobación de afiliación** → meta: < 24h
- **Tiempo medio de envío de pedido** → meta: < 48h
- **% de comisiones pagadas en el mes que se generaron** → meta: 95%+
- **Churn de distribuidores** (% que dejan de comprar) → meta: < 10%/mes

### Plataforma
- **Tasa de error de `submit_pedido`** → meta: < 0.1%
- **Tiempo medio de respuesta de `/dashboard/red`** → meta: < 500ms
- **Uptime de Supabase** → meta: 99.9%
- **Core Web Vitals (LCP/INP/CLS)** → meta: verde en Lighthouse

### Adopción
- **Pedidos hechos vía plataforma** (vs. WhatsApp histórico) → meta: 90%+ en 3 meses
- **Uso de Mi Red** (sesiones por distribuidor/mes) → meta: 4+
- **Tasa de confirmación de recepción** (distribuidor confirma vs. operaciones marca manualmente) → meta: 80%+

---

## 17. Anexos

### A. Top advisor warnings (Supabase)

**Seguridad (11 warnings)**
- `lookup_sponsor` callable por anon — by design (form de registro)
- Funciones SECURITY DEFINER callable por authenticated — by design (validan internamente)
- `Public can insert afiliaciones` `with_check (true)` — by design (form público)
- Leaked password protection desactivada — fix manual en dashboard

**Performance (30+ infos/warnings)**
- 8 FKs sin índice
- 11 policies con `auth.uid()` no cacheado
- 10+ policies permissive duplicadas
- 2 indexes sin uso
- 1 par de indexes duplicados

### B. Mapa de migraciones

```
001 → schema base
002 → store, binary integrity, monthly activation
003 → reset data
004/4b → checkout voucher + bucket
005 → numero_pedido (NO aplicada hasta mig 013)
006 → RPCs atómicas (cancel_pedido, submit_pedido)
007 → frontales para todos
007 → rol operaciones
007b → seed operaciones user
008 → 5-arg approve_afiliacion (NO aplicada hasta mig 014)
009 → bucket constraints
010 → vouchers de pago y envío
011 → scope operaciones + RPCs recepción + trigger inmutabilidad
012 → advisor cleanup [SIN ARCHIVO]
013 → backport numero_pedido [SIN ARCHIVO]
014 → backport 5-arg approve [SIN ARCHIVO]
015 → revoke PUBLIC [SIN ARCHIVO]
016 → hide is_admin de anon [SIN ARCHIVO]
017 → fix safeupdate truncate
018 → fix recursión RLS red_binaria
```

### C. Comandos útiles para verificar

```bash
# Ver advisors de seguridad
# (vía Supabase MCP en Claude Code)

# Lint local
npm run lint

# Build local
npm run build

# Ver migraciones en DB
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;

# Ver policies activas
SELECT tablename, policyname, cmd, qual
  FROM pg_policies WHERE schemaname='public'
  ORDER BY tablename, policyname;
```

### D. Glosario

- **RLS** — Row Level Security, mecanismo de Postgres para filtrar filas por usuario
- **RPC** — Remote Procedure Call, función Postgres expuesta como endpoint REST
- **SECURITY DEFINER** — función Postgres que corre con permisos del dueño, no del caller
- **safeupdate** — extensión Postgres que bloquea DELETE/UPDATE sin WHERE
- **CWV** — Core Web Vitals (LCP, INP, CLS)
- **PWA** — Progressive Web App
- **N+1** — anti-pattern de consultas: 1 query principal + N queries por cada fila del resultado

---

## Cierre

La plataforma está en **buen estado estructural** después de la última iteración. Las decisiones de arquitectura son correctas, hay separación clara de capas, idempotencia en operaciones críticas, y los flujos de negocio principales (pedidos, comisiones, recepción) están cerrados.

**Los hallazgos críticos son operacionales** (migraciones sin versionar, sin tests, sin CI) más que arquitectónicos. Eso es buenas noticias: no requiere reescrituras, solo disciplina.

**Las dos grandes piezas faltantes de producto** son (1) cálculo de comisiones binarias mensuales y (2) notificaciones in-app. Ambas son blockers para que el plan multinivel funcione al 100% en la práctica.

El roadmap a 3 sprints cubre lo urgente, lo importante y lo estructural. Si se ejecuta, Sumak Vida Ecuador queda con una plataforma sólida lista para escalar a 1000+ distribuidores sin reescribir nada.

---

**Documento generado:** 2026-06-13
**Próxima revisión sugerida:** después del Sprint 1 (2 semanas)
**Responsable:** RSD Solutions / equipo Sumak
