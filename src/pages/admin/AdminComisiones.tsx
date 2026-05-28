import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import type { Comision } from '../../lib/types';

type FilterTab = 'todas' | 'pendiente' | 'pagado';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'pagado', label: 'Pagadas' },
  { key: 'todas', label: 'Todas' },
];

interface ComisionRow extends Comision {
  beneficiario_nombre?: string;
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminComisiones() {
  const [comisiones, setComisiones] = useState<ComisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('pendiente');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      let query = supabaseAdmin
        .from('comisiones')
        .select('*, beneficiario:profiles!beneficiario_id(nombre_completo)')
        .order('created_at', { ascending: false });
      if (tab !== 'todas') query = query.eq('estado', tab);
      const { data } = await query;

      const rows: ComisionRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as unknown as Comision),
        beneficiario_nombre: (r.beneficiario as { nombre_completo?: string } | null)?.nombre_completo ?? '',
      }));
      setComisiones(rows);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const pendientes = comisiones.filter((c) => c.estado === 'pendiente').map((c) => c.id);
    if (selected.size === pendientes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendientes));
    }
  }

  async function markAsPaid() {
    if (selected.size === 0) return;
    setMarking(true);
    await supabaseAdmin
      .from('comisiones')
      .update({ estado: 'pagado', pagado_at: new Date().toISOString() })
      .in('id', Array.from(selected));
    setMarking(false);
    await load();
  }

  const totalPendiente = comisiones
    .filter((c) => c.estado === 'pendiente')
    .reduce((s, c) => s + Number(c.monto), 0);

  const pendientes = comisiones.filter((c) => c.estado === 'pendiente');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Comisiones</h1>
        <p className="text-[#888888] text-sm mt-1">Gestión de pagos y comisiones de distribuidores</p>
      </div>

      {/* Total pendiente */}
      <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-2xl p-6 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
          <DollarSign size={24} className="text-[#D4AF37]" />
        </div>
        <div>
          <p className="text-[#888888] text-sm">Total Pendiente de Pago</p>
          <p className="font-heading font-bold text-2xl text-[#D4AF37]">${totalPendiente.toFixed(2)}</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={markAsPaid}
            disabled={marking}
            className="ml-auto px-5 py-2.5 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] transition-all duration-200 disabled:opacity-60"
          >
            {marking ? 'Procesando...' : `Marcar ${selected.size} como Pagadas`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-1 mb-4 w-fit">
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
        ) : comisiones.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#888888]">
            <p className="text-lg font-medium mb-2">Sin comisiones</p>
            <p className="text-sm">No hay comisiones con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2E2E2E]">
                  {tab === 'pendiente' && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected.size === pendientes.length && pendientes.length > 0}
                        onChange={toggleAll}
                        className="accent-[#00A86B]"
                      />
                    </th>
                  )}
                  {['Beneficiario', 'Tipo', 'Descripción', 'Monto', 'Fecha', 'Estado'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[#888888] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comisiones.map((c) => (
                  <tr key={c.id} className="border-b border-[#2E2E2E] hover:bg-[#222222] transition-colors">
                    {tab === 'pendiente' && (
                      <td className="px-4 py-4">
                        {c.estado === 'pendiente' && (
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="accent-[#00A86B]"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-[#F0F0F0] font-medium whitespace-nowrap">
                      {c.beneficiario_nombre || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${tipoBadge(c.tipo)}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#888888] max-w-[200px] truncate">
                      {c.descripcion ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-[#F0F0F0] font-semibold whitespace-nowrap">
                      ${Number(c.monto).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-[#888888] whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(c.estado)}`}>
                        {c.estado}
                      </span>
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
