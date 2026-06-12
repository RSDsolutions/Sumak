import { useEffect, useState, useMemo } from 'react';
import {
  X, Eye, Image as ImageIcon, ExternalLink, AlertCircle, Search, Calendar,
  Package, Clock, Truck, CheckCircle2, XCircle, ShoppingBag, DollarSign,
  Star, TrendingUp, Filter, Landmark, Receipt,
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import type { Pedido, PedidoItem, EstadoPedido } from '../../lib/types';
import Modal from '../../components/Modal';
import { useToast } from '../../lib/toast';
import { logger } from '../../lib/logger';
import { ESTADO_PEDIDO_LABELS, pedidoBadgeClass } from '../../lib/badges';

type FilterTab = 'todos' | EstadoPedido;

const ESTADOS: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

// COD-001: usar el catálogo central para no duplicar.
const ESTADO_LABELS = ESTADO_PEDIDO_LABELS;

const STAT_CARDS: { key: EstadoPedido; label: string; icon: React.ReactNode; iconBg: string; iconColor: string; border: string; activeBorder: string; activeShadow: string }[] = [
  { key: 'procesando', label: 'Procesados', icon: <Package size={20} />, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', border: 'hover:border-blue-200', activeBorder: 'border-blue-400', activeShadow: 'shadow-[0_8px_24px_rgba(59,130,246,0.15)]' },
  { key: 'enviado', label: 'Enviados', icon: <Truck size={20} />, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', border: 'hover:border-purple-200', activeBorder: 'border-purple-400', activeShadow: 'shadow-[0_8px_24px_rgba(168,85,247,0.15)]' },
  { key: 'entregado', label: 'Entregados', icon: <CheckCircle2 size={20} />, iconBg: 'bg-[#1A4E26]/10', iconColor: 'text-[#1A4E26]', border: 'hover:border-[#1A4E26]/30', activeBorder: 'border-[#1A4E26]', activeShadow: 'shadow-[0_8px_24px_rgba(26,78,38,0.15)]' },
  { key: 'cancelado', label: 'Cancelados', icon: <XCircle size={20} />, iconBg: 'bg-red-50', iconColor: 'text-red-600', border: 'hover:border-red-200', activeBorder: 'border-red-400', activeShadow: 'shadow-[0_8px_24px_rgba(239,68,68,0.15)]' },
];

const ESTADO_TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'procesando', label: 'Procesados' },
  { key: 'enviado', label: 'Enviados' },
  { key: 'entregado', label: 'Entregados' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'cancelado', label: 'Cancelados' },
];

type SortKey = 'fecha-desc' | 'fecha-asc' | 'monto-desc' | 'monto-asc';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'fecha-desc', label: 'Más recientes primero' },
  { key: 'fecha-asc', label: 'Más antiguos primero' },
  { key: 'monto-desc', label: 'Monto mayor a menor' },
  { key: 'monto-asc', label: 'Monto menor a mayor' },
];

type PaymentFilter = 'todos' | 'con-voucher' | 'sin-voucher';

interface PedidoRow extends Pedido {
  distribuidor_nombre?: string;
}

// COD-001: delegamos al catálogo central.
const estadoBadge = pedidoBadgeClass;

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface DetalleModalProps {
  pedido: PedidoRow;
  onClose: () => void;
}

