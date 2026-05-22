import React from 'react';
import { CompassRose, RankStripe, Crosshair } from '../components/ui/TacticalGraphics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Nosotros() {
  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      {/* Hero */}
      <section className="bg-tactical-black border-b border-tactical-border relative overflow-hidden py-24">
        <CompassRose className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] text-tactical-border opacity-[0.08]" />
        <Crosshair className="absolute bottom-8 right-8 w-64 h-64 text-tactical-border opacity-[0.08]" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
           <h1 className="font-heading text-6xl md:text-7xl font-bold text-khaki-white tracking-[0.04em] mb-8 uppercase leading-none">
             QUIÉNES SOMOS
           </h1>
           <RankStripe className="mx-auto mb-8" />
           <p className="text-xl text-alert-red font-heading uppercase tracking-widest">
             Una institución fundada por operativos, para operativos.
           </p>
        </div>
      </section>

      {/* Mission Statement Matrix */}
      <section className="py-16 bg-tactical-black">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card accentColor="none" className="border-l-4 border-l-alert-red p-12 bg-olive-dark text-center shadow-lg">
               <h2 className="font-heading text-4xl italic text-khaki-white uppercase tracking-wider mb-6">
                 "LA PREPARACIÓN NO ESPERA. LA EMERGENCIA TAMPOCO."
               </h2>
               <p className="text-field-green font-heading uppercase tracking-widest font-bold">— TAKTIS Training Institute</p>
            </Card>
         </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Visual Abstract side */}
            <div className="h-[500px] bg-olive-dark border border-tactical-border rounded-[4px] relative overflow-hidden flex items-center justify-center tactical-grid">
               <Shield className="w-64 h-64 text-tactical-border absolute opacity-20" />
               <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMWExMTE3Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjOGFhZjVhIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMSI+PC9wYXRoPgo8L3N2Zz4=')]"></div>
               <div className="w-[1px] h-full bg-field-green/30 absolute left-1/3"></div>
               <div className="w-[1px] h-full bg-alert-red/30 absolute right-1/3"></div>
            </div>
            {/* Text side */}
            <div>
               <h3 className="font-heading text-4xl font-bold text-khaki-white mb-8 uppercase tracking-[0.03em]">FUNDADA POR QUIENES HAN ESTADO AHÍ.</h3>
               <div className="space-y-6 text-lg text-muted-dark leading-relaxed">
                  <p>
                    TAKTIS nació de la experiencia de oficiales retirados y líderes de unidades de respuesta del Ecuador. Operativos que durante años vieron una brecha peligrosa: la diferencia entre la certificación teórica y la verdadera preparación táctica para la calle.
                  </p>
                  <p>
                    Construimos una malla curricular basada en escenarios vivos, no aulas pasivas. Entendimos que la vida de un policía, militar o bombero no depende de lo que responde en un examen escrito, sino de su memoria muscular geométrica y toma de decisiones bajo alto estrés.
                  </p>
                  <p>
                    Hoy, TAKTIS sirve a las principales instituciones del país, proveyendo un estándar de operación riguroso, desprovisto de ego y centrado obsesivamente en la misión.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-tactical-black border-t border-tactical-border">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="font-heading text-4xl font-bold text-khaki-white mb-12 uppercase tracking-[0.03em] text-center">FUNDAMENTOS INSTITUCIONALES</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <Card accentColor="red" className="p-8">
                 <h4 className="font-heading text-2xl text-khaki-white uppercase mb-4">Rigor Operacional</h4>
                 <p className="text-muted-dark leading-relaxed">Cada ejercicio simula condiciones reales. No entrenamos para aprobar el examen burocrático — entrenamos para garantizar que sobrevivan a la misión.</p>
               </Card>
               <Card accentColor="green" className="p-8">
                 <h4 className="font-heading text-2xl text-khaki-white uppercase mb-4">Instructores de Campo</h4>
                 <p className="text-muted-dark leading-relaxed">Solo enseñan quienes han operado bajo fuego o llamas. Exigimos experiencia comprobable en unidades de élite reales, rechazando títulos académicos vacíos.</p>
               </Card>
               <Card accentColor="red" className="p-8">
                 <h4 className="font-heading text-2xl text-khaki-white uppercase mb-4">Certificación con Respaldo</h4>
                 <p className="text-muted-dark leading-relaxed">Nuestros certificados son sometidos a auditoría y son reconocidos activamente por las instituciones jerárquicas que emplean a nuestros graduados.</p>
               </Card>
               <Card accentColor="green" className="p-8">
                 <h4 className="font-heading text-2xl text-khaki-white uppercase mb-4">Adaptación Constante</h4>
                 <p className="text-muted-dark leading-relaxed">El enemigo y las físicas del entorno cambian. Actualizamos protocolos tácticos en cada ciclo formativo basándonos en la realidad delictiva y operativa actual del Ecuador.</p>
               </Card>
            </div>
         </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-olive-dark">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="font-heading text-3xl font-bold text-khaki-white mb-16 uppercase tracking-wider text-center">LÍNEA DE TIEMPO OPERACIONAL</h3>
            
            <div className="relative border-l border-alert-red ml-6 md:ml-12 space-y-12">
               {[
                 { y: '2017', t: 'Fundación de TAKTIS por un grupo de oficiales retirados en Quito.' },
                 { y: '2018', t: 'Primer curso certificado internamente: Tácticas de Intervención Policial.' },
                 { y: '2020', t: 'Expansión operativa a Guayaquil y adaptación virtual durante emergencia sanitaria.' },
                 { y: '2022', t: 'Incorporación de células HAZMAT y especialización de rescate en alturas.' },
                 { y: '2023', t: 'Alianzas firmes con componentes de Fuerzas Armadas y Cuerpos de Bomberos zonales.' },
                 { y: '2025', t: '+500 operativos capacitados en múltiples disciplinas tácticas a nivel nacional.' }
               ].map((item, i) => (
                 <div key={i} className="relative pl-10">
                    <div className="absolute -left-[5px] top-2 w-[9px] h-[9px] rounded-full bg-tactical-black border-2 border-alert-red"></div>
                    <div className="font-heading text-xl text-alert-red uppercase tracking-widest font-bold mb-2">{item.y}</div>
                    <p className="text-khaki-white">{item.t}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      <section className="py-24 bg-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <h1 className="font-heading text-4xl md:text-[50px] font-bold text-khaki-white tracking-[0.04em] mb-8 uppercase">
            ¿TU UNIDAD NECESITA CAPACITACIÓN?
          </h1>
          <RankStripe className="mb-8" />
          <p className="text-xl text-muted-dark mb-12">
            Contáctanos para estructurar una propuesta operativa y técnica a medida para tu institución.
          </p>
          <Link to="/contacto">
            <Button className="text-lg py-5 px-12">SOLICITAR PROPUESTA</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
