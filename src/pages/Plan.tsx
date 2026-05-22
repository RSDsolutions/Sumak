import { Link } from 'react-router-dom';
import { Network, ArrowUpRight, Target, Users, Gem, PiggyBank, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { useState } from 'react';

const BinaryTreeSVG = () => {
  return (
    <svg viewBox="0 0 800 500" className="w-full h-auto drop-shadow-2xl font-sans" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Background connecting lines (EMERALD) */}
      <polyline points="400,80 200,200" fill="none" stroke="#00A86B" strokeWidth="2" opacity="0.6" />
      <polyline points="400,80 600,200" fill="none" stroke="#00A86B" strokeWidth="2" opacity="0.6" />
      
      <polyline points="200,200 100,320" fill="none" stroke="#008F5A" strokeWidth="2" opacity="0.4" />
      <polyline points="200,200 300,320" fill="none" stroke="#008F5A" strokeWidth="2" opacity="0.4" />
      
      <polyline points="600,200 500,320" fill="none" stroke="#008F5A" strokeWidth="2" opacity="0.4" />
      <polyline points="600,200 700,320" fill="none" stroke="#008F5A" strokeWidth="2" opacity="0.4" />
      
      {/* Level 3 to flow indication */}
      <path d="M 100,320 Q 50,420 100,450" fill="none" stroke="#00A86B" strokeWidth="1.5" opacity="0.3" strokeDasharray="4 4" />
      <path d="M 700,320 Q 750,420 700,450" fill="none" stroke="#00A86B" strokeWidth="1.5" opacity="0.3" strokeDasharray="4 4" />

      {/* Nodes */}
      {/* Level 1: YOU */}
      <circle cx="400" cy="80" r="32" fill="#00A86B" stroke="#00C47E" strokeWidth="4" filter="url(#glow)" />
      <text x="400" y="86" textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="bold" fontFamily="Poppins">TÚ</text>

      {/* Level 2 */}
      {/* Left */}
      <circle cx="200" cy="200" r="28" fill="#1A2A20" stroke="#00A86B" strokeWidth="3" />
      <text x="200" y="206" textAnchor="middle" fill="#F0F0F0" fontSize="14" fontWeight="600">L1</text>
      <rect x="150" y="140" width="100" height="24" rx="12" fill="#222" stroke="#2E2E2E" />
      <text x="200" y="156" textAnchor="middle" fill="#00A86B" fontSize="11" fontWeight="bold" letterSpacing="1">EQUIPO A</text>

      {/* Right */}
      <circle cx="600" cy="200" r="28" fill="#1A2A20" stroke="#00A86B" strokeWidth="3" />
      <text x="600" y="206" textAnchor="middle" fill="#F0F0F0" fontSize="14" fontWeight="600">R1</text>
      <rect x="550" y="140" width="100" height="24" rx="12" fill="#222" stroke="#2E2E2E" />
      <text x="600" y="156" textAnchor="middle" fill="#00A86B" fontSize="11" fontWeight="bold" letterSpacing="1">EQUIPO B</text>

      {/* Level 3 */}
      {/* L1 Children */}
      <circle cx="100" cy="320" r="20" fill="#152018" stroke="#4DB88A" strokeWidth="2" />
      <text x="100" y="325" textAnchor="middle" fill="#AAA" fontSize="12">L2</text>
      
      <circle cx="300" cy="320" r="20" fill="#152018" stroke="#4DB88A" strokeWidth="2" />
      <text x="300" y="325" textAnchor="middle" fill="#AAA" fontSize="12">L2</text>

      {/* R1 Children */}
      <circle cx="500" cy="320" r="20" fill="#152018" stroke="#4DB88A" strokeWidth="2" />
      <text x="500" y="325" textAnchor="middle" fill="#AAA" fontSize="12">R2</text>
      
      <circle cx="700" cy="320" r="20" fill="#152018" stroke="#4DB88A" strokeWidth="2" />
      <text x="700" y="325" textAnchor="middle" fill="#AAA" fontSize="12">R2</text>
      
      {/* Volume indicators flowing up */}
      <g fill="#00C47E">
        <polygon points="190,260 200,240 210,260" opacity="0.6"/>
        <polygon points="590,260 600,240 610,260" opacity="0.6"/>
      </g>
    </svg>
  );
};

