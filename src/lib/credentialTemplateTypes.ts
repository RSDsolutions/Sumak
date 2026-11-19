// =============================================================================
// SUMAK Academy — Credential Template Studio v2 Schema, Assets & Presets
// =============================================================================

export type PageSizeId = 'A4' | 'letter';
export type PageOrientation = 'landscape' | 'portrait';

export type FrameStyleId =
  | 'none'
  | 'classic_double'
  | 'royal_ornate'
  | 'modern_side_ribbon'
  | 'botanical_minimal'
  | 'guilloche_luxury';

export type TemplateFontFamily =
  | 'Cinzel'
  | 'Playfair Display'
  | 'Cormorant Garamond'
  | 'Great Vibes'
  | 'Poppins'
  | 'Montserrat'
  | 'Inter'
  | 'Courier New';

export interface TemplateCanvasConfig {
  pageSize: PageSizeId;
  orientation: PageOrientation;
  backgroundColor: string;
  useGradient: boolean;
  gradientColor2: string;
  gradientAngle: number; // degrees
  backgroundImageUrl?: string | null;
  backgroundImageOpacity: number; // 0..1
  backgroundImageFit: 'cover' | 'stretch' | 'contain';
  watermarkEnabled: boolean;
  watermarkText?: string;
  watermarkImageUrl?: string | null;
  watermarkOpacity: number; // 0.02..0.25
}

export interface TemplateFrameConfig {
  style: FrameStyleId;
  primaryColor: string;
  accentColor: string;
  margin: number; // in canvas pt (20..60)
  thickness: number; // 1..8
}

export type LayerKind = 'text' | 'image' | 'shape' | 'qr';

interface BaseLayer {
  id: string;
  kind: LayerKind;
  name: string;
  x: number; // canvas pt (A4 landscape = 841.89 x 595.28)
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0..1
  visible: boolean;
  locked?: boolean;
}

export interface TextLayer extends BaseLayer {
  kind: 'text';
  text: string; // supports {{participant_name}}, {{course_name}}, etc.
  fontFamily: TemplateFontFamily;
  fontSize: number; // pt
  fontWeight: '400' | '600' | '700' | '900';
  italic: boolean;
  underline: boolean;
  textTransform: 'none' | 'uppercase' | 'capitalize';
  color: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number; // px/pt
  lineHeight: number; // multiplier e.g. 1.25
  shadowEnabled?: boolean;
  shadowColor?: string;
  pillBackground?: string | null; // optional badge/pill behind text
  pillRadius?: number;
  pillPaddingX?: number;
  pillPaddingY?: number;
}

export interface ImageLayer extends BaseLayer {
  kind: 'image';
  src: string;
  objectFit: 'contain' | 'cover';
  borderRadius: number;
  shadowEnabled?: boolean;
  borderColor?: string | null;
  borderWidth?: number;
}

export type ShapeVariant =
  | 'divider_line'
  | 'ornamental_divider'
  | 'signature_line'
  | 'rectangle'
  | 'circle'
  | 'seal_rosette';

export interface ShapeLayer extends BaseLayer {
  kind: 'shape';
  variant: ShapeVariant;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius?: number;
  // For seal_rosette
  sealTopText?: string;
  sealCenterText?: string;
  sealBottomText?: string;
  sealTextColor?: string;
}

export interface QrLayer extends BaseLayer {
  kind: 'qr';
  fgColor: string;
  bgColor: string;
  borderColor: string;
  showFrame: boolean;
  captionText: string;
  captionColor: string;
}

export type TemplateLayer = TextLayer | ImageLayer | ShapeLayer | QrLayer;

export interface TemplateDesignV2 {
  v: 2;
  canvas: TemplateCanvasConfig;
  frame: TemplateFrameConfig;
  layers: TemplateLayer[];
}

export interface TemplateVariableMeta {
  token: string;
  label: string;
  sample: string;
  description: string;
}

export const TEMPLATE_VARIABLES: TemplateVariableMeta[] = [
  {
    token: '{{participant_name}}',
    label: 'Nombre del Estudiante',
    sample: 'Dra. María Elena Zambrano Paredes',
    description: 'Nombre completo oficial del estudiante graduado',
  },
  {
    token: '{{course_name}}',
    label: 'Nombre del Curso / Programa',
    sample: 'Especialización Clínica en Fitoterapia y Salud Renal',
    description: 'Título exacto del curso o programa acreditado',
  },
  {
    token: '{{diploma_type_name}}',
    label: 'Tipo de Credencial',
    sample: 'DIPLOMA DE ESPECIALIZACIÓN',
    description: 'Nombre del tipo (ej. Certificado de Curso, Diploma de Honor)',
  },
  {
    token: '{{issue_date}}',
    label: 'Fecha de Emisión',
    sample: 'Emitido en Ecuador, el 18 de noviembre de 2026',
    description: 'Fecha formateada en español cuando se emite',
  },
  {
    token: '{{diploma_number}}',
    label: 'N° de Registro Oficial',
    sample: 'SUMAK-DIP-2026-000128',
    description: 'Código secuencial único del registro académico',
  },
  {
    token: '{{verification_code}}',
    label: 'Código de Verificación',
    sample: 'SUMAK-8F4K9P2Q',
    description: 'Código público para validar la autenticidad en línea',
  },
  {
    token: '{{signatory_name}}',
    label: 'Nombre del Firmante',
    sample: 'Dr. Luis Paredes',
    description: 'Autoridad académica firmante de la plantilla',
  },
  {
    token: '{{signatory_title}}',
    label: 'Cargo del Firmante',
    sample: 'Director Médico y Formador de Formadores • SUMAK Academy',
    description: 'Título o cargo institucional debajo de la firma',
  },
  {
    token: '{{duration_hours}}',
    label: 'Duración / Carga Horaria',
    sample: '40 horas académicas certificadas',
    description: 'Duración estimada del curso o programa',
  },
];

