# Plan de Implementación: Diplomas Verificables mediante QR

## 1. Propósito

Implementar una funcionalidad administrativa independiente para registrar un diploma PDF existente, generar un identificador de verificación seguro, crear un código QR y producir una copia verificable del PDF.

El flujo debe permitir que una persona escanee el QR y consulte públicamente la autenticidad y el estado del diploma desde SUMAK Academy.

Este trabajo no reemplaza ni modifica el generador automático actual de diplomas.

## 2. Alcance

### Incluido

- Registro manual de diplomas PDF existentes.
- Selección o carga del PDF original por parte de un administrador.
- Almacenamiento privado del PDF original.
- Generación de un token criptográficamente aleatorio.
- Almacenamiento de un hash SHA-256 del token.
- Generación de una URL pública de verificación.
- Generación de un QR que contiene únicamente esa URL.
- Creación de un PDF verificable como copia derivada.
- Conservación intacta del PDF original.
- Página pública responsive de verificación.
- Visualización y descarga únicamente del PDF verificable.
- Listado administrativo de diplomas registrados.
- Copiado de URL de verificación.
- Revocación sin eliminación histórica.
- Auditoría de registro, generación, descarga y revocación.
- Pruebas de seguridad, Storage, permisos y regresión.

### Fuera de alcance

- Modificar el generador automático de diplomas.
- Reemplazar el PDF automático actual.
- Regenerar diplomas automáticos desde cero.
- Crear una nueva autenticación.
- Crear una tabla duplicada de usuarios.
- Crear otro panel administrativo.
- Implementar firma electrónica legal.
- Integrar certificados `.p12` o `.pfx`.
- Firmar digitalmente el PDF.
- Colocar la firma del Dr. Luis dentro del flujo QR.
- Exponer el PDF original públicamente.

## 3. Regla crítica de compatibilidad

El generador automático actual debe permanecer intacto.

Archivo protegido:

- `supabase/functions/academy-issue-diploma/index.ts`

No se debe modificar, reemplazar ni refactorizar ese generador para implementar el registro manual con QR.

También deben permanecer intactos, salvo que una prueba posterior demuestre una necesidad explícita:

- El flujo automático de finalización.
- Las plantillas automáticas existentes.
- Los triggers actuales.
- La emisión automática de certificados.
- Las validaciones actuales del generador automático.
- El sistema de usuarios y perfiles.
- El sistema global de autenticación.

La nueva funcionalidad debe utilizar funciones, migraciones y rutas independientes. Podrá compartir tablas, Storage, permisos y componentes únicamente cuando esa reutilización no altere el comportamiento existente.

## 4. Auditoría de arquitectura existente

### Frontend

Stack confirmado:

- React 19.
- TypeScript.
- Vite.
- Tailwind CSS v4.
- React Router 7.
- `lucide-react` para iconos.
- `@supabase/supabase-js` para el cliente.
- `motion` para animaciones existentes.
- `qrcode` y `qrcode.react` ya disponibles.

Superficies reutilizables:

- `src/App.tsx`: rutas y lazy loading.
- `src/components/AdminLayout.tsx`: panel administrativo existente.
- `src/components/Modal.tsx`: modal accesible existente.
- `src/lib/auth.tsx`: sesión, usuario y perfil.
- `src/lib/academy.ts`: API de Academy.
- `src/lib/supabase.ts`: cliente anon y llamada a Edge Functions.
- `src/lib/toast.tsx`: mensajes de éxito y error.
- `src/pages/admin/academia/AdminDiplomas.tsx`: listado, descarga, revocación, tipos y plantillas.
- `src/pages/academia/VerificarDiploma.tsx`: verificación existente por código/token.

### Backend y Supabase

Tablas relevantes existentes:

- `auth.users`: identidad única de Supabase.
- `profiles`: datos del usuario existente.
- `academy_diploma_types`: tipos configurables.
- `academy_diploma_templates`: plantillas versionadas.
- `academy_diploma_issuances`: registros de diplomas emitidos.
- `academy_audit_logs`: auditoría de operaciones sensibles.

Storage existente:

- `academy-diplomas`: bucket privado para PDFs de diplomas.
- `academy-templates`: bucket privado para plantillas.
- `academy-content`: bucket de contenido Academy.

Edge Functions existentes:

- `academy-issue-diploma`: generador automático actual. No modificar.
- `academy-verify-diploma`: verificación pública actual.
- `academy-sign-document-url`: URLs firmadas para diplomas existentes.
- `academy-revoke-diploma`: revocación de diplomas.
- `academy-check-eligibility`: elegibilidad de diplomas.

Librerías existentes:

- `pdf-lib` está disponible en Edge Functions.
- `qrcode` y `qrcode.react` están disponibles en el proyecto.

## 5. Diseño de datos

### Reutilización de `academy_diploma_issuances`

La primera opción es extender la entidad existente y no crear otra tabla de diplomas.

Se agregará únicamente la información necesaria para distinguir un registro manual de un diploma automático:

```text
registration_source
original_pdf_path
verified_pdf_path
qr_generated_at
verification_token_hash
```

### Campos propuestos

| Campo | Tipo conceptual | Propósito |
|---|---|---|
| `registration_source` | `text` | Distingue `automatic` de `manual_qr` |
| `original_pdf_path` | `text` | Ruta privada del PDF original |
| `verified_pdf_path` | `text` | Ruta privada de la copia con QR |
| `qr_generated_at` | `timestamptz` | Fecha de generación del QR |
| `verification_token_hash` | `text` | Hash SHA-256 del token público |
| `metadata` | `jsonb` | Posición QR, datos opcionales y versión del proceso |

### Compatibilidad con columnas existentes

El sistema actual ya usa:

- `diploma_number`.
- `verification_code`.
- `verification_token`.
- `user_id`.
- `diploma_type_id`.
- `template_id`.
- `course_id`.
- `participant_name`.
- `program_name`.
- `document_hash`.
- `hash_algorithm`.
- `pdf_storage_path`.
- `template_version`.
- `status`.

No se deben renombrar ni eliminar columnas existentes.

Para el flujo manual se debe decidir, mediante la migración, si `verification_token` se conserva por compatibilidad histórica o si el nuevo flujo usa exclusivamente `verification_token_hash`. La verificación manual nunca debe devolver el token, el hash ni información interna.

### Estados

Se reutilizarán los estados existentes:

- `issued`.
- `valid`.
- `revoked`.
- `superseded`.
- `invalidated`.

Un diploma revocado se conserva en la base, se conserva su PDF y continúa mostrando el estado revocado en la verificación pública.

## 6. Seguridad del token

El token debe generarse únicamente en backend con un generador criptográficamente seguro.

Reglas:

- Longitud suficiente, preferiblemente mínimo 32 bytes aleatorios.
- Codificación URL-safe.
- No usar nombre, correo, cédula, UUID, fecha ni número secuencial.
- No construir el token con datos del usuario.
- No enviar el token a logs.
- No incluir información privada dentro del QR.
- Guardar en base únicamente el hash SHA-256 cuando sea compatible con el modelo actual.
- Comparar el hash calculado del token recibido contra el hash almacenado.
- El token solo aparece en la URL pública y en el QR derivado.

## 7. URL pública y dominio

El dominio confirmado para la aplicación es:

```text
https://www.sumakecuador.lat
```

También existe el despliegue de Vercel:

```text
https://sumak-mu.vercel.app
```

La URL canónica del QR será:

```text
https://www.sumakecuador.lat/verificar-diploma/{token}
```

No se debe usar un dominio incorrecto ni construir la URL con el host interno de Supabase.

La ruta pública nueva será:

```text
/verificar-diploma/:token
```

La ruta actual debe continuar funcionando:

```text
/academia/verificar?code=...
```

No se debe eliminar ni cambiar la semántica de la ruta antigua.

## 8. Procesos de implementación

La funcionalidad se desarrollará en exactamente cinco procesos.

### Proceso 1: Registro seguro del diploma original

Objetivo: registrar el diploma existente sin tocar el generador automático.

Tareas:

1. Crear una migración nueva, sin editar migraciones aplicadas.
2. Agregar campos manuales a `academy_diploma_issuances`.
3. Crear `academy-register-existing-diploma` como Edge Function independiente.
4. Validar que el llamador sea `admin` global o `academy_admin` activo.
5. Validar `Content-Type` PDF.
6. Validar extensión `.pdf`.
7. Validar tamaño máximo configurable.
8. Validar que el nombre no permita path traversal.
9. Generar un identificador interno aleatorio para las rutas.
10. Subir el PDF original al bucket privado `academy-diplomas`.
11. Guardarlo en una ruta separada, por ejemplo:

```text
manual/originales/{internal_id}.pdf
```

12. No usar el nombre del usuario, correo o cédula en la ruta.
13. Generar `diploma_number` si el administrador no lo proporciona.
14. Generar token seguro.
15. Calcular `verification_token_hash` con SHA-256.
16. Registrar usuario, programa, curso, tipo y fecha recibidos después de validar permisos.
17. Crear el registro con `registration_source = 'manual_qr'`.
18. Registrar `diploma_registered` en `academy_audit_logs`.
19. Si falla la inserción, eliminar el PDF original recién subido.
20. No modificar registros automáticos existentes.

Resultado esperado:

```text
PDF original privado
+ registro manual
+ token seguro
+ hash del token
```

### Proceso 2: Generar QR y PDF verificable

Objetivo: crear una copia del PDF original con el QR incorporado.

Tareas:

1. Recibir el identificador del registro manual.
2. Leer el registro mediante service role en backend.
3. Descargar internamente el PDF original desde Storage privado.
4. No exponer el PDF original al navegador.
5. Generar la URL canónica de verificación.
6. Generar QR únicamente con esa URL.
7. Leer el PDF usando `pdf-lib` u otra librería compatible disponible en backend.
8. Preservar el PDF original sin sobrescribirlo.
9. Preservar tamaño de página.
10. Preservar orientación.
11. Preservar diseño, textos, imágenes, tipografías, firmas y sellos.
12. Añadir el QR como una capa adicional.
13. Añadir opcionalmente el texto `Escanea para verificar`.
14. Usar una posición configurable por página:

```json
{
  "x": 36,
  "y": 36,
  "width": 84,
  "height": 84
}
```

15. Validar que las coordenadas estén dentro de la página.
16. Evitar cubrir firmas, nombres, fechas o sellos.
17. Guardar la copia en:

```text
manual/verificados/{internal_id}.pdf
```

18. Actualizar `verified_pdf_path`.
19. Guardar `qr_generated_at`.
20. Registrar `qr_generated` y `verified_pdf_generated`.
21. Si falla la generación o subida, conservar el original y dejar el registro en estado revisable.

Resultado esperado:

```text
PDF original intacto
+ QR de URL pública
= PDF verificable separado
```

### Proceso 3: Verificación pública segura

Objetivo: resolver el token sin autenticación y devolver únicamente información pública.

Tareas:

1. Crear `academy-verify-registered-diploma` como Edge Function independiente.
2. Recibir el token desde `/verificar-diploma/:token`.
3. Validar longitud y formato básico.
4. Calcular SHA-256 del token recibido.
5. Buscar el registro manual por `verification_token_hash`.
6. No devolver token ni hash.
7. No devolver correo.
8. No devolver teléfono.
9. No devolver cédula.
10. No devolver UUID.
11. No devolver paths de Storage.
12. No devolver metadata interna.
13. Devolver nombre público del beneficiario.
14. Devolver programa.
15. Devolver curso/formación si existe.
16. Devolver tipo de diploma.
17. Devolver fecha de emisión.
18. Devolver número de diploma.
19. Devolver estado público.
20. Devolver únicamente un indicador seguro para el PDF verificable.
21. Resolver el estado:

```text
valid / issued -> Diploma verificado
revoked -> Diploma revocado
superseded / invalidated -> Diploma no vigente
sin coincidencia -> Diploma no encontrado
```

22. Registrar `diploma_verified` sin guardar el token completo.
23. Aplicar CORS a los dominios autorizados del proyecto.

### Proceso 4: Página pública, visualización y descarga

Objetivo: permitir consulta desde móvil o escritorio.

