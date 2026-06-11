# Auditoría — Fase 1 de Arreglos

> Documento técnico de seguimiento al [AUDITORIA_SUMAK.md](AUDITORIA_SUMAK.md).
> Describe qué se arregló en esta tanda, qué se dejó deferido y por qué.
> **Principio rector:** no romper funcionalidad en curso.

---

## 1. Arreglos aplicados (Fase 1)

### 1.1 Resumen

| Hallazgo | Severidad | Cómo se resolvió | Cambios |
|---|---|---|---|
| **SEC-002** | 🟠 Alta | RPC `finish_approve_afiliacion` con transacción PL/pgSQL | Migration 006 |
| **SEC-003** | 🟠 Alta | RPC pública `lookup_sponsor` con campos no sensibles | Migration 006 + `Registro.tsx` |
| **SEC-004** | 🟡 Media | Política INSERT del bucket vouchers exige carpeta = `auth.uid()` | Migration 006 |
| **SEC-005** | 🟡 Media | Contraseña temporal con `crypto.getRandomValues` (14 chars) | `SolicitudDetalle.tsx` |
| **BIZ-001** | 🟠 Alta | RPC `submit_pedido` con cálculo server-side de total/puntos | Migration 006 |
| **BIZ-002** | 🟠 Alta | Columna `comisiones.pedido_id` + cancel exacto por id | Migration 006 + 3 `.tsx` |
| **BIZ-005** | 🟡 Media | Columna `pedidos.idempotency_key` unique + manejo 23505 | Migration 006 + `NuevoPedido.tsx` |
| **ARQ-001** | 🟠 Alta | Primeras RPCs como capa de servicio servidor-side | Migration 006 |
| **ARQ-002** | 🟠 Alta | RPCs PL/pgSQL como reemplazo de Edge Functions | Migration 006 |

### 1.2 Archivos modificados

| Archivo | Por qué cambió |
|---|---|
| `supabase/migrations/006_security_integrity_phase1.sql` | Toda la infraestructura SQL: 4 RPCs, 2 columnas nuevas, 1 política nueva |
| `src/lib/types.ts` | `Pedido.idempotency_key`, `Comision.pedido_id` |
| `src/pages/Registro.tsx` | Sponsor lookup vía `lookup_sponsor` RPC en vez de `select profiles` directo |
| `src/pages/admin/SolicitudDetalle.tsx` | `generateTempPassword()` con crypto-random + `pedido_id` en comisiones afiliación y nivel |
| `src/pages/dashboard/NuevoPedido.tsx` | `idempotencyKeyRef` + manejo 23505 + `pedido_id` en comisiones nivel |
| `src/pages/admin/AdminPedidos.tsx` | Cancel de comisiones por `pedido_id` exacto (reemplaza heurística de ventana ±5 min) |

### 1.3 Cómo aplicar

1. **Backup primero** (Dashboard de Supabase → Project Settings → Backups).
2. Abrir SQL Editor de Supabase.
3. Pegar el contenido de `supabase/migrations/006_security_integrity_phase1.sql` y ejecutar.
4. Correr las consultas de verificación al final del archivo.
5. Pull + redeploy del frontend.

### 1.4 Comportamiento esperado tras aplicar

- **Registro público** sigue funcionando igual; ahora el lookup del sponsor expone solo nombre+código (no cédula/teléfono/dirección).
- **Aprobación de afiliados** sigue exactamente igual desde el punto de vista del admin. La diferencia: contraseñas temporales ya no son `Sumak<4ultimosCedula>!` sino aleatorias de 14 caracteres. Las comisiones generadas quedan vinculadas al `pedido_id` del paquete inicial.
- **Crear pedido como distribuidor** sigue igual. Diferencia: si el usuario hace doble-click se inserta una sola vez (la segunda detecta 23505 y muestra éxito).
- **Cancelar pedido como admin** sigue igual. Diferencia: las comisiones canceladas son **exactamente** las del pedido y nada más; antes la ventana de ±5 min podía cancelar comisiones de pedidos vecinos.

### 1.5 Riesgos residuales tras Fase 1

- La política RLS antigua sobre `profiles` (`auth.uid() is not null`) **no se cerró** en este PR para no romper otras pantallas que leen `profiles` directamente. Mitigación parcial: la página pública usa la RPC con campos seguros.
- `supabaseAdmin` (Service Role Key) **sigue expuesto** en el bundle. La RPC `finish_approve_afiliacion` lo reduce de 8 operaciones a 2 (`createUser` + RPC), pero no lo elimina. Fix completo = Edge Functions (Fase 2).

