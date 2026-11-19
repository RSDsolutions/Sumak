import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Globe,
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  PlayCircle,
  Save,
  Trash2,
  Upload,
  X,
  Award,
  CheckCircle,
  AlertCircle,
  Info,
  ClipboardList,
  Copy,
  GraduationCap,
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type {
  AcademyCourse,
  AcademyCategory,
  AcademyModule,
  AcademyLesson,
  ContentType,
} from '../../../lib/academy-types';

type Tab = 'content' | 'general' | 'completion' | 'certification' | 'publication';

type CourseForm = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  instructor_id: string;
  level: string;
  access_mode: string;
  estimated_duration_minutes: string;
  passing_percentage: string;
  generates_certificate: boolean;
  price: string;
  prerequisites: string;
};

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function courseToForm(c: AcademyCourse): CourseForm {
  return {
    title: c.title,
    slug: c.slug,
    short_description: c.short_description ?? '',
    description: c.description ?? '',
    category_id: c.category_id ?? '',
    instructor_id: c.instructor_id ?? '',
    level: c.level,
    access_mode: c.access_mode,
    estimated_duration_minutes: c.estimated_duration_minutes?.toString() ?? '',
    passing_percentage: c.passing_percentage.toString(),
    generates_certificate: c.generates_certificate,
    price: c.price?.toString() ?? '0',
    prerequisites: c.prerequisites ?? '',
  };
}

