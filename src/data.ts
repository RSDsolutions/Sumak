// ============================================================
// SUMAK VIDA ECUADOR S.A. — Central Data File
// All data extracted from official company PDFs
// ============================================================

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
  beneficios?: string[];
  ingredientes?: string[];
  modoUso?: string;
  precauciones?: string;
  detalleLargo?: string;
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
    categoria: 'Bebida herbal',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Bebida base de hierbas. Limpia, desintoxica y regenera.',
    imagen: '/products/te-extractos-de-la-vida.png',
    tagline: 'La base de tu bienestar diario',
    presentacion: 'Botella de 1000 ml',
    destacado: true,
    bestseller: true,
    beneficios: [
      'Limpia el organismo a profundidad',
      'Desintoxica órganos vitales (hígado, riñones, colon)',
      'Regenera células y mejora el sistema inmune',
      'Aporta energía y vitalidad de forma natural',
      'Equilibra el pH del organismo',
    ],
    ingredientes: [
      'Cola de caballo', 'Diente de león', 'Manzanilla', 'Llantén',
      'Hierba luisa', 'Ortiga', 'Cedrón', 'Anís estrellado',
    ],
    modoUso: 'Tomar 50 ml en la mañana en ayunas y 50 ml en la noche antes de dormir. Agitar antes de servir. Conservar refrigerado una vez abierto.',
    precauciones: 'No recomendado para mujeres embarazadas o en lactancia. Si está bajo tratamiento médico, consulte a su especialista.',
    detalleLargo: 'Nuestra bebida insignia, elaborada bajo procesos artesanales en el laboratorio Sumak Jambi. Combina 8 plantas medicinales andinas seleccionadas por sus propiedades depurativas, antiinflamatorias y regeneradoras. Una fórmula ancestral pensada para acompañarte cada día.',
  },
  {
    codigo: '00002',
    slug: 'regen-24',
    nombre: 'REGEN 24',
    categoria: 'Bebida tropical',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Bebida tropical con frutas selectas. Desintoxica el colón y regenera en 24 horas.',
    imagen: '/products/regen-24.png',
    tagline: 'Renueva tu energía en 24 horas',
    presentacion: 'Botella de 1000 ml',
    destacado: true,
    bestseller: true,
    beneficios: [
      'Limpieza profunda del colon en 24 horas',
      'Mejora la digestión y elimina toxinas acumuladas',
      'Combate el estreñimiento de forma natural',
      'Sabor tropical agradable y refrescante',
      'Aporta antioxidantes y vitaminas',
    ],
    ingredientes: [
      'Piña tropical', 'Papaya madura', 'Manzana verde', 'Linaza',
      'Sábila (aloe vera)', 'Jengibre', 'Sen', 'Cáscara sagrada',
    ],
    modoUso: 'Tomar 100 ml en ayunas durante 24 horas para un efecto desintoxicante rápido. Para uso diario: 50 ml en la mañana. Refrigerar tras abrir.',
    precauciones: 'No usar más de 3 días seguidos. No recomendado en embarazo, lactancia o pacientes con obstrucción intestinal.',
    detalleLargo: 'Una fórmula tropical pensada para reiniciar tu sistema digestivo. REGEN 24 combina frutas frescas con plantas depurativas que actúan en sinergia para liberar tu cuerpo de toxinas en sólo un día.',
  },
  {
    codigo: '00003',
    slug: 'bebida-andina',
    nombre: 'Bebida Andina',
    categoria: 'Probiótico natural',
    categoriaKey: 'bebidas',
    pvp: 20.00,
    descripcion: 'Probiótico con extractos andinos que fortalece tu flora intestinal y sistema inmune.',
    imagen: '/products/bebida-andina.png',
    tagline: 'Sabiduría ancestral para tu flora intestinal',
    presentacion: 'Botella de 1000 ml',
    beneficios: [
      'Restaura la flora intestinal saludable',
      'Fortalece el sistema inmunológico',
      'Mejora la absorción de nutrientes',
      'Aporta bacterias buenas vivas',
      'Combate la inflamación intestinal',
    ],
    ingredientes: [
      'Quinua fermentada', 'Maíz andino', 'Amaranto', 'Suero de leche probiótico',
      'Extracto de chuquiragua', 'Raíz de valeriana',
    ],
    modoUso: 'Tomar 100 ml en la mañana antes del desayuno y 100 ml antes de cenar. Agitar bien. Mantener refrigerado.',
    detalleLargo: 'Un probiótico vivo basado en granos ancestrales andinos. Más que una bebida: es un acto cultural que conecta con la sabiduría de los pueblos de los Andes en cada sorbo.',
  },
  {
    codigo: '00004',
    slug: 'vive-oxi-100',
    nombre: 'Vive-Oxi-100',
    categoria: 'Bebida con oxígeno',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Bebida enriquecida con oxígeno líquido. Oxigena células y elimina radicales libres.',
    imagen: '/products/vive-oxi-100.png',
    tagline: 'Respira vida en cada gota',
    presentacion: 'Frasco de 50 ml — concentrado',
    nuevo: true,
    beneficios: [
      'Oxigena las células del cuerpo',
      'Combate los radicales libres y el envejecimiento',
      'Aumenta el rendimiento físico y mental',
      'Mejora la oxigenación cerebral',
      'Fortalece el sistema circulatorio',
    ],
    ingredientes: [
      'Oxígeno estabilizado en agua bidestilada', 'Extracto de hortalizas (espinaca, berro, perejil)',
      'Vitamina C natural', 'Magnesio iónico',
    ],
    modoUso: 'Colocar 20 gotas en un vaso con agua y tomar en la mañana. Repetir antes del almuerzo si se desea mayor energía.',
    precauciones: 'No exceder la dosis diaria recomendada. Conservar en lugar fresco y oscuro.',
    detalleLargo: 'Un concentrado único en su tipo. Vive-Oxi-100 entrega oxígeno bioactivo directamente a tus células, regenerando energía y combatiendo el estrés oxidativo desde el interior.',
  },
  {
    codigo: '00005',
    slug: 'fibramak-plus',
    nombre: 'Fibramak Plus',
    categoria: 'Fibra natural',
    categoriaKey: 'suplementos',
    pvp: 25.00,
    descripcion: 'Limpieza intestinal profunda con fibra natural premium. Desintoxica el colon.',
    imagen: '/products/fibramak-plus.png',
    tagline: 'Tu colon merece este reset',
    presentacion: 'Frasco de 250 g — polvo',
    beneficios: [
      'Limpieza intestinal profunda y suave',
      'Reduce la inflamación abdominal',
      'Controla el apetito por más tiempo',
      'Mejora el tránsito intestinal',
      'Aporta sensación de saciedad',
    ],
    ingredientes: [
      'Psyllium husk', 'Linaza molida', 'Chía', 'Avena integral',
      'Inulina de agave', 'Sábila deshidratada',
    ],
    modoUso: 'Mezclar 1 cucharada en un vaso de agua o jugo natural. Tomar inmediatamente, una vez al día, preferentemente antes de dormir.',
    precauciones: 'Acompañar con abundante agua durante el día (mínimo 2 litros).',
    detalleLargo: 'Fórmula de fibra premium pensada para un reset intestinal completo. Su mezcla equilibrada de fibras solubles e insolubles brinda los beneficios de una limpieza profunda sin agresiones.',
  },
  {
    codigo: '00006',
    slug: 'moringa-en-polvo',
    nombre: 'Moringa en Polvo',
    categoria: 'Superalimento',
    categoriaKey: 'suplementos',
    pvp: 25.00,
    descripcion: 'Hojas de Moringa Oleifera 100% puras y deshidratadas. El árbol de la vida en polvo.',
    presentacion: 'Frasco de 100 g — polvo',
    beneficios: [
      'Aporta 92 nutrientes esenciales',
      'Rica en hierro, calcio y vitamina A',
      'Antioxidante y antiinflamatoria',
      'Energizante natural sin cafeína',
      'Apoyo al sistema inmune',
    ],
    ingredientes: ['100% hojas de Moringa Oleifera secadas al sol y molidas en frío'],
    modoUso: 'Añadir 1 cucharadita en jugos, batidos, sopas o agua tibia. Consumir 1 a 2 veces al día.',
    detalleLargo: 'La moringa es conocida como "el árbol de la vida" por su contenido nutricional extraordinario. Nuestras hojas son cultivadas y procesadas en Ecuador bajo estrictos estándares de pureza.',
  },
  {
    codigo: '00007',
    slug: 'colageno-hidrolizado',
    nombre: 'Colágeno Hidrolizado',
    categoria: 'Belleza & Articulaciones',
    categoriaKey: 'suplementos',
    pvp: 27.50,
    descripcion: 'Colágeno hidrolizado premium reforzado con ácido hialurónico y vitamina C.',
    imagen: '/products/colageno-hidrolizado.png',
    tagline: 'Belleza que se nutre desde adentro',
    presentacion: 'Frasco de 500 g — polvo',
    destacado: true,
    bestseller: true,
    beneficios: [
      'Mejora la firmeza y elasticidad de la piel',
      'Fortalece cabello y uñas',
      'Apoya la salud articular y reduce dolor',
      'Reduce líneas de expresión y arrugas',
      'Hidrata profundamente desde el interior',
    ],
    ingredientes: [
      'Colágeno hidrolizado tipo I y III', 'Ácido hialurónico',
      'Vitamina C', 'Biotina', 'Zinc',
    ],
    modoUso: 'Disolver 1 medida (10 g) en agua, jugo o yogurt. Tomar 1 vez al día, preferentemente en la mañana o antes de dormir.',
    detalleLargo: 'Colágeno de alta absorción para resultados visibles. La combinación con ácido hialurónico y vitamina C potencia la síntesis natural de colágeno, mejorando tu piel, articulaciones y cabello desde el origen.',
  },
  {
    codigo: '00008',
    slug: 'formula-1000',
    nombre: 'Formula 1000',
    categoria: 'Energía & Sistema Inmune',
    categoriaKey: 'suplementos',
    pvp: 60.00,
    descripcion: 'Mezcla premium de quinua, calostro bovino y hongos medicinales. 100% orgánico.',
    imagen: '/products/formula-1000.png',
    tagline: 'La fórmula más poderosa del catálogo',
    presentacion: 'Frasco de 500 g — polvo',
    destacado: true,
    beneficios: [
      'Estimula y fortalece el sistema inmune',
      'Energía sostenida durante todo el día',
      'Aporta aminoácidos esenciales completos',
      'Apoyo a la recuperación muscular',
      'Mejora la concentración y memoria',
    ],
    ingredientes: [
      'Quinua orgánica', 'Calostro bovino', 'Hongo Reishi', 'Hongo Cordyceps',
      'Hongo Maitake', 'Maca andina', 'Cacao puro',
    ],
    modoUso: 'Mezclar 1 cucharada en leche vegetal, batido o agua tibia. Tomar 1 vez al día en la mañana.',
    detalleLargo: 'Nuestra fórmula más completa. Combina lo mejor del reino vegetal, animal y fúngico para un apoyo integral al sistema inmune y la energía. Ideal para deportistas, profesionales exigentes y personas en recuperación.',
  },
  {
    codigo: '00009',
    slug: 'chupapanza',
    nombre: 'Chupapanza',
    categoria: 'Control de peso',
    categoriaKey: 'suplementos',
    pvp: 19.90,
    descripcion: 'Depurador y quemador de grasa natural. Reduce medidas y elimina retención.',
    tagline: 'Adiós a la grasa abdominal',
    presentacion: 'Frasco de 250 ml — líquido',
    beneficios: [
      'Quemador natural de grasa abdominal',
      'Reduce retención de líquidos',
      'Acelera el metabolismo',
      'Controla el apetito',
      'Elimina toxinas',
    ],
    ingredientes: [
      'Té verde concentrado', 'Cola de caballo', 'L-carnitina natural',
      'Piña enzimática', 'Limón', 'Jengibre',
    ],
    modoUso: 'Tomar 1 cucharada en ayunas y otra antes del almuerzo. Acompañar con dieta balanceada y ejercicio.',
    detalleLargo: 'Un aliado natural para quienes buscan reducir medidas y mejorar su composición corporal. Funciona en sinergia con un estilo de vida activo y una alimentación consciente.',
  },
  {
    codigo: '00010',
    slug: 'capsula-moringa',
    nombre: 'Cápsulas de Moringa',
    categoria: 'Cápsulas',
    categoriaKey: 'capsulas',
    pvp: 22.50,
    descripcion: '90 cápsulas vegetales de 500 mg de hojas de Moringa Oleifera puras.',
    presentacion: '90 cápsulas vegetales · 500 mg c/u',
    beneficios: [
      'Práctica forma de consumir moringa diaria',
      'Antioxidante de amplio espectro',
      'Apoyo al sistema inmune',
      'Energía natural sostenida',
      'Cápsula 100% vegetal',
    ],
    ingredientes: ['Hojas de Moringa Oleifera deshidratadas', 'Cápsula vegetal de celulosa'],
    modoUso: 'Tomar 2 cápsulas con un vaso de agua, 2 veces al día, antes de las comidas principales.',
    detalleLargo: 'La forma más práctica de aprovechar los beneficios de la moringa. Ideal para llevar contigo y mantener una rutina de bienestar constante.',
  },
  {
    codigo: '00011',
    slug: 'capsula-madre-silvestre',
    nombre: 'Cápsulas Madre Silvestre',
    categoria: 'Salud femenina',
    categoriaKey: 'capsulas',
    pvp: 20.00,
    descripcion: '100 cápsulas. Equilibrio hormonal y regulación del ciclo menstrual.',
    imagen: '/products/capsula-madre-silvestre.png',
    tagline: 'Equilibrio femenino, naturalmente',
    presentacion: '100 cápsulas vegetales',
    beneficios: [
      'Equilibra el ciclo menstrual',
      'Reduce cólicos y dolor premenstrual',
      'Apoyo en síntomas de menopausia',
      'Regula hormonas femeninas',
      'Mejora estado de ánimo durante el ciclo',
    ],
    ingredientes: [
      'Sauco silvestre', 'Yamasanga', 'Manzanilla', 'Sangre de Cristo',
      'Romero', 'Ortiga blanca',
    ],
    modoUso: 'Tomar 1 cápsula 3 veces al día durante el ciclo. Para uso preventivo: 1 cápsula al día de forma continua.',
    precauciones: 'No usar durante embarazo. Consultar con su ginecólogo si está bajo tratamiento hormonal.',
    detalleLargo: 'Una fórmula creada especialmente para la mujer ecuatoriana, combinando plantas ancestrales utilizadas por generaciones para el equilibrio del ciclo femenino y el bienestar integral.',
  },
  {
    codigo: '00012',
    slug: 'shampoo-activa',
    nombre: 'Shampoo Activa',
    categoria: 'Cuidado capilar',
    categoriaKey: 'cuidado-personal',
    pvp: 20.00,
    descripcion: 'Shampoo con extractos de células madres vegetales. Aroma a miel. 1 litro.',
    imagen: '/products/shampoo-activa.png',
    tagline: 'Tu cabello, restaurado desde la raíz',
    presentacion: 'Botella de 1 litro',
    beneficios: [
      'Estimula el crecimiento del cabello',
      'Fortalece el folículo capilar',
      'Reduce la caída desde la primera semana',
      'Aroma natural a miel — relajante',
      'Sin sulfatos ni parabenos',
    ],
    ingredientes: [
      'Extractos de células madres vegetales', 'Aceite de coco', 'Romero',
      'Miel de abeja', 'Aloe vera', 'Vitaminas A, E y B5',
    ],
    modoUso: 'Aplicar sobre cabello húmedo, masajear el cuero cabelludo por 2 minutos y enjuagar. Usar diariamente o día por medio.',
    detalleLargo: 'Más que un shampoo: un tratamiento capilar diario. Sus extractos de células madres reactivan el folículo y devuelven la vitalidad a cabellos debilitados o con tendencia a la caída.',
  },
  {
    codigo: '00013',
    slug: 'tomatodo-sumak',
    nombre: 'Tomatodo Sumak',
    categoria: 'Accesorio de marca',
    categoriaKey: 'accesorios',
    pvp: 5.00,
    descripcion: 'Tomatodo deportivo con logo de Sumak. Práctico y ecológico.',
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
  { rango: 'Gerente', nivelesActivos: '1–5', personasEnRed: 50, recompensa: '$5,000.00' },
  { rango: 'Gerente', nivelesActivos: '1–6', personasEnRed: 100, recompensa: '$10,000.00', extras: 'Viaje Internacional' },
  { rango: 'Gerente', nivelesActivos: '1–7', personasEnRed: 200, recompensa: '$20,000.00' },
  { rango: 'Gerente', nivelesActivos: '1–8', personasEnRed: 500, recompensa: '$50,000.00' },
  { rango: 'Diamante', nivelesActivos: '1–9', personasEnRed: 1000, recompensa: '$100,000.00' },
  { rango: 'Diamante Bronce', nivelesActivos: '1–10', personasEnRed: 2000, recompensa: '$200,000.00' },
  { rango: 'Diamante Plata', nivelesActivos: '1–11', personasEnRed: 3000, recompensa: '$300,000.00' },
  { rango: 'Diamante Oro', nivelesActivos: '1–12', personasEnRed: 5000, recompensa: '$500,000.00' },
  { rango: 'Fundador Nacional', nivelesActivos: '1–13', personasEnRed: 7000, recompensa: '$700,000.00' },
  { rango: 'Fundador Internacional', nivelesActivos: '1–14', personasEnRed: 10000, recompensa: '$1,000,000.00' },
];

// ── Contact Info ─────────────────────────────────────────────
export const contactInfo: ContactInfo = {
  empresa: 'Sumak Vida Ecuador S.A.',
  nombreComercial: 'SUMAK',
  slogan: 'Naturaleza que Nutre, Bienestar que Transforma',
  ruc: '1291781000001',
  gerenteGeneral: 'Dr. Luis Paredes',
  emailPrincipal: 'empresariossumak@gmail.com',
  emailSecundario: 'sumak.vida1979@gmail.com',
  telefono1: '0989413008',
  telefono2: '0988447019',
  direccion: '5 de Junio entre Bolívar y Calderón, Edificio Santana, primer piso, Oficina SUMAK, Babahoyo, Los Ríos',
  facebook: 'Sumak Vida Ecuador',
  instagram: '@sumakvidaecuador',
  web: 'www.sumak.com.ec',
  whatsapp: '593989413008',
};
