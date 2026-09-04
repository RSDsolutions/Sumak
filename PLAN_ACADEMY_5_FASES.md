# SUMAK Academy: Plan Consolidado en 5 Fases

## Objetivo

Completar la lógica académica de SUMAK Academy sobre la arquitectura existente, sin crear otro sistema de usuarios, autenticación, pagos, notificaciones, Storage o diplomas.

La prioridad es mantener funcionando SUMAK y utilizar el usuario autenticado existente:

```text
SUMAK USER
    -> ENROLLMENT
    -> PROGRESS
    -> COMPLETION
    -> CERTIFICATE / PROGRAM DIPLOMA
```

## Límites obligatorios

- No crear `academy_users`.
- No crear otro proyecto Supabase.
- No crear otro sistema de pagos.
- No crear otro sistema de notificaciones.
- No confiar en estados, fechas, progreso, scores o precios enviados únicamente desde React.
- No activar una inscripción desde frontend sin validación backend.
- No permitir múltiples inscripciones históricas del mismo usuario al mismo curso.
- No invalidar logros académicos porque expire el acceso.
- No emitir diplomas por completar un solo curso si el programa exige varios.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` ni ninguna clave secreta en el frontend.
- No utilizar MD5 para tokens o documentos.
- No modificar el generador automático de diplomas sin una auditoría y una migración compatible.
- El flujo de diplomas QR manual permanece independiente del generador automático actual.
- Toda modificación de base de datos se realiza mediante una migración nueva.

## Arquitectura que se reutiliza

- Frontend: React 19 + TypeScript + Vite.
- Routing: React Router en `src/App.tsx`.
- Auth y perfil: Supabase Auth, `profiles`, `src/lib/auth.tsx`.
- Cliente Supabase: `src/lib/supabase.ts`.
- Academy API: `src/lib/academy.ts`.
- Layouts: `AcademyLayout` y `AdminLayout`.
- Seguridad: RLS, RPCs y Edge Functions.
- Pagos existentes: PayPhone, PayPal y flujo de comprobantes ya integrado en SUMAK.
- Notificaciones existentes: provider y tablas actuales de SUMAK.
- Diplomas: `academy_diploma_issuances`, `academy_diploma_types`, `academy_diploma_templates` y Edge Functions existentes.
- QR manual: `PLAN_DIPLOMAS_QR.md`, sin alterar el generador automático.
- Storage: buckets privados y públicos ya existentes.
- UI: tokens de `src/index.css`, componentes reutilizables, `Modal`, `Toast` y layouts actuales.

## Registro de implementación

> Corte de sesión: 2026-09-04. Este registro describe el estado real del repositorio y de Supabase remoto para retomar el trabajo en otra sesión.

### Estado resumido de fases

| Fase | Estado | Nota |
| --- | --- | --- |
| Fase 0 | Completada | Auditoría, seguridad base, RLS, RPCs, CORS y secretos frontend. |
| Fase 1 | Completada | Inscripciones, aprobación, estados y acceso de tres meses. |
| Fase 2 | Completada | Pagos, activación backend, expiración, notificaciones persistentes con triggers y `pg_cron`. Pendiente: transferencia bancaria Academy. |
| Fase 3 | Mayormente completada | Completion Engine, certificados, programas y lives; faltan pruebas end-to-end y revisión final del diploma. |
| Fase 4 | Parcialmente completada | UI de cursos, inscripciones admin, MisCursos con secciones. Pendiente: reordenamiento, preview, uploads Storage. |
| Fase 5 | Pendiente | Matriz QA, seguridad, regresión y operación documentada. |

### Completado

- Fase 0: auditoría de Academy, corrección de contratos de enrollment/progress/attempts, endurecimiento de RLS y RPCs, ocultamiento de respuestas correctas, revisión de CORS y eliminación de service role del frontend.
- Diplomas QR: registro, generación verificada, verificación pública y URLs firmadas implementados de forma independiente del generador automático de diplomas.
- Fase 1: `academy_enrollments` usa estados de aprobación, pago pendiente, activación, completado, expirado y rechazado; la activación establece tres meses desde `activated_at`; se agregó administración de solicitudes en `/admin/academia/inscripciones`.
- Fase 1: `MisCursos` muestra estados, progreso, solicitudes rechazadas y vencimiento; los cursos no activos no permiten abrir contenido.
- Fase 2: alcance de instructor aplicado en RLS. La migración `20260904020000_academy_instructor_scope.sql` está aplicada en remoto.
- Fase 2: relación `academy_enrollments.payment_id` con el ledger `pagos` y RPC backend `activate_academy_enrollment_after_payment`.
- Fase 2: PayPhone y PayPal aceptan `academyEnrollmentId`, validan monto/estado en servidor y activan la inscripción. Las cuatro funciones fueron desplegadas.
- Fase 2: expiración automática con `pg_cron` job `academy-expire-enrollments` (03:15 UTC), idempotente.
- Fase 2: **Notificaciones persistentes:** tabla `user_notifications` creada en Supabase; provider migrado de localStorage a Supabase con Realtime. Triggers en `academy_enrollments` y `academy_certificates` para todos los eventos clave. Job `pg_cron` `academy-expiry-reminders` (03:20 UTC) con clave única por inscripción/intervalo. Tipo `academy` añadido al sistema.
- Fase 3: motor backend idempotente de finalización; certificados enlazados; programas completados automáticamente.
- Fase 3: biblioteca de lives con acceso RLS; elegibilidad de diploma endurecida; Edge Function `academy-maintenance` desplegada.
- Fase 4: **Admin Inscripciones mejorado:** nombre completo del usuario (join profiles), precio del curso, datos activación/expiración, modal de rechazo, tabs con contadores, detalles expandibles.
- Fase 4: **MisCursos con secciones:** En progreso / Completados / Historial; badge de urgencia de vencimiento (rojo ≤7d, ámbar ≤30d); enlace a certificados; motivo de rechazo inline.
- Validaciones ejecutadas: `npm run lint` ✅, `npm run build` ✅, `supabase db push --linked` ✅.


### Migraciones nuevas aplicadas

- `20260904010158_academy_enrollment_state_machine.sql`: estados, aprobación, rechazo y expiración.
- `20260904020000_academy_instructor_scope.sql`: alcance RLS de instructor.
- `20260904030000_academy_payment_activation.sql`: relación con `pagos` y activación backend.
- `20260904031000_academy_payment_amount_units.sql`: conversión PayPhone/PayPal.
- `20260904040000_academy_completion_engine.sql`: finalización centralizada.
- `20260904050000_academy_certificates_program_completion.sql`: certificados y programas.
- `20260904060000_academy_live_access_scope.sql`: acceso de lives.
- `20260904070000_academy_certificate_audit.sql`: auditoría de certificados.
- `20260904080000_academy_expiration_schedule.sql`: job diario `pg_cron`.
- `20260904090000_academy_user_notifications.sql`: tabla `user_notifications`, triggers de Academy, job `academy-expiry-reminders`.

### Lo que falta

1. **Fase 2 — Transferencia bancaria Academy:** definir el flujo de comprobante y aprobación para cursos pagados por transferencia; PayPhone y PayPal ya están conectados.
2. **Fase 3 — Completion Engine:** agregar reproducción mínima para videos y actividades obligatorias si el contenido las configura; hoy se validan lecciones publicadas y evaluaciones publicadas aprobadas.
3. **Fase 3 — Diplomas:** ejecutar pruebas end-to-end de elegibilidad y emisión para programas con varios cursos; confirmar que los requisitos configurables del diploma coincidan con el programa.
4. **Fase 4 — Admin:** completar reordenamiento, preview sin publicar, uploads de Storage y asignación visible de instructores; las operaciones base de cursos, contenido, evaluaciones, programas y lives ya existen.
5. **Fase 5 — QA:** ejecutar pruebas como anónimo, estudiante, distribuidor, instructor, `academy_admin` y admin global; cubrir RLS, IDOR, pagos, expiración, certificados, diplomas y QR.
6. **Operación:** conservar `academy-maintenance` como ejecución manual protegida; el job automático activo es `pg_cron` y no requiere configurar Scheduler HTTP adicional.

# Fase 1: Base de datos, estados y seguridad

## Objetivo

Definir un modelo consistente para inscripciones, acceso, estados, expiración, auditoría y permisos antes de ampliar la interfaz.

## Modelo de inscripción

Reutilizar `academy_enrollments` si sus columnas actuales cubren el caso. Si se requieren cambios, agregar columnas con migración nueva:

```text
id
user_id
course_id
status
requested_at
approved_at
activated_at
expires_at
completed_at
rejected_at
rejection_reason
approved_by
payment_status
created_at
updated_at
```

Estados permitidos:

```text
pending
approved
payment_pending
active
completed
expired
rejected
cancelled
```

No agregar estados equivalentes con nombres distintos. El estado de acceso y el logro académico deben mantenerse conceptualmente separados:

- `active`: acceso actual.
- `expired`: acceso terminado sin borrar historial.
- `completed`: logro académico permanente.

## Máquina de estados

Curso gratuito:

```text
pending -> approved -> active -> completed
pending -> rejected
active -> expired
```

Curso pagado:

```text
pending -> approved -> payment_pending -> active -> completed
pending -> rejected
payment_pending -> expired / cancelled
active -> expired
```

Reglas:

- Solo backend puede aprobar, activar, expirar o completar.
- `completed` no puede convertirse automáticamente en `expired`.
- Una solicitud rechazada conserva historial. La posibilidad de volver a solicitar debe definirse explícitamente antes de habilitarla.
- Una inscripción existente impide crear otra para el mismo usuario y curso.
- Reutilizar `UNIQUE(user_id, course_id)`.

## Acceso de tres meses

Cuando un curso pasa a `active`, el backend debe establecer:

```text
activated_at = now()
expires_at = activated_at + interval '3 months'
```

Nunca iniciar el período desde solicitud, aprobación, creación de pedido o fecha del navegador.

El helper de acceso debe exigir:

```text
status = active
and expires_at > now()
```

El estado `completed` debe seguir permitiendo consultar el historial y certificados aunque el período haya terminado.

## RLS y permisos

- Usuario: lee sus inscripciones y progreso.
- Usuario: no modifica `status`, `approved_by`, `activated_at`, `expires_at`, `completed_at`, `payment_status` ni `progress_percentage` de matrícula.
- Instructor: solo gestiona cursos y contenido asignados, si el alcance se habilita.
- `academy_admin` y admin global: gestionan Academy según sus permisos.
- Anónimo: solo contenido explícitamente público.
- Scores, respuestas correctas, diplomas y cambios de estado permanecen bajo backend autorizado.

## Auditoría

Registrar al menos:

```text
enrollment_requested
enrollment_approved
enrollment_rejected
payment_pending
payment_confirmed
enrollment_activated
enrollment_expired
course_completed
certificate_issued
diploma_issued
diploma_revoked
```

No guardar tokens completos, contraseñas ni datos innecesarios en metadata.

## Criterio de salida

- Migraciones aplican con `supabase db reset --local`.
- RLS bloquea modificaciones directas del usuario.
- No existe una segunda inscripción para el mismo usuario y curso.
- El generador automático de diplomas y el flujo QR manual siguen intactos.
- `supabase db lint` no reporta errores nuevos.

# Fase 2: Backend de inscripciones, pagos y expiración

## Objetivo

Implementar todos los cambios de estado en backend y conectar cursos gratuitos y pagados al flujo existente de SUMAK.

## Operaciones backend

Crear RPCs o Edge Functions independientes para:

- Solicitar inscripción.
- Aprobar inscripción gratuita.
- Aprobar inscripción pagada hacia `payment_pending`.
- Confirmar pago desde webhook o función backend.
- Activar inscripción.
- Rechazar inscripción con motivo.
- Expirar inscripciones vencidas.
- Consultar el estado permitido para el usuario actual.

Cada operación debe derivar el usuario desde `auth.uid()` o un JWT validado. No aceptar como autoridad:

```text
status
approved
paymentSuccess
activated_at
expires_at
```

## Integración con pagos

Antes de crear tablas nuevas, mapear el sistema existente:

- pedidos.
- items de pedido.
- pagos.
- estados de pago.
- PayPhone.
- PayPal.
- comprobantes.
- webhooks y funciones de confirmación.

Para cursos pagados:

```text
enrollment pending
    -> admin approval
    -> payment_pending
    -> existing payment provider
    -> backend confirmation
    -> active
