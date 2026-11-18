import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  PlayCircle, 
  Clock, 
  Award, 
  FileText, 
  CheckCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Landmark,
  AlertCircle
} from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import AcademyTransferCheckout from '../../components/AcademyTransferCheckout';
import type { BankAccount } from '../../data';
import type { AcademyCourse, AcademyModule, AcademyEnrollment } from '../../lib/academy-types';

export default function CursoDetalle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const toast = useToast();
  
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [enrollment, setEnrollment] = useState<AcademyEnrollment | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const enrollmentStatus = enrollment?.status ?? null;

  async function refreshEnrollment(courseId: string) {
    if (!profile) return;
    const enr = await academyAPI.checkEnrollment(courseId);
    setEnrollment(enr);
  }

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      try {
        const c = await academyAPI.getCourseBySlug(slug);
        setCourse(c);
        if (c) {
          const m = await academyAPI.getCourseModules(c.id);
          setModules(m);
          if (m.length > 0) {
            setExpandedModules(new Set([m[0].id]));
          }
          if (profile) {
            const enr = await academyAPI.checkEnrollment(c.id);
            setEnrollment(enr);
          }
        }
      } catch (err) {
        console.error("Error loading course:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [slug, profile]);

  const toggleModule = (id: string) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedModules(newSet);
  };

  const handleEnroll = async () => {
    if (!profile) {
      navigate('/login', { state: { returnTo: `/academia/cursos/${slug}` } });
      return;
    }
    if (!course) return;

    const isPaidCourse = Number(course.price ?? 0) > 0;

    try {
      setIsEnrolling(true);
      const enr = await academyAPI.enrollInCourse(course.id);
      setEnrollment(enr);

      if (enr.status === 'active') {
        toast.success('¡Inscripción activada! Ya puedes comenzar el curso 🌿');
        navigate(`/academia/aprender/${course.slug}`);
      } else if (isPaidCourse || enr.status === 'payment_pending') {
        setIsCheckoutOpen(true);
      } else {
        toast.success('Solicitud de inscripción enviada.');
      }
    } catch (err) {
      console.error("Error al inscribirse:", err);
      toast.error("Hubo un error al procesar tu inscripción.");
    } finally {
      setIsEnrolling(false);
    }
  };

  async function handleTransferSubmit(receiptFile: File, bank: BankAccount, voucherNumber: string) {
    if (!course || !profile?.id) return;
    try {
      setIsSubmittingPayment(true);
      const res = await academyAPI.uploadAndSubmitCourseTransfer({
        userId: profile.id,
        courseId: course.id,
        receiptFile,
        bankName: bank.banco,
        voucherNumber,
      });
      setEnrollment(res.enrollment);
      setIsCheckoutOpen(false);
      toast.success('¡Comprobante enviado! Verificaremos tu pago para activar tu acceso 🌿');
    } catch (err: any) {
      console.error('Error subiendo comprobante de curso:', err);
      toast.error(err?.message || 'No se pudo registrar el comprobante.');
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  async function handleDigitalPayment(provider: 'payphone' | 'paypal') {
    if (!course || !profile) return;
    try {
      setIsSubmittingPayment(true);
      let currentEnrollment = enrollment;
      if (!currentEnrollment) {
        currentEnrollment = await academyAPI.enrollInCourse(course.id);
        setEnrollment(currentEnrollment);
      }
      const res = await academyAPI.startCourseDigitalPayment({
        courseId: course.id,
        enrollmentId: currentEnrollment.id,
        title: course.title,
        price: Number(course.price ?? 0),
        provider,
      });
      if (!res.redirectUrl) {
        throw new Error('La pasarela no devolvió una URL de pago.');
      }
      window.location.assign(res.redirectUrl);
    } catch (error: any) {
      console.error('Error iniciando pago digital Academy:', error);
      toast.error(error?.message || 'No se pudo iniciar el pago digital.');
    } finally {
      setIsSubmittingPayment(false);
      if (course) void refreshEnrollment(course.id);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-32 bg-[#F4F7F5] min-h-screen">
        <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-32 bg-[#F4F7F5] min-h-screen">
        <h2 className="text-2xl font-bold text-[#111111]">Curso no encontrado</h2>
        <Link to={location.pathname.includes('/dashboard') ? "/academia/dashboard/explorar" : "/academia/cursos"} className="text-[#1A4E26] hover:underline mt-4 inline-block">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const totalDuration = modules.reduce((acc, m) => {
    return acc + (m.lessons?.reduce((lAcc, l) => lAcc + (l.duration_seconds || 0), 0) || 0);
  }, 0);
  const durationHours = Math.floor(totalDuration / 3600);
  const durationMins = Math.floor((totalDuration % 3600) / 60);
  const canAccess = enrollmentStatus === 'active' || enrollmentStatus === 'completed';
  const coursePrice = Number(course.price ?? 0);
  const isPaidCourse = coursePrice > 0;
  const isPendingVerification = enrollment?.payment_status === 'pending_verification';
  const isPaymentRejected = enrollment?.payment_status === 'rejected' || enrollmentStatus === 'rejected';
  const enrollmentLabel = enrollmentStatus === 'pending'
    ? 'Solicitud en revisión'
    : isPendingVerification
      ? 'Comprobante en verificación'
      : enrollmentStatus === 'payment_pending'
        ? `Completar Pago ($${coursePrice.toFixed(2)})`
        : isPaidCourse
          ? `Inscribirme por $${coursePrice.toFixed(2)}`
          : 'Inscribirme Gratis';

  return (
    <div className="bg-[#F4F7F5] min-h-screen pb-24">
      {/* Course Hero */}
      <div className="bg-[#1A4E26] text-white relative">
        <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
        {course.cover_image_url && (
          <div 
            className="absolute inset-0 opacity-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${academyAPI.getPublicImageUrl(course.cover_image_url)})` }}
          />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-6">
                {course.category && (
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    {course.category.name}
                  </span>
                )}
                {course.level && (
                  <span className="px-3 py-1 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-bold uppercase tracking-wider">
                    Nivel {course.level}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black font-heading mb-4">
                {course.title}
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-3xl leading-relaxed">
                {course.short_description || course.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-white/90">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
                    {course.instructor?.nombre_completo?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Instructor</p>
                    <p className="font-bold">{course.instructor?.nombre_completo || 'Staff SUMAK'}</p>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <Clock className="text-[#D4AF37]" size={20} />
                  <div>
                    <p className="text-xs text-white/60">Duración</p>
                    <p className="font-bold">{course.estimated_duration_minutes} min</p>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="text-[#D4AF37]" size={20} />
                  <div>
                    <p className="text-xs text-white/60">Lecciones</p>
                    <p className="font-bold">{totalLessons} clases</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Action Card */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-6 text-[#111111] shadow-2xl">
                <div className="aspect-video bg-slate-100 rounded-xl mb-6 relative overflow-hidden flex items-center justify-center">
                  {course.cover_image_url ? (
                    <img src={academyAPI.getPublicImageUrl(course.cover_image_url)} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <PlayCircle className="text-[#1A4E26]/20" size={48} />
                  )}
                  {/* Play overlay for preview */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors cursor-pointer group">
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <PlayCircle className="text-[#1A4E26]" size={32} />
                    </div>
                  </div>
                </div>

                {/* Precio del curso */}
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Inversión Académica
                  </span>
                  <span className="text-2xl font-black text-[#1A4E26]">
                    {isPaidCourse ? `$${coursePrice.toFixed(2)} USD` : 'Gratuito'}
                  </span>
                </div>

                <div className="mb-6">
                  {canAccess ? (
                    <Link
                      to={`/academia/aprender/${course.slug}`}
                      className="block w-full text-center py-4 rounded-xl bg-[#1A4E26] text-white font-bold hover:bg-[#163F1E] transition-colors shadow-lg shadow-[#1A4E26]/20"
                    >
                      Continuar Aprendiendo
                    </Link>
                  ) : isPendingVerification ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-left">
                      <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                        <Landmark size={15} className="text-amber-700" />
                        Comprobante en Verificación
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Recibimos tu comprobante{enrollment?.banco_destino ? ` (${enrollment.banco_destino} • N° ${enrollment.voucher_numero})` : ''}. Nuestro equipo confirmará el pago para activar tu acceso al curso.
                      </p>
                    </div>
                  ) : isPaymentRejected ? (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-left">
                        <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-red-600 shrink-0" />
                          Observación en el pago / solicitud:
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          {enrollment?.rejection_reason || 'El comprobante no pudo ser validado. Por favor sube un nuevo comprobante.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => (isPaidCourse ? setIsCheckoutOpen(true) : void handleEnroll())}
                        className="w-full py-3.5 rounded-xl bg-[#1A4E26] hover:bg-[#0F2E18] text-white font-black transition-colors text-sm"
                      >
                        {isPaidCourse ? 'Subir Nuevo Comprobante de Pago' : 'Reintentar Inscripción'}
                      </button>
                    </div>
                  ) : enrollmentStatus === 'payment_pending' ? (
                    <div className="space-y-3">
                      <p className="text-center text-xs sm:text-sm font-bold text-[#92680A] bg-amber-50 border border-amber-200 rounded-xl p-3">
                        Completa el pago de <strong>${coursePrice.toFixed(2)} USD</strong> para activar tu acceso al curso.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCheckoutOpen(true)}
                        className="w-full py-4 rounded-xl bg-[#1A4E26] hover:bg-[#0F2E18] text-white font-black transition-colors shadow-lg shadow-[#1A4E26]/20 flex items-center justify-center gap-2"
                      >
                        <Landmark size={18} /> Pagar e Inscribirme Ahora
                      </button>
                    </div>
                  ) : enrollmentStatus === 'pending' ? (
                    <div className="w-full text-center py-4 rounded-xl bg-[#F4F7F5] text-[#6B7280] font-bold border border-[#C8D8CB]">
                      {enrollmentLabel}
                    </div>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                      className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0B2913] font-black hover:bg-[#F3D568] transition-colors shadow-lg shadow-[#D4AF37]/30 flex items-center justify-center disabled:opacity-70"
                    >
                      {isEnrolling ? 'Procesando...' : enrollmentLabel}
                    </button>
                  )}
                  <p className="text-center text-xs text-[#6B7280] mt-3">
                    Incluye acceso completo al material clínico, fichas botánicas y certificación oficial.
                  </p>
                </div>

                <div className="space-y-4 text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <Award className="text-[#1A4E26]" size={20} />
                    <span>{course.generates_certificate ? 'Certificado de finalización' : 'Sin certificado'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="text-[#1A4E26]" size={20} />
                    <span>Recursos y plantillas descargables</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-[#1A4E26]" size={20} />
                    <span>Evaluaciones de conocimiento</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            
            {/* Description */}
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">Acerca de este curso</h2>
              <div className="prose prose-emerald max-w-none text-[#4B5563]">
                <p className="whitespace-pre-wrap">{course.description}</p>
              </div>
            </section>

            {/* Curriculum */}
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-6">Contenido del Curso</h2>
              <div className="flex items-center gap-4 text-sm text-[#6B7280] mb-6">
                <span>{modules.length} módulos</span>
                <span className="w-1 h-1 bg-[#C8D8CB] rounded-full"></span>
                <span>{totalLessons} lecciones</span>
                <span className="w-1 h-1 bg-[#C8D8CB] rounded-full"></span>
                <span>{durationHours}h {durationMins}m de duración total</span>
              </div>

              <div className="space-y-4">
                {modules.map((mod, index) => {
                  const isExpanded = expandedModules.has(mod.id);
                  const lessons = mod.lessons || [];
                  const modDuration = lessons.reduce((acc, l) => acc + (l.duration_seconds || 0), 0);
                  
                  return (
                    <div key={mod.id} className="bg-white rounded-xl border border-[#C8D8CB] overflow-hidden">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between p-4 sm:p-6 bg-[#F4F7F5]/50 hover:bg-[#F4F7F5] transition-colors text-left"
                      >
                        <div>
                          <h3 className="font-bold text-[#111111]">
                            Módulo {index + 1}: {mod.title}
                          </h3>
                          <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-2">
                            <span>{lessons.length} lecciones</span>
                            {modDuration > 0 && (
                              <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{Math.floor(modDuration/60)} min</span>
                              </>
                            )}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="text-[#6B7280]" /> : <ChevronDown className="text-[#6B7280]" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 border-t border-[#C8D8CB]">
                          {lessons.map((lesson, lIdx) => (
                            <div key={lesson.id} className="p-4 sm:px-6 flex items-start sm:items-center gap-4 group">
                              <div className="mt-0.5 sm:mt-0 flex-shrink-0">
                                {lesson.is_free_preview ? (
                                  <PlayCircle className="text-[#1A4E26]" size={18} />
                                ) : canAccess ? (
                                  <PlayCircle className="text-[#6B7280]" size={18} />
                                ) : (
                                  <Lock className="text-[#6B7280]" size={18} />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${lesson.is_free_preview || canAccess ? 'text-[#111111] font-medium' : 'text-[#6B7280]'}`}>
                                  {index + 1}.{lIdx + 1} {lesson.title}
                                </p>
                              </div>
                              {lesson.is_free_preview && !canAccess && (
                                <span className="text-[10px] font-bold text-[#1A4E26] bg-[#EBF4ED] px-2 py-0.5 rounded uppercase tracking-wide">
                                  Preview
                                </span>
                              )}
                              <div className="text-xs text-[#6B7280] w-16 text-right">
                                {lesson.duration_seconds ? `${Math.floor(lesson.duration_seconds/60)}:${(lesson.duration_seconds%60).toString().padStart(2,'0')}` : ''}
                              </div>
                            </div>
                          ))}
                          {lessons.length === 0 && (
                            <div className="p-4 text-center text-sm text-[#6B7280]">
                              Las lecciones de este módulo estarán disponibles pronto.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {isCheckoutOpen && isPaidCourse && (
        <AcademyTransferCheckout
          summaryTitle="Resumen de Inscripción al Curso"
          items={[{ id: course.id, title: course.title, price: coursePrice }]}
          total={coursePrice}
          submitting={isSubmittingPayment}
          onClose={() => setIsCheckoutOpen(false)}
          onSubmit={handleTransferSubmit}
          onDigitalPayment={(provider) => void handleDigitalPayment(provider)}
          clientTransactionId={`ACAD-CRS-${course.id.slice(0, 8)}`}
        />
      )}
    </div>
  );
}
