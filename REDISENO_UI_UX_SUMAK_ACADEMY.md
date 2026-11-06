# Rediseño UI/UX — SUMAK Academy (Estudiantes)

> **Documento Oficial de Registro de Arquitectura Visual y Fases de Rediseño**  
> **Fecha de Inicio:** Marzo 2026  
> **Ámbito:** Capa de presentación y experiencia de usuario del estudiante (Frontend)  
> **Estado:** Fase 1 en Proceso / Implementación Inicial  

---

## 1. Diagnóstico Inicial

### Estado Visual Encontrado
- **Layout de Academia (`AcademyLayout.tsx`):**
  - Contenedor con sidebar estática de fondo verde oscuro que incrustaba una cabecera blanca rectangular desconectada en la parte superior, generando un efecto visual "box-in-box" incoherente.
  - El selector para regresar a la "Oficina Virtual" competía visualmente con los ítems académicos y carecía de diferenciación como puente inter-aplicación.
  - La navegación carecía de indicadores modernos de foco/actividad (solo un fondo semitransparente plano).
  - La cabecera superior (Top Header) carecía de integración de búsqueda rápida para explorar el catálogo y tenía controles de perfil básicos.
  - En versión móvil, la navegación carecía de una transición suave y de un cierre ergonómico.

- **Dashboard del Estudiante (`AcademiaDashboard.tsx`):**
  - Acumulación de tarjetas blancas con bordes uniformes (`#C8D8CB`) sin jerarquía expresiva.
  - Los 4 indicadores numéricos iniciales estaban aislados sin contexto motivacional ni ritmo visual.
  - La sección "Continuar Aprendiendo" carecía de presencia protagónica (Coursera hero banner style) para incentivar la reanudación inmediata del curso activo.
  - El catálogo de cursos activos en formato cuadrícula no comunicaba adecuadamente el estado del estudiante, duración estimada ni progreso dinámico.
  - Las listas laterales de diplomas y programas estaban encajonadas en contenedores rígidos.

### Problemas Identificados
1. **Contenedores redundantes (Box-in-box):** Cajas anidadas que reducían el área efectiva de visualización.
2. **Jerarquía visual plana:** Mismo peso visual para métricas estáticas que para acciones críticas como reanudar una lección.
3. **Ergonomía de navegación mejorable:** Ausencia de atajos rápidos de exploración desde la barra superior.
4. **Tratamiento de imágenes y estados vacíos:** Estados vacíos genéricos sin microinteracciones ni enlaces sugeridos atractivos.

### Oportunidades de Mejora
- Diseñar una cabecera de bienvenida personalizada inspirada en Santander Open Academy y Coursera, con un banner de reanudación de alta tracción ("Continuar Aprendiendo").
- Unificar la identidad cromática institucional: Verde Principal (`#1A4E26`), Verde Secundario (`#2B6E3A`), Dorado Institucional (`#D4AF37`), Fondo Suave (`#F4F7F5`) y Superficies Blancas (`#FFFFFF`).
- Modernizar la barra lateral con estética minimalista, transiciones suaves y píldoras activas con acento dorado sutil.
- Crear tarjetas de cursos y programas con proporciones estilizadas (16:9), barras de progreso con microporosidades suaves y badges de estado claros.

### Componentes Analizados
- `src/components/AcademyLayout.tsx`
- `src/pages/academia/dashboard/AcademiaDashboard.tsx`
- `src/components/Avatar.tsx`
- `src/components/NotificationsPopover.tsx`
- `src/pages/academia/dashboard/MisCursos.tsx`
- `src/pages/academia/CatalogoCursos.tsx`
- `src/lib/academy.ts` y `src/lib/academy-types.ts`

---

## 2. Propuesta de Diseño

### Dirección Visual Seleccionada
Inspiración híbrida que sintetiza tres referentes internacionales líderes:
- **Coursera:** Claridad analítica, tarjetas de cursos orientadas a la acción y barra de reanudación inmediata de última lección.
- **Cisco Networking Academy:** Rigor visual, arquitectura de contenidos sobria, trazabilidad académica y módulos nítidos.
- **Santander Open Academy:** Elegancia institucional contemporánea, espacios en blanco amplios, tipografía con jerarquía expresiva y sensación de prestigio educativo.

