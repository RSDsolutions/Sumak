import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import {
  ArrowRight, Trophy, Plane, Globe, MapPin, Crown, Star,
  ChefHat, Snowflake, Tv, Laptop, Bike, Car, Home,
} from 'lucide-react';
import { tramo1Ranks, tramo2Ranks } from '../data';
import { useSEO } from '../lib/seo';
import StaircaseVisual, { type StaircaseRank } from '../components/StaircaseVisual';

function getPrizeIcon(text: string, size = 12) {
  if (text.includes('Internacional')) return <Globe size={size} className="flex-shrink-0" />;
  if (text.includes('Nacional')) return <Plane size={size} className="flex-shrink-0" />;
  if (text.includes('Local')) return <MapPin size={size} className="flex-shrink-0" />;
  return null;
}

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

export default function Escaleras() {
  useSEO({
    title: 'Escaleras de Rangos — Sumak Vida Ecuador',
    description:
      'Carrera de rangos SUMAK con dos tramos: bonos económicos, viajes locales/nacionales/internacionales, electrodomésticos, vehículos y hasta una casa al alcanzar Fundador Internacional.',
    url: '/escaleras',
  });

  const t1Ranks: StaircaseRank[] = useMemo(
    () => tramo1Ranks.map((r) => ({
      rango: r.rango,
      requirement: `${r.personasDirectas} direct${r.personasDirectas === 1 ? 'o' : 'os'}`,
      reward: r.bono.split(' +')[0],
      extra: r.bono.includes(' + ')
        ? { icon: getPrizeIcon(r.bono, 10), label: r.bono.split(' + ')[1] }
        : undefined,
    })),
    [],
  );

  const t2Ranks: StaircaseRank[] = useMemo(
    () => tramo2Ranks.map((r) => ({
      rango: r.rango,
      requirement: `${r.personasEnRed.toLocaleString('es-EC')} red · Niv ${r.nivelesActivos}`,
      reward: r.recompensa,
      extra: r.extras ? { icon: getExtraIcon(r.extras, 10), label: r.extras } : undefined,
    })),
    [],
  );

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

          {/* Escalera visual reutilizable */}
          <StaircaseVisual
            ranks={t1Ranks}
            variant="light"
            tier={1}
          />
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

          <StaircaseVisual
            ranks={t2Ranks}
            variant="dark"
            tier={2}
          />
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
