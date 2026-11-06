import { useEffect, useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Layers,
  ArrowRight,
  Sparkles,
  Leaf,
  Award,
  ShieldCheck,
  Clock,
} from 'lucide-react';
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

const PROGRAMAS_PASTEL_PALETTE = [
  {
    bg: 'from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]',
    title: 'text-[#12361B]',
    textMuted: 'text-[#2D5A37]',
    btn: 'bg-[#1A4E26] hover:bg-[#12361A] text-white',
    progressBg: 'bg-[#1A4E26]',
  },
  {
    bg: 'from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]',
    title: 'text-[#5B3407]',
    textMuted: 'text-[#7C4C18]',
    btn: 'bg-[#92400E] hover:bg-[#78350F] text-white',
    progressBg: 'bg-[#92400E]',
  },
  {
    bg: 'from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]',
    title: 'text-[#102D3E]',
    textMuted: 'text-[#2C526A]',
    btn: 'bg-[#1E3A5F] hover:bg-[#0F2232] text-white',
    progressBg: 'bg-[#1E3A5F]',
  },
  {
    bg: 'from-[#ECF6EE] via-[#DCEFDF] to-[#CDE7D2]',
    title: 'text-[#0D381E]',
    textMuted: 'text-[#1F542F]',
    btn: 'bg-[#1A4E26] hover:bg-[#12361A] text-white',
    progressBg: 'bg-[#1A4E26]',
  },
  {
    bg: 'from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2]',
    title: 'text-[#4D3A13]',
    textMuted: 'text-[#71541B]',
    btn: 'bg-[#71541B] hover:bg-[#523B0F] text-white',
    progressBg: 'bg-[#71541B]',
  },
];

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
        const nextPrograms = (await academyAPI.getPrograms()) as Program[];
        setPrograms(nextPrograms);
        if (user) {
          const entries = await Promise.all(
            nextPrograms.map(
              async (program) =>
                [program.id, await academyAPI.getMyProgramProgress(program.id)] as const
            )
          );
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

  return (
    <div className="w-full pb-16">
      {/* 1. Header / Banner Institucional — Fondo verde a todo el ancho horizontal sin contenedor */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Programas Academy
            </h1>

            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Avanza por recorridos de cursos organizados para certificar tus habilidades paso a paso en biomedicina y salud integrativa.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Explora{' '}
              <strong className="text-amber-300 font-bold">
                {programs.length} {programs.length === 1 ? 'ruta formativa disponible' : 'rutas formativas disponibles'}
              </strong>{' '}
              para impulsar tu formación profesional.
            </p>
          </div>

          {/* Floating 3D/Glass Badges */}
          <div className="hidden lg:block relative w-80 h-36 pointer-events-none select-none shrink-0">
            <div className="absolute top-0 left-6 w-11 h-11 rounded-2xl bg-amber-400/90 text-amber-950 flex items-center justify-center shadow-lg transform -rotate-6">
              <Sparkles size={20} />
            </div>
            <div className="absolute top-6 left-20 w-14 h-14 rounded-2xl bg-[#E8C94A] text-[#111111] flex items-center justify-center shadow-xl transform rotate-3">
              <BookOpen size={26} />
            </div>
            <div className="absolute top-1 right-20 w-10 h-10 rounded-xl bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 flex items-center justify-center shadow-md transform -rotate-12">
              <GraduationCap size={18} />
            </div>
            <div className="absolute top-0 right-6 w-11 h-11 rounded-2xl bg-teal-400/90 text-teal-950 flex items-center justify-center shadow-md transform rotate-6">
              <Leaf size={18} />
            </div>
            <div className="absolute bottom-1 left-28 w-16 h-16 rounded-3xl bg-white text-[#1A4E26] flex items-center justify-center shadow-2xl transform rotate-6 border border-white/40">
              <Award size={32} />
            </div>
            <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl bg-emerald-700/90 text-white flex items-center justify-center shadow-md transform -rotate-6">
              <ShieldCheck size={18} />
            </div>
            <div className="absolute bottom-2 right-10 w-11 h-11 rounded-2xl bg-[#D4AF37] text-amber-950 flex items-center justify-center shadow-lg transform rotate-12">
              <Clock size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Contenido centrado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {loading ? (
          <div className="bg-white/80 rounded-3xl p-12 text-center text-slate-500 shadow-xs border-0">
            Cargando programas...
          </div>
        ) : error ? (
          <div className="bg-white/80 rounded-3xl p-12 text-center text-red-600 shadow-xs border-0">
            No se pudieron cargar los programas.
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-white/80 rounded-3xl p-12 text-center shadow-xs border-0">
            <Layers size={40} className="mx-auto text-[#1A4E26] mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Aún no hay programas publicados</h2>
            <p className="text-slate-500 mt-2 text-sm">
              Las rutas formativas aparecerán aquí cuando estén disponibles.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {programs.map((program, idx) => {
              const programProgress = progress[program.id];
              const courses = [...(program.courses || [])].sort((a, b) => a.sort_order - b.sort_order);
              const targetUrl = isDashboard
                ? `/academia/dashboard/programas/${program.slug}`
                : `/academia/programas/${program.slug}`;
              const theme = PROGRAMAS_PASTEL_PALETTE[idx % PROGRAMAS_PASTEL_PALETTE.length];

              return (
                <article
                  key={program.id}
                  className={`bg-gradient-to-br ${theme.bg} rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col border-0`}
                >
                  <div className="h-44 bg-gradient-to-tr from-[#0F2E18] to-[#1A4E26] flex items-center justify-center relative overflow-hidden">
                    {program.cover_image_url ? (
                      <img
                        src={academyAPI.getPublicImageUrl(program.cover_image_url)}
                        alt={program.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80') {
                            target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                          }
                        }}
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#0F2E18] via-transparent to-[#2B6E3A]/40" />
                        <GraduationCap size={56} className="text-[#D4AF37] relative z-10 drop-shadow-md" />
                      </>
                    )}
                  </div>
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h2 className={`text-xl sm:text-2xl font-black ${theme.title} leading-snug`}>{program.title}</h2>
                        <p className={`text-sm ${theme.textMuted} mt-2 leading-relaxed line-clamp-3`}>
                          {program.description || 'Programa formativo oficial de la Academia SUMAK.'}
                        </p>
                      </div>

                      {user && (
                        <div className="bg-white/70 backdrop-blur-xs p-3.5 rounded-2xl border-0 shadow-xs">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>Tu progreso</span>
                            <span className="text-[#1A4E26] font-extrabold">{programProgress?.percentage ?? 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-200/80 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full ${theme.progressBg} rounded-full transition-all duration-500`}
                              style={{ width: `${programProgress?.percentage ?? 0}%` }}
                            />
                          </div>
                          {programProgress?.eligible && (
                            <p className="text-xs font-bold text-[#1A4E26] mt-2 flex items-center gap-1.5">
                              <ShieldCheck size={14} /> Requisitos de cursos completados
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className={`text-[11px] font-extrabold uppercase tracking-wider ${theme.textMuted}`}>Cursos del programa:</p>
                        <div className="space-y-1.5">
                          {courses.map((item) => (
                            <div
                              key={item.course?.id || item.sort_order}
                              className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800 bg-white/50 backdrop-blur-xs px-3 py-2 rounded-xl border-0"
                            >
                              <BookOpen size={15} className="text-[#1A4E26] shrink-0" />
                              <span className="flex-1 truncate font-medium">{item.course?.title || 'Curso'}</span>
                              {item.is_required && (
                                <span className="text-[10px] font-bold text-[#92680A] bg-[#FEF3C7] px-2 py-0.5 rounded-md border-0 shrink-0">
                                  Obligatorio
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-black/5 flex items-center justify-between gap-3">
                      <p className={`text-xs font-medium ${theme.textMuted}`}>
                        {courses.length} cursos · {program.completion_percentage_required}% requerido
                      </p>
                      <Link
                        to={targetUrl}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl ${theme.btn} font-bold text-xs transition-all duration-200 hover:shadow-md shrink-0 border-0`}
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
    </div>
  );
}
