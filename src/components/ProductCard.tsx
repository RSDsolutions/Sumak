import { Product } from '../data';
import { Link } from 'react-router-dom';
import { ProductBottleSVG } from './ProductBottleSVG';
import { Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group flex flex-col bg-brand-surface rounded-[16px] border border-brand-border hover:border-brand-emerald hover:-translate-y-1 transition-all duration-300 hover:shadow-emerald-glow overflow-hidden">
      
      {/* Image Area */}
      <div className="h-[240px] w-full relative bg-brand-black overflow-hidden flex-shrink-0 border-b border-brand-border flex items-center justify-center">
        <ProductBottleSVG category={product.category} />
        <div className="absolute top-4 left-4 z-20">
          <span className="px-3 py-1 bg-brand-emerald text-white text-[10px] font-medium tracking-widest uppercase rounded-full shadow-lg">
            {product.category}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-heading font-semibold text-xl text-[#F0F0F0] mb-1">
          {product.name}
        </h3>
        <p className="text-brand-text-muted text-sm line-clamp-2 min-h-[40px] mb-4">
          {product.shortDesc}
        </p>

        {/* Benefits/Ingredients Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {product.ingredients.slice(0, 2).map((ing, i) => (
            <span key={i} className="px-2 py-1 bg-[#222] border border-[#333] rounded-full text-xs text-brand-text-lighter flex items-center gap-1">
              <Check size={10} className="text-brand-emerald" /> {ing}
            </span>
          ))}
        </div>

        <div className="mt-auto">
          <div className="flex items-end gap-3 mb-5">
            <div className="flex flex-col">
              <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-medium">Retail</span>
              <span className="font-heading font-bold text-xl text-[#F0F0F0] leading-none">${product.retailPrice.toFixed(2)}</span>
            </div>
            <div className="flex flex-col border-l border-brand-border pl-3">
              <span className="text-[10px] text-brand-gold-dim uppercase tracking-wider font-medium">Distribuidor</span>
              <span className="font-heading font-bold text-lg text-brand-gold leading-none">${product.distributorPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <Link 
              to={`/productos/${product.slug}`}
              className="flex items-center justify-center px-4 py-2 rounded-xl border border-brand-emerald text-brand-emerald font-medium text-sm hover:bg-brand-emerald/10 transition-colors w-full"
            >
              Ver detalles
            </Link>
            <a
              href={`https://wa.me/593999999999?text=Hola, estoy interesado en comprar ${product.name}.`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center px-4 py-2 rounded-xl bg-brand-emerald text-white font-medium text-sm hover:bg-brand-emerald-hover transition-colors w-full shadow-lg shadow-brand-emerald/20"
            >
              Consultar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
