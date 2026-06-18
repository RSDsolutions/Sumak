import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Users, Network, ShoppingBag, DollarSign,
  Star, TrendingUp, Calendar, CheckCircle2, XCircle, User, Crown,
  ChevronDown, ChevronRight, ArrowUpRight, Award, Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useAdminBasePath } from '../../lib/useAdminBasePath';
import { displayName } from '../../lib/profile';
import { logger } from '../../lib/logger';
import { planConfig, getRangoActual, getNextRango } from '../../data';
import type { Profile, Comision, Pedido, NodoBinario } from '../../lib/types';

// ─────────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────────
interface TreeNode extends NodoBinario {
  profile: Profile;
  children: TreeNode[];
}

interface Stats {
  directos: number;
  redTotal: number;
  izquierdaCount: number;
  derechaCount: number;
  volumenIzq: number;
  volumenDer: number;
  pedidosTotales: number;
  totalCompradoHistorico: number;
  pedidosMes: number;
  totalCompradoMes: number;
  activacionMes: boolean;
  maxPedidoMes: number;
  totalComisionesGanadas: number;
  totalComisionesPendientes: number;
  totalComisionesCanceladas: number;
  comisionesAfiliacion: number;
  comisionesNivel: number;
  comisionesBinaria: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
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

function countSubtree(node: TreeNode): number {
  return node.children.reduce((s, c) => s + 1 + countSubtree(c), 0);
}

function sumPuntos(node: TreeNode): number {
  return (node.profile.puntos ?? 0) + node.children.reduce((s, c) => s + sumPuntos(c), 0);
}

// ─────────────────────────────────────────────────────────────
// Sub-arbol binario compacto
// ─────────────────────────────────────────────────────────────
function MiniNode({ node, depth, maxDepth, isRoot }: {
  node: TreeNode;
  depth: number;
  maxDepth: number;
  isRoot?: boolean;
}) {
  if (depth > maxDepth) return null;
  const sinPerfil = !node.profile.nombre_completo;
  const isAdmin = node.profile.rol === 'admin';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`border rounded-lg text-center transition-all w-28 p-1.5 ${
          isRoot
            ? 'border-2 border-[#1A4E26] bg-gradient-to-br from-[#EBF4ED] to-[#D5ECD9] shadow-[0_4px_10px_rgba(26,78,38,0.15)]'
            : isAdmin
              ? 'border-[#D4AF37] bg-gradient-to-br from-[#0F2E18] to-[#1A4E26]'
              : 'border-[#C8D8CB] bg-white'
        }`}
      >
        <div className={`flex items-center justify-center gap-1 ${
          isAdmin ? 'text-[#D4AF37]' : isRoot ? 'text-[#1A4E26]' : 'text-[#1A4E26]'
        }`}>
          {isAdmin ? <Crown size={10} /> : <User size={10} />}
          <p className="font-mono text-[9px] font-bold truncate">{node.profile.codigo_distribuidor ?? '—'}</p>
        </div>
        <p
          className={`text-[9px] font-bold leading-tight line-clamp-1 mt-0.5 ${
            isAdmin ? 'text-white' : sinPerfil ? 'text-[#9CA3AF] italic' : 'text-[#111111]'
          }`}
          title={displayName(node.profile)}
        >
          {sinPerfil ? 'Sin perfil' : displayName(node.profile)}
        </p>
        <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[8px] font-bold text-[#D4AF37]">
          <Star size={7} />
          {node.profile.puntos ?? 0}
        </div>
      </div>

      {node.children.length > 0 && depth < maxDepth && (
        <TreeBranches gap={12} drop={16}>
          {node.children.map((child) => (
            <MiniNode key={child.id} node={child} depth={depth + 1} maxDepth={maxDepth} />
          ))}
        </TreeBranches>
      )}
    </div>
  );
}

