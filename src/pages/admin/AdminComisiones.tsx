import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign, X, Eye, ArrowDown, ArrowUp, Calendar, Hash,
  Layers, Sparkles, CheckCircle2, Clock, AlertCircle, Search,
  Users, Network, TrendingUp, Filter,
} from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import { levelCommissions } from '../../data';
import type { Comision, Profile, TipoComision, EstadoComision } from '../../lib/types';

// ── Tabs by estado ──
const ESTADO_TABS: { key: EstadoComision | 'todas'; label: string }[] = [
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'pagado', label: 'Pagadas' },
  { key: 'cancelado', label: 'Canceladas' },
  { key: 'todas', label: 'Todas' },
];

// ── Filter pills by tipo ──
const TIPO_PILLS: { key: TipoComision | 'todos'; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'todos', label: 'Todos los tipos', icon: <Filter size={13} />, color: 'text-[#6B7280]' },
  { key: 'afiliacion', label: 'Referidos directos', icon: <Users size={13} />, color: 'text-blue-600' },
  { key: 'nivel', label: 'Por nivel', icon: <Layers size={13} />, color: 'text-[#D4AF37]' },
  { key: 'binaria', label: 'Binaria', icon: <Network size={13} />, color: 'text-purple-600' },
];

type SortKey = 'fecha-desc' | 'fecha-asc' | 'monto-desc' | 'monto-asc';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'fecha-desc', label: 'Más recientes primero' },
  { key: 'fecha-asc', label: 'Más antiguas primero' },
  { key: 'monto-desc', label: 'Monto mayor a menor' },
  { key: 'monto-asc', label: 'Monto menor a mayor' },
];

