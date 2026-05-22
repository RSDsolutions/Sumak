import React, { useState } from 'react';
import { courses } from '../data/courses';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RankStripe } from '../components/ui/TacticalGraphics';
import { CheckCircle2 } from 'lucide-react';

export default function Contacto() {
  const [formData, setFormData] = useState({
    nombre: '',
    rango: '',
    institucion: 'Policía Nacional',
    unidad: '',
    telefono: '',
    email: '',
    ciudad: 'Quito',
    curso: courses[0].title,
    modalidad: 'Presencial',
    notas: ''
  });

  const WHATSAPP_NUMBER = "593900000000"; // Placeholder EC number

  const openWhatsApp = (text: string) => {
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    openWhatsApp(`Inscripción TAKTIS:
Nombre: ${formData.nombre}
Rango: ${formData.rango}
Institución: ${formData.institucion} · Unidad: ${formData.unidad}
Curso: ${formData.curso}
Modalidad: ${formData.modalidad}
Ciudad: ${formData.ciudad}
Contacto: ${formData.telefono} | ${formData.email}
Notas: ${formData.notas}`);
  };

  const handleDirectWhatsapp = () => {
    openWhatsApp('Hola TAKTIS, necesito información sobre sus cursos y próximas fechas.');
  };

  const handleProposalRequest = () => {
    openWhatsApp('Hola TAKTIS, necesito una propuesta de capacitación in-company para mi unidad o institución.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputClass = "w-full bg-tactical-black border-2 border-tactical-border rounded-[2px] px-4 py-3 text-khaki-white focus:border-alert-red focus:outline-none transition-colors font-body text-sm mt-1";
  const labelClass = "text-[11px] uppercase tracking-widest font-medium text-muted-dark";

  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      <section className="bg-tactical-black border-b border-tactical-border pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h1 className="font-heading text-5xl font-bold text-khaki-white tracking-[0.04em] mb-2 uppercase">INSCRÍBETE</h1>
           <p className="text-muted-dark text-lg">Selecciona tu curso, completa el formulario — te contactamos en 24 horas.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Form */}
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="bg-olive-dark border border-tactical-border rounded-[4px] p-8">
                <RankStripe className="mb-8" />
                <h3 className="font-heading text-2xl text-khaki-white uppercase mb-8">Datos del Postulante</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label htmlFor="nombre" className={labelClass}>Nombre Completo</label>
                    <input id="nombre" required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="rango" className={labelClass}>Rango / Grado (si aplica)</label>
                    <input id="rango" type="text" name="rango" value={formData.rango} onChange={handleChange} className={inputClass} placeholder="Ej. Cabo 1º" />
                  </div>
                  <div>
                    <label htmlFor="institucion" className={labelClass}>Institución</label>
                    <select id="institucion" name="institucion" value={formData.institucion} onChange={handleChange} className={inputClass}>
                       <option>Policía Nacional</option>
                       <option>Fuerzas Armadas</option>
                       <option>Cuerpo de Bomberos</option>
                       <option>Cruz Roja</option>
                       <option>Brigada Privada</option>
                       <option>Particular</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="unidad" className={labelClass}>Unidad / Destacamento</label>
                    <input id="unidad" type="text" name="unidad" value={formData.unidad} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="telefono" className={labelClass}>WhatsApp / Teléfono</label>
                    <input id="telefono" required type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelClass}>Email</label>
                    <input id="email" required type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="ciudad" className={labelClass}>Ciudad</label>
                    <select id="ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} className={inputClass}>
                       <option>Quito</option>
                       <option>Guayaquil</option>
                       <option>Cuenca</option>
                       <option>Otra</option>
                    </select>
                  </div>
                </div>

                <div className="bg-tactical-black border-t border-tactical-border/50 -mx-8 px-8 py-8">
                   <h3 className="font-heading text-2xl text-khaki-white uppercase mb-8">Selección de Curso</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                     <div>
                       <label htmlFor="curso" className={labelClass}>Curso de Interés</label>
                       <select id="curso" required name="curso" value={formData.curso} onChange={handleChange} className={inputClass}>
                          {courses.map(c => <option key={c.slug} value={c.title}>{c.title}</option>)}
                       </select>
                     </div>
                     <div>
                       <label htmlFor="modalidad" className={labelClass}>Modalidad Preferida</label>
                       <select id="modalidad" name="modalidad" value={formData.modalidad} onChange={handleChange} className={inputClass}>
                          <option>Presencial</option>
                          <option>Virtual</option>
                          <option>En campo</option>
                          <option>Indiferente</option>
                       </select>
                     </div>
                   </div>
                   
                   <div className="mb-8">
                     <label htmlFor="notas" className={labelClass}>Información Adicional (Opcional)</label>
                     <textarea id="notas" name="notas" value={formData.notas} onChange={handleChange} className={`${inputClass} min-h-[100px] resize-y`} />
                   </div>

                   <Button type="submit" className="w-full text-lg py-4">
                      ENVIAR INSCRIPCIÓN POR WHATSAPP
                   </Button>
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4">
              <Card accentColor="red" className="p-8 sticky top-32">
                 <h3 className="font-heading text-2xl text-khaki-white mb-8 uppercase">CANALES DE CONTACTO</h3>
                 
                 <div className="space-y-6">
                   <Button type="button" onClick={handleDirectWhatsapp} className="w-full justify-start text-left">
                      WhatsApp Central
                   </Button>
                   <a href="mailto:info@taktis.edu.ec" className="flex items-center text-field-green font-heading uppercase text-sm tracking-widest hover:text-white transition-colors">
                     Envíenos un email
                   </a>
                 </div>

                 <div className="my-8 pt-8 border-t border-tactical-border">
                    <h4 className="font-heading text-xl text-khaki-white uppercase mb-4">CAPACITACIÓN IN-COMPANY</h4>
                    <p className="text-sm text-muted-dark leading-relaxed mb-6">
                      ¿Tu unidad necesita formación a medida? Organizamos entrenamientos en tus instalaciones con instructores certificados.
                    </p>
                    <Button type="button" variant="outline" onClick={handleProposalRequest} className="w-full">SOLICITAR PROPUESTA</Button>
                 </div>

                 <div className="pt-8 border-t border-tactical-border space-y-4">
                    <div>
                      <span className="block text-[10px] text-muted-dark uppercase tracking-widest mb-1">Horario de Atención</span>
                      <span className="text-khaki-white text-sm">Lunes a Viernes · 08:00 – 17:00</span>
                    </div>
                    <div>
                      <span className="inline-block bg-field-green/10 text-field-green border border-field-green px-3 py-1 rounded-[2px] text-[10px] uppercase tracking-widest font-bold">
                        Respuesta en menos de 24 horas
                      </span>
                    </div>
                 </div>
              </Card>
            </div>
            
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-light-bg py-12 border-t border-tactical-border/10">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="flex items-center gap-4">
                 <CheckCircle2 className="w-8 h-8 text-alert-red shrink-0" />
                 <h4 className="font-heading text-xl uppercase text-tactical-black">Inscripción directa</h4>
               </div>
               <div className="flex items-center gap-4">
                 <CheckCircle2 className="w-8 h-8 text-alert-red shrink-0" />
                 <h4 className="font-heading text-xl uppercase text-tactical-black">Sin trámites burocráticos</h4>
               </div>
               <div className="flex items-center gap-4">
                 <CheckCircle2 className="w-8 h-8 text-alert-red shrink-0" />
                 <h4 className="font-heading text-xl uppercase text-tactical-black">Certificado garantizado al finalizar</h4>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
