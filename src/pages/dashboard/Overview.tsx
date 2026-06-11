import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  DollarSign, Users, ShoppingCart, Hash, Star, ArrowRight, TrendingUp,
  CheckCircle2, AlertCircle, Store, Sparkles, ShoppingBag, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getRangoActual, getNextRango } from '../../data';
import type { Comision, Pedido } from '../../lib/types';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600',
    pagado: 'bg-[#EBF4ED] text-[#1A4E26]',
    cancelado: 'bg-red-50 text-red-600',
    entregado: 'bg-[#EBF4ED] text-[#1A4E26]',
    enviado: 'bg-purple-50 text-purple-600',
    procesando: 'bg-blue-50 text-blue-600',
  };
  return map[estado] ?? '';
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  pagado: 'Pagado',
};

interface Stats {
  comisionesPendientes: number;
  comisionesPagadas: number;
  afiliadosDirectos: number;
  pedidosMes: number;
  totalCompradoMes: number;
  compraCalificada: boolean;
  maxPedido: number;
  ultimosPedidos: Pedido[];
}

export default function Overview() {
  const { profile, user, refreshProfile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const uid = user!.id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      await refreshProfile();

      const [
        { data: comsData },
        { count: directos },
        { data: pedidosMesData },
        { data: ultimosPedidosData },
      ] = await Promise.all([
        supabase.from('comisiones').select('*').eq('beneficiario_id', uid).order('created_at', { ascending: false }).limit(6),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('patrocinador_id', uid),
        supabase.from('pedidos').select('id, total, estado, created_at').eq('distribuidor_id', uid).gte('created_at', startOfMonth),
        supabase.from('pedidos').select('*, items:pedido_items(*)').eq('distribuidor_id', uid).order('created_at', { ascending: false }).limit(3),
      ]);

      const coms = (comsData ?? []) as Comision[];
      const pendiente = coms.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0);
      const pagadas = coms.filter((c) => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0);

      const pedidosMes = (pedidosMesData ?? []) as { id: string; total: number; estado: string; created_at: string }[];
      const calificadosMes = pedidosMes.filter((p) => ['procesando', 'enviado', 'entregado'].includes(p.estado));
      const totalMes = calificadosMes.reduce((s, p) => s + Number(p.total), 0);
      const maxPedido = calificadosMes.length === 0 ? 0 : Math.max(...calificadosMes.map((p) => Number(p.total)));
      const calificada = maxPedido >= 100;

      setComisiones(coms);
      setStats({
        comisionesPendientes: pendiente,
        comisionesPagadas: pagadas,
        afiliadosDirectos: directos ?? 0,
        pedidosMes: pedidosMes.length,
        totalCompradoMes: totalMes,
        compraCalificada: calificada,
        maxPedido,
        ultimosPedidos: (ultimosPedidosData ?? []) as Pedido[],
      });
      setLoading(false);
    }
    load();
  }, [user]);

  const directos = stats?.afiliadosDirectos ?? 0;
  const rangoActual = getRangoActual(directos);
  const nextRango = getNextRango(directos);
  const progressToActivation = Math.min(100, ((stats?.maxPedido ?? 0) / 100) * 100);

  const monthName = new Date().toLocaleString('es-EC', { month: 'long' });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">
            Bienvenido, {profile?.nombre_completo?.split(' ')[0]}
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30">
            {loading ? '—' : rangoActual.rango}
          </span>
        </div>
        <p className="text-[#6B7280] text-sm mt-1">Tu panel de distribuidor Sumak</p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* ─── ACTIVATION HERO ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 mb-6 ${
              stats?.compraCalificada
                ? 'border border-[#1A4E26]/30'
                : 'border border-amber-300'
            }`}
            style={{
              background: stats?.compraCalificada
                ? 'linear-gradient(135deg, #0F2E18 0%, #1A4E26 60%, #2B6E3A 100%)'
                : 'linear-gradient(135deg, #FFF8E6 0%, #FFFEF7 100%)',
            }}
          >
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <div className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] mb-2 ${
                  stats?.compraCalificada ? 'text-[#D4AF37]' : 'text-amber-600'
                }`}>
                  <Calendar size={12} />
                  Activación de {monthName}
                </div>
                <h2 className={`font-heading font-bold text-2xl sm:text-3xl mb-2 ${
                  stats?.compraCalificada ? 'text-white' : 'text-[#111111]'
                }`}>
                  {stats?.compraCalificada
                    ? '¡Estás activo este mes!'
                    : 'Activa tu mes para cobrar comisiones'}
                </h2>
                <p className={`text-sm mb-3 leading-relaxed max-w-xl ${
                  stats?.compraCalificada ? 'text-white/75' : 'text-amber-700'
                }`}>
                  {stats?.compraCalificada
                    ? `Tu pedido más alto este mes fue de $${stats.maxPedido.toFixed(2)} — cumples la meta de $100 y estás habilitado para recibir comisiones por nivel.`
                    : `Para mantenerte activo y recibir comisiones, debes hacer al menos un pedido de $100 o más en un solo pedido cada mes.`
                  }
                </p>

                {stats?.compraCalificada && (
                  <div className="flex items-start gap-2 bg-white/10 backdrop-blur-sm border border-[#D4AF37]/30 rounded-xl px-4 py-3 mb-4 max-w-xl">
                    <Sparkles size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    <p className="text-white/85 text-xs leading-relaxed">
                      <span className="font-bold text-[#D4AF37]">Recuerda:</span>{' '}
                      cada mes nuevo el contador empieza desde cero. Tienes todo el próximo mes para hacer una compra de $100 o más y mantener tu cupo a comisiones.
                    </p>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-2">
                    <span className={stats?.compraCalificada ? 'text-white/75' : 'text-amber-700 font-semibold'}>
                      Progreso a tu cupo
                    </span>
                    <span className={`font-bold ${stats?.compraCalificada ? 'text-[#D4AF37]' : 'text-amber-700'}`}>
                      ${(stats?.maxPedido ?? 0).toFixed(2)} / $100.00
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${stats?.compraCalificada ? 'bg-white/20' : 'bg-amber-100'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToActivation}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: stats?.compraCalificada
                          ? 'linear-gradient(90deg, #D4AF37, #E8C94A)'
                          : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    to="/dashboard/tienda"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      stats?.compraCalificada
                        ? 'bg-[#D4AF37] text-[#0B2913] hover:bg-[#E8C94A]'
                        : 'bg-[#1A4E26] text-white hover:bg-[#163F1E]'
                    }`}
                  >
                    <ShoppingBag size={15} />
                    {stats?.compraCalificada ? 'Ir a la tienda' : 'Activar ahora'}
                  </Link>
                </div>
              </div>

              <div className="text-right">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center ${
                  stats?.compraCalificada
                    ? 'bg-white/15 backdrop-blur-sm border border-white/25'
                    : 'bg-amber-100 border border-amber-200'
                }`}>
                  {stats?.compraCalificada
                    ? <CheckCircle2 size={48} className="text-[#D4AF37]" />
                    : <AlertCircle size={48} className="text-amber-500" />}
                </div>
                <p className={`text-[10px] uppercase tracking-widest font-bold mt-2 ${
                  stats?.compraCalificada ? 'text-white/75' : 'text-amber-600'
                }`}>
                  {stats?.compraCalificada ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ─── KEY METRICS ─────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="bg-white border border-[#C8D8CB] rounded-2xl p-5"
            >
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-3">
                <DollarSign size={18} className="text-[#D4AF37]" />
              </div>
              <p className="text-[#6B7280] text-xs mb-1">Comisiones pendientes</p>
              <p className="font-heading font-bold text-2xl text-[#111111]">
                ${stats?.comisionesPendientes.toFixed(2) ?? '0.00'}
              </p>
              <p className="text-[10px] text-[#9CA3AF] mt-1">Pagadas: ${stats?.comisionesPagadas.toFixed(2) ?? '0.00'}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white border border-[#C8D8CB] rounded-2xl p-5"
            >
              <div className="w-10 h-10 bg-[#1A4E26]/10 rounded-xl flex items-center justify-center mb-3">
                <Users size={18} className="text-[#1A4E26]" />
              </div>
              <p className="text-[#6B7280] text-xs mb-1">Afiliados directos</p>
              <p className="font-heading font-bold text-2xl text-[#111111]">{stats?.afiliadosDirectos ?? 0}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-1">
                {nextRango ? `${nextRango.personasDirectas - directos} para ${nextRango.rango}` : 'Rango máximo'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-white border border-[#C8D8CB] rounded-2xl p-5"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <ShoppingCart size={18} className="text-blue-500" />
              </div>
              <p className="text-[#6B7280] text-xs mb-1">Compras este mes</p>
              <p className="font-heading font-bold text-2xl text-[#111111]">${stats?.totalCompradoMes.toFixed(2) ?? '0.00'}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-1">{stats?.pedidosMes ?? 0} pedido(s)</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white border border-[#D4AF37]/30 rounded-2xl p-5"
              style={{ background: 'linear-gradient(135deg, #FFFDF5 0%, #FFFEF7 100%)' }}
            >
              <div className="w-10 h-10 bg-[#D4AF37]/15 rounded-xl flex items-center justify-center mb-3">
                <Star size={18} className="text-[#D4AF37]" />
              </div>
              <p className="text-[#6B7280] text-xs mb-1">Puntos acumulados</p>
              <p className="font-heading font-bold text-2xl text-[#D4AF37]">{profile?.puntos ?? 0}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-1 font-mono">
                {profile?.codigo_distribuidor ?? '—'}
              </p>
            </motion.div>
          </div>

          {/* ─── RANGO + LATEST ORDERS ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Rango progress */}
            <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-5 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-[#D4AF37]" />
                <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider">Mi rango — Tramo 1</p>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <p className="font-heading font-bold text-xl text-[#D4AF37]">{rangoActual.rango}</p>
                <span className="text-[#1A4E26] font-semibold text-sm">{rangoActual.bono}</span>
              </div>
              {nextRango ? (
                <>
                  <div className="w-full bg-[#F4F7F5] rounded-full h-2 mb-2 mt-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (directos / nextRango.personasDirectas) * 100)}%` }}
                      transition={{ duration: 0.6 }}
                      className="bg-[#D4AF37] h-2 rounded-full"
                    />
                  </div>
                  <p className="text-[#9CA3AF] text-xs">
                    {directos} / {nextRango.personasDirectas} directos para{' '}
                    <span className="text-[#1A4E26] font-semibold">{nextRango.rango}</span>
                  </p>
                </>
              ) : (
                <p className="text-[#1A4E26] text-xs font-semibold mt-2">Rango máximo alcanzado</p>
              )}
            </div>

            {/* Latest orders */}
            <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5]">
                <h2 className="font-heading font-bold text-[#111111] text-sm">Últimos pedidos</h2>
                <Link to="/dashboard/pedidos" className="text-[#1A4E26] text-xs font-semibold hover:underline flex items-center gap-1">
                  Ver todos <ArrowRight size={12} />
                </Link>
              </div>
              {stats!.ultimosPedidos.length === 0 ? (
                <div className="px-5 py-8 text-center text-[#6B7280] text-sm">
                  <ShoppingBag size={28} className="mx-auto mb-2 text-[#9CA3AF] opacity-50" />
                  Aún no has hecho ningún pedido.
                  <Link to="/dashboard/tienda" className="block mt-3 text-[#1A4E26] font-semibold text-xs hover:underline">
                    Visitar tienda →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#C8D8CB]">
                  {stats!.ultimosPedidos.map((p) => (
                    <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#111111] text-sm font-semibold">
                          {(p.items?.length ?? 0)} producto{(p.items?.length ?? 0) !== 1 ? 's' : ''}
                          <span className="text-[#9CA3AF] text-xs font-normal ml-2">
                            {new Date(p.created_at).toLocaleDateString('es-EC')}
                          </span>
                        </p>
                        {p.items && p.items.length > 0 && (
                          <p className="text-[#6B7280] text-xs truncate">
                            {p.items.map((i) => i.producto_nombre).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${estadoBadge(p.estado)}`}>
                        {ESTADO_LABEL[p.estado] ?? p.estado}
                      </span>
                      <p className="font-heading font-bold text-[#1A4E26] text-sm whitespace-nowrap">
                        ${Number(p.total).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── COMISIONES ─────────────────────────────── */}
          <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5]">
              <h2 className="font-heading font-bold text-[#111111] text-sm flex items-center gap-2">
                <Sparkles size={14} className="text-[#D4AF37]" />
                Últimas comisiones
              </h2>
              <Link to="/dashboard/comisiones" className="text-[#1A4E26] text-xs font-semibold hover:underline flex items-center gap-1">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {comisiones.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-14 h-14 bg-[#F4F7F5] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={22} className="text-[#9CA3AF]" aria-hidden="true" />
                </div>
                <p className="text-[#111111] text-sm font-bold mb-1">Aún no tienes comisiones</p>
                <p className="text-[#6B7280] text-xs mb-4 max-w-xs mx-auto leading-relaxed">
                  Las comisiones aparecen aquí cuando tu red genera ventas calificadas.
                  Comparte tu código de patrocinador para empezar.
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Link
                    to="/dashboard/perfil"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#163F1E] transition-all"
                  >
                    <Hash size={13} aria-hidden="true" /> Ver mi código
                  </Link>
                  <Link
                    to="/dashboard/red"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-xs font-semibold hover:border-[#A8C2AD] hover:text-[#111111] transition-all"
                  >
                    <Users size={13} aria-hidden="true" /> Ver mi red
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#C8D8CB] bg-[#FAFBFA]">
                      {['Tipo', 'Descripción', 'Monto', 'Estado', 'Fecha'].map((h) => (
                        <th key={h} className="px-5 py-2.5 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comisiones.map((c) => (
                      <tr key={c.id} className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#F4F7F5] transition-colors">
                        <td className="px-5 py-3 text-[#111111] capitalize text-xs">{c.tipo}</td>
                        <td className="px-5 py-3 text-[#6B7280] max-w-[250px] truncate text-xs">{c.descripcion ?? '—'}</td>
                        <td className="px-5 py-3 text-[#111111] font-bold text-sm">${Number(c.monto).toFixed(2)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${estadoBadge(c.estado)}`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#6B7280] text-xs">
                          {new Date(c.created_at).toLocaleDateString('es-EC')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── CTAs ─────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/tienda"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 shadow-[0_8px_24px_rgba(26,78,38,0.2)]"
            >
              <Store size={16} /> Ir a la Tienda
            </Link>
            <Link
              to="/dashboard/red"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#C8D8CB] text-[#1A4E26] font-bold text-sm hover:border-[#1A4E26] transition-all duration-200"
            >
              <Users size={16} /> Ver mi red
            </Link>
            <Link
              to="/dashboard/perfil"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#C8D8CB] text-[#6B7280] font-bold text-sm hover:border-[#A8C2AD] hover:text-[#111111] transition-all duration-200"
            >
              <Hash size={16} /> Mi código
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
