import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight, Trophy, Plane, Globe, MapPin, Gem, Crown, Star,
  ChefHat, Snowflake, Tv, Laptop, Bike, Car, Home,
} from 'lucide-react';
import { tramo1Ranks, tramo2Ranks } from '../data';
import { useSEO } from '../lib/seo';

function getPrizeIcon(text: string) {
  if (text.includes('Internacional')) return <Globe size={14} className="flex-shrink-0" />;
  if (text.includes('Nacional')) return <Plane size={14} className="flex-shrink-0" />;
  if (text.includes('Local')) return <MapPin size={14} className="flex-shrink-0" />;
  return null;
}

// Premios físicos del Tramo 2
function getExtraIcon(text: string, size = 12) {
  const t = text.toLowerCase();
  if (t.includes('viaje') || t.includes('internacional')) return <Globe size={size} className="flex-shrink-0" />;
  if (t.includes('cocina')) return <ChefHat size={size} className="flex-shrink-0" />;
  if (t.includes('nevera')) return <Snowflake size={size} className="flex-shrink-0" />;
  if (t.includes('proyector')) return <Tv size={size} className="flex-shrink-0" />;
  if (t.includes('laptop')) return <Laptop size={size} className="flex-shrink-0" />;
  if (t.includes('moto')) return <Bike size={size} className="flex-shrink-0" />;
  if (t.includes('carro')) return <Car size={size} className="flex-shrink-0" />;
  if (t.includes('casa')) return <Home size={size} className="flex-shrink-0" />;
  return <Trophy size={size} className="flex-shrink-0" />;
}

function getT2Icon(rango: string) {
  if (rango.includes('Fundador Internacional')) return <Crown size={16} className="flex-shrink-0" />;
  if (rango.includes('Fundador')) return <Crown size={16} className="flex-shrink-0" />;
  if (rango.includes('Diamante')) return <Gem size={16} className="flex-shrink-0" />;
  return <Trophy size={16} className="flex-shrink-0" />;
}

const T1_MAX = tramo1Ranks.length;
const T2_MAX = tramo2Ranks.length;