```

La confirmación debe comprobar importe, referencia, usuario, curso y estado del proveedor antes de activar.

## Expiración automática

Crear una función backend/scheduled job que:

1. Busque inscripciones `active` con `expires_at <= now()`.
2. Cambie su estado a `expired`.
3. Nunca toque inscripciones `completed`.
4. Registre auditoría.
5. Genere la notificación de expiración una sola vez.

Crear una restricción de idempotencia para que repetir el job no duplique auditoría o notificaciones.

## Notificaciones

Reutilizar el sistema existente para:

- solicitud recibida.
- solicitud aprobada.
- rechazo.
- pago pendiente.
- pago confirmado.
- activación.
- 30, 15, 7, 3 y 1 día antes de expiración.
- expiración.
- curso completado.
- certificado emitido.
- diploma emitido.

Cada recordatorio debe tener una clave única por usuario, curso, tipo y fecha para evitar duplicados.

## Criterio de salida

- Curso gratuito requiere aprobación antes de acceso.
- Curso pagado no se activa antes de confirmación backend.
- Acceso dura exactamente tres meses desde `activated_at`.
- Job de expiración es repetible e idempotente.
- No se crean tablas de pagos duplicadas.
- Pruebas negativas impiden activar enviando campos manipulados desde frontend.

# Fase 3: Completion Engine, progreso y credenciales

## Objetivo

Centralizar el cálculo de progreso, finalización, certificados y elegibilidad de diplomas.

## Progreso

Mantener progreso por lección, no solo porcentaje general:

```text
user_id
enrollment_id si la arquitectura lo permite
lesson_id
course_id
status
progress_percentage
started_at
completed_at
last_accessed_at
playback_seconds
```

El backend debe validar que:

- la lección pertenece al curso indicado.
- el usuario tiene inscripción activa o completada según la operación.
- el curso no está expirado para continuar.
- el porcentaje está entre 0 y 100.
- una lección completada no se retrocede sin regla explícita.

## Completion Engine

Crear una operación central que responda si el curso se puede completar. Debe verificar:

1. Usuario autenticado.
2. Curso publicado y válido.
3. Inscripción válida.
4. Inscripción no expirada para continuar.
5. Todas las lecciones obligatorias.
6. Reproducción mínima configurada para videos.
7. Evaluaciones obligatorias publicadas.
8. Intentos con `passed = true`.
9. Nota mínima configurada.
10. Actividades obligatorias, si existen.
11. Nunca asistencia obligatoria.

El botón `Finalizar curso` solo solicita evaluación. El backend decide:

```text
request completion
    -> completion engine
    -> completed o requisitos pendientes
