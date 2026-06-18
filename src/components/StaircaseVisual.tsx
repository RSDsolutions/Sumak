import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Crown, Gem, Trophy, Star, Lock, CheckCircle2, Users,
  Plane, Globe, MapPin, ChefHat, Snowflake, Tv, Laptop, Bike, Car, Home,
} from 'lucide-react';

export interface StaircaseRank {
  rango: string;
  requirement: string;
  reward: string;
  /**
   * Premio físico. Solo necesitas el `label` — el componente deriva la
   * imagen (en `/escalera/premios/<slug>.png`) y el icono fallback
   * automáticamente. Pasa `image` u `icon` solo si querés overridear.
   */
  extra?: {
    label: string;
    /** Override opcional de la ruta de imagen. */
    image?: string;
    /** Override opcional del icono fallback. */
    icon?: React.ReactNode;
  };
  prizeIcon?: React.ReactNode;
}

/**
 * Mapeo automático de label de premio → ruta de imagen + icono fallback.
 * Las imágenes viven en /public/img/premios/ (subidas por el equipo).
 * Si no existe imagen para un label (ej. "Viaje Local"), cae al icono
 * temático correspondiente.
 *
 * Inventario actual de imágenes:
 *   carro.png · casa.jfif · cocina.avif · laptop.png · moto.png ·
 *   nevera.png · proyector.png · viaje-internacional.jpg
 */
function autoResolvePrize(label: string): { image?: string; icon: React.ReactNode } {
  const t = label.toLowerCase();
  // Los 3 niveles de viaje (local/nacional/internacional) usan la misma
  // imagen mientras no haya activos especificos. El icono fallback varia
  // para reflejar la escala del viaje.
  if (t.includes('internacional')) return { image: '/img/premios/viaje-internacional.jpg', icon: <Globe size={22} /> };
  if (t.includes('viaje nacional') || (t.includes('viaje') && t.includes('nacional'))) return { image: '/img/premios/viaje-internacional.jpg', icon: <Plane size={22} /> };
  if (t.includes('viaje local') || (t.includes('viaje') && t.includes('local'))) return { image: '/img/premios/viaje-local.jfif', icon: <MapPin size={22} /> };
  if (t.includes('viaje')) return { image: '/img/premios/viaje-internacional.jpg', icon: <Globe size={22} /> };
  if (t.includes('cocina')) return { image: '/img/premios/cocina.png', icon: <ChefHat size={22} /> };
  if (t.includes('nevera') || t.includes('refrigerador')) return { image: '/img/premios/nevera.png', icon: <Snowflake size={22} /> };
  if (t.includes('proyector') || t.includes('television') || t.includes('tv ')) return { image: '/img/premios/proyector.png', icon: <Tv size={22} /> };
  if (t.includes('laptop') || t.includes('computador')) return { image: '/img/premios/laptop.png', icon: <Laptop size={22} /> };
  if (t.includes('moto')) return { image: '/img/premios/moto.png', icon: <Bike size={22} /> };
  if (t.includes('carro') || t.includes('auto')) return { image: '/img/premios/carro.png', icon: <Car size={22} /> };
  if (t.includes('casa')) return { image: '/img/premios/casa.jfif', icon: <Home size={22} /> };
  return { icon: <Trophy size={22} /> };
}

/**
 * Renderiza la imagen del premio si el src carga. Si falla (404),
 * cae al icono fallback. Esto permite que la pagina funcione antes
 * de que el equipo suba las imagenes reales a /public/escalera/premios/.
 */
