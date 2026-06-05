import { Link } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { Leaf, Users, Shield, ArrowRight, Star, CheckCircle } from 'lucide-react';
import { products } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const featuredSlugs = ['regen-24', 'te-extractos-de-la-vida', 'colageno-hidrolizado'];
const featuredProducts = products.filter((p) => featuredSlugs.includes(p.slug));

const mainProducts = products.filter(
  (p) => !['accesorios', 'material'].includes(p.categoriaKey)
);

const pillars = [
  {
    icon: <Leaf size={28} />,
    title: 'Bienestar Natural',
    desc: 'Productos que cuidan tu salud, formulados con ingredientes de origen natural y orgánico.',
  },
  {
    icon: <Users size={28} />,
    title: 'Crecimiento Colaborativo',
    desc: 'Un modelo de negocio que potencia el éxito mutuo a través de la red de distribuidores.',
  },
  {
    icon: <Shield size={28} />,
    title: 'Calidad y Confianza',
    desc: 'Garantizamos excelencia en cada uno de nuestros productos, elaborados bajo altos estándares.',
  },
];

const stats = [
  { value: '15+', label: 'Años de Experiencia' },
  { value: '15', label: 'Productos Naturales' },
  { value: '100%', label: 'Natural y Orgánico' },
  { value: 'Red', label: 'Binaria Global' },
];

