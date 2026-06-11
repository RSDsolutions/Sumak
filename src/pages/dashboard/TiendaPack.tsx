import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, ShoppingCart, Check, Package, Sparkles, TrendingUp,
  Award, Crown, Star, AlertCircle, Plus, ArrowRight,
} from 'lucide-react';
import { getPackBySlug, affiliatePackages } from '../../data';
import { useCart, type PackSelection } from '../../lib/cart';
import { useToast } from '../../lib/toast';
import PackBuilder from '../../components/PackBuilder';

export default function TiendaPack() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const toast = useToast();
  const [selections, setSelections] = useState<PackSelection[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const pack = slug ? getPackBySlug(slug) : undefined;

  if (!pack) {
    return (
      <div className="text-center py-20">
        <Package size={48} className="text-[#9CA3AF] mx-auto mb-3 opacity-50" />
        <h2 className="font-heading font-bold text-xl text-[#111111] mb-2">Pack no encontrado</h2>
        <p className="text-[#6B7280] text-sm mb-6">
          El pack que buscas no existe o fue removido.
        </p>
        <Link
          to="/dashboard/tienda"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all"
        >
          <ArrowLeft size={15} /> Volver a la tienda
        </Link>
      </div>
    );
  }

  const isComplete = totalUnits === pack.productos;

  function handleAddToCart() {
    if (!isComplete) {
      toast.error(
        `Debes elegir ${pack.productos} productos para completar tu ${pack.nombre}. ` +
        `Llevas ${totalUnits} / ${pack.productos}.`,
      );
      return;
    }
    const packCode = `PKG-${pack.paqueteKey.toUpperCase()}`;
    addItem({
      codigo: packCode,
      nombre: pack.nombre,
      pvp: pack.precio,
      precio: pack.precio,
      imagen: pack.imagen,
      packSelections: selections,
    }, 1);
    toast.success(`${pack.nombre} agregado al carrito con ${totalUnits} productos elegidos`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);
  }

  const packIcon = pack.paqueteKey === 'basico' ? Star
    : pack.paqueteKey === 'emprendedor' ? Award
    : Crown;

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/dashboard/tienda"
        className="inline-flex items-center gap-1.5 text-[#6B7280] hover:text-[#1A4E26] text-sm mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Volver a la tienda
      </Link>

      {/* Hero del pack */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Imagen */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2"
        >
          <div className="relative bg-white border border-[#C8D8CB] rounded-3xl overflow-hidden aspect-square shadow-lg">
            <img
              src={pack.imagen}
              alt={pack.nombre}
              className="w-full h-full object-cover"
            />
            {pack.destacado && (
              <span className="absolute top-4 left-4 bg-[#D4AF37] text-[#0B2913] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
                <Star size={11} className="inline mr-1" fill="currentColor" /> Más popular
              </span>
            )}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-3 bg-gradient-to-br from-white to-[#F4F7F5] border border-[#C8D8CB] rounded-3xl p-6 sm:p-8 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A4E26] flex items-center justify-center text-white">
              {(() => {
                const Icon = packIcon;
                return <Icon size={18} />;
              })()}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A4E26]">
              Paquete de Afiliación
            </span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-4xl text-[#111111] leading-tight mb-2">
            {pack.nombre}
          </h1>
          <p className="text-[#1A4E26] text-base italic mb-4">{pack.tagline}</p>
          <p className="text-[#6B7280] text-sm leading-relaxed mb-6">{pack.descripcion}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-[#C8D8CB] rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Precio</p>
              <p className="font-heading font-black text-2xl text-[#1A4E26]">${pack.precio}</p>
            </div>
            <div className="bg-white border border-[#C8D8CB] rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Puntos</p>
              <p className="font-heading font-black text-2xl text-[#D4AF37]">{pack.puntos}</p>
            </div>
            <div className="bg-white border border-[#C8D8CB] rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Productos</p>
              <p className="font-heading font-black text-2xl text-[#111111]">{pack.productos}</p>
            </div>
          </div>

          {/* Beneficios */}
          <div className="mt-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-[#D4AF37]" /> Incluye además
            </p>
            <ul className="space-y-1.5">
              {pack.beneficios.map((b) => (
                <li key={b} className="flex items-center gap-2 text-xs text-[#374151]">
                  <Check size={12} className="text-[#1A4E26] shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Pack builder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-[#1A4E26]" />
          <h2 className="font-heading font-bold text-lg text-[#111111]">
            Elige los productos que incluye tu pack
          </h2>
        </div>
        <p className="text-[#6B7280] text-sm mb-4">
          Selecciona <strong className="text-[#1A4E26]">{pack.productos} productos</strong> del catálogo Sumak.
          Puedes repetir el mismo producto varias veces. El precio del pack es fijo de
          <strong className="text-[#1A4E26]"> ${pack.precio}</strong> sin importar qué elijas.
        </p>

        <PackBuilder
          pack={pack}
          onSelectionsChange={(sels, total) => {
            setSelections(sels);
            setTotalUnits(total);
          }}
        />
      </motion.div>

      {/* Footer CTA — sticky */}
      <div className="sticky bottom-4 mt-6 z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white border border-[#C8D8CB] rounded-2xl shadow-[0_20px_50px_rgba(26,78,38,0.18)] p-4 sm:p-5"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-heading font-bold text-[#111111] text-base">{pack.nombre}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isComplete
                    ? 'bg-[#D4AF37] text-[#0B2913]'
                    : totalUnits > 0
                    ? 'bg-[#1A4E26] text-white'
                    : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#9CA3AF]'
                }`}>
                  {totalUnits} / {pack.productos} productos
                </span>
              </div>
              <p className="text-[#6B7280] text-xs">
                {isComplete
                  ? '¡Pack completo! Listo para agregar al carrito.'
                  : `Faltan ${pack.productos - totalUnits} para completar tu selección.`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Precio</p>
                <p className="font-heading font-black text-2xl text-[#1A4E26]">${pack.precio}</p>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!isComplete}
                className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  isComplete
                    ? justAdded
                      ? 'bg-[#D4AF37] text-[#0B2913] hover:bg-[#E8C94A] shadow-[0_4px_16px_rgba(212,175,55,0.4)]'
                      : 'bg-[#1A4E26] text-white hover:bg-[#163F1E] shadow-[0_4px_16px_rgba(26,78,38,0.3)]'
                    : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#9CA3AF] cursor-not-allowed'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check size={16} /> Agregado al carrito
                  </>
                ) : isComplete ? (
                  <>
                    <ShoppingCart size={16} /> Agregar al carrito
                  </>
                ) : (
                  <>
                    <AlertCircle size={15} /> Selecciona {pack.productos - totalUnits} más
                  </>
                )}
              </button>
              {justAdded && (
                <button
                  onClick={() => navigate('/dashboard/pedido/nuevo')}
                  className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-white border border-[#1A4E26] text-[#1A4E26] text-sm font-bold hover:bg-[#EBF4ED] transition-all"
                >
                  Ir al carrito <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Otros packs */}
      <div className="mt-10">
        <h3 className="font-heading font-bold text-base text-[#111111] mb-3 flex items-center gap-2">
          <Plus size={15} className="text-[#1A4E26]" /> Otros paquetes disponibles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {affiliatePackages
            .filter((p) => p.slug !== pack.slug)
            .map((p) => (
              <Link
                key={p.slug}
                to={`/dashboard/tienda/pack/${p.slug}`}
                className="flex items-center gap-3 p-3 bg-white border border-[#C8D8CB] rounded-xl hover:border-[#1A4E26]/40 hover:bg-[#FAFBFA] transition-all group"
              >
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#111111] text-sm group-hover:text-[#1A4E26] transition-colors">
                    {p.nombre}
                  </p>
                  <p className="text-[10px] text-[#6B7280] truncate">{p.tagline}</p>
                  <p className="text-sm font-bold text-[#1A4E26] mt-0.5">
                    ${p.precio} · {p.productos} productos
                  </p>
                </div>
                <ArrowRight size={15} className="text-[#9CA3AF] group-hover:text-[#1A4E26] transition-colors shrink-0" />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
