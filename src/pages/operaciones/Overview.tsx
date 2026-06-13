import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShoppingCart, DollarSign, Calendar, TrendingUp,
  AlertCircle, Clock, CheckCircle2, ArrowRight, Sparkles, Package, Truck, XCircle,
  Star, Eye, ExternalLink, FileWarning,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { logger } from '../../lib/logger';
import {
  pedidoBadgeClass, pedidoLabel,
} from '../../lib/badges';

interface PedidoRow {
  id: string;
  distribuidor_id: string;
  total: number;
  estado: 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';
  voucher_url: string | null;
  voucher_numero: string | null;
  banco_destino: string | null;
  incidencia: string | null;
  created_at: string;
  distribuidor?: { nombre_completo: string; codigo_distribuidor: string | null };
}

interface ComisionAgg {
  monto_pendiente: number;
  count_pendiente: number;
  monto_pagado_mes: number;
  count_pagado_mes: number;
}

interface Stats {
  pedidosPorProcesar: number;
  pedidosEnviadosPendienteEntrega: number;
  totalFacturadoMes: number;
  countPedidosMes: number;
  ultimosPedidosPorProcesar: PedidoRow[];
  incidenciasAbiertas: PedidoRow[];
  comisiones: ComisionAgg;
}

const ESTADOS_ACTIVOS = ['procesando', 'enviado', 'entregado'] as const;

function startOfMonthISO(): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
}

function moneda(n: number): string {
  return `$${n.toFixed(2)}`;
}

interface KPIProps {
  to: string;
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  borderColor?: string;
  urgent?: boolean;
  delay?: number;
}

