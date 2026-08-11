import React from 'react';
import { ViewMode } from './types';
import {
  LayoutGrid,
  Rotate3d,
  Square,
  Printer,
  SlidersHorizontal,
  CreditCard,
  Share2,
  Check
} from 'lucide-react';

interface CardToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showCustomizer: boolean;
  onToggleCustomizer: () => void;
}

export const CardToolbar: React.FC<CardToolbarProps> = ({
  viewMode,
  onViewModeChange,
  showCustomizer,
  onToggleCustomizer,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="no-print bg-white/90 backdrop-blur-md border border-[#C8D8CB] rounded-2xl shadow-lg p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 max-w-5xl mx-auto mb-6">
      {/* Left: View Mode Switches */}
      <div className="flex items-center gap-1.5 bg-[#F4F7F5] p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode === 'split'
              ? 'bg-white text-[#1A4E26] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Ver Frente y Reverso lado a lado"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Frente y Reverso</span>
          <span className="sm:hidden">Doble</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('flip3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode === 'flip3d'
              ? 'bg-white text-[#1A4E26] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Tarjeta Interactiva 3D con giro"
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>Giro 3D</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('frontOnly')}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode === 'frontOnly'
              ? 'bg-white text-[#1A4E26] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Frente</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('backOnly')}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode === 'backOnly'
              ? 'bg-white text-[#1A4E26] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          <span>Reverso</span>
        </button>
      </div>

      {/* Right: Actions (Customize, Print, Share) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleCustomizer}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
            showCustomizer
              ? 'bg-[#1A4E26] text-white border-[#1A4E26] shadow-xs'
              : 'bg-white text-slate-700 border-[#C8D8CB] hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Personalizar</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-[#C8D8CB] hover:bg-slate-50 rounded-xl transition-all shadow-2xs cursor-pointer"
          title="Imprimir o guardar como PDF"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Imprimir / PDF</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="p-2 text-slate-600 bg-white border border-[#C8D8CB] hover:bg-slate-50 rounded-xl transition-all shadow-2xs cursor-pointer"
          title="Copiar enlace"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
