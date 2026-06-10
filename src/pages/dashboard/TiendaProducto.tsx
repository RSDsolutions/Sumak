import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, ShoppingCart, Leaf, Star,
  Sparkles, AlertCircle, Plus, Minus, Check, BookOpen, X, Maximize2, Download, Heart,
} from 'lucide-react';
import { products } from '../../data';
import { useCart } from '../../lib/cart';

type TabKey = 'beneficios' | 'ingredientes' | 'modo-uso' | 'precauciones';

const DISCOUNT = 0.5;

export default function TiendaProducto() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const product = products.find((p) => p.slug === slug);
  const { addItem, items, setQty: setCartQty } = useCart();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>('beneficios');
  const [revistaOpen, setRevistaOpen] = useState(false);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Leaf size={56} className="text-[#1A4E26] opacity-30" />
        <p className="font-heading font-bold text-xl text-[#111111]">Producto no encontrado.</p>
        <Link to="/dashboard/tienda" className="text-[#1A4E26] hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Volver a la tienda
        </Link>
      </div>
    );
  }

  const precio = parseFloat((product.pvp * DISCOUNT).toFixed(2));
  const total = precio * qty;
  const inCart = items.find((i) => i.codigo === product.codigo);
  const inCartQty = inCart?.cantidad ?? 0;

  const related = products
    .filter((p) => p.categoriaKey === product.categoriaKey && p.slug !== product.slug)
    .slice(0, 4);

  const tabs: { key: TabKey; label: string; available: boolean }[] = [
    { key: 'beneficios', label: 'Beneficios', available: !!product.beneficios?.length },
    { key: 'ingredientes', label: 'Ingredientes', available: !!product.ingredientes?.length },
    { key: 'modo-uso', label: 'Modo de uso', available: !!product.modoUso },
    { key: 'precauciones', label: 'Precauciones', available: !!product.precauciones },
  ].filter((t) => t.available);
  const currentTab = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  function handleAddToCart() {
    addItem({
      codigo: product!.codigo, nombre: product!.nombre, pvp: product!.pvp,
      precio, imagen: product!.imagen,
    }, qty);
    setQty(1);
  }

  function handleBuyNow() {
    addItem({
      codigo: product!.codigo, nombre: product!.nombre, pvp: product!.pvp,
      precio, imagen: product!.imagen,
    }, qty);
    navigate('/dashboard/pedido/nuevo');
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="text-xs text-[#6B7280] mb-5 flex items-center gap-1.5 flex-wrap">
        <Link to="/dashboard" className="hover:text-[#1A4E26]">Panel</Link>
        <span>/</span>
        <Link to="/dashboard/tienda" className="hover:text-[#1A4E26]">Tienda</Link>
        <span>/</span>
        <span className="text-[#111111] font-semibold truncate">{product.nombre}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* LEFT: Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative rounded-3xl border border-[#C8D8CB] overflow-hidden aspect-square shadow-[0_4px_24px_rgba(26,78,38,0.06)]" style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #EBF4ED 100%)' }}>
            <div className="absolute top-5 left-5 right-5 flex items-start justify-between gap-2 z-10">
              <div className="flex flex-col gap-2">
                {product.proximamente && (
                  <span className="inline-flex items-center gap-1 bg-[#0B2913] text-[#D4AF37] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-md border border-[#D4AF37]/40">
                    Próximamente
                  </span>
                )}
                {product.bestseller && (
                  <span className="inline-flex items-center gap-1 bg-[#D4AF37] text-[#0B2913] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-md">
                    <Star size={10} fill="currentColor" /> Más vendido
                  </span>
                )}
                {product.nuevo && (
                  <span className="inline-flex items-center gap-1 bg-[#1A4E26] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-md">
                    <Sparkles size={10} /> Nuevo
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#6B7280] bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
                #{product.codigo}
              </span>
            </div>

            {product.imagen ? (
              <img
                src={product.imagen}
                alt={product.nombre}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf size={120} className="text-[#1A4E26] opacity-30" />
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT: Info & buy */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#1A4E26] bg-[#1A4E26]/10 border border-[#1A4E26]/20 px-3 py-1.5 rounded-full mb-3">
            {product.categoria}
          </span>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-2 leading-tight">
            {product.nombre}
          </h1>
          {product.tagline && (
            <p className="text-[#1A4E26] italic text-base mb-3">{product.tagline}</p>
          )}

          {inCartQty > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#EBF4ED] border border-[#1A4E26]/20 text-[#1A4E26] text-xs font-semibold rounded-full px-3 py-1.5 mb-4">
              <Check size={13} /> {inCartQty} en tu carrito
              <button
                onClick={() => setCartQty(product.codigo, 0)}
                className="ml-2 text-[#6B7280] hover:text-red-600 text-[10px] font-medium underline"
              >
                quitar
              </button>
            </div>
          )}

          <p className="text-[#6B7280] text-sm leading-relaxed mb-5">
            {product.detalleLargo ?? product.descripcion}
          </p>

          {product.presentacion && (
            <p className="text-xs text-[#6B7280] mb-5 pb-5 border-b border-[#C8D8CB]">
              <span className="font-semibold text-[#111111]">Presentación:</span> {product.presentacion}
            </p>
          )}

          {product.proximamente ? (
            <>
              <div className="bg-gradient-to-br from-[#0B2913] to-[#1A4E26] text-white rounded-2xl p-6 mb-4 text-center relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px',
                  }}
                />
                <div className="relative">
                  <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
                    Disponible muy pronto
                  </p>
                  <h3 className="font-heading font-bold text-2xl text-white mb-2 leading-tight">
                    Próximamente
                  </h3>
                  <p className="text-white/75 text-xs leading-relaxed max-w-xs mx-auto">
                    Este producto estará disponible en tu tienda muy pronto.
                  </p>
                </div>
              </div>
              <button
                disabled
                className="w-full py-3.5 rounded-2xl bg-[#F4F7F5] border border-[#C8D8CB] text-[#9CA3AF] font-bold text-sm cursor-not-allowed mb-4"
              >
                No disponible aún
              </button>
            </>
          ) : (
            <>
              {/* Price + qty + actions */}
              <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5 mb-4">
                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-[#C8D8CB]">
                  <div>
                    <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Precio público</p>
                    <p className="font-heading font-bold text-xl text-[#6B7280] line-through leading-none">${product.pvp.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Tu precio</p>
                    <p className="font-heading font-bold text-3xl text-[#1A4E26] leading-none">${precio.toFixed(2)}</p>
                    <p className="text-[10px] text-[#D4AF37] font-bold mt-1">50% OFF</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Cantidad</p>
                    <div className="flex items-center border border-[#C8D8CB] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                        aria-label="Disminuir"
                      >
                        <Minus size={13} className="text-[#6B7280]" />
                      </button>
                      <span className="w-10 text-center font-bold text-[#111111]">{qty}</span>
                      <button
                        onClick={() => setQty((q) => q + 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                        aria-label="Aumentar"
                      >
                        <Plus size={13} className="text-[#6B7280]" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Total</p>
                    <p className="font-heading font-bold text-2xl text-[#1A4E26] leading-none">${total.toFixed(2)}</p>
                    <p className="text-[10px] text-[#D4AF37] font-bold mt-1">★ {Math.round(total)} pts</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={handleAddToCart}
                  className="py-3.5 rounded-2xl border-2 border-[#1A4E26] text-[#1A4E26] bg-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1A4E26] hover:text-white transition-all"
                >
                  <Plus size={16} /> Agregar al carrito
                </button>
                <button
                  onClick={handleBuyNow}
                  className="py-3.5 rounded-2xl bg-[#1A4E26] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#163F1E] shadow-[0_8px_24px_rgba(26,78,38,0.25)] transition-all"
                >
                  <ShoppingCart size={16} /> Comprar ahora
                </button>
              </div>
            </>
          )}

          <Link
            to="/dashboard/tienda"
            className="flex items-center justify-center gap-1.5 text-[#6B7280] hover:text-[#1A4E26] text-xs transition-colors"
          >
            <ArrowLeft size={13} /> Seguir comprando
          </Link>
        </motion.div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="mt-10 bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
          <div className="border-b border-[#C8D8CB] overflow-x-auto">
            <div className="flex min-w-max">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-6 py-4 text-sm font-semibold relative transition-colors whitespace-nowrap ${
                    currentTab?.key === t.key ? 'text-[#1A4E26]' : 'text-[#6B7280] hover:text-[#111111]'
                  }`}
                >
                  {t.label}
                  {currentTab?.key === t.key && (
                    <motion.span layoutId="dashTabUnderline" className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#1A4E26] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {currentTab?.key === 'beneficios' && product.beneficios && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.beneficios.map((b) => (
                  <div key={b} className="flex items-start gap-2.5 bg-[#F4F7F5] rounded-xl p-3.5">
                    <CheckCircle2 size={17} className="text-[#1A4E26] mt-0.5 shrink-0" />
                    <span className="text-[#111111] text-sm font-medium leading-snug">{b}</span>
                  </div>
                ))}
              </div>
            )}
            {currentTab?.key === 'ingredientes' && product.ingredientes && (
              <div className="flex flex-wrap gap-2">
                {product.ingredientes.map((ing) => (
                  <span key={ing} className="inline-flex items-center gap-1.5 bg-[#1A4E26]/10 border border-[#1A4E26]/20 text-[#1A4E26] font-semibold px-3 py-1.5 rounded-lg text-sm">
                    <Leaf size={12} /> {ing}
                  </span>
                ))}
              </div>
            )}
            {currentTab?.key === 'modo-uso' && product.modoUso && (
              <div className="bg-[#F4F7F5] border-l-4 border-[#1A4E26] rounded-r-xl p-4">
                <p className="text-[#111111] text-sm leading-relaxed">{product.modoUso}</p>
              </div>
            )}
            {currentTab?.key === 'precauciones' && product.precauciones && (
              <div className="bg-[#FFF8E6] border-l-4 border-[#D4AF37] rounded-r-xl p-4 flex gap-3">
                <AlertCircle size={20} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <p className="text-[#111111] text-sm leading-relaxed">{product.precauciones}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Ficha de Revista ─────────────────────────────────── */}
      {product.revistaPagina && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-10 bg-gradient-to-br from-[#0B2913] to-[#1A4E26] rounded-2xl overflow-hidden relative"
        >
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-5 p-5 sm:p-6 items-center">
            <div className="lg:col-span-2 text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-[#D4AF37]/30 rounded-full px-3 py-1 mb-3">
                <BookOpen size={12} className="text-[#D4AF37]" />
                <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">Revista Sumak 2026</span>
              </div>
              <h2 className="font-heading font-bold text-xl text-white leading-tight mb-2">Ficha oficial</h2>
              <p className="text-white/75 text-xs leading-relaxed mb-4">
                Página oficial del producto con ingredientes ilustrados, beneficios y modo de uso completo.
              </p>
              <button
                onClick={() => setRevistaOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#D4AF37] text-[#0B2913] font-bold text-xs hover:bg-[#E8C94A] transition-all shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
              >
                <Maximize2 size={12} />
                Ver completa
              </button>
            </div>
            <div className="lg:col-span-3">
              <button
                onClick={() => setRevistaOpen(true)}
                className="group block w-full rounded-xl overflow-hidden border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all shadow-xl bg-white"
              >
                <img
                  src={product.revistaPagina}
                  alt={`Ficha de ${product.nombre}`}
                  className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Lightbox de la revista */}
      <AnimatePresence>
        {revistaOpen && product.revistaPagina && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setRevistaOpen(false)}
          >
            <div className="fixed top-4 right-4 z-10 flex items-center gap-2">
              <a
                href={product.revistaPagina}
                download={`sumak-${product.slug}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
                title="Descargar"
                aria-label="Descargar imagen"
              >
                <Download size={18} />
              </a>
              <button
                onClick={() => setRevistaOpen(false)}
                className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full"
            >
              <img
                src={product.revistaPagina}
                alt={`Ficha oficial de ${product.nombre}`}
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <p className="text-center text-white/65 text-xs mt-4">
                Ficha de la Revista Sumak 2026 · {product.nombre}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#1A4E26]" />
              <h2 className="font-heading font-bold text-lg text-[#111111]">Productos relacionados</h2>
            </div>
            <Link to="/dashboard/tienda" className="text-[#1A4E26] text-xs font-semibold hover:underline flex items-center gap-1">
              Ver más <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {related.map((p) => {
              const pPrecio = parseFloat((p.pvp * DISCOUNT).toFixed(2));
              return (
                <Link
                  key={p.codigo}
                  to={`/dashboard/tienda/${p.slug}`}
                  className="bg-white border border-[#C8D8CB] hover:border-[#1A4E26]/40 rounded-xl overflow-hidden group transition-all"
                >
                  <div className="relative h-32 overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                    {p.imagen ? (
                      <img src={p.imagen} alt={p.nombre} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Leaf size={30} className="text-[#1A4E26] opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[#111111] text-xs font-bold line-clamp-2 mb-1 group-hover:text-[#1A4E26] transition-colors">{p.nombre}</p>
                    <p className="text-[#1A4E26] text-sm font-bold">${pPrecio.toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
