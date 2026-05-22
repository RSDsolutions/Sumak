import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { RankStripe } from '../components/ui/TacticalGraphics';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  // Use dummy post info for layout since this is visual only
  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      {/* Hero */}
      <section className="bg-tactical-black border-b border-tactical-border relative overflow-hidden py-24 tactical-grid">
        <div className="absolute inset-0 bg-gradient-to-t from-tactical-black to-transparent pointer-events-none z-0"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
           <Badge color="red" className="mb-6">INCENDIOS</Badge>
           <h1 className="font-heading text-6xl md:text-7xl font-bold text-khaki-white tracking-[0.04em] mb-8 uppercase leading-none">
             Protocolo de entrada a estructuras en llamas
           </h1>
           <p className="text-xl text-muted-dark leading-relaxed mb-8 max-w-2xl mx-auto">
             Análisis táctico sobre la lectura del humo, gestión de puertas y patrones de ataque agresivo en incendios compartimentados.
           </p>
           
           {/* Author bar */}
           <div className="inline-flex items-center gap-6 p-4 rounded-[4px] border border-tactical-border bg-olive-dark">
             <div className="text-left border-r border-tactical-border/50 pr-6">
                <span className="block text-alert-red font-body text-[10px] uppercase tracking-widest font-bold mb-1">Autor</span>
                <span className="text-khaki-white font-heading tracking-widest text-lg">CAP. A. MORA</span>
             </div>
             <div className="text-left border-r border-tactical-border/50 pr-6">
                <span className="block text-muted-dark font-body text-[10px] uppercase tracking-widest font-medium mb-1">Fecha</span>
                <span className="text-khaki-white text-sm">15 MAY 2026</span>
             </div>
             <div className="text-left">
                <span className="block text-muted-dark font-body text-[10px] uppercase tracking-widest font-medium mb-1">Tiempo</span>
                <span className="text-khaki-white text-sm">6 MIN LECTURA</span>
             </div>
           </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-tactical-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="prose prose-invert prose-lg prose-p:text-muted-dark prose-p:leading-relaxed prose-headings:font-heading prose-headings:uppercase prose-headings:text-khaki-white prose-a:text-alert-red prose-strong:text-khaki-white max-w-none">
            
            <p>La toma de decisiones en los primeros 60 segundos de llegada a un incendio estructural dictamina el éxito o fracaso táctico de toda la operación. Como bomberos, nuestra primera línea de defensa antes de ingresar es la correcta lectura de los indicadores de dinámica del fuego: Volumen, Velocidad, Densidad y Color (VVDC) del humo.</p>

            <h2>LA GESTIÓN DE LA PUERTA (DOOR CONTROL)</h2>
            <p>Históricamente, los equipos de primera respuesta irrumpían en las estructuras asumiendo que el rápido acceso garantizaría un rescate veloz. La ciencia estructural moderna nos ha enseñado que un incendio dictado por la ventilación (vent-limited) reaccionará violentamente ante la introducción súbita de oxígeno.</p>
            <p>El control de la puerta principal no es una sugerencia técnica; es un <strong>protocolo de supervivencia</strong>. Forzar la entrada y dejar la puerta abierta sin tener la línea presurizada y lista para fogueo (penciling) puede desencadenar un flashover inminente, atrapando a los equipos internos.</p>

            {/* Pull Quote */}
            <div className="my-12 px-8 py-6 border-l-4 border-alert-red bg-olive-dark">
              <p className="font-body italic text-2xl text-khaki-white leading-relaxed m-0">
                "No hay valentía en el desconocimiento táctico. Un bombero agresivo debe ser un bombero calculador. La puerta es la válvula de oxígeno del monstruo; nosotros decidimos cuándo respira."
              </p>
            </div>

            <h2>ANÁLISIS DE LA NEUTRAL ZONE</h2>
            <p>Al abrir la estructura, el plano neutro (neutral plane) —la separación visible entre la capa térmica superior y el aire más frío inferior— es un indicador vital. Un plano neutro muy bajo y turbulento indica condiciones inestables de acumulación térmica. En este punto, el enfriamiento de los gases superiores (gas cooling) con chorros cortos y sólidos (straight stream) es obligatorio antes del avance.</p>

            <h2>CONCLUSIÓN OPERATIVA</h2>
            <p>El entrenamiento sistemático bajo condiciones simuladas de alta carga térmica es la única forma de engranar estas respuestas cognitivas. En <strong>TAKTIS</strong>, instruimos a brigadas y bomberos no solo a apagar el fuego, sino a dominar el entorno hostil a través de la disciplina táctica.</p>
          </article>

          <div className="py-12 border-t border-tactical-border/50 mt-16 text-center">
             <RankStripe className="mx-auto mb-6" />
             <h3 className="font-heading text-3xl font-bold text-khaki-white mb-6 uppercase tracking-wider">¿QUIERES CAPACITARTE EN ESTE TEMA?</h3>
             <Link to="/cursos/incendios-estructurales">
                <Button className="py-4 px-10 text-lg">VER CURSO: EXTINCIÓN ESTRUCTURAL</Button>
             </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
