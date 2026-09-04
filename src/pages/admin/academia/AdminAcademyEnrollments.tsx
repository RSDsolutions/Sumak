import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Clock3,
  Loader2,
  Search,
  XCircle,
  User2,
  CalendarCheck2,
  CalendarX2,
  BadgeDollarSign,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyEnrollment } from '../../../lib/academy-types';

interface EnrollmentRow extends AcademyEnrollment {
  course?: { title: string; price: number | null; slug: string | null };
  user?: { nombre_completo: string | null; username: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:         { label: 'Pendiente',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:        { label: 'Aprobado',        color: 'bg-sky-50 text-sky-700 border-sky-200' },
  payment_pending: { label: 'Pago pendiente', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  active:          { label: 'Activo',          color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:       { label: 'Completado',      color: 'bg-[#EBF4ED] text-[#1A4E26] border-[#C8D8CB]' },
  rejected:        { label: 'Rechazado',       color: 'bg-red-50 text-red-700 border-red-200' },
  expired:         { label: 'Expirado',        color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function fmt(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtPrice(price: number | null | undefined) {
  if (!price || price === 0) return 'Gratuito';
  return `$${price.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Modal de rechazo
// ---------------------------------------------------------------------------
interface RejectModalProps {
  courseTitle: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function RejectModal({ courseTitle, onConfirm, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="text-red-600" size={20} />
          </div>
          <div>
            <h2 className="font-black text-[#111111] text-lg">Rechazar solicitud</h2>
            <p className="text-sm text-[#6B7280] mt-0.5">
              Curso: <span className="font-semibold text-[#111111]">{courseTitle}</span>
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#374151]" htmlFor="rejection-reason">
            Motivo del rechazo <span className="text-red-500">*</span>
          </label>
          <textarea
            id="rejection-reason"
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ej: El usuario no cumple con los requisitos previos..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <p className="text-xs text-[#9CA3AF]">{reason.trim().length} / 5 mínimo</p>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#374151] border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={reason.trim().length < 5}
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            Confirmar rechazo
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function AdminAcademyEnrollments() {
  const toast = useToast();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EnrollmentRow | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await academyAPI.getAdminEnrollments();
      setEnrollments(data as EnrollmentRow[]);
    } catch {
      toast.error('No se pudieron cargar las inscripciones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleApprove(enrollment: EnrollmentRow) {
    setProcessing(enrollment.id);
    try {
      await academyAPI.reviewEnrollment(enrollment.id, 'approve');
      toast.success('Solicitud aprobada.');
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar.';
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    setProcessing(target.id);
    try {
      await academyAPI.reviewEnrollment(target.id, 'reject', reason);
      toast.success('Solicitud rechazada.');
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo rechazar.';
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  }

  const visible = enrollments.filter(
    (e) =>
      e.status === filter &&
      `${e.user?.nombre_completo ?? e.user_id} ${e.course?.title ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  // Contadores por estado para los tabs
  const counts = enrollments.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const tabs = ['pending', 'approved', 'payment_pending', 'active', 'completed', 'rejected', 'expired'];

  return (
    <>
      {rejectTarget && (
        <RejectModal
          courseTitle={rejectTarget.course?.title ?? 'este curso'}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Inscripciones Academy</h1>
          <p className="text-[#6B7280] mt-1">Revisa y decide las solicitudes de acceso a cursos.</p>
        </div>

        {/* Tabs de estado */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = filter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? 'bg-[#1A4E26] text-white border-[#1A4E26] shadow-sm'
                    : 'bg-white text-[#374151] border-slate-200 hover:border-[#1A4E26]'
                }`}
              >
                {cfg.label}
                {counts[s] ? (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {counts[s]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
          {/* Búsqueda */}
          <div className="p-4 border-b border-[#E5ECE6]">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o curso…"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4E26]/20"
              />
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="py-16 text-center text-[#6B7280]">
              <Loader2 size={20} className="animate-spin inline mr-2" />
              Cargando solicitudes…
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-[#6B7280]">
              <AlertCircle className="mx-auto mb-2 text-slate-300" size={28} />
              No hay solicitudes en este estado.
            </div>
          ) : (
            <div className="divide-y divide-[#E5ECE6]">
              {visible.map((enrollment) => {
                const cfg = STATUS_CONFIG[enrollment.status] ?? { label: enrollment.status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
                const isExpanded = expanded === enrollment.id;
                const isPending = enrollment.status === 'pending';

                return (
                  <div key={enrollment.id} className="p-4 sm:p-5">
                    {/* Cabecera */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#EBF4ED] flex items-center justify-center shrink-0">
                        <User2 className="text-[#1A4E26]" size={18} />
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-[#111111] truncate">
                            {enrollment.user?.nombre_completo ?? enrollment.user?.username ?? 'Usuario desconocido'}
                          </p>
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-[#374151] mt-0.5 truncate">
                          {enrollment.course?.title ?? 'Curso Academy'}
                          {enrollment.course?.price != null && (
                            <span className="ml-2 text-xs text-[#6B7280]">— {fmtPrice(enrollment.course.price)}</span>
                          )}
                        </p>
                        <p className="text-xs text-[#9CA3AF] mt-1">
                          Solicitado: {fmt(enrollment.requested_at ?? enrollment.enrolled_at)}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              disabled={processing === enrollment.id}
                              onClick={() => void handleApprove(enrollment)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EBF4ED] text-[#1A4E26] text-xs font-bold hover:bg-[#d5ebd8] transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={14} />
                              {processing === enrollment.id ? 'Procesando…' : 'Aprobar'}
                            </button>
                            <button
                              type="button"
                              disabled={processing === enrollment.id}
                              onClick={() => setRejectTarget(enrollment)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Rechazar
                            </button>
                          </>
                        )}
                        {/* Botón para expandir detalles */}
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : enrollment.id)}
                          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-slate-50 transition-colors"
                          aria-label={isExpanded ? 'Colapsar' : 'Ver detalles'}
                        >
                          <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Detalles expandidos */}
                    {isExpanded && (
                      <div className="mt-4 ml-0 sm:ml-[52px] bg-slate-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-0.5">
                          <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold">Estado de pago</p>
                          <p className="text-[#111111] font-bold">{enrollment.payment_status ?? 'not_required'}</p>
                        </div>
                        {enrollment.approved_at && (
                          <div className="space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold flex items-center gap-1"><CalendarCheck2 size={11} /> Aprobado</p>
                            <p className="text-[#111111] font-bold">{fmt(enrollment.approved_at)}</p>
                          </div>
                        )}
                        {enrollment.activated_at && (
                          <div className="space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold">Activado</p>
                            <p className="text-[#111111] font-bold">{fmt(enrollment.activated_at)}</p>
                          </div>
                        )}
                        {enrollment.expires_at && (
                          <div className="space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold flex items-center gap-1"><CalendarX2 size={11} /> Vence</p>
                            <p className="text-[#111111] font-bold">{fmt(enrollment.expires_at)}</p>
                          </div>
                        )}
                        {enrollment.payment_status === 'paid' && (
                          <div className="space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold flex items-center gap-1"><BadgeDollarSign size={11} /> Pago</p>
                            <p className="text-emerald-700 font-bold">Confirmado</p>
                          </div>
                        )}
                        {enrollment.rejection_reason && (
                          <div className="col-span-2 sm:col-span-3 space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold">Motivo de rechazo</p>
                            <p className="text-red-700 font-medium">{enrollment.rejection_reason}</p>
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold">Progreso</p>
                          <p className="text-[#111111] font-bold">{enrollment.progress_percentage ?? 0}%</p>
                        </div>
                        <div className="col-span-2 sm:col-span-2 space-y-0.5">
                          <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold flex items-center gap-1"><Clock3 size={11} /> ID inscripción</p>
                          <p className="text-[#6B7280] font-mono break-all">{enrollment.id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}