export default function Plan() {
  const [directos, setDirectos] = useState(5);
  const [volumen, setVolumen] = useState(5000);

  const calculateEstimate = () => {
    // Fake calculation for visual only
    const base = volumen * 0.10; // 10% binary roughly
    const directBonus = directos * 15; 
    return base + directBonus;
  };

  const estimate = calculateEstimate();

  return (
    <div className="w-full pt-24 bg-brand-black min-h-screen">
      
      {/* 1. HERO MINI */}
      <section className="bg-hero-gradient py-16 px-6 border-b border-brand-border">
         <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#F0F0F0] mb-4">Plan de Compensación</h1>
            <p className="text-brand-text-muted text-xl">Sistema binario continuo — construye tu red y genera ingresos residuales sin límite de profundidad.</p>
         </div>
      </section>

      {/* 2. BINARY EXPLAINER */}
      <section className="py-24 px-6 relative">
         <div className="max-w-7xl mx-auto bg-brand-surface border border-brand-border rounded-[24px] overflow-hidden flex flex-col lg:flex-row shadow-2xl">
            {/* Context */}
            <div className="p-10 lg:p-16 lg:w-1/2 flex flex-col justify-center">
               <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-6">¿Qué es el sistema binario?</h2>
               <p className="text-brand-text-muted text-lg mb-8 leading-relaxed">
                 En Sumak Ecuador, organizas a tu equipo bajo dos ramas (Izquierda y Derecha). Cada nueva persona que se suma a la visión se coloca en una de estas ramas. <strong>Las comisiones se generan sobre el volumen total de consumos y ventas de tu pierna de menor volumen</strong>, recompensando el trabajo en equipo continuo.
               </p>
               <ul className="flex flex-col gap-4">
                 <li className="flex gap-3 text-[#F0F0F0]"><ShieldCheck className="text-brand-emerald shrink-0" /> Sin límite de profundidad.</li>
                 <li className="flex gap-3 text-[#F0F0F0]"><ShieldCheck className="text-brand-emerald shrink-0" /> Pagos semanales directos a tu cuenta.</li>
                 <li className="flex gap-3 text-[#F0F0F0]"><ShieldCheck className="text-brand-emerald shrink-0" /> Bonificaciones acumulables en todos los niveles.</li>
               </ul>
            </div>
            {/* SVG Diagram */}
            <div className="lg:w-1/2 bg-[#151515] p-6 flex items-center justify-center border-l lg:border-l border-[#2E2E2E] overflow-hidden">
               <BinaryTreeSVG />
            </div>
         </div>
      </section>

      {/* 3. INCOME STREAMS */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
             <h2 className="font-heading font-bold text-3xl sm:text-4xl">4 Formas de Ganar</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {[
               { icon: Target, title: 'Comisión Directa', desc: 'Gana por cada venta directa que realices, la diferencia entre retail y afiliado.', pct: 'Hasta 30%' },
               { icon: ConnectMenuIcon, title: 'Bono Binario', desc: 'Comisión sobre el volumen de puntos generado por tu equipo más débil de las dos ramas.', pct: '10-20% Semanal' },
               { icon: ShieldCheck, title: 'Bono de Liderazgo', desc: 'Porcentaje adicional sobre el volumen de toda tu red al alcanzar rangos premium.', pct: '5% Adicional' },
               { icon: Users, title: 'Bono de Igualación', desc: 'Gana un porcentaje de los ingresos binarios de los distribuidores que tú personalmente inscribes.', pct: 'Hasta 15%' }
             ].map((stream, i) => (
               <div key={i} className="bg-[#1A2A20] border-l-[4px] border-brand-emerald p-8 rounded-r-2xl border-y border-r border-[#2E2E2E]">
                  <stream.icon className="text-brand-emerald w-8 h-8 mb-4" />
                  <h3 className="font-heading font-bold text-2xl text-[#F0F0F0] mb-2">{stream.title}</h3>
                  <p className="text-brand-text-muted mb-6">{stream.desc}</p>
                  <span className="font-heading font-bold text-2xl text-brand-emerald">{stream.pct}</span>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* 4. RANKS */}
      <section className="bg-[#111] py-24 border-y border-brand-border">
         <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center mb-16">Rangos y Beneficios</h2>
            
            <div className="flex overflow-x-auto pb-8 snap-x snap-mandatory gap-6 scrollbar-hide md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
               {[
                 { name: 'Distribuidor', req: 'Registro (40PV)', inc: '$0 - $300', c: 'border-[#444]', b: '#FFF' },
                 { name: 'Silver', req: '500 PV', inc: '$300 - $800', c: 'border-[#C0C0C0]', b: '#C0C0C0' },
                 { name: 'Gold', req: '2,000 PV', inc: '$800 - $2.5k', c: 'border-brand-gold bg-brand-surface shadow-[0_0_20px_rgba(212,175,55,0.15)]', b: '#D4AF37' },
                 { name: 'Platinum', req: '5,000 PV', inc: '$2.5k - $5k', c: 'border-[#E8E8FF]', b: '#E8E8FF' },
                 { name: 'Diamante', req: '15,000 PV', inc: '$5k - $15k+', c: 'border-brand-emerald bg-brand-surface shadow-emerald-glow', b: '#00C47E', isG: true },
               ].map((rank, i) => (
                 <div key={i} className={`snap-center flex-shrink-0 w-[240px] md:w-auto p-6 rounded-[16px] bg-brand-surface/40 border-2 ${rank.c} flex flex-col items-center text-center relative`}>
                    {/* SVG rank badge */}
                    <svg width="40" height="48" viewBox="0 0 40 48" className="mb-4">
                       <path d="M20 0 L40 10 L40 30 L20 48 L0 30 L0 10 Z" fill="transparent" stroke={rank.b} strokeWidth="2" />
                       <text x="20" y="28" textAnchor="middle" fill={rank.b} fontSize="20" fontFamily="Poppins" fontWeight="bold">{rank.name.charAt(0)}</text>
                    </svg>
                    <h3 className={`font-heading font-bold text-xl mb-1 ${rank.isG ? 'text-gold-shimmer' : (rank.name === 'Gold' ? 'text-brand-gold' : 'text-[#F0F0F0]')}`}>{rank.name}</h3>
                    <span className="text-sm border border-[#333] px-2 py-1 rounded mb-4 text-[#888]">{rank.req}</span>
                    <span className="font-heading font-bold text-lg text-brand-gold-bright">{rank.inc}</span>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* 5. CALCULATOR (Visual) */}
      <section className="py-24 px-6 relative z-10">
         <div className="max-w-4xl mx-auto bg-brand-surface border border-brand-emerald rounded-[24px] p-8 md:p-12 shadow-[0_10px_50px_rgba(0,168,107,0.15)]">
            <h2 className="font-heading font-bold text-3xl mb-8 text-center text-[#F0F0F0]">Calcula tu Potencial</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
               <div className="flex flex-col gap-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-brand-text-muted">Distribuidores directos</span>
                      <span className="font-bold text-brand-emerald">{directos}</span>
                    </div>
                    <input type="range" min="1" max="50" value={directos} onChange={(e) => setDirectos(Number(e.target.value))} className="w-full accent-brand-emerald" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-brand-text-muted">Volumen Equipo Menor (PV/$)</span>
                      <span className="font-bold text-brand-emerald">${volumen}</span>
                    </div>
                    <input type="range" min="1000" max="50000" step="500" value={volumen} onChange={(e) => setVolumen(Number(e.target.value))} className="w-full accent-brand-emerald" />
                  </div>
                  <div className="mt-4 text-xs text-[#666]">
                    * Los ingresos dependen del esfuerzo, dedicación y actividad de cada distribuidor y su organización profunda.
                  </div>
               </div>

               <div className="bg-brand-black border border-brand-border rounded-xl p-8 text-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-brand-gold/5"></div>
                 <span className="relative z-10 text-brand-text-muted uppercase tracking-widest font-medium text-sm mb-4 block">Estimado Mensual</span>
                 <span className="relative z-10 font-heading font-bold text-5xl sm:text-6xl text-gold-shimmer block mb-4">
                   ${estimate.toLocaleString()}
                 </span>
                 <Link to="/registro" className="relative z-10 inline-flex items-center gap-2 text-brand-emerald font-semibold mx-auto hover:text-white transition-colors">
                   Empezar a ganar <ArrowRight size={16} />
                 </Link>
               </div>
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="bg-cta-gradient py-24 text-center px-6">
         <h2 className="font-heading font-bold text-4xl sm:text-5xl text-white mb-6">¿Listo para construir tu red?</h2>
         <p className="text-white/80 text-xl max-w-2xl mx-auto mb-10">Regístrate hoy, elige tu kit de inicio y empieza tu primera semana hacia la libertad financiera.</p>
         <Link to="/registro" className="px-10 py-5 bg-brand-black text-[#F0F0F0] rounded-xl font-bold text-xl hover:bg-brand-surface hover:-translate-y-1 transition-all">
            Quiero Unirme
         </Link>
      </section>

    </div>
  );
}

// Icon helper for Binary
function ConnectMenuIcon(props: any) {
  return <Network {...props} />;
}