function PrizeVisual({
  image,
  fallbackIcon,
  variant,
  className = 'w-12 h-12',
}: {
  image?: string;
  fallbackIcon: React.ReactNode;
  variant: 'light' | 'dark';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Fallback al icono: mantenemos un contenedor tenue dorado.
  if (!image || failed) {
    return (
      <div className={`${className} flex items-center justify-center rounded-lg ${
        variant === 'dark' ? 'bg-[#FFE066]/15 text-[#FFE066]' : 'bg-[#FFF8DC] text-[#92680A]'
      }`}>
        {fallbackIcon}
      </div>
    );
  }
  // Imagen: sin marco, sin fondo. object-contain para que la transparencia
  // de los PNG (carro/laptop/moto/proyector/nevera) y los aspect ratios
  // variados se rendericen naturales sobre el fondo del contenedor padre.
  return (
    <img
      src={image}
      alt="Premio"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]`}
    />
  );
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

// Paletas por rango — cada uno tiene su identidad visual distintiva.
// Las pinto en orden ascendente: gris → bronce → cobre → verde → turquesa
// → zafiro → esmeralda → ámbar → rubí → oro (tier1) y oro → diamante
// → platino para tier2.
const TIER1_PALETTES = [
  // Socio - Plata mate
  { body: 'linear-gradient(to bottom, #C0C0C0 0%, #8E8E8E 55%, #555555 100%)', tread: 'linear-gradient(to right, #E8E8E8, #A0A0A0, #555555)', text: 'text-white', ring: 'ring-gray-400/50', label: 'text-gray-300' },
  // Básico - Bronce
  { body: 'linear-gradient(to bottom, #CD7F32 0%, #A0522D 55%, #6B3410 100%)', tread: 'linear-gradient(to right, #E89855, #CD7F32, #6B3410)', text: 'text-white', ring: 'ring-[#CD7F32]/50', label: 'text-[#E89855]' },
  // Emprendedor - Cobre
  { body: 'linear-gradient(to bottom, #DA8A47 0%, #B86B2C 55%, #7A4015 100%)', tread: 'linear-gradient(to right, #FFA76C, #DA8A47, #7A4015)', text: 'text-white', ring: 'ring-[#DA8A47]/50', label: 'text-[#FFA76C]' },
  // Distribuidor Activo - Verde lima
  { body: 'linear-gradient(to bottom, #84CC16 0%, #4D7C0F 55%, #1A2E05 100%)', tread: 'linear-gradient(to right, #BEF264, #65A30D, #1A2E05)', text: 'text-white', ring: 'ring-[#84CC16]/50', label: 'text-[#BEF264]' },
  // Líder - Verde Sumak
  { body: 'linear-gradient(to bottom, #2B6E3A 0%, #1A4E26 55%, #0F2D16 100%)', tread: 'linear-gradient(to right, #4F9461, #1A4E26, #0F2D16)', text: 'text-white', ring: 'ring-[#1A4E26]/50', label: 'text-[#4F9461]' },
  // Ejecutivo Activo - Turquesa
  { body: 'linear-gradient(to bottom, #14B8A6 0%, #0F766E 55%, #042F2E 100%)', tread: 'linear-gradient(to right, #5EEAD4, #0D9488, #042F2E)', text: 'text-white', ring: 'ring-[#14B8A6]/50', label: 'text-[#5EEAD4]' },
  // Líder (nivel 2) - Zafiro
  { body: 'linear-gradient(to bottom, #3B82F6 0%, #1D4ED8 55%, #0C1F4F 100%)', tread: 'linear-gradient(to right, #93C5FD, #2563EB, #0C1F4F)', text: 'text-white', ring: 'ring-[#3B82F6]/50', label: 'text-[#93C5FD]' },
  // Líder Activo - Púrpura
  { body: 'linear-gradient(to bottom, #A855F7 0%, #7E22CE 55%, #2E0E48 100%)', tread: 'linear-gradient(to right, #D8B4FE, #9333EA, #2E0E48)', text: 'text-white', ring: 'ring-[#A855F7]/50', label: 'text-[#D8B4FE]' },
  // Gerente - Rubí
  { body: 'linear-gradient(to bottom, #EF4444 0%, #B91C1C 55%, #4B0808 100%)', tread: 'linear-gradient(to right, #FCA5A5, #DC2626, #4B0808)', text: 'text-white', ring: 'ring-[#EF4444]/50', label: 'text-[#FCA5A5]' },
  // Gerente (nivel 2) - Oro
  { body: 'linear-gradient(to bottom, #FFE066 0%, #D4AF37 55%, #6B3A00 100%)', tread: 'linear-gradient(to right, #FFF4B8, #FFE066, #6B3A00)', text: 'text-[#3D2400]', ring: 'ring-[#FFE066]/60', label: 'text-[#FFE066]' },
];

const TIER2_PALETTES = [
  // Gerente (5 niveles → 8 niveles) - degradado verde-oro
  { body: 'linear-gradient(to bottom, #65A30D 0%, #3F6212 55%, #1A2E05 100%)', tread: 'linear-gradient(to right, #BEF264, #65A30D, #1A2E05)', text: 'text-white', ring: 'ring-[#65A30D]/50', label: 'text-[#BEF264]' },
  { body: 'linear-gradient(to bottom, #2B6E3A 0%, #1A4E26 55%, #0F2D16 100%)', tread: 'linear-gradient(to right, #4F9461, #1A4E26, #0F2D16)', text: 'text-white', ring: 'ring-[#1A4E26]/50', label: 'text-[#4F9461]' },
  { body: 'linear-gradient(to bottom, #14B8A6 0%, #0F766E 55%, #042F2E 100%)', tread: 'linear-gradient(to right, #5EEAD4, #0D9488, #042F2E)', text: 'text-white', ring: 'ring-[#14B8A6]/50', label: 'text-[#5EEAD4]' },
  { body: 'linear-gradient(to bottom, #3B82F6 0%, #1D4ED8 55%, #0C1F4F 100%)', tread: 'linear-gradient(to right, #93C5FD, #2563EB, #0C1F4F)', text: 'text-white', ring: 'ring-[#3B82F6]/50', label: 'text-[#93C5FD]' },
  // Diamante - blanco-azul brillante
  { body: 'linear-gradient(to bottom, #E0F2FE 0%, #7DD3FC 55%, #0369A1 100%)', tread: 'linear-gradient(to right, #FFFFFF, #BAE6FD, #0369A1)', text: 'text-[#0C1F4F]', ring: 'ring-[#7DD3FC]/60', label: 'text-[#0369A1]' },
  // Diamante Bronce
  { body: 'linear-gradient(to bottom, #CD7F32 0%, #92400E 55%, #451A03 100%)', tread: 'linear-gradient(to right, #E89855, #B45309, #451A03)', text: 'text-white', ring: 'ring-[#CD7F32]/50', label: 'text-[#E89855]' },
  // Diamante Plata
  { body: 'linear-gradient(to bottom, #E5E7EB 0%, #9CA3AF 55%, #374151 100%)', tread: 'linear-gradient(to right, #FFFFFF, #D1D5DB, #374151)', text: 'text-[#0C1F4F]', ring: 'ring-gray-400/60', label: 'text-gray-200' },
  // Diamante Oro
  { body: 'linear-gradient(to bottom, #FFE066 0%, #D4AF37 55%, #6B3A00 100%)', tread: 'linear-gradient(to right, #FFF4B8, #FFE066, #6B3A00)', text: 'text-[#3D2400]', ring: 'ring-[#FFE066]/60', label: 'text-[#FFE066]' },
  // Fundador Nacional - oro + rojo (Ecuador)
  { body: 'linear-gradient(to bottom, #FFE066 0%, #D4AF37 40%, #E2002A 100%)', tread: 'linear-gradient(to right, #FFF4B8, #FFE066, #E2002A)', text: 'text-white', ring: 'ring-[#FFE066]/70', label: 'text-[#FFE066]' },
  // Fundador Internacional - platino + tricolor
  { body: 'linear-gradient(to bottom, #FFFFFF 0%, #FFE066 40%, #0247FE 70%, #E2002A 100%)', tread: 'linear-gradient(to right, #FFFFFF, #FFE066, #E2002A)', text: 'text-[#0C1F4F]', ring: 'ring-white/70', label: 'text-[#FFE066]' },
];

function getStepTone(i: number, _total: number, tier: 1 | 2, _rangoName: string) {
  const palette = tier === 1
    ? TIER1_PALETTES[Math.min(i, TIER1_PALETTES.length - 1)]
    : TIER2_PALETTES[Math.min(i, TIER2_PALETTES.length - 1)];
  return palette;
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
  // Subimos baseHeight para que el nombre del rango quepa cómodo
  // dentro de la barra del escalón (varios nombres tienen 2+ palabras).
  const baseHeight = 130;
  const heightStep = 24;

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

          <div className="flex items-end gap-0 pb-4 w-full">
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
                  className={`flex-1 basis-0 min-w-0 flex flex-col items-stretch text-left ${
                    clickable ? 'cursor-pointer group' : ''
                  } ${isExpanded ? 'z-10' : ''}`}
                >
                  {/* Info encima del escalón — IMAGEN del premio + reward */}
                  <div className="mb-2 px-0.5 text-center min-h-[110px] flex flex-col justify-end items-center gap-1">
                    {usersByRank && users.length > 0 && (
                      <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isAchieved
                          ? 'bg-[#1A4E26] text-white'
                          : 'bg-[#D4AF37] text-[#3D2400]'
                      }`}>
                        <Users size={10} /> {users.length}
                      </span>
                    )}
                    {/* Imagen del premio físico */}
                    {rank.extra && (() => {
                      const resolved = autoResolvePrize(rank.extra.label);
                      const image = rank.extra.image ?? resolved.image;
                      const icon = rank.extra.icon ?? resolved.icon;
                      return (
                        <div className="flex flex-col items-center gap-0.5">
                          <PrizeVisual
                            image={image}
                            fallbackIcon={icon}
                            variant={variant}
                            className="w-12 h-12"
                          />
                          <p className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${
                            variant === 'dark' ? 'text-[#FFE066]' : 'text-[#92680A]'
                          }`}>
                            {rank.extra.label}
                          </p>
                        </div>
                      );
                    })()}
                    {/* Reward ($ del bono) */}
                    <p className={`text-sm font-black leading-tight ${variant === 'dark' ? 'text-[#D4AF37]' : 'text-[#1A4E26]'}`}>
                      {rank.reward}
                    </p>
                  </div>

                  {/* Escalón propiamente — el NOMBRE DEL RANGO va aqui adentro */}
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

                    {/* Contenido dentro del bar: logo SUMAK + # + NOMBRE DEL RANGO grande + icono */}
                    <div className="absolute inset-0 flex flex-col items-center justify-between gap-1 px-1.5 pt-2 pb-7">
                      {/* Top: chip blanco con logo SUMAK grande + # rango */}
                      <div className="flex items-center gap-1 bg-white/95 rounded-lg px-1.5 py-1 shadow-md">
                        <img
                          src="/LOGO_SUMAK.png"
                          alt="SUMAK"
                          className="h-5 w-auto"
                        />
                        <span className="text-[10px] font-black text-[#0F2E18] tracking-wider leading-none">
                          #{i + 1}
                        </span>
                      </div>
                      {/* Middle: NOMBRE DEL RANGO grande y visible */}
                      <p
                        className={`text-[12px] font-black leading-[1.1] text-center ${tone.text} drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]`}
                        style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                      >
                        {rank.rango}
                      </p>
                      {/* Bottom: icono check / lock / star */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
                        isCurrent
                          ? 'bg-white text-[#D4AF37] ring-2 ring-white animate-pulse'
                          : isAchieved
                          ? 'bg-white/95 ' + tone.text
                          : 'bg-black/30 text-white/60'
                      }`}>
                        <StepIcon isCurrent={isCurrent} isAchieved={isAchieved} tier={tier} rangoName={rank.rango} />
                      </div>
                    </div>

                    {/* "Aquí estás" o "Próximo" — etiqueta inferior del escalón */}
                    {isCurrent && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[#D4AF37] text-[9px] font-bold text-center py-1 uppercase tracking-wider">
                        Aquí estás
                      </div>
                    )}
                    {isNext && !isCurrent && (
                      <div className="absolute bottom-0 inset-x-0 bg-white/90 text-[#1A4E26] text-[9px] font-bold text-center py-1 uppercase tracking-wider">
                        Próximo
                      </div>
                    )}
                  </motion.div>

                  {/* Requisito debajo */}
                  <p className={`text-[11px] font-semibold text-center mt-2 leading-tight ${variant === 'dark' ? 'text-white/65' : 'text-[#6B7280]'}`}>
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
                  {/* Lado izquierdo: bloque grueso (el escalón) con el NOMBRE adentro */}
                  <div
                    className="relative w-32 shrink-0 flex flex-col items-center justify-between gap-1 py-3 px-2"
                    style={{ background: tone.body }}
                  >
                    {/* Huella en el tope */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[6px] shadow-[0_2px_3px_rgba(0,0,0,0.3)]"
                      style={{ background: tone.tread }}
                    />
                    {/* Top: chip blanco con logo SUMAK grande + # */}
                    <div className="flex items-center gap-1 bg-white/95 rounded-lg px-1.5 py-1 shadow-md">
                      <img
                        src="/LOGO_SUMAK.png"
                        alt="SUMAK"
                        className="h-5 w-auto"
                      />
                      <span className="text-[10px] font-black text-[#0F2E18] tracking-wider leading-none">
                        #{i + 1}
                      </span>
                    </div>
                    {/* Middle: NOMBRE DEL RANGO grande */}
                    <p
                      className={`text-[13px] font-black text-center leading-[1.15] ${tone.text} drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]`}
                      style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                    >
                      {rank.rango}
                    </p>
                    {/* Bottom: icono */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md ${
                      isCurrent
                        ? 'bg-white text-[#D4AF37] ring-2 ring-white'
                        : isAchieved
                        ? 'bg-white/95 ' + tone.text
                        : 'bg-black/30 text-white/60'
                    }`}>
                      <StepIcon isCurrent={isCurrent} isAchieved={isAchieved} tier={tier} rangoName={rank.rango} />
                    </div>
                  </div>

                  {/* Lado derecho: info */}
                  <div className={`flex-1 p-4 ${
                    variant === 'dark'
                      ? isAchieved ? 'bg-white/10 backdrop-blur-sm' : 'bg-black/20'
                      : isCurrent
                      ? 'bg-gradient-to-r from-[#FFFDF0] to-[#FFFCEB]'
                      : isAchieved
                      ? 'bg-white'
                      : 'bg-[#FAFBFA]'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Badges de estado y users */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          {isCurrent && (
                            <span className="bg-[#D4AF37] text-[#0B2913] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                              Aquí
                            </span>
                          )}
                          {isNext && !isCurrent && (
                            <span className="bg-[#1A4E26] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                              Próximo
                            </span>
                          )}
                          {usersByRank && users.length > 0 && (
                            <span className="bg-[#1A4E26] text-white text-[10px] font-bold rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                              <Users size={10} /> {users.length}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-semibold ${variant === 'dark' ? 'text-white/65' : 'text-[#6B7280]'}`}>
                          {rank.requirement}
                        </p>
                        {/* Premio: IMAGEN del premio + label */}
                        {rank.extra && (() => {
                          const resolved = autoResolvePrize(rank.extra.label);
                          const image = rank.extra.image ?? resolved.image;
                          const icon = rank.extra.icon ?? resolved.icon;
                          return (
                            <div className={`mt-2 inline-flex items-center gap-2 rounded-xl px-3 py-2 border ${
                              variant === 'dark'
                                ? 'bg-gradient-to-r from-[#FFE066]/15 to-[#D4AF37]/5 border-[#FFE066]/40'
                                : 'bg-gradient-to-r from-[#FFF8DC] to-white border-[#D4AF37]/50'
                            }`}>
                              <PrizeVisual
                                image={image}
                                fallbackIcon={icon}
                                variant={variant}
                                className="w-12 h-12"
                              />
                              <div>
                                <p className={`text-[9px] font-bold uppercase tracking-wider ${variant === 'dark' ? 'text-[#FFE066]/85' : 'text-[#92680A]/85'}`}>
                                  Premio
                                </p>
                                <p className={`text-xs font-bold leading-tight ${variant === 'dark' ? 'text-[#FFE066]' : 'text-[#92680A]'}`}>
                                  {rank.extra.label}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${variant === 'dark' ? 'text-white/45' : 'text-[#9CA3AF]'}`}>
                          Bono
                        </p>
                        <p className={`font-heading font-black text-lg leading-tight ${
                          isCurrent
                            ? 'text-[#D4AF37]'
                            : isAchieved
                            ? variant === 'dark' ? 'text-[#D4AF37]' : 'text-[#1A4E26]'
                            : variant === 'dark' ? 'text-white/40' : 'text-[#9CA3AF]'
                        }`}>
                          {rank.reward}
                        </p>
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
