import { useParams, Link } from 'react-router-dom';
import { productsData } from '../data';
import { ProductBottleSVG } from '../components/ProductBottleSVG';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

export default function ProductDetail() {
  const { slug } = useParams();
  const product = productsData.find(p => p.slug === slug);
  const [activeTab, setActiveTab] = useState('Descripción');

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-black text-[#F0F0F0] text-xl">
        Producto no encontrado. <Link to="/productos" className="text-brand-emerald ml-2">Volver</Link>
      </div>
    );
  }

  const tabs = ['Descripción', 'Ingredientes', 'Beneficios', 'Modo de uso'];

  return (
    <div className="w-full bg-brand-black min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        
        {/* Left: Images & Info */}
        <div className="flex flex-col gap-6">
          {/* Main Image */}
          <div className="w-full h-[500px] bg-brand-surface border border-brand-border rounded-[24px] relative overflow-hidden flex justify-center items-center">
             <ProductBottleSVG category={product.category} className="scale-125 md:scale-150" />
             {/* Thumbnail variants (visual only) */}
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30">
               {[1, 2, 3].map((v) => (
                 <div key={v} className={`w-12 h-12 rounded-lg border-2 ${v === 1 ? 'border-brand-emerald bg-[#2A2A2A]' : 'border-brand-border bg-brand-surface opacity-60'} cursor-pointer hover:opacity-100 transition-opacity flex items-center justify-center overflow-hidden`}>
                     <ProductBottleSVG category={product.category} className="scale-50" />
                 </div>
               ))}
             </div>
          </div>
          
          {/* Tabs */}
          <div className="mt-4">
            <div className="flex gap-6 border-b border-brand-border overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 font-medium text-sm transition-colors whitespace-nowrap relative ${
                     activeTab === tab ? 'text-brand-emerald' : 'text-brand-text-muted hover:text-[#F0F0F0]'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-emerald rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="py-6 text-brand-text-muted leading-relaxed">
              {activeTab === 'Descripción' && (
                <p>El {product.name} es una fórmula premium avanzada creada para proveer los mejores beneficios. {product.shortDesc} Ideal para incorporar a tu rutina diaria y potenciar tu calidad de vida.</p>
              )}
              {activeTab === 'Ingredientes' && (
                <ul className="flex flex-wrap gap-2">
                  {product.ingredients.map(ing => (
                    <li key={ing} className="px-3 py-1.5 bg-brand-surface rounded-md border border-brand-border text-sm flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-brand-emerald" /> {ing}
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === 'Beneficios' && (
                <p>Diseñado para {product.benefit.toLowerCase()}, aportar energía sostenible y proteger la salud celular a largo plazo. Resultados visibles desde la segunda semana de uso continuado.</p>
              )}
              {activeTab === 'Modo de uso' && (
                <p>Tomar 1 cápsula o una medida con abundante agua por la mañana. No exceder la dosis recomendada. Consulte a su médico antes de usar.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Keep action sticky */}
        <div className="relative">
          <div className="sticky top-[100px] bg-brand-surface border border-brand-border rounded-[24px] p-8 lg:p-10 shadow-2xl">
            <span className="inline-block px-3 py-1 bg-brand-emerald/10 text-brand-emerald text-xs font-bold tracking-widest uppercase rounded-full mb-4">
              {product.category}
            </span>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#F0F0F0] mb-2">{product.name}</h1>
            <p className="text-brand-text-muted text-lg mb-8">{product.benefit}</p>
            
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-end justify-between border-b border-brand-border pb-6 relative">
                 <div className="flex items-center gap-2">
                    <span className="text-3xl text-brand-emerald font-heading font-bold">${product.retailPrice.toFixed(2)}</span>
                    <span className="text-sm font-medium text-brand-text-muted uppercase tracking-wider mb-1">Retail</span>
                 </div>
                 <div className="flex flex-col items-end">
                    <div className="absolute top-2 right-0 w-[150px] h-6 bg-brand-gold/10 blur-[15px] rounded-full"></div>
                    <span className="text-2xl text-brand-gold font-heading font-bold relative z-10">${product.distributorPrice.toFixed(2)}</span>
                    <span className="text-[10px] font-medium text-brand-gold-dim uppercase tracking-wider relative z-10">Afiliado</span>
                 </div>
              </div>
              
              <ul className="flex flex-col gap-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-brand-emerald mt-0.5 shrink-0" />
                  <span className="text-[#F0F0F0] text-sm">Registro sanitario vigente en Ecuador</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-brand-emerald mt-0.5 shrink-0" />
                  <span className="text-[#F0F0F0] text-sm">Fórmula 100% natural libre de preservantes artificiales</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-brand-emerald mt-0.5 shrink-0" />
                  <span className="text-[#F0F0F0] text-sm">Gana hasta 30% recomendando este producto</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <a 
                href={`https://wa.me/593999999999?text=Hola, quiero adquirir el ${product.name} (${product.retailPrice}).`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 rounded-xl bg-brand-emerald text-white font-medium text-lg flex items-center justify-center gap-2 hover:bg-brand-emerald-hover transition-colors shadow-emerald-glow"
              >
                <ShoppingBag size={20} /> Comprar (Retail)
              </a>
              <Link 
                to="/registro"
                className="w-full py-4 rounded-xl border border-brand-gold bg-brand-gold/5 text-brand-gold font-medium text-lg flex items-center justify-center gap-2 hover:bg-brand-gold hover:text-brand-black transition-colors"
              >
                Comprar como Afiliado (${product.distributorPrice.toFixed(2)})
              </Link>
            </div>
            
            <div className="mt-6 flex justify-center">
               <span className="px-4 py-1.5 bg-[#222] border border-[#333] rounded-full text-xs text-brand-text-lighter font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-emerald inline-block"></span>
                  Stock disponible - Envío 24/48h
               </span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
