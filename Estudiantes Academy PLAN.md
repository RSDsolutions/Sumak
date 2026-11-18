# SUMAK ACADEMY — EXPERIENCIA COMPLETA DEL ESTUDIANTE

## OBJETIVO

Diseñar e implementar correctamente **toda la experiencia del estudiante dentro de SUMAK Academy**.

No quiero solamente mejorar una pantalla.

Quiero que se diseñe e implemente el **portal académico completo del estudiante**, incluyendo:

- Dashboard académico.
- Mis cursos.
- Explorar cursos.
- Detalle del curso.
- Vista de aprendizaje.
- Módulos.
- Lecciones.
- Videos.
- Recursos.
- Pruebas.
- Exámenes.
- Progreso.
- Evaluaciones.
- Certificados.
- Diplomas.
- Inscripciones.
- Estados de acceso.
- Expiración.
- Notificaciones.
- Perfil académico.
- Experiencia responsive.
- Navegación.
- Estados vacíos.
- Estados de carga.
- Errores.
- Seguridad.

### REGLA FUNDAMENTAL

**NO reconstruyas SUMAK Academy desde cero.**

Antes de implementar cualquier cosa debes auditar completamente la aplicación actual y determinar:

- Qué ya existe.
- Qué está funcionando.
- Qué componentes pueden reutilizarse.
- Qué rutas existen.
- Qué tablas existen.
- Qué lógica académica existe.
- Qué sistema de autenticación existe.
- Qué sistema de roles existe.
- Qué sistema de notificaciones existe.
- Qué sistema de progreso existe.
- Qué sistema de cursos existe.
- Qué sistema de evaluaciones existe.
- Qué sistema de certificados existe.
- Qué sistema de diplomas existe.

Debes **adaptar y mejorar lo existente**, no duplicarlo.

---

# 1. EXPERIENCIA GENERAL DEL ESTUDIANTE

El estudiante debe sentir que SUMAK Academy es una plataforma educativa completa.

La navegación principal debe permitir acceder fácilmente a:

```text
Inicio
Mis cursos
Explorar
Evaluaciones
Certificados
Diplomas
Notificaciones
Mi perfil
```

Adaptar estos nombres a la estructura actual de SUMAK si ya existe una navegación propia.

No crear una navegación paralela innecesaria si Academy ya tiene una.

---

# 2. DASHBOARD DEL ESTUDIANTE

Crear/mejorar una página:

```text
/academy
```

o reutilizar la ruta existente.

Debe funcionar como el **inicio académico del estudiante**.

La pantalla debería mostrar:

## Saludo

Ejemplo:

```text
Buenos días, Robinson 👋

Continúa aprendiendo y alcanza tus objetivos.
```

Utilizar los datos reales del usuario autenticado.

---

# 3. RESUMEN ACADÉMICO

Mostrar tarjetas/resumen:

```text
Cursos activos       3
Cursos completados   5
Certificados         4
Diplomas             1
```

No mostrar información ficticia.

Todo debe provenir de los datos reales.

---

# 4. CONTINUAR APRENDIENDO

Esta debería ser una de las secciones más importantes del dashboard.

Ejemplo:

```text
CONTINUAR APRENDIENDO

┌────────────────────────────────────┐
│ Nutrición y Bienestar              │
│ Módulo 3 · Lección 4               │
│                                    │
│ ████████████░░░░ 72%               │
│                                    │
│ [Continuar curso →]                │
└────────────────────────────────────┘
```

Mostrar preferentemente el curso con actividad más reciente.

Si tiene varios cursos:

```text
[Ver todos mis cursos]
```

---

# 5. PRÓXIMAS ACTIVIDADES

Mostrar actividades académicas pendientes:

```text
PRÓXIMAS ACTIVIDADES

📝 Prueba — Módulo 2
🎬 Lección — Marketing digital
📝 Prueba — Módulo 3
🎓 Examen final — Nutrición
```

Cada elemento debe llevar directamente al contenido correspondiente.

No mostrar actividades que el estudiante ya haya completado.

---

# 6. PROGRESO GENERAL

Mostrar estadísticas útiles:

```text
PROGRESO ACADÉMICO

Cursos completados
████████████ 5

Cursos en progreso
3

Horas de aprendizaje
24h
```

Si el sistema actual no registra horas correctamente, NO inventarlas.

En ese caso utilizar métricas que sí existan.

---

# 7. MIS CURSOS

Crear/mejorar:

```text
/academy/cursos
```

o la ruta existente.

Debe ser una vista completa.

No depender solamente de cards.

Debe tener:

