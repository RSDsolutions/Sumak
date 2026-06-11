import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search, X, SlidersHorizontal, ShoppingCart, Plus, Minus,
  Star, ArrowRight, Leaf, Check, Sparkles,
} from 'lucide-react';
import { products, categoryFilters } from '../../data';
import { useCart } from '../../lib/cart';
import { useToast } from '../../lib/toast';

type SortKey = 'destacado' | 'precio-asc' | 'precio-desc' | 'nombre';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'destacado', label: 'Más relevantes' },
  { key: 'precio-asc', label: 'Precio: menor a mayor' },
  { key: 'precio-desc', label: 'Precio: mayor a menor' },
  { key: 'nombre', label: 'Nombre (A-Z)' },
];

const DISCOUNT = 0.5;

export default function Tienda() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [sortBy, setSortBy] = useState<SortKey>('destacado');
  const { items, addItem, setQty } = useCart();
  const toast = useToast();

  const filtered = useMemo(() => {
    let list = activeCategory === 'todos'
      ? products
      : products.filter((p) => p.categoriaKey === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    switch (sortBy) {
      case 'precio-asc': sorted.sort((a, b) => a.pvp - b.pvp); break;
      case 'precio-desc': sorted.sort((a, b) => b.pvp - a.pvp); break;
      case 'nombre': sorted.sort((a, b) => a.nombre.localeCompare(b.nombre)); break;
      default:
        sorted.sort((a, b) => {
          const ra = (a.bestseller ? 3 : 0) + (a.destacado ? 2 : 0) + (a.nuevo ? 1 : 0);
          const rb = (b.bestseller ? 3 : 0) + (b.destacado ? 2 : 0) + (b.nuevo ? 1 : 0);
          return rb - ra;
        });
    }
    return sorted;
  }, [activeCategory, search, sortBy]);

  function qtyOf(codigo: string) {
    return items.find((i) => i.codigo === codigo)?.cantidad ?? 0;
  }

  function handleAdd(p: typeof products[number]) {
    const precio = parseFloat((p.pvp * DISCOUNT).toFixed(2));
    addItem({ codigo: p.codigo, nombre: p.nombre, pvp: p.pvp, precio, imagen: p.imagen }, 1);
    // UX-010: confirmación discreta de que se añadió al carrito.
    toast.success(`${p.nombre} añadido al carrito`);
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
              Tienda Sumak
              <Sparkles size={18} className="text-[#D4AF37]" />
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              Catálogo a precio distribuidor (50% off). Añade al carrito y procesa tu pedido cuando estés listo.
            </p>
          </div>
          <Link
            to="/dashboard/pedido/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all relative"
          >
            <ShoppingCart size={16} /> Mi Carrito
            {items.length > 0 && (
              <span className="bg-[#D4AF37] text-[#0B2913] text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {items.reduce((s, i) => s + i.cantidad, 0)}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto, ingrediente o categoría..."
          className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#C8D8CB] rounded-2xl text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#1A4E26] transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#F4F7F5] hover:bg-[#EBF0EC] flex items-center justify-center"
            aria-label="Limpiar"
          >
            <X size={14} className="text-[#6B7280]" />
          </button>
        )}
      </div>

      {/* ── Category pills + Sort ──────────────────────── */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl mb-6">
        <div className="overflow-x-auto px-4 py-3">
          <div className="flex gap-2 min-w-max">
            {categoryFilters.map((cat) => {
              const isActive = activeCategory === cat.key;
              const count = cat.key === 'todos'
                ? products.length
                : products.filter((p) => p.categoriaKey === cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1A4E26] text-white shadow-[0_4px_10px_rgba(26,78,38,0.25)]'
                      : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#6B7280] hover:text-[#111111]'
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
        <div className="border-t border-[#C8D8CB] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[#6B7280] text-xs">
            <span className="font-bold text-[#111111]">{filtered.length}</span>{' '}
            producto{filtered.length !== 1 ? 's' : ''}
          </p>
          <label className="flex items-center gap-2 text-xs">
            <SlidersHorizontal size={14} className="text-[#6B7280]" />
            <span className="text-[#6B7280]">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-md px-2 py-1 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
            >
              {sortOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* ── Product grid ───────────────────────────────── */}
      <motion.div
        key={`${activeCategory}-${sortBy}-${search}`}
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4"
      >
        {filtered.map((p) => {
          const qty = qtyOf(p.codigo);
          const precio = parseFloat((p.pvp * DISCOUNT).toFixed(2));
          const inCart = qty > 0;

          return (
            <motion.div
              key={p.codigo}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
              className={`bg-white border rounded-2xl overflow-hidden flex flex-col hover:shadow-[0_15px_40px_rgba(26,78,38,0.12)] hover:-translate-y-0.5 transition-all duration-300 group ${
                inCart ? 'border-[#1A4E26]/50' : 'border-[#C8D8CB]'
              }`}
            >
              {/* Image */}
              <Link to={`/dashboard/tienda/${p.slug}`} className="relative block h-48 overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10 gap-2">
                  <div className="flex flex-col gap-1">
                    {p.proximamente && (
                      <span className="inline-flex items-center gap-1 bg-[#0B2913] text-[#D4AF37] text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border border-[#D4AF37]/40">
                        Próximamente
                      </span>
                    )}
                    {p.bestseller && (
                      <span className="inline-flex items-center gap-1 bg-[#D4AF37] text-[#0B2913] text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full">
                        <Star size={9} fill="currentColor" /> Top
                      </span>
                    )}
                    {p.nuevo && (
                      <span className="inline-flex items-center gap-1 bg-[#1A4E26] text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full">
                        Nuevo
                      </span>
                    )}
                  </div>
                  {inCart && (
                    <span className="inline-flex items-center gap-1 bg-[#1A4E26] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      <Check size={10} /> {qty}
                    </span>
                  )}
                </div>

                {p.imagen ? (
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Leaf size={36} className="text-[#1A4E26] opacity-30" />
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="p-4 flex flex-col flex-grow">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1A4E26] mb-1">{p.categoria}</p>
                <Link to={`/dashboard/tienda/${p.slug}`}>
                  <h3 className="font-heading font-bold text-[#111111] text-sm mb-1 leading-tight hover:text-[#1A4E26] transition-colors line-clamp-2">
                    {p.nombre}
                  </h3>
                </Link>
                {p.tagline && (
                  <p className="text-[#1A4E26] text-xs italic mb-2 line-clamp-1">{p.tagline}</p>
                )}

                <div className="mt-auto pt-3 border-t border-[#C8D8CB]">
                  {p.proximamente ? (
                    <div>
                      <p className="font-heading font-bold text-[#0B2913] text-lg leading-none mb-1">Próximamente</p>
                      <p className="text-[10px] text-[#6B7280] mb-3">Estará disponible pronto</p>
                      <button
                        disabled
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F4F7F5] border border-[#C8D8CB] text-[#9CA3AF] text-xs font-bold cursor-not-allowed"
                      >
                        No disponible aún
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] line-through">PVP ${p.pvp.toFixed(2)}</p>
                        <p className="font-heading font-bold text-[#1A4E26] text-xl leading-none">
                          ${precio.toFixed(2)}
                        </p>
                        <p className="text-[9px] text-[#D4AF37] font-semibold mt-0.5">★ {Math.round(precio)} pts</p>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-1 bg-[#1A4E26] rounded-xl p-1">
                          <button
                            onClick={() => setQty(p.codigo, qty - 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white hover:bg-white/15 transition-colors"
                            aria-label="Disminuir"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-white font-bold text-sm w-5 text-center">{qty}</span>
                          <button
                            onClick={() => setQty(p.codigo, qty + 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white hover:bg-white/15 transition-colors"
                            aria-label="Aumentar"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdd(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#163F1E] transition-all"
                        >
                          <Plus size={13} /> Agregar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-[#9CA3AF] bg-white rounded-2xl border border-[#C8D8CB]">
          <Leaf size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-heading font-bold text-lg text-[#111111] mb-1">Sin coincidencias</p>
          <p className="text-sm mb-5">No encontramos productos con esos filtros.</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('todos'); }}
            className="px-5 py-2.5 rounded-full bg-[#1A4E26] text-white text-sm font-semibold hover:bg-[#163F1E] transition-all"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Floating cart preview */}
      {items.length > 0 && (
        <Link
          to="/dashboard/pedido/nuevo"
          className="fixed bottom-6 right-6 z-30 bg-[#1A4E26] text-white rounded-2xl px-5 py-4 shadow-2xl hover:bg-[#163F1E] transition-all flex items-center gap-3"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-[#0B2913] text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {items.reduce((s, i) => s + i.cantidad, 0)}
            </span>
          </div>
          <div className="leading-tight">
            <p className="text-[10px] text-white/65 uppercase tracking-wider font-semibold">Ir al carrito</p>
            <p className="font-bold text-sm">${items.reduce((s, i) => s + i.precio * i.cantidad, 0).toFixed(2)}</p>
          </div>
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