export default function Escaleras() {
  useSEO({
    title: 'Escaleras de Rangos — Sumak Vida Ecuador',
    description:
      'Carrera de rangos SUMAK con dos tramos: bonos económicos, viajes locales/nacionales/internacionales, electrodomésticos, vehículos y hasta una casa al alcanzar Fundador Internacional.',
    url: '/escaleras',
  });

  return (
    <div className="bg-white">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f7f2 0%, #e8f4eb 60%, #fdf9ed 100%)' }}>
        <div className="absolute top-1/2 right-10 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(26,78,38,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-20 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#1A4E26]/10 border border-[#1A4E26]/20 rounded-full px-4 py-1.5 mb-6"
          >
            <Trophy size={14} className="text-[#1A4E26]" />
            <span className="text-[#1A4E26] text-sm font-semibold tracking-wide">Rangos y Bonos</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#111111] mb-5"
          >
            Escaleras de Éxito
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#4B5563] text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Tu camino hacia la libertad financiera. Cada rango alcanzado desbloquea bonos únicos y recompensas acumulativas.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 inline-flex items-center gap-2 bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded-full px-4 py-2"
          >
            <Star size={13} className="text-[#D4AF37]" />
            <span className="text-[#92680A] text-sm font-medium">Los bonos se pagan una única vez al alcanzar cada rango y son acumulativos</span>
          </motion.div>
        </div>
      </section>

      {/* ── TRAMO 1 ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-14 text-center"
          >
            <span className="inline-block bg-[#1A4E26]/10 text-[#1A4E26] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">Tramo 1</span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">Rangos Iniciales</h2>
            <p className="text-[#6B7280] max-w-lg mx-auto">Basados en la cantidad de personas directas afiliadas a tu red.</p>
          </motion.div>

          {/* ─── Desktop: visual staircase bar chart ─── */}
          <div className="hidden lg:block">
            <div className="flex items-end gap-2" style={{ height: 500 }}>
              {tramo1Ranks.map((rank, i) => {
                const colHeight = Math.round(((i + 1) / T1_MAX) * 380) + 40;
                const isGold = i >= 7;
                const isMid = i >= 3;
                const bg = isGold
                  ? 'linear-gradient(to top, #92680A, #D4AF37)'
                  : isMid
                  ? 'linear-gradient(to top, #163F1E, #1A4E26)'
                  : 'linear-gradient(to top, #374151, #6B7280)';
                const prize = getPrizeIcon(rank.bono);

                return (
                  <motion.div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    {/* Info above bar */}
                    <div className="mb-2 text-center w-full px-1">
                      <p className={`text-[11px] font-bold leading-tight ${isGold ? 'text-[#92680A]' : isMid ? 'text-[#1A4E26]' : 'text-[#374151]'}`}>
                        {rank.bono.split(' +')[0]}
                      </p>
                      {prize && (
                        <div className={`flex items-center justify-center gap-0.5 mt-0.5 ${isGold ? 'text-[#D4AF37]' : 'text-[#1A4E26]'}`}>
                          {prize}
                        </div>
                      )}
                    </div>

                    {/* Step column */}
                    <motion.div
                      className="w-full rounded-t-lg relative flex flex-col items-center justify-between py-2 overflow-hidden"
                      style={{ background: bg }}
                      initial={{ height: 0 }}
                      whileInView={{ height: colHeight }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.07, ease: 'easeOut' }}
                    >
                      {/* Step number at top */}
                      <span className="text-white/60 text-[9px] font-bold">{i + 1}</span>
                      {/* Rank name vertical */}
                      <span
                        className="text-white font-bold text-[9px] text-center leading-tight absolute inset-0 flex items-center justify-center px-1"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 9 }}
                      >
                        {rank.rango}
                      </span>
                    </motion.div>

                    {/* Requirement below */}
                    <div className="mt-2 text-center">
                      <p className="text-[9px] text-[#9CA3AF] leading-tight">{rank.personasDirectas} directos</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Ground line */}
            <div className="h-1 rounded-full mt-1" style={{ background: 'linear-gradient(to right, #6B7280, #1A4E26, #D4AF37)' }} />
            <div className="flex gap-2 mt-3">
              {tramo1Ranks.map((rank, i) => (
                <div key={i} className="flex-1 text-center">
                  <p className="text-[9px] font-semibold text-[#374151] leading-tight truncate">{rank.rango}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Mobile: vertical timeline ─── */}
          <div className="lg:hidden">
            <div className="relative">
              {/* Vertical connector */}
              <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#6B7280] via-[#1A4E26] to-[#D4AF37]" />

              <div className="flex flex-col gap-4">
                {[...tramo1Ranks].reverse().map((rank, i) => {
                  const realIdx = T1_MAX - 1 - i;
                  const isGold = realIdx >= 7;
                  const isMid = realIdx >= 3;
                  const prize = getPrizeIcon(rank.bono);
                  return (
                    <motion.div
                      key={realIdx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      className="flex gap-4 items-start pl-2"
                    >
                      {/* Step circle */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 ${
                        isGold ? 'bg-[#D4AF37] text-white' : isMid ? 'bg-[#1A4E26] text-white' : 'bg-[#6B7280] text-white'
                      }`}>
                        {realIdx + 1}
                      </div>
                      {/* Card */}
                      <div className={`flex-1 rounded-xl p-4 border ${
                        isGold ? 'border-[#D4AF37]/40 bg-gradient-to-r from-[#FFFDF0] to-[#FFF8E0]' :
                        isMid ? 'border-[#1A4E26]/25 bg-[#EBF4ED]' :
                        'border-[#E5E7EB] bg-[#F9FAFB]'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-heading font-bold text-base ${isGold ? 'text-[#92680A]' : isMid ? 'text-[#1A4E26]' : 'text-[#374151]'}`}>
                              {rank.rango}
                            </p>
                            <p className="text-[#6B7280] text-xs mt-0.5">{rank.personasDirectas} personas directas</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-base ${isGold ? 'text-[#D4AF37]' : isMid ? 'text-[#1A4E26]' : 'text-[#374151]'}`}>
                              {rank.bono.split(' +')[0]}
                            </p>
                            {prize && (
                              <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isGold ? 'text-[#D4AF37]' : 'text-[#1A4E26]'}`}>
                                {prize}
                                <span>{rank.bono.includes('Internacional') ? 'Viaje Internacional' : rank.bono.includes('Nacional') ? 'Viaje Nacional' : 'Viaje Local'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Separator ───────────────────────────────────────── */}
      <div className="py-10 flex flex-col items-center gap-3 bg-[#F4F7F5] border-y border-[#C8D8CB]">
        <Trophy size={30} className="text-[#D4AF37]" />
        <p className="text-[#6B7280] text-sm font-medium">Superas el Tramo 1 → Accedes al Tramo 2</p>
      </div>

      {/* ── TRAMO 2 ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-[#1A4E26] relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-[0.05] blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />

        <div className="max-w-6xl mx-auto relative z-10">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-14 text-center"
          >
            <span className="inline-block bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">Tramo 2</span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-3">Rangos Avanzados</h2>
            <p className="text-white/60 max-w-lg mx-auto">Basados en niveles de red activos y cantidad de personas en tu red total.</p>
          </motion.div>

          {/* ─── Desktop: staircase ─── */}
          <div className="hidden lg:block">
            <div className="flex items-end gap-2" style={{ height: 520 }}>
              {tramo2Ranks.map((rank, i) => {
                const colHeight = Math.round(((i + 1) / T2_MAX) * 400) + 40;
                const isDiamond = rank.rango.includes('Diamante');
                const isFounder = rank.rango.includes('Fundador');
                const bg = isFounder
                  ? 'linear-gradient(to top, #6B3A00, #D4AF37, #FFE066)'
                  : isDiamond
                  ? 'linear-gradient(to top, #92680A, #D4AF37)'
                  : 'linear-gradient(to top, #0F2D16, #1A4E26)';

                return (
                  <motion.div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    {/* Info above bar */}
                    <div className="mb-2 text-center w-full px-1">
                      <div className={`flex items-center justify-center gap-0.5 mb-0.5 ${isFounder || isDiamond ? 'text-[#D4AF37]' : 'text-white/70'}`}>
                        {getT2Icon(rank.rango)}
                      </div>
                      <p className={`text-[10px] font-bold leading-tight ${isFounder || isDiamond ? 'text-[#D4AF37]' : 'text-white/80'}`}>
                        {rank.recompensa}
                      </p>
                      {rank.extras && (
                        <p className="text-[9px] text-[#D4AF37] mt-1 flex items-center justify-center gap-1 font-semibold">
                          {getExtraIcon(rank.extras, 10)} {rank.extras}
                        </p>
                      )}
                    </div>

                    {/* Column */}
                    <motion.div
                      className="w-full rounded-t-lg relative flex items-center justify-center overflow-hidden"
                      style={{ background: bg }}
                      initial={{ height: 0 }}
                      whileInView={{ height: colHeight }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.07, ease: 'easeOut' }}
                    >
                      <span
                        className="text-white/70 font-bold text-[8px]"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      >
                        {rank.rango}
                      </span>
                    </motion.div>

                    {/* Req below */}
                    <div className="mt-2 text-center">
                      <p className="text-[9px] text-white/40 leading-tight">{rank.personasEnRed.toLocaleString()} red</p>
                      <p className="text-[9px] text-white/30 leading-tight">Niv {rank.nivelesActivos}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Ground line */}
            <div className="h-1 rounded-full mt-1" style={{ background: 'linear-gradient(to right, #1A4E26, #D4AF37, #FFE066)' }} />
          </div>

          {/* ─── Mobile: vertical timeline ─── */}
          <div className="lg:hidden">
            <div className="relative">
              <div className="absolute left-5 top-6 bottom-6 w-0.5" style={{ background: 'linear-gradient(to bottom, #1A4E26, #D4AF37)' }} />
              <div className="flex flex-col gap-4">
                {[...tramo2Ranks].reverse().map((rank, i) => {
                  const realIdx = T2_MAX - 1 - i;
                  const isDiamond = rank.rango.includes('Diamante');
                  const isFounder = rank.rango.includes('Fundador');
                  return (
                    <motion.div
                      key={realIdx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      className="flex gap-4 items-start pl-2"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        isFounder ? 'bg-gradient-to-b from-[#FFE066] to-[#D4AF37]' : isDiamond ? 'bg-[#D4AF37]' : 'bg-[#1A4E26]'
                      }`}>
                        {getT2Icon(rank.rango)}
                      </div>
                      <div className={`flex-1 rounded-xl p-4 border ${
                        isFounder ? 'border-[#FFE066]/30 bg-gradient-to-r from-[#1A1A00] to-[#1A1200]' :
                        isDiamond ? 'border-[#D4AF37]/30 bg-[#1F3A0F]' : 'border-white/10 bg-white/05'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-heading font-bold text-sm ${isFounder ? 'text-[#FFE066]' : isDiamond ? 'text-[#D4AF37]' : 'text-white'}`}>
                              {rank.rango}
                            </p>
                            <p className="text-white/50 text-xs mt-0.5">
                              {rank.nivelesActivos} niveles · {rank.personasEnRed.toLocaleString()} personas
                            </p>
                            {rank.extras && (
                              <p className="text-[#D4AF37] text-xs mt-1 inline-flex items-center gap-1 font-semibold bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-2 py-0.5">
                                {getExtraIcon(rank.extras, 11)} {rank.extras}
                              </p>
                            )}
                          </div>
                          <p className={`font-bold text-sm text-right ${isFounder ? 'text-[#FFE066]' : isDiamond ? 'text-[#D4AF37]' : 'text-white/90'}`}>
                            {rank.recompensa}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-cta-gradient">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <Crown size={36} className="text-[#D4AF37] mx-auto mb-5 opacity-90" />
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-5">
              ¿Listo para escalar?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Cada rango que alcances te lleva más cerca de la libertad financiera.
              Comienza hoy y construye tu legado con SUMAK.
            </p>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-white text-[#1A4E26] font-bold text-base hover:bg-white/90 transition-all duration-200 shadow-lg"
            >
              Únete Ahora <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
