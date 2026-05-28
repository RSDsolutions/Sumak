import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Users, DollarSign, ShoppingCart, ArrowRight } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import type { Afiliacion } from '../../lib/types';

interface Stats {
  solicitudesPendientes: number;
  distribuidoresActivos: number;
  comisionesPendientes: number;
  pedidosMes: number;
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
    <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-[#888888] text-sm mb-1">{label}</p>
      <p className="font-heading font-bold text-2xl text-[#F0F0F0]">
        {prefix}{typeof value === 'number' ? value.toLocaleString('es-EC') : value}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
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
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [
          { count: pendientes },
          { count: activos },
          { data: comisionesData },
          { count: pedidosMes },
          { data: recentData },
        ] = await Promise.all([
          supabaseAdmin.from('afiliaciones').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
          supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'distribuidor').eq('estado', 'activo'),
          supabaseAdmin.from('comisiones').select('monto').eq('estado', 'pendiente'),
          supabaseAdmin.from('pedidos').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
          supabaseAdmin.from('afiliaciones').select('*').order('created_at', { ascending: false }).limit(5),
        ]);

        const totalComisiones = (comisionesData ?? []).reduce((sum, c) => sum + (Number(c.monto) || 0), 0);

        setStats({
          solicitudesPendientes: pendientes ?? 0,
          distribuidoresActivos: activos ?? 0,
          comisionesPendientes: totalComisiones,
          pedidosMes: pedidosMes ?? 0,
        });
        setRecientes((recentData ?? []) as Afiliacion[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      aprobada: 'bg-[#00A86B]/10 text-[#00A86B] border border-[#00A86B]/30',
      rechazada: 'bg-red-500/10 text-red-400 border border-red-500/30',
    };
    return map[estado] ?? 'bg-[#222222] text-[#888888]';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Panel Administrativo</h1>
        <p className="text-[#888888] text-sm mt-1">Resumen general de la plataforma SUMAK</p>
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
              icon={<FileCheck size={20} className="text-amber-400" />}
              color="bg-amber-500/10"
            />
            <StatCard
              label="Distribuidores Activos"
              value={stats?.distribuidoresActivos ?? 0}
              icon={<Users size={20} className="text-[#00A86B]" />}
              color="bg-[#00A86B]/10"
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
              icon={<ShoppingCart size={20} className="text-blue-400" />}
              color="bg-blue-500/10"
            />
          </div>

          {/* Recent affiliations */}
          <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2E2E2E]">
              <h2 className="font-heading font-semibold text-[#F0F0F0]">Solicitudes Recientes</h2>
              <Link
                to="/admin/solicitudes"
                className="flex items-center gap-1.5 text-[#00A86B] text-sm hover:underline"
              >
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>

            {recientes.length === 0 ? (
              <div className="px-6 py-10 text-center text-[#888888] text-sm">
                No hay solicitudes aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2E2E2E]">
                      {['Nombre', 'Email', 'Paquete', 'Estado', 'Fecha'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-[#888888] text-xs font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((a) => (
                      <tr key={a.id} className="border-b border-[#2E2E2E] hover:bg-[#222222] transition-colors">
                        <td className="px-6 py-4 text-[#F0F0F0] font-medium">{a.nombre_completo}</td>
                        <td className="px-6 py-4 text-[#888888]">{a.email}</td>
                        <td className="px-6 py-4">
                          <span className="capitalize text-[#F0F0F0]">{a.paquete_seleccionado}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoBadge(a.estado)}`}>
                            {a.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#888888]">
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
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00A86B] text-white font-semibold text-sm hover:bg-[#008F5A] transition-all duration-200"
            >
              <FileCheck size={16} />
              Ver Solicitudes
            </Link>
            <Link
              to="/admin/distribuidores"
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#2E2E2E] text-[#888888] font-semibold text-sm hover:border-[#3A3A3A] hover:text-[#F0F0F0] transition-all duration-200"
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
