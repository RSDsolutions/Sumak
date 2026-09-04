import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock3, LockKeyhole, Loader2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { academyAPI } from '../../../lib/academy';
import type { AcademyEnrollment } from '../../../lib/academy-types';

type EnrollmentWithCourse = AcademyEnrollment & {
  course?: { title: string; slug: string; cover_image_url: string | null; estimated_duration_minutes: number | null };
};

const statusCopy: Record<string, { label: string; className: string }> = {
  pending: { label: 'Solicitud pendiente', className: 'bg-[#FFF7DF] text-[#92680A]' },
  payment_pending: { label: 'Pago pendiente', className: 'bg-blue-50 text-blue-700' },
  active: { label: 'Activo', className: 'bg-[#EBF4ED] text-[#1A4E26]' },
  completed: { label: 'Completado', className: 'bg-[#EBF4ED] text-[#1A4E26]' },
  rejected: { label: 'Rechazado', className: 'bg-red-50 text-red-700' },
  expired: { label: 'Expirado', className: 'bg-slate-100 text-slate-600' },
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-EC') : 'Sin fecha';
}

export default function MisCursos() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    academyAPI.getMyEnrollments()
      .then((data) => setEnrollments(data as EnrollmentWithCourse[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-[#1A4E26]"><Loader2 className="animate-spin" size={24} /></div>;
  if (error) return <div className="max-w-3xl mx-auto py-12 text-center"><XCircle className="mx-auto text-red-500 mb-3" size={32} /><h1 className="text-xl font-black text-[#111111]">No pudimos cargar tus cursos</h1><p className="text-[#6B7280] mt-2">Intenta nuevamente en unos minutos.</p></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div><h1 className="text-3xl font-black text-[#111111]">Mis cursos</h1><p className="text-[#6B7280] mt-1">Consulta tus solicitudes, accesos y fechas de vencimiento.</p></div>
      {enrollments.length === 0 ? (
        <div className="bg-white border border-dashed border-[#C8D8CB] rounded-2xl p-12 text-center"><BookOpen className="mx-auto text-[#1A4E26] mb-4" size={36} /><h2 className="text-xl font-bold text-[#111111]">Aún no tienes cursos</h2><p className="text-[#6B7280] mt-2 mb-6">Explora el catálogo para solicitar tu primer acceso.</p><Link to="/academia/cursos" className="inline-flex px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold">Explorar catálogo</Link></div>
      ) : (
        <div className="grid gap-4">{enrollments.map((enrollment) => {
          const course = enrollment.course;
          const status = statusCopy[enrollment.status] ?? { label: enrollment.status, className: 'bg-slate-100 text-slate-600' };
          const canAccess = enrollment.status === 'active' || enrollment.status === 'completed';
          const content = <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:border-[#1A4E26] transition-colors"><div className="w-full sm:w-40 aspect-video rounded-xl bg-[#EBF4ED] flex items-center justify-center overflow-hidden shrink-0">{course?.cover_image_url ? <img src={academyAPI.getPublicImageUrl(course.cover_image_url)} alt="" className="w-full h-full object-cover" /> : <BookOpen className="text-[#1A4E26]" size={30} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#111111]">{course?.title ?? 'Curso Academy'}</h2><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.className}`}>{status.label}</span></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6B7280]"><span>Progreso: <strong className="text-[#111111]">{enrollment.progress_percentage}%</strong></span>{enrollment.expires_at && enrollment.status !== 'completed' && <span className="inline-flex items-center gap-1"><Clock3 size={13} /> Vence: {formatDate(enrollment.expires_at)}</span>}{enrollment.status === 'pending' && <span>Solicitado: {formatDate(enrollment.requested_at ?? enrollment.enrolled_at)}</span>}{enrollment.status === 'rejected' && enrollment.rejection_reason && <span>Motivo: {enrollment.rejection_reason}</span>}</div>{canAccess && <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#1A4E26] rounded-full" style={{ width: `${Math.min(100, Math.max(0, enrollment.progress_percentage))}%` }} /></div>}</div>{canAccess ? <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#1A4E26] text-white text-sm font-bold">{enrollment.status === 'completed' ? 'Ver curso' : 'Continuar'}</span> : <LockKeyhole className="text-slate-400 shrink-0 self-center" size={20} />}</div>;
          return canAccess && course?.slug ? <Link key={enrollment.id} to={`/academia/aprender/${course.slug}`}>{content}</Link> : <div key={enrollment.id}>{content}</div>;
        })}</div>
      )}
    </div>
  );
}
