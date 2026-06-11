# Auditoría Integral — Plataforma Sumak Vida Ecuador S.A.

> **Documento:** Auditoría técnica, funcional y de UX
> **Plataforma:** Sumak Vida Ecuador S.A. (web pública + plataforma MLM)
> **Stack revisado:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind v4 · Supabase (PostgreSQL + Auth + Storage + RLS) · React Router 7 · Motion 12 · Lucide
> **Alcance:** rama `main` al corte de hoy
> **Naturaleza:** este documento **NO modifica código**. Cada hallazgo es una sugerencia con sustento. La decisión de implementar o no, es del equipo.

---

## Tabla de contenidos

1. [Metodología y alcance](#1-metodologia-y-alcance)
2. [Resumen ejecutivo](#2-resumen-ejecutivo)
3. [Hallazgos](#3-hallazgos)
   - 3.1 [Seguridad (SEC)](#31-seguridad-sec)
   - 3.2 [Integridad de datos y lógica de negocio (BIZ)](#32-integridad-de-datos-y-logica-de-negocio-biz)
   - 3.3 [Arquitectura y backend (ARQ)](#33-arquitectura-y-backend-arq)
   - 3.4 [Performance y escalabilidad (PERF)](#34-performance-y-escalabilidad-perf)
   - 3.5 [UX y diseño visual (UX)](#35-ux-y-diseno-visual-ux)
   - 3.6 [Accesibilidad (A11Y)](#36-accesibilidad-a11y)
   - 3.7 [SEO y marketing (SEO)](#37-seo-y-marketing-seo)
   - 3.8 [Código y mantenibilidad (COD)](#38-codigo-y-mantenibilidad-cod)
   - 3.9 [Operaciones y DevOps (OPS)](#39-operaciones-y-devops-ops)
4. [Recomendaciones priorizadas](#4-recomendaciones-priorizadas)
5. [Anexos](#5-anexos)

---

## 1. Metodología y alcance

### Cómo se realizó la evaluación

La auditoría se realizó mediante **lectura directa del código fuente** y **análisis estático** de los siguientes artefactos:

| Área | Archivos inspeccionados |
|---|---|
| Configuración | `package.json`, `index.html`, `vite.config` (inferido), variables de entorno (referencias `import.meta.env`) |
| Capa de datos | `src/lib/supabase.ts`, `src/lib/types.ts`, `src/data.ts` |
| Auth & estado global | `src/lib/auth.tsx`, `src/lib/cart.tsx`, `src/components/ProtectedRoute.tsx` |
| Páginas públicas | `Home`, `Nosotros`, `Productos`, `ProductDetail`, `Oportunidad`, `Plan`, `Escaleras`, `Contacto`, `Registro`, `Login`, `Manual` |
| Dashboard distribuidor | `Overview`, `MiRed`, `MisComisiones`, `MisPedidos`, `NuevoPedido`, `MiPerfil`, `MiEscalera`, `Tienda`, `TiendaProducto` |
| Dashboard admin | `AdminDashboard`, `Solicitudes`, `SolicitudDetalle`, `Distribuidores`, `DistribuidorDetalle`, `AdminComisiones`, `AdminMisComisiones`, `AdminPedidos`, `AdminRed` |
| Componentes | `Navbar`, `Footer`, `WhatsAppButton`, `ProductCard`, `ProductBottleSVG`, `TikTokIcon`, `AdminLayout`, `DashboardLayout` |
| Backend | 6 migraciones SQL (`001`→`005`) en `supabase/migrations/` |

**Dimensiones evaluadas** por cada archivo: seguridad, integridad de datos, race conditions, RLS, UX, accesibilidad, performance, SEO, mantenibilidad, manejo de errores, edge cases de negocio, mobile, deuda técnica.

### Limitaciones

- **No se ejecutó la aplicación** en runtime ni se probaron rutas en navegador; algunas observaciones sobre comportamiento dinámico son inferencias del código.
- **No se inspeccionó el panel de Supabase** (políticas RLS reales en BD, configuración de Auth, Storage buckets, cron jobs) — solo lo declarado en los archivos de migración del repo.
- **No se hicieron pruebas de penetración** (DAST). Los hallazgos de seguridad son por revisión de código (SAST manual).
- **No se evaluó SEO sobre URLs en producción** (Lighthouse, búsqueda real en Google). Las observaciones son sobre meta tags y semántica del código.

### Convenciones del documento

Cada hallazgo tiene la siguiente estructura estandarizada:

```
### [CÓDIGO-NNN] Título corto
**Severidad:** Crítica | Alta | Media | Baja
**Ubicación:** archivo:línea
**Hallazgo:** qué se observó
**Por qué importa (sustento):** justificación técnica/negocio
**Implicación / afectación:** qué pasa si no se atiende, cómo y a quién afecta
**Sugerencia:** orientación de remedio (no es solución única)
```

**Escala de severidad:**

| Nivel | Significado |
|---|---|
| 🔴 **Crítica** | Vulnerabilidad activa, pérdida de datos, fraude posible, sistema caído. Atender en horas. |
| 🟠 **Alta** | Bug funcional importante, lógica de negocio comprometida, riesgo legal/UX severo. Atender esta semana. |
| 🟡 **Media** | Deuda técnica relevante, UX subóptima, riesgo a futuro. Atender este mes. |
| 🟢 **Baja** | Cosmético, code smell, mejora opcional. Atender cuando convenga. |

---

## 2. Resumen ejecutivo

### Top 10 hallazgos (orden de impacto)

| # | ID | Severidad | Asunto | Impacto en una frase |
|---|---|---|---|---|
| 1 | SEC-001 | 🔴 Crítica | `VITE_SUPABASE_SERVICE_ROLE_KEY` expuesta al navegador | Cualquier persona con DevTools puede vaciar la BD, crear admins, leer datos personales (cédulas, direcciones) |
| 2 | BIZ-001 | 🟠 Alta | Totales, puntos y comisiones se calculan en el cliente y se insertan tal cual | Un distribuidor puede inflar sus puntos y disparar comisiones falsas modificando el JS |
| 3 | SEC-002 | 🟠 Alta | Aprobación de afiliados no es atómica (8+ operaciones secuenciales sin transacción) | Si falla a la mitad, queda usuario huérfano en `auth.users`, sin profile o sin nodo binario |
| 4 | BIZ-002 | 🟠 Alta | Cancelar un pedido **no revierte** comisiones generadas | El upline cobra comisión sobre una venta que nunca existió |
| 5 | PERF-001 | 🟠 Alta | Sin paginación: `MiRed`, `Distribuidores`, `AdminPedidos` cargan toda la tabla | Con >500 distribuidores el dashboard tarda 5-10s y/o se congela el navegador |
| 6 | SEC-003 | 🟠 Alta | RLS de `profiles` permite que **cualquier autenticado lea todos los profiles** | Un distribuidor ve cédulas, direcciones y teléfonos de los demás vía la API directa |
| 7 | UX-001 | 🟡 Media | Cero confirmación en acciones destructivas/irreversibles (aprobar afiliado, cancelar pedido) | Un clic accidental crea un usuario con paquete y comisiones; revertir requiere intervención manual de BD |
| 8 | SEO-001 | 🟡 Media | Sin `meta description`, OG tags, `document.title` dinámico, sitemap, robots.txt | Posicionamiento orgánico nulo; al compartir en redes el preview es genérico |
| 9 | A11Y-001 | 🟡 Media | Modales sin focus trap ni cierre por ESC, sin `aria-modal`, focus no visible en inputs | Personas con discapacidad visual o navegación por teclado no pueden usar el sistema |
| 10 | OPS-001 | 🟡 Media | Sin pipeline CI/CD ni linter ejecutado en commit; bundle de 1.13 MB en un solo chunk | Cualquier regresión llega a producción sin filtro; primera carga lenta en 3G |

### Conteo de hallazgos por severidad

- 🔴 **Crítica:** 3
- 🟠 **Alta:** 18
- 🟡 **Media:** 32
- 🟢 **Baja:** 21
- **Total:** 74 hallazgos documentados

### Veredicto general

La plataforma **funciona y luce profesional** en el plano visual (paleta consistente verde + dorado, tipografía Poppins/Inter, animaciones cuidadas con Motion). El modelo de datos y la lógica de comisiones están **conceptualmente bien diseñados** y reflejan correctamente el plan MLM declarado en los PDFs corporativos.

Sin embargo, **la plataforma no está lista para operar en producción** con dinero real por dos razones estructurales:

1. **Capa de seguridad rota.** El uso del Service Role Key en el cliente, combinado con RLS permisivas y cálculo de comisiones del lado cliente, hace que cualquier usuario técnicamente curioso pueda cometer fraude, ver datos sensibles de terceros o tomar control total de la BD.
2. **Operaciones de negocio sin transaccionalidad.** Procesos críticos (aprobar afiliado, crear pedido con comisiones, cancelar pedido) ejecutan 5-10 escrituras secuenciales sin atomicidad. Una falla de red intermitente deja la BD en estado inconsistente.

**El resto** de los hallazgos (UX, SEO, A11Y, performance) son mejoras necesarias pero no bloqueantes para un MVP cerrado.

---

## 3. Hallazgos

---

### 3.1 Seguridad (SEC)

---

#### [SEC-001] Service Role Key de Supabase expuesta al cliente

- **Severidad:** 🔴 **Crítica**
- **Ubicación:** [src/lib/supabase.ts:5](src/lib/supabase.ts#L5), usado en 12 archivos (todos `src/pages/admin/*` + `src/pages/dashboard/NuevoPedido.tsx` + `src/pages/dashboard/MisComisiones.tsx`)
- **Hallazgo:** La variable `VITE_SUPABASE_SERVICE_ROLE_KEY` se lee con `import.meta.env` y se usa para crear `supabaseAdmin`. Cualquier variable con prefijo `VITE_` se inyecta literal en el bundle JS que descarga el navegador. La key del Service Role **bypassea Row-Level Security** y permite leer/escribir/borrar cualquier tabla, crear usuarios, modificar Auth.
- **Por qué importa (sustento):** Es documentación explícita de Supabase: "The service_role key has the ability to bypass Row Level Security. Never share it publicly." Cualquier persona puede abrir DevTools → Network → ver el header `Authorization: Bearer eyJ...` en una petición de admin, copiarla, e impactar la BD con `curl`.
- **Implicación / afectación:**
  - **Fraude:** un distribuidor puede aumentar sus puntos, crear comisiones a su favor, marcarse como admin (`update profiles set rol='admin' where id=mi_uuid`).
  - **Fuga de datos personales:** cédulas, direcciones, teléfonos, emails, vouchers bancarios — todos legibles. Esto es **PII regulada en Ecuador por la LOPDP** (Ley Orgánica de Protección de Datos Personales, 2021). Multa hasta el 1% de ingresos.
  - **Destrucción:** un atacante puede ejecutar `DELETE FROM profiles` desde el navegador.
- **Sugerencia:**
  1. Mover **todas** las operaciones que usan `supabaseAdmin` a **Supabase Edge Functions** o a un backend Node/Deno propio que tenga la Service Key en variable de entorno del servidor (no del cliente).
  2. En el frontend usar **solo** la `anon` key con RLS bien escritas.
  3. **Rotar** la Service Role Key actual de inmediato (probablemente ya está expuesta en el bundle publicado).
  4. Auditar logs de Supabase de los últimos meses para detectar uso anómalo.

---

#### [SEC-002] Aprobación de afiliado no es transaccional

- **Severidad:** 🟠 **Alta**
- **Ubicación:** [src/pages/admin/SolicitudDetalle.tsx:91-347](src/pages/admin/SolicitudDetalle.tsx#L91-L347) (`handleApprove`)
- **Hallazgo:** El proceso de aprobación ejecuta secuencialmente: (1) generar código, (2) crear `auth.users`, (3) buscar patrocinador, (4) insertar `profiles`, (5) buscar/crear nodo binario padre, (6) insertar `red_binaria`, (7) actualizar `afiliaciones.estado`, (8) crear pedido inicial del paquete, (9) crear `pedido_items`, (10) crear comisión de referido 40%, (11) crear comisiones por nivel. **Ninguna está dentro de una transacción**. Si falla la operación N, los pasos 1..N-1 ya quedaron escritos.
- **Por qué importa (sustento):** En BD relacionales, la atomicidad (ACID) se garantiza con transacciones. Supabase JS-SDK **no expone transacciones** desde el cliente; deben ejecutarse desde una `function` PL/pgSQL o vía Edge Function que use el driver Postgres y abra una transacción.
- **Implicación / afectación:**
  - **Usuarios huérfanos en Auth:** si falla `profiles.insert` (paso 4), queda un usuario en `auth.users` sin profile. Intentar reaprobar al mismo email falla porque `createUser` da "email exists".
  - **Red binaria rota:** si falla `red_binaria.insert` (paso 6), el distribuidor existe pero no aparece en la red, no recibe ni paga comisiones.
  - **Comisiones inconsistentes:** si falla la comisión de referido (paso 10), todo el resto está bien pero el patrocinador no cobra su 40%. Difícil de detectar a posteriori.
- **Sugerencia:**
  1. Crear una RPC `approve_afiliacion(afiliacion_id uuid, padre_profile_id uuid)` en PL/pgSQL que ejecute todo dentro de `BEGIN…COMMIT`.
  2. La creación del `auth.users` debe ir **al final** o también dentro de un wrapper que pueda rollback. Alternativa: crear primero el `auth.users`, y si algo falla, ejecutar `DELETE FROM auth.users WHERE id = …`.
  3. Loggear cada paso completado para diagnóstico forense.

---

#### [SEC-003] Cualquier autenticado puede leer todos los profiles

- **Severidad:** 🟠 **Alta**
- **Ubicación:** [supabase/migrations/002_store_and_binary_improvements.sql:192-201](supabase/migrations/002_store_and_binary_improvements.sql#L192-L201)
- **Hallazgo:** La política RLS `Authenticated users can read basic profile info` permite `auth.uid() is not null` sobre `select * from profiles`. No restringe columnas. Eso permite que un distribuidor lea **todas** las cédulas, teléfonos, direcciones, emails y puntos de los demás.
- **Por qué importa (sustento):** Los profiles contienen PII regulada (cédula y dirección física). La política inicial de la migración 001 era más estricta (`id = auth.uid() or is_admin()`), pero la 002 la abrió "para que el frontal lookup funcione". Es un patrón demasiado amplio para el objetivo.
- **Implicación / afectación:**
  - **Riesgo legal LOPDP:** acceso indebido a datos personales por usuarios autorizados pero no autorizados a esa data.
  - **Fuga competitiva:** un distribuidor puede exfiltrar la lista entera de la red y dársela a la competencia.
  - **Phishing dirigido:** con cédula + teléfono + email se arman ataques personalizados.
- **Sugerencia:**
  1. Reemplazar la política amplia por una **vista** `public.profiles_publicos` que exponga solo `id, codigo_distribuidor, nombre_completo, rol` y dar `select` a `authenticated` solo sobre la vista.
  2. La política de `profiles` (tabla) vuelve a ser solo `id = auth.uid() or is_admin()`.
  3. El front consume la vista para autocompletado de patrocinador.

---

#### [SEC-004] El bucket de vouchers permite que cualquier autenticado suba sin validar carpeta

- **Severidad:** 🟡 **Media**
- **Ubicación:** [supabase/migrations/004b_voucher_bucket_fix.sql:22-26](supabase/migrations/004b_voucher_bucket_fix.sql#L22-L26)
- **Hallazgo:** La política INSERT es `bucket_id = 'pedidos-vouchers' and auth.uid() is not null`. No valida que el path comience con el `uid` del usuario. Un distribuidor puede subir a la carpeta de otro y "ensuciar" la evidencia, o llenar el bucket de basura.
- **Por qué importa (sustento):** Storage de Supabase factura por GB. La política SELECT sí valida `(storage.foldername(name))[1] = auth.uid()::text` (correcto). La de INSERT debería tener la misma comprobación.
- **Implicación / afectación:** abuso de almacenamiento, posible sabotaje (subir un voucher falso en la carpeta de otro), aunque limitado porque no se leerá por la política SELECT.
- **Sugerencia:** cambiar la política INSERT a:
  ```sql
  with check (
    bucket_id = 'pedidos-vouchers'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  ```

---

#### [SEC-005] Contraseña temporal con baja entropía: `Sumak{4 dígitos cédula}!`

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/admin/SolicitudDetalle.tsx:103](src/pages/admin/SolicitudDetalle.tsx#L103)
- **Hallazgo:** La contraseña temporal generada al aprobar un afiliado es predecible: prefijo fijo + últimos 4 dígitos de la cédula + `!`. Si un atacante conoce la cédula del usuario (público, en factura electrónica del SRI) puede iniciar sesión hasta que el usuario la cambie.
- **Por qué importa (sustento):** Los distribuidores **no son forzados** a cambiar la contraseña en el primer login (no se inspeccionó este flujo, pero no hay rastros de `must_change_password` ni redirect a "cambiar clave"). La cédula ecuatoriana es semipública.
- **Implicación / afectación:** secuestro de cuenta; el atacante puede ver red propia, comisiones, hacer pedidos, etc.
- **Sugerencia:**
  1. Generar password aleatoria criptográfica (16 chars, mixto). Ej: `crypto.randomUUID().replace(/-/g, '').slice(0, 16)`.
  2. Forzar cambio en primer login (campo `requiere_cambio_password` en `profiles`, ProtectedRoute redirige a `/cambiar-clave` si está `true`).
  3. Enviar password por canal seguro (no compartir en WhatsApp en claro).

---

#### [SEC-006] Sin protección CSRF visible y sin headers de seguridad

- **Severidad:** 🟡 **Media**
- **Ubicación:** No hay configuración de servidor; el deploy parece ser GitHub Pages estático (líneas 11-22 de `index.html` con el "SPA redirect handler for GitHub Pages").
- **Hallazgo:** No se observan headers `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. GitHub Pages tampoco los permite configurar (solo via meta tags limitados).
- **Por qué importa (sustento):** Sin CSP, una XSS en cualquier campo libre (notas del admin, descripción de comisión, etc.) se vuelve full account takeover.
- **Implicación / afectación:** vulnerabilidad ante XSS reflejada o almacenada; sin defensa en profundidad.
- **Sugerencia:**
  1. Migrar el hosting a **Vercel, Netlify o Cloudflare Pages**: permiten headers HTTP a nivel `_headers` o `vercel.json`.
  2. Definir CSP estricta: `default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https://*.supabase.co; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;`.
  3. Agregar `<meta http-equiv="Content-Security-Policy" content="..."/>` como mitigación temporal mientras dure GitHub Pages.

---

#### [SEC-007] Login sin rate limiting visible ni captcha

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/Login.tsx](src/pages/Login.tsx) (no inspeccionado en detalle pero patrón visible en `auth.tsx`)
- **Hallazgo:** El login usa `supabase.auth.signInWithPassword` directamente. Supabase tiene rate limit por IP en su lado, pero no hay captcha ni progressive delay ni bloqueo de cuenta tras N intentos.
- **Por qué importa (sustento):** Combinado con SEC-005 (passwords predecibles), facilita ataques de credential stuffing.
- **Implicación / afectación:** brute force de cuentas.
- **Sugerencia:** activar **captcha** (hCaptcha o Turnstile gratis) en Supabase Auth → Project Settings → Captcha.

---

#### [SEC-008] Sin validación del tamaño y tipo de archivo del lado servidor

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/pages/Registro.tsx:120-128](src/pages/Registro.tsx#L120-L128), [src/pages/dashboard/NuevoPedido.tsx:117-128](src/pages/dashboard/NuevoPedido.tsx#L117-L128)
- **Hallazgo:** El límite de 5 MB y los tipos JPG/PNG/PDF se validan solo en JS. Storage de Supabase no aplica límite por bucket por default.
- **Por qué importa (sustento):** un atacante con `curl` y la URL del bucket puede subir un binario de 500 MB.
- **Implicación / afectación:** costo de storage y posible DoS de la cuota.
- **Sugerencia:** configurar `file_size_limit` y `allowed_mime_types` en `storage.buckets` desde el dashboard de Supabase.

---

### 3.2 Integridad de datos y lógica de negocio (BIZ)

---

#### [BIZ-001] Totales, puntos y comisiones se calculan en cliente y se insertan sin validar

- **Severidad:** 🟠 **Alta**
- **Ubicación:** [src/pages/dashboard/NuevoPedido.tsx:180-220](src/pages/dashboard/NuevoPedido.tsx#L180-L220), [src/lib/cart.tsx:87](src/lib/cart.tsx#L87)
- **Hallazgo:** El cart computa `puntos = Σ Math.round(precio × cantidad)` y `total` en `localStorage`. Ambos se insertan literal en `pedidos`. Las comisiones por nivel también se calculan en JS (`puntos * porcentaje / 100`) y se insertan vía `supabaseAdmin`.
- **Por qué importa (sustento):** un usuario con DevTools puede ejecutar `localStorage.setItem('sumak_cart_v1', JSON.stringify([{codigo:'XX', precio: 100000, cantidad: 1, ...}]))` y enviar un pedido por $100.000 con 100.000 puntos. Las comisiones upline se calculan sobre esos puntos.
- **Implicación / afectación:**
  - Fraude directo: comisiones infladas a la red entera del estafador.
  - Imposibilidad de auditar: la BD no sabe distinguir un pedido "real" de uno "manipulado".
- **Sugerencia:**
  1. El cliente envía solo `[{codigo, cantidad}]`.
  2. Una Edge Function recibe, lee los precios oficiales de `products` (server-side), calcula `total`, `puntos`, comisiones upline. Inserta todo dentro de una transacción.
  3. RLS deniega INSERT directo de `pedidos`; solo la Edge Function (con `service_role`) puede insertar.

---

#### [BIZ-002] Cancelar pedido no revierte comisiones de la cadena upline

- **Severidad:** 🟠 **Alta**
- **Ubicación:** [src/pages/admin/AdminPedidos.tsx:333-372](src/pages/admin/AdminPedidos.tsx#L333-L372)
- **Hallazgo:** `updateEstado` cancela el pedido, decrementa puntos del comprador (parcialmente correcto) y cancela comisiones **solo por ventana temporal** (`created_at` ± 5 minutos). Si el pedido se canceló horas después, las comisiones quedan vivas. Además solo cancela comisiones tipo `nivel`, no la de afiliación 40% (si aplica).
- **Por qué importa (sustento):** la heurística de "± 5 min" funciona porque al crear el pedido se crean comisiones casi en simultáneo, pero **falla si dos pedidos se hicieron consecutivos** y se cancela uno (cancela comisiones de ambos). También falla si la comisión se insertó con delay (queue futuro).
- **Implicación / afectación:**
  - Comisiones fantasma: la empresa termina pagando comisiones por ventas inexistentes (pérdida directa).
  - Cancelar el pedido "equivocado" cancela también comisiones de otro pedido.
- **Sugerencia:**
  1. Agregar columna `comisiones.pedido_id uuid references pedidos(id)`.
  2. Al cancelar pedido, `update comisiones set estado='cancelado' where pedido_id = X`.
  3. Para datos legacy, hacer una migración que correlacione comisiones existentes con pedidos por fecha y origen_id.

---

#### [BIZ-003] La función `cancelar_pedidos_pago_vencidos` no se ejecuta automáticamente

- **Severidad:** 🟡 **Media**
- **Ubicación:** [supabase/migrations/005_pedido_voucher_numero.sql:82-100](supabase/migrations/005_pedido_voucher_numero.sql#L82-L100)
- **Hallazgo:** La migración 005 crea la función pero no programa un `pg_cron` ni Edge Function scheduled. Hoy nada la llama.
- **Por qué importa (sustento):** la columna `pago_expira_en` se llenará cuando se reserve un pedido en `pendiente_pago`, pero si nadie corre la función, esos pedidos quedan colgados infinitamente.
- **Nota adicional:** En el flujo actual implementado en `NuevoPedido.tsx` (post-rewrite), el pedido **no se crea** hasta subir el voucher, así que `pendiente_pago` nunca se usa. La función queda sin uso real, pero la columna sigue presente. Inconsistencia: el SQL prepara una arquitectura que el código no usa.
- **Implicación / afectación:** confusión arquitectural, deuda técnica visible para el siguiente dev.
- **Sugerencia:** **decidir**:
  - Opción A: dejar el flujo client-side actual y borrar `pago_expira_en` / función (limpieza).
  - Opción B: cambiar el flujo a "reservar el pedido al ver cuentas" (más correcto contra carrera de pedidos cruzados) y programar `pg_cron` cada minuto: `select cron.schedule('cancelar-vencidos', '* * * * *', 'select public.cancelar_pedidos_pago_vencidos()')`.

---

#### [BIZ-004] El monto de comisión por nivel se calcula sobre `puntos`, no sobre el subtotal del pedido

- **Severidad:** 🟡 **Media** (depende de la definición del plan)
- **Ubicación:** [src/pages/dashboard/NuevoPedido.tsx:188](src/pages/dashboard/NuevoPedido.tsx#L188), [src/pages/admin/SolicitudDetalle.tsx:322](src/pages/admin/SolicitudDetalle.tsx#L322)
- **Hallazgo:** `monto = puntos * porcentaje / 100`. Como `puntos = Math.round(precio × cantidad)` y los precios distribuidor son aproximadamente la mitad del PVP, el monto de comisión es ~la mitad del que sería si se calculara sobre el PVP. No queda claro en el código si esto es lo que el plan corporativo declara.
- **Por qué importa (sustento):** un error de definición de base de cálculo afecta directo la rentabilidad declarada del plan. Lo declarado en `Plan.tsx` o el PDF corporativo es la fuente de verdad — debe verificarse.
- **Implicación / afectación:** distribuidores cobran menos (o más) de lo prometido en marketing.
- **Sugerencia:**
  1. Verificar contra el PDF corporativo "Plan de Implementación SUMAK.pdf" cuál es la base.
  2. Documentar explícitamente en `data.ts` la decisión: `// Comisión por nivel = porcentaje × puntos (puntos = 1 punto por $1 de subtotal distribuidor)`.
  3. Si la base debe ser PVP, ajustar fórmula y migrar comisiones históricas.

---

#### [BIZ-005] Doble envío de pedido posible (sin idempotency key)

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/dashboard/NuevoPedido.tsx:140-291](src/pages/dashboard/NuevoPedido.tsx#L140-L291) (`handleSubmitFinal`)
- **Hallazgo:** El botón "Enviar pedido" se deshabilita con `disabled={submitting}`, pero si el usuario hace doble-click muy rápido, dos clicks pueden disparar dos `handleSubmitFinal()` antes de que React re-renderice el state.
- **Por qué importa (sustento):** doble click es un escenario clásico de e-commerce. El frontend no es suficiente; necesitas idempotencia en backend.
- **Implicación / afectación:** dos pedidos idénticos, doble voucher subido, doble comisión upline.
- **Sugerencia:**
  1. Generar un `idempotency_key` UUID al entrar al checkout, enviarlo al insert. Constraint único `pedidos(distribuidor_id, idempotency_key)`.
  2. Si el insert falla por violación de unique, devolver el pedido existente (idempotente).

---

#### [BIZ-006] La cadena upline puede romperse por nodo sin red_binaria

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/dashboard/NuevoPedido.tsx:235-248](src/pages/dashboard/NuevoPedido.tsx#L235-L248)
- **Hallazgo:** Se navega por `patrocinador_id` (FK a `profiles`), no por `red_binaria`. Si un profile no tiene patrocinador (por bug de migración 004 paso 7 que solo arregló los actuales), la cadena se corta. También: la migración 004 cuelga huérfanos del admin, pero un afiliado creado **antes** de correrla puede tener patrocinador_id pero su patrocinador no tiene red_binaria.
- **Por qué importa (sustento):** la condición `if (!sponsorId) break` termina antes de los 14 niveles. Los niveles superiores no reciben comisión a la que tenían derecho.
- **Implicación / afectación:** comisiones pasadas por alto, reclamos de distribuidores.
- **Sugerencia:**
  1. Validar en migración: `select count(*) from profiles where rol='distribuidor' and patrocinador_id is null`. Debe ser 0.
  2. Pasar la fuente de verdad de la cadena upline a la tabla `red_binaria` con la función SQL existente `get_upline_chain` (creada en 002).

---

#### [BIZ-007] La activación mensual usa `bool_or(estado in ('procesando',…) and total >= 100)` — no detecta cancelaciones tardías

- **Severidad:** 🟡 **Media**
- **Ubicación:** [supabase/migrations/004_checkout_voucher_and_fixes.sql:78-94](supabase/migrations/004_checkout_voucher_and_fixes.sql#L78-L94)
- **Hallazgo:** La vista `activacion_mensual` agrega con `bool_or(...)`. Si un pedido pasa a `cancelado` después, la vista (recalculada en cada query) ya no lo cuenta — correcto. **Pero** las comisiones que se crearon en base a esa activación ya fueron asignadas y persisten. La cancelación no debería revertir comisiones de **otros** pedidos del mismo upline, solo las propias.
- **Por qué importa (sustento):** cancelar un pedido podría desactivar al distribuidor en ese mes retroactivamente, y todas las comisiones que generó como upline ese mes deberían no existir. Hoy no hay tal mecanismo.
- **Implicación / afectación:** distribuidor inactivo cobra comisiones (pérdida directa para la empresa).
- **Sugerencia:** crear un job mensual (1° de mes) que recalcule comisiones del mes anterior basado en estados finales y reconcilie.

---

#### [BIZ-008] Asignación binaria izquierda/derecha siempre prefiere izquierda

- **Severidad:** 🟡 **Media** (depende del plan)
- **Ubicación:** [src/pages/admin/SolicitudDetalle.tsx:209-215](src/pages/admin/SolicitudDetalle.tsx#L209-L215)
- **Hallazgo:** Auto-asignación: "Izquierda si libre, Derecha si no". No hay balanceo automático ni respeta lo que el patrocinador "prefiera". El admin puede elegir el padre pero no la posición.
- **Por qué importa (sustento):** en MLM binario, el volumen pareado se calcula con `min(izquierda, derecha)`. Si todos van a izquierda, la rama derecha queda muerta y nadie cobra binaria.
- **Implicación / afectación:** estructura desbalanceada → comisiones binarias mínimas.
- **Sugerencia:**
  1. Permitir al admin elegir izquierda/derecha en el modal de aprobación.
  2. Mostrar contador de cada rama del patrocinador para decisión informada.
  3. Opcional: implementar "spillover" automático que coloque al nuevo en la pierna más débil.

---

#### [BIZ-009] No existe lógica de comisiones binarias en el código

- **Severidad:** 🟠 **Alta** (depende del plan)
- **Ubicación:** Búsqueda global: tipo `'binaria'` se declara en types pero solo aparece **una vez** ([src/lib/types.ts:8](src/lib/types.ts#L8)). No hay inserción de comisiones tipo `'binaria'` en ninguna parte del código.
- **Hallazgo:** El plan declara comisiones binarias (volumen pareado mensual), pero la app solo calcula referido (40%) y nivel. **Las binarias nunca se calculan.**
- **Por qué importa (sustento):** la tabla `volumenes_binarios` existe pero no se llena. La función / vista que las calcula no existe. Distribuidores que esperan binarias no las verán.
- **Implicación / afectación:** plan no se ejecuta completo → reclamos.
- **Sugerencia:**
  1. Implementar Edge Function mensual: por cada distribuidor, sumar `total` de pedidos calificados en cada pierna del árbol binario (recursivo), calcular `pareado = min(izq, der)`, aplicar porcentaje.
  2. Insertar en `volumenes_binarios` (snapshot) y crear comisiones tipo `binaria`.
  3. Mostrar en dashboard del distribuidor el volumen izquierda/derecha en tiempo real.

---

#### [BIZ-010] Sin lógica de progresión de rango / escalera

- **Severidad:** 🟠 **Alta** (depende del plan)
- **Ubicación:** Tabla `rangos_historia` existe (001) pero no se inserta en ninguna parte; `MiEscalera.tsx` (no inspeccionado a fondo) solo muestra.
- **Hallazgo:** El plan corporativo tiene Tramo 1 (rangos por afiliados directos) y Tramo 2 (por personas en red) con bonos económicos. No hay código que detecte alcance de rango y registre.
- **Por qué importa (sustento):** rangos = bonos = identidad MLM. Sin esto, no hay carrera ni motivación.
- **Implicación / afectación:** producto incompleto vs lo prometido en `Plan.tsx` y `Escaleras.tsx`.
- **Sugerencia:**
  1. Job mensual (o trigger al cambiar `afiliados_directos`) que calcule rango actual.
  2. Insertar en `rangos_historia` cuando suba.
  3. Generar comisión `tipo='rango'` (necesita extender enum) con el bono.

---

#### [BIZ-011] Sin gestión de inventario / stock

- **Severidad:** 🟡 **Media**
- **Ubicación:** `data.ts` no tiene campo `stock`; ni pedidos descuentan inventario.
- **Hallazgo:** Productos siempre "disponibles". Si se acaba el producto físico, no hay forma de bloquear ventas.
- **Por qué importa (sustento):** vender producto sin stock genera reclamos, devoluciones, costo de oportunidad de comisiones por venta que se cancela.
- **Implicación / afectación:** sobreventa.
- **Sugerencia:**
  1. Añadir `stock integer` en una tabla `producto_stock` (separada para no tener que redeployar al editar).
  2. Decrementar atómicamente al confirmar pedido (transacción).
  3. UI: badge "Últimas X unidades" / "Agotado".

---

#### [BIZ-012] Edición de pedido por admin no tiene historial (audit log)

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/admin/AdminPedidos.tsx:367](src/pages/admin/AdminPedidos.tsx#L367)
- **Hallazgo:** Admin cambia estado de pedido con un `update`. No se registra quién hizo el cambio ni cuándo.
- **Por qué importa (sustento):** ante reclamo del distribuidor ("¿quién canceló mi pedido?") no hay trazabilidad.
- **Implicación / afectación:** disputas internas sin árbitro.
- **Sugerencia:** tabla `pedido_estado_log (pedido_id, estado_anterior, estado_nuevo, admin_id, motivo, created_at)`.

---

#### [BIZ-013] Carrito mezcla productos comprados a precios viejos si se actualiza `data.ts`

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/lib/cart.tsx:30-50](src/lib/cart.tsx#L30-L50)
- **Hallazgo:** El carrito en localStorage persiste `precio` y `pvp` del momento de agregar. Si se actualiza `data.ts` con nuevos precios y el usuario vuelve días después, paga el precio viejo.
- **Por qué importa (sustento):** es un detalle, pero si suben precios el usuario obtiene rebaja involuntaria.
- **Implicación / afectación:** pérdida marginal de ingresos.
- **Sugerencia:** al render del carrito, revalidar precios contra `data.ts` y avisar si cambiaron.

---

#### [BIZ-014] Sin validación de cédula ecuatoriana (algoritmo módulo 10)

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/pages/Registro.tsx:284](src/pages/Registro.tsx#L284)
- **Hallazgo:** El campo cédula acepta cualquier string. No valida el algoritmo de verificación (módulo 10 sobre los 9 primeros dígitos).
- **Por qué importa (sustento):** entran cédulas inválidas a la BD. Al exportar reportes al SRI o emitir facturas, se requiere validez.
- **Implicación / afectación:** trabajo manual de limpieza, problemas tributarios.
- **Sugerencia:** función `validarCedulaEC(s: string): boolean` (es un algoritmo estándar de ~10 líneas) y usar como gating del paso 1 de Registro.

---

### 3.3 Arquitectura y backend (ARQ)

---

#### [ARQ-001] No existe capa de servicio entre UI y Supabase

- **Severidad:** 🟠 **Alta**
- **Ubicación:** Global. Cada `.tsx` importa `supabase` / `supabaseAdmin` directamente y construye queries inline.
- **Hallazgo:** No hay un `services/pedidos.ts`, `services/comisiones.ts`. La misma query se repite en múltiples lugares con variaciones.
- **Por qué importa (sustento):** al cambiar el modelo (ej. renombrar columna) hay que tocar 10 archivos. Validación queda en UI. No se puede testear lógica de negocio sin renderizar React.
- **Implicación / afectación:** velocidad de cambios baja exponencialmente. Bugs por duplicación.
- **Sugerencia:** crear `src/services/` con funciones puras: `createPedido(data)`, `cancelarPedido(id, motivo)`, `getUplineChain(uid)`. Probarlas con Vitest.

---

#### [ARQ-002] Sin Edge Functions ni backend propio

- **Severidad:** 🟠 **Alta**
- **Ubicación:** No hay `supabase/functions/` ni servidor Node. El `express` está en `package.json` pero no se usa.
- **Hallazgo:** Toda la lógica corre en cliente, lo que **causa** los problemas SEC-001 y BIZ-001.
- **Por qué importa (sustento):** sin servidor confiable no hay forma de proteger secrets ni validar inputs.
- **Implicación / afectación:** ver SEC-001, BIZ-001.
- **Sugerencia:** implementar al menos estas Edge Functions:
  - `approve-afiliacion`
  - `submit-pedido` (recibe items, calcula, inserta atómicamente)
  - `cancel-pedido` (revierte puntos y comisiones)
  - `recompute-binary-volumes` (cron mensual)
  - `recompute-ranks` (cron mensual)

---

#### [ARQ-003] El `CartProvider` envuelve TODA la app incluyendo rutas públicas y admin

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/App.tsx:88-90](src/App.tsx#L88-L90)
- **Hallazgo:** El carrito se monta para usuarios públicos y admins que no compran. Es localStorage, costo bajo, pero state innecesario.
- **Por qué importa (sustento):** lo importante: en el header móvil del dashboard se muestra contador del carrito. En admin no debería haber carrito.
- **Implicación / afectación:** mínima, pero contagia abstracción.
- **Sugerencia:** envolver `CartProvider` solo dentro de `DashboardLayout`.

---

#### [ARQ-004] Manejo de auth tiene doble-fetch de profile

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/lib/auth.tsx:49-56](src/lib/auth.tsx#L49-L56)
- **Hallazgo:** `onAuthStateChange` se dispara después de `signIn` (que ya hizo fetchProfile), causando un segundo fetch del mismo profile.
- **Por qué importa (sustento):** carga doble, pequeño desperdicio.
- **Implicación / afectación:** insignificante, pero typescript-flag de patrón.
- **Sugerencia:** quitar el fetch dentro del `signIn` y dejar que `onAuthStateChange` lo haga.

---

#### [ARQ-005] Rutas tienen lock-step de layouts (deeply nested duplication)

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/App.tsx:94-358](src/App.tsx#L94-L358)
- **Hallazgo:** Cada ruta repite `<ProtectedRoute><Layout><Page/></Layout></ProtectedRoute>`.
- **Por qué importa (sustento):** React Router 7 soporta rutas anidadas con `<Route element={<Layout/>}>`. Reduciría el `App.tsx` a la mitad.
- **Implicación / afectación:** mantenibilidad.
- **Sugerencia:** refactorizar con rutas anidadas (`<Outlet/>`).

---

#### [ARQ-006] No hay error boundary

- **Severidad:** 🟡 **Media**
- **Ubicación:** Global, `src/main.tsx` / `App.tsx`.
- **Hallazgo:** Si una página tira excepción, toda la app crashea con pantalla blanca.
- **Por qué importa (sustento):** experiencia desastrosa al usuario; no se reportan errores (no hay Sentry).
- **Implicación / afectación:** pérdida silenciosa de usuarios.
- **Sugerencia:** ErrorBoundary global con UI de fallback + integración con Sentry/LogRocket gratis tier.

---

#### [ARQ-007] No hay manejo de estado server-side (React Query / SWR)

- **Severidad:** 🟡 **Media**
- **Ubicación:** Global. Cada componente hace `useEffect` + `useState` + fetch manual.
- **Hallazgo:** No hay cache, refetch automático, invalidación cruzada. Al navegar entre páginas se vuelve a pedir todo. Optimistic updates ausentes.
- **Por qué importa (sustento):** afecta rendimiento y UX (spinners constantes) y multiplica el riesgo de estados inconsistentes.
- **Implicación / afectación:** dashboard se siente lento, código verboso.
- **Sugerencia:** introducir **TanStack Query (React Query)** v5. Refactor incremental, página por página.

---

### 3.4 Performance y escalabilidad (PERF)

---

#### [PERF-001] Cero paginación en listados grandes

- **Severidad:** 🟠 **Alta**
- **Ubicación:**
  - [src/pages/dashboard/MiRed.tsx](src/pages/dashboard/MiRed.tsx) — `limit(500)` toda la red
  - [src/pages/admin/Distribuidores.tsx](src/pages/admin/Distribuidores.tsx) — select all
  - [src/pages/admin/AdminPedidos.tsx:231](src/pages/admin/AdminPedidos.tsx#L231) — select all sin `range`
  - [src/pages/admin/AdminComisiones.tsx](src/pages/admin/AdminComisiones.tsx)
  - [src/pages/admin/Solicitudes.tsx](src/pages/admin/Solicitudes.tsx)
- **Hallazgo:** Se cargan todas las filas al cliente y se filtran/ordenan en memoria con `useMemo`.
- **Por qué importa (sustento):** funciona con 10-200 registros. Con 1000+ la primera carga del admin tarda >5s y el navegador queda con 50-100MB de RAM solo en JSON. Mobile se degrada antes.
- **Implicación / afectación:** escalabilidad nula. A los 6 meses de uso el dashboard será inutilizable.
- **Sugerencia:**
  1. Implementar paginación server-side: `.range(from, to)` de Supabase + tabla con prev/next.
  2. Para búsqueda y filtros, enviar al backend (`ilike` y filtros en query).
  3. Para `MiRed`, cargar solo nivel 1 y profundizar bajo demanda al expandir.

---

#### [PERF-002] Bundle JS de 1.13 MB en un solo chunk

- **Severidad:** 🟡 **Media**
- **Ubicación:** Output de `npm run build`.
- **Hallazgo:** Vite warning: "Some chunks are larger than 500 kB after minification."
- **Por qué importa (sustento):** en 3G mobile son 5-8 segundos de descarga. LCP penalizado por Google.
- **Implicación / afectación:** abandono de usuarios en mobile lento, peor ranking SEO.
- **Sugerencia:**
  1. Code-split por ruta con `lazy()` y `<Suspense>` en cada `<Route element=…>`.
  2. Configurar `build.rollupOptions.output.manualChunks` para separar `motion`, `lucide`, `@supabase`, `react-router`.
  3. Verificar si `@google/genai` (dependency en package.json) se está bundlando — parece no usarse en código y agrega peso.

---

#### [PERF-003] Imágenes sin lazy loading ni formato moderno (webp/avif)

- **Severidad:** 🟡 **Media**
- **Ubicación:** Home, Productos, ProductDetail, Tienda.
- **Hallazgo:** `<img src="/Productos/..." />` sin `loading="lazy"`, sin `srcset`, todas JPG/PNG.
- **Por qué importa (sustento):** la carpeta `/Productos/` y `/img/` contienen las imágenes oficiales (vistas en `git status`). En desktop saturan bandwidth; en mobile pegan a LCP.
- **Implicación / afectación:** Lighthouse Performance probablemente <70.
- **Sugerencia:**
  1. Convertir a WebP con `sharp` o `@squoosh/cli` (build step).
  2. `<img loading="lazy" decoding="async" width=… height=…>` (height para evitar CLS).
  3. Considerar Cloudflare Images o Vercel/Netlify image optimization.

---

#### [PERF-004] N+1 al cargar comisiones con origen

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/dashboard/MisComisiones.tsx](src/pages/dashboard/MisComisiones.tsx) (Detalle por comisión hace fetch del origen profile)
- **Hallazgo:** Por cada comisión se hace un fetch separado del profile del origen.
- **Por qué importa (sustento):** 50 comisiones → 50 queries.
- **Implicación / afectación:** carga lenta del detalle/modal.
- **Sugerencia:** usar join: `select *, origen:profiles!origen_id(nombre_completo, codigo_distribuidor)`.

---

#### [PERF-005] `Promise.all` ayuda pero la mayoría de queries son secuenciales

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/pages/dashboard/Overview.tsx:68-78](src/pages/dashboard/Overview.tsx#L68-L78)
- **Hallazgo:** Overview sí usa `Promise.all` (bueno). Otras páginas como `MiRed`, `AdminDashboard` (no inspeccionado) podrían no hacerlo.
- **Por qué importa (sustento):** mejorar latencia percibida.
- **Implicación / afectación:** carga más lenta.
- **Sugerencia:** auditar cada `useEffect` con múltiples queries y meter en `Promise.all`.

---

#### [PERF-006] Refetch innecesario en `Overview` por dependencia `[user]`

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/pages/dashboard/Overview.tsx:104](src/pages/dashboard/Overview.tsx#L104)
- **Hallazgo:** `useEffect(load, [user])` — si `user` cambia de referencia (no contenido), refetch. Como `user` es `User | null` del Auth context, puede cambiar de instancia tras `signOut/signIn`.
- **Por qué importa (sustento):** OK funcionalmente, pero usar `[user?.id]` es más estable.
- **Implicación / afectación:** marginal.
- **Sugerencia:** `[user?.id]`.

---

### 3.5 UX y diseño visual (UX)

---

#### [UX-001] Acciones destructivas sin confirmación final

- **Severidad:** 🟡 **Media**
- **Ubicación:**
  - [src/pages/admin/SolicitudDetalle.tsx:729](src/pages/admin/SolicitudDetalle.tsx#L729) — botón "Aprobar" abre modal pero no pide confirmar "¿Estás seguro? Esto creará usuario, comisiones, etc."
  - [src/pages/admin/AdminPedidos.tsx:617-625](src/pages/admin/AdminPedidos.tsx#L617-L625) — cambio de estado con `<select>`, basta un cambio accidental.
- **Hallazgo:** Cambiar estado de pedido a "cancelado" o aprobar afiliado son irreversibles desde la UI. El select del estado no confirma.
- **Por qué importa (sustento):** un clic equivocado del admin cancela una venta o aprueba a alguien no debido. No hay "Deshacer".
- **Implicación / afectación:** corrupciones manuales, recreo de datos por SQL directo.
- **Sugerencia:**
  1. Modal de confirmación con resumen ("Vas a aprobar a Juan Pérez con paquete Líder ($525). Esto creará usuario y comisiones por X. ¿Confirmar?").
  2. Para estado de pedido, mostrar diff y pedir motivo (especialmente para cancelar).
  3. Toast con "Deshacer" (5 segundos) que revierte si está antes de las escrituras hijas.

---

#### [UX-002] Modal de detalle de pedido no se cierra con ESC ni con click fuera consistente

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/admin/AdminPedidos.tsx:105-209](src/pages/admin/AdminPedidos.tsx#L105-L209)
- **Hallazgo:** No hay `keydown` listener para ESC; el clic en backdrop no cierra (no se ve handler `onClick` en el div padre).
- **Por qué importa (sustento):** patrón universal esperado.
- **Implicación / afectación:** UX confusa, accesibilidad pobre.
- **Sugerencia:** componente `<Modal/>` reutilizable con focus trap + ESC + click-outside + `aria-modal="true"` + bloqueo de scroll del body.

---

#### [UX-003] Sin breadcrumbs ni "volver" consistente

- **Severidad:** 🟡 **Media**
- **Ubicación:** Páginas admin/distribuidor con sub-navegación.
- **Hallazgo:** `SolicitudDetalle` tiene flecha "atrás" hardcoded a `/admin/solicitudes`. Si llegan desde otra ruta (ej. dashboard → notificación) no respeta el contexto.
- **Por qué importa (sustento):** navegación intuitiva.
- **Implicación / afectación:** desorientación.
- **Sugerencia:** usar `navigate(-1)` o componente breadcrumb dinámico basado en ruta.

---

#### [UX-004] Mensajes de error técnicos visibles al usuario

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/dashboard/NuevoPedido.tsx:167-176](src/pages/dashboard/NuevoPedido.tsx#L167-L176)
- **Hallazgo:** Mensajes como "Contacta al administrador para que ejecute la migración SQL '004b_voucher_bucket_fix.sql'" se muestran al distribuidor.
- **Por qué importa (sustento):** el distribuidor no entiende ni puede actuar, y queda mala imagen.
- **Implicación / afectación:** percepción de fragilidad.
- **Sugerencia:** mensaje genérico al usuario ("Hubo un problema técnico, intenta más tarde o contacta soporte") + log al backend con detalles para el dev.

---

#### [UX-005] Inconsistencia visual: ProtectedRoute usa color verde diferente al sistema

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/components/ProtectedRoute.tsx:12](src/components/ProtectedRoute.tsx#L12)
- **Hallazgo:** Spinner `#00A86B` (verde brillante) vs `#1A4E26` (verde Sumak oscuro). Fondo `#0F0F0F` vs `#F4F7F5` del resto.
- **Por qué importa (sustento):** flash visual feo durante carga inicial.
- **Implicación / afectación:** detalle pero rompe coherencia de marca.
- **Sugerencia:** usar `#1A4E26` y fondo `#F4F7F5` igual al resto.

---

#### [UX-006] Loading states pobres (solo spinner global)

- **Severidad:** 🟡 **Media**
- **Ubicación:** Global.
- **Hallazgo:** Cuando una página carga datos, muestra un spinner gigante y oculta toda la UI. No hay skeletons que mantengan la estructura.
- **Por qué importa (sustento):** la "perceived performance" depende de mostrar estructura inmediata. Spinner se siente más lento.
- **Implicación / afectación:** UX subóptima.
- **Sugerencia:** componente `<Skeleton/>` con `animate-pulse` que dibuje cards/filas placeholder.

---

#### [UX-007] Sin notificación al distribuidor cuando se aprueba su afiliación

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/admin/SolicitudDetalle.tsx:340](src/pages/admin/SolicitudDetalle.tsx#L340) — `onSuccess(codigo, tempPassword)` solo muestra modal al admin.
- **Hallazgo:** El distribuidor aprobado **no recibe email** con sus credenciales. El admin debe copiarlas y mandárselas manualmente (probablemente por WhatsApp en claro — ver SEC-005).
- **Por qué importa (sustento):** flujo manual propenso a errores y filtración de credenciales.
- **Implicación / afectación:** lentitud operativa, riesgo de seguridad.
- **Sugerencia:**
  1. Enviar email con Supabase Edge Function + Resend/Sendgrid: "Bienvenido a Sumak, tu código es X y tu contraseña temporal es Y. Cámbiala en primer login en este link…"
  2. Considerar enviar password por SMS aparte para canal separado.

---

#### [UX-008] No hay vista de "Bandeja de notificaciones" ni alertas

- **Severidad:** 🟡 **Media**
- **Ubicación:** No existe.
- **Hallazgo:** Distribuidor no sabe cuándo: aprobaron su pedido, le pagaron comisión, alguien se afilió bajo él, subió de rango.
- **Por qué importa (sustento):** notificaciones son motor de engagement en MLM.
- **Implicación / afectación:** distribuidores pierden eventos relevantes.
- **Sugerencia:** tabla `notificaciones (user_id, tipo, mensaje, leida_at, created_at)` + dropdown en header con badge.

---

#### [UX-009] Mobile: tablas con scroll horizontal sin columna sticky

- **Severidad:** 🟡 **Media**
- **Ubicación:** `AdminPedidos`, `Solicitudes`, `Distribuidores`, `MisComisiones`.
- **Hallazgo:** Tablas anchas con `overflow-x-auto` pero la primera columna (nombre/ID) scrollea con el resto.
- **Por qué importa (sustento):** en mobile pierdes contexto al desplazar.
- **Implicación / afectación:** admin no puede operar desde celular eficientemente.
- **Sugerencia:**
  1. Columna izquierda con `position: sticky; left: 0; background: white`.
  2. Mejor aún: en mobile cambiar a layout de cards en lugar de tabla.

---

#### [UX-010] Carrito no muestra resumen al añadir desde la tienda (sin toast)

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/dashboard/Tienda.tsx](src/pages/dashboard/Tienda.tsx), [src/pages/dashboard/TiendaProducto.tsx](src/pages/dashboard/TiendaProducto.tsx)
- **Hallazgo:** Al agregar al carrito, el contador del header sube pero no hay confirmación visual ("Añadido al carrito ✓").
- **Por qué importa (sustento):** usuario no sabe si el click registró.
- **Implicación / afectación:** double-clicks, frustración.
- **Sugerencia:** toast (lib: `sonner` o `react-hot-toast`) en esquina inferior derecha.

---

#### [UX-011] Botón "Continuar al pago" abre directo el flujo de 15 min sin recordar al usuario que **debe** tener el dinero listo

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/pages/dashboard/NuevoPedido.tsx:1023-1031](src/pages/dashboard/NuevoPedido.tsx) (paso cart)
- **Hallazgo:** El sub-texto dice "Tendrás 15 minutos para transferir y subir el voucher" pero un usuario distraído da clic y arranca el timer sin haber abierto su app del banco.
- **Por qué importa (sustento):** muchos timers expiran por confusión, no por mala intención.
- **Implicación / afectación:** UX frustrante.
- **Sugerencia:** modal previo con checklist: "✓ Tengo mi app del banco lista", "✓ Tengo a mano el voucher digital". El timer arranca al "Estoy listo".

---

#### [UX-012] Color contrast: texto `#9CA3AF` sobre fondo `#F4F7F5`

- **Severidad:** 🟡 **Media**
- **Ubicación:** Recurrente en labels y meta info.
- **Hallazgo:** Ratio de contraste ~3.1:1, debajo de WCAG AA (4.5:1 para texto normal).
- **Por qué importa (sustento):** texto difícil de leer para visión normal, imposible para baja visión.
- **Implicación / afectación:** afecta accesibilidad y legibilidad general.
- **Sugerencia:** subir a `#6B7280` o `#4B5563` para metadata.

---

#### [UX-013] Empty states con iconos pero sin CTAs claros

- **Severidad:** 🟢 **Baja**
- **Ubicación:** Overview, MisPedidos, MisComisiones.
- **Hallazgo:** "Aún no tienes comisiones registradas." y nada más.
- **Por qué importa (sustento):** desperdicia oportunidad de guiar al usuario nuevo.
- **Implicación / afectación:** onboarding pobre.
- **Sugerencia:** sub-texto + CTA: "Empieza compartiendo tu link de referido [Ver mi código →]".

---

#### [UX-014] Hero rotativo del Home sin pausa al hover

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/pages/Home.tsx:84](src/pages/Home.tsx#L84)
- **Hallazgo:** Auto-rotate de 5s sin pausa al hover/focus. Si el usuario está leyendo, cambia.
- **Por qué importa (sustento):** UX frustrante, problema A11Y conocido (carruseles).
- **Implicación / afectación:** marginal.
- **Sugerencia:** pausa con `onMouseEnter` y reanudación con `onMouseLeave`.

---

#### [UX-015] Formulario de Contacto sin backend real

- **Severidad:** 🟠 **Alta**
- **Ubicación:** [src/pages/Contacto.tsx](src/pages/Contacto.tsx)
- **Hallazgo:** Submit del form solo cambia un state `submitted = true` y muestra "Mensaje enviado". El mensaje no llega a ningún lado.
- **Por qué importa (sustento):** leads inbound **se pierden**.
- **Implicación / afectación:** clientes potenciales y oportunidades de negocio descartadas silenciosamente.
- **Sugerencia:**
  1. Edge Function `submit-contact` que mande email al admin y guarde en tabla `contactos`.
  2. Reaplicar reCAPTCHA / Turnstile.
  3. Confirmación por email al remitente.

---

### 3.6 Accesibilidad (A11Y)

---

#### [A11Y-001] Modales sin focus trap, sin ESC, sin `role="dialog" aria-modal`

- **Severidad:** 🟡 **Media**
- **Ubicación:** Todos los modales (`ApproveModal`, `RejectModal`, `SuccessModal`, `DetalleModal` en `AdminPedidos`).
- **Hallazgo:** Implementación manual con `fixed inset-0`. Sin atributos ARIA, sin trap, sin restauración de foco al cerrar.
- **Por qué importa (sustento):** WCAG 2.1 SC 2.4.3 (orden de foco), SC 1.3.1 (info y relaciones).
- **Implicación / afectación:** usuarios con lectores de pantalla no entienden que se abrió un modal; usuarios de teclado pueden tabular por debajo.
- **Sugerencia:** usar Radix UI Dialog o React Aria Dialog (headless), o implementar focus trap propio (`useFocusTrap` hook).

---

#### [A11Y-002] Inputs sin focus ring visible

- **Severidad:** 🟡 **Media**
- **Ubicación:** Global. Inputs usan `focus:outline-none focus:border-[#1A4E26]`.
- **Hallazgo:** `outline-none` elimina anillo nativo y solo el borde cambia. Para usuarios con ceguera al verde, casi imperceptible.
- **Por qué importa (sustento):** WCAG SC 2.4.7 (foco visible).
- **Implicación / afectación:** navegación por teclado confusa.
- **Sugerencia:** agregar `focus:ring-2 focus:ring-[#1A4E26]/30 focus:ring-offset-1`.

---

#### [A11Y-003] Iconos decorativos como información

- **Severidad:** 🟢 **Baja**
- **Ubicación:** Recurrente con `lucide-react` icons sin `aria-hidden`.
- **Hallazgo:** Iconos como `<Star size={10} fill="currentColor"/>` junto al texto "Más Vendido". El lector anuncia el SVG.
- **Por qué importa (sustento):** ruido para usuarios de lectores.
- **Implicación / afectación:** A11Y.
- **Sugerencia:** `aria-hidden="true"` por defecto en iconos decorativos; `aria-label="…"` solo cuando el icono es el único contenido informativo del botón.

---

#### [A11Y-004] `lang` correcto pero sin atributos por sección

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [index.html:2](index.html#L2)
- **Hallazgo:** `<html lang="es">` está. Bien. Pero si en el futuro hay términos en inglés ("dashboard", "checkout") debería marcarse `<span lang="en">checkout</span>`.
- **Por qué importa (sustento):** pronunciación del TTS.
- **Implicación / afectación:** mínima.
- **Sugerencia:** preferir términos en español o etiquetar.

---

#### [A11Y-005] Tablas sin `<caption>` y sin `<th scope>`

- **Severidad:** 🟢 **Baja**
- **Ubicación:** Tablas en admin.
- **Hallazgo:** `<th>` simples sin `scope="col"`.
- **Por qué importa (sustento):** lectores de pantalla anuncian peor las tablas.
- **Implicación / afectación:** A11Y.
- **Sugerencia:** `scope="col"` en thead, `<caption className="sr-only">Pedidos</caption>`.

---

### 3.7 SEO y marketing (SEO)

---

#### [SEO-001] Cero metadata por ruta

- **Severidad:** 🟡 **Media**
- **Ubicación:** [index.html:1-28](index.html), todas las páginas.
- **Hallazgo:** Solo `<title>` global y vacío en meta. No hay `document.title` dinámico por ruta, ni OG, ni canonical.
- **Por qué importa (sustento):** SPA con un solo `index.html` para todas las URLs → indexación pobre.
- **Implicación / afectación:** invisibilidad en Google; previews feos en redes (WhatsApp, FB).
- **Sugerencia:**
  1. **Hook simple**: `useDocumentTitle(title)` que setea `document.title`.
  2. Para SEO real, **migrar a Next.js o Astro** o pre-renderizar las páginas públicas estáticas. SPA tipo CRA tiene tope técnico.
  3. Mientras tanto: agregar OG tags fijos en `index.html`:
     ```html
     <meta name="description" content="Sumak Vida Ecuador — productos naturales y oportunidad de negocio multinivel">
     <meta property="og:title" content="Sumak Ecuador">
     <meta property="og:description" content="...">
     <meta property="og:image" content="https://sumak.com.ec/og-cover.png">
     <meta property="og:url" content="https://sumak.com.ec">
     <link rel="canonical" href="https://sumak.com.ec/">
     ```

---

#### [SEO-002] Sin sitemap.xml ni robots.txt

- **Severidad:** 🟡 **Media**
- **Ubicación:** No existen.
- **Hallazgo:** Google no sabe qué páginas indexar.
- **Por qué importa (sustento):** crawl budget y descubrimiento.
- **Implicación / afectación:** menos páginas indexadas.
- **Sugerencia:** generar `public/sitemap.xml` con rutas públicas + producto detail; `public/robots.txt` con `Sitemap: …`.

---

#### [SEO-003] Productos sin Schema.org structured data

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/ProductDetail.tsx](src/pages/ProductDetail.tsx)
- **Hallazgo:** Sin JSON-LD de `Product`.
- **Por qué importa (sustento):** sin rich snippets (precio, stock, rating).
- **Implicación / afectación:** menor CTR desde Google.
- **Sugerencia:** insertar `<script type="application/ld+json">` con `@type: Product` por cada slug.

---

#### [SEO-004] URLs SPA pueden romperse al refrescar (GitHub Pages)

- **Severidad:** 🟡 **Media**
- **Ubicación:** [index.html:11-22](index.html#L11) — `SPA redirect handler` para GitHub Pages.
- **Hallazgo:** El hack funciona pero hace que las URLs visibles tengan `?/...` brevemente.
- **Por qué importa (sustento):** GitHub Pages no entiende rutas SPA. La solución actual es un workaround conocido pero feo.
- **Implicación / afectación:** menor confianza en URLs compartidas.
- **Sugerencia:** migrar a Vercel/Netlify/Cloudflare Pages que soportan SPA fallback nativo.

---

#### [SEO-005] Sin Open Graph image dedicada

- **Severidad:** 🟢 **Baja**
- **Ubicación:** No existe.
- **Hallazgo:** Al compartir link no hay imagen preview.
- **Por qué importa (sustento):** CTR en redes.
- **Implicación / afectación:** marketing.
- **Sugerencia:** generar `public/og-cover.png` 1200x630 con logo + tagline.

---

### 3.8 Código y mantenibilidad (COD)

---

#### [COD-001] Funciones de badge/estado duplicadas en 7+ archivos

- **Severidad:** 🟡 **Media**
- **Ubicación:** `estadoBadge()`, `ESTADO_LABELS` en `Overview.tsx`, `MisComisiones.tsx`, `MisPedidos.tsx`, `AdminPedidos.tsx`, `SolicitudDetalle.tsx`, etc.
- **Hallazgo:** Mismo objeto de colores y labels copiado.
- **Por qué importa (sustento):** cambiar un color de estado requiere editar 7 lugares.
- **Implicación / afectación:** drift visual entre páginas.
- **Sugerencia:** `src/lib/badges.ts` con exports compartidos.

---

#### [COD-002] Magic numbers de descuento y puntos

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/dashboard/Tienda.tsx:20](src/pages/dashboard/Tienda.tsx#L20) y `TiendaProducto.tsx`, `data.ts`
- **Hallazgo:** `DISCOUNT = 0.5`, puntos = `Math.round(precio)`. Sin docs.
- **Por qué importa (sustento):** la "regla de negocio" está oculta en el código.
- **Implicación / afectación:** difícil cambiar el plan.
- **Sugerencia:** centralizar en `data.ts`:
  ```ts
  export const planConfig = {
    descuentoDistribuidor: 0.5,
    puntosPorDolar: 1,
    minActivacionMensual: 100,
    porcentajeReferido: 0.40,
  };
  ```

---

#### [COD-003] Colores hardcoded en cada componente

- **Severidad:** 🟡 **Media**
- **Ubicación:** Global. `#1A4E26`, `#D4AF37`, `#0F2E18`, `#2B6E3A`, `#0B2913`, `#EBF4ED`, `#F4F7F5`, `#C8D8CB`…
- **Hallazgo:** No hay design tokens (variables CSS o `theme.extend.colors` en Tailwind config).
- **Por qué importa (sustento):** rebrand o ajuste visual requiere búsqueda y reemplazo en decenas de archivos.
- **Implicación / afectación:** drift visual.
- **Sugerencia:** definir en `tailwind.config` (o `@theme` en Tailwind v4):
  ```css
  @theme {
    --color-brand-green-900: #0F2E18;
    --color-brand-green-700: #1A4E26;
    --color-brand-green-500: #2B6E3A;
    --color-brand-gold: #D4AF37;
    --color-brand-bg: #F4F7F5;
  }
  ```
  Usar `bg-brand-green-700` en lugar de `bg-[#1A4E26]`.

---

#### [COD-004] Sin linter ni formateador configurado

- **Severidad:** 🟡 **Media**
- **Ubicación:** `package.json:11` — `"lint": "tsc --noEmit"` (solo type-check).
- **Hallazgo:** No hay ESLint ni Prettier.
- **Por qué importa (sustento):** estilo inconsistente, bugs detectables no detectados.
- **Implicación / afectación:** drift de calidad.
- **Sugerencia:** ESLint con `@typescript-eslint`, `react-hooks/exhaustive-deps`, Prettier; pre-commit con `husky` + `lint-staged`.

---

#### [COD-005] Sin tests automatizados

- **Severidad:** 🟡 **Media**
- **Ubicación:** Global.
- **Hallazgo:** Cero tests unitarios, de integración o e2e.
- **Por qué importa (sustento):** cada cambio puede romper algo sin que nadie se entere hasta producción.
- **Implicación / afectación:** regresiones frecuentes.
- **Sugerencia:**
  1. **Vitest** para lógica pura (cart, comisiones, validadores).
  2. **Playwright** para e2e de flujos críticos (registro, login, hacer pedido, aprobar afiliado).

---

#### [COD-006] Componentes monolíticos

- **Severidad:** 🟡 **Media**
- **Ubicación:** [src/pages/Home.tsx](src/pages/Home.tsx) ~840 líneas, [src/pages/ProductDetail.tsx](src/pages/ProductDetail.tsx) ~830, [src/pages/dashboard/NuevoPedido.tsx](src/pages/dashboard/NuevoPedido.tsx) ~1067.
- **Hallazgo:** Page components mezclan layout, queries, lógica de negocio y JSX denso.
- **Por qué importa (sustento):** difícil leer, reutilizar y testear.
- **Implicación / afectación:** velocidad de desarrollo cae.
- **Sugerencia:** extraer sub-componentes a `src/components/home/Hero.tsx`, `BankSelector.tsx`, `VoucherUploader.tsx`, etc.

---

#### [COD-007] Tipos `any` y `unknown` con casts vagos

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/pages/admin/AdminPedidos.tsx:236-244](src/pages/admin/AdminPedidos.tsx#L236-L244) — `(r: Record<string, unknown>)` + casts.
- **Hallazgo:** Pérdida de type safety porque Supabase no genera tipos automáticamente.
- **Por qué importa (sustento):** errores en runtime al cambiar schema.
- **Implicación / afectación:** bugs sutiles.
- **Sugerencia:** `supabase gen types typescript --project-id ...` y commit del archivo `database.types.ts`.

---

#### [COD-008] Sin documentación interna (README de cómo correr, deploy, env vars)

- **Severidad:** 🟡 **Media**
- **Ubicación:** No hay README.md.
- **Hallazgo:** Documentos `.md` existentes (`GUIA_PLATAFORMA.md`, `INGREDIENTES_LISTA.md`) son de contenido, no técnicos.
- **Por qué importa (sustento):** nuevo dev tarda en arrancar.
- **Implicación / afectación:** bus factor 1.
- **Sugerencia:** README.md con: setup, env vars requeridas, comandos npm, estructura, flujo de deploy.

---

#### [COD-009] `console.error` en producción

- **Severidad:** 🟢 **Baja**
- **Ubicación:** Múltiples (`catch (err) { console.error(err) }`).
- **Hallazgo:** Logs aparecen en DevTools de usuarios; no se reportan.
- **Por qué importa (sustento):** dispersión, no observabilidad.
- **Implicación / afectación:** sin visibilidad de errores reales.
- **Sugerencia:** wrapper `logError(err)` que en dev hace console.error y en prod manda a Sentry.

---

#### [COD-010] Diferencias menores entre `AdminLayout` y `DashboardLayout` que podrían unificarse

- **Severidad:** 🟢 **Baja**
- **Ubicación:** [src/components/AdminLayout.tsx](src/components/AdminLayout.tsx), [src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx)
- **Hallazgo:** ~80% duplicado: sidebar, mobile drawer, header. Diferencia: items del menú, badge del paquete, badge del carrito.
- **Por qué importa (sustento):** mantener cambios sincronizados.
- **Implicación / afectación:** drift.
- **Sugerencia:** componente `<AppLayout navItems badges/>` parametrizado.

---

#### [COD-011] Clases Tailwind largas y repetidas

- **Severidad:** 🟢 **Baja**
- **Ubicación:** Global. Patrones como `rounded-2xl border border-[#C8D8CB] bg-white p-5` aparecen ~200 veces.
- **Hallazgo:** Sin `@apply` ni componentes base.
- **Por qué importa (sustento):** HTML pesado, difícil cambiar el "look" de las cards.
- **Implicación / afectación:** mantenibilidad.
- **Sugerencia:** componentes base `<Card/>`, `<Button/>`, `<Input/>` con variantes (lib: cva o tailwind-variants).

---

### 3.9 Operaciones y DevOps (OPS)

---

#### [OPS-001] Sin pipeline de CI/CD

- **Severidad:** 🟡 **Media**
- **Ubicación:** No hay `.github/workflows/`.
- **Hallazgo:** Cada deploy es manual (`npm run build` y push a `gh-pages`?).
- **Por qué importa (sustento):** sin verificación pre-deploy, regresiones pasan.
- **Implicación / afectación:** confiabilidad.
- **Sugerencia:**
  - GitHub Actions: en cada PR ejecutar `npm run lint` + tipo `tsc --noEmit` + (futuros) tests.
  - Deploy automático en push a `main`.

---

#### [OPS-002] Sin entornos separados (dev / staging / prod)

- **Severidad:** 🟡 **Media**
- **Ubicación:** Probable: solo un proyecto Supabase.
- **Hallazgo:** No hay evidencia de Supabase branching o proyecto staging.
- **Por qué importa (sustento):** cualquier prueba afecta data real.
- **Implicación / afectación:** miedo a iterar.
- **Sugerencia:** crear proyecto Supabase de staging; usar `.env.staging` y deploy preview en Vercel/Netlify.

---

#### [OPS-003] Migraciones SQL ejecutadas manualmente en SQL Editor

- **Severidad:** 🟡 **Media**
- **Ubicación:** Comentarios de las migraciones dicen "Pégalo entero en el SQL Editor de Supabase".
- **Hallazgo:** No usan `supabase db push` ni CLI.
- **Por qué importa (sustento):** sin trazabilidad de qué se corrió en qué entorno y cuándo.
- **Implicación / afectación:** migraciones olvidadas, ambientes desincronizados.
- **Sugerencia:** instalar Supabase CLI, init proyecto local, `supabase migration new`, `supabase db push` controlado por CI.

---

#### [OPS-004] Sin monitoreo ni alertas

- **Severidad:** 🟡 **Media**
- **Ubicación:** Global.
- **Hallazgo:** Si la app cae o hay errores, nadie se entera hasta que un usuario reporta.
- **Por qué importa (sustento):** SLO no observado.
- **Implicación / afectación:** downtime prolongado.
- **Sugerencia:**
  - Uptime: BetterStack/UptimeRobot (free).
  - Errores: Sentry (free 5k events/mes).
  - Logs Supabase: alertas por `supabase logs --tail` o webhooks.

---

#### [OPS-005] Sin política de backup verificado

- **Severidad:** 🟡 **Media**
- **Ubicación:** Supabase hace backups automáticos en plan Pro, pero no se mencionan restores de prueba.
- **Hallazgo:** Asumimos que existe pero nunca se ha probado restaurar.
- **Por qué importa (sustento):** un backup que no se restaura no es backup.
- **Implicación / afectación:** ante incidente puede no haber respaldo.
- **Sugerencia:** mensualmente restaurar a staging y validar integridad.

---

#### [OPS-006] Archivos sensibles potencialmente en repo

- **Severidad:** 🟢 **Baja**
- **Ubicación:** `git status` muestra `Productos/`, `img/`, PDFs y MDs sueltos no comiteados.
- **Hallazgo:** Hay material corporativo (`Plan de Implementacion - SUMAK.pdf`, `Propuesta de Costos - SUMAK.pdf`, `Revista Sumak 2026.pdf`) que probablemente no debería commitearse.
- **Por qué importa (sustento):** repos públicos exponen material interno.
- **Implicación / afectación:** filtración de plan estratégico.
- **Sugerencia:** revisar visibilidad del repo. Agregar a `.gitignore`:
  ```
  *.pdf
  Productos/
  img/
  ```
  Mover el material corporativo a Drive privado, dejar solo lo necesario para la web en `public/`.

---

#### [OPS-007] Sin política de rotación de secrets

- **Severidad:** 🟡 **Media**
- **Ubicación:** General.
- **Hallazgo:** Dado SEC-001, la Service Role Key probablemente está en bundles publicados desde hace semanas. Rotarla ahora.
- **Por qué importa (sustento):** mitigación inmediata.
- **Implicación / afectación:** ver SEC-001.
- **Sugerencia:** rotar todas las API keys de Supabase, JWT secret, y volver a desplegar (con la versión sin Service Key).

---

## 4. Recomendaciones priorizadas

### Sprint 1 (urgente — 1 semana)

| Orden | Acción | Hallazgo |
|---|---|---|
| 1 | **Rotar Service Role Key de Supabase** | SEC-001 |
| 2 | Quitar `VITE_SUPABASE_SERVICE_ROLE_KEY` del cliente; mover operaciones admin a Edge Functions | SEC-001 |
| 3 | Implementar Edge Function `submit-pedido` que calcule total/puntos/comisiones server-side | BIZ-001 |
| 4 | Cerrar política RLS de `profiles` a `id = auth.uid() or is_admin()` y crear vista pública | SEC-003 |
| 5 | Convertir `handleApprove` (aprobación de afiliado) en una RPC transaccional | SEC-002 |
| 6 | Wirear formulario de Contacto a un destino real (Edge Function + email) | UX-015 |

### Sprint 2 (alta — 2 semanas)

| Orden | Acción | Hallazgo |
|---|---|---|
| 7 | Cancelación de pedido revierte comisiones por `pedido_id` (no por ventana de tiempo) | BIZ-002 |
| 8 | Implementar comisiones binarias (Edge Function mensual) | BIZ-009 |
| 9 | Implementar progresión de rango/escalera con bonos | BIZ-010 |
| 10 | Paginación server-side en `Distribuidores`, `AdminPedidos`, `MisComisiones`, `MiRed` | PERF-001 |
| 11 | Headers de seguridad (CSP, etc.) — migrar a Vercel/Netlify | SEC-006 |
| 12 | Email automático con credenciales al aprobar afiliado | UX-007, SEC-005 |
| 13 | Confirmaciones en acciones destructivas + log de auditoría | UX-001, BIZ-012 |

### Sprint 3 (medio — 3-4 semanas)

| Orden | Acción | Hallazgo |
|---|---|---|
| 14 | Code-splitting por ruta + chunk manual | PERF-002 |
| 15 | Optimización de imágenes (WebP, lazy) | PERF-003 |
| 16 | Modal accesible con focus trap + ESC | A11Y-001, UX-002 |
| 17 | Linter + Prettier + GitHub Actions CI | COD-004, OPS-001 |
| 18 | Tests unitarios + e2e de flujos críticos | COD-005 |
| 19 | Design tokens centralizados | COD-003 |
| 20 | React Query para gestión de estado server | ARQ-007 |
| 21 | SEO básico: meta tags, sitemap, robots, OG | SEO-001/002/005 |

### Sprint 4 (mejoras continuas)

| Orden | Acción | Hallazgo |
|---|---|---|
| 22 | Sistema de notificaciones in-app | UX-008 |
| 23 | Gestión de inventario / stock | BIZ-011 |
| 24 | Tipos generados de Supabase | COD-007 |
| 25 | Refactor a rutas anidadas de React Router | ARQ-005 |
| 26 | Validación de cédula EC | BIZ-014 |
| 27 | Migración a Next.js/Astro para SEO real | SEO-001 |
| 28 | Tablas → cards en mobile | UX-009 |
| 29 | Captcha en login y registro | SEC-007 |
| 30 | Monitoreo (Sentry, Uptime) | OPS-004 |

---

## 5. Anexos

### 5.1 Resumen visual de severidades

```
🔴 Crítica  ████░░░░░░░░░░░░░░░░  3
🟠 Alta     ████████████████░░░░ 18
🟡 Media    ██████████████████████████████░░░ 32
🟢 Baja     ████████████████████░ 21
                                  ── Total: 74
```

### 5.2 Mapa de hallazgos por archivo (top 10)

| Archivo | # Hallazgos | Severidad máxima |
|---|---|---|
| `src/lib/supabase.ts` | 1 | 🔴 Crítica |
| `src/pages/dashboard/NuevoPedido.tsx` | 7 | 🟠 Alta |
| `src/pages/admin/SolicitudDetalle.tsx` | 6 | 🟠 Alta |
| `src/pages/admin/AdminPedidos.tsx` | 5 | 🟠 Alta |
| `src/pages/dashboard/MiRed.tsx` | 3 | 🟠 Alta |
| `src/lib/auth.tsx` | 2 | 🟢 Baja |
| `src/lib/cart.tsx` | 2 | 🟠 Alta |
| `index.html` | 4 | 🟡 Media |
| `src/App.tsx` | 3 | 🟢 Baja |
| `supabase/migrations/002_*.sql` | 1 | 🟠 Alta |

### 5.3 Referencias técnicas recomendadas

- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase RLS best practices**: https://supabase.com/docs/guides/auth/row-level-security
- **OWASP Top 10 (2021)**: https://owasp.org/Top10/
- **WCAG 2.1 AA quick checklist**: https://www.w3.org/WAI/WCAG21/quickref/
- **LOPDP Ecuador (Ley Orgánica de Protección de Datos Personales)**: https://www.telecomunicaciones.gob.ec/proteccion-datos-personales/
- **React Aria (componentes accesibles headless)**: https://react-spectrum.adobe.com/react-aria/
- **TanStack Query**: https://tanstack.com/query/latest

### 5.4 Glosario

| Término | Definición rápida |
|---|---|
| **RLS** | Row-Level Security. Reglas SQL que filtran qué filas puede ver/modificar cada usuario. |
| **PII** | Personally Identifiable Information. Datos personales identificables (cédula, dirección). |
| **LOPDP** | Ley Orgánica de Protección de Datos Personales (Ecuador, 2021). |
| **CSP** | Content Security Policy. Header HTTP que limita orígenes de scripts/imágenes. |
| **CLS** | Cumulative Layout Shift. Métrica Web Vitals de "saltos" de layout durante carga. |
| **LCP** | Largest Contentful Paint. Métrica Web Vitals de cuándo se ve lo principal. |
| **SC** | Success Criterion. Criterio numerado del estándar WCAG. |
| **ACID** | Atomicity, Consistency, Isolation, Durability. Propiedades de transacciones SQL. |
| **MLM** | Multi-Level Marketing. Modelo comercial multinivel. |

---

> **Cierre.** Este documento es un **diagnóstico**, no una solución. Cada hallazgo se puede convertir en uno o varios tickets. Recomiendo priorizar el Sprint 1 antes de invitar más distribuidores reales a usar la plataforma con dinero real, y atender el resto en backlog ordenado por impacto.
>
> *Auditoría realizada con lectura estática del repositorio en su estado de hoy. Cualquier cambio posterior debe ser re-evaluado.*
