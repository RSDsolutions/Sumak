import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShoppingCart, Plus, X, Search, Calendar, ChevronRight,
  Package, TrendingUp, CheckCircle2, Clock, AlertCircle, Leaf, FileText,
  Truck, ExternalLink, ThumbsUp, MessageSquareWarning,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { logger } from '../../lib/logger';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';
import type { Pedido, PedidoItem, EstadoPedido } from '../../lib/types';
import { pedidoBadgeClass } from '../../lib/badges';
import NotaVenta, { type NotaVentaData } from '../../components/NotaVenta';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// COD-001: badge centralizado; labels propios porque MisPedidos
// usa "Completado" en vez de "Entregado" para el distribuidor.
const estadoBadge = pedidoBadgeClass;

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesado',
  enviado: 'Enviado',
  entregado: 'Completado',
  cancelado: 'Cancelado',
};

type FilterTab = 'todos' | EstadoPedido;
const TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'entregado', label: 'Completados' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'cancelado', label: 'Cancelados' },
];

/**
 * Sección de envío que el distribuidor ve cuando el admin/operaciones
 * marcó el pedido como enviado y subió guía + N° tracking. Carga la
 * imagen del bucket pedidos-envios con signed URL (RLS le permite ver
 * solo los suyos).
 */
function EnvioSection({ pedido }: { pedido: Pedido }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (pedido.envio_voucher_url) {
      supabase.storage
        .from('pedidos-envios')
        .createSignedUrl(pedido.envio_voucher_url, 3600)
        .then(({ data }) => {
          if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
        });
    }
    return () => { cancelled = true; };
  }, [pedido.envio_voucher_url]);

  return (
    <div className="px-6 py-5 border-b border-[#C8D8CB] bg-purple-50/40">
      <p className="text-[10px] uppercase tracking-widest text-purple-700 font-bold mb-3 flex items-center gap-1.5">
        <Truck size={12} aria-hidden="true" /> Información de envío
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {pedido.envio_numero && (
          <div className="bg-white rounded-xl border border-purple-200 px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-purple-700 font-bold">N° de guía / tracking</p>
            <p className="text-[#111111] font-mono font-semibold mt-0.5">{pedido.envio_numero}</p>
          </div>
        )}
        {signedUrl ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl border border-purple-200 px-3 py-2 hover:border-purple-400 transition-colors flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-purple-700 font-bold">Comprobante de envío</p>
              <p className="text-[#111111] font-semibold mt-0.5">Ver guía</p>
            </div>
            <ExternalLink size={13} className="text-purple-600 shrink-0" aria-hidden="true" />
          </a>
        ) : pedido.envio_voucher_url ? (
          <div className="bg-white rounded-xl border border-purple-200 px-3 py-2 text-[#9CA3AF]">Cargando comprobante…</div>
        ) : null}
      </div>
    </div>
  );
}

interface DetalleModalProps {
  pedido: Pedido;
  clienteNombre: string;
  clienteCodigo?: string;
  onClose: () => void;
  onConfirmReception: () => void;
  onReportIssue: () => void;
  busy: boolean;
}

