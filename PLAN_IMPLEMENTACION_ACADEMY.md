# Plan de Implementación SUMAK Academy

## Objetivo

Integrar un LMS completo dentro de SUMAK reutilizando la aplicación, autenticación, perfiles, roles, Supabase, navegación, componentes y branding existentes.

La prioridad es ampliar Academy sin romper las funcionalidades actuales de SUMAK.

## Principios

- No crear otro proyecto Supabase.
- No crear otra autenticación ni una tabla duplicada de usuarios.
- Reutilizar `auth.users`, `profiles`, `AuthProvider`, `ProtectedRoute`, layouts y componentes existentes.
- Toda modificación de base de datos debe realizarse mediante una migración reproducible.
- La seguridad debe vivir en RLS, RPCs y Edge Functions, no solamente en el frontend.
- No exponer `service_role` en el navegador ni en variables `VITE_*`.
- No confiar en scores, progreso, precios o elegibilidad enviados por el cliente.
- Mantener separados certificados de cursos y diplomas de programas.
- No modificar migraciones históricas ya aplicadas; usar migraciones nuevas.
- Validar cada fase localmente antes de aplicarla en remoto.

## Arquitectura actual

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4.
- Routing: React Router 7 en `src/App.tsx`.
- Auth: Supabase Auth integrado mediante `src/lib/auth.tsx`.
- Base de datos: Supabase PostgreSQL con migraciones en `supabase/migrations`.
- Backend sensible: Supabase Edge Functions en `supabase/functions`.
- UI Academy: `AcademyLayout`, páginas en `src/pages/academia` y API en `src/lib/academy.ts`.
- Branding: tokens y estilos existentes en `src/index.css`.
- Validación frontend: `npm run lint` y `npm run build`.

## Estado completado

### Fase 0: Seguridad y contratos críticos

- [x] Proyecto enlazado a Supabase CLI.
- [x] RPC seguro para inscripción a cursos.
- [x] RPC seguro para actualizar progreso.
- [x] RPC seguro para iniciar intentos.
- [x] RPC seguro para guardar respuestas.
- [x] Vista pública de opciones sin `is_correct`.
- [x] Bloqueo de escrituras directas sensibles del rol autenticado.
- [x] Validación local de migraciones desde una base limpia.
- [x] Corrección de migraciones históricas para permitir instalación limpia.
- [x] Limpieza de volatilidad en helpers de autorización Academy.

### Fase 1: MVP estudiante

- [x] Catálogo y detalle de cursos existentes.
- [x] Inscripción conectada al backend seguro.
- [x] Progreso por lección conectado al backend seguro.
- [x] Evaluaciones conectadas a intentos y calificación backend.
- [x] Certificados de finalización implementados.
- [x] Biblioteca de lives conectada a sesiones publicadas.
- [x] Programas académicos visibles para usuarios.
- [x] Progreso de programas calculado en backend.

### Fase 2: Administración de contenidos

- [x] Administración de cursos y categorías.
- [x] Builder inicial de módulos.
- [x] Builder inicial de lecciones.
- [x] Tipos de lección: texto, video YouTube, PDF, enlace externo y mixto.
- [x] Gestión inicial de recursos por lección.
- [x] Constructor inicial de evaluaciones.
- [x] Constructor inicial de preguntas y opciones.
- [x] Administración de programas.
- [x] Asociación de cursos a programas.

### Fase 3: Certificados, programas y diplomas

- [x] Emisión idempotente de certificados de curso.
- [x] Separación visual de certificados y diplomas.
- [x] Modelo de programas y relación programa-curso.
- [x] Cálculo de progreso de programas.
- [x] Validación inicial de elegibilidad.
- [x] Emisión de diplomas restringida a administradores.
- [x] Validación de matrículas completadas y evaluaciones aprobadas.
- [x] Limpieza de PDFs huérfanos cuando falla el registro.
- [x] Edge Functions de elegibilidad y emisión desplegadas.

## Próximas fases

### Fase 4: Endurecimiento de diplomas

- [ ] Hacer la emisión completamente idempotente ante carreras y reintentos.
- [ ] Formalizar compensación de Storage y registro de auditoría.
- [ ] Revisar y minimizar la información pública de verificación.
- [ ] Confirmar que nunca se expongan correo, teléfono, cédula o UUID.
- [ ] Mantener tokens criptográficamente seguros.
- [ ] Mantener hash SHA-256, versión de plantilla y estado histórico.
- [ ] Validar revocación, superseded e invalidated sin borrar historial.
- [x] Restringir CORS a `www.sumakecuador.lat`, `sumak-mu.vercel.app` y desarrollo local.

### Fase 5: Programas completos

