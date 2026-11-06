import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight,
  CheckCircle, 
  Circle, 
  PlayCircle, 
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Trophy,
  XCircle,
  Bookmark,
  Share2,
  Heart,
  MessageSquare,
  Send,
  Download,
  Star,
  Search,
  BookOpen,
  Award,
  Sparkles,
  Check,
  Menu,
  X,
  Clock,
  ThumbsUp,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { academyAPI } from '../../lib/academy';
import type { AcademyCourse, AcademyModule, AcademyLesson, AcademyProgress } from '../../lib/academy-types';

// Tipos para el sistema de discusión / comentarios
interface CommentReply {
  id: string;
  author: string;
  avatar?: string;
  role?: 'student' | 'teacher';
  timeAgo: string;
  text: string;
  likes: number;
  isLiked?: boolean;
}

interface CommentThread {
  id: string;
  author: string;
  avatar?: string;
  role?: 'student' | 'teacher';
  timeAgo: string;
  text: string;
  likes: number;
  isLiked?: boolean;
  replies: CommentReply[];
}

const DEFAULT_COMMENTS: CommentThread[] = [
  {
    id: 'c-1',
    author: 'Mateo Morales',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    role: 'student',
    timeAgo: 'hace 1 día',
    text: '¿Podrías explicar cuándo conviene priorizar esta metodología en una sesión en vivo frente a una sesión asíncrona?',
    likes: 3,
    replies: [
      {
        id: 'c-1-r1',
        author: 'Prof. Carlos Mendoza',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        role: 'teacher',
        timeAgo: 'hace 1 día',
        text: '¡Excelente pregunta Mateo! En vivo se aprovecha al máximo el feedback inmediato y la resolución de dudas en tiempo real, mientras que la lección grabada sirve como base teórica y consulta continua.',
        likes: 5,
        isLiked: false
      },
      {
        id: 'c-1-r2',
        author: 'Mateo Morales',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        role: 'student',
        timeAgo: 'hace 18 horas',
        text: '¡Muchísimas gracias por la respuesta, me queda sumamente claro!',
        likes: 1,
        isLiked: false
      }
    ]
  },
  {
    id: 'c-2',
    author: 'Valentina Paredes',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    role: 'student',
    timeAgo: 'hace 2 días',
    text: 'Los recursos descargables de este módulo están sumamente explicados. Recomiendo revisar la guía antes de rendir la evaluación del módulo.',
    likes: 4,
    replies: []
  }
];

