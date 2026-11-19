import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChevronDown,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyCategory, AcademyCourse } from '../../../lib/academy-types';

type CourseForm = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  prerequisites: string;
  category_id: string;
  instructor_id: string;
  level: string;
  access_mode: string;
  status: string;
  estimated_duration_minutes: string;
  passing_percentage: string;
  generates_certificate: boolean;
  price: string;
  cover_image_url: string;
  program_id: string;
};

const emptyForm: CourseForm = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  prerequisites: '',
  category_id: '',
  instructor_id: '',
  level: 'all',
  access_mode: 'free_registered',
  status: 'published',
  estimated_duration_minutes: '60',
  passing_percentage: '70',
  generates_certificate: true,
  price: '0',
  cover_image_url: '',
  program_id: '',
};

const PRESET_COVERS = [
  {
    label: 'Fitoterapia y Botánica',
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Salud Renal y Clínica',
    url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Nutrición y Metabolismo',
    url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Digestión y Microbiota',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Inicial / Básico',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  all: 'Todos los niveles',
};

const ACCESS_LABELS: Record<string, string> = {
  free_registered: 'Gratis (Registrados)',
  premium: 'De Pago / Premium',
  sumak_exclusive: 'Exclusivo Afiliados SUMAK',
  public: 'Público Abierto',
  assigned: 'Solo por Asignación',
  hidden: 'Oculto',
};

export default function AdminCursos() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/operaciones') ? '/operaciones' : '/admin';

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [modal, setModal] = useState<'course' | 'category' | null>(null);
  const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' });

  async function load() {
    setLoading(true);
    try {
      const [nextCourses, nextCategories, nextInstructors, nextPrograms] = await Promise.all([
        academyAPI.getAdminCourses(),
        academyAPI.getAdminCategories(),
        academyAPI.getAdminInstructors(),
        academyAPI.getAdminPrograms().catch(() => []),
      ]);
      setCourses(nextCourses);
      setCategories(nextCategories);
      setInstructors(nextInstructors);
      setPrograms(nextPrograms);
    } catch (error) {
      console.error('Error loading academy catalog:', error);
      toast.error('No se pudo cargar el catálogo de Academy.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesSearch = `${course.title} ${course.slug} ${course.short_description ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchesSearch && (statusFilter === 'all' || course.status === statusFilter);
      }),
    [courses, search, statusFilter]
  );

  function courseToForm(course: AcademyCourse): CourseForm {
    const linkedProg = programs.find((p) =>
      (p.courses ?? []).some((pc: any) => pc.course_id === course.id)
    );
    return {
      title: course.title,
      slug: course.slug,
      short_description: course.short_description ?? '',
      description: course.description ?? '',
      prerequisites: course.prerequisites ?? '',
      category_id: course.category_id ?? '',
      instructor_id: course.instructor_id ?? '',
      level: course.level || 'all',
      access_mode: course.access_mode || 'free_registered',
      status: course.status || 'published',
      estimated_duration_minutes: course.estimated_duration_minutes?.toString() ?? '60',
      passing_percentage: (course.passing_percentage ?? 70).toString(),
      generates_certificate: course.generates_certificate ?? true,
      price: (course.price ?? 0).toString(),
      cover_image_url: course.cover_image_url ?? '',
      program_id: linkedProg?.id ?? '',
    };
  }

  function openNewCourse() {
    setEditingCourse(null);
    setCoverFile(null);
    setForm({
      ...emptyForm,
      category_id: categories[0]?.id ?? '',
      instructor_id: instructors[0]?.id ?? '',
      program_id: programs[0]?.id ?? '',
    });
    setModal('course');
  }

  function openEditCourse(course: AcademyCourse) {
    setEditingCourse(course);
    setCoverFile(null);
    setForm(courseToForm(course));
    setModal('course');
  }

  function setField<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveCourse(andOpenBuilder = false) {
    if (!form.title.trim()) {
      toast.error('Por favor ingresa el título del curso.');
      return;
    }
    const finalSlug = form.slug.trim() || slugify(form.title);
    setSaving(true);
    try {
      // 1. Guardar datos base del curso
      const saved = await academyAPI.saveAdminCourse(editingCourse?.id ?? null, {
        title: form.title.trim(),
        slug: finalSlug,
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        prerequisites: form.prerequisites.trim() || null,
        category_id: form.category_id || null,
        instructor_id: form.instructor_id || null,
        level: form.level,
        access_mode: Number(form.price) > 0 && form.access_mode === 'free_registered' ? 'premium' : form.access_mode,
        status: form.status,
        estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
        passing_percentage: Number(form.passing_percentage || 70),
        generates_certificate: form.generates_certificate,
        price: Number(form.price || 0),
        cover_image_url: form.cover_image_url.trim() || null,
      });

      // 2. Si seleccionó archivo de portada, subirlo y actualizar el curso
      if (coverFile) {
        const uploadedUrl = await academyAPI.uploadAdminCourseCover(saved.id, coverFile);
        await academyAPI.patchAdminCourse(saved.id, { cover_image_url: uploadedUrl });
      }

      // 3. Si seleccionó vincular a un Programa y aún no estaba vinculado, vincularlo
      if (form.program_id) {
        const targetProg = programs.find((p) => p.id === form.program_id);
        const alreadyLinked = (targetProg?.courses ?? []).some((pc: any) => pc.course_id === saved.id);
        if (!alreadyLinked) {
          await academyAPI
            .addCourseToProgram({
              program_id: form.program_id,
              course_id: saved.id,
              sort_order: ((targetProg?.courses ?? []).length || 0) + 1,
              is_required: true,
            })
            .catch(() => {});
        }
      }

      toast.success(editingCourse ? 'Curso actualizado con éxito.' : '¡Curso creado con éxito!');
      setModal(null);

      if (andOpenBuilder) {
        navigate(`${basePath}/academia/cursos/${saved.id}/builder`);
        return;
      }

      await load();
    } catch (err: any) {
      console.error('Error guardando curso:', err);
      toast.error('No se pudo guardar el curso: ' + (err?.message || 'Verifica que el título/enlace no esté repetido.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickToggleStatus(course: AcademyCourse) {
    const nextStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      await academyAPI.patchAdminCourse(course.id, { status: nextStatus });
      toast.success(nextStatus === 'published' ? 'Curso publicado en el catálogo.' : 'Curso pasado a borrador.');
      await load();
    } catch {
      toast.error('No se pudo cambiar el estado del curso.');
    }
  }

  async function handleDeleteCourse() {
    if (!editingCourse) return;
    const confirmed = window.confirm(
      `¿Estás segura de que deseas eliminar el curso "${editingCourse.title}"?\n\nEsta acción eliminará permanentemente el curso y sus módulos.`
    );
    if (!confirmed) return;

    setDeletingCourse(true);
    try {
      await academyAPI.deleteAdminCourse(editingCourse.id);
      toast.success('Curso eliminado correctamente.');
      setModal(null);
      await load();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('No se pudo eliminar el curso. Verifica si tiene estudiantes inscritos.');
    } finally {
      setDeletingCourse(false);
    }
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!categoryForm.name.trim()) return;
    setSaving(true);
    try {
      const created = await academyAPI.createAdminCategory({
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || slugify(categoryForm.name),
        description: categoryForm.description.trim(),
        sort_order: categories.length + 1,
      });
      toast.success('Categoría creada.');
      setCategoryForm({ name: '', slug: '', description: '' });
      await load();
      setForm((prev) => ({ ...prev, category_id: created.id }));
      setModal('course');
    } catch {
      toast.error('No se pudo crear la categoría.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] border border-[#C8D8CB] px-3 py-1 rounded-full mb-2">
            <GraduationCap size={13} /> Gestión Académica Intuitiva
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111]">Catálogo y Constructor de Cursos</h1>
          <p className="text-[#6B7280] text-sm mt-1">
            Crea cursos completos con portada, precio, certificado automático y organiza sus módulos, lecciones, recetas y evaluaciones sin necesidad de programar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setModal('category')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1A4E26] border border-[#C8D8CB] font-bold text-xs sm:text-sm rounded-xl hover:bg-[#F4F7F5] transition-colors cursor-pointer"
          >
            <Plus size={16} /> Nueva Categoría
          </button>
          <button
            type="button"
            onClick={openNewCourse}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white font-black text-xs sm:text-sm rounded-xl hover:bg-[#163F1E] transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={18} /> Crear Nuevo Curso
          </button>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5ECE6] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Buscar curso por nombre o descripción..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A4E26]/20 focus:border-[#1A4E26] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'all', label: `Todos (${courses.length})` },
                {
                  key: 'published',
                  label: `Publicados (${courses.filter((c) => c.status === 'published').length})`,
                },
                {
                  key: 'draft',
                  label: `Borradores (${courses.filter((c) => c.status === 'draft').length})`,
                },
                {
                  key: 'archived',
                  label: `Archivados (${courses.filter((c) => c.status === 'archived').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                    : 'bg-[#F4F7F5] text-slate-600 border-slate-200 hover:border-[#1A4E26]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listado Visual de Cursos */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#6B7280]">
            <Loader2 size={22} className="animate-spin text-[#1A4E26]" /> Cargando catálogo de cursos...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 px-6 space-y-3">
            <BookOpen className="mx-auto text-slate-300" size={48} />
            <p className="text-slate-600 font-bold">No se encontraron cursos con este filtro.</p>
            <button
              type="button"
              onClick={openNewCourse}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A4E26] text-white text-xs font-bold rounded-xl"
            >
              <Plus size={16} /> Crear Primer Curso
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E5ECE6]">
            {filteredCourses.map((course) => {
              const isPublished = course.status === 'published';
              const priceNum = Number(course.price ?? 0);

              return (
                <div
                  key={course.id}
                  className="p-4 sm:p-5 hover:bg-[#F8FBF8] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Izquierda: Portada + Info */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    <div className="w-24 h-16 sm:w-28 sm:h-20 rounded-xl bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] overflow-hidden shrink-0 border border-[#C8D8CB] flex items-center justify-center">
                      {course.cover_image_url ? (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <BookOpen size={24} className="text-[#D4AF37]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                            isPublished
                              ? 'bg-emerald-50 text-[#1A4E26] border-emerald-200'
                              : course.status === 'archived'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isPublished ? '● Publicado' : course.status === 'archived' ? 'Archivado' : '● Borrador'}
                        </span>

                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                          {priceNum > 0 ? `$${priceNum.toFixed(2)} USD` : 'Gratuito ($0.00)'}
                        </span>

                        {course.generates_certificate && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF4ED] text-[#1A4E26] border border-[#C8D8CB]">
                            <Award size={11} /> Emite Certificado
                          </span>
                        )}
                      </div>

                      <h2 className="font-black text-base sm:text-lg text-[#111111] truncate">{course.title}</h2>

                      {course.short_description && (
                        <p className="text-xs text-[#6B7280] line-clamp-1">{course.short_description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                        {course.category?.name && (
                          <span className="font-semibold text-[#1A4E26]">📁 {course.category.name}</span>
                        )}
                        {course.instructor?.nombre_completo && (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck size={12} className="text-[#1A4E26]" />
                            {course.instructor.nombre_completo}
                          </span>
                        )}
                        <span>📊 {LEVEL_LABELS[course.level] || course.level}</span>
                        <span>🔒 {ACCESS_LABELS[course.access_mode] || course.access_mode}</span>
                        {course.estimated_duration_minutes && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} /> {course.estimated_duration_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Derecha: Botones de Acción Claros para la Secretaria */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      to={`${basePath}/academia/cursos/${course.id}/builder`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1A4E26] text-white hover:bg-[#143D1E] text-xs font-black transition-all shadow-2xs"
                      title="Crear y editar módulos, lecciones, recetas y exámenes"
                    >
                      <Wrench size={14} className="text-[#D4AF37]" />
                      <span>Módulos y Lecciones</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => openEditCourse(course)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#C8D8CB] text-[#111111] hover:bg-[#F4F7F5] text-xs font-bold transition-colors cursor-pointer"
                      title="Editar título, portada, precio, instructor y certificado"
                    >
                      <Pencil size={14} className="text-[#1A4E26]" />
                      <span>Configurar Curso</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleQuickToggleStatus(course)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        isPublished
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-[#1A4E26] border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={isPublished ? 'Ocultar temporalmente (pasar a borrador)' : 'Publicar curso en el catálogo'}
                    >
                      {isPublished ? 'Pasar a Borrador' : 'Publicar'}
                    </button>

                    <Link
                      to={`/academia/cursos/${course.slug}`}
                      target="_blank"
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#1A4E26] hover:border-[#1A4E26] transition-colors"
                      title="Ver página del curso como estudiante"
                    >
                      <ExternalLink size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-5 py-3 bg-[#F8FBF8] border-t border-[#E5ECE6] text-xs text-[#6B7280] flex items-center justify-between">
          <span>
            Mostrando <strong>{filteredCourses.length}</strong> de <strong>{courses.length}</strong> cursos
          </span>
          <span>{categories.length} categorías registradas</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL COMPLETO E INTUITIVO DE CREACIÓN / CONFIGURACIÓN DE CURSO
         ════════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={modal === 'course'}
        onClose={() => setModal(null)}
        title={editingCourse ? `Configurar Curso: ${editingCourse.title}` : 'Crear Nuevo Curso — SUMAK Academy'}
        subtitle="Completa los datos del curso. No necesitas conocimientos técnicos: el sistema configura los enlaces y certificados automáticamente."
        size="lg"
        className="max-h-[92vh] overflow-y-auto"
      >
        <div className="p-5 sm:p-6 space-y-6">
          {/* SECCIÓN 1: IMAGEN DE PORTADA */}
          <div className="bg-[#F8FBF8] border border-[#C8D8CB] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-[#1A4E26]" />
              <h3 className="font-black text-sm text-[#111111] uppercase tracking-wider">
                1. Imagen de Portada del Curso
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Vista previa */}
              <div className="w-full sm:w-44 h-28 rounded-xl bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] border border-[#C8D8CB] overflow-hidden shrink-0 flex items-center justify-center relative">
                {coverFile || form.cover_image_url ? (
                  <>
                    <img
                      src={coverFile ? URL.createObjectURL(coverFile) : form.cover_image_url}
                      alt="Vista previa portada"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setField('cover_image_url', '');
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                      title="Quitar portada"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <div className="text-center text-white/70 p-2">
                    <BookOpen size={26} className="mx-auto mb-1 text-[#D4AF37]" />
                    <span className="text-[10px] font-bold block">Sin imagen seleccionada</span>
                  </div>
                )}
              </div>

              {/* Controles para subir o elegir portada */}
              <div className="flex-1 space-y-3 w-full">
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-[#1A4E26]/40 bg-white hover:bg-[#EBF4ED]/50 rounded-xl p-3 text-center transition-colors">
                    <Upload size={18} className="mx-auto text-[#1A4E26] mb-1" />
                    <span className="text-xs font-bold text-[#1A4E26] block">
                      {coverFile ? `Archivo listo: ${coverFile.name}` : 'Subir imagen desde tu computadora (JPG, PNG, WebP)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    O elige una portada médica/botánica predefinida con un clic:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COVERS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setCoverFile(null);
                          setField('cover_image_url', preset.url);
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          form.cover_image_url === preset.url
                            ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-[#1A4E26]'
                        }`}
                      >
                        🖼️ {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN PRINCIPAL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <BookOpen size={18} className="text-[#1A4E26]" />
              <h3 className="font-black text-sm text-[#111111] uppercase tracking-wider">
                2. Título y Descripción del Curso
              </h3>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Field
                  label="Título Oficial del Curso *"
                  value={form.title}
                  placeholder="Ej: Salud Renal y Fitoterapia Andina"
                  onChange={(value) => {
                    setField('title', value);
                    if (!editingCourse) setField('slug', slugify(value));
                  }}
                  required
                />
              </div>
              <div>
                <Field
                  label="Enlace web (Automático)"
                  value={form.slug}
                  placeholder="salud-renal-fitoterapia"
                  onChange={(value) => setField('slug', slugify(value))}
                  required
                />
              </div>
            </div>

            <Field
              label="Resumen Corto (Subtítulo que se muestra en la tarjeta del catálogo)"
              value={form.short_description}
              placeholder="Ej: Protocolos clínicos y plantas medicinales para el cuidado integral de los riñones."
              onChange={(value) => setField('short_description', value)}
            />

            <label className="block">
              <span className="text-sm font-bold text-[#111111] block mb-1">
                Descripción Completa del Curso (¿Qué aprenderá el estudiante?)
              </span>
              <textarea
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                rows={3}
                placeholder="Explica los temas, beneficios y enfoque práctico del curso..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]"
              />
            </label>

            <Field
              label="Requisitos Previos o ¿A quién va dirigido? (Opcional)"
              value={form.prerequisites}
              placeholder="Ej: Dirigido a distribuidores, promotores de salud y público interesado en medicina natural."
              onChange={(value) => setField('prerequisites', value)}
            />
          </div>

          {/* SECCIÓN 3: CLASIFICACIÓN, DOCENTE Y PROGRAMA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Layers size={18} className="text-[#1A4E26]" />
              <h3 className="font-black text-sm text-[#111111] uppercase tracking-wider">
                3. Categoría, Expositor y Programa de Especialización
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-[#111111]">Categoría del Curso</span>
                  <button
                    type="button"
                    onClick={() => setModal('category')}
                    className="text-xs font-bold text-[#1A4E26] hover:underline"
                  >
                    + Crear categoría
                  </button>
                </div>
                <select
                  value={form.category_id}
                  onChange={(e) => setField('category_id', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]"
                >
                  <option value="">Selecciona una categoría...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <SelectField
                label="Expositor / Instructor Médico"
                value={form.instructor_id}
                onChange={(value) => setField('instructor_id', value)}
                options={[
                  { value: '', label: 'Seleccionar expositor...' },
                  ...instructors.map((inst) => ({ value: inst.id, label: inst.nombre_completo })),
                ]}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField
                label="Nivel de Estudio"
                value={form.level}
                onChange={(value) => setField('level', value)}
                options={[
                  { value: 'all', label: 'Todos los niveles (Recomendado)' },
                  { value: 'beginner', label: 'Nivel Inicial / Básico' },
                  { value: 'intermediate', label: 'Nivel Intermedio' },
                  { value: 'advanced', label: 'Nivel Avanzado' },
                ]}
              />

              <SelectField
                label="¿Incluir en un Programa de Especialización (Diploma)?"
                value={form.program_id}
                onChange={(value) => setField('program_id', value)}
                options={[
                  { value: '', label: 'Curso independiente (Sin programa)' },
                  ...programs.map((p) => ({ value: p.id, label: `🎓 ${p.title}` })),
                ]}
              />
            </div>
          </div>

          {/* SECCIÓN 4: PRECIO, ACCESO Y CERTIFICADO AUTOMÁTICO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <DollarSign size={18} className="text-[#1A4E26]" />
              <h3 className="font-black text-sm text-[#111111] uppercase tracking-wider">
                4. Precio, Acceso, Duración y Certificado
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField
                label="Modalidad de Acceso"
                value={form.access_mode}
                onChange={(value) => setField('access_mode', value)}
                options={[
                  { value: 'free_registered', label: 'Gratis para usuarios registrados' },
                  { value: 'premium', label: 'Curso de Pago (Transferencia / Tarjeta)' },
                  { value: 'sumak_exclusive', label: 'Exclusivo Distribuidores SUMAK Activos' },
                  { value: 'public', label: 'Público Abierto' },
                  { value: 'assigned', label: 'Solo por Asignación Manual' },
                ]}
              />

              <Field
                label="Precio del Curso en USD ($0 = Gratuito)"
                value={form.price}
                onChange={(value) => setField('price', value)}
                type="number"
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <SelectField
                label="Estado de Publicación"
                value={form.status}
                onChange={(value) => setField('status', value)}
                options={[
                  { value: 'published', label: '🟢 Publicado (Visible)' },
                  { value: 'draft', label: '🟡 Borrador (En preparación)' },
                  { value: 'archived', label: '⚪ Archivado (Oculto)' },
                ]}
              />

              <Field
                label="Duración Estimada (minutos)"
                value={form.estimated_duration_minutes}
                onChange={(value) => setField('estimated_duration_minutes', value)}
                type="number"
                min="0"
              />

              <Field
                label="Nota Mínima Aprobación (%)"
                value={form.passing_percentage}
                onChange={(value) => setField('passing_percentage', value)}
                type="number"
                min="0"
                max="100"
              />
            </div>

            {/* Switch Certificado Oficial */}
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#EBF4ED] border border-[#1A4E26]/30 cursor-pointer">
              <input
                type="checkbox"
                checked={form.generates_certificate}
                onChange={(event) => setField('generates_certificate', event.target.checked)}
                className="accent-[#1A4E26] w-5 h-5 mt-0.5 shrink-0"
              />
              <div>
                <span className="text-sm font-black text-[#0F2E18] flex items-center gap-1.5">
                  <Award size={16} className="text-[#D4AF37]" />
                  Emitir Certificado Oficial automáticamente al completar el curso
                </span>
                <span className="text-xs text-[#2D5A37] block mt-0.5">
                  Cuando el estudiante complete el 100% de las lecciones obligatorias y apruebe las evaluaciones, el sistema generará su Certificado Oficial con Código QR verificable.
                </span>
              </div>
            </label>
          </div>

          {/* Botones de Guardado */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#E5ECE6]">
            {editingCourse ? (
              <button
                type="button"
                onClick={() => void handleDeleteCourse()}
                disabled={deletingCourse || saving}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>{deletingCourse ? 'Eliminando...' : 'Eliminar Curso'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={deletingCourse || saving}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handleSaveCourse(false)}
                disabled={saving || deletingCourse}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#1A4E26] text-[#1A4E26] font-bold text-xs sm:text-sm hover:bg-[#EBF4ED] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {saving ? 'Guardando...' : 'Solo Guardar Datos'}
              </button>

              <button
                type="button"
                onClick={() => void handleSaveCourse(true)}
                disabled={saving || deletingCourse}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-black text-xs sm:text-sm hover:bg-[#143d1e] disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles size={15} className="text-[#D4AF37]" />
                <span>{saving ? 'Guardando...' : 'Guardar e Ir a Módulos y Lecciones →'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Nueva Categoría */}
      <Modal
        open={modal === 'category'}
        onClose={() => setModal(null)}
        title="Crear Nueva Categoría Académica"
        subtitle="Agrupa los cursos por especialidad temática."
      >
        <form onSubmit={saveCategory} className="p-6 space-y-4">
          <Field
            label="Nombre de la Categoría *"
            value={categoryForm.name}
            placeholder="Ej: Salud Renal y Vías Urinarias"
            onChange={(value) =>
              setCategoryForm((current) => ({ ...current, name: value, slug: slugify(value) }))
            }
            required
          />
          <Field
            label="Identificador URL (Automático)"
            value={categoryForm.slug}
            onChange={(value) => setCategoryForm((current) => ({ ...current, slug: slugify(value) }))}
            required
          />
          <label className="block text-sm font-bold text-[#111111]">
            Descripción de la Categoría
            <textarea
              value={categoryForm.description}
              onChange={(event) =>
                setCategoryForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1A4E26]"
            />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5ECE6]">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-4 py-2 text-sm font-bold text-[#6B7280]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#1A4E26] text-white font-bold text-sm disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </Modal>
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
  placeholder = '',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#111111] block mb-1">{label}</span>
      <input
        required={required}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]"
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
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#111111] block mb-1">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="appearance-none w-full px-3.5 py-2.5 pr-9 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
      </div>
    </label>
  );
}
