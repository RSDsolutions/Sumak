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
    basico: 'bg-[#555555]/20 text-[#AAAAAA]',
    emprendedor: 'bg-[#00A86B]/10 text-[#00A86B]',
    lider: 'bg-[#D4AF37]/10 text-[#D4AF37]',
  };
  return p ? (map[p] ?? 'bg-[#222222] text-[#888888]') : 'bg-[#222222] text-[#888888]';
};

const paqueteLabel: Record<string, string> = {
  basico: 'Básico',
  emprendedor: 'Emprendedor',
  lider: 'Líder',
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
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
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Distribuidores</h1>
        <p className="text-[#888888] text-sm mt-1">Todos los distribuidores activos en la red SUMAK</p>
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

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555]" />
        <input
          type="text"
          placeholder="Buscar por nombre, código o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl pl-11 pr-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors"
        />
      </div>

      <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#888888]">
            <p className="text-lg font-medium mb-2">Sin distribuidores</p>
            <p className="text-sm">No se encontraron distribuidores con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2E2E2E]">
                  {['Código', 'Nombre', 'Email', 'Paquete', 'Estado', 'Fecha Registro', ''].map((h, i) => (
                    <th key={i} className="px-6 py-3 text-left text-[#888888] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
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
                    className="border-b border-[#2E2E2E] hover:bg-[#222222] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-[#00A86B] font-mono text-xs font-bold whitespace-nowrap">
                      {d.codigo_distribuidor ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-[#F0F0F0] font-medium whitespace-nowrap">{d.nombre_completo}</td>
                    <td className="px-6 py-4 text-[#888888]">{d.email}</td>
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
                          ? 'bg-[#00A86B]/10 text-[#00A86B] border border-[#00A86B]/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#888888] whitespace-nowrap">
                      {new Date(d.fecha_registro).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-6 py-4 text-[#888888]">
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
