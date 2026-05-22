import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RankStripe } from '../components/ui/TacticalGraphics';

type LegalType = 'terms' | 'privacy';

interface LegalProps {
  type: LegalType;
}

const content = {
  terms: {
    eyebrow: 'Marco de servicio',
    title: 'Términos y Condiciones',
    intro: 'Estos términos explican cómo se gestionan las solicitudes, inscripciones, certificaciones y comunicaciones dentro de TAKTIS Training Institute.',
    sections: [
      {
        title: 'Inscripciones',
        text: 'Toda inscripción queda sujeta a verificación de datos, cupos disponibles y requisitos operativos del curso seleccionado. El equipo de admisiones confirmará fechas, modalidad y documentación necesaria por correo o WhatsApp.'
      },
      {
        title: 'Participación y seguridad',
        text: 'Los participantes deben cumplir las instrucciones del personal docente, usar el equipo solicitado y declarar cualquier condición médica relevante antes de iniciar actividades prácticas o de campo.'
      },
      {
        title: 'Certificación',
        text: 'La emisión de certificados depende de la asistencia mínima, evaluación teórica o práctica aplicable y cumplimiento de los estándares definidos para cada programa.'
      },
      {
        title: 'Cambios de agenda',
        text: 'TAKTIS puede reprogramar horarios, sedes o instructores cuando existan razones logísticas, climáticas o de seguridad operacional. En esos casos se notificará a los inscritos por los canales registrados.'
      }
    ]
  },
  privacy: {
    eyebrow: 'Protección de datos',
    title: 'Política de Privacidad',
    intro: 'Esta política resume el tratamiento de la información enviada por formularios, correos y canales de contacto de TAKTIS Training Institute.',
    sections: [
      {
        title: 'Datos que recopilamos',
        text: 'Podemos recibir nombre, institución, cargo, ciudad, teléfono, correo, curso de interés y notas adicionales que el usuario comparte voluntariamente para solicitar información o inscripción.'
      },
      {
        title: 'Uso de la información',
        text: 'Los datos se utilizan para responder solicitudes, coordinar admisiones, preparar propuestas institucionales, emitir certificados y mantener comunicación relacionada con programas de formación.'
      },
      {
        title: 'Confidencialidad',
        text: 'La información operacional o institucional compartida por participantes y entidades se maneja con reserva y solo se utiliza para los fines de capacitación y coordinación acordados.'
      },
      {
        title: 'Actualización o eliminación',
        text: 'El titular puede solicitar actualización, corrección o eliminación de sus datos escribiendo a info@taktis.edu.ec desde el correo registrado.'
      }
    ]
  }
} satisfies Record<LegalType, {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { title: string; text: string }[];
}>;

export default function Legal({ type }: LegalProps) {
  const page = content[type];

  return (
    <div className="flex flex-col min-h-screen bg-tactical-black">
      <section className="bg-tactical-black border-b border-tactical-border pt-12 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-alert-red uppercase tracking-widest font-heading text-sm mb-3">{page.eyebrow}</p>
          <h1 className="font-heading text-5xl font-bold text-khaki-white tracking-[0.04em] mb-4 uppercase">
            {page.title}
          </h1>
          <p className="text-muted-dark text-lg leading-relaxed max-w-3xl">{page.intro}</p>
        </div>
      </section>

      <section className="py-16 flex-grow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card accentColor="red" className="p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8">
              <ShieldCheck className="w-10 h-10 text-alert-red shrink-0" />
              <RankStripe />
            </div>

            <div className="space-y-8">
              {page.sections.map((section) => (
                <div key={section.title} className="border-b border-tactical-border/50 pb-8 last:border-b-0 last:pb-0">
                  <h2 className="font-heading text-2xl text-khaki-white uppercase mb-3">{section.title}</h2>
                  <p className="text-muted-dark leading-relaxed">{section.text}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/contacto">
              <Button>Solicitar aclaración</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