export const TEMPLATE_FONTS: { id: TemplateFontFamily; label: string; styleTag: string }[] = [
  { id: 'Cinzel', label: 'Cinzel', styleTag: 'Imperial Ceremonial' },
  { id: 'Playfair Display', label: 'Playfair Display', styleTag: 'Editorial Elegante' },
  { id: 'Cormorant Garamond', label: 'Cormorant Garamond', styleTag: 'Clásica Universitaria' },
  { id: 'Great Vibes', label: 'Great Vibes', styleTag: 'Caligrafía / Firma' },
  { id: 'Poppins', label: 'Poppins', styleTag: 'Institucional SUMAK' },
  { id: 'Montserrat', label: 'Montserrat', styleTag: 'Moderna Geométrica' },
  { id: 'Inter', label: 'Inter', styleTag: 'Limpia / Lectura' },
  { id: 'Courier New', label: 'Courier New', styleTag: 'Serial / Código' },
];

export const SUMAK_COLOR_SWATCHES = [
  '#0B2913',
  '#1A4E26',
  '#2B6E3A',
  '#D4AF37',
  '#B8860B',
  '#92400E',
  '#111111',
  '#374151',
  '#6B7280',
  '#FDFBF5',
  '#FAFDFB',
  '#FFFFFF',
  '#7C2D12',
  '#1E3A8A',
];

export function getCanvasDimensions(pageSize: PageSizeId, orientation: PageOrientation): { width: number; height: number } {
  const baseW = pageSize === 'letter' ? 792 : 841.89;
  const baseH = pageSize === 'letter' ? 612 : 595.28;
  return orientation === 'portrait'
    ? { width: baseH, height: baseW }
    : { width: baseW, height: baseH };
}

// -----------------------------------------------------------------------------
// Crisp Built-in Transparent SVG-to-DataURL Graphic Assets (Zero External Deps)
// -----------------------------------------------------------------------------
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export interface BuiltInGraphicAsset {
  id: string;
  label: string;
  category: 'logos' | 'sellos' | 'adornos';
  src: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const BUILT_IN_GRAPHICS: BuiltInGraphicAsset[] = [
  {
    id: 'sumak_logo',
    label: 'Logo Oficial SUMAK',
    category: 'logos',
    src: '/LOGO_SUMAK.png',
    defaultWidth: 130,
    defaultHeight: 60,
  },
  {
    id: 'sumak_qr_logo',
    label: 'Emblema SUMAK QR',
    category: 'logos',
    src: '/logo_qr.png',
    defaultWidth: 68,
    defaultHeight: 68,
  },
  {
    id: 'gold_wax_seal',
    label: 'Sello Dorado con Cintas',
    category: 'sellos',
    defaultWidth: 112,
    defaultHeight: 136,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 265">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#F6E27A"/>
            <stop offset="45%" stop-color="#D4AF37"/>
            <stop offset="100%" stop-color="#8C6214"/>
          </linearGradient>
          <linearGradient id="r1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1A4E26"/>
            <stop offset="100%" stop-color="#0B2913"/>
          </linearGradient>
        </defs>
        <polygon points="75,160 110,160 95,255 72,235 50,250" fill="url(#r1)" stroke="#D4AF37" stroke-width="2"/>
        <polygon points="145,160 110,160 125,255 148,235 170,250" fill="url(#r1)" stroke="#D4AF37" stroke-width="2"/>
        <circle cx="110" cy="105" r="82" fill="url(#g1)" stroke="#7A5210" stroke-width="4"/>
        <circle cx="110" cy="105" r="71" fill="none" stroke="#FFF8DC" stroke-width="2.5" stroke-dasharray="6 4"/>
        <circle cx="110" cy="105" r="62" fill="#0B2913" stroke="#F6E27A" stroke-width="2.5"/>
        <text x="110" y="88" text-anchor="middle" fill="#F6E27A" font-family="serif" font-weight="700" font-size="13" letter-spacing="2">EXCELENCIA</text>
        <text x="110" y="114" text-anchor="middle" fill="#FFFFFF" font-family="serif" font-weight="900" font-size="24" letter-spacing="3">SUMAK</text>
        <text x="110" y="135" text-anchor="middle" fill="#D4AF37" font-family="sans-serif" font-weight="700" font-size="12" letter-spacing="2.5">ACADEMY</text>
      </svg>
    `),
  },
  {
    id: 'emerald_medal',
    label: 'Medalla Esmeralda Certificada',
    category: 'sellos',
    defaultWidth: 105,
    defaultHeight: 105,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="em" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stop-color="#2B6E3A"/>
            <stop offset="100%" stop-color="#0B2913"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#em)" stroke="#D4AF37" stroke-width="6"/>
        <circle cx="100" cy="100" r="78" fill="none" stroke="#D4AF37" stroke-width="2" stroke-dasharray="4 4"/>
        <circle cx="100" cy="100" r="68" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.7"/>
        <text x="100" y="80" text-anchor="middle" fill="#D4AF37" font-family="sans-serif" font-weight="800" font-size="13" letter-spacing="2">SELLO OFICIAL</text>
        <text x="100" y="109" text-anchor="middle" fill="#FFFFFF" font-family="serif" font-weight="900" font-size="25" letter-spacing="2">SUMAK</text>
        <text x="100" y="131" text-anchor="middle" fill="#A7F3D0" font-family="sans-serif" font-weight="700" font-size="11" letter-spacing="2">VERIFICADO</text>
      </svg>
    `),
  },
  {
    id: 'gold_laurel',
    label: 'Corona de Laureles Dorada',
    category: 'adornos',
    defaultWidth: 130,
    defaultHeight: 75,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 150">
        <g fill="none" stroke="#C99E2E" stroke-width="3.2" stroke-linecap="round">
          <path d="M125 130 C72 122 36 86 38 35"/>
          <path d="M135 130 C188 122 224 86 222 35"/>
        </g>
        <g fill="#D4AF37">
          <ellipse cx="42" cy="48" rx="12" ry="5" transform="rotate(-35 42 48)"/>
          <ellipse cx="52" cy="70" rx="13" ry="5" transform="rotate(-22 52 70)"/>
          <ellipse cx="66" cy="92" rx="13" ry="5" transform="rotate(-10 66 92)"/>
          <ellipse cx="86" cy="110" rx="13" ry="5" transform="rotate(8 86 110)"/>
          <ellipse cx="109" cy="122" rx="12" ry="5" transform="rotate(18 109 122)"/>
          <ellipse cx="218" cy="48" rx="12" ry="5" transform="rotate(35 218 48)"/>
          <ellipse cx="208" cy="70" rx="13" ry="5" transform="rotate(22 208 70)"/>
          <ellipse cx="194" cy="92" rx="13" ry="5" transform="rotate(10 194 92)"/>
          <ellipse cx="174" cy="110" rx="13" ry="5" transform="rotate(-8 174 110)"/>
          <ellipse cx="151" cy="122" rx="12" ry="5" transform="rotate(-18 151 122)"/>
          <polygon points="130,16 135,31 151,31 138,40 143,55 130,46 117,55 122,40 109,31 125,31"/>
        </g>
      </svg>
    `),
  },
  {
    id: 'gold_divider_ornate',
    label: 'Divisor Ornamental Dorado',
    category: 'adornos',
    defaultWidth: 320,
    defaultHeight: 28,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 50">
        <line x1="15" y1="25" x2="255" y2="25" stroke="#D4AF37" stroke-width="2.5"/>
        <line x1="345" y1="25" x2="585" y2="25" stroke="#D4AF37" stroke-width="2.5"/>
        <polygon points="300,8 318,25 300,42 282,25" fill="#D4AF37"/>
        <polygon points="300,15 310,25 300,35 290,25" fill="#0B2913"/>
        <circle cx="268" cy="25" r="4" fill="#D4AF37"/>
        <circle cx="332" cy="25" r="4" fill="#D4AF37"/>
      </svg>
    `),
  },
  {
    id: 'gold_corner_tl',
    label: 'Esquina Ornamental Dorada',
    category: 'adornos',
    defaultWidth: 92,
    defaultHeight: 92,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <path d="M8 112 L8 8 L112 8" fill="none" stroke="#D4AF37" stroke-width="6"/>
        <path d="M22 92 L22 22 L92 22" fill="none" stroke="#0B2913" stroke-width="2.5"/>
        <polygon points="22,22 38,22 22,38" fill="#D4AF37"/>
        <circle cx="35" cy="35" r="5" fill="#D4AF37"/>
      </svg>
    `),
  },
  {
    id: 'honor_ribbon_top',
    label: 'Cinta Superior de Honor',
    category: 'adornos',
    defaultWidth: 260,
    defaultHeight: 46,
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 90">
        <polygon points="35,18 485,18 510,45 485,72 35,72 10,45" fill="#0B2913" stroke="#D4AF37" stroke-width="3"/>
        <polygon points="45,26 475,26 494,45 475,64 45,64 26,45" fill="none" stroke="#D4AF37" stroke-width="1.2" opacity="0.8"/>
      </svg>
    `),
  },
];