// ── Tree branches helper (mismo patron que MiRed y AdminRed) ──
function TreeBranches({ children, gap = 12, drop = 16 }: {
  children: React.ReactNode[];
  gap?: number;
  drop?: number;
}) {
  if (children.length === 0) return null;

  if (children.length === 1) {
    return (
      <div className="flex justify-center">
        <div className="relative" style={{ paddingTop: drop }}>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-px bg-[#C8D8CB]"
            style={{ height: drop }}
          />
          {children[0]}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center" style={{ gap }}>
      {children.map((child, i) => {
        const isFirst = i === 0;
        const isLast = i === children.length - 1;
        return (
          <div key={i} className="relative" style={{ paddingTop: drop }}>
            <div
              className="absolute top-0 h-px bg-[#C8D8CB]"
              style={{
                left: isFirst ? '50%' : -gap / 2,
                right: isLast ? '50%' : -gap / 2,
              }}
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-px bg-[#C8D8CB]"
              style={{ height: drop }}
            />
            {child}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pagina
// ─────────────────────────────────────────────────────────────
export default function DistribuidorDetalle() {
  const basePath = useAdminBasePath();
  const { isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [patrocinador, setPatrocinador] = useState<Profile | null>(null);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [maxDepth, setMaxDepth] = useState(4);
  const [showAfiliados, setShowAfiliados] = useState(false);
  const [afiliados, setAfiliados] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      const uid = id!;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { data: profileData },
        { data: comisionesData },
        { data: pedidosUltimos },
        { data: todosLosPedidos },
        { data: hijosData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('comisiones').select('*').eq('beneficiario_id', uid).order('created_at', { ascending: false }).limit(10),
        supabase.from('pedidos').select('*').eq('distribuidor_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('pedidos').select('id, total, estado, created_at').eq('distribuidor_id', uid),
        supabase.from('profiles').select('id, fecha_aprobacion, fecha_registro').eq('patrocinador_id', uid),
      ]);

      if (cancelled) return;

      const p = profileData as Profile | null;
      setProfile(p);
      if (!p) {
        setLoading(false);
        return;
      }

      // Cargar patrocinador (si tiene)
      if (p.patrocinador_id) {
        const { data: pat } = await supabase.from('profiles').select('*').eq('id', p.patrocinador_id).maybeSingle();
        if (!cancelled) setPatrocinador(pat as Profile | null);
      }

      const coms = (comisionesData ?? []) as Comision[];
      setComisiones(coms);
      setPedidos((pedidosUltimos ?? []) as Pedido[]);

      // ─── Calcular sub-arbol binario ─────────────────────
      const { data: myNode, error: myNodeErr } = await supabase
        .from('red_binaria')
        .select('*')
        .eq('distribuidor_id', uid)
        .maybeSingle();

      if (cancelled) return;
      if (myNodeErr) {
        logger.error('DistribuidorDetalle: error leyendo nodo del usuario', myNodeErr);
      }

      let myTreeNode: TreeNode | null = null;
      let flatSubtree: TreeNode[] = [];

      if (myNode) {
        const { data: allNodes } = await supabase
          .from('red_binaria')
          .select('*')
          .limit(5000);
        if (cancelled) return;

        const nodes = (allNodes ?? []) as NodoBinario[];
        const distIds = Array.from(new Set(nodes.map((n) => n.distribuidor_id)));
        const { data: perfiles } = distIds.length > 0
          ? await supabase.from('profiles').select('*').in('id', distIds)
          : { data: [] };
        if (cancelled) return;

        const profileMap = new Map<string, Profile>();
        profileMap.set(p.id, p);
        for (const pr of (perfiles ?? []) as Profile[]) profileMap.set(pr.id, pr);

        const nodeMap = new Map<string, TreeNode>();
        for (const n of nodes) {
          const prof = profileMap.get(n.distribuidor_id) ?? ({
            id: n.distribuidor_id,
            codigo_distribuidor: null,
            username: null,
            nombre_completo: '—',
            cedula: '',
            email: '',
            telefono: null,
            direccion: null,
            ciudad: null,
            codigo_patrocinador: null,
            patrocinador_id: null,
            paquete: null,
            puntos: 0,
            estado: 'activo',
            rol: 'distribuidor',
            avatar_url: null,
            fecha_registro: new Date().toISOString(),
            fecha_aprobacion: null,
          } as Profile);
          nodeMap.set(n.id, { ...(n as TreeNode), profile: prof, children: [] });
        }
        for (const [, node] of nodeMap) {
          if (node.padre_id) {
            const parent = nodeMap.get(node.padre_id);
            if (parent) parent.children.push(node);
          }
        }
        myTreeNode = nodeMap.get(myNode.id) ?? null;
        if (myTreeNode) {
          const collect = (n: TreeNode) => {
            for (const c of n.children) { flatSubtree.push(c); collect(c); }
          };
          collect(myTreeNode);
        }
      }

      if (cancelled) return;
      setRootNode(myTreeNode);
      setAfiliados(flatSubtree);

      // ─── Calcular stats ─────────────────────────────────
      const allPedidos = (todosLosPedidos ?? []) as { id: string; total: number; estado: string; created_at: string }[];
      const pedidosValidos = allPedidos.filter((pe) => pe.estado !== 'cancelado');
      const pedidosMes = pedidosValidos.filter((pe) => pe.created_at >= startOfMonth);
      const pedidosMesCalificados = pedidosMes.filter((pe) => ['procesando', 'enviado', 'entregado'].includes(pe.estado));
      const maxPedidoMes = pedidosMesCalificados.length === 0 ? 0 : Math.max(...pedidosMesCalificados.map((pe) => Number(pe.total)));

      const leftChild = myTreeNode?.children.find((c) => c.posicion === 'izquierda');
      const rightChild = myTreeNode?.children.find((c) => c.posicion === 'derecha');
      const izquierdaCount = leftChild ? 1 + countSubtree(leftChild) : 0;
      const derechaCount = rightChild ? 1 + countSubtree(rightChild) : 0;
      const volumenIzq = leftChild ? sumPuntos(leftChild) : 0;
      const volumenDer = rightChild ? sumPuntos(rightChild) : 0;
      const redTotal = myTreeNode ? countSubtree(myTreeNode) : 0;

      // BIZ: el rango se reinicia cada mes. Solo cuentan los directos
      // afiliados dentro del mes calendario actual.
      const startMsRng = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endMsRng = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      const directosMes = ((hijosData ?? []) as { fecha_aprobacion: string | null; fecha_registro: string | null }[])
        .filter((h) => {
          const dateStr = h.fecha_aprobacion ?? h.fecha_registro;
          if (!dateStr) return false;
          const t = new Date(dateStr).getTime();
          return t >= startMsRng && t < endMsRng;
        }).length;

      const newStats: Stats = {
        directos: directosMes,
        redTotal,
        izquierdaCount,
        derechaCount,
        volumenIzq,
        volumenDer,
        pedidosTotales: pedidosValidos.length,
        totalCompradoHistorico: pedidosValidos.reduce((s, pe) => s + Number(pe.total), 0),
        pedidosMes: pedidosMes.length,
        totalCompradoMes: pedidosMes.reduce((s, pe) => s + Number(pe.total), 0),
        activacionMes: maxPedidoMes >= planConfig.minActivacionMensual,
        maxPedidoMes,
        totalComisionesGanadas: coms.filter((c) => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0),
        totalComisionesPendientes: coms.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0),
        totalComisionesCanceladas: coms.filter((c) => c.estado === 'cancelado').reduce((s, c) => s + Number(c.monto), 0),
        comisionesAfiliacion: coms.filter((c) => c.tipo === 'afiliacion').reduce((s, c) => s + Number(c.monto), 0),
        comisionesNivel: coms.filter((c) => c.tipo === 'nivel').reduce((s, c) => s + Number(c.monto), 0),
        comisionesBinaria: coms.filter((c) => c.tipo === 'binaria').reduce((s, c) => s + Number(c.monto), 0),
      };

      setStats(newStats);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function toggleEstado() {
    if (!profile || !id) return;
    setToggling(true);
    const newEstado = profile.estado === 'activo' ? 'suspendido' : 'activo';
    const { error } = await supabase.rpc('admin_set_distribuidor_estado', {
      p_id: id,
      p_estado: newEstado,
    });
    if (!error) setProfile({ ...profile, estado: newEstado });
    setToggling(false);
  }

  const rango = useMemo(() => stats ? getRangoActual(stats.directos) : null, [stats]);
  const nextRango = useMemo(() => stats ? getNextRango(stats.directos) : null, [stats]);
  const progresoActivacion = useMemo(
    () => stats ? Math.min(100, (stats.maxPedidoMes / planConfig.minActivacionMensual) * 100) : 0,
    [stats],
  );

  if (loading) return <Spinner />;
  if (!profile) return <div className="text-center py-20 text-[#6B7280]">Distribuidor no encontrado.</div>;

  const paqueteLabel: Record<string, string> = {
    basico: 'Básico',
    emprendedor: 'Emprendedor',
    lider: 'Líder',
  };

  const monthName = new Date().toLocaleString('es-EC', { month: 'long' });

  return (
    <div className="space-y-3">
      {/* Header compacto: titulo + badges + boton en una sola fila */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate(`${basePath}/distribuidores`)}
          className="text-[#6B7280] hover:text-[#111111] transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading font-bold text-lg text-[#111111] truncate">
              {profile.nombre_completo ?? displayName(profile)}
            </h1>
            <span className="font-mono text-xs text-[#1A4E26] font-bold">{profile.codigo_distribuidor ?? '—'}</span>
            {profile.username && <span className="text-[#9CA3AF] text-xs">@{profile.username}</span>}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
              profile.estado === 'activo'
                ? 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>{profile.estado}</span>
            {profile.paquete && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] bg-[#F4F7F5] border border-[#C8D8CB] rounded px-1.5 py-0.5">
                {paqueteLabel[profile.paquete]}
              </span>
            )}
            {rango && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 uppercase tracking-widest"
                title={`Rango del mes (se reinicia el 1 de cada mes). Calculado con ${stats?.directos ?? 0} directos afiliados en ${monthName}.`}
              >
                <Award size={10} /> {rango.rango} · {monthName}
              </span>
            )}
            {stats?.activacionMes ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30 uppercase tracking-widest">
                <CheckCircle2 size={10} /> Activo {monthName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-widest">
                <XCircle size={10} /> Inactivo {monthName}
              </span>
            )}
          </div>
        </div>
        {isAdmin ? (
          <button
            onClick={toggleEstado}
            disabled={toggling}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              profile.estado === 'activo'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#1A4E26] hover:bg-[#163F1E] text-white'
            } disabled:opacity-60`}
          >
            {toggling ? '...' : profile.estado === 'activo' ? 'Suspender' : 'Activar'}
          </button>
        ) : (
          <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-[#6B7280] bg-[#F4F7F5] border border-[#C8D8CB]">
            Solo lectura
          </span>
        )}
      </div>

      {/* KPI strip: 8 metricas en una sola fila */}
      {stats && (
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Directos', value: stats.directos.toString(), color: 'text-[#1A4E26]', bg: 'bg-[#EBF4ED]', icon: <Users size={12} /> },
            { label: 'Red total', value: stats.redTotal.toString(), color: 'text-[#1A4E26]', bg: 'bg-[#EBF4ED]', icon: <Network size={12} /> },
            { label: 'Izq', value: stats.izquierdaCount.toString(), color: 'text-[#1A4E26]', bg: 'bg-white', icon: <span className="font-bold">←</span> },
            { label: 'Der', value: stats.derechaCount.toString(), color: 'text-[#1A4E26]', bg: 'bg-white', icon: <span className="font-bold">→</span> },
            { label: 'Vol izq', value: `★${stats.volumenIzq}`, color: 'text-[#D4AF37]', bg: 'bg-[#FFFDF5]', icon: <TrendingUp size={12} /> },
            { label: 'Vol der', value: `★${stats.volumenDer}`, color: 'text-[#D4AF37]', bg: 'bg-[#FFFDF5]', icon: <TrendingUp size={12} /> },
            { label: 'Pedidos', value: stats.pedidosTotales.toString(), color: 'text-blue-600', bg: 'bg-white', icon: <ShoppingBag size={12} /> },
            { label: 'Pendientes', value: `$${stats.totalComisionesPendientes.toFixed(0)}`, color: 'text-amber-600', bg: 'bg-white', icon: <DollarSign size={12} /> },
          ].map((s) => (
            <div key={s.label} className={`border border-[#C8D8CB] rounded-xl p-2.5 ${s.bg}`}>
              <div className={`flex items-center gap-1 mb-0.5 ${s.color}`}>
                {s.icon}
                <p className="text-[9px] uppercase tracking-wider font-bold truncate">{s.label}</p>
              </div>
              <p className="font-heading font-bold text-base text-[#111111] leading-tight truncate">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Activacion progress bar slim */}
      {stats && (
        <div className={`rounded-xl px-4 py-2.5 border flex items-center gap-3 flex-wrap ${
          stats.activacionMes ? 'border-[#1A4E26]/30 bg-[#EBF4ED]' : 'border-amber-300 bg-[#FFF8E6]'
        }`}>
          <Calendar size={14} className={stats.activacionMes ? 'text-[#1A4E26]' : 'text-amber-600'} />
          <span className={`text-xs font-bold ${stats.activacionMes ? 'text-[#1A4E26]' : 'text-amber-800'}`}>
            Activación {monthName}: ${stats.maxPedidoMes.toFixed(2)} / ${planConfig.minActivacionMensual.toFixed(2)}
          </span>
          <div className="flex-1 min-w-[140px] h-1.5 rounded-full overflow-hidden bg-white border border-[#C8D8CB]/50">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progresoActivacion}%`,
                background: stats.activacionMes ? 'linear-gradient(90deg, #1A4E26, #D4AF37)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
              }}
            />
          </div>
          <span className="text-[10px] text-[#6B7280]">
            {stats.pedidosMes} pedidos · ${stats.totalCompradoMes.toFixed(2)} este mes
          </span>
        </div>
      )}

      {/* Grid principal: 4 cols — info personal, patrocinador, rango, comisiones desglose */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Info personal (col-span-2) */}
          <div className="lg:col-span-2 bg-white border border-[#C8D8CB] rounded-xl p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-2.5 flex items-center gap-1.5">
              <User size={11} className="text-[#1A4E26]" /> Información personal
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[
                { label: 'Email', value: profile.email },
                { label: 'Cédula', value: profile.cedula ?? '—' },
                { label: 'Teléfono', value: profile.telefono ?? '—' },
                { label: 'Ciudad', value: profile.ciudad ?? '—' },
                { label: 'Dirección', value: profile.direccion ?? '—' },
                { label: 'Registro', value: new Date(profile.fecha_registro).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[#9CA3AF] text-[9px] font-bold uppercase tracking-wider">{label}</dt>
                  <dd className="text-[#111111] text-xs truncate" title={String(value)}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Patrocinador + comisiones desglose stacked */}
          <div className="bg-white border border-[#C8D8CB] rounded-xl p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-2.5 flex items-center gap-1.5">
              <ArrowUpRight size={11} className="text-[#1A4E26]" /> Patrocinador
            </h2>
            {patrocinador ? (
              <button
                onClick={() => navigate(`${basePath}/distribuidores/${patrocinador.id}`)}
                className="w-full text-left bg-[#F4F7F5] hover:bg-[#EBF4ED] border border-[#C8D8CB] rounded-lg p-2.5 transition-colors"
              >
                <p className="text-[#111111] font-bold text-xs truncate">{displayName(patrocinador)}</p>
                <p className="text-[#1A4E26] font-mono text-[10px] font-bold">{patrocinador.codigo_distribuidor ?? '—'}</p>
                <p className="text-[#9CA3AF] text-[9px] mt-1 flex items-center gap-1">
                  Ver perfil <ChevronRight size={9} />
                </p>
              </button>
            ) : (
              <div className="text-[#6B7280] text-xs">Sin patrocinador.</div>
            )}
          </div>

          {/* Comisiones desglose */}
          <div className="bg-white border border-[#C8D8CB] rounded-xl p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-2.5 flex items-center gap-1.5">
              <Sparkles size={11} className="text-[#D4AF37]" /> Comisiones
            </h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-[#C8D8CB]/50">
                <span className="text-[#1A4E26] font-semibold">Ganadas</span>
                <span className="text-[#1A4E26] font-bold">${stats.totalComisionesGanadas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#6B7280]">Afiliación</span>
                <span className="text-blue-600 font-bold">${stats.comisionesAfiliacion.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#6B7280]">Por nivel</span>
                <span className="text-[#D4AF37] font-bold">${stats.comisionesNivel.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#6B7280]">Binaria</span>
                <span className="text-purple-600 font-bold">${stats.comisionesBinaria.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#C8D8CB]/50 flex items-center justify-between">
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1">
                <Star size={10} /> Puntos
              </span>
              <span className="text-[#D4AF37] font-bold text-sm">★ {profile.puntos ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Red binaria + Lista (side by side cuando hay lista visible) */}
      <div className="bg-white border border-[#C8D8CB] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#C8D8CB] bg-[#FAFBFA] flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-heading font-bold text-[#111111] text-xs flex items-center gap-1.5">
            <Network size={12} className="text-[#1A4E26]" />
            Red binaria · {stats?.redTotal ?? 0} en su red
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] text-[#6B7280] flex items-center gap-1">
              Profundidad:
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
                className="bg-white border border-[#C8D8CB] rounded px-1.5 py-0.5 text-[10px] font-medium text-[#111111] focus:outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value={12}>Toda</option>
              </select>
            </label>
            {afiliados.length > 0 && (
              <button
                onClick={() => setShowAfiliados(!showAfiliados)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1A4E26]/10 text-[#1A4E26] text-[10px] font-bold hover:bg-[#1A4E26]/15 transition-colors"
              >
                {showAfiliados ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                {showAfiliados ? 'Ocultar lista' : `Lista (${afiliados.length})`}
              </button>
            )}
          </div>
        </div>

        <div className={`grid ${showAfiliados ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-0`}>
          {/* Tree */}
          <div className="p-3 overflow-auto max-h-[360px]">
            {!rootNode ? (
              <div className="text-center py-8 text-[#6B7280]">
                <Network size={24} className="mx-auto mb-2 text-[#9CA3AF] opacity-30" />
                <p className="font-bold text-[#111111] text-xs mb-0.5">No está en la red binaria</p>
                <p className="text-[10px]">El distribuidor aún no fue ubicado en el árbol.</p>
              </div>
            ) : (
              <div className="flex justify-center min-w-max mx-auto">
                <MiniNode node={rootNode} depth={0} maxDepth={maxDepth} isRoot />
              </div>
            )}
          </div>

          {/* Lista (cuando está visible) */}
          {showAfiliados && afiliados.length > 0 && (
            <div className="border-t lg:border-t-0 lg:border-l border-[#C8D8CB] overflow-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#F4F7F5] z-10">
                  <tr className="border-b border-[#C8D8CB]">
                    {['Código', 'Nombre', 'Pos', 'Niv'].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left text-[#9CA3AF] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {afiliados.map((node) => (
                    <tr
                      key={node.id}
                      className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] cursor-pointer transition-colors"
                      onClick={() => navigate(`${basePath}/distribuidores/${node.profile.id}`)}
                    >
                      <td className="px-2 py-1.5">
                        <p className="font-mono text-[10px] text-[#1A4E26] font-bold whitespace-nowrap">{node.profile.codigo_distribuidor ?? '—'}</p>
                      </td>
                      <td className="px-2 py-1.5 text-[#111111] text-[10px] font-semibold max-w-[180px] truncate" title={displayName(node.profile)}>
                        {displayName(node.profile)}
                      </td>
                      <td className="px-2 py-1.5 text-[#6B7280] text-[10px] capitalize">{node.posicion?.[0] ?? 'F'}</td>
                      <td className="px-2 py-1.5 text-[#6B7280] text-[10px]">N{node.nivel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Comisiones recientes + Pedidos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-[#C8D8CB] rounded-xl p-4">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-2.5 flex items-center gap-1.5">
            <DollarSign size={11} className="text-[#D4AF37]" /> Últimas comisiones
          </h2>
          {comisiones.length === 0 ? (
            <p className="text-[#6B7280] text-xs">Sin comisiones registradas.</p>
          ) : (
            <div className="divide-y divide-[#C8D8CB]/50">
              {comisiones.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[#111111] text-xs font-semibold capitalize">{c.tipo}{c.nivel_red !== null ? ` · N${c.nivel_red}` : ''}</p>
                    <p className="text-[#9CA3AF] text-[10px]">
                      {new Date(c.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[#111111] font-bold text-xs">${Number(c.monto).toFixed(2)}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize ${estadoComisionBadge(c.estado)}`}>
                      {c.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#C8D8CB] rounded-xl p-4">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-2.5 flex items-center gap-1.5">
            <ShoppingBag size={11} className="text-[#1A4E26]" /> Últimos pedidos
          </h2>
          {pedidos.length === 0 ? (
            <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
              <AlertCircle size={12} />
              Sin pedidos registrados.
            </div>
          ) : (
            <div className="divide-y divide-[#C8D8CB]/50">
              {pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[#111111] text-xs font-semibold">
                      {p.numero_pedido ? `NV-${String(p.numero_pedido).padStart(6, '0')}` : '—'}
                    </p>
                    <p className="text-[#9CA3AF] text-[10px]">
                      {new Date(p.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[#111111] font-bold text-xs">${Number(p.total).toFixed(2)}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize ${estadoPedidoBadge(p.estado)}`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
