import React, { useState } from 'react';
import { courses, areas } from '../data/courses';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';

export default function Cursos() {
  const [activeArea, setActiveArea] = useState<string>('all');
  
  const filteredCourses = activeArea === 'all' 
    ? courses 
    : courses.filter(c => c.areaId === activeArea);

  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      {/* Mini Hero */}
      <section className="bg-tactical-black border-b border-tactical-border pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h1 className="font-heading text-5xl font-bold text-khaki-white tracking-[0.04em] mb-2">CATÁLOGO DE CURSOS</h1>
           <p className="text-muted-dark text-lg">Formación táctica y operacional certificada.</p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-20 z-40 bg-tactical-black border-b border-tactical-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
           <div className="flex gap-2">
             <button 
               onClick={() => setActiveArea('all')}
               className={`whitespace-nowrap px-4 py-2 font-heading uppercase tracking-widest text-sm transition-colors rounded-[2px] ${activeArea === 'all' ? 'bg-alert-red text-khaki-white' : 'border border-tactical-border text-muted-dark hover:border-olive-hover'}`}
             >
               Todos
             </button>
             {areas.map(area => (
                <button 
                  key={area.id}
                  onClick={() => setActiveArea(area.id)}
                  className={`whitespace-nowrap px-4 py-2 font-heading uppercase tracking-widest text-sm transition-colors rounded-[2px] ${activeArea === area.id ? 'bg-alert-red text-khaki-white' : 'border border-tactical-border text-muted-dark hover:border-olive-hover'}`}
                >
                  {area.name}
                </button>
             ))}
           </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map(course => {
                 const area = areas.find(a => a.id === course.areaId)!;
                 return (
                   <Card key={course.slug} accentColor={area.color} className="flex flex-col h-full">
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-4">
                           <Badge color={area.color}>{area.name}</Badge>
                           <Badge color="outline" pill={false}>{course.modality}</Badge>
                        </div>
                        <h2 className="font-heading text-2xl text-khaki-white mb-2 leading-tight">{course.title}</h2>
                        <span className="text-[10px] uppercase font-medium tracking-[0.15em] text-muted-dark mb-4">{course.targetAudience}</span>
                        <div className="text-field-green font-heading text-xl mb-4 font-bold tracking-widest">{course.duration}</div>
                        
                        <p className="text-muted-dark text-sm mb-8 flex-grow">{course.description}</p>
                        
                        <div className="flex justify-between items-center mt-auto pt-4 border-t border-tactical-border/50">
                           <Badge color="amber">Certificado Incluido</Badge>
                           <Link to={`/cursos/${course.slug}`} className="font-heading text-alert-red hover:text-alert-red-hover uppercase tracking-widest text-sm transition-colors">
                             Ver Detalles
                           </Link>
                        </div>
                      </div>
                   </Card>
                 )
              })}
           </div>
        </div>
      </section>
    </div>
  );
}