// -----------------------------------------------------------------------------
// 5 Luxury Starter Presets (1-Click Ready-to-Use Designs)
// -----------------------------------------------------------------------------
export interface StarterPresetMeta {
  id: string;
  name: string;
  badge: string;
  description: string;
  category: 'diploma' | 'certificate' | 'both';
  previewBg: string;
  previewAccent: string;
  build: (category?: 'certificate' | 'diploma') => TemplateDesignV2;
}

export function buildSumakCeremonialGoldPreset(category: 'certificate' | 'diploma' = 'diploma'): TemplateDesignV2 {
  const isDip = category === 'diploma';
  return {
    v: 2,
    canvas: {
      pageSize: 'A4',
      orientation: 'landscape',
      backgroundColor: '#FDFBF5',
      useGradient: true,
      gradientColor2: '#F6EFE0',
      gradientAngle: 135,
      backgroundImageUrl: null,
      backgroundImageOpacity: 1,
      backgroundImageFit: 'cover',
      watermarkEnabled: true,
      watermarkText: 'SUMAK',
      watermarkOpacity: 0.04,
    },
    frame: {
      style: 'royal_ornate',
      primaryColor: '#0B2913',
      accentColor: '#D4AF37',
      margin: 26,
      thickness: 4,
    },
    layers: [
      {
        id: 'logo-sumak',
        kind: 'image',
        name: 'Logo Oficial SUMAK',
        x: 356,
        y: 44,
        width: 130,
        height: 54,
        rotation: 0,
        opacity: 1,
        visible: true,
        src: '/LOGO_SUMAK.png',
        objectFit: 'contain',
        borderRadius: 0,
      },
      {
        id: 'institution-sub',
        kind: 'text',
        name: 'Subtítulo Institucional',
        x: 110,
        y: 106,
        width: 622,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'ACADEMIA SUMAK VIDA ECUADOR • CAMPUS DE BIOMEDICINA ANCESTRAL',
        fontFamily: 'Montserrat',
        fontSize: 10.5,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#92680A',
        align: 'center',
        letterSpacing: 2.5,
        lineHeight: 1.2,
      },
      {
        id: 'main-title',
        kind: 'text',
        name: 'Título Principal',
        x: 80,
        y: 134,
        width: 682,
        height: 46,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: isDip ? 'DIPLOMA DE ESPECIALIZACIÓN' : 'CERTIFICADO DE APROBACIÓN',
        fontFamily: 'Cinzel',
        fontSize: 30,
        fontWeight: '900',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#0B2913',
        align: 'center',
        letterSpacing: 2,
        lineHeight: 1.15,
      },
      {
        id: 'ornate-divider',
        kind: 'shape',
        name: 'Divisor Ornamental Dorado',
        variant: 'ornamental_divider',
        x: 240,
        y: 184,
        width: 362,
        height: 16,
        rotation: 0,
        opacity: 1,
        visible: true,
        fillColor: '#D4AF37',
        strokeColor: '#0B2913',
        strokeWidth: 2,
      },
      {
        id: 'grant-intro',
        kind: 'text',
        name: 'Texto de Otorgamiento',
        x: 120,
        y: 210,
        width: 602,
        height: 24,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: isDip
          ? 'La Dirección Académica confiere el presente Diploma Oficial a:'
          : 'La Dirección Académica otorga el presente Certificado Oficial a:',
        fontFamily: 'Cormorant Garamond',
        fontSize: 16,
        fontWeight: '600',
        italic: true,
        underline: false,
        textTransform: 'none',
        color: '#4B5563',
        align: 'center',
        letterSpacing: 0.4,
        lineHeight: 1.2,
      },
      {
        id: 'participant-name',
        kind: 'text',
        name: 'Nombre del Estudiante',
        x: 70,
        y: 242,
        width: 702,
        height: 50,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{participant_name}}',
        fontFamily: 'Playfair Display',
        fontSize: 32,
        fontWeight: '900',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#0B2913',
        align: 'center',
        letterSpacing: 1,
        lineHeight: 1.15,
      },
      {
        id: 'name-underline',
        kind: 'shape',
        name: 'Línea bajo el Nombre',
        variant: 'divider_line',
        x: 221,
        y: 294,
        width: 400,
        height: 4,
        rotation: 0,
        opacity: 0.7,
        visible: true,
        fillColor: '#D4AF37',
        strokeColor: '#D4AF37',
        strokeWidth: 1.5,
      },
      {
        id: 'accreditation-reason',
        kind: 'text',
        name: 'Motivo de Acreditación',
        x: 110,
        y: 308,
        width: 622,
        height: 24,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: isDip
          ? 'Por haber culminado y aprobado satisfactoriamente el 100% de los cursos y requisitos del Programa:'
          : 'Por haber completado y aprobado satisfactoriamente las lecciones y evaluaciones del Curso:',
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#374151',
        align: 'center',
        letterSpacing: 0,
        lineHeight: 1.35,
      },
      {
        id: 'course-name',
        kind: 'text',
        name: 'Nombre del Curso / Programa',
        x: 90,
        y: 338,
        width: 662,
        height: 52,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '“{{course_name}}”',
        fontFamily: 'Poppins',
        fontSize: 20,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#1A4E26',
        align: 'center',
        letterSpacing: 0.2,
        lineHeight: 1.25,
      },
      {
        id: 'issue-date',
        kind: 'text',
        name: 'Fecha de Emisión',
        x: 170,
        y: 398,
        width: 502,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{issue_date}}',
        fontFamily: 'Inter',
        fontSize: 11.5,
        fontWeight: '600',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#4B5563',
        align: 'center',
        letterSpacing: 0.3,
        lineHeight: 1.2,
      },
      {
        id: 'gold-rosette-seal',
        kind: 'shape',
        name: 'Sello Ceremonial SUMAK',
        variant: 'seal_rosette',
        x: 88,
        y: 422,
        width: 96,
        height: 96,
        rotation: 0,
        opacity: 1,
        visible: true,
        fillColor: isDip ? '#D4AF37' : '#1A4E26',
        strokeColor: '#FFFFFF',
        strokeWidth: 2,
        sealTopText: 'SELLO OFICIAL',
        sealCenterText: 'SUMAK',
        sealBottomText: 'ACADEMY',
        sealTextColor: '#FFFFFF',
      },
      {
        id: 'sig-calligraphy',
        kind: 'text',
        name: 'Firma Caligráfica',
        x: 271,
        y: 432,
        width: 300,
        height: 36,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_name}}',
        fontFamily: 'Great Vibes',
        fontSize: 28,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#1A4E26',
        align: 'center',
        letterSpacing: 0.5,
        lineHeight: 1.1,
      },
      {
        id: 'sig-line',
        kind: 'shape',
        name: 'Línea de Firma',
        variant: 'signature_line',
        x: 311,
        y: 472,
        width: 220,
        height: 4,
        rotation: 0,
        opacity: 1,
        visible: true,
        fillColor: '#0B2913',
        strokeColor: '#0B2913',
        strokeWidth: 1.5,
      },
      {
        id: 'sig-name',
        kind: 'text',
        name: 'Nombre del Firmante',
        x: 251,
        y: 480,
        width: 340,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_name}}',
        fontFamily: 'Poppins',
        fontSize: 11.5,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#0B2913',
        align: 'center',
        letterSpacing: 0.2,
        lineHeight: 1.2,
      },
      {
        id: 'sig-title',
        kind: 'text',
        name: 'Cargo del Firmante',
        x: 221,
        y: 498,
        width: 400,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_title}}',
        fontFamily: 'Inter',
        fontSize: 9.5,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#6B7280',
        align: 'center',
        letterSpacing: 0.2,
        lineHeight: 1.2,
      },
      {
        id: 'qr-verify',
        kind: 'qr',
        name: 'Código QR Verificable',
        x: 668,
        y: 422,
        width: 86,
        height: 86,
        rotation: 0,
        opacity: 1,
        visible: true,
        fgColor: '#0B2913',
        bgColor: '#FFFFFF',
        borderColor: '#D4AF37',
        showFrame: true,
        captionText: 'ESCANEA PARA VERIFICAR',
        captionColor: '#0B2913',
      },
      {
        id: 'verification-footer',
        kind: 'text',
        name: 'Registro y Código de Verificación',
        x: 90,
        y: 536,
        width: 662,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'N° Registro: {{diploma_number}}   |   Código de Verificación Pública: {{verification_code}}',
        fontFamily: 'Courier New',
        fontSize: 9.5,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#92400E',
        align: 'center',
        letterSpacing: 0.3,
        lineHeight: 1.2,
      },
    ],
  };
}

