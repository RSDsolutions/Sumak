import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Eye, EyeOff, ExternalLink, FileText, Loader2,
  PlayCircle, Save, Trash2, Upload, Plus, Lock, Unlock,
  CheckCircle, XCircle, ShieldAlert, Leaf, Pill, Sparkles,
  Image as ImageIcon, Table, ListChecks, BookOpen, ArrowUp, ArrowDown, HelpCircle
} from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { products, parseIngredient } from '../../../data';
import { useToast } from '../../../lib/toast';
import Modal from '../../../components/Modal';
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
  RecipeCardData,
} from '../../../lib/academy-types';
import { ClinicalCallout, StepByStepRecipeCard } from '../../../components/academia/ClinicalComponents';

type RecipeIngredientForm = {
  name: string;
  dose: string;
  notes: string;
  image_url?: string;
};

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
  // Clinical Callout
  has_callout: boolean;
  callout_severity: ClinicalCalloutData['severity'];
  callout_title: string;
  callout_message: string;
  // Step-by-step Recipe Card
  has_recipe: boolean;
  recipe_title: string;
  recipe_image_url: string;
  recipe_prep_time: string;
  recipe_servings: string;
  recipe_posology: string;
  recipe_benefits: string[];
  recipe_ingredients: RecipeIngredientForm[];
  recipe_steps: string[];
};

const PRESET_RECIPE_IMAGES = [
  {
    label: 'Infusión Herbal',
    url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Decocción de Raíces',
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Extracto Botánico',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Cataplasma / Tópico',
    url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80',
  },
];

