import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { Comision } from '../../lib/types';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    pagado: 'bg-[#00A86B]/10 text-[#00A86B] border border-[#00A86B]/30',
    cancelado: 'bg-red-500/10 text-red-400 border border-red-500/30',
  };
  return map[estado] ?? '';
}

function tipoBadge(tipo: string) {
  const map: Record<string, string> = {
    afiliacion: 'bg-blue-500/10 text-blue-400',
    binaria: 'bg-purple-500/10 text-purple-400',
    nivel: 'bg-[#D4AF37]/10 text-[#D4AF37]',
  };
  return map[tipo] ?? 'bg-[#222222] text-[#888888]';
}

export default function MisComisiones() {
  const { user } = useAuth();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from('comisiones')
        .select('*')
        .eq('beneficiario_id', user!.id)
        .order('created_at', { ascending: false });
      setComisiones((data ?? []) as Comision[]);
      setLoading(false);
    }
    load();
  }, [user]);

  const totalGanado = comisiones.filter((c) => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0);
  const totalPendiente = comisiones.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0);
  const totalTodo = comisiones.reduce((s, c) => s + Number(c.monto), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Mis Comisiones</h1>
        <p className="text-[#888888] text-sm mt-1">Historial completo de tus comisiones y ganancias</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
          <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={20} className="text-[#D4AF37]" />
          </div>
          <p className="text-[#888888] text-sm mb-1">Total Generado</p>
          <p className="font-heading font-bold text-2xl text-[#F0F0F0]">${totalTodo.toFixed(2)}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
            <Clock size={20} className="text-amber-400" />
          </div>
          <p className="text-[#888888] text-sm mb-1">Pendiente de Cobro</p>
          <p className="font-heading font-bold text-2xl text-amber-400">${totalPendiente.toFixed(2)}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
          <div className="w-10 h-10 bg-[#00A86B]/10 rounded-xl flex items-center justify-center mb-4">
            <DollarSign size={20} className="text-[#00A86B]" />
          </div>
          <p className="text-[#888888] text-sm mb-1">Total Pagado</p>
          <p className="font-heading font-bold text-2xl text-[#00A86B]">${totalGanado.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : comisiones.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#888888]">
            <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-2">Sin comisiones aún</p>
            <p className="text-sm">Tus comisiones aparecerán aquí cuando afiliés distribuidores o tengas volumen binario.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2E2E2E]">
                  {['Tipo', 'Descripción', 'Monto', 'Estado', 'Fecha'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[#888888] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comisiones.map((c) => (
                  <tr key={c.id} className="border-b border-[#2E2E2E] hover:bg-[#222222] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${tipoBadge(c.tipo)}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#888888] max-w-[250px] truncate">{c.descripcion ?? '—'}</td>
                    <td className="px-6 py-4 text-[#F0F0F0] font-semibold whitespace-nowrap">
                      ${Number(c.monto).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(c.estado)}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#888888] whitespace-nowrap">
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
