import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Minus, X, Check, AlertCircle, Package, Leaf,
} from 'lucide-react';
import { getPrecioDistribuidor, type Product, type AffiliatePackage } from '../data';
import { useProducts, type ProductoExtended } from '../lib/productos';
import type { PackSelection } from '../lib/cart';

interface PackBuilderProps {
  pack: AffiliatePackage;
  initialSelections?: PackSelection[];
  /**
   * El cupo del pack es por valor en $ a PRECIO DE DISTRIBUIDOR
   * (no PVP). El cap = pack.precio. Cada producto suma su
   * precio_distribuidor (PVP × 50% o el override definido).
   *
   * `isComplete` es true cuando el pack se puede enviar — ya sea
   * porque la suma == cap (exacto), o porque el residuo es menor
   * que el producto mas barato (no hay nada para canjear el resto).
   */
  onSelectionsChange: (selections: PackSelection[], totalValue: number, isComplete: boolean) => void;
}

/** Suma a precio de distribuidor de una seleccion. */
function sumValue(sels: Map<string, number>, productos: ProductoExtended[]): number {
  let s = 0;
  for (const [codigo, qty] of sels.entries()) {
    const p = productos.find((pr) => pr.codigo === codigo);
    if (!p) continue;
    s += getPrecioDistribuidor(p) * qty;
  }
  // Redondeo a 2 decimales para evitar drift de punto flotante.
  return Math.round(s * 100) / 100;
}

/** Tolerancia para considerar dos $ iguales. */
const EPS = 0.005;

/**
 * Margen $ que se permite dejar sin canjear al cerrar el pack. Si el
 * residuo del cupo es menor o igual a este margen (o menor que el
 * producto mas barato, lo que sea mayor), el pack se considera lleno
 * y deja enviarse. Evita que el distribuidor quede trabado por $1-$3
 * que no le interesa canjear.
 */
const RESIDUAL_MARGIN_USD = 3;

