import { Link } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { Leaf, Users, Shield, ArrowRight, Star } from 'lucide-react';
import { products } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const featuredSlugs = [
  'te-extractos-de-la-vida',
  'regen-24',
  'moringa-en-polvo',
  'colageno-hidrolizado',
];
const featuredProducts = products.filter((p) => featuredSlugs.includes(p.slug));

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
    <div className="bg-[#0F0F0F]">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero-gradient pt-16">
        <div className="absolute top-1/4 right-[8%] w-72 h-72 rounded-full bg-[#00A86B] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-[5%] w-56 h-56 rounded-full bg-[#00A86B] opacity-[0.05] blur-2xl pointer-events-none" />
        <div className="absolute top-[15%] left-[20%] w-32 h-32 rounded-full bg-[#D4AF37] opacity-[0.04] blur-2xl pointer-events-none" />

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#00A86B]"
            style={{
              width: 4 + (i % 3) * 3,
              height: 4 + (i % 3) * 3,
              left: `${12 + i * 13}%`,
              top: `${25 + (i % 3) * 18}%`,
              opacity: 0.18,
            }}
            animate={{ y: [0, -18, 0], opacity: [0.18, 0.35, 0.18] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          />
        ))}

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#00A86B] text-sm font-semibold uppercase tracking-[0.3em] mb-5"
          >
            Sumak Jambi — Laboratorio Ancestral
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-[#F0F0F0] leading-tight mb-6"
          >
            Naturaleza que Nutre,{' '}
            <span className="text-[#00A86B]">Bienestar</span> que Transforma
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="text-[#AAAAAA] text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Productos 100% naturales con más de 15 años de experiencia en medicina andina
            ancestral. Cuida tu salud y construye tu libertad financiera.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#00A86B] text-white font-bold text-base hover:bg-[#008F5A] shadow-[0_0_30px_rgba(0,168,107,0.35)] transition-all duration-200"
            >
              Únete Ahora <ArrowRight size={18} />
            </Link>
            <Link
              to="/productos"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#2E2E2E] text-[#F0F0F0] font-semibold text-base hover:border-[#00A86B] hover:text-[#00A86B] transition-all duration-200"
            >
              Conoce Nuestros Productos
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-[#2E2E2E] flex items-start justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-[#1A1A1A] border-y border-[#2E2E2E] py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-[#2E2E2E]">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <p className="font-heading font-bold text-3xl text-[#00A86B] mb-1">{stat.value}</p>
                <p className="text-[#888888] text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-[#00A86B] text-sm font-semibold uppercase tracking-widest mb-3">
              Fundamentos
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-4">
              Nuestros Pilares
            </motion.h2>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
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
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8 hover:border-[#00A86B]/40 hover:shadow-[0_0_24px_rgba(0,168,107,0.1)] transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B] mb-5">
                  {pillar.icon}
                </div>
                <h3 className="font-heading font-bold text-lg text-[#F0F0F0] mb-3">{pillar.title}</h3>
                <p className="text-[#888888] text-sm leading-relaxed">{pillar.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-[#00A86B] text-sm font-semibold uppercase tracking-widest mb-3">
              Catálogo
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-4">
              Productos Destacados
            </motion.h2>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {featuredProducts.map((product) => (
              <motion.div
                key={product.codigo}
                variants={fadeUp}
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6 flex flex-col hover:border-[#00A86B]/40 hover:shadow-[0_0_20px_rgba(0,168,107,0.1)] transition-all duration-300"
              >
                <div className="w-full h-32 rounded-xl bg-gradient-to-br from-[#1A2A20] to-[#0F1A14] flex items-center justify-center mb-5 border border-[#2E2E2E]">
                  <Leaf size={40} className="text-[#00A86B] opacity-60" />
                </div>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-[#00A86B] bg-[#00A86B]/10 border border-[#00A86B]/20 px-2.5 py-1 rounded-full mb-3 w-fit">
                  {product.categoria}
                </span>
                <h3 className="font-heading font-bold text-[#F0F0F0] text-base mb-2 leading-tight">{product.nombre}</h3>
                <p className="text-[#888888] text-xs leading-relaxed mb-4 flex-grow">{product.descripcion}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-[#F0F0F0] text-lg">${product.pvp.toFixed(2)}</span>
                  <Link
                    to={`/productos/${product.slug}`}
                    className="text-[#00A86B] text-xs font-semibold hover:underline"
                  >
                    Ver Más →
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#2E2E2E] text-[#F0F0F0] font-semibold hover:border-[#00A86B] hover:text-[#00A86B] transition-all duration-200"
            >
              Ver todos los productos <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Business Opportunity */}
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
                className="inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-white text-[#00A86B] font-bold text-base hover:bg-white/90 transition-all duration-200 shadow-lg"
              >
                Únete Ahora <ArrowRight size={18} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Motivational Quote */}
      <section className="py-20 px-4 sm:px-6 bg-[#0F0F0F]">
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
            <p className="text-[#888888] text-sm font-medium">
              Dr. Luis Paredes &nbsp;·&nbsp; Gerente General, Sumak Vida Ecuador S.A.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