```

La respuesta debe listar requisitos pendientes sin revelar respuestas correctas.

## Certificados

- Emitir certificado solo cuando el engine confirma finalización.
- Usar `academy_certificates` existente.
- Mantener número único.
- Mantener `UNIQUE(user_id, course_id)`.
- Emisión idempotente.
- No permitir inserción directa desde el navegador.
- Entregar mediante Storage privado y signed URL si existe documento.
- Notificar mediante provider existente.

## Diplomas de programas

- Solo después de completar cursos obligatorios del programa.
- Verificar evaluaciones y nota mínima del programa.
- Usar `academy_diploma_types` configurable.
- Mantener cinco o más tipos sin lógica hardcodeada.
- Usar el generador automático existente sin reemplazarlo.
- El flujo de registro QR manual continúa independiente.
- No emitir diploma por completar un curso aislado salvo configuración explícita.

## QR y verificación

- Token impredecible generado en backend.
- QR contiene solo URL pública.
- Hash SHA-256 cuando el modelo lo permita.
- Verificación pública sin email, teléfono, cédula, UUID, token o hash.
- PDF privado y signed URL temporal.
- Revocación conserva registro, documento e historial.

## Criterio de salida

- No se puede completar falseando un porcentaje.
- No se emiten dos certificados por el mismo curso.
- Una expiración no elimina progreso ni certificados.
- Diploma requiere los requisitos reales del programa.
- El generador automático permanece compatible.

# Fase 4: Frontend Academy y administración

## Objetivo

Exponer los estados reales y permitir a administradores gestionar solicitudes, contenido y credenciales sin duplicar sistemas.

## Experiencia del usuario

En catálogo/detalle mostrar botones según estado:

```text
no inscrito       -> Solicitar inscripción
pending           -> Solicitud pendiente
rejected          -> Solicitud rechazada
approved          -> Completar pago o esperando activación
payment_pending   -> Completar pago
active            -> Continuar curso
completed         -> Curso completado / Ver certificado
expired           -> Acceso expirado / Ver historial
```

En cursos activos mostrar:

```text
Progreso: 72%
Tu acceso vence en 47 días
```

No mostrar `Solicitar inscripción` para un curso con historial bloqueante.

## Perfil y dashboard

En `Mis Cursos` separar:

- En progreso.
- Completados.
- Expirados.
- Historial.

Mostrar certificados disponibles y no ocultar logros completados por expiración.

## Administración de solicitudes

Integrar en el panel actual:

- lista de solicitudes.
- búsqueda por usuario/curso.
- filtros por estado, tipo y fecha.
- detalle de usuario y curso.
- historial académico mínimo necesario.
- estado de pago.
- aprobar.
- rechazar con motivo.
- confirmar activación solo desde backend.

No permitir que el administrador cambie fechas críticas libremente desde el navegador sin una operación backend auditada.

## Administración de contenido

Completar el builder actual:

- Editar módulos.
- Reordenar módulos.
- Editar lecciones.
- Reordenar lecciones.
- Publicar/ocultar.
- Previsualizar sin publicar.
- Gestionar recursos en Storage.
- Gestionar evaluaciones y preguntas.
- Seleccionar múltiples respuestas correctas.
- Asignar instructores y limitar su alcance.
- Gestionar lives.
- Auditar cambios.

Reutilizar `AdminLayout`, `Modal`, `Toast`, `academyAPI` y tablas existentes.

## Programas

- Detalle de programa.
- Inscripción.
- Cursos obligatorios y opcionales.
- Progreso por curso.
- Requisito de evaluación.
- Tipo de diploma configurable.
- Estado de elegibilidad visible sin exponer datos internos.

## Diplomas QR manuales

Mantener el flujo documentado en [`PLAN_DIPLOMAS_QR.md`](PLAN_DIPLOMAS_QR.md):

- PDF original intacto.
- PDF verificable separado.
- Registro manual independiente.
- Verificación pública.
- Revocación sin borrar historial.

## Criterio de salida

- UI refleja la máquina de estados real.
- Admin puede revisar solicitudes sin editar directamente columnas protegidas.
- Builder permite gestionar contenido sin publicar accidentalmente.
- Instructor no puede editar contenido fuera de su alcance.
- Vista pública de diploma no requiere login.
- No se rompe login, registro, pedidos, pagos ni dashboards existentes.

# Fase 5: QA, seguridad y operación

## Objetivo

Probar el sistema completo y confirmar compatibilidad antes de declarar Academy lista para producción.

## Matriz de roles

Probar como:

- Anónimo.
- Usuario registrado.
- Estudiante Academy.
- Distribuidor SUMAK.
- Instructor.
- `academy_admin`.
- Admin global.

## Pruebas de RLS e IDOR

Intentar:

- Leer curso premium sin acceso.
- Leer módulo/lección de otro curso.
- Leer progreso de otro usuario.
- Modificar inscripción ajena.
- Modificar su propio estado a `completed`.
- Modificar `expires_at`.
- Crear segunda inscripción.
- Crear intento fuera de un assessment autorizado.
- Enviar respuestas de otra evaluación.
- Consultar `is_correct` directamente.
- Emitir diploma sin elegibilidad.
- Descargar PDF original.
- Descargar PDF verificable de otro diploma.
- Modificar precios de recetas.
- Aprobar su propia compra.
- Registrar diploma QR sin rol admin.

## Pruebas de estados

- Gratis: `pending -> approved -> active -> completed`.
- Gratis rechazado.
- Pagado: `pending -> approved -> payment_pending -> active`.
- Pago fallido.
- Expiración automática.
- Completado antes de expiración.
- Reintentos idempotentes.
- Rechazo y reintento según regla definida.
- No duplicación de matrícula, certificado o diploma.

## Pruebas de credenciales

- Certificado emitido al completar.
- Diploma solo con programa completo.
- Token QR válido.
- Token inválido.
- Diploma revocado.
- PDF original intacto.
- PDF verificable con QR.
- Signed URL temporal.
- No exposición de PII.
- Hash SHA-256.
- Plantilla histórica preservada.

## Pruebas de regresión

- Login.
- Registro.
- Recuperación de contraseña.
- Perfil.
- Roles.
- Dashboard distribuidor.
- Pedidos.
- PayPhone.
- PayPal.
- Comprobantes.
- Notificaciones.
- Rutas públicas.
- Rutas privadas.
- Generador automático de diplomas.
- Flujo QR manual.

## Pruebas frontend

```powershell
npm run lint
npm run build
```

Probar rutas en escritorio y móvil:

```text
/academia
/academia/cursos
/academia/cursos/:slug
/academia/dashboard
/academia/aprender/:slug
/academia/evaluacion/:assessmentId
/academia/programas
/academia/programas/:slug
/verificar-diploma/:token
/admin/academia/cursos
/admin/academia/programas
/admin/academia/lives
/admin/academia/diplomas
```

## Pruebas Supabase

```powershell
supabase db reset --local
supabase db lint
supabase migration list
supabase db push --dry-run
supabase db lint --linked
```

Funciones:

```powershell
supabase functions deploy nombre-funcion
```

Verificar CORS únicamente para:

- `https://www.sumakecuador.lat`.
- `https://sumak-mu.vercel.app`.
- `http://localhost:3000`.
- `http://127.0.0.1:3000`.

