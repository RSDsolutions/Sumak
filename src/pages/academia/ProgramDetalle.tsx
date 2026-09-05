import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, Loader2, Lock, PlayCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { academyAPI } from '../../lib/academy';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useSEO } from '../../lib/seo';

interface CourseItem { course_id: string; title: string; is_required: boolean; status: string; progress_percentage: number; is_locked?: boolean }
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
  const firstUncompleted = sortedCourses.find(c => {
    const detail = courseProgress.find((cp) => cp.course_id === c.course?.id);
    return !detail?.is_locked && detail?.status !== 'completed';
  });

  return (
    <div className="min-h-screen bg-[#F4F7F5] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link to="/academia/programas" className="inline-flex items-center gap-2 text-sm font-bold text-[#1A4E26] mb-6 hover:underline">
          <ArrowLeft size={16} /> Todos los programas
        </Link>
        <div className="bg-white rounded-[32px] border border-[#C8D8CB] overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-[#1A4E26] to-[#0d2a13] px-6 sm:px-12 py-16 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 translate-x-1/3 -translate-y-1/3">
              <GraduationCap size={300} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-[#D7E9DF] mb-6">
                <GraduationCap size={32} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black mt-4 leading-tight">{program.title}</h1>
              <p className="text-white/80 mt-4 max-w-2xl text-lg leading-relaxed">{program.description || 'Ruta formativa Academy.'}</p>
            </div>
          </div>
          <div className="p-6 sm:p-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-8 border-b border-[#E5ECE6]">
              <div>
                <h2 className="text-2xl font-black text-[#111111] mb-2">Roadmap del Programa</h2>
                <p className="text-sm text-[#6B7280]">{sortedCourses.length} cursos · {program.completion_percentage_required}% requerido para certificación</p>
                {user && courseProgress.length > 0 && <p className="text-sm font-bold text-[#1A4E26] mt-2 bg-[#EAFBF1] inline-block px-3 py-1 rounded-full">En curso</p>}
              </div>
              {!enrolled ? (
                <button type="button" onClick={() => void enroll()} disabled={enrolling} className="px-8 py-4 rounded-xl bg-[#D4AF37] text-[#0B2913] font-black hover:bg-[#C5A02E] hover:scale-105 transition-all shadow-lg active:scale-95">
                  {enrolling ? 'Inscribiendo...' : user ? 'Inscribirme al programa' : 'Iniciar sesión para inscribirme'}
                </button>
              ) : (
                firstUncompleted && (
                  <Link to={`/academia/aprender/${firstUncompleted.course?.slug}`} className="px-8 py-4 rounded-xl bg-[#1A4E26] text-white font-black hover:bg-[#133A1C] hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <PlayCircle size={20} /> Continuar ruta
                  </Link>
                )
              )}
            </div>
            
            <div className="space-y-4">
              {sortedCourses.map((item, index) => {
                const detail = courseProgress.find((course) => course.course_id === item.course?.id);
                const isLocked = detail?.is_locked ?? false;
                
                return (
                  <div key={item.course?.id || index} className={`relative flex items-center gap-4 border-2 rounded-[24px] p-5 transition-all ${isLocked ? 'border-slate-100 bg-slate-50 opacity-75' : detail?.status === 'completed' ? 'border-[#1A4E26] bg-[#F4F7F5]' : 'border-[#E5ECE6] bg-white hover:border-[#1A4E26] hover:shadow-md'}`}>
                    
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${isLocked ? 'bg-slate-200 text-slate-400' : detail?.status === 'completed' ? 'bg-[#1A4E26] text-white' : 'bg-[#EBF4ED] text-[#1A4E26]'}`}>
                      {isLocked ? <Lock size={20} /> : detail?.status === 'completed' ? <CheckCircle2 size={24} /> : index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {isLocked || !enrolled ? (
                        <h3 className={`font-bold text-lg truncate ${isLocked ? 'text-slate-500' : 'text-[#111111]'}`}>{item.course?.title || 'Curso'}</h3>
                      ) : (
                        <Link to={`/academia/aprender/${item.course?.slug}`} className="font-bold text-lg text-[#111111] hover:text-[#1A4E26] truncate block">{item.course?.title || 'Curso'}</Link>
                      )}
                      
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.is_required ? 'bg-[#FFF9EA] text-[#B8860B]' : 'bg-slate-100 text-slate-600'}`}>
                          {item.is_required ? 'Obligatorio' : 'Opcional'}
                        </span>
                        {item.course?.estimated_duration_minutes && (
                          <span className="text-xs font-medium text-[#6B7280]">
                            {item.course.estimated_duration_minutes} min
                          </span>
                        )}
                        {isLocked && <span className="text-xs font-bold text-red-500">Bloqueado por prerrequisitos</span>}
                      </div>
                      
                      {detail && detail.status !== 'not_enrolled' && !isLocked && (
                        <div className="flex items-center gap-4 mt-4">
                          <div className="h-2 bg-[#E5ECE6] rounded-full flex-1 max-w-[200px] overflow-hidden">
                            <div className="h-full bg-[#1A4E26] rounded-full transition-all" style={{ width: `${detail.progress_percentage}%` }} />
                          </div>
                          <span className="text-xs font-bold text-[#1A4E26]">{detail.progress_percentage}%</span>
                        </div>
                      )}
                    </div>
                    
                    {!isLocked && enrolled && detail?.status !== 'completed' && (
                      <Link to={`/academia/aprender/${item.course?.slug}`} className="w-10 h-10 rounded-full bg-white border border-[#E5ECE6] text-[#1A4E26] flex items-center justify-center hover:bg-[#1A4E26] hover:text-white transition-colors flex-shrink-0 shadow-sm">
                        <PlayCircle size={20} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}