interface ComisionRow extends Comision {
  beneficiario_nombre?: string;
  beneficiario_codigo?: string;
  origen_nombre?: string;
  origen_codigo?: string;
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

const TIPO_LABEL: Record<string, string> = {
  afiliacion: 'Referido directo',
  nivel: 'Por nivel',
  binaria: 'Binaria',
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── DETAIL MODAL ──────────────────────────────────────────
function DetalleModal({ comision, onClose }: { comision: ComisionRow; onClose: () => void }) {
  const [origen, setOrigen] = useState<Profile | null>(null);
  const [beneficiario, setBeneficiario] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const ids = [comision.beneficiario_id, comision.origen_id].filter(Boolean) as string[];
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabaseAdmin.from('profiles').select('*').in('id', ids);
      for (const p of (data ?? []) as Profile[]) {
        if (p.id === comision.beneficiario_id) setBeneficiario(p);
        if (p.id === comision.origen_id) setOrigen(p);
      }
      setLoading(false);
    }
    load();
  }, [comision.id, comision.beneficiario_id, comision.origen_id]);

  const porcentaje =
    comision.tipo === 'afiliacion' ? 40 :
    comision.tipo === 'nivel' && comision.nivel_red !== null
      ? (levelCommissions.find((l) => l.nivel === comision.nivel_red)?.porcentaje ?? null)
      : comision.tipo === 'binaria' ? 50 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm overflow-y-auto py-8" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#C8D8CB] rounded-3xl w-full max-w-2xl shadow-2xl my-auto"
      >
        <div className="relative px-6 py-5 border-b border-[#C8D8CB] sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-1 flex items-center gap-1.5">
                <Sparkles size={11} /> Detalle de comisión
              </p>
              <h3 className="font-heading font-bold text-2xl text-[#111111]">
                ${Number(comision.monto).toFixed(2)}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tipoBadge(comision.tipo)}`}>
                  {TIPO_LABEL[comision.tipo] ?? comision.tipo}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${estadoBadge(comision.estado)}`}>
                  {comision.estado === 'pagado' && <CheckCircle2 size={10} />}
                  {comision.estado === 'pendiente' && <Clock size={10} />}
                  {comision.estado === 'cancelado' && <AlertCircle size={10} />}
                  {ESTADO_LABEL[comision.estado] ?? comision.estado}
                </span>
                {porcentaje !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
                    <Layers size={10} /> {porcentaje}%
                    {comision.tipo === 'nivel' && comision.nivel_red !== null && ` · Nivel ${comision.nivel_red}`}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111111] transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {origen && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-widest text-blue-700 font-bold mb-2 flex items-center gap-1.5">
                      <ArrowUp size={11} /> Origen (de donde viene)
                    </p>
                    <p className="text-[#111111] text-sm font-bold leading-tight">{origen.nombre_completo}</p>
                    <p className="text-blue-700 text-xs font-mono mt-1">{origen.codigo_distribuidor ?? '—'}</p>
                    {origen.email && <p className="text-[#6B7280] text-xs mt-1 truncate">{origen.email}</p>}
                  </div>
                )}

                <div className={`bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-2xl p-4 ${!origen ? 'sm:col-span-2' : ''}`}>
                  <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-2 flex items-center gap-1.5">
                    <ArrowDown size={11} /> Beneficiario (quien cobra)
                  </p>
                  <p className="text-[#111111] text-sm font-bold leading-tight">
                    {beneficiario?.nombre_completo ?? comision.beneficiario_nombre ?? '—'}
                  </p>
                  <p className="text-[#1A4E26] text-xs font-mono mt-1">
                    {beneficiario?.codigo_distribuidor ?? comision.beneficiario_codigo ?? '—'}
                  </p>
                  {beneficiario?.email && <p className="text-[#6B7280] text-xs mt-1 truncate">{beneficiario.email}</p>}
                </div>
              </div>

              {comision.descripcion && (
                <div className="bg-[#F4F7F5] rounded-2xl p-4 mb-5">
                  <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold mb-2">Descripción</p>
                  <p className="text-[#111111] text-sm leading-relaxed">{comision.descripcion}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white border border-[#C8D8CB] rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-1 flex items-center gap-1">
                    <Calendar size={10} /> Generada
                  </p>
                  <p className="text-[#111111] text-xs font-bold">
                    {new Date(comision.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-[#6B7280] text-[11px]">
                    {new Date(comision.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <div className="bg-white border border-[#C8D8CB] rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-1 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Pagada
                  </p>
                  {comision.pagado_at ? (
                    <>
                      <p className="text-[#111111] text-xs font-bold">
                        {new Date(comision.pagado_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[#6B7280] text-[11px]">
                        {new Date(comision.pagado_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  ) : (
                    <p className="text-[#9CA3AF] text-xs italic">Aún no pagada</p>
                  )}
                </div>
              </div>

              <div className="bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-2 flex items-center gap-1.5">
                  <Hash size={10} /> Identificadores
                </p>
                <p className="text-[#6B7280] text-[10px] font-mono break-all">ID comisión: {comision.id}</p>
                {comision.origen_id && <p className="text-[#6B7280] text-[10px] font-mono break-all mt-0.5">Origen ID: {comision.origen_id}</p>}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-[#0F2E18] to-[#1A4E26] rounded-b-3xl">
          <div>
            <p className="text-[#D4AF37] text-[9px] uppercase tracking-widest font-bold">Monto de la comisión</p>
            {porcentaje !== null && (
              <p className="text-white/65 text-[10px]">
                {comision.tipo === 'afiliacion' ? '40% del paquete del referido' :
                 comision.tipo === 'nivel' ? `${porcentaje}% sobre puntos del pedido (nivel ${comision.nivel_red})` :
                 '50% del volumen pareado'}
              </p>
            )}
          </div>
          <span className="font-heading font-bold text-2xl text-[#D4AF37]">${Number(comision.monto).toFixed(2)}</span>
        </div>
      </motion.div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────
export default function AdminComisiones() {
  const [comisiones, setComisiones] = useState<ComisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [estadoTab, setEstadoTab] = useState<EstadoComision | 'todas'>('pendiente');
  const [tipoFilter, setTipoFilter] = useState<TipoComision | 'todos'>('todos');
  const [nivelFilter, setNivelFilter] = useState<number | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('fecha-desc');

  // Pago batch
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);

  // Modal
  const [detalle, setDetalle] = useState<ComisionRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabaseAdmin
        .from('comisiones')
        .select(`*,
          beneficiario:profiles!beneficiario_id(nombre_completo, codigo_distribuidor),
          origen:profiles!origen_id(nombre_completo, codigo_distribuidor)
        `)
        .order('created_at', { ascending: false });

      const rows: ComisionRow[] = (data ?? []).map((r: Record<string, unknown>) => {
        const ben = r.beneficiario as { nombre_completo?: string; codigo_distribuidor?: string } | null;
        const ori = r.origen as { nombre_completo?: string; codigo_distribuidor?: string } | null;
        return {
          ...(r as unknown as Comision),
          beneficiario_nombre: ben?.nombre_completo ?? '',
          beneficiario_codigo: ben?.codigo_distribuidor ?? '',
          origen_nombre: ori?.nombre_completo ?? '',
          origen_codigo: ori?.codigo_distribuidor ?? '',
        };
      });
      setComisiones(rows);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Filtros aplicados ──
  const filtered = useMemo(() => {
    let list = comisiones;
    if (estadoTab !== 'todas') list = list.filter((c) => c.estado === estadoTab);
    if (tipoFilter !== 'todos') list = list.filter((c) => c.tipo === tipoFilter);
    if (tipoFilter === 'nivel' && nivelFilter !== 'todos') {
      list = list.filter((c) => c.nivel_red === nivelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((c) =>
        (c.beneficiario_nombre ?? '').toLowerCase().includes(q) ||
        (c.beneficiario_codigo ?? '').toLowerCase().includes(q) ||
        (c.origen_nombre ?? '').toLowerCase().includes(q) ||
        (c.origen_codigo ?? '').toLowerCase().includes(q) ||
        (c.descripcion ?? '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    switch (sortBy) {
      case 'fecha-asc': sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'monto-desc': sorted.sort((a, b) => Number(b.monto) - Number(a.monto)); break;
      case 'monto-asc': sorted.sort((a, b) => Number(a.monto) - Number(b.monto)); break;
      default: sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [comisiones, estadoTab, tipoFilter, nivelFilter, search, sortBy]);

  // ── Resumen por tipo (sobre TODAS, sin filtros) ──
  const resumenPorTipo = useMemo(() => {
    const sumByTipo = (tipo: TipoComision, estado?: EstadoComision) =>
      comisiones
        .filter((c) => c.tipo === tipo && (estado ? c.estado === estado : true))
        .reduce((s, c) => s + Number(c.monto), 0);
    const countByTipo = (tipo: TipoComision, estado?: EstadoComision) =>
      comisiones.filter((c) => c.tipo === tipo && (estado ? c.estado === estado : true)).length;

    return {
      afiliacion: {
        total: sumByTipo('afiliacion'),
        pendiente: sumByTipo('afiliacion', 'pendiente'),
        pagado: sumByTipo('afiliacion', 'pagado'),
        count: countByTipo('afiliacion'),
      },
      nivel: {
        total: sumByTipo('nivel'),
        pendiente: sumByTipo('nivel', 'pendiente'),
        pagado: sumByTipo('nivel', 'pagado'),
        count: countByTipo('nivel'),
      },
      binaria: {
        total: sumByTipo('binaria'),
        pendiente: sumByTipo('binaria', 'pendiente'),
        pagado: sumByTipo('binaria', 'pagado'),
        count: countByTipo('binaria'),
      },
    };
  }, [comisiones]);

  // ── Conteo por tab para mostrar badges ──
  const estadoCounts = useMemo(() => {
    const filterByTipo = (list: ComisionRow[]) => {
      if (tipoFilter === 'todos') return list;
      const byTipo = list.filter((c) => c.tipo === tipoFilter);
      if (tipoFilter === 'nivel' && nivelFilter !== 'todos') return byTipo.filter((c) => c.nivel_red === nivelFilter);
      return byTipo;
    };
    return {
      pendiente: filterByTipo(comisiones.filter((c) => c.estado === 'pendiente')).length,
      pagado: filterByTipo(comisiones.filter((c) => c.estado === 'pagado')).length,
      cancelado: filterByTipo(comisiones.filter((c) => c.estado === 'cancelado')).length,
      todas: filterByTipo(comisiones).length,
    };
  }, [comisiones, tipoFilter, nivelFilter]);

  const totalPendienteFiltrado = filtered
    .filter((c) => c.estado === 'pendiente')
    .reduce((s, c) => s + Number(c.monto), 0);
  const pendientesEnVista = filtered.filter((c) => c.estado === 'pendiente');

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const ids = pendientesEnVista.map((c) => c.id);
    if (ids.every((id) => selected.has(id))) {
      setSelected((prev) => { const next = new Set(prev); for (const id of ids) next.delete(id); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); for (const id of ids) next.add(id); return next; });
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

  function resetFilters() {
    setEstadoTab('pendiente');
    setTipoFilter('todos');
    setNivelFilter('todos');
    setSearch('');
    setSortBy('fecha-desc');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Comisiones</h1>
        <p className="text-[#6B7280] text-sm mt-1">
          Gestión de comisiones por tipo · {comisiones.length} comisiones registradas
        </p>
      </div>

      {/* ── Stat cards por tipo ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Referidos */}
        <button
          onClick={() => setTipoFilter('afiliacion')}
          className={`text-left bg-white border-2 rounded-2xl p-5 transition-all ${
            tipoFilter === 'afiliacion'
              ? 'border-blue-400 shadow-[0_8px_24px_rgba(59,130,246,0.15)]'
              : 'border-[#C8D8CB] hover:border-blue-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              40%
            </span>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Referidos directos</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">${resumenPorTipo.afiliacion.total.toFixed(2)}</p>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-amber-600">
              <strong>${resumenPorTipo.afiliacion.pendiente.toFixed(2)}</strong> pendientes
            </span>
            <span className="text-[#1A4E26]">
              <strong>${resumenPorTipo.afiliacion.pagado.toFixed(2)}</strong> pagadas
            </span>
          </div>
          <p className="text-[9px] text-[#9CA3AF] mt-1.5">{resumenPorTipo.afiliacion.count} comisión{resumenPorTipo.afiliacion.count !== 1 ? 'es' : ''}</p>
        </button>

        {/* Por nivel */}
        <button
          onClick={() => setTipoFilter('nivel')}
          className={`text-left bg-white border-2 rounded-2xl p-5 transition-all ${
            tipoFilter === 'nivel'
              ? 'border-[#D4AF37] shadow-[0_8px_24px_rgba(212,175,55,0.18)]'
              : 'border-[#C8D8CB] hover:border-[#D4AF37]/40'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
              <Layers size={20} className="text-[#D4AF37]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded">
              14 niveles
            </span>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Por nivel (escalera)</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">${resumenPorTipo.nivel.total.toFixed(2)}</p>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-amber-600">
              <strong>${resumenPorTipo.nivel.pendiente.toFixed(2)}</strong> pendientes
            </span>
            <span className="text-[#1A4E26]">
              <strong>${resumenPorTipo.nivel.pagado.toFixed(2)}</strong> pagadas
            </span>
          </div>
          <p className="text-[9px] text-[#9CA3AF] mt-1.5">{resumenPorTipo.nivel.count} comisión{resumenPorTipo.nivel.count !== 1 ? 'es' : ''}</p>
        </button>

        {/* Binaria */}
        <button
          onClick={() => setTipoFilter('binaria')}
          className={`text-left bg-white border-2 rounded-2xl p-5 transition-all ${
            tipoFilter === 'binaria'
              ? 'border-purple-400 shadow-[0_8px_24px_rgba(168,85,247,0.15)]'
              : 'border-[#C8D8CB] hover:border-purple-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Network size={20} className="text-purple-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              50%
            </span>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Binaria pareada</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">${resumenPorTipo.binaria.total.toFixed(2)}</p>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-amber-600">
              <strong>${resumenPorTipo.binaria.pendiente.toFixed(2)}</strong> pendientes
            </span>
            <span className="text-[#1A4E26]">
              <strong>${resumenPorTipo.binaria.pagado.toFixed(2)}</strong> pagadas
            </span>
          </div>
          <p className="text-[9px] text-[#9CA3AF] mt-1.5">{resumenPorTipo.binaria.count} comisión{resumenPorTipo.binaria.count !== 1 ? 'es' : ''}</p>
        </button>
      </div>

      {/* ── Total pendiente filtrado + pago batch ─────────────────── */}
      <div className="bg-gradient-to-r from-[#FFFDF5] to-[#FFFEF7] border border-[#D4AF37]/30 rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center shrink-0">
          <DollarSign size={24} className="text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[#6B7280] text-xs">Total pendiente en la vista actual</p>
          <p className="font-heading font-bold text-2xl text-[#D4AF37]">${totalPendienteFiltrado.toFixed(2)}</p>
          <p className="text-[#9CA3AF] text-[10px] mt-0.5">
            {pendientesEnVista.length} comisión{pendientesEnVista.length !== 1 ? 'es' : ''} pendiente{pendientesEnVista.length !== 1 ? 's' : ''}
            {selected.size > 0 && <> · {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}</>}
          </p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={markAsPaid}
            disabled={marking}
            className="px-5 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 disabled:opacity-60 shadow-[0_4px_16px_rgba(26,78,38,0.25)] inline-flex items-center gap-2"
          >
            <CheckCircle2 size={15} />
            {marking ? 'Procesando...' : `Marcar ${selected.size} como Pagadas`}
          </button>
        )}
      </div>

      {/* ── Filtros ─────────────────── */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 mb-4">
        {/* Tipo pills */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {TIPO_PILLS.map((pill) => {
            const isActive = tipoFilter === pill.key;
            return (
              <button
                key={pill.key}
                onClick={() => { setTipoFilter(pill.key); if (pill.key !== 'nivel') setNivelFilter('todos'); }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-[#1A4E26] text-white border-[#1A4E26] shadow-[0_4px_10px_rgba(26,78,38,0.25)]'
                    : `bg-white ${pill.color} border-[#C8D8CB] hover:border-[#A8C2AD]`
                }`}
              >
                <span className={isActive ? 'text-white' : pill.color}>{pill.icon}</span>
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Nivel sub-filter cuando tipo = nivel */}
        {tipoFilter === 'nivel' && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-3 border-t border-[#C8D8CB]/60">
            <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold mr-2">Nivel:</span>
            <button
              onClick={() => setNivelFilter('todos')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                nivelFilter === 'todos'
                  ? 'bg-[#D4AF37] text-[#0B2913]'
                  : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              Todos
            </button>
            {levelCommissions.map((lc) => (
              <button
                key={lc.nivel}
                onClick={() => setNivelFilter(lc.nivel)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                  nivelFilter === lc.nivel
                    ? 'bg-[#D4AF37] text-[#0B2913]'
                    : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                N{lc.nivel} · {lc.porcentaje}%
              </button>
            ))}
          </div>
        )}

        {/* Search + sort */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#C8D8CB]/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código o descripción..."
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
          {(estadoTab !== 'pendiente' || tipoFilter !== 'todos' || nivelFilter !== 'todos' || search) && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#6B7280] hover:text-[#111111] underline flex items-center gap-1"
            >
              <X size={11} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Estado tabs ─────────────────── */}
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
            <TrendingUp size={40} className="mx-auto mb-3 text-[#9CA3AF] opacity-30" />
            <p className="text-lg font-bold mb-1 text-[#111111]">Sin comisiones</p>
            <p className="text-sm mb-5">No hay comisiones con los filtros actuales.</p>
            <button
              onClick={resetFilters}
              className="px-5 py-2 rounded-full bg-[#1A4E26] text-white text-xs font-semibold hover:bg-[#163F1E] transition-all"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {estadoTab === 'pendiente' && pendientesEnVista.length > 0 && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={pendientesEnVista.every((c) => selected.has(c.id))}
                        onChange={toggleAll}
                        className="accent-[#1A4E26]"
                      />
                    </th>
                  )}
                  {['Beneficiario', 'Origen', 'Tipo', 'Monto', 'Fecha y hora', 'Estado', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const porc = c.tipo === 'afiliacion' ? 40 :
                    c.tipo === 'nivel' && c.nivel_red !== null
                      ? levelCommissions.find((l) => l.nivel === c.nivel_red)?.porcentaje
                      : c.tipo === 'binaria' ? 50 : null;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] transition-colors cursor-pointer"
                      onClick={() => setDetalle(c)}
                    >
                      {estadoTab === 'pendiente' && pendientesEnVista.length > 0 && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {c.estado === 'pendiente' && (
                            <input
                              type="checkbox"
                              checked={selected.has(c.id)}
                              onChange={() => toggleSelect(c.id)}
                              className="accent-[#1A4E26]"
                            />
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[#111111] text-xs font-bold">{c.beneficiario_nombre || '—'}</p>
                        <p className="text-[#1A4E26] text-[10px] font-mono">{c.beneficiario_codigo || ''}</p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {c.origen_nombre ? (
                          <>
                            <p className="text-[#6B7280] text-xs font-medium">{c.origen_nombre}</p>
                            <p className="text-[#9CA3AF] text-[10px] font-mono">{c.origen_codigo}</p>
                          </>
                        ) : <span className="text-[#9CA3AF] text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${tipoBadge(c.tipo)}`}>
                            {TIPO_LABEL[c.tipo] ?? c.tipo}
                          </span>
                          {porc !== null && porc !== undefined && (
                            <span className="text-[9px] text-[#9CA3AF] font-mono">
                              {porc}%{c.tipo === 'nivel' && c.nivel_red !== null ? ` · N${c.nivel_red}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#111111] font-bold whitespace-nowrap">
                        ${Number(c.monto).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-[#111111] text-xs font-medium">
                          {new Date(c.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[#9CA3AF] text-[10px]">
                          {new Date(c.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoBadge(c.estado)}`}>
                          {ESTADO_LABEL[c.estado] ?? c.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDetalle(c)}
                          className="inline-flex items-center gap-1.5 text-[#1A4E26] text-[11px] font-bold hover:underline"
                        >
                          <Eye size={12} /> Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer con conteo */}
      {!loading && filtered.length > 0 && (
        <div className="mt-3 text-center text-[10px] text-[#9CA3AF]">
          Mostrando <strong>{filtered.length}</strong> de {comisiones.length} comisiones totales
        </div>
      )}

      {detalle && <DetalleModal comision={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