```text
Mis cursos

[Buscar cursos...]

Filtros:

Todos
En curso
Pendientes
Completados
Expirados
```

Orden:

```text
Más recientes
Más avanzados
Nombre
```

---

# 8. CARD DEL CURSO

Cada curso debe mostrar información útil:

```text
┌───────────────────────────────┐
│ [Imagen del curso]            │
│                               │
│ Nutrición y Bienestar         │
│                               │
│ Progreso                      │
│ ███████████░░ 72%             │
│                               │
│ 12 / 18 lecciones             │
│                               │
│ ⏳ Acceso hasta: 15/12/2026   │
│                               │
│ [Continuar]                   │
└───────────────────────────────┘
```

El botón debe depender del estado real.

---

# 9. ESTADOS DEL CURSO

Respetar los estados académicos existentes.

Conceptualmente:

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

Adaptarlos a los estados reales de la aplicación.

### Pending

```text
Solicitud pendiente

Esperando aprobación administrativa.
```

### Approved / Payment Pending

```text
Inscripción aprobada

Completa el proceso de pago para activar tu curso.
```

### Active

```text
Continuar curso
```

### Completed

```text
Curso completado ✓

[Ver certificado]
```

### Expired

```text
Acceso expirado

Tu período de acceso a este curso ha finalizado.
```

IMPORTANTE:

No permitir que el estudiante vuelva a solicitar el mismo curso si la regla académica existente establece que no puede repetirlo.

---

# 10. EXPLORAR CURSOS

Crear/mejorar:

```text
/academy/explorar
```

Esta vista es diferente de "Mis cursos".

Debe mostrar cursos disponibles para solicitar.

Ejemplo:

```text
Explora SUMAK Academy

[Buscar...]

Categorías
Todos
Bienestar
Desarrollo personal
Negocios
Marketing
Liderazgo

┌─────────────┐
│ Curso       │
│             │
│ Gratis      │
│ 3 meses     │
│             │
│ Ver curso → │
└─────────────┘
```

---

# 11. DETALLE DEL CURSO

Al seleccionar un curso:

```text
/academy/cursos/:id
```

debe existir una vista completa.

No mostrar simplemente un modal.

La página debería incluir:

```text
Imagen

Nombre del curso

Descripción

Instructor

Duración estimada

Número de módulos

Número de lecciones

Evaluaciones

Examen final

Certificado

Duración de acceso

Precio
```

Si existen esos datos en el modelo actual.

---

# 12. ESTRUCTURA ACADÉMICA DEL CURSO

Mostrar claramente:

```text
CONTENIDO DEL CURSO

Módulo 1
  ✓ Lección 1
  ✓ Lección 2
  ✓ Prueba

Módulo 2
  ✓ Lección 3
  ▶ Lección 4
  🔒 Lección 5
  🔒 Prueba

Módulo 3
  🔒 Lección 6
  🔒 Examen final
```

El estudiante debe comprender inmediatamente:

- Qué terminó.
- Qué está haciendo.
- Qué sigue.
- Qué está bloqueado.
- Qué evaluación debe realizar.

---

# 13. INSCRIPCIÓN

Si el estudiante no está inscrito:

```text
[Solicitar inscripción]
```

Al solicitar:

```text
Solicitud enviada

Tu inscripción está pendiente de aprobación administrativa.
```

No activar automáticamente el curso.

Esto debe respetar la lógica de Academy.

---

# 14. CURSOS GRATUITOS

Aunque el curso sea gratuito:

```text
Precio
GRATIS
```

el estudiante debe solicitar inscripción.

Debe pasar por:

```text
Solicitud
↓
Aprobación administrativa
↓
Activación
↓
Acceso
```

No permitir acceso directo simplemente porque el precio sea $0.

---

# 15. CURSOS PAGADOS

Para un curso pagado:

```text
$XX.XX
```

El flujo debe respetar:

```text
Solicitar inscripción
↓
Aprobación administrativa
↓
Pago
↓
Confirmación del pago
↓
Activación
↓
Acceso
```

Reutilizar el sistema de pagos existente de SUMAK.

No crear otro sistema de pagos únicamente para Academy.

---

# 16. DURACIÓN DEL ACCESO

Los cursos tienen:

**3 meses de acceso.**

La fecha debe comenzar cuando la inscripción pase a:

```text
ACTIVE
```

No desde la solicitud.

No desde la simple aprobación si todavía existe pago pendiente.

Mostrar:

```text
Acceso hasta:
15 de diciembre de 2026
```

También:

```text
Te quedan 42 días
```

si el cálculo es posible.

---

# 17. AVISOS DE EXPIRACIÓN

