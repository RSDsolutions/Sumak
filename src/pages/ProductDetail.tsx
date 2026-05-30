import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { products } from '../data';
import { CheckCircle2, ShoppingBag, Leaf, ArrowLeft } from 'lucide-react';
import { contactInfo } from '../data';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-[#111111] text-xl font-heading font-bold">Producto no encontrado.</p>
        <Link to="/productos" className="text-[#1A4E26] font-semibold hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Ver todos los productos
        </Link>
      </div>
    );
  }

  const distributorPrice = product.pvp / 2;

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Back link */}
        <Link
          to="/productos"
          className="inline-flex items-center gap-2 text-[#6B7280] text-sm hover:text-[#1A4E26] transition-colors mb-8"
        >
          <ArrowLeft size={15} /> Volver a Productos
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Product visual */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-full aspect-square max-w-sm mx-auto lg:mx-0 rounded-2xl bg-gradient-to-br from-[#EBF4ED] to-[#F4F7F5] border border-[#C8D8CB] flex items-center justify-center shadow-[0_0_60px_rgba(26,78,38,0.08)]">
              <Leaf size={80} className="text-[#1A4E26] opacity-40" />
            </div>

            <div className="mt-6 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-5">
              <h3 className="font-heading font-semibold text-[#111111] text-sm mb-3">Información del Producto</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#9CA3AF] block mb-0.5">Código</span>
                  <span className="text-[#111111] font-mono font-medium">#{product.codigo}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block mb-0.5">Categoría</span>
                  <span className="text-[#111111] font-medium">{product.categoria}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block mb-0.5">PVP Público</span>
                  <span className="text-[#111111] font-bold text-base">${product.pvp.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block mb-0.5">Precio Distribuidor</span>
                  <span className="text-[#1A4E26] font-bold text-base">${distributorPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Product info */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-5"
          >
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#1A4E26] bg-[#1A4E26]/10 border border-[#1A4E26]/20 px-3 py-1.5 rounded-full mb-3">
                {product.categoria}
              </span>
              <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3 leading-tight">
                {product.nombre}
              </h1>
              <p className="text-[#6B7280] text-base leading-relaxed">{product.descripcion}</p>
            </div>

            {/* Pricing */}
            <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#C8D8CB]">
                <div>
                  <p className="text-[#9CA3AF] text-xs mb-1">Precio Público</p>
                  <p className="font-heading font-bold text-3xl text-[#111111]">${product.pvp.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#9CA3AF] text-xs mb-1">Precio Distribuidor (50%)</p>
                  <p className="font-heading font-bold text-3xl text-[#1A4E26]">${distributorPrice.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-[#D4AF37] text-xs text-center">
                Tu ganancia por venta directa: <strong>${distributorPrice.toFixed(2)}</strong>
              </p>
            </div>

            {/* Benefits */}
            <div>
              <ul className="flex flex-col gap-3">
                {[
                  'Producto 100% natural elaborado en Sumak Jambi',
                  'Fórmula con extractos de plantas medicinales ancestrales',
                  '50% de descuento para distribuidores activos',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#1A4E26] mt-0.5 shrink-0" />
                    <span className="text-[#6B7280] text-sm">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
              <a
                href={`https://wa.me/${contactInfo.whatsapp}?text=Hola, quiero adquirir: ${product.nombre} (PVP: $${product.pvp.toFixed(2)})`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#163F1E] shadow-[0_0_20px_rgba(26,78,38,0.25)] transition-all duration-200"
              >
                <ShoppingBag size={18} /> Comprar por WhatsApp
              </a>
              <Link
                to="/registro"
                className="w-full py-4 rounded-xl border-2 border-[#D4AF37] text-[#D4AF37] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#D4AF37] hover:text-white transition-all duration-200"
              >
                Únete y compra a ${distributorPrice.toFixed(2)}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
