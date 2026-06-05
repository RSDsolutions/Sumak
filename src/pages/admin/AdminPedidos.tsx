import { useEffect, useState } from 'react';
import { X, Eye } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import { levelCommissions } from '../../data';
import type { Pedido, PedidoItem, EstadoPedido } from '../../lib/types';

type FilterTab = 'todos' | EstadoPedido;

const ESTADOS: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'entregado', label: 'Entregados' },
  { key: 'cancelado', label: 'Cancelados' },
  { key: 'pendiente', label: 'Pendientes' },
];

interface PedidoRow extends Pedido {
  distribuidor_nombre?: string;
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600',
    procesando: 'bg-blue-50 text-blue-600',
    enviado: 'bg-purple-50 text-purple-600',
    entregado: 'bg-[#EBF4ED] text-[#1A4E26]',
    cancelado: 'bg-red-50 text-red-600',
  };
  return map[estado] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white border border-[#C8D8CB] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8D8CB]">
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
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(pedido.estado)}`}>
              {pedido.estado}
            </span>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-0.5">Puntos</p>
            <p className="text-[#D4AF37] font-semibold">★ {pedido.puntos_generados}</p>
          </div>
        </div>

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

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<PedidoRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      let query = supabaseAdmin
        .from('pedidos')
        .select('*, distribuidor:profiles!distribuidor_id(nombre_completo)')
        .order('created_at', { ascending: false });
      if (tab !== 'todos') query = query.eq('estado', tab);
      const { data } = await query;

      const rows: PedidoRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as unknown as Pedido),
        distribuidor_nombre: (r.distribuidor as { nombre_completo?: string } | null)?.nombre_completo ?? '—',
      }));
      setPedidos(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function updateEstado(pedidoId: string, newEstado: EstadoPedido, currentEstado: EstadoPedido) {
    if (newEstado === currentEstado) return;
    setUpdatingId(pedidoId);

    try {
      const pedido = pedidos.find((p) => p.id === pedidoId);

      // Aprobación manual de un pedido no procesado aún (caso excepcional)
      if (newEstado === 'entregado' && currentEstado !== 'entregado' && pedido) {
        const puntos = pedido.puntos_generados;
        const distribId = pedido.distribuidor_id;

        if (puntos > 0) {
          // Sumar puntos al comprador
          const { data: dp } = await supabaseAdmin.from('profiles').select('puntos').eq('id', distribId).single();
          if (dp) await supabaseAdmin.from('profiles').update({ puntos: Number(dp.puntos) + puntos }).eq('id', distribId);

          // Comisiones por nivel con verificación de elegibilidad
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const { data: allProfiles } = await supabaseAdmin.from('profiles').select('id, patrocinador_id');
          const profMap = new Map<string, string | null>();
          for (const p of allProfiles ?? []) profMap.set(p.id, p.patrocinador_id);

          const uplineChain: Array<{ id: string; nivel: number; porcentaje: number }> = [];
          let upId: string | null = distribId;
          for (const lc of levelCommissions) {
            const sponsorId = profMap.get(upId!) ?? null;
            if (!sponsorId) break;
            upId = sponsorId;
            uplineChain.push({ id: upId, nivel: lc.nivel, porcentaje: lc.porcentaje });
          }

          if (uplineChain.length > 0) {
            const uplineIds = uplineChain.map((u) => u.id);
            const { data: eligibleOrders } = await supabaseAdmin
              .from('pedidos').select('distribuidor_id')
              .in('distribuidor_id', uplineIds).eq('estado', 'entregado').gte('total', 100).gte('created_at', startOfMonth);
            const eligibleSet = new Set((eligibleOrders ?? []).map((o: { distribuidor_id: string }) => o.distribuidor_id));

            const inserts: object[] = [];
            for (const entry of uplineChain) {
              if (eligibleSet.has(entry.id)) {
                const monto = parseFloat((puntos * entry.porcentaje / 100).toFixed(2));
                if (monto > 0) inserts.push({ beneficiario_id: entry.id, origen_id: distribId, tipo: 'nivel', nivel_red: entry.nivel, monto, estado: 'pendiente', descripcion: `Comisión nivel ${entry.nivel}` });
              }
            }
            if (inserts.length > 0) await supabaseAdmin.from('comisiones').insert(inserts);
          }
        }
      }

      // Cancelación: revertir puntos y marcar comisiones relacionadas
      if (newEstado === 'cancelado' && currentEstado === 'entregado' && pedido) {
        const puntos = pedido.puntos_generados;
        const distribId = pedido.distribuidor_id;

        if (puntos > 0) {
          const { data: dp } = await supabaseAdmin.from('profiles').select('puntos').eq('id', distribId).single();
          if (dp) {
            await supabaseAdmin
              .from('profiles')
              .update({ puntos: Math.max(0, Number(dp.puntos) - puntos) })
              .eq('id', distribId);
          }
        }

        // Cancelar comisiones generadas por este pedido (mismo origen, misma fecha aproximada)
        const margen = new Date(new Date(pedido.created_at).getTime() + 5 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from('comisiones')
          .update({ estado: 'cancelado' })
          .eq('origen_id', pedido.distribuidor_id)
          .eq('tipo', 'nivel')
          .gte('created_at', pedido.created_at)
          .lte('created_at', margen);
      }

      await supabaseAdmin.from('pedidos').update({ estado: newEstado }).eq('id', pedidoId);
      setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, estado: newEstado } : p));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Pedidos</h1>
        <p className="text-[#6B7280] text-sm mt-1">Gestión de pedidos de distribuidores</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#C8D8CB] rounded-xl p-1 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.key ? 'bg-[#1A4E26] text-white shadow-[0_0_8px_rgba(26,78,38,0.2)]' : 'text-[#6B7280] hover:text-[#111111]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : pedidos.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <p className="text-lg font-medium mb-2">Sin pedidos</p>
            <p className="text-sm">No hay pedidos con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['ID', 'Distribuidor', 'Total', 'Puntos', 'Estado', 'Fecha', 'Detalle', 'Actualizar Estado'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] transition-colors">
                    <td className="px-6 py-4 text-[#9CA3AF] font-mono text-xs">
                      {p.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-[#111111] font-medium whitespace-nowrap">
                      {p.distribuidor_nombre}
                    </td>
                    <td className="px-6 py-4 text-[#111111] font-semibold whitespace-nowrap">
                      ${Number(p.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-[#D4AF37] font-semibold whitespace-nowrap">
                      {p.puntos_generados > 0 ? `★ ${p.puntos_generados}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(p.estado)}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedPedido(p)}
                        className="flex items-center gap-1.5 text-[#1A4E26] text-xs font-medium hover:underline"
                      >
                        <Eye size={14} />
                        Ver
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={p.estado}
                        onChange={(e) => updateEstado(p.id, e.target.value as EstadoPedido, p.estado)}
                        disabled={updatingId === p.id}
                        className="bg-white border border-[#C8D8CB] rounded-lg px-3 py-1.5 text-[#111111] text-xs focus:outline-none focus:border-[#1A4E26] transition-colors disabled:opacity-50"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e} className="capitalize">{e}</option>
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

      {selectedPedido && (
        <DetalleModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
        />
      )}
    </div>
  );
}