export function buildSumakClinicalEmeraldPreset(category: 'certificate' | 'diploma' = 'certificate'): TemplateDesignV2 {
  const isDip = category === 'diploma';
  return {
    v: 2,
    canvas: {
      pageSize: 'A4',
      orientation: 'landscape',
      backgroundColor: '#FFFFFF',
      useGradient: true,
      gradientColor2: '#F2F8F4',
      gradientAngle: 120,
      backgroundImageUrl: null,
      backgroundImageOpacity: 1,
      backgroundImageFit: 'cover',
      watermarkEnabled: false,
      watermarkText: 'SUMAK',
      watermarkOpacity: 0.04,
    },
    frame: {
      style: 'modern_side_ribbon',
      primaryColor: '#1A4E26',
      accentColor: '#D4AF37',
      margin: 22,
      thickness: 3,
    },
    layers: [
      {
        id: 'logo-top-left',
        kind: 'image',
        name: 'Logo SUMAK',
        x: 118,
        y: 48,
        width: 125,
        height: 52,
        rotation: 0,
        opacity: 1,
        visible: true,
        src: '/LOGO_SUMAK.png',
        objectFit: 'contain',
        borderRadius: 0,
      },
      {
        id: 'badge-type',
        kind: 'text',
        name: 'Etiqueta de Categoría',
        x: 118,
        y: 118,
        width: 310,
        height: 24,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: isDip ? 'DIPLOMA OFICIAL DE PROGRAMA' : 'CERTIFICADO OFICIAL DE CURSO',
        fontFamily: 'Montserrat',
        fontSize: 10,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#FFFFFF',
        align: 'left',
        letterSpacing: 1.6,
        lineHeight: 1.2,
        pillBackground: '#1A4E26',
        pillRadius: 12,
        pillPaddingX: 12,
        pillPaddingY: 4,
      },
      {
        id: 'hero-title',
        kind: 'text',
        name: 'Título de la Credencial',
        x: 118,
        y: 152,
        width: 640,
        height: 44,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: isDip ? 'DIPLOMA DE ACREDITACIÓN' : 'CERTIFICADO DE APROBACIÓN',
        fontFamily: 'Poppins',
        fontSize: 28,
        fontWeight: '900',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#0B2913',
        align: 'left',
        letterSpacing: 1,
        lineHeight: 1.1,
      },
      {
        id: 'intro-line',
        kind: 'text',
        name: 'Presentación',
        x: 118,
        y: 205,
        width: 600,
        height: 20,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Se certifica que el estudiante:',
        fontFamily: 'Inter',
        fontSize: 13,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#6B7280',
        align: 'left',
        letterSpacing: 0,
        lineHeight: 1.2,
      },
      {
        id: 'student-name',
        kind: 'text',
        name: 'Nombre del Estudiante',
        x: 118,
        y: 232,
        width: 650,
        height: 48,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{participant_name}}',
        fontFamily: 'Playfair Display',
        fontSize: 33,
        fontWeight: '900',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#0B2913',
        align: 'left',
        letterSpacing: 0.4,
        lineHeight: 1.15,
      },
      {
        id: 'gold-bar',
        kind: 'shape',
        name: 'Barra Dorada',
        variant: 'rectangle',
        x: 118,
        y: 284,
        width: 140,
        height: 4,
        rotation: 0,
        opacity: 1,
        visible: true,
        fillColor: '#D4AF37',
        strokeColor: 'transparent',
        strokeWidth: 0,
        borderRadius: 2,
      },
      {
        id: 'course-intro',
        kind: 'text',
        name: 'Descripción de Aprobación',
        x: 118,
        y: 300,
        width: 620,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Ha completado satisfactoriamente el plan de estudios, prácticas y evaluación oficial de:',
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#4B5563',
        align: 'left',
        letterSpacing: 0,
        lineHeight: 1.35,
      },
      {
        id: 'course-title',
        kind: 'text',
        name: 'Nombre del Curso / Programa',
        x: 118,
        y: 328,
        width: 630,
        height: 52,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{course_name}}',
        fontFamily: 'Poppins',
        fontSize: 21,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#1A4E26',
        align: 'left',
        letterSpacing: 0,
        lineHeight: 1.25,
      },
      {
        id: 'date-text',
        kind: 'text',
        name: 'Fecha de Emisión',
        x: 118,
        y: 392,
        width: 450,
        height: 20,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{issue_date}}',
        fontFamily: 'Inter',
        fontSize: 11.5,
        fontWeight: '600',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#6B7280',
        align: 'left',
        letterSpacing: 0.2,
        lineHeight: 1.2,
      },
      {
        id: 'sig-script',
        kind: 'text',
        name: 'Firma Manuscrita',
        x: 118,
        y: 432,
        width: 240,
        height: 34,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_name}}',
        fontFamily: 'Great Vibes',
        fontSize: 26,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#1A4E26',
        align: 'left',
        letterSpacing: 0,
        lineHeight: 1.1,
      },
      {
        id: 'sig-divider',
        kind: 'shape',
        name: 'Línea de Firma',
        variant: 'signature_line',
        x: 118,
        y: 468,
        width: 210,
        height: 3,
        rotation: 0,
        opacity: 1,
        visible: true,
        fillColor: '#0B2913',
        strokeColor: '#0B2913',
        strokeWidth: 1.5,
      },
      {
        id: 'sig-person',
        kind: 'text',
        name: 'Firmante',
        x: 118,
        y: 476,
        width: 300,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_name}}',
        fontFamily: 'Poppins',
        fontSize: 11,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#0B2913',
        align: 'left',
        letterSpacing: 0,
        lineHeight: 1.2,
      },
      {
        id: 'sig-role',
        kind: 'text',
        name: 'Cargo',
        x: 118,
        y: 493,
        width: 380,
        height: 16,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_title}}',
        fontFamily: 'Inter',
        fontSize: 9.5,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#6B7280',
        align: 'left',
        letterSpacing: 0,
        lineHeight: 1.2,
      },
      {
        id: 'qr-block',
        kind: 'qr',
        name: 'QR de Verificación',
        x: 682,
        y: 422,
        width: 86,
        height: 86,
        rotation: 0,
        opacity: 1,
        visible: true,
        fgColor: '#0B2913',
        bgColor: '#FFFFFF',
        borderColor: '#1A4E26',
        showFrame: true,
        captionText: 'VERIFICACIÓN QR',
        captionColor: '#1A4E26',
      },
      {
        id: 'footer-serial',
        kind: 'text',
        name: 'Código Serial',
        x: 118,
        y: 536,
        width: 650,
        height: 16,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Registro N° {{diploma_number}}  •  Código: {{verification_code}}  •  ACADEMIA SUMAK ECUADOR',
        fontFamily: 'Courier New',
        fontSize: 9,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#1A4E26',
        align: 'left',
        letterSpacing: 0.3,
        lineHeight: 1.2,
      },
    ],
  };
}