function KPI({ to, label, value, sub, icon, iconBg, iconColor, borderColor, urgent, delay = 0 }: KPIProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Link
        to={to}
        className={`group block bg-white border-2 rounded-2xl p-5 transition-all hover:shadow-[0_8px_24px_rgba(15,46,24,0.12)] hover:-translate-y-0.5 ${
          urgent ? 'border-amber-300' : (borderColor ?? 'border-[#C8D8CB]')
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
            <span className={iconColor}>{icon}</span>
          </div>
          {urgent && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-0.5 inline-flex items-center gap-1">
              <AlertCircle size={10} aria-hidden="true" /> Atender
            </span>
          )}
        </div>
        <p className="text-[#6B7280] text-xs mb-1">{label}</p>
        <p className="font-heading font-bold text-2xl text-[#111111]">{value}</p>
        {sub && <p className="text-[10px] text-[#9CA3AF] mt-1">{sub}</p>}
        <div className="mt-3 inline-flex items-center gap-1 text-[#1A4E26] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalle <ArrowRight size={12} aria-hidden="true" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function OperacionesOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const startMonth = startOfMonthISO();

        const [
          pedidosRes,
          comisionesPendRes,
          comisionesPagMesRes,
        ] = await Promise.all([
          supabase
            .from('pedidos')
            .select('id, distribuidor_id, total, estado, voucher_url, voucher_numero, banco_destino, incidencia, created_at, distribuidor:profiles!distribuidor_id(nombre_completo, codigo_distribuidor)')
            .gte('created_at', startMonth)
            .order('created_at', { ascending: false }),
          supabase
            .from('comisiones')
            .select('id, monto, estado')
            .eq('estado', 'pendiente'),
          supabase
            .from('comisiones')
            .select('id, monto')
            .eq('estado', 'pagado')
            .gte('pagado_at', startMonth),
        ]);

        const pedidos = (pedidosRes.data ?? []).map((p: Record<string, unknown>) => {
          const d = p.distribuidor as { nombre_completo?: string; codigo_distribuidor?: string | null } | null;
          return {
            ...(p as unknown as PedidoRow),
            distribuidor: d ? { nombre_completo: d.nombre_completo ?? '—', codigo_distribuidor: d.codigo_distribuidor ?? null } : undefined,
          };
        }) as PedidoRow[];

        const pedidosPorProcesar = pedidos.filter((p) => p.estado === 'procesando');
        const pedidosEnviadosPendienteEntrega = pedidos.filter((p) => p.estado === 'enviado');
        const activos = pedidos.filter((p) => (ESTADOS_ACTIVOS as readonly string[]).includes(p.estado));
        const totalFacturadoMes = activos.reduce((s, p) => s + Number(p.total), 0);
        const incidenciasAbiertas = pedidos.filter((p) => !!p.incidencia);

        const comisionesPend = (comisionesPendRes.data ?? []) as { monto: number }[];
        const comisionesPagMes = (comisionesPagMesRes.data ?? []) as { monto: number }[];

        const comisionesAgg: ComisionAgg = {
          monto_pendiente: comisionesPend.reduce((s, c) => s + Number(c.monto), 0),
          count_pendiente: comisionesPend.length,
          monto_pagado_mes: comisionesPagMes.reduce((s, c) => s + Number(c.monto), 0),
          count_pagado_mes: comisionesPagMes.length,
        };

        setStats({
          pedidosPorProcesar: pedidosPorProcesar.length,
          pedidosEnviadosPendienteEntrega: pedidosEnviadosPendienteEntrega.length,
          totalFacturadoMes,
          countPedidosMes: activos.length,
          ultimosPedidosPorProcesar: pedidosPorProcesar.slice(0, 6),
          incidenciasAbiertas,
          comisiones: comisionesAgg,
        });
      } catch (err) {
        logger.error('Operaciones overview load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const nowMonth = useMemo(
    () => new Date().toLocaleString('es-EC', { month: 'long', year: 'numeric' }),
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-[#6B7280]">
        No se pudieron cargar las métricas. Recarga la página o contacta a soporte.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">
            Bienvenido, {profile?.nombre_completo?.split(' ')[0] ?? 'Operaciones'}
          </h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-sky-700 bg-sky-100 border border-sky-200">
            <Sparkles size={10} aria-hidden="true" /> Panel de Operaciones
          </span>
        </div>
        <p className="text-[#6B7280] text-sm mt-1">
          Comisiones e ingresos · <span className="capitalize">{nowMonth}</span>
        </p>
      </div>

      {/* KPIs (3 cards: pedidos por procesar / comisiones por pagar / facturado mes) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPI
          to="/operaciones/pedidos"
          label="Pedidos por procesar"
          value={String(stats.pedidosPorProcesar)}
          sub={`${stats.pedidosEnviadosPendienteEntrega} en camino · esperando recepción`}
          icon={<Package size={20} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          urgent={stats.pedidosPorProcesar > 0}
          delay={0.05}
        />
        <KPI
          to="/operaciones/comisiones"
          label="Comisiones por pagar"
          value={moneda(stats.comisiones.monto_pendiente)}
          sub={`${stats.comisiones.count_pendiente} ítem${stats.comisiones.count_pendiente !== 1 ? 's' : ''} pendientes`}
          icon={<DollarSign size={20} />}
          iconBg="bg-[#D4AF37]/10"
          iconColor="text-[#D4AF37]"
          urgent={stats.comisiones.count_pendiente > 0}
          delay={0.1}
        />
        <KPI
          to="/operaciones/pedidos"
          label="Facturado este mes"
          value={moneda(stats.totalFacturadoMes)}
          sub={`${stats.countPedidosMes} pedido${stats.countPedidosMes !== 1 ? 's' : ''} no cancelados`}
          icon={<TrendingUp size={20} />}
          iconBg="bg-[#1A4E26]/10"
          iconColor="text-[#1A4E26]"
          delay={0.15}
        />
      </div>

      {/* Comisiones pagadas mes + Pedidos enviados pendiente entrega */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
          className="bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] text-white rounded-2xl p-5 flex items-start gap-4"
        >
          <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={22} className="text-[#D4AF37]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#D4AF37] text-[10px] uppercase tracking-widest font-bold">Comisiones pagadas en {nowMonth.split(' ')[0]}</p>
            <p className="font-heading font-bold text-2xl text-white mt-1">{moneda(stats.comisiones.monto_pagado_mes)}</p>
            <p className="text-white/65 text-xs mt-1">{stats.comisiones.count_pagado_mes} transferencia{stats.comisiones.count_pagado_mes !== 1 ? 's' : ''} realizadas</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }}
          className="bg-white border border-[#C8D8CB] rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Truck size={20} className="text-purple-600" aria-hidden="true" />
            </div>
            <Link to="/operaciones/pedidos" className="text-[#1A4E26] text-[11px] font-semibold hover:underline inline-flex items-center gap-1">
              Ver todos <ArrowRight size={11} aria-hidden="true" />
            </Link>
          </div>
          <p className="text-[#6B7280] text-xs mb-1">Pedidos enviados</p>
          <p className="font-heading font-bold text-2xl text-[#111111]">{stats.pedidosEnviadosPendienteEntrega}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">esperando confirmación de recepción por parte del distribuidor</p>
        </motion.div>
      </div>

      {/* Incidencias abiertas (si hay) */}
      {stats.incidenciasAbiertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-amber-200">
            <h2 className="font-heading font-bold text-amber-900 text-sm flex items-center gap-2">
              <FileWarning size={14} className="text-amber-700" aria-hidden="true" />
              Incidencias reportadas por distribuidores
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-300 rounded px-2 py-0.5">
              {stats.incidenciasAbiertas.length} abierta{stats.incidenciasAbiertas.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-amber-200">
            {stats.incidenciasAbiertas.slice(0, 6).map((p) => (
              <div key={p.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-[#111111] text-sm font-semibold truncate">{p.distribuidor?.nombre_completo ?? '—'}</p>
                    <p className="text-[#9CA3AF] text-[10px] font-mono">{p.distribuidor?.codigo_distribuidor ?? ''}</p>
                  </div>
                  <p className="font-heading font-bold text-[#1A4E26] text-sm whitespace-nowrap">{moneda(Number(p.total))}</p>
                </div>
                {p.incidencia && (
                  <p className="text-amber-900 text-xs leading-relaxed bg-white/60 rounded-lg p-2 border border-amber-200">
                    {p.incidencia}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pedidos por procesar */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5]">
          <h2 className="font-heading font-bold text-[#111111] text-sm flex items-center gap-2">
            <Package size={14} className="text-blue-600" aria-hidden="true" />
            Pedidos por procesar
          </h2>
          <Link to="/operaciones/pedidos" className="text-[#1A4E26] text-xs font-semibold hover:underline flex items-center gap-1">
            Ver todos <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
        {stats.ultimosPedidosPorProcesar.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-[#1A4E26] opacity-50" aria-hidden="true" />
            <p className="text-[#6B7280] text-sm">Sin pedidos por procesar. ✓</p>
          </div>
        ) : (
          <div className="divide-y divide-[#C8D8CB]">
            {stats.ultimosPedidosPorProcesar.map((p) => (
              <div key={p.id} className="px-5 py-3 hover:bg-[#FAFBFA] transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-[#111111] text-sm font-semibold truncate">
                      {p.distribuidor?.nombre_completo ?? '—'}
                    </p>
                    <p className="text-[#9CA3AF] text-[10px] font-mono">
                      {p.distribuidor?.codigo_distribuidor ?? ''}
                    </p>
                  </div>
                  <p className="font-heading font-bold text-[#1A4E26] text-sm whitespace-nowrap">
                    {moneda(Number(p.total))}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${pedidoBadgeClass(p.estado)}`}>
                    {pedidoLabel(p.estado)}
                  </span>
                  {p.voucher_numero && (
                    <span className="text-[10px] text-[#6B7280] inline-flex items-center gap-1 font-mono">
                      <Star size={9} aria-hidden="true" /> {p.voucher_numero}
                    </span>
                  )}
                  {p.banco_destino && (
                    <span className="text-[10px] text-[#6B7280]">{p.banco_destino}</span>
                  )}
                  <span className="text-[10px] text-[#9CA3AF] inline-flex items-center gap-1 ml-auto">
                    <Clock size={9} aria-hidden="true" />
                    {new Date(p.created_at).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atajos */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/operaciones/pedidos"
          className="bg-white border border-[#C8D8CB] rounded-xl p-4 hover:border-[#1A4E26] transition-all group"
        >
          <ShoppingCart size={18} className="text-blue-600 mb-2" aria-hidden="true" />
          <p className="text-[#111111] text-sm font-bold">Procesar pedidos</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Cambiar estado y subir voucher de envío</p>
        </Link>
        <Link
          to="/operaciones/comisiones"
          className="bg-white border border-[#C8D8CB] rounded-xl p-4 hover:border-[#1A4E26] transition-all group"
        >
          <DollarSign size={18} className="text-[#D4AF37] mb-2" aria-hidden="true" />
          <p className="text-[#111111] text-sm font-bold">Pagar comisiones</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Marcar como pagadas con voucher</p>
        </Link>
      </div>

      {/* Recordatorio del flujo de pedido */}
      <div className="mt-6 bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-3 flex items-center gap-2">
          Flujo de pedido
          <span className="text-[#9CA3AF] normal-case tracking-normal font-normal">(click en una etapa para ir al listado filtrado)</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {([
            { key: 'procesando', icon: <Package size={12} />, desc: 'voucher subido, esperando empaque' },
            { key: 'enviado', icon: <Truck size={12} />, desc: 'guía cargada, en tránsito' },
            { key: 'entregado', icon: <CheckCircle2 size={12} />, desc: 'distribuidor confirmó recepción (inmutable)' },
            { key: 'cancelado', icon: <XCircle size={12} />, desc: 'solo admin' },
          ] as const).map((e, i, arr) => (
            <div key={e.key} className="flex items-center gap-2">
              <Link
                to="/operaciones/pedidos"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${pedidoBadgeClass(e.key)} hover:scale-105 transition-transform`}
              >
                <span aria-hidden="true">{e.icon}</span>
                <span className="font-bold">{pedidoLabel(e.key)}</span>
              </Link>
              <span className="text-[#6B7280] text-[11px]">— {e.desc}</span>
              {i < arr.length - 1 && <span className="text-[#C8D8CB] mx-1">·</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Tip operativo */}
      <div className="mt-6 bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
        <Eye size={18} className="text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-sky-900">
          <p className="font-bold mb-1">Tu scope como operaciones</p>
          <ul className="space-y-1 leading-relaxed">
            <li>• <strong>Subí el voucher</strong> al marcar una comisión como pagada — queda visible para el distribuidor.</li>
            <li>• Al marcar un pedido <strong>Enviado</strong>, subí la guía y el N° de tracking.</li>
            <li>• El distribuidor confirma la recepción (estado pasa a <strong>Entregado</strong>) — desde ese momento el pedido es inmutable.</li>
            <li>• Cancelar pedidos, suspender distribuidores y aprobar solicitudes son acciones del admin.</li>
          </ul>
          <p className="mt-3 inline-flex items-center gap-1.5 font-semibold text-sky-800">
            <ExternalLink size={11} aria-hidden="true" />
            Ante dudas, contacta al admin Dr. Luis Paredes.
          </p>
        </div>
      </div>
    </div>
  );
}
