import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, animate, type Variants } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Users, TrendingUp, Layers, Wallet,
  Network, Split, Crown, Zap, ChevronRight, CheckCircle2,
  ShoppingBag, UserPlus, Trophy, GitFork, Repeat, Info, Calculator,
  Car, Home, Gift, Gem, ChevronDown,
} from 'lucide-react';
import { levelCommissions, affiliatePackages, tramo1Ranks, tramo2Ranks } from '../data';
import { useSEO } from '../lib/seo';
import StaircaseVisual, { type StaircaseRank } from '../components/StaircaseVisual';

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

function CountUp({ to, prefix = '', suffix = '', duration = 1.2 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${prefix}${Math.round(v).toLocaleString('es-EC')}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [inView, to, duration, mv]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ───────────────────────────────────────────────────────────────
// SECTION: Hero
// ───────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2E18 0%, #1A4E26 55%, #0F2E18 100%)' }}>
      {/* Decorative glow */}
      <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-[#FFDD00]/5 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
      }} />

      <div className="relative max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-7"
        >
          <Sparkles size={14} className="text-[#D4AF37]" />
          <span className="text-white text-xs font-bold uppercase tracking-[0.25em]">Plan de Compensación</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.02] mb-6"
        >
          6 formas de ganar
          <br />
          con <span className="bg-gradient-to-r from-[#FFE066] via-[#D4AF37] to-[#FFE066] bg-clip-text text-transparent">SUMAK</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-white/75 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Sistema binario flexible con frontales múltiples, comisiones por 14 niveles
          de profundidad, venta directa al 50%, bonos de rango y premios físicos por tramo:
          viajes, carro y casa.
        </motion.p>

        {/* Stat pills */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="flex flex-wrap justify-center gap-3"
        >
          {[
            { val: 50, suffix: '%', label: 'Ganancia directa', icon: Wallet },
            { val: 40, suffix: '%', label: 'Bono de afiliación', icon: UserPlus },
            { val: 14, suffix: '', label: 'Niveles de profundidad', icon: Layers },
            { val: 50, suffix: '%', label: 'Comisión binaria', icon: GitFork },
          ].map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="flex items-center gap-3 bg-white/[0.08] backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
                <s.icon size={16} className="text-[#D4AF37]" />
              </div>
              <div className="text-left">
                <p className="font-heading font-black text-2xl text-white leading-none">
                  <CountUp to={s.val} suffix={s.suffix} />
                </p>
                <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// SECTION: 6 income streams (interactive grid)
// ───────────────────────────────────────────────────────────────

const INCOME_STREAMS = [
  {
    id: 'venta',
    icon: ShoppingBag,
    title: 'Venta directa',
    short: 'Compras al 50% y vendes al PVP',
    detail: 'Adquieres todo el catálogo a precio distribuidor (50% off). La diferencia entre tu costo y el PVP es tu ganancia inmediata, sin esperas ni condiciones.',
    metric: '50%',
    metricLabel: 'por producto',
    color: '#1A4E26',
    glow: 'rgba(26,78,38,0.3)',
  },
  {
    id: 'afiliacion',
    icon: UserPlus,
    title: 'Bono de afiliación',
    short: '40% del paquete de cada afiliado',
    detail: 'Cada persona que se afilie con tu código te genera una comisión inmediata del 40% sobre el valor del paquete que elija (Básico, Emprendedor o Líder).',
    metric: '$50 — $210',
    metricLabel: 'según paquete',
    color: '#D4AF37',
    glow: 'rgba(212,175,55,0.3)',
  },
  {
    id: 'binaria',
    icon: GitFork,
    title: 'Comisión binaria',
    short: '50% del menor volumen entre tus lados',
    detail: 'Tu red se organiza en dos lados (Izquierda y Derecha). Cada ciclo cobras el 50% sobre el volumen del lado más débil — al pareo. Esto te motiva a balancear tu red.',
    metric: '50%',
    metricLabel: 'del menor lado',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.3)',
  },
  {
    id: 'niveles',
    icon: Layers,
    title: 'Comisiones por nivel',
    short: '14 niveles de profundidad',
    detail: 'Cobras un porcentaje sobre los puntos generados por cada pedido en tu organización, hasta 14 niveles hacia abajo. El nivel 2 es el más rentable con 20%.',
    metric: '14',
    metricLabel: 'niveles',
    color: '#A855F7',
    glow: 'rgba(168,85,247,0.3)',
  },
  {
    id: 'rangos',
    icon: Trophy,
    title: 'Bonos de rango',
    short: 'Premios económicos por escalar',
    detail: 'Cada rango alcanzado en las escaleras del éxito desbloquea un bono económico único, desde $100 (Socio) hasta $1.000.000 al alcanzar Fundador Internacional. Acumulativos: nadie te quita un rango que ya conquistaste.',
    metric: 'Hasta $1M',
    metricLabel: '20 rangos en total',
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.3)',
  },
  {
    id: 'fisicos',
    icon: Gift,
    title: 'Bonos de viajes, carro y casa',
    short: 'Premios físicos por tramo',
    detail: 'Además del bono económico, cada tramo te entrega premios físicos pagados por la empresa: 3 viajes (Local → Nacional → Internacional), 4 electrodomésticos (cocina, nevera, proyector, laptop), una Moto al cruzar a Diamante Bronce, tu Carro en Diamante Plata, Oro y Fundador Nacional, y la Casa al alcanzar Fundador Internacional.',
    metric: 'Viaje + Carro + Casa',
    metricLabel: 'según tramo alcanzado',
    color: '#D4AF37',
    glow: 'rgba(212,175,55,0.35)',
  },
] as const;

