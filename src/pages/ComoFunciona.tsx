import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function ComoFunciona() {
  return (
    <div className="w-full pt-24 bg-white min-h-screen">

      {/* 1. HERO MINI */}
      <section className="bg-hero-gradient py-20 px-6 border-b border-[#C8D8CB]">
         <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#111111] mb-4">¿Cómo Funciona Sumak?</h1>
            <p className="text-[#6B7280] text-xl">Tres pasos simples y comprobados para empezar tu camino hacia la salud y la libertad financiera.</p>
         </div>
      </section>

      {/* STEPS - Alternating full width */}

      {/* Step 1 */}
      <section className="py-24 border-b border-[#C8D8CB] bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
           <div className="flex flex-col">
              <span className="font-heading font-bold text-[80px] leading-none text-white opacity-60 mb-4" style={{ WebkitTextStroke: '2px #1A4E26' }}>01</span>
              <h2 className="font-heading font-bold text-4xl text-[#111111] mb-6">Crea tu cuenta de distribuidor</h2>
              <p className="text-[#6B7280] text-lg mb-8 leading-relaxed">
                Completa el formulario de registro rápido, elige tu kit de inicio oficial y activa tu código de distribuidor. En menos de 24 horas estarás listo para tener acceso al inventario y reclutar en todo el país.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                 {[
                   { name: 'Kit Básico', p: '$45' },
                   { name: 'Kit Emprendedor', p: '$120', h: true },
                   { name: 'Kit Líder', p: '$250' }
                 ].map(k => (
                   <div key={k.name} className={`flex-1 p-4 rounded-xl border ${k.h ? 'border-[#1A4E26] bg-[#1A4E26]/5' : 'border-[#C8D8CB] bg-[#F4F7F5]'} flex flex-col justify-center items-center text-center`}>
                      <span className={`text-sm font-bold ${k.h ? 'text-[#1A4E26]' : 'text-[#6B7280]'}`}>{k.name}</span>
                      <span className="font-heading font-bold text-[#111111] text-xl mt-1">{k.p}</span>
                   </div>
                 ))}
              </div>
           </div>
           <div className="w-full h-[400px] bg-[#F4F7F5] rounded-[24px] border border-[#C8D8CB] relative flex items-center justify-center p-8">
               {/* Wireframe Mockup */}
               <svg viewBox="0 0 400 300" className="w-full h-full opacity-60" fill="none" stroke="#C8D8CB" strokeWidth="3" strokeLinecap="round">
                  <rect x="50" y="20" width="300" height="260" rx="16" />
                  <line x1="80" y1="60" x2="160" y2="60" stroke="#1A4E26" strokeWidth="8" />
                  <rect x="80" y="90" width="240" height="30" rx="4" />
                  <rect x="80" y="140" width="240" height="30" rx="4" />
                  <rect x="80" y="190" width="240" height="30" rx="4" />
                  <rect x="80" y="240" width="240" height="40" rx="20" stroke="#1A4E26" fill="#1A4E26" opacity="0.2"/>
               </svg>
               <div className="absolute inset-0 bg-gradient-to-tr from-[#1A4E26]/10 to-transparent rounded-[24px] pointer-events-none"></div>
           </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="py-24 border-b border-[#C8D8CB] bg-[#F4F7F5]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
           <div className="order-2 lg:order-1 w-full h-[400px] bg-white rounded-[24px] border border-[#C8D8CB] relative flex items-center justify-center p-8">
               {/* Social Share Mockup SVG */}
               <svg viewBox="0 0 300 400" className="h-full w-auto opacity-70" fill="none" stroke="#C8D8CB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  {/* Phone frame */}
                  <rect x="40" y="20" width="220" height="360" rx="30" />
                  {/* Top notch */}
                  <path d="M120 20 L120 30 Q120 40 130 40 L170 40 Q180 40 180 30 L180 20" fill="#C8D8CB" />
                  {/* Image placeholder */}
                  <rect x="60" y="70" width="180" height="150" rx="12" fill="#EBF4ED" stroke="none" />
                  {/* Share buttons */}
                  <circle cx="90" cy="280" r="20" stroke="#D4AF37" />
                  <circle cx="150" cy="280" r="20" stroke="#1A4E26" />
                  <circle cx="210" cy="280" r="20" />
                  <line x1="60" y1="330" x2="240" y2="330" />
                  <line x1="60" y1="350" x2="180" y2="350" />
               </svg>
           </div>
           <div className="order-1 lg:order-2 flex flex-col">
              <span className="font-heading font-bold text-[80px] leading-none text-white opacity-60 mb-4" style={{ WebkitTextStroke: '2px #D4AF37' }}>02</span>
              <h2 className="font-heading font-bold text-4xl text-[#D4AF37] mb-6">Comparte y Vende</h2>
              <p className="text-[#6B7280] text-lg mb-8 leading-relaxed">
                Las historias venden, y los resultados reales inspiran. Usa tu enlace de referido único, tu catálogo digital para WhatsApp y comparte con tu entorno. Cada venta que referieres te genera comisión directa inmediata.
              </p>
              <ul className="flex flex-col gap-4">
                 <li className="flex items-center gap-3 font-medium text-[#111111]"><CheckCircle2 className="text-[#D4AF37]" /> Catálogo digital optimizado</li>
                 <li className="flex items-center gap-3 font-medium text-[#111111]"><CheckCircle2 className="text-[#D4AF37]" /> Enlace de afiliado propio para registro</li>
                 <li className="flex items-center gap-3 font-medium text-[#111111]"><CheckCircle2 className="text-[#D4AF37]" /> Kits y material de marketing semanal</li>
              </ul>
           </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="py-24 border-b border-[#C8D8CB] bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
           <div className="flex flex-col">
              <span className="font-heading font-bold text-[80px] leading-none text-white opacity-60 mb-4" style={{ WebkitTextStroke: '2px #1A4E26' }}>03</span>
              <h2 className="font-heading font-bold text-4xl text-[#1A4E26] mb-6">Crece y Lidera</h2>
              <p className="text-[#6B7280] text-lg mb-8 leading-relaxed">
                Cada persona que se une al negocio a través de ti, forma directamente parte de tu red binaria (Equipo Izquierdo o Derecho). La actividad y ventas que generen ellos también se suma a tu volumen, creando ingresos residuales y apalancamiento que no dependen 100% de tu tiempo.
              </p>
              <Link to="/plan-multinivel" className="text-[#1A4E26] font-semibold uppercase tracking-widest text-sm hover:text-[#163F1E] transition-colors flex items-center gap-2">
                 Profundizar en el Plan Binario <ArrowUpRight size={18} />
              </Link>
           </div>
           <div className="w-full h-[400px] rounded-[24px] relative flex items-center justify-center p-8 bg-hero-gradient border border-[#C8D8CB] shadow-[0_0_40px_rgba(26,78,38,0.08)]">
               <svg viewBox="0 0 300 300" className="w-full h-full font-heading" fill="none">
                  {/* Upward arrow path */}
                  <path d="M50 250 Q100 250 150 180 T250 50" stroke="#1A4E26" strokeWidth="6" strokeLinecap="round" strokeDasharray="300" strokeDashoffset="0" />
                  <path d="M220 50 L250 50 L250 80" stroke="#1A4E26" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Milestones */}
                  <circle cx="50" cy="250" r="8" fill="#D4AF37" />
                  <circle cx="150" cy="180" r="10" fill="#D4AF37" />
                  <circle cx="210" cy="110" r="12" fill="#E8C94A" />
                  <circle cx="250" cy="50" r="14" fill="#E8C94A" />
               </svg>
           </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-[#F4F7F5]">
         <div className="max-w-3xl mx-auto">
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-12 text-center">Preguntas Frecuentes</h2>
            <div className="flex flex-col gap-4">
              {[
                { q: '¿Necesito experiencia previa en ventas?', a: 'No. Proveemos capacitación constante gratuita, protocolos probados y el material digital que necesitas.' },
                { q: '¿Cuánto cuesta registrarse?', a: 'El costo varía según el kit que elijas, iniciando desde una compra mínima de $45 que incluye productos.' },
                { q: '¿Cómo y cuándo me pagan?', a: 'El sistema calcula las comisiones de la red semanalmente, y los pagos se depositan directo a tu cuenta bancaria ecuatoriana los días viernes.' },
                { q: '¿Puedo vender solo por redes sociales e internet?', a: '¡Absolutamente! Nuestro sistema y enlace de referidos está diseñado para que construyas tu negocio 100% online si así lo decides.' },
                { q: '¿Qué pasa si no puedo construir mi red?', a: 'No dejas de ser afiliado. Siempre podrás comprar con descuento del 30% y ganar mediante venta directa retail.' },
                { q: '¿Los productos tienen respaldo científico o permiso?', a: 'Todos nuestros productos son creados en laboratorios certificados y cuentan con Notificación Sanitaria del ARCSA en Ecuador.' }
              ].map((faq, i) => (
                <FAQItem key={i} question={faq.q} answer={faq.a} />
              ))}
            </div>
         </div>
      </section>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [open, setOpen] = useState(false);
  return (
     <div className="border border-[#C8D8CB] rounded-xl bg-white overflow-hidden">
        <button onClick={() => setOpen(!open)} className="w-full p-6 flex justify-between items-center text-left hover:bg-[#F4F7F5] transition-colors">
           <span className="font-heading font-semibold text-[#111111] pr-6">{question}</span>
           <ChevronDown className={`text-[#1A4E26] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open && (
             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 text-[#6B7280]">
                {answer}
             </motion.div>
          )}
        </AnimatePresence>
     </div>
  );
}
