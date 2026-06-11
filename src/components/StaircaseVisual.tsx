import { motion } from 'motion/react';
import {
  Crown, Gem, Trophy, Star, Lock, CheckCircle2, Users,
} from 'lucide-react';

export interface StaircaseRank {
  rango: string;
  requirement: string;
  reward: string;
  extra?: { icon: React.ReactNode; label: string };
  prizeIcon?: React.ReactNode;
}

export interface StaircaseUser {
  id: string;
  nombre: string;
  codigo: string;
}

export interface StaircaseProps {
  ranks: StaircaseRank[];
  currentIndex?: number;
  usersByRank?: Map<number, StaircaseUser[]>;
  onStepClick?: (idx: number) => void;
  expandedStep?: number | null;
  variant?: 'light' | 'dark';
  tier: 1 | 2;
}

function StepIcon({
  isCurrent,
  isAchieved,
  tier,
  rangoName,
}: {
  isCurrent: boolean;
  isAchieved: boolean;
  tier: 1 | 2;
  rangoName: string;
}) {
  const isFounder = rangoName.includes('Fundador');
  const isDiamond = rangoName.includes('Diamante');

  if (isCurrent) return <Star size={14} fill="currentColor" />;
  if (!isAchieved) return <Lock size={12} />;
  if (tier === 2 && isFounder) return <Crown size={14} />;
  if (tier === 2 && isDiamond) return <Gem size={13} />;
  if (tier === 2) return <Trophy size={13} />;
  return <CheckCircle2 size={13} />;
}

function getStepTone(i: number, total: number, tier: 1 | 2, rangoName: string) {
  // Tono se intensifica de bronce → verde → oro → platino conforme subimos
  if (tier === 1) {
    const ratio = i / Math.max(1, total - 1);
    if (ratio >= 0.7) {
      return {
        body: 'linear-gradient(to bottom, #E8C94A 0%, #D4AF37 55%, #92680A 100%)',
        tread: 'linear-gradient(to right, #FFE89C, #D4AF37, #92680A)',
        text: 'text-[#5C4200]',
        ring: 'ring-[#D4AF37]/40',
      };
    }
    if (ratio >= 0.3) {
      return {
        body: 'linear-gradient(to bottom, #2B6E3A 0%, #1A4E26 55%, #0F2D16 100%)',
        tread: 'linear-gradient(to right, #4F9461, #1A4E26, #0F2D16)',
        text: 'text-white',
        ring: 'ring-[#1A4E26]/40',
      };
    }
    return {
      body: 'linear-gradient(to bottom, #9CA3AF 0%, #6B7280 55%, #374151 100%)',
      tread: 'linear-gradient(to right, #D1D5DB, #6B7280, #374151)',
      text: 'text-white',
      ring: 'ring-gray-400/40',
    };
  }

  // Tier 2
  if (rangoName.includes('Fundador')) {
    return {
      body: 'linear-gradient(to bottom, #FFE066 0%, #D4AF37 50%, #6B3A00 100%)',
      tread: 'linear-gradient(to right, #FFF4B8, #FFE066, #D4AF37)',
      text: 'text-[#3D2400]',
      ring: 'ring-[#FFE066]/50',
    };
  }
  if (rangoName.includes('Diamante')) {
    return {
      body: 'linear-gradient(to bottom, #E8C94A 0%, #D4AF37 55%, #92680A 100%)',
      tread: 'linear-gradient(to right, #FFE89C, #D4AF37, #92680A)',
      text: 'text-[#3D2400]',
      ring: 'ring-[#D4AF37]/40',
    };
  }
  return {
    body: 'linear-gradient(to bottom, #2B6E3A 0%, #1A4E26 55%, #0F2D16 100%)',
    tread: 'linear-gradient(to right, #4F9461, #1A4E26, #0F2D16)',
    text: 'text-white',
    ring: 'ring-[#1A4E26]/40',
  };
}

