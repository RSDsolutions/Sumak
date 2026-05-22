import { Link } from 'react-router-dom';
import { productsData } from '../data';
import { ProductCard } from '../components/ProductCard';
import { Leaf, TrendingUp, ChevronRight, CheckCircle2, Users, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductBottleSVG } from '../components/ProductBottleSVG';

export default function Home() {
  const featuredProducts = productsData.slice(0, 4);

  return (
    <div className="w-full">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-12 overflow-hidden bg-brand-black">
        {/* Background gradient from design HTML */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 40%, #0A2518 0%, transparent 60%)' }}></div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1A2A20 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-7 flex flex-col gap-6"
          >
            <h1 className="font-heading font-bold text-5xl sm:text-6xl lg:text-[64px] leading-[1.05] tracking-tighter text-[#F0F0F0]">
              Transforma tu <span className="text-brand-emerald">salud.</span>
              <br />
              Transforma tu <span className="text-brand-gold">vida.</span>
            </h1>
            <p className="text-lg text-brand-text-muted leading-relaxed max-w-xl">
              Suplementos premium diseñados para tu bienestar, respaldados por una comunidad que crece contigo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link to="/productos" className="px-8 py-4 rounded-xl bg-brand-emerald text-white font-bold text-lg text-center hover:bg-brand-emerald-hover shadow-emerald-glow transition-all duration-300">
                Conocer Productos
              </Link>
              <Link to="/registro" className="px-8 py-4 rounded-xl border border-[#F0F0F0]/20 text-[#F0F0F0] font-bold text-lg text-center hover:bg-[#F0F0F0]/5 transition-all duration-300">
                Unirse a la Red
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-5 relative"
          >
            <div className="bg-brand-surface border border-brand-emerald/30 rounded-[24px] p-6 relative shadow-2xl">
              <div className="absolute -top-6 -right-6 px-4 py-2 bg-brand-emerald rounded-full shadow-emerald-glow z-30 border border-brand-emerald-bright transform rotate-6">
                <span className="font-heading font-bold text-white text-xs tracking-widest uppercase">ENVÍO A TODO ECUADOR</span>
              </div>
              <div className="relative h-[300px] w-full flex items-center justify-center">
                 <div className="absolute w-[180px] h-full rotate-[-15deg] translate-x-[-60px] opacity-70 z-10">
                   <ProductBottleSVG category="Inmunidad" />
                 </div>
                 <div className="absolute w-[200px] h-full z-20">
                   <ProductBottleSVG category="Energía" />
                 </div>
                 <div className="absolute w-[180px] h-full rotate-[15deg] translate-x-[60px] opacity-70 z-10">
                   <ProductBottleSVG category="Bienestar" />
                 </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="w-full bg-brand-surface border-y border-brand-border py-12 relative z-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-heading font-bold text-4xl sm:text-5xl text-brand-emerald mb-2">5,000+</span>
            <span className="text-brand-text-muted text-sm">Distribuidores Activos</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-heading font-bold text-4xl sm:text-5xl text-brand-emerald mb-2">12+</span>
            <span className="text-brand-text-muted text-sm">Productos Premium</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-heading font-bold text-4xl sm:text-5xl text-gold-shimmer mb-2">$500-$5k</span>
            <span className="text-brand-text-muted text-sm">Ingreso Mensual Potencial</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="font-heading font-bold text-4xl sm:text-5xl text-brand-emerald mb-2">100%</span>
            <span className="text-brand-text-muted text-sm">Respaldo en Ecuador</span>
          </div>
        </div>
      </section>

      {/* 3. DUAL AUDIENCE SPLIT SECTION */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2">
        <div className="bg-brand-surface border-t-[3px] border-brand-emerald p-12 lg:p-20 flex flex-col items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-emerald/10 flex items-center justify-center">
            <Leaf className="text-brand-emerald w-8 h-8" />
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl">¿Buscas mejorar tu salud?</h2>
          <p className="text-brand-text-muted text-lg leading-relaxed mb-4">
            Descubre nuestros suplementos naturales premium, formulados para resultados reales y duraderos.
          </p>
          <Link to="/productos" className="flex items-center gap-2 text-brand-emerald font-semibold hover:text-brand-emerald-bright transition-colors group">
            Ver Productos
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="bg-[#1A2A20] border-t-[3px] border-brand-gold p-12 lg:p-20 flex flex-col items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center">
            <TrendingUp className="text-brand-gold w-8 h-8" />
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-brand-gold">¿Buscas ingresos adicionales?</h2>
          <p className="text-brand-text-muted text-lg leading-relaxed mb-4">
            Únete a nuestra red binaria y genera ingresos residuales mientras ayudas a otros.
          </p>
          <Link to="/plan-multinivel" className="flex items-center gap-2 text-brand-gold font-semibold hover:text-brand-gold-bright transition-colors group">
            Ver Plan
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* 4. PRODUCTS PREVIEW */}
      <section className="bg-brand-black py-24 relative overflow-hidden">
        {/* Subdued hexagon bg */}
        <div className="absolute inset-0 opacity-[0.05]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
             <defs>
                <pattern id="hexagons2" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                   <polygon points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2" fill="none" stroke="#FFFFFF" strokeWidth="1"/>
                   <polygon points="49.8,22 62.3,29.2 62.3,43.7 49.8,50.9 37.3,43.7 37.3,29.2" fill="none" stroke="#FFFFFF" strokeWidth="1"/>
                </pattern>
             </defs>
             <rect x="0" y="0" width="100%" height="100%" fill="url(#hexagons2)"/>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="font-heading font-bold text-4xl sm:text-[42px]">Nuestros Productos.</h2>
              <p className="text-brand-text-muted mt-4 text-lg">Nutrición de alto impacto para resultados visibles.</p>
            </div>
            <Link to="/productos" className="px-6 py-3 rounded-full border border-brand-border hover:border-brand-emerald text-[#F0F0F0] font-medium transition-colors w-fit whitespace-nowrap">
              Ver Catálogo Completo
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS TEASER */}
      <section className="bg-brand-light-bg py-24 px-6 text-brand-light-text">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-4xl sm:text-[42px] mb-4">¿Cómo funciona Sumak?</h2>
            <p className="text-[#555] text-lg max-w-2xl mx-auto">Un modelo simple y continuo para alcanzar la libertad financiera mientras consumes y recomiendas bienestar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Desktop connections */}
            <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-[#EFEFED] z-0">
               <div className="w-full h-full bg-brand-emerald origin-left opacity-30"></div>
            </div>

            {[
              { num: '1', title: 'Regístrate como distribuidor', desc: 'Únete a la red y adquiere tu kit de inicio con productos a precio preferencial.' },
              { num: '2', title: 'Comparte los productos', desc: 'Recomienda salud. Cada venta directa te genera hasta un 30% de comisión.' },
              { num: '3', title: 'Construye tu red', desc: 'Invita a otros a unirse y gana bonos binarios semanales sobre el volumen de tu equipo.' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center relative z-10">
                <div className="w-20 h-20 bg-brand-emerald rounded-full flex items-center justify-center font-heading font-bold text-3xl text-white shadow-emerald-glow mb-6 outline outline-[8px] outline-brand-light-bg">
                  {step.num}
                </div>
                <h3 className="font-heading font-semibold text-2xl mb-3">{step.title}</h3>
                <p className="text-[#444] leading-relaxed px-4">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Link to="/plan-multinivel" className="px-8 py-4 rounded-xl bg-brand-black text-[#F0F0F0] font-bold text-lg hover:bg-brand-emerald transition-colors shadow-lg">
              Ver plan completo
            </Link>
          </div>
        </div>
      </section>

      {/* 6. INCOME & OPPORTUNITY */}
      <section className="w-full bg-cta-gradient py-24 px-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[#000000] opacity-20 MixBlendMode"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          
          <div className="flex flex-col gap-6">
            <h2 className="font-heading font-bold text-4xl sm:text-[48px] leading-tight">Genera Ingresos Reales.</h2>
            <div className="bg-[#0A2518]/50 p-6 rounded-2xl border border-brand-emerald-bright/30 backdrop-blur-sm mt-2 mb-4 w-fit">
               <span className="block font-heading font-bold text-5xl sm:text-6xl text-gold-shimmer">$500–$5,000 / mes</span>
               <span className="text-white/70 text-sm mt-3 block">Ingreso promedio de distribuidores activos (Rango Oro - Diamante).</span>
            </div>
            
            <ul className="flex flex-col gap-4 mb-4">
              {[
                'Comisiones directas inmediatas en cada venta.',
                'Bonos binarios pagados puntualmente cada semana.',
                'Bonos de liderazgo y estilo de vida al subir de rango.',
                'Ingresos residuales continuos sin límite de profundidad.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="text-brand-emerald-bright shrink-0 mt-1" />
                  <span className="text-lg text-white/90">{item}</span>
                </li>
              ))}
            </ul>

            <Link to="/plan-multinivel" className="px-8 py-4 rounded-xl bg-brand-gold text-brand-black font-bold text-lg text-center hover:bg-brand-gold-bright transition-colors w-fit">
              Calcular mi potencial
            </Link>
          </div>

          <div className="flex flex-col gap-3 justify-center">
             {[
               { name: 'Distribuidor', range: '$0 – $500', req: 'Activación' },
               { name: 'Silver', range: '$500 – $1,200', req: '500 PV Equipo' },
               { name: 'Gold', range: '$1,200 – $3,000', req: '2,000 PV Equipo', isGold: true },
               { name: 'Diamante', range: '$3,000 – $15,000+', req: '15,000 PV Equipo', highlight: true },
             ].map((rank, i) => (
               <div key={i} className={`p-5 rounded-2xl flex items-center justify-between border ${rank.highlight ? 'bg-brand-surface border-brand-gold shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'bg-brand-surface/90 border-transparent'} transition-transform hover:-translate-y-1`}>
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-heading font-bold text-xl ${rank.isGold || rank.highlight ? 'bg-brand-gold text-brand-black' : 'bg-[#e2e8f0] text-brand-black'}`}>
                      {rank.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className={`font-heading font-semibold text-xl ${rank.isGold || rank.highlight ? 'text-gold-shimmer' : 'text-[#F0F0F0]'}`}>{rank.name}</h4>
                      <span className="text-brand-text-muted text-sm">{rank.req}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className="block font-heading font-bold text-xl text-[#F0F0F0]">{rank.range}</span>
                 </div>
               </div>
             ))}
          </div>

        </div>
      </section>

      {/* 7. CLOSING CTA */}
      <section className="bg-brand-black py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-emerald/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
          <h1 className="font-heading font-bold text-4xl sm:text-6xl text-[#F0F0F0] mb-6 tracking-tight">¿Listo para empezar?</h1>
          <p className="text-brand-text-muted text-xl mb-12 max-w-2xl">
            Únete a miles de ecuatorianos que ya están transformando su vida, su salud y sus finanzas con Sumak Ecuador.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
             <Link to="/registro" className="px-10 py-5 rounded-xl bg-brand-emerald text-white font-bold text-lg hover:bg-brand-emerald-hover shadow-emerald-glow transition-all duration-300 w-full sm:w-auto">
               Registrarme Ahora
             </Link>
             <Link to="/plan-multinivel" className="px-10 py-5 rounded-xl border border-[#F0F0F0]/20 text-[#F0F0F0] font-bold text-lg hover:bg-[#F0F0F0]/5 transition-all duration-300 w-full sm:w-auto">
               Ver Plan de Compensación
             </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
