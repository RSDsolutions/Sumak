import React from 'react';
import { AlertCircle, CheckCircle2, Flame, Package } from 'lucide-react';

interface StockBadgeProps {
  /** Unidades reales en inventario */
  stock?: number;
  /** Mostrar texto detallado o badge compacto */
  size?: 'sm' | 'md' | 'lg';
  /** Clase CSS adicional */
  className?: string;
}

export default function StockBadge({
  stock,
  size = 'md',
  className = '',
}: StockBadgeProps) {
  // Si no se especifica stock numérico, asumimos stock general normal
  const isCritical = typeof stock === 'number' && stock > 0 && stock <= 5;
  const isLow = typeof stock === 'number' && stock > 5 && stock <= 12;
  const isOutOfStock = typeof stock === 'number' && stock <= 0;

  if (isOutOfStock) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold ${className}`}>
        <Package size={13} className="text-slate-400" />
        <span>Agotado temporalmente</span>
      </div>
    );
  }

  if (isCritical) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs font-bold shadow-2xs animate-in fade-in ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
        </span>
        <Flame size={13} className="text-rose-600 shrink-0" />
        <span>¡Quedan pocas unidades! ({stock} disponibles)</span>
      </div>
    );
  }

  if (isLow) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shadow-2xs ${className}`}>
        <AlertCircle size={13} className="text-amber-600 shrink-0" />
        <span>Stock limitado ({stock} en bodega)</span>
      </div>
    );
  }

  // Stock normal disponible
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/20 text-[11px] font-bold ${className}`}>
      <CheckCircle2 size={12} className="text-[#22C55E] shrink-0" />
      <span>En stock para entrega inmediata</span>
    </div>
  );
}
