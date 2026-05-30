import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Users, ShoppingCart, Hash, Star, ArrowRight, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getRangoActual, getNextRango } from '../../data';
import type { Comision } from '../../lib/types';

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
  };
  return map[estado] ?? '';
}

interface Stats {
  comisionesPendientes: number;
  afiliadosDirectos: number;
  pedidosMes: number;
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
        { count: pedidos },
      ] = await Promise.all([
        supabase.from('comisiones').select('*').eq('beneficiario_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('patrocinador_id', uid),
        supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('distribuidor_id', uid).gte('created_at', startOfMonth),
      ]);

      const coms = (comsData ?? []) as Comision[];
      const pendiente = coms.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0);

      setComisiones(coms);
      setStats({
        comisionesPendientes: pendiente,
        afiliadosDirectos: directos ?? 0,
        pedidosMes: pedidos ?? 0,
      });
      setLoading(false);
    }
    load();
  }, [user]);

  const directos = stats?.afiliadosDirectos ?? 0;
  const rangoActual = getRangoActual(directos);
  const nextRango = getNextRango(directos);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">
            Bienvenido, {profile?.nombre_completo?.split(' ')[0]}
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30">
            {loading ? '—' : rangoActual.rango}
          </span>
        </div>
        <p className="text-[#6B7280] text-sm mt-1">Tu panel de distribuidor SUMAK</p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-4">
                <DollarSign size={20} className="text-[#D4AF37]" />
              </div>
              <p className="text-[#6B7280] text-sm mb-1">Comisiones Pendientes</p>
              <p className="font-heading font-bold text-2xl text-[#111111]">
                ${(stats?.comisionesPendientes ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
              <div className="w-10 h-10 bg-[#1A4E26]/10 rounded-xl flex items-center justify-center mb-4">
                <Users size={20} className="text-[#1A4E26]" />
              </div>
              <p className="text-[#6B7280] text-sm mb-1">Afiliados Directos</p>
              <p className="font-heading font-bold text-2xl text-[#111111]">{stats?.afiliadosDirectos ?? 0}</p>
            </div>
            <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <ShoppingCart size={20} className="text-blue-500" />
              </div>
              <p className="text-[#6B7280] text-sm mb-1">Pedidos Este Mes</p>
              <p className="font-heading font-bold text-2xl text-[#111111]">{stats?.pedidosMes ?? 0}</p>
            </div>
            <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
              <div className="w-10 h-10 bg-[#1A4E26]/10 rounded-xl flex items-center justify-center mb-4">
                <Hash size={20} className="text-[#1A4E26]" />
              </div>
              <p className="text-[#6B7280] text-sm mb-1">Mi Código</p>
              <p className="font-heading font-bold text-lg text-[#1A4E26] font-mono">
                {profile?.codigo_distribuidor ?? '—'}
              </p>
            </div>
          </div>

          {/* Puntos + Rango */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Puntos */}
            <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/30 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center shrink-0">
                <Star size={22} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[#6B7280] text-sm">Puntos Acumulados</p>
                <p className="font-heading font-bold text-3xl text-[#D4AF37]">{profile?.puntos ?? 0}</p>
                <p className="text-[#9CA3AF] text-xs mt-0.5">1 punto = $1 de valor PVP</p>
              </div>
            </div>

            {/* Rango Tramo 1 */}
            <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-[#D4AF37]" />
                <p className="text-[#6B7280] text-sm">Tu Rango (Tramo 1)</p>
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="font-heading font-bold text-xl text-[#D4AF37]">{rangoActual.rango}</p>
                <span className="text-[#1A4E26] font-semibold text-sm">{rangoActual.bono}</span>
              </div>
              {nextRango ? (
                <>
                  <div className="w-full bg-[#C8D8CB] rounded-full h-1.5 mb-1.5">
                    <div
                      className="bg-[#D4AF37] h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (directos / nextRango.personasDirectas) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[#9CA3AF] text-xs">
                    {directos} / {nextRango.personasDirectas} directos para <span className="text-[#6B7280]">{nextRango.rango}</span>
                  </p>
                </>
              ) : (
                <p className="text-[#1A4E26] text-xs font-semibold">Rango maximo alcanzado</p>
              )}
            </div>
          </div>

          {/* Recent commissions */}
          <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden mb-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8D8CB]">
              <h2 className="font-heading font-semibold text-[#111111]">Últimas Comisiones</h2>
              <Link to="/dashboard/comisiones" className="flex items-center gap-1.5 text-[#1A4E26] text-sm hover:underline">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            {comisiones.length === 0 ? (
              <div className="px-6 py-10 text-center text-[#6B7280] text-sm">
                Aún no tienes comisiones registradas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                      {['Tipo', 'Descripción', 'Monto', 'Estado', 'Fecha'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comisiones.map((c) => (
                      <tr key={c.id} className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] transition-colors">
                        <td className="px-6 py-4 text-[#111111] capitalize">{c.tipo}</td>
                        <td className="px-6 py-4 text-[#6B7280] max-w-[200px] truncate">{c.descripcion ?? '—'}</td>
                        <td className="px-6 py-4 text-[#111111] font-semibold">${Number(c.monto).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(c.estado)}`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#6B7280]">
                          {new Date(c.created_at).toLocaleDateString('es-EC')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CTA */}
          <Link
            to="/dashboard/pedido/nuevo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 shadow-[0_0_20px_rgba(26,78,38,0.2)]"
          >
            <ShoppingCart size={16} />
            Hacer un Pedido
          </Link>
        </>
      )}
    </div>
  );
}