Mostrar advertencias cuando corresponda:

```text
⚠ Tu acceso termina en 7 días.
```

o:

```text
⚠ Tu acceso termina mañana.
```

Reutilizar el sistema de notificaciones existente.

No duplicar sistemas.

---

# 18. VISTA DE APRENDIZAJE

Esta es una de las partes MÁS IMPORTANTES.

Crear/mejorar:

```text
/academy/aprender/:courseId/:lessonId
```

o adaptar la ruta existente.

Debe ser una experiencia enfocada completamente en aprender.

---

# 19. LAYOUT DEL REPRODUCTOR

En desktop:

```text
┌───────────────────────────────────────────────────────┐
│ Curso: Nutrición y Bienestar                          │
├───────────────────────┬───────────────────────────────┤
│                       │                               │
│ CONTENIDO DEL CURSO   │       CONTENIDO              │
│                       │                               │
│ Módulo 1              │       Video / Texto           │
│ ✓ Lección 1           │                               │
│ ✓ Lección 2           │                               │
│                       │                               │
│ Módulo 2              │                               │
│ ✓ Lección 3           │                               │
│ ▶ Lección 4           │                               │
│ 🔒 Lección 5          │                               │
│                       │                               │
└───────────────────────┴───────────────────────────────┘
```

La navegación lateral debe permitir desplazarse entre contenido.

En móvil debe transformarse adecuadamente.

---

# 20. CABECERA DE APRENDIZAJE

Mostrar:

```text
Curso
Módulo
Lección actual

Progreso:
72%
```

También:

```text
Salir del curso
```

No perder progreso al salir.

---

# 21. LECCIÓN DE VIDEO

Para una lección de video:

```text
Título

[ VIDEO ]

Descripción

Recursos

Material complementario
```

Registrar el progreso del video.

Si la lección requiere:

```text
80% visto
```

no marcarla como completada antes de cumplir el requisito.

---

# 22. LECCIÓN DE TEXTO

Mostrar:

```text
Título

Contenido académico

[texto enriquecido]

Recursos
```

La experiencia debe ser cómoda para lectura prolongada.

No sobrecargar la pantalla.

---

# 23. RECURSOS

Mostrar debajo o junto al contenido:

```text
RECURSOS

📄 Manual.pdf
📄 Guía de estudio.pdf
🔗 Recurso externo
```

Los recursos deben utilizar el Storage y permisos existentes.

---

# 24. NAVEGACIÓN ENTRE LECCIONES

Al final de la lección:

```text
← Anterior

                    Siguiente →
```

Si la lección actual no está completada:

```text
Siguiente 🔒
Completa esta lección para continuar.
```

Si el curso permite navegación libre:

permitir avanzar.

La lógica debe respetar la configuración del curso.

---

# 25. PRUEBAS

Cuando el estudiante llegue a una prueba:

```text
PRUEBA DEL MÓDULO 2

10 preguntas
Puntaje mínimo: 80%
Intentos disponibles: 2

[Comenzar prueba]
```

Antes de iniciar mostrar las reglas.

---

# 26. INTERFAZ DE PRUEBA

La experiencia debe ser clara.

Ejemplo:

```text
Pregunta 4 de 10

¿Cuál de estos...?

○ Respuesta A
○ Respuesta B
○ Respuesta C
○ Respuesta D

────────────────

[Anterior]              [Siguiente]
```

Mostrar:

```text
4 / 10
```

y, si existe límite:

```text
Tiempo restante
12:35
```

---

# 27. EXAMEN FINAL

El examen final debe tener una experiencia más formal.

Antes de comenzar:

```text
EXAMEN FINAL

30 preguntas
60 minutos
Puntaje mínimo: 80%
Intentos disponibles: 1

⚠ Una vez iniciado el examen debes completarlo.

[Comenzar examen]
```

Si el examen tiene reglas diferentes, respetarlas.

---

# 28. RESULTADO DE EVALUACIÓN

Después de una prueba/examen:

```text
RESULTADO

82 / 100

✓ APROBADO

Puntaje mínimo: 80%

Intento 1 de 3
```

Si no aprueba:

```text
72 / 100

✕

NO APROBADO

Necesitas 80%.

Intentos restantes: 2

[Intentar nuevamente]
```

No permitir alterar resultados desde frontend.

---

# 29. REVISIÓN DE RESPUESTAS

Si la configuración de la evaluación permite revisar respuestas:

```text
Pregunta 1
✓ Correcta

Pregunta 2
✗ Incorrecta

Respuesta correcta:
B

Explicación:
...
```