function IncomeStreams() {
  const [active, setActive] = useState<string>(INCOME_STREAMS[0].id);
  const [showLadder, setShowLadder] = useState(false);
  const activeStream = INCOME_STREAMS.find((s) => s.id === active) ?? INCOME_STREAMS[0];

  const t1Ranks: StaircaseRank[] = useMemo(
    () =>
      tramo1Ranks.map((r) => {
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
    () =>
      tramo2Ranks.map((r) => ({
        rango: r.rango,
        requirement: `${r.personasEnRed.toLocaleString('es-EC')} red · Niv ${r.nivelesActivos}`,
        reward: r.recompensa,
        extra: r.extras ? { label: r.extras } : undefined,
      })),
    [],
  );

  return (
    <section className="py-20 px-4 sm:px-6 bg-[#F4F7F5]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-[#1A4E26]/10 text-[#1A4E26] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            6 fuentes de ingreso
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
            Múltiples maneras de generar dinero
          </h2>
          <p className="text-[#6B7280] text-base max-w-2xl mx-auto">
            Cada flujo se complementa con los otros. Combínalos según tu estilo y maximiza tu ingreso total.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
          {/* Selector list */}
          <div className="space-y-2">
            {INCOME_STREAMS.map((stream, i) => {
              const isActive = stream.id === active;
              return (
                <motion.button
                  key={stream.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  onClick={() => setActive(stream.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    isActive
                      ? 'bg-white border-[#1A4E26] shadow-[0_8px_24px_rgba(26,78,38,0.12)]'
                      : 'bg-white/60 border-transparent hover:bg-white hover:border-[#C8D8CB]'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${stream.color}, ${stream.color}cc)`
                        : '#F4F7F5',
                      color: isActive ? '#fff' : stream.color,
                      boxShadow: isActive ? `0 8px 20px -8px ${stream.glow}` : 'none',
                    }}
                  >
                    <stream.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="font-heading font-bold text-base text-[#111111] truncate">{stream.title}</p>
                    </div>
                    <p className="text-[#6B7280] text-xs mt-0.5">{stream.short}</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`shrink-0 transition-all ${isActive ? 'text-[#1A4E26] rotate-90' : 'text-[#9CA3AF]'}`}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Detail panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStream.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="relative overflow-hidden bg-white border border-[#C8D8CB] rounded-3xl p-7 sm:p-9 shadow-[0_12px_36px_rgba(0,0,0,0.06)]"
            >
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-15 blur-3xl"
                style={{ background: activeStream.color }}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${activeStream.color}, ${activeStream.color}dd)`,
                      boxShadow: `0 8px 28px -8px ${activeStream.glow}`,
                    }}
                  >
                    <activeStream.icon size={26} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: activeStream.color }}>
                      Fuente de ingreso
                    </p>
                    <h3 className="font-heading font-black text-2xl text-[#111111] leading-tight">
                      {activeStream.title}
                    </h3>
                  </div>
                </div>

                {/* Metric */}
                <div
                  className="rounded-2xl p-5 mb-6 border-2"
                  style={{
                    background: `linear-gradient(135deg, ${activeStream.color}10, ${activeStream.color}03)`,
                    borderColor: `${activeStream.color}40`,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: activeStream.color }}>
                    Ganancia potencial
                  </p>
                  <p className="font-heading font-black text-4xl sm:text-5xl leading-none" style={{ color: activeStream.color }}>
                    {activeStream.metric}
                  </p>
                  <p className="text-[#6B7280] text-sm mt-1">{activeStream.metricLabel}</p>
                </div>

                <p className="text-[#374151] text-base leading-relaxed">{activeStream.detail}</p>

                {/* Botón desplegable (solo para la entry de bonos físicos) */}
                {activeStream.id === 'fisicos' && (
                  <motion.button
                    type="button"
                    onClick={() => setShowLadder((v) => !v)}
                    whileTap={{ scale: 0.97 }}
                    aria-expanded={showLadder}
                    aria-controls="escaleras-desplegable"
                    className={`mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_10px_28px_rgba(212,175,55,0.25)] ${
                      showLadder
                        ? 'bg-white text-[#92680A] border-2 border-[#D4AF37]'
                        : 'bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-[#0B2913] hover:brightness-110'
                    }`}
                  >
                    <Trophy size={16} />
                    {showLadder ? 'Ocultar las escaleras' : 'Ver la escalera del éxito completa'}
                    <ChevronDown size={16} className={`transition-transform ${showLadder ? 'rotate-180' : ''}`} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Área desplegable: dos escaleras + explicación del reseteo mensual */}
        <AnimatePresence initial={false}>
          {showLadder && activeStream.id === 'fisicos' && (
            <motion.div
              id="escaleras-desplegable"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 40 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-[#D4AF37]/40 rounded-3xl p-5 sm:p-8 shadow-[0_16px_40px_rgba(212,175,55,0.12)]">
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-1.5 bg-[#D4AF37]/15 text-[#92680A] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                    <Gem size={11} /> Escalera del éxito completa
                  </span>
                  <h3 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">
                    Las 2 escaleras de SUMAK
                  </h3>
                  <p className="text-[#6B7280] text-sm max-w-2xl mx-auto mt-2">
                    20 rangos en total: 10 iniciales (Tramo 1) por afiliados directos y 10 avanzados
                    (Tramo 2) por volumen de red y niveles activos.
                  </p>
                </div>

                {/* TRAMO 1 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4 px-1">
                    <div>
                      <span className="inline-block bg-[#1A4E26]/10 text-[#1A4E26] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-1">
                        Tramo 1 · Rangos iniciales
                      </span>
                      <p className="text-[#6B7280] text-xs">Basados en afiliados directos</p>
                    </div>
                    <Link
                      to="/escaleras"
                      className="inline-flex items-center gap-1.5 text-[#1A4E26] text-xs font-bold hover:underline"
                    >
                      Ver detalle <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div className="bg-gradient-to-br from-[#F9FAFB] to-white border border-[#C8D8CB] rounded-2xl p-3 sm:p-5">
                    <StaircaseVisual ranks={t1Ranks} variant="light" tier={1} />
                  </div>
                </div>

                {/* Separador */}
                <div className="py-3 flex flex-col items-center gap-1.5">
                  <Trophy size={22} className="text-[#D4AF37]" />
                  <p className="text-[#6B7280] text-[11px] font-medium">
                    Superas el Tramo 1 → accedes al Tramo 2
                  </p>
                </div>

                {/* TRAMO 2 */}
                <div className="mb-8">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4 px-1">
                    <div>
                      <span className="inline-block bg-[#D4AF37]/20 text-[#92680A] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-1">
                        Tramo 2 · Rangos avanzados
                      </span>
                      <p className="text-[#6B7280] text-xs">Basados en red total y niveles activos</p>
                    </div>
                    <Link
                      to="/escaleras"
                      className="inline-flex items-center gap-1.5 text-[#1A4E26] text-xs font-bold hover:underline"
                    >
                      Ver detalle <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div className="bg-[#1A4E26] rounded-2xl p-3 sm:p-5 relative overflow-hidden">
                    <div
                      className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.05] blur-3xl pointer-events-none"
                      style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
                    />
                    <div className="relative">
                      <StaircaseVisual ranks={t2Ranks} variant="dark" tier={2} />
                    </div>
                  </div>
                </div>

                {/* Cómo funciona: reseteo mensual */}
                <div className="bg-gradient-to-br from-[#FFFDF5] to-[#FFF8DC] border-2 border-[#D4AF37]/40 rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center text-[#0B2913] shadow-md">
                      <Repeat size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#92680A]">
                        Cómo funciona
                      </p>
                      <h4 className="font-heading font-bold text-lg text-[#111111] leading-tight">
                        Cada mes se reinicia el ciclo
                      </h4>
                    </div>
                  </div>

                  <ul className="space-y-3 text-[#374151] text-sm leading-relaxed">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={17} className="text-[#1A4E26] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#111111]">Activación mensual de $100:</strong> cada mes debes
                        mantener una compra mínima de $100 en un solo pedido. Sin esa activación, ese mes no
                        cobras comisiones binarias ni de niveles.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={17} className="text-[#1A4E26] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#111111]">El volumen binario se reinicia:</strong> al cierre
                        del ciclo mensual, los volúmenes acumulados en ambos lados (Izquierda y Derecha)
                        regresan a cero. El sobrante del lado mayor <em>no</em> se traslada al mes siguiente —
                        cada mes empiezas a balancear desde 0.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={17} className="text-[#1A4E26] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#111111]">Los rangos NO se pierden:</strong> los rangos
                        alcanzados son permanentes. Una vez subiste a Líder, Diamante o Fundador, ese rango es
                        tuyo para siempre — solo necesitas mantener tu activación mensual para seguir cobrando.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={17} className="text-[#1A4E26] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#111111]">Los premios físicos son acumulativos:</strong> cada
                        viaje, electrodoméstico, moto, carro y la casa se entregan <em>una sola vez</em> al
                        alcanzar el rango por primera vez. Conservas todos los anteriores al escalar al
                        siguiente.
                      </span>
                    </li>
                  </ul>

                  <div className="mt-5 bg-white/60 border border-[#D4AF37]/30 rounded-xl p-3 flex items-start gap-2">
                    <Info size={14} className="text-[#92680A] shrink-0 mt-0.5" />
                    <p className="text-[#92680A] text-xs leading-relaxed">
                      El reseteo mensual mantiene la red activa y honesta: premia a quien construye de forma
                      constante en vez de a quien acumula volumen estancado.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// SECTION: Binary system with tabs (binario / frontales)
// ───────────────────────────────────────────────────────────────

interface TreeNodeProps {
  label: string;
  sub?: string;
  variant?: 'root' | 'left' | 'right' | 'frontal' | 'neutral';
  small?: boolean;
}

function TreeBlock({ label, sub, variant = 'neutral', small = false }: TreeNodeProps) {
  const styles = {
    root: { bg: 'bg-gradient-to-br from-[#D4AF37] to-[#B8941F]', text: 'text-[#0B2913]', ring: 'ring-[#D4AF37]/40' },
    left: { bg: 'bg-gradient-to-br from-[#1A4E26] to-[#0F2E18]', text: 'text-white', ring: 'ring-[#1A4E26]/40' },
    right: { bg: 'bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8]', text: 'text-white', ring: 'ring-[#3B82F6]/40' },
    frontal: { bg: 'bg-gradient-to-br from-[#A855F7] to-[#7E22CE]', text: 'text-white', ring: 'ring-[#A855F7]/40' },
    neutral: { bg: 'bg-white border border-[#C8D8CB]', text: 'text-[#111111]', ring: 'ring-gray-300/30' },
  }[variant];
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col items-center justify-center rounded-xl text-center shadow-md ring-2 ${styles.bg} ${styles.text} ${styles.ring} ${
        small ? 'px-2.5 py-1.5 min-w-[58px]' : 'px-4 py-2.5 min-w-[80px]'
      }`}
    >
      <span className={`font-heading font-bold ${small ? 'text-[10px]' : 'text-xs'} leading-tight`}>{label}</span>
      {sub && <span className={`opacity-75 ${small ? 'text-[8px]' : 'text-[10px]'} mt-0.5`}>{sub}</span>}
    </motion.div>
  );
}

function Connector({ height = 16 }: { height?: number }) {
  return <div className="w-0.5 bg-gradient-to-b from-[#1A4E26]/40 to-[#1A4E26]/15" style={{ height }} />;
}

function BinaryTreeStrict() {
  return (
    <div className="flex flex-col items-center pt-4 pb-2 overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="flex flex-col items-center">
          <TreeBlock label="TÚ" sub="Patrocinador" variant="root" />
          <Connector />
          {/* Horizontal */}
          <div className="w-72 h-0.5 bg-gradient-to-r from-[#1A4E26]/40 via-[#1A4E26]/15 to-[#3B82F6]/40 my-0.5" />
          <div className="grid grid-cols-2 gap-32 -mt-0.5">
            {/* IZQUIERDA */}
            <div className="flex flex-col items-center">
              <Connector />
              <TreeBlock label="IZQUIERDA" sub="Lado A" variant="left" />
              <Connector />
              <div className="w-32 h-0.5 bg-[#1A4E26]/30 my-0.5" />
              <div className="flex gap-3 -mt-0.5">
                <div className="flex flex-col items-center"><Connector height={10} /><TreeBlock label="A1" small variant="left" /></div>
                <div className="flex flex-col items-center"><Connector height={10} /><TreeBlock label="A2" small variant="left" /></div>
              </div>
            </div>
            {/* DERECHA */}
            <div className="flex flex-col items-center">
              <Connector />
              <TreeBlock label="DERECHA" sub="Lado B" variant="right" />
              <Connector />
              <div className="w-32 h-0.5 bg-[#3B82F6]/30 my-0.5" />
              <div className="flex gap-3 -mt-0.5">
                <div className="flex flex-col items-center"><Connector height={10} /><TreeBlock label="B1" small variant="right" /></div>
                <div className="flex flex-col items-center"><Connector height={10} /><TreeBlock label="B2" small variant="right" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BinaryTreeFrontales() {
  return (
    <div className="flex flex-col items-center pt-4 pb-2 overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="flex flex-col items-center">
          <TreeBlock label="TÚ" sub="Patrocinador" variant="root" />
          <Connector />
          <div className="w-[440px] h-0.5 bg-gradient-to-r from-[#A855F7]/40 via-[#A855F7]/15 to-[#A855F7]/40 my-0.5" />
          <div className="flex gap-5 -mt-0.5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex flex-col items-center">
                <Connector />
                <TreeBlock label={`Frontal ${n}`} sub={`Rama ${n}`} variant="frontal" />
                <Connector />
                <div className="w-20 h-0.5 bg-[#A855F7]/30 my-0.5" />
                <div className="flex gap-1.5 -mt-0.5">
                  <div className="flex flex-col items-center">
                    <Connector height={10} />
                    <TreeBlock label="Izq" small variant="left" />
                  </div>
                  <div className="flex flex-col items-center">
                    <Connector height={10} />
                    <TreeBlock label="Der" small variant="right" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-4 font-medium">
            Cada frontal funciona como un binario independiente bajo TI
          </p>
        </div>
      </div>
    </div>
  );
}

function BinarySystem() {
  const [mode, setMode] = useState<'strict' | 'frontales'>('strict');

  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-[#1A4E26]/10 text-[#1A4E26] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Estructura de Red
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
            Sistema binario flexible
          </h2>
          <p className="text-[#6B7280] text-base max-w-2xl mx-auto">
            Cualquier distribuidor puede operar en modo binario estricto (Izquierda y Derecha)
            o abrir múltiples frontales para organizar su red en varias ramas paralelas.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-1.5">
            <button
              onClick={() => setMode('strict')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === 'strict'
                  ? 'bg-white text-[#1A4E26] shadow-md border border-[#C8D8CB]'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              <Split size={15} /> Binario clásico
            </button>
            <button
              onClick={() => setMode('frontales')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === 'frontales'
                  ? 'bg-white text-[#A855F7] shadow-md border border-[#C8D8CB]'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              <Network size={15} /> Frontales múltiples
            </button>
          </div>
        </div>

        {/* Visualization + explanation */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -12 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-[#F9FAFB] to-white border border-[#C8D8CB] rounded-3xl p-6 sm:p-8"
            >
              {mode === 'strict' ? <BinaryTreeStrict /> : <BinaryTreeFrontales />}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${mode}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {mode === 'strict' ? (
                <>
                  <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1A4E26] flex items-center justify-center text-white">
                        <Split size={16} />
                      </div>
                      <h3 className="font-heading font-bold text-lg text-[#111111]">Binario clásico</h3>
                    </div>
                    <p className="text-[#6B7280] text-sm leading-relaxed">
                      Cada distribuidor tiene exactamente <strong className="text-[#111111]">2 hijos directos</strong>:
                      uno a la izquierda (Lado A) y otro a la derecha (Lado B). Cuando los lados se llenan,
                      los nuevos afiliados se ubican en el siguiente nivel hacia abajo, formando una pirámide
                      perfecta hasta 14 niveles.
                    </p>
                  </div>
                  <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-2xl p-5">
                    <p className="text-[#1A4E26] text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Ventaja
                    </p>
                    <p className="text-[#374151] text-sm leading-relaxed">
                      Crecimiento exponencial automático: aunque solo afilies 2 personas, tu red completa
                      llega a más de 16.000 distribuidores en 14 niveles. <strong>Spillover</strong> beneficioso:
                      los afiliados de tus uplines también engordan tu red.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white border border-[#A855F7]/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#7E22CE] flex items-center justify-center text-white">
                        <Network size={16} />
                      </div>
                      <h3 className="font-heading font-bold text-lg text-[#111111]">
                        Frontales múltiples
                        <span className="ml-2 inline-flex items-center gap-1 bg-[#A855F7]/15 text-[#7E22CE] text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded">
                          Nuevo
                        </span>
                      </h3>
                    </div>
                    <p className="text-[#6B7280] text-sm leading-relaxed mb-3">
                      <strong className="text-[#111111]">Todos los distribuidores</strong> (no solo el admin)
                      pueden abrir <strong className="text-[#A855F7]">varios frontales</strong> bajo su nodo en
                      vez de limitarse al binario estricto. Cada frontal funciona como su propio árbol binario
                      con Izquierda y Derecha.
                    </p>
                    <div className="bg-[#FFF8DC] border border-[#D4AF37]/40 rounded-lg p-3 text-xs text-[#92680A]">
                      <p className="flex items-start gap-1.5">
                        <Info size={13} className="shrink-0 mt-0.5" />
                        <span>
                          Cuando se aprueba una afiliación, el admin elige si va al binario clásico o se cuelga
                          como un nuevo frontal. Esto se controla desde Admin → Solicitudes.
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-2xl p-5">
                    <p className="text-[#1A4E26] text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Cuándo usarlo
                    </p>
                    <ul className="space-y-1.5 text-[#374151] text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-[#A855F7] font-bold">·</span>
                        Cuando ambas posiciones Izq/Der ya están ocupadas y no quieres ahogar al nuevo afiliado en niveles bajos.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#A855F7] font-bold">·</span>
                        Cuando quieres organizar tu red en ramas independientes (ej: por ciudad o por equipo).
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#A855F7] font-bold">·</span>
                        Para distribuidores con alta capacidad de captación que prefieren paralelo a profundidad.
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// SECTION: Binary calculator (interactive)
// ───────────────────────────────────────────────────────────────

function BinaryCalculator() {
  const [izq, setIzq] = useState(2000);
  const [der, setDer] = useState(1500);

  const pareado = Math.min(izq, der);
  const comision = pareado * 0.5;
  const diferencia = Math.abs(izq - der);

  return (
    <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-[#0F2E18] via-[#1A4E26] to-[#0F2E18] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#D4AF37]/8 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-1.5 bg-white/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            <Calculator size={11} /> Calculadora interactiva
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-3">
            ¿Cuánto cobras con la comisión binaria?
          </h2>
          <p className="text-white/65 text-base max-w-2xl mx-auto">
            Mueve los sliders para simular el volumen de cada lado y mira tu comisión en tiempo real.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white/[0.06] backdrop-blur-sm border border-white/15 rounded-3xl p-6 sm:p-8"
        >
          {/* Sliders */}
          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            {/* Izquierda */}
            <div className="bg-white/[0.08] rounded-2xl p-5 border border-[#1A4E26]/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#1A4E26] flex items-center justify-center text-white">
                    <Split size={15} className="rotate-180" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/55 font-bold uppercase tracking-wider">Volumen</p>
                    <p className="font-heading font-bold text-base text-white">Lado Izquierdo</p>
                  </div>
                </div>
                <p className="font-heading font-black text-2xl text-white">${izq.toLocaleString('es-EC')}</p>
              </div>
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={izq}
                onChange={(e) => setIzq(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#1A4E26]"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>$0</span>
                <span>$5K</span>
                <span>$10K</span>
              </div>
            </div>

            {/* Derecha */}
            <div className="bg-white/[0.08] rounded-2xl p-5 border border-[#3B82F6]/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white">
                    <Split size={15} />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/55 font-bold uppercase tracking-wider">Volumen</p>
                    <p className="font-heading font-bold text-base text-white">Lado Derecho</p>
                  </div>
                </div>
                <p className="font-heading font-black text-2xl text-white">${der.toLocaleString('es-EC')}</p>
              </div>
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={der}
                onChange={(e) => setDer(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#3B82F6]"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>$0</span>
                <span>$5K</span>
                <span>$10K</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <motion.div
            key={`${izq}-${der}`}
            initial={{ scale: 0.98, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid sm:grid-cols-3 gap-4"
          >
            <div className="bg-white/[0.05] backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-white/55 text-[10px] font-bold uppercase tracking-wider mb-1">Pareado</p>
              <p className="font-heading font-black text-3xl text-white">
                ${pareado.toLocaleString('es-EC')}
              </p>
              <p className="text-white/45 text-[10px] mt-1">menor de los dos lados</p>
            </div>
            <div className="bg-white/[0.05] backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-white/55 text-[10px] font-bold uppercase tracking-wider mb-1">Sobrante</p>
              <p className="font-heading font-black text-3xl text-white/70">
                ${diferencia.toLocaleString('es-EC')}
              </p>
              <p className="text-white/45 text-[10px] mt-1">se mantiene al próximo ciclo</p>
            </div>
            <div className="bg-gradient-to-br from-[#D4AF37] to-[#92680A] rounded-xl p-4 text-center shadow-[0_8px_24px_-8px_rgba(212,175,55,0.6)]">
              <p className="text-[#3D2400]/85 text-[10px] font-bold uppercase tracking-wider mb-1">Tu comisión 50%</p>
              <p className="font-heading font-black text-3xl text-[#3D2400]">
                ${comision.toLocaleString('es-EC')}
              </p>
              <p className="text-[#3D2400]/85 text-[10px] mt-1">se paga al cierre del ciclo</p>
            </div>
          </motion.div>

          <p className="text-center text-white/55 text-xs mt-5">
            <Info size={11} className="inline mr-1" />
            Para activar tus comisiones, debes mantener una compra mensual ≥ $100 en un solo pedido.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// SECTION: Affiliation bonus (3 packages)
// ───────────────────────────────────────────────────────────────

function AffiliationBonus() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-[#F4F7F5]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-[#D4AF37]/15 text-[#92680A] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Bono de Afiliación · 40%
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
            Cobras el 40% del paquete de cada afiliado
          </h2>
          <p className="text-[#6B7280] text-base max-w-2xl mx-auto">
            Tu comisión depende del paquete que elija la persona que invitaste. Cuanto más alto el paquete,
            mayor el bono inmediato para ti.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4">
          {affiliatePackages.map((pkg, i) => {
            const comision = Math.round(pkg.precio * 0.4);
            return (
              <motion.div
                key={pkg.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className={`bg-white border-2 rounded-2xl overflow-hidden ${
                  pkg.destacado ? 'border-[#D4AF37]/60 shadow-[0_12px_40px_rgba(212,175,55,0.15)]' : 'border-[#C8D8CB]'
                }`}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Paquete</p>
                      <h3 className="font-heading font-bold text-xl text-[#111111]">{pkg.nombre.replace('Pack ', '')}</h3>
                    </div>
                    {pkg.destacado && (
                      <span className="bg-[#D4AF37] text-[#0B2913] text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[#9CA3AF] text-sm">Precio del paquete:</span>
                    <span className="font-heading font-bold text-[#111111] text-lg">${pkg.precio}</span>
                  </div>
                  <div className="border-t border-[#C8D8CB] my-4" />
                  <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-1">
                    Tu comisión (40%)
                  </p>
                  <p className="font-heading font-black text-4xl bg-gradient-to-br from-[#1A4E26] to-[#0F2E18] bg-clip-text text-transparent">
                    ${comision}
                  </p>
                  <p className="text-[#6B7280] text-xs mt-1">
                    por cada afiliado que se inscriba con el {pkg.nombre.replace('Pack ', 'pack ').toLowerCase()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// SECTION: Level commissions table with visual bars
// ───────────────────────────────────────────────────────────────

function LevelCommissions() {
  const max = Math.max(...levelCommissions.map((lc) => lc.porcentaje));

  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-[#A855F7]/10 text-[#7E22CE] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            14 Niveles de profundidad
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
            Comisiones por nivel
          </h2>
          <p className="text-[#6B7280] text-base max-w-2xl mx-auto">
            Cobras un porcentaje sobre los puntos generados por cada pedido en tu organización.
            El <strong className="text-[#1A4E26]">nivel 2 es el más rentable</strong> con 20%.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="bg-white border border-[#C8D8CB] rounded-2xl p-2 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
        >
          {levelCommissions.map((lc) => {
            const widthPct = (lc.porcentaje / max) * 100;
            const isTop = lc.nivel === 2;
            return (
              <motion.div
                key={lc.nivel}
                variants={fadeUp}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isTop ? 'bg-gradient-to-r from-[#EBF4ED] to-transparent' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                  isTop ? 'bg-gradient-to-br from-[#1A4E26] to-[#0F2E18] text-white shadow-md' : 'bg-[#F4F7F5] text-[#6B7280]'
                }`}>
                  {lc.nivel}
                </div>
                <div className="flex-1 relative">
                  <div className="h-7 bg-[#F4F7F5] rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${widthPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: lc.nivel * 0.04, ease: 'easeOut' }}
                      className={`h-full rounded-lg flex items-center justify-end pr-2 ${
                        isTop
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#1A4E26]'
                          : 'bg-gradient-to-r from-[#A855F7]/60 to-[#7E22CE]/60'
                      }`}
                    >
                      {widthPct > 20 && (
                        <span className="text-white text-xs font-bold">{lc.porcentaje}%</span>
                      )}
                    </motion.div>
                  </div>
                  {widthPct <= 20 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#111111] text-xs font-bold">
                      {lc.porcentaje}%
                    </span>
                  )}
                </div>
                <div className="hidden sm:block w-20 text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Nivel</p>
                  <p className={`text-sm font-bold ${isTop ? 'text-[#1A4E26]' : 'text-[#111111]'}`}>
                    {lc.nivel}
                    {isTop && <span className="ml-1 text-[9px] text-[#D4AF37]">★</span>}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-[#9CA3AF] text-sm mt-5"
        >
          <Repeat size={13} className="inline mr-1 text-[#1A4E26]" />
          Para mantener tus comisiones de nivel activas debes comprar al menos
          <strong className="text-[#1A4E26]"> $100 en un solo pedido cada mes</strong>.
        </motion.p>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// SECTION: Exponential growth (animated)
// ───────────────────────────────────────────────────────────────

function ExponentialGrowth() {
  const niveles = [
    { nivel: 1, personas: 2 },
    { nivel: 2, personas: 4 },
    { nivel: 3, personas: 8 },
    { nivel: 4, personas: 16 },
    { nivel: 5, personas: 32 },
    { nivel: 6, personas: 64 },
    { nivel: 7, personas: 128 },
    { nivel: 8, personas: 256 },
    { nivel: 9, personas: 512 },
    { nivel: 10, personas: 1024 },
    { nivel: 11, personas: 2048 },
    { nivel: 12, personas: 4096 },
    { nivel: 13, personas: 8192 },
    { nivel: 14, personas: 16384 },
  ];
  const total = niveles.reduce((s, n) => s + n.personas, 0);

  return (
    <section className="py-20 px-4 sm:px-6 bg-[#F4F7F5]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-[#3B82F6]/10 text-[#1D4ED8] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            <TrendingUp size={11} className="inline mr-1" /> Efecto multiplicador
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
            Si cada persona invita a 2…
          </h2>
          <p className="text-[#6B7280] text-base">
            En 14 niveles tu red tiene más de <strong className="text-[#1A4E26]">32 mil personas</strong>.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
        >
          {niveles.map((row, i) => {
            const intensity = i / (niveles.length - 1);
            const bg = `linear-gradient(135deg, hsl(${145 - intensity * 20} 50% ${65 - intensity * 30}%) 0%, hsl(${145 - intensity * 20} 55% ${45 - intensity * 25}%) 100%)`;
            return (
              <motion.div
                key={row.nivel}
                variants={fadeUp}
                whileHover={{ y: -4, scale: 1.04 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl p-4 text-center text-white shadow-md"
                style={{ background: bg }}
              >
                <p className="text-white/75 text-[10px] uppercase tracking-wider mb-1 font-bold">Nivel {row.nivel}</p>
                <p className="font-heading font-black text-xl sm:text-2xl">
                  <CountUp to={row.personas} />
                </p>
                <p className="text-white/65 text-[9px] mt-0.5">personas</p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-8 bg-gradient-to-r from-[#1A4E26] to-[#0F2E18] rounded-2xl p-6 sm:p-7 text-center"
        >
          <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-2">Total acumulado en 14 niveles</p>
          <p className="font-heading font-black text-5xl sm:text-6xl text-white">
            <CountUp to={total} duration={2} />
            <span className="text-[#D4AF37]"> personas</span>
          </p>
          <p className="text-white/65 text-sm mt-3">
            Por supuesto que esto es matemática teórica. En el mundo real, la mayoría de tu red la construyen
            las personas que tú directamente impulsas con su capacitación y soporte.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// SECTION: Final CTA
// ───────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-cta-gradient relative overflow-hidden">
      <div className="absolute top-0 right-10 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#FFDD00]/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D4AF37]/20 mb-5"
        >
          <Crown size={28} className="text-[#D4AF37]" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-heading font-black text-3xl sm:text-5xl text-white leading-tight mb-5"
        >
          Tu plan multinivel,
          <br />
          <span className="bg-gradient-to-r from-[#FFE066] to-[#D4AF37] bg-clip-text text-transparent">tu libertad financiera</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-white/75 text-base sm:text-lg mb-9 max-w-xl mx-auto leading-relaxed"
        >
          6 fuentes de ingreso, sistema flexible con frontales múltiples, comisiones por 14 niveles
          y bonos físicos por tramo: viajes, carro y casa.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3"
        >
          <Link
            to="/registro"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#D4AF37] text-[#0B2913] font-bold hover:bg-[#E8C94A] transition-all shadow-[0_8px_28px_rgba(212,175,55,0.4)]"
          >
            <Zap size={16} /> Empezar ahora <ArrowRight size={16} />
          </Link>
          <Link
            to="/escaleras"
            className="inline-flex items-center gap-2 px-7 py-4 rounded-xl border border-white/30 text-white font-bold hover:bg-white/10 transition-all"
          >
            <Trophy size={16} /> Ver la escalera completa
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// PAGE
// ───────────────────────────────────────────────────────────────

export default function Plan() {
  useSEO({
    title: 'Plan Multinivel — Sumak Vida Ecuador',
    description:
      'Plan de compensación SUMAK con 6 fuentes de ingreso: venta directa al 50%, bono de afiliación del 40%, binario con frontales múltiples, 14 niveles, bonos de rango y premios físicos por tramo (viajes, carro y casa).',
    url: '/plan-multinivel',
  });

  return (
    <div className="bg-white">
      <Hero />
      <IncomeStreams />
      <BinarySystem />
      <BinaryCalculator />
      <AffiliationBonus />
      <LevelCommissions />
      <ExponentialGrowth />
      <FinalCTA />
    </div>
  );
}
