import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users, Network, Search, Crown, User, ChevronRight, ChevronDown,
  Star, Sparkles, Layers, TrendingUp, Award, ZoomIn, ZoomOut, Maximize2,
  RefreshCw, Move,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminBasePath } from '../../lib/useAdminBasePath';
import { displayName } from '../../lib/profile';
import type { NodoBinario, Profile } from '../../lib/types';

// Estilos de posicion en el arbol: izq verde + flecha, der verde + flecha,
// frontal dorado con estrella. Se usa en card y tabla.
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

// ── Zoom/Pan container for the binary tree ──────────────
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

function ZoomPanContainer({ children, height = 600 }: { children: React.ReactNode; height?: number }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = useCallback(() => setScale((s) => Math.min(ZOOM_MAX, parseFloat((s + ZOOM_STEP).toFixed(2)))), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(ZOOM_MIN, parseFloat((s - ZOOM_STEP).toFixed(2)))), []);
  const reset = useCallback(() => { setScale(1); setOffset({ x: 0, y: 0 }); }, []);

  // Mouse drag pan
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setOffset({ x: dragRef.current.offsetX + dx, y: dragRef.current.offsetY + dy });
    };
    const onUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  // Touch drag pan
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    setIsDragging(true);
    dragRef.current = { startX: t.clientX, startY: t.clientY, offsetX: offset.x, offsetY: offset.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      setOffset({ x: dragRef.current.offsetX + dx, y: dragRef.current.offsetY + dy });
    };
    const onTouchEnd = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  // Wheel zoom (ctrl+wheel)
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current?.matches(':hover')) return;
      if (e.key === '+' || (e.key === '=' && e.shiftKey)) { e.preventDefault(); zoomIn(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
      else if (e.key === '0') { e.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIn, zoomOut, reset]);

  return (
    <div className="relative" style={{ height }}>
      {/* Controls floating */}
      <div className="absolute top-3 right-3 z-20 bg-white border border-[#C8D8CB] rounded-xl shadow-lg flex flex-col overflow-hidden">
        <button onClick={zoomIn} className="p-2 hover:bg-[#F4F7F5] transition-colors border-b border-[#C8D8CB]" title="Acercar (+)" aria-label="Acercar">
          <ZoomIn size={16} className="text-[#1A4E26]" />
        </button>
        <button onClick={zoomOut} className="p-2 hover:bg-[#F4F7F5] transition-colors border-b border-[#C8D8CB]" title="Alejar (-)" aria-label="Alejar">
          <ZoomOut size={16} className="text-[#1A4E26]" />
        </button>
        <button onClick={reset} className="p-2 hover:bg-[#F4F7F5] transition-colors" title="Restaurar vista (0)" aria-label="Restaurar">
          <Maximize2 size={16} className="text-[#1A4E26]" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm border border-[#C8D8CB] rounded-lg px-3 py-1.5 shadow-md text-xs font-bold text-[#1A4E26] font-mono">
        {Math.round(scale * 100)}%
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm border border-[#C8D8CB] rounded-lg px-3 py-1.5 shadow-md text-[10px] text-[#6B7280] flex items-center gap-1.5">
        <Move size={11} className="text-[#1A4E26]" />
        Arrastra para mover · Ctrl+rueda para zoom · 0 reset
      </div>

      {/* Pan/zoom viewport */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onWheel={onWheel}
        tabIndex={0}
        className={`relative w-full h-full overflow-hidden rounded-b-2xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} focus:outline-none`}
        style={{
          background: 'radial-gradient(circle at 50% 50%, #FAFBFA 0%, #F4F7F5 100%)',
          backgroundImage: `radial-gradient(circle, rgba(26,78,38,0.06) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="absolute"
          style={{
            top: '50%',
            left: '50%',
            transform: `translate(-50%, 0) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            userSelect: 'none',
            pointerEvents: isDragging ? 'none' : 'auto',
          }}
        >
          {children}
        </div>
      </div>
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

// ── Tree branches helper: draws horizontal bus + vertical drops to each child ──
// Renders an array of child elements with a "tree" connector pattern above them
function TreeBranches({ children, gap = 32, drop = 28 }: { children: React.ReactNode[]; gap?: number; drop?: number }) {
  if (children.length === 0) return null;

  if (children.length === 1) {
    // Single child: just a vertical line
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

  // Multiple children: horizontal bus + per-child vertical drop
  return (
    <div className="flex justify-center" style={{ gap }}>
      {children.map((child, i) => {
        const isFirst = i === 0;
        const isLast = i === children.length - 1;
        return (
          <div key={i} className="relative" style={{ paddingTop: drop }}>
            {/* Horizontal segment (half if at edge, full if middle) */}
            <div
              className="absolute top-0 h-px bg-[#C8D8CB]"
              style={{
                left: isFirst ? '50%' : 0,
                right: isLast ? '50%' : 0,
              }}
            />
            {/* Vertical drop from bus to child */}
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

// ── Distributor card (no children rendered here, just the box) ──
function DistribCard({ node }: { node: TreeNode }) {
  const basePath = useAdminBasePath();
  const pkg = node.profile.paquete ?? 'basico';
  const style = paqueteStyles[pkg] ?? paqueteStyles.basico;
  const total = countNodes(node) - 1;
  const posKey = posicionKey(node.posicion);
  const posStyle = posicionStyles[posKey];
  const nombre = displayName(node.profile);
  const sinPerfil = !node.profile.nombre_completo;

  return (
    <Link
      to={`${basePath}/distribuidores/${node.profile.id}`}
      className={`group block border-2 rounded-2xl p-3 w-44 text-center hover:shadow-[0_8px_24px_rgba(26,78,38,0.15)] transition-all relative ${style.border} ${style.bg}`}
    >
      {/* Badge de posición flotante arriba a la derecha — diferenciación visual fuerte */}
      <div
        className={`absolute -top-2 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${posStyle.bg} ${posStyle.text} ${posStyle.border} shadow-sm`}
        title={posStyle.label}
      >
        <span>{posStyle.icon}</span>
        <span>{posStyle.label}</span>
      </div>

      <div className={`w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center bg-white ${style.text} border ${style.border}`}>
        <User size={16} />
      </div>
      <p className={`font-mono text-[11px] font-bold mb-0.5 ${style.text}`}>
        {node.profile.codigo_distribuidor ?? '—'}
      </p>
      {node.profile.username && (
        <p className="text-[#1A4E26] text-[10px] font-bold mb-1 truncate" title={`@${node.profile.username}`}>
          @{node.profile.username}
        </p>
      )}
      <p
        className={`text-[11px] font-bold leading-tight line-clamp-2 mb-1 ${sinPerfil ? 'text-[#9CA3AF] italic' : 'text-[#111111]'}`}
        title={nombre}
      >
        {sinPerfil ? 'Perfil sin completar' : nombre}
      </p>
      <p className="text-[#D4AF37] text-[10px] font-bold">★ {node.profile.puntos ?? 0} pts</p>
      <div className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${style.text} bg-white/70`}>
        {style.label}
      </div>
      {total > 0 && (
        <p className="text-[9px] mt-1 text-[#9CA3AF]">+{total} en su red</p>
      )}
    </Link>
  );
}

// ── Recursive subtree: card + its children with proper tree branches ──
function BinaryNodeCard({ node, depth, maxDepth }: { node: TreeNode; depth: number; maxDepth: number }) {
  if (depth > maxDepth) return null;

  const showChildren = node.children.length > 0 && depth < maxDepth;

  return (
    <div className="flex flex-col items-center">
      <DistribCard node={node} />
      {showChildren && (
        <TreeBranches gap={24}>
          {node.children.map((child) => (
            <BinaryNodeCard key={child.id} node={child} depth={depth + 1} maxDepth={maxDepth} />
          ))}
        </TreeBranches>
      )}
    </div>
  );
}

export default function AdminRed() {
  const basePath = useAdminBasePath();
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
        const { data: perfiles } = await supabase.from('profiles').select('*');
        const profileMap = new Map<string, Profile>();
        for (const p of perfiles ?? []) profileMap.set(p.id, p as Profile);

        const adminProfile = (perfiles ?? []).find((p) => p.rol === 'admin') as Profile | undefined;
        if (!adminProfile) {
          setLoading(false);
          return;
        }

        // Cargar nodos binarios
        const { data: nodos } = await supabase
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
          const { data: newAdminNode } = await supabase
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
        (n.profile.nombre_completo ?? '').toLowerCase().includes(q) ||
        (n.profile.codigo_distribuidor ?? '').toLowerCase().includes(q) ||
        (n.profile.username ?? '').toLowerCase().includes(q) ||
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
          <p className="text-[10px] text-[#9CA3AF] mt-1">
            directos del admin
          </p>
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
            placeholder="Buscar por nombre, usuario, código o email..."
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
                  const posKey = posicionKey(node.posicion);
                  const posStyle = posicionStyles[posKey];
                  const sinPerfil = !node.profile.nombre_completo;
                  return (
                    <tr key={node.id} className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link to={`${basePath}/distribuidores/${node.profile.id}`} className="block hover:text-[#1A4E26]">
                          <p className={`text-xs font-bold ${sinPerfil ? 'text-[#9CA3AF] italic' : 'text-[#111111]'}`}>
                            {sinPerfil ? 'Perfil sin completar' : displayName(node.profile)}
                          </p>
                          <p className="text-[#1A4E26] text-[10px] font-mono">{node.profile.codigo_distribuidor}</p>
                          {node.profile.username && (
                            <p className="text-[#6B7280] text-[10px] font-semibold">@{node.profile.username}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${style.text} ${style.bg} border ${style.border}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#D4AF37] font-bold text-xs">★ {node.profile.puntos ?? 0}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${posStyle.bg} ${posStyle.text} ${posStyle.border}`}>
                          <span>{posStyle.icon}</span>
                          {posStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#6B7280] text-xs">N{node.nivel}</td>
                      <td className="px-4 py-2.5 text-[#6B7280] text-xs font-mono">
                        <span>{parent?.profile.codigo_distribuidor ?? '—'}</span>
                        {parent?.profile.username && (
                          <span className="block text-[10px] font-sans font-semibold">@{parent.profile.username}</span>
                        )}
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
          <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
            <RefreshCw size={10} className="text-[#1A4E26]" />
            {frontales.length} frontal{frontales.length !== 1 ? 'es' : ''} del admin · profundidad {maxDepth} · zoom y arrastra para navegar
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
          <ZoomPanContainer height={640}>
            <div className="p-10 inline-block">
              <div className="flex flex-col items-center">
                {/* Admin root card */}
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
                  {adminNode.profile.username && (
                    <p className="text-[#D4AF37] text-[10px] font-bold mb-1 truncate" title={`@${adminNode.profile.username}`}>
                      @{adminNode.profile.username}
                    </p>
                  )}
                  <p className="text-white text-sm font-bold leading-tight mb-1 line-clamp-2">
                    {displayName(adminNode.profile)}
                  </p>
                  <p className="text-[#D4AF37] text-xs font-bold">★ {adminNode.profile.puntos ?? 0} pts</p>
                  <p className="text-white/65 text-[10px] mt-1 font-bold uppercase tracking-wider">
                    ROOT · {frontales.length} frontal{frontales.length !== 1 ? 'es' : ''}
                  </p>
                </div>

                {/* Tree branches: cada frontal del admin es una rama independiente.
                    NO se emparejan en izq/der porque el admin admite N frontales (multi-leg).
                    Bajo cada frontal SI aplica el binario estricto, manejado por BinaryNodeCard. */}
                {frontales.length > 0 && (() => {
                  const ordered = [...frontales].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                  return (
                    <TreeBranches gap={32} drop={36}>
                      {ordered.map((frontal) => (
                        <BinaryNodeCard
                          key={frontal.id}
                          node={frontal}
                          depth={0}
                          maxDepth={maxDepth - 1}
                        />
                      ))}
                    </TreeBranches>
                  );
                })()}

                {frontales.length === 0 && (
                  <div className="mt-8 text-center py-8 text-[#9CA3AF] text-sm max-w-md">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    Aún no hay frontales asignados. Al aprobar una solicitud, puedes ubicarla directamente bajo el admin como frontal.
                  </div>
                )}
              </div>
            </div>
          </ZoomPanContainer>
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