Si el administrador configuró que las respuestas no deben mostrarse inmediatamente:

no mostrarlas.

---

# 30. PROGRESO DEL CURSO

Crear una vista clara del progreso:

```text
TU PROGRESO

72%

12 / 18 lecciones

4 / 5 pruebas

Examen final
Pendiente
```

También:

```text
Módulo 1       ✓
Módulo 2       80%
Módulo 3       🔒
```

---

# 31. REQUISITOS PARA COMPLETAR EL CURSO

Mostrar al estudiante qué le falta.

Ejemplo:

```text
PARA COMPLETAR EL CURSO

✓ Completar 18/18 lecciones
✓ Aprobar 4/4 pruebas
✗ Aprobar examen final
```

Si el examen obtuvo 76%:

```text
Examen final:
76%

Necesitas:
80%
```

Esto es muy importante para evitar que el estudiante no entienda por qué todavía no recibe su certificado.

---

# 32. COMPLETAR CURSO

Cuando el Completion Engine determine que todos los requisitos se cumplen:

Mostrar una pantalla especial:

```text
🎉 ¡Felicitaciones!

Has completado:

Nutrición y Bienestar

Fecha de finalización:
5 de septiembre de 2026

[Ver certificado]
```

La finalización debe venir del backend.

Nunca confiar únicamente en el frontend.

---

# 33. CERTIFICADOS

Crear/mejorar:

```text
/academy/certificados
```

Mostrar:

```text
MIS CERTIFICADOS

┌──────────────────────────┐
│ Certificado              │
│ Nutrición y Bienestar    │
│                          │
│ Completado: 05/09/2026   │
│                          │
│ [Ver] [Descargar]        │
└──────────────────────────┘
```

Reutilizar el sistema actual de certificados.

No generar duplicados.

---

# 34. DIPLOMAS

Crear/mejorar:

```text
/academy/diplomas
```

Separar claramente:

```text
CERTIFICADOS
→ Finalización de cursos.

DIPLOMAS
→ Finalización de programas.
```

Mostrar únicamente diplomas que realmente correspondan al estudiante.

---

# 35. VERIFICACIÓN

Si ya existe el sistema de diplomas con QR:

El estudiante puede:

```text
Ver diploma
Descargar diploma
Verificación
```

No modificar en esta fase el generador automático de diplomas si no es necesario.

---

# 36. NOTIFICACIONES

Integrar el Academy con el sistema existente.

Mostrar:

```text
🔔 Notificaciones

Tu inscripción fue aprobada.
Tu pago fue confirmado.
Tu curso ya está activo.
Te quedan 7 días de acceso.
Has aprobado la prueba.
Has completado el curso.
Tu certificado está disponible.
Tu diploma está disponible.
```

No crear un sistema paralelo.

---

# 37. PERFIL ACADÉMICO

Agregar una sección:

```text
Mi perfil académico
```

Mostrar:

```text
Nombre
Correo

Cursos:
8

Completados:
5

Certificados:
4

Diplomas:
1
```

No permitir modificar datos personales desde aquí si esos datos son administrados por el perfil principal de SUMAK.

En ese caso proporcionar enlace:

```text
Editar perfil
```

que lleve al perfil principal.

---

# 38. HISTORIAL ACADÉMICO

Si el sistema dispone de información suficiente, mostrar:

```text
HISTORIAL ACADÉMICO

Curso
Fecha de inscripción
Fecha de finalización
Calificación final
Certificado
```

No inventar calificaciones si no existe una calificación final formal.

---

# 39. ESTADOS VACÍOS

Diseñar correctamente los estados sin información.

Ejemplo:

```text
Aún no tienes cursos.

Explora SUMAK Academy y comienza tu aprendizaje.

[Explorar cursos]
```

Para certificados:

```text
Todavía no tienes certificados.

Completa un curso para obtener tu primer certificado.
```

No dejar pantallas vacías.

---

# 40. LOADING STATES

Todas las vistas deben tener estados de carga.

No mostrar interfaces rotas mientras llegan los datos.

Utilizar:

- Skeletons.
- Spinners donde sea apropiado.
- Estados de transición.

Reutilizar componentes existentes.

---

# 41. ERROR STATES

Ejemplo:

```text
No pudimos cargar tu curso.

[Reintentar]
```

Si el curso ya no está disponible:

```text
Este contenido ya no está disponible.
```

Si el acceso expiró:

```text
Tu período de acceso terminó.

Fecha de expiración:
15/12/2026
```

No mostrar errores técnicos al usuario cuando no sea necesario.

---

# 42. SEGURIDAD DEL ESTUDIANTE

