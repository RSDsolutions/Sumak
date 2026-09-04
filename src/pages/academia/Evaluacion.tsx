import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, CheckCircle, AlertTriangle, PlayCircle, Clock,
  RefreshCw, BookOpen, Trophy, XCircle, Info
} from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import { callEdgeFunction } from '../../lib/supabase';

type AttemptRecord = {
  id: string;
  percentage: number;
  passed: boolean;
  started_at: string;
  graded_at: string | null;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Evaluacion() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<any>(null);
  const [pastAttempts, setPastAttempts] = useState<AttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<Date | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!assessmentId) return;
    try {
      const [data, attempts] = await Promise.all([
        academyAPI.getAssessment(assessmentId),
        academyAPI.getMyAttempts(assessmentId),
      ]);
      setAssessment(data);
      setPastAttempts(attempts as AttemptRecord[]);
    } catch (err) {
      console.error('Error loading assessment:', err);
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer: counts down from time_limit_minutes based on started_at
  useEffect(() => {
    if (!attemptId || !assessment?.time_limit_minutes || !attemptStartedAt) return;
    const totalSeconds = assessment.time_limit_minutes * 60;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - attemptStartedAt.getTime()) / 1000);
      const remaining = totalSeconds - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmit(true); // auto-submit when time is up
      } else {
        setTimeLeft(remaining);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [attemptId, assessment, attemptStartedAt]);

  const handleStartAttempt = async () => {
    if (!assessmentId) return;
    try {
      setIsSubmitting(true);
      const id = await academyAPI.startAttempt(assessmentId);
      const startTime = new Date();
      setAttemptId(id);
      setAttemptStartedAt(startTime);

      const initialAnswers: Record<string, string[]> = {};
      assessment.questions.forEach((q: any) => { initialAnswers[q.id] = []; });
      setAnswers(initialAnswers);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('P0003') || msg.includes('intentos')) {
        alert('Has alcanzado el límite de intentos para esta evaluación.');
      } else {
        console.error('Error starting attempt:', err);
        alert('No se pudo iniciar la evaluación. Intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (isMultiple) {
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter(id => id !== optionId)
            : [...current, optionId],
        };
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId) return;
    if (!autoSubmit) {
      const unanswered = assessment.questions.filter((q: any) => !answers[q.id] || answers[q.id].length === 0);
      if (unanswered.length > 0) {
        const ok = window.confirm(`Faltan ${unanswered.length} pregunta${unanswered.length !== 1 ? 's' : ''} por responder. ¿Deseas enviar de todas formas?`);
        if (!ok) return;
      }
    }

    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const formattedAnswers = Object.entries(answers).map(([qId, opts]) => ({
        question_id: qId,
        selected_option_ids: opts,
      }));
      await academyAPI.saveAnswers(attemptId, formattedAnswers);
      const res = await callEdgeFunction('academy-grade-assessment', { attempt_id: attemptId });
      setResult(res);
      // Reload attempt history
      const updatedAttempts = await academyAPI.getMyAttempts(assessmentId!);
      setPastAttempts(updatedAttempts as AttemptRecord[]);
    } catch (err) {
      console.error('Error grading:', err);
      alert('Hubo un error al calificar la evaluación. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAttemptId(null);
    setAttemptStartedAt(null);
    setAnswers({});
    setTimeLeft(null);
    if (timerRef.current) clearInterval(timerRef.current);
    // Reload assessment to get fresh data and updated attempt counts
    loadData();
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

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

  // ─── Result view ────────────────────────────────────────────────────────────

  if (result) {
    const attemptsUsed = pastAttempts.length;
    const attemptsRemaining = assessment.max_attempts
      ? Math.max(0, assessment.max_attempts - attemptsUsed)
      : null;
    const canRetry = attemptsRemaining === null ? true : attemptsRemaining > 0;

    return (
      <div className="min-h-screen bg-[#F4F7F5] pb-16">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">

          {/* Result card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className={`py-10 text-center ${result.passed ? 'bg-[#EBF4ED]' : 'bg-red-50'}`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4
                ${result.passed ? 'bg-[#1A4E26] text-white' : 'bg-red-100 text-red-500'}`}>
                {result.passed ? <Trophy size={40} /> : <XCircle size={40} />}
              </div>
              <h2 className="text-3xl font-black text-[#111111] mb-1">
                {result.passed ? '¡Aprobado!' : 'No aprobado'}
              </h2>
              <p className="text-slate-500 text-sm">{assessment.title}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Score grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 mb-1">Tu calificación</p>
                  <p className={`text-3xl font-black ${result.passed ? 'text-[#1A4E26]' : 'text-red-500'}`}>
                    {Math.round(result.percentage)}%
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 mb-1">Mínimo requerido</p>
                  <p className="text-3xl font-black text-[#111111]">{assessment.passing_score}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 mb-1">Puntos</p>
                  <p className="text-3xl font-black text-[#111111]">
                    {result.score ?? '–'}<span className="text-sm text-slate-400">/{result.max_score ?? '–'}</span>
                  </p>
                </div>
              </div>

              {/* Per-question feedback if available */}
              {result.question_results && result.question_results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-[#111] mb-2">Resultados por pregunta</p>
                  {result.question_results.map((qr: any, i: number) => {
                    const question = assessment.questions.find((q: any) => q.id === qr.question_id);
                    return (
                      <div key={qr.question_id}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-sm
                          ${qr.is_correct ? 'bg-[#F0FBF2] border-[#C8D8CB]' : 'bg-red-50 border-red-100'}`}>
                        <span className="shrink-0 mt-0.5">
                          {qr.is_correct
                            ? <CheckCircle size={16} className="text-[#1A4E26]" />
                            : <XCircle size={16} className="text-red-400" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#111] truncate">
                            {i + 1}. {question?.question_text ?? 'Pregunta'}
                          </p>
                          {question?.explanation && !qr.is_correct && (
                            <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                              <Info size={11} className="shrink-0 mt-0.5 text-blue-400" />
                              {question.explanation}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-bold text-slate-400">+{qr.points_earned ?? 0} pts</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Attempt history */}
              {pastAttempts.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-[#111] mb-2">
                    Historial de intentos{assessment.max_attempts ? ` (${attemptsUsed}/${assessment.max_attempts})` : ''}
                  </p>
                  <div className="space-y-1.5">
                    {pastAttempts.slice(0, 5).map((a, i) => (
                      <div key={a.id}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                        <span className="text-slate-500">Intento {pastAttempts.length - i}</span>
                        <span className={`font-bold ${a.passed ? 'text-[#1A4E26]' : 'text-red-500'}`}>
                          {Math.round(a.percentage)}%
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {a.passed ? 'Aprobado' : 'Reprobado'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {attemptsRemaining !== null && (
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      {attemptsRemaining > 0
                        ? `${attemptsRemaining} intento${attemptsRemaining !== 1 ? 's' : ''} restante${attemptsRemaining !== 1 ? 's' : ''}`
                        : 'Sin intentos restantes'}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => navigate(-1)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#1A4E26] text-white font-bold rounded-xl hover:bg-[#163F1E] transition-colors">
                  <BookOpen size={18} /> Volver al curso
                </button>
                {!result.passed && canRetry && (
                  <button onClick={handleRetry}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border-2 border-[#1A4E26] text-[#1A4E26] font-bold rounded-xl hover:bg-[#F8FBF8] transition-colors">
                    <RefreshCw size={16} /> Reintentar evaluación
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pre-attempt view ───────────────────────────────────────────────────────

  const attemptsUsed = pastAttempts.filter(a => a.passed !== null).length;
  const attemptsRemaining = assessment.max_attempts
    ? Math.max(0, assessment.max_attempts - attemptsUsed)
    : null;
  const canStart = attemptsRemaining === null || attemptsRemaining > 0;

  if (!attemptId) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 border border-[#C8D8CB] space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#EBF4ED] rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="text-[#1A4E26]" size={32} />
            </div>
            <h1 className="text-2xl font-black text-[#111111] mb-1">{assessment.title}</h1>
            {assessment.description && (
              <p className="text-slate-500 text-sm">{assessment.description}</p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="text-xs text-slate-500 font-medium">Preguntas</p>
              <p className="font-black text-xl text-[#111111]">{assessment.questions?.length || 0}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="text-xs text-slate-500 font-medium">Para aprobar</p>
              <p className="font-black text-xl text-[#111111]">{assessment.passing_score}%</p>
            </div>
            {assessment.time_limit_minutes ? (
              <div className="bg-amber-50 p-3 rounded-xl text-center border border-amber-100">
                <p className="text-xs text-amber-600 font-medium flex items-center justify-center gap-0.5">
                  <Clock size={10} /> Tiempo
                </p>
                <p className="font-black text-xl text-amber-700">{assessment.time_limit_minutes} min</p>
              </div>
            ) : (
              <div className="bg-slate-50 p-3 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">Tiempo</p>
                <p className="font-black text-xl text-[#111111]">Libre</p>
              </div>
            )}
          </div>

          {/* Attempts info */}
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm
            ${!canStart ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-[#F8FBF8] border border-[#C8D8CB] text-slate-600'}`}>
            <Info size={15} className="shrink-0" />
            {assessment.max_attempts
              ? canStart
                ? `Intentos disponibles: ${attemptsRemaining} de ${assessment.max_attempts}`
                : 'Has agotado todos tus intentos para esta evaluación.'
              : 'Intentos ilimitados'}
          </div>

          {/* Previous attempts summary */}
          {pastAttempts.length > 0 && (
            <div className="text-sm space-y-1.5">
              <p className="font-semibold text-[#111]">Intentos anteriores</p>
              {pastAttempts.slice(0, 3).map((a, i) => (
                <div key={a.id} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500">Intento {pastAttempts.length - i}</span>
                  <span className={`font-bold ${a.passed ? 'text-[#1A4E26]' : 'text-red-500'}`}>{Math.round(a.percentage)}%</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {a.passed ? 'Aprobado' : 'Reprobado'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleStartAttempt}
              disabled={isSubmitting || !canStart}
              className="w-full py-4 bg-[#D4AF37] text-[#0B2913] font-black rounded-xl hover:bg-[#F3D568] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Iniciando...' : canStart ? 'Comenzar Evaluación' : 'Sin intentos restantes'}
            </button>
            <button onClick={() => navigate(-1)} className="w-full text-sm font-medium text-slate-500 hover:text-[#111] py-2">
              Cancelar y volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active attempt view ────────────────────────────────────────────────────

  const questions = assessment.questions || [];
  const answeredCount = Object.values(answers).filter(a => a.length > 0).length;
  const isTimeWarning = timeLeft !== null && timeLeft < 120; // < 2 min

  return (
    <div className="min-h-screen bg-[#F4F7F5] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#C8D8CB] sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-[#111] shrink-0">
              <ChevronLeft size={24} />
            </button>
            <h1 className="font-bold text-[#111111] truncate text-sm sm:text-base">{assessment.title}</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer */}
            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm
                ${isTimeWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                <Clock size={14} />
                {formatTime(timeLeft)}
              </div>
            )}
            {/* Progress */}
            <span className="text-xs text-slate-400 font-medium hidden sm:block">
              {answeredCount}/{questions.length} respondidas
            </span>
            <button
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1A4E26] text-white font-bold rounded-xl hover:bg-[#163F1E] transition-colors disabled:opacity-50 text-sm">
              {isSubmitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-[#1A4E26] transition-all duration-300"
            style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        {questions.map((q: any, index: number) => {
          const isMultiple = q.question_type === 'multiple_choice';
          const selectedOpts = answers[q.id] || [];
          const isAnswered = selectedOpts.length > 0;

          return (
            <div key={q.id}
              className={`bg-white rounded-2xl p-6 sm:p-8 shadow-sm border transition-all
                ${isAnswered ? 'border-[#C8D8CB]' : 'border-slate-200'}`}>
              <div className="flex gap-4 items-start mb-5">
                <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-sm
                  ${isAnswered ? 'bg-[#1A4E26] text-white' : 'bg-[#EBF4ED] text-[#1A4E26]'}`}>
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111111]">{q.question_text}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isMultiple ? 'Selecciona todas las que apliquen' : 'Selecciona una respuesta'}
                    {q.points > 1 ? ` · ${q.points} pts` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pl-12">
                {q.options?.map((opt: any) => {
                  const isSelected = selectedOpts.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(q.id, opt.id, isMultiple)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 group
                        ${isSelected
                          ? 'border-[#1A4E26] bg-[#EBF4ED]'
                          : 'border-slate-200 hover:border-[#1A4E26]/30 bg-white hover:bg-[#F8FBF8]'}`}
                    >
                      <div className={`w-5 h-5 flex items-center justify-center shrink-0 transition-all
                        ${isMultiple ? 'rounded-md' : 'rounded-full'}
                        ${isSelected ? 'bg-[#1A4E26] border-[#1A4E26]' : 'border-2 border-slate-300 group-hover:border-[#1A4E26]'}`}>
                        {isSelected && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <span className={`font-medium text-sm ${isSelected ? 'text-[#1A4E26]' : 'text-[#4B5563]'}`}>
                        {opt.option_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Bottom submit */}
        <div className="pt-4 pb-8">
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="w-full py-4 bg-[#1A4E26] text-white font-black text-base rounded-2xl hover:bg-[#163F1E] transition-colors shadow-md disabled:opacity-50">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando y calificando...
              </span>
            ) : `Enviar evaluación (${answeredCount}/${questions.length} respondidas)`}
          </button>
          {timeLeft !== null && isTimeWarning && (
            <p className="text-center text-sm text-red-500 font-bold mt-2 flex items-center justify-center gap-1">
              <AlertTriangle size={14} /> ¡Tiempo casi agotado!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
