import { Phone, Mail, Instagram, Facebook, Youtube, MapPin, Send } from 'lucide-react';
import { TikTokIcon } from '../components/TikTokIcon';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Contacto() {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    tipo: 'Interesado en productos',
    ciudad: 'Quito',
    mensaje: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `¡Hola Sumak Ecuador!%0A
Soy: ${formData.nombre}%0A
Desde: ${formData.ciudad}%0A
Me interesa: ${formData.tipo}%0A
Mensaje: ${formData.mensaje}%0A
Contacto: ${formData.telefono} | ${formData.email}`;

    window.open(`https://wa.me/593999999999?text=${text}`, '_blank');
  };

  return (
    <div className="w-full pt-32 bg-brand-black min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-6">
         
         <div className="mb-16">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-[#F0F0F0] mb-4">Contáctanos</h1>
            <p className="text-brand-text-muted text-xl max-w-2xl">Estamos aquí para ayudarte a dar el primer paso hacia tu bienestar y libertad financiera.</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Left Form */}
            <div className="lg:col-span-7">
               <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-border rounded-[24px] p-8 shadow-2xl flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-brand-text-muted">Nombre Completo</label>
                     <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-brand-text-muted">Celular / WhatsApp</label>
                        <input required type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald" />
                     </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-brand-text-muted">Email</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald" />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-brand-text-muted">Motivo de Contacto</label>
                        <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald">
                           <option>Interesado en productos</option>
                           <option>Quiero ser distribuidor</option>
                           <option>Ya soy distribuidor</option>
                           <option>Otro</option>
                        </select>
                     </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-brand-text-muted">Ciudad</label>
                        <select value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald">
                           <option>Quito</option><option>Guayaquil</option><option>Cuenca</option><option>Loja</option><option>Ambato</option><option>Otra</option>
                        </select>
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-brand-text-muted">¿En qué podemos ayudarte?</label>
                     <textarea required rows={4} value={formData.mensaje} onChange={e => setFormData({...formData, mensaje: e.target.value})} className="w-full bg-[#111] border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-emerald resize-none"></textarea>
                  </div>

                  <button type="submit" className="w-full py-4 bg-brand-emerald text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-emerald-hover shadow-emerald-glow mt-2">
                    <Send size={20} /> Enviar por WhatsApp
                  </button>
               </form>
            </div>

            {/* Right Info */}
            <div className="lg:col-span-5 flex flex-col gap-8">
               
               <div className="bg-brand-surface border-t-4 border-brand-emerald rounded-2xl p-8 border-x border-b border-brand-border">
                  <div className="w-full bg-[#1A2A20] text-brand-emerald font-medium text-sm text-center py-2 rounded-lg border border-brand-emerald/30 mb-8">
                    Respondemos en menos de 2 horas.
                  </div>

                  <a href="https://wa.me/593999999999" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-brand-emerald text-white p-4 rounded-xl hover:bg-brand-emerald-hover transition-colors mb-4 shadow-lg shadow-brand-emerald/20">
                     <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Phone size={20} /></div>
                     <div className="flex flex-col">
                        <span className="text-xs uppercase font-medium tracking-wider text-emerald-100">WhatsApp Directo</span>
                        <span className="font-heading font-bold text-lg">+593 99 999 9999</span>
                     </div>
                  </a>

                  <a href="mailto:info@sumakecuador.com" className="flex items-center gap-4 text-brand-text-muted hover:text-[#F0F0F0] transition-colors p-4">
                     <Mail size={24} className="shrink-0" />
                     <span className="font-medium text-sm">info@sumakecuador.com</span>
                  </a>
                  
                  <div className="flex items-center gap-4 text-brand-text-muted p-4">
                     <MapPin size={24} className="shrink-0" />
                     <span className="font-medium text-sm">Ecuador · Envíos a Nivel Nacional</span>
                  </div>

                  <div className="w-full h-px bg-brand-border my-4"></div>
                  
                  <div className="flex flex-col gap-3 p-4">
                     <span className="text-sm font-medium text-[#F0F0F0]">Horario de Atención</span>
                     <span className="text-brand-text-muted text-sm">Lunes a Sábado · 8:00 – 20:00 (EC)</span>
                  </div>

                  <div className="flex justify-center gap-4 mt-4">
                     <a href="#" className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center text-brand-emerald hover:bg-brand-emerald/10 transition-colors"><Instagram size={20} /></a>
                     <a href="#" className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center text-brand-emerald hover:bg-brand-emerald/10 transition-colors"><Facebook size={20} /></a>
                     <a href="#" className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center text-brand-emerald hover:bg-brand-emerald/10 transition-colors"><TikTokIcon size={20} /></a>
                     <a href="#" className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center text-brand-emerald hover:bg-brand-emerald/10 transition-colors"><Youtube size={20} /></a>
                  </div>
               </div>

               <div className="bg-brand-surface border border-brand-gold/30 rounded-2xl p-8 relative overflow-hidden text-center">
                  <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-brand-gold/10 blur-[50px]"></div>
                  <h4 className="font-heading font-bold text-xl text-brand-gold mb-3 relative z-10">¿Ya eres distribuidor?</h4>
                  <p className="text-sm text-brand-text-muted mb-6 relative z-10">Accede a tu backoffice privado para gestionar tu red, revisar tu volumen y cobrar comisiones.</p>
                  <Link to="/login" className="inline-block px-6 py-3 border border-brand-gold text-brand-gold rounded-xl text-sm font-semibold hover:bg-brand-gold hover:text-brand-black transition-colors relative z-10 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                     Ingresar al Sistema
                  </Link>
               </div>

            </div>
         </div>
      </div>
    </div>
  );
}
