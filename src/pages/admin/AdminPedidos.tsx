import { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabase';
import type { Pedido, EstadoPedido } from '../../lib/types';

type FilterTab = 'todos' | EstadoPedido;

const ESTADOS: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'procesando', label: 'Procesando' },
  { key: 'enviado', label: 'Enviados' },
  { key: 'entregado', label: 'Entregados' },
];

interface PedidoRow extends Pedido {
  distribuidor_nombre?: string;
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-500/10 text-amber-400',
    procesando: 'bg-blue-500/10 text-blue-400',
    enviado: 'bg-purple-500/10 text-purple-400',
    entregado: 'bg-[#00A86B]/10 text-[#00A86B]',
    cancelado: 'bg-red-500/10 text-red-400',
  };
  return map[estado] ?? 'bg-[#222222] text-[#888888]';
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    setUpdatingId(pedidoId);

    // Credit points to the distributor when delivering an order
    if (newEstado === 'entregado' && currentEstado !== 'entregado') {
      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (pedido && pedido.puntos_generados > 0) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('puntos')
          .eq('id', pedido.distribuidor_id)
          .single();
        if (prof) {
          await supabaseAdmin
            .from('profiles')
            .update({ puntos: Number(prof.puntos) + pedido.puntos_generados })
            .eq('id', pedido.distribuidor_id);
        }
      }
    }

    await supabaseAdmin.from('pedidos').update({ estado: newEstado }).eq('id', pedidoId);
    setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, estado: newEstado } : p));
    setUpdatingId(null);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Pedidos</h1>
        <p className="text-[#888888] text-sm mt-1">Gestión de pedidos de distribuidores</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-1 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.key ? 'bg-[#00A86B] text-white' : 'text-[#888888] hover:text-[#F0F0F0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : pedidos.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#888888]">
            <p className="text-lg font-medium mb-2">Sin pedidos</p>
            <p className="text-sm">No hay pedidos con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2E2E2E]">
                  {['ID', 'Distribuidor', 'Total', 'Puntos', 'Estado', 'Fecha', 'Actualizar Estado'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[#888888] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-b border-[#2E2E2E] hover:bg-[#222222] transition-colors">
                    <td className="px-6 py-4 text-[#888888] font-mono text-xs">
                      {p.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-[#F0F0F0] font-medium whitespace-nowrap">
                      {p.distribuidor_nombre}
                    </td>
                    <td className="px-6 py-4 text-[#F0F0F0] font-semibold whitespace-nowrap">
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
                    <td className="px-6 py-4 text-[#888888] whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={p.estado}
                        onChange={(e) => updateEstado(p.id, e.target.value as EstadoPedido, p.estado)}
                        disabled={updatingId === p.id}
                        className="bg-[#222222] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-[#F0F0F0] text-xs focus:outline-none focus:border-[#00A86B] transition-colors disabled:opacity-50"
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
    </div>
  );
}
