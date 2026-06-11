import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, X, Eye,
  ArrowUp, ArrowDown, Calendar, Hash, Layers, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { levelCommissions } from '../../data';
import type { Comision, Profile } from '../../lib/types';

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
  afiliacion: 'Referido directo',
  nivel: 'Por nivel',
  binaria: 'Binaria',
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
};

// ── DETAIL MODAL ──────────────────────────────────────────
function DetalleModal({ comision, onClose }: { comision: Comision; onClose: () => void }) {
  // PERF-004: el origen viene ya joineado desde la query principal,
  // no hace falta otro fetch por modal abierto. Eliminamos N+1.
  const origen = (comision.origen ?? null) as Profile | null;
  const loading = false;

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
        className="bg-white border border-[#C8D8CB] rounded-3xl w-full max-w-xl shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-[#C8D8CB] sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-1 flex items-center gap-1.5">
                <Sparkles size={11} /> Mi comisión
              </p>
              <h3 className="font-heading font-bold text-2xl text-[#111111]">
                ${Number(comision.monto).toFixed(2)}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tipoBadge(comision.tipo)}`}>
                  {TIPO_LABELS[comision.tipo] ?? comision.tipo}
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
              {/* Origen */}
              {origen && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-blue-700 font-bold mb-2 flex items-center gap-1.5">
                    <ArrowUp size={11} /> De dónde viene esta comisión
                  </p>
                  <p className="text-[#111111] text-sm font-bold leading-tight">{origen.nombre_completo}</p>
                  <p className="text-blue-700 text-xs font-mono mt-1">{origen.codigo_distribuidor ?? '—'}</p>
                  <p className="text-[#6B7280] text-xs mt-2 leading-relaxed">
                    {comision.tipo === 'afiliacion'
                      ? 'Te corresponde como patrocinador directo de este distribuidor (40% del precio de su paquete).'
                      : comision.tipo === 'nivel'
                      ? `Te corresponde por su pedido — está en tu red al nivel ${comision.nivel_red}${porcentaje !== null ? ` (${porcentaje}% sobre los puntos del pedido)` : ''}.`
                      : 'Te corresponde por volumen binario pareado.'}
                  </p>
                </div>
              )}

              {/* Beneficiario (yo) */}
              <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-2xl p-4 mb-4">
                <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-2 flex items-center gap-1.5">
                  <ArrowDown size={11} /> Para ti
                </p>
                <p className="text-[#111111] text-sm leading-relaxed">
                  {comision.estado === 'pagado'
                    ? 'Esta comisión ya fue marcada como pagada por el administrador.'
                    : comision.estado === 'cancelado'
                    ? 'Esta comisión fue cancelada (por ejemplo, si el pedido origen fue anulado).'
                    : 'Esta comisión está pendiente de pago por parte del administrador.'}
                </p>
              </div>

              {/* Descripción */}
              {comision.descripcion && (
                <div className="bg-[#F4F7F5] rounded-2xl p-4 mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold mb-2">Descripción</p>
                  <p className="text-[#111111] text-sm leading-relaxed">{comision.descripcion}</p>
                </div>
              )}

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white border border-[#C8D8CB] rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-1 flex items-center gap-1">
                    <Calendar size={10} /> Generada
                  </p>
                  <p className="text-[#111111] text-xs font-bold">
                    {new Date(comision.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-[#6B7280] text-[11px]">
                    {new Date(comision.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
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

              {/* ID */}
              <div className="bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-1 flex items-center gap-1.5">
                  <Hash size={10} /> ID
                </p>
                <p className="text-[#6B7280] text-[10px] font-mono break-all">{comision.id}</p>
              </div>
            </>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-[#0F2E18] to-[#1A4E26] rounded-b-3xl">
          <div>
            <p className="text-[#D4AF37] text-[9px] uppercase tracking-widest font-bold">Monto</p>
            {porcentaje !== null && (
              <p className="text-white/65 text-[10px]">
                {comision.tipo === 'afiliacion' ? '40% del paquete' :
                 comision.tipo === 'nivel' ? `${porcentaje}% (nivel ${comision.nivel_red})` :
                 '50% del pareado'}
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
export default function MisComisiones() {
  const { user } = useAuth();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [compraCalificada, setCompraCalificada] = useState(false);
  const [detalle, setDetalle] = useState<Comision | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const [{ data }, { data: compraData }] = await Promise.all([
        // PERF-004: join al origen en la misma query para evitar N+1
        // al abrir el modal de detalle. Sólo traemos campos no sensibles
        // del origen para reducir payload.
        supabase
          .from('comisiones')
          .select('*, origen:profiles!origen_id(id, nombre_completo, codigo_distribuidor, paquete, puntos)')
          .eq('beneficiario_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase.from('pedidos').select('id').eq('distribuidor_id', user!.id).in('estado', ['procesando', 'enviado', 'entregado']).gte('total', 100).gte('created_at', startOfMonth).limit(1),
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
        <p className="text-[#6B7280] text-sm mt-1">Historial completo de tus comisiones y ganancias · toca cualquier fila para ver el detalle</p>
      </div>

      {/* Banner elegibilidad */}
      {!loading && (
        <div className={`rounded-xl px-5 py-4 mb-6 border ${
          compraCalificada
            ? 'bg-[#EBF4ED] border-[#1A4E26]/20'
            : 'bg-amber-50 border-amber-200'
        }`}>
          {compraCalificada ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-[#1A4E26]" />
              <div className="text-sm text-[#1A4E26]">
                <p className="font-bold mb-1">Habilitado para recibir comisiones este mes</p>
                <p className="text-[#1A4E26]/80 text-xs leading-relaxed">
                  Recuerda: el contador se reinicia cada mes. Tienes todo el próximo mes para hacer
                  una compra de $100 o más en un solo pedido y mantener tu cupo a comisiones.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm font-medium text-amber-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>Debes realizar una <strong>compra de $100 o más en un solo pedido</strong> este mes para recibir comisiones</span>
              <Link to="/dashboard/pedido/nuevo" className="ml-auto shrink-0 underline text-xs">Comprar</Link>
            </div>
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
                  {['Tipo', 'Descripción', 'Monto', 'Estado', 'Fecha y hora', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
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
                      onClick={() => setDetalle(c)}
                      className="border-b border-[#C8D8CB] hover:bg-[#FAFBFA] transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${tipoBadge(c.tipo)}`}>
                            {TIPO_LABELS[c.tipo] ?? c.tipo}
                          </span>
                          {porc !== null && porc !== undefined && (
                            <span className="text-[9px] text-[#9CA3AF] font-mono">
                              {porc}%{c.tipo === 'nivel' && c.nivel_red !== null ? ` · N${c.nivel_red}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[#6B7280] text-xs max-w-[250px] truncate">{c.descripcion ?? '—'}</td>
                      <td className="px-6 py-3 text-[#111111] font-bold whitespace-nowrap">
                        ${Number(c.monto).toFixed(2)}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoBadge(c.estado)}`}>
                          {ESTADO_LABEL[c.estado] ?? c.estado}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <p className="text-[#111111] text-xs font-medium">
                          {new Date(c.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[#9CA3AF] text-[10px]">
                          {new Date(c.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
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
