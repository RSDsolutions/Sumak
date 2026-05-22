import { useState } from 'react';
import { productsData } from '../data';
import { ProductCard } from '../components/ProductCard';

export default function Productos() {
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  const categories = ['Todos', 'Energía', 'Inmunidad', 'Bienestar', 'Proteínas', 'Quema de Grasa', 'Detox'];

  const filteredProducts = activeCategory === 'Todos' 
    ? productsData 
    : productsData.filter(p => p.category === activeCategory);

  return (
    <div className="w-full bg-brand-black min-h-screen pt-24 pb-24 relative overflow-hidden">
      {/* Subdued hexagon bg */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
           <defs>
              <pattern id="hexagons2" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                 <polygon points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2" fill="none" stroke="#FFFFFF" strokeWidth="1"/>
                 <polygon points="49.8,22 62.3,29.2 62.3,43.7 49.8,50.9 37.3,43.7 37.3,29.2" fill="none" stroke="#FFFFFF" strokeWidth="1"/>
              </pattern>
           </defs>
           <rect x="0" y="0" width="100%" height="100%" fill="url(#hexagons2)"/>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#F0F0F0] tracking-tight">Nuestros Productos</h1>
          <p className="text-brand-text-muted mt-4 text-lg max-w-2xl">
            Suplementación premium respaldada por ciencia y naturaleza. Fórmulas exclusivas para elevar tu rendimiento y bienestar diario.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                activeCategory === cat 
                  ? 'bg-brand-emerald text-white shadow-emerald-glow' 
                  : 'bg-brand-surface border border-brand-border text-brand-text-muted hover:text-[#F0F0F0]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-brand-text-muted">
            No se encontraron productos en esta categoría.
          </div>
        )}

      </div>
    </div>
  );
}