export function buildSumakGalaDarkPreset(category: 'certificate' | 'diploma' = 'diploma'): TemplateDesignV2 {
  const isDip = category === 'diploma';
  return {
    v: 2,
    canvas: {
      pageSize: 'A4',
      orientation: 'landscape',
      backgroundColor: '#0A2213',
      useGradient: true,
      gradientColor2: '#143D20',
      gradientAngle: 145,
      backgroundImageUrl: null,
      backgroundImageOpacity: 1,
      backgroundImageFit: 'cover',
      watermarkEnabled: true,
      watermarkText: 'SUMAK',
      watermarkOpacity: 0.05,
    },
    frame: {
      style: 'guilloche_luxury',
      primaryColor: '#D4AF37',
      accentColor: '#F6E27A',
      margin: 26,
      thickness: 3,
    },
    layers: [
      {
        id: 'laurel-top',
        kind: 'image',
        name: 'Corona de Laureles',
        x: 365,
        y: 44,
        width: 112,
        height: 62,
        rotation: 0,
        opacity: 0.95,
        visible: true,
        src: BUILT_IN_GRAPHICS.find(g => g.id === 'gold_laurel')!.src,
        objectFit: 'contain',
        borderRadius: 0,
      },
      {
        id: 'gala-sub',
        kind: 'text',
        name: 'Subtítulo Dorado',
        x: 100,
        y: 112,
        width: 642,
        height: 20,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'ACADEMIA SUMAK VIDA ECUADOR • DISTINCIÓN ACADÉMICA',
        fontFamily: 'Montserrat',
        fontSize: 10,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#F6E27A',
        align: 'center',
        letterSpacing: 3,
        lineHeight: 1.2,
      },
      {
        id: 'gala-title',
        kind: 'text',
        name: 'Título de Gala',
        x: 70,
        y: 138,
        width: 702,
        height: 46,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: isDip ? 'DIPLOMA DE HONOR' : 'CERTIFICADO DE EXCELENCIA',
        fontFamily: 'Cinzel',
        fontSize: 32,
        fontWeight: '900',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#D4AF37',
        align: 'center',
        letterSpacing: 3,
        lineHeight: 1.15,
      },
      {
        id: 'gala-intro',
        kind: 'text',
        name: 'Otorgado a',
        x: 120,
        y: 196,
        width: 602,
        height: 22,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'Se confiere con distinción oficial a:',
        fontFamily: 'Cormorant Garamond',
        fontSize: 16,
        fontWeight: '600',
        italic: true,
        underline: false,
        textTransform: 'none',
        color: '#E5E7EB',
        align: 'center',
        letterSpacing: 0.5,
        lineHeight: 1.2,
      },
      {
        id: 'gala-name',
        kind: 'text',
        name: 'Nombre del Estudiante',
        x: 70,
        y: 228,
        width: 702,
        height: 50,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{participant_name}}',
        fontFamily: 'Playfair Display',
        fontSize: 34,
        fontWeight: '900',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#FFFFFF',
        align: 'center',
        letterSpacing: 1.2,
        lineHeight: 1.15,
      },
      {
        id: 'gala-div',
        kind: 'shape',
        name: 'Divisor Dorado',
        variant: 'ornamental_divider',
        x: 240,
        y: 286,
        width: 362,
        height: 16,
        rotation: 0,
        opacity: 1,
        visible: true,
        fillColor: '#D4AF37',
        strokeColor: '#F6E27A',
        strokeWidth: 2,
      },
      {
        id: 'gala-course',
        kind: 'text',
        name: 'Programa / Curso',
        x: 90,
        y: 316,
        width: 662,
        height: 56,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '“{{course_name}}”',
        fontFamily: 'Cinzel',
        fontSize: 19,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#F6E27A',
        align: 'center',
        letterSpacing: 0.6,
        lineHeight: 1.3,
      },
      {
        id: 'gala-date',
        kind: 'text',
        name: 'Fecha',
        x: 160,
        y: 382,
        width: 522,
        height: 20,
        rotation: 0,
        opacity: 0.85,
        visible: true,
        text: '{{issue_date}}',
        fontFamily: 'Inter',
        fontSize: 11.5,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#D1FAE5',
        align: 'center',
        letterSpacing: 0.5,
        lineHeight: 1.2,
      },
      {
        id: 'gala-seal',
        kind: 'image',
        name: 'Sello Dorado con Cintas',
        x: 92,
        y: 412,
        width: 92,
        height: 110,
        rotation: 0,
        opacity: 1,
        visible: true,
        src: BUILT_IN_GRAPHICS.find(g => g.id === 'gold_wax_seal')!.src,
        objectFit: 'contain',
        borderRadius: 0,
      },
      {
        id: 'gala-sig',
        kind: 'text',
        name: 'Firma',
        x: 271,
        y: 430,
        width: 300,
        height: 36,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_name}}',
        fontFamily: 'Great Vibes',
        fontSize: 28,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#F6E27A',
        align: 'center',
        letterSpacing: 0.5,
        lineHeight: 1.1,
      },
      {
        id: 'gala-sig-line',
        kind: 'shape',
        name: 'Línea Firma',
        variant: 'signature_line',
        x: 311,
        y: 470,
        width: 220,
        height: 3,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        fillColor: '#D4AF37',
        strokeColor: '#D4AF37',
        strokeWidth: 1.5,
      },
      {
        id: 'gala-sig-name',
        kind: 'text',
        name: 'Autoridad Firmante',
        x: 241,
        y: 478,
        width: 360,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{signatory_name}}',
        fontFamily: 'Poppins',
        fontSize: 11.5,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#FFFFFF',
        align: 'center',
        letterSpacing: 0.3,
        lineHeight: 1.2,
      },
      {
        id: 'gala-sig-title',
        kind: 'text',
        name: 'Cargo Firmante',
        x: 221,
        y: 496,
        width: 400,
        height: 16,
        rotation: 0,
        opacity: 0.8,
        visible: true,
        text: '{{signatory_title}}',
        fontFamily: 'Inter',
        fontSize: 9.5,
        fontWeight: '400',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#A7F3D0',
        align: 'center',
        letterSpacing: 0.2,
        lineHeight: 1.2,
      },
      {
        id: 'gala-qr',
        kind: 'qr',
        name: 'QR Oficial',
        x: 668,
        y: 422,
        width: 86,
        height: 86,
        rotation: 0,
        opacity: 1,
        visible: true,
        fgColor: '#0A2213',
        bgColor: '#FFFFFF',
        borderColor: '#D4AF37',
        showFrame: true,
        captionText: 'VERIFICAR QR',
        captionColor: '#F6E27A',
      },
      {
        id: 'gala-footer',
        kind: 'text',
        name: 'Código Serial',
        x: 90,
        y: 536,
        width: 662,
        height: 16,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'N° {{diploma_number}}  |  Verificación Pública: {{verification_code}}',
        fontFamily: 'Courier New',
        fontSize: 9.5,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#D4AF37',
        align: 'center',
        letterSpacing: 0.5,
        lineHeight: 1.2,
      },
    ],
  };
}

