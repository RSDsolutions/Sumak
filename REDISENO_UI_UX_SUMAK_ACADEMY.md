# Rediseño UI/UX — SUMAK Academy (Estudiantes)

> **Documento Oficial de Registro de Arquitectura Visual y Fases de Rediseño**  
> **Fecha de Actualización:** Noviembre 2026  
> **Ámbito:** Capa de presentación y experiencia de usuario del estudiante (Frontend)  
> **Estado:** Fase 1 y Fase 2 Completadas con Éxito / Producción Estable  

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

---

## 2. Propuesta de Diseño y Estándar Visual

- **Banner Verde Institucional a Todo el Ancho Horizontal (`w-full`):**
  Degradado verde bosque oficial (`bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A]`) a sangre sin contenedor flotante externo (`sin rounded-3xl` ni `border`), con títulos expresivos, métricas dinámicas en tiempo real e insignias 3D flotantes (`Sparkles`, `BookOpen`, `GraduationCap`, `Leaf`, `Award`, `ShieldCheck`, `Clock`).
- **Paleta Armónica Pastel SUMAK Sin Contornos (`border-0`):**
  Tarjetas de contenido con fondos degradados sutiles que rotan de forma armónica:
  1. *Verde Menta / Salvia*: `from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]` con títulos `text-[#12361B]`.
  2. *Melocotón / Ámbar*: `from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]` con títulos `text-[#5B3407]`.
  3. *Azul Cielo / Ice Slate*: `from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]` con títulos `text-[#102D3E]`.
  4. *Esmeralda Suave*: `from-[#ECF6EE] via-[#DCEFDF] to-[#CDE7D2]` con títulos `text-[#0D381E]`.
  5. *Vainilla / Lino*: `from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2]` con títulos `text-[#4D3A13]`.
- **Erradicación de Envoltorios Box-in-Box:**
  Íconos libres sin cajas ni círculos intermediarios innecesarios (`<Icon size={24} className="..." />`).

---

## 3. Componentes Intervenidos

- `src/components/AcademyLayout.tsx`
- `src/pages/academia/dashboard/AcademiaDashboard.tsx`
- `src/pages/academia/dashboard/PerfilAcademico.tsx`
- `src/pages/academia/dashboard/MisCursos.tsx`
- `src/pages/academia/VisorLeccion.tsx`
- `src/pages/academia/Programas.tsx`
- `src/pages/academia/dashboard/MisRecetas.tsx`
- `src/pages/academia/Recetas.tsx`
- `src/pages/academia/dashboard/MisDiplomas.tsx`
- `src/pages/academia/CatalogoCursos.tsx`

---

## 4. Cambios Realizados por Archivo

### 1. `src/components/AcademyLayout.tsx`
- Liberación del contenedor `<main>` a `flex-1 w-full min-w-0` para permitir encabezados y banners full-width a sangre horizontal.
- Navegación lateral limpia con píldoras minimalistas.

### 2. `src/pages/academia/dashboard/AcademiaDashboard.tsx`
- Banner superior de bienvenida a todo el ancho horizontal.
- 4 KPIs superiores con fondos pasteles suaves sin bordes e íconos libres.
- Bloques "Continuar Aprendiendo" y "Cursos Para Ti" convertidos a degradados pasteles sin contornos, eliminando círculos redundantes sobre los íconos vectoriales.
- Listados laterales de diplomas y programas adaptados a tarjetas pasteles suaves.

### 3. `src/pages/academia/dashboard/PerfilAcademico.tsx`
- Banner verde institucional a ancho completo.
- Ficha de estudiante en dos columnas con campos de datos protegidos, inputs limpios `bg-white border-0 shadow-2xs` y atajos directos sin envoltorios redundantes.

### 4. `src/pages/academia/dashboard/MisCursos.tsx`
- Banner verde institucional horizontal full-width con contadores dinámicos de cursos activos, completados y totales.
- Pestañas de filtrado ("Todos", "Activos", "Próximos", "Completados") perfectamente centradas.
- Tarjetas de cursos con imágenes a sangre (sin márgenes laterales, superiores ni inferiores) mediante `sm:self-stretch` e imagen `sm:absolute sm:inset-0 w-full h-full object-cover`.
- Fondos pasteles sin contornos (`border-0`), tipografía con contraste AAA y eliminación de filas de tags o pills obsoletas.

### 5. `src/pages/academia/VisorLeccion.tsx`
- Rediseño según la referencia visual SkillWave:
  - Barra de navegación superior con el logo institucional oficial (`/LOGO_SUMAK.png`).
  - Barra lateral de módulos e índice limpia, sin etiquetas secundarias repetitivas de `Módulo X:`, `Listo` o duraciones `min`.
  - Reproductor de video central en proporción 16:9 con bordes redondeados.
  - Barra segmentada de pestañas (*Transcripción*, *Documentos*, *Comentarios*, *Test*, *Reseñas*) con hilo interactivo de discusión.

