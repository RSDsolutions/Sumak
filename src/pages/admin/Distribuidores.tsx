import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronRight, Users, Calendar, Clock, X, Filter,
  CheckCircle2, AlertCircle, Star, Hash, UserCog, MapPin,
  TrendingUp,
} from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import { useAdminBasePath } from '../../lib/useAdminBasePath';
import type { Profile, EstadoDistribuidor } from '../../lib/types';

type EstadoTab = 'todos' | EstadoDistribuidor;
type PaqueteFilter = 'todos' | 'basico' | 'emprendedor' | 'lider' | 'sin-paquete';
type ActivoFilter = 'todos' | 'activo-mes' | 'inactivo-mes';

const ESTADO_TABS: { key: EstadoTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'activo', label: 'Activos' },
  { key: 'suspendido', label: 'Suspendidos' },
];

type SortKey = 'fecha-desc' | 'fecha-asc' | 'nombre-asc' | 'nombre-desc' | 'puntos-desc' | 'puntos-asc' | 'codigo-asc';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'fecha-desc', label: 'Más recientes primero' },
  { key: 'fecha-asc', label: 'Más antiguos primero' },
  { key: 'nombre-asc', label: 'Nombre A-Z' },
  { key: 'nombre-desc', label: 'Nombre Z-A' },
  { key: 'puntos-desc', label: 'Puntos: mayor a menor' },
  { key: 'puntos-asc', label: 'Puntos: menor a mayor' },
  { key: 'codigo-asc', label: 'Código asc' },
];

const paqueteStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  basico:      { bg: 'bg-[#F4F7F5]',     text: 'text-[#6B7280]',  border: 'border-[#C8D8CB]',     label: 'Básico' },
  emprendedor: { bg: 'bg-[#EBF4ED]',     text: 'text-[#1A4E26]',  border: 'border-[#1A4E26]/30',  label: 'Emprendedor' },
  lider:       { bg: 'bg-[#D4AF37]/10',  text: 'text-[#D4AF37]',  border: 'border-[#D4AF37]/40',  label: 'Líder' },
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface DistribRow extends Profile {
  activoMes: boolean;
}