export function buildBotanicalMinimalPreset(category: 'certificate' | 'diploma' = 'certificate'): TemplateDesignV2 {
  const base = buildSumakCeremonialGoldPreset(category);
  base.canvas.backgroundColor = '#FAFAF7';
  base.canvas.useGradient = false;
  base.canvas.watermarkEnabled = false;
  base.frame = {
    style: 'botanical_minimal',
    primaryColor: '#1A4E26',
    accentColor: '#C8D8CB',
    margin: 30,
    thickness: 2,
  };
  return base;
}

export function buildCustomBackgroundCanvasPreset(category: 'certificate' | 'diploma' = 'diploma'): TemplateDesignV2 {
  const isDip = category === 'diploma';
  return {
    v: 2,
    canvas: {
      pageSize: 'A4',
      orientation: 'landscape',
      backgroundColor: '#FFFFFF',
      useGradient: false,
      gradientColor2: '#FFFFFF',
      gradientAngle: 135,
      backgroundImageUrl: null,
      backgroundImageOpacity: 1,
      backgroundImageFit: 'cover',
      watermarkEnabled: false,
      watermarkOpacity: 0.04,
    },
    frame: {
      style: 'none',
      primaryColor: '#0B2913',
      accentColor: '#D4AF37',
      margin: 24,
      thickness: 2,
    },
    layers: [
      {
        id: 'custom-name',
        kind: 'text',
        name: 'Nombre del Estudiante',
        x: 90,
        y: 235,
        width: 662,
        height: 52,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{participant_name}}',
        fontFamily: 'Playfair Display',
        fontSize: 34,
        fontWeight: '900',
        italic: false,
        underline: false,
        textTransform: 'uppercase',
        color: '#0B2913',
        align: 'center',
        letterSpacing: 1,
        lineHeight: 1.15,
      },
      {
        id: 'custom-course',
        kind: 'text',
        name: isDip ? 'Nombre del Programa' : 'Nombre del Curso',
        x: 110,
        y: 315,
        width: 622,
        height: 48,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{course_name}}',
        fontFamily: 'Poppins',
        fontSize: 20,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#1A4E26',
        align: 'center',
        letterSpacing: 0.2,
        lineHeight: 1.25,
      },
      {
        id: 'custom-date',
        kind: 'text',
        name: 'Fecha de Emisión',
        x: 200,
        y: 382,
        width: 442,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '{{issue_date}}',
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: '600',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#374151',
        align: 'center',
        letterSpacing: 0.2,
        lineHeight: 1.2,
      },
      {
        id: 'custom-qr',
        kind: 'qr',
        name: 'Código QR Verificable',
        x: 685,
        y: 448,
        width: 84,
        height: 84,
        rotation: 0,
        opacity: 1,
        visible: true,
        fgColor: '#0B2913',
        bgColor: '#FFFFFF',
        borderColor: '#D4AF37',
        showFrame: true,
        captionText: 'VERIFICAR QR',
        captionColor: '#0B2913',
      },
      {
        id: 'custom-verify',
        kind: 'text',
        name: 'Registro / Verificación',
        x: 90,
        y: 540,
        width: 662,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'N° {{diploma_number}}  |  Código: {{verification_code}}',
        fontFamily: 'Courier New',
        fontSize: 9.5,
        fontWeight: '700',
        italic: false,
        underline: false,
        textTransform: 'none',
        color: '#6B7280',
        align: 'center',
        letterSpacing: 0.3,
        lineHeight: 1.2,
      },
    ],
  };
}

