import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  CheckCircle, 
  Circle, 
  PlayCircle, 
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Trophy,
  XCircle
} from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import type { AcademyCourse, AcademyModule, AcademyLesson, AcademyProgress } from '../../lib/academy-types';

export default function VisorLeccion() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
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
          // Load attempts for evaluations
          if (asmnts.length > 0) {
            academyAPI.getMyAttemptsForCourse(c.id)
              .then(attempts => setAssessmentAttempts(attempts))
              .catch(() => {});
          }
          
          if (m.length > 0 && m[0].lessons && m[0].lessons.length > 0) {
            // Find last accessed lesson or just the first one
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
            setExpandedModules(new Set([initialModule.id]));
            
            // Mark as started if not already
            const existingP = p.find(prog => prog.lesson_id === initialLesson.id);
            if (!existingP || existingP.status === 'not_started') {
               academyAPI.updateProgress(initialLesson.id, c.id, 'in_progress', 0).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Error loading lesson visor:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [slug]);

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
      
      // Try to auto-advance
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
      console.error("Error marking complete", err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F4F7F5]">
        <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F4F7F5]">
        <h2 className="text-2xl font-bold text-[#111111]">No se encontró el contenido</h2>
        <Link to="/academia/dashboard" className="mt-4 text-[#1A4E26] hover:underline">Volver a Mi Academia</Link>
      </div>
    );
  }

  // Calculate global progress
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = progress.filter(p => p.status === 'completed').length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const currentProgress = progress.find(p => p.lesson_id === currentLesson.id);
  const isCompleted = currentProgress?.status === 'completed';

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      
      {/* Sidebar Overlay (Mobile) */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed bottom-4 right-4 z-50 lg:hidden w-12 h-12 bg-[#1A4E26] text-white rounded-full shadow-xl flex items-center justify-center"
        >
          <FileText size={20} />
        </button>
      )}

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-[#F4F7F5] border-r border-[#C8D8CB] flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:relative lg:flex-shrink-0
      `}>
        {/* Header */}
        <div className="p-4 border-b border-[#C8D8CB] bg-white">
          <Link to="/academia/dashboard" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#111111] mb-4">
            <ChevronLeft size={16} /> Volver
          </Link>
          <h2 className="font-bold text-[#111111] text-lg leading-tight mb-2 line-clamp-2">
            {course.title}
          </h2>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#6B7280]">{progressPct}% completado</span>
              <span className="font-medium text-[#1A4E26]">{completedLessons}/{totalLessons}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div 
                className="bg-[#1A4E26] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {modules.map((mod, index) => {
            const isExpanded = expandedModules.has(mod.id);
            const lessons = mod.lessons || [];
            
            return (
              <div key={mod.id} className="border-b border-[#C8D8CB]">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex-1 pr-4">
                    <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                      Módulo {index + 1}
                    </p>
                    <h3 className="text-sm font-bold text-[#111111] line-clamp-2">
                      {mod.title}
                    </h3>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-[#6B7280]" /> : <ChevronDown size={16} className="text-[#6B7280]" />}
                </button>
                
                {isExpanded && (
                  <div className="bg-white">
                    {lessons.map((lesson, lIdx) => {
                      const isCurrent = lesson.id === currentLesson?.id;
                      const p = progress.find(pr => pr.lesson_id === lesson.id);
                      const isDone = p?.status === 'completed';
                      
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson, mod)}
                          className={`
                            w-full flex items-start gap-3 p-3 pl-4 sm:pl-6 text-left transition-colors
                            ${isCurrent ? 'bg-[#EBF4ED] border-l-4 border-[#1A4E26]' : 'border-l-4 border-transparent hover:bg-slate-50'}
                          `}
                        >
                          <div className="mt-0.5 text-[#1A4E26]">
                            {isDone ? (
                              <CheckCircle size={16} className="text-[#1A4E26] fill-white" />
                            ) : isCurrent ? (
                              <PlayCircle size={16} />
                            ) : (
                              <Circle size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm ${isCurrent ? 'font-bold text-[#1A4E26]' : 'text-[#4B5563]'}`}>
                              {index + 1}.{lIdx + 1} {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {lesson.content_type === 'video' && <PlayCircle size={12} className="text-slate-400" />}
                              {lesson.content_type === 'pdf' && <FileText size={12} className="text-slate-400" />}
                              <span className="text-[10px] text-slate-500">
                                {lesson.duration_seconds ? `${Math.floor(lesson.duration_seconds/60)} min` : lesson.content_type}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {/* Module assessments */}
                    {assessments.filter(a => a.module_id === mod.id && a.is_published).map((a, ai) => {
                      const bestAttempt = assessmentAttempts
                        .filter(att => att.assessment_id === a.id)
                        .sort((x: any, y: any) => (y.percentage ?? 0) - (x.percentage ?? 0))[0];
                      const isPassed = bestAttempt?.passed === true;
                      const isFailed = bestAttempt && !bestAttempt.passed;
                      return (
                        <button
                          key={a.id}
                          onClick={() => navigate(`/academia/evaluacion/${a.id}`)}
                          className="w-full flex items-start gap-3 p-3 pl-4 sm:pl-6 text-left border-l-4 border-transparent hover:bg-amber-50 transition-colors group"
                        >
                          <div className="mt-0.5">
                            {isPassed
                              ? <Trophy size={16} className="text-[#1A4E26]" />
                              : isFailed
                                ? <XCircle size={16} className="text-red-400" />
                                : <ClipboardList size={16} className="text-amber-500" />}
                          </div>
                          <div>
                            <p className="text-sm text-amber-800 group-hover:text-amber-900 font-medium">
                              {a.title}
                            </p>
                            <span className="text-[10px] text-amber-600">
                              {isPassed ? '✓ Aprobada' : isFailed ? `${Math.round(bestAttempt.percentage)}% — No aprobada` : 'Prueba de módulo'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Final Exams */}
          {assessments.filter(a => (!a.module_id || a.is_final_exam) && a.is_published).map(a => {
            const bestAttempt = assessmentAttempts
              .filter(att => att.assessment_id === a.id)
              .sort((x: any, y: any) => (y.percentage ?? 0) - (x.percentage ?? 0))[0];
            const isPassed = bestAttempt?.passed === true;
            const isFailed = bestAttempt && !bestAttempt.passed;
            return (
              <div key={a.id} className="border-t-4 border-slate-200">
                <button
                  onClick={() => navigate(`/academia/evaluacion/${a.id}`)}
                  className="w-full flex items-center justify-between p-4 hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="flex-1 pr-4">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Trophy size={14} /> Examen Final
                    </p>
                    <h3 className="text-sm font-bold text-purple-900 line-clamp-2">
                      {a.title}
                    </h3>
                    <p className="text-xs text-purple-600 mt-0.5">
                      {isPassed ? '✓ Aprobado' : isFailed ? `${Math.round(bestAttempt.percentage)}% — No aprobado` : 'Pendiente'}
                    </p>
                  </div>
                  {isPassed ? <CheckCircle size={20} className="text-[#1A4E26]" /> : <ChevronLeft size={20} className="text-purple-300 group-hover:text-purple-500 rotate-180" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        <header className="h-16 flex items-center px-4 sm:px-8 border-b border-[#C8D8CB] shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mr-4 lg:hidden text-[#6B7280] hover:text-[#111111]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-[#111111] truncate">
            {currentLesson.title}
          </h1>
          
          <div className="ml-auto hidden sm:flex">
            <button
              onClick={markAsComplete}
              disabled={isCompleted || isUpdatingProgress}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
                ${isCompleted 
                  ? 'bg-slate-100 text-slate-500 cursor-default' 
                  : 'bg-[#1A4E26] text-white hover:bg-[#163F1E]'}
              `}
            >
              <CheckCircle size={16} />
              {isUpdatingProgress ? 'Guardando...' : isCompleted ? 'Completado' : 'Marcar como Completado'}
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="max-w-4xl mx-auto w-full p-4 sm:p-8">
            
            {/* Player Area */}
            <div className={`${currentLesson.content_type === 'video' ? 'bg-black' : 'bg-slate-100 border border-[#C8D8CB]'} w-full rounded-2xl overflow-hidden shadow-xl flex items-center justify-center mb-8 relative ${currentLesson.content_type === 'pdf' ? 'h-[750px]' : 'aspect-video'}`}>
              {currentLesson.content_type === 'video' ? (
                currentLesson.video_provider === 'youtube' && currentLesson.video_external_id ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${currentLesson.video_external_id}?autoplay=0&rel=0`}
                    title={currentLesson.title}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                ) : (
                  <div className="text-white text-center">
                    <PlayCircle size={48} className="mx-auto mb-2 opacity-50" />
                    <p>El reproductor de video se está configurando</p>
                  </div>
                )
              ) : currentLesson.content_type === 'pdf' ? (
                   <div className="w-full h-full relative group">
                      <iframe 
                        src={currentLesson.file_url || currentLesson.external_url || ''} 
                        className="w-full h-full border-0"
                        title={currentLesson.title}
                      />
                      {(currentLesson.file_url || currentLesson.external_url) ? (
                        <div className="absolute top-4 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <a 
                            href={currentLesson.file_url || currentLesson.external_url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black text-sm font-bold rounded-xl shadow-lg hover:bg-[#F3D568] transition-colors"
                          >
                            <FileText size={16} /> Abrir / Descargar PDF
                          </a>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-50">
                          <FileText size={48} className="mx-auto mb-4 opacity-50 text-slate-300" />
                          <p className="font-semibold">URL del PDF no disponible</p>
                        </div>
                      )}
                 </div>
              ) : (
                <div className="text-white">
                  Contenido no disponible
                </div>
              )}
            </div>

            {/* Mobile Mark Complete button */}
            <div className="sm:hidden mb-8">
              <button
                onClick={markAsComplete}
                disabled={isCompleted || isUpdatingProgress}
                className={`
                  w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm
                  ${isCompleted 
                    ? 'bg-slate-100 text-slate-500 cursor-default' 
                    : 'bg-[#1A4E26] text-white hover:bg-[#163F1E]'}
                `}
              >
                <CheckCircle size={18} />
                {isUpdatingProgress ? 'Guardando...' : isCompleted ? 'Lección Completada' : 'Marcar como Completada'}
              </button>
            </div>

            {/* Lesson Description */}
            {currentLesson.description && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#C8D8CB] mb-8">
                <h3 className="text-lg font-bold text-[#111111] mb-2">Descripción de la lección</h3>
                <p className="text-[#4B5563] leading-relaxed whitespace-pre-wrap">
                  {currentLesson.description}
                </p>
              </div>
            )}

            {/* Lesson Text Content */}
            {currentLesson.text_content && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#C8D8CB]">
                <div className="prose prose-emerald max-w-none text-[#4B5563]">
                  {/* Since we don't have a markdown parser yet, we just render pre-wrap text or basic HTML */}
                  <div dangerouslySetInnerHTML={{ __html: currentLesson.text_content }} />
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

    </div>
  );
}
