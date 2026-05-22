import { Star, Quote, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Testimonios() {
  const testimonials = [
    { name: 'Carlos Mendoza', city: 'Guayaquil', rank: 'Diamante', quote: 'Hace 18 meses buscaba ingresos extra. Hoy mi red de Sumak paga la educación de mis hijos y soy dueño de mi tiempo. El sistema binario es el más justo que he visto.', inc: '$4,200', rCol: 'border-brand-emerald text-brand-emerald-bright bg-brand-emerald/10' },
    { name: 'Andreína Velez', city: 'Manta', rank: 'Gold', quote: 'Recomendar los productos es fácil porque funcionan. Empecé tomando el Sumak Slim y ahora tengo un negocio rentable desde mi WhatsApp.', inc: '$1,500', rCol: 'border-brand-gold text-brand-gold bg-brand-gold/10' },
    { name: 'Ricardo Suárez', city: 'Quito', rank: 'Platinum', quote: 'Lo mejor es la comunidad. Nunca he estado solo en este proceso. El plan de pagos semanal te permite mantener flujo de caja constante para reinvertir y crecer.', inc: '$3,100', rCol: 'border-[#E8E8FF] text-[#E8E8FF] bg-[#E8E8FF]/10' },
    { name: 'María Fernanda', city: 'Cuenca', rank: 'Silver', quote: 'Yo no sabía vender. La academia de Sumak me enseñó paso a paso. Hoy genero un residual que me permite trabajar part-time en mi otro empleo.', inc: '$850', rCol: 'border-[#C0C0C0] text-[#C0C0C0] bg-[#C0C0C0]/10' },
    { name: 'José Luis P.', city: 'Loja', rank: 'Diamante', quote: 'Tengo equipos en 5 provincias. El backoffice facilita la gestión de todo. Solo este mes cerramos con 40 nuevos inscritos en mi pierna izquierda.', inc: '$5,800', rCol: 'border-brand-emerald text-brand-emerald-bright bg-brand-emerald/10' },
    { name: 'Patricia Reyes', city: 'Ambato', rank: 'Gold', quote: 'Empecé porque el Vita me quitó la fatiga crónica. Ahora ayudo a mi familia y además recibo mis comisiones sagradamente todos los viernes.', inc: '$1,100', rCol: 'border-brand-gold text-brand-gold bg-brand-gold/10' },
  ];

  return (
    <div className="w-full pt-24 bg-brand-black min-h-screen">
      
      {/* 1. HERO & STATS */}
      <section className="bg-[#111] py-16 px-6 relative border-b border-brand-border">
         <div className="max-w-7xl mx-auto text-center relative z-10 mb-16">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#F0F0F0] mb-4">Historias de Éxito</h1>
            <p className="text-brand-text-muted text-xl max-w-2xl mx-auto">Personas reales. Resultados reales. Comunidad Sumak.</p>
         </div>

         {/* Stats bar inside hero */}
         <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:bg-[#1A1A1A] md:p-6 rounded-[24px] md:border border-brand-border">
            <div className="flex flex-col text-center p-4 bg-brand-surface md:bg-transparent rounded-xl border md:border-none border-brand-border">
              <span className="font-heading font-bold text-2xl md:text-3xl text-brand-emerald mb-1">+5,000</span>
              <span className="text-brand-text-muted text-xs uppercase tracking-wider font-medium">Distribuidores Activos</span>
            </div>
            <div className="flex flex-col text-center p-4 bg-brand-surface md:bg-transparent rounded-xl border md:border-none border-brand-border">
              <span className="font-heading font-bold text-2xl md:text-3xl text-brand-emerald mb-1">+50,000</span>
              <span className="text-brand-text-muted text-xs uppercase tracking-wider font-medium">Clientes Satisfechos</span>
            </div>
            <div className="flex flex-col text-center p-4 bg-brand-surface md:bg-transparent rounded-xl border md:border-none border-brand-border">
              <span className="font-heading font-bold text-2xl md:text-3xl text-gold-shimmer mb-1">$5,200/mes</span>
              <span className="text-brand-text-muted text-xs uppercase tracking-wider font-medium">Top Diamante Prov.</span>
            </div>
            <div className="flex flex-col text-center p-4 bg-brand-surface md:bg-transparent rounded-xl border md:border-none border-brand-border">
              <span className="font-heading font-bold text-2xl md:text-3xl text-brand-emerald mb-1">20+</span>
              <span className="text-brand-text-muted text-xs uppercase tracking-wider font-medium">Provincias Activas</span>
            </div>
         </div>
      </section>

      {/* 2. FEATURED SPOTLIGHT */}
      <section className="py-24 px-6 relative overflow-hidden">
         <div className="max-w-6xl mx-auto bg-brand-surface rounded-[24px] border border-brand-gold/30 shadow-[0_10px_50px_rgba(212,175,55,0.05)] flex flex-col md:flex-row relative">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-gold/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="md:w-[40%] bg-[#111] p-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#2E2E2E]">
               <div className="w-56 h-56 rounded-full border-4 border-brand-gold flex items-center justify-center overflow-hidden bg-gradient-to-tr from-[#1A1A1A] to-[#222] shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                  {/* Fake silhouette */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1" className="w-32 h-32 mt-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
               </div>
            </div>
            
            <div className="md:w-[60%] p-10 lg:p-16 flex flex-col justify-center">
               <span className="inline-block px-4 py-1.5 bg-brand-gold text-brand-black text-xs font-bold tracking-widest uppercase rounded-full mb-6 w-fit shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                 Rango Diamante Actual
               </span>
               <Quote fill="#2E2E2E" stroke="none" className="w-16 h-16 absolute top-10 right-10 opacity-30" />
               
               <p className="font-heading text-xl lg:text-2xl text-[#F0F0F0] leading-relaxed mb-8 italic border-l-4 border-brand-emerald pl-6">
                 "Nunca imaginé que una decisión tomada por WhatsApp cambiaría tanto mi vida. Empecé consumiendo para mi salud y en 18 meses construí un equipo de 120 personas que comparten mi misma visión. Sumak es familia."
               </p>
               
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mt-auto">
                 <div>
                    <h3 className="font-heading font-bold text-3xl text-white mb-1">Mónica C.</h3>
                    <span className="text-brand-text-muted font-medium">Santo Domingo, Ecuador</span>
                    <div className="mt-3 text-xs text-[#888] flex flex-col gap-1">
                      <span>Empezó hace: 18 meses</span>
                      <span>Volumen actual: 18,500 PV</span>
                    </div>
                 </div>
                 <div className="text-left sm:text-right">
                    <span className="text-[10px] text-brand-gold uppercase tracking-widest font-bold">Resumen de Ingresos</span>
                    <span className="block font-heading font-bold text-4xl text-gold-shimmer">$3,800/mes</span>
                 </div>
               </div>
            </div>
         </div>
      </section>

      {/* 3. TESTIMONIAL GRID */}
      <section className="py-12 px-6">
         <div className="max-w-7xl mx-auto">
            <h2 className="font-heading font-bold text-3xl mb-12">Historias de la Comunidad</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {testimonials.map((t, i) => (
                 <div key={i} className="bg-brand-surface border border-brand-border rounded-[16px] p-8 flex flex-col hover:border-brand-emerald transition-colors">
                    <div className="flex gap-1 mb-6">
                      {[1,2,3,4,5].map(s => <Star key={s} size={16} className="fill-brand-emerald text-brand-emerald" />)}
                    </div>
                    
                    <p className="text-[#CCC] italic mb-8 border-l-2 border-brand-emerald pl-4 flex-grow text-sm leading-relaxed">"{t.quote}"</p>
                    
                    <div className="flex items-center gap-4 pt-6 border-t border-[#2E2E2E]">
                       <div className="w-12 h-12 rounded-full border border-[#444] flex items-center justify-center bg-[#111] overflow-hidden shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#555" className="w-6 h-6 mt-2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                       </div>
                       <div className="flex flex-col flex-grow">
                          <span className="font-heading font-bold text-[#F0F0F0] leading-none mb-1 text-sm">{t.name}</span>
                          <span className="text-[#888] text-xs">{t.city}</span>
                       </div>
                    </div>
                    {/* Rank Row */}
                    <div className="flex justify-between items-center mt-4 bg-[#111] p-3 rounded-lg border border-[#2E2E2E]">
                       <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${t.rCol}`}>
                         {t.rank}
                       </span>
                       <span className="font-heading font-bold text-gold-shimmer text-sm">{t.inc}/mes</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* 4. HEALTH FOCUS ONLY */}
      <section className="py-24 px-6 bg-brand-black">
         <div className="max-w-7xl mx-auto">
            <h2 className="font-heading font-bold text-3xl mb-12">Transformaciones de Salud</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                 { name: 'Diana R.', prod: 'Sumak Slim + Detox', res: 'Perdió 8kg en 3 meses', text: 'Me sentía pesada sin energía. El plan Detox de 30 días cambió mi metabolismo por completo.' },
                 { name: 'Juan Carlos', prod: 'Sumak Sport', res: 'Rendimiento deportivo 2x', text: 'Practico ciclismo y la recuperación era dolorosa. Con Sumak Sport evito los calambres y tengo mucha más resistencia.' },
                 { name: 'Sra. Elena', prod: 'Sumak Senior', res: 'Frenó dolores articulares', text: 'Mis rodillas me limitaban mucho. El Senior y el colágeno me devolvieron la movilidad sin tomar analgésicos.' }
               ].map((h, i) => (
                  <div key={i} className="bg-brand-surface border border-[#333] rounded-xl p-6">
                     <span className="px-3 py-1 bg-[#1A2A20] text-brand-emerald border border-brand-emerald/30 text-xs font-medium rounded-full mb-4 inline-block">{h.prod}</span>
                     <h3 className="font-heading font-bold text-xl text-[#F0F0F0] mb-2">{h.res}</h3>
                     <p className="text-sm text-[#888] italic mb-6">"{h.text}"</p>
                     <span className="text-[#CCC] font-medium">— {h.name}</span>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-cta-gradient text-center">
         <h2 className="font-heading font-bold text-4xl sm:text-5xl text-white mb-6">¿Quieres ser la próxima historia de éxito?</h2>
         <p className="text-white/80 text-xl max-w-2xl mx-auto mb-10">Únete hoy y empieza tu transformación de salud y libertad financiera.</p>
         <Link to="/registro" className="px-10 py-5 bg-black text-white rounded-xl font-bold text-xl hover:bg-[#222] transition-colors inline-block text-center mt-2 mx-auto shadow-emerald-glow shadow-brand-emerald/10">
            Registrarme Ahora
         </Link>
      </section>
    </div>
  );
}
