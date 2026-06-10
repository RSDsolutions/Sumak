import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, ShoppingBag, Leaf, ArrowLeft, ArrowRight, Star,
  Truck, Award, ShieldCheck, Heart, Share2, Minus, Plus,
  Sparkles, AlertCircle, Phone, BookOpen, X, Maximize2, Download,
} from 'lucide-react';
import { products, contactInfo, parseIngredient } from '../data';

type TabKey = 'beneficios' | 'ingredientes' | 'modo-uso' | 'precauciones';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = products.find((p) => p.slug === slug);

  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>('beneficios');
  const [revistaOpen, setRevistaOpen] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 pt-20">
        <Leaf size={60} className="text-[#1A4E26] opacity-30" />
        <p className="text-[#111111] text-2xl font-heading font-bold">Producto no encontrado.</p>
        <Link to="/productos" className="text-[#1A4E26] font-semibold hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Ver todos los productos
        </Link>
      </div>
    );
  }

  const distributorPrice = product.pvp / 2;
  const totalPrice = product.pvp * qty;

  const relatedProducts = products
    .filter((p) => p.categoriaKey === product.categoriaKey && p.slug !== product.slug)
    .slice(0, 4);

  const tabs: { key: TabKey; label: string; available: boolean }[] = [
    { key: 'beneficios', label: 'Beneficios', available: !!product.beneficios?.length },
    { key: 'ingredientes', label: 'Ingredientes', available: !!product.ingredientes?.length },
    { key: 'modo-uso', label: 'Modo de uso', available: !!product.modoUso },
    { key: 'precauciones', label: 'Precauciones', available: !!product.precauciones },
  ].filter((t) => t.available);

  // Default active tab to first available
  const currentTab = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  const whatsappMsg = `Hola, quiero adquirir: ${product.nombre} (PVP: $${product.pvp.toFixed(2)})${qty > 1 ? ` × ${qty} = $${totalPrice.toFixed(2)}` : ''}`;
  const whatsappUrl = `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <div className="bg-[#FAFBFA] min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Breadcrumbs ─────────────────────────────────────── */}
        <nav className="text-xs sm:text-sm text-[#6B7280] mb-6 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-[#1A4E26]">Inicio</Link>
          <span>/</span>
          <Link to="/productos" className="hover:text-[#1A4E26]">Tienda</Link>
          <span>/</span>
          <Link to={`/productos?cat=${product.categoriaKey}`} className="hover:text-[#1A4E26]">{product.categoria}</Link>
          <span>/</span>
          <span className="text-[#111111] font-semibold truncate">{product.nombre}</span>
        </nav>

        {/* ── Top grid: gallery + buy box ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* LEFT: Product visual */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Main image — fills the box */}
            <div className="relative rounded-3xl border border-[#C8D8CB] overflow-hidden aspect-square shadow-[0_4px_24px_rgba(26,78,38,0.06)]" style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #EBF4ED 100%)' }}>
              {/* Top badges */}
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
                  {product.destacado && !product.bestseller && (
                    <span className="inline-flex items-center gap-1 bg-white text-[#1A4E26] border border-[#1A4E26]/30 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-sm">
                      Destacado
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

            {/* Trust badges row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: <Truck size={18} />, label: 'Envío Ecuador', sub: '24-72 h' },
                { icon: <ShieldCheck size={18} />, label: 'Compra segura', sub: 'Garantizada' },
                { icon: <Award size={18} />, label: 'Calidad', sub: 'Certificada' },
              ].map((b) => (
                <div key={b.label} className="bg-white border border-[#C8D8CB] rounded-2xl p-3 text-center">
                  <div className="text-[#1A4E26] flex justify-center mb-1.5">{b.icon}</div>
                  <p className="text-[#111111] font-semibold text-xs leading-tight">{b.label}</p>
                  <p className="text-[#9CA3AF] text-[10px] leading-tight mt-0.5">{b.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Buy box */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col"
          >
            {/* Category + share */}
            <div className="flex items-center justify-between mb-3">
              <Link
                to={`/productos?cat=${product.categoriaKey}`}
                className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#1A4E26] bg-[#1A4E26]/10 border border-[#1A4E26]/20 px-3 py-1.5 rounded-full hover:bg-[#1A4E26] hover:text-white transition-colors"
              >
                {product.categoria}
              </Link>
              <button
                aria-label="Compartir"
                className="w-9 h-9 rounded-full border border-[#C8D8CB] hover:border-[#1A4E26] flex items-center justify-center text-[#6B7280] hover:text-[#1A4E26] transition-colors"
              >
                <Share2 size={16} />
              </button>
            </div>

            {/* Name + tagline */}
            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-[#111111] mb-2 leading-[1.1]">
              {product.nombre}
            </h1>
            {product.tagline && (
              <p className="text-[#1A4E26] text-base sm:text-lg italic mb-3 font-medium">{product.tagline}</p>
            )}

            {/* Rating placeholder */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-0.5 text-[#D4AF37]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <span className="text-xs text-[#6B7280]">5.0 · Calidad ancestral</span>
            </div>

            {/* Description */}
            <p className="text-[#6B7280] text-base leading-relaxed mb-6">
              {product.detalleLargo ?? product.descripcion}
            </p>

            {/* Presentation */}
            {product.presentacion && (
              <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6 pb-6 border-b border-[#C8D8CB]">
                <span className="font-semibold text-[#111111]">Presentación:</span>
                <span>{product.presentacion}</span>
              </div>
            )}

            {product.proximamente ? (
              <>
                <div className="bg-gradient-to-br from-[#0B2913] to-[#1A4E26] text-white rounded-2xl p-7 mb-5 text-center relative overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                  <div className="relative">
                    <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.3em] mb-3">
                      Disponible muy pronto
                    </p>
                    <h3 className="font-heading font-bold text-3xl text-white mb-2 leading-tight">
                      Próximamente
                    </h3>
                    <p className="text-white/75 text-sm leading-relaxed max-w-xs mx-auto">
                      Este producto estará disponible en nuestra tienda muy pronto.
                      Contáctanos para que te avisemos en cuanto llegue.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <a
                    href={`https://wa.me/${contactInfo.whatsapp}?text=Hola, me interesa ${product.nombre} cuando esté disponible. Por favor avísenme cuando llegue.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-2xl bg-[#D4AF37] text-[#0B2913] font-bold text-base flex items-center justify-center gap-2 hover:bg-[#E8C94A] shadow-[0_8px_24px_rgba(212,175,55,0.3)] transition-all"
                  >
                    Avísenme cuando esté disponible
                  </a>
                  <Link
                    to="/productos"
                    className="w-full py-3 rounded-2xl border border-[#C8D8CB] text-[#6B7280] font-semibold text-sm flex items-center justify-center gap-2 hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all bg-white"
                  >
                    Ver otros productos
                  </Link>
                </div>
              </>
            ) : (
              <>
            {/* Price block */}
            <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 mb-5">
              <div className="grid grid-cols-2 gap-4 pb-5 border-b border-[#C8D8CB]">
                <div>
                  <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Precio público</p>
                  <p className="font-heading font-bold text-3xl text-[#111111] leading-none">
                    ${product.pvp.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Precio distribuidor</p>
                  <p className="font-heading font-bold text-3xl text-[#1A4E26] leading-none">
                    ${distributorPrice.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[#D4AF37] font-semibold mt-1">50% OFF para socios</p>
                </div>
              </div>

              {/* Quantity selector */}
              <div className="flex items-center justify-between mt-5">
                <div>
                  <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Cantidad</p>
                  <div className="flex items-center border border-[#C8D8CB] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus size={14} className="text-[#6B7280]" />
                    </button>
                    <span className="w-12 text-center font-bold text-[#111111]">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus size={14} className="text-[#6B7280]" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1">Total</p>
                  <p className="font-heading font-bold text-2xl text-[#1A4E26] leading-none">
                    ${totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-2xl bg-[#1A4E26] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#163F1E] shadow-[0_8px_24px_rgba(26,78,38,0.3)] transition-all duration-200"
              >
                <ShoppingBag size={18} /> Comprar por WhatsApp
              </a>
              <Link
                to="/registro"
                className="w-full py-4 rounded-2xl border-2 border-[#D4AF37] text-[#1A4E26] font-bold text-base flex items-center justify-center gap-2 hover:bg-[#D4AF37] hover:text-[#0B2913] transition-all duration-200 bg-white"
              >
                <Heart size={18} /> Únete y compra a ${distributorPrice.toFixed(2)}
              </Link>
            </div>
              </>
            )}

            {/* Contact */}
            <a
              href={`tel:${contactInfo.telefono1}`}
              className="mt-4 flex items-center justify-center gap-2 text-[#6B7280] hover:text-[#1A4E26] text-sm transition-colors"
            >
              <Phone size={14} />
              ¿Dudas? Llámanos al {contactInfo.telefono1}
            </a>
          </motion.div>
        </div>

        {/* ── Tabbed info ─────────────────────────────────────── */}
        {tabs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="mt-16 bg-white border border-[#C8D8CB] rounded-3xl overflow-hidden"
          >
            <div className="border-b border-[#C8D8CB] overflow-x-auto">
              <div className="flex min-w-max">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-6 py-5 text-sm font-semibold relative transition-colors whitespace-nowrap ${
                      currentTab?.key === t.key
                        ? 'text-[#1A4E26]'
                        : 'text-[#6B7280] hover:text-[#111111]'
                    }`}
                  >
                    {t.label}
                    {currentTab?.key === t.key && (
                      <motion.span
                        layoutId="tabUnderline"
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#1A4E26] rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-10">
              {currentTab?.key === 'beneficios' && product.beneficios && (
                <div>
                  <h2 className="font-heading font-bold text-2xl text-[#111111] mb-6">¿Qué hace este producto por ti?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.beneficios.map((b) => (
                      <div key={b} className="flex items-start gap-3 bg-[#F4F7F5] rounded-xl p-4">
                        <CheckCircle2 size={20} className="text-[#1A4E26] mt-0.5 shrink-0" />
                        <span className="text-[#111111] text-sm font-medium leading-snug">{b}</span>
                      </div>
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
                    <h2 className="font-heading font-bold text-2xl text-[#111111] mb-2">Ingredientes naturales</h2>
                    <p className="text-[#6B7280] text-sm mb-6">Formulado con plantas, extractos y nutrientes seleccionados.</p>

                    {conImagen.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                        {conImagen.map((ing, i) => (
                          <motion.div
                            key={ing.name + i}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3) }}
                            className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden hover:border-[#1A4E26]/40 hover:shadow-[0_8px_24px_rgba(26,78,38,0.15)] hover:-translate-y-0.5 transition-all duration-300 group cursor-default"
                            title={ing.description}
                          >
                            <div className="aspect-square relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EBF4ED 70%, #D5ECD9 100%)' }}>
                              <img
                                src={ing.image}
                                alt={ing.name}
                                className="absolute inset-0 w-full h-full object-contain p-3 sm:p-4 group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                              />
                            </div>
                            <div className="px-2 py-2.5 border-t border-[#C8D8CB] text-center bg-white">
                              <p className="text-[#111111] text-[11px] sm:text-xs font-bold leading-tight line-clamp-2">{ing.name}</p>
                              {ing.description && (
                                <p className="text-[#6B7280] text-[9px] mt-0.5 leading-snug line-clamp-1">{ing.description}</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {otros.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold mb-3">Otros componentes</p>
                        <div className="flex flex-wrap gap-2">
                          {otros.map((ing, i) => (
                            <span
                              key={ing.name + i}
                              className="inline-flex items-center gap-1.5 bg-[#1A4E26]/10 border border-[#1A4E26]/20 text-[#1A4E26] font-semibold px-3 py-1.5 rounded-xl text-xs"
                            >
                              <Leaf size={11} /> {ing.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {nutrientes.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-3">Vitaminas y minerales</p>
                        <div className="flex flex-col gap-2">
                          {nutrientes.map((ing, i) => (
                            <div
                              key={ing.name + i}
                              className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#0B2913] rounded-xl px-3 py-2 text-xs"
                            >
                              <span className="text-[#D4AF37] font-bold mr-1.5">★</span>
                              <span className="font-semibold">{ing.name}</span>
                              {ing.description && (
                                <span className="text-[#6B7280] ml-1">— {ing.description}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {currentTab?.key === 'modo-uso' && product.modoUso && (
                <div>
                  <h2 className="font-heading font-bold text-2xl text-[#111111] mb-4">Cómo usarlo</h2>
                  <div className="bg-[#F4F7F5] border-l-4 border-[#1A4E26] rounded-r-xl p-5">
                    <p className="text-[#111111] text-base leading-relaxed">{product.modoUso}</p>
                  </div>
                </div>
              )}

              {currentTab?.key === 'precauciones' && product.precauciones && (
                <div>
                  <h2 className="font-heading font-bold text-2xl text-[#111111] mb-4 flex items-center gap-2">
                    <AlertCircle size={22} className="text-[#D4AF37]" />
                    Precauciones
                  </h2>
                  <div className="bg-[#FFF8E6] border-l-4 border-[#D4AF37] rounded-r-xl p-5">
                    <p className="text-[#111111] text-base leading-relaxed">{product.precauciones}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ── Ficha de Revista (página oficial del producto) ──── */}
        {product.revistaPagina && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="mt-10 bg-gradient-to-br from-[#0B2913] to-[#1A4E26] rounded-3xl overflow-hidden relative"
          >
            <div
              className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 sm:p-8 items-center">
              <div className="lg:col-span-2 text-white">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-[#D4AF37]/30 rounded-full px-3 py-1 mb-3">
                  <BookOpen size={12} className="text-[#D4AF37]" />
                  <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">Revista Sumak 2026</span>
                </div>
                <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white leading-tight mb-3">
                  Ficha oficial del producto
                </h2>
                <p className="text-white/75 text-sm leading-relaxed mb-5">
                  Conoce todos los detalles, ingredientes ilustrados y beneficios de este producto en la página oficial de la Revista Sumak.
                </p>
                <button
                  onClick={() => setRevistaOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#D4AF37] text-[#0B2913] font-bold text-sm hover:bg-[#E8C94A] transition-all shadow-[0_8px_24px_rgba(212,175,55,0.35)]"
                >
                  <Maximize2 size={14} />
                  Ver página completa
                </button>
              </div>

              <div className="lg:col-span-3">
                <button
                  onClick={() => setRevistaOpen(true)}
                  className="group block w-full rounded-2xl overflow-hidden border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all shadow-2xl bg-white"
                  aria-label="Ver ficha completa de la revista"
                >
                  <img
                    src={product.revistaPagina}
                    alt={`Ficha oficial de ${product.nombre} en la Revista Sumak`}
                    className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Product info table ──────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="mt-10 bg-white border border-[#C8D8CB] rounded-3xl p-6 sm:p-10"
        >
          <h2 className="font-heading font-bold text-2xl text-[#111111] mb-6">Ficha técnica</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1">Código</p>
              <p className="text-[#111111] font-mono font-semibold">#{product.codigo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1">Categoría</p>
              <p className="text-[#111111] font-semibold">{product.categoria}</p>
            </div>
            {product.presentacion && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1">Presentación</p>
                <p className="text-[#111111] font-semibold">{product.presentacion}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1">Laboratorio</p>
              <p className="text-[#111111] font-semibold">Sumak Jambi</p>
            </div>
          </div>
        </motion.section>

        {/* ── Related products ────────────────────────────────── */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
              <div>
                <p className="text-[#1A4E26] text-xs font-semibold uppercase tracking-[0.3em] mb-2">También te puede gustar</p>
                <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Productos relacionados</h2>
              </div>
              <Link to={`/productos?cat=${product.categoriaKey}`} className="inline-flex items-center gap-2 text-[#1A4E26] font-semibold text-sm hover:gap-3 transition-all">
                Ver categoría <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {relatedProducts.map((p) => (
                <Link
                  key={p.codigo}
                  to={`/productos/${p.slug}`}
                  className="group bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden hover:border-[#1A4E26]/40 hover:shadow-[0_8px_28px_rgba(26,78,38,0.12)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="relative h-44 sm:h-52 overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Leaf size={40} className="text-[#1A4E26] opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#1A4E26] mb-1">{p.categoria}</p>
                    <h3 className="font-heading font-bold text-[#111111] text-sm mb-2 leading-tight line-clamp-2 group-hover:text-[#1A4E26] transition-colors">
                      {p.nombre}
                    </h3>
                    <p className="font-heading font-bold text-[#111111] text-lg">${p.pvp.toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Back link ───────────────────────────────────────── */}
        <div className="mt-16 text-center">
          <Link
            to="/productos"
            className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#1A4E26] text-sm transition-colors"
          >
            <ArrowLeft size={15} /> Volver a la tienda
          </Link>
        </div>
      </div>

      {/* ── Lightbox modal de la revista ─────────────────────── */}
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
            {/* Controles */}
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

            {/* Image */}
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
                Ficha de la Revista Sumak 2026 · {product.nombre} — Toca fuera de la imagen para cerrar
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