function LessonIcon({ type }: { type: ContentType }) {
  const map: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    video: { icon: <PlayCircle size={15} />, bg: 'bg-red-50', color: 'text-red-500' },
    text: { icon: <FileText size={15} />, bg: 'bg-emerald-50', color: 'text-[#1A4E26]' },
    pdf: { icon: <FileText size={15} />, bg: 'bg-orange-50', color: 'text-orange-500' },
    external_link: { icon: <ExternalLink size={15} />, bg: 'bg-purple-50', color: 'text-purple-500' },
    assessment: { icon: <ClipboardList size={15} />, bg: 'bg-amber-50', color: 'text-amber-600' },
    mixed: { icon: <Layers size={15} />, bg: 'bg-indigo-50', color: 'text-indigo-500' },
    presentation: { icon: <FileText size={15} />, bg: 'bg-pink-50', color: 'text-pink-500' },
    image: { icon: <FileText size={15} />, bg: 'bg-teal-50', color: 'text-teal-500' },
  };
  const { icon, bg, color } = map[type] ?? map.text;
  return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${bg} ${color} shrink-0`}>{icon}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Borrador', cls: 'bg-amber-100 text-amber-800' },
    published: { label: 'Publicado', cls: 'bg-emerald-100 text-[#1A4E26]' },
    archived: { label: 'Archivado', cls: 'bg-slate-100 text-slate-600' },
  };
  const { label, cls } = map[status] ?? map.draft;
  return <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 border-b border-slate-50 last:border-0">
      {ok ? (
        <CheckCircle size={18} className="text-[#1A4E26] shrink-0" />
      ) : (
        <AlertCircle size={18} className="text-amber-500 shrink-0" />
      )}
      <span className={`text-sm font-medium ${ok ? 'text-[#111]' : 'text-amber-800'}`}>{label}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
  required = false,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#111] block mb-1">{label}</span>
      <input
        required={required}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#111] block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ─── Module Row Component ─────────────────────────────────────────────────────
function ModuleRow({
  module,
  moduleIndex,
  totalModules,
  courseId,
  basePath,
  moduleAssessments,
  onMoveUp,
  onMoveDown,
  onDelete,
  onTogglePublish,
  onUpdateModule,
  onAddLesson,
  onAddAssessment,
  onMoveLesson,
  onToggleLessonPublish,
  onToggleLessonRequired,
  onDuplicateLesson,
  onDeleteLesson,
  onDeleteAssessment,
}: {
  module: AcademyModule;
  moduleIndex: number;
  totalModules: number;
  courseId: string;
  basePath: string;
  moduleAssessments: any[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onUpdateModule: (title: string, description: string) => void;
  onAddLesson: () => void;
  onAddAssessment: () => void;
  onMoveLesson: (lessonIndex: number, dir: 'up' | 'down') => void;
  onToggleLessonPublish: (lesson: AcademyLesson) => void;
  onToggleLessonRequired: (lesson: AcademyLesson) => void;
  onDuplicateLesson: (lesson: AcademyLesson) => void;
  onDeleteLesson: (lesson: AcademyLesson) => void;
  onDeleteAssessment: (assessmentId: string, title: string) => void;
}) {
  const navigate = useNavigate();
  const [editingHeader, setEditingHeader] = useState(false);
  const [titleVal, setTitleVal] = useState(module.title);
  const [descVal, setDescVal] = useState(module.description ?? '');
  const [expanded, setExpanded] = useState(true);

  function commitHeader() {
    setEditingHeader(false);
    const trimmed = titleVal.trim();
    if (trimmed) {
      onUpdateModule(trimmed, descVal.trim());
    } else {
      setTitleVal(module.title);
      setDescVal(module.description ?? '');
    }
  }

  const contentTypeLabel: Record<string, string> = {
    video: 'Clase en Video',
    text: 'Lección Teórica / Ilustrada',
    pdf: 'Documento PDF',
    external_link: 'Enlace Externo',
    assessment: 'Evaluación',
    mixed: 'Video + Guía Escrita',
    presentation: 'Presentación',
    image: 'Infografía / Imagen',
  };

  const lessons = module.lessons ?? [];
  const itemCount = lessons.length + moduleAssessments.length;

  return (
    <div
      className={`rounded-2xl border transition-all shadow-2xs mb-4 ${
        module.is_published ? 'border-[#C8D8CB] bg-white' : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      {/* Cabecera del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 bg-[#F8FBF8] rounded-t-2xl border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="flex flex-col gap-0.5 text-slate-400 shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={moduleIndex === 0}
              className="hover:text-[#1A4E26] disabled:opacity-25 transition-colors cursor-pointer"
              title="Subir módulo"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={moduleIndex === totalModules - 1}
              className="hover:text-[#1A4E26] disabled:opacity-25 transition-colors cursor-pointer"
              title="Bajar módulo"
            >
              <ArrowDown size={14} />
            </button>
          </div>

          <GripVertical size={16} className="text-slate-300 shrink-0 hidden sm:block" />

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-slate-500 hover:text-[#1A4E26] transition-colors shrink-0 cursor-pointer"
          >
            <ChevronRight size={18} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-extrabold text-[#1A4E26] uppercase tracking-wider">
                Módulo {module.sort_order}
              </span>
              <span className="text-xs text-slate-400">
                · {itemCount} {itemCount === 1 ? 'lección/prueba' : 'lecciones y pruebas'}
              </span>
              {!module.is_published && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full">
                  Oculto
                </span>
              )}
            </div>

            {editingHeader ? (
              <div className="space-y-2 mt-1 bg-white p-3 rounded-xl border border-[#1A4E26]">
                <input
                  autoFocus
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  placeholder="Título del módulo"
                  className="w-full font-bold text-sm text-[#111] px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-[#1A4E26]"
                />
                <input
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  placeholder="Descripción breve u objetivo del módulo (opcional)"
                  className="w-full text-xs text-slate-600 px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-[#1A4E26]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingHeader(false);
                      setTitleVal(module.title);
                      setDescVal(module.description ?? '');
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={commitHeader}
                    className="px-3 py-1 bg-[#1A4E26] text-white text-xs font-bold rounded-lg"
                  >
                    Guardar Módulo
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setEditingHeader(true)}
                  className={`text-left font-black text-base hover:text-[#1A4E26] transition-colors flex items-center gap-1.5 group cursor-pointer ${
                    module.is_published ? 'text-[#111]' : 'text-slate-400'
                  }`}
                >
                  <span>{module.title}</span>
                  <Pencil size={13} className="text-slate-400 group-hover:text-[#1A4E26]" />
                </button>
                {module.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{module.description}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Acciones del Módulo */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setEditingHeader(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1A4E26] hover:bg-[#E8F2EA] transition-colors cursor-pointer"
            title="Editar nombre y descripción del módulo"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={onTogglePublish}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              module.is_published ? 'text-[#1A4E26] hover:bg-[#E8F2EA]' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={module.is_published ? 'Ocultar módulo a los alumnos' : 'Publicar módulo'}
          >
            {module.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Eliminar módulo"
          >
            <Trash2 size={16} />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onAddAssessment}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors cursor-pointer"
            title="Crear examen o cuestionario para este módulo"
          >
            <ClipboardList size={14} /> + Examen
          </button>

          <button
            type="button"
            onClick={onAddLesson}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A4E26] text-white text-xs font-bold rounded-xl hover:bg-[#143D1E] transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={14} /> + Nueva Lección
          </button>
        </div>
      </div>

      {/* Lista de Lecciones y Pruebas dentro del Módulo */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {lessons.length === 0 && moduleAssessments.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                Este módulo aún no tiene lecciones.
              </p>
              <button
                type="button"
                onClick={onAddLesson}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#EBF4ED] text-[#1A4E26] text-xs font-bold hover:bg-[#d7eadb]"
              >
                <Plus size={14} /> Agregar primera lección a este módulo
              </button>
            </div>
          ) : (
            <>
              {lessons.map((lesson, li) => {
                const isReq = lesson.is_required !== false;
                const hasRecipe = Boolean(lesson.metadata?.recipe_card?.title);
                const hasCallout = Boolean(lesson.metadata?.clinical_callout?.title);

                return (
                  <div
                    key={lesson.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50/80 transition-colors ${
                      !lesson.is_published ? 'opacity-65 bg-slate-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Flechas para ordenar lecciones */}
                      <div className="flex flex-col text-slate-300 shrink-0">
                        <button
                          type="button"
                          onClick={() => onMoveLesson(li, 'up')}
                          disabled={li === 0}
                          className="hover:text-[#1A4E26] disabled:opacity-25 cursor-pointer"
                          title="Subir lección"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveLesson(li, 'down')}
                          disabled={li === lessons.length - 1}
                          className="hover:text-[#1A4E26] disabled:opacity-25 cursor-pointer"
                          title="Bajar lección"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      <LessonIcon type={lesson.content_type} />

                      <button
                        type="button"
                        onClick={() => {
                          if (lesson.content_type === 'assessment' && lesson.assessment_id) {
                            navigate(`${basePath}/academia/cursos/${courseId}/evaluaciones/${lesson.assessment_id}`);
                          } else {
                            navigate(`${basePath}/academia/cursos/${courseId}/lecciones/${lesson.id}`);
                          }
                        }}
                        className="flex-1 text-left min-w-0 cursor-pointer group"
                      >
                        <span className="font-bold text-sm text-[#111] group-hover:text-[#1A4E26] transition-colors block truncate">
                          {lesson.sort_order}. {lesson.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span>{contentTypeLabel[lesson.content_type] ?? lesson.content_type}</span>
                          {lesson.estimated_minutes ? <span>· {lesson.estimated_minutes} min</span> : null}
                          {hasRecipe && (
                            <span className="text-[10px] font-bold bg-emerald-50 text-[#1A4E26] px-2 py-0.2 rounded-full border border-emerald-200">
                              🍵 Incluye Receta
                            </span>
                          )}
                          {hasCallout && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.2 rounded-full border border-amber-200">
                              ⚠️ Alerta Clínica
                            </span>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Botones Rápidos de la Lección */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleLessonRequired(lesson)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          isReq
                            ? 'bg-[#EBF4ED] text-[#1A4E26] border-[#C8D8CB]'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                        title="Define si el estudiante debe completarla obligatoriamente para recibir el certificado"
                      >
                        {isReq ? '🎓 Obligatoria' : 'Opcional'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleLessonPublish(lesson)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          lesson.is_published
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                        title={lesson.is_published ? 'Visible para estudiantes' : 'Oculta (borrador)'}
                      >
                        {lesson.is_published ? '● Publicada' : 'Oculta'}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`${basePath}/academia/cursos/${courseId}/lecciones/${lesson.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1A4E26] text-white hover:bg-[#143D1E] text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Pencil size={12} /> Editar Contenido
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicateLesson(lesson)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1A4E26] hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Duplicar esta lección"
                      >
                        <Copy size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteLesson(lesson)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar lección"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Evaluaciones del módulo */}
              {moduleAssessments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-amber-50/40 hover:bg-amber-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                      <ClipboardList size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/academia/cursos/${courseId}/evaluaciones/${a.id}`)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <span className="font-bold text-sm text-amber-950 block truncate">
                        📝 {a.title}
                      </span>
                      <span className="text-xs text-amber-700">
                        {a.is_final_exam ? 'Examen Final' : 'Evaluación del Módulo'} · Nota mínima: {a.passing_score}% ·{' '}
                        {a.is_published ? 'Publicada' : 'En borrador'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/academia/cursos/${courseId}/evaluaciones/${a.id}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Pencil size={12} /> Configurar Preguntas
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAssessment(a.id, a.title)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar evaluación"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminCourseBuilder() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/operaciones') ? '/operaciones' : '/admin';
  const toast = useToast();

  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [form, setForm] = useState<CourseForm | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Modal Crear Módulo
  const [addModuleModal, setAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  // Modal Asistente para Crear Nueva Lección
  const [lessonPickerModule, setLessonPickerModule] = useState<AcademyModule | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [newLessonType, setNewLessonType] = useState<ContentType>('text');
  const [newLessonMinutes, setNewLessonMinutes] = useState('20');
  const [newLessonPublished, setNewLessonPublished] = useState(true);
  const [newLessonRequired, setNewLessonRequired] = useState(true);
  const [creatingLesson, setCreatingLesson] = useState(false);

  // Modal Eliminar Módulo
  const [deleteTarget, setDeleteTarget] = useState<AcademyModule | null>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [c, mods, cats, insts, progs, asmnts] = await Promise.all([
        academyAPI.getAdminCourseById(courseId),
        academyAPI.getAdminCourseContent(courseId),
        academyAPI.getAdminCategories(),
        academyAPI.getAdminInstructors(),
        academyAPI.getAdminPrograms().catch(() => []),
        academyAPI.getAdminAssessmentsForTree(courseId),
      ]);
      setCourse(c);
      if (c) setForm(courseToForm(c));
      setModules(mods);
      setCategories(cats);
      setInstructors(insts);
      setPrograms(progs);
      setAssessments(asmnts);
    } catch {
      toast.error('No se pudo cargar el curso.');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !courseId) return;
    setSaving(true);
    try {
      let coverUrl = course?.cover_image_url ?? null;
      if (coverFile) {
        setUploadingCover(true);
        coverUrl = await academyAPI.uploadAdminCourseCover(courseId, coverFile);
        setCoverFile(null);
        setUploadingCover(false);
      }
      const updated = await academyAPI.patchAdminCourse(courseId, {
        title: form.title.trim(),
        slug: form.slug.trim(),
        short_description: form.short_description || null,
        description: form.description || null,
        category_id: form.category_id || null,
        instructor_id: form.instructor_id || null,
        level: form.level as any,
        access_mode: form.access_mode as any,
        estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
        prerequisites: form.prerequisites || null,
        price: Number(form.price),
        cover_image_url: coverUrl,
      });
      setCourse(updated);
      toast.success('Información del curso guardada.');
    } catch {
      toast.error('Error guardando la información.');
    } finally {
      setSaving(false);
      setUploadingCover(false);
    }
  }

  async function handleSaveCompletion(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !courseId) return;
    setSaving(true);
    try {
      const updated = await academyAPI.patchAdminCourse(courseId, {
        passing_percentage: Number(form.passing_percentage),
        generates_certificate: form.generates_certificate,
      });
      setCourse(updated);
      toast.success('Reglas de aprobación guardadas.');
    } catch {
      toast.error('Error guardando reglas.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCertification(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !courseId) return;
    setSaving(true);
    try {
      const updated = await academyAPI.patchAdminCourse(courseId, {
        generates_certificate: form.generates_certificate,
      });
      setCourse(updated);
      toast.success('Configuración de certificado guardada.');
    } catch {
      toast.error('Error guardando certificación.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleProgramLink(program: any) {
    if (!courseId) return;
    const existingLink = (program.courses ?? []).find((pc: any) => pc.course_id === courseId);
    try {
      if (existingLink) {
        await academyAPI.removeCourseFromProgram(existingLink.id);
        toast.success(`Curso desvinculado del programa "${program.title}".`);
      } else {
        await academyAPI.addCourseToProgram({
          program_id: program.id,
          course_id: courseId,
          sort_order: ((program.courses ?? []).length || 0) + 1,
          is_required: true,
        });
        toast.success(`Curso incluido en el programa "${program.title}".`);
      }
      const nextProgs = await academyAPI.getAdminPrograms();
      setPrograms(nextProgs);
    } catch {
      toast.error('No se pudo actualizar la vinculación con el programa.');
    }
  }

  async function changeStatus(status: 'draft' | 'published' | 'archived') {
    if (!courseId) return;
    setSaving(true);
    try {
      const updated = await academyAPI.patchAdminCourse(courseId, { status });
      setCourse(updated);
      toast.success(
        status === 'published'
          ? '¡Curso publicado en el catálogo!'
          : status === 'archived'
            ? 'Curso archivado.'
            : 'Curso pasado a borrador.'
      );
    } catch {
      toast.error('Error actualizando estado.');
    } finally {
      setSaving(false);
    }
  }

  async function addModule() {
    if (!courseId || !newModuleTitle.trim()) return;
    try {
      const m = await academyAPI.saveAdminModule(null, {
        course_id: courseId,
        title: newModuleTitle.trim(),
        description: newModuleDesc.trim(),
        sort_order: modules.length + 1,
        is_published: true,
      });
      setModules((ms) => [...ms, { ...m, lessons: [] }]);
      setNewModuleTitle('');
      setNewModuleDesc('');
      setAddModuleModal(false);
      toast.success('Módulo creado.');
    } catch {
      toast.error('No se pudo crear el módulo.');
    }
  }

  async function moveModule(i: number, dir: 'up' | 'down') {
    if (!courseId) return;
    const newMs = [...modules];
    const ti = dir === 'up' ? i - 1 : i + 1;
    [newMs[i], newMs[ti]] = [newMs[ti], newMs[i]];
    newMs[i].sort_order = i + 1;
    newMs[ti].sort_order = ti + 1;
    setModules(newMs);
    try {
      await Promise.all([
        academyAPI.saveAdminModule(newMs[i].id, { ...newMs[i], course_id: courseId }),
        academyAPI.saveAdminModule(newMs[ti].id, { ...newMs[ti], course_id: courseId }),
      ]);
    } catch {
      toast.error('Error reordenando módulos.');
      void load();
    }
  }

  async function updateModuleInfo(moduleId: string, title: string, description: string) {
    try {
      await academyAPI.patchAdminModule(moduleId, { title, description });
      setModules((ms) => ms.map((m) => (m.id === moduleId ? { ...m, title, description } : m)));
      toast.success('Módulo actualizado.');
    } catch {
      toast.error('Error actualizando módulo.');
    }
  }

  async function toggleModulePublish(module: AcademyModule) {
    if (!courseId) return;
    try {
      const updated = await academyAPI.saveAdminModule(module.id, {
        ...module,
        course_id: courseId,
        is_published: !module.is_published,
      });
      setModules((ms) => ms.map((m) => (m.id === module.id ? { ...m, is_published: updated.is_published } : m)));
    } catch {
      toast.error('Error actualizando módulo.');
    }
  }

  async function deleteModule(module: AcademyModule) {
    try {
      // Si el módulo tiene lecciones, eliminarlas primero automáticamente tras confirmar en el modal
      if (module.lessons && module.lessons.length > 0) {
        for (const l of module.lessons) {
          await academyAPI.deleteAdminLesson(l.id);
        }
      }
      await academyAPI.deleteAdminModule(module.id);
      setModules((ms) => ms.filter((m) => m.id !== module.id));
      toast.success('Módulo eliminado.');
    } catch {
      toast.error('Error eliminando módulo.');
    }
    setDeleteTarget(null);
  }

  function openNewLessonModal(module: AcademyModule) {
    const nextNum = (module.lessons?.length ?? 0) + 1;
    setLessonPickerModule(module);
    setNewLessonTitle(`Lección ${nextNum}: `);
    setNewLessonDesc('');
    setNewLessonType('text');
    setNewLessonMinutes('20');
    setNewLessonPublished(true);
    setNewLessonRequired(true);
  }

  async function handleCreateLesson(andNavigateToEditor: boolean) {
    if (!courseId || !lessonPickerModule || !newLessonTitle.trim()) {
      toast.error('Escribe un título para la lección.');
      return;
    }
    setCreatingLesson(true);
    try {
      const lesson = await academyAPI.saveAdminLesson(null, {
        module_id: lessonPickerModule.id,
        title: newLessonTitle.trim(),
        description: newLessonDesc.trim() || null,
        content_type: newLessonType,
        estimated_minutes: newLessonMinutes ? Number(newLessonMinutes) : 20,
        sort_order: (lessonPickerModule.lessons?.length ?? 0) + 1,
        is_published: newLessonPublished,
        is_required: newLessonRequired,
        is_free_preview: false,
        metadata: {},
      });

      setModules((ms) =>
        ms.map((m) =>
          m.id === lessonPickerModule.id ? { ...m, lessons: [...(m.lessons ?? []), lesson] } : m
        )
      );

      toast.success('Lección creada.');
      setLessonPickerModule(null);

      if (andNavigateToEditor) {
        navigate(`${basePath}/academia/cursos/${courseId}/lecciones/${lesson.id}`);
      }
    } catch {
      toast.error('No se pudo crear la lección.');
    } finally {
      setCreatingLesson(false);
    }
  }

  async function handleMoveLesson(moduleId: string, lessonIndex: number, dir: 'up' | 'down') {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || !mod.lessons) return;
    const newLessons = [...mod.lessons];
    const ti = dir === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (ti < 0 || ti >= newLessons.length) return;

    [newLessons[lessonIndex], newLessons[ti]] = [newLessons[ti], newLessons[lessonIndex]];
    newLessons[lessonIndex].sort_order = lessonIndex + 1;
    newLessons[ti].sort_order = ti + 1;

    setModules((ms) => ms.map((m) => (m.id === moduleId ? { ...m, lessons: newLessons } : m)));
    try {
      await Promise.all([
        academyAPI.saveAdminLesson(newLessons[lessonIndex].id, {
          ...newLessons[lessonIndex],
          module_id: moduleId,
        }),
        academyAPI.saveAdminLesson(newLessons[ti].id, {
          ...newLessons[ti],
          module_id: moduleId,
        }),
      ]);
    } catch {
      toast.error('Error reordenando lecciones.');
      void load();
    }
  }

  async function handleToggleLessonPublish(moduleId: string, lesson: AcademyLesson) {
    try {
      const updated = await academyAPI.saveAdminLesson(lesson.id, {
        ...lesson,
        module_id: moduleId,
        is_published: !lesson.is_published,
      });
      setModules((ms) =>
        ms.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons?.map((l) => (l.id === lesson.id ? updated : l)) }
            : m
        )
      );
      toast.success(updated.is_published ? 'Lección publicada.' : 'Lección oculta.');
    } catch {
      toast.error('Error actualizando lección.');
    }
  }

  async function handleToggleLessonRequired(moduleId: string, lesson: AcademyLesson) {
    const nextReq = lesson.is_required === false ? true : false;
    try {
      const updated = await academyAPI.saveAdminLesson(lesson.id, {
        ...lesson,
        module_id: moduleId,
        is_required: nextReq,
      });
      setModules((ms) =>
        ms.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons?.map((l) => (l.id === lesson.id ? updated : l)) }
            : m
        )
      );
      toast.success(nextReq ? 'Marcada como obligatoria para el certificado.' : 'Marcada como lección opcional.');
    } catch {
      toast.error('Error actualizando requisito de la lección.');
    }
  }

  async function handleDuplicateLesson(moduleId: string, lesson: AcademyLesson) {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    try {
      const copy = await academyAPI.saveAdminLesson(null, {
        module_id: moduleId,
        title: `${lesson.title} (Copia)`,
        description: lesson.description,
        content_type: lesson.content_type,
        text_content: lesson.text_content,
        video_provider: lesson.video_provider,
        video_external_id: lesson.video_external_id,
        external_url: lesson.external_url,
        estimated_minutes: lesson.estimated_minutes,
        is_published: false,
        is_required: lesson.is_required ?? true,
        is_free_preview: lesson.is_free_preview,
        sort_order: (mod.lessons?.length ?? 0) + 1,
        metadata: lesson.metadata ?? {},
      });
      setModules((ms) =>
        ms.map((m) => (m.id === moduleId ? { ...m, lessons: [...(m.lessons ?? []), copy] } : m))
      );
      toast.success('Lección duplicada como borrador.');
    } catch {
      toast.error('No se pudo duplicar la lección.');
    }
  }

  async function handleDeleteLesson(moduleId: string, lesson: AcademyLesson) {
    if (!window.confirm(`¿Eliminar la lección "${lesson.title}"?`)) return;
    try {
      await academyAPI.deleteAdminLesson(lesson.id);
      setModules((ms) =>
        ms.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons?.filter((l) => l.id !== lesson.id) }
            : m
        )
      );
      toast.success('Lección eliminada.');
    } catch {
      toast.error('No se pudo eliminar la lección.');
    }
  }

  async function createAssessmentAndNavigate(moduleId: string | null, isFinal = false) {
    if (!courseId || creatingAssessment) return;
    setCreatingAssessment(true);
    try {
      const mod = moduleId ? modules.find((m) => m.id === moduleId) : null;
      const newAssessment = await academyAPI.saveAdminAssessment(null, {
        course_id: courseId,
        module_id: moduleId,
        title: isFinal
          ? `Examen Final — ${course?.title ?? 'Curso'}`
          : `Evaluación — ${mod?.title ?? 'Módulo'}`,
        description: 'Responde las preguntas para validar tu aprendizaje y obtener tu certificado.',
        passing_score: Number(form?.passing_percentage || 70),
        max_attempts: 3,
        time_limit_minutes: null,
        is_final_exam: isFinal,
        is_published: true,
        sort_order: assessments.length + 1,
        randomize_questions: false,
      });
      setAssessments((prev) => [...prev, newAssessment]);
      navigate(`${basePath}/academia/cursos/${courseId}/evaluaciones/${newAssessment.id}`);
    } catch {
      toast.error('No se pudo crear la evaluación.');
    } finally {
      setCreatingAssessment(false);
    }
  }

  async function handleDeleteAssessment(assessmentId: string, title: string) {
    if (!window.confirm(`¿Eliminar la evaluación "${title}"?`)) return;
    try {
      await academyAPI.deleteAdminAssessment(assessmentId);
      setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
      toast.success('Evaluación eliminada.');
    } catch {
      toast.error('No se pudo eliminar la evaluación.');
    }
  }

  const publishChecks = {
    hasTitle: Boolean(course?.title?.trim()),
    hasCover: Boolean(course?.cover_image_url),
    hasInstructor: Boolean(course?.instructor_id),
    hasModules: modules.length > 0,
    hasPublishedLesson: modules.some((m) => (m.lessons ?? []).some((l) => l.is_published)),
    get canPublish() {
      return this.hasTitle && this.hasModules && this.hasPublishedLesson;
    },
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'content', label: '1. Módulos y Lecciones', icon: <BookOpen size={16} /> },
    { id: 'general', label: '2. Datos y Portada', icon: <Info size={16} /> },
    { id: 'certification', label: '3. Certificado y Programa', icon: <Award size={16} /> },
    { id: 'completion', label: '4. Reglas de Aprobación', icon: <CheckCircle size={16} /> },
    { id: 'publication', label: '5. Estado y Publicación', icon: <Globe size={16} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#1A4E26]" size={36} />
      </div>
    );
  }

  if (!course || !form) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p>Curso no encontrado.</p>
        <Link to={`${basePath}/academia/cursos`} className="text-[#1A4E26] font-bold underline mt-2 block">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[calc(100vh-120px)]">
      {/* Top bar */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`${basePath}/academia/cursos`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F7F5] text-xs font-bold text-[#1A4E26] hover:bg-[#EBF4ED] transition-colors"
          >
            <ArrowLeft size={15} /> Catálogo de Cursos
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-[#111] truncate">{course.title}</h1>
              <StatusBadge status={course.status} />
            </div>
            <p className="text-xs text-slate-500">
              {modules.length} módulos · {modules.reduce((s, m) => s + (m.lessons?.length ?? 0), 0)} lecciones ·{' '}
              {assessments.length} evaluaciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/academia/cursos/${course.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#C8D8CB] text-xs font-bold text-[#1A4E26] hover:bg-[#EBF4ED] transition-colors"
          >
            <ExternalLink size={14} /> Vista Previa Alumno
          </Link>

          {course.status !== 'published' && (
            <button
              type="button"
              onClick={() => void changeStatus('published')}
              disabled={saving || !publishChecks.canPublish}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
              Publicar Curso
            </button>
          )}
        </div>
      </div>

      {/* Pestañas Horizontales / Laterales */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar de Pasos */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="bg-white border border-[#C8D8CB] rounded-2xl shadow-2xs overflow-hidden sticky top-4 flex lg:flex-col overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-3.5 text-xs sm:text-sm font-bold text-left transition-colors border-b border-slate-100 last:border-0 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#1A4E26] text-white'
                    : 'text-slate-600 hover:bg-[#F4F7F5]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de la Pestaña Activa */}
        <div className="flex-1 min-w-0">
          {/* TAB 1: MÓDULOS Y LECCIONES */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#111]">Estructura de Módulos, Lecciones y Evaluaciones</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organiza el curso por módulos. Dentro de cada módulo puedes agregar lecciones teóricas, videos, recetas paso a paso y cuestionarios.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void createAssessmentAndNavigate(null, true)}
                    disabled={creatingAssessment}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors cursor-pointer"
                  >
                    <ClipboardList size={15} /> + Examen Final del Curso
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddModuleModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1A4E26] text-white text-xs sm:text-sm font-black rounded-xl hover:bg-[#163F1E] transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus size={16} /> + Nuevo Módulo
                  </button>
                </div>
              </div>

              {modules.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-[#C8D8CB] rounded-2xl p-12 text-center space-y-3">
                  <BookOpen size={48} className="mx-auto text-[#1A4E26]/40" />
                  <p className="font-black text-base text-slate-700">Este curso aún no tiene módulos</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Los módulos son los capítulos principales del curso (por ejemplo: "Módulo 1: Anatomía y Prevención").
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddModuleModal(true)}
                    className="px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer"
                  >
                    + Crear Primer Módulo
                  </button>
                </div>
              ) : (
                modules.map((module, i) => {
                  const moduleAssessments = assessments.filter((a) => a.module_id === module.id && !a.is_final_exam);
                  return (
                    <ModuleRow
                      key={module.id}
                      module={module}
                      moduleIndex={i}
                      totalModules={modules.length}
                      courseId={courseId!}
                      basePath={basePath}
                      moduleAssessments={moduleAssessments}
                      onMoveUp={() => void moveModule(i, 'up')}
                      onMoveDown={() => void moveModule(i, 'down')}
                      onDelete={() => setDeleteTarget(module)}
                      onTogglePublish={() => void toggleModulePublish(module)}
                      onUpdateModule={(t, d) => void updateModuleInfo(module.id, t, d)}
                      onAddLesson={() => openNewLessonModal(module)}
                      onAddAssessment={() => void createAssessmentAndNavigate(module.id, false)}
                      onMoveLesson={(li, dir) => void handleMoveLesson(module.id, li, dir)}
                      onToggleLessonPublish={(lesson) => void handleToggleLessonPublish(module.id, lesson)}
                      onToggleLessonRequired={(lesson) => void handleToggleLessonRequired(module.id, lesson)}
                      onDuplicateLesson={(lesson) => void handleDuplicateLesson(module.id, lesson)}
                      onDeleteLesson={(lesson) => void handleDeleteLesson(module.id, lesson)}
                      onDeleteAssessment={(aId, aTitle) => void handleDeleteAssessment(aId, aTitle)}
                    />
                  );
                })
              )}

              {/* Exámenes generales o finales del curso */}
              {assessments.filter((a) => !a.module_id || a.is_final_exam).length > 0 && (
                <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <h3 className="font-black text-sm text-amber-950 flex items-center gap-2 uppercase tracking-wider">
                    <ClipboardList size={17} className="text-amber-700" /> Evaluaciones Generales / Examen Final del Curso
                  </h3>
                  <div className="space-y-2">
                    {assessments
                      .filter((a) => !a.module_id || a.is_final_exam)
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-3.5 bg-white border border-amber-200 rounded-xl shadow-2xs"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900">{a.title}</p>
                            <p className="text-xs text-amber-700">
                              Nota mínima: {a.passing_score}% · {a.is_published ? 'Publicada' : 'En borrador'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`${basePath}/academia/cursos/${courseId}/evaluaciones/${a.id}`}
                              className="px-3.5 py-1.5 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#143D1E]"
                            >
                              Editar Preguntas
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDeleteAssessment(a.id, a.title)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DATOS Y PORTADA */}
          {activeTab === 'general' && (
            <form
              onSubmit={handleSaveGeneral}
              className="bg-white border border-[#C8D8CB] rounded-2xl shadow-2xs p-6 space-y-5"
            >
              <h2 className="text-lg font-black text-[#111]">Datos Generales y Portada del Curso</h2>

              <div>
                <span className="text-sm font-bold text-[#111] block mb-2">Portada del Curso</span>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {course.cover_image_url || coverFile ? (
                    <div className="relative">
                      <img
                        src={coverFile ? URL.createObjectURL(coverFile) : course.cover_image_url!}
                        alt="Portada"
                        className="w-40 h-28 object-cover rounded-xl border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setCoverFile(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-40 h-28 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <BookOpen size={28} className="text-slate-300" />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer w-full">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 hover:border-[#1A4E26] hover:bg-[#F8FBF8] transition-colors text-center">
                      <Upload size={20} className="mx-auto text-[#1A4E26] mb-1" />
                      <span className="text-xs font-bold text-slate-700 block">
                        {coverFile ? coverFile.name : 'Haz clic para subir una nueva imagen de portada'}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">Formatos recomendados: JPG, PNG o WebP</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Título del Curso"
                  value={form.title}
                  required
                  onChange={(v) => {
                    setField('title', v);
                  }}
                />
                <Field
                  label="Identificador de Enlace (URL)"
                  value={form.slug}
                  required
                  onChange={(v) => setField('slug', slugify(v))}
                />
              </div>

              <Field
                label="Resumen Corto (Aparece en las tarjetas del catálogo)"
                value={form.short_description}
                onChange={(v) => setField('short_description', v)}
                placeholder="Resumen atractivo de 1 o 2 líneas..."
              />

              <label className="block">
                <span className="text-sm font-bold text-[#111] block mb-1">Descripción Completa del Curso</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={4}
                  placeholder="Describe a detalle lo que incluye el curso..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#111] block mb-1">
                  Requisitos Previos o ¿A quién va dirigido?
                </span>
                <textarea
                  value={form.prerequisites}
                  onChange={(e) => setField('prerequisites', e.target.value)}
                  rows={2}
                  placeholder="Ej: No requiere conocimientos médicos previos..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm"
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField
                  label="Categoría"
                  value={form.category_id}
                  onChange={(v) => setField('category_id', v)}
                  options={[
                    { value: '', label: 'Sin categoría' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
                <SelectField
                  label="Expositor / Instructor"
                  value={form.instructor_id}
                  onChange={(v) => setField('instructor_id', v)}
                  options={[
                    { value: '', label: 'Sin expositor asignado' },
                    ...instructors.map((i) => ({ value: i.id, label: i.nombre_completo })),
                  ]}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <SelectField
                  label="Nivel"
                  value={form.level}
                  onChange={(v) => setField('level', v)}
                  options={[
                    { value: 'all', label: 'Todos los niveles' },
                    { value: 'beginner', label: 'Inicial' },
                    { value: 'intermediate', label: 'Intermedio' },
                    { value: 'advanced', label: 'Avanzado' },
                  ]}
                />
                <SelectField
                  label="Modalidad de Acceso"
                  value={form.access_mode}
                  onChange={(v) => setField('access_mode', v)}
                  options={[
                    { value: 'free_registered', label: 'Gratis registrado' },
                    { value: 'premium', label: 'De Pago / Premium' },
                    { value: 'sumak_exclusive', label: 'Exclusivo Afiliados SUMAK' },
                    { value: 'public', label: 'Público Abierto' },
                    { value: 'assigned', label: 'Solo Asignado' },
                  ]}
                />
                <Field
                  label="Duración Estimada (minutos)"
                  value={form.estimated_duration_minutes}
                  onChange={(v) => setField('estimated_duration_minutes', v)}
                  type="number"
                  min="0"
                />
              </div>

              <Field
                label="Precio del Curso en USD ($0 = Gratuito)"
                value={form.price}
                onChange={(v) => setField('price', v)}
                type="number"
                min="0"
                step="0.01"
              />

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving || uploadingCover}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
                >
                  {saving || uploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {uploadingCover ? 'Subiendo portada...' : saving ? 'Guardando...' : 'Guardar Información'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CERTIFICADO Y PROGRAMA */}
          {activeTab === 'certification' && (
            <form
              onSubmit={handleSaveCertification}
              className="bg-white border border-[#C8D8CB] rounded-2xl shadow-2xs p-6 space-y-6"
            >
              <div>
                <h2 className="text-lg font-black text-[#111]">Certificado del Curso y Vinculación a Programas</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Configura la emisión automática del Certificado de Curso y define si este curso suma para un Diploma de Programa.
                </p>
              </div>

              <label className="flex items-start gap-3 p-4 bg-[#EBF4ED] border border-[#1A4E26]/30 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.generates_certificate}
                  onChange={(e) => setField('generates_certificate', e.target.checked)}
                  className="w-5 h-5 accent-[#1A4E26] mt-0.5"
                />
                <div>
                  <span className="font-black text-sm text-[#0F2E18] block">
                    Emitir Certificado Oficial de Curso automáticamente
                  </span>
                  <span className="text-xs text-[#2D5A37]">
                    Mientras el alumno esté cursando, verá "Certificado Pendiente (En curso)". Al completar el 100% de las lecciones obligatorias y evaluaciones, su certificado con QR se emitirá automáticamente.
                  </span>
                </div>
              </label>

              {/* Vinculación directa con Programas de Especialización */}
              <div className="p-5 bg-[#F8FBF8] border border-[#C8D8CB] rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap size={18} className="text-[#1A4E26]" />
                  <h3 className="text-sm font-black text-[#111]">
                    ¿Este curso forma parte de un Programa de Especialización (Diploma)?
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Marca los programas a los que pertenece este curso. Cuando un estudiante complete todos los cursos de un programa, recibirá automáticamente el <strong>Diploma Oficial del Programa</strong>.
                </p>

                {programs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay programas creados aún.</p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {programs.map((prog) => {
                      const isLinked = (prog.courses ?? []).some((pc: any) => pc.course_id === courseId);
                      return (
                        <div
                          key={prog.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                            isLinked ? 'bg-white border-[#1A4E26]' : 'bg-white/60 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              onChange={() => void handleToggleProgramLink(prog)}
                              className="w-4 h-4 accent-[#1A4E26] cursor-pointer"
                            />
                            <div>
                              <p className="text-sm font-bold text-[#111]">{prog.title}</p>
                              <p className="text-xs text-slate-500">
                                {(prog.courses ?? []).length} cursos vinculados en este programa
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isLinked ? 'bg-emerald-100 text-[#1A4E26]' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isLinked ? 'Incluido en el Programa' : 'No incluido'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar Configuración de Certificación
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: REGLAS DE APROBACIÓN */}
          {activeTab === 'completion' && (
            <form
              onSubmit={handleSaveCompletion}
              className="bg-white border border-[#C8D8CB] rounded-2xl shadow-2xs p-6 space-y-5"
            >
              <div>
                <h2 className="text-lg font-black text-[#111]">Reglas de Aprobación del Curso</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Define la calificación mínima que debe obtener el estudiante si el curso incluye cuestionarios o exámenes.
                </p>
              </div>

              <div className="p-4 bg-[#F8FBF8] rounded-xl border border-[#C8D8CB]">
                <span className="text-sm font-bold text-[#111] block mb-1">
                  Calificación mínima para aprobar evaluaciones
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={form.passing_percentage}
                    onChange={(e) => setField('passing_percentage', e.target.value)}
                    className="flex-1 accent-[#1A4E26]"
                  />
                  <span className="text-xl font-black text-[#1A4E26] w-16 text-right">
                    {form.passing_percentage}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#F8FBF8] rounded-xl border border-[#C8D8CB] space-y-2">
                <p className="text-sm font-bold text-[#111]">¿Cómo se aprueba automáticamente el curso?</p>
                {[
                  'El estudiante debe completar todas las lecciones marcadas como "🎓 Obligatoria".',
                  'Si el curso tiene evaluaciones publicadas, el estudiante debe aprobarlas.',
                  'Al cumplir ambos requisitos, el Certificado Oficial se emite de inmediato.',
                ].map((r) => (
                  <div key={r} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                    <Check size={14} className="text-[#1A4E26] shrink-0" /> {r}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar Reglas
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: PUBLICACIÓN */}
          {activeTab === 'publication' && (
            <div className="bg-white border border-[#C8D8CB] rounded-2xl shadow-2xs p-6 space-y-5">
              <div>
                <h2 className="text-lg font-black text-[#111]">Lista de Verificación y Publicación</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Comprueba que el curso tenga todos sus elementos listos para los estudiantes.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <CheckItem ok={publishChecks.hasTitle} label="Título y enlace configurados" />
                <CheckItem ok={publishChecks.hasCover} label="Imagen de portada asignada" />
                <CheckItem ok={publishChecks.hasInstructor} label="Expositor / Instructor asignado" />
                <CheckItem ok={publishChecks.hasModules} label="Al menos un módulo creado" />
                <CheckItem ok={publishChecks.hasPublishedLesson} label="Al menos una lección publicada" />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {course.status !== 'published' && (
                  <button
                    type="button"
                    onClick={() => void changeStatus('published')}
                    disabled={saving || !publishChecks.canPublish}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                  >
                    <Globe size={16} /> Publicar Curso Ahora
                  </button>
                )}
                {course.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => window.confirm('¿Archivar este curso?') && void changeStatus('archived')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Archivar Curso
                  </button>
                )}
                {course.status !== 'draft' && (
                  <button
                    type="button"
                    onClick={() => window.confirm('¿Pasar este curso a borrador?') && void changeStatus('draft')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Pasar a Borrador
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: CREAR NUEVO MÓDULO ── */}
      <Modal
        open={addModuleModal}
        onClose={() => setAddModuleModal(false)}
        title="Crear Nuevo Módulo"
        subtitle="Los módulos dividen el curso en unidades o temas ordenados."
      >
        <div className="p-6 space-y-4">
          <Field
            label="Nombre del Módulo *"
            value={newModuleTitle}
            onChange={setNewModuleTitle}
            required
            placeholder={`Ej: Módulo ${modules.length + 1}: Fundamentos Clínicos y Recetas`}
          />
          <label className="block">
            <span className="text-sm font-bold text-[#111] block mb-1">
              Descripción u Objetivo del Módulo (Opcional)
            </span>
            <textarea
              value={newModuleDesc}
              onChange={(e) => setNewModuleDesc(e.target.value)}
              rows={2}
              placeholder="Ej: En este módulo aprenderemos las causas, síntomas y preparación herbal..."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModuleModal(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void addModule()}
              disabled={!newModuleTitle.trim()}
              className="px-5 py-2 bg-[#1A4E26] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer"
            >
              Crear Módulo
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL ASISTENTE: CREAR NUEVA LECCIÓN ── */}
      <Modal
        open={Boolean(lessonPickerModule)}
        onClose={() => setLessonPickerModule(null)}
        title="Crear Nueva Lección"
        subtitle={`Se agregará dentro de: ${lessonPickerModule?.title ?? ''}`}
        size="lg"
      >
        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <Field
                label="Título de la Lección *"
                value={newLessonTitle}
                onChange={setNewLessonTitle}
                required
                placeholder="Ej: Lección 1: Anatomía Urinaria y Hábitos de Prevención"
              />
            </div>
            <div>
              <Field
                label="Duración (min)"
                value={newLessonMinutes}
                onChange={setNewLessonMinutes}
                type="number"
                min="1"
              />
            </div>
          </div>

          <Field
            label="Resumen o Subtítulo de la Lección (Opcional)"
            value={newLessonDesc}
            onChange={setNewLessonDesc}
            placeholder="Ej: Estudio de la función renal, síntomas de alerta y protocolo SUMAK."
          />

          <div>
            <p className="text-sm font-bold text-[#111] mb-2.5">¿Qué formato tendrá esta lección?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  type: 'text' as ContentType,
                  icon: '📄',
                  label: 'Lección Teórica / Ilustrada + Receta',
                  desc: 'Texto clínico, imágenes, síntomas, receta paso a paso y productos',
                },
                {
                  type: 'video' as ContentType,
                  icon: '🎥',
                  label: 'Clase en Video (YouTube / Zoom / Vimeo)',
                  desc: 'Video principal acompañado de apuntes y fichas botánicas',
                },
                {
                  type: 'mixed' as ContentType,
                  icon: '🎯',
                  label: 'Clase Mixta (Video + Guía Completa)',
                  desc: 'Combina video superior con teoría, receta y productos',
                },
                {
                  type: 'pdf' as ContentType,
                  icon: '📎',
                  label: 'Documento PDF / Presentación',
                  desc: 'Sube un archivo PDF para lectura y descarga directa',
                },
              ].map(({ type, icon, label, desc }) => {
                const active = newLessonType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewLessonType(type)}
                    className={`flex items-start gap-3 p-3.5 border rounded-xl text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#1A4E26] bg-[#EBF4ED] ring-2 ring-[#1A4E26]/20'
                        : 'border-slate-200 hover:border-[#1A4E26] bg-white'
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-[#111] block">{label}</span>
                      <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">{desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F4F7F5] border border-[#C8D8CB] cursor-pointer">
              <input
                type="checkbox"
                checked={newLessonPublished}
                onChange={(e) => setNewLessonPublished(e.target.checked)}
                className="w-4 h-4 accent-[#1A4E26]"
              />
              <span className="text-xs font-bold text-[#111]">Publicar inmediatamente (Visible para alumnos)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F4F7F5] border border-[#C8D8CB] cursor-pointer">
              <input
                type="checkbox"
                checked={newLessonRequired}
                onChange={(e) => setNewLessonRequired(e.target.checked)}
                className="w-4 h-4 accent-[#1A4E26]"
              />
              <span className="text-xs font-bold text-[#111]">Obligatoria para obtener el Certificado</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLessonPickerModule(null)}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={creatingLesson || !newLessonTitle.trim()}
              onClick={() => void handleCreateLesson(false)}
              className="px-4 py-2.5 rounded-xl border border-[#1A4E26] text-[#1A4E26] font-bold text-xs sm:text-sm hover:bg-[#EBF4ED] disabled:opacity-50 cursor-pointer"
            >
              Crear y Quedarme Aquí
            </button>
            <button
              type="button"
              disabled={creatingLesson || !newLessonTitle.trim()}
              onClick={() => void handleCreateLesson(true)}
              className="px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-black text-xs sm:text-sm hover:bg-[#143D1E] disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {creatingLesson ? 'Creando...' : 'Crear y Redactar Contenido →'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: CONFIRMAR ELIMINAR MÓDULO ── */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Módulo"
        subtitle="Esta acción no se puede deshacer."
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás segura de eliminar el módulo <strong>"{deleteTarget?.title}"</strong>
            {(deleteTarget?.lessons?.length ?? 0) > 0
              ? ` junto con sus ${deleteTarget?.lessons?.length} lecciones`
              : ''}
            ?
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm font-bold text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => deleteTarget && void deleteModule(deleteTarget)}
              className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 cursor-pointer"
            >
              Sí, Eliminar Módulo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
