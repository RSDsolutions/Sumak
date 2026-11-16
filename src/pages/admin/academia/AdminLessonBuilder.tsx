import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Eye, EyeOff, ExternalLink, FileText, Loader2,
  PlayCircle, Save, Trash2, Upload, Plus, Lock, Unlock,
  CheckCircle, XCircle, ShieldAlert, Leaf, Pill
} from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { products } from '../../../data';
import { useToast } from '../../../lib/toast';
import type {
  AcademyLesson,
  AcademyModule,
  AcademyResource,
  ContentType,
  VideoProvider,
  AcademyBotanicalSheet,
  AcademyLessonBotanical,
  AcademyLessonProduct,
  ClinicalCalloutData,
} from '../../../lib/academy-types';
import { ClinicalCallout } from '../../../components/academia/ClinicalComponents';

type LessonForm = {
  title: string;
  description: string;
  content_type: ContentType;
  text_content: string;
  video_provider: VideoProvider;
  video_external_id: string;
  external_url: string;
  estimated_minutes: string;
  is_published: boolean;
  is_free_preview: boolean;
  is_required: boolean;
  has_callout: boolean;
  callout_severity: ClinicalCalloutData['severity'];
  callout_title: string;
  callout_message: string;
};

function lessonToForm(l: AcademyLesson): LessonForm {
  const callout = l.metadata?.clinical_callout;
  return {
    title: l.title,
    description: l.description ?? '',
    content_type: l.content_type,
    text_content: l.text_content ?? '',
    video_provider: l.video_provider ?? 'youtube',
    video_external_id: l.video_external_id ?? '',
    external_url: l.external_url ?? '',
    estimated_minutes: l.estimated_minutes?.toString() ?? '',
    is_published: l.is_published,
    is_free_preview: l.is_free_preview,
    is_required: l.is_required ?? true,
    has_callout: Boolean(callout?.title || callout?.message),
    callout_severity: callout?.severity ?? 'warning',
    callout_title: callout?.title ?? '',
    callout_message: callout?.message ?? '',
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
  const [allBotanicals, setAllBotanicals] = useState<AcademyBotanicalSheet[]>([]);
  const [lessonBotanicals, setLessonBotanicals] = useState<AcademyLessonBotanical[]>([]);
  const [lessonProducts, setLessonProducts] = useState<AcademyLessonProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [form, setForm] = useState<LessonForm | null>(null);

  // Resource form
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState('pdf');
  const [resUrl, setResUrl] = useState('');
  const [resFile, setResFile] = useState<File | null>(null);

  // Botanical link form
  const [selectedBotanicalId, setSelectedBotanicalId] = useState('');
  const [botanicalRole, setBotanicalRole] = useState('');
  const [addingBotanical, setAddingBotanical] = useState(false);

  // Product link form
  const [selectedProductCode, setSelectedProductCode] = useState(products[0]?.codigo ?? '00011');
  const [productDosage, setProductDosage] = useState('');
  const [productPhase, setProductPhase] = useState('');
  const [productPrecautions, setProductPrecautions] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // Lesson specific upload state
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const load = useCallback(async () => {
    if (!lessonId || !courseId) return;
    setLoading(true);
    try {
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

      const [res, botsCatalog, lBots, lProds] = await Promise.all([
        academyAPI.getAdminLessonResources(lessonId),
        academyAPI.getBotanicalSheets(),
        academyAPI.getLessonBotanicals(lessonId),
        academyAPI.getLessonProducts(lessonId),
      ]);
      setResources(res);
      setAllBotanicals(botsCatalog);
      if (botsCatalog.length > 0) setSelectedBotanicalId(botsCatalog[0].id);
      setLessonBotanicals(lBots);
      setLessonProducts(lProds);
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
      const isVideoOrMixed = ['video', 'mixed'].includes(form.content_type);
      const vidId = isVideoOrMixed && form.video_external_id.trim()
        ? (form.video_provider === 'youtube' ? extractYoutubeId(form.video_external_id) : form.video_external_id.trim())
        : null;

      const nextMetadata = { ...(lesson.metadata ?? {}) };
      if (form.has_callout && (form.callout_title.trim() || form.callout_message.trim())) {
        nextMetadata.clinical_callout = {
          severity: form.callout_severity,
          title: form.callout_title.trim(),
          message: form.callout_message.trim(),
        };
      } else {
        delete nextMetadata.clinical_callout;
      }

      const updated = await academyAPI.saveAdminLesson(lesson.id, {
        module_id: module.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        content_type: form.content_type,
        text_content: ['text', 'mixed', 'video'].includes(form.content_type) ? (form.text_content || null) : null,
        video_external_id: vidId,
        video_provider: vidId ? form.video_provider : null,
        external_url: ['external_link', 'pdf'].includes(form.content_type) ? (form.external_url || null) : null,
        estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
        is_published: form.is_published,
        is_free_preview: form.is_free_preview,
        is_required: form.is_required,
        sort_order: lesson.sort_order,
        metadata: nextMetadata,
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

  async function handleAddBotanical() {
    if (!lesson || !selectedBotanicalId) return;
    setAddingBotanical(true);
    try {
      const added = await academyAPI.addLessonBotanical({
        lesson_id: lesson.id,
        botanical_id: selectedBotanicalId,
        clinical_role: botanicalRole.trim() || undefined,
        sort_order: lessonBotanicals.length + 1,
      });
      setLessonBotanicals(prev => [...prev.filter(x => x.botanical_id !== selectedBotanicalId), added]);
      setBotanicalRole('');
      toast.success('Ficha botánica vinculada a la lección.');
    } catch {
      toast.error('Error vinculando ficha botánica.');
    } finally {
      setAddingBotanical(false);
    }
  }

  async function handleRemoveBotanical(id: string) {
    try {
      await academyAPI.removeLessonBotanical(id);
      setLessonBotanicals(prev => prev.filter(x => x.id !== id));
      toast.success('Ficha botánica desvinculada.');
    } catch {
      toast.error('No se pudo desvincular.');
    }
  }

  async function handleAddProduct() {
    if (!lesson || !selectedProductCode || !productDosage.trim()) {
      toast.error('Ingresa la dosificación recomendada para el producto.');
      return;
    }
    const prod = products.find(p => p.codigo === selectedProductCode);
    if (!prod) return;
    setAddingProduct(true);
    try {
      const added = await academyAPI.addLessonProduct({
        lesson_id: lesson.id,
        product_code: prod.codigo,
        product_name: prod.nombre,
        product_slug: prod.slug,
        dosage: productDosage.trim(),
        precautions: productPrecautions.trim() || prod.precauciones || null,
        protocol_phase: productPhase.trim() || null,
        sort_order: lessonProducts.length + 1,
      });
      setLessonProducts(prev => [...prev.filter(x => x.product_code !== prod.codigo), added]);
      setProductDosage('');
      setProductPhase('');
      setProductPrecautions('');
      toast.success('Producto SUMAK vinculado con éxito.');
    } catch {
      toast.error('Error vinculando producto.');
    } finally {
      setAddingProduct(false);
    }
  }

  async function handleRemoveProduct(id: string) {
    try {
      await academyAPI.removeLessonProduct(id);
      setLessonProducts(prev => prev.filter(x => x.id !== id));
      toast.success('Producto desvinculado.');
    } catch {
      toast.error('No se pudo desvincular.');
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lesson || !module || !form) return;
    setUploadingPdf(true);
    try {
      const up = await academyAPI.uploadAdminResource(module.course_id, lesson.id, file);
      setField('external_url', up.publicUrl);
      
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

  const videoId = ['video', 'mixed'].includes(form.content_type) && form.video_provider === 'youtube'
    ? extractYoutubeId(form.video_external_id)
    : null;

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

              {/* VIDEO / MIXED video provider editor */}
              {['video', 'mixed'].includes(form.content_type) && (
                <div className="space-y-4 mb-5">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-[#111] block mb-1">Proveedor de Video</span>
                      <select
                        value={form.video_provider}
                        onChange={e => setField('video_provider', e.target.value as VideoProvider)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="zoom">Zoom (Grabación / Enlace)</option>
                        <option value="tiktok">TikTok (ID o URL)</option>
                        <option value="vimeo">Vimeo</option>
                        <option value="custom">URL Directa / Custom</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <Field
                        label={`ID o URL de ${form.video_provider.toUpperCase()}`}
                        value={form.video_external_id}
                        onChange={v => setField('video_external_id', v)}
                        placeholder={
                          form.video_provider === 'youtube'
                            ? 'Ej: dQw4w9WgXcQ o https://youtu.be/...'
                            : 'https://...'
                        }
                      />
                    </div>
                  </div>
                  {videoId && form.video_provider === 'youtube' && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="Vista previa del video" allowFullScreen
                        className="w-full h-full" />
                    </div>
                  )}
                </div>
              )}

              {/* TEXT / MIXED / VIDEO rich notes editor */}
              {['text', 'mixed', 'video'].includes(form.content_type) && (
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-semibold text-[#111] block mb-1">
                      Contenido enriquecido de la lección (Subtítulos y Bloques HTML)
                    </span>
                    
                    {/* HTML Toolbar */}
                    <div className="flex flex-wrap gap-1 mb-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<strong>Texto Negrita</strong>')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded">Negrita</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<em>Texto Cursiva</em>')} className="px-2 py-1 text-xs italic hover:bg-slate-200 rounded">Cursiva</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<br/>\n')} className="px-2 py-1 text-xs hover:bg-slate-200 rounded">Salto de línea</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<ul>\n  <li>Elemento 1</li>\n  <li>Elemento 2</li>\n</ul>')} className="px-2 py-1 text-xs hover:bg-slate-200 rounded">Lista viñetas</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<ol>\n  <li>Paso 1</li>\n  <li>Paso 2</li>\n</ol>')} className="px-2 py-1 text-xs hover:bg-slate-200 rounded">Lista numerada</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<h2>Subtítulo Clínico H2</h2>\n')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded">H2</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<h3>Subtítulo H3</h3>\n')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 rounded">H3</button>
                      <button type="button" onClick={() => setField('text_content', form.text_content + '<a href="https://" target="_blank">Enlace</a>')} className="px-2 py-1 text-xs text-blue-600 hover:bg-slate-200 rounded">Enlace</button>
                    </div>

                    <textarea value={form.text_content} onChange={e => setField('text_content', e.target.value)}
                      rows={10} placeholder="Escribe el contenido de la lección aquí usando HTML..."
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

            {/* Clinical Callout / Safety Alert Builder */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#111] flex items-center gap-2">
                  <ShieldAlert size={18} className="text-amber-600" />
                  Callout de Seguridad Médica / Advertencia de Toxicidad
                </h3>
                <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_callout}
                    onChange={e => setField('has_callout', e.target.checked)}
                    className="w-4 h-4 accent-[#1A4E26]"
                  />
                  Mostrar Callout en esta lección
                </label>
              </div>

              {form.has_callout && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-[#111] block mb-1">Severidad Clínica</span>
                      <select
                        value={form.callout_severity}
                        onChange={e => setField('callout_severity', e.target.value as ClinicalCalloutData['severity'])}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm"
                      >
                        <option value="info">Nota Clínica (Info)</option>
                        <option value="warning">Advertencia Fisiológica (Warning)</option>
                        <option value="contraindication">Contraindicación Estricta (Rojo)</option>
                        <option value="toxicity">Alerta de Toxicidad / Dosificación</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <Field
                        label="Título de la Alerta Médica"
                        value={form.callout_title}
                        onChange={v => setField('callout_title', v)}
                        placeholder="Ej: Advertencia sobre el impacto del sodio procesado..."
                      />
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Mensaje Clínico Detallado</span>
                    <textarea
                      rows={3}
                      value={form.callout_message}
                      onChange={e => setField('callout_message', e.target.value)}
                      placeholder="Describe la precaución clínica, contraindicación o mecanismo fisiológico..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm"
                    />
                  </label>
                  {(form.callout_title || form.callout_message) && (
                    <div className="pt-2">
                      <ClinicalCallout
                        callout={{
                          severity: form.callout_severity,
                          title: form.callout_title || 'Título de alerta',
                          message: form.callout_message || 'Descripción de la alerta médica...',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Linked Botanical Sheets Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#111] flex items-center gap-2">
                <Leaf size={18} className="text-[#1A4E26]" />
                Fichas Botánicas Vinculadas (`academy_lesson_botanicals`)
              </h3>

              {lessonBotanicals.length > 0 && (
                <div className="space-y-2">
                  {lessonBotanicals.map(lb => (
                    <div key={lb.id} className="flex items-center justify-between gap-3 p-3 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-[#111]">
                          🌿 {lb.botanical?.common_name ?? lb.botanical_id}{' '}
                          {lb.botanical?.scientific_name && (
                            <span className="italic font-normal text-slate-500">({lb.botanical.scientific_name})</span>
                          )}
                        </p>
                        {lb.clinical_role && <p className="text-xs text-slate-600 mt-0.5">{lb.clinical_role}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBotanical(lb.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Vincular planta del Vademécum SUMAK</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Planta Medicinal</span>
                    <select
                      value={selectedBotanicalId}
                      onChange={e => setSelectedBotanicalId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm"
                    >
                      {allBotanicals.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.common_name} ({b.scientific_name}) — Toxicidad: {b.toxicity_level}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Rol clínico en esta lección"
                    value={botanicalRole}
                    onChange={setBotanicalRole}
                    placeholder="Ej: Activo litolítico en Madre Silvestre"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddBotanical}
                    disabled={addingBotanical || !selectedBotanicalId}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1A4E26] text-white text-xs font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50"
                  >
                    <Plus size={14} /> Vincular Ficha Botánica
                  </button>
                </div>
              </div>
            </div>

            {/* Linked SUMAK Products & Clinical Dosage Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#111] flex items-center gap-2">
                <Pill size={18} className="text-[#1A4E26]" />
                Productos SUMAK y Dosificación Vinculada (`academy_lesson_products`)
              </h3>

              {lessonProducts.length > 0 && (
                <div className="space-y-2">
                  {lessonProducts.map(lp => (
                    <div key={lp.id} className="flex items-center justify-between gap-3 p-3 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-[#111]">
                          [{lp.product_code}] {lp.product_name}
                        </p>
                        <p className="text-xs text-[#1A4E26] font-semibold mt-0.5">Dosis: {lp.dosage}</p>
                        {lp.precautions && <p className="text-xs text-red-700 mt-0.5">⚠️ {lp.precautions}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(lp.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Enlazar producto del catálogo con dosis clínica</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Producto Comercial SUMAK</span>
                    <select
                      value={selectedProductCode}
                      onChange={e => setSelectedProductCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm"
                    >
                      {products.map(p => (
                        <option key={p.codigo} value={p.codigo}>
                          [{p.codigo}] {p.nombre} (${p.pvp.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Fase del Protocolo (opcional)"
                    value={productPhase}
                    onChange={setProductPhase}
                    placeholder="Ej: Fase 2: Litolisis y Drenaje Renal"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field
                    label="Dosificación Clínica Exacta"
                    value={productDosage}
                    onChange={setProductDosage}
                    placeholder="Ej: 1 cápsula 2 veces al día antes de los alimentos"
                  />
                  <Field
                    label="Precaución Específica"
                    value={productPrecautions}
                    onChange={setProductPrecautions}
                    placeholder="Ej: Contraindicado en gestación y lactancia"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={addingProduct || !productDosage.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1A4E26] text-white text-xs font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50"
                  >
                    <Plus size={14} /> Enlazar Producto Dosificado
                  </button>
                </div>
              </div>
            </div>

            {/* Resources section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-[#111] mb-4 flex items-center gap-2">
                <FileText size={18} className="text-[#1A4E26]" /> Recursos y PDFs de respaldo de la lección
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
                  <Field label="Nombre del recurso" value={resTitle} onChange={setResTitle} placeholder="Ej: Guia_Eje_Intestino_Rinon.pdf" />
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
                  {form.video_external_id.trim()
                    ? <CheckCircle size={15} className="text-[#1A4E26]" />
                    : <XCircle size={15} className="text-amber-500" />}
                  <span className="text-slate-600">Video ({form.video_provider})</span>
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
