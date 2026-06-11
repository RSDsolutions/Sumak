import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  Leaf, Users, Shield, ArrowRight, Star, CheckCircle, ShoppingBag,
  Sparkles, Heart, Award, TrendingUp, Truck, Lock,
} from 'lucide-react';
import { products, categoryFilters } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── Hero carousel — productos destacados que rotan automáticamente ──
const heroCarouselSlugs = [
  'regen-24',
  'te-extractos-de-la-vida',
  'colon-renova',
  'colageno-hidrolizado',
  'formula-1000',
];
const heroProducts = heroCarouselSlugs
  .map((s) => products.find((p) => p.slug === s)!)
  .filter(Boolean);

const bestsellers = products.filter((p) => p.bestseller);
const novelties = products.filter((p) => p.nuevo);

// ── Showcase categories ──
const showcaseCategories = categoryFilters
  .filter((c) => !['todos', 'material'].includes(c.key))
  .map((cat) => {
    const sample = products.find((p) => p.categoriaKey === cat.key && p.imagen);
    const count = products.filter((p) => p.categoriaKey === cat.key).length;
    return { ...cat, sample, count };
  });

// ── Pillars ──
const pillars = [
  {
    icon: <Leaf size={22} />,
    title: 'Bienestar Natural',
    desc: 'Plantas medicinales seleccionadas y procesos artesanales en nuestro laboratorio Sumak Jambi.',
  },
  {
    icon: <Users size={22} />,
    title: 'Crecimiento Colaborativo',
    desc: 'Un modelo binario diseñado para el éxito mutuo de toda nuestra red de distribuidores.',
  },
  {
    icon: <Shield size={22} />,
    title: 'Calidad Garantizada',
    desc: 'Cada producto elaborado bajo estrictos estándares y con respaldo de 15+ años de experiencia.',
  },
];

const stats = [
  { value: '15+', label: 'Años de Experiencia' },
  { value: '15', label: 'Productos Naturales' },
  { value: '100%', label: 'Natural y Orgánico' },
  { value: 'Red', label: 'Binaria Global' },
];

const trustBadges = [
  { icon: <Award size={18} />, label: 'Calidad certificada' },
  { icon: <Truck size={18} />, label: 'Envíos a todo Ecuador' },
  { icon: <Lock size={18} />, label: 'Compra segura' },
  { icon: <Heart size={18} />, label: '+5.000 clientes felices' },
];

