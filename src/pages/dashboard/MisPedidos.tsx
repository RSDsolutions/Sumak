import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, X, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { Pedido, PedidoItem } from '../../lib/types';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
    procesando: 'bg-blue-50 text-blue-600 border border-blue-200',
    enviado: 'bg-purple-50 text-purple-600 border border-purple-200',
    entregado: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
    cancelado: 'bg-red-50 text-red-600 border border-red-200',
  };
  return map[estado] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  entregado: 'Completado',
  cancelado: 'Cancelado',
};

interface DetalleModalProps {
  pedido: Pedido;
  onClose: () => void;
}

function DetalleModal({ pedido, onClose }: DetalleModalProps) {
  const items: PedidoItem[] = pedido.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white border border-[#C8D8CB] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8D8CB]">
          <div>
            <h3 className="font-heading font-bold text-lg text-[#111111]">Detalle del Pedido</h3>
            <p className="text-[#9CA3AF] text-xs mt-0.5">
              {new Date(pedido.created_at).toLocaleString('es-EC')}
            </p>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111111] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Estado + puntos */}
        <div className="px-6 py-3 bg-[#F4F7F5] border-b border-[#C8D8CB] flex items-center justify-between">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge(pedido.estado)}`}>
            {ESTADO_LABELS[pedido.estado] ?? pedido.estado}
          </span>
          {pedido.puntos_generados > 0 && (
            <span className={`text-sm font-semibold ${pedido.estado === 'entregado' ? 'text-[#D4AF37]' : 'text-[#9CA3AF]'}`}>
              ★ {pedido.puntos_generados} puntos {pedido.estado === 'entregado' ? 'ganados' : 'pendientes'}
            </span>
          )}
        </div>

        {/* Items */}
        <div className="px-6 py-4">
          <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3">Productos</p>
          {items.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-4">Sin ítems</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-[#F4F7F5] last:border-0">
                  <div>
                    <p className="text-[#111111] text-sm font-medium">{item.producto_nombre}</p>
                    <p className="text-[#9CA3AF] text-xs">
                      #{item.producto_codigo} · {item.cantidad} × ${Number(item.precio_unitario).toFixed(2)}
                    </p>
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

export default function MisPedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

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

  return (
    <div>
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Mis Pedidos</h1>
          <p className="text-[#6B7280] text-sm mt-1">Historial de todos tus pedidos</p>
        </div>
        <Link
          to="/dashboard/pedido/nuevo"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 shrink-0 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
        >
          <Plus size={16} />
          Nuevo Pedido
        </Link>
      </div>

      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : pedidos.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <ShoppingCart size={40} className="mx-auto mb-3 text-[#6B7280] opacity-30" />
            <p className="text-lg font-medium mb-2">Sin pedidos</p>
            <p className="text-sm mb-6">Aún no has realizado ningún pedido.</p>
            <Link
              to="/dashboard/pedido/nuevo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
            >
              <Plus size={16} />
              Hacer mi primer pedido
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Fecha', 'Productos', 'Total', 'Puntos', 'Estado', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] transition-colors">
                    <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-6 py-4 text-[#111111]">
                      {p.items && p.items.length > 0 ? (
                        <div>
                          {p.items.slice(0, 2).map((item) => (
                            <p key={item.id} className="text-sm">{item.producto_nombre} × {item.cantidad}</p>
                          ))}
                          {p.items.length > 2 && (
                            <p className="text-[#9CA3AF] text-xs">+{p.items.length - 2} más</p>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-[#111111] font-semibold whitespace-nowrap">
                      ${Number(p.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.puntos_generados > 0 ? (
                        <span className={`text-sm font-semibold ${p.estado === 'entregado' ? 'text-[#D4AF37]' : 'text-[#9CA3AF]'}`}>
                          ★ {p.puntos_generados}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(p.estado)}`}>
                        {ESTADO_LABELS[p.estado] ?? p.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedPedido(p)}
                        className="flex items-center gap-1.5 text-[#1A4E26] text-xs font-medium hover:underline"
                      >
                        <Eye size={14} />
                        Ver detalle
                      </button>
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
