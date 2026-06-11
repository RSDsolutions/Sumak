# Tracking de Auditoría — Estado por hallazgo

> Documento vivo. Fuente única de verdad para saber qué se arregló, qué está mitigado y qué falta.
> Referencia completa: [AUDITORIA_SUMAK.md](AUDITORIA_SUMAK.md)
> Notas técnicas Fase 1: [AUDITORIA_FASE1_NOTAS.md](AUDITORIA_FASE1_NOTAS.md)

---

## Reconteo exacto

El resumen ejecutivo de la auditoría decía "74". Recontando por ID:

| Sección | Hallazgos |
|---|---|
| SEC (Seguridad) | 8 (SEC-001…SEC-008) |
| BIZ (Negocio) | 14 (BIZ-001…BIZ-014) |
| ARQ (Arquitectura) | 7 (ARQ-001…ARQ-007) |
| PERF (Performance) | 6 (PERF-001…PERF-006) |
| UX | 15 (UX-001…UX-015) |
| A11Y (Accesibilidad) | 5 (A11Y-001…A11Y-005) |
| SEO | 5 (SEO-001…SEO-005) |
| COD (Código) | 11 (COD-001…COD-011) |
| OPS (DevOps) | 7 (OPS-001…OPS-007) |
| **Total real** | **78** |

Distribución por severidad:

| Nivel | # | IDs |
|---|---|---|
| 🔴 Crítica | 1 | SEC-001 |
| 🟠 Alta | 10 | SEC-002, SEC-003, BIZ-001, BIZ-002, BIZ-009, BIZ-010, ARQ-001, ARQ-002, PERF-001, UX-015 |
| 🟡 Media | 46 | (mayoría) |
| 🟢 Baja | 21 | |

---

## Estado tras Fase 1 + Tanda 2 + Tanda 3 + Tanda 4

| Estado | # | Significado |
|---|---|---|
| ✅ Resuelto | **19** | Código activo aplica el fix; el flujo afectado YA se comporta correctamente |
| 🔄 Mitigado / Infra disponible | **6** | La infraestructura ya existe; adopción completa en próxima tanda |
| ⏳ Pendiente | **53** | Sin trabajo todavía |
| **Total** | **78** | |

### Lo que está ✅ Resuelto

**Fase 1 (BD + cliente, seguridad y negocio):**

