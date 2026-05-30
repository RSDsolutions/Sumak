import { Star, Quote, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Testimonios() {
  const testimonials = [
    { name: 'Carlos Mendoza', city: 'Guayaquil', rank: 'Diamante', quote: 'Hace 18 meses buscaba ingresos extra. Hoy mi red de Sumak paga la educación de mis hijos y soy dueño de mi tiempo. El sistema binario es el más justo que he visto.', inc: '$4,200', rCol: 'border-[#1A4E26] text-[#1A4E26] bg-[#1A4E26]/10' },
    { name: 'Andreína Velez', city: 'Manta', rank: 'Gold', quote: 'Recomendar los productos es fácil porque funcionan. Empecé tomando el Sumak Slim y ahora tengo un negocio rentable desde mi WhatsApp.', inc: '$1,500', rCol: 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' },
    { name: 'Ricardo Suárez', city: 'Quito', rank: 'Platinum', quote: 'Lo mejor es la comunidad. Nunca he estado solo en este proceso. El plan de pagos semanal te permite mantener flujo de caja constante para reinvertir y crecer.', inc: '$3,100', rCol: 'border-[#6B7280] text-[#6B7280] bg-[#6B7280]/10' },
    { name: 'María Fernanda', city: 'Cuenca', rank: 'Silver', quote: 'Yo no sabía vender. La academia de Sumak me enseñó paso a paso. Hoy genero un residual que me permite trabajar part-time en mi otro empleo.', inc: '$850', rCol: 'border-[#9CA3AF] text-[#9CA3AF] bg-[#9CA3AF]/10' },
    { name: 'José Luis P.', city: 'Loja', rank: 'Diamante', quote: 'Tengo equipos en 5 provincias. El backoffice facilita la gestión de todo. Solo este mes cerramos con 40 nuevos inscritos en mi pierna izquierda.', inc: '$5,800', rCol: 'border-[#1A4E26] text-[#1A4E26] bg-[#1A4E26]/10' },
    { name: 'Patricia Reyes', city: 'Ambato', rank: 'Gold', quote: 'Empecé porque el Vita me quitó la fatiga crónica. Ahora ayudo a mi familia y además recibo mis comisiones sagradamente todos los viernes.', inc: '$1,100', rCol: 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' },
  ];

  return (
    <div className="w-full pt-24 bg-white min-h-screen">

      {/* 1. HERO & STATS */}
      <section className="bg-hero-gradient py-16 px-6 relative border-b border-[#C8D8CB]">
         <div className="max-w-7xl mx-auto text-center relative z-10 mb-16">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#111111] mb-4">Historias de Éxito</h1>
            <p className="text-[#6B7280] text-xl max-w-2xl mx-auto">Personas reales. Resultados reales. Comunidad Sumak.</p>
         </div>

         {/* Stats bar inside hero */}
         <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:bg-white md:p-6 rounded-[24px] md:border border-[#C8D8CB] md:shadow-[0_0_20px_rgba(26,78,38,0.06)]">
            <div className="flex flex-col text-center p-4 bg-white md:bg-transparent rounded-xl border md:border-none border-[#C8D8CB]">
              <span className="font-heading font-bold text-2xl md:text-3xl text-[#1A4E26] mb-1">+5,000</span>
              <span className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Distribuidores Activos</span>
            </div>
            <div className="flex flex-col text-center p-4 bg-white md:bg-transparent rounded-xl border md:border-none border-[#C8D8CB]">
              <span className="font-heading font-bold text-2xl md:text-3xl text-[#1A4E26] mb-1">+50,000</span>
              <span className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Clientes Satisfechos</span>
            </div>
            <div className="flex flex-col text-center p-4 bg-white md:bg-transparent rounded-xl border md:border-none border-[#C8D8CB]">
              <span className="font-heading font-bold text-2xl md:text-3xl text-[#D4AF37] mb-1">$5,200/mes</span>
              <span className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Top Diamante Prov.</span>
            </div>
            <div className="flex flex-col text-center p-4 bg-white md:bg-transparent rounded-xl border md:border-none border-[#C8D8CB]">
              <span className="font-heading font-bold text-2xl md:text-3xl text-[#1A4E26] mb-1">20+</span>
              <span className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Provincias Activas</span>
            </div>
         </div>
      </section>

      {/* 2. FEATURED SPOTLIGHT */}
      <section className="py-24 px-6 relative overflow-hidden bg-[#F4F7F5]">
         <div className="max-w-6xl mx-auto bg-white rounded-[24px] border border-[#D4AF37]/30 shadow-[0_10px_50px_rgba(212,175,55,0.05)] flex flex-col md:flex-row relative">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#D4AF37]/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="md:w-[40%] bg-[#F4F7F5] p-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#C8D8CB]">
               <div className="w-56 h-56 rounded-full border-4 border-[#D4AF37] flex items-center justify-center overflow-hidden bg-gradient-to-tr from-[#EBF4ED] to-[#F4F7F5] shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                  {/* Fake silhouette */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C8D8CB" strokeWidth="1" className="w-32 h-32 mt-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
               </div>
            </div>

            <div className="md:w-[60%] p-10 lg:p-16 flex flex-col justify-center">
               <span className="inline-block px-4 py-1.5 bg-[#D4AF37] text-white text-xs font-bold tracking-widest uppercase rounded-full mb-6 w-fit shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                 Rango Diamante Actual
               </span>
               <Quote fill="#EBF4ED" stroke="none" className="w-16 h-16 absolute top-10 right-10 opacity-50" />

               <p className="font-heading text-xl lg:text-2xl text-[#111111] leading-relaxed mb-8 italic border-l-4 border-[#1A4E26] pl-6">
                 "Nunca imaginé que una decisión tomada por WhatsApp cambiaría tanto mi vida. Empecé consumiendo para mi salud y en 18 meses construí un equipo de 120 personas que comparten mi misma visión. Sumak es familia."
               </p>

               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mt-auto">
                 <div>
                    <h3 className="font-heading font-bold text-3xl text-[#111111] mb-1">Mónica C.</h3>
                    <span className="text-[#6B7280] font-medium">Santo Domingo, Ecuador</span>
                    <div className="mt-3 text-xs text-[#9CA3AF] flex flex-col gap-1">
                      <span>Empezó hace: 18 meses</span>
                      <span>Volumen actual: 18,500 PV</span>
                    </div>
                 </div>
                 <div className="text-left sm:text-right">
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">Resumen de Ingresos</span>
                    <span className="block font-heading font-bold text-4xl text-[#D4AF37]">$3,800/mes</span>
                 </div>
               </div>
            </div>
         </div>
      </section>

      {/* 3. TESTIMONIAL GRID */}
      <section className="py-12 px-6 bg-white">
         <div className="max-w-7xl mx-auto">
            <h2 className="font-heading font-bold text-3xl mb-12 text-[#111111]">Historias de la Comunidad</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {testimonials.map((t, i) => (
                 <div key={i} className="bg-white border border-[#C8D8CB] rounded-[16px] p-8 flex flex-col hover:border-[#1A4E26]/40 hover:shadow-[0_0_20px_rgba(26,78,38,0.08)] transition-all duration-300">
                    <div className="flex gap-1 mb-6">
                      {[1,2,3,4,5].map(s => <Star key={s} size={16} className="fill-[#1A4E26] text-[#1A4E26]" />)}
                    </div>

                    <p className="text-[#6B7280] italic mb-8 border-l-2 border-[#1A4E26] pl-4 flex-grow text-sm leading-relaxed">"{t.quote}"</p>

                    <div className="flex items-center gap-4 pt-6 border-t border-[#C8D8CB]">
                       <div className="w-12 h-12 rounded-full border border-[#C8D8CB] flex items-center justify-center bg-[#F4F7F5] overflow-hidden shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" className="w-6 h-6 mt-2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                       </div>
                       <div className="flex flex-col flex-grow">
                          <span className="font-heading font-bold text-[#111111] leading-none mb-1 text-sm">{t.name}</span>
                          <span className="text-[#9CA3AF] text-xs">{t.city}</span>
                       </div>
                    </div>
                    {/* Rank Row */}
                    <div className="flex justify-between items-center mt-4 bg-[#F4F7F5] p-3 rounded-lg border border-[#C8D8CB]">
                       <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${t.rCol}`}>
                         {t.rank}
                       </span>
                       <span className="font-heading font-bold text-[#D4AF37] text-sm">{t.inc}/mes</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* 4. HEALTH FOCUS ONLY */}
      <section className="py-24 px-6 bg-[#F4F7F5]">
         <div className="max-w-7xl mx-auto">
            <h2 className="font-heading font-bold text-3xl mb-12 text-[#111111]">Transformaciones de Salud</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                 { name: 'Diana R.', prod: 'Sumak Slim + Detox', res: 'Perdió 8kg en 3 meses', text: 'Me sentía pesada sin energía. El plan Detox de 30 días cambió mi metabolismo por completo.' },
                 { name: 'Juan Carlos', prod: 'Sumak Sport', res: 'Rendimiento deportivo 2x', text: 'Practico ciclismo y la recuperación era dolorosa. Con Sumak Sport evito los calambres y tengo mucha más resistencia.' },
                 { name: 'Sra. Elena', prod: 'Sumak Senior', res: 'Frenó dolores articulares', text: 'Mis rodillas me limitaban mucho. El Senior y el colágeno me devolvieron la movilidad sin tomar analgésicos.' }
               ].map((h, i) => (
                  <div key={i} className="bg-white border border-[#C8D8CB] rounded-xl p-6">
                     <span className="px-3 py-1 bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30 text-xs font-medium rounded-full mb-4 inline-block">{h.prod}</span>
                     <h3 className="font-heading font-bold text-xl text-[#111111] mb-2">{h.res}</h3>
                     <p className="text-sm text-[#6B7280] italic mb-6">"{h.text}"</p>
                     <span className="text-[#111111] font-medium">— {h.name}</span>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-cta-gradient text-center">
         <h2 className="font-heading font-bold text-4xl sm:text-5xl text-white mb-6">¿Quieres ser la próxima historia de éxito?</h2>
         <p className="text-white/80 text-xl max-w-2xl mx-auto mb-10">Únete hoy y empieza tu transformación de salud y libertad financiera.</p>
         <Link to="/registro" className="px-10 py-5 bg-white text-[#1A4E26] rounded-xl font-bold text-xl hover:bg-white/90 transition-colors inline-block text-center mt-2 mx-auto shadow-lg">
            Registrarme Ahora
         </Link>
      </section>
    </div>
  );
}