## Criterio final de producción

No declarar la implementación terminada hasta confirmar:

- Todas las migraciones reproducibles.
- RLS probado con todos los roles.
- Sin IDOR conocido.
- Sin service role en frontend.
- Estados backend-only.
- Pagos confirmados en backend.
- Expiración automática funcionando.
- Completion Engine verificando requisitos.
- Certificados idempotentes.
- Diplomas configurables y auditados.
- QR verificable y separado del generador automático.
- Storage privado.
- Sin PII pública innecesaria.
- Regresión del sistema existente sin fallos.
- Git limpio y despliegue reproducible.

## Regla de trabajo para cada cambio

Antes de editar:

1. Identificar la fase y el requisito exacto.
2. Buscar funcionalidad existente reutilizable.
3. Revisar consumidores, RLS, funciones y rutas.
4. Proponer el cambio mínimo compatible.
5. Crear migración nueva si aplica.
6. Validar localmente.
7. Ejecutar lint y build.
8. Revisar diff.
9. Aplicar remoto solo después de validar.
10. Actualizar este documento y el documento específico QR si corresponde.

## Documentos relacionados

- [`PLAN_IMPLEMENTACION_ACADEMY.md`](PLAN_IMPLEMENTACION_ACADEMY.md): historial y plan general de Academy.
- [`PLAN_DIPLOMAS_QR.md`](PLAN_DIPLOMAS_QR.md): flujo independiente de registro y verificación QR.
- `README.md`: instalación y operación general.