| ID | Severidad | Asunto | Cómo se confirmó |
|---|---|---|---|
| SEC-003 | 🟠 Alta | `lookup_sponsor` RPC en Registro | [Registro.tsx:155](src/pages/Registro.tsx#L155) usa RPC; los campos sensibles ya no se leen vía anon |
| SEC-004 | 🟡 Media | Política INSERT del bucket vouchers | Nueva policy "Distribuidores suben vouchers solo a su carpeta" creada en BD |
| SEC-005 | 🟡 Media | Password temporal crypto-random | [SolicitudDetalle.tsx:46](src/pages/admin/SolicitudDetalle.tsx#L46) `generateTempPassword` con `crypto.getRandomValues` |
| BIZ-002 | 🟠 Alta | `pedido_id` en comisiones + cancel exacto | Columna creada; 3 inserts la pueblan; [AdminPedidos.tsx:396](src/pages/admin/AdminPedidos.tsx#L396) filtra por `eq('pedido_id')` |
| BIZ-005 | 🟡 Media | `idempotency_key` activa | [NuevoPedido.tsx:54](src/pages/dashboard/NuevoPedido.tsx#L54); maneja 23505 como éxito |

**Tanda 2 (UX & A11Y, sin tocar BD):**

| ID | Severidad | Asunto | Cómo se confirmó |
|---|---|---|---|
| ARQ-006 | 🟡 Media | ErrorBoundary global con paleta de marca | [main.tsx](src/main.tsx) — UI con LOGO_SUMAK, botones Recargar/Inicio, detalle técnico colapsable |
| UX-001 | 🟡 Media | Confirmación al cancelar pedido | [AdminPedidos.tsx](src/pages/admin/AdminPedidos.tsx) — Modal de confirmación con resumen y motivo |
| UX-004 | 🟡 Media | Sanitizar mensajes técnicos | NuevoPedido ya no menciona "migración 004b"; detalle a `console.error` |
| UX-005 | 🟢 Baja | ProtectedRoute con colores de marca | `#1A4E26` sobre `#F4F7F5` (antes `#00A86B` sobre `#0F0F0F`) |
| UX-010 | 🟡 Media | Toast al añadir al carrito | `ToastProvider` in-house; Tienda y TiendaProducto disparan `toast.success` |
| UX-013 | 🟢 Baja | Empty state con CTAs | Overview muestra "Ver mi código" / "Ver mi red" cuando no hay comisiones |
| A11Y-002 | 🟡 Media | Focus ring global visible | [index.css](src/index.css) `@layer base { :focus-visible {...} }` con `box-shadow` para no chocar con `focus:outline-none` |

**Tanda 3 (SEO, sin tocar BD):**

| ID | Severidad | Asunto | Cómo se confirmó |
|---|---|---|---|
| SEO-001 | 🟡 Media | Metadata dinámica por ruta | Hook [src/lib/seo.tsx](src/lib/seo.tsx) inyecta `<title>`, description, OG, Twitter, canonical. Integrado en las 11 páginas públicas y como `noindex` en `DashboardLayout` y `AdminLayout` |
| SEO-002 | 🟡 Media | Sitemap y robots | [public/robots.txt](public/robots.txt) bloquea /dashboard, /admin y /login + bots agresivos. [public/sitemap.xml](public/sitemap.xml) lista 9 rutas + 16 slugs de productos |
| SEO-003 | 🟡 Media | Schema.org en productos | [ProductDetail.tsx](src/pages/ProductDetail.tsx) inyecta JSON-LD `@type: Product` con name, image, description, brand, sku, offers. `Organization` también en `index.html` |
| SEO-005 | 🟢 Baja | OG image | `index.html` y hook usan `LOGO_SUMAK.png` por defecto; cada ProductDetail usa la imagen propia del producto para previews ricos en WhatsApp / FB |

**Tanda 4 (Performance, sin tocar BD):**

| ID | Severidad | Asunto | Cómo se confirmó |
|---|---|---|---|
| PERF-002 | 🟡 Media | Code-splitting + vendor chunks | [App.tsx](src/App.tsx) usa `lazy()` por ruta + `<Suspense fallback>`. [vite.config.ts](vite.config.ts) `manualChunks` separa `vendor-react`, `vendor-motion`, `vendor-supabase`, `vendor-icons`. Bundle inicial: 87 kB gzip (antes 295 kB en un solo chunk de 1.16 MB). Sin warnings de tamaño |
| PERF-003 | 🟡 Media | Lazy loading de imágenes | Atributos `loading="lazy" decoding="async"` en imágenes no-hero: catálogo (Home, Productos, Tienda), relacionados (ProductDetail, TiendaProducto), revista zoom, carrito y voucher en admin. Hero del Home, Login y producto siguen `eager` para LCP. |
| PERF-004 | 🟡 Media | N+1 en MisComisiones eliminado | Query principal hace join `origen:profiles!origen_id(...)`. DetalleModal lee `comision.origen` directo (antes: 1 fetch por modal). Aplicado en `MisComisiones.tsx` y `AdminMisComisiones.tsx` |

### Lo que está 🔄 Mitigado (infra lista, cliente no la adopta del todo)

| ID | Severidad | Por qué solo mitigado |
|---|---|---|
| SEC-002 | 🟠 Alta | RPC `finish_approve_afiliacion` disponible en BD, pero `SolicitudDetalle.handleApprove` sigue ejecutando 8 inserts sin transacción. Adopción requiere testing en staging primero. |
| BIZ-001 | 🟠 Alta | RPC `submit_pedido` disponible en BD, pero `NuevoPedido` sigue calculando total/puntos cliente-side. Adopción requiere testing. |
| ARQ-001 | 🟠 Alta | Las 4 RPCs son los primeros servicios servidor-side; pero el resto del código sigue acoplado a Supabase directo en 30+ lugares. |
| ARQ-002 | 🟠 Alta | RPCs PL/pgSQL sustituyen parcialmente Edge Functions; pero `auth.admin.createUser` y otros bypasses con service_role siguen en cliente. |
| UX-002 + A11Y-001 | 🟡 Media | Componente `<Modal/>` reutilizable creado (`src/components/Modal.tsx`) con focus trap, ESC, click-outside, `aria-modal`, bloqueo de scroll. Adoptado en la nueva confirmación de cancelar pedido. **Pendiente migrar** los modales legacy (DetalleModal en AdminPedidos, ApproveModal/RejectModal/SuccessModal en SolicitudDetalle, DetalleModal en MisComisiones/AdminMisComisiones) para que también tengan focus trap. |
| UX-006 | 🟡 Media | Componente `<Skeleton/>` y variantes (`SkeletonTableRow`, `SkeletonCard`, `SkeletonCards`) creados (`src/components/Skeleton.tsx`). Pendiente adoptarlos en los listados grandes (AdminPedidos, MisPedidos, MisComisiones, Distribuidores) que aún muestran spinner global. |

---

## Pendientes ⏳ — orden Crítica → Baja

> Estos son los **69** hallazgos sin tocar todavía, en orden de prioridad estricto.
> Marca con `[x]` cuando atiendas cada uno.

### 🔴 Crítica (1)

- [ ] **SEC-001** — `VITE_SUPABASE_SERVICE_ROLE_KEY` expuesta al navegador. Requiere mover ~12 archivos a Edge Functions o backend propio + rotar key. **Bloqueante para producción real.**

### 🟠 Alta (6 restantes — 4 ya mitigadas)

- [ ] **BIZ-009** — Sin lógica de comisiones binarias (feature nueva, decisión de negocio + Edge Function mensual)
- [ ] **BIZ-010** — Sin progresión de rango/escalera (feature nueva, Edge Function diaria)
- [ ] **PERF-001** — Cero paginación en listados (`MiRed`, `Distribuidores`, `AdminPedidos`, `AdminComisiones`, `Solicitudes`)
- [ ] **UX-015** — Formulario `/contacto` no envía nada al admin (Edge Function + Resend)
- [ ] (Reaprovechar SEC-002, BIZ-001, ARQ-001, ARQ-002 cuando se adopten las RPCs en cliente)

### 🟡 Media (46 — TODAS pendientes)

**Seguridad:**
- [ ] **SEC-006** — Sin CSP ni headers de seguridad (requiere mover de GitHub Pages a Vercel/Netlify)
- [ ] **SEC-007** — Login sin captcha (configurar en Supabase Auth + hCaptcha/Turnstile)
- [ ] **SEC-008** — Sin validación de tamaño/tipo de archivo en bucket (configurar `file_size_limit` y `allowed_mime_types`)

**Negocio:**
- [ ] **BIZ-003** — Función `cancelar_pedidos_pago_vencidos` sin pg_cron (o eliminar columnas si no se usa el estado `pendiente_pago`)
- [ ] **BIZ-004** — Base de cálculo de comisiones nivel: confirmar contra PDF corporativo
- [ ] **BIZ-006** — Cadena upline puede romperse por nodos sin red_binaria
- [ ] **BIZ-007** — Activación mensual no se recalcula tras cancelaciones tardías
- [ ] **BIZ-008** — Asignación binaria siempre prefiere izquierda (sin balanceo)
- [ ] **BIZ-011** — Sin gestión de stock/inventario
- [ ] **BIZ-012** — Sin audit log de cambios de estado de pedido

**Arquitectura:**
- [ ] **ARQ-006** — Sin Error Boundary global
- [ ] **ARQ-007** — Sin TanStack Query (refetch / cache / optimistic updates)

**Performance:**
- [ ] **PERF-002** — Bundle de 1.13 MB en un solo chunk (code-split por ruta con `lazy()`)
- [ ] **PERF-003** — Imágenes sin lazy loading ni WebP
- [ ] **PERF-004** — N+1 en `MisComisiones` cargando origen profile uno a uno

**UX:**
- [ ] **UX-001** — Sin confirmación final en acciones destructivas (aprobar afiliado, cancelar pedido)
- [ ] **UX-002** — Modal de detalle no se cierra con ESC ni con click fuera consistente
- [ ] **UX-003** — Sin breadcrumbs ni "volver" consistente
- [ ] **UX-004** — Mensajes de error técnicos visibles al usuario ("ejecutar migración 004b…")
- [ ] **UX-006** — Loading states pobres (spinner global, sin skeletons)
- [ ] **UX-007** — Sin email automático al aprobar afiliado (credenciales en claro)
- [ ] **UX-008** — Sin bandeja de notificaciones
- [ ] **UX-009** — Tablas mobile sin columna sticky
- [ ] **UX-010** — Sin toast al añadir al carrito
- [ ] **UX-012** — Contraste insuficiente con `#9CA3AF` sobre `#F4F7F5`

**Accesibilidad:**
- [ ] **A11Y-001** — Modales sin focus trap, ESC ni `aria-modal`
- [ ] **A11Y-002** — Inputs sin focus ring visible

**SEO:**
- [ ] **SEO-001** — Sin metadata por ruta (description, OG, canonical)
- [ ] **SEO-002** — Sin sitemap.xml ni robots.txt
- [ ] **SEO-003** — Productos sin Schema.org JSON-LD
- [ ] **SEO-004** — URLs SPA con hack de GitHub Pages

**Código:**
- [ ] **COD-001** — Funciones `estadoBadge`/`ESTADO_LABELS` duplicadas en 7 archivos
- [ ] **COD-002** — Magic numbers (DISCOUNT, puntos, comisiones) dispersos
- [ ] **COD-003** — Colores hardcoded en todos los componentes (sin design tokens)
- [ ] **COD-004** — Sin ESLint ni Prettier
- [ ] **COD-005** — Sin tests automatizados
- [ ] **COD-006** — Componentes monolíticos (Home 840L, ProductDetail 830L, NuevoPedido 1067L)
- [ ] **COD-008** — Sin README.md técnico

**DevOps:**
- [ ] **OPS-001** — Sin pipeline CI/CD
- [ ] **OPS-002** — Sin entornos separados (dev/staging/prod)
- [ ] **OPS-003** — Migraciones SQL aplicadas manualmente (sin Supabase CLI)
- [ ] **OPS-004** — Sin monitoreo (Sentry, Uptime)
- [ ] **OPS-005** — Sin política de backup verificado
- [ ] **OPS-007** — Sin política de rotación de secrets

### 🟢 Baja (16 — 5 ya estaban resueltas o son cosmético sin urgencia)

**Seguridad/Negocio:**
- [ ] **SEC-008** — (ver Media también) validación servidor-side de uploads
- [ ] **BIZ-013** — Carrito persiste precios viejos si `data.ts` cambia
- [ ] **BIZ-014** — Sin validación algoritmo módulo 10 de cédula EC

**Arquitectura:**
- [ ] **ARQ-003** — `CartProvider` envuelve toda la app incluso admin
- [ ] **ARQ-004** — Doble-fetch de profile en login
- [ ] **ARQ-005** — Rutas con duplicación de Layout (sin nested routes)

**Performance:**
- [ ] **PERF-005** — Queries secuenciales que podrían ir en `Promise.all`
- [ ] **PERF-006** — Dependencia `[user]` en lugar de `[user?.id]` en `useEffect`

**UX:**
- [ ] **UX-005** — `ProtectedRoute` usa colores `#00A86B` / `#0F0F0F` en vez de la paleta de marca
- [ ] **UX-011** — Botón "Continuar al pago" arranca el timer sin checklist
- [ ] **UX-013** — Empty states sin CTAs claros
- [ ] **UX-014** — Hero carousel no pausa con hover

**Accesibilidad:**
- [ ] **A11Y-003** — Iconos decorativos sin `aria-hidden`
- [ ] **A11Y-004** — Sin atributos `lang` por sección
- [ ] **A11Y-005** — Tablas sin `<caption>` ni `scope="col"`

**SEO:**
- [ ] **SEO-005** — Sin Open Graph image dedicada (1200x630)

**Código:**
- [ ] **COD-007** — Tipos `any`/`unknown` con casts vagos (Supabase types sin generar)
- [ ] **COD-009** — `console.error` en producción
- [ ] **COD-010** — `AdminLayout` y `DashboardLayout` con 80% código duplicado
- [ ] **COD-011** — Clases Tailwind largas sin componentes base

**DevOps:**
- [ ] **OPS-006** — PDFs corporativos sueltos potencialmente comiteables

---

## Tandas recomendadas (orden sugerido de ataque)

Agrupé los pendientes por afinidad para minimizar context-switch:

### Tanda 2 — UX & Accesibilidad (~10 items, sin tocar BD)
ARQ-006, UX-001, UX-002 + A11Y-001 (mismo Modal reutilizable), UX-004, UX-005, UX-006, UX-010, UX-013, A11Y-002, A11Y-003.

**Beneficio:** la app se siente significativamente más sólida y profesional. Bajo riesgo.

### Tanda 3 — SEO básico (~5 items, solo HTML/JSX)
SEO-001, SEO-002, SEO-003, SEO-005. Y opcionalmente migración a Vercel/Netlify para SEO-004 + SEC-006.

**Beneficio:** indexación en Google y previews bonitos al compartir.

### Tanda 4 — Performance accesible (~3 items)
PERF-002 (code-splitting), PERF-003 (imágenes), PERF-004 (N+1 fix).

**Beneficio:** baja el bundle de 1.13 MB y mejora LCP en mobile.

### Tanda 5 — Limpieza y DX (~7 items)
COD-001, COD-002, COD-003, COD-008, COD-009, BIZ-014, OPS-006.

**Beneficio:** velocidad de desarrollo a futuro y consistencia visual.

### Tanda 6 — Adopción de RPCs Fase 1 (cierra los 🔄 mitigados)
Cambiar `SolicitudDetalle.handleApprove` para usar `finish_approve_afiliacion`.
Cambiar `NuevoPedido.handleSubmitFinal` para usar `submit_pedido`.
Cambiar `AdminPedidos` cancel para usar `cancel_pedido`.

**Beneficio:** SEC-002, BIZ-001, ARQ-001/002 pasan de 🔄 a ✅.

### Tanda 7 — Operativos (requiere config externa)
SEC-006 (mover hosting), SEC-007 (captcha), SEC-008 (limites bucket), OPS-001 (GitHub Actions), OPS-004 (Sentry/Uptime).

### Tanda 8 — Backend pesado (Fase 2 real)
SEC-001 (Edge Functions), UX-007 (email aprobación), UX-015 (form contacto), BIZ-009 (binarias), BIZ-010 (rangos), BIZ-011 (stock), BIZ-012 (audit log).

### Tanda 9 — Refactors grandes
ARQ-007 (React Query), PERF-001 (paginación), COD-006 (descomponer componentes), COD-004/005 (linter + tests).

---

## Indicador de avance

```
Resueltos:  █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 19/78  (24%)
Mitigados:  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  6/78  (8%)
Pendientes: ███████████████████████████░░░░░░░░░░░░ 53/78  (68%)
```

Por severidad:
- 🔴 Crítica: **1 pendiente** (SEC-001)
- 🟠 Alta: **4 pendientes** (BIZ-009, BIZ-010, PERF-001, UX-015) + 4 mitigados
- 🟡 Media: **34 pendientes** (de 46 totales — 12 resueltos + 2 mitigados)
- 🟢 Baja: **14 pendientes** (de 21 totales — 3 resueltos)

### Pendientes ⏳ — restantes tras Tanda 4

**🟡 Media restantes (34):**
SEC-006, SEC-007, SEC-008, BIZ-003, BIZ-004, BIZ-006, BIZ-007, BIZ-008, BIZ-011, BIZ-012, ARQ-007, UX-003, UX-007, UX-008, UX-009, UX-012, SEO-004, COD-001, COD-002, COD-003, COD-004, COD-005, COD-006, COD-008, OPS-001, OPS-002, OPS-003, OPS-004, OPS-005, OPS-007.

**🟢 Baja restantes (14):**
SEC-008, BIZ-013, BIZ-014, ARQ-003, ARQ-004, ARQ-005, PERF-005, PERF-006, UX-011, UX-014, A11Y-003, A11Y-004, A11Y-005, COD-007, COD-009, COD-010, COD-011, OPS-006.

---

*Última actualización: Tanda 4 (Performance) — code-splitting, lazy images, N+1 fix.*
