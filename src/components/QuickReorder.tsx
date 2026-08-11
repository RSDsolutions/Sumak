import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Repeat, 
  ShoppingCart, 
  Sparkles, 
  ArrowRight, 
  Star, 
  Plus, 
  Check,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useProducts, type ProductoExtended } from '../lib/productos';
import { useCart } from '../lib/cart';
import { useToast } from '../lib/toast';
import { planConfig } from '../data';
import StockBadge from './StockBadge';

interface QuickReorderProps {
  /** Título de la sección */
  title?: string;
  /** Subtítulo */
  subtitle?: string;
  /** Límite de productos a mostrar */
  limit?: number;
  className?: string;
}

const DISCOUNT = planConfig.descuentoDistribuidor;

export default function QuickReorder({
  title = 'Tus Favoritos Frecuentes & Recompra Rápida',
  subtitle = 'Reordena en 1 clic tus productos esenciales con 50% de descuento mayorista y acumula puntos binarios.',
  limit = 4,
  className = '',
}: QuickReorderProps) {
  const { products } = useProducts();
  const { items, addItem } = useCart();
  const toast = useToast();

  // Seleccionar productos favoritos / más vendidos para recompra rápida
  const repurchaseProducts = products
    .filter((p) => p.bestseller || p.destacado || p.categoriaKey === 'suplementos')
    .slice(0, limit);

  function precioDistribuidorOf(p: ProductoExtended): number {
    return p.precioDistribuidor ?? parseFloat((p.pvp * DISCOUNT).toFixed(2));
  }

  function handleQuickAdd(p: ProductoExtended) {
    const precio = precioDistribuidorOf(p);
    addItem(
      {
        codigo: p.codigo,
        nombre: p.nombre,
        pvp: p.pvp,
        precio,
        imagen: p.imagen,
      },
      1
    );
    toast.success(`1 × ${p.nombre} añadido al carrito con 50% OFF`);
  }

  function getCartQty(codigo: string): number {
    return items.find((i) => i.codigo === codigo)?.cantidad ?? 0;
  }

  return (
    <div className={`rounded-3xl bg-white border border-[#C8D8CB] p-5 sm:p-7 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#C8D8CB]/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF4ED] text-[#1A4E26] text-[11px] font-extrabold border border-[#1A4E26]/20">
              <Repeat size={13} className="text-[#1A4E26]" /> Recompra Inteligente
            </span>
            <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
              50% Margen de Distribuidor
            </span>
          </div>
          <h2 className="font-heading font-bold text-lg sm:text-xl text-[#111111] flex items-center gap-2">
            {title}
            <Sparkles size={16} className="text-[#D4AF37]" />
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {subtitle}
          </p>
        </div>

        <Link
          to="/dashboard/tienda"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A4E26] hover:text-[#163F1E] hover:underline shrink-0 group self-start sm:self-auto"
        >
          <span>Ver catálogo completo</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Grid de Productos Frecuentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {repurchaseProducts.map((p, index) => {
          const precioDist = precioDistribuidorOf(p);
          const cartQty = getCartQty(p.codigo);
          // Stock dinámico simulado realista para demostración de baja disponibilidad (ej. 4 unidades para el primero)
          const mockStock = index === 0 ? 4 : (index === 1 ? 8 : 25);

          return (
            <div
              key={p.codigo}
              className="flex flex-col justify-between rounded-2xl bg-[#FAFCFA] border border-[#C8D8CB] hover:border-[#1A4E26]/40 p-4 transition-all duration-200 hover:shadow-md group"
            >
              <div>
                {/* Imagen y badges de stock */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white border border-[#C8D8CB]/60 mb-3 flex items-center justify-center p-2">
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className="px-1.5 py-0.5 rounded-md bg-[#1A4E26] text-white text-[9px] font-black uppercase tracking-wider">
                      -50% OFF
                    </span>
                  </div>
                </div>

                {/* Badge de Stock Transparente */}
                <div className="mb-2">
                  <StockBadge stock={mockStock} />
                </div>

                {/* Categoría y Nombre */}
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-[#6B7280]">
                  {p.categoria}
                </p>
                <Link
                  to={`/dashboard/tienda/${p.slug}`}
                  className="font-heading font-bold text-sm text-[#111111] group-hover:text-[#1A4E26] transition-colors line-clamp-2 leading-snug mt-0.5 block"
                >
                  {p.nombre}
                </Link>

                {/* Precios */}
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-heading font-black text-base text-[#1A4E26]">
                    ${precioDist.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#9CA3AF] line-through font-medium">
                    ${p.pvp.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botón de Recompra Rápida en 1 clic */}
              <div className="mt-4 pt-3 border-t border-[#C8D8CB]/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAdd(p)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-98 ${
                    cartQty > 0
                      ? 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/40 hover:bg-[#d9ecdc]'
                      : 'bg-[#1A4E26] text-white hover:bg-[#163F1E]'
                  }`}
                  title={`Añadir 1 unidad de ${p.nombre}`}
                >
                  {cartQty > 0 ? (
                    <>
                      <Check size={14} className="text-[#22C55E]" />
                      <span>{cartQty} en carrito (+1)</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={14} />
                      <span>Volver a comprar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
