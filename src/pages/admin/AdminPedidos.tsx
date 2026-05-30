import { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabase';
import { levelCommissions } from '../../data';
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

    if (newEstado === 'entregado' && currentEstado !== 'entregado') {
      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (pedido) {
        const puntos = pedido.puntos_generados;
        const distribId = pedido.distribuidor_id;

        const [{ data: allProfiles }, { data: allNodos }] = await Promise.all([
          supabaseAdmin.from('profiles').select('id, patrocinador_id, puntos'),
          supabaseAdmin.from('red_binaria').select('id, distribuidor_id, padre_id, posicion'),
        ]);

        type ProfileRow = { id: string; patrocinador_id: string | null; puntos: number };
        type NodoRow = { id: string; distribuidor_id: string; padre_id: string | null; posicion: string | null };

        const profileMap = new Map<string, ProfileRow>();
        for (const p of allProfiles ?? []) profileMap.set(p.id, { ...p, puntos: Number(p.puntos) });

        const nodoByDistrib = new Map<string, NodoRow>();
        const nodoById = new Map<string, NodoRow>();
        for (const n of allNodos ?? []) {
          nodoByDistrib.set(n.distribuidor_id, n);
          nodoById.set(n.id, n);
        }

        if (puntos > 0) {
          const dp = profileMap.get(distribId);
          if (dp) {
            await supabaseAdmin.from('profiles').update({ puntos: dp.puntos + puntos }).eq('id', distribId);
          }
        }

        if (puntos > 0) {
          const inserts: object[] = [];
          let upId: string | null = distribId;
          for (const lc of levelCommissions) {
            const prof = profileMap.get(upId!);
            if (!prof?.patrocinador_id) break;
            upId = prof.patrocinador_id;
            const monto = parseFloat((puntos * lc.porcentaje / 100).toFixed(2));
            if (monto > 0) {
              inserts.push({
                beneficiario_id: upId,
                origen_id: distribId,
                tipo: 'nivel',
                nivel_red: lc.nivel,
                monto,
                estado: 'pendiente',
                descripcion: `Comisión nivel ${lc.nivel}`,
              });
            }
          }
          if (inserts.length > 0) await supabaseAdmin.from('comisiones').insert(inserts);
        }

        if (puntos > 0) {
          const mes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
          let child = nodoByDistrib.get(distribId);

          while (child?.padre_id) {
            const parent = nodoById.get(child.padre_id);
            if (!parent) break;

            const isLeft = child.posicion === 'izquierda';

            const { data: existing } = await supabaseAdmin
              .from('volumenes_binarios')
              .select('id, volumen_izquierda, volumen_derecha')
              .eq('distribuidor_id', parent.distribuidor_id)
              .eq('mes', mes)
              .maybeSingle();

            const newLeft  = Number(existing?.volumen_izquierda ?? 0) + (isLeft ? puntos : 0);
            const newRight = Number(existing?.volumen_derecha  ?? 0) + (isLeft ? 0 : puntos);
            const pareado  = Math.min(newLeft, newRight);

            if (existing) {
              await supabaseAdmin.from('volumenes_binarios').update({
                volumen_izquierda: newLeft,
                volumen_derecha: newRight,
                volumen_pareado: pareado,
              }).eq('id', existing.id);
            } else {
              await supabaseAdmin.from('volumenes_binarios').insert({
                distribuidor_id: parent.distribuidor_id,
                mes,
                volumen_izquierda: isLeft ? puntos : 0,
                volumen_derecha: isLeft ? 0 : puntos,
                volumen_pareado: 0,
                comision_calculada: 0,
                procesado: false,
              });
            }

            child = parent;
          }
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
                  {['ID', 'Distribuidor', 'Total', 'Puntos', 'Estado', 'Fecha', 'Actualizar Estado'].map((h) => (
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
    </div>
  );
}
