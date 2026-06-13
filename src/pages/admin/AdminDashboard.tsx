import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Users, DollarSign, ShoppingCart, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { Afiliacion } from '../../lib/types';

interface Stats {
  solicitudesPendientes: number;
  distribuidoresActivos: number;
  comisionesPendientes: number;
  pedidosMes: number;
}

/** Shape devuelto por la RPC public.admin_kpis() (mig 021). */
interface AdminKpisRpc {
  afiliaciones_pendientes: number;
  distribuidores_activos: number;
  comisiones_pendientes_monto: string | number;
  pedidos_mes_count: number;
}

function StatCard({
  label,
  value,
  icon,
  color,
  prefix,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
}) {
  return (
    <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_12px_rgba(26,78,38,0.04)]">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-[#6B7280] text-sm mb-1">{label}</p>
      <p className="font-heading font-bold text-2xl text-[#111111]">
        {prefix}{typeof value === 'number' ? value.toLocaleString('es-EC') : value}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recientes, setRecientes] = useState<Afiliacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // RPC admin_kpis() agrega todos los counts y montos en un solo
        // viaje server-side (mig 021). Antes esto eran 4 queries con
        // supabaseAdmin (service_role expuesto).
        const [
          { data: kpisData, error: kpisErr },
          { data: recentData },
        ] = await Promise.all([
          supabase.rpc('admin_kpis'),
          supabase
            .from('afiliaciones')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        if (kpisErr) {
          logger.error('admin_kpis error', kpisErr);
        }
        const kpis = (kpisData ?? {}) as AdminKpisRpc;
        setStats({
          solicitudesPendientes: Number(kpis.afiliaciones_pendientes ?? 0),
          distribuidoresActivos: Number(kpis.distribuidores_activos ?? 0),
          comisionesPendientes: Number(kpis.comisiones_pendientes_monto ?? 0),
          pedidosMes: Number(kpis.pedidos_mes_count ?? 0),
        });
        setRecientes((recentData ?? []) as Afiliacion[]);
      } catch (err) {
        logger.error('AdminDashboard load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
      aprobada: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
      rechazada: 'bg-red-50 text-red-600 border border-red-200',
    };
    return map[estado] ?? 'bg-[#F4F7F5] text-[#6B7280]';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Panel Administrativo</h1>
        <p className="text-[#6B7280] text-sm mt-1">Resumen general de la plataforma SUMAK</p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Solicitudes Pendientes"
              value={stats?.solicitudesPendientes ?? 0}
              icon={<FileCheck size={20} className="text-amber-600" />}
              color="bg-amber-50"
            />
            <StatCard
              label="Distribuidores Activos"
              value={stats?.distribuidoresActivos ?? 0}
              icon={<Users size={20} className="text-[#1A4E26]" />}
              color="bg-[#1A4E26]/10"
            />
            <StatCard
              label="Comisiones Pendientes"
              value={(stats?.comisionesPendientes ?? 0).toFixed(2)}
              icon={<DollarSign size={20} className="text-[#D4AF37]" />}
              color="bg-[#D4AF37]/10"
              prefix="$"
            />
            <StatCard
              label="Pedidos Este Mes"
              value={stats?.pedidosMes ?? 0}
              icon={<ShoppingCart size={20} className="text-blue-500" />}
              color="bg-blue-50"
            />
          </div>

          {/* Recent affiliations */}
          <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8D8CB]">
              <h2 className="font-heading font-semibold text-[#111111]">Solicitudes Recientes</h2>
              <Link
                to="/admin/solicitudes"
                className="flex items-center gap-1.5 text-[#1A4E26] text-sm hover:underline"
              >
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>

            {recientes.length === 0 ? (
              <div className="px-6 py-10 text-center text-[#6B7280] text-sm">
                No hay solicitudes aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                      {['Nombre', 'Email', 'Paquete', 'Estado', 'Fecha'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((a) => (
                      <tr key={a.id} className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] transition-colors">
                        <td className="px-6 py-4 text-[#111111] font-medium">{a.nombre_completo}</td>
                        <td className="px-6 py-4 text-[#6B7280]">{a.email}</td>
                        <td className="px-6 py-4">
                          <span className="capitalize text-[#111111]">{a.paquete_seleccionado}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(a.estado)}`}>
                            {a.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#6B7280]">
                          {new Date(a.created_at).toLocaleDateString('es-EC')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/admin/solicitudes"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A4E26] text-white font-semibold text-sm hover:bg-[#163F1E] transition-all duration-200 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
            >
              <FileCheck size={16} />
              Ver Solicitudes
            </Link>
            <Link
              to="/admin/distribuidores"
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] font-semibold text-sm hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
            >
              <Users size={16} />
              Distribuidores
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
