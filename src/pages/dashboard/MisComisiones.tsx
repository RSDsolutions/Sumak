import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { Comision } from '../../lib/types';

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
    pagado: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
    cancelado: 'bg-red-50 text-red-600 border border-red-200',
  };
  return map[estado] ?? '';
}

function tipoBadge(tipo: string) {
  const map: Record<string, string> = {
    afiliacion: 'bg-blue-50 text-blue-600',
    binaria: 'bg-purple-50 text-purple-600',
    nivel: 'bg-[#D4AF37]/10 text-[#D4AF37]',
  };
  return map[tipo] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

const TIPO_LABELS: Record<string, string> = {
  afiliacion: 'Referido',
  nivel: 'Por nivel',
  binaria: 'Binaria',
};

export default function MisComisiones() {
  const { user } = useAuth();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [compraCalificada, setCompraCalificada] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const [{ data }, { data: compraData }] = await Promise.all([
        supabase.from('comisiones').select('*').eq('beneficiario_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('pedidos').select('id').eq('distribuidor_id', user!.id).eq('estado', 'entregado').gte('total', 100).gte('created_at', startOfMonth).limit(1),
      ]);
      setComisiones((data ?? []) as Comision[]);
      setCompraCalificada((compraData?.length ?? 0) > 0);
      setLoading(false);
    }
    load();
  }, [user]);

  const totalGanado = comisiones.filter((c) => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0);
  const totalPendiente = comisiones.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0);
  const totalTodo = comisiones.reduce((s, c) => s + Number(c.monto), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Mis Comisiones</h1>
        <p className="text-[#6B7280] text-sm mt-1">Historial completo de tus comisiones y ganancias</p>
      </div>

      {/* Banner elegibilidad */}
      {!loading && (
        <div className={`flex items-center gap-3 rounded-xl px-5 py-3 mb-6 border text-sm font-medium ${
          compraCalificada
            ? 'bg-[#EBF4ED] border-[#1A4E26]/20 text-[#1A4E26]'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {compraCalificada ? (
            <>
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Habilitado para recibir comisiones este mes</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} className="shrink-0" />
              <span>Debes realizar una <strong>compra de $100 o más en un solo pedido</strong> este mes para recibir comisiones</span>
              <Link to="/dashboard/pedido/nuevo" className="ml-auto shrink-0 underline text-xs">Comprar</Link>
            </>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
          <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={20} className="text-[#D4AF37]" />
          </div>
          <p className="text-[#6B7280] text-sm mb-1">Total Generado</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">${totalTodo.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
            <Clock size={20} className="text-amber-600" />
          </div>
          <p className="text-[#6B7280] text-sm mb-1">Pendiente de Cobro</p>
          <p className="font-heading font-bold text-2xl text-amber-600">${totalPendiente.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
          <div className="w-10 h-10 bg-[#1A4E26]/10 rounded-xl flex items-center justify-center mb-4">
            <DollarSign size={20} className="text-[#1A4E26]" />
          </div>
          <p className="text-[#6B7280] text-sm mb-1">Total Pagado</p>
          <p className="font-heading font-bold text-2xl text-[#1A4E26]">${totalGanado.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : comisiones.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <DollarSign size={40} className="mx-auto mb-3 text-[#6B7280] opacity-30" />
            <p className="text-lg font-medium mb-2">Sin comisiones aún</p>
            <p className="text-sm">Tus comisiones aparecerán aquí cuando afiliés distribuidores o tengas volumen binario.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Tipo', 'Descripción', 'Monto', 'Estado', 'Fecha'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comisiones.map((c) => (
                  <tr key={c.id} className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoBadge(c.tipo)}`}>
                        {TIPO_LABELS[c.tipo] ?? c.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280] max-w-[250px] truncate">{c.descripcion ?? '—'}</td>
                    <td className="px-6 py-4 text-[#111111] font-semibold whitespace-nowrap">
                      ${Number(c.monto).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(c.estado)}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('es-EC')}
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