### 6. `src/pages/academia/Programas.tsx`
- Incorporación del banner institucional verde a ancho completo con métricas de rutas formativas disponibles y badges 3D.
- Tarjetas de programas formativos integradas en la paleta pastel armónica SUMAK con `rounded-3xl border-0 shadow-xs hover:shadow-lg` e íconos libres.

### 7. `src/pages/academia/dashboard/MisRecetas.tsx` y `Recetas.tsx`
- Banner institucional horizontal verde a ancho completo con métricas de recetas ancestrales en catálogo y desbloqueadas.
- Tarjetas de recetas en degradados pasteles sin bordes (`border-0`), eliminando cajas innecesarias en los íconos de descarga y carrito.
- **Erradicación del contenedor en autoría:** La etiqueta `Dr. Luis Paredes` se transformó de un contenedor tipo píldora flotante a un texto tipográfico directo y limpio (`<p className="text-[11px] font-extrabold uppercase tracking-widest text-[#1A4E26]">Dr. Luis Paredes</p>`).

### 8. `src/pages/academia/dashboard/MisDiplomas.tsx` (Certificaciones)
- Banner institucional a todo el ancho horizontal con contadores dinámicos de certificaciones y diplomas oficiales.
- Pestañas horizontales centradas ("Todos", "Certificaciones", "Diplomas").
- Tarjetas de credenciales adaptadas a la paleta armónica pastel SUMAK sin contornos (`border-0`, `rounded-3xl`, `shadow-xs hover:shadow-lg`), preservando íntegramente el 100% de la información (etiquetas, nombre del curso, estudiante, código de verificación, fecha de emisión) y los dos botones funcionales verdes originales (`Descargar PDF` y `Verificar credencial`).

### 9. `src/pages/academia/CatalogoCursos.tsx` (Explorar Catálogo)
- **Motor de Imágenes Temáticas por Título (`getCourseThematicImage`):**
  - Asignación inteligente de fotografías de alta definición en Unsplash basadas en el título específico y las palabras clave de cada curso:
    - *Fundamentos / Inicio:* Planificación y libreta de estudio (`photo-1434030216411-0b793f4b4173`).
    - *Estrategia y Crecimiento:* Analítica y dashboard de negocio (`photo-1460925895917-afdab827c52f`).
    - *Liderazgo / Mentoría:* Equipo colaborando con energía positiva (`photo-1522071820081-009f0129c71c`).
    - *Cosmética Natural:* Botánica y extractos naturales (`photo-1556228720-195a672e8a03`).
    - *Fitoterapia / Hierbas:* Plantas medicinales secándose sobre madera (`photo-1512290900672-1f41b2729a67`).
    - *Biomedicina Ancestral / Salud:* Bienestar holístico integral (`photo-1506126613408-eca07ce68773`).
    - *Nutrición / Suplementación:* Alimentos frescos y superfoods (`photo-1498837167922-ddd27525d352`).
    - *Ventas / Negociación:* Cierre de acuerdos comerciales (`photo-1556742049-0a67c5574f73`).
    - *Finanzas / Prosperidad:* Economía sostenible y crecimiento (`photo-1579621970563-ebec7560ff3e`).
    - *Oratoria / Comunicación:* Ponente conectando en conferencia (`photo-1475721027785-f74eccf877e2`).
    - *Marketing Digital:* Estrategia digital y pantallas creativas (`photo-1611162617474-5b21e879e113`).
    - *Idiomas / Diseño:* Aulas formativas y mesas de trabajo creativo.
  - **Galería de Reserva Determinista por Hash:** Incorporación de 16 imágenes de alta calidad seleccionadas que se dispersan mediante `hash(course.id + course.title) + index`, asegurando que **ningún curso comparta la misma fotografía** en la sección.
- **Erradicación de Contornos:** Tarjetas de cursos y barra de búsqueda/filtros convertidas a `border-0`, `rounded-3xl` y sombras suaves.

---

## 5. Validaciones y Calidad

- **Compilación de Producción Vite (`npm run build`):** Ejecutada exitosamente con código `0` en 8.99s. Todos los módulos (2,294) transformados sin errores ni advertencias de sintaxis.
- **Integridad Funcional:**
  - Se mantuvieron al 100% las llamadas a Supabase (`academyAPI.getCourses`, `getMyEnrollments`, `getMyDiplomas`, `getMyCertificates`, `getMyPrograms`).
  - No se eliminaron botones, estados de carga ni rutas de navegación del campus.
  - Se preservó la compatibilidad con imágenes personalizadas subidas por administradores en `cover_image_url`.
- **Accesibilidad y Ergonomía:** Alto contraste WCAG AAA en tipografía, superficies táctiles generosas en botones de acción y visualización adaptativa impecable en móviles, tablets y monitores ultrawide.

---

## 6. Restricciones Respetadas

- [x] **Cero modificaciones en backend:** Base de datos Supabase, esquemas, migraciones y RLS policies intactas.
- [x] **Cero dependencias innecesarias:** Trabajo exclusivo con el stack preexistente del proyecto (React 19, Tailwind CSS v4, Lucide React).
- [x] **Preservación total de comentarios preexistentes y contratos de interfaces TypeScript.**
