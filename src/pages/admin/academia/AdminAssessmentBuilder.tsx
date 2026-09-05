import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Eye, EyeOff, Loader2, Plus, Save, Trash2, Check, X as XIcon,
  Clock, Shuffle, BookOpen, Info
} from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';

type AssessmentData = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  is_final_exam: boolean;
  is_published: boolean;
  randomize_questions: boolean;
  sort_order: number;
  questions: QuestionData[];
};

type OptionData = {
  id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
};

type QuestionData = {
  id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  points: number;
  sort_order: number;
  explanation: string | null;
  options: OptionData[];
  _editing?: boolean;
};

type NewQuestionForm = {
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  points: string;
  explanation: string;
  options: string[];
  correctOptions: number[];
};

const emptyNewQuestion = (): NewQuestionForm => ({
  question_text: '',
  question_type: 'single_choice',
  points: '1',
  explanation: '',
  options: ['', ''],
  correctOptions: [0],
});

function Field({ label, value, onChange, type = 'text', placeholder = '', hint = '' }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#111] block mb-1">{label}</span>
      {hint && <span className="text-xs text-slate-400 block mb-1">{hint}</span>}
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm" />
    </label>
  );
}

function QuestionForm({
  qForm, setQForm, onSubmit, onCancel, isEdit = false, isSaving = false
}: {
  qForm: NewQuestionForm; setQForm: (f: NewQuestionForm) => void;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void; isEdit?: boolean; isSaving?: boolean;
}) {
  // Auto-set true/false options
  const handleTypeChange = (type: 'single_choice' | 'multiple_choice' | 'true_false') => {
    if (type === 'true_false') {
      setQForm({ ...qForm, question_type: type, options: ['Verdadero', 'Falso'], correctOptions: [0] });
    } else {
      setQForm({ ...qForm, question_type: type, correctOptions: [0] });
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-[#F8FBF8] border border-[#C8D8CB] rounded-2xl p-5 space-y-4">
      <p className="font-bold text-[#111] text-sm">{isEdit ? 'Editar pregunta' : 'Nueva pregunta'}</p>

      <div>
        <span className="text-sm font-semibold text-[#111] block mb-1">Pregunta</span>
        <textarea value={qForm.question_text} onChange={e => setQForm({ ...qForm, question_text: e.target.value })}
          rows={2} placeholder="Escribe la pregunta aquí..." required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-semibold text-[#111] block mb-1">Tipo de pregunta</span>
          <select value={qForm.question_type}
            onChange={e => handleTypeChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]">
            <option value="single_choice">Una respuesta correcta</option>
            <option value="multiple_choice">Varias respuestas correctas</option>
            <option value="true_false">Verdadero / Falso</option>
          </select>
        </div>
        <Field label="Puntos" value={qForm.points} onChange={v => setQForm({ ...qForm, points: v })} type="number" placeholder="1" />
      </div>

      <div>
        <p className="text-sm font-semibold text-[#111] mb-2">
          Opciones <span className="text-xs font-normal text-slate-400">(marca la(s) correcta(s))</span>
        </p>
        {qForm.options.map((option, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <label className="shrink-0 flex items-center justify-center pt-1">
              <input
                type={qForm.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                name={`correct-${isEdit ? 'edit' : 'new'}`}
                checked={qForm.correctOptions.includes(i)}
                onChange={() => {
                  const correctOptions = qForm.question_type === 'multiple_choice'
                    ? qForm.correctOptions.includes(i)
                      ? qForm.correctOptions.filter(x => x !== i)
                      : [...qForm.correctOptions, i]
                    : [i];
                  setQForm({ ...qForm, correctOptions });
                }}
                className="w-4 h-4 accent-[#1A4E26] cursor-pointer"
              />
            </label>
            <input type="text" value={option} placeholder={`Opción ${i + 1}`}
              required={i < 2}
              disabled={qForm.question_type === 'true_false'}
              onChange={e => {
                const options = [...qForm.options];
                options[i] = e.target.value;
                setQForm({ ...qForm, options });
              }}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1A4E26] disabled:bg-slate-50 disabled:text-slate-400" />
            {i > 1 && qForm.question_type !== 'true_false' && (
              <button type="button"
                onClick={() => {
                  const options = qForm.options.filter((_, j) => j !== i);
                  const correctOptions = qForm.correctOptions.filter(x => x !== i).map(x => x > i ? x - 1 : x);
                  setQForm({ ...qForm, options, correctOptions });
                }}
                className="shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <XIcon size={15} />
              </button>
            )}
          </div>
        ))}
        {qForm.options.length < 6 && qForm.question_type !== 'true_false' && (
          <button type="button"
            onClick={() => setQForm({ ...qForm, options: [...qForm.options, ''] })}
            className="text-xs font-bold text-[#1A4E26] flex items-center gap-1 hover:underline mt-1">
            <Plus size={13} /> Añadir opción
          </button>
        )}
      </div>

      <div>
        <span className="text-sm font-semibold text-[#111] block mb-1">Retroalimentación <span className="text-xs font-normal text-slate-400">(opcional — se muestra tras responder)</span></span>
        <textarea value={qForm.explanation} onChange={e => setQForm({ ...qForm, explanation: e.target.value })}
          rows={2} placeholder="Explica por qué la respuesta es correcta..."
          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm" />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white font-bold text-sm rounded-xl disabled:opacity-60 hover:bg-[#163F1E] transition-colors">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isEdit ? 'Actualizar pregunta' : 'Añadir pregunta'}
        </button>
      </div>
    </form>
  );
}

export default function AdminAssessmentBuilder() {
  const { courseId, assessmentId } = useParams<{ courseId: string; assessmentId: string }>();
  const toast = useToast();

  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingQ, setSavingQ] = useState(false);

  // Assessment form
  const [aTitle, setATitle] = useState('');
  const [aDescription, setADescription] = useState('');
  const [aPassingScore, setAPassingScore] = useState('70');
  const [aMaxAttempts, setAMaxAttempts] = useState('');
  const [aTimeLimitMinutes, setATimeLimitMinutes] = useState('');
  const [aIsFinalExam, setAIsFinalExam] = useState(false);
  const [aIsPublished, setAIsPublished] = useState(false);
  const [aRandomize, setARandomize] = useState(false);
  const [aModuleId, setAModuleId] = useState('');

  // New question form
  const [showAddQ, setShowAddQ] = useState(false);
  const [newQ, setNewQ] = useState<NewQuestionForm>(emptyNewQuestion());

  // Edit question
  const [editingQ, setEditingQ] = useState<QuestionData | null>(null);
  const [editQForm, setEditQForm] = useState<NewQuestionForm | null>(null);

  const load = useCallback(async () => {
    if (!assessmentId || !courseId) return;
    setLoading(true);
    try {
      const [data, modulesData] = await Promise.all([
        academyAPI.getAdminAssessment(assessmentId),
        academyAPI.getAdminCourseContent(courseId),
      ]);
      if (!data) throw new Error();
      const a = data as AssessmentData;
      setAssessment(a);
      setATitle(a.title);
      setADescription(a.description ?? '');
      setAPassingScore(a.passing_score.toString());
      setAMaxAttempts(a.max_attempts?.toString() ?? '');
      setATimeLimitMinutes(a.time_limit_minutes?.toString() ?? '');
      setAIsFinalExam(a.is_final_exam);
      setAIsPublished(a.is_published);
      setARandomize(a.randomize_questions);
      setAModuleId(a.module_id ?? '');
      setModules(modulesData.map(m => ({ id: m.id, title: m.title })));
    } catch { toast.error('No se pudo cargar la evaluación.'); }
    finally { setLoading(false); }
  }, [assessmentId, courseId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSaveAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!assessment || !courseId || !assessmentId) return;
    setSaving(true);
    try {
      const updated = await academyAPI.saveAdminAssessment(assessmentId, {
        course_id: courseId,
        module_id: aModuleId || null,
        title: aTitle.trim(),
        description: aDescription,
        passing_score: Number(aPassingScore),
        max_attempts: aMaxAttempts ? Number(aMaxAttempts) : null,
        time_limit_minutes: aTimeLimitMinutes ? Number(aTimeLimitMinutes) : null,
        is_final_exam: aIsFinalExam,
        is_published: aIsPublished,
        sort_order: assessment.sort_order,
        randomize_questions: aRandomize,
      });
      setAssessment(a => a ? { ...a, ...updated } : a);
      toast.success('Evaluación guardada.');
    } catch { toast.error('Error guardando la evaluación.'); }
    finally { setSaving(false); }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!assessment || !newQ.question_text.trim()) return;
    setSavingQ(true);
    try {
      const q = await academyAPI.createAdminQuestion({
        assessment_id: assessment.id,
        question_text: newQ.question_text.trim(),
        question_type: newQ.question_type,
        points: Number(newQ.points),
        sort_order: assessment.questions.length + 1,
        explanation: newQ.explanation.trim() || undefined,
        options: newQ.options.filter(o => o.trim()).map((o, i) => ({
          option_text: o.trim(),
          is_correct: newQ.correctOptions.includes(i),
          sort_order: i + 1,
        })),
      });
      setAssessment(a => a ? {
        ...a, questions: [...a.questions, { ...q, options: q.options ?? [], explanation: q.explanation ?? null } as QuestionData],
      } : a);
      setNewQ(emptyNewQuestion());
      setShowAddQ(false);
      toast.success('Pregunta añadida.');
    } catch { toast.error('Error añadiendo pregunta.'); }
    finally { setSavingQ(false); }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    try {
      await academyAPI.deleteAdminQuestion(questionId);
      setAssessment(a => a ? { ...a, questions: a.questions.filter(q => q.id !== questionId) } : a);
      toast.success('Pregunta eliminada.');
    } catch { toast.error('Error eliminando pregunta.'); }
  }

  async function handleSaveEditQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!editingQ || !editQForm) return;
    setSavingQ(true);
    try {
      await academyAPI.updateAdminQuestion(editingQ.id, {
        question_text: editQForm.question_text.trim(),
        question_type: editQForm.question_type,
        points: Number(editQForm.points),
        explanation: editQForm.explanation.trim() || undefined,
        options: editQForm.options.filter(o => o.trim()).map((o, i) => ({
          option_text: o.trim(),
          is_correct: editQForm.correctOptions.includes(i),
          sort_order: i + 1,
        })),
      });
      toast.success('Pregunta actualizada.');
      setEditingQ(null);
      setEditQForm(null);
      void load();
    } catch { toast.error('Error actualizando pregunta.'); }
    finally { setSavingQ(false); }
  }

  function startEdit(q: QuestionData) {
    setEditingQ(q);
    setEditQForm({
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points.toString(),
      explanation: q.explanation ?? '',
      options: q.options.map(o => o.option_text),
      correctOptions: q.options.filter(o => o.is_correct).map((_, i) => i),
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#1A4E26]" size={36} />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p>Evaluación no encontrada.</p>
        <Link to={`/admin/academia/cursos/${courseId}/builder`} className="text-[#1A4E26] font-bold underline mt-2 block">Volver</Link>
      </div>
    );
  }

  const qtypeLabel: Record<string, string> = {
    single_choice: 'Una respuesta',
    multiple_choice: 'Varias respuestas',
    true_false: 'V / F',
  };

  const totalPoints = assessment.questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`/admin/academia/cursos/${courseId}/builder`}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#1A4E26] transition-colors">
          <ArrowLeft size={16} /> Builder
        </Link>
        <span className="text-slate-300">/</span>
        <ClipboardList size={16} className="text-amber-500" />
        <span className="text-sm font-bold text-[#111] truncate max-w-xs">{assessment.title}</span>
        {assessment.is_final_exam && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Examen Final</span>
        )}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${assessment.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {assessment.is_published ? 'Publicada' : 'Borrador'}
        </span>
      </div>

      {/* Main layout */}
      <div className="flex gap-5">

        {/* Left: Settings */}
        <div className="w-72 shrink-0 space-y-3">
          <form onSubmit={handleSaveAssessment} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-base font-black text-[#111]">Configuración</h2>

            <Field label="Nombre de la evaluación" value={aTitle} onChange={setATitle} placeholder="Ej: Evaluación final" />

            <div>
              <span className="text-sm font-semibold text-[#111] block mb-1">Descripción <span className="text-xs font-normal text-slate-400">(opcional)</span></span>
              <textarea value={aDescription} onChange={e => setADescription(e.target.value)}
                rows={2} placeholder="Descripción o instrucciones para el estudiante..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm" />
            </div>

            {/* Módulo asociado */}
            <div>
              <span className="text-sm font-semibold text-[#111] block mb-1">Módulo asociado</span>
              <select value={aModuleId} onChange={e => setAModuleId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]">
                <option value="">Sin módulo (examen del curso)</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-sm font-semibold text-[#111] block mb-1">Puntuación mínima ({aPassingScore}%)</span>
              <input type="range" min="0" max="100" step="5" value={aPassingScore}
                onChange={e => setAPassingScore(e.target.value)}
                className="w-full accent-[#1A4E26]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-sm font-semibold text-[#111] block mb-1">Intentos máximos</span>
                <input type="number" value={aMaxAttempts} onChange={e => setAMaxAttempts(e.target.value)}
                  placeholder="∞ ilimitados" min="1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm" />
              </div>
              <div>
                <span className="text-sm font-semibold text-[#111] block mb-1 flex items-center gap-1">
                  <Clock size={12} /> Tiempo (min)
                </span>
                <input type="number" value={aTimeLimitMinutes} onChange={e => setATimeLimitMinutes(e.target.value)}
                  placeholder="Sin límite" min="1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm" />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={aIsFinalExam} onChange={e => setAIsFinalExam(e.target.checked)}
                  className="w-4 h-4 accent-[#1A4E26]" />
                <div>
                  <span className="text-sm font-semibold text-[#111] block">Examen final</span>
                  <span className="text-xs text-slate-500">Requerido para completar el curso</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={aRandomize} onChange={e => setARandomize(e.target.checked)}
                  className="w-4 h-4 accent-[#1A4E26]" />
                <div>
                  <span className="text-sm font-semibold text-[#111] flex items-center gap-1"><Shuffle size={13} /> Aleatorizar preguntas</span>
                  <span className="text-xs text-slate-500">El orden cambia en cada intento</span>
                </div>
              </label>
            </div>

            <button type="button" onClick={() => setAIsPublished(p => !p)}
              className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-colors
                ${aIsPublished ? 'bg-[#E8F2EA] border-[#C8D8CB] text-[#1A4E26]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              {aIsPublished ? <Eye size={16} /> : <EyeOff size={16} />}
              <span className="text-sm font-semibold">{aIsPublished ? 'Publicada' : 'Oculta (borrador)'}</span>
            </button>

            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Guardando...' : 'Guardar evaluación'}
            </button>
          </form>

          {/* Stats */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3">
                <span className="text-2xl font-black text-[#1A4E26]">{assessment.questions.length}</span>
                <p className="text-xs text-slate-500 mt-0.5">pregunta{assessment.questions.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <span className="text-2xl font-black text-[#1A4E26]">{totalPoints}</span>
                <p className="text-xs text-slate-500 mt-0.5">puntos totales</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 space-y-1 pt-3 border-t border-slate-100">
              <p>Aprobación: <span className="font-bold text-[#111]">{aPassingScore}%</span></p>
              {aTimeLimitMinutes && <p className="flex items-center gap-1"><Clock size={11} /> Límite: <span className="font-bold text-[#111]">{aTimeLimitMinutes} min</span></p>}
              {aRandomize && <p className="flex items-center gap-1 text-purple-600"><Shuffle size={11} /> Preguntas aleatorizadas</p>}
            </div>
          </div>
        </div>

        {/* Right: Questions */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#111]">Preguntas</h2>
            {!showAddQ && !editingQ && (
              <button type="button" onClick={() => setShowAddQ(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white text-sm font-bold rounded-xl hover:bg-[#163F1E] transition-colors shadow-sm">
                <Plus size={16} /> Añadir pregunta
              </button>
            )}
          </div>

          {/* Add question form */}
          {showAddQ && (
            <QuestionForm
              qForm={newQ}
              setQForm={setNewQ}
              onSubmit={handleAddQuestion}
              onCancel={() => { setShowAddQ(false); setNewQ(emptyNewQuestion()); }}
              isSaving={savingQ}
            />
          )}

          {/* Questions list */}
          {assessment.questions.length === 0 && !showAddQ && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
              <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500 mb-1">Sin preguntas aún</p>
              <p className="text-sm text-slate-400 mb-3">Esta evaluación no tiene preguntas.</p>
              <button type="button" onClick={() => setShowAddQ(true)}
                className="px-4 py-2 bg-[#1A4E26] text-white font-bold text-sm rounded-xl">
                + Añadir primera pregunta
              </button>
            </div>
          )}

          {assessment.questions.map((q, qi) => (
            <div key={q.id}>
              {editingQ?.id === q.id && editQForm ? (
                <QuestionForm
                  qForm={editQForm}
                  setQForm={setEditQForm as any}
                  onSubmit={handleSaveEditQuestion}
                  onCancel={() => { setEditingQ(null); setEditQForm(null); }}
                  isEdit
                  isSaving={savingQ}
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-black text-slate-400 bg-slate-100 w-7 h-7 flex items-center justify-center rounded-full shrink-0">
                      {qi + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#111] mb-2">{q.question_text}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                          {qtypeLabel[q.question_type] ?? q.question_type}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-[#E8F2EA] text-[#1A4E26] rounded-full font-semibold">
                          {q.points} pts
                        </span>
                        {q.explanation && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-semibold flex items-center gap-1">
                            <Info size={10} /> Retroalimentación
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {(q.options ?? []).map(o => (
                          <div key={o.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border
                            ${o.is_correct ? 'bg-[#E8F2EA] border-[#C8D8CB] text-[#1A4E26]' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {o.is_correct
                              ? <Check size={13} className="text-[#1A4E26] shrink-0" />
                              : <span className="w-3 shrink-0" />}
                            {o.option_text}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5 flex items-start gap-1">
                          <Info size={11} className="shrink-0 mt-0.5" />
                          {q.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => startEdit(q)}
                        className="p-2 rounded-xl text-slate-400 hover:text-[#1A4E26] hover:bg-[#E8F2EA] transition-colors text-xs font-bold">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
