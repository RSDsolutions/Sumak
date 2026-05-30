import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import type { Profile } from '../../lib/types';

type FilterTab = 'todos' | 'activo' | 'suspendido';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'activo', label: 'Activos' },
  { key: 'suspendido', label: 'Suspendidos' },
];

const paqueteBadge = (p: string | null) => {
  const map: Record<string, string> = {
    basico: 'bg-[#F4F7F5] text-[#6B7280]',
    emprendedor: 'bg-[#EBF4ED] text-[#1A4E26]',
    lider: 'bg-[#D4AF37]/10 text-[#D4AF37]',
  };
  return p ? (map[p] ?? 'bg-[#F4F7F5] text-[#6B7280]') : 'bg-[#F4F7F5] text-[#6B7280]';
};

const paqueteLabel: Record<string, string> = {
  basico: 'Básico',
  emprendedor: 'Emprendedor',
  lider: 'Líder',
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Distribuidores() {
  const navigate = useNavigate();
  const [distribuidores, setDistribuidores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let query = supabaseAdmin.from('profiles').select('*').eq('rol', 'distribuidor').order('fecha_registro', { ascending: false });
        if (tab !== 'todos') query = query.eq('estado', tab);
        const { data } = await query;
        setDistribuidores((data ?? []) as Profile[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tab]);

  const filtered = distribuidores.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.nombre_completo.toLowerCase().includes(q) ||
      (d.codigo_distribuidor ?? '').toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Distribuidores</h1>
        <p className="text-[#6B7280] text-sm mt-1">Todos los distribuidores activos en la red SUMAK</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#C8D8CB] rounded-xl p-1 mb-4 w-fit">
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

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          placeholder="Buscar por nombre, código o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-white border border-[#C8D8CB] rounded-xl pl-11 pr-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
        />
      </div>

      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <p className="text-lg font-medium mb-2">Sin distribuidores</p>
            <p className="text-sm">No se encontraron distribuidores con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Código', 'Nombre', 'Email', 'Paquete', 'Estado', 'Fecha Registro', ''].map((h, i) => (
                    <th key={i} className="px-6 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/admin/distribuidores/${d.id}`)}
                    className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-[#1A4E26] font-mono text-xs font-bold whitespace-nowrap">
                      {d.codigo_distribuidor ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-[#111111] font-medium whitespace-nowrap">{d.nombre_completo}</td>
                    <td className="px-6 py-4 text-[#6B7280]">{d.email}</td>
                    <td className="px-6 py-4">
                      {d.paquete ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paqueteBadge(d.paquete)}`}>
                          {paqueteLabel[d.paquete] ?? d.paquete}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        d.estado === 'activo'
                          ? 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap">
                      {new Date(d.fecha_registro).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-6 py-4 text-[#9CA3AF]">
                      <ChevronRight size={16} />
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
