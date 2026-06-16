import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Users, Network, ShoppingBag, DollarSign,
  Star, TrendingUp, Calendar, CheckCircle2, XCircle, User, Crown,
  ChevronDown, ChevronRight, Hash, ArrowUpRight, Award, Package,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
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
  const pkg = node.profile.paquete ?? null;
  const pkgLabel = pkg === 'lider' ? 'Líder' : pkg === 'emprendedor' ? 'Emprendedor' : pkg === 'basico' ? 'Básico' : null;
  const isAdmin = node.profile.rol === 'admin';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`border-2 rounded-xl text-center transition-all w-40 p-2.5 ${
          isRoot
            ? 'border-[#1A4E26] bg-gradient-to-br from-[#EBF4ED] to-[#D5ECD9] shadow-[0_6px_16px_rgba(26,78,38,0.15)]'
            : isAdmin
              ? 'border-[#D4AF37] bg-gradient-to-br from-[#0F2E18] to-[#1A4E26]'
              : 'border-[#C8D8CB] bg-white'
        }`}
      >
        <div className={`w-7 h-7 rounded-lg mx-auto mb-1 flex items-center justify-center ${
          isRoot ? 'bg-[#1A4E26] text-white' :
          isAdmin ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
          'bg-[#F4F7F5] text-[#1A4E26]'
        }`}>
          {isAdmin ? <Crown size={14} /> : <User size={14} />}
        </div>
        <p className={`font-mono text-[10px] font-bold mb-0.5 truncate ${
          isAdmin ? 'text-[#D4AF37]' : 'text-[#1A4E26]'
        }`}>
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        <p
          className={`text-[10px] font-bold leading-tight line-clamp-2 ${
            isAdmin ? 'text-white' : sinPerfil ? 'text-[#9CA3AF] italic' : 'text-[#111111]'
          }`}
          title={displayName(node.profile)}
        >
          {sinPerfil ? 'Sin perfil' : displayName(node.profile)}
        </p>
        <div className="flex items-center justify-center gap-1 mt-1 text-[9px] font-bold text-[#D4AF37]">
          <Star size={8} />
          {node.profile.puntos ?? 0}
        </div>
        {pkgLabel && !isAdmin && (
          <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-[#1A4E26] bg-[#EBF4ED]">
            {pkgLabel}
          </div>
        )}
        {isRoot && (
          <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-[#1A4E26]">
            TITULAR
          </div>
        )}
      </div>

      {node.children.length > 0 && depth < maxDepth && (
        <div className="flex gap-3 mt-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 h-4 w-px bg-[#C8D8CB]" />
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col items-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 h-4 w-px bg-[#C8D8CB]" />
              <MiniNode node={child} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          ))}
        </div>
      )}
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
        { count: directosCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('comisiones').select('*').eq('beneficiario_id', uid).order('created_at', { ascending: false }).limit(10),
        supabase.from('pedidos').select('*').eq('distribuidor_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('pedidos').select('id, total, estado, created_at').eq('distribuidor_id', uid),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('patrocinador_id', uid),
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

      const newStats: Stats = {
        directos: directosCount ?? 0,
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
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate(`${basePath}/distribuidores`)} className="text-[#6B7280] hover:text-[#111111] transition-colors mt-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading font-bold text-2xl text-[#111111]">
              {profile.nombre_completo ?? displayName(profile)}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
              profile.estado === 'activo'
                ? 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {profile.estado}
            </span>
            {rango && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 uppercase tracking-widest">
                <Award size={11} /> {rango.rango}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm">
            <span className="font-mono text-[#1A4E26] font-bold">{profile.codigo_distribuidor ?? '—'}</span>
            {profile.username && <span className="text-[#6B7280]">· @{profile.username}</span>}
            {profile.paquete && <span className="text-[#6B7280]">· {paqueteLabel[profile.paquete]}</span>}
          </div>
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

      {/* Activación del mes */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`rounded-2xl p-5 mb-6 border ${
            stats.activacionMes ? 'border-[#1A4E26]/30 bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] text-white' : 'border-amber-300 bg-[#FFF8E6]'
          }`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5 ${
                stats.activacionMes ? 'text-[#D4AF37]' : 'text-amber-700'
              }`}>
                <Calendar size={11} /> Activación de {monthName}
              </p>
              <p className={`font-heading font-bold text-xl mb-2 ${
                stats.activacionMes ? 'text-white' : 'text-amber-900'
              }`}>
                {stats.activacionMes
                  ? `✓ Activo este mes — pedido de $${stats.maxPedidoMes.toFixed(2)}`
                  : `Inactivo este mes — pedido máximo: $${stats.maxPedidoMes.toFixed(2)}`}
              </p>
              <div className={`w-full h-2 rounded-full overflow-hidden mt-1 ${
                stats.activacionMes ? 'bg-white/20' : 'bg-amber-100'
              }`}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progresoActivacion}%`,
                    background: stats.activacionMes ? 'linear-gradient(90deg, #D4AF37, #E8C94A)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                  }}
                />
              </div>
              <p className={`text-[10px] mt-1.5 ${stats.activacionMes ? 'text-white/70' : 'text-amber-700'}`}>
                ${stats.maxPedidoMes.toFixed(2)} / ${planConfig.minActivacionMensual.toFixed(2)} · {stats.pedidosMes} pedido(s) este mes
              </p>
            </div>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              stats.activacionMes ? 'bg-white/15 border border-white/25' : 'bg-amber-100 border border-amber-200'
            }`}>
              {stats.activacionMes
                ? <CheckCircle2 size={36} className="text-[#D4AF37]" />
                : <XCircle size={36} className="text-amber-500" />}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats grid (8 KPIs) */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Directos', value: stats.directos.toString(), sub: rango?.rango ?? '—', icon: <Users size={16} />, color: 'text-[#1A4E26]' },
            { label: 'Red total', value: stats.redTotal.toString(), sub: `${stats.izquierdaCount} izq · ${stats.derechaCount} der`, icon: <Network size={16} />, color: 'text-[#1A4E26]' },
            { label: 'Volumen izq', value: `★ ${stats.volumenIzq}`, sub: 'puntos pareables', icon: <TrendingUp size={16} />, color: 'text-[#D4AF37]' },
            { label: 'Volumen der', value: `★ ${stats.volumenDer}`, sub: 'puntos pareables', icon: <TrendingUp size={16} />, color: 'text-[#D4AF37]' },
            { label: 'Pedidos totales', value: stats.pedidosTotales.toString(), sub: `$${stats.totalCompradoHistorico.toFixed(2)} histórico`, icon: <ShoppingBag size={16} />, color: 'text-blue-600' },
            { label: 'Compras del mes', value: `$${stats.totalCompradoMes.toFixed(2)}`, sub: `${stats.pedidosMes} pedido(s)`, icon: <Package size={16} />, color: 'text-blue-600' },
            { label: 'Comisiones ganadas', value: `$${stats.totalComisionesGanadas.toFixed(2)}`, sub: 'pagadas total', icon: <CheckCircle2 size={16} />, color: 'text-[#1A4E26]' },
            { label: 'Comisiones pendientes', value: `$${stats.totalComisionesPendientes.toFixed(2)}`, sub: 'por pagar', icon: <DollarSign size={16} />, color: 'text-amber-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#C8D8CB] rounded-2xl p-4">
              <div className={`flex items-center gap-1.5 mb-1 ${s.color}`}>
                {s.icon}
                <p className="text-[10px] uppercase tracking-widest font-bold">{s.label}</p>
              </div>
              <p className="font-heading font-bold text-xl text-[#111111] leading-tight">{s.value}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Desglose comisiones por tipo + puntos + rango */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Por tipo */}
          <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-3 flex items-center gap-1.5">
              <Sparkles size={11} className="text-[#D4AF37]" /> Comisiones por tipo
            </p>
            <div className="space-y-2">
              {[
                { label: 'Afiliación (40%)', value: stats.comisionesAfiliacion, color: 'text-blue-600' },
                { label: 'Por nivel', value: stats.comisionesNivel, color: 'text-[#D4AF37]' },
                { label: 'Binaria (50%)', value: stats.comisionesBinaria, color: 'text-purple-600' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">{row.label}</span>
                  <span className={`font-bold ${row.color}`}>${row.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rango */}
          <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-3 flex items-center gap-1.5">
              <Award size={11} /> Rango actual
            </p>
            <p className="font-heading font-bold text-xl text-[#D4AF37] leading-tight">{rango?.rango ?? '—'}</p>
            <p className="text-[#1A4E26] text-xs font-bold mt-0.5">{rango?.bono ?? ''}</p>
            {nextRango ? (
              <>
                <div className="w-full bg-[#F4F7F5] rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-[#D4AF37] h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, (stats.directos / nextRango.personasDirectas) * 100)}%` }}
                  />
                </div>
                <p className="text-[#9CA3AF] text-[10px] mt-1">
                  {stats.directos} / {nextRango.personasDirectas} para <strong className="text-[#1A4E26]">{nextRango.rango}</strong>
                </p>
              </>
            ) : (
              <p className="text-[#1A4E26] text-xs font-bold mt-3">Rango máximo alcanzado</p>
            )}
          </div>

          {/* Puntos */}
          <div className="bg-gradient-to-br from-[#FFFDF5] to-[#FFFEF7] border border-[#D4AF37]/30 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-3 flex items-center gap-1.5">
              <Star size={11} /> Puntos acumulados
            </p>
            <p className="font-heading font-bold text-3xl text-[#D4AF37] leading-tight">★ {profile.puntos ?? 0}</p>
            <p className="text-[#9CA3AF] text-xs mt-2">Acumulados por pedidos confirmados</p>
          </div>
        </div>
      )}

      {/* Información personal + Patrocinador */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-[#C8D8CB] rounded-2xl p-5">
          <h2 className="font-heading font-semibold text-[#111111] mb-4 flex items-center gap-2">
            <User size={16} className="text-[#1A4E26]" /> Información personal
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {[
              { label: 'Email', value: profile.email },
              { label: 'Cédula', value: profile.cedula ?? '—' },
              { label: 'Teléfono', value: profile.telefono ?? '—' },
              { label: 'Ciudad', value: profile.ciudad ?? '—' },
              { label: 'Dirección', value: profile.direccion ?? '—' },
              { label: 'Registro', value: new Date(profile.fecha_registro).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) },
              { label: 'Aprobación', value: profile.fecha_aprobacion ? new Date(profile.fecha_aprobacion).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Código distribuidor', value: profile.codigo_distribuidor ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</dt>
                <dd className="text-[#111111] text-sm break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5">
          <h2 className="font-heading font-semibold text-[#111111] mb-4 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-[#1A4E26]" /> Patrocinador
          </h2>
          {patrocinador ? (
            <button
              onClick={() => navigate(`${basePath}/distribuidores/${patrocinador.id}`)}
              className="w-full text-left bg-[#F4F7F5] hover:bg-[#EBF4ED] border border-[#C8D8CB] rounded-xl p-4 transition-colors"
            >
              <p className="text-[#111111] font-bold text-sm">{displayName(patrocinador)}</p>
              <p className="text-[#1A4E26] font-mono text-xs font-bold mt-0.5">{patrocinador.codigo_distribuidor ?? '—'}</p>
              {patrocinador.username && (
                <p className="text-[#6B7280] text-[10px] mt-0.5">@{patrocinador.username}</p>
              )}
              <p className="text-[#9CA3AF] text-[10px] mt-2 flex items-center gap-1">
                Ver perfil <ChevronRight size={10} />
              </p>
            </button>
          ) : (
            <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-4 text-[#6B7280] text-xs">
              Sin patrocinador (afiliado directo del sistema).
            </div>
          )}
        </div>
      </div>

      {/* Sub-arbol binario */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#C8D8CB] bg-[#FAFBFA] flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-heading font-bold text-[#111111] text-sm flex items-center gap-2">
              <Network size={14} className="text-[#1A4E26]" />
              Red binaria de {profile.nombre_completo ?? displayName(profile)}
            </h2>
            <p className="text-[#9CA3AF] text-[11px] mt-0.5">
              {stats?.redTotal ?? 0} en su red · {maxDepth >= 12 ? 'toda la red' : `${maxDepth} niveles`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-[#6B7280] flex items-center gap-1.5">
              Profundidad:
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
                className="bg-white border border-[#C8D8CB] rounded-md px-2 py-1 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => (
                  <option key={d} value={d}>{d} nivel{d > 1 ? 'es' : ''}</option>
                ))}
                <option value={12}>Toda la red</option>
              </select>
            </label>
            {afiliados.length > 0 && (
              <button
                onClick={() => setShowAfiliados(!showAfiliados)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26]/10 text-[#1A4E26] text-xs font-bold hover:bg-[#1A4E26]/15 transition-colors"
              >
                {showAfiliados ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {showAfiliados ? 'Ocultar lista' : `Lista (${afiliados.length})`}
              </button>
            )}
          </div>
        </div>

        <div className="p-5 overflow-auto">
          {!rootNode ? (
            <div className="text-center py-12 text-[#6B7280]">
              <Network size={32} className="mx-auto mb-2 text-[#9CA3AF] opacity-30" />
              <p className="font-bold text-[#111111] mb-1">No está en la red binaria</p>
              <p className="text-xs">El distribuidor aún no fue ubicado en el árbol.</p>
            </div>
          ) : (
            <div className="flex justify-center overflow-x-auto pb-3 pt-1 min-w-max mx-auto">
              <MiniNode node={rootNode} depth={0} maxDepth={maxDepth} isRoot />
            </div>
          )}
        </div>

        {showAfiliados && afiliados.length > 0 && (
          <div className="border-t border-[#C8D8CB] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Código / usuario', 'Nombre', 'Posición', 'Nivel', 'Puntos', 'Paquete'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
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
                    <td className="px-4 py-2">
                      <p className="font-mono text-xs text-[#1A4E26] font-bold">{node.profile.codigo_distribuidor ?? '—'}</p>
                      {node.profile.username && <p className="text-[#6B7280] text-[10px]">@{node.profile.username}</p>}
                    </td>
                    <td className="px-4 py-2 text-[#111111] text-xs font-semibold">
                      {displayName(node.profile)}
                    </td>
                    <td className="px-4 py-2 text-[#6B7280] text-xs capitalize">{node.posicion ?? 'frontal'}</td>
                    <td className="px-4 py-2 text-[#6B7280] text-xs">N{node.nivel}</td>
                    <td className="px-4 py-2 text-[#D4AF37] font-bold text-xs">★ {node.profile.puntos ?? 0}</td>
                    <td className="px-4 py-2 text-[#6B7280] text-xs">
                      {node.profile.paquete ? paqueteLabel[node.profile.paquete] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comisiones + Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5">
          <h2 className="font-heading font-semibold text-[#111111] mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-[#D4AF37]" /> Últimas comisiones
          </h2>
          {comisiones.length === 0 ? (
            <p className="text-[#6B7280] text-sm">Sin comisiones registradas.</p>
          ) : (
            <div className="space-y-2">
              {comisiones.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#C8D8CB] last:border-0">
                  <div>
                    <p className="text-[#111111] text-sm capitalize">{c.tipo}</p>
                    <p className="text-[#9CA3AF] text-xs">
                      {new Date(c.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                      {c.nivel_red !== null && ` · N${c.nivel_red}`}
                    </p>
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

        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5">
          <h2 className="font-heading font-semibold text-[#111111] mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-[#1A4E26]" /> Últimos pedidos
          </h2>
          {pedidos.length === 0 ? (
            <div className="flex items-center gap-2 text-[#6B7280] text-sm">
              <AlertCircle size={16} />
              Sin pedidos registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#C8D8CB] last:border-0">
                  <div>
                    <p className="text-[#111111] text-sm font-semibold">
                      {p.numero_pedido ? `NV-${String(p.numero_pedido).padStart(6, '0')}` : new Date(p.created_at).toLocaleDateString('es-EC')}
                    </p>
                    <p className="text-[#9CA3AF] text-xs">{new Date(p.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#111111] font-bold text-sm">${Number(p.total).toFixed(2)}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${estadoPedidoBadge(p.estado)}`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ID hash al final */}
      <div className="mt-6 text-center text-[10px] text-[#9CA3AF] font-mono">
        <Hash size={10} className="inline mr-1" />
        {profile.id}
      </div>
    </div>
  );
}