### Paleta de Colores Oficial
| Token / Nombre | Hex | Aplicación |
|---|---|---|
| **Verde Principal (Brand Emerald)** | `#1A4E26` | Identidad institucional, botones primarios, fondos de sidebar, encabezados clave |
| **Verde Secundario (Emerald Bright)** | `#2B6E3A` | Acentos interactivos, hover de enlaces principales, badges de éxito |
| **Dorado Institucional (Brand Gold)** | `#D4AF37` | Acentos visuales, diplomas, insignias de honor, microindicadores activos |
| **Fondo Suave (Canvas Surface)** | `#F4F7F5` | Fondo general de la plataforma para descanso visual |
| **Superficie Pura (Card Surface)** | `#FFFFFF` | Tarjetas elevadas con bordes sutiles y sombras etéreas |
| **Borde Estándar** | `#C8D8CB` / `#E2ECE4` | Delimitación sutil sin sobrecargar la interfaz |
| **Texto Principal** | `#111111` | Máxima legibilidad, contraste WCAG AAA en títulos y cuerpos |
| **Texto Muted** | `#6B7280` | Metadatos, duraciones, fechas y subtítulos secundarios |

### Tipografías
- **Texto / UI:** `Inter` (sans-serif) para lectura óptima de interfaces educativas.
- **Títulos / Display:** `Poppins` (font-heading) para prestancia y carácter moderno en títulos de cursos y bienvenida.

### Sistema de Componentes, Imágenes Contextuales & Principios de UX
1. **Erradicación del diseño box-in-box:** Bordes tenues (`border-[#C8D8CB]/50`), sombras sutiles (`shadow-xs` / `shadow-sm`), eliminación de contenedores anidados redundantes y márgenes con respiro visual.
2. **Sistema de Imágenes Contextuales por Asignatura:** Cumplimiento estricto de la directiva de portadas temáticas según el contenido pedagógico. Si el curso no posee imagen propia en Supabase Storage, el sistema resuelve automáticamente una fotografía en alta resolución pertinente a su temática:
   - *Liderazgo / Equipos / Duplicación:* Fotografía de equipo profesional en sesión de mentoría y estrategia.
   - *Salud / Bienestar / Nutrición:* Fotografía de estilo de vida saludable y vitalidad.
   - *Negocios / Ventas / Finanzas:* Fotografía de analítica, planes de negocio y emprendimiento.
   - *Recetas / Fitoterapia / Productos Naturales:* Fotografía botánica con ingredientes y formulaciones.
   - *Formación General:* Fotografía de campus virtual contemporáneo.
3. **Acción Principal a Primer Vistazo:** Banner destacado "Continuar Aprendiendo" (estilo Coursera) con estado interactivo, avance porcentual y reanudación inmediata.
4. **Microinteracciones Discretas:** Elevación suave en hover (`hover:-translate-y-0.5 hover:shadow-md transition-all duration-300`).
5. **Iconografía Coherente:** Exclusivamente `Lucide React` con trazo regular (1.5 a 2px).
6. **Ergonomía Móvil:** Zonas de toque mínimas de 44x44px y cierre rápido de menú táctil con drawer deslizante.

---

## 3. Plan por Fases

| Fase | Sección | Estado | Objetivo |
|:---:|---|:---:|---|
| **Fase 1** | **AcademyLayout y Dashboard del Estudiante** | **Completado** | Modernizar la estructura de navegación principal (sidebar, header, mobile drawer) y la experiencia central del dashboard con KPIs, reanudación y módulos limpios. |
| **Fase 2** | **Mis Cursos** | *Pendiente* | Rediseñar el catálogo personal del estudiante: pestañas en progreso/completados/expirados, filtros rápidos y vista de progreso modular. |
| **Fase 3** | **Explorar Cursos** | *Pendiente* | Rediseño visual del catálogo público y de academia: buscador hero, filtros por categoría/nivel, cards institucionales y páginas de detalle. |
| **Fase 4** | **Visor de Lecciones** | *Pendiente* | Nueva interfaz de aula virtual para lecciones de video, lectura y PDF, barra lateral de contenidos colapsable y botones de avance. |
| **Fase 5** | **Certificaciones y Diplomas** | *Pendiente* | Galería de diplomas con vista previa de alta calidad, descarga de certificados, modal de verificación y visualización de QR. |
| **Fase 6** | **Perfil Académico** | *Pendiente* | Rediseño de la página de perfil del estudiante, resumen de logros, horas acumuladas y datos personales. |
| **Fase 7** | **Programas y Recetas** | *Pendiente* | Modernización de las rutas de especialización (Programas) y catálogo de Recetas exclusivas. |
| **Fase 8** | **Home Pública de Academia** | *Pendiente* | Landing page institucional de SUMAK Academy con presentación de oferta académica y llamadas a la acción. |