Tareas:

1. Crear `VerificarDiplomaPublico.tsx`.
2. Agregar la ruta pública `/verificar-diploma/:token` en `src/App.tsx`.
3. No envolver la ruta en `ProtectedRoute`.
4. Mantener el acceso sin login.
5. Usar el lenguaje visual existente de SUMAK.
6. Mostrar estado válido con indicador verde.
7. Mostrar estado revocado con indicador de advertencia.
8. Mostrar estado no encontrado con error claro.
9. Mostrar solo datos públicos.
10. Mostrar botón `Ver diploma`.
11. Mostrar botón `Descargar PDF`.
12. Ambos botones deben apuntar al PDF verificable.
13. Nunca apuntar al PDF original.
14. Solicitar una signed URL temporal mediante `academy-sign-registered-diploma-url`.
15. No crear URLs públicas permanentes para PDFs privados.
16. Abrir visualización en pestaña nueva o visor compatible.
17. Mostrar errores seguros y comprensibles.
18. Mantener diseño responsive.
19. Permitir que el QR abra directamente esta ruta.

Estados visuales mínimos:

### Válido

```text
Diploma verificado
Este diploma fue emitido oficialmente por SUMAK.
```

### Revocado

```text
Diploma revocado
Este diploma fue emitido anteriormente, pero ya no es válido.
```

### No encontrado

```text
Diploma no encontrado
El código no corresponde a un diploma registrado por SUMAK.
```

### Documento disponible

```text
Ver diploma
Descargar PDF
```

Solo se debe entregar el PDF verificable cuando exista y el registro esté autorizado para visualización pública según la política definida.

### Proceso 5: Administración, revocación y QA

Objetivo: integrar la funcionalidad al panel existente y probar el flujo completo.

Tareas administrativas:

1. Añadir un tab `Registrar diploma existente` dentro de `AdminDiplomas.tsx`.
2. Reutilizar `AdminLayout` y `Modal`.
3. Permitir seleccionar usuario existente.
4. Permitir seleccionar programa.
5. Permitir seleccionar curso.
6. Permitir seleccionar tipo de diploma.
7. Permitir ingresar número si existe.
8. Permitir ingresar nombre público.
9. Permitir ingresar fecha de emisión.
10. Permitir seleccionar un PDF.
11. Mostrar límite y validación del archivo.
12. Ejecutar registro y generación mediante Edge Function.
13. Mostrar resultado:

```text
Diploma registrado
Código de verificación
URL pública
PDF verificable
```

14. Añadir acción para copiar URL.
15. Añadir acción para abrir verificación.
16. Añadir acción para ver PDF verificable.
17. Añadir acción para descargar PDF verificable.
18. Añadir revocación con confirmación y motivo.
19. No eliminar el PDF original al revocar.
20. No eliminar el PDF verificable al revocar.
21. Registrar `diploma_revoked`.
22. Diferenciar diplomas manuales y automáticos en el listado.
23. Mostrar estado y origen del registro.
24. Añadir filtros por origen y estado.

Tareas de QA:

1. Administrador puede registrar PDF válido.
2. Usuario normal no puede registrar diplomas.
3. Usuario normal no puede llamar la función de registro con éxito.
4. Archivo no PDF es rechazado.
5. Archivo demasiado grande es rechazado.
6. Path traversal es rechazado.
7. El original permanece intacto.
8. Se crea una copia verificable independiente.
9. El QR contiene únicamente la URL pública.
10. Token aleatorio no predecible.
11. Token inexistente devuelve no encontrado.
12. Token válido devuelve diploma verificado.
13. Diploma revocado devuelve diploma revocado.
14. El PDF original nunca se entrega públicamente.
15. El PDF verificable se entrega con signed URL temporal.
16. La URL firmada expira.
17. No se devuelve información privada.
18. El generador automático continúa funcionando sin cambios.
19. La ruta antigua `/academia/verificar` continúa funcionando.
20. El flujo funciona en móvil y escritorio.
21. CORS funciona en producción y Vercel.
22. Las migraciones pasan reset local.
23. `npm run lint` pasa.
24. `npm run build` pasa.
25. `supabase db lint` pasa.
26. `supabase db push --dry-run` no muestra pendientes después del despliegue.