- [ ] Permitir configurar diploma asociado desde administración.
- [ ] Mostrar elegibilidad detallada por curso.
- [ ] Conectar requisitos de programa con emisión de diploma.
- [ ] Añadir inscripción y progreso de programa para usuarios.
- [ ] Añadir vista de detalle de programa.
- [ ] Validar cursos obligatorios y opcionales.

### Fase 6: Administración avanzada

- [ ] Editar y reordenar módulos.
- [ ] Editar y reordenar lecciones.
- [ ] Gestionar publicación y previsualización.
- [ ] Gestionar recursos mediante Storage con nombres internos.
- [ ] Gestionar evaluaciones y preguntas existentes.
- [ ] Permitir seleccionar varias respuestas correctas en preguntas múltiples.
- [ ] Aplicar alcance de instructores sobre contenido asignado.
- [ ] Gestionar sesiones en vivo desde administración.
- [ ] Añadir auditoría de cambios administrativos.

### Fase 7: Recetas y cobros

- [x] Crear compras mediante RPC transaccional.
- [x] Recalcular precios exclusivamente desde `academy_recipes`.
- [x] Validar recetas activas y items permitidos.
- [x] Proteger total, precio y estado contra manipulación del cliente.
- [ ] Auditar aprobación y rechazo de compras.
- [ ] Validar ownership de comprobantes en Storage.
- [ ] Limpiar comprobantes huérfanos.
- [ ] Unificar lógica duplicada de `Recetas` y `MisRecetas`.

### Fase 8: QA y seguridad final

- [ ] Probar RLS como anónimo, estudiante, distribuidor, instructor, `academy_admin` y admin global.
- [ ] Probar IDOR sobre cursos, módulos, lecciones, recursos, progreso, intentos, respuestas y diplomas.
- [ ] Confirmar que `is_correct` no sea consultable por estudiantes.
- [ ] Intentar falsificar progreso, inscripción, score, precios y elegibilidad.
- [x] Corregir el flujo estudiante para preguntas `multiple_choice`.
- [ ] Probar login, registro y recuperación de contraseña existentes.
- [ ] Probar perfiles, roles, pedidos, pagos y navegación existente.
- [ ] Probar rutas Academy en desktop y móvil.
- [x] Retirar `VITE_SUPABASE_SERVICE_ROLE_KEY` del entorno local y documentación pública.
- [x] Confirmar que el bundle compilado no contiene la variable service role.
- [x] Auditar CORS de Edge Functions y validar preflight de producción/Vercel.
- [x] Ejecutar lint, build, reset local, db lint y dry-run remoto.
- [x] Confirmar migraciones locales y remotas sincronizadas.

## Comandos de trabajo

```powershell
npm run lint
npm run build
supabase db reset --local
supabase db lint
supabase migration list
supabase db push --dry-run
supabase db push
supabase functions deploy nombre-funcion
```

## Flujo obligatorio por cambio

1. Revisar este documento y confirmar la fase correspondiente.
2. Revisar el código y el esquema existente antes de editar.
3. Formular el cambio mínimo y verificar riesgos de compatibilidad.
4. Crear una migración nueva si cambia la base de datos.
5. Validar localmente desde una base limpia cuando corresponda.
6. Ejecutar `npm run lint` y `npm run build`.
7. Revisar `git diff --check`.
8. Aplicar migraciones remotas solo después de validar localmente.
9. Publicar el código y dejar Git sincronizado.
10. Actualizar este documento cuando cambie el estado de una fase.

## Commits relevantes

- `83398b2`: contratos seguros de estudiante y RPCs Academy.
- `65496fd`: builder de módulos y lecciones.
- `636675c`: recursos de lecciones.
- `998b6f0`: constructor de evaluaciones y preguntas.
- `73cf397`: biblioteca de lives.
- `288a90d`: certificados de cursos.
- `443d8a5`: modelo y catálogo de programas.
- `95f53fd`: administración de programas.
- `0de532d`: progreso y elegibilidad de programas.
- `a093fc9`: validación robusta de diplomas.
- `9fdb529`: limpieza de helpers de acceso.
- `6720eff`: compras de recetas con precios calculados en backend.
- `8ee3b8f`: soporte del flujo estudiante para preguntas de opción múltiple.

## Riesgos abiertos

- La configuración de seed quedó sin rutas porque el proyecto no usa un `supabase/seed.sql`.
- La función `submit_pedido` mantiene una advertencia de variable no utilizada.
- Los dominios autorizados de Edge Functions son `https://www.sumakecuador.lat`, `https://sumak-mu.vercel.app`, `http://localhost:3000` y `http://127.0.0.1:3000`.
- La administración de varias respuestas correctas todavía requiere una mejora de UI.
- La administración de programas aún no configura completamente el tipo de diploma asociado.