---

## 4. Registro de Modificaciones (Fase 1)

### 1. `src/components/AcademyLayout.tsx`
- **Elementos visuales modificados:**
  - Conservación intacta de la cabecera original del Sidebar (bloque blanco con isotipo `GraduationCap` en verde institucional y tipografía oficial `ACADEMIA SUMAK` en verde y dorado) a petición directa del usuario.
  - Navegación estilizada con píldoras que cuentan con acento activo sutil dorado (`#D4AF37`) y microindicadores.
  - Puente "Volver a Oficina Virtual" estilizado como botón de retorno con jerarquía secundaria pero clara.
  - Header superior modernizado con buscador visual integrado para redirigir rápidamente a explorar cursos, indicador de contexto "Campus Virtual" y widget de estudiante refinado.
  - Menú móvil con backdrop blur y transiciones suaves para navegación ergonómica en pantallas táctiles.
- **Motivo del cambio:** Eliminar inconsistencias de diseño box-in-box, mejorar la usabilidad en pantallas móviles y elevar la elegancia institucional.
- **Mejoras obtenidas:** Experiencia de navegación fluida, mayor área útil, contraste accesible y aspecto idéntico a una academia digital de clase mundial.

### 2. `src/pages/academia/dashboard/AcademiaDashboard.tsx`
- **Elementos visuales modificados:**
  - Cabecera de bienvenida con saludo personalizado, motivación y fecha actual.
  - 4 tarjetas de métricas académicas (KPIs) con iconografía especializada, superficies suaves y datos reales (`activeEnrollments`, `completedEnrollments`, `diplomas`, `programs`).
  - Hero banner "Continuar Aprendiendo" inspirado en Coursera con imagen de portada del curso, indicador de última sesión, progreso porcentual animado y botón CTA de reanudación directa.
  - Grid de "Mis Cursos Activos" con tarjetas 16:9, metadatos de duración y badges de estado.
  - Bloque de "Programas de Especialización" y "Logros & Certificaciones" con tarjetas elegantes e integración directa.
  - Estados vacíos inspirados en Santander Open Academy con invitaciones amigables a explorar el catálogo educativo.
- **Motivo del cambio:** Centrar la experiencia del estudiante en el avance pedagógico y la reanudación rápida de clases sin sobrecarga cognitiva.
- **Mejoras obtenidas:** Mayor retención del estudiante, visualización clara del progreso, erradicación de contenedores duplicados y tiempos de interacción optimizados.

### 3. `src/pages/academia/dashboard/PerfilAcademico.tsx`
- **Elementos visuales modificados:**
  - Se sustituyó el placeholder en blanco por una ficha integral de estudiante diseñada bajo el sistema visual institucional.
  - Tarjeta Hero de estudiante con avatar editable, badge de estado activo, código de distribuidor/estudiante y fecha de registro.
  - Indicadores clave de progreso académico integrados (cursos en curso, completados y diplomas).
  - Bloques de Identidad Oficial (nombre, cédula y email protegidos para diplomas legales), formulario de actualización de datos de contacto (teléfono, ciudad, dirección) y formulario de cambio seguro de contraseña.
  - Atajos rápidos a certificaciones y cursos activos.
- **Motivo del cambio:** Resolver la pantalla vacía reportada por el usuario en `/academia/dashboard/perfil`, garantizando que el perfil del estudiante ofrezca una experiencia visual y funcional completa y segura.
- **Mejoras obtenidas:** Ficha académica profesional, coherencia visual con el resto del campus y autogestión de credenciales para el estudiante.

