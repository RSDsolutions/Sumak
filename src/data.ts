// ============================================================
// SUMAK VIDA ECUADOR S.A. — Central Data File
// All data extracted from official company PDFs
// ============================================================

// ── Ingredient image resolver ───────────────────────────────
// Mapea texto libre del ingrediente (con prefijos como "Extracto de",
// "Polvo de", etc.) a una imagen en /ingredientes/. Si no hay match,
// devuelve null y la UI lo muestra como chip de texto.
const ingredientPatterns: Array<{ slug: string; patterns: RegExp[] }> = [
  // Plantas medicinales
  { slug: 'aloe-vera', patterns: [/\baloe\b/, /\bsabila\b/] },
  { slug: 'ajenjo', patterns: [/\bajenjo\b/] },
  { slug: 'alfalfa', patterns: [/\balfalfa\b/] },
  { slug: 'apio', patterns: [/\bapio\b/] },
  { slug: 'borrajas', patterns: [/\bborraj/] },
  { slug: 'canchalagua', patterns: [/\bcanchalagua\b/] },
  { slug: 'cardamomo', patterns: [/\bcardamomo\b/] },
  { slug: 'chancapiedra', patterns: [/\bchancapiedra\b/] },
  { slug: 'cola-de-caballo', patterns: [/cola de caballo/] },
  { slug: 'curcuma', patterns: [/\bcurcuma\b/] },
  { slug: 'diente-de-leon', patterns: [/diente de leon/] },
  { slug: 'flor-blanca', patterns: [/flor blanca/] },
  { slug: 'flor-de-arenilla', patterns: [/arenilla/] },
  { slug: 'flor-de-jamaica', patterns: [/jamaica/] },
  { slug: 'jengibre', patterns: [/\bjengibre\b/] },
  { slug: 'malva', patterns: [/\bmalva\b/] },
  { slug: 'manzanilla', patterns: [/\bmanzanilla\b/, /\bcamomila\b/] },
  { slug: 'menta', patterns: [/\bmenta\b/] },
  { slug: 'moringa', patterns: [/\bmoringa\b/] },
  { slug: 'ortiga', patterns: [/\bortiga\b/] },
  { slug: 'perejil', patterns: [/\bperejil\b/] },
  { slug: 'romero', patterns: [/\bromero\b/] },
  { slug: 'sangre-de-drago', patterns: [/sangre de drago/] },
  { slug: 'sen', patterns: [/hoja de sen/, /\bsen\b(?! )/, /^sen$/] },
  { slug: 'te-del-indio', patterns: [/te del indio/] },
  { slug: 'te-rojo', patterns: [/te rojo/] },
  { slug: 'te-verde', patterns: [/te verde/] },
  { slug: 'toronjil', patterns: [/\btoronjil\b/] },
  // Frutas y semillas
  { slug: 'arandano', patterns: [/\barandano\b/] },
  { slug: 'avena', patterns: [/\bavena\b/] },
  { slug: 'cacao', patterns: [/\bcacao\b/] },
  { slug: 'chia', patterns: [/\bchia\b/] },
  { slug: 'guanabana', patterns: [/\bguanabana\b/] },
  { slug: 'guarana', patterns: [/\bguarana\b/] },
  { slug: 'guayaba', patterns: [/\bguayaba\b/] },
  { slug: 'limon', patterns: [/\blimon\b/] },
  { slug: 'linaza', patterns: [/\blinaza\b/] },
  { slug: 'manzana-verde', patterns: [/manzana verde/] },
  { slug: 'naranja', patterns: [/\bnaranja\b/] },
  { slug: 'noni', patterns: [/\bnoni\b/] },
  { slug: 'papaya', patterns: [/\bpapaya\b/] },
  { slug: 'pina', patterns: [/\bpina\b/, /bromelina/] },
  { slug: 'tamarindo', patterns: [/\btamarindo\b/] },
  { slug: 'uva', patterns: [/\buvas?\b/, /resveratrol/] },
  // Andinos / tubérculos
  { slug: 'maiz-morado', patterns: [/maiz morado/] },
  { slug: 'mashua', patterns: [/\bmashua\b/] },
  { slug: 'nogal', patterns: [/\bnogal\b/] },
  { slug: 'nopal', patterns: [/\bnopal\b/] },
  { slug: 'quinua', patterns: [/\bquinua\b/, /\bquinoa\b/] },
  // Especiales
  { slug: 'argan', patterns: [/\bargan\b/] },
  { slug: 'coco', patterns: [/\bcoco\b/] },
  { slug: 'ajo', patterns: [/\bajo\b/] },
  { slug: 'alcachofa', patterns: [/\balcachofa\b/] },
  { slug: 'una-de-gato', patterns: [/una de gato/] },
  { slug: 'shitake', patterns: [/shitake/, /shiitake/] },
  { slug: 'agaricus', patterns: [/agaricus/] },
  // Origen animal / lab
  { slug: 'miel', patterns: [/\bmiel\b/] },
  { slug: 'calostro', patterns: [/\bcalostro\b/] },
  { slug: 'colageno', patterns: [/\bcolageno\b/] },
  { slug: 'acido-hialuronico', patterns: [/hialuronico/] },
  { slug: 'glucosamina', patterns: [/\bglucosamina\b/] },
  // Compuestos
  { slug: 'celulas-madres', patterns: [/celulas madres/, /celula madre/] },
  { slug: 'probioticos', patterns: [/probiotico/] },
];