export default function Home() {
  // Carousel del hero — cambia de producto cada 4 segundos
  const [heroIndex, setHeroIndex] = useState(0);
  const heroProduct = heroProducts[heroIndex] ?? heroProducts[0];

  useEffect(() => {
    if (heroProducts.length < 2) return;
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroProducts.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white">

      {/* ──────────────────────────────────────────────────────────
         HERO — Editorial dark premium with featured product card
      ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16" style={{ background: 'linear-gradient(135deg, #0B2913 0%, #133A1E 50%, #0F2E18 100%)' }}>

        {/* Topographic pattern texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 1px),
              radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px, 80px 80px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />

        {/* Ambient glows */}
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #2B6E3A 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center min-h-[calc(100vh-4rem)] py-16 lg:py-20">

            {/* ── LEFT: Editorial copy ────────────────────────────── */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-7"
              >
                <Sparkles size={14} className="text-[#D4AF37]" />
                <span className="text-white text-xs font-semibold tracking-[0.2em] uppercase">Sumak Jambi · Laboratorio Ancestral</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="font-heading font-bold text-white leading-[0.95] mb-7"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5.25rem)' }}
              >
                Naturaleza que{' '}
                <span className="italic font-light text-gold-shimmer">nutre</span>,
                <br />
                Bienestar que{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">transforma</span>
                  <span className="absolute left-0 right-0 bottom-1 sm:bottom-2 h-3 bg-[#D4AF37]/30 -z-0 rounded-sm" />
                </span>
                .
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-white/75 text-base sm:text-lg max-w-xl mb-10 leading-relaxed"
              >
                Productos 100% naturales formulados con plantas medicinales andinas.
                Más de 15 años de experiencia en medicina ancestral, ahora al alcance
                de tu salud y de tu libertad financiera.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10"
              >
                <Link
                  to="/productos"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#D4AF37] text-[#0B2913] font-bold text-base hover:bg-[#E8C94A] transition-all duration-200 shadow-[0_8px_24px_rgba(212,175,55,0.4)]"
                >
                  <ShoppingBag size={18} /> Comprar Productos
                </Link>
                <Link
                  to="/oportunidad"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-transparent border-2 border-white/30 text-white font-semibold text-base hover:border-white hover:bg-white/10 transition-all duration-200"
                >
                  Únete a la Red <ArrowRight size={18} />
                </Link>
              </motion.div>

              {/* Trust strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl"
              >
                {trustBadges.map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-white/70">
                    <span className="text-[#D4AF37] flex-shrink-0">{b.icon}</span>
                    <span className="text-xs font-medium leading-tight">{b.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── RIGHT: Featured product showcase card ───────────── */}
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, x: 30, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="relative"
              >
                {/* Big golden glow behind */}
                <div className="absolute inset-[-20%] rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.7) 0%, transparent 60%)' }} />

                {/* The product card */}
                <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden">

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroProduct.slug}
                      initial={{ opacity: 0, x: 60 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -60 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Top: badge */}
                      <div className="flex items-center justify-between mb-5">
                        <span className="inline-flex items-center gap-1.5 bg-[#D4AF37] text-[#0B2913] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                          <Star size={10} fill="currentColor" /> {heroProduct.bestseller ? 'Más Vendido' : heroProduct.nuevo ? 'Nuevo' : 'Destacado'}
                        </span>
                        <span className="text-white/50 text-[11px] font-mono">#{heroProduct.codigo}</span>
                      </div>

                      {/* Product image — fills the box */}
                      <div className="relative h-[280px] sm:h-[340px] rounded-2xl overflow-hidden mb-5">
                        <img
                          src={heroProduct.imagen}
                          alt={heroProduct.nombre}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>

                      {/* Product details */}
                      <div className="border-t border-white/15 pt-5">
                        <p className="text-[#D4AF37] text-[10px] font-semibold uppercase tracking-widest mb-2">{heroProduct.categoria}</p>
                        <h3 className="font-heading font-bold text-2xl text-white mb-1">{heroProduct.nombre}</h3>
                        <p className="text-white/65 text-sm mb-5 leading-snug">{heroProduct.tagline ?? heroProduct.descripcion}</p>

                        {/* Mini benefits */}
                        {heroProduct.beneficios && (
                          <ul className="space-y-1.5 mb-5">
                            {heroProduct.beneficios.slice(0, 3).map((b) => (
                              <li key={b} className="flex items-start gap-2 text-white/80 text-xs">
                                <CheckCircle size={13} className="text-[#D4AF37] flex-shrink-0 mt-0.5" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Price + CTA */}
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">Desde</p>
                            <p className="font-heading font-bold text-white text-3xl leading-none">
                              ${heroProduct.pvp.toFixed(2)}
                            </p>
                          </div>
                          <Link
                            to={`/productos/${heroProduct.slug}`}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#0B2913] font-bold text-sm hover:bg-[#D4AF37] hover:text-[#0B2913] transition-all duration-200"
                          >
                            Ver Producto <ArrowRight size={15} />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Dots indicador del carousel */}
                  <div className="flex justify-center gap-1.5 mt-5 pt-3 border-t border-white/10">
                    {heroProducts.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setHeroIndex(i)}
                        aria-label={`Producto ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          heroIndex === i ? 'w-6 bg-[#D4AF37]' : 'w-1.5 bg-white/25 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Floating mini ticket — "natural" */}
                <motion.div
                  initial={{ opacity: 0, rotate: -8, x: -20 }}
                  animate={{ opacity: 1, rotate: -6, x: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  className="hidden sm:block absolute -left-4 lg:-left-12 top-12 bg-[#D4AF37] text-[#0B2913] rounded-2xl px-4 py-3 shadow-2xl"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest">100%</p>
                  <p className="text-sm font-heading font-bold">Natural</p>
                </motion.div>

                {/* Floating mini ticket — "ancestral" */}
                <motion.div
                  initial={{ opacity: 0, rotate: 8, x: 20 }}
                  animate={{ opacity: 1, rotate: 6, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  className="hidden sm:block absolute -right-4 lg:-right-8 bottom-32 bg-white text-[#0B2913] rounded-2xl px-4 py-3 shadow-2xl"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A4E26]">+15</p>
                  <p className="text-sm font-heading font-bold">Años</p>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Bottom stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="border-t border-white/15 pt-6 pb-8 grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-left">
                <p className="font-heading font-bold text-3xl sm:text-4xl text-[#D4AF37]">{s.value}</p>
                <p className="text-white/65 text-xs sm:text-sm uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
         CATEGORY SHOP — Explora la tienda
      ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="flex items-end justify-between flex-wrap gap-4 mb-10"
          >
            <div>
              <motion.p variants={fadeUp} className="text-[#1A4E26] text-xs font-semibold uppercase tracking-[0.3em] mb-3">
                Explora la Tienda
              </motion.p>
              <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-[#111111]">
                Compra por categoría
              </motion.h2>
            </div>
            <motion.div variants={fadeUp}>
              <Link
                to="/productos"
                className="inline-flex items-center gap-2 text-[#1A4E26] font-semibold text-sm hover:gap-3 transition-all"
              >
                Ver todo el catálogo <ArrowRight size={16} />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {showcaseCategories.map((cat) => (
              <motion.div key={cat.key} variants={fadeUp}>
                <Link
                  to={`/productos?cat=${cat.key}`}
                  className="group block relative overflow-hidden rounded-2xl border border-[#C8D8CB] hover:border-[#1A4E26]/40 transition-all duration-300 h-full"
                  style={{ background: 'linear-gradient(160deg, #F4F7F5 0%, #E8F2EA 100%)' }}
                >
                  <div className="relative h-32 sm:h-40 overflow-hidden">
                    {cat.sample?.imagen ? (
                      <img
                        src={cat.sample.imagen}
                        alt={cat.label}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Leaf size={40} className="text-[#1A4E26] opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 pt-2 border-t border-[#C8D8CB]/60 bg-white/60 backdrop-blur-sm">
                    <p className="font-heading font-bold text-[#111111] text-sm mb-0.5 group-hover:text-[#1A4E26] transition-colors">{cat.label}</p>
                    <p className="text-[#6B7280] text-[11px]">{cat.count} producto{cat.count !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
         BESTSELLERS — Más vendidos
      ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-[#F4F7F5]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-[#1A4E26] text-xs font-semibold uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
              <TrendingUp size={14} /> Los Favoritos
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-[#111111] mb-4">
              Más Vendidos
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#6B7280] max-w-2xl mx-auto text-base">
              Los productos que más están transformando la vida de nuestros clientes.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {bestsellers.map((product) => (
              <motion.div
                key={product.codigo}
                variants={fadeUp}
                className="bg-white rounded-3xl overflow-hidden border border-[#C8D8CB] hover:shadow-[0_25px_60px_rgba(26,78,38,0.15)] hover:-translate-y-1 transition-all duration-300 group flex flex-col"
              >
                {/* Image area */}
                <div className="relative h-72 overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                  {/* Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
                    <span className="inline-flex items-center gap-1 bg-[#D4AF37] text-[#0B2913] text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
                      <Star size={9} fill="currentColor" /> Top
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1A4E26] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-[#1A4E26]/20">
                      {product.categoria}
                    </span>
                  </div>

                  {product.imagen ? (
                    <img
                      src={product.imagen}
                      alt={product.nombre}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Leaf size={64} className="text-[#1A4E26] opacity-30" />
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-heading font-bold text-[#111111] text-xl mb-1 leading-tight">{product.nombre}</h3>
                  <p className="text-[#1A4E26] text-sm italic mb-3">{product.tagline ?? product.categoria}</p>
                  <p className="text-[#6B7280] text-sm leading-relaxed mb-5 flex-grow">{product.descripcion}</p>

                  {/* Benefits preview */}
                  {product.beneficios && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {product.beneficios.slice(0, 2).map((b) => (
                        <span key={b} className="text-[10px] font-medium text-[#1A4E26] bg-[#1A4E26]/10 px-2 py-1 rounded-md leading-tight">
                          {b.length > 28 ? b.slice(0, 28) + '…' : b}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-[#C8D8CB] pt-4">
                    <div>
                      <p className="text-[10px] text-[#9CA3AF] mb-0.5 uppercase tracking-wider">Precio</p>
                      <p className="font-heading font-bold text-[#111111] text-2xl leading-none">${product.pvp.toFixed(2)}</p>
                    </div>
                    <Link
                      to={`/productos/${product.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all"
                    >
                      Ver Más <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
         EDITORIAL FEATURE — Why Sumak
      ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: visual composition */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8 }}
            className="relative h-[500px] order-2 lg:order-1 rounded-3xl overflow-hidden"
          >
            {/* Banner image fills the entire frame */}
            <img
              src="/productos-banner.png"
              alt="Línea de productos Sumak — Fibramak, Madre Silvestre, Regen 24, Vive-Oxi-100"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Gold corner accent */}
            <div className="absolute top-6 left-6 w-16 h-16 rounded-2xl bg-[#D4AF37] flex items-center justify-center shadow-xl z-10">
              <Leaf size={32} className="text-[#0B2913]" />
            </div>

            {/* Quote overlay */}
            <div className="absolute bottom-6 left-6 right-6 bg-black/55 backdrop-blur-md border border-white/15 rounded-2xl p-5 z-10">
              <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-1">Sumak Jambi · Laboratorio Ancestral</p>
              <p className="text-white font-heading font-bold text-lg leading-tight">
                Cada producto es un acto de respeto a la sabiduría andina.
              </p>
            </div>
          </motion.div>

          {/* Right: editorial copy */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <p className="text-[#1A4E26] text-xs font-semibold uppercase tracking-[0.3em] mb-4">Nuestra Esencia</p>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-[#111111] leading-[1.05] mb-6">
              Medicina ancestral, ciencia moderna.
            </h2>
            <p className="text-[#6B7280] text-lg leading-relaxed mb-8">
              Trabajamos con productores andinos que cultivan plantas medicinales bajo
              prácticas ancestrales. Cada hoja, cada raíz, cada extracto es procesado
              en nuestro laboratorio bajo estrictos controles, sin perder la esencia
              que generaciones nos han transmitido.
            </p>

            <div className="space-y-5 mb-10">
              {pillars.map((p) => (
                <div key={p.title} className="flex gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#1A4E26]/10 flex-shrink-0 flex items-center justify-center text-[#1A4E26]">
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-[#111111] text-base mb-1">{p.title}</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/nosotros"
              className="inline-flex items-center gap-2 text-[#1A4E26] font-bold text-base hover:gap-3 transition-all"
            >
              Conoce nuestra historia <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
         FULL CATALOG SHOWCASE — Dark
      ────────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B2913 0%, #133A1E 50%, #0F2E18 100%)' }}>
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#D4AF37] opacity-[0.05] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#2B6E3A] opacity-[0.15] blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.3em] mb-3">
              Catálogo Completo
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-4">
              Toda la línea Sumak
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/65 max-w-2xl mx-auto text-base leading-relaxed">
              15 productos formulados con plantas medicinales ancestrales,
              cada uno diseñado para acompañarte en una etapa de tu bienestar.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
          >
            {products
              .filter((p) => !['accesorios', 'material'].includes(p.categoriaKey))
              .map((product) => (
                <motion.div key={product.codigo} variants={fadeUp}>
                  <Link
                    to={`/productos/${product.slug}`}
                    className="group block bg-white/[0.06] hover:bg-white/[0.12] rounded-2xl p-4 border border-white/15 hover:border-[#D4AF37]/50 transition-all duration-300 h-full"
                  >
                    {(product.bestseller || product.nuevo || product.proximamente) && (
                      <div className="flex justify-end mb-1">
                        {product.proximamente && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">Próximo</span>
                        )}
                        {product.bestseller && !product.proximamente && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">Top</span>
                        )}
                        {product.nuevo && !product.proximamente && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">Nuevo</span>
                        )}
                      </div>
                    )}
                    <div className="relative h-28 sm:h-32 rounded-xl overflow-hidden mb-3">
                      {product.imagen ? (
                        <img
                          src={product.imagen}
                          alt={product.nombre}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Leaf size={36} className="text-white/35" />
                        </div>
                      )}
                    </div>
                    <p className="text-white text-center text-xs font-semibold leading-tight mb-1 line-clamp-2">{product.nombre}</p>
                    {product.proximamente ? (
                      <p className="text-[#D4AF37] text-center text-[10px] font-bold uppercase tracking-wider">Próximamente</p>
                    ) : (
                      <p className="text-[#D4AF37] text-center text-sm font-bold">${product.pvp.toFixed(2)}</p>
                    )}
                  </Link>
                </motion.div>
              ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-14"
          >
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#D4AF37] text-[#0B2913] font-bold hover:bg-[#E8C94A] transition-all shadow-[0_8px_24px_rgba(212,175,55,0.4)]"
            >
              Ir a la Tienda <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
         BUSINESS OPPORTUNITY
      ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <div>
              <motion.p variants={fadeUp} className="text-[#1A4E26] text-xs font-semibold uppercase tracking-[0.3em] mb-3">
                Oportunidad de Negocio
              </motion.p>
              <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-[#111111] mb-5 leading-tight">
                Construye tu libertad
                <br />
                <span className="text-[#1A4E26]">vendiendo lo que amas.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-[#6B7280] text-lg max-w-xl mb-8 leading-relaxed">
                Sumak no es solo una marca: es una red global de personas que ayudan a otros
                a estar mejor mientras construyen su propio negocio.
                Modelo binario continuo, comisiones desde el primer día.
              </motion.p>

              <motion.div variants={stagger} className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { val: '$50', label: 'Bono por afiliación' },
                  { val: '50%', label: 'Descuento distribuidor' },
                  { val: '14', label: 'Niveles de comisión' },
                ].map((item) => (
                  <motion.div
                    key={item.label}
                    variants={fadeUp}
                    className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-4"
                  >
                    <p className="font-heading font-bold text-2xl text-[#1A4E26] mb-0.5">{item.val}</p>
                    <p className="text-[#6B7280] text-xs leading-tight">{item.label}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#1A4E26] text-white font-bold text-base hover:bg-[#163F1E] transition-all duration-200 shadow-[0_8px_24px_rgba(26,78,38,0.3)]"
                >
                  Únete Ahora <ArrowRight size={18} />
                </Link>
                <Link
                  to="/plan-multinivel"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border-2 border-[#1A4E26]/30 text-[#1A4E26] font-bold text-base hover:border-[#1A4E26] hover:bg-[#1A4E26]/5 transition-all duration-200"
                >
                  Ver Plan Multinivel
                </Link>
              </motion.div>
            </div>

            <motion.div
              variants={fadeUp}
              className="relative rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0F2E18 0%, #1A4E26 50%, #2B6E3A 100%)' }}
            >
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                }}
              />

              <div className="relative p-8 sm:p-10 flex flex-col gap-6 text-white">
                <div>
                  <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.3em] mb-2">3 Paquetes</p>
                  <h3 className="font-heading font-bold text-3xl leading-tight mb-1">Comienza desde $125</h3>
                  <p className="text-white/65 text-sm">Elige el paquete que se adapte a tu meta.</p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { name: 'Básico', price: 125, top: false },
                    { name: 'Emprendedor', price: 225, top: true },
                    { name: 'Líder', price: 525, top: false },
                  ].map((pkg) => (
                    <div key={pkg.name} className={`flex items-center justify-between rounded-xl p-4 border ${pkg.top ? 'bg-[#D4AF37] text-[#0B2913] border-[#D4AF37]' : 'bg-white/10 border-white/20 backdrop-blur-sm'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-heading font-bold text-lg">{pkg.name}</p>
                          {pkg.top && <span className="text-[10px] font-bold uppercase tracking-widest bg-[#0B2913] text-[#D4AF37] px-2 py-0.5 rounded-full">Popular</span>}
                        </div>
                        <p className={`text-xs ${pkg.top ? 'text-[#0B2913]/70' : 'text-white/65'}`}>9 productos · {pkg.price} pts</p>
                      </div>
                      <p className="font-heading font-bold text-2xl">${pkg.price}</p>
                    </div>
                  ))}
                </div>

                <Link
                  to="/oportunidad"
                  className="inline-flex items-center justify-between gap-2 px-5 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-all"
                >
                  Comparar paquetes en detalle <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
         QUOTE / CLOSING
      ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-[#F4F7F5] border-t border-[#C8D8CB]">
        {novelties.length > 0 && (
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.3em] mb-3">Novedades</p>
              <h3 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] mb-4">Lo más nuevo</h3>
            </motion.div>
            <div className="flex justify-center gap-4 mt-8 flex-wrap">
              {novelties.map((n) => (
                <Link
                  key={n.codigo}
                  to={`/productos/${n.slug}`}
                  className="bg-white border border-[#C8D8CB] hover:border-[#1A4E26] rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md max-w-xs w-full"
                >
                  {n.imagen && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <img src={n.imagen} alt={n.nombre} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-0.5">Nuevo</p>
                    <p className="font-heading font-bold text-[#111111] text-sm leading-tight">{n.nombre}</p>
                    <p className="text-[#1A4E26] text-sm font-bold">${n.pvp.toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
