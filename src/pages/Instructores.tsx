import React from 'react';
import { Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { RankStripe } from '../components/ui/TacticalGraphics';
import { Link } from 'react-router-dom';

const instructors = [
  { name: 'Carlos Vega', rank: 'MAYOR (R) · FUERZAS ARMADAS', specialties: ['Táctico', 'Liderazgo'], experience: '18 AÑOS EN OPERACIONES', bio: 'Comandó unidades de fuerzas especiales en zonas de frontera. Experto en planeamiento táctico y asalto.' },
  { name: 'Marco Ríos', rank: 'SGTO. 1º (R) · POLICÍA NACIONAL', specialties: ['Intervención', 'Disturbios'], experience: '15 AÑOS EN OPERACIONES', bio: 'Instructor principal del Grupo de Intervención y Rescate (GIR). Especialista en brecheo y reducción.' },
  { name: 'Andrea Mora', rank: 'CAP. (R) · CUERPO DE BOMBEROS', specialties: ['Incendios', 'Rescate'], experience: '12 AÑOS EN OPERACIONES', bio: 'Líder de ataque interior en incendios de gran magnitud. Instructora certificada NFPA.' },
  { name: 'Luis Andrade', rank: 'TTE. CNEL. (R) · FFAA', specialties: ['Rescate', 'Montaña'], experience: '22 AÑOS EN OPERACIONES', bio: 'Legendario rescatista de alta montaña e intervenciones aéreas de extracción.' },
  { name: 'Diana Salcedo', rank: 'INSPECTOR (R) · POLICÍA', specialties: ['Primeros Auxilios', 'BLS'], experience: '10 AÑOS EN OPERACIONES', bio: 'Paramédica táctica. Salvó a decenas de operativos aplicando TCCC bajo fuego cruzado.' },
  { name: 'Rodrigo Paz', rank: 'SGTO. MAYOR (R) · BOMBEROS', specialties: ['HAZMAT', 'Incendios'], experience: '16 AÑOS EN OPERACIONES', bio: 'Comandante del equipo de materiales peligrosos. Experto en control químico e industrial.' }
];

export default function Instructores() {
  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      <section className="bg-tactical-black border-b border-tactical-border pt-12 pb-8 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h1 className="font-heading text-5xl font-bold text-khaki-white tracking-[0.04em] mb-4">CUERPO DOCENTE</h1>
           <p className="text-alert-red uppercase tracking-widest font-heading text-xl">Operativos reales. Formadores de élite.</p>
        </div>
      </section>

      <section className="py-8 bg-tactical-black">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-olive-dark border border-tactical-border rounded-[4px] border-l-4 border-l-alert-red p-8">
               <p className="font-body italic text-khaki-white text-lg md:text-xl text-center">
                 "Todos nuestros instructores provienen de servicio activo o retiro honorable en las Fuerzas Armadas, Policía Nacional o Cuerpo de Bomberos del Ecuador. Enseñan lo que han vivido."
               </p>
            </div>
         </div>
      </section>

      <section className="py-12 flex-grow bg-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {instructors.map((inst, i) => (
              <Card key={i} className="flex flex-col h-full group pb-2">
                 {/* Photo Placeholder */}
                 <div className="h-48 bg-tactical-black border-b border-tactical-border flex items-center justify-center relative overflow-hidden">
                    <Shield className="w-24 h-24 text-tactical-border absolute opacity-20" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMGQxMTE3Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMmEzMzIwIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMSI+PC9wYXRoPgo8L3N2Zz4=')]"></div>
                    <div className="z-10 bg-alert-red p-2 absolute top-4 right-4 rounded-full">
                       <RankStripe className="w-6 opacity-80" />
                    </div>
                 </div>
                 <div className="p-6 flex flex-col flex-grow">
                    <h2 className="font-heading text-3xl text-khaki-white uppercase mb-1">{inst.name}</h2>
                    <p className="font-body text-xs font-medium text-alert-red uppercase tracking-[0.1em] mb-4">{inst.rank}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {inst.specialties.map(spec => <Badge key={spec} color="green">{spec}</Badge>)}
                    </div>

                    <p className="text-amber font-heading text-sm uppercase tracking-widest font-bold mb-4">{inst.experience}</p>
                    
                    <p className="text-muted-dark text-sm leading-relaxed flex-grow">{inst.bio}</p>
                 </div>
                 <div className="px-6 pt-4 border-t border-tactical-border/50">
                    <Link to="/cursos" className="inline-block text-field-green font-heading uppercase text-sm tracking-widest hover:text-white transition-colors">
                      Ver cursos de este instructor
                    </Link>
                 </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-light-bg text-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
           <h3 className="font-heading text-2xl tracking-[0.03em] mb-12">EXPERIENCIA COLECTIVA DEL EQUIPO</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="font-heading text-5xl font-bold text-alert-red mb-4">90+</p>
                <p className="font-medium uppercase tracking-widest text-xs text-muted-light">Años combinados en operaciones reales</p>
              </div>
              <div>
                <p className="font-heading text-5xl font-bold text-field-green mb-4">6</p>
                <p className="font-medium uppercase tracking-widest text-xs text-muted-light">Especialidades Tácticas Cubiertas</p>
              </div>
              <div>
                <p className="font-heading text-5xl font-bold text-amber mb-4">3</p>
                <p className="font-medium uppercase tracking-widest text-xs text-muted-light">Países de Formación (Ecuador, Colombia, EE.UU.)</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}