function DetalleModal({ pedido, clienteNombre, clienteCodigo, onClose, onConfirmReception, onReportIssue, busy }: DetalleModalProps) {
  const items: PedidoItem[] = pedido.items ?? [];
  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);
  const [showNota, setShowNota] = useState(false);
  // La nota de venta solo se muestra cuando el admin marca el pedido
  // como "enviado" o ya esta "entregado". Antes de eso es solo un
  // comprobante interno de checkout.
  const notaDisponible = ['enviado', 'entregado'].includes(pedido.estado);
  const notaNumero = pedido.numero_pedido
    ? `NV-${String(pedido.numero_pedido).padStart(6, '0')}`
    : `NV-${pedido.id.slice(0, 8).toUpperCase()}`;

  const notaData: NotaVentaData = {
    numero: notaNumero,
    fecha: pedido.created_at,
    estado: pedido.estado,
    cliente: {
      nombre: clienteNombre,
      codigo: clienteCodigo,
    },
    items: items.map((i) => ({
      producto_codigo: i.producto_codigo,
      producto_nombre: i.producto_nombre,
      cantidad: i.cantidad,
      precio_unitario: Number(i.precio_unitario),
      subtotal: Number(i.subtotal),
    })),
    subtotal: Number(pedido.total),
    total: Number(pedido.total),
    puntos: pedido.puntos_generados ?? 0,
    banco_destino: (pedido as Pedido & { banco_destino?: string | null }).banco_destino ?? null,
    voucher_numero: (pedido as Pedido & { voucher_numero?: string | null }).voucher_numero ?? null,
    notas: pedido.notas,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#C8D8CB] rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#C8D8CB] sticky top-0 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-1 flex items-center gap-1.5">
                <Package size={11} /> Pedido
              </p>
              <h3 className="font-heading font-bold text-xl text-[#111111]">
                {totalItems} producto{totalItems !== 1 ? 's' : ''}
              </h3>
              <p className="text-[#9CA3AF] text-xs mt-0.5 flex items-center gap-1">
                <Calendar size={11} /> {new Date(pedido.created_at).toLocaleString('es-EC')}
              </p>
            </div>
            <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111111] transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status row */}
        <div className="px-6 py-4 bg-[#F4F7F5] border-b border-[#C8D8CB] flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${estadoBadge(pedido.estado)}`}>
            {['procesando', 'enviado', 'entregado'].includes(pedido.estado) && <CheckCircle2 size={12} className="mr-1.5" />}
            {pedido.estado === 'pendiente' && <Clock size={12} className="mr-1.5" />}
            {ESTADO_LABELS[pedido.estado] ?? pedido.estado}
          </span>
          {pedido.puntos_generados > 0 && (
            <span className={`text-sm font-bold ${pedido.estado === 'cancelado' || pedido.estado === 'pendiente' ? 'text-[#9CA3AF]' : 'text-[#D4AF37]'}`}>
              ★ {pedido.puntos_generados} puntos {pedido.estado === 'cancelado' ? 'anulados' : pedido.estado === 'pendiente' ? 'al confirmar' : 'ganados'}
            </span>
          )}
        </div>

        {/* Información de envío (si el admin lo marcó como enviado) */}
        {(pedido.envio_numero || pedido.envio_voucher_url) && (
          <EnvioSection pedido={pedido} />
        )}

        {/* Incidencia abierta (si el distribuidor ya reportó) */}
        {pedido.incidencia && (
          <div className="px-6 py-4 border-b border-[#C8D8CB] bg-amber-50/60">
            <p className="text-amber-700 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <MessageSquareWarning size={11} aria-hidden="true" /> Problema reportado
              {pedido.incidencia_at && (
                <span className="text-amber-600/80 normal-case tracking-normal font-normal text-[10px]">
                  · {new Date(pedido.incidencia_at).toLocaleString('es-EC')}
                </span>
              )}
            </p>
            <p className="text-amber-900 text-sm leading-relaxed bg-white/60 rounded-xl p-3 border border-amber-200">
              {pedido.incidencia}
            </p>
            <p className="text-amber-700 text-[11px] mt-2">
              Operaciones ya recibió tu reporte. Se contactarán contigo apenas tengan novedades.
            </p>
          </div>
        )}

        {/* Acciones de recepción (solo cuando pedido.estado === 'enviado') */}
        {pedido.estado === 'enviado' && (
          <div className="px-6 py-4 border-b border-[#C8D8CB] bg-[#FAFBFA]">
            <p className="text-[#1A4E26] text-[10px] font-bold uppercase tracking-widest mb-3">
              ¿Cómo está tu pedido?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onConfirmReception}
                disabled={busy}
                className="flex-[1.4] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] disabled:opacity-60 transition-all shadow-[0_4px_16px_rgba(26,78,38,0.2)]"
              >
                <ThumbsUp size={15} aria-hidden="true" />
                Sí, recibí mi pedido
              </button>
              <button
                onClick={onReportIssue}
                disabled={busy || !!pedido.incidencia}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-amber-300 text-amber-700 text-sm font-bold hover:bg-amber-50 disabled:opacity-60 transition-all"
              >
                <MessageSquareWarning size={15} aria-hidden="true" />
                {pedido.incidencia ? 'Reporte enviado' : 'Tuve un problema'}
              </button>
            </div>
            <p className="text-[#9CA3AF] text-[11px] mt-2 leading-relaxed">
              Al confirmar la recepción el pedido se cierra como <strong>Entregado</strong> y queda inmutable.
            </p>
          </div>
        )}

        {/* Items */}
        <div className="px-6 py-5">
          <p className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-3">Productos del pedido</p>
          {items.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-6">Sin ítems</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-[#FAFBFA] rounded-xl border border-[#C8D8CB]">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 mr-3" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                    <Leaf size={18} className="text-[#1A4E26] opacity-40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111111] text-sm font-bold leading-tight">{item.producto_nombre}</p>
                    <p className="text-[#9CA3AF] text-[11px] mt-0.5">
                      #{item.producto_codigo} · {item.cantidad} × ${Number(item.precio_unitario).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-[#111111] font-bold text-sm whitespace-nowrap">${Number(item.subtotal).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {pedido.notas && (
            <div className="mt-4 pt-4 border-t border-[#C8D8CB]">
              <p className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">Notas</p>
              <p className="text-[#6B7280] text-sm">{pedido.notas}</p>
            </div>
          )}
        </div>

        {/* Boton nota de venta cuando esta enviado/entregado */}
        {notaDisponible && (
          <div className="px-6 py-3 bg-[#FFFDF0] border-t border-[#D4AF37]/30">
            <button
              onClick={() => setShowNota(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-[#0B2913] text-sm font-bold hover:from-[#E8C94A] hover:to-[#D4AF37] transition-all shadow-[0_4px_16px_rgba(212,175,55,0.35)]"
            >
              <FileText size={15} /> Ver Nota de Venta {notaNumero}
            </button>
            <p className="text-[10px] text-[#92680A] text-center mt-1.5">
              Documento oficial de tu compra · Imprimible y descargable como PDF
            </p>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-[#0F2E18] to-[#1A4E26] rounded-b-3xl">
          <span className="font-heading font-bold text-white text-sm">Total del pedido</span>
          <span className="font-heading font-bold text-2xl text-[#D4AF37]">${Number(pedido.total).toFixed(2)}</span>
        </div>
      </motion.div>

      {/* Nota de venta modal */}
      <NotaVenta data={notaData} open={showNota} onClose={() => setShowNota(false)} />
    </div>
  );
}

export default function MisPedidos() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [tab, setTab] = useState<FilterTab>('todos');
  const [search, setSearch] = useState('');

  // Estados para confirmar recepcion / reportar incidencia.
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from('pedidos')
        .select('*, items:pedido_items(*)')
        .eq('distribuidor_id', user!.id)
        .order('created_at', { ascending: false });
      setPedidos((data ?? []) as Pedido[]);
      setLoading(false);
    }
    load();
  }, [user]);

  // Refresca el pedido en el state local con los campos nuevos.
  function patchPedido(id: string, patch: Partial<Pedido>) {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSelectedPedido((curr) => (curr && curr.id === id ? { ...curr, ...patch } : curr));
  }

  async function confirmReception(pedidoId: string) {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('mark_pedido_entregado', { p_pedido_id: pedidoId });
      if (error) throw error;
      patchPedido(pedidoId, {
        estado: 'entregado' as EstadoPedido,
        recibido_at: new Date().toISOString(),
        incidencia: null,
        incidencia_at: null,
      });
      toast.success('¡Recepción confirmada! Tu pedido quedó como entregado.');
      setConfirmingId(null);
    } catch (err) {
      logger.error('confirmReception error', err);
      toast.error('No pudimos registrar la recepción. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function submitIssueReport(pedidoId: string) {
    const motivo = reportText.trim();
    if (motivo.length < 5) {
      setReportError('Describí el problema con al menos 5 caracteres.');
      return;
    }
    setBusy(true);
    setReportError('');
    try {
      const { error } = await supabase.rpc('report_pedido_issue', {
        p_pedido_id: pedidoId,
        p_motivo: motivo,
      });
      if (error) throw error;
      patchPedido(pedidoId, {
        incidencia: motivo,
        incidencia_at: new Date().toISOString(),
      });
      toast.success('Reporte enviado. Operaciones se pondrá en contacto contigo.');
      setReportingId(null);
      setReportText('');
    } catch (err) {
      logger.error('submitIssueReport error', err);
      setReportError(err instanceof Error ? err.message : 'No pudimos enviar el reporte.');
    } finally {
      setBusy(false);
    }
  }

  // ── Stats summary ──
  const stats = useMemo(() => {
    const completados = pedidos.filter((p) => ['procesando', 'enviado', 'entregado'].includes(p.estado));
    const totalGastado = completados.reduce((s, p) => s + Number(p.total), 0);
    const ahorroEstimado = totalGastado;
    return {
      total: pedidos.length,
      completados: completados.length,
      totalGastado,
      ahorro: ahorroEstimado,
      mesActivo: completados.some((p) => {
        const d = new Date(p.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && Number(p.total) >= 100;
      }),
    };
  }, [pedidos]);

  const filtered = useMemo(() => {
    let list = tab === 'todos' ? pedidos : pedidos.filter((p) => p.estado === tab);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        p.items?.some((i) =>
          i.producto_nombre.toLowerCase().includes(q) || i.producto_codigo.includes(q),
        ) || p.id.includes(q)
      );
    }
    return list;
  }, [pedidos, tab, search]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Mis Pedidos</h1>
          <p className="text-[#6B7280] text-sm mt-1">Historial completo de tus compras</p>
        </div>
        <Link
          to="/dashboard/tienda"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 shrink-0 shadow-[0_4px_16px_rgba(26,78,38,0.2)]"
        >
          <Plus size={16} />
          Hacer nuevo pedido
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1 font-semibold">Total pedidos</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1 font-semibold">Completados</p>
          <p className="font-heading font-bold text-2xl text-[#1A4E26]">{stats.completados}</p>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1 font-semibold">Total comprado</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">${stats.totalGastado.toFixed(2)}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${stats.mesActivo ? 'bg-[#EBF4ED] border-[#1A4E26]/30' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-[10px] uppercase tracking-wider mb-1 font-semibold ${stats.mesActivo ? 'text-[#1A4E26]' : 'text-amber-600'}`}>
            Mes actual
          </p>
          <p className={`font-heading font-bold text-base flex items-center gap-1.5 ${stats.mesActivo ? 'text-[#1A4E26]' : 'text-amber-700'}`}>
            {stats.mesActivo ? (
              <><CheckCircle2 size={16} /> Activo</>
            ) : (
              <><AlertCircle size={16} /> Inactivo</>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Tab filters */}
        <div className="flex gap-1 bg-white border border-[#C8D8CB] rounded-xl p-1 overflow-x-auto">
          {TABS.map((t) => {
            const count = t.key === 'todos' ? pedidos.length : pedidos.filter((p) => p.estado === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  tab === t.key
                    ? 'bg-[#1A4E26] text-white'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                {t.label}
                <span className={`text-[10px] font-bold px-1.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-[#1A4E26]/10 text-[#1A4E26]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto o ID..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#C8D8CB] rounded-xl text-xs text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
        </div>
      </div>

      {/* Orders list */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <ShoppingCart size={40} className="mx-auto mb-3 text-[#6B7280] opacity-30" />
            <p className="text-lg font-bold text-[#111111] mb-1">
              {pedidos.length === 0 ? 'Sin pedidos' : 'Sin coincidencias'}
            </p>
            <p className="text-sm mb-6">
              {pedidos.length === 0 ? 'Aún no has realizado ningún pedido.' : 'Cambia los filtros o busca otra cosa.'}
            </p>
            {pedidos.length === 0 && (
              <Link
                to="/dashboard/tienda"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200"
              >
                <Plus size={15} /> Hacer mi primer pedido
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#C8D8CB]">
            {filtered.map((p) => {
              const itemCount = p.items?.reduce((s, i) => s + i.cantidad, 0) ?? 0;
              const productNames = p.items?.slice(0, 2).map((i) => i.producto_nombre).join(', ') ?? '';
              const hasMore = (p.items?.length ?? 0) > 2;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPedido(p)}
                  className="w-full px-5 py-4 hover:bg-[#FAFBFA] transition-colors text-left flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                    <Package size={20} className="text-[#1A4E26]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[#111111] text-sm font-bold">
                        {itemCount} producto{itemCount !== 1 ? 's' : ''}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${estadoBadge(p.estado)}`}>
                        {ESTADO_LABELS[p.estado] ?? p.estado}
                      </span>
                    </div>
                    <p className="text-[#6B7280] text-xs truncate">
                      {productNames}{hasMore && '...'}
                    </p>
                    <p className="text-[#9CA3AF] text-[10px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Calendar size={10} />
                      <span>
                        {new Date(p.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="ml-1 text-[#9CA3AF]">
                          {new Date(p.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                      {p.puntos_generados > 0 && (
                        <>
                          <span className="text-[#9CA3AF]">·</span>
                          <span className={p.estado === 'cancelado' || p.estado === 'pendiente' ? 'text-[#9CA3AF]' : 'text-[#D4AF37] font-semibold'}>
                            ★ {p.puntos_generados} pts
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-heading font-bold text-[#1A4E26] text-lg">${Number(p.total).toFixed(2)}</p>
                    {Number(p.total) >= 100 && (
                      <p className="text-[10px] text-[#D4AF37] font-bold flex items-center gap-0.5 justify-end">
                        <TrendingUp size={9} /> Activador
                      </p>
                    )}
                  </div>

                  <div className="text-[#9CA3AF] group-hover:text-[#1A4E26] transition-colors shrink-0">
                    <ChevronRight size={18} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedPedido && (
        <DetalleModal
          pedido={selectedPedido}
          clienteNombre={profile?.nombre_completo ?? '—'}
          clienteCodigo={profile?.codigo_distribuidor ?? undefined}
          onClose={() => setSelectedPedido(null)}
          onConfirmReception={() => setConfirmingId(selectedPedido.id)}
          onReportIssue={() => {
            setReportingId(selectedPedido.id);
            setReportText('');
            setReportError('');
          }}
          busy={busy}
        />
      )}

      {/* Modal: confirmar recepcion */}
      <Modal
        open={!!confirmingId}
        onClose={() => { if (!busy) setConfirmingId(null); }}
        title="Confirmar recepción"
        subtitle="Una vez confirmada, el pedido queda como entregado y no se puede modificar."
        size="sm"
        labelledById="confirm-reception-title"
      >
        <div className="px-6 py-5">
          <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl p-4 mb-4 flex items-start gap-3">
            <ThumbsUp size={18} className="text-[#1A4E26] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[#1A4E26] text-sm leading-relaxed">
              ¿Confirmás que recibiste tu pedido en buen estado? El pedido se cerrará como{' '}
              <strong>Entregado</strong>. Los puntos y comisiones asociados quedan firmes.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmingId(null)}
              disabled={busy}
              className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => confirmingId && confirmReception(confirmingId)}
              disabled={busy}
              className="flex-[1.5] py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cerrando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Sí, recibí mi pedido
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: reportar problema */}
      <Modal
        open={!!reportingId}
        onClose={() => { if (!busy) { setReportingId(null); setReportText(''); setReportError(''); } }}
        title="Reportar un problema"
        subtitle="Operaciones lo verá apenas se registre."
        size="md"
        labelledById="report-issue-title"
      >
        <div className="px-6 py-5">
          <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
            Contanos qué pasó
          </p>
          <textarea
            rows={5}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Ej: el paquete llegó incompleto, una botella vino dañada, el N° de guía no coincide…"
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-amber-400 transition-colors resize-none"
            disabled={busy}
            maxLength={1000}
          />
          <p className="text-[10px] text-[#9CA3AF] mt-1">
            {reportText.length} / 1000 caracteres · mínimo 5.
          </p>
          {reportError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs flex items-start gap-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
              {reportError}
            </div>
          )}
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={() => { setReportingId(null); setReportText(''); setReportError(''); }}
              disabled={busy}
              className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => reportingId && submitIssueReport(reportingId)}
              disabled={busy || reportText.trim().length < 5}
              className="flex-[1.5] py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <MessageSquareWarning size={14} aria-hidden="true" />
                  Enviar reporte
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