export default function Home() {
  return (
    <div className="bg-white">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden pt-16" style={{ background: 'linear-gradient(135deg, #f0f7f2 0%, #e8f4eb 40%, #f5f0e8 100%)' }}>

        {/* Background atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #1A4E26 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
          <div className="absolute top-[30%] left-[45%] w-[300px] h-[300px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #1A4E26 0%, transparent 70%)' }} />
          {/* Light rays */}
          <div className="absolute top-0 right-[20%] w-[2px] h-full opacity-5" style={{ background: 'linear-gradient(to bottom, transparent, #1A4E26 40%, transparent)' }} />
          <div className="absolute top-0 right-[35%] w-[1px] h-full opacity-5" style={{ background: 'linear-gradient(to bottom, transparent, #D4AF37 50%, transparent)' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 items-center w-full py-24">

            {/* Left: Text content */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-[#1A4E26]/10 border border-[#1A4E26]/20 rounded-full px-4 py-1.5 mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-[#1A4E26] animate-pulse" />
                <span className="text-[#1A4E26] text-sm font-semibold tracking-wide">Sumak Jambi — Laboratorio Ancestral</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1 }}
                className="font-heading font-bold text-4xl sm:text-5xl xl:text-6xl text-[#111111] leading-tight mb-6"
              >
                Naturaleza que{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-[#1A4E26]">Nutre</span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-[#D4AF37]/20 rounded-sm -z-0" />
                </span>
                ,{' '}
                <br className="hidden sm:block" />
                <span className="text-[#1A4E26]">Bienestar</span> que Transforma
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2 }}
                className="text-[#4B5563] text-lg sm:text-xl max-w-xl mb-10 leading-relaxed"
              >
                Productos 100% naturales con más de 15 años de experiencia en medicina andina
                ancestral. Cuida tu salud y construye tu libertad financiera.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 mb-10"
              >
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-base hover:bg-[#163F1E] transition-all duration-200"
                  style={{ boxShadow: '0 8px 32px rgba(26,78,38,0.45), 0 2px 8px rgba(26,78,38,0.3)' }}
                >
                  Únete Ahora <ArrowRight size={18} />
                </Link>
                <Link
                  to="/productos"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/70 backdrop-blur-sm border border-[#1A4E26]/20 text-[#1A4E26] font-semibold text-base hover:bg-white hover:border-[#1A4E26]/40 transition-all duration-200 shadow-sm"
                >
                  Ver Productos
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-wrap gap-5"
              >
                {['100% Natural', '15+ Años de Experiencia', 'Red Global Binaria'].map((badge) => (
                  <div key={badge} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-[#1A4E26]/15 rounded-full px-3 py-1.5">
                    <CheckCircle size={13} className="text-[#1A4E26] flex-shrink-0" />
                    <span className="text-[#374151] text-xs font-medium">{badge}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: 2 hero products — large, clean PNG, dramatic */}
            <div className="relative hidden lg:flex items-center justify-center h-[580px]">

              {/* Ambient glow base */}
              <div className="absolute w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(26,78,38,0.14) 0%, transparent 65%)' }} />

              {/* ── Product 1: REGEN 24 — main, large, left-center ── */}
              <div className="absolute left-[4%] top-1/2 -translate-y-1/2 z-20">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  <motion.div
                    animate={{ y: [0, -18, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative"
                  >
                    {/* Strong green glow */}
                    <div className="absolute inset-[-15%] rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(26,78,38,0.6) 0%, transparent 70%)' }} />
                    {/* Soft light halo */}
                    <div className="absolute inset-[-5%] rounded-full blur-xl opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.5) 0%, transparent 60%)' }} />
                    <img
                      src="/products/regen-24.png"
                      alt="REGEN 24"
                      className="w-[310px] h-[310px] object-contain relative z-10"
                      style={{ filter: 'drop-shadow(0 40px 50px rgba(26,78,38,0.40)) drop-shadow(0 10px 20px rgba(0,0,0,0.22))' }}
                    />
                  </motion.div>
                  {/* Badge under main product */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 0.5 }}
                    className="mt-3 mx-auto w-fit bg-[#1A4E26] rounded-xl px-4 py-2 shadow-lg"
                  >
                    <p className="text-[10px] text-white/70 font-medium text-center">Más vendido</p>
                    <p className="text-sm font-bold text-white text-center">REGEN 24</p>
                  </motion.div>
                </motion.div>
              </div>

              {/* ── Product 2: Colágeno — secondary, right, offset ── */}
              <div className="absolute right-[2%] top-[12%] z-10">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.55 }}
                >
                  <motion.div
                    animate={{ y: [0, -22, 0] }}
                    transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                    className="relative"
                  >
                    {/* Green glow */}
                    <div className="absolute inset-[-20%] rounded-full blur-2xl opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(26,78,38,0.5) 0%, transparent 70%)' }} />
                    <img
                      src="/products/colageno-hidrolizado.png"
                      alt="Colágeno Hidrolizado"
                      className="w-[220px] h-[220px] object-contain relative z-10"
                      style={{ filter: 'drop-shadow(0 28px 36px rgba(26,78,38,0.32)) drop-shadow(0 6px 14px rgba(0,0,0,0.18))' }}
                    />
                  </motion.div>
                  {/* Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="mt-3 mx-auto w-fit bg-white/90 backdrop-blur-sm border border-[#1A4E26]/20 rounded-xl px-4 py-2 shadow-md"
                  >
                    <p className="text-[10px] text-[#6B7280] font-medium text-center">100% Natural</p>
                    <p className="text-sm font-bold text-[#1A4E26] text-center">Colágeno</p>
                  </motion.div>
                </motion.div>
              </div>

              {/* Floating sparkle dots */}
              {[
                { size: 6, left: '48%', top: '10%', delay: 0, color: '#D4AF37' },
                { size: 4, left: '18%', top: '15%', delay: 0.7, color: '#1A4E26' },
                { size: 5, left: '72%', top: '75%', delay: 1.3, color: '#1A4E26' },
                { size: 4, left: '55%', top: '88%', delay: 0.4, color: '#D4AF37' },
                { size: 3, left: '85%', top: '45%', delay: 1.9, color: '#1A4E26' },
              ].map((dot, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: dot.size, height: dot.size, left: dot.left, top: dot.top, background: dot.color }}
                  animate={{ scale: [1, 2, 1], opacity: [0.25, 0.6, 0.25] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: dot.delay }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-[#1A4E26]/20 flex items-start justify-center pt-2 bg-white/30 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1A4E26]" />
          </div>
        </motion.div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section className="bg-[#F4F7F5] border-y border-[#C8D8CB] py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-[#C8D8CB]">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <p className="font-heading font-bold text-3xl text-[#1A4E26] mb-1">{stat.value}</p>
                <p className="text-[#6B7280] text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ──────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-[#1A4E26] text-sm font-semibold uppercase tracking-widest mb-3">
              Catálogo
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-4">
              Productos Destacados
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#6B7280] max-w-xl mx-auto text-base">
              Formulados con plantas medicinales andinas, cada producto está diseñado para nutrir y transformar.
            </motion.p>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#1A4E26] rounded-full mx-auto mt-5" />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-8"
          >
            {featuredProducts.map((product) => (
              <motion.div
                key={product.codigo}
                variants={fadeUp}
                className="bg-white rounded-3xl overflow-hidden border border-[#C8D8CB] hover:shadow-[0_8px_40px_rgba(26,78,38,0.13)] hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="h-60 bg-gradient-to-br from-[#EBF4ED] to-[#D5ECD9] relative flex items-center justify-center p-6 overflow-hidden">
                  {product.imagen ? (
                    <img
                      src={product.imagen}
                      alt={product.nombre}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
                    />
                  ) : (
                    <Leaf size={56} className="text-[#1A4E26] opacity-30" />
                  )}
                  <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider text-[#1A4E26] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-[#1A4E26]/20">
                    {product.categoria}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-heading font-bold text-[#111111] text-xl mb-2 leading-tight">{product.nombre}</h3>
                  <p className="text-[#6B7280] text-sm leading-relaxed mb-6">{product.descripcion}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#9CA3AF] mb-0.5">Precio Público</p>
                      <p className="font-bold text-[#111111] text-2xl">${product.pvp.toFixed(2)}</p>
                    </div>
                    <Link
                      to={`/productos/${product.slug}`}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white text-sm font-semibold hover:bg-[#163F1E] transition-all"
                    >
                      Ver Más <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-12">
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#C8D8CB] text-[#111111] font-semibold hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
            >
              Ver todos los productos <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── All Products Dark Showcase ────────────────────────── */}
      <section className="py-24 bg-[#1A4E26] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white opacity-[0.02] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#D4AF37] opacity-[0.05] blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white opacity-[0.01] blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">
              Nuestro Catálogo
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4">
              Naturaleza en Cada Producto
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/65 max-w-2xl mx-auto text-base leading-relaxed">
              Fórmulas ancestrales andinas con ingredientes 100% naturales, diseñadas para nutrir
              tu cuerpo y transformar tu bienestar desde adentro.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
          >
            {mainProducts.map((product) => (
              <motion.div key={product.codigo} variants={fadeUp}>
                <Link
                  to={`/productos/${product.slug}`}
                  className="group block bg-white/[0.07] hover:bg-white/[0.14] rounded-2xl p-4 border border-white/15 hover:border-[#D4AF37]/50 transition-all duration-300"
                >
                  <div className="h-24 sm:h-28 flex items-center justify-center mb-3 overflow-hidden">
                    {product.imagen ? (
                      <img
                        src={product.imagen}
                        alt={product.nombre}
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-lg"
                      />
                    ) : (
                      <Leaf size={36} className="text-white/35" />
                    )}
                  </div>
                  <p className="text-white text-center text-[11px] font-semibold leading-tight mb-1 line-clamp-2">{product.nombre}</p>
                  <p className="text-[#D4AF37] text-center text-[11px] font-medium">${product.pvp.toFixed(2)}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-[#1A4E26] font-bold hover:bg-white/90 transition-all shadow-lg"
            >
              Ver Catálogo Completo <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Pillars ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-[#1A4E26] text-sm font-semibold uppercase tracking-widest mb-3">
              Fundamentos
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-4">
              Nuestros Pilares
            </motion.h2>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#1A4E26] rounded-full mx-auto" />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {pillars.map((pillar) => (
              <motion.div
                key={pillar.title}
                variants={fadeUp}
                className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-8 hover:border-[#1A4E26]/40 hover:shadow-[0_0_24px_rgba(26,78,38,0.1)] transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-[#1A4E26]/10 flex items-center justify-center text-[#1A4E26] mb-5">
                  {pillar.icon}
                </div>
                <h3 className="font-heading font-bold text-lg text-[#111111] mb-3">{pillar.title}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{pillar.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Business Opportunity ──────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-cta-gradient">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.p variants={fadeUp} className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-3">
              Oportunidad de Negocio
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-white mb-5">
              Tu Oportunidad de Negocio
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/80 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Con SUMAK puedes generar ingresos mientras ayudas a otros a mejorar su salud.
              Nuestro modelo de red binaria te permite construir un negocio sólido desde el primer día.
            </motion.p>

            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
              {[
                { val: '$50', label: 'Bono por afiliación directa' },
                { val: '50%', label: 'Descuento en todos los productos' },
                { val: '14', label: 'Niveles de comisiones' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20"
                >
                  <p className="font-heading font-bold text-3xl text-white mb-1">{item.val}</p>
                  <p className="text-white/70 text-sm">{item.label}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link
                to="/registro"
                className="inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-white text-[#1A4E26] font-bold text-base hover:bg-white/90 transition-all duration-200 shadow-lg"
              >
                Únete Ahora <ArrowRight size={18} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Quote ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-[#F4F7F5]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <Star size={28} className="text-[#D4AF37] mx-auto mb-6 opacity-80" />
            <blockquote className="font-heading font-bold text-2xl sm:text-3xl text-gold-shimmer leading-relaxed mb-6">
              "El éxito de tu red es el éxito de todos. En SUMAK crecemos juntos."
            </blockquote>
            <p className="text-[#6B7280] text-sm font-medium">
              Dr. Luis Paredes &nbsp;·&nbsp; Gerente General, Sumak Vida Ecuador S.A.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