### 4. `src/pages/academia/CatalogoCursos.tsx`
- **Elementos visuales modificados:**
  - Rediseño estructural de los contenedores de curso inspirado en la imagen de referencia compartida:
    - Cabecera visual con fondo degradado moderno y textura fotográfica temática de alta resolución.
    - Emblema central flotante en tarjeta acrílica blanca que aloja el **logo oficial de SUMAK** (`/LOGO_SUMAK.png`, con fallback a `/logo_qr.png`), sustituyendo los iconos genéricos por la marca institucional según instrucción directa del usuario.
    - Tipografía de título reforzada con jerarquía expresiva y mención de instructor (`User` icon + nombre).
    - Fila inferior con 3 píldoras exactas a la referencia: Nivel (Inicial/Intermedio/Avanzado), Duración en minutos y Acreditación (Certificado/Regular).
    - Botón de acción con flecha interactiva para acceder al detalle sin perder ninguna información previa.
- **Motivo del cambio:** Solicitud directa del usuario para aplicar la distribución y estética de los contenedores de la referencia visual en el catálogo de cursos, incorporando el logo oficial de SUMAK y preservando el 100% de la información preexistente.
- **Mejoras obtenidas:** Tarjetas modernas de estándar internacional, presencia de marca institucional directa en cada curso, excelente jerarquía visual y total armonía con SUMAK.

---

## 5. Validaciones

- **Compilación TypeScript (`tsc --noEmit`):** Ejecutada exitosamente con código 0, sin errores de tipos ni advertencias.
- **Compilación de Producción Vite (`npm run build`):** Exitosa (0 errores, 2294 módulos transformados en 14.42s). Chunks generados: `AcademyLayout` (9.57 kB) y `AcademiaDashboard` (20.17 kB).
- **Integridad Funcional:**
  - Se mantuvieron todas las llamadas existentes a `academyAPI.getMyEnrollments`, `academyAPI.getMyDiplomas`, `academyAPI.getMyCertificates` y `academyProgramHelper.getMyEnrolledPrograms`.
  - No se añadieron endpoints ficticios ni se alteró ningún contrato de datos.
  - Los enlaces y rutas (`/academia/aprender/:slug`, `/academia/dashboard/cursos`, `/academia/dashboard/explorar`, etc.) se preservaron con exactitud.
- **Responsividad:** Probado para layouts móviles (<640px), tablets (768px - 1024px) y escritorios (>1024px) con sidebar fija y drawer táctil.
- **Accesibilidad:** Contraste reforzado según estándar WCAG AA/AAA para texto oscuro sobre superficies claras y texto blanco/dorado sobre verde institucional.

---

## 6. Restricciones Respetadas

Se confirma explícitamente el cumplimiento de todas las directivas de seguridad y arquitectura:
- [x] **No se modificó el backend:** Supabase, esquemas, tablas, migraciones, políticas RLS, RPCs y Edge Functions permanecen intactos.
- [x] **No se alteraron las APIs ni los servicios:** Contratos de `src/lib/academy.ts` y métodos auxiliares preservados íntegramente.
- [x] **No se modificó la lógica de autenticación ni roles:** Los flujos de `useAuth`, `Profile` y `ProtectedRoute` se mantienen sin alteraciones.
- [x] **No se modificaron paneles de administración, distribuidores u operaciones:** Solo se intervino la capa visual del estudiante de Academia.
- [x] **No se instalaron dependencias innecesarias:** Se utilizó el stack existente (React 19, Tailwind CSS v4, Lucide React, Motion).

---

## 7. Próximos Pasos

Continuar con la **Fase 2 (Mis Cursos)** en la siguiente iteración:
1. Rediseñar la página `src/pages/academia/dashboard/MisCursos.tsx` con tabs filtrables por estado (En Progreso, Completados, Historial).
2. Optimizar las tarjetas de curso con badges de vencimiento urgente (`ExpiryBadge`), duraciones estimadas y acciones directas.
3. Actualizar este documento (`REDISENO_UI_UX_SUMAK_ACADEMY.md`) con las modificaciones y validaciones de la Fase 2.