export default function VisorLeccion() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [progress, setProgress] = useState<AcademyProgress[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [assessmentAttempts, setAssessmentAttempts] = useState<any[]>([]);
  
  const [currentLesson, setCurrentLesson] = useState<AcademyLesson | null>(null);
  const [currentModule, setCurrentModule] = useState<AcademyModule | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Estados visuales del nuevo diseño (estilo SkillWave)
  const [activeTab, setActiveTab] = useState<'transcript' | 'documents' | 'comments' | 'test' | 'reviews'>('comments');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState<CommentThread[]>(DEFAULT_COMMENTS);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [lessonResources, setLessonResources] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      try {
        const c = await academyAPI.getCourseBySlug(slug);
        setCourse(c);
        if (c) {
          const [m, p, asmnts] = await Promise.all([
            academyAPI.getCourseModules(c.id),
            academyAPI.getMyProgress(c.id),
            academyAPI.getAdminAssessmentsForTree(c.id).catch(() => []),
          ]);
          setModules(m);
          setProgress(p);
          setAssessments(asmnts);
          
          if (asmnts.length > 0) {
            academyAPI.getMyAttemptsForCourse(c.id)
              .then(attempts => setAssessmentAttempts(attempts))
              .catch(() => {});
          }
          
          if (m.length > 0 && m[0].lessons && m[0].lessons.length > 0) {
            const sortedProgress = [...p].sort((a,b) => 
              new Date(b.last_accessed_at || b.started_at || 0).getTime() - 
              new Date(a.last_accessed_at || a.started_at || 0).getTime()
            );
            
            let initialLesson = m[0].lessons[0];
            let initialModule = m[0];
            
            if (sortedProgress.length > 0) {
              const lastId = sortedProgress[0].lesson_id;
              for (const mod of m) {
                const found = mod.lessons?.find(l => l.id === lastId);
                if (found) {
                  initialLesson = found;
                  initialModule = mod;
                  break;
                }
              }
            }
            setCurrentLesson(initialLesson);
            setCurrentModule(initialModule);
            setExpandedModules(new Set(m.map(mod => mod.id))); // Expandir módulos por defecto para exploración ágil
            
            // Cargar recursos de la lección
            academyAPI.getAdminLessonResources(initialLesson.id)
              .then(res => setLessonResources(res || []))
              .catch(() => setLessonResources([]));

            const existingP = p.find(prog => prog.lesson_id === initialLesson.id);
            if (!existingP || existingP.status === 'not_started') {
               academyAPI.updateProgress(initialLesson.id, c.id, 'in_progress', 0).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Error cargando visor de lección:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // Al cambiar de lección, cargar recursos específicos
  useEffect(() => {
    if (currentLesson) {
      academyAPI.getAdminLessonResources(currentLesson.id)
        .then(res => setLessonResources(res || []))
        .catch(() => setLessonResources([]));
    }
  }, [currentLesson?.id]);

  const toggleModule = (id: string) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedModules(newSet);
  };

  const handleSelectLesson = async (lesson: AcademyLesson, module: AcademyModule) => {
    setCurrentLesson(lesson);
    setCurrentModule(module);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    
    if (course) {
      const existingP = progress.find(p => p.lesson_id === lesson.id);
      if (!existingP || existingP.status === 'not_started') {
         try {
           const newP = await academyAPI.updateProgress(lesson.id, course.id, 'in_progress', 0);
           setProgress(prev => [...prev.filter(p => p.lesson_id !== lesson.id), newP as AcademyProgress]);
         } catch(e) {}
      }
    }
  };

  const markAsComplete = async () => {
    if (!currentLesson || !course || isUpdatingProgress) return;
    
    setIsUpdatingProgress(true);
    try {
      const newP = await academyAPI.updateProgress(currentLesson.id, course.id, 'completed', 100);
      setProgress(prev => [...prev.filter(p => p.lesson_id !== currentLesson.id), newP as AcademyProgress]);
      await academyAPI.issueCourseCertificate(course.id).catch(() => undefined);
      
      // Auto-avance a la siguiente lección
      let foundCurrent = false;
      let nextLesson = null;
      let nextModule = null;
      
      for (const m of modules) {
        if (!m.lessons) continue;
        for (const l of m.lessons) {
          if (foundCurrent) {
            nextLesson = l;
            nextModule = m;
            break;
          }
          if (l.id === currentLesson.id) {
            foundCurrent = true;
          }
        }
        if (nextLesson) break;
      }
      
      if (nextLesson && nextModule) {
        handleSelectLesson(nextLesson, nextModule);
        if (!expandedModules.has(nextModule.id)) {
          toggleModule(nextModule.id);
        }
      }
      
    } catch (err) {
      console.error("Error al marcar como completado:", err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Manejo de comentarios interactivos
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const authorName = profile?.nombre_completo || profile?.email || 'Tú';

    const newComment: CommentThread = {
      id: `c-${Date.now()}`,
      author: authorName,
      avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      role: 'student',
      timeAgo: 'Justo ahora',
      text: newCommentText.trim(),
      likes: 0,
      isLiked: false,
      replies: []
    };

    setComments([newComment, ...comments]);
    setNewCommentText('');
  };

  const handleAddReply = (threadId: string) => {
    if (!replyText.trim()) return;

    const authorName = profile?.nombre_completo || profile?.email || 'Tú';

    const newReply: CommentReply = {
      id: `r-${Date.now()}`,
      author: authorName,
      avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      role: 'student',
      timeAgo: 'Justo ahora',
      text: replyText.trim(),
      likes: 0,
      isLiked: false
    };

    setComments(prev => prev.map(t => {
      if (t.id === threadId) {
        return { ...t, replies: [...t.replies, newReply] };
      }
      return t;
    }));

    setReplyText('');
    setReplyingToId(null);
  };

  const handleToggleLike = (threadId: string, replyId?: string) => {
    setComments(prev => prev.map(t => {
      if (!replyId && t.id === threadId) {
        const isLiked = !t.isLiked;
        return {
          ...t,
          isLiked,
          likes: isLiked ? t.likes + 1 : Math.max(0, t.likes - 1)
        };
      }
      if (replyId && t.id === threadId) {
        return {
          ...t,
          replies: t.replies.map(r => {
            if (r.id === replyId) {
              const isLiked = !r.isLiked;
              return {
                ...r,
                isLiked,
                likes: isLiked ? r.likes + 1 : Math.max(0, r.likes - 1)
              };
            }
            return r;
          })
        };
      }
      return t;
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-600">Cargando lección académica...</p>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8FAFC] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#1A4E26] flex items-center justify-center mb-4">
          <BookOpen size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">No se encontró el contenido</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-sm">No pudimos localizar la lección o el curso seleccionado.</p>
        <Link to="/academia/dashboard/cursos" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white text-sm font-bold shadow-sm hover:bg-[#0F2E18] transition-colors">
          <ChevronLeft size={16} /> Volver a Mis Cursos
        </Link>
      </div>
    );
  }

  // Progreso general
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = progress.filter(p => p.status === 'completed').length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const currentProgress = progress.find(p => p.lesson_id === currentLesson.id);
  const isCompleted = currentProgress?.status === 'completed';

  // Lecciones previas y siguientes
  const allLessonsWithModules = modules.flatMap(m => (m.lessons || []).map(l => ({ lesson: l, module: m })));
  const currentIdx = allLessonsWithModules.findIndex(x => x.lesson.id === currentLesson.id);
  const prevLessonObj = currentIdx > 0 ? allLessonsWithModules[currentIdx - 1] : null;
  const nextLessonObj = currentIdx >= 0 && currentIdx < allLessonsWithModules.length - 1 ? allLessonsWithModules[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* 1. Header superior minimalista institucional (Estilo barra de navegación SkillWave) */}
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Alternar índice de módulos"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/academia/dashboard/cursos" className="flex items-center gap-2.5 group">
            <img 
              src="/LOGO_SUMAK.png" 
              alt="SUMAK" 
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105" 
            />
            <span className="text-[10px] font-extrabold text-[#1A4E26] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
              Academia
            </span>
          </Link>
        </div>

        {/* Buscador central decorativo */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="w-full relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="Explorar conceptos y lecciones del curso..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200/90 rounded-full text-slate-600 placeholder:text-slate-400 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Acciones derechas */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-600">
            <Link to="/academia/dashboard/cursos" className="hover:text-[#1A4E26] transition-colors">
              Mis Cursos
            </Link>
            <Link to="/academia/cursos" className="hover:text-[#1A4E26] transition-colors">
              Catálogo
            </Link>
            <Link to="/academia/dashboard/diplomas" className="hover:text-[#1A4E26] transition-colors">
              Mis Diplomas
            </Link>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Avatar del usuario */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1A4E26] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {profile?.nombre_completo ? profile.nombre_completo[0].toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Cuerpo en 2 columnas: Módulos a la izquierda + Reproductor y tabs a la derecha */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Backdrop móvil */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-2xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* COLUMNA IZQUIERDA: Módulos del curso (Estilo SkillWave)              */}
        {/* ------------------------------------------------------------------- */}
        <aside className={`
          fixed inset-y-16 left-0 z-40 w-80 sm:w-84 lg:w-88 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:static lg:inset-auto lg:h-[calc(100vh-4rem)] lg:shrink-0
        `}>
          {/* Cabecera del Sidebar: Título del curso y Barra de progreso */}
          <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="font-bold text-base sm:text-lg text-slate-900 leading-snug tracking-tight">
                {course.title}
              </h2>
              <button 
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                title={isBookmarked ? 'Guardado en favoritos' : 'Guardar curso'}
              >
                <Bookmark size={16} className={isBookmarked ? 'fill-amber-500' : ''} />
              </button>
            </div>

            {/* Barra de Progreso con porcentaje destacado */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-800 shrink-0">
                {progressPct}%
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
              {completedLessons} de {totalLessons} lecciones completadas
            </p>
          </div>

          {/* Acordeón de Módulos y Lecciones */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {modules.map((mod, modIdx) => {
              const isExpanded = expandedModules.has(mod.id);
              const lessons = mod.lessons || [];
              const modCompleted = lessons.length > 0 && lessons.every(l => {
                const p = progress.find(pr => pr.lesson_id === l.id);
                return p?.status === 'completed';
              });

              return (
                <div key={mod.id} className="bg-white">
                  {/* Encabezado del Módulo (Limpio estilo SkillWave) */}
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="flex-1 pr-3">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-slate-900 line-clamp-1">
                        Módulo {modIdx + 1}: {mod.title}
                      </h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400 group-hover:text-slate-700 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-700 shrink-0" />
                    )}
                  </button>

                  {/* Lista de Lecciones del Módulo */}
                  {isExpanded && (
                    <div className="pb-2 space-y-0.5">
                      {lessons.map((lesson) => {
                        const isCurrent = lesson.id === currentLesson?.id;
                        const p = progress.find(pr => pr.lesson_id === lesson.id);
                        const isDone = p?.status === 'completed';

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => handleSelectLesson(lesson, mod)}
                            className={`
                              w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all
                              ${isCurrent 
                                ? 'bg-[#EBF5EE] text-[#12361B] font-bold shadow-2xs' 
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}
                            `}
                          >
                            {/* Ícono de estado estilo SkillWave (círculo fucsia/esmeralda con check) */}
                            <div className="shrink-0 flex items-center justify-center">
                              {isDone ? (
                                <div className="w-4 h-4 rounded-full bg-[#1A4E26] text-white flex items-center justify-center shadow-2xs">
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              ) : isCurrent ? (
                                <div className="w-4 h-4 rounded-full border-2 border-[#1A4E26] flex items-center justify-center bg-white">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#1A4E26]" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                              )}
                            </div>

                            {/* Título de la lección limpio sin etiquetas residuales */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-[13px] truncate">
                                {lesson.title}
                              </p>
                            </div>
                          </button>
                        );
                      })}

                      {/* Evaluaciones del módulo */}
                      {assessments.filter(a => a.module_id === mod.id && a.is_published).map(a => {
                        const bestAttempt = assessmentAttempts
                          .filter(att => att.assessment_id === a.id)
                          .sort((x: any, y: any) => (y.percentage ?? 0) - (x.percentage ?? 0))[0];
                        const isPassed = bestAttempt?.passed === true;

                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => navigate(`/academia/evaluacion/${a.id}`)}
                            className="w-full flex items-center gap-3 px-5 py-2 text-left hover:bg-amber-50/70 transition-colors text-amber-900 group"
                          >
                            <Trophy size={14} className={isPassed ? 'text-emerald-600' : 'text-amber-500'} />
                            <span className="text-xs font-semibold truncate flex-1">
                              {a.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Examen Final */}
            {assessments.filter(a => (!a.module_id || a.is_final_exam) && a.is_published).map(a => {
              const bestAttempt = assessmentAttempts
                .filter(att => att.assessment_id === a.id)
                .sort((x: any, y: any) => (y.percentage ?? 0) - (x.percentage ?? 0))[0];
              const isPassed = bestAttempt?.passed === true;

              return (
                <div key={a.id} className="p-4 bg-emerald-50/40">
                  <button
                    type="button"
                    onClick={() => navigate(`/academia/evaluacion/${a.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 shadow-2xs transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trophy size={18} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          Examen Final de Certificación
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {isPassed ? '✓ Aprobado con éxito' : 'Acredita tu diploma'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ------------------------------------------------------------------- */}
        {/* COLUMNA DERECHA: Video, Controles y Pestañas Segmentadas           */}
        {/* ------------------------------------------------------------------- */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
            
            {/* Breadcrumbs de navegación */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link to="/academia/dashboard/cursos" className="hover:text-slate-900 transition-colors">
                Cursos
              </Link>
              <span>›</span>
              <span className="text-slate-600 truncate max-w-[200px]">
                {course.category?.name || 'Academia'}
              </span>
              <span>›</span>
              <span className="text-slate-900 font-bold truncate">
                {course.title}
              </span>
            </div>

            {/* Contenedor del Reproductor de Video */}
            <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md bg-black border border-slate-200/80 aspect-video relative flex items-center justify-center">
              {currentLesson.content_type === 'video' ? (
                currentLesson.video_provider === 'youtube' && currentLesson.video_external_id ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${currentLesson.video_external_id}?autoplay=0&rel=0`}
                    title={currentLesson.title}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="text-white text-center p-6">
                    <PlayCircle size={52} className="mx-auto mb-2 text-emerald-400/80" />
                    <p className="text-sm font-semibold">Video en preparación para esta lección</p>
                    <p className="text-xs text-white/60 mt-1">El material multimedia se está optimizando en el servidor.</p>
                  </div>
                )
              ) : currentLesson.content_type === 'pdf' ? (
                (() => {
                  const resolvedUrl = currentLesson.external_url || academyAPI.getPublicImageUrl(currentLesson.file_url) || '';
                  let embedUrl = resolvedUrl;
                  if (embedUrl.includes('drive.google.com')) {
                    embedUrl = embedUrl.replace('/view', '/preview');
                  } else if (embedUrl.startsWith('http') && !embedUrl.includes('docs.google.com/viewer')) {
                    embedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(embedUrl)}&embedded=true`;
                  }

                  return (
                    <div className="w-full h-full relative group bg-white">
                      <iframe 
                        src={embedUrl} 
                        className="w-full h-full border-0"
                        title={currentLesson.title}
                      />
                      {resolvedUrl && (
                        <div className="absolute top-4 right-4 z-10">
                          <a 
                            href={resolvedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A4E26] text-white text-xs font-bold rounded-lg shadow hover:bg-[#0F2E18] transition-colors"
                          >
                            <Download size={14} /> Descargar PDF
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-white text-center p-6">
                  <FileText size={48} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-semibold">Lección de lectura y conceptos clave</p>
                </div>
              )}
            </div>

            {/* Barra de Acciones debajo del video (Bookmarks + Navegación Prev/Next + Completar) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              
              {/* Botón Bookmarks con ícono amarillo */}
              <button
                type="button"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                  isBookmarked 
                    ? 'text-amber-800 bg-amber-100/90' 
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/90 hover:bg-slate-50'
                }`}
              >
                <Bookmark size={15} className="text-amber-500 fill-amber-500" />
                <span>{isBookmarked ? 'Guardado en favoritos' : 'Bookmarks'}</span>
              </button>

              {/* Controles de avance: Anterior / Siguiente y Marcar completado */}
              <div className="flex items-center gap-2">
                {prevLessonObj && (
                  <button
                    type="button"
                    onClick={() => handleSelectLesson(prevLessonObj.lesson, prevLessonObj.module)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    <span>Anterior</span>
                  </button>
                )}

                {nextLessonObj && (
                  <button
                    type="button"
                    onClick={() => handleSelectLesson(nextLessonObj.lesson, nextLessonObj.module)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 transition-colors"
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={markAsComplete}
                  disabled={isCompleted || isUpdatingProgress}
                  className={`
                    inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs
                    ${isCompleted 
                      ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 cursor-default' 
                      : 'bg-[#1A4E26] hover:bg-[#0F2E18] text-white'}
                  `}
                >
                  <CheckCircle size={15} />
                  <span>{isUpdatingProgress ? 'Guardando...' : isCompleted ? 'Completado' : 'Marcar Completado'}</span>
                </button>
              </div>
            </div>

            {/* --------------------------------------------------------------- */}
            {/* 3. Pestañas Segmentadas (Estilo SkillWave: Transcript/Docs/Comments/Test/Reviews) */}
            {/* --------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              
              {/* Barra segmentada */}
              <div className="grid grid-cols-5 border-b border-slate-200/90 text-xs sm:text-sm font-semibold select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('transcript')}
                  className={`py-3 px-2 text-center transition-colors ${
                    activeTab === 'transcript'
                      ? 'bg-[#1A4E26] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-r border-slate-200/90'
                  }`}
                >
                  Transcripción
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`py-3 px-2 text-center transition-colors ${
                    activeTab === 'documents'
                      ? 'bg-[#1A4E26] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-r border-slate-200/90'
                  }`}
                >
                  Documentos
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className={`py-3 px-2 text-center transition-colors ${
                    activeTab === 'comments'
                      ? 'bg-[#1A4E26] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-r border-slate-200/90'
                  }`}
                >
                  Comentarios
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('test')}
                  className={`py-3 px-2 text-center transition-colors ${
                    activeTab === 'test'
                      ? 'bg-[#1A4E26] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-r border-slate-200/90'
                  }`}
                >
                  Test
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`py-3 px-2 text-center transition-colors ${
                    activeTab === 'reviews'
                      ? 'bg-[#1A4E26] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Reseñas
                </button>
              </div>

              {/* Contenido de cada pestaña */}
              <div className="p-5 sm:p-7">

                {/* PESTAÑA 1: COMENTARIOS (Exacto a la captura de referencia) */}
                {activeTab === 'comments' && (
                  <div className="space-y-6">
                    
                    {/* Caja de nuevo comentario con avatar */}
                    <form onSubmit={handleAddComment} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1A4E26] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                        {profile?.nombre_completo ? profile.nombre_completo[0].toUpperCase() : 'T'}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Escribe un comentario o duda sobre la lección..."
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1A4E26] bg-slate-50/50"
                        />
                        <button
                          type="submit"
                          disabled={!newCommentText.trim()}
                          className="px-4 py-2.5 rounded-xl bg-[#1A4E26] hover:bg-[#0F2E18] disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition-colors shrink-0 shadow-2xs flex items-center gap-1.5"
                        >
                          <Send size={14} />
                          <span className="hidden sm:inline">Comentar</span>
                        </button>
                      </div>
                    </form>

                    {/* Hilos de comentarios */}
                    <div className="space-y-5 pt-2">
                      {comments.map((thread) => (
                        <div key={thread.id} className="space-y-3">
                          
                          {/* Comentario principal */}
                          <div className="flex items-start gap-3">
                            <img
                              src={thread.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                              alt={thread.author}
                              className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                  {thread.author}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {thread.timeAgo}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                                {thread.text}
                              </p>

                              {/* Acciones del comentario */}
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLike(thread.id)}
                                  className={`inline-flex items-center gap-1 transition-colors ${
                                    thread.isLiked ? 'text-rose-600 font-bold' : 'hover:text-slate-800'
                                  }`}
                                >
                                  <Heart size={14} className={thread.isLiked ? 'fill-rose-600 text-rose-600' : ''} />
                                  <span>{thread.likes}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setReplyingToId(replyingToId === thread.id ? null : thread.id)}
                                  className="hover:text-slate-800 transition-colors"
                                >
                                  Responder
                                </button>

                                {thread.replies.length > 0 && (
                                  <span className="text-slate-400">
                                    {thread.replies.length} {thread.replies.length === 1 ? 'respuesta' : 'respuestas'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Respuestas anidadas (Estilo badge teacher en screenshot) */}
                          {thread.replies.length > 0 && (
                            <div className="pl-12 space-y-3 pt-1 border-l-2 border-slate-100 ml-4">
                              {thread.replies.map((reply) => (
                                <div key={reply.id} className="flex items-start gap-3">
                                  <img
                                    src={reply.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'}
                                    alt={reply.author}
                                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs sm:text-sm text-slate-900">
                                        {reply.author}
                                      </span>
                                      {reply.role === 'teacher' && (
                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.2 rounded-full">
                                          Docente
                                        </span>
                                      )}
                                      <span className="text-[11px] text-slate-400">
                                        {reply.timeAgo}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                                      {reply.text}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 font-medium">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleLike(thread.id, reply.id)}
                                        className={`inline-flex items-center gap-1 transition-colors ${
                                          reply.isLiked ? 'text-rose-600 font-bold' : 'hover:text-slate-800'
                                        }`}
                                      >
                                        <Heart size={13} className={reply.isLiked ? 'fill-rose-600 text-rose-600' : ''} />
                                        <span>{reply.likes}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Campo para responder */}
                          {replyingToId === thread.id && (
                            <div className="pl-12 pt-2 flex gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Responder a ${thread.author}...`}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1A4E26] bg-slate-50"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddReply(thread.id)}
                                disabled={!replyText.trim()}
                                className="px-3 py-1.5 rounded-lg bg-[#1A4E26] hover:bg-[#0F2E18] disabled:opacity-40 text-white font-bold text-xs transition-colors"
                              >
                                Enviar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PESTAÑA 2: DOCUMENTOS */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Material descargable y recursos de apoyo
                    </h3>
                    
                    {lessonResources.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lessonResources.map((res, rIdx) => (
                          <div 
                            key={res.id || rIdx}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100/80 text-[#1A4E26] flex items-center justify-center shrink-0">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {res.title || res.file_name}
                                </p>
                                <span className="text-[11px] text-slate-500">
                                  {res.file_type ? res.file_type.toUpperCase() : 'PDF'} • Descargable
                                </span>
                              </div>
                            </div>
                            <a
                              href={res.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-[#1A4E26] hover:text-white transition-colors text-slate-700 shrink-0"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100/80 text-[#1A4E26] flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-slate-900">
                                Guía de conceptos clave — {currentLesson.title}
                              </p>
                              <span className="text-[11px] text-slate-500">Documento oficial PDF • 2.4 MB</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#0F2E18] transition-colors"
                          >
                            <Download size={14} /> Imprimir / Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 3: TRANSCRIPCIÓN / DESCRIPCIÓN */}
                {activeTab === 'transcript' && (
                  <div className="space-y-4">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Transcripción y notas de la lección
                    </h3>
                    
                    {currentLesson.description && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {currentLesson.description}
                      </p>
                    )}

                    {currentLesson.text_content ? (
                      <div 
                        className="prose prose-sm prose-emerald max-w-none text-slate-700 pt-2"
                        dangerouslySetInnerHTML={{ __html: currentLesson.text_content }}
                      />
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500">
                        Esta lección está optimizada para formato audiovisual. Utiliza los marcadores y la sección de comentarios para formular consultas al equipo docente.
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 4: TEST / EVALUACIÓN */}
                {activeTab === 'test' && (
                  <div className="space-y-4">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Pruebas y Evaluaciones del Curso
                    </h3>

                    {assessments.length > 0 ? (
                      <div className="space-y-3">
                        {assessments.map((a) => {
                          const bestAttempt = assessmentAttempts
                            .filter(att => att.assessment_id === a.id)
                            .sort((x: any, y: any) => (y.percentage ?? 0) - (x.percentage ?? 0))[0];
                          const isPassed = bestAttempt?.passed === true;

                          return (
                            <div 
                              key={a.id} 
                              className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                  <Trophy size={20} />
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                                    {a.title}
                                  </p>
                                  <span className="text-[11px] text-slate-500">
                                    {isPassed 
                                      ? `✓ Aprobada con ${Math.round(bestAttempt.percentage)}%` 
                                      : 'Requiere 80% mínimo para aprobar'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/academia/evaluacion/${a.id}`)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                  isPassed 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-[#1A4E26] hover:bg-[#0F2E18] text-white'
                                }`}
                              >
                                {isPassed ? 'Repetir test' : 'Iniciar test'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-500">
                        No hay evaluaciones asignadas a este módulo. Continúa avanzando hacia el examen final del curso.
                      </p>
                    )}
                  </div>
                )}

                {/* PESTAÑA 5: RESEÑAS */}
                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50/60 border border-amber-200/60">
                      <div className="text-center">
                        <span className="text-3xl font-extrabold text-amber-900">4.9</span>
                        <div className="flex items-center gap-0.5 justify-center mt-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={14} className="text-amber-500 fill-amber-500" />
                          ))}
                        </div>
                        <span className="text-[11px] text-amber-800 font-medium mt-0.5 block">Valoración global</span>
                      </div>
                      <div className="border-l border-amber-200 pl-4 text-xs text-amber-900 leading-relaxed">
                        <p className="font-bold">Alta satisfacción estudiantil</p>
                        <p className="text-amber-800/80 mt-0.5">El 98% de los alumnos recomendaría este programa formativo a su red de contactos.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </main>
      </div>

    </div>
  );
}