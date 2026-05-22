import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { courses, areas } from '../data/courses';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Shield } from 'lucide-react';

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const course = courses.find(c => c.slug === slug) || courses[0];
  const area = areas.find(a => a.id === course.areaId)!;

  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      {/* Hero Mini */}
      <section className="bg-tactical-black border-b border-tactical-border pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center gap-2 mb-4">
             <Link to="/cursos" className="text-muted-dark hover:text-khaki-white text-sm">Catálogo</Link>
             <span className="text-muted-dark font-heading">/</span>
             <span className="text-khaki-white text-sm truncate">{course.title}</span>
           </div>
        </div>
      </section>

      <section className="py-16 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Col */}
            <div className="lg:col-span-2">
               <h1 className="font-heading text-5xl md:text-6xl font-bold text-khaki-white uppercase tracking-[0.04em] mb-6 leading-none">
                 {course.title}
               </h1>
               
               <div className="flex flex-wrap gap-3 mb-8">
                 <Badge color={area.color}>{area.name}</Badge>
                 <Badge color="outline">{course.targetAudience.replace('PARA: ', '')}</Badge>
                 <Badge color="outline">{course.modality}</Badge>
                 <Badge color="outline">{course.level}</Badge>
               </div>
               
               <div className="prose prose-invert prose-p:text-muted-dark prose-p:leading-relaxed max-w-none mb-12">
                 <p className="text-lg text-khaki-white mb-4">{course.description}</p>
                 <p>Este programa está diseñado bajo los más estrictos estándares operacionales para garantizar que el participante adquiera las habilidades necesarias para intervenir en situaciones críticas. La formación combina doctrina teórica con un alto porcentaje de simulación práctica.</p>
                 <p>Todos los protocolos enseñados se basan en las directrices internacionales más recientes, adaptadas a la realidad logística y operativa del Ecuador.</p>
               </div>

               <h3 className="font-heading text-3xl font-bold text-khaki-white mb-6 uppercase tracking-wider">CONTENIDO DEL CURSO</h3>
               <div className="space-y-4 mb-12">
                  {[1, 2, 3, 4].map(mod => (
                    <div key={mod} className="border border-tactical-border bg-olive-dark rounded-[4px] p-6">
                      <h4 className="font-heading text-xl text-khaki-white mb-4 uppercase">MÓDULO {mod}: Fundamentos Operacionales</h4>
                      <ul className="text-muted-dark space-y-2 list-disc list-inside">
                        <li>Protocolos de seguridad inicial y evaluación de la escena.</li>
                        <li>Despliegue táctico y uso óptimo del equipo estandarizado.</li>
                        <li>Manejo de incidentes críticos bajo estrés sostenido.</li>
                      </ul>
                    </div>
                  ))}
               </div>

               <h3 className="font-heading text-3xl font-bold text-khaki-white mb-6 uppercase tracking-wider">REQUISITOS</h3>
               <ul className="text-muted-dark space-y-3 list-disc list-inside mb-12">
                 <li>Pertenecer a una institución de seguridad o emergencia (presentar credencial).</li>
                 <li>Aprobar evaluación médica y física previa.</li>
                 <li>Contar con equipo de protección personal básico.</li>
                 <li>Disponibilidad de tiempo completo durante los días de campo.</li>
               </ul>
            </div>

            {/* Right Col / Sticky Side */}
            <div className="lg:col-span-1">
              <Card accentColor="red" className="p-8 sticky top-32">
                 <h3 className="font-heading text-2xl text-khaki-white mb-6 uppercase">Detalles Operativos</h3>
                 
                 <div className="space-y-6 mb-8">
                   <div>
                     <span className="block text-[10px] text-muted-dark uppercase tracking-widest font-medium mb-1">Duración</span>
                     <span className="font-heading text-xl font-bold text-field-green tracking-wider">{course.duration}</span>
                   </div>
                   <div>
                     <span className="block text-[10px] text-muted-dark uppercase tracking-widest font-medium mb-1">Próxima Fecha</span>
                     <span className="text-khaki-white font-medium">15 de Junio, 2026</span>
                   </div>
                   <div>
                     <span className="block text-[10px] text-muted-dark uppercase tracking-widest font-medium mb-1">Disponibilidad</span>
                     <Badge color="amber" className="mt-1">Cupos Limitados</Badge>
                   </div>
                   <div className="pt-6 border-t border-tactical-border">
                     <span className="block text-[10px] text-muted-dark uppercase tracking-widest font-medium mb-1">Inversión</span>
                     <span className="font-heading text-3xl text-khaki-white font-bold">$150.00</span>
                   </div>
                 </div>

                 <Link to="/contacto" className="block w-full mb-4">
                   <Button className="w-full">INSCRIBIRSE AHORA</Button>
                 </Link>
                 <Link to="/contacto" className="block w-full">
                   <Button variant="outline" className="w-full">SOLICITAR INFORMACIÓN</Button>
                 </Link>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
