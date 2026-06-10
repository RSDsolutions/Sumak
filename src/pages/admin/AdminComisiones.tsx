import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign, X, Eye, ArrowDown, ArrowUp, Calendar, User, Hash,
  Layers, Sparkles, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import { levelCommissions } from '../../data';
import type { Comision, Profile } from '../../lib/types';

type FilterTab = 'todas' | 'pendiente' | 'pagado';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'pagado', label: 'Pagadas' },
  { key: 'todas', label: 'Todas' },
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

  // Porcentaje según el tipo
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
        {/* Header */}
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
              {/* Origen y Beneficiario */}
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

              {/* Descripción */}
              {comision.descripcion && (
                <div className="bg-[#F4F7F5] rounded-2xl p-4 mb-5">
                  <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold mb-2">Descripción</p>
                  <p className="text-[#111111] text-sm leading-relaxed">{comision.descripcion}</p>
                </div>
              )}

              {/* Datos técnicos */}
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

              {/* IDs técnicos */}
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

        {/* Total */}
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
  const [tab, setTab] = useState<FilterTab>('pendiente');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [detalle, setDetalle] = useState<ComisionRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      let query = supabaseAdmin
        .from('comisiones')
        .select(`*,
          beneficiario:profiles!beneficiario_id(nombre_completo, codigo_distribuidor),
          origen:profiles!origen_id(nombre_completo, codigo_distribuidor)
        `)
        .order('created_at', { ascending: false });
      if (tab !== 'todas') query = query.eq('estado', tab);
      const { data } = await query;

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
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Comisiones</h1>
        <p className="text-[#6B7280] text-sm mt-1">Gestión de pagos y comisiones de distribuidores</p>
      </div>

      {/* Total pendiente */}
      <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-6 mb-6 flex items-center gap-4 shadow-[0_0_20px_rgba(212,175,55,0.06)]">
        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
          <DollarSign size={24} className="text-[#D4AF37]" />
        </div>
        <div>
          <p className="text-[#6B7280] text-sm">Total Pendiente de Pago</p>
          <p className="font-heading font-bold text-2xl text-[#D4AF37]">${totalPendiente.toFixed(2)}</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={markAsPaid}
            disabled={marking}
            className="ml-auto px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 disabled:opacity-60 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
          >
            {marking ? 'Procesando...' : `Marcar ${selected.size} como Pagadas`}
          </button>
        )}
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

      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : comisiones.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <p className="text-lg font-medium mb-2">Sin comisiones</p>
            <p className="text-sm">No hay comisiones con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {tab === 'pendiente' && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected.size === pendientes.length && pendientes.length > 0}
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
                {comisiones.map((c) => {
                  const porc = c.tipo === 'afiliacion' ? 40 :
                    c.tipo === 'nivel' && c.nivel_red !== null
                      ? levelCommissions.find((l) => l.nivel === c.nivel_red)?.porcentaje
                      : c.tipo === 'binaria' ? 50 : null;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-[#C8D8CB] hover:bg-[#FAFBFA] transition-colors cursor-pointer"
                      onClick={() => setDetalle(c)}
                    >
                      {tab === 'pendiente' && (
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

      {detalle && <DetalleModal comision={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