export default function StaircaseVisual({
  ranks,
  currentIndex = -1,
  usersByRank,
  onStepClick,
  expandedStep = null,
  variant = 'light',
  tier,
}: StaircaseProps) {
  const total = ranks.length;
  // Altura mínima y máxima del bloque de escalón
  const baseHeight = 70;
  const heightStep = 28;

  return (
    <div className="w-full">
      {/* ───── DESKTOP: escalera horizontal ───── */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Etiqueta arriba: subiendo de rango */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${variant === 'dark' ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
              ↓ Inicio
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${variant === 'dark' ? 'text-[#D4AF37]' : 'text-[#D4AF37]'}`}>
              Rango máximo ↑
            </span>
          </div>

          <div className="flex items-end gap-0 overflow-x-auto pb-4">
            {ranks.map((rank, i) => {
              const isCurrent = i === currentIndex;
              const isAchieved = currentIndex >= 0 && i <= currentIndex;
              const isNext = i === currentIndex + 1;
              const height = baseHeight + i * heightStep;
              const tone = getStepTone(i, total, tier, rank.rango);
              const users = usersByRank?.get(i) ?? [];
              const clickable = !!onStepClick;
              const isExpanded = expandedStep === i;

              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => clickable && onStepClick?.(i)}
                  disabled={!clickable}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className={`flex-1 min-w-[100px] flex flex-col items-stretch text-left ${
                    clickable ? 'cursor-pointer group' : ''
                  } ${isExpanded ? 'z-10' : ''}`}
                >
                  {/* Info encima del escalón */}
                  <div className="mb-2 px-1 text-center min-h-[70px] flex flex-col justify-end">
                    {usersByRank && users.length > 0 && (
                      <span className={`inline-flex items-center justify-center gap-1 self-center mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isAchieved
                          ? 'bg-[#1A4E26] text-white'
                          : 'bg-[#D4AF37] text-[#3D2400]'
                      }`}>
                        <Users size={9} /> {users.length}
                      </span>
                    )}
                    <p className={`text-[10px] font-bold leading-tight ${variant === 'dark' ? 'text-white/85' : 'text-[#111111]'}`}>
                      {rank.rango}
                    </p>
                    <p className={`text-[10px] font-bold leading-tight mt-0.5 ${variant === 'dark' ? 'text-[#D4AF37]' : 'text-[#1A4E26]'}`}>
                      {rank.reward}
                    </p>
                    {rank.extra && (
                      <p className={`text-[9px] mt-0.5 inline-flex items-center justify-center gap-0.5 ${variant === 'dark' ? 'text-[#D4AF37]/90' : 'text-[#92680A]'}`}>
                        {rank.extra.icon} {rank.extra.label}
                      </p>
                    )}
                  </div>

                  {/* Escalón propiamente */}
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
                    className={`relative w-full mr-[-1px] overflow-hidden border-r border-black/10 ${
                      isCurrent ? `ring-2 ${tone.ring} ring-offset-1` : ''
                    } ${clickable ? 'group-hover:brightness-110 transition-all' : ''}`}
                    style={{ background: tone.body }}
                  >
                    {/* Huella (tread) — el "tope" plano del escalón */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[6px] shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                      style={{ background: tone.tread }}
                    />
                    {/* Pequeña sombra de profundidad */}
                    <div className="absolute right-0 top-[6px] bottom-0 w-[3px] bg-black/20" />

                    {/* Marcador central */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 pt-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isCurrent
                          ? 'bg-white text-[#D4AF37] ring-2 ring-white animate-pulse'
                          : isAchieved
                          ? 'bg-white/95 ' + tone.text
                          : 'bg-black/30 text-white/60'
                      }`}>
                        <StepIcon isCurrent={isCurrent} isAchieved={isAchieved} tier={tier} rangoName={rank.rango} />
                      </div>
                      <span className={`text-[10px] font-black ${tone.text}`}>
                        #{i + 1}
                      </span>
                    </div>

                    {/* "Aquí estás" o "Próximo" — etiqueta inferior del escalón */}
                    {isCurrent && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[#D4AF37] text-[8px] font-bold text-center py-1 uppercase tracking-wider">
                        Aquí estás
                      </div>
                    )}
                    {isNext && !isCurrent && (
                      <div className="absolute bottom-0 inset-x-0 bg-white/85 text-[#1A4E26] text-[8px] font-bold text-center py-1 uppercase tracking-wider">
                        Próximo
                      </div>
                    )}
                  </motion.div>

                  {/* Requisito debajo */}
                  <p className={`text-[9px] text-center mt-2 leading-tight ${variant === 'dark' ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
                    {rank.requirement}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Línea del piso */}
          <div className="h-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)]" style={{
            background: variant === 'dark'
              ? 'linear-gradient(to right, #555, #1A4E26, #D4AF37, #FFE066)'
              : 'linear-gradient(to right, #6B7280, #1A4E26, #D4AF37)',
          }} />
        </div>
      </div>

      {/* ───── MOBILE: escalera vertical (de abajo hacia arriba) ───── */}
      <div className="lg:hidden">
        <div className="relative pl-2">
          {/* Línea vertical decorativa */}
          <div
            className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
            style={{
              background: variant === 'dark'
                ? 'linear-gradient(to bottom, #FFE066, #D4AF37, #1A4E26, #555)'
                : 'linear-gradient(to bottom, #D4AF37, #1A4E26, #6B7280)',
            }}
          />
          <div className="flex flex-col gap-3">
            {[...ranks].reverse().map((rank, revIdx) => {
              const i = total - 1 - revIdx;
              const isCurrent = i === currentIndex;
              const isAchieved = currentIndex >= 0 && i <= currentIndex;
              const isNext = i === currentIndex + 1;
              const tone = getStepTone(i, total, tier, rank.rango);
              const users = usersByRank?.get(i) ?? [];
              const clickable = !!onStepClick;
              const isExpanded = expandedStep === i;
              // Cada escalón se "indenta" más para los rangos altos (efecto escalera)
              const indent = Math.round((i / Math.max(1, total - 1)) * 28);

              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => clickable && onStepClick?.(i)}
                  disabled={!clickable}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: revIdx * 0.04 }}
                  style={{ marginLeft: `${indent}px` }}
                  className={`relative flex items-stretch text-left rounded-xl overflow-hidden shadow-md ${
                    isCurrent ? `ring-2 ${tone.ring}` : ''
                  } ${clickable ? 'active:scale-[0.98] transition-transform' : ''} ${isExpanded ? 'z-10' : ''}`}
                >
                  {/* Lado izquierdo: bloque grueso (el escalón) */}
                  <div
                    className="relative w-20 shrink-0 flex flex-col items-center justify-center gap-1 py-3"
                    style={{ background: tone.body }}
                  >
                    {/* Huella en el tope */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[5px] shadow-[0_2px_3px_rgba(0,0,0,0.3)]"
                      style={{ background: tone.tread }}
                    />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCurrent
                        ? 'bg-white text-[#D4AF37] ring-2 ring-white'
                        : isAchieved
                        ? 'bg-white/95 ' + tone.text
                        : 'bg-black/30 text-white/60'
                    }`}>
                      <StepIcon isCurrent={isCurrent} isAchieved={isAchieved} tier={tier} rangoName={rank.rango} />
                    </div>
                    <span className={`text-[10px] font-black ${tone.text}`}>
                      #{i + 1}
                    </span>
                  </div>

                  {/* Lado derecho: info */}
                  <div className={`flex-1 p-3 ${
                    variant === 'dark'
                      ? isAchieved ? 'bg-white/10 backdrop-blur-sm' : 'bg-black/20'
                      : isCurrent
                      ? 'bg-gradient-to-r from-[#FFFDF0] to-[#FFFCEB]'
                      : isAchieved
                      ? 'bg-white'
                      : 'bg-[#FAFBFA]'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-bold text-sm leading-tight ${
                            variant === 'dark'
                              ? isAchieved ? 'text-white' : 'text-white/55'
                              : isAchieved ? 'text-[#111111]' : 'text-[#6B7280]'
                          }`}>
                            {rank.rango}
                          </p>
                          {isCurrent && (
                            <span className="bg-[#D4AF37] text-[#0B2913] text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                              Aquí
                            </span>
                          )}
                          {isNext && !isCurrent && (
                            <span className="bg-[#1A4E26] text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                              Próximo
                            </span>
                          )}
                          {usersByRank && users.length > 0 && (
                            <span className="bg-[#1A4E26] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5">
                              <Users size={8} /> {users.length}
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] mt-0.5 ${variant === 'dark' ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
                          {rank.requirement}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm leading-tight ${
                          isCurrent
                            ? 'text-[#D4AF37]'
                            : isAchieved
                            ? variant === 'dark' ? 'text-[#D4AF37]' : 'text-[#1A4E26]'
                            : variant === 'dark' ? 'text-white/40' : 'text-[#9CA3AF]'
                        }`}>
                          {rank.reward}
                        </p>
                        {rank.extra && (
                          <p className={`text-[9px] mt-0.5 inline-flex items-center gap-0.5 ${
                            isAchieved ? 'text-[#92680A]' : variant === 'dark' ? 'text-white/40' : 'text-[#9CA3AF]'
                          }`}>
                            {rank.extra.icon} {rank.extra.label}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
