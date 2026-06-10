import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users, Network, Search, Crown, User, ChevronRight, ChevronDown,
  Star, Sparkles, Layers, TrendingUp, Award,
} from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import type { NodoBinario, Profile } from '../../lib/types';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface TreeNode extends NodoBinario {
  profile: Profile;
  children: TreeNode[];
}

function countNodes(node: TreeNode): number {
  return 1 + node.children.reduce((s, c) => s + countNodes(c), 0);
}

function sumPuntos(node: TreeNode): number {
  return (node.profile.puntos ?? 0) + node.children.reduce((s, c) => s + sumPuntos(c), 0);
}

const paqueteStyles: Record<string, { border: string; bg: string; text: string; label: string }> = {
  basico: { border: 'border-[#C8D8CB]', bg: 'bg-[#F4F7F5]', text: 'text-[#6B7280]', label: 'Básico' },
  emprendedor: { border: 'border-[#1A4E26]/40', bg: 'bg-[#EBF4ED]', text: 'text-[#1A4E26]', label: 'Emprendedor' },
  lider: { border: 'border-[#D4AF37]/60', bg: 'bg-[#FFFDF0]', text: 'text-[#D4AF37]', label: 'Líder' },
};

// ── Recursive card: shows binary descendants for a non-admin node ──
function BinaryNodeCard({ node, depth, maxDepth }: { node: TreeNode; depth: number; maxDepth: number }) {
  if (depth > maxDepth) return null;
  const pkg = node.profile.paquete ?? 'basico';
  const style = paqueteStyles[pkg] ?? paqueteStyles.basico;
  const isFrontal = depth === 0 && !node.posicion;
  const total = countNodes(node) - 1;

  return (
    <div className="flex flex-col items-center">
      <Link
        to={`/admin/distribuidores/${node.profile.id}`}
        className={`group block border-2 rounded-2xl p-3 w-44 text-center hover:shadow-[0_8px_24px_rgba(26,78,38,0.15)] transition-all ${style.border} ${style.bg}`}
      >
        <div className={`w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center bg-white ${style.text} border ${style.border}`}>
          <User size={16} />
        </div>
        <p className={`font-mono text-[11px] font-bold mb-0.5 ${style.text}`}>
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        <p className="text-[#111111] text-[11px] font-bold leading-tight line-clamp-2 mb-1" title={node.profile.nombre_completo}>
          {node.profile.nombre_completo}
        </p>
        <p className="text-[#D4AF37] text-[10px] font-bold">★ {node.profile.puntos ?? 0} pts</p>
        <div className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${style.text} bg-white/70`}>
          {style.label}
        </div>
        {isFrontal ? (
          <p className="text-[9px] mt-1 text-[#1A4E26] font-bold uppercase tracking-wider">Frontal</p>
        ) : node.posicion && (
          <p className="text-[9px] mt-1 text-[#9CA3AF] uppercase tracking-wider">
            {node.posicion === 'izquierda' ? '← Izq' : 'Der →'}
          </p>
        )}
        {total > 0 && (
          <p className="text-[9px] mt-1 text-[#9CA3AF]">+{total} en su red</p>
        )}
      </Link>

      {node.children.length > 0 && depth < maxDepth && (
        <div className="flex gap-5 mt-5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 h-5 w-px bg-[#C8D8CB]" />
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col items-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 h-5 w-px bg-[#C8D8CB]" />
              <BinaryNodeCard node={child} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card showing a single frontal of the admin (with its binary subtree) ──
function FrontalColumn({ node, maxDepth, idx }: { node: TreeNode; maxDepth: number; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.03 }}
      className="bg-[#FAFBFA] border border-[#C8D8CB] rounded-2xl p-5 shrink-0"
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#C8D8CB]">
        <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
          <Star size={13} fill="currentColor" />
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-bold">Frontal {idx + 1}</p>
          <p className="text-[#111111] text-xs font-bold">{node.profile.nombre_completo}</p>
        </div>
      </div>
      <BinaryNodeCard node={node} depth={0} maxDepth={maxDepth} />
    </motion.div>
  );
}

export default function AdminRed() {
  const [adminNode, setAdminNode] = useState<TreeNode | null>(null);
  const [allNodes, setAllNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDepth, setMaxDepth] = useState(3);
  const [search, setSearch] = useState('');
  const [showTable, setShowTable] = useState(true);
  const [filterPaquete, setFilterPaquete] = useState<string>('todos');

  useEffect(() => {
    async function load() {
      try {
        // Cargar TODOS los profiles primero (no solo los que tienen nodo)
        const { data: perfiles } = await supabaseAdmin.from('profiles').select('*');
        const profileMap = new Map<string, Profile>();
        for (const p of perfiles ?? []) profileMap.set(p.id, p as Profile);

        const adminProfile = (perfiles ?? []).find((p) => p.rol === 'admin') as Profile | undefined;
        if (!adminProfile) {
          setLoading(false);
          return;
        }

        // Cargar nodos binarios
        const { data: nodos } = await supabaseAdmin
          .from('red_binaria')
          .select('*')
          .order('nivel', { ascending: true })
          .limit(1000);

        const nodeMap = new Map<string, TreeNode>();
        for (const n of nodos ?? []) {
          const profile = profileMap.get(n.distribuidor_id);
          if (!profile) continue;
          nodeMap.set(n.id, { ...(n as unknown as NodoBinario), profile, children: [] });
        }

        // Asegurar que el admin tiene un nodo en red_binaria
        let adminTreeNode: TreeNode | null = null;
        for (const [, node] of nodeMap) {
          if (node.distribuidor_id === adminProfile.id) {
            adminTreeNode = node;
            break;
          }
        }
        if (!adminTreeNode) {
          // Crear nodo del admin sobre la marcha
          const { data: newAdminNode } = await supabaseAdmin
            .from('red_binaria')
            .insert({ distribuidor_id: adminProfile.id, padre_id: null, posicion: null, nivel: 1 })
            .select('*')
            .single();
          if (newAdminNode) {
            adminTreeNode = { ...(newAdminNode as unknown as NodoBinario), profile: adminProfile, children: [] };
            nodeMap.set(adminTreeNode.id, adminTreeNode);
          }
        }

        if (!adminTreeNode) {
          setLoading(false);
          return;
        }

        // Construir relaciones padre/hijo
        for (const [, node] of nodeMap) {
          if (node.id === adminTreeNode.id) continue;
          if (node.padre_id) {
            const parent = nodeMap.get(node.padre_id);
            if (parent) {
              parent.children.push(node);
              continue;
            }
          }
          // Huérfanos no-admin → se cuelgan del admin como frontales
          node.padre_id = adminTreeNode.id;
          node.posicion = null;
          adminTreeNode.children.push(node);
        }

        // Aplanar para tabla
        const flat: TreeNode[] = [];
        const collect = (n: TreeNode) => { flat.push(n); n.children.forEach(collect); };
        collect(adminTreeNode);

        setAdminNode(adminTreeNode);
        setAllNodes(flat);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const frontales = adminNode?.children ?? [];
  const totalRed = adminNode ? countNodes(adminNode) - 1 : 0;
  const volumenTotal = adminNode ? sumPuntos(adminNode) - (adminNode.profile.puntos ?? 0) : 0;
  const totalDistribuidores = allNodes.filter((n) => n.profile.rol !== 'admin').length;
  const totalLideres = allNodes.filter((n) => n.profile.paquete === 'lider').length;

  const filteredNodes = useMemo(() => {
    let list = allNodes.filter((n) => n.profile.rol !== 'admin');
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((n) =>
        n.profile.nombre_completo.toLowerCase().includes(q) ||
        (n.profile.codigo_distribuidor ?? '').toLowerCase().includes(q) ||
        n.profile.email.toLowerCase().includes(q)
      );
    }
    if (filterPaquete !== 'todos') {
      list = list.filter((n) => n.profile.paquete === filterPaquete);
    }
    return list;
  }, [allNodes, search, filterPaquete]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
          <Network size={26} className="text-[#1A4E26]" />
          Red Binaria
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          Sistema Frontal Directo Binario Continuo · El admin puede tener N frontales · Bajo cada frontal el árbol es estrictamente binario
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] text-white rounded-2xl p-4 relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 opacity-30">
            <Crown size={24} className="text-[#D4AF37]" />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-1 font-bold">Total en red</p>
          <p className="font-heading font-bold text-3xl text-white">{totalRed}</p>
          <p className="text-[10px] text-white/65 mt-1">distribuidores</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#D4AF37]/40 rounded-2xl p-4"
        >
          <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-1 font-bold">Frontales</p>
          <p className="font-heading font-bold text-3xl text-[#D4AF37]">{frontales.length}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">directos del admin</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-[#1A4E26]/40 rounded-2xl p-4"
        >
          <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] mb-1 font-bold">Líderes</p>
          <p className="font-heading font-bold text-3xl text-[#1A4E26]">{totalLideres}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">de {totalDistribuidores} dist.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-[#C8D8CB] rounded-2xl p-4"
        >
          <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] mb-1 font-bold flex items-center gap-1">
            <TrendingUp size={10} /> Volumen
          </p>
          <p className="font-heading font-bold text-3xl text-[#111111]">★ {volumenTotal.toLocaleString('es-EC')}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">puntos totales</p>
        </motion.div>
      </div>

      {/* Multi-leg admin info card */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 mb-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <p className="font-heading font-bold text-[#111111] text-sm mb-1">Privilegio del admin</p>
          <p className="text-[#6B7280] text-xs leading-relaxed">
            El administrador puede tener cualquier número de distribuidores frontales (10, 100, 1.000+). Cada frontal abre un nuevo árbol binario.
            A partir del frontal, todos los demás nodos siguen la lógica binaria estricta: solo dos hijos (izquierda y derecha) por distribuidor.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o email..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#C8D8CB] rounded-xl text-xs text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
        </div>
        <select
          value={filterPaquete}
          onChange={(e) => setFilterPaquete(e.target.value)}
          className="bg-white border border-[#C8D8CB] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
        >
          <option value="todos">Todos los paquetes</option>
          <option value="basico">Básico</option>
          <option value="emprendedor">Emprendedor</option>
          <option value="lider">Líder</option>
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-[#6B7280] flex items-center gap-1.5">
            <Layers size={13} />
            Profundidad:
          </label>
          <select
            value={maxDepth}
            onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
            className="bg-white border border-[#C8D8CB] rounded-md px-2 py-1 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} nivel{d > 1 ? 'es' : ''}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden mb-5">
        <button
          onClick={() => setShowTable(!showTable)}
          className="w-full px-5 py-3.5 border-b border-[#C8D8CB] bg-[#FAFBFA] flex items-center justify-between hover:bg-[#F4F7F5] transition-colors"
        >
          <div className="flex items-center gap-2">
            {showTable ? <ChevronDown size={15} className="text-[#6B7280]" /> : <ChevronRight size={15} className="text-[#6B7280]" />}
            <h2 className="font-heading font-bold text-[#111111] text-sm">Lista de distribuidores</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1A4E26]/10 text-[#1A4E26] px-2 py-0.5 rounded-full">
              {filteredNodes.length}
            </span>
          </div>
        </button>
        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Distribuidor', 'Paquete', 'Puntos', 'Posición', 'Nivel', 'Upline', 'Estado'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map((node) => {
                  const pkg = node.profile.paquete ?? 'basico';
                  const style = paqueteStyles[pkg] ?? paqueteStyles.basico;
                  const parent = node.padre_id ? allNodes.find((n) => n.id === node.padre_id) : null;
                  return (
                    <tr key={node.id} className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link to={`/admin/distribuidores/${node.profile.id}`} className="block hover:text-[#1A4E26]">
                          <p className="text-[#111111] text-xs font-bold">{node.profile.nombre_completo}</p>
                          <p className="text-[#1A4E26] text-[10px] font-mono">{node.profile.codigo_distribuidor}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${style.text} ${style.bg} border ${style.border}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#D4AF37] font-bold text-xs">★ {node.profile.puntos ?? 0}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {!node.posicion ? (
                          <span className="inline-flex items-center gap-1 bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded text-[10px] font-bold">
                            <Star size={9} fill="currentColor" /> Frontal
                          </span>
                        ) : node.posicion === 'izquierda' ? (
                          <span className="text-[#1A4E26] font-medium">← Izquierda</span>
                        ) : (
                          <span className="text-[#1A4E26] font-medium">Derecha →</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#6B7280] text-xs">N{node.nivel}</td>
                      <td className="px-4 py-2.5 text-[#6B7280] text-xs font-mono">
                        {parent?.profile.codigo_distribuidor ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          node.profile.estado === 'activo' ? 'bg-[#EBF4ED] text-[#1A4E26]' : 'bg-red-50 text-red-600'
                        }`}>
                          {node.profile.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredNodes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#9CA3AF] text-sm">
                      No hay distribuidores con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tree visualization */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#C8D8CB] bg-[#FAFBFA] flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-heading font-bold text-[#111111] text-sm flex items-center gap-2">
            <Network size={14} className="text-[#1A4E26]" />
            Árbol completo
          </h2>
          <p className="text-[10px] text-[#9CA3AF]">
            {frontales.length} frontal{frontales.length !== 1 ? 'es' : ''} · profundidad {maxDepth}
          </p>
        </div>

        {loading ? (
          <Spinner />
        ) : !adminNode ? (
          <div className="text-center py-16 text-[#6B7280]">
            <Network size={40} className="mx-auto mb-3 text-[#9CA3AF] opacity-30" />
            <p className="text-lg font-bold mb-1 text-[#111111]">Red vacía</p>
            <p className="text-sm">No hay distribuidores en la red aún.</p>
          </div>
        ) : (
          <div className="p-5">
            {/* Admin root card */}
            <div className="flex justify-center mb-2">
              <div className="border-2 border-[#0B2913] bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] rounded-2xl p-4 w-60 text-center shadow-[0_15px_40px_rgba(26,78,38,0.25)] relative">
                <div className="absolute -top-2 -right-2 bg-[#D4AF37] text-[#0B2913] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                  Admin
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 mx-auto mb-2 flex items-center justify-center">
                  <Crown size={22} className="text-[#D4AF37]" />
                </div>
                <p className="font-mono text-[11px] text-[#D4AF37] font-bold mb-0.5">
                  {adminNode.profile.codigo_distribuidor ?? '—'}
                </p>
                <p className="text-white text-sm font-bold leading-tight mb-1 line-clamp-2">
                  {adminNode.profile.nombre_completo}
                </p>
                <p className="text-[#D4AF37] text-xs font-bold">★ {adminNode.profile.puntos ?? 0} pts</p>
                <p className="text-white/65 text-[10px] mt-1 font-bold uppercase tracking-wider">
                  ROOT · {frontales.length} frontal{frontales.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>

            {/* Connector down + horizontal */}
            {frontales.length > 0 && (
              <>
                <div className="flex justify-center">
                  <div className="h-6 w-px bg-[#C8D8CB]" />
                </div>
                <p className="text-center text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-3">
                  ↓ Frontales directos del admin (multi-leg) ↓
                </p>

                {/* Frontales: scrollable horizontal list */}
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-5 min-w-max px-2">
                    {frontales.map((frontal, idx) => (
                      <FrontalColumn key={frontal.id} node={frontal} maxDepth={maxDepth - 1} idx={idx} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {frontales.length === 0 && (
              <div className="text-center mt-6 py-8 text-[#9CA3AF] text-sm">
                <Users size={32} className="mx-auto mb-2 opacity-40" />
                Aún no hay frontales asignados. Al aprobar una solicitud, puedes ubicarla directamente bajo el admin como frontal.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 flex gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
            <Crown size={16} />
          </div>
          <div>
            <p className="text-[#111111] font-bold text-xs">Admin = N frontales</p>
            <p className="text-[#6B7280] text-[11px] leading-snug">Puede colocar a sus directos sin restricción de posición.</p>
          </div>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 flex gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A4E26]/10 text-[#1A4E26] flex items-center justify-center shrink-0">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[#111111] font-bold text-xs">Distribuidor = 2 hijos</p>
            <p className="text-[#6B7280] text-[11px] leading-snug">Solo izquierda y derecha. Asignación automática.</p>
          </div>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 flex gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Award size={16} />
          </div>
          <div>
            <p className="text-[#111111] font-bold text-xs">Hasta 14 niveles</p>
            <p className="text-[#6B7280] text-[11px] leading-snug">Comisiones por nivel a todo el upline elegible.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
