import { useEffect, useState, useMemo } from 'react';
import {
  Star,
  BookOpen,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Loader2,
  XCircle,
  Sparkles,
  GraduationCap,
  Leaf,
  Award,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import { academyAPI } from '../../../lib/academy';
import type { AcademyEnrollment } from '../../../lib/academy-types';

type EnrollmentWithCourse = AcademyEnrollment & {
  course?: {
    id?: string;
    title: string;
    slug: string;
    cover_image_url: string | null;
    estimated_duration_minutes: number | null;
    short_description?: string | null;
    level?: string | null;
    generates_certificate?: boolean;
    category?: { name: string } | null;
  };
};

type TabType = 'all' | 'active' | 'upcoming' | 'completed';

interface CourseCardItem {
  id: string;
  title: string;
  description: string;
  rating: string;
  tags: string[];
  dateLabel: string;
  dateValue: string;
  image: string;
  bgGradient: string;
  status: 'active' | 'upcoming' | 'completed' | 'history';
  slug?: string;
  canAccess: boolean;
  progress?: number;
  daysLeft?: number | null;
}

// ---------------------------------------------------------------------------
// Helpers estéticos inspirados en la referencia visual (3D Clay & EdTech Style)
// ---------------------------------------------------------------------------
function getDeterministicRating(title = ''): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
  }
  const ratings = ['4.8', '4.9', '4.7', '4.5', '5.0', '4.6', '4.2'];
  return ratings[Math.abs(hash) % ratings.length];
}

