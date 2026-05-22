import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { RankStripe } from '../components/ui/TacticalGraphics';
import { Link } from 'react-router-dom';

const posts = [
  {
    slug: 'protocolo-entrada-estructuras-llamas',
    category: 'Incendios',
    color: 'red' as const,
    title: 'Protocolo de entrada a estructuras en llamas: lo que todo bombero debe saber',
    excerpt: 'Análisis táctico sobre la lectura del humo, gestión de puertas y patrones de ataque agresivo en incendios compartimentados.',
    date: '15 MAY 2026',
    author: 'CAP. A. MORA',
    readTime: '6 MIN',
    featured: true
  },
  {
    slug: 'rescate-espacios-confinados',
    category: 'Rescate',
    color: 'green' as const,
    title: 'Técnicas de rescate en espacios confinados: errores comunes y cómo evitarlos',
    excerpt: 'Procedimientos de gestión de aire y monitoreo atmosférico continuo para equipos de primera respuesta.',
    date: '02 MAY 2026',
    author: 'TTE. CNEL. L. ANDRADE',
    readTime: '8 MIN'
  },
  {
    slug: 'escudo-balistico',
    category: 'Seguridad Táctica',
    color: 'red' as const,
    title: 'Uso táctico del escudo balístico en operaciones policiales',
    excerpt: 'Posturas, ángulos de cobertura y desplazamiento en pasillos angostos para equipos de intervención.',
    date: '20 ABR 2026',
    author: 'MAYOR C. VEGA',
    readTime: '5 MIN'
  },
  {
    slug: 'estres-operacional',
    category: 'Liderazgo',
    color: 'amber' as const,
    title: 'Gestión del estrés operacional en escenarios de alto riesgo',
    excerpt: 'Tácticas de respiración de combate y enfoque cognitivo para mantener la letalidad y precisión bajo presión extrema.',
    date: '10 ABR 2026',
    author: 'SGTO. M. RÍOS',
    readTime: '7 MIN'
  },
  {
    slug: 'hazmat-identificacion',
    category: 'Incendios',
    color: 'red' as const,
    title: 'HAZMAT: identificación rápida de materiales peligrosos en campo',
    excerpt: 'Uso práctico de la guía GRE y perímetros de aislamiento inicial para primeras dotaciones.',
    date: '28 MAR 2026',
    author: 'SGTO. MAYOR R. PAZ',
    readTime: '6 MIN'
  },
  {
    slug: 'primeros-auxilios-combate',
    category: 'Primeros Auxilios',
    color: 'amber' as const,
    title: 'Primeros auxilios en combate: el protocolo TCCC adaptado para Ecuador',
    excerpt: 'Aplicación de torniquetes bajo fuego y manejo de vía aérea táctica en entornos hostiles urbanos.',
    date: '15 MAR 2026',
    author: 'INSP. D. SALCEDO',
    readTime: '10 MIN'
  }
];

export default function Blog() {
  const featured = posts.find(p => p.featured)!;
  const gridPosts = posts.filter(p => !p.featured);

  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      <section className="bg-tactical-black border-b border-tactical-border pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h1 className="font-heading text-5xl font-bold text-khaki-white tracking-[0.04em] mb-2 uppercase">BLOG OPERACIONAL</h1>
           <p className="text-muted-dark text-lg">Conocimiento táctico para profesionales de la seguridad y emergencia.</p>
        </div>
      </section>

      <section className="py-12 bg-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <Card accentColor={featured.color} className="flex flex-col md:flex-row relative group">
              <div className="md:w-1/2 min-h-[300px] bg-tactical-black border-r border-tactical-border/50 relative overflow-hidden flex items-center justify-center">
                 {/* Visual Placeholder */}
                 <div className="absolute inset-0 tactical-grid opacity-30"></div>
                 <div className="z-10 bg-alert-red px-6 py-4">
                   <h2 className="font-heading text-6xl text-tactical-black font-bold tracking-widest opacity-20">TAKTIS</h2>
                 </div>
              </div>
              <div className="md:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                 <Badge color={featured.color} className="self-start mb-6">{featured.category}</Badge>
                 <h2 className="font-heading text-4xl lg:text-5xl text-khaki-white uppercase mb-6 leading-none">
                    {featured.title}
                 </h2>
                 <p className="text-muted-dark text-lg leading-relaxed mb-8">{featured.excerpt}</p>
                 <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase font-medium tracking-widest text-muted-dark mb-8">
                    <span>{featured.date}</span>
                    <span className="w-1 h-1 bg-tactical-border rounded-full"></span>
                    <span>{featured.author}</span>
                    <span className="w-1 h-1 bg-tactical-border rounded-full"></span>
                    <span className="text-khaki-white">{featured.readTime} LECTURA</span>
                 </div>
                 <Link to={`/blog/${featured.slug}`}>
                    <Button>LEER ARTÍCULO</Button>
                 </Link>
              </div>
           </Card>
        </div>
      </section>

      <section className="py-12 bg-tactical-black flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridPosts.map(post => (
                <Card key={post.slug} accentColor={post.color} className="flex flex-col">
                  {/* Photo spacer */}
                  <div className="h-48 bg-tactical-black border-b border-tactical-border relative flex items-center justify-center">
                     <div className="w-full h-[1px] bg-tactical-border absolute top-1/2 transform -translate-y-1/2 opacity-50"></div>
                     <div className="w-[1px] h-full bg-tactical-border absolute left-1/2 transform -translate-x-1/2 opacity-50"></div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                     <Badge color={post.color} className="self-start mb-4">{post.category}</Badge>
                     <h3 className="font-heading text-2xl text-khaki-white uppercase mb-3 leading-tight">{post.title}</h3>
                     <p className="text-muted-dark text-sm leading-relaxed mb-6 flex-grow">{post.excerpt}</p>
                     
                     <div className="flex justify-between items-center pt-4 border-t border-tactical-border/50">
                        <div className="text-[10px] uppercase tracking-widest text-muted-dark font-medium">
                           {post.date} · {post.readTime}
                        </div>
                        <Link to={`/blog/${post.slug}`} className="text-field-green font-heading uppercase text-sm tracking-widest hover:text-white transition-colors">
                           LEER MÁS
                        </Link>
                     </div>
                  </div>
                </Card>
              ))}
           </div>
        </div>
      </section>
    </div>
  );
}
