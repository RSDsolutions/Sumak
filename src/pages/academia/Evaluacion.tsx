import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import { callEdgeFunction } from '../../lib/supabase';

export default function Evaluacion() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function load() {
      if (!assessmentId) return;
      try {
        const data = await academyAPI.getAssessment(assessmentId);
        setAssessment(data);
      } catch (err) {
        console.error("Error loading assessment:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [assessmentId]);

  const handleStartAttempt = async () => {
    if (!assessmentId) return;
    try {
      setIsSubmitting(true);
      const id = await academyAPI.startAttempt(assessmentId);
      setAttemptId(id);
      
      // Initialize answers object
      const initialAnswers: Record<string, string[]> = {};
      assessment.questions.forEach((q: any) => {
        initialAnswers[q.id] = [];
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error("Error starting attempt:", err);
      alert("Hubo un error al iniciar la evaluación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (isMultiple) {
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter(id => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    
    // Check if all questions are answered
    const unanswered = assessment.questions.filter((q: any) => !answers[q.id] || answers[q.id].length === 0);
    if (unanswered.length > 0) {
      const confirm = window.confirm(`Faltan ${unanswered.length} preguntas por responder. ¿Estás seguro de enviar la evaluación?`);
      if (!confirm) return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save answers to DB
      const formattedAnswers = Object.entries(answers).map(([qId, opts]) => ({
        question_id: qId,
        selected_option_ids: opts
      }));
      await academyAPI.saveAnswers(attemptId, formattedAnswers);
      
      // 2. Call Edge Function to grade
      const result = await callEdgeFunction('academy-grade-assessment', { attempt_id: attemptId });
      setResult(result);
      
      // We don't navigate immediately, show the result screen
    } catch (err) {
      console.error("Error grading:", err);
      alert("Hubo un error al calificar la evaluación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F4F7F5]">
        <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F4F7F5]">
        <h2 className="text-2xl font-bold text-[#111111]">Evaluación no encontrada</h2>
        <Link to="/academia/dashboard" className="mt-4 text-[#1A4E26] hover:underline">Volver a Mi Academia</Link>
      </div>
    );
  }

  // Result view
  if (result) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result.passed ? 'bg-[#EBF4ED] text-[#1A4E26]' : 'bg-red-50 text-red-500'}`}>
            {result.passed ? <CheckCircle size={40} /> : <AlertTriangle size={40} />}
          </div>
          
          <h2 className="text-3xl font-black text-[#111111] mb-2">
            {result.passed ? '¡Felicidades!' : 'Sigue Intentándolo'}
          </h2>
          <p className="text-[#6B7280] mb-8">
            Has {result.passed ? 'aprobado' : 'reprobado'} la evaluación "{assessment.title}".
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm font-bold text-[#6B7280]">Tu Calificación</p>
              <p className={`text-3xl font-black ${result.passed ? 'text-[#1A4E26]' : 'text-red-500'}`}>
                {Math.round(result.percentage)}%
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm font-bold text-[#6B7280]">Puntaje Mínimo</p>
              <p className="text-3xl font-black text-[#111111]">
                {assessment.passing_score}%
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Link 
              to="/academia/dashboard"
              className="w-full py-4 bg-[#1A4E26] text-white font-bold rounded-xl hover:bg-[#163F1E] transition-colors"
            >
              Volver a Mi Academia
            </Link>
            {!result.passed && (
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-white border-2 border-[#1A4E26] text-[#1A4E26] font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Reintentar Evaluación
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pre-attempt view
  if (!attemptId) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 text-center border border-[#C8D8CB]">
          <div className="w-16 h-16 bg-[#EBF4ED] rounded-full flex items-center justify-center mx-auto mb-6">
            <PlayCircle className="text-[#1A4E26]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#111111] mb-2">{assessment.title}</h1>
          <p className="text-[#6B7280] mb-8">{assessment.description}</p>
          
          <div className="flex justify-center gap-8 mb-8 text-sm">
            <div>
              <p className="text-[#6B7280] font-medium">Preguntas</p>
              <p className="font-bold text-[#111111] text-lg">{assessment.questions?.length || 0}</p>
            </div>
            <div>
              <p className="text-[#6B7280] font-medium">Aprobación</p>
              <p className="font-bold text-[#111111] text-lg">{assessment.passing_score}%</p>
            </div>
            {assessment.time_limit_minutes && (
              <div>
                <p className="text-[#6B7280] font-medium">Tiempo Límite</p>
                <p className="font-bold text-[#111111] text-lg">{assessment.time_limit_minutes} min</p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleStartAttempt}
            disabled={isSubmitting}
            className="w-full py-4 bg-[#D4AF37] text-[#0B2913] font-black rounded-xl hover:bg-[#F3D568] transition-colors shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Iniciando...' : 'Comenzar Evaluación'}
          </button>
          
          <button onClick={() => navigate(-1)} className="mt-4 text-sm font-medium text-[#6B7280] hover:text-[#111111]">
            Cancelar y volver
          </button>
        </div>
      </div>
    );
  }

  // Active attempt view
  const questions = assessment.questions || [];

  return (
    <div className="min-h-screen bg-[#F4F7F5] pb-24">
      <div className="bg-white border-b border-[#C8D8CB] sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-[#6B7280] hover:text-[#111111]">
              <ChevronLeft size={24} />
            </button>
            <h1 className="font-bold text-[#111111] truncate">{assessment.title}</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-[#1A4E26] text-white font-bold rounded-lg hover:bg-[#163F1E] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Respuestas'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {questions.map((q: any, index: number) => {
          const isMultiple = q.question_type === 'multiple_choice_multiple';
          const selectedOpts = answers[q.id] || [];
          
          return (
            <div key={q.id} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#C8D8CB]">
              <div className="flex gap-4 items-start mb-6">
                <div className="w-8 h-8 rounded-full bg-[#EBF4ED] text-[#1A4E26] font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#111111]">{q.question_text}</h3>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {isMultiple ? 'Selecciona todas las que apliquen.' : 'Selecciona una respuesta.'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 pl-12">
                {q.options?.map((opt: any) => {
                  const isSelected = selectedOpts.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(q.id, opt.id, isMultiple)}
                      className={`
                        w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3
                        ${isSelected 
                          ? 'border-[#1A4E26] bg-[#EBF4ED]' 
                          : 'border-slate-200 hover:border-[#C8D8CB] bg-white'}
                      `}
                    >
                      <div className={`
                        w-5 h-5 flex items-center justify-center shrink-0
                        ${isMultiple ? 'rounded' : 'rounded-full'}
                        ${isSelected ? 'bg-[#1A4E26] border-[#1A4E26]' : 'border-2 border-slate-300'}
                      `}>
                        {isSelected && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <span className={`font-medium ${isSelected ? 'text-[#1A4E26]' : 'text-[#4B5563]'}`}>
                        {opt.option_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
