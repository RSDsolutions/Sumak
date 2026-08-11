import React, { useState } from 'react';
import { Star, ShieldCheck, ThumbsUp, CheckCircle2, MessageSquare } from 'lucide-react';

export interface ReviewItem {
  id: string;
  autor: string;
  ciudad: string;
  rating: number;
  titulo: string;
  comentario: string;
  fecha: string;
  verificado: boolean;
  productoNombre?: string;
  likes: number;
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    autor: 'Martha Benítez',
    ciudad: 'Quito, Pichincha',
    rating: 5,
    titulo: 'Resultados notables desde la primera semana',
    comentario: 'Lo consumo todos los días por la mañana. He sentido un aumento increíble de energía y mis clientes me lo vuelven a pedir cada mes sin falta.',
    fecha: 'hace 3 días',
    verificado: true,
    likes: 18,
  },
  {
    id: 'rev-2',
    autor: 'Ing. Carlos Zambrano',
    ciudad: 'Guayaquil, Guayas',
    rating: 5,
    titulo: 'Excelente calidad y margen de ganancia como distribuidor',
    comentario: 'La presentación es muy profesional y el sabor es agradable. Los puntos binarios que genera para la calificación mensual valen totalmente la pena.',
    fecha: 'hace 1 semana',
    verificado: true,
    likes: 12,
  },
  {
    id: 'rev-3',
    autor: 'Dra. Patricia Morales',
    ciudad: 'Cuenca, Azuay',
    rating: 5,
    titulo: 'Recomendado para salud articular y bienestar',
    comentario: 'Como profesional de la salud aprecio mucho la pureza de los ingredientes naturales y el registro sanitario al día. Producto 100% garantizado.',
    fecha: 'hace 2 semanas',
    verificado: true,
    likes: 24,
  },
  {
    id: 'rev-4',
    autor: 'Gonzalo Viteri',
    ciudad: 'Ambato, Tungurahua',
    rating: 5,
    titulo: 'Mi producto estrella para reventas',
    comentario: 'Es el producto que más rápido rota en mi equipo. La entrega llegó en menos de 48 horas con Servientrega.',
    fecha: 'hace 3 semanas',
    verificado: true,
    likes: 9,
  },
];

interface ProductReviewsProps {
  productName?: string;
  className?: string;
}

export default function ProductReviews({
  productName,
  className = '',
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_REVIEWS);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const handleLike = (id: string) => {
    if (likedIds.has(id)) return;
    setLikedIds((prev) => new Set(prev).add(id));
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r))
    );
  };

  const averageRating = 4.9;
  const totalReviews = 142;

  return (
    <div className={`rounded-3xl bg-white border border-[#C8D8CB] p-6 sm:p-8 shadow-xs ${className}`}>
      {/* Header & Rating Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#C8D8CB]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] px-2.5 py-0.5 rounded-full border border-[#1A4E26]/20">
              <ShieldCheck size={13} className="text-[#22C55E]" /> Opiniones Verificadas
            </span>
          </div>
          <h3 className="font-heading font-bold text-xl text-[#111111]">
            Experiencias de Distribuidores y Clientes
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Valoraciones de usuarios reales que han adquirido y probado este producto en Ecuador.
          </p>
        </div>

        {/* Big Rating Badge */}
        <div className="flex items-center gap-4 bg-[#F4F7F5] px-5 py-3.5 rounded-2xl border border-[#C8D8CB]/80">
          <div className="text-center">
            <span className="font-heading font-black text-3xl text-[#1A4E26] block leading-none">
              {averageRating}
            </span>
            <div className="flex items-center gap-0.5 text-[#D4AF37] mt-1 justify-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-[#D4AF37]" />
              ))}
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium block mt-0.5">
              {totalReviews} reseñas
            </span>
          </div>

          <div className="hidden sm:flex flex-col gap-1 text-[11px] text-[#6B7280] border-l border-[#C8D8CB] pl-4">
            <div className="flex items-center gap-2">
              <span>5 ★</span>
              <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#D4AF37] h-full rounded-full" style={{ width: '92%' }} />
              </div>
              <span className="font-bold text-[#111111]">92%</span>
            </div>
            <div className="flex items-center gap-2">
              <span>4 ★</span>
              <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#D4AF37] h-full rounded-full" style={{ width: '8%' }} />
              </div>
              <span className="font-bold text-[#111111]">8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-slate-100 pt-2">
        {reviews.map((rev) => (
          <div key={rev.id} className="py-4 sm:py-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Initial Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#EBF4ED] text-[#1A4E26] font-bold text-xs flex items-center justify-center border border-[#1A4E26]/20">
                  {rev.autor.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading font-bold text-sm text-[#111111] leading-tight">
                      {rev.autor}
                    </p>
                    {rev.verificado && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1A4E26] bg-[#EBF4ED] px-2 py-0.5 rounded-full border border-[#1A4E26]/30">
                        <CheckCircle2 size={11} className="text-[#22C55E]" /> Compra Verificada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    {rev.ciudad} • <span className="italic">{rev.fecha}</span>
                  </p>
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5 text-[#D4AF37] shrink-0">
                {[...Array(rev.rating)].map((_, i) => (
                  <Star key={i} size={13} className="fill-[#D4AF37]" />
                ))}
              </div>
            </div>

            <p className="font-bold text-xs sm:text-sm text-[#111111] mt-1">
              "{rev.titulo}"
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {rev.comentario}
            </p>

            {/* Helpful feedback */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span className="text-[#6B7280]">
                {productName ? `Sobre: ${productName}` : 'Producto oficial Sumak'}
              </span>
              <button
                type="button"
                onClick={() => handleLike(rev.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  likedIds.has(rev.id)
                    ? 'bg-[#EBF4ED] text-[#1A4E26] border-[#1A4E26]/30 font-bold'
                    : 'bg-white hover:bg-slate-50 text-[#6B7280] border-slate-200'
                }`}
              >
                <ThumbsUp size={12} className={likedIds.has(rev.id) ? 'fill-[#1A4E26]' : ''} />
                <span>¿Útil? ({rev.likes})</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
