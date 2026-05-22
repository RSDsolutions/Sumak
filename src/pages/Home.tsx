import React from 'react';
import { Shield, Flame, Anchor, Heart, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RankStripe, Crosshair } from '../components/ui/TacticalGraphics';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-tactical-black tactical-grid">
        <Crosshair className="absolute bottom-8 right-8 w-64 h-64 text-tactical-border opacity-[0.08]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <h1 className="font-heading text-6xl md:text-[80px] font-bold leading-none tracking-[0.04em] text-khaki-white mb-6">
                FORMAMOS A LOS QUE<br />
                PROTEGEN VIDAS.
              </h1>
              <RankStripe className="mb-8" />
              <p className="text-lg text-khaki-white max-w-xl leading-[1.75] mb-10">
                Capacitación táctica, rescate y operaciones contra incendios certificadas para cuerpos de seguridad y emergencia del Ecuador.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/cursos"><Button>Ver Cursos</Button></Link>
                <Link to="/contacto"><Button variant="outline">Contactar</Button></Link>
              </div>
            </div>
            
            <div className="lg:col-span-5">
              <Card className="p-8 h-full bg-olive-dark">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <Shield className="w-10 h-10 text-alert-red" strokeWidth={1.5} />
                    <div>
                      <h3 className="font-heading text-xl tracking-[0.03em] text-khaki-white">Seguridad Táctica</h3>
                      <div className="w-12 h-[1px] bg-alert-red mt-2"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Flame className="w-10 h-10 text-alert-red" strokeWidth={1.5} />
                    <div>
                      <h3 className="font-heading text-xl tracking-[0.03em] text-khaki-white">Contra Incendios</h3>
                      <div className="w-12 h-[1px] bg-alert-red mt-2"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Anchor className="w-10 h-10 text-field-green" strokeWidth={1.5} />
                    <div>
                      <h3 className="font-heading text-xl tracking-[0.03em] text-khaki-white">Rescate y Salvamento</h3>
                      <div className="w-12 h-[1px] bg-field-green mt-2"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-12 pt-6 border-t border-tactical-border/50">
                  <p className="font-medium text-[10px] tracking-[0.2em] text-muted-dark uppercase">
                    Autorizado y certificado en Ecuador
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-olive-dark border-y border-tactical-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-tactical-border/50 border-x border-tactical-border/50">
            <div className="py-12 px-6 text-center">
              <div className="font-heading font-bold text-[56px] text-alert-red leading-none mb-2">500+</div>
              <div className="text-muted-dark text-sm uppercase tracking-widest font-medium">Operativos Capacitados</div>
            </div>
            <div className="py-12 px-6 text-center">
              <div className="font-heading font-bold text-[56px] text-alert-red leading-none mb-2">12+</div>
              <div className="text-muted-dark text-sm uppercase tracking-widest font-medium">Cursos Activos</div>
            </div>
            <div className="py-12 px-6 text-center">
              <div className="font-heading font-bold text-[56px] text-field-green leading-none mb-2">8</div>
              <div className="text-muted-dark text-sm uppercase tracking-widest font-medium">Años de Operación</div>
            </div>
            <div className="py-12 px-6 text-center">
              <div className="font-heading font-bold text-[56px] text-field-green leading-none mb-2">100%</div>
              <div className="text-muted-dark text-sm uppercase tracking-widest font-medium">Certificación Oficial</div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Categories */}
      <section className="py-24 bg-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RankStripe className="mb-6" />
          <h2 className="font-heading text-4xl md:text-[50px] font-semibold tracking-[0.03em] text-khaki-white mb-16">
            ÁREAS DE FORMACIÓN
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card accentColor="red" className="p-10 group">
              <Shield className="w-12 h-12 text-alert-red mb-6" strokeWidth={1} />
              <h3 className="font-heading text-3xl mb-4 text-khaki-white">Seguridad Táctica</h3>
              <p className="text-khaki-white font-medium mb-3">Para: Policías · Militares · Guardias de seguridad.</p>
              <p className="text-muted-dark leading-relaxed">Intervención, control de crisis y operaciones de alto riesgo bajo protocolos internacionales.</p>
            </Card>
            
            <Card accentColor="green" className="p-10 group">
              <Anchor className="w-12 h-12 text-field-green mb-6" strokeWidth={1} />
              <h3 className="font-heading text-3xl mb-4 text-khaki-white">Rescate y Salvamento</h3>
              <p className="text-khaki-white font-medium mb-3">Para: Bomberos · Policías · Cruz Roja.</p>
              <p className="text-muted-dark leading-relaxed">Operaciones en espacios confinados, alturas y medios acuáticos con equipo especializado.</p>
            </Card>

            <Card accentColor="red" className="p-10 group">
              <Flame className="w-12 h-12 text-alert-red mb-6" strokeWidth={1} />
              <h3 className="font-heading text-3xl mb-4 text-khaki-white">Operaciones Contra Incendios</h3>
              <p className="text-khaki-white font-medium mb-3">Para: Bomberos · Brigadas industriales.</p>
              <p className="text-muted-dark leading-relaxed">Supresión de incendios estructurales y forestales con tácticas ofensivas y defensivas.</p>
            </Card>

            <Card accentColor="amber" className="p-10 group">
              <Heart className="w-12 h-12 text-amber mb-6" strokeWidth={1} />
              <h3 className="font-heading text-3xl mb-4 text-khaki-white">Primeros Auxilios Avanzados</h3>
              <p className="text-khaki-white font-medium mb-3">Para: Todo cuerpo de emergencia.</p>
              <p className="text-muted-dark leading-relaxed">Atención prehospitalaria en situaciones de combate y emergencias masivas.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-24 bg-light-bg text-tactical-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RankStripe className="mb-6" />
          <h2 className="font-heading text-4xl md:text-[50px] font-semibold tracking-[0.03em] mb-16">
            POR QUÉ ELEGIRNOS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <Shield className="w-10 h-10 text-alert-red mb-6" strokeWidth={1.5} />
              <h3 className="font-heading text-[28px] mb-4">Instructores Operativos</h3>
              <p className="text-muted-light leading-relaxed">
                Nuestros formadores son profesionales en activo o retirados de las FFAA, Policía Nacional y Cuerpo de Bomberos del Ecuador.
              </p>
            </div>
            <div>
              <Heart className="w-10 h-10 text-alert-red mb-6" strokeWidth={1.5} />
              <h3 className="font-heading text-[28px] mb-4">Certificación Reconocida</h3>
              <p className="text-muted-light leading-relaxed">
                Todos nuestros cursos emiten certificados con validez institucional, respaldados por organismos de control del Ecuador.
              </p>
            </div>
            <div>
              <Anchor className="w-10 h-10 text-alert-red mb-6" strokeWidth={1.5} />
              <h3 className="font-heading text-[28px] mb-4">Entrenamiento Real</h3>
              <p className="text-muted-light leading-relaxed">
                Simulaciones en campo, ejercicios prácticos y escenarios reales. No solo teoría — preparación operativa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Bar */}
      <section className="py-16 bg-light-bg border-t border-tactical-border/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
             <h3 className="font-heading text-2xl tracking-[0.03em] text-tactical-black">FORMAMOS PERSONAL DE</h3>
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

      {/* CTA */}
      <section className="py-32 bg-tactical-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <h1 className="font-heading text-5xl md:text-[70px] font-bold text-khaki-white tracking-[0.04em] mb-8">
            ¿LISTO PARA EL SIGUIENTE NIVEL?
          </h1>
          <RankStripe className="mb-8 rotate-90" />
          <p className="text-xl text-khaki-white mb-12">
            Inscríbete en el curso que tu unidad necesita. Formación real para situaciones reales.
          </p>
          <Link to="/contacto">
            <Button className="text-lg py-5 px-12">INSCRIBIRSE AHORA</Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
