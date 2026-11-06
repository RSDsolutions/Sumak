# 🎨 Bitácora de Rediseño — Sección Estudiantes (Perfil Académico)
**Proyecto:** SUMAK Ecuador — Campus Virtual  
**Archivo Principal Modificado:** [`src/pages/academia/dashboard/PerfilAcademico.tsx`](file:///C:/Users/ara/Downloads/SUMAK/src/pages/academia/dashboard/PerfilAcademico.tsx)  
**Fecha de Implementación:** Noviembre 2026  
**Estándar Aplicado:** Kindev Web Standard 2026 (Zero Box-in-Box, UI Fluida, Sin Contornos, Paleta Pastel Armónica)

---

## 📌 1. Resumen Ejecutivo de la Intervención

Se llevó a cabo una refactorización integral del diseño visual y la ergonomía de la pantalla de **Perfil Académico del Estudiante** (`PerfilAcademico.tsx`). El objetivo central fue erradicar la sobrecarga de cajas anidadas (*box-in-box*), eliminar bordes rígidos/duros, homologar el estilo con la sección **Inicio del Dashboard** (`AcademiaDashboard.tsx`), y estructurar una jerarquía clara en 2 columnas principales.

---

## 🏛️ 2. Arquitectura del Layout y Distribución

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. BANNER INSTITUCIONAL HORIZONTAL (Gradient Verde Bosque & Badges 3D) │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ 2. FICHA DEL ESTUDIANTE (Avatar + Nombre + 2 Columnas de Datos)        │
│    - Col Izquierda: Inscripción, Correo, Ubicación                     │
│    - Col Derecha:   Cédula, Teléfono, [Código de Distribuidor]         │
└────────────────────────────────────────────────────────────────────────┘
─────────────────── [Divisor Sutil: border-slate-100] ────────────────────
┌──────────────────────────────────────┬─────────────────────────────────┐
│ 3. COLUMNA IZQUIERDA (lg:col-span-7) │ 4. COLUMNA DERECHA (lg:col-5)   │
│                                      │                                 │
│  A. MIS CERTIFICACIONES              │  A. DATOS DE CONTACTO           │
│     - Encabezado: Título + Botón     │     - Fondo: bg-[#EBF4ED]       │
│       "Ver todas" en la misma línea  │     - Inputs: Blancos shadow-2xs│
│     - Timeline vertical conectado    │     - Ícono MapPin directo      │
│     - Tarjetas de color border-0     │                                 │
│     - Íconos directos sin cajas      │  B. SEGURIDAD Y CONTRASEÑA      │
│                                      │     - Fondo: Pastel Ámbar/Miel  │
│  B. ATAJOS DEL CAMPUS                │       (FEF6E9 -> FCE3C2)        │
│     - Contenedores pasteles inicio   │     - Inputs: Blancos shadow-2xs│
│     - 3 Accesos rápidos              │     - Ícono Lock directo        │
│     - Íconos directos sin cajas      │     - Botón institucional verde │
└──────────────────────────────────────┴─────────────────────────────────┘
```

---

## 🔍 3. Detalle de Cambios por Componente

### 3.1. Ficha del Estudiante (Datos Personales)
* **Reorganización en 2 Columnas:**
  * **Columna 1:** Fecha de Inscripción, Correo Electrónico y Ubicación (Ciudad / Dirección).
  * **Columna 2:** Cédula / Documento, Teléfono y **Código de Distribuidor** posicionado estrictamente debajo del teléfono.
* **Eliminación de Métricas KPI Superiores:** Se retiraron por completo los contadores flotantes (*En Curso*, *Completados*, *Diplomas* con sus íconos) para despejar la vista y permitir que el usuario acceda de inmediato a las certificaciones sin scroll redundante.
* **Separador de Descanso:** Se agregó un padding superior (`pt-6 sm:pt-8`) y línea divisoria suave (`border-t border-slate-100`) para separar la identidad del estudiante del espacio operativo inferior.

### 3.2. Sección "Mis Certificaciones"
* **Encabezado Unificado:** Se colocó el título `Mis Certificaciones` (`h2`) y el botón interactivo *"Ver todas mis certificaciones"* en la misma fila horizontal (`flex items-center justify-between gap-3`), eliminando el botón al pie del timeline.
* **Eliminación de Badges Numéricos Repetitivos:** Se suprimió la etiqueta que decía `"{diplomasCount} emitidas"` para evitar saturación visual de números.
* **Contenedores de Tarjeta sin Contorno (`border-0`):** Cada certificación en el timeline posee un contenedor de color armónico con sombras ultrafinas (`shadow-2xs`):
  * Ítem 1: `bg-[#EBF4ED]` (Verde institucional suave).
  * Ítem 2: `bg-amber-50/90` (Ámbar suave).
  * Ítem 3: `bg-teal-50/90` (Teal suave).
* **Íconos Libres y Directos:** Se erradicó la caja envolvente blanca (`w-11 h-11 bg-white`), renderizando directamente el componente `<Icon size={24} className={color.iconColor} />` alineado con el texto.

### 3.3. Sección "Atajos del Campus"
* **Ubicación Estratégica:** Se posicionó directamente debajo del timeline de certificaciones en la columna izquierda.
* **Eliminación de Badges y Decoraciones Innecesarias:** Se retiró la etiqueta `"3 accesos rápidos"`, la ilustración SVG de lámpara de estudio (`StudyDeskIllustration`) y las líneas de estado con puntos para mantener un diseño plano y moderno.
* **Homologación con la Sección Inicio (`AcademiaDashboard.tsx`):**
  * **Atajo 1 (Diplomas Oficiales):** Contenedor degradado cálido `bg-gradient-to-r from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2] rounded-2xl p-4 border-0` con ícono `<Award size={26} className="text-[#92400E]" />` sin caja.
  * **Atajo 2 (Cursos en Progreso):** Contenedor degradado salvia `bg-gradient-to-r from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB] rounded-2xl p-4 border-0` con ícono `<BookOpen size={26} className="text-[#1A4E26]" />` sin caja.
  * **Atajo 3 (Explorar Catálogo):** Contenedor degradado azul nórdico `bg-gradient-to-r from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB] rounded-2xl p-4 border-0` con ícono `<Sparkles size={26} className="text-[#1E3A5F]" />` sin caja.

### 3.4. Columna Derecha: Formularios de Actualización
* **Disposición Vertical:** Ambas tarjetas se ubican una debajo de la otra (`space-y-6`), alineadas con la altura de certificaciones y atajos.
* **Tarjeta 1 — Datos de Contacto:**
  * Contenedor: `bg-[#EBF4ED] rounded-3xl p-6 sm:p-7 shadow-xs border-0`.
  * Ícono: `<MapPin size={20} className="text-[#1A4E26]" />` directo, sin contenedor blanco.
  * Inputs: Fondo blanco puro `bg-white text-slate-900 rounded-xl border-0 shadow-2xs focus:ring-1 focus:ring-[#1A4E26]`.
* **Tarjeta 2 — Seguridad y Contraseña:**
  * Contenedor: Antes era verde oscuro saturado; ahora es un degradado ámbar/miel pastel armónico `bg-gradient-to-br from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2] rounded-3xl p-6 sm:p-7 shadow-xs border-0`.
  * Ícono: `<Lock size={20} className="text-[#92400E]" />` directo.
  * Inputs: Fondo blanco puro `bg-white text-slate-900 rounded-xl border-0 shadow-2xs focus:ring-1 focus:ring-amber-600` para máxima legibilidad al escribir la clave.
  * Botón de Acción: `bg-[#1A4E26] hover:bg-[#143D1E] text-white rounded-xl shadow-xs`.

---

## 🎨 4. Tabla de Tokens y Clases de Color Tailwind

| Elemento | Clases Tailwind Aplicadas | Propósito / Sentido Visual |
| :--- | :--- | :--- |
| **Fondo Verde Institucional Suave** | `bg-[#EBF4ED]` | Identidad SUMAK, descansado para lectura |
| **Degradado Pastel Ámbar / Miel** | `from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]` | Contenedor de contraseña y atajo de diplomas |
| **Degradado Pastel Verde Salvia** | `from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]` | Atajo de cursos activos (homologado con Inicio) |
| **Degradado Pastel Azul Nórdico** | `from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]` | Atajo de explorar cursos |
| **Campos de Entrada (Inputs)** | `bg-white border-0 shadow-2xs rounded-xl` | Máximo contraste legible sobre tarjetas pasteles |
| **Contornos Erradicados** | `border-0` | Erradicación total de bordes rígidos y oscuros |
| **Sombras de Contraste** | `shadow-2xs`, `shadow-xs` | Profundidad suave sin elevaciones bruscas |

---

## 🔒 5. Integridad de Código y Backend

> [!IMPORTANT]
> **Cero impacto en el backend:**
> * No se modificaron las llamadas a Supabase Auth (`supabase.auth.updateUser`).
> * No se tocaron migraciones SQL, esquemas de tablas ni RLS policies.
> * Las funciones de actualización de perfil (`profile_estudiantes`) y refresco de estado (`refreshProfile()`) mantienen su tipado TypeScript estricto.
> * La compilación mediante `npm run lint` (`tsc --noEmit`) pasa con **cero errores (`exit code 0`)**.

---

## 👨‍💻 6. Guía Rápida para Desarrolladores Siguientes

1. **Si agregas un nuevo campo al Perfil:**
   Ubícalo dentro del bloque de columnas de datos oficiales en `PerfilAcademico.tsx` (líneas 376-412). Usa siempre la estructura `<div className="flex items-center gap-2.5"><Icon size={16} className="text-[#1A4E26]" /><span>Etiqueta: <strong ...>Valor</strong></span></div>`.
2. **Si añades un nuevo atajo rápido:**
   Usa la clase del contenedor de color degradado `rounded-2xl p-4 border-0` y coloca el ícono directo sin crear un `div` envolvente para mantener consistencia con `AcademiaDashboard.tsx`.
3. **Mantenimiento de Inputs:**
   Preserva siempre `border-0 shadow-2xs bg-white text-slate-900` para asegurar que los formularios conserven su estética ligera sobre fondos pasteles.


---

## 🚀 7. Actualización: Explorar Catálogo, Certificaciones, Programas y Recetas (Noviembre 2026)

### A. Explorar Catálogo (`CatalogoCursos.tsx`):
- **Motor de Imágenes Temáticas por Título (`getCourseThematicImage`):** Cada curso recibe una fotografía nítida y específica basada en las palabras clave de su título (Fundamentos, Estrategia, Cosmética, Fitoterapia, Biomedicina, Nutrición, Ventas, Finanzas, Oratoria, Marketing, etc.).
- **Dispersión Determinista sin Repeticiones:** Galería de 16 fotografías HD que se seleccionan por hash de título para asegurar que ningún curso comparta la misma imagen.
- **Tarjetas sin Contornos:** Contenedores `border-0`, `rounded-3xl` en paleta armónica pastel SUMAK.

### B. Certificaciones (`MisDiplomas.tsx`):
- **Banner Institucional a Ancho Completo (`w-full`):** Fondo verde degradado institucional con badges 3D e información dinámica de credenciales registradas.
- **Pestañas Centradas:** Navegación por tabs ("Todos", "Certificaciones", "Diplomas") perfectamente centrada.
- **Tarjetas en Paleta Pastel:** Contenedores en degradado pastel sin bordes (`border-0`), preservando el 100% de la información preexistente y los botones funcionales en verde bosque oficial (`Descargar PDF` y `Verificar credencial`).

### C. Mis Recetas (`MisRecetas.tsx`) y Programas (`Programas.tsx`):
- Banners a ancho total horizontal sin cajas flotantes.
- Erradicación de la caja contenedora sobre el autor `Dr. Luis Paredes` en las tarjetas de recetas, mostrándolo como texto limpio y tipográfico.