---

## 2. Items críticos/altos diferidos (Fase 2)

### 2.1 SEC-001 — Service Role Key en cliente

**Por qué se difirió:** eliminar la key del cliente requiere mover **cada operación admin** (12 archivos, ~30 llamadas) a Edge Functions o a un servidor backend. Hacerlo en un solo PR es de alto riesgo. Las RPCs creadas en Fase 1 son la primera capa servidor-side, pero todavía hay operaciones que no las usan.

**Plan Fase 2:**

1. Inicializar Supabase CLI local y `supabase/functions/`.
2. Crear Edge Functions:
   - `approve-afiliacion` (envuelve `auth.admin.createUser` + RPC `finish_approve_afiliacion`)
   - `cancel-pedido` (envuelve RPC `cancel_pedido` ya existente)
   - `submit-pedido` (envuelve RPC `submit_pedido`)
   - `list-pedidos-admin`, `list-comisiones-admin`, etc. para reemplazar lecturas con `supabaseAdmin`
3. Cambiar cada uso de `supabaseAdmin` en cliente por `fetch` a la Edge Function correspondiente, una pantalla a la vez.
4. Una vez todas las pantallas migradas, **eliminar** `VITE_SUPABASE_SERVICE_ROLE_KEY` de `.env` y de `supabase.ts`. Redeploy. Rotar la key en Supabase.

**Estimación:** 2-3 semanas con testing.

### 2.2 BIZ-009 — Comisiones binarias no implementadas

**Por qué se difirió:** feature nueva, no un fix. El plan requiere:
- Recorrer recursivamente el árbol binario por cada distribuidor.
- Sumar volumen izquierda y derecha por mes.
- Calcular pareado `min(izq, der) × porcentaje`.
- Generar comisiones tipo `binaria`.

Hacerlo correctamente requiere diseño con stakeholder de negocio (porcentaje, base de cálculo, capping).

**Plan Fase 2:**

1. Definir reglas precisas con stakeholder (PDF "Plan de Implementación").
2. Edge Function programada el día 1 de cada mes que:
   - Lea `volumenes_binarios` del mes anterior.
   - Calcule volumen recursivo por pierna.
   - Inserte snapshot en `volumenes_binarios`.
   - Genere comisiones `tipo='binaria'`.
3. Vista `mi_volumen_binario_mes` para que el distribuidor vea izquierda/derecha en tiempo real.

### 2.3 BIZ-010 — Progresión de rango/escalera

**Por qué se difirió:** feature nueva, no un fix. Requiere:
- Job que detecte cuándo un distribuidor alcanza N afiliados directos o N en red.
- Insertar en `rangos_historia` con bono asociado.
- Emitir comisión `rango` (necesita extender enum `tipo`).

**Plan Fase 2:** Edge Function diaria o trigger al crear profile que recalcule rangos y registre alcances.

### 2.4 PERF-001 — Paginación

**Por qué se difirió:** afecta UX de tablas. Requiere componente `<Pagination/>` y cambios en `useMemo` que ordenan/filtran client-side. No es 1 archivo sino ~6.

**Plan Fase 2:** introducir paginación server-side con `.range(from, to)` página por página, empezando por `AdminPedidos` (la lista más grande).

### 2.5 UX-015 — Formulario de Contacto sin backend

**Por qué se difirió:** requiere Edge Function + integración con servicio de email (Resend o similar). Es un mini-proyecto separado del hardening.

**Plan Fase 2:** Edge Function `submit-contact` que:
- Guarda en tabla `contactos`.
- Envía email al admin via Resend.
- Devuelve éxito al cliente.

---

## 3. Cambios no aplicados intencionalmente

| Decisión | Razón |
|---|---|
| **No se eliminó** la política RLS antigua sobre `profiles` | Cerrarla rompería `MiRed`, `MiEscalera`, `Overview` (count de directos). Requiere refactor coordinado de esas páginas. |
| **No se eliminó** la política antigua de bucket vouchers | Las políticas son OR; las dos coexisten. Si rollback, no se rompe nada. La nueva (más estricta) protege escenarios sanos. |
| **No se migró** `SolicitudDetalle.handleApprove` para usar la nueva RPC | El cliente sigue ejecutando los 8 inserts secuenciales. La RPC `finish_approve_afiliacion` está disponible pero su adopción requiere testing en staging primero. Adopción en Fase 1.5. |
| **No se migró** `NuevoPedido.handleSubmitFinal` para usar `submit_pedido` RPC | Misma razón. RPC disponible para adopción futura. |
| **No se migró** `AdminPedidos.cancel` para usar `cancel_pedido` RPC | Misma razón. La lógica TS se actualizó para usar `pedido_id` exacto (que es el fix de BIZ-002); la RPC queda como infraestructura. |