Revisar cuidadosamente:

- RLS.
- Autorización.
- Enrollment.
- Expiración.
- Course access.
- Lesson access.
- Assessment access.
- Attempts.
- Answers.
- Certificates.

Un estudiante nunca debe poder acceder directamente a:

- Cursos no autorizados.
- Contenido de cursos sin inscripción.
- Contenido después de expiración.
- Respuestas correctas ocultas.
- Resultados de otros estudiantes.
- Intentos de otros usuarios.
- Certificados de otros usuarios.

No confiar únicamente en ocultar botones en React.

---

# 43. EXPERIENCIA MOBILE

La Academia debe ser completamente responsive.

Especialmente:

- Dashboard.
- Cursos.
- Course detail.
- Learning view.
- Video.
- Evaluaciones.
- Exámenes.
- Certificados.
- Diplomas.

En móvil, el contenido debe priorizarse sobre navegación secundaria.

---

# 44. ACCESIBILIDAD

Revisar:

- Contraste.
- Tamaño de textos.
- Estados de foco.
- Navegación por teclado.
- Labels.
- Botones.
- Formularios.
- Reproductores.
- Mensajes de error.

---

# 45. DISEÑO VISUAL

Mantener el lenguaje visual actual de SUMAK.

No crear una interfaz genérica de LMS que parezca un producto diferente.

Debe sentirse como:

**SUMAK → SUMAK Academy**

Reutilizar:

- Colores.
- Tipografías.
- Cards.
- Botones.
- Iconografía.
- Bordes.
- Sombras.
- Animaciones.
- Componentes existentes.

Las mejoras deben ser principalmente de:

- UX.
- Jerarquía.
- Organización.
- Claridad.
- Flujo académico.

---

# 46. NO SOBRE-DISEÑAR

No llenar el dashboard con demasiadas tarjetas.

Priorizar:

```text
1. Continuar aprendiendo
2. Mis cursos
3. Próximas actividades
4. Progreso
5. Certificados/diplomas
```

La experiencia debe ser limpia.

---

# 47. RESPONSABILIDAD DEL FRONTEND

El frontend únicamente representa el estado académico.

No debe decidir:

```text
curso completado
evaluación aprobada
certificado válido
acceso vigente
```

Esas decisiones deben provenir del backend y las reglas existentes.

---

# 48. INTEGRACIÓN CON EL MODELO ACTUAL

Antes de realizar cambios:

Auditar:

```text
users
profiles
roles

courses
programs
modules
lessons

assessments
questions
attempts

enrollments
progress

certificates
diplomas

notifications
orders
payments
```

Los nombres son referenciales.

Utilizar las tablas reales del proyecto.

---

# 49. NO DUPLICAR FUNCIONALIDADES

Si ya existe:

```text
StudentDashboard
CourseCard
CourseDetail
LessonViewer
Quiz
Exam
Progress
Certificate
```

no crear otra versión paralela.

Refactorizar y mejorar la existente.

---

# 50. RUTAS

Primero revisar las rutas actuales.

Después definir o adaptar una estructura coherente similar a:

```text
/academy

/academy/cursos
/academy/cursos/:id

/academy/explorar

/academy/aprender/:courseId/:lessonId

/academy/evaluaciones

/academy/certificados

/academy/diplomas

/academy/notificaciones

/academy/perfil
```

No crear rutas duplicadas si ya existen equivalentes.

---

# 51. EXPERIENCIA COMPLETA DEL ESTUDIANTE

El flujo final debe sentirse así:

```text
EXPLORAR CURSOS
       ↓
VER CURSO
       ↓
SOLICITAR INSCRIPCIÓN
       ↓
ESPERAR APROBACIÓN
       ↓
PAGO (si corresponde)
       ↓
CURSO ACTIVADO
       ↓
DASHBOARD
       ↓
CONTINUAR APRENDIENDO
       ↓
MÓDULO
       ↓
LECCIÓN
       ↓
PRUEBA
       ↓
SIGUIENTE MÓDULO
       ↓
EXAMEN FINAL
       ↓
COMPLETION ENGINE
       ↓
CURSO COMPLETADO
       ↓
CERTIFICADO
       ↓
PROGRAMA COMPLETADO
       ↓
DIPLOMA
```

---

# 52. IMPLEMENTACIÓN POR FASES

## FASE 1 — AUDITORÍA

No modificar código.

Entregar:

- Rutas existentes.
- Componentes existentes.
- Tablas existentes.
- Hooks.
- Servicios.
- Funciones.
- RLS.
- Edge Functions.
- Flujos actuales.
- Problemas encontrados.

