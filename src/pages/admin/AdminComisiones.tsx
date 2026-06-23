import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign, X, Eye, ArrowDown, ArrowUp, Calendar, Hash,
  Layers, Sparkles, CheckCircle2, Clock, AlertCircle, Search,
  Users, Network, TrendingUp, Filter, Upload, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { levelCommissions } from '../../data';
import { logger } from '../../lib/logger';
import Modal from '../../components/Modal';
import type { Comision, Profile, TipoComision, EstadoComision } from '../../lib/types';

// ── Tabs by estado ──
const ESTADO_TABS: { key: EstadoComision | 'todas'; label: string }[] = [
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'retenida', label: 'Retenidas' },
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
    retenida: 'bg-slate-100 text-slate-600 border border-slate-300',
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
  retenida: 'Retenida',
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
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
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
                  {comision.estado === 'retenida' && <Lock size={10} />}
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
/**
 * Scope:
 * - 'no-afiliacion' (default): todas las comisiones EXCEPTO el bono por
 *   afiliacion (40% al patrocinador directo). Es lo que ve /admin/comisiones.
 * - 'afiliacion': SOLO el bono por afiliacion. Es la pagina dedicada
 *   /admin/bono-afiliacion.
 */
export interface AdminComisionesProps {
  scope?: 'no-afiliacion' | 'afiliacion';
}

