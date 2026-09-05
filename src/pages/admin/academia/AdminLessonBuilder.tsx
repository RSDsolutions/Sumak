import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Eye, EyeOff, ExternalLink, FileText, Loader2,
  PlayCircle, Save, Trash2, Upload, Plus, Lock, Unlock,
  CheckCircle, XCircle
} from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyLesson, AcademyModule, AcademyResource, ContentType } from '../../../lib/academy-types';

type LessonForm = {
  title: string;
  description: string;
  content_type: ContentType;
  text_content: string;
  video_external_id: string;
  external_url: string;
  estimated_minutes: string;
  is_published: boolean;
  is_free_preview: boolean;
  is_required: boolean;
};

function lessonToForm(l: AcademyLesson): LessonForm {
  return {
    title: l.title,
    description: l.description ?? '',
    content_type: l.content_type,
    text_content: l.text_content ?? '',
    video_external_id: l.video_external_id ?? '',
    external_url: l.external_url ?? '',
    estimated_minutes: l.estimated_minutes?.toString() ?? '',
    is_published: l.is_published,
    is_free_preview: l.is_free_preview,
    is_required: l.is_required ?? true,
  };
}

function extractYoutubeId(input: string): string {
  const patterns = [
    /(?:v=|\/embed\/|\.be\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return input.trim();
}

function Field({ label, value, onChange, type = 'text', placeholder = '', min, required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; min?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#111] block mb-1">{label}</span>
      <input required={required} type={type} min={min} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm" />
    </label>
  );
}

export default function AdminLessonBuilder() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const toast = useToast();

  const [lesson, setLesson] = useState<AcademyLesson | null>(null);
  const [module, setModule] = useState<AcademyModule | null>(null);
  const [resources, setResources] = useState<AcademyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [form, setForm] = useState<LessonForm | null>(null);

  // Resource form
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState('pdf');
  const [resUrl, setResUrl] = useState('');
  const [resFile, setResFile] = useState<File | null>(null);

  // Lesson specific upload state
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const load = useCallback(async () => {
    if (!lessonId || !courseId) return;
    setLoading(true);
    try {
      // Load modules to find the lesson's module
      const mods = await academyAPI.getAdminCourseContent(courseId);
      let foundLesson: AcademyLesson | null = null;
      let foundModule: AcademyModule | null = null;
      for (const m of mods) {
        const l = (m.lessons ?? []).find(l => l.id === lessonId);
        if (l) { foundLesson = l; foundModule = m; break; }
      }
      if (!foundLesson || !foundModule) throw new Error('Lección no encontrada');
      setLesson(foundLesson);
      setModule(foundModule);
      setForm(lessonToForm(foundLesson));
      setResources(await academyAPI.getAdminLessonResources(lessonId));
    } catch { toast.error('No se pudo cargar la lección.'); }
    finally { setLoading(false); }
  }, [lessonId, courseId]);

  useEffect(() => { void load(); }, [load]);

  function setField<K extends keyof LessonForm>(key: K, value: LessonForm[K]) {
    setForm(f => f ? { ...f, [key]: value } : f);
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form || !lesson || !module) return;
    setSaving(true);
    try {
      const vidId = form.content_type === 'video' ? extractYoutubeId(form.video_external_id) : null;
      const updated = await academyAPI.saveAdminLesson(lesson.id, {
        module_id: module.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        content_type: form.content_type,
        text_content: ['text', 'mixed'].includes(form.content_type) ? (form.text_content || null) : null,
        video_external_id: vidId,
        video_provider: vidId ? 'youtube' : null,
        external_url: ['external_link', 'pdf'].includes(form.content_type) ? (form.external_url || null) : null,
        estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
        is_published: form.is_published,
        is_free_preview: form.is_free_preview,
        is_required: form.is_required,
        sort_order: lesson.sort_order,
        metadata: lesson.metadata ?? {},
      });
      setLesson(updated);
      setForm(lessonToForm(updated));
      toast.success('Lección guardada.');
    } catch { toast.error('Error guardando la lección.'); }
    finally { setSaving(false); }
  }

  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    if (!lesson || !module || !courseId || !resTitle.trim()) return;
    if (!resFile && !resUrl.trim()) { toast.error('Sube un archivo o ingresa una URL.'); return; }
    setUploadingResource(true);
    try {
      let finalUrl = resUrl;
      if (resFile) {
        const up = await academyAPI.uploadAdminResource(module.course_id, lesson.id, resFile);
        finalUrl = up.publicUrl;
      }
      const resource = await academyAPI.createAdminResource({
        lesson_id: lesson.id, title: resTitle.trim(), description: '',
        file_url: finalUrl, file_name: resFile?.name ?? '', file_type: resType,
        sort_order: resources.length + 1,
      });
      setResources(rs => [...rs, resource as AcademyResource]);
      setResTitle(''); setResUrl(''); setResFile(null);
      toast.success('Recurso añadido.');
    } catch { toast.error('Error añadiendo recurso.'); }
    finally { setUploadingResource(false); }
  }

  async function removeResource(resourceId: string) {
    try {
      await academyAPI.deleteAdminResource(resourceId);
      setResources(rs => rs.filter(r => r.id !== resourceId));
      toast.success('Recurso eliminado.');
    } catch { toast.error('Error eliminando recurso.'); }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lesson || !module) return;
    setUploadingPdf(true);
    try {
      const up = await academyAPI.uploadAdminResource(module.course_id, lesson.id, file);
      setField('external_url', up.publicUrl);
      
      // Auto-save the lesson with the new URL so the user doesn't have to manually click save
      await academyAPI.saveAdminLesson(lesson.id, {
        module_id: module.id,
        title: form.title.trim() || lesson.title,
        content_type: form.content_type,
        external_url: up.publicUrl,
        sort_order: lesson.sort_order,
      });
      
      toast.success('PDF subido y guardado correctamente.');
    } catch {
      toast.error('No se pudo subir el PDF.');
    } finally {
      setUploadingPdf(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#1A4E26]" size={36} />
      </div>
    );
  }

  if (!lesson || !form || !module) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p>Lección no encontrada.</p>
        <Link to={`/admin/academia/cursos/${courseId}/builder`} className="text-[#1A4E26] font-bold underline mt-2 block">Volver al builder</Link>
      </div>
    );
  }

  const videoId = form.content_type === 'video' ? extractYoutubeId(form.video_external_id) : null;

  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link to={`/admin/academia/cursos/${courseId}/builder`}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#1A4E26] transition-colors">
          <ArrowLeft size={16} /> Builder
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{module.title}</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-bold text-[#111] truncate max-w-xs">{lesson.title}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${form.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {form.is_published ? 'Publicada' : 'Oculta'}
        </span>
        <div className="flex-1" />
        <button type="button" onClick={() => handleSave()} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white text-sm font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50 transition-colors shadow-sm">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar
        </button>
      </div>

      {/* Main layout */}
      <form onSubmit={handleSave}>
        <div className="flex gap-5">

          {/* Main editor panel */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Title & Description */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <Field label="Título de la lección" value={form.title}
                onChange={v => setField('title', v)} required placeholder="Ej: Introducción al módulo" />
              <div>
                <span className="text-sm font-semibold text-[#111] block mb-1">Descripción <span className="text-xs font-normal text-slate-400">(opcional)</span></span>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                  rows={2} placeholder="Breve descripción de la lección..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm" />
              </div>
            </div>

            {/* Content type selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#111] mb-3">Tipo de contenido</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { type: 'video', icon: '🎥', label: 'Video' },
                  { type: 'text', icon: '📄', label: 'Texto' },
                  { type: 'pdf', icon: '📎', label: 'PDF' },
                  { type: 'external_link', icon: '🔗', label: 'Enlace' },
                  { type: 'mixed', icon: '🎯', label: 'Mixto' },
                ].map(({ type, icon, label }) => (
                  <button key={type} type="button"
                    onClick={() => setField('content_type', type as ContentType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors
                      ${form.content_type === type ? 'bg-[#1A4E26] text-white border-[#1A4E26]' : 'border-slate-200 text-slate-600 hover:border-[#1A4E26]'}`}>
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>

              {/* VIDEO editor */}
              {form.content_type === 'video' && (
                <div className="space-y-4">
                  <Field label="ID o URL del video de YouTube" value={form.video_external_id}
                    onChange={v => setField('video_external_id', v)} placeholder="Ej: dQw4w9WgXcQ o https://youtu.be/..." />
                  {videoId && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="Vista previa del video" allowFullScreen
                        className="w-full h-full" />
                    </div>
                  )}
                  {!videoId && form.video_external_id && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      No se pudo extraer un ID válido de YouTube. Verifica el formato.
                    </p>
                  )}
                </div>
              )}

              {/* TEXT / MIXED editor */}
              {['text', 'mixed'].includes(form.content_type) && (
                <div className="space-y-4">
                  {form.content_type === 'mixed' && (
                    <Field label="ID o URL del video de YouTube (opcional)" value={form.video_external_id}
                      onChange={v => setField('video_external_id', v)} placeholder="Opcional para lecciones mixtas" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-[#111] block mb-1">Contenido de la lección</span>
                    
                    {/* HTML Toolbar */}
                    <div className="flex flex-wrap gap-1 mb-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<strong>Texto Negrita</strong>')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded">Negrita</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<em>Texto Cursiva</em>')} className="px-2 py-1 text-xs italic hover:bg-slate-200 rounded">Cursiva</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<br/>\n')} className="px-2 py-1 text-xs hover:bg-slate-200 rounded">Salto de línea</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<ul>\n  <li>Elemento 1</li>\n  <li>Elemento 2</li>\n</ul>')} className="px-2 py-1 text-xs hover:bg-slate-200 rounded">Lista viñetas</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<ol>\n  <li>Paso 1</li>\n  <li>Paso 2</li>\n</ol>')} className="px-2 py-1 text-xs hover:bg-slate-200 rounded">Lista numerada</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<h2>Título H2</h2>\n')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded">H2</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<h3>Título H3</h3>\n')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded">H3</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<a href="https://" target="_blank">Enlace</a>')} className="px-2 py-1 text-xs text-blue-600 hover:bg-slate-200 rounded">Enlace</button>
                    </div>

                    <textarea value={form.text_content} onChange={e => setField('text_content', e.target.value)}
                      rows={12} placeholder="Escribe el contenido de la lección aquí usando HTML..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-y text-sm font-mono bg-slate-50" />
                  </div>
                  {/* Preview */}
                  {form.text_content && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-[#F8FBF8]">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vista previa</p>
                      <div className="prose prose-sm max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: form.text_content }} />
                    </div>
                  )}
                </div>
              )}

              {/* PDF editor */}
              {form.content_type === 'pdf' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Sube el archivo PDF o ingresa la URL directa.
                  </p>
                  
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors bg-slate-50
                      hover:border-[#1A4E26] hover:bg-[#F8FBF8] border-slate-200`}>
                      {uploadingPdf ? (
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 size={24} className="animate-spin text-[#1A4E26] mb-2" />
                          <span className="text-sm font-semibold text-[#1A4E26]">Subiendo archivo...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Upload size={24} className="text-slate-400 mb-2" />
                          <span className="text-sm font-semibold text-slate-700">Haz clic para subir un PDF</span>
                          <span className="text-xs text-slate-400 mt-1">Se vinculará automáticamente a esta lección</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept=".pdf" className="sr-only" disabled={uploadingPdf} onChange={handlePdfUpload} />
                  </label>

                  <div className="flex items-center gap-4">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">O usa un enlace web</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  <Field label="URL del archivo PDF" value={form.external_url}
                    onChange={v => setField('external_url', v)} placeholder="https://..." type="url" />
                </div>
              )}

              {/* External link editor */}
              {form.content_type === 'external_link' && (
                <div className="space-y-3">
                  <Field label="URL del enlace externo" value={form.external_url}
                    onChange={v => setField('external_url', v)} placeholder="https://..." type="url" required />
                  {form.external_url && (
                    <a href={form.external_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#1A4E26] font-semibold hover:underline">
                      <ExternalLink size={14} /> Abrir enlace
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Resources section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-[#111] mb-4 flex items-center gap-2">
                <FileText size={18} className="text-[#1A4E26]" /> Recursos de la lección
              </h3>

              {/* Existing resources */}
              {resources.length > 0 && (
                <div className="space-y-2 mb-4">
                  {resources.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <FileText size={16} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={r.file_url} target="_blank" rel="noreferrer"
                          className="font-semibold text-sm text-[#1A4E26] hover:underline truncate block">{r.title}</a>
                        <span className="text-xs text-slate-400 uppercase">{r.file_type ?? 'archivo'}</span>
                      </div>
                      <button type="button" onClick={() => removeResource(r.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add resource form */}
              <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-600">Añadir recurso</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Nombre del recurso" value={resTitle} onChange={setResTitle} placeholder="Ej: Guía de estudio" />
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Tipo</span>
                    <select value={resType} onChange={e => setResType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm">
                      {[
                        { value: 'pdf', label: 'PDF' },
                        { value: 'document', label: 'Documento' },
                        { value: 'presentation', label: 'Presentación' },
                        { value: 'image', label: 'Imagen' },
                        { value: 'external_link', label: 'Enlace web' },
                      ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </div>

                {/* File upload */}
                <label className="block cursor-pointer">
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors
                    ${resFile ? 'border-[#1A4E26] bg-[#F0FFF4]' : 'border-slate-200 hover:border-[#1A4E26] hover:bg-[#F8FBF8]'}`}>
                    <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 block">
                      {resFile ? resFile.name : 'Haz clic o arrastra un archivo'}
                    </span>
                    <span className="text-xs text-slate-400">PDF, imágenes, documentos</span>
                  </div>
                  <input type="file" className="sr-only" onChange={e => setResFile(e.target.files?.[0] ?? null)} />
                </label>

                <Field label="O ingresa una URL" value={resUrl} onChange={setResUrl} placeholder="https://..." type="url" />

                <div className="flex justify-end">
                  <button type="button" onClick={addResource} disabled={uploadingResource || !resTitle.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#111] text-white text-sm font-bold rounded-xl hover:bg-[#333] disabled:opacity-50 transition-colors">
                    {uploadingResource ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {uploadingResource ? 'Subiendo...' : 'Añadir recurso'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings sidebar */}
          <div className="w-60 shrink-0 space-y-3">

            {/* Visibility */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-bold text-[#111] mb-3">Visibilidad</p>
              <div className="space-y-2">
                <button type="button" onClick={() => setField('is_published', !form.is_published)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-colors
                    ${form.is_published ? 'bg-[#E8F2EA] border-[#C8D8CB] text-[#1A4E26]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {form.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                  <span className="text-sm font-semibold">{form.is_published ? 'Publicada' : 'Oculta'}</span>
                </button>

                <button type="button" onClick={() => setField('is_free_preview', !form.is_free_preview)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-colors
                    ${form.is_free_preview ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {form.is_free_preview ? <Unlock size={16} /> : <Lock size={16} />}
                  <div className="text-left">
                    <span className="text-sm font-semibold block">{form.is_free_preview ? 'Preview gratuita' : 'Requiere acceso'}</span>
                    <span className="text-xs opacity-75">{form.is_free_preview ? 'Visible sin inscripción' : 'Solo inscritos'}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-sm font-bold text-[#111]">Requisitos de avance</p>
              
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-[#1A4E26] transition-colors">
                <input type="checkbox" checked={form.is_required}
                  onChange={e => setField('is_required', e.target.checked)}
                  className="w-4 h-4 accent-[#1A4E26] shrink-0" />
                <div className="text-left">
                  <span className="text-sm font-semibold block text-[#111]">Obligatoria</span>
                  <span className="text-xs text-slate-500">Requerida para graduación</span>
                </div>
              </label>

              <Field label="Minutos estimados" value={form.estimated_minutes}
                onChange={v => setField('estimated_minutes', v)} type="number" min="1" placeholder="Ej: 15" />
            </div>

            {/* Status summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-sm font-bold text-[#111]">Estado de la lección</p>
              <div className="flex items-center gap-2 text-sm">
                {form.title.trim()
                  ? <CheckCircle size={15} className="text-[#1A4E26]" />
                  : <XCircle size={15} className="text-red-400" />}
                <span className="text-slate-600">Título</span>
              </div>
              {form.content_type === 'video' && (
                <div className="flex items-center gap-2 text-sm">
                  {videoId
                    ? <CheckCircle size={15} className="text-[#1A4E26]" />
                    : <XCircle size={15} className="text-amber-500" />}
                  <span className="text-slate-600">Video de YouTube</span>
                </div>
              )}
              {['text', 'mixed'].includes(form.content_type) && (
                <div className="flex items-center gap-2 text-sm">
                  {form.text_content.trim()
                    ? <CheckCircle size={15} className="text-[#1A4E26]" />
                    : <XCircle size={15} className="text-amber-500" />}
                  <span className="text-slate-600">Contenido de texto</span>
                </div>
              )}
            </div>

            {/* Content type badge */}
            <div className="bg-[#F8FBF8] border border-[#C8D8CB] rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de lección</p>
              <div className="flex items-center gap-2">
                {form.content_type === 'video' && <PlayCircle size={18} className="text-red-500" />}
                {form.content_type === 'text' && <FileText size={18} className="text-blue-500" />}
                {form.content_type === 'pdf' && <FileText size={18} className="text-orange-500" />}
                {form.content_type === 'external_link' && <ExternalLink size={18} className="text-purple-500" />}
                {form.content_type === 'mixed' && <FileText size={18} className="text-indigo-500" />}
                <span className="text-sm font-bold text-[#111] capitalize">{form.content_type.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Save button */}
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar lección'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