// Categorías que NO tienen imagen — se renderizan como pill de texto dorado
// (incluye nombres genéricos de categorías y también minerales/elementos
// individuales que se pueden listar sueltos como "Magnesio" o "Calcio")
const nutrientPattern = /^(vitamina|minerales?|aminoacid|fibra|antioxidante|proteinas?|endulzante|edulcorante|complejo|magnesio|calcio|hierro|zinc|potasio|selenio|cromo|cobre|fosforo|sodio|manganeso|biotina|omega|acido folico|acido pantotenico|cloruro|yodo)\b/;

export interface IngredientDisplay {
  name: string;          // nombre principal sin descripción
  description?: string;  // texto tras " — "
  image?: string;        // ruta a la imagen si existe
  isNutrient?: boolean;  // vitamina / mineral / nutriente sin imagen
}

function normalizeIngredient(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function parseIngredient(raw: string): IngredientDisplay {
  // Separar nombre y descripción si tiene " — " o " - "
  let name = raw;
  let description: string | undefined;
  if (raw.includes(' — ')) {
    const parts = raw.split(' — ');
    name = parts[0].trim();
    description = parts.slice(1).join(' — ').trim();
  } else if (raw.includes(' - ')) {
    const parts = raw.split(' - ');
    name = parts[0].trim();
    description = parts.slice(1).join(' - ').trim();
  }

  const normalized = normalizeIngredient(name);

  // 1) Buscar imagen específica primero (extracto/polvo/esencia/aceite de X → X.png)
  //    Esto debe ir ANTES de la detección de nutrientes para que casos como
  //    "Ácido Hialurónico" tomen su imagen en lugar de caer en la regla "acido"
  for (const { slug, patterns } of ingredientPatterns) {
    if (patterns.some((p) => p.test(normalized))) {
      return { name, description, image: `/ingredientes/${slug}.png` };
    }
  }

  // 2) Detectar nutrientes (vitaminas, minerales sueltos, aminoácidos, etc.)
  if (nutrientPattern.test(normalized)) {
    return { name, description, isNutrient: true };
  }

  // 3) Sin match: chip de texto verde
  return { name, description };
}

export interface Product {
  codigo: string;
  slug: string;
  nombre: string;
  categoria: string;
  categoriaKey: string;
  pvp: number;
  descripcion: string;
  imagen?: string;
  tagline?: string;
  presentacion?: string;
  destacado?: boolean;
  nuevo?: boolean;
  bestseller?: boolean;
  proximamente?: boolean;
  beneficios?: string[];
  ingredientes?: string[];
  modoUso?: string;
  precauciones?: string;
  detalleLargo?: string;
  revistaPagina?: string;
}

export interface AffiliatePackage {
  nombre: string;
  precio: number;
  puntos: number;
  productos: number;
  destacado: boolean;
  beneficios: string[];
}

export interface LevelCommission {
  nivel: number;
  porcentaje: number;
}

export interface Tramo1Rank {
  rango: string;
  personasDirectas: number;
  bono: string;
}

export interface Tramo2Rank {
  rango: string;
  nivelesActivos: string;
  personasEnRed: number;
  recompensa: string;
  extras?: string;
}

export interface ContactInfo {
  empresa: string;
  nombreComercial: string;
  slogan: string;
  ruc: string;
  gerenteGeneral: string;
  emailPrincipal: string;
  emailSecundario: string;
  telefono1: string;
  telefono2: string;
  direccion: string;
  facebook: string;
  instagram: string;
  web: string;
  whatsapp: string;
}

export interface CategoryFilter {
  label: string;
  key: string;
}

// ── Products ────────────────────────────────────────────────
export const products: Product[] = [
  {
    codigo: '00001',
    slug: 'te-extractos-de-la-vida',
    nombre: 'Té Extractos de la Vida',
    categoria: 'Bebida a base de hierbas',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Bebida natural elaborada con una cuidadosa selección de extractos de plantas, frutas y nutrientes esenciales. Limpia, desintoxica y regenera.',
    imagen: '/products/te-extractos-de-la-vida.png',
    tagline: 'Limpia · Desintoxica · Regenera',
    presentacion: 'Botella de 1000 ml',
    destacado: true,
    bestseller: true,
    revistaPagina: '/products/revista/te-extractos-de-la-vida.jpg',
    beneficios: [
      'Fortalece las defensas naturales del cuerpo',
      'Mejora la digestión y la absorción de nutrientes',
      'Aporta energía y ayuda a combatir el cansancio',
      'Apoya los procesos naturales de desintoxicación',
      'Rico en antioxidantes que protegen y revitalizan el cuerpo',
      'Limpia y desintoxica el sistema gastrointestinal',
      'Apoya el sistema inmunológico',
    ],
    ingredientes: [
      'Resveratrol de Uva', 'Pectina de Manzana Verde', 'Extracto de Guanábana',
      'Extracto de Arándano Azul', 'Extracto de Noni', 'Extracto de Moringa',
      'Extracto de Diente de León', 'Extracto de Té Rojo', 'Extracto de Aloe Vera',
      'Vitaminas y Minerales',
    ],
    modoUso: 'Tomar 30 ml (2 cucharadas) diluidas en un vaso de agua, 1 a 2 veces al día. Agitar antes de usar. Conservar refrigerado una vez abierto.',
    precauciones: 'No recomendado para mujeres embarazadas o en lactancia. Si está bajo tratamiento médico, consulte a su especialista.',
    detalleLargo: 'Té Extractos de la Vida es una bebida natural elaborada con una cuidadosa selección de extractos de plantas, frutas y nutrientes esenciales que ayudan a mantener el bienestar general del cuerpo. Sin colorantes ni conservantes. Apto para toda la familia.',
  },
  {
    codigo: '00002',
    slug: 'regen-24',
    nombre: 'REGEN 24',
    categoria: 'Bebida saludable con frutas tropicales',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Bebida 100% natural elaborada con extractos de frutas tropicales y plantas medicinales. Nutre · Desintoxica · Regenera.',
    imagen: '/products/regen-24.png',
    tagline: 'Nutre · Desintoxica · Regenera',
    presentacion: 'Botella de 1000 ml',
    destacado: true,
    bestseller: true,
    revistaPagina: '/products/revista/regen-24.jpg',
    beneficios: [
      'Limpia y desintoxica el colon',
      'Mejora el tránsito intestinal',
      'Elimina toxinas acumuladas',
      'Favorece la absorción de nutrientes',
      'Fortalece el sistema inmunológico',
      'Aporta energía y bienestar general',
    ],
    ingredientes: [
      'Extracto de Tamarindo', 'Extracto de Noni', 'Extracto de Piña',
      'Extracto de Semilla de Papaya', 'Extracto de Guayaba', 'Extracto de Chía',
      'Extracto de Uña de Gato', 'Extracto de Sábila', 'Extracto de Menta',
      'Extracto de Ortiga',
      'Minerales esenciales: Calcio, Magnesio, Zinc, Selenio, Potasio, Cromo',
    ],
    modoUso: 'Tomar 30 ml (2 cucharadas) diluidas en un vaso de agua, 1 a 2 veces al día. Agitar antes de usar.',
    precauciones: 'No recomendado en embarazo, lactancia o pacientes con obstrucción intestinal. Consulte a su médico si está bajo tratamiento.',
    detalleLargo: 'REGEN 24 es una bebida 100% natural elaborada con extractos de frutas tropicales y plantas medicinales que ayudan a desintoxicar el colon, limpiar el organismo, mejorar tu digestión y fortalecer tu salud de forma natural. Tu salud empieza desde adentro.',
  },
  {
    codigo: '00016',
    slug: 'colon-renova',
    nombre: 'Fórmula Herbal Colon Renova',
    categoria: 'Limpieza & Digestión',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Suplemento alimenticio con extractos de plantas y vegetales. Limpieza profunda y natural del colon.',
    imagen: '/products/colon-renova.png',
    tagline: 'Limpieza profunda y natural',
    presentacion: 'Botellas de 1000 ml, 500 ml y 250 ml',
    nuevo: true,
    destacado: true,
    beneficios: [
      'Limpia el colon a profundidad de forma natural',
      'Ayuda a expulsar parásitos, bichos y amebas',
      'Mejora la digestión y la absorción de nutrientes',
      'Apoya el tránsito intestinal saludable',
      'Apto para adultos',
    ],
    ingredientes: [
      'Hierbabuena', 'Papaya', 'Ciruela pasa', 'Sábila', 'Semilla de papaya',
      'Paico', 'Ajenjo', 'Chía', 'Noni', 'Limón',
      'Ampo', 'Jengibre', 'Linaza', 'Sen', 'Manzana verde',
      'Edulcorante no calórico',
    ],
    modoUso: 'Tomar 30 ml por la mañana y 30 ml por la noche. Agitar bien antes de tomar. Conservar refrigerado una vez abierto.',
    precauciones: 'Solo para adultos. No recomendado en embarazo, lactancia o casos de obstrucción intestinal. Si está bajo tratamiento médico, consulte a su especialista.',
    detalleLargo: 'Fórmula herbal premium diseñada para una limpieza profunda y natural del colon. Combina 15 ingredientes botánicos seleccionados —entre hierbas, frutas y semillas tradicionalmente usadas en la medicina andina— para sacar parásitos, mejorar la digestión y apoyar el bienestar intestinal del día a día.',
  },
  {
    codigo: '00003',
    slug: 'bebida-andina',
    nombre: 'Bebida Andina',
    categoria: 'Probiótico natural · Antioxidantes poderosos',
    categoriaKey: 'bebidas',
    pvp: 20.00,
    descripcion: 'Bebida funcional con extractos naturales seleccionados de la biodiversidad andina. Salud, energía y bienestar desde los Andes.',
    imagen: '/products/bebida-andina.png',
    tagline: 'Salud, energía y bienestar desde los Andes',
    presentacion: 'Botella de 1000 ml',
    revistaPagina: '/products/revista/bebida-andina.jpg',
    beneficios: [
      'Protege las células del daño oxidativo',
      'Refuerza las defensas naturales',
      'Aporta energía y vitalidad todos los días',
      'Mejora la digestión y el tránsito intestinal',
      'Apoya la salud del corazón y la circulación',
      'Desintoxica y limpia tu organismo',
      'Fortalece huesos, piel y tejidos',
    ],
    ingredientes: [
      'Extracto de Maíz Morado', 'Extracto de Uvas Rojas y Azules',
      'Extracto de Arándano Azul', 'Extracto de Flor de Jamaica',
      'Extracto de Guaraná', 'Extracto de Jengibre', 'Extracto de Cardamomo',
      'Extracto de Diente de León', 'Extracto de Moringa', 'Extracto de Nogal',
      'Extracto de Uña de Gato',
      'Vitaminas A, C, E y complejo B',
    ],
    modoUso: 'Tomar 30 ml (2 cucharadas) diluidas en un vaso de agua, 1 a 2 veces al día. Agitar antes de usar.',
    detalleLargo: 'Bebida funcional elaborada con extractos naturales seleccionados de la biodiversidad andina, que aportan poderosos antioxidantes, vitaminas y minerales para fortalecerte de forma integral. Lo mejor de los Andes para tu salud y bienestar.',
  },
  {
    codigo: '00004',
    slug: 'vive-oxi-100',
    nombre: 'Vive-Oxi-100',
    categoria: 'Bebida con hortalizas · Enriquecida con oxígeno líquido',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Bebida enriquecida con oxígeno líquido y extractos naturales. Tu aliado natural para una vida plena.',
    imagen: '/products/vive-oxi-100.png',
    tagline: 'Tu aliado natural para una vida plena',
    presentacion: 'Frasco de 50 ml — concentrado',
    nuevo: true,
    revistaPagina: '/products/revista/vive-oxi-100.jpg',
    beneficios: [
      'Fortalece el sistema inmunológico',
      'Mejora la digestión y la absorción de nutrientes',
      'Aporta energía natural y vitalidad',
      'Ayuda a desintoxicar y limpiar el organismo',
      'Contribuye al equilibrio físico y mental',
      'Apoya la circulación y la oxigenación celular',
    ],
    ingredientes: [
      'Esencia de Totumo', 'Esencia de Borrajas', 'Esencia de Jengibre',
      'Esencia de Ajo', 'Esencia de Toronjil', 'Esencia de Menta',
      'Miel de Abeja', 'Magnesio',
      'Vitaminas B1, B2, B6, B12, C, D y E',
    ],
    modoUso: 'Tomar 20 a 30 gotas diluidas en agua, 1 a 2 veces al día o según indicación profesional.',
    precauciones: 'No exceder la dosis diaria recomendada. Conservar en lugar fresco y oscuro.',
    detalleLargo: 'Vive-Oxi-100 es un poderoso blend de extractos naturales que nutren, revitalizan y fortalecen tu organismo. Enriquecido con oxígeno líquido para apoyar la oxigenación celular y darte más energía cada día. Lo natural es vivir mejor.',
  },
  {
    codigo: '00005',
    slug: 'fibramak-plus',
    nombre: 'Fibramak Plus',
    categoria: 'Suplemento alimenticio · Limpieza profunda',
    categoriaKey: 'suplementos',
    pvp: 25.00,
    descripcion: 'Suplemento alimenticio natural que ayuda a limpiar tu sistema gastrointestinal. Desintoxica · Limpia · Regenera.',
    imagen: '/products/fibramak-plus.png',
    tagline: 'Tu bienestar empieza por dentro',
    presentacion: 'Frasco · polvo',
    revistaPagina: '/products/revista/fibramak-plus.jpg',
    beneficios: [
      'Limpia y desintoxica el sistema gastrointestinal',
      'Limpia el colon de toxinas y residuos acumulados',
      'Elimina bichos, parásitos, amebas y hongos',
      'Reduce el estreñimiento y la inflamación',
      'Alivia la hinchazón, gases y malestar estomacal',
      'Fortalece el sistema inmunológico',
      'Mejora la absorción de nutrientes',
      'Apto para niños y adultos',
    ],
    ingredientes: [
      'Probióticos Vegetales', 'Piña (bromelina)', 'Polvo de Avena',
      'Polvo de Chía', 'Polvo de Moringa', 'Polvo de Alfalfa',
      'Polvo de Cúrcuma', 'Polvo de Hoja de Sen',
      'Micropulverizado de Sábila',
      'Calcio, Hierro, Magnesio, Potasio, Selenio, Zinc, Ácido Fólico, Vitamina B6',
    ],
    modoUso: 'Disolver 2 cucharadas (10 g) en un vaso de agua o jugo. Tomar 1 vez al día, preferentemente en la mañana.',
    precauciones: 'Acompañar con abundante agua durante el día. Apto para vegetarianos. Sin colorantes, sin azúcar añadida.',
    detalleLargo: 'Fibramak Plus es un suplemento alimenticio natural pensado para una limpieza profunda y completa del sistema gastrointestinal. Su combinación de fibras, probióticos vegetales y plantas medicinales depura el colon, elimina parásitos y restaura el equilibrio intestinal de forma suave.',
  },
  {
    codigo: '00006',
    slug: 'moringa-en-polvo',
    nombre: 'Moringa en Polvo',
    categoria: 'Suplemento alimenticio orgánico',
    categoriaKey: 'suplementos',
    pvp: 25.00,
    descripcion: 'Hojas de Moringa Oleifera deshidratadas y molidas. 100% natural, orgánico y saludable.',
    imagen: '/products/moringa-en-polvo.png',
    tagline: 'Nutrición natural que tu cuerpo agradece',
    presentacion: 'Frasco de 100 g · polvo',
    revistaPagina: '/products/revista/moringa-en-polvo.jpg',
    beneficios: [
      'Apoya la nutrición diaria con vitaminas, minerales, proteínas y aminoácidos',
      'Fortalece el sistema inmunológico con su acción antioxidante',
      'Mejora la energía y vitalidad combatiendo el cansancio',
      'Favorece la salud digestiva y el tránsito intestinal',
      'Contribuye a la salud ósea, del corazón y de la piel',
    ],
    ingredientes: [
      '100% hojas de Moringa Oleifera',
      'Proteínas vegetales',
      'Vitaminas A, B (B1, B2, B3), C y D',
      'Minerales: Calcio, Hierro, Potasio, Zinc, Magnesio, Fósforo',
      'Aminoácidos esenciales', 'Fibra dietética', 'Antioxidantes naturales',
    ],
    modoUso: '1 a 2 cucharadas (5 a 10 g) al día. Mezclar en agua, jugos, batidos, sopas o tu bebida favorita.',
    precauciones: 'Producto orgánico de alta calidad. Sin aditivos, sin colorantes, sin preservantes.',
    detalleLargo: 'La moringa es conocida como "el árbol de la vida" por su alto valor nutricional. Nuestro suplemento en polvo está elaborado con hojas de moringa cuidadosamente seleccionadas y deshidratadas a baja temperatura para conservar todos sus nutrientes y propiedades. Un alimento natural completo.',
  },
  {
    codigo: '00007',
    slug: 'colageno-hidrolizado',
    nombre: 'Colágeno Hidrolizado',
    categoria: 'Fórmula Americana · Reforzado con Ácido Hialurónico',
    categoriaKey: 'suplementos',
    pvp: 27.50,
    descripcion: 'Suplemento en polvo con colágeno hidrolizado, glucosamina, vitamina C, calcio y zinc. Sabor a vainilla.',
    imagen: '/products/colageno-hidrolizado.png',
    tagline: 'Nutre tu cuerpo, fortalece tu bienestar',
    presentacion: 'Frasco de 500 g · sabor a vainilla',
    destacado: true,
    bestseller: true,
    revistaPagina: '/products/revista/colageno-hidrolizado.jpg',
    beneficios: [
      'Mejora la elasticidad e hidratación de la piel, reduciendo arrugas y líneas de expresión',
      'Fortalece articulaciones, cartílagos y ligamentos, favoreciendo la movilidad',
      'Apoya la salud ósea y dental gracias al calcio y minerales',
      'Contribuye al fortalecimiento del cabello y las uñas',
      'Refuerza el sistema inmunológico y combate el daño oxidativo',
    ],
    ingredientes: [
      'Colágeno Hidrolizado (proteína de alta biodisponibilidad)',
      'Ácido Hialurónico',
      'Glucosamina',
      'Vitamina C',
      'Calcio',
      'Zinc',
    ],
    modoUso: 'Disolver 1 medida (aprox. 10 g) en 200 ml de agua, jugo o bebida de tu preferencia. Consumir 1 vez al día.',
    detalleLargo: 'Suplemento alimenticio en polvo formulado para apoyar la salud de la piel, las articulaciones, los huesos y los tejidos conectivos. Su fórmula combina colágeno hidrolizado con ingredientes esenciales que trabajan en sinergia para brindarte bienestar desde adentro.',
  },
  {
    codigo: '00008',
    slug: 'formula-1000',
    nombre: 'Formula 1000',
    categoria: 'Mezcla funcional 100% orgánica',
    categoriaKey: 'suplementos',
    pvp: 60.00,
    descripcion: 'Bebida nutritiva orgánica con quinua, calostro de bovino, hongos y más. Sabor a vainilla.',
    imagen: '/products/formula-1000.png',
    tagline: 'Más nutrientes y vitaminas',
    presentacion: 'Polvo · sabor a vainilla',
    destacado: true,
    revistaPagina: '/products/revista/formula-1000.jpg',
    beneficios: [
      'Fortalece las defensas y el sistema inmunológico',
      'Aporta energía y combate el cansancio',
      'Favorece la digestión y la absorción de nutrientes',
      'Ayuda al desarrollo muscular y a la regeneración celular',
      'Contribuye al bienestar general del organismo',
      'Fortalece huesos y dientes, ayuda a prevenir la osteoporosis',
    ],
    ingredientes: [
      'Calostro de Bovino', 'Polvo de Quinua',
      'Polvo de Hongo Shitake', 'Polvo de Hongos Agaricus',
      'Polvo de Hoja de Moringa', 'Polvo de Avena',
      'Polvo de Mashua', 'Polvo de Cacao',
      'Micropulverizado de Limón', 'Micropulverizado de Hoja de Naranja',
      'Polvo de Cúrcuma',
      'Minerales esenciales: Calcio, Hierro, Potasio, Ácido Fólico, Zinc, Magnesio, Vitamina B12',
    ],
    modoUso: 'Disolver 3 cucharadas (30 g) en un vaso de leche o agua. Consumir 1 a 2 veces al día.',
    precauciones: 'Sin colorantes artificiales. Sin conservantes. Apto para toda la familia: deportistas, niños en crecimiento, adultos mayores, personas convalecientes, veganos y vegetarianos.',
    detalleLargo: 'Formula 1000 es una bebida nutritiva 100% orgánica elaborada con ingredientes naturales de alta calidad: proteínas, vitaminas, minerales y antioxidantes que fortalecen tu cuerpo de manera integral. Mezcla funcional de quinua con calostro de bovino y hongos, con más nutrientes y vitaminas para acompañar tu día a día.',
  },
  {
    codigo: '00009',
    slug: 'chupapanza',
    nombre: 'Fibramak Chupapanza',
    categoria: 'Depurador y quemador de grasa natural',
    categoriaKey: 'suplementos',
    pvp: 19.90,
    descripcion: 'Suplemento alimenticio con mezcla de ingredientes naturales que apoyan el bienestar y ayudan a mantener tu figura.',
    imagen: '/products/chupapanza.png',
    tagline: 'Limpia, depura y activa tu cuerpo',
    presentacion: 'Frasco · polvo',
    revistaPagina: '/products/revista/chupapanza.jpg',
    beneficios: [
      'Ayuda a eliminar toxinas y desechos del organismo',
      'Favorece la pérdida de grasa corporal',
      'Mejora la digestión y el tránsito intestinal',
      'Reduce la retención de líquidos',
      'Aporta sensación de bienestar general',
    ],
    ingredientes: [
      'Linaza — rica en fibra, ayuda al tránsito intestinal',
      'Nopal — contribuye a regular el azúcar y la digestión',
      'Té Verde — antioxidante natural que apoya el metabolismo',
      'Piña — favorece la digestión y ayuda a eliminar líquidos',
      'Apio — depurativo natural que apoya la eliminación de toxinas',
      'Alcachofa — ayuda a mejorar la digestión y la función hepática',
      'Jengibre — estimula el metabolismo y ayuda a la digestión',
      'Perejil — diurético natural que ayuda a eliminar líquidos',
      'Avena — fuente de fibra que genera saciedad y mejora la digestión',
    ],
    modoUso: 'Mezclar 2 cucharadas (15 g) en un vaso con 200 ml de agua. Tomar preferiblemente en ayunas o 30 minutos antes de las comidas.',
    precauciones: 'Endulzante no calórico. Sin azúcar añadida. Sin colorantes artificiales. Acompañar con dieta balanceada y ejercicio.',
    detalleLargo: 'Fibramak Chupapanza apoya tu bienestar y te ayuda a mantener tu figura con ingredientes naturales. Una mezcla pensada para limpiar, depurar y activar tu cuerpo todos los días.',
  },
  {
    codigo: '00010',
    slug: 'capsula-moringa',
    nombre: 'Original Moringa',
    categoria: 'Suplemento alimenticio 100% natural',
    categoriaKey: 'capsulas',
    pvp: 22.50,
    descripcion: 'Cápsulas de Moringa Oleifera con vitaminas, minerales y proteínas. Nutrición natural en cada toma.',
    imagen: '/products/capsula-moringa.png',
    tagline: 'La fuerza de la naturaleza en cada cápsula',
    presentacion: '90 cápsulas · 500 mg c/u',
    revistaPagina: '/products/revista/capsula-moringa.jpg',
    beneficios: [
      'Fortalece el sistema inmunológico y ayuda a prevenir enfermedades',
      'Aporta energía natural y combate el cansancio',
      'Favorece la desintoxicación del organismo',
      'Mejora la salud de la piel, cabello y uñas',
      'Contribuye a la salud ósea y muscular',
      'Apoya la salud cardiovascular regulando la presión y el colesterol',
    ],
    ingredientes: [
      'Hojas de Moringa Oleifera',
      'Vitaminas del Complejo B',
      'Vitamina C',
      'Minerales esenciales: Calcio, Hierro, Potasio, Zinc, Magnesio, Fósforo, Cobre, Cromo',
      'Proteína vegetal',
    ],
    modoUso: 'Tomar 2 cápsulas al día después de las comidas con un vaso de agua.',
    precauciones: '100% natural · Sin colorantes ni conservantes artificiales.',
    detalleLargo: 'Original Moringa es un suplemento alimenticio 100% natural elaborado a base de Moringa Oleifera, una planta reconocida por su alto contenido en nutrientes esenciales. Cada cápsula contiene vitaminas, minerales, aminoácidos y antioxidantes que apoyan tu salud de manera integral.',
  },
  {
    codigo: '00011',
    slug: 'capsula-madre-silvestre',
    nombre: 'Madre Silvestre',
    categoria: 'Bienestar femenino · 100% natural',
    categoriaKey: 'capsulas',
    pvp: 20.00,
    descripcion: 'Mezcla de hierbas medicinales para el equilibrio del ciclo menstrual y la salud femenina integral.',
    imagen: '/products/capsula-madre-silvestre.png',
    tagline: 'Sabiduría natural, vida saludable y plena',
    presentacion: '100 cápsulas · 500 mg c/u',
    revistaPagina: '/products/revista/capsula-madre-silvestre.jpg',
    beneficios: [
      'Alivia cólicos menstruales y dolores pélvicos',
      'Regula el ciclo menstrual',
      'Apoya el organismo y ayuda a eliminar toxinas',
      'Mejora la digestión y reduce la inflamación',
      'Fortalece el sistema inmunológico',
      'Equilibra hormonas de forma natural',
      'Disminuye la retención de líquidos y la hinchazón',
    ],
    ingredientes: [
      'Té del Indio', 'Chancapiedra', 'Menta', 'Flor Blanca',
      'Malva', 'Sábila (Aloe Vera)', 'Ajenjo', 'Flor de Arenilla',
      'Cola de Caballo', 'Uña de Gato', 'Sangre de Drago', 'Canchalagua',
      'Minerales: Calcio, Hierro, Potasio, Magnesio, Zinc',
      'Vitaminas: Ácido Fólico, B6, C, E y Selenio',
    ],
    modoUso: 'Tomar 1 cápsula 2 veces al día, preferiblemente antes de las aguas. Acompañar con un vaso de agua.',
    precauciones: 'Sin colorantes, sin conservantes. Apto para vegetarianos. No usar durante embarazo. Consultar con su ginecólogo si está bajo tratamiento hormonal.',
    detalleLargo: 'Madre Silvestre es una mezcla única de hierbas medicinales seleccionadas por sus propiedades naturales, que ayudan a equilibrar el organismo femenino y mejorar la calidad de vida. Bienestar natural para tu cuerpo y tu ciclo.',
  },
  {
    codigo: '00012',
    slug: 'shampoo-activa',
    nombre: 'Shampoo Activa',
    categoria: 'Extractos de Células Madres · Aroma Miel',
    categoriaKey: 'cuidado-personal',
    pvp: 20.00,
    descripcion: 'Shampoo con extractos de células madres vegetales y aceites naturales. Sin sal · Libre de parabenos.',
    imagen: '/products/shampoo-activa.png',
    tagline: 'Máxima nutrición, suavidad y brillo',
    presentacion: 'Botella de 1 litro',
    revistaPagina: '/products/revista/shampoo-activa.jpg',
    beneficios: [
      'Estimula el crecimiento del cabello',
      'Aporta brillo, suavidad y sedosidad',
      'Elimina el exceso de grasa y limpia a fondo',
      'Reduce la caída y fortalece la raíz',
      'Repara el cabello dañado y las puntas abiertas',
      'Hidrata y nutre profundamente',
      'Deja el cabello ligero, manejable y con aroma agradable',
    ],
    ingredientes: [
      'Extractos de Células Madres — regeneran y revitalizan el cuero cabelludo',
      'Aceite de Argán — aporta brillo, suavidad y controla el frizz',
      'Aceite de Coco — hidrata profundamente y fortalece la fibra capilar',
      'Romero — estimula el crecimiento del cabello y previene la caída',
      'Manzanilla y Camomila — calman el cuero cabelludo y combaten la resequedad',
      'Ortiga — fortalece el folículo capilar',
      'Vitamina E — antioxidante que nutre y protege el cabello',
    ],
    modoUso: '1) Aplicar sobre el cabello mojado. 2) Masajear suavemente el cuero cabelludo. 3) Enjuagar con abundante agua. Úsalo diariamente para mejores resultados.',
    precauciones: 'Sin sal · Libre de parabenos. Nutrición profunda con aroma miel.',
    detalleLargo: 'Shampoo Activa combina extractos de células madres con aceites naturales y plantas medicinales para ofrecerte máxima nutrición, suavidad y brillo. Más que un shampoo: un tratamiento capilar diario que restaura tu cabello desde la raíz.',
  },
  {
    codigo: '00013',
    slug: 'tomatodo-sumak',
    nombre: 'Tomatodo Sumak',
    categoria: 'Accesorio de marca',
    categoriaKey: 'accesorios',
    pvp: 5.00,
    descripcion: 'Tomatodo deportivo con logo de Sumak. Práctico y ecológico.',
    imagen: '/products/tomatodo-sumak.png',
    presentacion: 'Capacidad: 750 ml',
    beneficios: [
      'Material libre de BPA',
      'Diseño deportivo y elegante',
      'Logo de Sumak grabado',
      'Ideal para tu hidratación diaria',
    ],
    modoUso: 'Lavar antes del primer uso. Apto para bebidas frías y tibias.',
    detalleLargo: 'Lleva la marca contigo y mantente hidratado. Un accesorio práctico para el día a día del distribuidor Sumak.',
  },
  {
    codigo: '00014',
    slug: 'mochila-sumak',
    nombre: 'Mochila Sumak',
    categoria: 'Accesorio de marca',
    categoriaKey: 'accesorios',
    pvp: 15.00,
    descripcion: 'Mochila ejecutiva con logo Sumak. Ideal para distribuidores y representantes.',
    imagen: '/products/mochila-sumak.png',
    presentacion: 'Resistente, compartimento para laptop',
    beneficios: [
      'Tela resistente al agua',
      'Compartimento acolchado para laptop',
      'Logo Sumak bordado',
      'Diseño moderno y profesional',
    ],
    detalleLargo: 'Lleva tu negocio Sumak a donde vayas con estilo. Diseñada para profesionales y distribuidores activos que necesitan funcionalidad y presencia de marca.',
  },
  {
    codigo: '00015',
    slug: 'catalogo-de-productos',
    nombre: 'Catálogo de Productos',
    categoria: 'Material de trabajo',
    categoriaKey: 'material',
    pvp: 10.00,
    descripcion: 'Catálogo físico impreso a todo color con productos, precios y oportunidad de negocio.',
    presentacion: 'Catálogo a color · papel premium',
    proximamente: true,
    beneficios: [
      'Material profesional para presentaciones',
      'Información completa de productos y precios',
      'Detalle del plan de negocios',
      'Impresión a todo color',
    ],
    detalleLargo: 'Tu herramienta de ventas. Un catálogo impreso para presentar Sumak a clientes y prospectos con la imagen profesional que tu negocio merece.',
  },
];

// ── Category Filters ─────────────────────────────────────────
export const categoryFilters: CategoryFilter[] = [
  { label: 'Todos', key: 'todos' },
  { label: 'Bebidas', key: 'bebidas' },
  { label: 'Suplementos', key: 'suplementos' },
  { label: 'Cápsulas', key: 'capsulas' },
  { label: 'Cuidado Personal', key: 'cuidado-personal' },
  { label: 'Accesorios', key: 'accesorios' },
  { label: 'Material', key: 'material' },
];

// ── Affiliate Packages ───────────────────────────────────────
const packageBenefits: string[] = [
  'Tienda virtual personal',
  'Acceso al árbol de negocio/genealogía',
  'Acceso a capacitaciones',
  'Comisiones y bonos',
  'Regalías por subida de rango',
];

export const affiliatePackages: AffiliatePackage[] = [
  {
    nombre: 'Básico',
    precio: 125,
    puntos: 125,
    productos: 9,
    destacado: false,
    beneficios: packageBenefits,
  },
  {
    nombre: 'Emprendedor',
    precio: 225,
    puntos: 225,
    productos: 9,
    destacado: true,
    beneficios: packageBenefits,
  },
  {
    nombre: 'Líder',
    precio: 525,
    puntos: 525,
    productos: 9,
    destacado: false,
    beneficios: packageBenefits,
  },
];

// ── Level Commissions ────────────────────────────────────────
export const levelCommissions: LevelCommission[] = [
  { nivel: 1, porcentaje: 5 },
  { nivel: 2, porcentaje: 20 },
  { nivel: 3, porcentaje: 5 },
  { nivel: 4, porcentaje: 4 },
  { nivel: 5, porcentaje: 3 },
  { nivel: 6, porcentaje: 2 },
  { nivel: 7, porcentaje: 1 },
  { nivel: 8, porcentaje: 0.5 },
  { nivel: 9, porcentaje: 0.5 },
  { nivel: 10, porcentaje: 0.5 },
  { nivel: 11, porcentaje: 0.5 },
  { nivel: 12, porcentaje: 0.5 },
  { nivel: 13, porcentaje: 0.5 },
  { nivel: 14, porcentaje: 0.5 },
];

// ── Tramo 1 Ranks ────────────────────────────────────────────
export const tramo1Ranks: Tramo1Rank[] = [
  { rango: 'Socio', personasDirectas: 0, bono: '$100.00' },
  { rango: 'Básico', personasDirectas: 1, bono: '$125.00' },
  { rango: 'Emprendedor', personasDirectas: 2, bono: '$200.00' },
  { rango: 'Distribuidor Activo', personasDirectas: 3, bono: '$300.00' },
  { rango: 'Líder', personasDirectas: 5, bono: '$500.00' },
  { rango: 'Ejecutivo Activo', personasDirectas: 10, bono: '$1,000.00' },
  { rango: 'Líder (nivel 2)', personasDirectas: 15, bono: '$1,500.00' },
  { rango: 'Líder Activo', personasDirectas: 20, bono: '$2,000.00' },
  { rango: 'Gerente', personasDirectas: 30, bono: '$3,000.00 + Viaje Local' },
  { rango: 'Gerente (nivel 2)', personasDirectas: 40, bono: '$4,000.00 + Viaje Nacional' },
];

export function getRangoActual(directos: number): Tramo1Rank {
  let current = tramo1Ranks[0];
  for (const r of tramo1Ranks) {
    if (directos >= r.personasDirectas) current = r;
    else break;
  }
  return current;
}

export function getNextRango(directos: number): Tramo1Rank | null {
  for (const r of tramo1Ranks) {
    if (r.personasDirectas > directos) return r;
  }
  return null;
}

// ── Tramo 2 Ranks ────────────────────────────────────────────
export const tramo2Ranks: Tramo2Rank[] = [
  { rango: 'Gerente', nivelesActivos: '1–5', personasEnRed: 50, recompensa: '$5,000.00', extras: 'Viaje Internacional' },
  { rango: 'Gerente', nivelesActivos: '1–6', personasEnRed: 100, recompensa: '$10,000.00', extras: 'Cocina' },
  { rango: 'Gerente', nivelesActivos: '1–7', personasEnRed: 200, recompensa: '$20,000.00', extras: 'Nevera' },
  { rango: 'Gerente', nivelesActivos: '1–8', personasEnRed: 500, recompensa: '$50,000.00', extras: 'Proyector' },
  { rango: 'Diamante', nivelesActivos: '1–9', personasEnRed: 1000, recompensa: '$100,000.00', extras: 'Laptop' },
  { rango: 'Diamante Bronce', nivelesActivos: '1–10', personasEnRed: 2000, recompensa: '$200,000.00', extras: 'Moto' },
  { rango: 'Diamante Plata', nivelesActivos: '1–11', personasEnRed: 3000, recompensa: '$300,000.00', extras: 'Carro' },
  { rango: 'Diamante Oro', nivelesActivos: '1–12', personasEnRed: 5000, recompensa: '$500,000.00', extras: 'Carro' },
  { rango: 'Fundador Nacional', nivelesActivos: '1–13', personasEnRed: 7000, recompensa: '$700,000.00', extras: 'Carro' },
  { rango: 'Fundador Internacional', nivelesActivos: '1–14', personasEnRed: 10000, recompensa: '$1,000,000.00', extras: 'Casa' },
];

// ── Contact Info ─────────────────────────────────────────────
export const contactInfo: ContactInfo = {
  empresa: 'Sumak Vida Ecuador S.A.',
  nombreComercial: 'SUMAK',
  slogan: 'Naturaleza que Nutre, Bienestar que Transforma',
  ruc: '1291781000001',
  gerenteGeneral: 'Dr. Luis Paredes',
  emailPrincipal: 'sumak.vida1979@gmail.com',
  emailSecundario: 'vidalife1979@gmail.com',
  telefono1: '0988447019',
  telefono2: '0988447019',
  direccion: '5 de Junio entre Bolívar y Calderón, Edificio Santana, primer piso, Oficina SUMAK, Babahoyo, Los Ríos',
  facebook: 'Sumak Vida Ecuador',
  instagram: '@sumakvidaecuador',
  web: 'www.sumak.com.ec',
  whatsapp: '593988447019',
};
