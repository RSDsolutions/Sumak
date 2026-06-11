import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, ShoppingCart, Leaf, Star,
  Sparkles, AlertCircle, Plus, Minus, Check, BookOpen, X, Maximize2, Download, Heart,
  ShieldCheck,
} from 'lucide-react';
import { products, parseIngredient } from '../../data';
import { useCart } from '../../lib/cart';
import { useToast } from '../../lib/toast';

type TabKey = 'beneficios' | 'ingredientes' | 'modo-uso' | 'precauciones';

const DISCOUNT = 0.5;

export default function TiendaProducto() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const product = products.find((p) => p.slug === slug);
  const { addItem, items, setQty: setCartQty } = useCart();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>('ingredientes');
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
    { key: 'ingredientes', label: 'Ingredientes', available: !!product.ingredientes?.length },
    { key: 'beneficios', label: 'Beneficios', available: !!product.beneficios?.length },
    { key: 'modo-uso', label: 'Modo de uso', available: !!product.modoUso },
    { key: 'precauciones', label: 'Precauciones', available: !!product.precauciones },
  ].filter((t) => t.available);
  const currentTab = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  function handleAddToCart() {
    addItem({
      codigo: product!.codigo, nombre: product!.nombre, pvp: product!.pvp,
      precio, imagen: product!.imagen,
    }, qty);
    // UX-010: confirmación discreta de que se añadió al carrito.
    toast.success(
      qty === 1
        ? `${product!.nombre} añadido al carrito`
        : `${qty} × ${product!.nombre} añadidos al carrito`
    );
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
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold flex items-center gap-1.5">
                    <Sparkles size={12} /> Lo que vas a notar
                  </p>
                  <span className="text-[9px] uppercase tracking-widest text-[#1A4E26] font-bold bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-full px-2 py-0.5">
                    {product.beneficios.length} beneficios
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {product.beneficios.map((b, idx) => (
                    <motion.div
                      key={b}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -2 }}
                      className="group relative overflow-hidden rounded-xl border border-[#C8D8CB] bg-gradient-to-br from-white via-white to-[#EBF4ED] p-3 hover:border-[#1A4E26]/40 hover:shadow-[0_6px_16px_rgba(26,78,38,0.10)] transition-all duration-300"
                    >
                      <span
                        aria-hidden
                        className="absolute top-0 right-1.5 font-heading font-bold text-4xl leading-none select-none pointer-events-none text-[#1A4E26]/[0.05] group-hover:text-[#1A4E26]/[0.10] transition-colors duration-500"
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="relative flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <CheckCircle2 size={13} className="text-white" />
                        </div>
                        <p className="text-[#111111] text-xs font-medium leading-snug pt-1">{b}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {currentTab?.key === 'ingredientes' && product.ingredientes && (() => {
              const parsed = product.ingredientes.map(parseIngredient);
              const conImagen = parsed.filter((i) => i.image);
              const nutrientes = parsed.filter((i) => i.isNutrient);
              const otros = parsed.filter((i) => !i.image && !i.isNutrient);
              return (
                <div>
                  {conImagen.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5 mb-6 px-1">
                      {conImagen.map((ing, i) => (
                        <motion.div
                          key={ing.name + i}
                          initial={{ opacity: 0, scale: 0.85, y: 8 }}
                          whileInView={{ opacity: 1, scale: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, delay: Math.min(i * 0.025, 0.35), ease: [0.22, 1, 0.36, 1] }}
                          whileHover={{ y: -3, scale: 1.06 }}
                          className="flex flex-col items-center text-center group cursor-default"
                          title={ing.description}
                        >
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-1.5">
                            <div
                              className="absolute inset-0 rounded-full opacity-55 group-hover:opacity-85 transition-opacity duration-500 blur-xl"
                              style={{
                                background: 'radial-gradient(circle, rgba(26,78,38,0.18) 0%, rgba(212,175,55,0.08) 50%, transparent 75%)',
                              }}
                            />
                            <img
                              src={ing.image}
                              alt={ing.name}
                              loading="lazy"
                              className="relative w-full h-full object-contain"
                              style={{
                                filter: 'drop-shadow(0 4px 8px rgba(26,78,38,0.16)) drop-shadow(0 2px 3px rgba(0,0,0,0.08))',
                              }}
                            />
                          </div>
                          <p className="text-[#111111] text-[10px] font-bold leading-tight line-clamp-2 max-w-[6rem]">{ing.name}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {otros.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[9px] uppercase tracking-widest text-[#6B7280] font-bold mb-2">Otros componentes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {otros.map((ing, i) => (
                          <span key={ing.name + i} className="inline-flex items-center gap-1 bg-[#1A4E26]/10 border border-[#1A4E26]/20 text-[#1A4E26] font-semibold px-2.5 py-1 rounded-lg text-[11px]">
                            <Leaf size={10} /> {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {nutrientes.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-bold mb-2">Vitaminas y minerales</p>
                      <div className="flex flex-col gap-1.5">
                        {nutrientes.map((ing, i) => (
                          <div key={ing.name + i} className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#0B2913] rounded-lg px-2.5 py-1.5 text-[11px]">
                            <span className="text-[#D4AF37] font-bold mr-1">★</span>
                            <span className="font-semibold">{ing.name}</span>
                            {ing.description && <span className="text-[#6B7280] ml-1">— {ing.description}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {currentTab?.key === 'modo-uso' && product.modoUso && (() => {
              const stepRegex = /(\d+)[\)\.]\s+([^\d][^\)]*?)(?=\s+\d+[\)\.]|$)/gs;
              const matches = [...product.modoUso.matchAll(stepRegex)];
              const isSteps = matches.length >= 2;
              const steps = isSteps ? matches.map((m) => m[2].trim().replace(/\.$/, '')) : [];

              return (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold flex items-center gap-1.5 mb-3">
                    <CheckCircle2 size={12} /> {isSteps ? 'Sigue estos pasos' : 'Indicación de uso'}
                  </p>

                  {isSteps ? (
                    <div className="space-y-2.5">
                      {steps.map((step, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -12 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, delay: idx * 0.08 }}
                          className="flex items-start gap-3 group"
                        >
                          <div className="relative shrink-0 flex flex-col items-center">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] text-white font-heading font-bold text-sm flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                              {idx + 1}
                            </div>
                            {idx < steps.length - 1 && (
                              <div className="w-px h-6 bg-gradient-to-b from-[#1A4E26]/40 to-transparent mt-1" />
                            )}
                          </div>
                          <div className="flex-1 bg-gradient-to-br from-white to-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-3 group-hover:border-[#1A4E26]/40 transition-colors mt-0.5">
                            <p className="text-[#111111] text-xs font-medium leading-relaxed">{step}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="relative bg-gradient-to-br from-[#EBF4ED] via-white to-[#F4F7F5] border border-[#1A4E26]/20 rounded-xl p-5 overflow-hidden"
                    >
                      <CheckCircle2 aria-hidden size={100} className="absolute -top-4 -right-4 text-[#1A4E26]/[0.05] pointer-events-none" />
                      <div className="absolute -top-2 -left-2 w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] flex items-center justify-center shadow-md">
                        <CheckCircle2 size={16} className="text-white" />
                      </div>
                      <p className="relative text-[#111111] text-sm leading-relaxed font-medium pt-3">{product.modoUso}</p>
                    </motion.div>
                  )}

                  <div className="mt-3 flex items-start gap-2 p-3 bg-[#FFFDF5] border border-[#D4AF37]/30 rounded-lg">
                    <Sparkles size={13} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    <p className="text-[#6B7280] text-[11px] leading-relaxed">
                      <span className="font-bold text-[#0B2913]">Tip:</span> mantén la rutina para resultados visibles.
                    </p>
                  </div>
                </div>
              );
            })()}

            {currentTab?.key === 'precauciones' && product.precauciones && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold flex items-center gap-1.5 mb-3">
                  <AlertCircle size={12} /> Antes de consumir
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="relative bg-gradient-to-br from-[#FFFDF5] via-white to-[#FFF8E6] border border-[#D4AF37]/30 rounded-xl p-5 overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1.5px, transparent 1.5px)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  <AlertCircle aria-hidden size={100} className="absolute -top-4 -right-4 text-[#D4AF37]/[0.08] pointer-events-none" />
                  <div className="absolute -top-2 -left-2 w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C94A] flex items-center justify-center shadow-md">
                    <AlertCircle size={16} className="text-[#0B2913]" />
                  </div>
                  <p className="relative text-[#111111] text-sm leading-relaxed font-medium pt-3">{product.precauciones}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.12 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3"
                >
                  <div className="bg-white border border-[#C8D8CB] rounded-lg p-3 flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center shrink-0">
                      <Sparkles size={13} />
                    </div>
                    <p className="text-[#6B7280] text-[11px] leading-relaxed">
                      <span className="font-bold text-[#0B2913]">Suplemento natural.</span> No reemplaza una dieta equilibrada.
                    </p>
                  </div>
                  <div className="bg-white border border-[#C8D8CB] rounded-lg p-3 flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={13} />
                    </div>
                    <p className="text-[#6B7280] text-[11px] leading-relaxed">
                      <span className="font-bold text-[#0B2913]">Consulta médica</span> si estás bajo tratamiento, embarazo o lactancia.
                    </p>
                  </div>
                </motion.div>
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
                loading="lazy"
                decoding="async"
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
                      <img src={p.imagen} alt={p.nombre} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
