import { useState, useMemo, useEffect } from 'react';
import { motion, type Variants } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Leaf, Search, Star, ArrowRight, ShoppingBag, Sparkles, X, SlidersHorizontal } from 'lucide-react';
import { products, categoryFilters, contactInfo } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

type SortKey = 'destacado' | 'precio-asc' | 'precio-desc' | 'nombre';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'destacado', label: 'Más relevantes' },
  { key: 'precio-asc', label: 'Precio: menor a mayor' },
  { key: 'precio-desc', label: 'Precio: mayor a menor' },
  { key: 'nombre', label: 'Nombre (A-Z)' },
];

export default function Productos() {
  const [params, setParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(params.get('cat') ?? 'todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('destacado');

  // Sync URL with active category
  useEffect(() => {
    const cat = params.get('cat');
    if (cat) setActiveCategory(cat);
  }, [params]);

  const setCategoryAndUrl = (key: string) => {
    setActiveCategory(key);
    if (key === 'todos') {
      params.delete('cat');
    } else {
      params.set('cat', key);
    }
    setParams(params, { replace: true });
  };

  const filteredAndSorted = useMemo(() => {
    let list = activeCategory === 'todos'
      ? products
      : products.filter((p) => p.categoriaKey === activeCategory);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    switch (sortBy) {
      case 'precio-asc':
        sorted.sort((a, b) => a.pvp - b.pvp);
        break;
      case 'precio-desc':
        sorted.sort((a, b) => b.pvp - a.pvp);
        break;
      case 'nombre':
        sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      default:
        sorted.sort((a, b) => {
          const ra = (a.bestseller ? 3 : 0) + (a.destacado ? 2 : 0) + (a.nuevo ? 1 : 0);
          const rb = (b.bestseller ? 3 : 0) + (b.destacado ? 2 : 0) + (b.nuevo ? 1 : 0);
          return rb - ra;
        });
    }
    return sorted;
  }, [activeCategory, search, sortBy]);

  const activeCategoryLabel = categoryFilters.find((c) => c.key === activeCategory)?.label ?? 'Todos';

  return (
    <div className="bg-white">

      {/* ── Store hero ────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B2913 0%, #133A1E 60%, #0F2E18 100%)' }}>
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#D4AF37] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#2B6E3A] opacity-[0.18] blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.3em] mb-4 flex items-center gap-2"
          >
            <Sparkles size={14} /> Tienda Oficial Sumak
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-white mb-5 leading-[1.05]"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)' }}
          >
            Nuestros <span className="italic font-light text-gold-shimmer">productos</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/70 text-lg max-w-2xl mb-10 leading-relaxed"
          >
            15 productos naturales elaborados con plantas medicinales y sabiduría andina ancestral.
            Encuentra el adecuado para tu bienestar diario.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl"
          >
            <div className="relative">
              <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#0B2913]/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, ingrediente o categoría..."
                className="w-full pl-14 pr-12 py-4 bg-white rounded-2xl text-[#111111] placeholder:text-[#9CA3AF] font-medium text-base focus:outline-none focus:ring-2 focus:ring-[#D4AF37] shadow-2xl"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#F4F7F5] hover:bg-[#EBF0EC] flex items-center justify-center transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} className="text-[#6B7280]" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Sticky filter bar ─────────────────────────────────── */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#C8D8CB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Category pills */}
          <div className="overflow-x-auto py-4 -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              {categoryFilters.map((cat) => {
                const isActive = activeCategory === cat.key;
                const count = cat.key === 'todos'
                  ? products.length
                  : products.filter((p) => p.categoriaKey === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryAndUrl(cat.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#1A4E26] text-white shadow-[0_4px_14px_rgba(26,78,38,0.3)]'
                        : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#6B7280] hover:text-[#111111] hover:border-[#A8C2AD]'
                    }`}
                  >
                    {cat.label}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#1A4E26]/10 text-[#1A4E26]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort + results count */}
          <div className="flex items-center justify-between py-3 border-t border-[#C8D8CB]/60 flex-wrap gap-3">
            <p className="text-[#6B7280] text-sm">
              <span className="font-bold text-[#111111]">{filteredAndSorted.length}</span>{' '}
              {filteredAndSorted.length === 1 ? 'producto' : 'productos'} en{' '}
              <span className="text-[#1A4E26] font-semibold">{activeCategoryLabel}</span>
            </p>
            <label className="flex items-center gap-2 text-sm">
              <SlidersHorizontal size={16} className="text-[#6B7280]" />
              <span className="text-[#6B7280]">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-lg px-3 py-1.5 text-sm font-medium text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#1A4E26]/30 cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* ── Product grid ──────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 bg-[#FAFBFA]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            key={`${activeCategory}-${sortBy}-${search}`}
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6"
          >
            {filteredAndSorted.map((product) => (
              <motion.div
                key={product.codigo}
                variants={fadeUp}
                className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden flex flex-col hover:border-[#1A4E26]/40 hover:shadow-[0_15px_40px_rgba(26,78,38,0.12)] hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Product image area */}
                <Link to={`/productos/${product.slug}`} className="relative block h-60 overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                  {/* Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10 gap-2">
                    <div className="flex flex-col gap-1">
                      {product.bestseller && (
                        <span className="inline-flex items-center gap-1 bg-[#D4AF37] text-[#0B2913] text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full">
                          <Star size={9} fill="currentColor" /> Top
                        </span>
                      )}
                      {product.nuevo && (
                        <span className="inline-flex items-center gap-1 bg-[#1A4E26] text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-[#6B7280] bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
                      #{product.codigo}
                    </span>
                  </div>

                  {/* Glow */}
                  <div className="absolute inset-[15%] rounded-full blur-2xl opacity-25" style={{ background: 'radial-gradient(circle, rgba(26,78,38,0.4) 0%, transparent 65%)' }} />

                  {/* Image */}
                  <div className="absolute inset-0 flex items-center justify-center p-7">
                    {product.imagen ? (
                      <img
                        src={product.imagen}
                        alt={product.nombre}
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500"
                        style={{ filter: 'drop-shadow(0 15px 25px rgba(26,78,38,0.2))' }}
                      />
                    ) : (
                      <Leaf size={48} className="text-[#1A4E26] opacity-30" />
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="p-5 flex flex-col flex-grow">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#1A4E26] mb-1.5">{product.categoria}</p>
                  <Link to={`/productos/${product.slug}`} className="block">
                    <h3 className="font-heading font-bold text-[#111111] text-base mb-1.5 leading-tight hover:text-[#1A4E26] transition-colors">
                      {product.nombre}
                    </h3>
                  </Link>
                  <p className="text-[#6B7280] text-xs leading-relaxed mb-4 line-clamp-2 flex-grow">
                    {product.descripcion}
                  </p>

                  {product.presentacion && (
                    <p className="text-[10px] text-[#9CA3AF] mb-3 italic">{product.presentacion}</p>
                  )}

                  {/* Pricing + CTA */}
                  <div className="border-t border-[#C8D8CB] pt-4 mt-auto">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] mb-0.5 uppercase tracking-wider">Precio público</p>
                        <p className="font-heading font-bold text-[#111111] text-xl leading-none">${product.pvp.toFixed(2)}</p>
                        <p className="text-[10px] text-[#1A4E26] mt-1 font-medium">
                          Distribuidor: ${(product.pvp / 2).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/productos/${product.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#163F1E] transition-all"
                      >
                        Ver Detalle <ArrowRight size={13} />
                      </Link>
                      <a
                        href={`https://wa.me/${contactInfo.whatsapp}?text=Hola, quiero adquirir: ${product.nombre} (PVP: $${product.pvp.toFixed(2)})`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#C8D8CB] text-[#1A4E26] hover:bg-[#1A4E26] hover:text-white hover:border-[#1A4E26] transition-all"
                        aria-label={`Comprar ${product.nombre} por WhatsApp`}
                      >
                        <ShoppingBag size={15} />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {filteredAndSorted.length === 0 && (
            <div className="text-center py-24 text-[#9CA3AF]">
              <Leaf size={56} className="mx-auto mb-4 opacity-30" />
              <p className="font-heading font-bold text-xl text-[#111111] mb-2">Sin coincidencias</p>
              <p className="text-base mb-6">No encontramos productos con esos filtros.</p>
              <button
                onClick={() => { setSearch(''); setCategoryAndUrl('todos'); }}
                className="px-5 py-2.5 rounded-full bg-[#1A4E26] text-white text-sm font-semibold hover:bg-[#163F1E] transition-all"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Distributor banner ────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12" style={{ background: 'linear-gradient(135deg, #0F2E18 0%, #1A4E26 50%, #2B6E3A 100%)' }}>
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#D4AF37] opacity-10 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.3em] mb-3">Para Distribuidores</p>
                <h3 className="font-heading font-bold text-3xl sm:text-4xl text-white leading-tight mb-4">
                  Compra todo al{' '}
                  <span className="text-[#D4AF37]">50% de descuento</span>
                </h3>
                <p className="text-white/75 text-base mb-6 leading-relaxed max-w-xl">
                  Únete a la red Sumak y accede al precio distribuidor en todo el catálogo.
                  Comisiones desde el primer día, paquetes desde $125.
                </p>
                <Link
                  to="/registro"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#D4AF37] text-[#0B2913] font-bold text-sm hover:bg-[#E8C94A] transition-all shadow-[0_8px_24px_rgba(212,175,55,0.4)]"
                >
                  Únete Ahora <ArrowRight size={16} />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: '50%', label: 'Descuento garantizado' },
                  { val: '$50', label: 'Bono por afiliación' },
                  { val: '14', label: 'Niveles de comisión' },
                  { val: '∞', label: 'Crecimiento binario' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-center">
                    <p className="font-heading font-bold text-2xl text-[#D4AF37] mb-1">{s.val}</p>
                    <p className="text-white/70 text-xs leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
