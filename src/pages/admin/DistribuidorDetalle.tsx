import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useAdminBasePath } from '../../lib/useAdminBasePath';
import type { Profile, Comision, Pedido } from '../../lib/types';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function estadoComisionBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
    pagado: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
    cancelado: 'bg-red-50 text-red-600 border border-red-200',
  };
  return map[estado] ?? '';
}

function estadoPedidoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600',
    procesando: 'bg-blue-50 text-blue-600',
    enviado: 'bg-purple-50 text-purple-600',
    entregado: 'bg-[#EBF4ED] text-[#1A4E26]',
    cancelado: 'bg-red-50 text-red-600',
  };
  return map[estado] ?? '';
}

export default function DistribuidorDetalle() {
  const basePath = useAdminBasePath();
  const { isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [directos, setDirectos] = useState(0);
  const [totalGanado, setTotalGanado] = useState(0);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [
        { data: profileData },
        { data: comisionesData },
        { data: pedidosData },
        { count: directosCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('comisiones').select('*').eq('beneficiario_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('pedidos').select('*').eq('distribuidor_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('patrocinador_id', id),
      ]);

      setProfile(profileData as Profile);
      const coms = (comisionesData ?? []) as Comision[];
      setComisiones(coms);
      setPedidos((pedidosData ?? []) as Pedido[]);
      setDirectos(directosCount ?? 0);
      setTotalGanado(coms.filter((c) => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0));
      setTotalPendiente(coms.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0));
      setLoading(false);
    }
    load();
  }, [id]);

  async function toggleEstado() {
    if (!profile || !id) return;
    setToggling(true);
    const newEstado = profile.estado === 'activo' ? 'suspendido' : 'activo';
    // RPC admin_set_distribuidor_estado valida is_admin() internamente
    // y restringe al rol 'distribuidor' solo (mig 021).
    const { error } = await supabase.rpc('admin_set_distribuidor_estado', {
      p_id: id,
      p_estado: newEstado,
    });
    if (!error) setProfile({ ...profile, estado: newEstado });
    setToggling(false);
  }

  if (loading) return <Spinner />;
  if (!profile) return <div className="text-center py-20 text-[#6B7280]">Distribuidor no encontrado.</div>;

  const paqueteLabel: Record<string, string> = {
    basico: 'Básico',
    emprendedor: 'Emprendedor',
    lider: 'Líder',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate(`${basePath}/distribuidores`)} className="text-[#6B7280] hover:text-[#111111] transition-colors mt-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading font-bold text-2xl text-[#111111]">{profile.nombre_completo}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
              profile.estado === 'activo'
                ? 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {profile.estado}
            </span>
          </div>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {profile.codigo_distribuidor ?? '—'} · {profile.paquete ? paqueteLabel[profile.paquete] : '—'}
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={toggleEstado}
            disabled={toggling}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              profile.estado === 'activo'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#1A4E26] hover:bg-[#163F1E] text-white'
            } disabled:opacity-60`}
          >
            {toggling ? '...' : profile.estado === 'activo' ? 'Suspender' : 'Activar'}
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#6B7280] bg-[#F4F7F5] border border-[#C8D8CB]">
            Solo lectura
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Afiliados Directos', value: directos.toString() },
          { label: 'Total Comisiones Ganadas', value: `$${totalGanado.toFixed(2)}` },
          { label: 'Comisiones Pendientes', value: `$${totalPendiente.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#C8D8CB] rounded-xl p-5 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
            <p className="text-[#6B7280] text-sm mb-1">{label}</p>
            <p className="font-heading font-bold text-xl text-[#111111]">{value}</p>
          </div>
        ))}
      </div>

      {/* Profile details + commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-[#111111] mb-4">Información</h2>
          <dl className="space-y-3">
            {[
              { label: 'Email', value: profile.email },
              { label: 'Cédula', value: profile.cedula },
              { label: 'Teléfono', value: profile.telefono ?? '—' },
              { label: 'Dirección', value: profile.direccion ?? '—' },
              { label: 'Ciudad', value: profile.ciudad ?? '—' },
              { label: 'Patrocinador', value: profile.codigo_patrocinador ?? '—' },
              { label: 'Registro', value: new Date(profile.fecha_registro).toLocaleDateString('es-EC') },
              { label: 'Aprobación', value: profile.fecha_aprobacion ? new Date(profile.fecha_aprobacion).toLocaleDateString('es-EC') : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <dt className="text-[#6B7280] text-sm shrink-0">{label}</dt>
                <dd className="text-[#111111] text-sm text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Commissions */}
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-[#111111] mb-4">Últimas Comisiones</h2>
          {comisiones.length === 0 ? (
            <p className="text-[#6B7280] text-sm">Sin comisiones registradas.</p>
          ) : (
            <div className="space-y-2">
              {comisiones.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#C8D8CB] last:border-0">
                  <div>
                    <p className="text-[#111111] text-sm capitalize">{c.tipo}</p>
                    <p className="text-[#9CA3AF] text-xs">{new Date(c.created_at).toLocaleDateString('es-EC')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#111111] font-semibold text-sm">${Number(c.monto).toFixed(2)}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${estadoComisionBadge(c.estado)}`}>
                      {c.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 mt-6">
        <h2 className="font-heading font-semibold text-[#111111] mb-4">Últimos Pedidos</h2>
        {pedidos.length === 0 ? (
          <div className="flex items-center gap-2 text-[#6B7280] text-sm">
            <AlertCircle size={16} />
            Sin pedidos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Fecha', 'Total', 'Estado'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-b border-[#C8D8CB]">
                    <td className="px-4 py-3 text-[#6B7280]">{new Date(p.created_at).toLocaleDateString('es-EC')}</td>
                    <td className="px-4 py-3 text-[#111111] font-semibold">${Number(p.total).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoPedidoBadge(p.estado)}`}>
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
