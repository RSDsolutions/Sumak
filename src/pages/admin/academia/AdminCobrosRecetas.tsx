import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { academyAPI } from '../../../lib/academy';
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Landmark,
  CreditCard,
  Wallet,
  GraduationCap,
  Leaf,
  DollarSign,
  Clock3,
  Building2,
  RefreshCw,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { useToast } from '../../../lib/toast';
import type { AcademyEnrollment } from '../../../lib/academy-types';

interface PurchaseItem {
  recipe_id: string;
  recipe: {
    title: string;
  };
  price_at_purchase: number;
}

interface RecipePurchaseRow {
  id: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  total_amount: number;
  payment_method: string | null;
  banco_destino: string | null;
  voucher_numero: string | null;
  payment_receipt_url: string | null;
  rejection_reason?: string | null;
  created_at: string;
  user_id: string;
  user: {
    email: string;
    nombre_completo: string;
  };
  items: PurchaseItem[];
}

interface EnrollmentRow extends AcademyEnrollment {
  course?: { title: string; price: number | null; slug: string | null };
  user?: { nombre_completo: string | null; username: string | null; email?: string | null };
}

type PaymentCategory = 'all' | 'courses' | 'recipes';
type PaymentMethodFilter = 'all' | 'transferencia' | 'payphone' | 'paypal';
type PaymentStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface UnifiedPaymentRecord {
  id: string;
  sourceType: 'course' | 'recipe';
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  conceptTitle: string;
  conceptSubitems: string[];
  amount: number;
  paymentMethod: 'transferencia' | 'payphone' | 'paypal';
  bancoDestino: string | null;
  voucherNumero: string | null;
  receiptPath: string | null;
  normalizedStatus: 'pending' | 'approved' | 'rejected';
  statusBadgeLabel: string;
  enrollmentStatusLabel?: string;
  rejectionReason: string | null;
  canReview: boolean;
}

function normalizeMethod(raw?: string | null): 'transferencia' | 'payphone' | 'paypal' {
  const m = (raw || 'transferencia').toLowerCase().trim();
  if (m === 'payphone') return 'payphone';
  if (m === 'paypal') return 'paypal';
  return 'transferencia';
}

const METHOD_BADGE: Record<
  'transferencia' | 'payphone' | 'paypal',
  { label: string; badgeClass: string; icon: typeof Landmark }
> = {
  transferencia: {
    label: 'Transferencia Bancaria',
    badgeClass: 'bg-emerald-50 text-[#1A4E26] border-emerald-200',
    icon: Landmark,
  },
  payphone: {
    label: 'PayPhone',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: CreditCard,
  },
  paypal: {
    label: 'PayPal',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: Wallet,
  },
};