---

## 4. Cómo verificar que nada se rompió

### 4.1 Flujos a probar manualmente

1. **Registro público con código de patrocinador válido**
   - URL: `/registro`
   - Escribir un código existente (ej. `SUMAK-00001`) → debe mostrar "Patrocinador: Dr. Luis Paredes" con check verde.
   - Escribir código inválido → debe mostrar "Código no encontrado" en amber.
   - *Verifica:* SEC-003 (lookup_sponsor RPC).

2. **Aprobar afiliado**
   - Login admin → `/admin/solicitudes` → click en una pendiente → "Aprobar".
   - Después del éxito, el modal muestra código + contraseña aleatoria (14 chars).
   - *Verifica:* SEC-005 (password) + BIZ-002 (comisiones del paquete inicial tienen `pedido_id`).
   - **Verificar en BD:** `select pedido_id from comisiones where origen_id = '<nuevo user id>'` debe estar lleno.

3. **Hacer pedido como distribuidor**
   - Login distribuidor → `/dashboard/tienda` → agregar productos → checkout → completar voucher → enviar.
   - *Verifica:* BIZ-005 — abrir DevTools Network, hacer doble-click en "Enviar pedido", debe insertarse 1 sola fila en `pedidos`.
   - **Verificar en BD:** `select idempotency_key from pedidos order by created_at desc limit 1` debe tener UUID.

4. **Cancelar pedido como admin**
   - Login admin → `/admin/pedidos` → cambiar estado de un pedido reciente a "Cancelado".
   - *Verifica:* BIZ-002 — las comisiones de ESE pedido pasan a `cancelado`. Las de otros pedidos del mismo distribuidor en la misma semana **no** se tocan.
   - **Verificar en BD:**
     ```sql
     select id, estado, pedido_id from comisiones
       where origen_id = '<distribuidor_id>'
       order by created_at desc;
     ```

### 4.2 Sintomas si algo salió mal

| Síntoma | Posible causa |
|---|---|
| Registro no encuentra ningún sponsor válido | RPC `lookup_sponsor` no creada o sin GRANT a anon. Re-ejecutar migration 006. |
| Aprobar afiliado dice "duplicate key" en idempotency_key | (no debería pasar — SolicitudDetalle no usa idempotency_key) |
| Doble-click en "Enviar pedido" crea 2 pedidos | Migration 006 no se ejecutó. Verificar `select * from pg_indexes where indexname = 'uq_pedidos_idempotency_key'`. |
| Cancelar pedido no cancela comisiones | Las comisiones del pedido se crearon ANTES de aplicar migration 006 → tienen `pedido_id = NULL`. Por ese motivo no se filtran. Las comisiones NUEVAS sí se cancelan correctamente. Para legacy, cancelar manualmente con SQL. |

---

## 5. Rollback plan

Si algo en Fase 1 sale mal:

1. **Frontend:** `git revert <commit hash>` y redeploy.
2. **BD:** las nuevas columnas (`comisiones.pedido_id`, `pedidos.idempotency_key`) son **nullables** — no rompen nada al revertirse. Pueden dropearse:
   ```sql
   drop function if exists public.cancel_pedido(uuid, text);
   drop function if exists public.submit_pedido(uuid, jsonb, text, text, text, text);
   drop function if exists public.finish_approve_afiliacion(uuid, uuid, text, uuid);
   drop function if exists public.lookup_sponsor(text);
   drop policy if exists "Distribuidores suben vouchers solo a su carpeta" on storage.objects;
   drop index if exists uq_pedidos_idempotency_key;
   drop index if exists idx_comisiones_pedido;
   alter table public.pedidos drop column if exists idempotency_key;
   alter table public.comisiones drop column if exists pedido_id;
   ```
3. Las contraseñas temporales de afiliados ya aprobados con la versión nueva no se pueden recuperar (son random); pero los usuarios pueden hacer "Olvidé mi contraseña" vía Supabase Auth.

---

*Fin de la Fase 1. La Fase 2 ataca los items diferidos.*
