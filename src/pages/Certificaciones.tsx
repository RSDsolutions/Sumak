import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RankStripe } from '../components/ui/TacticalGraphics';
import { Link } from 'react-router-dom';

const certs = [
  { name: 'Certificado en Operaciones Tácticas', desc: 'Acredita competencias avanzadas en brecheo, asalto y control de crisis.', para: 'Policías y Militares', valid: '3 Años' },
  { name: 'Certificado en Rescate Operacional', desc: 'Habilita para técnicas de extracción en altura, acuáticas y espacios confinados.', para: 'Bomberos y Cruz Roja', valid: '2 Años' },
  { name: 'Certificado en Supresión de Incendios', desc: 'Aval internacional para combate estructural y manejo de líneas de ataque.', para: 'Brigadas Industriales y Bomberos', valid: '2 Años' },
  { name: 'Certificado en Respuesta a Emergencias', desc: 'Soporte vital básico bajo lineamientos TCCC y BLS táctico.', para: 'Todo cuerpo de seguridad', valid: '1 Año' }
];

export default function Certificaciones() {
  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      <section className="bg-tactical-black border-b border-tactical-border pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h1 className="font-heading text-5xl font-bold text-khaki-white tracking-[0.04em] mb-2 uppercase">CERTIFICACIONES</h1>
           <p className="text-muted-dark text-lg">Credenciales que abren puertas institucionales.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
             <div>
                <RankStripe className="mb-6" />
                <h2 className="font-heading text-3xl text-khaki-white mb-6 leading-tight">EL VALOR OPERATIVO DE NUESTRA CERTIFICACIÓN</h2>
                <p className="text-muted-dark leading-relaxed mb-6">
                  En TAKTIS, un certificado no es un simple diploma de asistencia. Es una declaración jurada de competencia operativa. Proveemos certificaciones diseñadas bajo los estándares que exigen las unidades especiales de Ecuador.
                </p>
                <p className="text-muted-dark leading-relaxed">
                  Para obtener la certificación, el postulante debe superar evaluaciones de campo rigurosas bajo condiciones de estrés simulado.
                </p>
             </div>
             <div className="flex flex-col gap-4">
                <Card accentColor="amber" className="p-6">
                   <h4 className="font-heading text-xl text-khaki-white uppercase mb-2">Validez Institucional</h4>
                   <p className="text-sm text-muted-dark">Avaladas para presentarse en procesos de ascenso y reclutamiento.</p>
                </Card>
                <Card accentColor="amber" className="p-6">
                   <h4 className="font-heading text-xl text-khaki-white uppercase mb-2">Registro Nacional</h4>
                   <p className="text-sm text-muted-dark">Cada certificado cuenta con un código QR único para verificación en nuestra base de datos.</p>
                </Card>
                <Card accentColor="amber" className="p-6">
                   <h4 className="font-heading text-xl text-khaki-white uppercase mb-2">Reconocimiento Operativo</h4>
                   <p className="text-sm text-muted-dark">Aceptado por unidades de élite debido al rigor de nuestra malla curricular.</p>
                </Card>
             </div>
          </div>

          <h3 className="font-heading text-3xl font-bold text-khaki-white mb-8 uppercase tracking-wider text-center">NUESTROS AVALES</h3>
          <div className="flex flex-col gap-6">
             {certs.map(cert => (
               <Card key={cert.name} accentColor="amber" className="p-0 border-l border-r border-b">
                 <div className="h-1 w-full bg-amber mb-0"></div>
                 <div className="p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="shrink-0 p-4 border border-amber/30 rounded-full bg-amber/5">
                      <ShieldCheck className="w-16 h-16 text-amber" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-amber text-[10px] uppercase font-bold tracking-widest mb-2">Certificado TAKTIS</div>
                      <h4 className="font-heading text-3xl text-khaki-white uppercase mb-2">{cert.name}</h4>
                      <p className="text-muted-dark max-w-2xl text-sm mb-4">{cert.desc}</p>
                      <div className="flex gap-6 mt-4">
                        <div>
                           <span className="block text-[10px] text-muted-dark uppercase tracking-widest mb-1">Para</span>
                           <span className="text-khaki-white font-medium text-sm">{cert.para}</span>
                        </div>
                        <div>
                           <span className="block text-[10px] text-muted-dark uppercase tracking-widest mb-1">Validez</span>
                           <span className="text-amber font-medium text-sm">{cert.valid}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-3 min-w-[200px] mt-6 md:mt-0">
                       <Link to="/contacto" className="block w-full">
                         <Button className="w-full text-xs py-3">SOLICITAR INFO</Button>
                       </Link>
                       <Link to="/cursos" className="text-center font-heading text-field-green uppercase text-xs tracking-wider hover:text-white transition-colors">
                         Ver cursos relacionados
                       </Link>
                    </div>
                 </div>
               </Card>
             ))}
          </div>

        </div>
      </section>

      {/* How to  */}
      <section className="py-24 bg-olive-dark border-t border-tactical-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <h3 className="font-heading text-3xl font-bold text-khaki-white mb-16 uppercase tracking-wider">PROCESO DE CERTIFICACIÓN</h3>
           
           <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {/* Line connector desktop */}
              <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-[1px] border-t-2 border-dashed border-alert-red/30 z-0"></div>
              
              {[
                { n: '01', t: 'Inscripción' },
                { n: '02', t: 'Formación teórica y práctica' },
                { n: '03', t: 'Evaluación operacional' },
                { n: '04', t: 'Emisión del certificado' }
              ].map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center">
                   <div className="w-14 h-14 rounded-full bg-tactical-black border-2 border-alert-red text-alert-red flex items-center justify-center font-heading text-2xl font-bold mb-6">
                     {step.n}
                   </div>
                   <p className="font-heading text-lg font-medium text-khaki-white uppercase text-center max-w-[200px]">
                     {step.t}
                   </p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Institutional Bar */}
      <section className="py-16 bg-light-bg text-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
             <h3 className="font-heading text-2xl tracking-[0.03em]">RECONOCIDO POR</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {['Policía Nacional del Ecuador', 'Fuerzas Armadas del Ecuador', 'Cuerpo de Bomberos', 'Cruz Roja Ecuatoriana', 'Brigadas Industriales Privadas'].map((inst, i) => (
              <div key={i} className="bg-tactical-black text-khaki-white p-6 w-48 shrink-0 flex flex-col justify-center items-center text-center rounded-[4px] border border-tactical-border">
                <Shield className="w-8 h-8 text-tactical-border mb-4 opacity-50" />
                <span className="font-heading text-lg tracking-[0.03em] leading-tight">{inst}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