export const STARTER_PRESETS: StarterPresetMeta[] = [
  {
    id: 'sumak_ceremonial_gold',
    name: 'Ceremonial Dorado SUMAK',
    badge: 'Recomendado Diplomas',
    description: 'Pergamino marfil, marco triple real esmeralda y oro, tipografía Cinzel, sello roseta y QR.',
    category: 'diploma',
    previewBg: 'linear-gradient(135deg, #FDFBF5 0%, #F5EBD6 100%)',
    previewAccent: '#D4AF37',
    build: buildSumakCeremonialGoldPreset,
  },
  {
    id: 'sumak_clinical_emerald',
    name: 'Clínico Esmeralda Moderno',
    badge: 'Recomendado Certificados',
    description: 'Banda lateral institucional verde SUMAK con acento dorado, lectura limpia y diseño moderno.',
    category: 'certificate',
    previewBg: 'linear-gradient(135deg, #FFFFFF 0%, #E8F3EB 100%)',
    previewAccent: '#1A4E26',
    build: buildSumakClinicalEmeraldPreset,
  },
  {
    id: 'sumak_gala_dark',
    name: 'Gala Nocturna Esmeralda & Oro',
    badge: 'Edición Honor',
    description: 'Fondo verde profundo de lujo con marco guilloché dorado, laureles y sello con cintas.',
    category: 'both',
    previewBg: 'linear-gradient(135deg, #0A2213 0%, #174524 100%)',
    previewAccent: '#D4AF37',
    build: buildSumakGalaDarkPreset,
  },
  {
    id: 'botanical_minimal',
    name: 'Botánico Minimalista',
    badge: 'Editorial',
    description: 'Composición limpia y sobria con marco fino de esquinas, ideal para talleres y cursos cortos.',
    category: 'certificate',
    previewBg: 'linear-gradient(135deg, #FAFAF7 0%, #F2F5F0 100%)',
    previewAccent: '#2B6E3A',
    build: buildBotanicalMinimalPreset,
  },
  {
    id: 'custom_background_canvas',
    name: 'Lienzo para Fondo PNG/JPG Propio',
    badge: 'Diseño Externo',
    description: 'Sin marcos dibujados: sube tu arte diseñado en Canva o Illustrator y posiciona los datos encima.',
    category: 'both',
    previewBg: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
    previewAccent: '#475569',
    build: buildCustomBackgroundCanvasPreset,
  },
];

