import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, Layers, ArrowRight } from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import { useAuth } from '../../lib/auth';
import { useSEO } from '../../lib/seo';
import { Link, useLocation } from 'react-router-dom';

interface ProgramCourse {
  sort_order: number;
  is_required: boolean;
  course: { id: string; title: string; slug: string; estimated_duration_minutes: number | null } | null;
}

interface Program {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  completion_percentage_required: number;
  courses: ProgramCourse[];
}

interface ProgramProgress {
  percentage: number;
  eligible: boolean;
}

export default function Programas() {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/academia/dashboard');

  const [programs, setPrograms] = useState<Program[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgramProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useSEO({ title: 'Programas — Academia Sumak', description: 'Rutas formativas de la Academia SUMAK.' });

  useEffect(() => {
    async function load() {
      try {
        const nextPrograms = await academyAPI.getPrograms() as Program[];
        setPrograms(nextPrograms);
        if (user) {
          const entries = await Promise.all(nextPrograms.map(async (program) => [program.id, await academyAPI.getMyProgramProgress(program.id)] as const));
          setProgress(Object.fromEntries(entries) as Record<string, ProgramProgress>);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user]);

  const content = (
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#1A4E26] bg-[#EBF4ED] border border-[#C8D8CB] px-3 py-1.5 rounded-full mb-3">
          <GraduationCap size={15} /> Rutas Formativas
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#111111]">Programas Academy</h1>
        <p className="text-[#6B7280] mt-2 text-sm sm:text-base">
          Avanza por recorridos de cursos organizados para certificar tus habilidades paso a paso.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center text-[#6B7280]">
          Cargando programas...
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-12 text-center text-red-600">
          No se pudieron cargar los programas.
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center">
          <Layers size={40} className="mx-auto text-[#1A4E26] mb-4" />
          <h2 className="text-xl font-bold text-[#111111]">Aún no hay programas publicados</h2>
          <p className="text-[#6B7280] mt-2">Las rutas aparecerán aquí cuando estén disponibles.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {programs.map((program) => {
            const programProgress = progress[program.id];
            const courses = [...(program.courses || [])].sort((a, b) => a.sort_order - b.sort_order);
            const targetUrl = isDashboard
              ? `/academia/dashboard/programas/${program.slug}`
              : `/academia/programas/${program.slug}`;

            return (
              <article
                key={program.id}
                className="bg-white rounded-2xl border border-[#C8D8CB] overflow-hidden shadow-xs hover:border-[#1A4E26] hover:shadow-md transition-all flex flex-col"
              >
                <div className="h-36 bg-[#1A4E26] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#12361A] to-transparent opacity-60" />
                  <GraduationCap size={56} className="text-[#D4AF37] relative z-10" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#111111] leading-snug">{program.title}</h2>
                    <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                      {program.description || 'Programa formativo oficial de la Academia SUMAK.'}
                    </p>

                    {user && (
                      <div className="mt-5 bg-[#F9FAF9] p-3 rounded-xl border border-[#E5ECE6]">
                        <div className="flex justify-between text-xs font-bold text-[#6B7280]">
                          <span>Tu progreso</span>
                          <span className="text-[#1A4E26] font-extrabold">{programProgress?.percentage ?? 0}%</span>
                        </div>
                        <div className="h-2 bg-[#E5ECE6] rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-[#1A4E26] rounded-full transition-all duration-500"
                            style={{ width: `${programProgress?.percentage ?? 0}%` }}
                          />
                        </div>
                        {programProgress?.eligible && (
                          <p className="text-xs font-bold text-[#1A4E26] mt-2">
                            ✓ Requisitos de cursos completados
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-5 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Cursos del programa:</p>
                      {courses.map((item) => (
                        <div
                          key={item.course?.id || item.sort_order}
                          className="flex items-center gap-2 text-sm text-[#374151]"
                        >
                          <BookOpen size={15} className="text-[#1A4E26] shrink-0" />
                          <span className="flex-1 truncate">{item.course?.title || 'Curso'}</span>
                          {item.is_required && (
                            <span className="text-[10px] font-bold text-[#92680A] bg-[#FEF3C7] px-2 py-0.5 rounded-md border border-[#FDE68A]">
                              Obligatorio
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E5ECE6] flex items-center justify-between gap-3">
                    <p className="text-xs text-[#6B7280]">
                      {courses.length} cursos · {program.completion_percentage_required}% requerido
                    </p>
                    <Link
                      to={targetUrl}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A4E26] hover:bg-[#153e1e] text-white font-bold text-xs transition-all duration-200 hover:shadow-md shrink-0"
                    >
                      Ver ruta <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isDashboard) {
    return <div className="space-y-8 pb-12">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] py-16 px-4 sm:px-6">
      {content}
    </div>
  );
}