export default function AdminCobrosRecetas() {
  const toast = useToast();
  const location = useLocation();
  const isOperaciones = location.pathname.startsWith('/operaciones');
  const basePath = isOperaciones ? '/operaciones' : '/admin';

  const [recipePurchases, setRecipePurchases] = useState<RecipePurchaseRow[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filtros combinables
  const [categoryFilter, setCategoryFilter] = useState<PaymentCategory>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal para ver recibo
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  // Modal para rechazo con motivo
  const [rejectTarget, setRejectTarget] = useState<UnifiedPaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    void fetchAllPayments();
  }, []);

  async function fetchAllPayments() {
    try {
      setLoading(true);

      // 1. Cargar cobros de recetas y matrículas de cursos en paralelo
      const [purchasesResponse, enrollmentsData] = await Promise.all([
        supabase
          .from('academy_recipe_purchases')
          .select(`
            id,
            user_id,
            status,
            total_amount,
            payment_method,
            banco_destino,
            voucher_numero,
            payment_receipt_url,
            rejection_reason,
            created_at
          `)
          .order('created_at', { ascending: false }),
        academyAPI.getAdminEnrollments(),
      ]);

      if (purchasesResponse.error) throw purchasesResponse.error;
      const purchasesData = purchasesResponse.data ?? [];

      // Cargar items de recetas
      const purchaseIds = purchasesData.map((p) => p.id);
      const itemsByPurchase = new Map<string, PurchaseItem[]>();

      if (purchaseIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('academy_recipe_purchase_items')
          .select('purchase_id, recipe_id, price_at_purchase')
          .in('purchase_id', purchaseIds);

        if (itemsError) throw itemsError;

        const recipeIds = [...new Set((itemsData ?? []).map((item) => item.recipe_id).filter(Boolean))];
        const recipesMap = new Map<string, { title: string }>();
        if (recipeIds.length > 0) {
          const { data: recipesData, error: recipesError } = await supabase
            .from('academy_recipes')
            .select('id, title')
            .in('id', recipeIds);

          if (recipesError) throw recipesError;
          (recipesData ?? []).forEach((recipe) => recipesMap.set(recipe.id, { title: recipe.title }));
        }

        (itemsData ?? []).forEach((item) => {
          const purchaseItems = itemsByPurchase.get(item.purchase_id) ?? [];
          purchaseItems.push({
            recipe_id: item.recipe_id,
            price_at_purchase: item.price_at_purchase,
            recipe: recipesMap.get(item.recipe_id) ?? { title: 'Receta milenaria' },
          });
          itemsByPurchase.set(item.purchase_id, purchaseItems);
        });
      }

      // Cargar perfiles de usuarios para recetas
      const userIds = [...new Set(purchasesData.map((p) => p.user_id).filter(Boolean))];
      const profilesMap = new Map<string, { email: string; nombre_completo: string }>();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, nombre_completo')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        (profilesData ?? []).forEach((profile) => {
          profilesMap.set(profile.id, {
            email: profile.email ?? '',
            nombre_completo: profile.nombre_completo ?? 'Estudiante SUMAK',
          });
        });
      }

      const normalizedPurchases: RecipePurchaseRow[] = purchasesData.map((purchase) => ({
        ...purchase,
        items: itemsByPurchase.get(purchase.id) ?? [],
        user: profilesMap.get(purchase.user_id) ?? {
          email: 'Sin email',
          nombre_completo: 'Estudiante SUMAK',
        },
      }));

      setRecipePurchases(normalizedPurchases);
      setCourseEnrollments((enrollmentsData ?? []) as EnrollmentRow[]);
    } catch (error) {
      console.error('Error fetching academy payments:', error);
      toast.error('Error al cargar el centro de cobros de la Academia');
    } finally {
      setLoading(false);
    }
  }

  // Unificar registros de Cursos e Inscripciones + Recetas
  const unifiedRecords = useMemo<UnifiedPaymentRecord[]>(() => {
    const records: UnifiedPaymentRecord[] = [];

    // 1. Inscripciones y Cursos con cobro o comprobante
    for (const enr of courseEnrollments) {
      const coursePrice = Number(enr.course?.price ?? 0);
      const hasPaymentData =
        coursePrice > 0 ||
        (enr.payment_status && enr.payment_status !== 'not_required') ||
        Boolean(enr.payment_receipt_url) ||
        Boolean(enr.voucher_numero) ||
        Boolean(enr.payment_method);

      if (!hasPaymentData) continue;

      let normalizedStatus: 'pending' | 'approved' | 'rejected' = 'pending';
      let statusBadgeLabel = 'Por verificar';

      if (enr.payment_status === 'paid' || (enr.status === 'active' && coursePrice > 0) || enr.status === 'completed') {
        normalizedStatus = 'approved';
        statusBadgeLabel = 'Pago Aprobado';
      } else if (enr.payment_status === 'failed' || enr.status === 'rejected') {
        normalizedStatus = 'rejected';
        statusBadgeLabel = 'Voucher Rechazado';
      } else if (enr.payment_status === 'pending_verification') {
        normalizedStatus = 'pending';
        statusBadgeLabel = 'Voucher por Verificar';
      } else {
        normalizedStatus = 'pending';
        statusBadgeLabel = 'Esperando Pago / Voucher';
      }

      const enrollmentStatusMap: Record<string, string> = {
        pending: 'Solicitud pendiente',
        payment_pending: 'Pago pendiente',
        approved: 'Aprobado',
        active: 'Curso Activo (3 meses)',
        completed: 'Curso Completado',
        rejected: 'Rechazado',
        expired: 'Expirado',
      };

      records.push({
        id: enr.id,
        sourceType: 'course',
        createdAt: enr.payment_submitted_at || enr.requested_at || enr.enrolled_at,
        userId: enr.user_id,
        userName: enr.user?.nombre_completo || enr.user?.username || 'Estudiante SUMAK',
        userEmail: enr.user?.email || (enr.user?.username ? `@${enr.user.username}` : ''),
        conceptTitle: enr.course?.title || 'Curso SUMAK Academy',
        conceptSubitems: ['Inscripción a Curso Oficial (Acceso 3 meses + Certificado)'],
        amount: coursePrice,
        paymentMethod: normalizeMethod(enr.payment_method),
        bancoDestino: enr.banco_destino ?? null,
        voucherNumero: enr.voucher_numero ?? null,
        receiptPath: enr.payment_receipt_url ?? null,
        normalizedStatus,
        statusBadgeLabel,
        enrollmentStatusLabel: enrollmentStatusMap[enr.status] || enr.status,
        rejectionReason: enr.rejection_reason ?? null,
        canReview:
          enr.status === 'pending' ||
          enr.status === 'payment_pending' ||
          enr.payment_status === 'pending_verification',
      });
    }

    // 2. Compras de Recetas
    for (const pur of recipePurchases) {
      let normalizedStatus: 'pending' | 'approved' | 'rejected' = 'pending';
      let statusBadgeLabel = 'Voucher por Verificar';

      if (pur.status === 'approved') {
        normalizedStatus = 'approved';
        statusBadgeLabel = 'Pago Aprobado';
      } else if (pur.status === 'rejected') {
        normalizedStatus = 'rejected';
        statusBadgeLabel = 'Rechazado';
      }

      const itemTitles = (pur.items ?? []).map((i) => i.recipe?.title || 'Receta milenaria');

      records.push({
        id: pur.id,
        sourceType: 'recipe',
        createdAt: pur.created_at,
        userId: pur.user_id,
        userName: pur.user?.nombre_completo || 'Estudiante SUMAK',
        userEmail: pur.user?.email || '',
        conceptTitle:
          itemTitles.length === 1
            ? itemTitles[0]
            : `Pack de ${itemTitles.length} Recetas Milenarias`,
        conceptSubitems: itemTitles,
        amount: Number(pur.total_amount ?? 0),
        paymentMethod: normalizeMethod(pur.payment_method),
        bancoDestino: pur.banco_destino ?? null,
        voucherNumero: pur.voucher_numero ?? null,
        receiptPath: pur.payment_receipt_url ?? null,
        normalizedStatus,
        statusBadgeLabel,
        enrollmentStatusLabel: pur.status === 'approved' ? 'PDFs Desbloqueados' : 'Acceso bloqueado',
        rejectionReason: pur.rejection_reason ?? null,
        canReview: pur.status === 'pending' || pur.status === 'processing',
      });
    }

    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [courseEnrollments, recipePurchases]);

  // Métricas ejecutivas y contadores
  const stats = useMemo(() => {
    let approvedTotal = 0;
    let approvedCourses = 0;
    let approvedRecipes = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    const byMethod = {
      transferencia: { approvedAmount: 0, count: 0, pending: 0 },
      payphone: { approvedAmount: 0, count: 0, pending: 0 },
      paypal: { approvedAmount: 0, count: 0, pending: 0 },
    };

    const byCategory = {
      all: unifiedRecords.length,
      courses: 0,
      recipes: 0,
    };

    const byStatus = {
      all: unifiedRecords.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const rec of unifiedRecords) {
      if (rec.sourceType === 'course') byCategory.courses += 1;
      else byCategory.recipes += 1;

      byStatus[rec.normalizedStatus] += 1;
      byMethod[rec.paymentMethod].count += 1;

      if (rec.normalizedStatus === 'approved') {
        approvedTotal += rec.amount;
        if (rec.sourceType === 'course') approvedCourses += rec.amount;
        else approvedRecipes += rec.amount;
        byMethod[rec.paymentMethod].approvedAmount += rec.amount;
      } else if (rec.normalizedStatus === 'pending') {
        pendingCount += 1;
        pendingAmount += rec.amount;
        byMethod[rec.paymentMethod].pending += 1;
      }
    }

    return {
      approvedTotal,
      approvedCourses,
      approvedRecipes,
      pendingCount,
      pendingAmount,
      byMethod,
      byCategory,
      byStatus,
    };
  }, [unifiedRecords]);

  // Registros filtrados
  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((rec) => {
      if (categoryFilter === 'courses' && rec.sourceType !== 'course') return false;
      if (categoryFilter === 'recipes' && rec.sourceType !== 'recipe') return false;
      if (methodFilter !== 'all' && rec.paymentMethod !== methodFilter) return false;
      if (statusFilter !== 'all' && rec.normalizedStatus !== statusFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const haystack = [
          rec.userName,
          rec.userEmail,
          rec.conceptTitle,
          ...rec.conceptSubitems,
          rec.voucherNumero || '',
          rec.bancoDestino || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [unifiedRecords, categoryFilter, methodFilter, statusFilter, searchTerm]);

  async function handleApprove(record: UnifiedPaymentRecord) {
    setProcessingId(record.id);
    try {
      if (record.sourceType === 'course') {
        await academyAPI.reviewEnrollment(record.id, 'approve');
        toast.success('Pago de curso verificado e inscripción activada por 3 meses.');
      } else {
        await academyAPI.reviewRecipePurchase(record.id, 'approved');
        toast.success('Pago verificado y recetas desbloqueadas.');
      }
      await fetchAllPayments();
    } catch (error: any) {
      console.error('Error approving payment:', error);
      toast.error('Error al aprobar el cobro: ' + (error?.message || ''));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleConfirmReject() {
    if (!rejectTarget || rejectReason.trim().length < 5) return;
    const target = rejectTarget;
    const reason = rejectReason.trim();
    setRejectTarget(null);
    setRejectReason('');
    setProcessingId(target.id);
    try {
      if (target.sourceType === 'course') {
        await academyAPI.reviewEnrollment(target.id, 'reject', reason);
        toast.success('Cobro de curso rechazado y alumno notificado.');
      } else {
        await academyAPI.reviewRecipePurchase(target.id, 'rejected', reason);
        toast.success('Cobro de recetas rechazado.');
      }
      await fetchAllPayments();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error('Error al rechazar el cobro: ' + (error?.message || ''));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleOpenReceipt(record: UnifiedPaymentRecord) {
    if (!record.receiptPath) return;
    setLoadingReceiptId(record.id);
    try {
      const signedUrl = await academyAPI.getReceiptSignedUrl(record.receiptPath);
      setSelectedReceipt(signedUrl);
    } catch (error) {
      console.error('Error getting receipt url:', error);
      toast.error('No se pudo cargar el comprobante de pago');
    } finally {
      setLoadingReceiptId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── CABECERA PRINCIPAL ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] border border-[#C8D8CB] px-3 py-1 rounded-full mb-2">
            <DollarSign size={13} /> Finanzas y Conciliación SUMAK Academy
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111]">
            Centro de Cobros y Pagos — Academia
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            Verifica comprobantes, aprueba matrículas de cursos y desbloquea recetas separados por rubro y pasarela de pago.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to={`${basePath}/academia/inscripciones`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#C8D8CB] text-[#1A4E26] text-xs font-bold hover:bg-[#EBF4ED] transition-colors shadow-2xs"
          >
            <GraduationCap size={15} />
            Gestión de Inscripciones
            <ArrowUpRight size={14} />
          </Link>
          <button
            type="button"
            onClick={() => void fetchAllPayments()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#163F1E] transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── TARJETAS KPI EJECUTIVAS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Recaudación Total */}
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              Recaudación Aprobada
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#111111] mt-2">
            ${stats.approvedTotal.toFixed(2)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#6B7280]">
            <span>
              Cursos: <strong className="text-[#1A4E26]">${stats.approvedCourses.toFixed(2)}</strong>
            </span>
            <span>·</span>
            <span>
              Recetas: <strong className="text-[#1A4E26]">${stats.approvedRecipes.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 2: Pendientes de Verificación */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Por Verificar / Pendientes
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock3 size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#111111] mt-2">
            {stats.pendingCount}{' '}
            <span className="text-sm font-bold text-amber-700">
              ({stats.pendingCount === 1 ? 'solicitud' : 'solicitudes'})
            </span>
          </p>
          <p className="text-xs text-[#6B7280] mt-2">
            Monto en revisión: <strong className="text-amber-800">${stats.pendingAmount.toFixed(2)}</strong>
          </p>
        </div>

        {/* KPI 3: Transferencia Bancaria */}
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              Transferencia Bancaria
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1A4E26] flex items-center justify-center">
              <Landmark size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#1A4E26] mt-2">
            ${stats.byMethod.transferencia.approvedAmount.toFixed(2)}
          </p>
          <p className="text-xs text-[#6B7280] mt-2">
            {stats.byMethod.transferencia.count} registros ·{' '}
            <strong className="text-amber-700">{stats.byMethod.transferencia.pending} por verificar</strong>
          </p>
        </div>

        {/* KPI 4: Pasarelas Digitales (PayPhone / PayPal) */}
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              PayPhone & PayPal
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#111111] mt-2">
            ${(stats.byMethod.payphone.approvedAmount + stats.byMethod.paypal.approvedAmount).toFixed(2)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#6B7280]">
            <span>
              PayPhone: <strong className="text-amber-800">${stats.byMethod.payphone.approvedAmount.toFixed(2)}</strong>
            </span>
            <span>·</span>
            <span>
              PayPal: <strong className="text-sky-800">${stats.byMethod.paypal.approvedAmount.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── NIVEL 1: SELECTOR DE RUBRO (TODOS / CURSOS E INSCRIPCIONES / RECETAS) ── */}
      <div className="bg-white rounded-2xl border border-[#C8D8CB] p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5ECE6] pb-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                {
                  key: 'all',
                  label: 'Todos los Cobros',
                  count: stats.byCategory.all,
                  icon: Layers,
                },
                {
                  key: 'courses',
                  label: 'Inscripciones y Cursos',
                  count: stats.byCategory.courses,
                  icon: GraduationCap,
                },
                {
                  key: 'recipes',
                  label: 'Recetas Milenarias',
                  count: stats.byCategory.recipes,
                  icon: Leaf,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = categoryFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategoryFilter(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1A4E26] text-white border-[#1A4E26] shadow-sm'
                      : 'bg-[#F4F7F5] text-[#374151] border-slate-200 hover:border-[#1A4E26]'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Buscador */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar alumno, curso, receta o N° voucher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4E26]/20 focus:border-[#1A4E26]"
            />
          </div>
        </div>

        {/* ── NIVEL 2 Y 3: FILTRO POR MÉTODO DE PAGO Y FILTRO POR ESTADO ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Separación por Método de Pago: Transferencia / PayPhone / PayPal */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] mr-1">
              Método de pago:
            </span>
            {(
              [
                { key: 'all', label: 'Todos', count: unifiedRecords.length, icon: null },
                {
                  key: 'transferencia',
                  label: 'Transferencia Bancaria',
                  count: stats.byMethod.transferencia.count,
                  icon: Landmark,
                },
                {
                  key: 'payphone',
                  label: 'PayPhone',
                  count: stats.byMethod.payphone.count,
                  icon: CreditCard,
                },
                {
                  key: 'paypal',
                  label: 'PayPal',
                  count: stats.byMethod.paypal.count,
                  icon: Wallet,
                },
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
                      ? 'bg-[#0F2E18] text-[#D4AF37] border-[#0F2E18] shadow-2xs'
                      : 'bg-white text-[#374151] border-slate-200 hover:border-[#1A4E26]'
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  {m.label}
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtro por Estado */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] mr-1">
              Estado:
            </span>
            {(
              [
                { key: 'all', label: 'Todos', count: stats.byStatus.all },
                { key: 'pending', label: 'Por Verificar', count: stats.byStatus.pending },
                { key: 'approved', label: 'Aprobados', count: stats.byStatus.approved },
                { key: 'rejected', label: 'Rechazados', count: stats.byStatus.rejected },
              ] as const
            ).map((st) => {
              const active = statusFilter === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                      : 'bg-white text-[#374151] border-slate-200 hover:border-[#1A4E26]'
                  }`}
                >
                  {st.label}
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TABLA UNIFICADA DE COBROS (CURSOS E INSCRIPCIONES + RECETAS) ── */}
      <div className="bg-white rounded-2xl shadow-2xs border border-[#C8D8CB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-[#F4F7F5] text-[#374151] text-[11px] uppercase font-extrabold tracking-wider border-b border-[#C8D8CB]">
              <tr>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Estudiante</th>
                <th className="px-5 py-3.5">Rubro y Concepto</th>
                <th className="px-5 py-3.5">Método y Referencia</th>
                <th className="px-5 py-3.5">Monto</th>
                <th className="px-5 py-3.5">Comprobante</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Cargando cobros de cursos y recetas...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron registros de cobro con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const methodMeta = METHOD_BADGE[rec.paymentMethod];
                  const MethodIcon = methodMeta.icon;
                  const isBusy = processingId === rec.id;

                  return (
                    <tr key={`${rec.sourceType}-${rec.id}`} className="hover:bg-[#F4F7F5]/60 transition-colors">
                      {/* Fecha */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        <span className="font-bold text-gray-900">
                          {new Date(rec.createdAt).toLocaleDateString('es-EC', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        <br />
                        <span className="text-gray-400">
                          {new Date(rec.createdAt).toLocaleTimeString('es-EC', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Estudiante */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{rec.userName}</div>
                        {rec.userEmail && <div className="text-xs text-gray-500">{rec.userEmail}</div>}
                      </td>

                      {/* Rubro y Concepto */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {rec.sourceType === 'course' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <GraduationCap size={11} /> Curso / Inscripción
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-[#1A4E26] border border-emerald-200">
                              <Leaf size={11} /> Recetas Milenarias
                            </span>
                          )}
                          {rec.enrollmentStatusLabel && (
                            <span className="text-[10px] font-semibold text-gray-500">
                              · {rec.enrollmentStatusLabel}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-gray-900 line-clamp-1">{rec.conceptTitle}</div>
                        {rec.sourceType === 'recipe' && rec.conceptSubitems.length > 1 && (
                          <ul className="list-disc list-inside text-[11px] text-gray-500 mt-0.5">
                            {rec.conceptSubitems.map((title, idx) => (
                              <li key={idx} className="line-clamp-1">
                                {title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>

                      {/* Método de Pago y Banco/Voucher */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${methodMeta.badgeClass}`}
                        >
                          <MethodIcon size={12} />
                          {methodMeta.label}
                        </span>
                        {rec.bancoDestino && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 font-medium mt-1.5">
                            <Building2 size={12} className="text-[#1A4E26]" />
                            {rec.bancoDestino}
                          </div>
                        )}
                        {rec.voucherNumero && (
                          <div className="text-[11px] font-mono font-bold text-gray-800 bg-slate-100 inline-block px-2 py-0.5 rounded mt-1">
                            N° {rec.voucherNumero}
                          </div>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-base font-black text-[#111111]">
                          ${rec.amount.toFixed(2)}
                        </span>
                      </td>

                      {/* Comprobante */}
                      <td className="px-5 py-4">
                        {rec.receiptPath ? (
                          <button
                            type="button"
                            disabled={loadingReceiptId === rec.id}
                            onClick={() => void handleOpenReceipt(rec)}
                            className="inline-flex items-center gap-1.5 text-[#1A4E26] hover:text-[#163F1E] bg-[#EBF4ED] border border-[#C8D8CB] px-3 py-1.5 rounded-xl transition-colors text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            <Eye size={14} />
                            {loadingReceiptId === rec.id ? 'Cargando...' : 'Ver Comprobante'}
                          </button>
                        ) : rec.paymentMethod !== 'transferencia' ? (
                          <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
                            Pasarela Digital
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            Sin voucher adjunto
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border ${
                            rec.normalizedStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : rec.normalizedStatus === 'rejected'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {rec.statusBadgeLabel}
                        </span>
                        {rec.rejectionReason && (
                          <p className="text-[11px] text-red-600 mt-1 max-w-[190px] line-clamp-2">
                            Motivo: {rec.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {rec.canReview ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleApprove(rec)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1A4E26] text-white hover:bg-[#163F1E] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                              title={
                                rec.sourceType === 'course'
                                  ? 'Aprobar pago y activar curso por 3 meses'
                                  : 'Aprobar pago y desbloquear recetas'
                              }
                            >
                              <CheckCircle size={14} />
                              {isBusy ? '...' : 'Aprobar'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setRejectTarget(rec);
                                setRejectReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                              title="Rechazar cobro"
                            >
                              <XCircle size={14} />
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL VISOR DE COMPROBANTE ── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-4 sm:p-5 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col items-center relative shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-900 rounded-full p-2 shadow-lg hover:bg-gray-100 cursor-pointer"
            >
              <XCircle size={22} />
            </button>
            <h3 className="text-base font-black text-[#111111] mb-3 self-start">
              Comprobante de Pago — SUMAK Academy
            </h3>
            <div className="overflow-auto flex-1 w-full flex justify-center bg-gray-50 rounded-xl p-2">
              {selectedReceipt.toLowerCase().includes('.pdf') ? (
                <iframe src={selectedReceipt} title="Comprobante PDF" className="w-full h-[70vh] rounded-lg" />
              ) : (
                <img
                  src={selectedReceipt}
                  alt="Comprobante"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              )}
            </div>
            <div className="mt-4 flex gap-4 w-full">
              <a
                href={selectedReceipt}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex justify-center items-center gap-2 bg-[#1A4E26] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#163F1E] transition-colors"
              >
                <Download size={18} /> Abrir / Descargar Comprobante
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE RECHAZO UNIFICADO ── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <h2 className="font-black text-[#111111] text-lg">
                  Rechazar cobro de {rejectTarget.sourceType === 'course' ? 'Curso' : 'Recetas'}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Alumno: <span className="font-semibold text-[#111111]">{rejectTarget.userName}</span> ·{' '}
                  <span className="font-bold text-[#1A4E26]">${rejectTarget.amount.toFixed(2)}</span>
                </p>
                <p className="text-xs text-[#6B7280] line-clamp-1">
                  Concepto: <span className="font-medium text-[#111111]">{rejectTarget.conceptTitle}</span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#374151]">
                Motivo del rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Ej: El comprobante adjunto es ilegible o el número de referencia no coincide..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <p className="text-xs text-[#9CA3AF]">{rejectReason.trim().length} / 5 mínimo</p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[#374151] border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rejectReason.trim().length < 5}
                onClick={() => void handleConfirmReject()}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
