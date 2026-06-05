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
      <section className="relative min-h-screen overflow-hidden bg-hero-gradient pt-16">
        <div className="absolute top-1/4 right-[8%] w-96 h-96 rounded-full bg-[#1A4E26] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 left-[3%] w-64 h-64 rounded-full bg-[#1A4E26] opacity-[0.04] blur-2xl pointer-events-none" />
        <div className="absolute top-[20%] left-[30%] w-40 h-40 rounded-full bg-[#D4AF37] opacity-[0.04] blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-20 items-center w-full py-24">

            {/* Left: Text content */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-[#1A4E26] text-sm font-semibold uppercase tracking-[0.3em] mb-5"
              >
                Sumak Jambi — Laboratorio Ancestral
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1 }}
                className="font-heading font-bold text-4xl sm:text-5xl xl:text-6xl text-[#111111] leading-tight mb-6"
              >
                Naturaleza que Nutre,{' '}
                <span className="text-[#1A4E26]">Bienestar</span> que Transforma
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2 }}
                className="text-[#6B7280] text-lg sm:text-xl max-w-xl mb-10 leading-relaxed"
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
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-base hover:bg-[#163F1E] shadow-[0_0_30px_rgba(26,78,38,0.35)] transition-all duration-200"
                >
                  Únete Ahora <ArrowRight size={18} />
                </Link>
                <Link
                  to="/productos"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#C8D8CB] text-[#111111] font-semibold text-base hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
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
                  <div key={badge} className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-[#1A4E26] flex-shrink-0" />
                    <span className="text-[#6B7280] text-sm">{badge}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Product collage (lg+ only) */}
            <div className="relative hidden lg:flex items-center justify-center h-[540px]">
              {/* Decorative rings */}
              <div className="absolute w-80 h-80 rounded-full border-2 border-[#1A4E26]/10 pointer-events-none" />
              <div className="absolute w-[430px] h-[430px] rounded-full border border-[#D4AF37]/10 pointer-events-none" />
              <div className="absolute w-64 h-64 rounded-full bg-[#1A4E26]/[0.05] blur-3xl pointer-events-none" />

              {/* Center large — REGEN 24 */}
              <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-20">
                <motion.div
                  animate={{ y: [0, -22, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-56 h-56 bg-white rounded-3xl shadow-[0_24px_60px_rgba(26,78,38,0.2)] border border-[#1A4E26]/10 flex items-center justify-center p-5"
                >
                  <img src="/products/regen-24.png" alt="REGEN 24" className="w-full h-full object-contain drop-shadow-md" />
                </motion.div>
              </div>

              {/* Top left — Té */}
              <div className="absolute top-[4%] left-[3%] z-10">
                <motion.div
                  animate={{ y: [0, -14, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  className="w-[142px] h-[142px] bg-white rounded-2xl shadow-[0_16px_44px_rgba(26,78,38,0.15)] border border-[#1A4E26]/10 flex items-center justify-center p-3"
                >
                  <img src="/products/te-extractos-de-la-vida.png" alt="Té Extractos de la Vida" className="w-full h-full object-contain drop-shadow-sm" />
                </motion.div>
              </div>

              {/* Top right — Colágeno */}
              <div className="absolute top-[4%] right-[3%] z-10">
                <motion.div
                  animate={{ y: [0, -18, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                  className="w-[142px] h-[142px] bg-white rounded-2xl shadow-[0_16px_44px_rgba(26,78,38,0.15)] border border-[#1A4E26]/10 flex items-center justify-center p-3"
                >
                  <img src="/products/colageno-hidrolizado.png" alt="Colágeno Hidrolizado" className="w-full h-full object-contain drop-shadow-sm" />
                </motion.div>
              </div>

              {/* Bottom left — Bebida Andina */}
              <div className="absolute bottom-[6%] left-[8%] z-10">
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  className="w-[124px] h-[124px] bg-white rounded-2xl shadow-[0_14px_40px_rgba(26,78,38,0.13)] border border-[#1A4E26]/10 flex items-center justify-center p-3"
                >
                  <img src="/products/bebida-andina.png" alt="Bebida Andina" className="w-full h-full object-contain drop-shadow-sm" />
                </motion.div>
              </div>

              {/* Bottom right — Fibramak */}
              <div className="absolute bottom-[8%] right-[6%] z-10">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 2.0 }}
                  className="w-[114px] h-[114px] bg-white rounded-2xl shadow-[0_14px_40px_rgba(26,78,38,0.13)] border border-[#1A4E26]/10 flex items-center justify-center p-3"
                >
                  <img src="/products/fibramak-plus.png" alt="Fibramak Plus" className="w-full h-full object-contain drop-shadow-sm" />
                </motion.div>
              </div>

              {/* Floating dots */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-[#1A4E26] pointer-events-none"
                  style={{
                    width: 4 + (i % 3) * 2,
                    height: 4 + (i % 3) * 2,
                    left: `${8 + i * 11}%`,
                    top: `${18 + (i % 5) * 14}%`,
                    opacity: 0.16,
                  }}
                  animate={{ y: [0, -10, 0], opacity: [0.16, 0.30, 0.16] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
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
          <div className="w-6 h-10 rounded-full border-2 border-[#C8D8CB] flex items-start justify-center pt-2">
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
