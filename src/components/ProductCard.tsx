import { Product } from '../data';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const distributorPrice = product.pvp / 2;

  return (
    <div className="group flex flex-col bg-[#1A1A1A] rounded-2xl border border-[#2E2E2E] hover:border-[#00A86B]/40 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,168,107,0.1)] overflow-hidden">
      {/* Image Area */}
      <div className="h-44 w-full bg-gradient-to-br from-[#1A2A20] to-[#0F1A14] border-b border-[#2E2E2E] flex items-center justify-center overflow-hidden">
        {product.imagen ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300 drop-shadow-lg"
          />
        ) : (
          <Leaf size={40} className="text-[#00A86B] opacity-50" />
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-[#00A86B] bg-[#00A86B]/10 border border-[#00A86B]/20 px-2.5 py-1 rounded-full mb-3 w-fit">
          {product.categoria}
        </span>
        <h3 className="font-heading font-semibold text-base text-[#F0F0F0] mb-2 leading-tight">
          {product.nombre}
        </h3>
        <p className="text-[#888888] text-xs leading-relaxed mb-4 flex-grow">
          {product.descripcion}
        </p>

        <div className="mt-auto border-t border-[#2E2E2E] pt-4">
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="text-[10px] text-[#555555] block mb-0.5">PVP</span>
              <span className="font-heading font-bold text-xl text-[#F0F0F0]">${product.pvp.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#555555] block mb-0.5">Distribuidor</span>
              <span className="font-heading font-bold text-lg text-[#00A86B]">${distributorPrice.toFixed(2)}</span>
            </div>
          </div>

          <Link
            to={`/productos/${product.slug}`}
            className="w-full py-2.5 rounded-xl border border-[#00A86B]/40 text-[#00A86B] text-xs font-semibold text-center hover:bg-[#00A86B] hover:text-white transition-all duration-200 block"
          >
            Ver detalles
          </Link>
        </div>
      </div>
    </div>
  );
}
