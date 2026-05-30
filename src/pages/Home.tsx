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
    <div className="bg-white">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero-gradient pt-16">
        <div className="absolute top-1/4 right-[8%] w-72 h-72 rounded-full bg-[#1A4E26] opacity-[0.08] blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-[5%] w-56 h-56 rounded-full bg-[#1A4E26] opacity-[0.05] blur-2xl pointer-events-none" />
        <div className="absolute top-[15%] left-[20%] w-32 h-32 rounded-full bg-[#D4AF37] opacity-[0.04] blur-2xl pointer-events-none" />

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#1A4E26]"
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
            className="text-[#1A4E26] text-sm font-semibold uppercase tracking-[0.3em] mb-5"
          >
            Sumak Jambi — Laboratorio Ancestral
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-[#111111] leading-tight mb-6"
          >
            Naturaleza que Nutre,{' '}
            <span className="text-[#1A4E26]">Bienestar</span> que Transforma
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="text-[#6B7280] text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
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
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-base hover:bg-[#163F1E] shadow-[0_0_30px_rgba(26,78,38,0.35)] transition-all duration-200"
            >
              Únete Ahora <ArrowRight size={18} />
            </Link>
            <Link
              to="/productos"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#C8D8CB] text-[#111111] font-semibold text-base hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
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
          <div className="w-6 h-10 rounded-full border-2 border-[#C8D8CB] flex items-start justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1A4E26]" />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
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

      {/* Featured Products */}
      <section className="py-20 px-4 sm:px-6 bg-[#F4F7F5]">
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
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#1A4E26] rounded-full mx-auto" />
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
                className="bg-white border border-[#C8D8CB] rounded-2xl p-6 flex flex-col hover:border-[#1A4E26]/40 hover:shadow-[0_0_20px_rgba(26,78,38,0.1)] transition-all duration-300"
              >
                <div className="w-full h-32 rounded-xl bg-gradient-to-br from-[#EBF4ED] to-[#D5ECD9] flex items-center justify-center mb-5 border border-[#C8D8CB]">
                  <Leaf size={40} className="text-[#1A4E26] opacity-60" />
                </div>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-[#1A4E26] bg-[#1A4E26]/10 border border-[#1A4E26]/20 px-2.5 py-1 rounded-full mb-3 w-fit">
                  {product.categoria}
                </span>
                <h3 className="font-heading font-bold text-[#111111] text-base mb-2 leading-tight">{product.nombre}</h3>
                <p className="text-[#6B7280] text-xs leading-relaxed mb-4 flex-grow">{product.descripcion}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-[#111111] text-lg">${product.pvp.toFixed(2)}</span>
                  <Link
                    to={`/productos/${product.slug}`}
                    className="text-[#1A4E26] text-xs font-semibold hover:underline"
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
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#C8D8CB] text-[#111111] font-semibold hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
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
                className="inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-white text-[#1A4E26] font-bold text-base hover:bg-white/90 transition-all duration-200 shadow-lg"
              >
                Únete Ahora <ArrowRight size={18} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Motivational Quote */}
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