## 9. Archivos nuevos previstos

### Migraciones

- Una migración nueva para extender `academy_diploma_issuances` y configurar policies necesarias.

### Edge Functions

- `supabase/functions/academy-register-existing-diploma/index.ts`
- `supabase/functions/academy-verify-registered-diploma/index.ts`
- `supabase/functions/academy-sign-registered-diploma-url/index.ts`
- Opcionalmente una función separada para generación QR/PDF si el registro no la encapsula:
  - `supabase/functions/academy-generate-verified-diploma/index.ts`

### Frontend

- `src/pages/academia/VerificarDiplomaPublico.tsx`
- Posiblemente componentes internos de previsualización o estado.

## 10. Archivos existentes que se modificarán

Solo cuando sea necesario:

- `src/App.tsx`: agregar la ruta pública.
- `src/lib/academy.ts`: agregar métodos para registro/listado manual.
- `src/lib/academy-types.ts`: agregar tipos manuales.
- `src/pages/admin/academia/AdminDiplomas.tsx`: agregar tab y acciones.
- `PLAN_IMPLEMENTACION_ACADEMY.md`: registrar avance.
- `PLAN_DIPLOMAS_QR.md`: actualizar estado de los cinco procesos.

## 11. Archivos protegidos que no se modificarán

- `supabase/functions/academy-issue-diploma/index.ts`.
- Generador automático de diplomas.
- Triggers de finalización.
- Plantillas automáticas.
- Flujo automático de certificados.
- Sistema de auth.
- Tablas MLM existentes.

## 12. Reglas de Storage

### Original

```text
academy-diplomas/manual/originales/{internal_id}.pdf
```

- Bucket privado.
- Nunca URL pública permanente.
- Nunca sobrescribir.
- Nunca usar datos personales en el nombre.

### Verificable

```text
academy-diplomas/manual/verificados/{internal_id}.pdf
```

- Bucket privado.
- Solo acceso mediante función autorizada o signed URL.
- Contiene el QR.
- No sustituye al original.

### Limpieza

- Si falla después de subir el original, eliminar solo el objeto creado por esa operación.
- Si falla al generar el verificable, conservar el original.
- Si falla el registro de base después de subir cualquier objeto, aplicar compensación.
- No borrar documentos históricos por revocación.

## 13. Reglas de autorización

### Registro

Permitido únicamente para:

- `profiles.rol = 'admin'`.
- Usuario con rol Academy `academy_admin` activo.

### Visualización pública

Permitida únicamente mediante token válido y endpoint público controlado.

### PDF verificable

- Se entrega solo desde el path verificable.
- Se genera signed URL temporal.
- No se expone el path interno.
- No se requiere sesión para verificar si el producto lo define como credencial pública.

### Revocación

Permitida únicamente para administradores autorizados.

### Auditoría

Toda acción sensible se registra con:

- Actor.
- Acción.
- Entidad.
- Resultado.
- Fecha.
- Metadata no sensible.

Nunca guardar tokens completos en auditoría.

## 14. Criterios de aceptación

### Caso 1: Registro

Un administrador carga un PDF válido y completa los datos.

Resultado:

- Registro manual creado.
- Original guardado en bucket privado.
- Token aleatorio generado.
- Hash guardado.
- QR creado.
- PDF verificable creado.

### Caso 2: Integridad del original

El archivo original se conserva byte por byte y no se sobrescribe.

### Caso 3: Verificación QR

Al escanear el QR se abre:

```text
https://www.sumakecuador.lat/verificar-diploma/{token}
```

Sin login.

### Caso 4: Diploma válido

La página muestra el diploma como verificado y únicamente sus datos públicos.

### Caso 5: PDF

`Ver diploma` y `Descargar PDF` entregan el PDF verificable con QR.

### Caso 6: Token inválido

La página muestra diploma no encontrado.

### Caso 7: Revocación

Tras revocar, la página muestra diploma revocado y conserva el registro y archivos.

### Caso 8: Seguridad

