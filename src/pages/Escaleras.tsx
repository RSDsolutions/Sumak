import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import {
  ArrowRight, Trophy, Crown, Star, RefreshCw, Users, Layers,
  CheckCircle2, Gift, Plane, Car, Home, Tv, Info, Calculator, Sparkles,
} from 'lucide-react';
import { tramo1Ranks, tramo2Ranks } from '../data';
import { useSEO } from '../lib/seo';
import StaircaseVisual, { type StaircaseRank } from '../components/StaircaseVisual';

export default function Escaleras() {
  useSEO({
    title: 'Escaleras de Rangos — Sumak Vida Ecuador',
    description:
      'Carrera de rangos SUMAK con dos tramos: bonos económicos, viajes locales/nacionales/internacionales, electrodomésticos, vehículos y hasta una casa al alcanzar Fundador Internacional.',
    url: '/escaleras',
  });

  // StaircaseVisual auto-resuelve imagen+icono del premio a partir del label.
  const t1Ranks: StaircaseRank[] = useMemo(
    () => tramo1Ranks.map((r) => {
      const prizeLabel = r.bono.includes(' + ') ? r.bono.split(' + ')[1] : null;
      return {
        rango: r.rango,
        requirement: `${r.personasDirectas} direct${r.personasDirectas === 1 ? 'o' : 'os'}`,
        reward: r.bono.split(' +')[0],
        extra: prizeLabel ? { label: prizeLabel } : undefined,
      };
    }),
    [],
  );

  const t2Ranks: StaircaseRank[] = useMemo(
    () => tramo2Ranks.map((r) => ({
      rango: r.rango,
      requirement: `${r.personasEnRed.toLocaleString('es-EC')} red · Niv ${r.nivelesActivos}`,
      reward: r.recompensa,
      extra: r.extras ? { label: r.extras, image: r.extraImage } : undefined,
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
            <RefreshCw size={13} className="text-[#D4AF37]" />
            <span className="text-[#92680A] text-sm font-medium">Los rangos se reinician cada mes — los bonos económicos se cobran cada vez que vuelves a alcanzarlos</span>
          </motion.div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONAN LAS ESCALERAS ────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-br from-[#FFFDF5] via-white to-[#F4F7F5]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <span className="inline-flex items-center gap-1.5 bg-[#1A4E26]/10 text-[#1A4E26] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              <Info size={11} /> Cómo funcionan
            </span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
              Las reglas de las escaleras del éxito
            </h2>
            <p className="text-[#6B7280] max-w-2xl mx-auto">
              SUMAK divide la carrera en 2 tramos con 10 rangos cada uno. Cada rango desbloquea un bono
              económico y, en los rangos superiores, premios físicos pagados por la empresa.
            </p>
          </motion.div>

          {/* 4 reglas clave */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              {
                icon: RefreshCw,
                title: 'Se reinician cada mes',
                body: 'Los rangos de las 2 escaleras se recalculan el día 1 de cada mes. Cada nuevo ciclo arrancas desde Socio y vuelves a escalar según los afiliados y la red de ese mes.',
                color: '#1A4E26',
              },
              {
                icon: Calculator,
                title: 'Activación mínima de $100',
                body: 'Para sumar tu mes y ser elegible a los bonos del rango, debes mantener una compra mínima de $100 en un solo pedido al mes.',
                color: '#D4AF37',
              },
              {
                icon: Gift,
                title: 'Bonos económicos cada mes',
                body: 'Si vuelves a alcanzar Líder, Gerente o Diamante el siguiente mes, vuelves a cobrar el bono económico de ese rango. No se cobra solo una vez.',
                color: '#3B82F6',
              },
              {
                icon: Trophy,
                title: 'Premios físicos una sola vez',
                body: 'Los viajes, electrodomésticos, motos, carro y casa se entregan la primera vez que alcanzas el rango. Son tuyos para siempre y conservas todos los anteriores al escalar.',
                color: '#92680A',
              },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className="bg-white border border-[#C8D8CB] rounded-2xl p-5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-shadow"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${card.color}15`, color: card.color }}
                >
                  <card.icon size={20} />
                </div>
                <h3 className="font-heading font-bold text-base text-[#111111] mb-1.5 leading-tight">{card.title}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Comparativa rápida de tramos */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <div className="bg-white border-2 border-[#1A4E26]/30 rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-block bg-[#1A4E26] text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Tramo 1</span>
                <h3 className="font-heading font-bold text-lg text-[#111111]">Rangos iniciales</h3>
              </div>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-3">
                10 rangos basados solo en <strong className="text-[#111111]">afiliados directos</strong> del mes
                (Socio → Gerente N2). Es el primer escalón de tu carrera y el más rápido de avanzar.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#EBF4ED] rounded-lg px-3 py-2">
                  <p className="text-[#1A4E26] font-bold">$100 → $4.000</p>
                  <p className="text-[#6B7280]">Bono económico</p>
                </div>
                <div className="bg-[#EBF4ED] rounded-lg px-3 py-2">
                  <p className="text-[#1A4E26] font-bold">2 viajes</p>
                  <p className="text-[#6B7280]">Local y nacional</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-[#D4AF37]/40 rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-block bg-[#D4AF37] text-[#0B2913] text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Tramo 2</span>
                <h3 className="font-heading font-bold text-lg text-[#111111]">Rangos avanzados</h3>
              </div>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-3">
                10 rangos basados en <strong className="text-[#111111]">volumen de red total + niveles
                activos</strong> (Gerente → Fundador Internacional). Aquí entran los premios físicos
                grandes: carro y casa.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#FFF8DC] rounded-lg px-3 py-2">
                  <p className="text-[#92680A] font-bold">$5K → $1M</p>
                  <p className="text-[#6B7280]">Bono económico</p>
                </div>
                <div className="bg-[#FFF8DC] rounded-lg px-3 py-2">
                  <p className="text-[#92680A] font-bold">Viaje + Carro + Casa</p>
                  <p className="text-[#6B7280]">Premios físicos</p>
                </div>
              </div>
            </div>
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

          {/* ── Info del Tramo 1 (debajo de la escalera) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            {/* Cómo subir */}
            <div className="bg-gradient-to-br from-[#EBF4ED] to-white border border-[#1A4E26]/20 rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-[#1A4E26] flex items-center justify-center text-white mb-3 shadow-md">
                <Users size={20} />
              </div>
              <h3 className="font-heading font-bold text-base text-[#111111] mb-2">Cómo subes en el Tramo 1</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-3">
                Cada persona que se afilia a SUMAK con tu código de patrocinador suma 1 directo a tu cuenta
                del mes. Cuantos más directos en el mes, más alto el rango que alcanzas.
              </p>
              <ul className="space-y-1.5 text-xs text-[#374151]">
                <li className="flex items-start gap-2"><Star size={11} className="text-[#1A4E26] shrink-0 mt-0.5" fill="currentColor" /><span>1 directo → Básico ($125)</span></li>
                <li className="flex items-start gap-2"><Star size={11} className="text-[#1A4E26] shrink-0 mt-0.5" fill="currentColor" /><span>5 directos → Líder ($500)</span></li>
                <li className="flex items-start gap-2"><Star size={11} className="text-[#1A4E26] shrink-0 mt-0.5" fill="currentColor" /><span>30 directos → Gerente ($3.000 + Viaje Local)</span></li>
                <li className="flex items-start gap-2"><Star size={11} className="text-[#1A4E26] shrink-0 mt-0.5" fill="currentColor" /><span>40 directos → Gerente N2 ($4.000 + Viaje Nacional)</span></li>
              </ul>
            </div>

            {/* Qué desbloqueas */}
            <div className="bg-gradient-to-br from-[#FFF8DC] to-white border border-[#D4AF37]/40 rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#92680A] flex items-center justify-center text-white mb-3 shadow-md">
                <Gift size={20} />
              </div>
              <h3 className="font-heading font-bold text-base text-[#111111] mb-2">Qué desbloqueas en cada rango</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-3">
                Los 10 rangos del Tramo 1 entregan bonos económicos crecientes desde <strong>$100</strong> (Socio)
                hasta <strong>$4.000</strong> (Gerente N2), más 2 viajes en los últimos 2 rangos.
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 bg-white/60 rounded px-2 py-1.5 border border-[#D4AF37]/20">
                  <Plane size={13} className="text-[#0D9488]" />
                  <span className="text-[#374151]"><strong>Viaje Local</strong> al rango Gerente</span>
                </div>
                <div className="flex items-center gap-2 bg-white/60 rounded px-2 py-1.5 border border-[#D4AF37]/20">
                  <Plane size={13} className="text-[#0D9488]" />
                  <span className="text-[#374151]"><strong>Viaje Nacional</strong> al rango Gerente N2</span>
                </div>
                <div className="flex items-center gap-2 bg-white/60 rounded px-2 py-1.5 border border-[#D4AF37]/20">
                  <Trophy size={13} className="text-[#D4AF37]" />
                  <span className="text-[#374151]">Hasta <strong>$15.725 acumulados</strong> en bonos del tramo</span>
                </div>
              </div>
            </div>

            {/* Estrategia */}
            <div className="bg-gradient-to-br from-[#F0F9FF] to-white border border-[#3B82F6]/30 rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-[#3B82F6] flex items-center justify-center text-white mb-3 shadow-md">
                <Sparkles size={20} />
              </div>
              <h3 className="font-heading font-bold text-base text-[#111111] mb-2">Estrategia recomendada</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-3">
                El Tramo 1 es tu fase de <strong>arranque y capacitación</strong>. Enfócate en patrocinar
                personalmente: 2–3 nuevos directos por semana te llevan a Líder cada mes.
              </p>
              <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-lg p-3 text-xs">
                <p className="text-[#1D4ED8] font-bold mb-1 flex items-center gap-1">
                  <Info size={11} /> Tip
                </p>
                <p className="text-[#374151] leading-relaxed">
                  Apoya a tus directos para que también activen su mes ($100). Cuando todos están activos,
                  tu red genera comisiones binarias y por nivel además del bono de rango.
                </p>
              </div>
            </div>
          </motion.div>
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

          {/* ── Info del Tramo 2 (debajo de la escalera) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            {/* Cómo subir */}
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/15 rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37] flex items-center justify-center text-[#0B2913] mb-3 shadow-md">
                <Layers size={20} />
              </div>
              <h3 className="font-heading font-bold text-base text-white mb-2">Cómo subes en el Tramo 2</h3>
              <p className="text-white/65 text-sm leading-relaxed mb-3">
                Aquí no basta con afiliados directos: necesitas <strong className="text-white">volumen de
                red total</strong> + <strong className="text-white">niveles activos</strong>. La red total
                cuenta a todos los distribuidores en tu organización, no solo a tus directos.
              </p>
              <ul className="space-y-1.5 text-xs text-white/85">
                <li className="flex items-start gap-2"><Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" fill="currentColor" /><span>50 en red · 1–5 niveles → Gerente ($5K)</span></li>
                <li className="flex items-start gap-2"><Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" fill="currentColor" /><span>1.000 en red · 1–9 niveles → Diamante ($100K)</span></li>
                <li className="flex items-start gap-2"><Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" fill="currentColor" /><span>5.000 en red · 1–12 niveles → Diamante Oro ($500K)</span></li>
                <li className="flex items-start gap-2"><Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" fill="currentColor" /><span>10.000 en red · 1–14 niveles → Fundador ($1M + Casa)</span></li>
              </ul>
            </div>

            {/* Qué desbloqueas */}
            <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 backdrop-blur-sm border border-[#D4AF37]/40 rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FFE066] to-[#D4AF37] flex items-center justify-center text-[#0B2913] mb-3 shadow-md">
                <Gift size={20} />
              </div>
              <h3 className="font-heading font-bold text-base text-white mb-2">Premios físicos del Tramo 2</h3>
              <p className="text-white/65 text-sm leading-relaxed mb-3">
                Cada rango entrega un premio físico además del bono económico. Son acumulativos —
                conservas todos al escalar al siguiente.
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-white/10">
                  <Plane size={13} className="text-[#5EEAD4]" />
                  <span className="text-white/90">Viaje Internacional (Gerente)</span>
                </div>
                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-white/10">
                  <Tv size={13} className="text-[#93C5FD]" />
                  <span className="text-white/90">Cocina, nevera, proyector, laptop</span>
                </div>
                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-white/10">
                  <Car size={13} className="text-[#FFE066]" />
                  <span className="text-white/90">Moto y 3 modelos de carro</span>
                </div>
                <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5 border border-[#D4AF37]/40">
                  <Home size={13} className="text-[#FFE066]" />
                  <span className="text-white/90"><strong>Casa</strong> (Fundador Internacional)</span>
                </div>
              </div>
            </div>

            {/* Cómo cuenta la red */}
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/15 rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-[#3B82F6] flex items-center justify-center text-white mb-3 shadow-md">
                <Sparkles size={20} />
              </div>
              <h3 className="font-heading font-bold text-base text-white mb-2">Cómo se cuenta tu red</h3>
              <p className="text-white/65 text-sm leading-relaxed mb-3">
                Tu red total es la suma de <strong className="text-white">todos los distribuidores debajo
                tuyo</strong> en la organización (afiliados de tus afiliados, hasta donde alcance el árbol).
                Cuanto más profundo, más rangos activos sumas.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-[#D4AF37] shrink-0 mt-0.5" />
                  <p className="text-white/85 leading-relaxed">
                    <strong className="text-white">Niveles activos</strong> = profundidad de tu red con
                    distribuidores que cumplieron su activación de $100 el mes.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-[#D4AF37] shrink-0 mt-0.5" />
                  <p className="text-white/85 leading-relaxed">
                    Por eso es clave <strong className="text-white">capacitar a tu equipo</strong>: cuando
                    todos activan, todos suben de rango.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Total potencial */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-8 bg-gradient-to-r from-[#D4AF37] via-[#FFE066] to-[#D4AF37] rounded-2xl p-1 shadow-[0_16px_40px_rgba(212,175,55,0.25)]"
          >
            <div className="bg-[#0F2E18] rounded-xl px-6 py-5 sm:px-8 sm:py-6 text-center">
              <p className="text-[#FFE066] text-[10px] font-bold uppercase tracking-widest mb-2">
                Potencial acumulado del Tramo 2
              </p>
              <p className="font-heading font-black text-3xl sm:text-4xl text-white mb-2">
                Hasta <span className="text-[#FFE066]">$1.000.000</span> + Carro + Casa
              </p>
              <p className="text-white/65 text-sm">
                Al alcanzar Fundador Internacional. Y todos los premios físicos de los rangos previos.
              </p>
            </div>
          </motion.div>
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