export default function AdminComisiones({ scope = 'no-afiliacion' }: AdminComisionesProps) {
  const isAfiliacionScope = scope === 'afiliacion';

  const [comisiones, setComisiones] = useState<ComisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [estadoTab, setEstadoTab] = useState<EstadoComision | 'todas'>('pendiente');
  // En scope='afiliacion' el filtro de tipo no aplica (todo es afiliacion).
  const [tipoFilter, setTipoFilter] = useState<TipoComision | 'todos'>('todos');
  const [nivelFilter, setNivelFilter] = useState<number | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('fecha-desc');

  // Pago uno-a-uno (no mas batch).
  const [payingId, setPayingId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [voucherNumero, setVoucherNumero] = useState('');
  const [payError, setPayError] = useState('');
  // useAuth no es necesario aqui: la RPC mark_comision_pagada toma
  // pagado_por de auth.uid() server-side (mig 021).

  // Modal de detalle
  const [detalle, setDetalle] = useState<ComisionRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      // En scope='no-afiliacion' excluimos a los admins como beneficiarios
      // (sus comisiones por nivel/binaria viven en /admin/mis-comisiones).
      //
      // En scope='afiliacion' SI incluimos a los admins: cuando el admin
      // refiere a alguien directamente tambien gana el bono del 40% y
      // necesita aparecer en esta pagina para que se le pueda registrar
      // el pago con voucher, igual que cualquier otro patrocinador.
      let adminIds: string[] = [];
      if (!isAfiliacionScope) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('rol', 'admin');
        adminIds = (admins ?? []).map((a) => a.id);
      }

      let query = supabase
        .from('comisiones')
        .select(`*,
          beneficiario:profiles!beneficiario_id(nombre_completo, codigo_distribuidor),
          origen:profiles!origen_id(nombre_completo, codigo_distribuidor)
        `)
        .order('created_at', { ascending: false });
      if (adminIds.length > 0) {
        query = query.not('beneficiario_id', 'in', `(${adminIds.join(',')})`);
      }
      // Separacion de scope: la pagina de Bono Afiliacion solo muestra
      // el tipo 'afiliacion' y la pagina principal de Comisiones excluye
      // ese tipo (queda en su propia seccion).
      if (isAfiliacionScope) {
        query = query.eq('tipo', 'afiliacion');
      } else {
        query = query.neq('tipo', 'afiliacion');
      }
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
      setPayingId(null);
    } finally {
      setLoading(false);
    }
  }

  // IMPORTANTE: incluir isAfiliacionScope en las deps. AdminComisiones se
  // renderiza desde DOS rutas (/admin/comisiones y /admin/bono-afiliacion).
  // React Router NO desmonta el componente al navegar entre ellas porque
  // el element es el mismo — solo cambia el prop `scope`. Sin esta dep el
  // useEffect inicial corria una sola vez y nunca refrescaba al cambiar
  // de pestana, obligando al usuario a F5.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Reseteamos filtros visuales al cambiar de scope para evitar mezcla.
    setEstadoTab('pendiente');
    setTipoFilter('todos');
    setNivelFilter('todos');
    setSearch('');
    setSortBy('fecha-desc');
    setDetalle(null);
    setPayModalOpen(false);
    setPayingId(null);
    load();
  }, [isAfiliacionScope]);

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
      retenida: filterByTipo(comisiones.filter((c) => c.estado === 'retenida')).length,
      pagado: filterByTipo(comisiones.filter((c) => c.estado === 'pagado')).length,
      cancelado: filterByTipo(comisiones.filter((c) => c.estado === 'cancelado')).length,
      todas: filterByTipo(comisiones).length,
    };
  }, [comisiones, tipoFilter, nivelFilter]);

  const totalPendienteFiltrado = filtered
    .filter((c) => c.estado === 'pendiente')
    .reduce((s, c) => s + Number(c.monto), 0);
  const pendientesEnVista = filtered.filter((c) => c.estado === 'pendiente');
  const comisionEnPago = payingId ? comisiones.find((c) => c.id === payingId) : null;

  function openPayModal(id: string) {
    setPayingId(id);
    setPayError('');
    setVoucherFile(null);
    setVoucherPreview(null);
    setVoucherNumero('');
    setPayModalOpen(true);
  }

  function closePayModal() {
    if (marking) return;
    setPayModalOpen(false);
    setPayingId(null);
  }

  function onVoucherFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setPayError('La imagen no debe superar los 5 MB.');
      return;
    }
    setPayError('');
    setVoucherFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setVoucherPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // Marca UNA SOLA comision como pagada. Antes esto era batch, ahora se
  // procesa de a una para evitar errores de pagar en bloque.
  async function markAsPaid() {
    if (!payingId) return;
    setMarking(true);
    setPayError('');
    try {
      const id = payingId;
      let voucherUrl: string | null = null;

      if (voucherFile) {
        const ext = voucherFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `${id}/voucher-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('comisiones-vouchers')
          .upload(path, voucherFile, { upsert: true });
        if (upErr) throw new Error(upErr.message);
        voucherUrl = path;
      }

      // RPC mark_comision_pagada valida internamente que el caller sea
      // admin u operaciones (mig 021). Devuelve already_paid=true si la
      // comision ya estaba pagada (idempotente).
      const numero = voucherNumero.trim() || null;
      const { error: updErr } = await supabase.rpc('mark_comision_pagada', {
        p_id: id,
        p_voucher_url: voucherUrl,
        p_voucher_numero: numero,
      });
      if (updErr) throw new Error(updErr.message);

      setPayModalOpen(false);
      setPayingId(null);
      await load();
    } catch (err) {
      logger.error('markAsPaid error', err);
      setPayError(err instanceof Error ? err.message : 'Error al registrar el pago.');
    } finally {
      setMarking(false);
    }
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
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">
          {isAfiliacionScope ? 'Bono por Afiliación (Referidos)' : 'Comisiones de Distribuidores'}
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          {isAfiliacionScope ? (
            <>{comisiones.length} bono{comisiones.length !== 1 ? 's' : ''} · 40% del paquete del referido. Incluye al admin cuando refiere directamente. Las comisiones por nivel y binaria se gestionan en <span className="text-[#D4AF37] font-semibold">Comisiones</span>.</>
          ) : (
            <>{comisiones.length} comisiones · sin afiliación (ver <span className="text-[#D4AF37] font-semibold">Bono Afiliación</span>) ni admin (ver <span className="text-[#D4AF37] font-semibold">Mis Comisiones</span>)</>
          )}
        </p>
      </div>

      {/* ── Stat cards por tipo: solo en scope 'no-afiliacion' (en afiliacion no hay tipos) ── */}
      {!isAfiliacionScope && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
      )}

      {/* ── Card resumen en scope 'afiliacion' (un solo tipo, sin pills) ── */}
      {isAfiliacionScope && (
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              40% del paquete
            </span>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Total bonos por referido directo</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">${resumenPorTipo.afiliacion.total.toFixed(2)}</p>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-amber-600">
              <strong>${resumenPorTipo.afiliacion.pendiente.toFixed(2)}</strong> pendientes
            </span>
            <span className="text-[#1A4E26]">
              <strong>${resumenPorTipo.afiliacion.pagado.toFixed(2)}</strong> pagadas
            </span>
          </div>
          <p className="text-[9px] text-[#9CA3AF] mt-1.5">{resumenPorTipo.afiliacion.count} bono{resumenPorTipo.afiliacion.count !== 1 ? 's' : ''} total</p>
        </div>
      )}

      {/* ── Total pendiente filtrado (solo info, ya no batch) ─────────────────── */}
      <div className="bg-gradient-to-r from-[#FFFDF5] to-[#FFFEF7] border border-[#D4AF37]/30 rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center shrink-0">
          <DollarSign size={24} className="text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[#6B7280] text-xs">Total pendiente en la vista actual</p>
          <p className="font-heading font-bold text-2xl text-[#D4AF37]">${totalPendienteFiltrado.toFixed(2)}</p>
          <p className="text-[#9CA3AF] text-[10px] mt-0.5">
            {pendientesEnVista.length} comisión{pendientesEnVista.length !== 1 ? 'es' : ''} pendiente{pendientesEnVista.length !== 1 ? 's' : ''} · pagá una a una desde la tabla
          </p>
        </div>
      </div>

      {/* ── Filtros ─────────────────── */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 mb-4">
        {/* Tipo pills — solo en scope 'no-afiliacion' (filtra entre nivel/binaria) */}
        {!isAfiliacionScope && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {TIPO_PILLS.filter((p) => p.key !== 'afiliacion').map((pill) => {
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
        )}

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
                  {['Beneficiario', 'Origen', 'Tipo', 'Monto', 'Fecha y hora', 'Estado', 'Acción'].map((h) => (
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.estado === 'pendiente' ? (
                            <button
                              onClick={() => openPayModal(c.id)}
                              disabled={marking}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] text-white text-[11px] font-bold hover:bg-[#163F1E] transition-all disabled:opacity-60 shadow-[0_2px_8px_rgba(26,78,38,0.2)]"
                            >
                              <CheckCircle2 size={12} /> Pagar
                            </button>
                          ) : c.estado === 'retenida' ? (
                            <span
                              title="El beneficiario debe activarse (>= $100 en el mes) para poder pagar esta comision"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold cursor-not-allowed"
                            >
                              <Lock size={12} /> Bloqueada
                            </span>
                          ) : null}
                          <button
                            onClick={() => setDetalle(c)}
                            className="inline-flex items-center gap-1 text-[#1A4E26] text-[11px] font-bold hover:underline"
                          >
                            <Eye size={11} /> Detalle
                          </button>
                        </div>
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

      {/* Modal de pago con voucher opcional — uno a uno */}
      <Modal
        open={payModalOpen}
        onClose={closePayModal}
        title="Registrar pago de comisión"
        subtitle={comisionEnPago ? `${comisionEnPago.beneficiario_nombre ?? '—'} · ${comisionEnPago.beneficiario_codigo ?? ''}` : ''}
        size="md"
        labelledById="pay-comisiones-title"
      >
        <div className="px-6 py-5 space-y-4">
          {/* Resumen de UNA sola comision */}
          <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-1">Monto a pagar</p>
            <p className="font-heading font-bold text-2xl text-[#1A4E26]">
              ${comisionEnPago ? Number(comisionEnPago.monto).toFixed(2) : '0.00'}
            </p>
            {comisionEnPago && (
              <p className="text-[#1A4E26]/80 text-xs mt-1">
                {TIPO_LABEL[comisionEnPago.tipo] ?? comisionEnPago.tipo}
                {comisionEnPago.tipo === 'nivel' && comisionEnPago.nivel_red !== null && ` · Nivel ${comisionEnPago.nivel_red}`}
                {' · '}quedará como <strong>Pagada</strong>.
              </p>
            )}
          </div>

          {/* N° transferencia */}
          <div>
            <label htmlFor="voucher-numero" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
              N° de transferencia <span className="text-[#9CA3AF] font-normal">(opcional, recomendado)</span>
            </label>
            <input
              id="voucher-numero"
              type="text"
              value={voucherNumero}
              onChange={(e) => setVoucherNumero(e.target.value)}
              placeholder="Ej: 0123456789"
              autoComplete="off"
              className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm font-mono placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
            />
          </div>

          {/* Voucher */}
          <div>
            <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
              Comprobante <span className="text-[#9CA3AF] font-normal">(opcional, recomendado)</span>
            </label>
            {voucherPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-[#C8D8CB] bg-[#F4F7F5]">
                <img src={voucherPreview} alt="Voucher" className="w-full max-h-56 object-contain" loading="lazy" />
                <button
                  type="button"
                  onClick={() => { setVoucherFile(null); setVoucherPreview(null); }}
                  className="absolute top-2 right-2 bg-white/95 border border-[#C8D8CB] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-red-600 transition-colors inline-flex items-center gap-1"
                >
                  <X size={12} aria-hidden="true" /> Cambiar
                </button>
              </div>
            ) : (
              <label className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#C8D8CB] hover:border-[#A8C2AD] rounded-xl p-6 cursor-pointer transition-all bg-[#F4F7F5]">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onVoucherFile(f); }}
                />
                <Upload size={22} className="text-[#9CA3AF]" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-[#6B7280] text-xs font-medium">Sube el comprobante</p>
                  <p className="text-[#9CA3AF] text-[10px] mt-0.5">JPG, PNG, PDF · Máx 5 MB</p>
                </div>
              </label>
            )}
            {voucherFile && (
              <p className="text-[#1A4E26] text-[11px] mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 size={12} aria-hidden="true" />
                <span className="font-medium">{voucherFile.name}</span>
                <span className="text-[#9CA3AF]">({(voucherFile.size / 1024).toFixed(0)} KB)</span>
              </p>
            )}
          </div>

          {payError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs flex items-start gap-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
              {payError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closePayModal}
              disabled={marking}
              className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={markAsPaid}
              disabled={marking}
              className="flex-[1.5] py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {marking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Confirmar pago
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
