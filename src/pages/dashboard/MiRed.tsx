import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { NodoBinario, Profile } from '../../lib/types';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const paqueteColor: Record<string, string> = {
  basico: 'border-[#C8D8CB] bg-[#F4F7F5]',
  emprendedor: 'border-[#1A4E26]/40 bg-[#EBF4ED]',
  lider: 'border-[#D4AF37]/50 bg-[#FFFDF0]',
};

const paqueteTextColor: Record<string, string> = {
  basico: 'text-[#6B7280]',
  emprendedor: 'text-[#1A4E26]',
  lider: 'text-[#D4AF37]',
};

const paqueteLabel: Record<string, string> = {
  basico: 'Básico',
  emprendedor: 'Emprendedor',
  lider: 'Líder',
};

interface TreeNode extends NodoBinario {
  profile: Profile;
  children: TreeNode[];
}

function TreeNodeComponent({ node, depth, isRoot }: { node: TreeNode; depth: number; isRoot?: boolean }) {
  if (depth > 3) return null;
  const pkg = node.profile.paquete ?? 'basico';
  const colors = paqueteColor[pkg];
  const textColor = paqueteTextColor[pkg];

  return (
    <div className="flex flex-col items-center">
      <div className={`border-2 rounded-xl p-3 text-center ${isRoot ? 'border-[#1A4E26] bg-[#EBF4ED] w-52' : `${colors} w-44`}`}>
        <p className={`font-mono text-xs font-bold mb-0.5 ${isRoot ? 'text-[#1A4E26]' : textColor}`}>
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        <p className="text-[#111111] text-xs font-medium truncate mb-1" title={node.profile.nombre_completo}>
          {node.profile.nombre_completo}
        </p>
        <p className="text-[#D4AF37] text-[10px] font-semibold">
          ★ {node.profile.puntos ?? 0} pts
        </p>
        {isRoot && (
          <span className="text-[10px] font-bold text-[#1A4E26] mt-0.5 inline-block">TÚ</span>
        )}
      </div>

      {node.children.length > 0 && depth < 3 && (
        <div className="flex gap-8 mt-6 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-px bg-[#C8D8CB]" />
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col items-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-px bg-[#C8D8CB]" />
              <TreeNodeComponent node={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MiRed() {
  const { user, profile } = useAuth();
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [volIzq, setVolIzq] = useState(0);
  const [volDer, setVolDer] = useState(0);
  const [volPareado, setVolPareado] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    async function load() {
      const uid = user!.id;

      // Fetch this distributor's node
      const { data: myNode } = await supabase
        .from('red_binaria')
        .select('*')
        .eq('distribuidor_id', uid)
        .single();

      if (!myNode) { setLoading(false); return; }

      // Fetch volume
      const currentMonth = new Date();
      const mesStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const { data: vol } = await supabase
        .from('volumenes_binarios')
        .select('*')
        .eq('distribuidor_id', uid)
        .eq('mes', mesStr)
        .maybeSingle();
      if (vol) {
        setVolIzq(Number(vol.volumen_izquierda ?? 0));
        setVolDer(Number(vol.volumen_derecha ?? 0));
        setVolPareado(Number(vol.volumen_pareado ?? 0));
      }

      // Fetch all red_binaria nodes (RLS limits to what this user can see)
      const { data: allNodes } = await supabase
        .from('red_binaria')
        .select('*')
        .limit(200);

      if (!allNodes) { setLoading(false); return; }

      // Fetch profiles for all nodes
      const distIds = allNodes.map((n) => n.distribuidor_id);
      const { data: perfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', distIds);

      const profileMap = new Map<string, Profile>();
      for (const p of perfiles ?? []) profileMap.set(p.id, p as Profile);

      const nodeMap = new Map<string, TreeNode>();
      for (const n of allNodes) {
        const profile = profileMap.get(n.distribuidor_id);
        if (!profile) continue;
        nodeMap.set(n.id, {
          ...(n as unknown as NodoBinario),
          profile,
          children: [],
        });
      }

      for (const [, node] of nodeMap) {
        if (node.padre_id) {
          const parent = nodeMap.get(node.padre_id);
          if (parent) parent.children.push(node);
        }
      }

      const myTreeNode = nodeMap.get(myNode.id);
      setRootNode(myTreeNode ?? null);
      setLoading(false);
    }

    load();
  }, [user, profile]);

  const leftCount = rootNode?.children.filter((c) => c.posicion === 'izquierda').length ?? 0;
  const rightCount = rootNode?.children.filter((c) => c.posicion === 'derecha').length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Mi Red</h1>
        <p className="text-[#6B7280] text-sm mt-1">Tu árbol binario de distribuidores</p>
      </div>

      {/* Volume summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5 text-center shadow-[0_0_8px_rgba(26,78,38,0.04)]">
          <p className="text-[#6B7280] text-sm mb-1">Equipo A (Izquierda)</p>
          <p className="font-heading font-bold text-xl text-[#1A4E26]">{volIzq} pts</p>
          <p className="text-[#9CA3AF] text-xs mt-1">{leftCount} directo{leftCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5 text-center shadow-[0_0_8px_rgba(26,78,38,0.04)]">
          <p className="text-[#6B7280] text-sm mb-1">Equipo B (Derecha)</p>
          <p className="font-heading font-bold text-xl text-[#1A4E26]">{volDer} pts</p>
          <p className="text-[#9CA3AF] text-xs mt-1">{rightCount} directo{rightCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-5 text-center shadow-[0_0_8px_rgba(212,175,55,0.06)]">
          <p className="text-[#6B7280] text-sm mb-1">Volumen Pareado</p>
          <p className="font-heading font-bold text-xl text-[#D4AF37]">{volPareado} pts</p>
          <p className="text-[#9CA3AF] text-xs mt-1">min(A, B) este mes</p>
        </div>
      </div>

      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 overflow-auto">
        {loading ? (
          <Spinner />
        ) : !rootNode ? (
          <div className="text-center py-16 text-[#6B7280]">
            <p className="text-lg font-medium mb-2">Aún no estás en la red</p>
            <p className="text-sm">Tu posición en el árbol binario aún no ha sido asignada.</p>
          </div>
        ) : (
          <div className="flex justify-center overflow-x-auto pb-4 pt-2">
            <TreeNodeComponent node={rootNode} depth={0} isRoot />
          </div>
        )}
      </div>
    </div>
  );
}
