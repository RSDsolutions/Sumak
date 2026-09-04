import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowUp, ArrowDown, BookOpen, Check, ChevronRight, Eye, EyeOff,
  ExternalLink, FileText, Globe, GripVertical, Layers, Loader2, Pencil, Plus,
  PlayCircle, Save, Trash2, Upload, X, Award, CheckCircle, AlertCircle, Info,
  ClipboardList
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyCourse, AcademyCategory, AcademyModule, AcademyLesson, ContentType } from '../../../lib/academy-types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'content' | 'completion' | 'certification' | 'publication';

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
  return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

// ─── Small helpers ────────────────────────────────────────────────────────────

function LessonIcon({ type }: { type: ContentType }) {
  const map: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    video: { icon: <PlayCircle size={15} />, bg: 'bg-red-50', color: 'text-red-500' },
    text: { icon: <FileText size={15} />, bg: 'bg-blue-50', color: 'text-blue-500' },
    pdf: { icon: <FileText size={15} />, bg: 'bg-orange-50', color: 'text-orange-500' },
    external_link: { icon: <ExternalLink size={15} />, bg: 'bg-purple-50', color: 'text-purple-500' },
    assessment: { icon: <ClipboardList size={15} />, bg: 'bg-amber-50', color: 'text-amber-600' },
    mixed: { icon: <Layers size={15} />, bg: 'bg-indigo-50', color: 'text-indigo-500' },
    presentation: { icon: <FileText size={15} />, bg: 'bg-pink-50', color: 'text-pink-500' },
    image: { icon: <FileText size={15} />, bg: 'bg-teal-50', color: 'text-teal-500' },
  };
  const { icon, bg, color } = map[type] ?? map.text;
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${bg} ${color}`}>{icon}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Borrador', cls: 'bg-amber-100 text-amber-700' },
    published: { label: 'Publicado', cls: 'bg-green-100 text-green-700' },
    archived: { label: 'Archivado', cls: 'bg-slate-100 text-slate-500' },
  };
  const { label, cls } = map[status] ?? map.draft;
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      {ok
        ? <CheckCircle size={18} className="text-[#1A4E26] shrink-0" />
        : <AlertCircle size={18} className="text-amber-500 shrink-0" />}
      <span className={`text-sm ${ok ? 'text-[#111]' : 'text-amber-700'}`}>{label}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', min, max, step, required = false, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; min?: string; max?: string; step?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#111] block mb-1">{label}</span>
      <input required={required} type={type} min={min} max={max} step={step} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#111] block mb-1">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ─── Module Row ───────────────────────────────────────────────────────────────

function ModuleRow({
  module, moduleIndex, totalModules, courseId,
  onMoveUp, onMoveDown, onDelete, onTogglePublish, onUpdateTitle, onAddLesson,
}: {
  module: AcademyModule; moduleIndex: number; totalModules: number; courseId: string;
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
  onTogglePublish: () => void; onUpdateTitle: (t: string) => void; onAddLesson: () => void;
}) {
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(module.title);
  const [expanded, setExpanded] = useState(true);

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleVal.trim();
    if (trimmed && trimmed !== module.title) onUpdateTitle(trimmed);
    else setTitleVal(module.title);
  }

  const contentTypeLabel: Record<string, string> = {
    video: 'Video', text: 'Texto', pdf: 'PDF', external_link: 'Enlace',
    assessment: 'Evaluación', mixed: 'Mixto', presentation: 'Presentación', image: 'Imagen',
  };

  return (
    <div className={`rounded-2xl border transition-all shadow-sm mb-3 ${module.is_published ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/60'}`}>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex flex-col gap-0.5 text-slate-300 shrink-0">
          <button type="button" onClick={onMoveUp} disabled={moduleIndex === 0}
            className="hover:text-[#1A4E26] disabled:opacity-25 transition-colors" title="Subir">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={moduleIndex === totalModules - 1}
            className="hover:text-[#1A4E26] disabled:opacity-25 transition-colors" title="Bajar">
            <ArrowDown size={14} />
          </button>
        </div>
        <GripVertical size={16} className="text-slate-300 shrink-0" />
        <button type="button" onClick={() => setExpanded(e => !e)}
          className="text-slate-400 hover:text-[#1A4E26] transition-colors shrink-0">
          <ChevronRight size={18} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Módulo {module.sort_order}
          </span>
          {editingTitle ? (
            <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(module.title); } }}
              className="w-full font-bold text-[#111] bg-transparent border-b-2 border-[#1A4E26] outline-none" />
          ) : (
            <button type="button" onClick={() => setEditingTitle(true)}
              className={`text-left font-bold text-base hover:text-[#1A4E26] transition-colors flex items-center gap-1.5 group ${module.is_published ? 'text-[#111]' : 'text-slate-400'}`}>
              {module.title}
              <Pencil size={13} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={onTogglePublish}
            className={`p-1.5 rounded-lg transition-colors ${module.is_published ? 'text-[#1A4E26] hover:bg-[#E8F2EA]' : 'text-slate-400 hover:bg-slate-100'}`}
            title={module.is_published ? 'Ocultar' : 'Publicar'}>
            {module.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button type="button" onClick={onDelete}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
            <Trash2 size={16} />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button type="button" onClick={onAddLesson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors">
            <Plus size={14} /> Lección
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {(module.lessons ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 italic">Sin lecciones aún.</p>
          ) : (
            (module.lessons ?? []).map((lesson, li) => (
              <div key={lesson.id}
                className={`flex items-center gap-3 px-5 py-2.5 group hover:bg-slate-50 transition-colors ${!lesson.is_published ? 'opacity-60' : ''}`}>
                <LessonIcon type={lesson.content_type} />
                <button type="button"
                  onClick={() => navigate(`/admin/academia/cursos/${courseId}/lecciones/${lesson.id}`)}
                  className="flex-1 text-left min-w-0">
                  <span className="font-semibold text-sm text-[#111] group-hover:text-[#1A4E26] transition-colors block truncate">
                    {lesson.sort_order}. {lesson.title}
                  </span>
                  <span className="text-xs text-slate-400">
                    {contentTypeLabel[lesson.content_type] ?? lesson.content_type}
                    {lesson.estimated_minutes ? ` · ${lesson.estimated_minutes} min` : ''}
                    {!lesson.is_published ? ' · Oculta' : ''}
                  </span>
                </button>
                <button type="button"
                  onClick={() => navigate(`/admin/academia/cursos/${courseId}/lecciones/${lesson.id}`)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#E8F2EA] text-[#1A4E26] transition-all shrink-0"
                  title={`Editar lección ${li + 1}`}>
                  <Pencil size={15} />
                </button>
              </div>
            ))
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
  const toast = useToast();

  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [diplomaTypes, setDiplomaTypes] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [form, setForm] = useState<CourseForm | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [addModuleModal, setAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [lessonPickerModule, setLessonPickerModule] = useState<AcademyModule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademyModule | null>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [c, mods, cats, insts, dTypes, asmnts] = await Promise.all([
        academyAPI.getAdminCourseById(courseId),
        academyAPI.getAdminCourseContent(courseId),
        academyAPI.getAdminCategories(),
        academyAPI.getAdminInstructors(),
        academyAPI.getAdminDiplomaTypes(),
        academyAPI.getAdminAssessments(courseId),
      ]);
      setCourse(c);
      setForm(courseToForm(c));
      setModules(mods);
      setCategories(cats);
      setInstructors(insts);
      setDiplomaTypes(dTypes);
      setAssessments(asmnts);
    } catch {
      toast.error('No se pudo cargar el curso.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  function setField<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setForm(f => f ? { ...f, [key]: value } : f);
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
        title: form.title.trim(), slug: form.slug.trim(),
        short_description: form.short_description || null,
        description: form.description || null,
        category_id: form.category_id || null,
        instructor_id: form.instructor_id || null,
        level: form.level as any, access_mode: form.access_mode as any,
        estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
        prerequisites: form.prerequisites || null,
        price: Number(form.price),
        cover_image_url: coverUrl,
      });
      setCourse(updated);
      toast.success('Información guardada.');
    } catch { toast.error('Error guardando la información.'); }
    finally { setSaving(false); setUploadingCover(false); }
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
      toast.success('Reglas guardadas.');
    } catch { toast.error('Error guardando.'); }
    finally { setSaving(false); }
  }

  async function handleSaveCertification(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !courseId) return;
    setSaving(true);
    try {
      const updated = await academyAPI.patchAdminCourse(courseId, { generates_certificate: form.generates_certificate });
      setCourse(updated);
      toast.success('Certificación guardada.');
    } catch { toast.error('Error guardando.'); }
    finally { setSaving(false); }
  }

  async function changeStatus(status: 'draft' | 'published' | 'archived') {
    if (!courseId) return;
    setSaving(true);
    try {
      const updated = await academyAPI.patchAdminCourse(courseId, { status });
      setCourse(updated);
      setForm(f => f ? { ...f } : f);
      toast.success(status === 'published' ? 'Curso publicado.' : status === 'archived' ? 'Curso archivado.' : 'Vuelto a borrador.');
    } catch { toast.error('Error actualizando estado.'); }
    finally { setSaving(false); }
  }

  async function addModule() {
    if (!courseId || !newModuleTitle.trim()) return;
    try {
      const m = await academyAPI.saveAdminModule(null, {
        course_id: courseId, title: newModuleTitle.trim(), description: '',
        sort_order: modules.length + 1, is_published: true,
      });
      setModules(ms => [...ms, { ...m, lessons: [] }]);
      setNewModuleTitle('');
      setAddModuleModal(false);
      toast.success('Módulo creado.');
    } catch { toast.error('No se pudo crear el módulo.'); }
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
    } catch { toast.error('Error reordenando.'); void load(); }
  }

  async function updateModuleTitle(moduleId: string, title: string) {
    try {
      await academyAPI.patchAdminModule(moduleId, { title });
      setModules(ms => ms.map(m => m.id === moduleId ? { ...m, title } : m));
    } catch { toast.error('Error actualizando título.'); }
  }

  async function toggleModulePublish(module: AcademyModule) {
    if (!courseId) return;
    try {
      const updated = await academyAPI.saveAdminModule(module.id, { ...module, course_id: courseId, is_published: !module.is_published });
      setModules(ms => ms.map(m => m.id === module.id ? { ...m, is_published: updated.is_published } : m));
    } catch { toast.error('Error actualizando módulo.'); }
  }

  async function deleteModule(module: AcademyModule) {
    if ((module.lessons?.length ?? 0) > 0) { toast.error('Elimina primero las lecciones.'); setDeleteTarget(null); return; }
    try {
      await academyAPI.deleteAdminModule(module.id);
      setModules(ms => ms.filter(m => m.id !== module.id));
      toast.success('Módulo eliminado.');
    } catch { toast.error('Error eliminando módulo.'); }
    setDeleteTarget(null);
  }

  async function createLessonAndNavigate(moduleId: string, contentType: ContentType) {
    if (!courseId) return;
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    try {
      const lesson = await academyAPI.saveAdminLesson(null, {
        module_id: moduleId, title: 'Nueva lección',
        content_type: contentType, sort_order: (mod.lessons?.length ?? 0) + 1,
        is_published: false, is_free_preview: false, metadata: {},
      });
      setLessonPickerModule(null);
      navigate(`/admin/academia/cursos/${courseId}/lecciones/${lesson.id}`);
    } catch { toast.error('No se pudo crear la lección.'); }
  }

  const publishChecks = {
    hasTitle: Boolean(course?.title?.trim()),
    hasCover: Boolean(course?.cover_image_url),
    hasInstructor: Boolean(course?.instructor_id),
    hasModules: modules.length > 0,
    hasPublishedLesson: modules.some(m => (m.lessons ?? []).some(l => l.is_published)),
    get canPublish() { return this.hasTitle && this.hasModules && this.hasPublishedLesson; },
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'Información', icon: <Info size={16} /> },
    { id: 'content', label: 'Contenido', icon: <BookOpen size={16} /> },
    { id: 'completion', label: 'Finalización', icon: <CheckCircle size={16} /> },
    { id: 'certification', label: 'Certificación', icon: <Award size={16} /> },
    { id: 'publication', label: 'Publicación', icon: <Globe size={16} /> },
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
        <Link to="/admin/academia/cursos" className="text-[#1A4E26] font-bold underline mt-2 block">Volver</Link>
      </div>
    );
  }

  return (
    <div className="space-y-0 min-h-[calc(100vh-120px)]">

      {/* Top bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link to="/admin/academia/cursos"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#1A4E26] transition-colors">
          <ArrowLeft size={16} /> Cursos
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-bold text-[#111] truncate max-w-xs">{course.title}</span>
        <StatusBadge status={course.status} />
        <div className="flex-1" />
        {course.status !== 'published' && (
          <button type="button" onClick={() => changeStatus('published')}
            disabled={saving || !publishChecks.canPublish}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white text-sm font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            Publicar
          </button>
        )}
      </div>

      {/* Layout */}
      <div className="flex gap-5">

        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-4">
            {tabs.map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-left transition-colors border-b border-slate-50 last:border-0
                  ${activeTab === tab.id ? 'bg-[#E8F2EA] text-[#1A4E26]' : 'text-slate-600 hover:bg-slate-50'}`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">

          {/* TAB: General */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <h2 className="text-lg font-black text-[#111]">Información general</h2>

              {/* Cover */}
              <div>
                <span className="text-sm font-semibold text-[#111] block mb-2">Portada del curso</span>
                <div className="flex items-start gap-4">
                  {(course.cover_image_url || coverFile) ? (
                    <div className="relative">
                      <img src={coverFile ? URL.createObjectURL(coverFile) : course.cover_image_url!}
                        alt="Portada" className="w-28 h-20 object-cover rounded-xl border border-slate-200" />
                      <button type="button" onClick={() => setCoverFile(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <BookOpen size={24} className="text-slate-300" />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-[#1A4E26] hover:bg-[#F8FBF8] transition-colors text-center">
                      <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">
                        {coverFile ? coverFile.name : 'Subir portada'}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP</p>
                    </div>
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={e => setCoverFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Título" value={form.title} required
                  onChange={v => { setField('title', v); setField('slug', slugify(v)); }} />
                <Field label="Slug (URL)" value={form.slug} required onChange={v => setField('slug', slugify(v))} />
              </div>

              <Field label="Descripción corta" value={form.short_description}
                onChange={v => setField('short_description', v)} placeholder="Resumen breve" />

              <label className="block">
                <span className="text-sm font-semibold text-[#111] block mb-1">Descripción completa</span>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                  rows={4} placeholder="Descripción detallada..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm" />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[#111] block mb-1">Requisitos previos</span>
                <textarea value={form.prerequisites} onChange={e => setField('prerequisites', e.target.value)}
                  rows={2} placeholder="¿Qué debe saber el estudiante antes de este curso?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm" />
              </label>

              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField label="Categoría" value={form.category_id} onChange={v => setField('category_id', v)}
                  options={[{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
                <SelectField label="Instructor" value={form.instructor_id} onChange={v => setField('instructor_id', v)}
                  options={[{ value: '', label: 'Sin instructor' }, ...instructors.map(i => ({ value: i.id, label: i.nombre_completo }))]} />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <SelectField label="Nivel" value={form.level} onChange={v => setField('level', v)}
                  options={[{ value: 'beginner', label: 'Inicial' }, { value: 'intermediate', label: 'Intermedio' }, { value: 'advanced', label: 'Avanzado' }, { value: 'all', label: 'Todos' }]} />
                <SelectField label="Modo de acceso" value={form.access_mode} onChange={v => setField('access_mode', v)}
                  options={[{ value: 'free_registered', label: 'Gratis registrado' }, { value: 'sumak_exclusive', label: 'Exclusivo SUMAK' }, { value: 'premium', label: 'Premium' }, { value: 'public', label: 'Público' }, { value: 'assigned', label: 'Asignado' }, { value: 'hidden', label: 'Oculto' }]} />
                <Field label="Duración (min)" value={form.estimated_duration_minutes}
                  onChange={v => setField('estimated_duration_minutes', v)} type="number" min="0" />
              </div>

              <Field label="Precio (USD)" value={form.price} onChange={v => setField('price', v)} type="number" min="0" step="0.01" />

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button type="submit" disabled={saving || uploadingCover}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm">
                  {(saving || uploadingCover) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {uploadingCover ? 'Subiendo...' : saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}

          {/* TAB: Content */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#111]">Contenido del curso</h2>
                  <p className="text-sm text-slate-500">
                    {modules.length} módulo{modules.length !== 1 ? 's' : ''} ·{' '}
                    {modules.reduce((s, m) => s + (m.lessons?.length ?? 0), 0)} lecciones
                  </p>
                </div>
                <button type="button" onClick={() => setAddModuleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white text-sm font-bold rounded-xl hover:bg-[#163F1E] transition-colors shadow-sm">
                  <Plus size={16} /> Módulo
                </button>
              </div>

              {modules.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-500 mb-1">Sin módulos aún</p>
                  <p className="text-sm text-slate-400 mb-4">Los módulos agrupan las lecciones del curso.</p>
                  <button type="button" onClick={() => setAddModuleModal(true)}
                    className="px-4 py-2 bg-[#1A4E26] text-white font-bold text-sm rounded-xl">
                    + Añadir primer módulo
                  </button>
                </div>
              ) : modules.map((module, i) => (
                <ModuleRow key={module.id} module={module} moduleIndex={i} totalModules={modules.length}
                  courseId={courseId!}
                  onMoveUp={() => moveModule(i, 'up')} onMoveDown={() => moveModule(i, 'down')}
                  onDelete={() => setDeleteTarget(module)}
                  onTogglePublish={() => toggleModulePublish(module)}
                  onUpdateTitle={t => updateModuleTitle(module.id, t)}
                  onAddLesson={() => setLessonPickerModule(module)} />
              ))}

              {assessments.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <ClipboardList size={16} /> Evaluaciones ({assessments.length})
                  </h3>
                  <div className="space-y-1.5">
                    {assessments.map(a => (
                      <Link key={a.id} to={`/admin/academia/cursos/${courseId}/evaluaciones/${a.id}`}
                        className="flex items-center justify-between p-2.5 bg-white border border-amber-100 rounded-xl hover:border-amber-300 transition-colors group">
                        <span className="text-sm font-semibold text-amber-900 group-hover:text-[#1A4E26]">{a.title}</span>
                        <span className="text-xs text-amber-600">{a.questions?.length ?? 0} preguntas · {a.passing_score}%</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Completion */}
          {activeTab === 'completion' && (
            <form onSubmit={handleSaveCompletion} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-lg font-black text-[#111]">Reglas de finalización</h2>
                <p className="text-sm text-slate-500 mt-0.5">Define qué debe cumplir el estudiante para completar el curso.</p>
              </div>

              <div className="p-4 bg-[#F8FBF8] rounded-xl border border-[#C8D8CB]">
                <span className="text-sm font-semibold text-[#111] block mb-1">Porcentaje mínimo de aprobación</span>
                <p className="text-xs text-slate-500 mb-2">El estudiante debe alcanzar este porcentaje en las evaluaciones.</p>
                <div className="flex items-center gap-3">
                  <input type="range" min="50" max="100" step="5" value={form.passing_percentage}
                    onChange={e => setField('passing_percentage', e.target.value)}
                    className="flex-1 accent-[#1A4E26]" />
                  <span className="text-lg font-black text-[#1A4E26] w-14 text-right">{form.passing_percentage}%</span>
                </div>
              </div>

              <div className="p-4 bg-[#F8FBF8] rounded-xl border border-[#C8D8CB] space-y-2.5">
                <p className="text-sm font-semibold text-[#111]">Reglas fijas del Completion Engine</p>
                {[
                  'Completar todas las lecciones publicadas',
                  'Aprobar todas las evaluaciones publicadas',
                  `Alcanzar el ${form.passing_percentage}% mínimo en evaluaciones`,
                ].map(r => (
                  <div key={r} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check size={14} className="text-[#1A4E26] shrink-0" /> {r}
                  </div>
                ))}
                <p className="text-xs text-slate-400 italic pt-1">
                  Estas reglas se validan exclusivamente en el backend y no pueden desactivarse desde aquí.
                </p>
              </div>

              <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#1A4E26] transition-colors">
                <input type="checkbox" checked={form.generates_certificate}
                  onChange={e => setField('generates_certificate', e.target.checked)}
                  className="w-4 h-4 accent-[#1A4E26]" />
                <div>
                  <span className="font-semibold text-sm text-[#111] block">Generar certificado al completar</span>
                  <span className="text-xs text-slate-500">El estudiante recibirá un certificado al cumplir todos los requisitos.</span>
                </div>
              </label>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar reglas
                </button>
              </div>
            </form>
          )}

          {/* TAB: Certification */}
          {activeTab === 'certification' && (
            <form onSubmit={handleSaveCertification} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-lg font-black text-[#111]">Certificación</h2>
                <p className="text-sm text-slate-500 mt-0.5">Configura si este curso emite certificado al ser completado.</p>
              </div>

              <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#1A4E26] transition-colors">
                <input type="checkbox" checked={form.generates_certificate}
                  onChange={e => setField('generates_certificate', e.target.checked)}
                  className="w-4 h-4 accent-[#1A4E26]" />
                <div>
                  <span className="font-semibold text-sm text-[#111] block">Este curso genera certificado</span>
                  <span className="text-xs text-slate-500">Al completar, el estudiante recibe automáticamente un certificado de finalización.</span>
                </div>
              </label>

              {diplomaTypes.length > 0 && (
                <div className="p-4 bg-[#F8FBF8] border border-[#C8D8CB] rounded-xl">
                  <p className="text-sm font-semibold text-[#111] mb-1">Tipos de diploma disponibles (para programas)</p>
                  <p className="text-xs text-slate-500 mb-3">Si este curso pertenece a un programa, el diploma se configura en la sección Programas.</p>
                  <div className="space-y-2">
                    {diplomaTypes.map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <Award size={14} className="text-[#1A4E26]" />
                        <span className="font-medium">{d.name}</span>
                        <span className="text-slate-400">· {d.internal_code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar certificación
                </button>
              </div>
            </form>
          )}

          {/* TAB: Publication */}
          {activeTab === 'publication' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-lg font-black text-[#111]">Publicación</h2>
                <p className="text-sm text-slate-500 mt-0.5">Revisa que el curso esté listo antes de publicarlo.</p>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <CheckItem ok={publishChecks.hasTitle} label="Título y slug configurados" />
                <CheckItem ok={publishChecks.hasCover} label="Imagen de portada subida" />
                <CheckItem ok={publishChecks.hasInstructor} label="Instructor asignado" />
                <CheckItem ok={publishChecks.hasModules} label="Al menos un módulo creado" />
                <CheckItem ok={publishChecks.hasPublishedLesson} label="Al menos una lección publicada" />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-[#111] block">Estado actual</span>
                  {course.status === 'published' && course.published_at && (
                    <span className="text-xs text-slate-500">
                      Publicado el {new Date(course.published_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <StatusBadge status={course.status} />
              </div>

              <div className="flex flex-wrap gap-3">
                {course.status !== 'published' && (
                  <button type="button" onClick={() => changeStatus('published')}
                    disabled={saving || !publishChecks.canPublish}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-50 transition-colors shadow-sm">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                    Publicar curso
                  </button>
                )}
                {course.status === 'published' && (
                  <button type="button" onClick={() => confirm('¿Archivar este curso?') && changeStatus('archived')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                    Archivar
                  </button>
                )}
                {course.status !== 'draft' && (
                  <button type="button" onClick={() => confirm('¿Volver a borrador?') && changeStatus('draft')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                    Volver a borrador
                  </button>
                )}
              </div>

              {!publishChecks.canPublish && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <p className="font-semibold mb-1">Pendiente para publicar:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {!publishChecks.hasTitle && <li>Falta título o slug</li>}
                    {!publishChecks.hasModules && <li>Agrega al menos un módulo</li>}
                    {!publishChecks.hasPublishedLesson && <li>Publica al menos una lección</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal: Añadir módulo */}
      <Modal open={addModuleModal} onClose={() => setAddModuleModal(false)} title="Nuevo módulo" subtitle="Organiza el contenido en módulos temáticos.">
        <div className="p-6 space-y-4">
          <Field label="Nombre del módulo" value={newModuleTitle} onChange={setNewModuleTitle}
            required placeholder="Ej: Módulo 1 — Introducción" />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setAddModuleModal(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
            <button type="button" onClick={addModule} disabled={!newModuleTitle.trim()}
              className="px-4 py-2 bg-[#1A4E26] text-white font-bold text-sm rounded-xl disabled:opacity-50">
              Crear módulo
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Selector tipo lección */}
      <Modal open={Boolean(lessonPickerModule)} onClose={() => setLessonPickerModule(null)}
        title="Nueva lección" subtitle={`Módulo: ${lessonPickerModule?.title ?? ''}`}>
        <div className="p-6">
          <p className="text-sm font-semibold text-[#111] mb-3">¿Qué tipo de lección quieres crear?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'video' as ContentType, icon: '🎥', label: 'Video', desc: 'YouTube embed' },
              { type: 'text' as ContentType, icon: '📄', label: 'Contenido', desc: 'Texto / HTML' },
              { type: 'pdf' as ContentType, icon: '📎', label: 'Documento', desc: 'PDF, presentación' },
              { type: 'external_link' as ContentType, icon: '🔗', label: 'Enlace externo', desc: 'URL web' },
              { type: 'assessment' as ContentType, icon: '📝', label: 'Evaluación', desc: 'Quiz / Examen' },
              { type: 'mixed' as ContentType, icon: '🎯', label: 'Mixto', desc: 'Video + texto' },
            ].map(({ type, icon, label, desc }) => (
              <button key={type} type="button"
                onClick={() => lessonPickerModule && createLessonAndNavigate(lessonPickerModule.id, type)}
                className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl hover:border-[#1A4E26] hover:bg-[#F8FBF8] transition-colors text-left">
                <span className="text-2xl">{icon}</span>
                <div>
                  <span className="font-bold text-sm text-[#111] block">{label}</span>
                  <span className="text-xs text-slate-500">{desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmar eliminar módulo */}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}
        title="Eliminar módulo" subtitle="Esta acción no se puede deshacer.">
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            ¿Eliminar el módulo <strong>"{deleteTarget?.title}"</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
            <button type="button" onClick={() => deleteTarget && deleteModule(deleteTarget)}
              className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
