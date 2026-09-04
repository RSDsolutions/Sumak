import { useEffect, useState } from 'react';
import { CheckCircle, Clock3, Loader2, Search, XCircle } from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyEnrollment } from '../../../lib/academy-types';

interface Enrollment extends AcademyEnrollment { course?: { title: string; price: number | null } }

export default function AdminAcademyEnrollments() {
  const toast = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setEnrollments(await academyAPI.getAdminEnrollments() as Enrollment[]); }
    catch { toast.error('No se pudieron cargar las inscripciones.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function review(enrollment: Enrollment, decision: 'approve' | 'reject') {
    const reason = decision === 'reject' ? window.prompt('Motivo del rechazo:') : undefined;
    if (decision === 'reject' && (!reason || reason.trim().length < 5)) return;
    setProcessing(enrollment.id);
    try { await academyAPI.reviewEnrollment(enrollment.id, decision, reason ?? undefined); toast.success(decision === 'approve' ? 'Solicitud aprobada.' : 'Solicitud rechazada.'); await load(); }
    catch { toast.error('No se pudo actualizar la solicitud.'); }
    finally { setProcessing(null); }
  }

  const visible = enrollments.filter((enrollment) => enrollment.status === filter && `${enrollment.user_id} ${enrollment.course?.title ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><div><h1 className="text-2xl font-black text-[#111111]">Inscripciones Academy</h1><p className="text-[#6B7280]">Revisa y decide las solicitudes de acceso a cursos.</p></div><div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden"><div className="p-4 border-b border-[#E5ECE6] flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por usuario o curso" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl" /></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl bg-white"><option value="pending">Pendientes</option><option value="approved">Aprobadas</option><option value="payment_pending">Pago pendiente</option><option value="active">Activas</option><option value="completed">Completadas</option><option value="rejected">Rechazadas</option><option value="expired">Expiradas</option></select></div>{loading ? <div className="py-16 text-center text-[#6B7280]"><Loader2 size={20} className="animate-spin inline mr-2" /> Cargando solicitudes...</div> : visible.length === 0 ? <div className="py-16 text-center text-[#6B7280]">No hay solicitudes en este estado.</div> : <div className="divide-y divide-[#E5ECE6]">{visible.map((enrollment) => <div key={enrollment.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"><div className="h-10 w-10 rounded-full bg-[#FFF7DF] flex items-center justify-center text-[#92680A]"><Clock3 size={18} /></div><div className="flex-1"><p className="font-bold text-[#111111]">{enrollment.course?.title ?? 'Curso'}</p><p className="text-xs text-[#6B7280] mt-1">Usuario: {enrollment.user_id}</p><p className="text-xs text-[#6B7280]">Solicitado: {new Date(enrollment.requested_at ?? enrollment.enrolled_at).toLocaleString('es-EC')}</p></div>{enrollment.status === 'pending' && <div className="flex gap-2"><button type="button" disabled={processing === enrollment.id} onClick={() => void review(enrollment, 'approve')} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#EBF4ED] text-[#1A4E26] text-xs font-bold"><CheckCircle size={15} /> Aprobar</button><button type="button" disabled={processing === enrollment.id} onClick={() => void review(enrollment, 'reject')} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold"><XCircle size={15} /> Rechazar</button></div>}</div>)}</div>}</div></div>;
}