import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import type { Afiliacion, EstadoAfiliacion } from '../../lib/types';

type FilterTab = 'todas' | EstadoAfiliacion;

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
    aprobada: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
    rechazada: 'bg-red-50 text-red-600 border border-red-200',
  };
  return map[estado] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

function paqueteBadge(paquete: string) {
  const map: Record<string, string> = {
    basico: 'bg-[#F4F7F5] text-[#6B7280]',
    emprendedor: 'bg-[#EBF4ED] text-[#1A4E26]',
    lider: 'bg-[#D4AF37]/10 text-[#D4AF37]',
  };
  return map[paquete] ?? '';
}

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

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'aprobada', label: 'Aprobadas' },
  { key: 'rechazada', label: 'Rechazadas' },
];

export default function Solicitudes() {
  const navigate = useNavigate();
  const [afiliaciones, setAfiliaciones] = useState<Afiliacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('todas');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let query = supabaseAdmin.from('afiliaciones').select('*').order('created_at', { ascending: false });
        if (tab !== 'todas') query = query.eq('estado', tab);
        const { data } = await query;
        setAfiliaciones((data ?? []) as Afiliacion[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tab]);

  const filtered = afiliaciones.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.nombre_completo.toLowerCase().includes(q) || a.cedula.includes(q) || a.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Solicitudes de Afiliación</h1>
        <p className="text-[#6B7280] text-sm mt-1">Revisa y gestiona las solicitudes de nuevos distribuidores</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#C8D8CB] rounded-xl p-1 mb-4 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.key
                ? 'bg-[#1A4E26] text-white shadow-[0_0_8px_rgba(26,78,38,0.2)]'
                : 'text-[#6B7280] hover:text-[#111111]'
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
          placeholder="Buscar por nombre, cédula o email..."
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
            <p className="text-lg font-medium mb-2">No hay solicitudes</p>
            <p className="text-sm">No se encontraron solicitudes con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Fecha', 'Nombre', 'Email', 'Cédula', 'Paquete', 'Estado', ''].map((h, i) => (
                    <th key={i} className="px-6 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/admin/solicitudes/${a.id}`)}
                    className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-6 py-4 text-[#111111] font-medium whitespace-nowrap">{a.nombre_completo}</td>
                    <td className="px-6 py-4 text-[#6B7280]">{a.email}</td>
                    <td className="px-6 py-4 text-[#6B7280] font-mono">{a.cedula}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paqueteBadge(a.paquete_seleccionado)}`}>
                        {paqueteLabel[a.paquete_seleccionado] ?? a.paquete_seleccionado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(a.estado)}`}>
                        {a.estado}
                      </span>
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
