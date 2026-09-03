import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, Loader2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { academyAPI } from '../../lib/academy';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useSEO } from '../../lib/seo';

interface CourseItem { course_id: string; title: string; is_required: boolean; status: string; progress_percentage: number }
interface Program { id: string; title: string; description: string | null; completion_percentage_required: number; diploma_type_id: string | null; courses: { sort_order: number; is_required: boolean; course: { id: string; title: string; slug: string; estimated_duration_minutes: number | null } | null }[] }

export default function ProgramDetalle() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  useSEO({ title: program ? `${program.title} — Academia Sumak` : 'Programa — Academia Sumak' });

  useEffect(() => {
    async function load() {
      try {
        if (!slug) return;
        const next = await academyAPI.getProgramBySlug(slug) as Program;
        setProgram(next);
        if (user) {
          const progress = await academyAPI.getMyProgramProgress(next.id) as { courses?: CourseItem[] };
          setCourseProgress(progress.courses ?? []);
        }
      } catch { toast.error('No se pudo cargar el programa.'); }
      finally { setLoading(false); }
    }
    void load();
  }, [slug, user]);

  async function enroll() {
    if (!program || !user) { navigate('/academia/login'); return; }
    setEnrolling(true);
    try { await academyAPI.enrollInProgram(program.id); const progress = await academyAPI.getMyProgramProgress(program.id) as { courses?: CourseItem[] }; setCourseProgress(progress.courses ?? []); toast.success('Te inscribiste al programa.'); }
    catch { toast.error('No se pudo completar la inscripción.'); }
    finally { setEnrolling(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F4F7F5]"><Loader2 className="animate-spin text-[#1A4E26]" /></div>;
  if (!program) return <div className="min-h-screen bg-[#F4F7F5] p-12 text-center"><h1 className="text-2xl font-bold">Programa no encontrado</h1><Link to="/academia/programas" className="inline-flex mt-4 text-[#1A4E26] font-bold">Volver a programas</Link></div>;

  const sortedCourses = [...(program.courses ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const enrolled = courseProgress.some((item) => item.status !== 'not_enrolled');
  return <div className="min-h-screen bg-[#F4F7F5] py-12"><div className="max-w-4xl mx-auto px-4 sm:px-6"><Link to="/academia/programas" className="inline-flex items-center gap-2 text-sm font-bold text-[#1A4E26] mb-6"><ArrowLeft size={16} /> Todos los programas</Link><div className="bg-white rounded-2xl border border-[#C8D8CB] overflow-hidden"><div className="bg-[#1A4E26] px-6 sm:px-10 py-12 text-white"><GraduationCap className="text-[#D4AF37]" size={48} /><h1 className="text-3xl sm:text-4xl font-black mt-4">{program.title}</h1><p className="text-white/75 mt-3 max-w-2xl">{program.description || 'Ruta formativa Academy.'}</p></div><div className="p-6 sm:p-10"><div className="flex flex-wrap items-center justify-between gap-4 mb-8"><div><p className="text-sm text-[#6B7280]">{sortedCourses.length} cursos · {program.completion_percentage_required}% requerido</p>{user && courseProgress.length > 0 && <p className="text-sm font-bold text-[#1A4E26] mt-1">Progreso calculado por cursos completados</p>}</div>{!enrolled && <button type="button" onClick={() => void enroll()} disabled={enrolling} className="px-5 py-3 rounded-xl bg-[#D4AF37] text-[#0B2913] font-black">{enrolling ? 'Inscribiendo...' : user ? 'Inscribirme al programa' : 'Iniciar sesión para inscribirme'}</button>}</div><div className="space-y-3">{sortedCourses.map((item, index) => { const detail = courseProgress.find((course) => course.course_id === item.course?.id); return <div key={item.course?.id || index} className="flex items-center gap-3 border border-[#E5ECE6] rounded-xl p-4"><div className="h-9 w-9 rounded-full bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center font-bold">{index + 1}</div><div className="flex-1"><Link to={`/academia/cursos/${item.course?.slug}`} className="font-bold text-[#111111] hover:text-[#1A4E26]">{item.course?.title || 'Curso'}</Link><p className="text-xs text-[#6B7280] mt-1">{item.is_required ? 'Curso obligatorio' : 'Curso opcional'}{item.course?.estimated_duration_minutes ? ` · ${item.course.estimated_duration_minutes} min` : ''}</p>{detail && detail.status !== 'not_enrolled' && <div className="h-1.5 bg-[#E5ECE6] rounded-full mt-2 max-w-xs"><div className="h-full bg-[#1A4E26] rounded-full" style={{ width: `${detail.progress_percentage}%` }} /></div>}</div>{detail?.status === 'completed' ? <CheckCircle2 className="text-[#1A4E26]" size={20} /> : <span className="text-xs text-[#6B7280]">{detail?.status === 'not_enrolled' ? 'Pendiente' : `${detail?.progress_percentage ?? 0}%`}</span>}</div>; })}</div></div></div></div></div>;
}