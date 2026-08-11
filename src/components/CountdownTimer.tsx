import React, { useState, useEffect } from 'react';
import { Clock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CountdownTimerProps {
  /** Título de la promoción u objetivo de recompra */
  title?: string;
  /** Subtítulo o descripción */
  subtitle?: string;
  /** Fecha objetivo ISO opcional. Si no se pasa, calcula hasta el fin del mes calendario actual */
  targetDate?: string;
  /** Enlace del botón de acción */
  ctaLink?: string;
  /** Texto del botón de acción */
  ctaText?: string;
  /** Variante compacta para cards o banner completo */
  variant?: 'banner' | 'card' | 'inline';
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetIso?: string): TimeRemaining {
  let targetMs: number;
  if (targetIso) {
    targetMs = new Date(targetIso).getTime();
  } else {
    // Fin del mes actual a las 23:59:59
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    targetMs = endOfMonth.getTime();
  }

  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

export default function CountdownTimer({
  title = 'Cierre de Ciclo Mensual & Calificación de Recompra',
  subtitle = 'Aprovecha tus descuentos exclusivos de distribuidor (hasta 50% de margen) y acumula puntos binarios.',
  targetDate,
  ctaLink = '/dashboard/tienda',
  ctaText = 'Comprar con 50% OFF',
  variant = 'banner',
  className = '',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(calculateTimeRemaining(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold ${className}`}>
        <Clock size={14} className="text-amber-700 animate-pulse shrink-0" />
        <span>Quedan: </span>
        <span className="font-mono font-bold text-amber-950">
          {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h:{String(timeLeft.minutes).padStart(2, '0')}m:{String(timeLeft.seconds).padStart(2, '0')}s
        </span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 to-[#FFFEF7] border border-amber-200 shadow-xs ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
            <Clock size={12} className="text-amber-700" /> Tiempo Restante
          </span>
          <span className="text-[10px] text-amber-700 font-medium">Ciclo Activo</span>
        </div>
        <p className="text-xs font-bold text-slate-800 mb-3">{title}</p>

        {/* Counter digits */}
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
          <div className="bg-white p-1.5 rounded-lg border border-amber-200 shadow-2xs">
            <span className="block font-black text-sm text-[#1A4E26]">{timeLeft.days}</span>
            <span className="block text-[9px] text-slate-400 font-sans font-medium uppercase">Días</span>
          </div>
          <div className="bg-white p-1.5 rounded-lg border border-amber-200 shadow-2xs">
            <span className="block font-black text-sm text-[#1A4E26]">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="block text-[9px] text-slate-400 font-sans font-medium uppercase">Horas</span>
          </div>
          <div className="bg-white p-1.5 rounded-lg border border-amber-200 shadow-2xs">
            <span className="block font-black text-sm text-[#1A4E26]">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="block text-[9px] text-slate-400 font-sans font-medium uppercase">Min</span>
          </div>
          <div className="bg-white p-1.5 rounded-lg border border-amber-200 shadow-2xs">
            <span className="block font-black text-sm text-amber-600 animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="block text-[9px] text-slate-400 font-sans font-medium uppercase">Seg</span>
          </div>
        </div>
      </div>
    );
  }

  // Variant === 'banner' (Full Hero Banner)
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#FFFDF2] via-[#FFFAEA] to-[#F7F2DE] p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Glows de fondo */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#D4AF37]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#1A4E26]/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row items-center justify-between gap-5">
        {/* Text Info */}
        <div className="max-w-xl text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37] text-[#0B2913] text-[10px] font-extrabold uppercase tracking-widest shadow-2xs">
              <Sparkles size={12} /> Oportunidad de Recompra
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A4E26]">
              <ShieldCheck size={13} className="text-[#22C55E]" /> 100% Calificado
            </span>
          </div>
          <h3 className="font-heading font-black text-lg sm:text-xl text-[#0B2913] leading-snug">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-[#5C4200] mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Counter digits & CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0 w-full lg:w-auto justify-center">
          {/* Reloj */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs p-2 sm:p-2.5 rounded-2xl border border-amber-200 shadow-sm">
            <div className="text-center px-2 sm:px-3">
              <span className="font-mono font-black text-lg sm:text-xl text-[#1A4E26] block leading-none">
                {timeLeft.days}
              </span>
              <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block mt-1">
                Días
              </span>
            </div>
            <span className="font-bold text-amber-400 text-base mb-3">:</span>
            <div className="text-center px-2 sm:px-3">
              <span className="font-mono font-black text-lg sm:text-xl text-[#1A4E26] block leading-none">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block mt-1">
                Horas
              </span>
            </div>
            <span className="font-bold text-amber-400 text-base mb-3">:</span>
            <div className="text-center px-2 sm:px-3">
              <span className="font-mono font-black text-lg sm:text-xl text-[#1A4E26] block leading-none">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block mt-1">
                Min
              </span>
            </div>
            <span className="font-bold text-amber-400 text-base mb-3">:</span>
            <div className="text-center px-2 sm:px-3">
              <span className="font-mono font-black text-lg sm:text-xl text-rose-600 block leading-none animate-pulse">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block mt-1">
                Seg
              </span>
            </div>
          </div>

          {/* Action button */}
          <Link
            to={ctaLink}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A4E26] hover:bg-[#163F1E] text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-[0_4px_16px_rgba(26,78,38,0.25)] hover:shadow-[0_6px_20px_rgba(26,78,38,0.35)] active:scale-98"
          >
            <span>{ctaText}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
