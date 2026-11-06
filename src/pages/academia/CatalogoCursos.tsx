import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Clock,
  BookOpen,
  GraduationCap,
  Award,
  ChevronRight,
  Sparkles,
  Leaf,
  ShieldCheck,
} from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import type { AcademyCourse, AcademyCategory } from '../../lib/academy-types';

function levelLabel(level?: string | null): string {
  if (!level) return 'Inicial';
  const map: Record<string, string> = {
    beginner: 'Inicial',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    all: 'Todos los niveles',
  };
  return map[level.toLowerCase()] || level;
}

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';

const CURATED_COURSE_GALLERY = [
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80', // Planificación y estudio
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', // Analítica y crecimiento
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80', // Liderazgo y equipo
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', // Cosmética botánica
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', // Plantas medicinales
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80', // Salud integrativa
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', // Nutrición fresca
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80', // Ventas y acuerdos
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80', // Finanzas y prosperidad
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80', // Oratoria y liderazgo
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80', // Reunión de negocios y metas
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', // Medicina preventiva
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80', // Conferencia interactiva
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80', // Tecnología y estrategia
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80', // Taller formativo
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80', // Campus virtual
];

/**
 * Resuelve una imagen diferente y temática para cada curso basada en su título y metadatos.
 */
function getCourseThematicImage(course: AcademyCourse, index = 0): string {
  // Si el curso tiene imagen propia asignada, se respeta
  if (course.cover_image_url) {
    const publicUrl = academyAPI.getPublicImageUrl(course.cover_image_url);
    if (publicUrl) return publicUrl;
  }

  const text = `${course.title || ''} ${course.slug || ''} ${course.category?.name || ''} ${course.short_description || ''}`.toLowerCase();

  // Detección temática específica por título
  if (/cosmet|belleza|derm|estetica|piel/i.test(text)) {
    return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
  }
  if (/fito|hierba|planta|botanica|infusion|extracto/i.test(text)) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80';
  }
  if (/biomedicina|ancestral|paredes|sanaci/i.test(text)) {
    return 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80';
  }
  if (/nutrici|aliment|suplement|dieta|metaboli/i.test(text)) {
    return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80';
  }
  if (/salud|bienestar|preventiv|vital/i.test(text)) {
    return 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80';
  }
  if (/básico|basico|fundamento|primeros pasos|arranque|inicio/i.test(text)) {
    return 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80';
  }
  if (/avanzado|estrategia|crecimiento|escalar|sistema/i.test(text)) {
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80';
  }
  if (/lider|liderazgo|mentor|guia|coaching/i.test(text)) {
    return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80';
  }
  if (/equipo|duplicaci|comunidad/i.test(text)) {
    return 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80';
  }
  if (/venta|vender|cierre|comercial|prospec|negociaci/i.test(text)) {
    return 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80';
  }
  if (/finanza|dinero|compensaci|ingreso|econom|prosperidad/i.test(text)) {
    return 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80';
  }
  if (/comunicaci|oratoria|hablar|presenta|discurso/i.test(text)) {
    return 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80';
  }
  if (/marketing|digital|redes|social|marca/i.test(text)) {
    return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80';
  }
  if (/mindset|mentalidad|emocion|habito|disciplina/i.test(text)) {
    return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80';
  }
  if (/idioma|ingles|english|language/i.test(text)) {
    return 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=800&q=80';
  }
  if (/diseñ|design|creativ|arte/i.test(text)) {
    return 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80';
  }

  // Hash determinista único para que cursos sin coincidencia directa tengan cada uno una imagen propia
  let hash = 0;
  const str = `${course.id || ''}-${course.title || ''}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return CURATED_COURSE_GALLERY[Math.abs(hash + index) % CURATED_COURSE_GALLERY.length];
}

interface CardPastelTheme {
  bg: string;
  title: string;
  textMuted: string;
  iconAccent: string;
  btn: string;
}

const CARD_PALETTE: CardPastelTheme[] = [
  {
    bg: 'from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]',
    title: 'text-[#12361B]',
    textMuted: 'text-[#2D5A37]',
    iconAccent: 'text-[#1A4E26]',
    btn: 'bg-[#1A4E26] hover:bg-[#0F2E18]',
  },
  {
    bg: 'from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]',
    title: 'text-[#5B3407]',
    textMuted: 'text-[#7C4C18]',
    iconAccent: 'text-[#92400E]',
    btn: 'bg-[#92400E] hover:bg-[#78350F]',
  },
  {
    bg: 'from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]',
    title: 'text-[#102D3E]',
    textMuted: 'text-[#2C526A]',
    iconAccent: 'text-[#1E3A5F]',
    btn: 'bg-[#1E3A5F] hover:bg-[#0F2232]',
  },
  {
    bg: 'from-[#ECF6EE] via-[#DCEFDF] to-[#CDE7D2]',
    title: 'text-[#0D381E]',
    textMuted: 'text-[#245834]',
    iconAccent: 'text-[#1A4E26]',
    btn: 'bg-[#143D27] hover:bg-[#0D2E1C]',
  },
  {
    bg: 'from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2]',
    title: 'text-[#4D3A13]',
    textMuted: 'text-[#6E5421]',
    iconAccent: 'text-[#785E2A]',
    btn: 'bg-[#785E2A] hover:bg-[#5C461C]',
  },
];

export default function CatalogoCursos() {
  const location = useLocation();
  const searchParam = new URLSearchParams(location.search).get('search') || '';

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParam]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await academyAPI.getCourses(true);
        setCourses(data);
        const cats = new Map();
        data.forEach((c) => {
          if (c.category) {
            cats.set(c.category.id, c.category);
          }
        });
        setCategories(Array.from(cats.values()));
      } catch (err) {
        console.error('Error cargando catálogo de cursos:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.short_description && c.short_description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || c.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isInsideDashboard = location.pathname.includes('/dashboard');

  return (
    <div className={`min-h-screen pb-24 ${isInsideDashboard ? '' : 'bg-[#F4F7F5]'}`}>
      {/* Header institucional — Fondo verde a todo el ancho horizontal sin contenedor */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Catálogo de Cursos
            </h1>

            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Programas formativos de alto nivel diseñados para potenciar tus habilidades profesionales, liderazgo y bienestar integral.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Explora nuestra oferta académica con{' '}
              <strong className="text-amber-300 font-bold">
                {courses.length} {courses.length === 1 ? 'programa formativo' : 'programas formativos'}
              </strong>{' '}
              y{' '}
              <strong className="text-amber-300 font-bold">
                {categories.length} {categories.length === 1 ? 'área especializada' : 'áreas especializadas'}
              </strong>{' '}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {/* Search & Category Filter Bar */}
        <div className="bg-white rounded-3xl border-0 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 sm:gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
            <input
              type="text"
              placeholder="Buscar por título, temática o instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm bg-[#F4F7F5] focus:bg-white text-[#111111] rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-[#1A4E26]/20 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#1A4E26] text-white shadow-xs'
                  : 'bg-[#F4F7F5] text-[#6B7280] hover:bg-[#EBF4ED] hover:text-[#1A4E26]'
              }`}
            >
              Todos ({courses.length})
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#1A4E26] text-white shadow-xs'
                    : 'bg-[#F4F7F5] text-[#6B7280] hover:bg-[#EBF4ED] hover:text-[#1A4E26]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-[#6B7280]">Cargando catálogo académico...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-0 p-8 max-w-md mx-auto space-y-3 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center mx-auto">
              <BookOpen size={30} />
            </div>
            <h3 className="text-lg font-bold text-[#111111] font-heading">No se encontraron cursos</h3>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Intenta con otros términos de búsqueda o selecciona otra categoría.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A4E26] hover:underline pt-2 cursor-pointer border-0"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          /* Cards Grid — Tarjetas anchas de 3 columnas en desktop sin contornos */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredCourses.map((course, idx) => {
              const coverUrl = getCourseThematicImage(course, idx);
              const theme = CARD_PALETTE[idx % CARD_PALETTE.length];
              const courseLink = isInsideDashboard
                ? `/academia/dashboard/explorar/${course.slug}`
                : `/academia/cursos/${course.slug}`;

              return (
                <Link
                  to={courseLink}
                  key={course.id}
                  className="rounded-3xl overflow-hidden border-0 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer bg-white"
                >
                  {/* Top Photo Section — Fotografía nítida y diferenciada según el título con protección CORS y fallback automático */}
                  <div className="h-52 w-full relative overflow-hidden bg-slate-900 shrink-0">
                    <img
                      src={coverUrl}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== DEFAULT_FALLBACK_IMAGE) {
                          target.src = DEFAULT_FALLBACK_IMAGE;
                        }
                      }}
                    />

                    {/* Gradient sutil en la base de la imagen para fundido suave */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                    {/* Category Pill flotante */}
                    {course.category && (
                      <div className="absolute top-3.5 left-3.5 z-10">
                        <span className="px-3 py-1 text-[10px] font-extrabold text-white bg-black/55 backdrop-blur-md rounded-full uppercase tracking-wider border-0 shadow-xs">
                          {course.category.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Gradient Panel (Tonos Pasteles Suaves y Armónicos con Tipografía Nítida) */}
                  <div className={`p-5 flex flex-col flex-1 justify-between gap-3.5 bg-gradient-to-br ${theme.bg}`}>
                    <div>
                      {/* Título completo del curso sin truncar */}
                      <h3
                        className={`text-base sm:text-lg font-black ${theme.title} group-hover:underline transition-colors leading-snug`}
                      >
                        {course.title}
                      </h3>

                      {/* Texto corto debajo del título del curso */}
                      <p
                        className={`text-xs ${theme.textMuted} font-medium line-clamp-2 mt-1.5 leading-relaxed opacity-90`}
                      >
                        {course.short_description ||
                          course.description ||
                          'Programa de formación especializada en SUMAK Academy.'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* Metadatos: Nivel, Duración, Certificado */}
                      <div className={`flex items-center justify-between text-[11px] ${theme.textMuted} font-medium`}>
                        <div className="flex items-center gap-1" title="Nivel de dificultad">
                          <GraduationCap size={13} className={`${theme.iconAccent} shrink-0`} />
                          <span className="capitalize">{levelLabel(course.level)}</span>
                        </div>

                        <div className="flex items-center gap-1" title="Duración estimada">
                          <Clock size={13} className={`${theme.iconAccent} shrink-0`} />
                          <span>{course.estimated_duration_minutes || 0} min</span>
                        </div>

                        <div className="flex items-center gap-1" title="Acreditación">
                          <Award size={13} className={`${theme.iconAccent} shrink-0`} />
                          <span>{course.generates_certificate ? 'Certificado' : 'Regular'}</span>
                        </div>
                      </div>

                      {/* Botón Ver detalles */}
                      <div className="flex justify-end pt-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs group-hover:shadow-md transition-all duration-300 ${theme.btn} border-0`}
                        >
                          <span>Ver detalles</span>
                          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