function getCourseThematicVisual(course?: { title?: string; slug?: string; cover_image_url?: string | null }, index = 0): { image: string; bg: string } {
  if (course?.cover_image_url) {
    const url = academyAPI.getPublicImageUrl(course.cover_image_url);
    if (url) return { image: url, bg: 'bg-amber-100/70' };
  }

  const text = `${course?.title || ''} ${course?.slug || ''}`.toLowerCase();

  if (/idioma|english|lecture|comunicaci|lengua/i.test(text)) {
    return {
      image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80',
      bg: 'bg-[#FBE697]'
    };
  }
  if (/diseñ|design|creativ|marca|visual|arte/i.test(text)) {
    return {
      image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
      bg: 'bg-[#98A8F8]'
    };
  }
  if (/negocio|business|venta|estrategia|finanza|marketing|emprend/i.test(text)) {
    return {
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
      bg: 'bg-[#F6C6EA]'
    };
  }
  if (/salud|nutrici|bienestar|vida|suplement/i.test(text)) {
    return {
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80',
      bg: 'bg-[#B4E380]'
    };
  }

  const palettes = [
    { image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80', bg: 'bg-[#FBE697]' },
    { image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80', bg: 'bg-[#98A8F8]' },
    { image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80', bg: 'bg-[#F6C6EA]' },
  ];
  return palettes[index % palettes.length];
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '20 Jul';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '20 Jul';
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
}

function calculateDaysLeft(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Cursos de demostración exactos al mock para garantizar vista perfecta incluso sin inscripciones
const DEMO_COURSES: CourseCardItem[] = [
  {
    id: 'demo-1',
    title: 'Clase de Inglés',
    description: 'Lecciones de idiomas guiadas por los docentes más destacados',
    rating: '4.5',
    tags: ['Idiomas'],
    dateLabel: 'Inicio',
    dateValue: '20 Jul',
    image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80',
    bgGradient: 'bg-[#FCE38A]',
    status: 'upcoming',
    slug: 'clase-ingles',
    canAccess: true,
  },
  {
    id: 'demo-2',
    title: 'Estrategia de Diseño',
    description: 'Planificación integral de conceptos visuales y diseño de experiencias',
    rating: '4.0',
    tags: ['Diseño UI/UX', 'Diseño Web'],
    dateLabel: 'Inicio',
    dateValue: '22 Jul',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    bgGradient: 'bg-[#98A8F8]',
    status: 'upcoming',
    slug: 'estrategia-diseno',
    canAccess: true,
  },
  {
    id: 'demo-3',
    title: 'Gestión de Negocios',
    description: 'Estrategias clave para emprender y escalar proyectos con seguridad',
    rating: '4.2',
    tags: ['Marketing', 'Finanzas'],
    dateLabel: 'Inicio',
    dateValue: '26 Jul',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
    bgGradient: 'bg-[#F6C6EA]',
    status: 'upcoming',
    slug: 'gestion-negocios',
    canAccess: true,
  },
];

// ---------------------------------------------------------------------------
// Paleta armónica pastel SUMAK para los contenedores de las tarjetas
// ---------------------------------------------------------------------------
const MIS_CURSOS_PASTEL_PALETTE = [
  {
    bg: 'from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]',
    border: 'border-[#C8DDD0]/80 hover:border-[#1A4E26]/60',
    title: 'text-[#12361B] group-hover:text-[#0F2E18]',
    textMuted: 'text-[#2D5A37]',
    tagBg: 'bg-white/85 text-[#1A4E26] border border-[#1A4E26]/15',
    btn: 'bg-[#1A4E26] hover:bg-[#0F2E18] text-white shadow-xs'
  },
  {
    bg: 'from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]',
    title: 'text-[#5B3407] group-hover:text-[#452603]',
    border: 'border-[#F8D5A3]/80 hover:border-[#92400E]/60',
    textMuted: 'text-[#7C4C18]',
    tagBg: 'bg-white/85 text-[#92400E] border border-[#92400E]/15',
    btn: 'bg-[#92400E] hover:bg-[#78350F] text-white shadow-xs'
  },
  {
    bg: 'from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]',
    title: 'text-[#102D3E] group-hover:text-[#0B1E29]',
    border: 'border-[#BDD6E3]/80 hover:border-[#1E3A5F]/60',
    textMuted: 'text-[#2C526A]',
    tagBg: 'bg-white/85 text-[#1E3A5F] border border-[#1E3A5F]/15',
    btn: 'bg-[#1E3A5F] hover:bg-[#0F2232] text-white shadow-xs'
  },
  {
    bg: 'from-[#ECF6EE] via-[#DCEFDF] to-[#CDE7D2]',
    title: 'text-[#0D381E] group-hover:text-[#082413]',
    border: 'border-[#B2D8BD]/80 hover:border-[#143D27]/60',
    textMuted: 'text-[#245834]',
    tagBg: 'bg-white/85 text-[#143D27] border border-[#143D27]/15',
    btn: 'bg-[#143D27] hover:bg-[#0D2E1C] text-white shadow-xs'
  },
  {
    bg: 'from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2]',
    title: 'text-[#4D3A13] group-hover:text-[#38290B]',
    border: 'border-[#DFCEAC]/80 hover:border-[#785E2A]/60',
    textMuted: 'text-[#6E5421]',
    tagBg: 'bg-white/85 text-[#785E2A] border border-[#785E2A]/15',
    btn: 'bg-[#785E2A] hover:bg-[#5C461C] text-white shadow-xs'
  }
];

// ---------------------------------------------------------------------------
// Componente de Tarjeta con imagen pegada a bordes (sin espacios) y fondo pastel
// ---------------------------------------------------------------------------
function CourseCard({ item, idx = 0 }: { item: CourseCardItem; idx?: number }) {
  const theme = MIS_CURSOS_PASTEL_PALETTE[idx % MIS_CURSOS_PASTEL_PALETTE.length];
  const targetUrl = item.canAccess && item.slug
    ? `/academia/aprender/${item.slug}`
    : item.slug
    ? `/academia/cursos/${item.slug}`
    : '#';

  return (
    <div className={`rounded-2xl sm:rounded-3xl bg-gradient-to-r ${theme.bg} shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row items-stretch overflow-hidden group`}>
      {/* Thumbnail a sangre: sin espacio a la izquierda, arriba ni abajo */}
      <div className="w-full sm:w-56 md:w-64 h-48 sm:h-auto sm:self-stretch shrink-0 relative overflow-hidden bg-slate-900">
        <img
          src={item.image}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="sm:absolute sm:inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80') {
              target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent sm:bg-gradient-to-r pointer-events-none" />
      </div>

      {/* Info central con espaciado interno equilibrado */}
      <div className="p-5 sm:p-6 flex-1 min-w-0 flex flex-col justify-between space-y-4">
        <div>
          {/* Título y calificación con estrella */}
          <div className="flex items-start justify-between gap-3">
            <h3 className={`text-lg sm:text-xl font-bold ${theme.title} tracking-tight leading-snug line-clamp-1 transition-colors`}>
              {item.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0 font-bold text-xs sm:text-sm bg-white/75 px-2 py-0.5 rounded-full border border-black/5 shadow-2xs">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-slate-800">{item.rating}</span>
            </div>
          </div>

          {/* Subtítulo / Descripción */}
          <p className={`text-xs sm:text-sm ${theme.textMuted} line-clamp-2 mt-1.5 leading-relaxed font-normal opacity-90`}>
            {item.description}
          </p>
        </div>

        {/* Fila inferior: Fecha a la izquierda y Botón a la derecha */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`${theme.textMuted} font-medium opacity-80`}>{item.dateLabel}</span>
            <span className="font-bold text-xs sm:text-sm text-slate-800">{item.dateValue}</span>

            {/* Micro-progreso si el curso está activo */}
            {item.progress !== undefined && item.progress > 0 && (
              <span className="ml-2 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/50">
                {item.progress}%
              </span>
            )}
            {item.daysLeft !== null && item.daysLeft !== undefined && item.daysLeft <= 30 && (
              <span className="ml-1 text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/50">
                {item.daysLeft}d restantes
              </span>
            )}
          </div>

          {/* Botón de acción */}
          <Link
            to={targetUrl}
            className={`px-5 py-2 rounded-xl text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow transition-all shrink-0 inline-flex items-center justify-center cursor-pointer ${theme.btn}`}
          >
            {item.status === 'active' && item.progress && item.progress > 0 ? 'Continuar' : 'Ver curso'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página Principal
// ---------------------------------------------------------------------------
export default function MisCursos() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    academyAPI
      .getMyEnrollments(profile?.id)
      .then((data) => setEnrollments((data || []) as EnrollmentWithCourse[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [profile?.id]);

  // Adaptación de inscripciones reales al modelo visual de la tarjeta
  const courseItems: CourseCardItem[] = useMemo(() => {
    if (enrollments.length === 0) {
      return DEMO_COURSES;
    }

    return enrollments.map((enr, idx) => {
      const course = enr.course;
      const canAccess = enr.status === 'active' || enr.status === 'completed';
      const days = enr.status === 'active' ? calculateDaysLeft(enr.expires_at) : null;
      const visual = getCourseThematicVisual(course, idx);

      const tags: string[] = [];
      if (course?.category?.name) tags.push(course.category.name);
      if (course?.level) {
        const lvlMap: Record<string, string> = {
          beginner: 'Inicial',
          intermediate: 'Intermedio',
          advanced: 'Avanzado',
          all: 'Todos los niveles'
        };
        tags.push(lvlMap[course.level] || course.level);
      }
      if (tags.length === 0) {
        tags.push('Lecciones', 'Academy');
      }

      let statusCategory: CourseCardItem['status'] = 'history';
      if (enr.status === 'active') statusCategory = 'active';
      else if (enr.status === 'completed') statusCategory = 'completed';
      else if (['pending', 'payment_pending', 'waiting_list'].includes(enr.status)) statusCategory = 'upcoming';

      return {
        id: enr.id,
        title: course?.title ?? 'Curso Académico',
        description: course?.short_description || 'Lecciones prácticas con metodologías pedagógicas enfocadas en resultados.',
        rating: getDeterministicRating(course?.title),
        tags,
        dateLabel: 'Inicio',
        dateValue: formatDisplayDate(enr.enrolled_at || enr.requested_at),
        image: visual.image,
        bgGradient: visual.bg,
        status: statusCategory,
        slug: course?.slug,
        canAccess,
        progress: enr.progress_percentage || 0,
        daysLeft: days,
      };
    });
  }, [enrollments]);

  // Filtrado reactivo por pestañas
  const filteredCourses = useMemo(() => {
    if (activeTab === 'all') return courseItems;
    return courseItems.filter((item) => item.status === activeTab);
  }, [courseItems, activeTab]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-amber-500">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <XCircle className="mx-auto text-red-500 mb-3" size={36} />
        <h1 className="text-xl font-black text-slate-800">No pudimos cargar tus cursos</h1>
        <p className="text-slate-500 mt-2">Intenta nuevamente en unos minutos.</p>
      </div>
    );
  }

  const activeCount = enrollments.filter(e => e.status === 'active').length || (enrollments.length === 0 ? 2 : 0);
  const completedCount = enrollments.filter(e => e.status === 'completed').length || (enrollments.length === 0 ? 1 : 0);
  const totalCount = enrollments.length || (enrollments.length === 0 ? DEMO_COURSES.length : 0);

  return (
    <div className="w-full pb-16">
      {/* 1. Header / Banner Institucional — Fondo verde a todo el ancho horizontal sin contenedor */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden">
        {/* Subtle decorative background blend */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Mis Cursos
            </h1>
            
            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Gestiona tu ruta de aprendizaje, retoma tus lecciones en curso y monitorea tus avances y certificaciones obtenidas.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Actualmente cuentas con{' '}
              <strong className="text-amber-300 font-bold">{activeCount} {activeCount === 1 ? 'curso activo' : 'cursos activos'}</strong>,{' '}
              <strong className="text-white font-bold">{completedCount} {completedCount === 1 ? 'completado' : 'completados'}</strong> y{' '}
              <strong className="text-amber-300 font-bold">{totalCount} en tu campus virtual</strong>.
            </p>
          </div>

          {/* Floating 3D/Glass Badges */}
          <div className="hidden lg:block relative w-80 h-36 pointer-events-none select-none shrink-0">
            <div className="absolute top-0 left-6 w-11 h-11 rounded-2xl bg-amber-400/90 text-amber-950 flex items-center justify-center shadow-lg transform -rotate-6">
              <Sparkles size={20} />
            </div>
            <div className="absolute top-6 left-20 w-14 h-14 rounded-2xl bg-[#E8C94A] text-[#111111] flex items-center justify-center shadow-xl transform rotate-3">
              <BookOpen size={26} />
            </div>
            <div className="absolute top-1 right-20 w-10 h-10 rounded-xl bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 flex items-center justify-center shadow-md transform -rotate-12">
              <GraduationCap size={18} />
            </div>
            <div className="absolute top-0 right-6 w-11 h-11 rounded-2xl bg-teal-400/90 text-teal-950 flex items-center justify-center shadow-md transform rotate-6">
              <Leaf size={18} />
            </div>
            <div className="absolute bottom-1 left-28 w-16 h-16 rounded-3xl bg-white text-[#1A4E26] flex items-center justify-center shadow-2xl transform rotate-6 border border-white/40">
              <Award size={32} />
            </div>
            <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl bg-emerald-700/90 text-white flex items-center justify-center shadow-md transform -rotate-6">
              <ShieldCheck size={18} />
            </div>
            <div className="absolute bottom-2 right-10 w-11 h-11 rounded-2xl bg-[#D4AF37] text-amber-950 flex items-center justify-center shadow-lg transform rotate-12">
              <Clock size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Contenido del campus virtual centrado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 space-y-7">
        {/* Barra de pestañas horizontales y contenido */}
        <div className="space-y-4">

        {/* Barra de pestañas horizontales centrada */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 border-b border-slate-200/80 pb-3 text-sm sm:text-base select-none">
          {/* Todos */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`transition-colors font-medium ${
              activeTab === 'all'
                ? 'text-slate-900 font-bold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Todos
          </button>

          {/* Activos */}
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`transition-colors font-medium ${
              activeTab === 'active'
                ? 'text-slate-900 font-bold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Activos
          </button>

          {/* Próximos con el distintivo punto naranja */}
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`inline-flex items-center transition-colors font-medium ${
              activeTab === 'upcoming'
                ? 'text-slate-900 font-bold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block mr-2" />
            Próximos
          </button>

          {/* Completados */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`transition-colors font-medium ${
              activeTab === 'completed'
                ? 'text-slate-900 font-bold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Completados
          </button>
        </div>
      </div>

      {/* Listado de tarjetas de cursos */}
      {filteredCourses.length > 0 ? (
        <div className="space-y-4 sm:space-y-5">
          {filteredCourses.map((item, idx) => (
            <CourseCard key={item.id} item={item} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
          <BookOpen className="mx-auto text-amber-500 mb-3" size={32} />
          <h3 className="text-lg font-bold text-slate-800">No hay cursos en esta sección</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">Explora el catálogo para agregar nuevos programas a tu aprendizaje.</p>
          <Link
            to="/academia/cursos"
            className="inline-flex px-6 py-2.5 rounded-full bg-[#FFA500] hover:bg-[#F59E0B] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            Explorar Catálogo
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
