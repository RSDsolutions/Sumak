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
    <div className="bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 bg-hero-gradient overflow-hidden">
        <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#1A4E26] opacity-[0.05] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#1A4E26] text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            Sumak Vida Ecuador
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#111111] mb-5"
          >
            Nuestros Productos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#6B7280] text-lg max-w-xl mx-auto"
          >
            15 productos naturales elaborados con plantas medicinales y sabiduría ancestral andina.
          </motion.p>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#C8D8CB] py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categoryFilters.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeCategory === cat.key
                    ? 'bg-[#1A4E26] text-white shadow-[0_0_12px_rgba(26,78,38,0.3)]'
                    : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#6B7280] hover:text-[#111111] hover:border-[#A8C2AD]'
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
                className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden flex flex-col hover:border-[#1A4E26]/40 hover:shadow-[0_4px_28px_rgba(26,78,38,0.12)] hover:-translate-y-0.5 transition-all duration-300 group"
              >
                {/* Product image */}
                <div className="w-full h-48 bg-gradient-to-br from-[#EBF4ED] to-[#D5ECD9] flex items-center justify-center overflow-hidden">
                  {product.imagen ? (
                    <img
                      src={product.imagen}
                      alt={product.nombre}
                      className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-400 drop-shadow-md"
                    />
                  ) : (
                    <Leaf size={40} className="text-[#1A4E26] opacity-40" />
                  )}
                </div>
                <div className="p-6 flex flex-col flex-grow">

                {/* Code badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-[#6B7280] bg-[#EBF0EC] px-2 py-0.5 rounded">
                    #{product.codigo}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1A4E26] bg-[#1A4E26]/10 border border-[#1A4E26]/20 px-2.5 py-1 rounded-full">
                    {product.categoria}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-[#111111] text-base mb-2 leading-tight">{product.nombre}</h3>
                <p className="text-[#6B7280] text-xs leading-relaxed mb-5 flex-grow">{product.descripcion}</p>

                {/* Pricing */}
                <div className="border-t border-[#C8D8CB] pt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-[#9CA3AF] mb-0.5">Precio Público</p>
                    <p className="font-bold text-[#111111] text-xl">${product.pvp.toFixed(2)}</p>
                    <p className="text-[10px] text-[#1A4E26] mt-1">
                      Distribuidor: ${(product.pvp / 2).toFixed(2)}
                    </p>
                  </div>
                  <Link
                    to={`/productos/${product.slug}`}
                    className="px-4 py-2 rounded-lg bg-[#1A4E26]/10 border border-[#1A4E26]/30 text-[#1A4E26] text-xs font-semibold hover:bg-[#1A4E26] hover:text-white transition-all duration-200"
                  >
                    Ver Más
                  </Link>
                </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-[#9CA3AF]">
              <Leaf size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">No hay productos en esta categoría.</p>
            </div>
          )}

          <div className="mt-12 text-center">
            <div className="inline-block bg-white border border-[#1A4E26]/30 rounded-xl px-6 py-4">
              <p className="text-[#6B7280] text-sm">
                <span className="text-[#1A4E26] font-semibold">Distribuidores activos</span> obtienen un{' '}
                <span className="text-[#1A4E26] font-semibold">50% de descuento</span> en todos los productos.
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