function DetalleModal({ pedido, onClose }: DetalleModalProps) {
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [voucherUrl, setVoucherUrl] = useState<string | null>(null);

  useEffect(() => {
    supabaseAdmin
      .from('pedido_items')
      .select('*')
      .eq('pedido_id', pedido.id)
      .then(({ data }) => {
        setItems((data ?? []) as PedidoItem[]);
        setLoading(false);
      });
  }, [pedido.id]);

  useEffect(() => {
    let cancelled = false;
    if (pedido.voucher_url) {
      supabaseAdmin.storage
        .from('pedidos-vouchers')
        .createSignedUrl(pedido.voucher_url, 3600)
        .then(({ data }) => {
          if (!cancelled && data?.signedUrl) setVoucherUrl(data.signedUrl);
        });
    }
    return () => { cancelled = true; };
  }, [pedido.voucher_url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 overflow-y-auto py-8">
      <div className="bg-white border border-[#C8D8CB] rounded-2xl w-full max-w-2xl shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8D8CB] sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="font-heading font-bold text-lg text-[#111111]">Detalle del Pedido</h3>
            <p className="text-[#9CA3AF] text-xs font-mono mt-0.5">{pedido.id}</p>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111111] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Info */}
        <div className="px-6 py-4 bg-[#F4F7F5] border-b border-[#C8D8CB] grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-0.5">Distribuidor</p>
            <p className="text-[#111111] font-medium">{pedido.distribuidor_nombre ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-0.5">Fecha</p>
            <p className="text-[#111111]">{new Date(pedido.created_at).toLocaleString('es-EC')}</p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-0.5">Estado</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge(pedido.estado)}`}>
              {ESTADO_LABELS[pedido.estado]}
            </span>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-0.5">Puntos</p>
            <p className="text-[#D4AF37] font-semibold">★ {pedido.puntos_generados}</p>
          </div>
        </div>

        {/* Datos de pago */}
        {(pedido.banco_destino || pedido.voucher_numero) && (
          <div className="px-6 py-4 border-b border-[#C8D8CB]">
            <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Receipt size={12} /> Datos del pago
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pedido.banco_destino && (
                <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-[#1A4E26] rounded-lg flex items-center justify-center shrink-0">
                    <Landmark size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Banco destino</p>
                    <p className="text-[#111111] font-semibold text-sm truncate">{pedido.banco_destino}</p>
                  </div>
                </div>
              )}
              {pedido.voucher_numero && (
                <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-[#D4AF37] rounded-lg flex items-center justify-center shrink-0">
                    <Receipt size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">N° comprobante</p>
                    <p className="text-[#111111] font-semibold font-mono text-sm truncate">{pedido.voucher_numero}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voucher */}
        <div className="px-6 py-4 border-b border-[#C8D8CB]">
          <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ImageIcon size={12} /> Comprobante de pago
          </p>
          {pedido.voucher_url ? (
            voucherUrl ? (
              <a href={voucherUrl} target="_blank" rel="noopener noreferrer" className="block group">
                <div className="relative bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl overflow-hidden">
                  <img src={voucherUrl} alt="Voucher" loading="lazy" decoding="async" className="w-full max-h-72 object-contain" />
                  <div className="absolute bottom-2 right-2 bg-white/95 border border-[#C8D8CB] rounded-lg px-2.5 py-1 text-[10px] font-semibold text-[#1A4E26] flex items-center gap-1">
                    <ExternalLink size={11} /> Abrir
                  </div>
                </div>
              </a>
            ) : (
              <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-6 text-center text-[#9CA3AF] text-xs">
                Cargando comprobante...
              </div>
            )
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-700 text-xs">
              <AlertCircle size={14} />
              Este pedido no tiene voucher adjunto (puede ser un pedido inicial o anterior a la actualización).
            </div>
          )}
        </div>

        {/* Notas */}
        {pedido.notas && (
          <div className="px-6 py-4 border-b border-[#C8D8CB]">
            <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">Notas del distribuidor</p>
            <p className="text-[#111111] text-sm leading-relaxed bg-[#F4F7F5] rounded-xl p-3">{pedido.notas}</p>
          </div>
        )}

        {/* Items */}
        <div className="px-6 py-4">
          <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3">Productos</p>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-4">Sin ítems</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-[#F4F7F5] last:border-0">
                  <div>
                    <p className="text-[#111111] text-sm font-medium">{item.producto_nombre}</p>
                    <p className="text-[#9CA3AF] text-xs">#{item.producto_codigo} · {item.cantidad} × ${Number(item.precio_unitario).toFixed(2)}</p>
                  </div>
                  <p className="text-[#111111] font-semibold text-sm">${Number(item.subtotal).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#F4F7F5] border-t border-[#C8D8CB] rounded-b-2xl">
          <span className="font-heading font-bold text-[#111111]">Total</span>
          <span className="font-heading font-bold text-xl text-[#1A4E26]">${Number(pedido.total).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

interface PedidoRowExt extends PedidoRow {
  distribuidor_codigo?: string;
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<PedidoRowExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<PedidoRow | null>(null);

  // UX-001: confirmación final antes de cancelar un pedido (irreversible
  // por sus efectos colaterales: revierte puntos y cancela comisiones).
  const [pendingCancel, setPendingCancel] = useState<{
    pedido: PedidoRowExt;
    fromEstado: EstadoPedido;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const toast = useToast();

  // Filtros
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('fecha-desc');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('todos');
  const [minTotal, setMinTotal] = useState<string>('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabaseAdmin
        .from('pedidos')
        .select('*, distribuidor:profiles!distribuidor_id(nombre_completo, codigo_distribuidor)')
        .order('created_at', { ascending: false });

      const rows: PedidoRowExt[] = (data ?? []).map((r: Record<string, unknown>) => {
        const dist = r.distribuidor as { nombre_completo?: string; codigo_distribuidor?: string } | null;
        return {
          ...(r as unknown as Pedido),
          distribuidor_nombre: dist?.nombre_completo ?? '—',
          distribuidor_codigo: dist?.codigo_distribuidor ?? '',
        };
      });
      setPedidos(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Filtros aplicados ──
  const filtered = useMemo(() => {
    let list = pedidos;
    if (tab !== 'todos') list = list.filter((p) => p.estado === tab);
    if (paymentFilter === 'con-voucher') list = list.filter((p) => !!p.voucher_url);
    if (paymentFilter === 'sin-voucher') list = list.filter((p) => !p.voucher_url);
    if (minTotal && !isNaN(Number(minTotal))) {
      list = list.filter((p) => Number(p.total) >= Number(minTotal));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        (p.distribuidor_nombre ?? '').toLowerCase().includes(q) ||
        (p.distribuidor_codigo ?? '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.notas ?? '').toLowerCase().includes(q) ||
        (p.voucher_numero ?? '').toLowerCase().includes(q) ||
        (p.banco_destino ?? '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    switch (sortBy) {
      case 'fecha-asc': sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'monto-desc': sorted.sort((a, b) => Number(b.total) - Number(a.total)); break;
      case 'monto-asc': sorted.sort((a, b) => Number(a.total) - Number(b.total)); break;
      default: sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [pedidos, tab, paymentFilter, minTotal, search, sortBy]);

  // ── Resumen por estado ──
  const resumen = useMemo(() => {
    const byEstado = (estado: EstadoPedido) => {
      const list = pedidos.filter((p) => p.estado === estado);
      return {
        total: list.reduce((s, p) => s + Number(p.total), 0),
        count: list.length,
        puntos: list.reduce((s, p) => s + (p.puntos_generados ?? 0), 0),
      };
    };
    return {
      procesando: byEstado('procesando'),
      enviado: byEstado('enviado'),
      entregado: byEstado('entregado'),
      cancelado: byEstado('cancelado'),
      pendiente: byEstado('pendiente'),
      todos: {
        total: pedidos.filter((p) => p.estado !== 'cancelado').reduce((s, p) => s + Number(p.total), 0),
        count: pedidos.length,
      },
    };
  }, [pedidos]);

  // Conteos por tab según los filtros laterales
  const tabCounts = useMemo(() => {
    const apply = (list: PedidoRowExt[]) => {
      let l = list;
      if (paymentFilter === 'con-voucher') l = l.filter((p) => !!p.voucher_url);
      if (paymentFilter === 'sin-voucher') l = l.filter((p) => !p.voucher_url);
      if (minTotal && !isNaN(Number(minTotal))) l = l.filter((p) => Number(p.total) >= Number(minTotal));
      return l.length;
    };
    return {
      todos: apply(pedidos),
      procesando: apply(pedidos.filter((p) => p.estado === 'procesando')),
      enviado: apply(pedidos.filter((p) => p.estado === 'enviado')),
      entregado: apply(pedidos.filter((p) => p.estado === 'entregado')),
      pendiente: apply(pedidos.filter((p) => p.estado === 'pendiente')),
      cancelado: apply(pedidos.filter((p) => p.estado === 'cancelado')),
    };
  }, [pedidos, paymentFilter, minTotal]);

  const totalFiltrado = filtered.filter((p) => p.estado !== 'cancelado').reduce((s, p) => s + Number(p.total), 0);

  function resetFilters() {
    setTab('todos');
    setSearch('');
    setPaymentFilter('todos');
    setMinTotal('');
    setSortBy('fecha-desc');
  }

  // UX-001: si el admin cambia el estado a "cancelado" abrimos confirmación;
  // cualquier otro cambio se aplica directo.
  function handleEstadoChange(pedido: PedidoRowExt, newEstado: EstadoPedido) {
    if (newEstado === pedido.estado) return;
    if (newEstado === 'cancelado') {
      setPendingCancel({ pedido, fromEstado: pedido.estado });
      setCancelReason('');
      return;
    }
    void updateEstado(pedido.id, newEstado, pedido.estado);
  }

  async function updateEstado(pedidoId: string, newEstado: EstadoPedido, currentEstado: EstadoPedido, motivo?: string) {
    if (newEstado === currentEstado) return;
    setUpdatingId(pedidoId);

    try {
      const pedido = pedidos.find((p) => p.id === pedidoId);

      // Tanda 6 (BIZ-002 + ARQ-001): para cancelar usamos la RPC atómica
      // public.cancel_pedido. Hace en una transacción: revertir puntos,
      // cancelar comisiones por pedido_id, registrar motivo en notas y
      // cambiar estado. Idempotente (si ya estaba cancelado, no falla).
      if (newEstado === 'cancelado') {
        const { error: rpcErr } = await supabase.rpc('cancel_pedido', {
          p_pedido_id: pedidoId,
          p_motivo: motivo ?? null,
        });
        if (rpcErr) throw rpcErr;

        // Actualizamos el estado local con los efectos que aplicó la RPC.
        setPedidos((prev) => prev.map((p) =>
          p.id === pedidoId
            ? {
                ...p,
                estado: 'cancelado' as EstadoPedido,
                notas: motivo
                  ? ((p.notas ? p.notas + ' | ' : '') + 'Cancelado: ' + motivo)
                  : p.notas,
              }
            : p
        ));
        toast.success(
          ['procesando', 'enviado', 'entregado'].includes(currentEstado)
            ? 'Pedido cancelado. Puntos y comisiones revertidos.'
            : 'Pedido marcado como cancelado.'
        );
      } else {
        // Cambios de estado NO cancelados: simple update con RLS.
        // La migración 007 habilita admin/operaciones a updatear pedidos.
        const updates: { estado: EstadoPedido } = { estado: newEstado };
        const { error: updErr } = await supabaseAdmin.from('pedidos').update(updates).eq('id', pedidoId);
        if (updErr) throw updErr;
        setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, estado: newEstado } : p));
        toast.success('Estado del pedido actualizado.');
      }
      // 'pedido' es referencia para log; suprimimos warning de variable usada solo aquí.
      void pedido;
    } catch (err) {
      logger.error('updateEstado error', err);
      toast.error('No pudimos actualizar el pedido. Intenta de nuevo.');
    } finally {
      setUpdatingId(null);
      setPendingCancel(null);
      setCancelReason('');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Pedidos</h1>
        <p className="text-[#6B7280] text-sm mt-1">
          Gestión de pedidos de distribuidores · {pedidos.length} pedidos registrados
        </p>
      </div>

      {/* ── Stat cards por estado ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {STAT_CARDS.map((card) => {
          const data = resumen[card.key];
          const isActive = tab === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setTab(isActive ? 'todos' : card.key)}
              className={`text-left bg-white border-2 rounded-2xl p-4 transition-all ${
                isActive
                  ? `${card.activeBorder} ${card.activeShadow}`
                  : `border-[#C8D8CB] ${card.border}`
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${card.iconColor} ${card.iconBg} px-2 py-0.5 rounded`}>
                  {data.count}
                </span>
              </div>
              <p className="text-[#6B7280] text-xs mb-1">{card.label}</p>
              <p className="font-heading font-bold text-xl text-[#111111]">${data.total.toFixed(2)}</p>
              {data.puntos > 0 && (
                <p className="text-[10px] text-[#D4AF37] font-bold mt-1 flex items-center gap-0.5">
                  <Star size={9} fill="currentColor" /> {data.puntos.toLocaleString('es-EC')} pts
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Resumen del filtro actual ─────────────────── */}
      <div className="bg-gradient-to-r from-[#0F2E18] to-[#1A4E26] text-white rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center shrink-0">
          <DollarSign size={24} className="text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[#D4AF37] text-[10px] uppercase tracking-widest font-bold">Total facturado en la vista actual</p>
          <p className="font-heading font-bold text-2xl text-white">${totalFiltrado.toFixed(2)}</p>
          <p className="text-white/65 text-[10px] mt-0.5">
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} · excluye cancelados
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#D4AF37] text-[10px] uppercase tracking-widest font-bold">Cancelados</p>
          <p className="font-heading font-bold text-lg text-red-300">
            -${resumen.cancelado.total.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ── Filtros laterales ─────────────────── */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {/* Pago/voucher filter */}
          <div className="flex items-center gap-1.5 bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl p-1">
            <Filter size={12} className="text-[#6B7280] ml-2" />
            <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold mr-1">Pago:</span>
            {[
              { key: 'todos' as const, label: 'Todos' },
              { key: 'con-voucher' as const, label: 'Con voucher' },
              { key: 'sin-voucher' as const, label: 'Sin voucher' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPaymentFilter(opt.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  paymentFilter === opt.key
                    ? 'bg-[#1A4E26] text-white'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Min total */}
          <div className="flex items-center gap-2 bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Min $:</span>
            <input
              type="number"
              value={minTotal}
              onChange={(e) => setMinTotal(e.target.value)}
              placeholder="0"
              className="w-16 bg-transparent text-xs font-mono text-[#111111] focus:outline-none"
            />
          </div>
        </div>

        {/* Search + sort */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#C8D8CB]/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por distribuidor, código, ID, banco o N° voucher..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl text-xs text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          {(tab !== 'todos' || search || paymentFilter !== 'todos' || minTotal) && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#6B7280] hover:text-[#111111] underline flex items-center gap-1"
            >
              <X size={11} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs por estado ─────────────────── */}
      <div className="flex gap-1 bg-white border border-[#C8D8CB] rounded-xl p-1 mb-4 flex-wrap overflow-x-auto">
        {ESTADO_TABS.map((t) => {
          const count = tabCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap inline-flex items-center gap-1.5 ${
                tab === t.key
                  ? 'bg-[#1A4E26] text-white shadow-[0_0_8px_rgba(26,78,38,0.2)]'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-[#1A4E26]/10 text-[#1A4E26]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tabla ─────────────────── */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <ShoppingBag size={40} className="mx-auto mb-3 text-[#9CA3AF] opacity-30" />
            <p className="text-lg font-bold mb-1 text-[#111111]">Sin pedidos</p>
            <p className="text-sm mb-5">No hay pedidos con los filtros actuales.</p>
            <button
              onClick={resetFilters}
              className="px-5 py-2 rounded-full bg-[#1A4E26] text-white text-xs font-semibold hover:bg-[#163F1E] transition-all"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Distribuidor', 'Total', 'Puntos', 'Voucher', 'Estado', 'Fecha y hora', 'Detalle', 'Actualizar'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] transition-colors cursor-pointer"
                    onClick={() => setSelectedPedido(p)}
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-[#111111] text-xs font-bold">{p.distribuidor_nombre}</p>
                      <p className="text-[#1A4E26] text-[10px] font-mono">{p.distribuidor_codigo || ''}</p>
                    </td>
                    <td className="px-5 py-3 text-[#111111] font-bold whitespace-nowrap">
                      ${Number(p.total).toFixed(2)}
                      {Number(p.total) >= 100 && p.estado !== 'cancelado' && (
                        <p className="text-[9px] text-[#D4AF37] font-bold flex items-center gap-0.5 mt-0.5">
                          <TrendingUp size={9} /> Activador
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#D4AF37] font-bold whitespace-nowrap text-xs">
                      {p.puntos_generados > 0 ? `★ ${p.puntos_generados}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {p.voucher_url ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF4ED] text-[#1A4E26]">
                          <ImageIcon size={10} /> Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoBadge(p.estado)}`}>
                        {ESTADO_LABELS[p.estado]}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-[#111111] text-xs font-medium flex items-center gap-1">
                        <Calendar size={10} className="text-[#9CA3AF]" />
                        {new Date(p.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[#9CA3AF] text-[10px] ml-3.5">
                        <Clock size={9} className="inline mr-0.5" />
                        {new Date(p.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPedido(p)}
                        className="inline-flex items-center gap-1.5 text-[#1A4E26] text-[11px] font-bold hover:underline"
                      >
                        <Eye size={12} /> Detalle
                      </button>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={p.estado}
                        onChange={(e) => handleEstadoChange(p, e.target.value as EstadoPedido)}
                        disabled={updatingId === p.id}
                        aria-label={`Cambiar estado del pedido de ${p.distribuidor_nombre ?? ''}`}
                        className="bg-white border border-[#C8D8CB] rounded-lg px-2.5 py-1 text-[#111111] text-[11px] focus:outline-none focus:border-[#1A4E26] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer con conteo */}
      {!loading && filtered.length > 0 && (
        <div className="mt-3 text-center text-[10px] text-[#9CA3AF]">
          Mostrando <strong>{filtered.length}</strong> de {pedidos.length} pedidos totales
        </div>
      )}

      {selectedPedido && (
        <DetalleModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
        />
      )}

      {/* UX-001: confirmación final al cancelar — acción irreversible. */}
      <Modal
        open={!!pendingCancel}
        onClose={() => { if (updatingId === null) { setPendingCancel(null); setCancelReason(''); } }}
        title="Confirmar cancelación"
        subtitle="Esta acción revierte puntos y cancela comisiones del pedido."
        size="md"
        labelledById="cancel-pedido-title"
      >
        {pendingCancel && (
          <div className="px-6 py-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3 text-sm">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-amber-700">
                Vas a cancelar el pedido de{' '}
                <strong>{pendingCancel.pedido.distribuidor_nombre}</strong>{' '}
                por <strong>${Number(pendingCancel.pedido.total).toFixed(2)}</strong>.
                Esto restará <strong>{pendingCancel.pedido.puntos_generados} puntos</strong>{' '}
                al distribuidor y cancelará sus comisiones por nivel asociadas.
                <span className="block mt-1 text-xs">Esta operación no se puede deshacer desde la interfaz.</span>
              </div>
            </div>

            <label htmlFor="cancel-reason" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
              Motivo de la cancelación <span className="text-[#9CA3AF] font-normal">(opcional, queda registrado en notas)</span>
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: pago no acreditado, voucher inválido, solicitud del cliente…"
              className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors resize-none"
            />

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => { setPendingCancel(null); setCancelReason(''); }}
                disabled={updatingId !== null}
                className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
              >
                No, mantener
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pendingCancel) return;
                  void updateEstado(
                    pendingCancel.pedido.id,
                    'cancelado',
                    pendingCancel.fromEstado,
                    cancelReason.trim() || undefined,
                  );
                }}
                disabled={updatingId !== null}
                className="flex-[1.5] py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {updatingId === pendingCancel.pedido.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelando…
                  </>
                ) : (
                  <>Sí, cancelar pedido</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