// -----------------------------------------------------------------------------
// Legacy v1 -> v2 Migration Helper (Zero data loss for existing DB templates)
// -----------------------------------------------------------------------------
export function normalizeTemplateDesign(
  templateRecord: any,
  fallbackCategory: 'certificate' | 'diploma' = 'diploma'
): TemplateDesignV2 {
  const raw = templateRecord?.layout_config;
  if (raw && raw.v === 2 && raw.canvas && raw.frame && Array.isArray(raw.layers)) {
    // Sync top-level background_image_url if set in DB and missing in canvas
    const merged: TemplateDesignV2 = {
      ...raw,
      canvas: {
        ...raw.canvas,
        backgroundImageUrl: raw.canvas.backgroundImageUrl ?? templateRecord?.background_image_url ?? null,
      },
    };
    return merged;
  }

  // Upgrade legacy v1 template gracefully to v2
  const preset =
    fallbackCategory === 'certificate'
      ? buildSumakClinicalEmeraldPreset('certificate')
      : buildSumakCeremonialGoldPreset('diploma');

  if (templateRecord?.page_size) {
    preset.canvas.pageSize = String(templateRecord.page_size).toLowerCase() === 'letter' ? 'letter' : 'A4';
  }
  if (templateRecord?.orientation === 'portrait' || templateRecord?.orientation === 'landscape') {
    preset.canvas.orientation = templateRecord.orientation;
  }
  if (templateRecord?.background_image_url) {
    preset.canvas.backgroundImageUrl = templateRecord.background_image_url;
    preset.frame.style = 'none';
  }
  if (templateRecord?.title_text && !templateRecord.title_text.includes('{{')) {
    const titleLayer = preset.layers.find(
      l => l.kind === 'text' && (l.id === 'main-title' || l.id === 'hero-title')
    ) as TextLayer | undefined;
    if (titleLayer) titleLayer.text = templateRecord.title_text;
  }

  return preset;
}
