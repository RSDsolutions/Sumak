import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Network, Users, Star, TrendingUp, Hash, Crown, Award, Copy, Check,
  ChevronDown, ChevronRight, User, Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { logger } from '../../lib/logger';
import { displayName } from '../../lib/profile';
import type { NodoBinario, Profile } from '../../lib/types';

type PosicionStyle = {
  bg: string; text: string; border: string; label: string; icon: '←' | '→' | '★';
};
const posicionStyles: Record<'izquierda' | 'derecha' | 'frontal', PosicionStyle> = {
  izquierda: { bg: 'bg-[#1A4E26]/10', text: 'text-[#1A4E26]', border: 'border-[#1A4E26]/40', label: 'Izquierda', icon: '←' },
  derecha:   { bg: 'bg-[#256B36]/10', text: 'text-[#256B36]', border: 'border-[#256B36]/40', label: 'Derecha',   icon: '→' },
  frontal:   { bg: 'bg-[#D4AF37]/15', text: 'text-[#B8860B]', border: 'border-[#D4AF37]/50', label: 'Frontal',   icon: '★' },
};
function posicionKey(pos: string | null): 'izquierda' | 'derecha' | 'frontal' {
  if (pos === 'izquierda' || pos === 'derecha') return pos;
  return 'frontal';
}

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

function countSubtree(node: TreeNode): number {
  return node.children.reduce((s, c) => s + 1 + countSubtree(c), 0);
}

function sumPuntos(node: TreeNode): number {
  return (node.profile.puntos ?? 0) + node.children.reduce((s, c) => s + sumPuntos(c), 0);
}

const paqueteStyles: Record<string, { border: string; bg: string; text: string; label: string }> = {
  basico: { border: 'border-[#C8D8CB]', bg: 'bg-[#F4F7F5]', text: 'text-[#6B7280]', label: 'Básico' },
  emprendedor: { border: 'border-[#1A4E26]/40', bg: 'bg-[#EBF4ED]', text: 'text-[#1A4E26]', label: 'Emprendedor' },
  lider: { border: 'border-[#D4AF37]/60', bg: 'bg-[#FFFDF0]', text: 'text-[#D4AF37]', label: 'Líder' },
};

