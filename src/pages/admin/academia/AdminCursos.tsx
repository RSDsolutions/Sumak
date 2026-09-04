import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, ChevronDown, Eye, EyeOff, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import Modal from '../../../components/Modal';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyCategory, AcademyCourse, AcademyLesson, AcademyModule, AcademyResource, ContentType } from '../../../lib/academy-types';

type CourseForm = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  level: string;
  access_mode: string;
  status: string;
  estimated_duration_minutes: string;
  passing_percentage: string;
  generates_certificate: boolean;
  price: string;
  instructor_id: string;
};

const emptyForm: CourseForm = {
  title: '', slug: '', short_description: '', description: '', category_id: '',
  level: 'beginner', access_mode: 'free_registered', status: 'draft',
  estimated_duration_minutes: '', passing_percentage: '70', generates_certificate: false, price: '0', instructor_id: '',
};

function courseToForm(course: AcademyCourse): CourseForm {
  return {
    title: course.title,
    slug: course.slug,
    short_description: course.short_description ?? '',
    description: course.description ?? '',
    category_id: course.category_id ?? '',
    level: course.level,
    access_mode: course.access_mode,
    status: course.status,
    estimated_duration_minutes: course.estimated_duration_minutes?.toString() ?? '',
    passing_percentage: course.passing_percentage.toString(),
    generates_certificate: course.generates_certificate,
    price: course.price?.toString() || '0',
    instructor_id: course.instructor_id ?? '',
  };
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminCursos() {
  const toast = useToast();
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'course' | 'category' | null>(null);
  const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' });
  const [builderCourse, setBuilderCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonDraft, setLessonDraft] = useState<{ moduleId: string; lesson: AcademyLesson | null }>({ moduleId: '', lesson: null });
  const [lessonForm, setLessonForm] = useState<{ title: string; content_type: ContentType; text_content: string; video_external_id: string; estimated_minutes: string }>({ title: '', content_type: 'text', text_content: '', video_external_id: '', estimated_minutes: '' });
  const [resources, setResources] = useState<AcademyResource[]>([]);
  const [resourceForm, setResourceForm] = useState({ title: '', file_url: '', file_name: '', file_type: 'pdf' });
  const [assessments, setAssessments] = useState<any[]>([]);
  const [assessmentForm, setAssessmentForm] = useState({ title: '', passing_score: '70', max_attempts: '', is_final_exam: false });
  const [questionAssessment, setQuestionAssessment] = useState<any | null>(null);
  const [questionForm, setQuestionForm] = useState({ question_text: '', question_type: 'single_choice', points: '1', options: ['', ''] });
  const [correctOptions, setCorrectOptions] = useState<number[]>([0]);

  async function load() {
    setLoading(true);
    try {
      const [nextCourses, nextCategories, nextInstructors] = await Promise.all([
        academyAPI.getAdminCourses(), academyAPI.getAdminCategories(), academyAPI.getAdminInstructors()
      ]);
      setCourses(nextCourses);
      setCategories(nextCategories);
      setInstructors(nextInstructors);
    } catch {
      toast.error('No se pudo cargar el catálogo de Academy.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const matchesSearch = `${course.title} ${course.slug}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || course.status === statusFilter);
  }), [courses, search, statusFilter]);

  function openNewCourse() {
    setEditingCourse(null);
    setForm(emptyForm);
    setModal('course');
  }

  function openEditCourse(course: AcademyCourse) {
    setEditingCourse(course);
    setForm(courseToForm(course));
    setModal('course');
  }

  async function openBuilder(course: AcademyCourse) {
    setBuilderCourse(course);
    setBuilderLoading(true);
    try {
      setModules(await academyAPI.getAdminCourseContent(course.id));
      setAssessments(await academyAPI.getAdminAssessments(course.id));
    } catch {
      toast.error('No se pudo cargar el contenido del curso.');
    } finally {
      setBuilderLoading(false);
    }
  }

  async function addAssessment() {
    if (!builderCourse || !assessmentForm.title.trim()) return;
    try {
      const assessment = await academyAPI.saveAdminAssessment(null, { course_id: builderCourse.id, title: assessmentForm.title.trim(), description: '', passing_score: Number(assessmentForm.passing_score), max_attempts: assessmentForm.max_attempts ? Number(assessmentForm.max_attempts) : null, is_final_exam: assessmentForm.is_final_exam, is_published: false, sort_order: assessments.length + 1 });
      setAssessments((current) => [...current, { ...assessment, questions: [] }]);
      setAssessmentForm({ title: '', passing_score: '70', max_attempts: '', is_final_exam: false });
      toast.success('Evaluación creada como borrador.');
    } catch { toast.error('No se pudo crear la evaluación.'); }
  }

  async function addQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!questionAssessment || !questionForm.question_text.trim()) return;
    try {
      const question = await academyAPI.createAdminQuestion({ assessment_id: questionAssessment.id, question_text: questionForm.question_text.trim(), question_type: questionForm.question_type, points: Number(questionForm.points), sort_order: (questionAssessment.questions?.length ?? 0) + 1, options: questionForm.options.filter((option) => option.trim()).map((option, index) => ({ option_text: option.trim(), is_correct: correctOptions.includes(index), sort_order: index + 1 })) });
      setAssessments((current) => current.map((assessment) => assessment.id === questionAssessment.id ? { ...assessment, questions: [...(assessment.questions ?? []), question] } : assessment));
      setQuestionAssessment(null);
      setQuestionForm({ question_text: '', question_type: 'single_choice', points: '1', options: ['', ''] });
      setCorrectOptions([0]);
      toast.success('Pregunta creada.');
    } catch { toast.error('No se pudo crear la pregunta.'); }
  }

  async function moveModule(moduleIndex: number, direction: 'up' | 'down') {
    if ((direction === 'up' && moduleIndex === 0) || (direction === 'down' && moduleIndex === modules.length - 1)) return;
    const newModules = [...modules];
    const targetIndex = direction === 'up' ? moduleIndex - 1 : moduleIndex + 1;
    const temp = newModules[moduleIndex];
    newModules[moduleIndex] = newModules[targetIndex];
    newModules[targetIndex] = temp;
    newModules[moduleIndex].sort_order = moduleIndex + 1;
    newModules[targetIndex].sort_order = targetIndex + 1;
    setModules(newModules);
    try {
      await Promise.all([
        academyAPI.saveAdminModule(newModules[moduleIndex].id, { ...newModules[moduleIndex], course_id: builderCourse!.id }),
        academyAPI.saveAdminModule(newModules[targetIndex].id, { ...newModules[targetIndex], course_id: builderCourse!.id })
      ]);
    } catch { toast.error('Error reordenando módulos.'); void openBuilder(builderCourse!); }
  }

  async function deleteModule(module: AcademyModule) {
    if (module.lessons && module.lessons.length > 0) return toast.error('Elimina primero las lecciones.');
    if (!confirm(`¿Eliminar módulo "${module.title}"?`)) return;
    try {
      await academyAPI.deleteAdminModule(module.id);
      setModules((current) => current.filter((m) => m.id !== module.id));
      toast.success('Módulo eliminado.');
    } catch { toast.error('Error eliminando módulo.'); }
  }

  async function toggleModulePublish(module: AcademyModule) {
    try {
      const updated = await academyAPI.saveAdminModule(module.id, { ...module, course_id: builderCourse!.id, is_published: !module.is_published });
      setModules((current) => current.map((m) => m.id === module.id ? { ...m, is_published: updated.is_published } : m));
    } catch { toast.error('Error actualizando módulo.'); }
  }

  async function moveLesson(moduleId: string, lessonIndex: number, direction: 'up' | 'down') {
    const module = modules.find(m => m.id === moduleId);
    if (!module || !module.lessons) return;
    if ((direction === 'up' && lessonIndex === 0) || (direction === 'down' && lessonIndex === module.lessons.length - 1)) return;
    
    const newLessons = [...module.lessons];
    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    const temp = newLessons[lessonIndex];
    newLessons[lessonIndex] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;
    newLessons[lessonIndex].sort_order = lessonIndex + 1;
    newLessons[targetIndex].sort_order = targetIndex + 1;
    
    setModules(current => current.map(m => m.id === moduleId ? { ...m, lessons: newLessons } : m));
    try {
      await Promise.all([
        academyAPI.saveAdminLesson(newLessons[lessonIndex].id, { ...newLessons[lessonIndex], module_id: moduleId }),
        academyAPI.saveAdminLesson(newLessons[targetIndex].id, { ...newLessons[targetIndex], module_id: moduleId })
      ]);
    } catch { toast.error('Error reordenando lecciones.'); void openBuilder(builderCourse!); }
  }

  async function deleteLesson(moduleId: string, lessonId: string) {
    if (!confirm('¿Eliminar esta lección?')) return;
    try {
      await academyAPI.deleteAdminLesson(lessonId);
      setModules(current => current.map(m => m.id === moduleId ? { ...m, lessons: m.lessons?.filter(l => l.id !== lessonId) } : m));
      toast.success('Lección eliminada.');
    } catch { toast.error('Error eliminando lección.'); }
  }

  async function toggleLessonPublish(moduleId: string, lesson: AcademyLesson) {
    try {
      const updated = await academyAPI.saveAdminLesson(lesson.id, { ...lesson, module_id: moduleId, is_published: !lesson.is_published });
      setModules(current => current.map(m => m.id === moduleId ? { ...m, lessons: m.lessons?.map(l => l.id === lesson.id ? updated as AcademyLesson : l) } : m));
    } catch { toast.error('Error actualizando lección.'); }
  }

  async function deleteAssessment(assessmentId: string) {
    if (!confirm('¿Eliminar evaluación?')) return;
    try {
      await academyAPI.deleteAdminAssessment(assessmentId);
      setAssessments(current => current.filter(a => a.id !== assessmentId));
      toast.success('Evaluación eliminada.');
    } catch { toast.error('Error eliminando evaluación.'); }
  }
  
  async function deleteQuestion(assessmentId: string, questionId: string) {
    if (!confirm('¿Eliminar pregunta?')) return;
    try {
      await academyAPI.deleteAdminQuestion(questionId);
      setAssessments(current => current.map(a => a.id === assessmentId ? { ...a, questions: a.questions?.filter((q: any) => q.id !== questionId) } : a));
      toast.success('Pregunta eliminada.');
    } catch { toast.error('Error eliminando pregunta.'); }
  }

  async function addModule() {
    if (!builderCourse || !moduleTitle.trim()) return;
    try {
      const module = await academyAPI.saveAdminModule(null, { course_id: builderCourse.id, title: moduleTitle.trim(), description: '', sort_order: modules.length + 1, is_published: true });
      setModules((current) => [...current, { ...module, lessons: [] }]);
      setModuleTitle('');
      toast.success('Módulo creado.');
    } catch { toast.error('No se pudo crear el módulo.'); }
  }

  async function openLesson(moduleId: string, lesson: AcademyLesson | null = null) {
    setLessonDraft({ moduleId, lesson });
    setLessonForm({ title: lesson?.title ?? '', content_type: lesson?.content_type ?? 'text', text_content: lesson?.text_content ?? '', video_external_id: lesson?.video_external_id ?? '', estimated_minutes: lesson?.estimated_minutes?.toString() ?? '' });
    setResourceForm({ title: '', file_url: '', file_name: '', file_type: 'pdf' });
    if (lesson) {
      try { setResources(await academyAPI.getAdminLessonResources(lesson.id)); }
      catch { toast.error('No se pudieron cargar los recursos.'); }
    } else setResources([]);
  }

  async function saveLesson(event: React.FormEvent) {
    event.preventDefault();
    const module = modules.find((item) => item.id === lessonDraft.moduleId);
    if (!module || !lessonForm.title.trim()) return;
    try {
      const lesson = await academyAPI.saveAdminLesson(lessonDraft.lesson?.id ?? null, { module_id: module.id, title: lessonForm.title.trim(), content_type: lessonForm.content_type, text_content: lessonForm.text_content || null, video_external_id: lessonForm.video_external_id || null, video_provider: lessonForm.video_external_id ? 'youtube' : null, estimated_minutes: lessonForm.estimated_minutes ? Number(lessonForm.estimated_minutes) : null, sort_order: (module.lessons?.length ?? 0) + (lessonDraft.lesson ? 0 : 1), is_published: true, is_free_preview: false });
      setModules((current) => current.map((item) => item.id === module.id ? { ...item, lessons: lessonDraft.lesson ? item.lessons?.map((itemLesson) => itemLesson.id === lesson.id ? lesson : itemLesson) : [...(item.lessons ?? []), lesson] } : item));
      setLessonDraft({ moduleId: '', lesson: null });
      toast.success('Lección guardada.');
    } catch { toast.error('No se pudo guardar la lección.'); }
  }

  async function addResource(event: React.FormEvent) {
    event.preventDefault();
    const lesson = lessonDraft.lesson;
    if (!lesson || !resourceForm.title.trim() || !resourceForm.file_url.trim()) return;
    try {
      const resource = await academyAPI.createAdminResource({ ...resourceForm, lesson_id: lesson.id, description: '', sort_order: resources.length + 1 });
      setResources((current) => [...current, resource as AcademyResource]);
      setResourceForm({ title: '', file_url: '', file_name: '', file_type: 'pdf' });
      toast.success('Recurso agregado.');
    } catch { toast.error('No se pudo agregar el recurso.'); }
  }

  async function removeResource(resourceId: string) {
    try {
      await academyAPI.deleteAdminResource(resourceId);
      setResources((current) => current.filter((resource) => resource.id !== resourceId));
      toast.success('Recurso eliminado.');
    } catch { toast.error('No se pudo eliminar el recurso.'); }
  }

  async function saveCourse(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      await academyAPI.saveAdminCourse(editingCourse?.id ?? null, {
        ...form,
        category_id: form.category_id || null,
        instructor_id: form.instructor_id || null,
        estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
        passing_percentage: Number(form.passing_percentage),
        price: Number(form.price),
      });
      toast.success(editingCourse ? 'Curso actualizado.' : 'Curso creado.');
      setModal(null);
      await load();
    } catch {
      toast.error('No se pudo guardar el curso. Revisa el slug y los datos.');
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await academyAPI.createAdminCategory({
        ...categoryForm,
        sort_order: categories.length + 1,
      });
      toast.success('Categoría creada.');
      setCategoryForm({ name: '', slug: '', description: '' });
      setModal(null);
      await load();
    } catch {
      toast.error('No se pudo crear la categoría.');
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Cursos</h1>
          <p className="text-[#6B7280]">Gestiona el catálogo y prepara el contenido académico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setModal('category')} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A4E26] border border-[#C8D8CB] font-bold rounded-xl hover:bg-[#F4F7F5] transition-colors">
            <Plus size={18} /> Categoría
          </button>
          <button type="button" onClick={openNewCourse} className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white font-bold rounded-xl hover:bg-[#163F1E] transition-colors">
            <Plus size={18} /> Nuevo curso
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#C8D8CB] flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A4E26] focus:border-[#1A4E26] outline-none"
          />
          </div>
          <label className="relative md:w-48">
            <span className="sr-only">Filtrar por estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="appearance-none w-full px-3 py-2 pr-9 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26]">
              <option value="all">Todos los estados</option>
              <option value="draft">Borradores</option>
              <option value="published">Publicados</option>
              <option value="archived">Archivados</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#6B7280]"><Loader2 size={20} className="animate-spin" /> Cargando cursos...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 px-6"><BookOpen className="mx-auto text-slate-300 mb-3" size={48} /><p className="text-slate-500">No hay cursos que coincidan con el filtro.</p></div>
        ) : (
          <div className="divide-y divide-[#E5ECE6]">
            {filteredCourses.map((course) => (
              <div key={course.id} className="p-4 sm:p-6 hover:bg-[#F8FBF8] transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#E8F2EA] text-[#1A4E26] flex items-center justify-center shrink-0"><BookOpen size={20} /></div>
                <div className="min-w-0 flex-1"><h2 className="font-bold text-[#111111] truncate">{course.title}</h2><p className="text-xs text-[#6B7280] mt-1 truncate">/{course.slug} {course.category?.name ? `· ${course.category.name}` : ''}</p></div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${course.status === 'published' ? 'bg-[#E8F2EA] text-[#1A4E26]' : course.status === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-[#FFF7DF] text-[#92680A]'}`}>{course.status === 'published' ? 'Publicado' : course.status === 'archived' ? 'Archivado' : 'Borrador'}</span>
                <div className="flex gap-2"><button type="button" onClick={() => openBuilder(course)} className="px-3 py-1.5 rounded-lg bg-[#E8F2EA] text-[#1A4E26] text-xs font-bold">Contenido</button><button type="button" onClick={() => openEditCourse(course)} className="px-3 py-1.5 rounded-lg border border-[#C8D8CB] text-[#6B7280] text-xs font-bold">Editar</button></div>
              </div>
            ))}
          </div>
        )}
        <div className="px-4 sm:px-6 py-3 bg-[#F8FBF8] text-xs text-[#6B7280]">{filteredCourses.length} curso{filteredCourses.length === 1 ? '' : 's'} · {categories.length} categoría{categories.length === 1 ? '' : 's'}</div>
      </div>

      <Modal open={modal === 'course'} onClose={() => setModal(null)} title={editingCourse ? 'Editar curso' : 'Nuevo curso'} subtitle="Configura la información base del curso." size="lg">
        <form onSubmit={saveCourse} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Título" value={form.title} onChange={(value) => { setField('title', value); if (!editingCourse) setField('slug', slugify(value)); }} required />
            <Field label="Slug" value={form.slug} onChange={(value) => setField('slug', slugify(value))} required />
          </div>
          <Field label="Descripción corta" value={form.short_description} onChange={(value) => setField('short_description', value)} />
          <label className="block text-sm font-semibold text-[#111111]">Descripción<textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={4} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26]" /></label>
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Categoría" value={form.category_id} onChange={(value) => setField('category_id', value)} options={[{ value: '', label: 'Sin categoría' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} />
            <SelectField label="Instructor" value={form.instructor_id} onChange={(value) => setField('instructor_id', value)} options={[{ value: '', label: 'Sin instructor' }, ...instructors.map((inst) => ({ value: inst.id, label: inst.nombre_completo }))]} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Nivel" value={form.level} onChange={(value) => setField('level', value)} options={[{ value: 'beginner', label: 'Inicial' }, { value: 'intermediate', label: 'Intermedio' }, { value: 'advanced', label: 'Avanzado' }, { value: 'all', label: 'Todos' }]} />
            <SelectField label="Acceso" value={form.access_mode} onChange={(value) => setField('access_mode', value)} options={[{ value: 'public', label: 'Público' }, { value: 'free_registered', label: 'Gratis registrado' }, { value: 'sumak_exclusive', label: 'Exclusivo SUMAK' }, { value: 'premium', label: 'Premium' }, { value: 'assigned', label: 'Asignado' }, { value: 'hidden', label: 'Oculto' }]} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <SelectField label="Estado" value={form.status} onChange={(value) => setField('status', value)} options={[{ value: 'draft', label: 'Borrador' }, { value: 'published', label: 'Publicado' }, { value: 'archived', label: 'Archivado' }]} />
            <Field label="Duración (minutos)" value={form.estimated_duration_minutes} onChange={(value) => setField('estimated_duration_minutes', value)} type="number" min="0" />
            <Field label="Aprobación (%)" value={form.passing_percentage} onChange={(value) => setField('passing_percentage', value)} type="number" min="0" max="100" />
          </div>
          <Field label="Precio" value={form.price} onChange={(value) => setField('price', value)} type="number" min="0" step="0.01" />
          <label className="flex items-center gap-2 text-sm font-semibold text-[#111111]"><input type="checkbox" checked={form.generates_certificate} onChange={(event) => setField('generates_certificate', event.target.checked)} className="accent-[#1A4E26]" /> Este curso genera certificado</label>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5ECE6]"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-bold text-[#6B7280]">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#1A4E26] text-white font-bold text-sm disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar curso'}</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'category'} onClose={() => setModal(null)} title="Nueva categoría" subtitle="Organiza el catálogo de Academy.">
        <form onSubmit={saveCategory} className="p-6 space-y-4">
          <Field label="Nombre" value={categoryForm.name} onChange={(value) => setCategoryForm((current) => ({ ...current, name: value, slug: slugify(value) }))} required />
          <Field label="Slug" value={categoryForm.slug} onChange={(value) => setCategoryForm((current) => ({ ...current, slug: slugify(value) }))} required />
          <label className="block text-sm font-semibold text-[#111111]">Descripción<textarea value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26]" /></label>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5ECE6]"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-bold text-[#6B7280]">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#1A4E26] text-white font-bold text-sm disabled:opacity-60">{saving ? 'Guardando...' : 'Crear categoría'}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(builderCourse)} onClose={() => setBuilderCourse(null)} title={builderCourse ? `Contenido · ${builderCourse.title}` : ''} subtitle="Ordena módulos y crea lecciones." size="lg">
        <div className="p-6 space-y-5">
          {builderLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#1A4E26]" /></div> : <>
            <div className="flex gap-2"><input value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="Nombre del nuevo módulo" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26]" /><button type="button" onClick={() => void addModule()} className="px-3 py-2 rounded-xl bg-[#1A4E26] text-white text-sm font-bold"><Plus size={16} /></button></div>
            {modules.length === 0 ? <p className="text-sm text-[#6B7280] text-center py-6">Este curso todavía no tiene módulos.</p> : modules.map((module, moduleIndex) => (
              <section key={module.id} className={`border ${module.is_published ? 'border-[#C8D8CB]' : 'border-slate-200 bg-slate-50'} rounded-xl p-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button type="button" onClick={() => moveModule(moduleIndex, 'up')} disabled={moduleIndex === 0} className="text-slate-400 hover:text-[#1A4E26] disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button type="button" onClick={() => moveModule(moduleIndex, 'down')} disabled={moduleIndex === modules.length - 1} className="text-slate-400 hover:text-[#1A4E26] disabled:opacity-30"><ArrowDown size={14} /></button>
                    </div>
                    <h3 className={`font-bold ${module.is_published ? 'text-[#111111]' : 'text-slate-500'}`}>{module.sort_order}. {module.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleModulePublish(module)} className={`p-1.5 rounded-lg ${module.is_published ? 'text-[#1A4E26] bg-[#E8F2EA]' : 'text-slate-500 bg-slate-200'}`}>{module.is_published ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                    <button type="button" onClick={() => deleteModule(module)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                    <button type="button" onClick={() => void openLesson(module.id)} className="ml-2 text-xs font-bold text-[#1A4E26] flex items-center gap-1"><Plus size={14} /> Lección</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {(module.lessons ?? []).map((lesson, lessonIndex) => (
                    <div key={lesson.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${lesson.is_published ? 'bg-[#F8FBF8]' : 'bg-slate-100 opacity-75'}`}>
                      <div className="flex flex-col">
                        <button type="button" onClick={() => moveLesson(module.id, lessonIndex, 'up')} disabled={lessonIndex === 0} className="text-slate-400 hover:text-[#1A4E26] disabled:opacity-30"><ArrowUp size={12} /></button>
                        <button type="button" onClick={() => moveLesson(module.id, lessonIndex, 'down')} disabled={lessonIndex === (module.lessons?.length ?? 0) - 1} className="text-slate-400 hover:text-[#1A4E26] disabled:opacity-30"><ArrowDown size={12} /></button>
                      </div>
                      <button type="button" onClick={() => void openLesson(module.id, lesson)} className="flex-1 text-left text-sm hover:text-[#1A4E26]">{lesson.sort_order}. {lesson.title} <span className="text-xs text-[#6B7280]">· {lesson.content_type}</span></button>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => toggleLessonPublish(module.id, lesson)} className={`p-1 rounded ${lesson.is_published ? 'text-[#1A4E26]' : 'text-slate-400'}`}>{lesson.is_published ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                        <button type="button" onClick={() => deleteLesson(module.id, lesson.id)} className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <section className="border border-[#C8D8CB] rounded-xl p-4">
              <h3 className="font-bold text-[#111111] mb-3">Evaluaciones</h3>
              <div className="flex flex-wrap gap-2 mb-3"><input value={assessmentForm.title} onChange={(event) => setAssessmentForm((current) => ({ ...current, title: event.target.value }))} placeholder="Nombre de evaluación" className="flex-1 min-w-[180px] px-3 py-2 border border-slate-200 rounded-xl" /><input value={assessmentForm.passing_score} onChange={(event) => setAssessmentForm((current) => ({ ...current, passing_score: event.target.value }))} type="number" min="0" max="100" placeholder="Aprobación" className="w-24 px-3 py-2 border border-slate-200 rounded-xl" /><button type="button" onClick={() => void addAssessment()} className="px-3 py-2 rounded-xl bg-[#1A4E26] text-white text-sm font-bold"><Plus size={16} /></button></div>
              {assessments.map((assessment) => (
                <div key={assessment.id} className="py-2 border-t border-[#E5ECE6]">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-semibold">{assessment.title} <span className="text-xs text-[#6B7280]">· {assessment.passing_score}% · {assessment.questions?.length ?? 0} preguntas</span></span>
                    <button type="button" onClick={() => deleteAssessment(assessment.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                    <button type="button" onClick={() => setQuestionAssessment(assessment)} className="text-xs font-bold text-[#1A4E26]">Agregar pregunta</button>
                  </div>
                  {(assessment.questions?.length ?? 0) > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-[#E8F2EA] space-y-2">
                      {assessment.questions.map((q: any) => (
                        <div key={q.id} className="flex gap-2 items-start text-sm">
                          <span className="flex-1 text-slate-600">{q.sort_order}. {q.question_text} <span className="text-xs text-slate-400">({q.question_type})</span></span>
                          <button type="button" onClick={() => deleteQuestion(assessment.id, q.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          </>}
        </div>
      </Modal>

      <Modal open={Boolean(lessonDraft.moduleId)} onClose={() => setLessonDraft({ moduleId: '', lesson: null })} title={lessonDraft.lesson ? 'Editar lección' : 'Nueva lección'} subtitle="Contenido base de la lección.">
        <form onSubmit={saveLesson} className="p-6 space-y-4"><Field label="Título" value={lessonForm.title} onChange={(value) => setLessonForm((current) => ({ ...current, title: value }))} required /><SelectField label="Tipo" value={lessonForm.content_type} onChange={(value) => setLessonForm((current) => ({ ...current, content_type: value as ContentType }))} options={[{ value: 'text', label: 'Texto' }, { value: 'video', label: 'Video YouTube' }, { value: 'pdf', label: 'PDF' }, { value: 'external_link', label: 'Enlace externo' }, { value: 'mixed', label: 'Mixto' }]} />{['text', 'mixed'].includes(lessonForm.content_type) && <label className="block text-sm font-semibold text-[#111111]">Contenido<textarea value={lessonForm.text_content} onChange={(event) => setLessonForm((current) => ({ ...current, text_content: event.target.value }))} rows={5} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26]" /></label>}{lessonForm.content_type === 'video' && <Field label="ID de video YouTube" value={lessonForm.video_external_id} onChange={(value) => setLessonForm((current) => ({ ...current, video_external_id: value }))} required />}{lessonForm.content_type !== 'text' && <Field label="Duración (minutos)" value={lessonForm.estimated_minutes} onChange={(value) => setLessonForm((current) => ({ ...current, estimated_minutes: value }))} type="number" min="0" />}<div className="pt-4 border-t border-[#E5ECE6]"><h3 className="text-sm font-bold text-[#111111] mb-3">Recursos</h3>{lessonDraft.lesson ? <><div className="space-y-2 mb-3">{resources.map((resource) => <div key={resource.id} className="flex items-center gap-2 text-sm bg-[#F8FBF8] rounded-lg px-3 py-2"><span className="truncate flex-1">{resource.title} <span className="text-xs text-[#6B7280]">· {resource.file_type || 'archivo'}</span></span><button type="button" onClick={() => void removeResource(resource.id)} aria-label={`Eliminar ${resource.title}`} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button></div>)}</div><div className="grid sm:grid-cols-2 gap-2"><Field label="Nombre" value={resourceForm.title} onChange={(value) => setResourceForm((current) => ({ ...current, title: value }))} /><Field label="URL o ruta Storage" value={resourceForm.file_url} onChange={(value) => setResourceForm((current) => ({ ...current, file_url: value }))} /></div><div className="flex gap-2 mt-2"><Field label="Archivo (opcional)" value={resourceForm.file_name} onChange={(value) => setResourceForm((current) => ({ ...current, file_name: value }))} /><SelectField label="Tipo" value={resourceForm.file_type} onChange={(value) => setResourceForm((current) => ({ ...current, file_type: value }))} options={[{ value: 'pdf', label: 'PDF' }, { value: 'document', label: 'Documento' }, { value: 'presentation', label: 'Presentación' }, { value: 'image', label: 'Imagen' }, { value: 'external_link', label: 'Enlace' }]} /></div><button type="button" onClick={(event) => void addResource(event as unknown as React.FormEvent)} className="mt-2 text-xs font-bold text-[#1A4E26] flex items-center gap-1"><Plus size={14} /> Agregar recurso</button></> : <p className="text-xs text-[#6B7280]">Guarda primero la lección para asociar recursos.</p>}</div><div className="flex justify-end gap-3 pt-3 border-t border-[#E5ECE6]"><button type="button" onClick={() => setLessonDraft({ moduleId: '', lesson: null })} className="px-4 py-2 text-sm font-bold text-[#6B7280]">Cancelar</button><button type="submit" className="px-4 py-2 rounded-xl bg-[#1A4E26] text-white font-bold text-sm">Guardar lección</button></div></form>
      </Modal>

      <Modal open={Boolean(questionAssessment)} onClose={() => setQuestionAssessment(null)} title="Nueva pregunta" subtitle={questionAssessment?.title}>
        <form onSubmit={addQuestion} className="p-6 space-y-4">
          <Field label="Pregunta" value={questionForm.question_text} onChange={(value) => setQuestionForm((current) => ({ ...current, question_text: value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Tipo" value={questionForm.question_type} onChange={(value) => { setQuestionForm((current) => ({ ...current, question_type: value })); setCorrectOptions([0]); }} options={[{ value: 'single_choice', label: 'Una respuesta' }, { value: 'multiple_choice', label: 'Varias respuestas' }, { value: 'true_false', label: 'Verdadero / falso' }]} />
            <Field label="Puntos" value={questionForm.points} onChange={(value) => setQuestionForm((current) => ({ ...current, points: value }))} type="number" min="0" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#111111]">Opciones y respuesta correcta</p>
            {questionForm.options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <label className="flex items-center justify-center pt-6">
                  <input 
                    type={questionForm.question_type === 'multiple_choice' ? 'checkbox' : 'radio'} 
                    name="correct-option" 
                    checked={correctOptions.includes(index)} 
                    onChange={() => setCorrectOptions(current => 
                      questionForm.question_type === 'multiple_choice' 
                        ? current.includes(index) ? current.filter(i => i !== index) : [...current, index]
                        : [index]
                    )} 
                    className="accent-[#1A4E26] w-4 h-4 cursor-pointer" 
                  />
                </label>
                <div className="flex-1">
                  <Field label={`Opción ${index + 1}`} value={option} onChange={(value) => setQuestionForm((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? value : item) }))} required={index < 2} />
                </div>
                {index > 1 && (
                  <button type="button" onClick={() => { setQuestionForm(c => ({...c, options: c.options.filter((_, i) => i !== index)})); setCorrectOptions(c => c.filter(i => i !== index).map(i => i > index ? i - 1 : i)); }} className="pt-6 text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {questionForm.options.length < 6 && questionForm.question_type !== 'true_false' && (
              <button type="button" onClick={() => setQuestionForm(c => ({...c, options: [...c.options, '']}))} className="text-xs font-bold text-[#1A4E26] flex items-center gap-1 mt-2">
                <Plus size={14} /> Agregar opción
              </button>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5ECE6]">
            <button type="button" onClick={() => setQuestionAssessment(null)} className="px-4 py-2 text-sm font-bold text-[#6B7280]">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#1A4E26] text-white font-bold text-sm">Guardar pregunta</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', min, max, step, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string; step?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-[#111111]">{label}<input required={required} type={type} min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26]" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="block text-sm font-semibold text-[#111111]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#1A4E26]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