export default function Distribuidores() {
  const navigate = useNavigate();
  const basePath = useAdminBasePath();
  const [distribuidores, setDistribuidores] = useState<DistribRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [estadoTab, setEstadoTab] = useState<EstadoTab>('todos');
  const [paqueteFilter, setPaqueteFilter] = useState<PaqueteFilter>('todos');
  const [activoFilter, setActivoFilter] = useState<ActivoFilter>('todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('fecha-desc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [{ data: profiles }, { data: pedidos }] = await Promise.all([
          supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('rol', 'distribuidor')
            .order('fecha_registro', { ascending: false }),
          supabaseAdmin
            .from('pedidos')
            .select('distribuidor_id, total, estado')
            .in('estado', ['procesando', 'enviado', 'entregado'])
            .gte('total', 100)
            .gte('created_at', startOfMonth),
        ]);

        const activosMes = new Set<string>(
          (pedidos ?? []).map((p: { distribuidor_id: string }) => p.distribuidor_id)
        );

        const rows: DistribRow[] = ((profiles ?? []) as Profile[]).map((p) => ({
          ...p,
          activoMes: activosMes.has(p.id),
        }));
        setDistribuidores(rows);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Filtros aplicados ──
  const filtered = useMemo(() => {
    let list = distribuidores;
    if (estadoTab !== 'todos') list = list.filter((d) => d.estado === estadoTab);
    if (paqueteFilter === 'sin-paquete') list = list.filter((d) => !d.paquete);
    else if (paqueteFilter !== 'todos') list = list.filter((d) => d.paquete === paqueteFilter);
    if (activoFilter === 'activo-mes') list = list.filter((d) => d.activoMes);
    if (activoFilter === 'inactivo-mes') list = list.filter((d) => !d.activoMes);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((d) =>
        d.nombre_completo.toLowerCase().includes(q) ||
        (d.codigo_distribuidor ?? '').toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        (d.cedula ?? '').includes(q) ||
        (d.ciudad ?? '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    switch (sortBy) {
      case 'fecha-asc': sorted.sort((a, b) => new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime()); break;
      case 'nombre-asc': sorted.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)); break;
      case 'nombre-desc': sorted.sort((a, b) => b.nombre_completo.localeCompare(a.nombre_completo)); break;
      case 'puntos-desc': sorted.sort((a, b) => (b.puntos ?? 0) - (a.puntos ?? 0)); break;
      case 'puntos-asc': sorted.sort((a, b) => (a.puntos ?? 0) - (b.puntos ?? 0)); break;
      case 'codigo-asc': sorted.sort((a, b) => (a.codigo_distribuidor ?? '').localeCompare(b.codigo_distribuidor ?? '')); break;
      default: sorted.sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime());
    }
    return sorted;
  }, [distribuidores, estadoTab, paqueteFilter, activoFilter, search, sortBy]);

  // ── Resumen por paquete ──
  const resumen = useMemo(() => {
    const byPaquete = (paquete: string | null) => {
      const list = paquete === null
        ? distribuidores.filter((d) => !d.paquete)
        : distribuidores.filter((d) => d.paquete === paquete);
      return {
        count: list.length,
        activosMes: list.filter((d) => d.activoMes).length,
        puntos: list.reduce((s, d) => s + (d.puntos ?? 0), 0),
      };
    };
    return {
      basico: byPaquete('basico'),
      emprendedor: byPaquete('emprendedor'),
      lider: byPaquete('lider'),
      sinPaquete: byPaquete(null),
      total: distribuidores.length,
      activos: distribuidores.filter((d) => d.estado === 'activo').length,
      suspendidos: distribuidores.filter((d) => d.estado === 'suspendido').length,
      activosMes: distribuidores.filter((d) => d.activoMes).length,
      totalPuntos: distribuidores.reduce((s, d) => s + (d.puntos ?? 0), 0),
    };
  }, [distribuidores]);

  // ── Conteos por tab ──
  const estadoCounts = useMemo(() => {
    const apply = (list: DistribRow[]) => {
      let l = list;
      if (paqueteFilter === 'sin-paquete') l = l.filter((d) => !d.paquete);
      else if (paqueteFilter !== 'todos') l = l.filter((d) => d.paquete === paqueteFilter);
      if (activoFilter === 'activo-mes') l = l.filter((d) => d.activoMes);
      if (activoFilter === 'inactivo-mes') l = l.filter((d) => !d.activoMes);
      return l.length;
    };
    return {
      todos: apply(distribuidores),
      activo: apply(distribuidores.filter((d) => d.estado === 'activo')),
      suspendido: apply(distribuidores.filter((d) => d.estado === 'suspendido')),
    };
  }, [distribuidores, paqueteFilter, activoFilter]);

  function resetFilters() {
    setEstadoTab('todos');
    setPaqueteFilter('todos');
    setActivoFilter('todos');
    setSearch('');
    setSortBy('fecha-desc');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Distribuidores</h1>
        <p className="text-[#6B7280] text-sm mt-1">
          {resumen.total} distribuidores registrados · {resumen.activosMes} activos este mes
        </p>
      </div>

      {/* ── Top stat cards ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] text-white rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-30">
            <Users size={24} className="text-[#D4AF37]" />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-1 font-bold">Total</p>
          <p className="font-heading font-bold text-3xl text-white">{resumen.total}</p>
          <p className="text-[10px] text-white/65 mt-1">{resumen.activos} activos · {resumen.suspendidos} suspendidos</p>
        </div>

        <div className="bg-white border border-[#1A4E26]/30 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 bg-[#1A4E26]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={18} className="text-[#1A4E26]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] px-2 py-0.5 rounded">
              {resumen.total > 0 ? Math.round((resumen.activosMes / resumen.total) * 100) : 0}%
            </span>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Activos este mes</p>
          <p className="font-heading font-bold text-2xl text-[#1A4E26]">{resumen.activosMes}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">Con compra ≥ $100</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertCircle size={18} className="text-amber-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              {resumen.total - resumen.activosMes}
            </span>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Inactivos este mes</p>
          <p className="font-heading font-bold text-2xl text-amber-600">{resumen.total - resumen.activosMes}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">Sin pedido calificado</p>
        </div>

        <div className="bg-white border border-[#D4AF37]/40 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 bg-[#D4AF37]/15 rounded-xl flex items-center justify-center">
              <Star size={18} className="text-[#D4AF37]" fill="currentColor" />
            </div>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Puntos totales</p>
          <p className="font-heading font-bold text-2xl text-[#D4AF37]">{resumen.totalPuntos.toLocaleString('es-EC')}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">en toda la red</p>
        </div>
      </div>

      {/* ── Paquete stat cards (clicables) ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'basico' as const, label: 'Básico', stats: resumen.basico, color: 'border-[#C8D8CB]', activeColor: 'border-[#6B7280]', activeShadow: 'shadow-[0_8px_24px_rgba(107,114,128,0.12)]', textColor: 'text-[#6B7280]', bg: 'bg-[#F4F7F5]' },
          { key: 'emprendedor' as const, label: 'Emprendedor', stats: resumen.emprendedor, color: 'border-[#1A4E26]/20', activeColor: 'border-[#1A4E26]', activeShadow: 'shadow-[0_8px_24px_rgba(26,78,38,0.15)]', textColor: 'text-[#1A4E26]', bg: 'bg-[#EBF4ED]' },
          { key: 'lider' as const, label: 'Líder', stats: resumen.lider, color: 'border-[#D4AF37]/30', activeColor: 'border-[#D4AF37]', activeShadow: 'shadow-[0_8px_24px_rgba(212,175,55,0.18)]', textColor: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
          { key: 'sin-paquete' as const, label: 'Sin paquete', stats: resumen.sinPaquete, color: 'border-red-200', activeColor: 'border-red-400', activeShadow: 'shadow-[0_8px_24px_rgba(239,68,68,0.12)]', textColor: 'text-red-600', bg: 'bg-red-50' },
        ].map((card) => {
          const isActive = paqueteFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setPaqueteFilter(isActive ? 'todos' : card.key)}
              className={`text-left bg-white border-2 rounded-2xl p-4 transition-all ${
                isActive ? `${card.activeColor} ${card.activeShadow}` : `${card.color} hover:${card.activeColor}`
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <UserCog size={16} className={card.textColor} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${card.textColor} ${card.bg} px-2 py-0.5 rounded`}>
                  {card.stats.count}
                </span>
              </div>
              <p className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1 font-semibold">{card.label}</p>
              <p className={`font-heading font-bold text-xl ${card.textColor}`}>★ {card.stats.puntos.toLocaleString('es-EC')}</p>
              <p className="text-[9px] text-[#9CA3AF] mt-1">{card.stats.activosMes} activos este mes</p>
            </button>
          );
        })}
      </div>

      {/* ── Filtros ─────────────────── */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {/* Activo mes filter */}
          <div className="flex items-center gap-1.5 bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl p-1">
            <Filter size={12} className="text-[#6B7280] ml-2" />
            <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold mr-1">Mes actual:</span>
            {[
              { key: 'todos' as const, label: 'Todos' },
              { key: 'activo-mes' as const, label: 'Activos' },
              { key: 'inactivo-mes' as const, label: 'Inactivos' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setActivoFilter(opt.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activoFilter === opt.key
                    ? 'bg-[#1A4E26] text-white'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + sort */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#C8D8CB]/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código, email, cédula o ciudad..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl text-xs text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          {(estadoTab !== 'todos' || paqueteFilter !== 'todos' || activoFilter !== 'todos' || search) && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#6B7280] hover:text-[#111111] underline flex items-center gap-1"
            >
              <X size={11} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs por estado ─────────────────── */}
      <div className="flex gap-1 bg-white border border-[#C8D8CB] rounded-xl p-1 mb-4 w-fit overflow-x-auto">
        {ESTADO_TABS.map((t) => {
          const count = estadoCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setEstadoTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap inline-flex items-center gap-1.5 ${
                estadoTab === t.key
                  ? 'bg-[#1A4E26] text-white shadow-[0_0_8px_rgba(26,78,38,0.2)]'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                estadoTab === t.key ? 'bg-white/20 text-white' : 'bg-[#1A4E26]/10 text-[#1A4E26]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tabla ─────────────────── */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <Users size={40} className="mx-auto mb-3 text-[#9CA3AF] opacity-30" />
            <p className="text-lg font-bold mb-1 text-[#111111]">Sin distribuidores</p>
            <p className="text-sm mb-5">No se encontraron distribuidores con los filtros actuales.</p>
            {(estadoTab !== 'todos' || paqueteFilter !== 'todos' || activoFilter !== 'todos' || search) && (
              <button
                onClick={resetFilters}
                className="px-5 py-2 rounded-full bg-[#1A4E26] text-white text-xs font-semibold hover:bg-[#163F1E] transition-all"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Código', 'Distribuidor', 'Contacto', 'Paquete', 'Puntos', 'Mes actual', 'Estado', 'Registro', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const pkg = d.paquete ?? 'basico';
                  const style = paqueteStyles[pkg] ?? paqueteStyles.basico;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => navigate(`${basePath}/distribuidores/${d.id}`)}
                      className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[#1A4E26] font-mono text-xs font-bold">{d.codigo_distribuidor ?? '—'}</p>
                        {d.cedula && (
                          <p className="text-[#9CA3AF] text-[10px] flex items-center gap-1 mt-0.5">
                            <Hash size={9} /> {d.cedula}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[#111111] text-xs font-bold">{d.nombre_completo}</p>
                        {d.ciudad && (
                          <p className="text-[#9CA3AF] text-[10px] flex items-center gap-1 mt-0.5">
                            <MapPin size={9} /> {d.ciudad}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[#6B7280] text-xs truncate max-w-[180px]">{d.email}</p>
                        {d.telefono && <p className="text-[#9CA3AF] text-[10px] mt-0.5">{d.telefono}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {d.paquete ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${style.text} ${style.bg} border ${style.border}`}>
                            {style.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-red-600 bg-red-50 border border-red-200">
                            Sin paquete
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[#D4AF37] font-bold text-xs flex items-center gap-1">
                          <Star size={10} fill="currentColor" />
                          {(d.puntos ?? 0).toLocaleString('es-EC')}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {d.activoMes ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30">
                            <TrendingUp size={9} /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                            <AlertCircle size={9} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          d.estado === 'activo'
                            ? 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[#111111] text-xs font-medium flex items-center gap-1">
                          <Calendar size={10} className="text-[#9CA3AF]" />
                          {new Date(d.fecha_registro).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[#9CA3AF] text-[10px] flex items-center gap-1 mt-0.5 ml-3.5">
                          <Clock size={9} />
                          {new Date(d.fecha_registro).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-[#9CA3AF]">
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <div className="mt-3 text-center text-[10px] text-[#9CA3AF]">
          Mostrando <strong>{filtered.length}</strong> de {distribuidores.length} distribuidores totales
        </div>
      )}
    </div>
  );
}
