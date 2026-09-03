import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, Layers } from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import { useAuth } from '../../lib/auth';
import { useSEO } from '../../lib/seo';
import { Link } from 'react-router-dom';

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

  return (
    <div className="min-h-screen bg-[#F4F7F5] py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#1A4E26] bg-[#EBF4ED] border border-[#C8D8CB] px-3 py-1.5 rounded-full"><GraduationCap size={16} /> Rutas formativas</div>
          <h1 className="text-4xl font-black text-[#111111] mt-4">Programas Academy</h1>
          <p className="text-[#6B7280] mt-3">Avanza por recorridos de cursos diseñados para construir habilidades paso a paso.</p>
        </div>
        {loading ? <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center text-[#6B7280]">Cargando programas...</div> : error ? <div className="bg-white rounded-2xl border border-red-200 p-12 text-center text-red-600">No se pudieron cargar los programas.</div> : programs.length === 0 ? <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center"><Layers size={40} className="mx-auto text-[#1A4E26] mb-4" /><h2 className="text-xl font-bold">Aún no hay programas publicados</h2><p className="text-[#6B7280] mt-2">Las rutas aparecerán aquí cuando estén disponibles.</p></div> : <div className="grid md:grid-cols-2 gap-6">{programs.map((program) => {
          const programProgress = progress[program.id];
          const courses = [...(program.courses || [])].sort((a, b) => a.sort_order - b.sort_order);
          return <article key={program.id} className="bg-white rounded-2xl border border-[#C8D8CB] overflow-hidden shadow-sm"><div className="h-36 bg-[#1A4E26] flex items-center justify-center"><GraduationCap size={56} className="text-[#D4AF37]" /></div><div className="p-6"><h2 className="text-2xl font-black text-[#111111]">{program.title}</h2><p className="text-sm text-[#6B7280] mt-2">{program.description || 'Programa formativo Academy.'}</p>{user && <div className="mt-5"><div className="flex justify-between text-xs font-bold text-[#6B7280]"><span>Tu progreso</span><span>{programProgress?.percentage ?? 0}%</span></div><div className="h-2 bg-[#E5ECE6] rounded-full mt-2 overflow-hidden"><div className="h-full bg-[#1A4E26] rounded-full" style={{ width: `${programProgress?.percentage ?? 0}%` }} /></div>{programProgress?.eligible && <p className="text-xs font-bold text-[#1A4E26] mt-2">Requisitos de cursos completados</p>}</div>}<div className="mt-5 space-y-2">{courses.map((item) => <div key={item.course?.id || item.sort_order} className="flex items-center gap-2 text-sm"><BookOpen size={15} className="text-[#1A4E26]" /><span className="flex-1">{item.course?.title || 'Curso'}</span>{item.is_required && <span className="text-xs text-[#92680A]">Obligatorio</span>}</div>)}</div><p className="text-xs text-[#6B7280] mt-5">{courses.length} cursos · {program.completion_percentage_required}% de cumplimiento requerido</p></div></article>;
        })}</div>}
      </div>
    </div>
  );
}
