# Guía del rol "operaciones"

> Documento operativo. Explica qué es el rol, cómo crearlo y cómo se comporta el sistema cuando ese usuario inicia sesión.

---

## 1. ¿Qué es?

Un tercer rol — junto a `admin` y `distribuidor` — que **delega la operación diaria** sin entregar las llaves completas del sistema.

| Área | Acceso |
|---|---|
| Pedidos | ✅ Ver todos, cambiar estado, cancelar |
| Comisiones | ✅ Ver todas, marcar como pagadas, cancelar |
| Solicitudes de afiliación | ✅ Ver, aprobar y rechazar |
| Distribuidores | ✅ Listar y ver detalle (suspender/activar) |
| **Mis Comisiones del admin** | ❌ Bloqueado por RLS — sólo el admin ve las suyas |
| **Red binaria completa (vista admin)** | ❌ No tiene route hacia `/admin/red` |
| **Promover otros usuarios** | ❌ La política de INSERT en `profiles` exige `rol='distribuidor'` |

El layout es visualmente parecido al de admin pero con badge azul `OPERACIONES` para distinguir.

---

## 2. Cómo se crea el usuario inicial

### Opción A — Vía Supabase Dashboard (recomendado para producción)

1. **Aplicar migración 007** desde el SQL Editor de Supabase para habilitar el rol:
   ```text
   supabase/migrations/007_rol_operaciones.sql
   ```
2. **Crear el usuario en Supabase Auth**:
   - Dashboard → Authentication → Users → "Add user" → "Create new user"
   - Email: el que prefieras (por ejemplo `operaciones@sumak.com.ec`)
   - Password: una contraseña fuerte que entregarás por canal seguro
   - Marca "Auto Confirm User" para que pueda iniciar sesión sin email de confirmación
3. **Asignarle rol y profile** — ejecutar este SQL en el SQL Editor, reemplazando el email:
   ```sql
   insert into public.profiles (
     id, codigo_distribuidor, nombre_completo, cedula, email,
     rol, estado, fecha_aprobacion
   )
   select
     u.id,
     'SUMAK-' || lpad((
       coalesce((select max(
         nullif(regexp_replace(codigo_distribuidor, '\D', '', 'g'), '')::int
       ) from public.profiles), 0) + 1
     )::text, 5, '0'),
     'Operaciones Sumak',
     'OPS-' || substr(u.id::text, 1, 8),
     u.email,
     'operaciones', 'activo', now()
   from auth.users u
   where u.email = 'operaciones@sumak.com.ec'
   on conflict (id) do update
     set rol = 'operaciones', estado = 'activo';
   ```

### Opción B — Vía script automático (más rápido pero requiere editar)

1. Aplicar migración 007.
2. Abrir `supabase/migrations/007b_seed_operaciones_user.sql`.
3. **Editar las dos líneas marcadas** con email y nombre que prefieras.
4. Ejecutar el SQL completo en el SQL Editor de Supabase.
5. Al final, el script imprime con `RAISE NOTICE` la contraseña aleatoria de 14 caracteres. **Cópiala** del panel de "Messages" / "Results" y guárdala en gestor de contraseñas.
6. Entrega la contraseña al usuario por canal seguro y pídele que la cambie en su primer login.

> Si el email ya existe en `auth.users`, el script sólo asegura que su profile tenga `rol='operaciones'`.

---

## 3. ¿Qué ve el usuario al iniciar sesión?

1. **Login normal** en `/login` con su email y contraseña.
2. El sistema detecta el rol `operaciones` y lo redirige a `/operaciones`.
3. Layout dedicado con sidebar de **5 secciones**:
   - **Dashboard** (`/operaciones`) — KPIs en tiempo real
   - **Solicitudes** (`/operaciones/solicitudes`)
   - **Distribuidores** (`/operaciones/distribuidores`)
   - **Comisiones** (`/operaciones/comisiones`)
   - **Pedidos** (`/operaciones/pedidos`)
4. El badge en el header dice **OPERACIONES** en azul cielo (vs el `ADMIN` dorado).

---

## 4. Dashboard del rol — qué muestra

Está diseñado para que un usuario de operaciones tenga toda la información de un vistazo:

| Bloque | Qué muestra |
|---|---|
| **4 KPIs principales** | Solicitudes pendientes (con badge "Atender" si hay > 0), pedidos por procesar, comisiones por pagar (monto), facturado del mes |
| **3 KPIs secundarios** | Comisiones pagadas del mes, distribuidores activos/suspendidos/nuevos, pedidos enviados pendientes de entregar |
| **Solicitudes pendientes (top 5)** | Nombre, email, paquete elegido, código de patrocinador y fecha — click va al detalle |
| **Pedidos por procesar (top 6)** | Distribuidor, código, total, estado, N° de voucher, banco destino y hora |
| **Atajos rápidos** | 4 botones grandes para ir directo a cada sección |
| **Recordatorios** | Flujo de estados de afiliación y pedido con descripción legible |
| **Tip operativo** | Buenas prácticas para evitar errores típicos |

---

## 5. Permisos detallados (RLS)

La migración 007 reescribe las políticas de `pedidos`, `comisiones`, `afiliaciones`, `profiles` y `red_binaria` usando el helper `public.is_operaciones_or_admin()`.

### Lectura
- Pedidos: el distribuidor sólo ve los suyos; admin/operaciones ven todos.
- Comisiones: igual — beneficiario ve las suyas; admin/operaciones ven todas.
- Afiliaciones: público puede crear (POST), sólo admin/operaciones leen.
- Profiles: cada uno ve el suyo, el admin ve todos, **operaciones sólo ve `rol='distribuidor'`** (no ve a otros admins/operaciones).
- Red binaria: admin/operaciones ven todo; el resto ve su propio nodo y sus hijos directos.

### Escritura
- **Profiles INSERT**: el rol que se inserta DEBE ser `'distribuidor'`. Esto impide que un usuario de operaciones cree otros admins desde la UI.
- **Profiles UPDATE**: cada uno puede actualizar el suyo; admin puede actualizar cualquiera; operaciones puede actualizar `rol='distribuidor'` (suspender, activar). No puede tocar profiles de admins.
- **Pedidos UPDATE**: admin y operaciones — cambio de estado, etc.
- **Comisiones**: admin y operaciones — todo.
- **Red binaria**: admin y operaciones — al aprobar afiliados se inserta el nodo.

### RPCs
- `finish_approve_afiliacion(...)` — sigue siendo `SECURITY DEFINER` con `GRANT EXECUTE TO authenticated`, así que admin y operaciones la pueden invocar (la UI del SolicitudDetalle ya la llama indirectamente vía los inserts del cliente).
- `cancel_pedido(...)` — actualizada: ahora acepta admin **u operaciones** (antes sólo admin).
- `submit_pedido(...)` — sin cambios, sólo distribuidor.

---

## 6. Cosas a tener en cuenta

1. **`fetchProfile` y código del cliente**: la pantalla de aprobar afiliados (`SolicitudDetalle`) usa internamente `supabaseAdmin` (service role) para los 8 inserts. Mientras SEC-001 esté abierto, esto sigue funcionando para ambos roles porque service role bypassa RLS. Cuando se migre a Edge Functions (Fase 2), allí también hay que dejar admin u operaciones como callers autorizados.
2. **`is_admin()` vs `is_operaciones_or_admin()`**: hay otros helpers viejos (`is_admin()`) que siguen existiendo y se usan en otras políticas. **No los he removido** para no romper nada. El nuevo helper coexiste y es el que se usa en las políticas que necesita operaciones.
3. **El usuario de operaciones no aparece en la red binaria** — no es distribuidor, por lo que el `red_binaria` no lo registra. Esto está bien.
4. **Verificar después de aplicar**: entra como el usuario de operaciones y comprueba que:
   - `/admin` te rebota a `/operaciones` (gracias al `ProtectedRoute`).
   - `/dashboard` también te rebota a `/operaciones`.
   - Las 5 secciones del menú funcionan.
   - El dashboard muestra números reales.

---

## 7. Rollback

Si quieres desactivar el rol:

```sql
-- 1) Bajar a distribuidor cualquier cuenta de operaciones (por seguridad)
update public.profiles set rol = 'distribuidor' where rol = 'operaciones';

-- 2) (opcional) eliminar al usuario de operaciones
delete from auth.users where email = 'operaciones@sumak.com.ec';

-- 3) Volver a la check constraint anterior (sin 'operaciones')
alter table public.profiles drop constraint profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check
  check (rol in ('distribuidor', 'admin'));

-- 4) Las políticas con is_operaciones_or_admin() siguen funcionando —
--    simplemente nadie pasa el predicado del helper. No hace falta dropearlas.
--    Si quieres limpiar, dropealas y recrea las viejas:
--    (revisar 001_initial_schema.sql para el código original).
```

---

*Última actualización: aplica migración 007 + 007b.*