function lessonToForm(l: AcademyLesson): LessonForm {
  const callout = l.metadata?.clinical_callout;
  const recipe = l.metadata?.recipe_card;
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
    has_recipe: Boolean(recipe?.title || (recipe?.ingredients && recipe.ingredients.length > 0)),
    recipe_title: recipe?.title ?? '',
    recipe_image_url: recipe?.image_url ?? '',
    recipe_prep_time: recipe?.prep_time ?? '10 min',
    recipe_servings: recipe?.servings ?? '1 porción (250 ml)',
    recipe_posology: recipe?.posology ?? '',
    recipe_benefits: recipe?.benefits ?? [],
    recipe_ingredients:
      recipe?.ingredients && recipe.ingredients.length > 0
        ? recipe.ingredients.map(i => ({
            name: i.name,
            dose: i.dose,
            notes: i.notes ?? '',
            image_url: i.image_url,
          }))
        : [{ name: '', dose: '', notes: '' }],
    recipe_steps:
      recipe?.steps && recipe.steps.length > 0
        ? recipe.steps
        : [''],
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

function Field({ label, value, onChange, type = 'text', placeholder = '', min, required = false, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; min?: string; required?: boolean; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#111] block mb-1">{label}</span>
      {hint && <span className="text-xs text-slate-400 block mb-1">{hint}</span>}
      <input required={required} type={type} min={min} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm" />
    </label>
  );
}

export default function AdminLessonBuilder() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/operaciones') ? '/operaciones' : '/admin';
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
  const [uploadingInlineImg, setUploadingInlineImg] = useState(false);
  const [uploadingRecipeImg, setUploadingRecipeImg] = useState(false);
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
  const [productRoute, setProductRoute] = useState('Vía oral con abundante agua');
  const [productPhase, setProductPhase] = useState('');
  const [productPrecautions, setProductPrecautions] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // Recipe benefit input
  const [newBenefit, setNewBenefit] = useState('');

  // Lesson specific upload state
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Visual Block Assistant Modal (for non-programmers!)
  const [blockModalType, setBlockModalType] = useState<
    null | 'symptoms' | 'habits' | 'table' | 'highlight' | 'gallery'
  >(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockItems, setBlockItems] = useState<{ col1: string; col2: string }[]>([
    { col1: '', col2: '' },
    { col1: '', col2: '' },
  ]);
  const [blockNoteText, setBlockNoteText] = useState('');

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
  }, [lessonId, courseId, toast]);

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

      const validIngredients = form.recipe_ingredients
        .filter(i => i.name.trim())
        .map(i => ({
          name: i.name.trim(),
          dose: i.dose.trim() || 'Cantidad según protocolo',
          notes: i.notes.trim() || undefined,
          image_url: i.image_url || undefined,
        }));
      const validSteps = form.recipe_steps.map(s => s.trim()).filter(Boolean);

      if (form.has_recipe && (form.recipe_title.trim() || validIngredients.length > 0)) {
        const recipeCard: RecipeCardData = {
          title: form.recipe_title.trim() || 'Receta / Protocolo Paso a Paso',
          image_url: form.recipe_image_url.trim() || undefined,
          prep_time: form.recipe_prep_time.trim() || undefined,
          servings: form.recipe_servings.trim() || undefined,
          posology: form.recipe_posology.trim() || undefined,
          benefits: form.recipe_benefits.filter(Boolean),
          ingredients: validIngredients,
          steps: validSteps,
        };
        nextMetadata.recipe_card = recipeCard;
      } else {
        delete nextMetadata.recipe_card;
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
      toast.success('Lección guardada correctamente.');
    } catch { toast.error('Error guardando la lección.'); }
    finally { setSaving(false); }
  }

  // ─── Non-Programmer Visual Block Assistant ──────────────────────────────────

  function openBlockAssistant(type: 'symptoms' | 'habits' | 'table' | 'highlight' | 'gallery') {
    setBlockModalType(type);
    if (type === 'symptoms') {
      setBlockTitle('Principales Síntomas o Causas Identificadas');
      setBlockItems([
        { col1: 'Inflamación persistente', col2: 'Sensación de pesadez o molestia recurrente tras las comidas.' },
        { col1: 'Sobrecarga metabólica', col2: 'Dificultad para drenar toxinas y retención de líquidos.' },
      ]);
    } else if (type === 'habits') {
      setBlockTitle('Hábitos Clínicos y Recomendaciones de Prevención');
      setBlockItems([
        { col1: 'Hidratación constante', col2: 'Consumir al menos 2 litros de agua pura o infusión suave al día.' },
        { col1: 'Reducción de irritantes', col2: 'Evitar ultraprocesados, exceso de sodio y azúcares refinados.' },
      ]);
    } else if (type === 'table') {
      setBlockTitle('Cuadro Comparativo Clínico');
      setBlockItems([
        { col1: 'Fase 1: Desinflamación', col2: 'Drenaje inicial y alivio de síntomas agudos (Días 1 al 7).' },
        { col1: 'Fase 2: Regeneración', col2: 'Restauración funcional con fitonutrientes concentrados (Días 8 al 21).' },
      ]);
    } else if (type === 'highlight') {
      setBlockTitle('Concepto Clave de la Lección');
      setBlockNoteText('Recuerda que la constancia en la posología y la calidad del extracto botánico determinan el éxito del protocolo.');
    }
  }

  function insertVisualBlockIntoLesson() {
    if (!form || !blockModalType) return;
    let htmlSnippet = '';

    if (blockModalType === 'symptoms') {
      const cardsHtml = blockItems
        .filter(i => i.col1.trim() || i.col2.trim())
        .map(
          i => `
    <div style="background:#FFFFFF;border:1px solid #C8D8CB;border-radius:14px;padding:14px;">
      <strong style="color:#0B2913;display:block;margin-bottom:4px;">• ${i.col1.trim()}</strong>
      <span style="color:#4B5563;font-size:14px;">${i.col2.trim()}</span>
    </div>`
        )
        .join('');
      htmlSnippet = `\n<div style="background:#F4F7F5;border:1px solid #C8D8CB;border-radius:18px;padding:18px;margin:18px 0;">
  <h3 style="color:#1A4E26;font-weight:800;margin-top:0;margin-bottom:12px;">🩺 ${blockTitle.trim() || 'Síntomas y Causas'}</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">${cardsHtml}
  </div>
</div>\n`;
    } else if (blockModalType === 'habits') {
      const listHtml = blockItems
        .filter(i => i.col1.trim() || i.col2.trim())
        .map(
          i =>
            `<li style="margin-bottom:8px;"><strong>✓ ${i.col1.trim()}:</strong> ${i.col2.trim()}</li>`
        )
        .join('\n    ');
      htmlSnippet = `\n<div style="background:#EBF4ED;border-left:5px solid #1A4E26;border-radius:14px;padding:18px;margin:18px 0;">
  <h3 style="color:#0B2913;font-weight:800;margin-top:0;margin-bottom:10px;">🌿 ${blockTitle.trim() || 'Hábitos y Recomendaciones'}</h3>
  <ul style="margin:0;padding-left:18px;color:#1F2937;">
    ${listHtml}
  </ul>
</div>\n`;
    } else if (blockModalType === 'table') {
      const rowsHtml = blockItems
        .filter(i => i.col1.trim() || i.col2.trim())
        .map(
          i => `
      <tr style="border-bottom:1px solid #E5E7EB;">
        <td style="padding:10px 14px;font-weight:700;color:#0B2913;background:#F8FBF8;">${i.col1.trim()}</td>
        <td style="padding:10px 14px;color:#374151;">${i.col2.trim()}</td>
      </tr>`
        )
        .join('');
      htmlSnippet = `\n<div style="margin:18px 0;overflow-x:auto;border:1px solid #C8D8CB;border-radius:16px;">
  <table style="width:100%;border-collapse:collapse;text-align:left;font-size:14px;">
    <thead>
      <tr style="background:#1A4E26;color:#FFFFFF;">
        <th style="padding:12px 14px;width:35%;">${blockTitle.trim() || 'Concepto / Fase'}</th>
        <th style="padding:12px 14px;">Explicación / Aplicación Clínica</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}
    </tbody>
  </table>
</div>\n`;
    } else if (blockModalType === 'highlight') {
      htmlSnippet = `\n<div style="background:#FEF6E9;border:1px solid #D4AF37;border-radius:16px;padding:18px;margin:18px 0;">
  <strong style="color:#7C4C18;display:block;font-size:15px;margin-bottom:6px;">✨ ${blockTitle.trim() || 'Nota Destacada'}</strong>
  <p style="color:#5B3407;margin:0;line-height:1.6;">${blockNoteText.trim()}</p>
</div>\n`;
    }

    setField('text_content', (form.text_content ? form.text_content + '\n' : '') + htmlSnippet);
    setBlockModalType(null);
    toast.success('Bloque visual insertado en la lección.');
  }

  async function handleInlineImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lesson || !courseId || !form) return;
    setUploadingInlineImg(true);
    try {
      const publicUrl = await academyAPI.uploadLessonInlineImage(courseId, lesson.id, file);
      const figHtml = `\n<figure style="margin:18px 0;text-align:center;background:#F4F7F5;border:1px solid #C8D8CB;border-radius:18px;padding:14px;">
  <img src="${publicUrl}" alt="${file.name}" style="max-height:360px;width:auto;margin:0 auto;border-radius:12px;object-fit:contain;" />
  <figcaption style="font-size:12px;color:#4B5563;margin-top:8px;font-weight:600;">${form.title}</figcaption>
</figure>\n`;
      setField('text_content', (form.text_content ? form.text_content + '\n' : '') + figHtml);
      toast.success('Imagen subida e insertada en la lección.');
    } catch {
      toast.error('No se pudo subir la imagen.');
    } finally {
      setUploadingInlineImg(false);
    }
  }

  async function handleRecipeImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lesson || !courseId || !form) return;
    setUploadingRecipeImg(true);
    try {
      const publicUrl = await academyAPI.uploadLessonInlineImage(courseId, lesson.id, file);
      setField('recipe_image_url', publicUrl);
      toast.success('Foto de la receta subida con éxito.');
    } catch {
      toast.error('No se pudo subir la foto de la receta.');
    } finally {
      setUploadingRecipeImg(false);
    }
  }

  function insertGalleryImage(url: string, label: string) {
    if (!form) return;
    const figHtml = `\n<figure style="margin:18px 0;text-align:center;background:#FFFFFF;border:1px solid #C8D8CB;border-radius:18px;padding:16px;">
  <img src="${url}" alt="${label}" style="max-height:240px;width:auto;margin:0 auto;object-fit:contain;" />
  <figcaption style="font-size:13px;color:#1A4E26;margin-top:8px;font-weight:700;">${label}</figcaption>
</figure>\n`;
    setField('text_content', (form.text_content ? form.text_content + '\n' : '') + figHtml);
    setBlockModalType(null);
    toast.success(`Imagen de "${label}" insertada en la lección.`);
  }

  // ─── Resources, Botanicals & Products ───────────────────────────────────────

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
      toast.success('Material descargable añadido.');
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
      toast.success('Planta medicinal agregada a la lección.');
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
      toast.success('Planta desvinculada.');
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
        administration_route: productRoute.trim() || null,
        precautions: productPrecautions.trim() || prod.precauciones || null,
        protocol_phase: productPhase.trim() || null,
        sort_order: lessonProducts.length + 1,
      });
      setLessonProducts(prev => [...prev.filter(x => x.product_code !== prod.codigo), added]);
      setProductDosage('');
      setProductPhase('');
      setProductPrecautions('');
      toast.success('Fórmula SUMAK vinculada con éxito.');
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
        <Link to={`${basePath}/academia/cursos/${courseId}/builder`} className="text-[#1A4E26] font-bold underline mt-2 block">
          Volver al constructor del curso
        </Link>
      </div>
    );
  }

  const videoId = ['video', 'mixed'].includes(form.content_type) && form.video_provider === 'youtube'
    ? extractYoutubeId(form.video_external_id)
    : null;

  const previewRecipeCard: RecipeCardData = {
    title: form.recipe_title.trim() || 'Nombre de la Receta o Protocolo Herbal',
    image_url: form.recipe_image_url.trim() || undefined,
    prep_time: form.recipe_prep_time.trim() || undefined,
    servings: form.recipe_servings.trim() || undefined,
    posology: form.recipe_posology.trim() || undefined,
    benefits: form.recipe_benefits.filter(Boolean),
    ingredients: form.recipe_ingredients
      .filter(i => i.name.trim())
      .map(i => ({
        name: i.name.trim(),
        dose: i.dose.trim() || 'Dosis estándar',
        notes: i.notes.trim() || undefined,
        image_url: i.image_url,
      })),
    steps: form.recipe_steps.map(s => s.trim()).filter(Boolean),
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white border border-[#C8D8CB] rounded-2xl p-4 shadow-xs flex-wrap">
        <Link
          to={`${basePath}/academia/cursos/${courseId}/builder`}
          className="flex items-center gap-1.5 text-sm font-bold text-[#1A4E26] bg-[#E8F2EA] hover:bg-[#D5E8D9] px-3 py-1.5 rounded-xl transition-colors"
        >
          <ArrowLeft size={16} /> Volver a Módulos
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{module.title}</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-black text-[#111] truncate max-w-xs">{form.title || lesson.title}</span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${form.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {form.is_published ? '● Publicada' : '● Oculta (Borrador)'}
        </span>

        <div className="flex-1" />

        <Link
          to={`/academia/leccion/${lesson.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 hover:border-[#1A4E26] hover:text-[#1A4E26] text-xs font-bold rounded-xl transition-colors"
        >
          <ExternalLink size={14} /> Ver como Estudiante
        </Link>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-[#1A4E26] text-white text-sm font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>

      {/* Quick Guide Banner for Operational Secretary */}
      <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-3.5 flex items-center gap-3 text-xs text-[#1A4E26]">
        <HelpCircle size={18} className="shrink-0 text-[#1A4E26]" />
        <p>
          <strong>Editor Visual Asistido:</strong> No necesitas saber programación. Usa los botones de{' '}
          <strong>"Insertar Bloque Visual con 1 Clic"</strong> para agregar fotos desde tu computadora, cuadros de síntomas, tablas, alertas médicas, recetas paso a paso y productos SUMAK.
        </p>
      </div>

      {/* Main layout */}
      <form onSubmit={handleSave}>
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Main editor panel */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* 1. Title & Description */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[#111]">1.Datos Principales de la Lección</h3>
                <span className="text-xs text-slate-400">Paso 1 de 5</span>
              </div>
              <Field
                label="Título de la lección *"
                value={form.title}
                onChange={v => setField('title', v)}
                required
                placeholder="Ej: Protocolo de Desinflamación y Drenaje Hepático"
              />
              <div>
                <span className="text-sm font-semibold text-[#111] block mb-1">
                  Resumen corto / Objetivo de aprendizaje <span className="text-xs font-normal text-slate-400">(se muestra debajo del título)</span>
                </span>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  rows={2}
                  placeholder="Describe en una o dos frases qué aprenderá el estudiante en esta clase..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none text-sm"
                />
              </div>
            </div>

            {/* 2. Content type & Visual Content Editor */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-black text-[#111] mb-1">2. Formato y Contenido de la Clase</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Elige si esta clase tiene video, lectura ilustrada con bloques clínicos, o un documento PDF.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { type: 'mixed', icon: '🎯', label: 'Mixto (Completo)', desc: 'Video + Texto + Receta' },
                    { type: 'video', icon: '🎥', label: 'Video Clase', desc: 'YouTube, Vimeo o Zoom' },
                    { type: 'text', icon: '📄', label: 'Lectura Clínica', desc: 'Texto, fotos y tablas' },
                    { type: 'pdf', icon: '📎', label: 'Documento PDF', desc: 'Visor PDF integrado' },
                    { type: 'external_link', icon: '🔗', label: 'Enlace Externo', desc: 'Zoom o web externa' },
                  ].map(({ type, icon, label, desc }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setField('content_type', type as ContentType)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        form.content_type === type
                          ? 'bg-[#1A4E26] text-white border-[#1A4E26] shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:border-[#1A4E26] bg-white'
                      }`}
                    >
                      <div className="text-lg mb-0.5">{icon}</div>
                      <div className="text-xs font-extrabold leading-tight">{label}</div>
                      <div className={`text-[10px] mt-0.5 ${form.content_type === type ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* VIDEO / MIXED video provider editor */}
              {['video', 'mixed'].includes(form.content_type) && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <PlayCircle size={18} className="text-[#1A4E26]" />
                    <span className="text-sm font-bold text-[#111]">Configuración del Video de la Clase</span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-[#111] block mb-1">Plataforma de Video</span>
                      <select
                        value={form.video_provider}
                        onChange={e => setField('video_provider', e.target.value as VideoProvider)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm"
                      >
                        <option value="youtube">YouTube (Recomendado)</option>
                        <option value="zoom">Zoom (Grabación / Sala)</option>
                        <option value="vimeo">Vimeo</option>
                        <option value="tiktok">TikTok</option>
                        <option value="custom">Enlace de Video Directo (.mp4)</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <Field
                        label={`Pega aquí el enlace o código de ${form.video_provider.toUpperCase()}`}
                        value={form.video_external_id}
                        onChange={v => setField('video_external_id', v)}
                        placeholder={
                          form.video_provider === 'youtube'
                            ? 'Pega el link completo de YouTube, ej: https://www.youtube.com/watch?v=...'
                            : 'https://...'
                        }
                      />
                    </div>
                  </div>
                  {videoId && form.video_provider === 'youtube' && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-w-xl">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="Vista previa del video"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TEXT / MIXED / VIDEO Visual Block & Content Editor */}
              {['text', 'mixed', 'video'].includes(form.content_type) && (
                <div className="space-y-4">
                  <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-[#1A4E26] block">
                          ✨ Insertar Bloques Visuales e Imágenes con 1 Clic (Sin programar)
                        </span>
                        <span className="text-xs text-slate-600">
                          Haz clic en cualquiera de estos botones para armar la explicación de tu clase:
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Upload image from PC */}
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A4E26] text-white text-xs font-bold cursor-pointer hover:bg-[#163F1E] transition-colors shadow-2xs">
                        {uploadingInlineImg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploadingInlineImg ? 'Subiendo foto...' : '🖼️ Subir Foto desde mi PC'}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingInlineImg}
                          onChange={handleInlineImageUpload}
                        />
                      </label>

                      {/* SUMAK Gallery picker */}
                      <button
                        type="button"
                        onClick={() => openBlockAssistant('gallery')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#1A4E26] text-[#1A4E26] text-xs font-bold hover:bg-[#E8F2EA] transition-colors"
                      >
                        <ImageIcon size={14} /> 🌿 Galería de Fotos SUMAK
                      </button>

                      {/* Symptoms / Causes Card Assistant */}
                      <button
                        type="button"
                        onClick={() => openBlockAssistant('symptoms')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:border-[#1A4E26] hover:text-[#1A4E26] transition-colors"
                      >
                        <Sparkles size={14} className="text-amber-600" /> + Cuadro de Síntomas / Causas
                      </button>

                      {/* Prevention / Habits Checklist Assistant */}
                      <button
                        type="button"
                        onClick={() => openBlockAssistant('habits')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:border-[#1A4E26] hover:text-[#1A4E26] transition-colors"
                      >
                        <ListChecks size={14} className="text-emerald-600" /> + Lista de Hábitos / Recomendaciones
                      </button>

                      {/* Clinical Table Assistant */}
                      <button
                        type="button"
                        onClick={() => openBlockAssistant('table')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:border-[#1A4E26] hover:text-[#1A4E26] transition-colors"
                      >
                        <Table size={14} className="text-blue-600" /> + Tabla Comparativa
                      </button>

                      {/* Highlight Box Assistant */}
                      <button
                        type="button"
                        onClick={() => openBlockAssistant('highlight')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:border-[#1A4E26] hover:text-[#1A4E26] transition-colors"
                      >
                        <BookOpen size={14} className="text-amber-600" /> + Caja de Resumen Destacado
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-[#111]">
                        Redacción de la Lección
                      </span>
                      <span className="text-xs text-slate-400">
                        Puedes escribir texto normal o insertar bloques con los botones de arriba
                      </span>
                    </div>

                    {/* Simple text formatting buttons */}
                    <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setField('text_content', form.text_content + '\n<h2>Título de Sección</h2>\n<p>Escribe aquí la explicación...</p>')}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 hover:border-[#1A4E26] rounded-lg"
                      >
                        + Título Grande
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('text_content', form.text_content + '\n<h3>Subtítulo</h3>\n')}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 hover:border-[#1A4E26] rounded-lg"
                      >
                        + Subtítulo
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('text_content', form.text_content + '\n<p>Escribe tu párrafo aquí...</p>')}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:border-[#1A4E26] rounded-lg"
                      >
                        + Párrafo
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('text_content', form.text_content + ' <strong>texto importante</strong> ')}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 hover:border-[#1A4E26] rounded-lg"
                      >
                        Negrita
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('text_content', form.text_content + '\n<ul>\n  <li>Punto importante 1</li>\n  <li>Punto importante 2</li>\n</ul>')}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:border-[#1A4E26] rounded-lg"
                      >
                        + Lista con Viñetas
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('text_content', form.text_content + '\n<ol>\n  <li>Primer paso</li>\n  <li>Segundo paso</li>\n</ol>')}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:border-[#1A4E26] rounded-lg"
                      >
                        + Lista Numerada
                      </button>
                    </div>

                    <textarea
                      value={form.text_content}
                      onChange={e => setField('text_content', e.target.value)}
                      rows={10}
                      placeholder="Escribe aquí la explicación de la clase o usa los botones verdes de arriba para insertar fotos, cuadros de síntomas, hábitos o tablas..."
                      className="w-full px-3.5 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26] resize-y text-sm bg-white leading-relaxed"
                    />
                  </div>

                  {/* Live Visual Preview */}
                  {form.text_content && (
                    <div className="border-2 border-[#C8D8CB] rounded-2xl p-5 bg-[#F8FBF8]">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#C8D8CB]">
                        <span className="text-xs font-black text-[#1A4E26] uppercase tracking-wider flex items-center gap-1.5">
                          <Eye size={14} /> Vista Previa en Vivo (Así se verá el texto e imágenes en la clase)
                        </span>
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-slate-800"
                        dangerouslySetInnerHTML={{ __html: form.text_content }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* PDF editor */}
              {form.content_type === 'pdf' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Sube el archivo PDF desde tu computadora o pega su enlace.
                  </p>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed rounded-xl p-6 text-center transition-colors bg-slate-50 hover:border-[#1A4E26] hover:bg-[#F8FBF8] border-slate-200">
                      {uploadingPdf ? (
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 size={24} className="animate-spin text-[#1A4E26] mb-2" />
                          <span className="text-sm font-semibold text-[#1A4E26]">Subiendo archivo PDF...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Upload size={24} className="text-slate-400 mb-2" />
                          <span className="text-sm font-semibold text-slate-700">Haz clic aquí para elegir el PDF desde tu computadora</span>
                          <span className="text-xs text-slate-400 mt-1">Se guardará automáticamente en esta lección</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept=".pdf" className="sr-only" disabled={uploadingPdf} onChange={handlePdfUpload} />
                  </label>
                  <Field
                    label="URL del archivo PDF"
                    value={form.external_url}
                    onChange={v => setField('external_url', v)}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              )}

              {/* External link editor */}
              {form.content_type === 'external_link' && (
                <div className="space-y-3">
                  <Field
                    label="Enlace externo (Zoom, Artículo o Sala en Vivo)"
                    value={form.external_url}
                    onChange={v => setField('external_url', v)}
                    placeholder="https://..."
                    type="url"
                    required
                  />
                  {form.external_url && (
                    <a
                      href={form.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#1A4E26] font-semibold hover:underline"
                    >
                      <ExternalLink size={14} /> Probar enlace
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 3. Step-by-Step Herbal Recipe / Protocol Builder (metadata.recipe_card) */}
            <div className="bg-white border-2 border-[#D4AF37]/50 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-black text-[#111] flex items-center gap-2">
                    <BookOpen size={18} className="text-[#1A4E26]" />
                    3. Receta Magistral o Preparación Paso a Paso (Opcional)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Activa esta opción si la lección incluye una infusión, decocción, extracto o protocolo paso a paso con ingredientes y cantidades.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-bold text-[#1A4E26] bg-[#E8F2EA] px-3.5 py-2 rounded-xl cursor-pointer border border-[#C8D8CB]">
                  <input
                    type="checkbox"
                    checked={form.has_recipe}
                    onChange={e => setField('has_recipe', e.target.checked)}
                    className="w-4 h-4 accent-[#1A4E26]"
                  />
                  🍵 Mostrar Receta en esta Lección
                </label>
              </div>

              {form.has_recipe && (
                <div className="space-y-5 pt-3 border-t border-slate-100">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <Field
                        label="Nombre de la Receta o Preparación *"
                        value={form.recipe_title}
                        onChange={v => setField('recipe_title', v)}
                        placeholder="Ej: Infusión Renal Litolítica de Chancapiedra y Cola de Caballo"
                      />
                    </div>
                    <Field
                      label="Tiempo de preparación"
                      value={form.recipe_prep_time}
                      onChange={v => setField('recipe_prep_time', v)}
                      placeholder="Ej: 10 minutos"
                    />
                    <Field
                      label="Porciones / Rendimiento"
                      value={form.recipe_servings}
                      onChange={v => setField('recipe_servings', v)}
                      placeholder="Ej: 1 taza (250 ml)"
                    />
                    <Field
                      label="Posología / Modo de Consumo"
                      value={form.recipe_posology}
                      onChange={v => setField('recipe_posology', v)}
                      placeholder="Ej: Tomar 1 taza tibia en ayunas por 14 días"
                    />
                  </div>

                  {/* Recipe Photo Upload / Presets */}
                  <div className="p-4 rounded-xl bg-[#F8FBF8] border border-[#C8D8CB] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#1A4E26]">
                        Foto de la Receta / Preparación
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A4E26] text-white text-xs font-bold cursor-pointer hover:bg-[#163F1E]">
                        {uploadingRecipeImg ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {uploadingRecipeImg ? 'Subiendo...' : 'Subir Foto de la Receta'}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingRecipeImg}
                          onChange={handleRecipeImageUpload}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-slate-500">O elige una imagen sugerida:</span>
                      {PRESET_RECIPE_IMAGES.map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setField('recipe_image_url', preset.url)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                            form.recipe_image_url === preset.url
                              ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-[#1A4E26]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <Field
                      label="O pega el enlace de una imagen"
                      value={form.recipe_image_url}
                      onChange={v => setField('recipe_image_url', v)}
                      placeholder="https://..."
                    />
                  </div>

                  {/* Recipe Benefits */}
                  <div>
                    <span className="text-sm font-semibold text-[#111] block mb-1.5">
                      Beneficios de esta preparación <span className="text-xs font-normal text-slate-400">(etiquetas que verá el alumno)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.recipe_benefits.map((b, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#E8F2EA] text-[#1A4E26] border border-[#C8D8CB] px-3 py-1 rounded-full"
                        >
                          ✓ {b}
                          <button
                            type="button"
                            onClick={() =>
                              setField(
                                'recipe_benefits',
                                form.recipe_benefits.filter((_, i) => i !== idx)
                              )
                            }
                            className="text-red-500 hover:text-red-700 font-black"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBenefit}
                        onChange={e => setNewBenefit(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newBenefit.trim()) {
                              setField('recipe_benefits', [...form.recipe_benefits, newBenefit.trim()]);
                              setNewBenefit('');
                            }
                          }
                        }}
                        placeholder="Ej: Desinflamante renal, Diurético suave..."
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newBenefit.trim()) {
                            setField('recipe_benefits', [...form.recipe_benefits, newBenefit.trim()]);
                            setNewBenefit('');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-[#E8F2EA] text-[#1A4E26] text-xs font-bold rounded-xl hover:bg-[#D5E8D9]"
                      >
                        + Añadir Beneficio
                      </button>
                    </div>
                  </div>

                  {/* Interactive Ingredients List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#111]">
                        🌿 Ingredientes Exactos y Cantidades ({form.recipe_ingredients.length})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setField('recipe_ingredients', [
                            ...form.recipe_ingredients,
                            { name: '', dose: '', notes: '' },
                          ])
                        }
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4E26] bg-[#E8F2EA] px-3 py-1.5 rounded-xl hover:bg-[#D5E8D9]"
                      >
                        <Plus size={13} /> Añadir Ingrediente
                      </button>
                    </div>

                    {form.recipe_ingredients.map((ing, idx) => {
                      const detectedIcon = parseIngredient(ing.name).image;
                      return (
                        <div
                          key={idx}
                          className="grid sm:grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 p-3 rounded-xl"
                        >
                          <div className="sm:col-span-4 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {detectedIcon ? (
                                <img src={detectedIcon} alt={ing.name} className="w-6 h-6 object-contain" />
                              ) : (
                                <Leaf size={14} className="text-[#1A4E26]" />
                              )}
                            </div>
                            <input
                              type="text"
                              value={ing.name}
                              onChange={e => {
                                const next = [...form.recipe_ingredients];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setField('recipe_ingredients', next);
                              }}
                              placeholder="Ingrediente (Ej: Chancapiedra)"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={ing.dose}
                              onChange={e => {
                                const next = [...form.recipe_ingredients];
                                next[idx] = { ...next[idx], dose: e.target.value };
                                setField('recipe_ingredients', next);
                              }}
                              placeholder="Cantidad / Dosis (Ej: 5 gramos o 1 cda)"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              value={ing.notes}
                              onChange={e => {
                                const next = [...form.recipe_ingredients];
                                next[idx] = { ...next[idx], notes: e.target.value };
                                setField('recipe_ingredients', next);
                              }}
                              placeholder="Rol (Ej: Planta principal)"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setField(
                                  'recipe_ingredients',
                                  form.recipe_ingredients.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Eliminar ingrediente"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Steps List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#111]">
                        📋 Pasos de Preparación ({form.recipe_steps.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setField('recipe_steps', [...form.recipe_steps, ''])}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4E26] bg-[#E8F2EA] px-3 py-1.5 rounded-xl hover:bg-[#D5E8D9]"
                      >
                        <Plus size={13} /> Añadir Paso
                      </button>
                    </div>

                    {form.recipe_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#1A4E26] text-white text-xs font-black flex items-center justify-center shrink-0 mt-1.5">
                          {idx + 1}
                        </span>
                        <textarea
                          rows={2}
                          value={step}
                          onChange={e => {
                            const next = [...form.recipe_steps];
                            next[idx] = e.target.value;
                            setField('recipe_steps', next);
                          }}
                          placeholder={`Describe el paso ${idx + 1} de la preparación...`}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A4E26]"
                        />
                        <div className="flex flex-col gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...form.recipe_steps];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                setField('recipe_steps', next);
                              }}
                              className="p-1 text-slate-400 hover:text-[#1A4E26] bg-slate-100 rounded"
                              title="Subir paso"
                            >
                              <ArrowUp size={12} />
                            </button>
                          )}
                          {idx < form.recipe_steps.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...form.recipe_steps];
                                [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                setField('recipe_steps', next);
                              }}
                              className="p-1 text-slate-400 hover:text-[#1A4E26] bg-slate-100 rounded"
                              title="Bajar paso"
                            >
                              <ArrowDown size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setField(
                                'recipe_steps',
                                form.recipe_steps.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Eliminar paso"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live Preview of StepByStepRecipeCard */}
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-2">
                      Vista Previa de la Tarjeta de Receta:
                    </p>
                    <StepByStepRecipeCard recipe={previewRecipeCard} />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Clinical Callout / Safety Alert Builder */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-black text-[#111] flex items-center gap-2">
                    <ShieldAlert size={18} className="text-amber-600" />
                    4. Alerta de Seguridad Médica o Nota Clínica (Opcional)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Destaca una advertencia importante, contraindicación en embarazo/lactancia o nota de dosificación.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer bg-amber-50 text-amber-900 border border-amber-200 px-3.5 py-2 rounded-xl">
                  <input
                    type="checkbox"
                    checked={form.has_callout}
                    onChange={e => setField('has_callout', e.target.checked)}
                    className="w-4 h-4 accent-[#1A4E26]"
                  />
                  Mostrar Alerta Médica
                </label>
              </div>

              {form.has_callout && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-[#111] block mb-1">Tipo de Alerta</span>
                      <select
                        value={form.callout_severity}
                        onChange={e => setField('callout_severity', e.target.value as ClinicalCalloutData['severity'])}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm"
                      >
                        <option value="info">🟢 Nota Clínica Informativa</option>
                        <option value="warning">🟡 Advertencia Fisiológica</option>
                        <option value="contraindication">🔴 Contraindicación Estricta</option>
                        <option value="toxicity">☠️ Alerta de Toxicidad / Dosificación</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <Field
                        label="Título de la Alerta Médica"
                        value={form.callout_title}
                        onChange={v => setField('callout_title', v)}
                        placeholder="Ej: Precaución en pacientes con hipertensión o gestación..."
                      />
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Explicación de la Alerta</span>
                    <textarea
                      rows={3}
                      value={form.callout_message}
                      onChange={e => setField('callout_message', e.target.value)}
                      placeholder="Describe de forma clara la precaución clínica o contraindicación..."
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

            {/* 5. Linked Botanical Sheets Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-[#111] flex items-center gap-2">
                  <Leaf size={18} className="text-[#1A4E26]" />
                  5. Plantas Medicinales del Vademécum en esta Lección
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona qué plantas medicinales se estudian en esta clase para que aparezca su Ficha Botánica completa automáticamente.
                </p>
              </div>

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

              <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Elegir Planta Medicinal</span>
                    <select
                      value={selectedBotanicalId}
                      onChange={e => setSelectedBotanicalId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm"
                    >
                      {allBotanicals.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.common_name} ({b.scientific_name})
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="¿Para qué sirve en esta lección? (Opcional)"
                    value={botanicalRole}
                    onChange={setBotanicalRole}
                    placeholder="Ej: Planta principal para disolver cálculos renales"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddBotanical}
                    disabled={addingBotanical || !selectedBotanicalId}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1A4E26] text-white text-xs font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50"
                  >
                    <Plus size={14} /> Agregar Planta a la Lección
                  </button>
                </div>
              </div>
            </div>

            {/* 6. Linked SUMAK Products & Clinical Dosage Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-[#111] flex items-center gap-2">
                  <Pill size={18} className="text-[#1A4E26]" />
                  6. Fórmulas Comerciales SUMAK Recomendadas en esta Clase
                </h3>
                <p className="text-xs text-slate-500">
                  Vincula uno o varios productos del catálogo oficial SUMAK indicando cómo debe tomarlos el paciente/estudiante.
                </p>
              </div>

              {lessonProducts.length > 0 && (
                <div className="space-y-2">
                  {lessonProducts.map(lp => (
                    <div key={lp.id} className="flex items-center justify-between gap-3 p-3 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-[#111]">
                          [{lp.product_code}] {lp.product_name}
                          {lp.protocol_phase && (
                            <span className="ml-2 text-[11px] bg-[#1A4E26] text-white px-2 py-0.5 rounded-full">
                              {lp.protocol_phase}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#1A4E26] font-semibold mt-0.5">Posología: {lp.dosage}</p>
                        {lp.administration_route && (
                          <p className="text-xs text-slate-600 mt-0.5">Vía: {lp.administration_route}</p>
                        )}
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

              <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Producto del Catálogo SUMAK</span>
                    <select
                      value={selectedProductCode}
                      onChange={e => setSelectedProductCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm"
                    >
                      {products.map(p => (
                        <option key={p.codigo} value={p.codigo}>
                          [{p.codigo}] {p.nombre} — ${p.pvp.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Etapa o Fase del Tratamiento (Opcional)"
                    value={productPhase}
                    onChange={setProductPhase}
                    placeholder="Ej: Fase 1: Desintoxicación y Drenaje"
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field
                    label="Dosificación Exacta *"
                    value={productDosage}
                    onChange={setProductDosage}
                    placeholder="Ej: 1 copa dosificadora (15 ml) 2 veces al día"
                  />
                  <Field
                    label="Modo de Consumo"
                    value={productRoute}
                    onChange={setProductRoute}
                    placeholder="Ej: 30 minutos antes del desayuno y cena"
                  />
                  <Field
                    label="Precaución Específica"
                    value={productPrecautions}
                    onChange={setProductPrecautions}
                    placeholder="Ej: Evitar en embarazo y lactancia"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={addingProduct || !productDosage.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1A4E26] text-white text-xs font-bold rounded-xl hover:bg-[#163F1E] disabled:opacity-50"
                  >
                    <Plus size={14} /> Agregar Producto SUMAK a la Lección
                  </button>
                </div>
              </div>
            </div>

            {/* 7. Downloadable Resources section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-base font-black text-[#111] mb-1 flex items-center gap-2">
                <FileText size={18} className="text-[#1A4E26]" /> 7. Material Descargable de Apoyo (PDFs, Guías, Diapositivas)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Sube archivos adicionales que el estudiante podrá descargar debajo de la lección.
              </p>

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
              <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Subir nuevo archivo descargable</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Nombre con el que verá el archivo el alumno" value={resTitle} onChange={setResTitle} placeholder="Ej: Guía Clínica del Protocolo Renal (PDF)" />
                  <label className="block">
                    <span className="text-sm font-semibold text-[#111] block mb-1">Tipo de archivo</span>
                    <select value={resType} onChange={e => setResType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26] text-sm">
                      {[
                        { value: 'pdf', label: 'Documento PDF' },
                        { value: 'document', label: 'Documento Word / Guía' },
                        { value: 'presentation', label: 'Presentación / Diapositivas' },
                        { value: 'image', label: 'Infografía / Imagen' },
                        { value: 'external_link', label: 'Enlace Web' },
                      ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </div>

                {/* File upload */}
                <label className="block cursor-pointer">
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors bg-white
                    ${resFile ? 'border-[#1A4E26] bg-[#F0FFF4]' : 'border-slate-200 hover:border-[#1A4E26] hover:bg-[#F8FBF8]'}`}>
                    <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 block">
                      {resFile ? `Archivo seleccionado: ${resFile.name}` : 'Haz clic aquí para seleccionar el archivo desde tu computadora'}
                    </span>
                    <span className="text-xs text-slate-400">PDF, imágenes, documentos</span>
                  </div>
                  <input type="file" className="sr-only" onChange={e => {
                    const f = e.target.files?.[0] ?? null;
                    setResFile(f);
                    if (f && !resTitle.trim()) {
                      setResTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
                    }
                  }} />
                </label>

                <Field label="O pega un enlace externo (Opcional)" value={resUrl} onChange={setResUrl} placeholder="https://..." type="url" />

                <div className="flex justify-end">
                  <button type="button" onClick={addResource} disabled={uploadingResource || !resTitle.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#111] text-white text-xs font-bold rounded-xl hover:bg-[#333] disabled:opacity-50 transition-colors">
                    {uploadingResource ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {uploadingResource ? 'Subiendo archivo...' : 'Adjuntar Material a la Lección'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings sidebar */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">

            {/* Visibility */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-black text-[#111] mb-3">Visibilidad y Acceso</p>
              <div className="space-y-2.5">
                <button type="button" onClick={() => setField('is_published', !form.is_published)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-colors
                    ${form.is_published ? 'bg-[#E8F2EA] border-[#C8D8CB] text-[#1A4E26]' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  {form.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                  <div className="text-left">
                    <span className="text-sm font-bold block">{form.is_published ? 'Lección Publicada' : 'Oculta (En Borrador)'}</span>
                    <span className="text-[11px] opacity-80">{form.is_published ? 'Los alumnos pueden verla' : 'Solo visible para administración'}</span>
                  </div>
                </button>

                <button type="button" onClick={() => setField('is_free_preview', !form.is_free_preview)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-colors
                    ${form.is_free_preview ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {form.is_free_preview ? <Unlock size={16} /> : <Lock size={16} />}
                  <div className="text-left">
                    <span className="text-sm font-bold block">{form.is_free_preview ? 'Clase de Muestra Gratis' : 'Solo Alumnos Inscritos'}</span>
                    <span className="text-[11px] opacity-75">{form.is_free_preview ? 'Abierta para visitantes' : 'Requiere inscripción al curso'}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-sm font-black text-[#111]">Requisitos para el Certificado</p>
              
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-[#1A4E26] transition-colors bg-[#F8FBF8]">
                <input type="checkbox" checked={form.is_required}
                  onChange={e => setField('is_required', e.target.checked)}
                  className="w-4 h-4 accent-[#1A4E26] shrink-0" />
                <div className="text-left">
                  <span className="text-sm font-bold block text-[#111]">🎓 Lección Obligatoria</span>
                  <span className="text-xs text-slate-500">El alumno debe completarla para obtener su certificado</span>
                </div>
              </label>

              <Field label="Duración estimada (minutos)" value={form.estimated_minutes}
                onChange={v => setField('estimated_minutes', v)} type="number" min="1" placeholder="Ej: 15" />
            </div>

            {/* Status summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-sm font-black text-[#111]">Checklist de la Lección</p>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {form.title.trim()
                  ? <CheckCircle size={15} className="text-[#1A4E26]" />
                  : <XCircle size={15} className="text-red-400" />}
                <span className="text-slate-700">Título configurado</span>
              </div>
              {['video', 'mixed'].includes(form.content_type) && (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {form.video_external_id.trim()
                    ? <CheckCircle size={15} className="text-[#1A4E26]" />
                    : <XCircle size={15} className="text-amber-500" />}
                  <span className="text-slate-700">Video ({form.video_provider})</span>
                </div>
              )}
              {['text', 'mixed'].includes(form.content_type) && (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {form.text_content.trim()
                    ? <CheckCircle size={15} className="text-[#1A4E26]" />
                    : <XCircle size={15} className="text-amber-500" />}
                  <span className="text-slate-700">Explicación / Texto</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs font-semibold">
                {form.has_recipe
                  ? <CheckCircle size={15} className="text-[#1A4E26]" />
                  : <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />}
                <span className="text-slate-700">Receta Paso a Paso ({form.has_recipe ? 'Sí' : 'No'})</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {lessonBotanicals.length > 0
                  ? <CheckCircle size={15} className="text-[#1A4E26]" />
                  : <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />}
                <span className="text-slate-700">Plantas vinculadas ({lessonBotanicals.length})</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {lessonProducts.length > 0
                  ? <CheckCircle size={15} className="text-[#1A4E26]" />
                  : <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />}
                <span className="text-slate-700">Productos SUMAK ({lessonProducts.length})</span>
              </div>
            </div>

            {/* Save button */}
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#1A4E26] text-white font-bold text-sm rounded-xl hover:bg-[#163F1E] disabled:opacity-60 transition-colors shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar Toda la Lección'}
            </button>
          </div>
        </div>
      </form>

      {/* Visual Block Assistant Modal (for Non-Programmers) */}
      <Modal
        open={blockModalType !== null}
        onClose={() => setBlockModalType(null)}
        title={
          blockModalType === 'symptoms'
            ? '🩺 Insertar Cuadro de Síntomas o Causas'
            : blockModalType === 'habits'
            ? '🌿 Insertar Lista de Hábitos o Recomendaciones'
            : blockModalType === 'table'
            ? '📊 Insertar Tabla Comparativa Clínica'
            : blockModalType === 'highlight'
            ? '✨ Insertar Caja de Resumen Destacado'
            : '🌿 Galería Oficial de Fotos SUMAK'
        }
        size="lg"
      >
        {blockModalType === 'gallery' ? (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <p className="text-xs text-slate-600">
              Haz clic en cualquier producto o planta para insertar su imagen oficial directamente dentro del contenido de la lección:
            </p>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-2.5">
                Fórmulas Oficiales SUMAK
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {products.map(p => (
                  <button
                    key={p.codigo}
                    type="button"
                    onClick={() => insertGalleryImage(p.imagen, `${p.nombre} (${p.presentacion})`)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-[#1A4E26] hover:bg-[#F4F7F5] text-center transition-all flex flex-col items-center gap-1.5"
                  >
                    <img src={p.imagen} alt={p.nombre} className="w-14 h-14 object-contain" />
                    <span className="text-[11px] font-bold text-[#111] line-clamp-1">{p.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-2.5">
                Plantas del Vademécum SUMAK
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {allBotanicals.map(b => {
                  const icon = b.image_url || parseIngredient(b.common_name).image;
                  if (!icon) return null;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => insertGalleryImage(icon, `${b.common_name} (${b.scientific_name})`)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-[#1A4E26] hover:bg-[#F4F7F5] text-center transition-all flex flex-col items-center gap-1.5"
                    >
                      <img src={icon} alt={b.common_name} className="w-12 h-12 object-contain" />
                      <span className="text-[11px] font-bold text-[#111] line-clamp-1">{b.common_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : blockModalType === 'highlight' ? (
          <div className="p-6 space-y-4">
            <Field
              label="Título del Recuadro Destacado"
              value={blockTitle}
              onChange={setBlockTitle}
              placeholder="Ej: Recuerda este principio clínico"
            />
            <label className="block">
              <span className="text-sm font-semibold text-[#111] block mb-1">Mensaje o Resumen</span>
              <textarea
                rows={4}
                value={blockNoteText}
                onChange={e => setBlockNoteText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                placeholder="Escribe aquí el mensaje clave..."
              />
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockModalType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertVisualBlockIntoLesson}
                className="px-5 py-2 bg-[#1A4E26] text-white text-xs font-bold rounded-xl hover:bg-[#163F1E]"
              >
                Insertar en la Lección
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <Field
              label="Título del Bloque"
              value={blockTitle}
              onChange={setBlockTitle}
              placeholder="Título..."
            />
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Elementos del bloque
                </span>
                <button
                  type="button"
                  onClick={() => setBlockItems([...blockItems, { col1: '', col2: '' }])}
                  className="text-xs font-bold text-[#1A4E26] hover:underline"
                >
                  + Añadir fila
                </button>
              </div>
              {blockItems.map((it, idx) => (
                <div key={idx} className="grid sm:grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={it.col1}
                    onChange={e => {
                      const next = [...blockItems];
                      next[idx] = { ...next[idx], col1: e.target.value };
                      setBlockItems(next);
                    }}
                    placeholder={
                      blockModalType === 'symptoms'
                        ? 'Síntoma o causa (Ej: Fatiga crónica)'
                        : blockModalType === 'habits'
                        ? 'Hábito (Ej: Hidratación en ayunas)'
                        : 'Columna 1 (Ej: Fase 1)'
                    }
                    className="sm:col-span-4 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={it.col2}
                    onChange={e => {
                      const next = [...blockItems];
                      next[idx] = { ...next[idx], col2: e.target.value };
                      setBlockItems(next);
                    }}
                    placeholder="Explicación o detalle..."
                    className="sm:col-span-7 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setBlockItems(blockItems.filter((_, i) => i !== idx))}
                    className="sm:col-span-1 p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockModalType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertVisualBlockIntoLesson}
                className="px-5 py-2 bg-[#1A4E26] text-white text-xs font-bold rounded-xl hover:bg-[#163F1E]"
              >
                Insertar Bloque en la Lección
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
