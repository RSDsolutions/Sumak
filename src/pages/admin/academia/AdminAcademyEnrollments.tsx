import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Eye,
  Download,
  Building2,
  Landmark,
  CreditCard,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyEnrollment } from '../../../lib/academy-types';

interface EnrollmentRow extends AcademyEnrollment {
  course?: { title: string; price: number | null; slug: string | null };
  user?: { nombre_completo: string | null; username: string | null; email?: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  all:             { label: 'Todas',          color: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending:         { label: 'Pendiente',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
  payment_pending: { label: 'Pago / Comprobante', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved:        { label: 'Aprobado',       color: 'bg-sky-50 text-sky-700 border-sky-200' },
  active:          { label: 'Activo',         color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:       { label: 'Completado',     color: 'bg-[#EBF4ED] text-[#1A4E26] border-[#C8D8CB]' },
  rejected:        { label: 'Rechazado',      color: 'bg-red-50 text-red-700 border-red-200' },
  expired:         { label: 'Expirado',       color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_required:         { label: 'Sin pago requerido',    color: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_payment:      { label: 'Esperando pago',        color: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_verification: { label: 'Voucher por verificar', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  paid:                 { label: 'Pago verificado',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed:               { label: 'Voucher rechazado',     color: 'bg-red-50 text-red-700 border-red-200' },
  refunded:             { label: 'Reembolsado',           color: 'bg-purple-50 text-purple-700 border-purple-200' },
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
  const location = useLocation();
  const basePath = location.pathname.startsWith('/operaciones') ? '/operaciones' : '/admin';

  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'transferencia' | 'payphone' | 'paypal' | 'free'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EnrollmentRow | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);

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

  async function handleViewReceipt(enrollment: EnrollmentRow) {
    if (!enrollment.payment_receipt_url) return;
    setLoadingReceipt(enrollment.id);
    try {
      const signedUrl = await academyAPI.getReceiptSignedUrl(enrollment.payment_receipt_url);
      setSelectedReceipt(signedUrl);
    } catch {
      toast.error('No se pudo cargar el comprobante de pago.');
    } finally {
      setLoadingReceipt(null);
    }
  }

  async function handleApprove(enrollment: EnrollmentRow) {
    setProcessing(enrollment.id);
    try {
      await academyAPI.reviewEnrollment(enrollment.id, 'approve');
      toast.success(
        enrollment.status === 'payment_pending'
          ? 'Pago verificado y curso activado por 3 meses.'
          : 'Solicitud aprobada.'
      );
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
      toast.success('Solicitud o comprobante rechazado.');
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo rechazar.';
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  }

  function getEnrollmentMethod(e: EnrollmentRow): 'transferencia' | 'payphone' | 'paypal' | 'free' {
    const m = (e.payment_method || '').toLowerCase().trim();
    if (m === 'payphone') return 'payphone';
    if (m === 'paypal') return 'paypal';
    if (m === 'transferencia' || e.payment_receipt_url || e.voucher_numero || e.banco_destino) return 'transferencia';
    if ((e.course?.price ?? 0) > 0 || (e.payment_status && e.payment_status !== 'not_required')) return 'transferencia';
    return 'free';
  }

  const visible = enrollments.filter(
    (e) =>
      (filter === 'all' || e.status === filter) &&
      (methodFilter === 'all' || getEnrollmentMethod(e) === methodFilter) &&
      `${e.user?.nombre_completo ?? e.user_id} ${e.user?.email ?? ''} ${e.course?.title ?? ''} ${e.voucher_numero ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  // Contadores por estado para los tabs
  const counts = enrollments.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      acc.all = (acc.all ?? 0) + 1;
      return acc;
    },
    { all: 0 }
  );

  const methodCounts = enrollments.reduce<Record<string, number>>(
    (acc, e) => {
      const m = getEnrollmentMethod(e);
      acc[m] = (acc[m] ?? 0) + 1;
      acc.all = (acc.all ?? 0) + 1;
      return acc;
    },
    { all: 0, transferencia: 0, payphone: 0, paypal: 0, free: 0 }
  );

  const tabs = ['all', 'payment_pending', 'pending', 'active', 'approved', 'completed', 'rejected', 'expired'];

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#111111]">Inscripciones y Matrículas Academy</h1>
            <p className="text-[#6B7280] mt-1">
              Revisa solicitudes de acceso, verifica comprobantes de pago y activa cursos por 3 meses.
            </p>
          </div>
          <Link
            to={`${basePath}/academia/cobros`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#163F1E] transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
          >
            <BadgeDollarSign size={15} />
            Ir al Centro de Cobros Unificado
            <ArrowUpRight size={14} />
          </Link>
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

        {/* Filtro por Método de Pago */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-[#C8D8CB] rounded-2xl p-3.5">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] mr-1">
            Filtrar por modalidad de pago:
          </span>
          {(
            [
              { key: 'all', label: 'Todos', icon: null },
              { key: 'transferencia', label: 'Transferencia Bancaria', icon: Landmark },
              { key: 'payphone', label: 'PayPhone', icon: CreditCard },
              { key: 'paypal', label: 'PayPal', icon: Wallet },
              { key: 'free', label: 'Gratuitos', icon: null },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = methodFilter === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethodFilter(m.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0F2E18] text-[#D4AF37] border-[#0F2E18]'
                    : 'bg-[#F4F7F5] text-[#374151] border-slate-200 hover:border-[#1A4E26]'
                }`}
              >
                {Icon && <Icon size={13} />}
                {m.label}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    active ? 'bg-white/15 text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {methodCounts[m.key] ?? 0}
                </span>
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
                const payCfg = PAYMENT_STATUS_LABELS[enrollment.payment_status ?? 'not_required'] ?? PAYMENT_STATUS_LABELS.not_required;
                const isExpanded = expanded === enrollment.id;
                const canReview = enrollment.status === 'pending' || enrollment.status === 'payment_pending';
                const hasReceipt = Boolean(enrollment.payment_receipt_url);

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
                          {enrollment.user?.email && (
                            <span className="text-xs text-[#6B7280] truncate">({enrollment.user.email})</span>
                          )}
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {enrollment.payment_status && enrollment.payment_status !== 'not_required' && (
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${payCfg.color}`}>
                              {payCfg.label}
                            </span>
                          )}
                          {(() => {
                            const method = getEnrollmentMethod(enrollment);
                            if (method === 'free') return null;
                            const label =
                              method === 'payphone'
                                ? 'PayPhone'
                                : method === 'paypal'
                                  ? 'PayPal'
                                  : 'Transferencia Bancaria';
                            const color =
                              method === 'payphone'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : method === 'paypal'
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : 'bg-emerald-50 text-[#1A4E26] border-emerald-200';
                            return (
                              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-[#374151] mt-0.5 truncate">
                          {enrollment.course?.title ?? 'Curso Academy'}
                          {enrollment.course?.price != null && (
                            <span className="ml-2 text-xs font-bold text-[#1A4E26]">— {fmtPrice(enrollment.course.price)}</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF] mt-1">
                          <span>Solicitado: {fmt(enrollment.requested_at ?? enrollment.enrolled_at)}</span>
                          {enrollment.banco_destino && (
                            <span className="inline-flex items-center gap-1 text-[#374151] font-medium">
                              <Building2 size={12} className="text-[#1A4E26]" />
                              {enrollment.banco_destino}
                            </span>
                          )}
                          {enrollment.voucher_numero && (
                            <span className="font-mono text-[#111111] font-semibold bg-slate-100 px-2 py-0.5 rounded">
                              Voucher: {enrollment.voucher_numero}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {hasReceipt && (
                          <button
                            type="button"
                            disabled={loadingReceipt === enrollment.id}
                            onClick={() => void handleViewReceipt(enrollment)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            <Eye size={14} />
                            {loadingReceipt === enrollment.id ? 'Cargando…' : 'Ver Comprobante'}
                          </button>
                        )}
                        {canReview && (
                          <>
                            <button
                              type="button"
                              disabled={processing === enrollment.id}
                              onClick={() => void handleApprove(enrollment)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EBF4ED] text-[#1A4E26] border border-[#C8D8CB] text-xs font-bold hover:bg-[#d5ebd8] transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={14} />
                              {processing === enrollment.id
                                ? 'Procesando…'
                                : enrollment.status === 'payment_pending'
                                  ? 'Aprobar Pago y Activar'
                                  : 'Aprobar'}
                            </button>
                            <button
                              type="button"
                              disabled={processing === enrollment.id}
                              onClick={() => setRejectTarget(enrollment)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
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
                          <p className="text-[#111111] font-bold">{payCfg.label}</p>
                        </div>
                        {enrollment.payment_method && (
                          <div className="space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold">Método de pago</p>
                            <p className="text-[#111111] font-bold uppercase">{enrollment.payment_method}</p>
                          </div>
                        )}
                        {enrollment.banco_destino && (
                          <div className="space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold">Banco destino</p>
                            <p className="text-[#111111] font-bold">{enrollment.banco_destino}</p>
                          </div>
                        )}
                        {enrollment.voucher_numero && (
                          <div className="space-y-0.5">
                            <p className="text-[#9CA3AF] uppercase tracking-wide font-semibold">N° Comprobante</p>
                            <p className="text-[#111111] font-mono font-bold">{enrollment.voucher_numero}</p>
                          </div>
                        )}
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

      {/* Modal para ver comprobante de pago */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col items-center relative shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-900 rounded-full p-2 shadow-lg hover:bg-gray-100"
            >
              <XCircle size={22} />
            </button>
            <h3 className="text-base font-black text-[#111111] mb-3 self-start">
              Comprobante de Pago — Curso SUMAK Academy
            </h3>
            <div className="overflow-auto flex-1 w-full flex justify-center bg-gray-50 rounded-xl p-2">
              {selectedReceipt.toLowerCase().includes('.pdf') ? (
                <iframe src={selectedReceipt} title="Comprobante PDF" className="w-full h-[70vh] rounded-lg" />
              ) : (
                <img src={selectedReceipt} alt="Comprobante de pago" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
              )}
            </div>
            <div className="mt-4 flex gap-3 w-full">
              <a
                href={selectedReceipt}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex justify-center items-center gap-2 bg-[#1A4E26] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#163F1E] transition-colors"
              >
                <Download size={16} /> Abrir / Descargar Comprobante
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}