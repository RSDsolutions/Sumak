import { useState } from 'react';
import { CheckCircle2, ShieldCheck, UserPlus, ShoppingBag, Clock, Phone } from 'lucide-react';

export default function Registro() {
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    ciudad: 'Quito',
    referidor: '',
    kit: 'Kit Emprendedor ($120)',
    objetivo: 'Ambos'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `¡Quiero registrarme en Sumak Ecuador!%0A
Nombre: ${formData.nombre}%0A
Cédula: ${formData.cedula}%0A
Ciudad: ${formData.ciudad}%0A
Kit elegido: ${formData.kit}%0A
Código referidor: ${formData.referidor || 'Ninguno'}%0A
Contacto: ${formData.telefono} | ${formData.email}`;

    window.open(`https://wa.me/593999999999?text=${text}`, '_blank');
  };

  return (
    <div className="w-full pt-24 bg-brand-black min-h-screen">
      
      {/* 1. HERO MINI */}
      <section className="bg-hero-gradient py-16 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-emerald/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#F0F0F0] mb-4">Únete a Sumak Ecuador</h1>
          <p className="text-brand-text-muted text-xl">Completa tu registro y empieza a generar ingresos desde hoy.</p>
        </div>
      </section>

      {/* 2. REGISTRATION FORM & BENEFITS */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left: Form */}
          <div className="lg:col-span-7 bg-brand-surface border border-brand-border rounded-[24px] p-8 shadow-2xl">
             <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-brand-text-muted font-medium">Nombre Completo</label>
                      <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald" />
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-brand-text-muted font-medium">Cédula de Identidad</label>
                      <input required type="text" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald" />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-brand-text-muted font-medium">WhatsApp / Teléfono</label>
                      <input required type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald" />
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-brand-text-muted font-medium">Email</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald" />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-brand-text-muted font-medium">Ciudad</label>
                      <select value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald">
                         <option>Quito</option><option>Guayaquil</option><option>Cuenca</option><option>Loja</option><option>Manta</option><option>Ambato</option><option>Otra</option>
                      </select>
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-brand-text-muted font-medium">Código Referidor (Opcional)</label>
                      <input type="text" placeholder="ID de tu sponsor" value={formData.referidor} onChange={e => setFormData({...formData, referidor: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald" />
                   </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                   <label className="text-sm text-brand-text-muted font-medium">Kit de Inicio a adquirir</label>
                   <select value={formData.kit} onChange={e => setFormData({...formData, kit: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald">
                      <option>Kit Básico ($45) - 2 Productos</option>
                      <option>Kit Emprendedor ($120) - 6 Productos + Catálogo</option>
                      <option>Kit Líder ($250) - 14 Productos + Status Silver Inicial</option>
                   </select>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                   <label className="text-sm text-brand-text-muted font-medium">Objetivo Principal</label>
                   <div className="flex flex-col sm:flex-row gap-3">
                      {['Mejorar mi salud', 'Generar ingresos', 'Ambos'].map(obj => (
                        <label key={obj} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl cursor-pointer transition-colors ${formData.objetivo === obj ? 'bg-brand-emerald/10 border-brand-emerald text-brand-emerald' : 'bg-[#111] border-brand-border text-brand-text-muted hover:border-[#666]'}`}>
                          <input type="radio" name="objetivo" value={obj} checked={formData.objetivo === obj} onChange={() => setFormData({...formData, objetivo: obj})} className="hidden" />
                          <span className="font-medium text-sm">{obj}</span>
                        </label>
                      ))}
                   </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                   <input type="checkbox" required id="terms" className="mt-1 accent-brand-emerald" />
                   <label htmlFor="terms" className="text-sm text-brand-text-muted">
                    Acepto los términos y condiciones de Sumak Ecuador, así como las políticas de privacidad y manejo de datos.
                   </label>
                </div>

                <button type="submit" className="mt-6 w-full py-4 rounded-xl bg-brand-emerald text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-brand-emerald-hover transition-colors shadow-emerald-glow">
                   <Phone size={20} /> Registrarme vía WhatsApp
                </button>
             </form>
          </div>

          {/* Right: Benefits */}
          <div className="lg:col-span-5 flex flex-col gap-6">
             <div className="bg-[#1A2A20] border-t-[3px] border-brand-emerald rounded-2xl p-8 shadow-2xl">
                <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-bold tracking-widest uppercase rounded-full mb-6">
                  Registro Abierto - Cupos limitados
                </span>
                <h3 className="font-heading font-bold text-2xl text-[#F0F0F0] mb-6">¿Por qué unirte hoy?</h3>
                <ul className="flex flex-col gap-4">
                  {[
                    'Sin inversión mínima alta ni costos ocultos',
                    'Capacitación inicial y constante incluida',
                    'Material y catálogo de ventas digital gratis',
                    'Cobros semanales directos a tu banco',
                    'Comunidad de apoyo activa 24/7'
                  ].map((ben, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-brand-emerald mt-0.5 shrink-0" />
                      <span className="text-[#F0F0F0] text-sm leading-relaxed">{ben}</span>
                    </li>
                  ))}
                </ul>
             </div>

             <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
                <h4 className="font-heading font-semibold text-lg text-brand-gold mb-2">Tu Patrocinador Ideal</h4>
                <p className="text-sm text-brand-text-muted mb-4">Si no tienes un sponsor, te asignaremos un Líder en tu ciudad para que te guíe desde el primer día.</p>
                <div className="flex items-center gap-4 bg-[#111] p-4 rounded-xl border border-brand-border">
                   <div className="w-12 h-12 rounded-full bg-[#333] flex items-center justify-center overflow-hidden border border-[#555]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" className="w-8 h-8 opacity-50"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[#F0F0F0] font-medium text-sm">Asesor Asignado</span>
                      <span className="text-brand-gold-dim text-xs font-bold font-heading">RANGO DIAMANTE (Opcional)</span>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </section>

      {/* 3. KIT COMPARISON */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
         <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center mb-12">Elige tu Kit Inicial</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col">
               <h3 className="font-heading font-bold text-xl mb-1 text-[#888]">Kit Básico</h3>
               <span className="font-heading font-bold text-3xl text-[#F0F0F0] mb-6">$45</span>
               <div className="flex-1 flex flex-col gap-3">
                  <span className="text-sm flex gap-2"><CheckCircle2 size={16} className="text-brand-emerald" /> 2 Productos Premium</span>
                  <span className="text-sm flex gap-2"><CheckCircle2 size={16} className="text-brand-emerald" /> 40 Puntos Iniciales</span>
                  <span className="text-sm flex gap-2"><CheckCircle2 size={16} className="text-brand-emerald" /> Acceso Backoffice Básico</span>
               </div>
            </div>
            
            <div className="bg-[#1A2A20] border-2 border-brand-emerald rounded-2xl p-6 flex flex-col relative transform md:-translate-y-4 shadow-emerald-glow">
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-emerald text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1 rounded-full shadow-lg">Recomendado</div>
               <h3 className="font-heading font-bold text-xl mb-1 text-brand-emerald-bright">Emprendedor</h3>
               <span className="font-heading font-bold text-4xl text-[#F0F0F0] mb-6">$120</span>
               <div className="flex-1 flex flex-col gap-3">
                  <span className="text-sm flex gap-2 text-white"><CheckCircle2 size={16} className="text-brand-emerald-bright" /> 6 Productos a elección</span>
                  <span className="text-sm flex gap-2 text-white"><CheckCircle2 size={16} className="text-brand-emerald-bright" /> 120 Puntos Iniciales</span>
                  <span className="text-sm flex gap-2 text-white"><CheckCircle2 size={16} className="text-brand-emerald-bright" /> Acceso Total Backoffice</span>
                  <span className="text-sm flex gap-2 text-white"><CheckCircle2 size={16} className="text-brand-emerald-bright" /> Catálogo Impreso</span>
                  <span className="text-sm flex gap-2 text-white"><CheckCircle2 size={16} className="text-brand-emerald-bright" /> Academia de Ventas 1</span>
               </div>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col">
               <h3 className="font-heading font-bold text-xl mb-1 text-brand-gold">Kit Líder</h3>
               <span className="font-heading font-bold text-3xl text-brand-gold-bright mb-6">$250</span>
               <div className="flex-1 flex flex-col gap-3">
                  <span className="text-sm flex gap-2"><CheckCircle2 size={16} className="text-brand-gold" /> 14 Productos Multi-categoría</span>
                  <span className="text-sm flex gap-2"><CheckCircle2 size={16} className="text-brand-gold" /> Status Silver Inmediato</span>
                  <span className="text-sm flex gap-2"><CheckCircle2 size={16} className="text-brand-gold" /> Acceso Total Backoffice</span>
                  <span className="text-sm flex gap-2"><CheckCircle2 size={16} className="text-brand-gold" /> Mentoría Personalizada 1:1</span>
               </div>
            </div>
         </div>
      </section>

    </div>
  );
}