function NodeCard({ node, depth, maxDepth = 12, isRoot }: {
  node: TreeNode; depth: number; maxDepth?: number; isRoot?: boolean;
}) {
  if (depth > maxDepth) return null;

  const pkg = node.profile.paquete ?? 'basico';
  const style = paqueteStyles[pkg] ?? paqueteStyles.basico;
  const isAdmin = node.profile.rol === 'admin';
  const nombre = displayName(node.profile);
  const sinPerfil = !node.profile.nombre_completo && !isAdmin;
  const posKey = posicionKey(node.posicion);
  const posStyle = posicionStyles[posKey];

  return (
    <div className="flex flex-col items-center">
      <div className={`border-2 rounded-2xl text-center transition-all relative ${
        isRoot
          ? 'border-[#1A4E26] bg-gradient-to-br from-[#EBF4ED] to-[#D5ECD9] w-56 shadow-[0_8px_24px_rgba(26,78,38,0.15)]'
          : isAdmin
            ? 'border-[#0B2913] bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] w-48'
            : `${style.border} ${style.bg} w-48`
      } p-3.5`}>
        {/* Badge de posicion flotante (no se muestra en root ni admin) */}
        {!isRoot && !isAdmin && (
          <div
            className={`absolute -top-2 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm ${posStyle.bg} ${posStyle.text} ${posStyle.border}`}
          >
            <span>{posStyle.icon}</span>
            <span>{posStyle.label}</span>
          </div>
        )}

        <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
          isRoot ? 'bg-[#1A4E26] text-white' :
          isAdmin ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
          'bg-white text-[#1A4E26] border border-[#C8D8CB]'
        }`}>
          {isRoot ? <User size={20} /> : isAdmin ? <Crown size={20} /> : <User size={20} />}
        </div>

        <p className={`font-mono text-[11px] font-bold mb-1 ${
          isRoot ? 'text-[#1A4E26]' : isAdmin ? 'text-[#D4AF37]' : style.text
        }`}>
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        {node.profile.username && (
          <p className={`text-[10px] font-bold mb-1 truncate ${
            isAdmin ? 'text-[#D4AF37]' : 'text-[#1A4E26]'
          }`} title={`@${node.profile.username}`}>
            @{node.profile.username}
          </p>
        )}

        <p
          className={`text-xs font-bold leading-tight mb-1 line-clamp-2 ${
            isAdmin ? 'text-white' : sinPerfil ? 'text-[#9CA3AF] italic' : 'text-[#111111]'
          }`}
          title={nombre}
        >
          {sinPerfil ? 'Perfil sin completar' : nombre}
        </p>

        <div className={`text-[10px] font-semibold text-[#D4AF37]`}>
          ★ {node.profile.puntos ?? 0} pts
        </div>

        {!isAdmin && (
          <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${style.text} bg-white/60`}>
            {style.label}
          </div>
        )}

        {isRoot && (
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#1A4E26]">
            TÚ
          </div>
        )}
        {isAdmin && (
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
            ADMIN
          </div>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && depth < maxDepth && (
        <TreeBranches gap={24} drop={28}>
          {node.children.map((child) => (
            <NodeCard key={child.id} node={child} depth={depth + 1} maxDepth={maxDepth} />
          ))}
        </TreeBranches>
      )}
    </div>
  );
}

// ── Tree branches: barra horizontal + caidas verticales a cada hijo ──
// Si hay un solo hijo, solo dibuja la linea vertical desde el padre.
// Si hay 2+, dibuja una "T" continua: vertical desde el padre, barra
// horizontal que abarca de centro a centro entre primer y ultimo hijo,
// y verticales que bajan a cada uno.
function TreeBranches({ children, gap = 24, drop = 28 }: {
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

function ReferralCard({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false);

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/registro?ref=${codigo}`
    : '';

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] text-white rounded-2xl p-5 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[#D4AF37]" />
          <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">Tu código de referido</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3 mb-3 flex items-center justify-between gap-2">
          <code className="font-mono font-bold text-lg text-white">{codigo}</code>
          <button
            onClick={() => copy(codigo)}
            className="w-8 h-8 rounded-lg bg-[#D4AF37] text-[#0B2913] flex items-center justify-center hover:bg-[#E8C94A] transition-colors"
            aria-label="Copiar código"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <p className="text-white/65 text-xs mb-2">Tu link de afiliación:</p>
        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <p className="text-white text-[11px] truncate">{referralUrl}</p>
          <button
            onClick={() => copy(referralUrl)}
            className="w-7 h-7 rounded-md bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors shrink-0"
            aria-label="Copiar enlace"
          >
            <Copy size={12} />
          </button>
        </div>

        <p className="text-white/50 text-[10px] mt-3">Comparte este link y gana $50 por cada afiliación directa.</p>
      </div>
    </div>
  );
}

export default function MiRed() {
  const { user, profile } = useAuth();
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [allInRed, setAllInRed] = useState<TreeNode[]>([]);
  // Default 6: cubre la mayoria de las redes de un distribuidor. Boton "ver mas"
  // expande hasta 12 que es la profundidad real maxima del sistema (14 niveles
  // del plan + margen).
  const [maxDepth, setMaxDepth] = useState(6);

  // Mantenemos el profile en una ref para usarlo dentro del load() sin
  // forzar re-runs del useEffect cuando solo cambia la referencia del objeto.
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Dependemos solo de user?.id (string estable). Si dependieramos del
  // objeto `profile`, cada refreshProfile (token refresh, modal de completar
  // datos, etc.) creaba una nueva referencia y disparaba un segundo load()
  // que corria en paralelo con el primero y dejaba el estado a medias
  // (cards visibles arriba, en blanco abajo).
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      // 1) Cargar el nodo del usuario. maybeSingle no lanza si no hay row.
      const { data: myNode, error: myNodeErr } = await supabase
        .from('red_binaria')
        .select('*')
        .eq('distribuidor_id', uid!)
        .maybeSingle();

      if (cancelled) return;

      if (myNodeErr) {
        logger.error('MiRed: error leyendo nodo del usuario', myNodeErr);
        setLoading(false);
        return;
      }
      if (!myNode) {
        // El usuario realmente NO esta en red_binaria. Mostramos el estado vacio.
        logger.warn('MiRed: usuario sin nodo en red_binaria', { uid });
        setRootNode(null);
        setAllInRed([]);
        setLoading(false);
        return;
      }

      // 2) Cargar todos los nodos visibles. limit alto por si la red crece.
      const { data: allNodes, error: allNodesErr } = await supabase
        .from('red_binaria')
        .select('*')
        .limit(5000);

      if (cancelled) return;

      if (allNodesErr) {
        logger.error('MiRed: error leyendo red_binaria', allNodesErr);
        setLoading(false);
        return;
      }
      const nodes = allNodes ?? [];

      // 3) Cargar profiles de los distribuidores que aparecen. Garantizamos
      //    incluir el del usuario actual via el contexto auth (profile)
      //    para evitar el bug "estoy en la red pero no me veo" si la RLS
      //    bloquea algun caso borderline.
      const distIds = Array.from(new Set(nodes.map((n) => n.distribuidor_id)));
      const { data: perfiles, error: perfilesErr } = distIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', distIds)
        : { data: [], error: null };

      if (cancelled) return;

      if (perfilesErr) {
        logger.error('MiRed: error leyendo profiles', perfilesErr);
      }

      const profileMap = new Map<string, Profile>();
      // Fallback: nuestro propio profile siempre disponible desde auth.
      // Lo leemos via ref para no entrar en el dep array del useEffect.
      const authProfile = profileRef.current;
      if (authProfile) profileMap.set(authProfile.id, authProfile);
      for (const p of perfiles ?? []) profileMap.set(p.id, p as Profile);

      // 4) Construir el mapa de nodos. Si falta un profile dejamos un
      //    placeholder mínimo en lugar de descartar el nodo, para que
      //    la rama no desaparezca de la vista.
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
        nodeMap.set(n.id, { ...(n as unknown as NodoBinario), profile: prof, children: [] });
      }

      // 5) Garantizamos que el nodo del usuario esté en el mapa, aunque
      //    no haya aparecido en `allNodes` por RLS o paginación.
      if (!nodeMap.has(myNode.id)) {
        nodeMap.set(myNode.id, {
          ...(myNode as unknown as NodoBinario),
          profile: authProfile ?? (profileMap.get(uid!) as Profile),
          children: [],
        });
      }

      // 6) Linkear padres/hijos.
      for (const [, node] of nodeMap) {
        if (node.padre_id) {
          const parent = nodeMap.get(node.padre_id);
          if (parent) parent.children.push(node);
        }
      }

      if (cancelled) return;

      const myTreeNode = nodeMap.get(myNode.id) ?? null;
      setRootNode(myTreeNode);

      // Flatten subtree para la vista de lista.
      const flat: TreeNode[] = [];
      const collect = (n: TreeNode) => {
        for (const c of n.children) { flat.push(c); collect(c); }
      };
      if (myTreeNode) collect(myTreeNode);
      setAllInRed(flat);

      setLoading(false);
    }

    load();

    return () => { cancelled = true; };
  }, [user?.id]);

  const leftChild = rootNode?.children.find((c) => c.posicion === 'izquierda');
  const rightChild = rootNode?.children.find((c) => c.posicion === 'derecha');
  const frontales = rootNode?.children.filter((c) => !c.posicion) ?? [];

  const leftCount = leftChild ? 1 + countSubtree(leftChild) : 0;
  const rightCount = rightChild ? 1 + countSubtree(rightChild) : 0;
  const frontalCount = frontales.length;
  const totalRed = rootNode ? countSubtree(rootNode) : 0;
  const volumenIzq = leftChild ? sumPuntos(leftChild) : 0;
  const volumenDer = rightChild ? sumPuntos(rightChild) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
          <Network size={24} className="text-[#1A4E26]" />
          Mi Red
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">Tu árbol de distribuidores · binario continuo</p>
      </div>

      {/* Top row: stats + referral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Stats card */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-[#C8D8CB] rounded-2xl p-4"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1 font-bold flex items-center gap-1">
              <span className="text-[#1A4E26]">←</span> Izquierda
            </p>
            <p className="font-heading font-bold text-2xl text-[#1A4E26]">{leftCount}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">Volumen: ★ {volumenIzq}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-[#C8D8CB] rounded-2xl p-4"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1 font-bold flex items-center gap-1">
              Derecha <span className="text-[#1A4E26]">→</span>
            </p>
            <p className="font-heading font-bold text-2xl text-[#1A4E26]">{rightCount}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">Volumen: ★ {volumenDer}</p>
          </motion.div>

          {frontalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border border-[#D4AF37]/40 rounded-2xl p-4"
            >
              <p className="text-[10px] uppercase tracking-wider text-[#D4AF37] mb-1 font-bold">Frontales</p>
              <p className="font-heading font-bold text-2xl text-[#D4AF37]">{frontalCount}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-1">Directos</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] text-white rounded-2xl p-4 ${frontalCount === 0 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#D4AF37] mb-1 font-bold flex items-center gap-1">
              <Users size={10} /> Total
            </p>
            <p className="font-heading font-bold text-2xl text-white">{totalRed}</p>
            <p className="text-[10px] text-white/65 mt-1">en tu red</p>
          </motion.div>
        </div>

        {/* Referral card */}
        {profile?.codigo_distribuidor && (
          <div>
            <ReferralCard codigo={profile.codigo_distribuidor} />
          </div>
        )}
      </div>

      {/* Tree visualization */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#C8D8CB] bg-[#FAFBFA] flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-heading font-bold text-[#111111] text-sm flex items-center gap-2">
              <Network size={14} className="text-[#1A4E26]" />
              Árbol binario · Tú + {maxDepth >= 12 ? 'toda tu red' : `${maxDepth} nivel${maxDepth > 1 ? 'es' : ''}`}
            </h2>
            <p className="text-[#9CA3AF] text-[11px] mt-0.5">Ajusta la profundidad para ver más de tu red.</p>
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
                <option value={12}>Toda mi red</option>
              </select>
            </label>
            {allInRed.length > 0 && (
              <button
                onClick={() => setShowList(!showList)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26]/10 text-[#1A4E26] text-xs font-bold hover:bg-[#1A4E26]/15 transition-colors"
              >
                {showList ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {showList ? 'Ocultar lista' : `Ver lista (${allInRed.length})`}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <Spinner />
          ) : !rootNode ? (
            <div className="text-center py-16 text-[#6B7280]">
              <Network size={40} className="mx-auto mb-3 text-[#9CA3AF] opacity-30" />
              <p className="text-lg font-bold mb-1 text-[#111111]">Aún no estás en la red</p>
              <p className="text-sm">Tu posición aún no ha sido asignada por el administrador.</p>
            </div>
          ) : (
            <div
              className="flex justify-center px-5 pt-5 pb-6"
              style={{ width: 'max-content', minWidth: '100%' }}
            >
              <NodeCard node={rootNode} depth={0} maxDepth={maxDepth} isRoot />
            </div>
          )}
        </div>

        {/* Expanded list of all members */}
        {showList && allInRed.length > 0 && (
          <div className="border-t border-[#C8D8CB] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Código / usuario', 'Nombre', 'Paquete', 'Puntos', 'Posición', 'Nivel'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allInRed.map((node) => {
                  const pkg = node.profile.paquete ?? 'basico';
                  const style = paqueteStyles[pkg] ?? paqueteStyles.basico;
                  const posKey = posicionKey(node.posicion);
                  const posStyle = posicionStyles[posKey];
                  const sinPerfil = !node.profile.nombre_completo;
                  return (
                    <tr key={node.id} className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] transition-colors">
                      <td className="px-4 py-2">
                        <p className="font-mono text-xs text-[#1A4E26] font-bold">{node.profile.codigo_distribuidor}</p>
                        {node.profile.username && (
                          <p className="text-[#6B7280] text-[10px] font-semibold">@{node.profile.username}</p>
                        )}
                      </td>
                      <td className={`px-4 py-2 text-xs font-semibold ${sinPerfil ? 'text-[#9CA3AF] italic' : 'text-[#111111]'}`}>
                        {sinPerfil ? 'Perfil sin completar' : displayName(node.profile)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${style.text} ${style.bg} border ${style.border}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[#D4AF37] font-bold text-xs">★ {node.profile.puntos ?? 0}</td>
                      <td className="px-4 py-2 text-xs">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${posStyle.bg} ${posStyle.text} ${posStyle.border}`}>
                          <span>{posStyle.icon}</span>
                          {posStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[#6B7280] text-xs">N{node.nivel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white border border-[#C8D8CB] rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold mb-3">Cómo funciona tu red</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A4E26]/10 text-[#1A4E26] flex items-center justify-center shrink-0">
              <Users size={14} />
            </div>
            <div>
              <p className="text-[#111111] font-bold">Binario continuo</p>
              <p className="text-[#6B7280] text-[11px]">Solo 2 directos: izquierda y derecha.</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
              <Star size={14} />
            </div>
            <div>
              <p className="text-[#111111] font-bold">Volumen pareado</p>
              <p className="text-[#6B7280] text-[11px]">Ganas 50% del lado menor cada mes.</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Award size={14} />
            </div>
            <div>
              <p className="text-[#111111] font-bold">14 niveles</p>
              <p className="text-[#6B7280] text-[11px]">Comisiones hasta el nivel 14 del upline.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
