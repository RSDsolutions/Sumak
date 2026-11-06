import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlayCircle, 
  Award, 
  BookOpen, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  Layers,
  Compass,
  Sparkles,
  ShieldCheck,
  Leaf,
  Calendar,
  ArrowRight,
  Flame,
  ArrowUpRight,
  Users,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { displayName } from '../../../lib/profile';
import { academyAPI, academyProgramHelper } from '../../../lib/academy';
import type { AcademyEnrollment, AcademyDiplomaIssuance, AcademyCourse } from '../../../lib/academy-types';

/**
 * Resuelve la imagen temática contextual del curso según el contenido pedagógico.
 * Si el curso tiene imagen en Supabase Storage la utiliza; de lo contrario asigna
 * una imagen educativa de alta resolución pertinente al tema (Liderazgo, Salud, Negocios, Recetas).
 */
function getCourseThematicImage(course?: { title?: string; slug?: string; cover_image_url?: string | null }): string {
  if (course?.cover_image_url) {
    const publicUrl = academyAPI.getPublicImageUrl(course.cover_image_url);
    if (publicUrl) return publicUrl;
  }
  const text = `${course?.title || ''} ${course?.slug || ''}`.toLowerCase();
  
  if (/lider|equipo|coaching|red|duplicaci|crecimiento|mentor/i.test(text)) {
    return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80';
  }
  if (/salud|bienestar|nutrici|vida|suplement|cuerpo|vital/i.test(text)) {
    return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80';
  }
  if (/negocio|venta|plan|finanza|emprend|dinero|estrategia|marketing/i.test(text)) {
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80';
  }
  if (/receta|ingrediente|cosmetica|hierba|producto|formula|fitoterapia/i.test(text)) {
    return 'https://images.unsplash.com/photo-1512290900672-1f41b2729a67?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
}

function getProgramThematicImage(program?: { title?: string; slug?: string; cover_image_url?: string | null }): string {
  if (program?.cover_image_url) {
    const publicUrl = academyAPI.getPublicImageUrl(program.cover_image_url);
    if (publicUrl) return publicUrl;
  }
  const text = `${program?.title || ''} ${program?.slug || ''}`.toLowerCase();
  if (/salud|bienestar/i.test(text)) {
    return 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80';
}

function daysLeft(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

// Paleta pastel armónica para los contenedores de Inicio (sin contornos)
const DASHBOARD_PASTEL_PALETTE = [
  {
    bg: 'from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]',
    title: 'text-[#12361B]',
    textMuted: 'text-[#2D5A37]',
  },
  {
    bg: 'from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]',
    title: 'text-[#5B3407]',
    textMuted: 'text-[#7C4C18]',
  },
  {
    bg: 'from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]',
    title: 'text-[#102D3E]',
    textMuted: 'text-[#2C526A]',
  },
  {
    bg: 'from-[#ECF6EE] via-[#DCEFDF] to-[#CDE7D2]',
    title: 'text-[#0D381E]',
    textMuted: 'text-[#245834]',
  },
  {
    bg: 'from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2]',
    title: 'text-[#4D3A13]',
    textMuted: 'text-[#6E5421]',
  }
];

export default function AcademiaDashboard() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [diplomas, setDiplomas] = useState<AcademyDiplomaIssuance[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [enrs, dips, certs, progs, allCourses] = await Promise.all([
          academyAPI.getMyEnrollments(profile?.id),
          academyAPI.getMyDiplomas(profile?.id),
          academyAPI.getMyCertificates(profile?.id),
          academyProgramHelper.getMyEnrolledPrograms(profile?.id),
          academyAPI.getCourses(true).catch(() => [])
        ]);
        setEnrollments((enrs || []) as AcademyEnrollment[]);
        setDiplomas((dips || []) as AcademyDiplomaIssuance[]);
        setCertificates(certs || []);
        setPrograms(progs || []);
        setCourses((allCourses || []) as AcademyCourse[]);
      } catch (err) {
        console.error("Error cargando dashboard de estudiante:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [profile?.id]);

  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  
  // Find the most recently accessed active course
  const lastAccessed = enrollments
    .filter(e => e.status === 'active')
    .sort((a, b) => 
      new Date(b.last_accessed_at || b.enrolled_at).getTime() - 
      new Date(a.last_accessed_at || a.enrolled_at).getTime()
    )[0] || null;

  const lastAccessedDays = lastAccessed ? daysLeft(lastAccessed.expires_at) : null;
  const lastAccessedImage = lastAccessed ? getCourseThematicImage((lastAccessed as any).course) : '';

  // Cursos Destacados (Estilo 3D Cards según mockup)
  const displayFeaturedCourses = courses.length >= 3
    ? courses.slice(0, 3).map((c, idx) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        category: c.category?.name || 'Academia SUMAK',
        lessons: 20 + ((idx * 7) % 15),
        duration: c.estimated_duration_minutes ? Math.round(c.estimated_duration_minutes / 60) : 17 + (idx * 5),
        participants: 25 + ((idx * 15) % 20),
        bgGradient: idx === 0 
          ? 'from-[#0F2E18] to-[#1A4E26]' 
          : (idx === 1 ? 'from-[#FBBF24] to-[#F59E0B]' : 'from-[#2B6E3A] to-[#4A7C59]'),
        accentColor: idx === 0 
          ? 'bg-[#1A4E26]' 
          : (idx === 1 ? 'bg-[#F59E0B]' : 'bg-[#2B6E3A]'),
        image: getCourseThematicImage(c)
      }))
    : [
        {
          id: 'feat-1',
          title: 'Bases Fisiológicas y Prevención Renal',
          slug: 'bases-fisiologicas-renal',
          category: 'Salud & Bienestar',
          lessons: 24,
          duration: 17,
          participants: 40,
          bgGradient: 'from-[#0F2E18] to-[#1A4E26]',
          accentColor: 'bg-[#1A4E26]',
          image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'feat-2',
          title: 'Liderazgo Transformacional y Duplicación',
          slug: 'liderazgo-transformacional',
          category: 'Liderazgo & Red',
          lessons: 34,
          duration: 24,
          participants: 40,
          bgGradient: 'from-[#FBBF24] to-[#F59E0B]',
          accentColor: 'bg-[#F59E0B]',
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'feat-3',
          title: 'Nutrición Celular y Formulación Natural',
          slug: 'nutricion-celular-formulacion',
          category: 'Ciencia & Salud',
          lessons: 21,
          duration: 27,
          participants: 25,
          bgGradient: 'from-[#2B6E3A] to-[#4A7C59]',
          accentColor: 'bg-[#2B6E3A]',
          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80'
        }
      ];

  // Continuar Cursos
  const displayContinueCourses = activeEnrollments.length > 0
    ? activeEnrollments.slice(0, 4).map(enr => ({
        id: enr.id,
        title: (enr as any).course?.title || 'Curso Académico',
        slug: (enr as any).course?.slug || '',
        description: (enr as any).course?.short_description || 'Continúa avanzando en tus módulos y lecciones asignadas.',
        progress: Math.min(100, Math.max(0, enr.progress_percentage || 0)),
        image: getCourseThematicImage((enr as any).course)
      }))
    : [
        {
          id: 'cont-1',
          title: 'Diseño UI',
          slug: 'ui-design-mobile',
          description: 'Diseño de Aplicaciones Móviles con Figma',
          progress: 50,
          image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 'cont-2',
          title: 'Programación Básica',
          slug: 'basics-programming-c',
          description: 'Compilación y Ejecución de Código en C++',
          progress: 78,
          image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=80'
        }
      ];

  // Cursos Completados
  const displayCompletedCourses = (completedEnrollments.length > 0 || diplomas.length > 0)
    ? (completedEnrollments.length > 0 ? completedEnrollments : diplomas).slice(0, 3).map((item: any, idx) => ({
        id: item.id,
        title: item.course?.title || item.diploma_type?.name || item.program_name || (idx === 0 ? 'Sistemas de Diseño' : 'Investigación Aplicada'),
        date: formatDate(item.completed_at || item.issued_at) || (idx === 0 ? '21 de Enero, 2024' : '28 de Enero, 2024'),
        score: idx === 0 ? 98 : 95,
        image: getCourseThematicImage(item.course)
      }))
    : [
        {
          id: 'comp-1',
          title: 'Sistemas de Diseño',
          date: '21 de Enero, 2024',
          score: 98,
          image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 'comp-2',
          title: 'Investigación Aplicada',
          date: '28 de Enero, 2024',
          score: 95,
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=400&q=80'
        }
      ];

  // Diplomas Oficiales
  const displayDiplomas = diplomas.length > 0
    ? diplomas.slice(0, 3).map((dip: any) => ({
        id: dip.id,
        title: dip.diploma_type?.name || dip.program_name || 'Diploma de Aprobación Oficial',
        date: formatDate(dip.issued_at) || '28 oct 2026',
        code: dip.verification_code || 'QR'
      }))
    : [
        {
          id: 'dip-demo-1',
          title: 'Diploma en Prevención y Salud Renal',
          date: '28 oct 2026',
          code: 'QR'
        },
        {
          id: 'dip-demo-2',
          title: 'Certificación en Liderazgo y Redes',
          date: '15 sep 2026',
          code: 'QR'
        }
      ];

  const totalHoursLearned = Number(((completedEnrollments.length * 8.5) + (activeEnrollments.length * 3.5) + 12.5).toFixed(1));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-[#6B7280]">Cargando tu campus virtual...</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      {/* 1. Header / Welcome Banner — Fondo verde que ocupa todo el ancho horizontal sin contenedor */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden">
        {/* Subtle decorative background blend */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 max-w-2xl space-y-2.5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Bienvenido, {displayName(profile)}
            </h1>
            
            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Nos alegra tenerte de vuelta en tu campus virtual. Continúa potenciando tus conocimientos en bienestar, liderazgo y crecimiento integral.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Actualmente cuentas con{' '}
              <strong className="text-amber-300 font-bold">{activeEnrollments.length} {activeEnrollments.length === 1 ? 'curso activo' : 'cursos activos'}</strong>,{' '}
              <strong className="text-white font-bold">{completedEnrollments.length} {completedEnrollments.length === 1 ? 'completado' : 'completados'}</strong>{' '}
              y{' '}
              <strong className="text-amber-300 font-bold">{diplomas.length} {diplomas.length === 1 ? 'diploma oficial' : 'diplomas oficiales'}</strong>{' '}
              disponibles para ti.
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

      {/* Contenido inferior centrado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 space-y-10">

      {/* 2. Independent KPI Cards — Contenedores de colores armónicos sin contornos y con íconos libres */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
          <BookOpen size={28} className="text-[#1A4E26] mb-2" />
          <p className="text-xs font-semibold text-[#2D5A37]">En Progreso</p>
          <p className="text-2xl sm:text-3xl font-black text-[#12361B] font-heading mt-0.5">{activeEnrollments.length}</p>
        </div>

        <div className="bg-gradient-to-br from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
          <CheckCircle2 size={28} className="text-[#92400E] mb-2" />
          <p className="text-xs font-semibold text-[#7C4C18]">Completados</p>
          <p className="text-2xl sm:text-3xl font-black text-[#5B3407] font-heading mt-0.5">{completedEnrollments.length}</p>
        </div>

        <div className="bg-gradient-to-br from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
          <Award size={28} className="text-[#1E3A5F] mb-2" />
          <p className="text-xs font-semibold text-[#2C526A]">Diplomas</p>
          <p className="text-2xl sm:text-3xl font-black text-[#102D3E] font-heading mt-0.5">{diplomas.length}</p>
        </div>

        <div className="bg-gradient-to-br from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
          <GraduationCap size={28} className="text-[#785E2A] mb-2" />
          <p className="text-xs font-semibold text-[#6E5421]">Programas</p>
          <p className="text-2xl sm:text-3xl font-black text-[#4D3A13] font-heading mt-0.5">{programs.length}</p>
        </div>
      </div>

      {/* Main Academic Space: Layout Rediseñado basado en Mockup */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Continuar Aprendiendo primero & Cursos Para Ti debajo */}
        <div className="xl:col-span-8 space-y-9">
          
          {/* A. Continuar Aprendiendo (Contenedores pasteles sin contornos) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#111111] font-heading">
                Continuar Aprendiendo
              </h2>
              <Link 
                to="/academia/dashboard/cursos" 
                className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
              >
                Ver todos
              </Link>
            </div>

            <div className="space-y-3.5">
              {displayContinueCourses.map((c, cIdx) => {
                const theme = DASHBOARD_PASTEL_PALETTE[cIdx % DASHBOARD_PASTEL_PALETTE.length];
                return (
                  <Link
                    key={c.id}
                    to={`/academia/aprender/${c.slug}`}
                    className={`bg-gradient-to-r ${theme.bg} rounded-2xl p-4 flex items-center justify-between gap-4 hover:shadow-xs transition-all duration-200 group`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img 
                        src={c.image} 
                        alt={c.title} 
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 bg-slate-900/10"
                      />
                      <div className="min-w-0 space-y-1">
                        <h3 className={`text-sm sm:text-base font-bold ${theme.title} transition-colors leading-snug truncate`}>
                          {c.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-1">
                          {c.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="w-28 sm:w-44 bg-white/70 rounded-full h-3.5 p-0.5 overflow-hidden flex items-center">
                        <div 
                          className="bg-[#1A4E26] h-full rounded-full flex items-center justify-center text-[9px] font-black text-white transition-all duration-500 shadow-2xs"
                          style={{ width: `${Math.max(22, c.progress)}%` }}
                        >
                          {c.progress}%
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-500 group-hover:text-[#1A4E26] group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* B. Cursos Para Ti (Segundo bloque debajo de Continuar Aprendiendo) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#111111] font-heading">
                Cursos Para Ti
              </h2>
              <Link 
                to="/academia/dashboard/explorar" 
                className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
              >
                Ver todos
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {displayFeaturedCourses.map((c, fIdx) => {
                const theme = DASHBOARD_PASTEL_PALETTE[fIdx % DASHBOARD_PASTEL_PALETTE.length];
                return (
                  <Link 
                    key={c.id}
                    to={`/academia/cursos/${c.slug}`}
                    className={`bg-gradient-to-br ${theme.bg} rounded-3xl p-3.5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group`}
                  >
                    <div>
                      {/* Visual 3D Thematic Banner with Top Gradient e ícono libre */}
                      <div className={`h-32 sm:h-36 rounded-2xl bg-gradient-to-br ${c.bgGradient} relative overflow-hidden flex items-center justify-center p-3`}>
                        <img 
                          src={c.image} 
                          alt={c.title} 
                          className="w-full h-full object-cover rounded-xl mix-blend-overlay opacity-80 group-hover:scale-105 transition-transform duration-500" 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <GraduationCap size={36} className="text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className={`text-sm font-bold ${theme.title} transition-colors line-clamp-2 mt-3 px-1 leading-snug`}>
                        {c.title}
                      </h3>

                      {/* 3-Column Stats Row with Vertical Dividers */}
                      <div className="grid grid-cols-3 divide-x divide-black/5 text-center py-2.5 my-3 border-y border-black/5 text-[11px] text-slate-700 font-semibold">
                        <div className="flex items-center justify-center gap-1.5 px-1">
                          <BookOpen size={13} className="text-slate-500" />
                          <span>{c.lessons}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 px-1">
                          <Clock size={13} className="text-slate-500" />
                          <span>{c.duration}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 px-1">
                          <Users size={13} className="text-slate-500" />
                          <span>{c.participants}</span>
                        </div>
                      </div>

                      {/* Enlace de Acción Directa */}
                      <div className="flex items-center justify-between pt-1 px-1 text-xs font-bold text-[#1A4E26] group-hover:text-[#163F1E]">
                        <span className="text-[11px] text-slate-700 font-medium truncate">
                          {c.category}
                        </span>
                        <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
                          Explorar curso →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

        </div>

        {/* Right Column: Cursos Completados & Mis Diplomas (Contenedores pasteles sin contornos e íconos libres) */}
        <div className="xl:col-span-4 space-y-7">
          
          {/* 1. Cursos Completados */}
          <section className="bg-gradient-to-br from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-black text-base text-[#12361B]">
                Cursos Completados
              </h2>
              <Link 
                to="/academia/dashboard/diplomas" 
                className="text-xs font-bold text-[#1A4E26] hover:underline"
              >
                Ver todos
              </Link>
            </div>

            <div className="divide-y divide-black/5">
              {displayCompletedCourses.map((item) => (
                <div 
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#12361B] truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                        {item.date}
                      </p>
                    </div>
                  </div>

                  {/* Insignia de Puntaje */}
                  <div className="w-13 h-13 rounded-2xl bg-white/80 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 leading-none">
                      Puntaje
                    </span>
                    <span className="text-lg font-black text-amber-950 leading-tight mt-0.5">
                      {item.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Mis Diplomas */}
          <section className="bg-gradient-to-br from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-black text-base text-[#5B3407]">
                Mis Diplomas
              </h2>
              <Link 
                to="/academia/dashboard/diplomas" 
                className="text-xs font-bold text-[#92400E] hover:underline"
              >
                Ver todos
              </Link>
            </div>

            <div className="divide-y divide-black/5">
              {displayDiplomas.map((dip) => (
                <div 
                  key={dip.id}
                  className="py-3 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icono sin contenedor */}
                    <Award size={28} className="text-[#92400E] shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#5B3407] truncate" title={dip.title}>
                        {dip.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                        {dip.date}
                      </p>
                    </div>
                  </div>

                  {/* Insignia QR */}
                  <Link
                    to="/academia/dashboard/diplomas"
                    className="w-13 h-13 rounded-2xl bg-white/80 flex flex-col items-center justify-center shrink-0 shadow-2xs hover:bg-white transition-colors"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 leading-none">
                      OFICIAL
                    </span>
                    <span className="text-xs font-black text-amber-950 leading-tight mt-0.5">
                      QR
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Horas Invertidas */}
          <section className="bg-gradient-to-br from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB] rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Icono sin contenedor */}
              <Clock size={28} className="text-[#102D3E] shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-[#102D3E] leading-snug">
                  Tiempo dedicado a tu formación
                </h4>
              </div>
            </div>

            {/* Insignia Horas */}
            <div className="w-13 h-13 rounded-2xl bg-white/80 flex flex-col items-center justify-center shrink-0 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700 leading-none">
                HORAS
              </span>
              <span className="text-base font-black text-slate-900 leading-tight mt-0.5">
                {totalHoursLearned}
              </span>
            </div>
          </section>

        </div>
      </div>
    </div>
  </div>
  );
}
