import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { products, categoryFilters } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function Productos() {
  const [activeCategory, setActiveCategory] = useState('todos');

  const filtered = activeCategory === 'todos'
    ? products
    : products.filter((p) => p.categoriaKey === activeCategory);

  return (
    <div className="bg-[#0F0F0F]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 bg-hero-gradient overflow-hidden">
        <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#00A86B] opacity-[0.05] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#00A86B] text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            Sumak Vida Ecuador
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#F0F0F0] mb-5"
          >
            Nuestros Productos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#AAAAAA] text-lg max-w-xl mx-auto"
          >
            15 productos naturales elaborados con plantas medicinales y sabiduría ancestral andina.
          </motion.p>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="sticky top-16 z-30 bg-[#0F0F0F]/95 backdrop-blur-md border-b border-[#2E2E2E] py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categoryFilters.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeCategory === cat.key
                    ? 'bg-[#00A86B] text-white shadow-[0_0_12px_rgba(0,168,107,0.3)]'
                    : 'bg-[#1A1A1A] border border-[#2E2E2E] text-[#888888] hover:text-[#F0F0F0] hover:border-[#3A3A3A]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            key={activeCategory}
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filtered.map((product) => (
              <motion.div
                key={product.codigo}
                variants={fadeUp}
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6 flex flex-col hover:border-[#00A86B]/40 hover:shadow-[0_0_20px_rgba(0,168,107,0.1)] transition-all duration-300"
              >
                {/* Image placeholder */}
                <div className="w-full h-36 rounded-xl bg-gradient-to-br from-[#1A2A20] to-[#0F1A14] flex items-center justify-center mb-5 border border-[#2E2E2E]">
                  <Leaf size={36} className="text-[#00A86B] opacity-50" />
                </div>

                {/* Code badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-[#555555] bg-[#222222] px-2 py-0.5 rounded">
                    #{product.codigo}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#00A86B] bg-[#00A86B]/10 border border-[#00A86B]/20 px-2.5 py-1 rounded-full">
                    {product.categoria}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-[#F0F0F0] text-base mb-2 leading-tight">{product.nombre}</h3>
                <p className="text-[#888888] text-xs leading-relaxed mb-5 flex-grow">{product.descripcion}</p>

                {/* Pricing */}
                <div className="border-t border-[#2E2E2E] pt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-[#555555] mb-0.5">Precio Público</p>
                    <p className="font-bold text-[#F0F0F0] text-xl">${product.pvp.toFixed(2)}</p>
                    <p className="text-[10px] text-[#00A86B] mt-1">
                      Distribuidor: ${(product.pvp / 2).toFixed(2)}
                    </p>
                  </div>
                  <Link
                    to={`/productos/${product.slug}`}
                    className="px-4 py-2 rounded-lg bg-[#00A86B]/10 border border-[#00A86B]/30 text-[#00A86B] text-xs font-semibold hover:bg-[#00A86B] hover:text-white transition-all duration-200"
                  >
                    Ver Más
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-[#555555]">
              <Leaf size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">No hay productos en esta categoría.</p>
            </div>
          )}

          <div className="mt-12 text-center">
            <div className="inline-block bg-[#1A1A1A] border border-[#00A86B]/30 rounded-xl px-6 py-4">
              <p className="text-[#888888] text-sm">
                <span className="text-[#00A86B] font-semibold">Distribuidores activos</span> obtienen un{' '}
                <span className="text-[#00A86B] font-semibold">50% de descuento</span> en todos los productos.
                &nbsp;
                <Link to="/registro" className="text-[#D4AF37] underline font-medium hover:text-[#E8C94A]">
                  Únete hoy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
