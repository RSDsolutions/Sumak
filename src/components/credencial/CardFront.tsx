import React from 'react';
import { DistributorData } from './types';
import { SumakLogo } from './SumakLogo';

interface CardFrontProps {
  data: DistributorData;
  className?: string;
  showWatermark?: boolean;
}

export const CardFront: React.FC<CardFrontProps> = ({
  data,
  className = '',
  showWatermark = true,
}) => {
  // Determine badge styles based on status
  const getStatusBadge = () => {
    switch (data.status) {
      case 'ACTIVO':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-[#1A4E26]',
          dot: 'bg-emerald-500 animate-pulse',
          label: 'ESTADO: ACTIVO',
        };
      case 'INACTIVO':
        return {
          bg: 'bg-slate-100 border-slate-300 text-slate-700',
          dot: 'bg-slate-400',
          label: 'ESTADO: INACTIVO',
        };
      case 'PENDIENTE':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-800',
          dot: 'bg-amber-500',
          label: 'ESTADO: PENDIENTE',
        };
      case 'SUSPENDIDO':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-800',
          dot: 'bg-rose-500',
          label: 'ESTADO: SUSPENDIDO',
        };
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-[#1A4E26]',
          dot: 'bg-emerald-500',
          label: `ESTADO: ${data.status}`,
        };
    }
  };

  const statusStyle = getStatusBadge();

  return (
    <div
      className={`relative w-[340px] sm:w-[380px] h-[540px] sm:h-[590px] bg-white rounded-[24px] shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between select-none card-container ${className}`}
      style={{
        boxShadow: '0 20px 40px -15px rgba(26, 78, 38, 0.18), 0 0 0 1px rgba(0,0,0,0.05)',
      }}
    >
      {/* Background Watermark Pattern */}
      {showWatermark && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden flex items-center justify-center">
          <div className="w-[400px] h-[400px] rounded-full border-[30px] border-[#1A4E26] flex items-center justify-center rotate-12">
            <div className="w-[260px] h-[260px] rounded-full border-[15px] border-[#1A4E26]" />
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="relative bg-[#1A4E26] text-white pt-5 pb-4 px-4 flex flex-col items-center text-center rounded-t-[23px]">
        {/* SUMAK Logo */}
        <SumakLogo variant="header" size={48} />

        {/* Tagline under logo */}
        <p className="text-[10px] sm:text-[11px] font-bold text-[#D4AF37] tracking-widest uppercase mt-2 font-heading drop-shadow-xs">
          CREDENCIAL OFICIAL DE DISTRIBUIDOR
        </p>

        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B]" />
      </div>

      {/* BODY CONTENT SECTION */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 z-10">
        {/* CIRCULAR AVATAR / INITIALS */}
        <div className="relative my-2">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-[6px] border-[#D4AF37] bg-[#1A4E26] shadow-lg flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
            {data.avatarImage ? (
              <img
                src={data.avatarImage}
                alt={data.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-4xl sm:text-5xl font-black tracking-wider font-heading">
                {data.avatarInitials || 'SK'}
              </span>
            )}
          </div>
          {/* Subtle ring accent */}
          <div className="absolute -inset-1 rounded-full border border-[#D4AF37]/40 pointer-events-none" />
        </div>

        {/* DISTRIBUTOR FULL NAME */}
        <h2 className="text-slate-900 font-extrabold text-base sm:text-lg tracking-wide text-center mt-3 uppercase leading-snug max-w-[280px] font-heading">
          {data.fullName}
        </h2>

        {/* OFFICIAL CODE BOX */}
        <div className="bg-[#EBF4ED] border border-[#C8D8CB] rounded-2xl px-6 py-2 text-center my-3 w-full max-w-[260px] shadow-2xs">
          <span className="text-[9px] text-[#4A7C59] tracking-widest font-bold uppercase block mb-0.5">
            CÓDIGO OFICIAL
          </span>
          <span className="text-sm sm:text-base font-extrabold text-[#1A4E26] tracking-widest font-mono">
            {data.officialCode}
          </span>
        </div>

        {/* CATEGORY / RANGO */}
        <div className="text-center my-1">
          <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase block">
            RANGO / CATEGORÍA
          </span>
          <p className="text-xs sm:text-sm font-black text-[#D4AF37] tracking-wider uppercase mt-0.5 font-heading">
            {data.category}
          </p>
        </div>

        {/* STATUS BADGE */}
        <div className="mt-3">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-extrabold tracking-wider ${statusStyle.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
            <span>{statusStyle.label}</span>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION */}
      <div className="pb-4 pt-1 text-center border-t border-slate-100 bg-slate-50/50 rounded-b-[23px]">
        <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">
          {data.validityArea || 'VÁLIDO EN TODO EL TERRITORIO NACIONAL'}
        </p>
      </div>
    </div>
  );
};
