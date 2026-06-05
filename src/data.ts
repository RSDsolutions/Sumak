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
  },
  {
    codigo: '00002',
    slug: 'regen-24',
    nombre: 'REGEN 24',
    categoria: 'Bebida tropical',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Bebida con frutas tropicales. Desintoxica el colón.',
    imagen: '/products/regen-24.png',
  },
  {
    codigo: '00003',
    slug: 'bebida-andina',
    nombre: 'Bebida Andina',
    categoria: 'Probiótico natural',
    categoriaKey: 'bebidas',
    pvp: 20.00,
    descripcion: 'Probiótico con extractos andinos. 1000 ml.',
    imagen: '/products/bebida-andina.png',
  },
  {
    codigo: '00004',
    slug: 'vive-oxi-100',
    nombre: 'Vive-Oxi-100',
    categoria: 'Bebida hortalizas',
    categoriaKey: 'bebidas',
    pvp: 25.00,
    descripcion: 'Enriquecido con oxígeno líquido. 50 ml.',
    imagen: '/products/vive-oxi-100.png',
  },
  {
    codigo: '00005',
    slug: 'fibramak-plus',
    nombre: 'Fibramak Plus',
    categoria: 'Suplemento',
    categoriaKey: 'suplementos',
    pvp: 25.00,
    descripcion: 'Limpieza intestinal profunda. Desintoxica.',
    imagen: '/products/fibramak-plus.png',
  },
  {
    codigo: '00006',
    slug: 'moringa-en-polvo',
    nombre: 'Moringa en Polvo',
    categoria: 'Suplemento orgánico',
    categoriaKey: 'suplementos',
    pvp: 25.00,
    descripcion: '100% hojas de moringa. Frasco 100g.',
  },
  {
    codigo: '00007',
    slug: 'colageno-hidrolizado',
    nombre: 'Colágeno Hidrolizado',
    categoria: 'Suplemento',
    categoriaKey: 'suplementos',
    pvp: 27.50,
    descripcion: 'Reforzado con ácido hialurónico. 500g.',
    imagen: '/products/colageno-hidrolizado.png',
  },
  {
    codigo: '00008',
    slug: 'formula-1000',
    nombre: 'Formula 1000',
    categoria: 'Suplemento',
    categoriaKey: 'suplementos',
    pvp: 60.00,
    descripcion: 'Mezcla de quinua, calostro bovino y hongos. 100% orgánico.',
    imagen: '/products/formula-1000.png',
  },
  {
    codigo: '00009',
    slug: 'chupapanza',
    nombre: 'Chupapanza',
    categoria: 'Suplemento',
    categoriaKey: 'suplementos',
    pvp: 19.90,
    descripcion: 'Depurador y quemador de grasa natural.',
  },
  {
    codigo: '00010',
    slug: 'capsula-moringa',
    nombre: 'Cápsula Moringa',
    categoria: 'Cápsulas',
    categoriaKey: 'capsulas',
    pvp: 22.50,
    descripcion: '90 cápsulas de 500 mg. Moringa Oleifera.',
  },
  {
    codigo: '00011',
    slug: 'capsula-madre-silvestre',
    nombre: 'Cápsula Madre Silvestre',
    categoria: 'Cápsulas',
    categoriaKey: 'capsulas',
    pvp: 20.00,
    descripcion: '100 cápsulas. Equilibrio ciclo menstrual.',
    imagen: '/products/capsula-madre-silvestre.png',
  },
  {
    codigo: '00012',
    slug: 'shampoo-activa',
    nombre: 'Shampoo Activa',
    categoria: 'Cuidado personal',
    categoriaKey: 'cuidado-personal',
    pvp: 20.00,
    descripcion: 'Extractos células madres. Aroma miel. 1 litro.',
    imagen: '/products/shampoo-activa.png',
  },
  {
    codigo: '00013',
    slug: 'tomatodo-sumak',
    nombre: 'Tomatodo Sumak',
    categoria: 'Accesorio',
    categoriaKey: 'accesorios',
    pvp: 5.00,
    descripcion: 'Accesorio de marca.',
  },
  {
    codigo: '00014',
    slug: 'mochila-sumak',
    nombre: 'Mochila Sumak',
    categoria: 'Accesorio',
    categoriaKey: 'accesorios',
    pvp: 15.00,
    descripcion: 'Accesorio de marca.',
  },
  {
    codigo: '00015',
    slug: 'catalogo-de-productos',
    nombre: 'Catálogo de Productos',
    categoria: 'Material',
    categoriaKey: 'material',
    pvp: 10.00,
    descripcion: 'Catálogo físico impreso.',
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