export default function PackBuilder({
  pack,
  initialSelections = [],
  onSelectionsChange,
}: PackBuilderProps) {
  const { products } = useProducts();
  const [selections, setSelections] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const s of initialSelections) m.set(s.codigo, s.cantidad);
    return m;
  });
  const [search, setSearch] = useState('');

  const totalValue = useMemo(() => sumValue(selections, products), [selections, products]);
  const totalUnits = useMemo(() => {
    let n = 0;
    for (const q of selections.values()) n += q;
    return n;
  }, [selections]);

  const cap = pack.precio;
  const remaining = Math.round((cap - totalValue) * 100) / 100;
  const isOver = totalValue - cap > EPS;

  // Precio mas barato del catalogo a precio distribuidor (solo informativo
  // para futuros calculos; el threshold real usa el margen).
  const minPrecio = useMemo(() => {
    let min = Infinity;
    for (const p of products) {
      if (p.proximamente) continue;
      const pd = getPrecioDistribuidor(p);
      if (pd > 0 && pd < min) min = pd;
    }
    return min === Infinity ? 0 : min;
  }, [products]);

  // Margen real que tolera el pack: el mayor entre el producto mas barato
  // y el RESIDUAL_MARGIN_USD configurado. Asi nunca quedamos por debajo
  // del producto mas barato (caso original) ni por debajo del margen
  // explicito definido por negocio ($3).
  const allowedResidual = Math.max(minPrecio, RESIDUAL_MARGIN_USD);

  // El pack se considera completo cuando:
  //  • Suma exacta == cap, o
  //  • Cap cubierto al menos parcialmente y el residuo cae dentro del
  //    margen tolerado. El usuario igual paga el precio fijo del pack
  //    asi que dejar el residuo sin canjear es razonable.
  const isExactlyFull = Math.abs(remaining) < EPS;
  const isResidualLocked = totalValue > 0 && remaining > 0 && remaining < allowedResidual - EPS;
  const isComplete = isExactlyFull || isResidualLocked;

  // Productos visibles (excluye proximamente).
  const visibleProducts = useMemo(() => {
    let list = products.filter((p) => !p.proximamente);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const ra = (a.bestseller ? 3 : 0) + (a.destacado ? 2 : 0) + (a.nuevo ? 1 : 0);
      const rb = (b.bestseller ? 3 : 0) + (b.destacado ? 2 : 0) + (b.nuevo ? 1 : 0);
      return rb - ra;
    });
    return list;
  }, [products, search]);

  function notifyChange(next: Map<string, number>) {
    const arr: PackSelection[] = Array.from(next.entries()).map(([codigo, cantidad]) => {
      const p = products.find((pr) => pr.codigo === codigo);
      return { codigo, cantidad, nombre: p?.nombre ?? codigo };
    });
    const total = sumValue(next, products);
    const remainingNow = Math.round((cap - total) * 100) / 100;
    const exactly = Math.abs(remainingNow) < EPS;
    const lockedResidual = total > 0 && remainingNow > 0 && remainingNow < allowedResidual - EPS;
    onSelectionsChange(arr, total, exactly || lockedResidual);
  }

  function updateQty(codigo: string, delta: number) {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(codigo) ?? 0;
      const newQty = current + delta;
      if (newQty <= 0) {
        next.delete(codigo);
      } else {
        const product = products.find((p) => p.codigo === codigo);
        if (!product) return prev;
        // Sumar el nuevo valor total considerando este cambio.
        const otherValue = sumValue(new Map(Array.from(next.entries()).filter(([c]) => c !== codigo)), products);
        const newTotal = otherValue + getPrecioDistribuidor(product) * newQty;
        if (newTotal - cap > EPS) {
          // Excederia el cupo: bloquear.
          return prev;
        }
        next.set(codigo, newQty);
      }
      notifyChange(next);
      return next;
    });
  }

  function clearAll() {
    setSelections(new Map());
    onSelectionsChange([], 0, false);
  }

  /** Llenar automaticamente acercandose al cupo (a precio de distribuidor) sin pasarse. */
  function autoFill() {
    const ordered = [...products]
      .filter((p) => !p.proximamente)
      .sort((a, b) => {
        const ra = (a.bestseller ? 3 : 0) + (a.destacado ? 2 : 0) + (a.nuevo ? 1 : 0);
        const rb = (b.bestseller ? 3 : 0) + (b.destacado ? 2 : 0) + (b.nuevo ? 1 : 0);
        return rb - ra;
      });
    const next = new Map<string, number>();
    let acumulado = 0;
    let iter = 0;
    while (iter < 500) {
      iter++;
      // Buscar el producto mas caro que aun cabe en el cupo restante.
      const cabe = ordered
        .filter((p) => acumulado + getPrecioDistribuidor(p) <= cap + EPS)
        .sort((a, b) => getPrecioDistribuidor(a) - getPrecioDistribuidor(b));
      if (cabe.length === 0) break;
      const next_p = cabe[cabe.length - 1];
      next.set(next_p.codigo, (next.get(next_p.codigo) ?? 0) + 1);
      acumulado = Math.round((acumulado + getPrecioDistribuidor(next_p)) * 100) / 100;
      if (Math.abs(cap - acumulado) < EPS) break;
    }
    setSelections(next);
    notifyChange(next);
  }

  return (
    <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
      {/* Header con progreso */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#EBF4ED] to-white border-b border-[#C8D8CB]">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-[#1A4E26]" />
            <h3 className="font-heading font-bold text-[#111111] text-base">
              Arma tu {pack.nombre}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autoFill}
              className="text-[10px] font-bold uppercase tracking-wider text-[#1A4E26] hover:text-[#0F2E18] bg-[#EBF4ED] hover:bg-[#D7E8DA] px-2.5 py-1.5 rounded-md transition-colors"
            >
              Llenar automáticamente
            </button>
            {totalUnits > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] hover:text-[#374151] transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Barra de progreso en $ */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 bg-white rounded-full overflow-hidden border border-[#C8D8CB]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totalValue / cap) * 100)}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full ${
                  isOver ? 'bg-red-500' : isComplete ? 'bg-[#D4AF37]' : 'bg-[#1A4E26]'
                }`}
              />
            </div>
          </div>
          <div className={`text-sm font-bold whitespace-nowrap ${
            isOver ? 'text-red-600' : isComplete ? 'text-[#D4AF37]' : 'text-[#1A4E26]'
          }`}>
            ${totalValue.toFixed(2)} / ${cap.toFixed(2)}
          </div>
        </div>

        {!isComplete && !isOver && (
          <p className="text-[#6B7280] text-xs mt-2">
            Te falta llenar <strong className="text-[#1A4E26]">${remaining.toFixed(2)}</strong> de tu cupo para completar el pack.
            <span className="text-[#9CA3AF]"> · {totalUnits} producto{totalUnits !== 1 ? 's' : ''} hasta ahora</span>
          </p>
        )}
        {isExactlyFull && (
          <p className="text-[#D4AF37] text-xs mt-2 font-bold flex items-center gap-1.5">
            <Check size={13} /> ¡Cupo completo con {totalUnits} producto{totalUnits !== 1 ? 's' : ''}! Listo para agregar al carrito.
          </p>
        )}
        {isResidualLocked && (
          <p className="text-[#D4AF37] text-xs mt-2 font-bold flex items-center gap-1.5">
            <Check size={13} /> Cupo lleno con {totalUnits} producto{totalUnits !== 1 ? 's' : ''}. Te queda ${remaining.toFixed(2)} de margen sin canjear (dentro del margen permitido). Podes enviar el pack así.
          </p>
        )}
        {isOver && (
          <p className="text-red-600 text-xs mt-2 font-bold flex items-center gap-1.5">
            <AlertCircle size={13} /> Has superado el cupo de ${cap.toFixed(2)}.
          </p>
        )}
      </div>

      {/* Resumen de selección actual */}
      {selections.size > 0 && (
        <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#FAFBFA]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">
            Tu selección ({selections.size} producto{selections.size !== 1 ? 's' : ''} distinto{selections.size !== 1 ? 's' : ''} · {totalUnits} unidad{totalUnits !== 1 ? 'es' : ''})
          </p>
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence>
              {Array.from(selections.entries()).map(([codigo, qty]) => {
                const p = products.find((pr) => pr.codigo === codigo);
                if (!p) return null;
                return (
                  <motion.span
                    key={codigo}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 bg-[#1A4E26] text-white text-[11px] font-semibold rounded-full pl-2.5 pr-1 py-0.5"
                  >
                    <span className="bg-white/20 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{qty}</span>
                    <span className="max-w-[140px] truncate">{p.nombre}</span>
                    <span className="text-white/70 text-[9px] font-mono">${(getPrecioDistribuidor(p) * qty).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(codigo, -qty)}
                      className="w-4 h-4 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                      aria-label={`Quitar ${p.nombre}`}
                    >
                      <X size={9} />
                    </button>
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="px-5 py-3 border-b border-[#C8D8CB]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-[#F4F7F5] border border-[#C8D8CB] rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Grid de productos */}
      <div className="p-3 max-h-[480px] overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {visibleProducts.map((p) => {
            const remainingBudget = cap - totalValue;
            const precioD = getPrecioDistribuidor(p);
            const canAddOne = !isOver && precioD <= remainingBudget + EPS;
            return (
              <PackProductCard
                key={p.codigo}
                product={p}
                precioDistribuidor={precioD}
                qty={selections.get(p.codigo) ?? 0}
                canAdd={canAddOne}
                onQtyChange={(delta) => updateQty(p.codigo, delta)}
              />
            );
          })}
        </div>
        {visibleProducts.length === 0 && (
          <div className="text-center py-10 text-[#9CA3AF]">
            <Leaf size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Sin resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PackProductCard({
  product,
  precioDistribuidor,
  qty,
  canAdd,
  onQtyChange,
}: {
  product: Product;
  precioDistribuidor: number;
  qty: number;
  canAdd: boolean;
  onQtyChange: (delta: number) => void;
}) {
  const selected = qty > 0;
  return (
    <div
      className={`relative rounded-xl overflow-hidden border transition-all ${
        selected
          ? 'border-[#1A4E26] bg-[#EBF4ED] shadow-[0_4px_12px_rgba(26,78,38,0.12)]'
          : 'border-[#C8D8CB] bg-white hover:border-[#A8C2AD]'
      }`}
    >
      <div
        className="relative h-24 sm:h-28 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}
      >
        {product.imagen ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Leaf size={28} className="text-[#1A4E26] opacity-30" />
          </div>
        )}
        {product.bestseller && (
          <span className="absolute top-1.5 left-1.5 bg-[#D4AF37] text-[#0B2913] text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
            Top
          </span>
        )}
        {selected && (
          <div className="absolute top-1.5 right-1.5 bg-[#1A4E26] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {qty}
          </div>
        )}
      </div>

      <div className="p-2">
        <p className="font-bold text-[#111111] text-[11px] leading-tight line-clamp-2 mb-1 min-h-[28px]">
          {product.nombre}
        </p>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] text-[#6B7280] truncate">{product.categoria}</p>
          <p className="text-[10px] text-[#1A4E26] font-bold font-mono">${precioDistribuidor.toFixed(2)}</p>
        </div>

        {selected ? (
          <div className="flex items-center justify-between bg-[#1A4E26] rounded-md p-0.5">
            <button
              type="button"
              onClick={() => onQtyChange(-1)}
              className="w-6 h-6 rounded text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Quitar uno"
            >
              <Minus size={11} />
            </button>
            <span className="text-white font-bold text-[11px] w-4 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => onQtyChange(1)}
              disabled={!canAdd}
              className="w-6 h-6 rounded text-white flex items-center justify-center hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Agregar uno"
            >
              <Plus size={11} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onQtyChange(1)}
            disabled={!canAdd}
            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white border border-[#1A4E26]/30 text-[#1A4E26] text-[10px] font-bold hover:bg-[#1A4E26] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#1A4E26] transition-all"
          >
            <Plus size={11} /> {canAdd ? 'Agregar' : 'No cabe'}
          </button>
        )}
      </div>
    </div>
  );
}
