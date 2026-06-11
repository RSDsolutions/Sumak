import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, Check, Package, Sparkles, Crown, Award, Star, ArrowRight,
  Users, TrendingUp, Wallet, ShieldCheck,
} from 'lucide-react';
import { getPackBySlug, affiliatePackages, products } from '../data';
import { useSEO } from '../lib/seo';

export default function Pack() {
  const { slug } = useParams<{ slug: string }>();
  const pack = slug ? getPackBySlug(slug) : undefined;

  useSEO({
    title: pack ? `${pack.nombre} — Sumak Vida Ecuador` : 'Pack — Sumak',
    description: pack?.descripcion ?? 'Paquetes de afiliación Sumak.',
    url: `/packs/${slug ?? ''}`,
  });

  if (!pack) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center px-4 py-32">
        <div className="text-center">
          <Package size={48} className="text-[#9CA3AF] mx-auto mb-3 opacity-50" />
          <h2 className="font-heading font-bold text-2xl text-[#111111] mb-2">Pack no encontrado</h2>
          <Link
            to="/productos"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all"
          >
            <ArrowLeft size={15} /> Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const Icon = pack.paqueteKey === 'basico' ? Star
    : pack.paqueteKey === 'emprendedor' ? Award
    : Crown;
  const accent = pack.paqueteKey === 'lider' ? '#D4AF37' : '#1A4E26';

  const benefits = [
    { icon: TrendingUp, title: 'Comisiones desde el día 1', desc: 'Gana hasta 40% por afiliación directa.' },
    { icon: Users, title: 'Red binaria 14 niveles', desc: 'Construye tu equipo y gana por cada nivel.' },
    { icon: Wallet, title: 'Productos a precio distribuidor', desc: '50% off en todo el catálogo Sumak.' },
    { icon: ShieldCheck, title: 'Empresa registrada', desc: 'Operación legal en Ecuador con RUC.' },
  ];

  // Productos populares como muestra de lo que se puede incluir
  const featuredProducts = products
    .filter((p) => !p.proximamente)
    .sort((a, b) => {
      const ra = (a.bestseller ? 3 : 0) + (a.destacado ? 2 : 0) + (a.nuevo ? 1 : 0);
      const rb = (b.bestseller ? 3 : 0) + (b.destacado ? 2 : 0) + (b.nuevo ? 1 : 0);
      return rb - ra;
    })
    .slice(0, 8);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2E18 0%, #1A4E26 60%, #0F2E18 100%)' }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#FFDD00]/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <Link
            to="/productos"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Volver al catálogo
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Imagen */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl overflow-hidden aspect-square shadow-2xl">
                <img
                  src={pack.imagen}
                  alt={pack.nombre}
                  className="w-full h-full object-cover"
                />
                {pack.destacado && (
                  <span className="absolute top-5 left-5 bg-[#D4AF37] text-[#0B2913] text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md">
                    <Star size={11} className="inline mr-1" fill="currentColor" /> Más popular
                  </span>
                )}
              </div>
              {/* Glow */}
              <div
                className="absolute -inset-6 -z-10 rounded-3xl opacity-30 blur-3xl"
                style={{ backgroundColor: accent }}
              />
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Icon size={20} />
                </div>
                <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.25em]">
                  Paquete de Afiliación
                </span>
              </div>

              <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-3">
                {pack.nombre}
              </h1>
              <p className="text-[#D4AF37] text-lg italic mb-5">{pack.tagline}</p>
              <p className="text-white/75 text-base leading-relaxed mb-6">
                {pack.descripcion}
              </p>

              {/* Precio */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-heading font-black text-5xl text-white">${pack.precio}</span>
                <span className="text-white/60 text-sm">
                  · {pack.puntos} puntos · {pack.productos} productos
                </span>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={`/registro?paquete=${pack.paqueteKey}`}
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-[#D4AF37] text-[#0B2913] font-bold text-sm hover:bg-[#E8C94A] transition-all shadow-[0_8px_24px_rgba(212,175,55,0.4)]"
                >
                  Afiliarme con este pack <ArrowRight size={16} />
                </Link>
                <Link
                  to="/oportunidad"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/30 text-white font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Conoce más
                </Link>
              </div>

              <p className="text-white/50 text-xs mt-4">
                💡 Los distribuidores activos pueden armar y comprar este pack desde su panel
                con los productos exactos que prefieran.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 px-4 sm:px-6 bg-[#F4F7F5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#1A4E26]/10 text-[#1A4E26] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              ¿Qué obtienes?
            </span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111]">
              Tu paquete incluye mucho más que productos
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white border border-[#C8D8CB] rounded-2xl p-5"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] flex items-center justify-center text-white mb-3">
                  <b.icon size={18} />
                </div>
                <h3 className="font-heading font-bold text-base text-[#111111] mb-1">{b.title}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Lista de beneficios del pack */}
          <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 max-w-3xl mx-auto">
            <h3 className="font-heading font-bold text-base text-[#111111] mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-[#D4AF37]" /> Además incluye
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pack.beneficios.map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm text-[#374151]">
                  <Check size={14} className="text-[#1A4E26] shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Productos que puedes elegir */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#D4AF37]/15 text-[#92680A] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              Productos disponibles
            </span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
              Elige los {pack.productos} productos que quieras
            </h2>
            <p className="text-[#6B7280] text-base max-w-2xl mx-auto">
              Al afiliarte y activar tu cuenta, podrás armar este pack con los productos que tú decidas.
              Estos son algunos de los más populares del catálogo:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {featuredProducts.map((p) => (
              <Link
                key={p.codigo}
                to={`/productos/${p.slug}`}
                className="block bg-white border border-[#C8D8CB] rounded-xl overflow-hidden hover:border-[#1A4E26]/40 hover:shadow-md transition-all group"
              >
                <div className="aspect-square overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                  {p.imagen ? (
                    <img
                      src={p.imagen}
                      alt={p.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={32} className="text-[#1A4E26] opacity-30" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#1A4E26] mb-1 font-semibold">
                    {p.categoria}
                  </p>
                  <p className="font-bold text-[#111111] text-sm leading-tight line-clamp-2">
                    {p.nombre}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 text-[#1A4E26] font-bold text-sm hover:text-[#0F2E18] transition-colors"
            >
              Ver catálogo completo <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Comparación con otros packs */}
      <section className="py-16 px-4 sm:px-6 bg-[#F4F7F5]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">
              Otros paquetes disponibles
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {affiliatePackages.map((p) => {
              const isActive = p.slug === pack.slug;
              const OtherIcon = p.paqueteKey === 'basico' ? Star
                : p.paqueteKey === 'emprendedor' ? Award
                : Crown;
              return (
                <Link
                  key={p.slug}
                  to={`/packs/${p.slug}`}
                  className={`block bg-white border-2 rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 ${
                    isActive
                      ? 'border-[#D4AF37] shadow-[0_12px_32px_rgba(212,175,55,0.2)]'
                      : 'border-[#C8D8CB] hover:border-[#1A4E26]/40'
                  }`}
                >
                  <div className="aspect-[5/3] overflow-hidden" style={{ background: 'linear-gradient(135deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                    <img src={p.imagen} alt={p.nombre} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <OtherIcon size={14} className={p.paqueteKey === 'lider' ? 'text-[#D4AF37]' : 'text-[#1A4E26]'} />
                      <h3 className="font-heading font-bold text-[#111111] text-sm">{p.nombre}</h3>
                      {isActive && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="font-heading font-black text-2xl text-[#1A4E26]">${p.precio}</p>
                    <p className="text-[11px] text-[#6B7280]">{p.productos} productos · {p.puntos} puntos</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