No se exponen token almacenado, hash, correo, teléfono, cédula, UUID ni PDF original.

### Caso 9: Compatibilidad

El generador automático actual funciona exactamente igual antes y después de la implementación.

## 15. Orden de ejecución

1. Revisar este plan y confirmar que se trabaja en uno de los cinco procesos.
2. Crear migración sin editar migraciones históricas.
3. Validar migración con `supabase db reset --local`.
4. Crear y desplegar funciones independientes.
5. Validar permisos, Storage y compensación.
6. Crear métodos frontend.
7. Crear ruta pública.
8. Integrar tab administrativo.
9. Ejecutar `npm run lint`.
10. Ejecutar `npm run build`.
11. Ejecutar `supabase db lint`.
12. Ejecutar `supabase db push --dry-run`.
13. Revisar que el generador automático no cambió.
14. Probar casos válidos e inválidos.
15. Actualizar este documento y el plan general.
16. Publicar código y migraciones solo después de validar.

## 16. Estado de implementación

- Auditoría: completada.
- Plan reducido a cinco procesos: completado.
- Procesos 1 a 4: implementados y desplegados.
- Proceso 5: integración final, listado, revocación y QA pendientes.
- Generador automático: protegido y sin modificaciones.
- Dominio canónico: `https://www.sumakecuador.lat`.
- Dominio alternativo: `https://sumak-mu.vercel.app`.
- Bucket reutilizable: `academy-diplomas`, privado.
- Librerías reutilizables: `pdf-lib`, `qrcode`, `qrcode.react`.
- Sistema de auth reutilizable: Supabase Auth + `profiles`.
- Sistema administrativo reutilizable: `AdminLayout` + `AdminDiplomas`.

### Proceso 1 completado

- Migración: `supabase/migrations/20260904000510_manual_diploma_qr_registration.sql`.
- Edge Function: `supabase/functions/academy-register-existing-diploma/index.ts`.
- Tab administrativo: `Registrar PDF + QR` dentro de `AdminDiplomas`.
- Cliente multipart: `callEdgeFunctionMultipart`.
- Validación backend de administrador, MIME, extensión, firma `%PDF-` y límite de 15 MB.
- Original guardado en bucket privado con ruta interna aleatoria.
- Token CSPRNG y hash SHA-256 almacenados.
- Auditoría `diploma_registered`.
- Compensación: eliminación del original si falla el registro.
- Prueba negativa sin autorización: `401`.
- El generador automático `academy-issue-diploma` no fue modificado.

### Procesos 2 a 4 completados

- Edge Function `academy-generate-verified-diploma`: descarga el original privado, genera el QR y guarda una copia PDF separada.
- El QR contiene únicamente `https://www.sumakecuador.lat/verificar-diploma/{token}`.
- La posición del QR acepta `x`, `y` y `size`, con límites dentro de cada página.
- Edge Function `academy-verify-registered-diploma`: calcula SHA-256, busca por hash y devuelve datos públicos mínimos.
- Edge Function `academy-sign-registered-diploma-url`: entrega únicamente el PDF verificable mediante signed URL de 5 minutos.
- Ruta pública `/verificar-diploma/:token` con estados válido, revocado y no encontrado.
- Los endpoints públicos se desplegaron con JWT de Gateway desactivado; la validación del token ocurre dentro de la función.
- Prueba pública de token inválido: `200` con `found: false` y `status: NOT_FOUND`.

## 17. Regla para futuras sesiones

Antes de realizar cualquier cambio relacionado con esta funcionalidad, leer este archivo completo y responder internamente:

1. ¿En cuál de los cinco procesos estoy trabajando?
2. ¿Estoy modificando accidentalmente el generador automático?
3. ¿El PDF original permanece intacto?
4. ¿El PDF verificable es una copia separada?
5. ¿El QR contiene únicamente la URL?
6. ¿El token se genera y valida en backend?
7. ¿La información pública está minimizada?
8. ¿La operación tiene autorización y auditoría?
9. ¿El cambio es compatible con el sistema actual?
10. ¿Validé localmente antes de desplegar?

No avanzar si alguna respuesta de seguridad o compatibilidad es negativa.
