import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Loader2,
  XCircle,
  Trophy,
  Archive,
  Medal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { academyAPI } from '../../../lib/academy';
import type { AcademyEnrollment } from '../../../lib/academy-types';

type EnrollmentWithCourse = AcademyEnrollment & {
  course?: {
    title: string;
    slug: string;
    cover_image_url: string | null;
    estimated_duration_minutes: number | null;
    generates_certificate?: boolean;
  };
};

function fmt(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sin fecha';
}

function daysLeft(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ days }: { days: number }) {
  const color =
    days <= 7  ? 'bg-red-50 text-red-700 border-red-200' :
    days <= 30 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
      <Clock3 size={11} />
      {days === 1 ? 'Vence mañana' : `Vence en ${days} días`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de inscripción
// ---------------------------------------------------------------------------
function EnrollmentCard({ enrollment }: { enrollment: EnrollmentWithCourse }) {
  const course = enrollment.course;
  const canAccess = enrollment.status === 'active' || enrollment.status === 'completed';
  const days = enrollment.status === 'active' ? daysLeft(enrollment.expires_at) : null;

  const card = (
    <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:border-[#1A4E26] hover:shadow-sm transition-all">
      {/* Thumbnail */}
      <div className="w-full sm:w-36 aspect-video rounded-xl bg-[#EBF4ED] flex items-center justify-center overflow-hidden shrink-0">
        {course?.cover_image_url ? (
          <img
            src={academyAPI.getPublicImageUrl(course.cover_image_url) ?? undefined}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="text-[#1A4E26]" size={28} />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="font-bold text-[#111111] leading-tight">{course?.title ?? 'Curso Academy'}</h3>

        <div className="flex flex-wrap gap-2">
          {enrollment.status === 'active' && days !== null && <ExpiryBadge days={days} />}
          {enrollment.status === 'rejected' && enrollment.rejection_reason && (
            <span className="text-xs text-red-600 font-medium">Motivo: {enrollment.rejection_reason}</span>
          )}
          {enrollment.status === 'pending' && (
            <span className="text-xs text-[#9CA3AF]">Solicitado el {fmt(enrollment.requested_at ?? enrollment.enrolled_at)}</span>
          )}
        </div>

        {/* Barra de progreso */}
        {canAccess && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>Progreso</span>
              <span className="font-semibold text-[#111111]">{enrollment.progress_percentage}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1A4E26] rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, enrollment.progress_percentage))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0 flex flex-col gap-2 items-end">
        {enrollment.status === 'active' && course?.slug && (
          <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#1A4E26] text-white text-sm font-bold">
            Continuar
          </span>
        )}
        {enrollment.status === 'completed' && (
          <div className="flex flex-col gap-1.5 items-end">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EBF4ED] text-[#1A4E26] text-sm font-bold">
              <CheckCircle2 size={15} />
              Completado
            </span>
            <Link
              to="/academia/dashboard/diplomas"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[#1A4E26] underline underline-offset-2 font-medium"
            >
              Ver certificados
            </Link>
          </div>
        )}
        {!canAccess && enrollment.status !== 'rejected' && (
          <LockKeyhole className="text-slate-300" size={20} />
        )}
      </div>
    </div>
  );

  return canAccess && course?.slug ? (
    <Link to={`/academia/aprender/${course.slug}`}>{card}</Link>
  ) : (
    <div>{card}</div>
  );
}

// ---------------------------------------------------------------------------
// Sección con título
// ---------------------------------------------------------------------------
function Section({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: EnrollmentWithCourse[];
  emptyText?: string;
}) {
  if (items.length === 0 && !emptyText) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[#1A4E26]">{icon}</span>
        <h2 className="text-lg font-black text-[#111111]">{title}</h2>
        {items.length > 0 && (
          <span className="ml-1 text-xs font-bold text-[#6B7280] bg-slate-100 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 && emptyText ? (
        <p className="text-sm text-[#9CA3AF] pl-6">{emptyText}</p>
      ) : (
        <div className="grid gap-3">
          {items.map((e) => <EnrollmentCard key={e.id} enrollment={e} />)}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function MisCursos() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    academyAPI
      .getMyEnrollments()
      .then((data) => setEnrollments(data as EnrollmentWithCourse[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#1A4E26]">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <XCircle className="mx-auto text-red-500 mb-3" size={32} />
        <h1 className="text-xl font-black text-[#111111]">No pudimos cargar tus cursos</h1>
        <p className="text-[#6B7280] mt-2">Intenta nuevamente en unos minutos.</p>
      </div>
    );
  }

  const inProgress  = enrollments.filter((e) => e.status === 'active');
  const completed   = enrollments.filter((e) => e.status === 'completed');
  const history     = enrollments.filter((e) => ['expired', 'rejected', 'pending', 'payment_pending', 'cancelled'].includes(e.status));

  const isEmpty = enrollments.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#111111]">Mis cursos</h1>
        <p className="text-[#6B7280] mt-1">Consulta tus accesos, progreso y logros académicos.</p>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-dashed border-[#C8D8CB] rounded-2xl p-12 text-center">
          <BookOpen className="mx-auto text-[#1A4E26] mb-4" size={36} />
          <h2 className="text-xl font-bold text-[#111111]">Aún no tienes cursos</h2>
          <p className="text-[#6B7280] mt-2 mb-6">Explora el catálogo para solicitar tu primer acceso.</p>
          <Link
            to="/academia/cursos"
            className="inline-flex px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold hover:bg-[#163d1e] transition-colors"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <>
          <Section
            title="En progreso"
            icon={<BookOpen size={20} />}
            items={inProgress}
            emptyText={completed.length > 0 ? 'No tienes cursos activos en este momento.' : undefined}
          />
          <Section
            title="Completados"
            icon={<Trophy size={20} />}
            items={completed}
          />
          <Section
            title="Historial"
            icon={<Archive size={20} />}
            items={history}
          />
          {inProgress.length === 0 && completed.length === 0 && (
            <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-8 text-center">
              <Medal className="mx-auto text-[#1A4E26] mb-3" size={28} />
              <p className="text-[#374151] font-semibold">Tus solicitudes están siendo procesadas.</p>
              <p className="text-sm text-[#6B7280] mt-1">Recibirás una notificación cuando sean aprobadas.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