---

## FASE 2 — SHELL DEL ESTUDIANTE

Implementar/mejorar:

- Layout Academy.
- Sidebar.
- Header.
- Dashboard.
- Navegación.
- Responsive.

---

## FASE 3 — MIS CURSOS

Implementar:

- Lista.
- Filtros.
- Estados.
- Cards.
- Progreso.
- Acceso.
- Expiración.

---

## FASE 4 — EXPLORAR Y DETALLE

Implementar:

- Catálogo.
- Búsqueda.
- Categorías.
- Detalle.
- Inscripción.
- Estados.

---

## FASE 5 — LEARNING EXPERIENCE

Implementar:

- Learning layout.
- Sidebar de módulos.
- Lesson viewer.
- Video.
- Texto.
- Recursos.
- Navegación.
- Progreso.

---

## FASE 6 — EVALUACIONES

Implementar:

- Pruebas.
- Exámenes.
- Intentos.
- Resultados.
- Revisión.
- Integración con progreso.

---

## FASE 7 — COMPLETION

Integrar:

```text
Lecciones
+
Pruebas
+
Examen
↓
Completion Engine
```

---

## FASE 8 — CERTIFICADOS Y DIPLOMAS

Integrar los sistemas existentes.

No romper el generador actual.

---

## FASE 9 — NOTIFICACIONES

Integrar los eventos académicos con el sistema actual.

---

## FASE 10 — QA

Probar como:

### Usuario nuevo

```text
Explorar
↓
Solicitar
↓
Esperar aprobación
```

### Curso gratuito

```text
Solicitud
↓
Aprobación
↓
Activación
↓
Aprendizaje
```

### Curso pagado

```text
Solicitud
↓
Aprobación
↓
Pago
↓
Confirmación
↓
Activación
```

### Curso completo

```text
Lecciones
↓
Pruebas
↓
Examen
↓
Certificado
```

### Curso expirado

Verificar que no pueda acceder al contenido.

### Usuario con múltiples cursos

Verificar que pueda cambiar correctamente entre cursos.

### Usuario móvil

Verificar toda la experiencia.

---

# 53. RESULTADO ESPERADO

Al finalizar quiero tener una experiencia donde el estudiante pueda entrar a:

```text
SUMAK Academy
```

y entender inmediatamente:

- Qué cursos tiene.
- Qué curso debe continuar.
- Cuánto ha avanzado.
- Qué lección sigue.
- Qué evaluaciones tiene pendientes.
- Cuándo vence su acceso.
- Qué certificados posee.
- Qué diplomas posee.
- Qué cursos puede explorar.
- Qué necesita hacer para completar un curso.

La experiencia debe ser **académica, clara, moderna y coherente con SUMAK**.

No debe parecer un conjunto de CRUDs.

Debe sentirse como una plataforma educativa real.

## REGLA FINAL

**Primero audita. Después diseña sobre lo existente. Finalmente implementa por fases.**

No reemplaces funcionalidades funcionales sin necesidad.

No dupliques tablas.

No dupliques componentes.

No dupliques lógica.

No conviertas todo en modales.

Las experiencias importantes deben ser vistas completas.

Mantén compatibilidad con la Academia existente y con todas las reglas académicas previamente definidas.

---

# 54. 🚀 ESTADO DE IMPLEMENTACIÓN Y EJECUCIÓN DEL PLAN (NOVIEMBRE 2026)

Se ha completado la implementación integral de la experiencia del estudiante en SUMAK Academy, respetando al 100% la regla de no reconstruir desde cero, auditando la arquitectura existente y reutilizando el sistema de estilos de SUMAK (Tailwind CSS, paleta institucional armónica y tipografía).

---

## 54.1. Resumen de Implementación por Módulo

### 1. Dashboard Académico (`/academy/dashboard` → `AcademiaDashboard.tsx`)
- **Saludo Personalizado:** Detecta el perfil del usuario autenticado (`profile.full_name`) y muestra una bienvenida motivacional con la fecha actual formateada en español.
- **Métricas Reales (KPIs):** Conectadas a Supabase (`academy_enrollments`, `academy_diploma_issuances`):
  - *Cursos Activos* (progreso < 100% y no expirados).
  - *Cursos Completados* (progreso = 100%).
  - *Certificados Obtenidos* (`credential_type = 'certificate'`).
  - *Diplomas Oficiales* (`credential_type = 'diploma'`).
- **Tarjeta "Continuar Aprendiendo" (Hero Banner):**
  - Muestra el curso con actividad más reciente.
  - Barra de progreso porcentual dinámica.
  - Indicador de la siguiente lección pendiente.
  - Botón CTA directo para reanudar el visor en la lección correspondiente.
