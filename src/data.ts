export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  benefit: string;
  shortDesc: string;
  ingredients: string[];
  retailPrice: number;
  distributorPrice: number;
};

export const productsData: Product[] = [
  { id: '1', slug: 'sumak-vita', name: 'Sumak Vita', category: 'Bienestar', benefit: 'Multivitamínico completo', shortDesc: 'Equilibrio diario con vitaminas y minerales esenciales.', ingredients: ['Vitamina C', 'Zinc', 'Magnesio'], retailPrice: 35.00, distributorPrice: 24.50 },
  { id: '2', slug: 'sumak-energy', name: 'Sumak Energy', category: 'Energía', benefit: 'Energizante natural', shortDesc: 'Mantén tu energía al máximo durante todo el día.', ingredients: ['Guaraná', 'Maca', 'Vitamina B12'], retailPrice: 30.00, distributorPrice: 21.00 },
  { id: '3', slug: 'sumak-inmuno', name: 'Sumak Inmuno', category: 'Inmunidad', benefit: 'Refuerzo inmunológico', shortDesc: 'Protege tu sistema inmune con extractos naturales.', ingredients: ['Equinácea', 'Vitamina D3', 'Propóleo'], retailPrice: 38.00, distributorPrice: 26.60 },
  { id: '4', slug: 'sumak-detox', name: 'Sumak Detox', category: 'Detox', benefit: 'Desintoxicante 30 días', shortDesc: 'Limpia tu organismo y mejora tu digestión.', ingredients: ['Alcachofa', 'Té Verde', 'Diente de León'], retailPrice: 40.00, distributorPrice: 28.00 },
  { id: '5', slug: 'sumak-protein', name: 'Sumak Protein', category: 'Proteínas', benefit: 'Proteína vegetal', shortDesc: 'Construye músculo con proteína limpia y vegana.', ingredients: ['Proteína de Arveja', 'Chía', 'Cacao'], retailPrice: 55.00, distributorPrice: 38.50 },
  { id: '6', slug: 'sumak-slim', name: 'Sumak Slim', category: 'Quema de Grasa', benefit: 'Control de peso', shortDesc: 'Apoya tu metabolismo y alcanza tu peso ideal.', ingredients: ['L-Carnitina', 'Garcinia Cambogia', 'Cromo'], retailPrice: 42.00, distributorPrice: 29.40 },
  { id: '7', slug: 'sumak-omega', name: 'Sumak Omega', category: 'Bienestar', benefit: 'Ácidos grasos premium', shortDesc: 'Protege tu corazón y función cerebral.', ingredients: ['Omega 3', 'DHA', 'EPA'], retailPrice: 36.00, distributorPrice: 25.20 },
  { id: '8', slug: 'sumak-collagen', name: 'Sumak Collagen', category: 'Bienestar', benefit: 'Colágeno hidrolizado', shortDesc: 'Fuerza y elasticidad para piel, cabello y uñas.', ingredients: ['Colágeno Tipo I y III', 'Vitamina C', 'Biotina'], retailPrice: 45.00, distributorPrice: 31.50 },
  { id: '9', slug: 'sumak-probiotic', name: 'Sumak Probiotic', category: 'Bienestar', benefit: 'Salud intestinal', shortDesc: 'Restaura tu flora intestinal y mejora la absorción.', ingredients: ['Lactobacillus', 'Bifidobacterium', 'Inulina'], retailPrice: 39.00, distributorPrice: 27.30 },
  { id: '10', slug: 'sumak-kids', name: 'Sumak Kids', category: 'Bienestar', benefit: 'Para niños', shortDesc: 'Nutrición divertida para los más pequeños.', ingredients: ['Vitaminas A-Z', 'Calcio', 'Hierro'], retailPrice: 28.00, distributorPrice: 19.60 },
  { id: '11', slug: 'sumak-senior', name: 'Sumak Senior', category: 'Bienestar', benefit: 'Para adultos mayores', shortDesc: 'Vitalidad y cuidado óseo para disfrutar la vida.', ingredients: ['Calcio', 'Vitamina D', 'Complejo B'], retailPrice: 40.00, distributorPrice: 28.00 },
  { id: '12', slug: 'sumak-sport', name: 'Sumak Sport', category: 'Energía', benefit: 'Rendimiento físico', shortDesc: 'Recuperación muscular rápida y energía pura.', ingredients: ['BCAAs', 'Glutamina', 'Sodio'], retailPrice: 48.00, distributorPrice: 33.60 },
];