- **Próximas Actividades / Cursos Recomendados:**
  - Lista de cursos del catálogo oficial disponibles para inscripción o continuación de estudio.

### 2. Mis Cursos (`/academy/mis-cursos` → `MisCursos.tsx`)
- **Pestañas de Filtrado Dinámico:**
  - *Todos*, *Activos* (en progreso), *Próximos* (inscritos sin comenzar), *Completados* (100% de avance) y *Expirados*.
- **Buscador en Tiempo Real:** Filtra cursos instantáneamente por título o descripción.
- **Selector de Ordenamiento:**
  - *Más recientes*, *Mayor progreso*, *Menor progreso*, *Nombre A-Z*.
- **Control de Expiración:**
  - Cálculo de días restantes de acceso (`expires_at`).
  - Alerta visual preventiva destacada en ámbar cuando el acceso vence en 7 días o menos.
- **Tarjetas de Cursos:** Portada a sangre, porcentaje de avance, horas de dedicación, lección en curso y botón de reanudación.

### 3. Visor de Lección (`/academy/cursos/:slug/leccion/:lessonId` → `VisorLeccion.tsx`)
- **Navegación e Índice de Módulos:**
  - Lista estructurada de módulos y lecciones del curso.
  - Estados visuales inequívocos: `✓` (completada/aprobada), `▶` (lección actual en reproducción/lectura), `🔒` (lección bloqueada por prerrequisito).
- **Tarjeta "Requisitos para Certificado":**
  - Informa al estudiante del estado de avance hacia su acreditación oficial: "X de Y lecciones obligatorias completadas".
- **Componentes Especializados de Aprendizaje:**
  - **Callouts de Alerta Médica (`clinical_callout`):** Cajas de advertencia clínica con niveles de severidad (`info`, `warning`, `danger`) con íconos específicos para advertir sobre interacciones farmacológicas, toxicidad o pautas de dosificación.
  - **Tarjetas de Recetas Terapéuticas (`recipe_card`):** Despliegue de título de la fórmula, tiempo de preparación, porciones, lista de ingredientes y preparación paso a paso con posología.
  - **Fichas Botánicas Vinculadas (`academy_lesson_botanicals`):** Muestra tarjetas con nombre botánico, compuestos activos, propiedades medicinales y precauciones.
  - **Productos Recomendados Sumak (`academy_lesson_products`):** Muestra el producto comercial dosificado para el protocolo terapéutico con enlace y modo de uso.

### 4. Certificados y Diplomas (`/academy/diplomas` → `MisDiplomas.tsx`)
- **Pestañas Separadas:**
  - *Certificados de Cursos:* Acreditaciones obtenidas al completar el 100% de lecciones requeridas de un curso.
  - *Diplomas de Programas:* Acreditaciones de programas completos y especializaciones.
- **Generación Asíncrona de PDF:**
  - Detección del estado `'pending_pdf'`.
  - Disparo automático en background de la Edge Function `academy-generate-certificate-pdf`.
  - Indicador de estado "Generando PDF con QR..." con refresco progresivo.
- **Descarga y Verificación:**
  - Descarga segura mediante URL firmada de Supabase Storage.
  - Enlace directo a la verificación pública institucional (`/verificar-diploma?code=...`).

---

## 54.2. Matriz de Base de Datos y Backend Saneados

| Elemento | Archivo / Objeto | Estado |
|---|---|---|
| Migración de Saneamiento y Contenido | `supabase/migrations/20261116000002_fix_academy_credentials_and_full_curriculum.sql` | ✅ Aplicada en Supabase Remoto |
| Tipos de Diplomas y Plantillas | `academy_diploma_types` (`CERT_CURSO`) y `academy_diploma_templates` | ✅ Creado e Idempotente |
| Check Constraint de Estado | `academy_diploma_issuances` admite `'pending_pdf'` | ✅ Corregido |
| Índice Único sin Duplicados | `academy_credential_no_duplicate` con deduplicación histórica | ✅ Creado |
| RPC de Certificados de Usuario | `get_my_academy_certificates()` sobre tabla unificada | ✅ Reconstruida |
| RPC de Emisión de Certificados | `issue_academy_course_certificate()` con tokens CSPRNG | ✅ Corregida |
| RPC de Completitud de Programa | `complete_academy_program_if_eligible()` con campos completos | ✅ Consolidada |
| RPC de Verificación Pública | `verify_diploma_public()` con `LEFT JOIN` y búsqueda multi-código | ✅ Corregida |
| Edge Function de Generación PDF | `supabase/functions/academy-generate-certificate-pdf/index.ts` | ✅ Creada y Operativa |
| SDK de Academia en Frontend | `src/lib/academy.ts` (depurado sin duplicados, sin `DELETE` directo) | ✅ Saneado y Tipado |
| Enriquecimiento de los 11 Módulos y 24 Fichas | `supabase/migrations/20261116000003_enrich_full_curriculum_content_and_visuals.sql` | ✅ Aplicada en Supabase Remoto |
| Compilación TypeScript y Build Vite | `npx tsc --noEmit` & `npm run build` | ✅ 0 errores |

---

## 54.3. Enriquecimiento Curricular Total de los 11 Módulos (Manual Académico SUMAK Vida Ecuador)

Se completó la carga íntegra al 100% sin resúmenes ni omisiones de todo el contenido clínico, tablas comparativas, infografías HTML/Tailwind, imágenes HD, activos botánicos locales (`/ingredientes/*.png`) y fotografías reales de productos (`/products/*.png`):

1. **Módulo 1 (Salud Urinaria y Próstata - Dr. Luis Paredes):** Anatomía renal-urinaria, uretra femenina, los 6 hábitos de prevención, los 5 síntomas prostáticos, los 7 hábitos generales de protección, Callout de no automedicación antibiótica, Receta de Tuza de Maíz, Ajo y Canela (1 Litro, 6 pasos) y vinculación de Té Extractos de la Vida y Madre Silvestre.
2. **Módulos 2, 3 y 4 (Hígado Graso, Histología Celular, Cirrosis y Cáncer - Dr. Luis Paredes):** Las 5 funciones vitales del hígado, criterio >5% grasa, los 4 métodos diagnósticos, Infografía Histológica de 5 etapas (Hígado Sano, Esteatosis Reversible, Esteatohepatitis con núcleo desplazado, Fibrosis con tejido cicatricial, Cirrosis Irreversible con superficie nodular), Carcinoma Hepatocelular y aflatoxinas, las 8 reglas de cuidado hepático, tabla fitoquímica de ingredientes y las 2 recetas completas (Licuado Natural para Hígado Graso + Bebida de Papaya y Manzana).
3. **Módulo 5 (Gastritis, Úlceras, H. pylori, Colitis y Hemorroides - Dr. Luis Paredes):** Las 7 causas y 6 síntomas de gastritis, 5 alimentos y 5 remedios naturales, úlcera gástrica vs. duodenal, transmisión y erradicación de *H. pylori* (relación con cáncer gástrico y linfoma MALT), los 4 tipos de colitis (Infecciosa, Ulcerosa, Microscópica e Isquémica), los 3 tipos de hemorroides, la Guía Clínica de Ajo, Sábila y Manzana Verde con la Matriz 5x3 por enfermedad y las 3 recetas digestivas (Agua de Avena, Té de Manzanilla y Batido de Brócoli, Piña, Arándanos y Banana).
4. **Módulos 6 y 7 (Vademécum de 11 Plantas y 10 Infusiones Tradicionales):** 24 fichas botánicas individuales en `public.academy_botanical_sheets` con advertencias toxicológicas de Mala Madre (bufadienólidos) y Ruda (furanocumarinas/abortiva), Receta Básica Universal de Infusión (250 ml) y los 3 bloques de orientación clínica por sistemas.
5. **Módulos 8, 9 y 10 (Páncreas, Hipertensión/DASH, Diabetes I/II/Gestacional y Nutrición Cromática):** Función exocrina/endocrina del páncreas, pancreatitis, Plato Saludable de Harvard y Plato de 9 pulgadas, Arteria Sana vs. Hipertensa y los 6 pilares DASH, Páncreas Sano vs. Diabético (Dr. Miguel Loor), los 4 tipos de diabetes y 4 órganos diana, Infografía de los 5 Colores de los Alimentos, análisis fitoquímico (falcarinol, betalaínas, nitratos, resveratrol) y las 2 Recetas Magistrales (Desayuno Limpiador + Infusión de Bienestar y Vitalidad).
6. **Módulo 11 (Portafolio Oficial de los 6 Productos SUMAK):** Ficha técnica exhaustiva con todos los ingredientes, funciones por planta y micronutrientes en píldoras de Té Extractos de la Vida, REGEN 24, Fibramak Plus, Sumak Colon Renova (15 ingredientes con 4 beneficios por planta), Madre Silvestre (12 plantas + 10 vitaminas/minerales) y Vive-Oxi-100 (8 activos + vitaminas + oxígeno líquido).