import { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../lib/supabase';
import type { NodoBinario, Profile } from '../../lib/types';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const paqueteColor: Record<string, string> = {
  basico: 'border-[#555555] bg-[#222222]',
  emprendedor: 'border-[#00A86B]/50 bg-[#00A86B]/5',
  lider: 'border-[#D4AF37]/50 bg-[#D4AF37]/5',
};

const paqueteTextColor: Record<string, string> = {
  basico: 'text-[#AAAAAA]',
  emprendedor: 'text-[#00A86B]',
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

function TreeNodeComponent({ node, depth }: { node: TreeNode; depth: number }) {
  if (depth > 4) return null;
  const colors = paqueteColor[node.profile.paquete ?? 'basico'];
  const textColor = paqueteTextColor[node.profile.paquete ?? 'basico'];
  const pkg = paqueteLabel[node.profile.paquete ?? ''] ?? '—';

  return (
    <div className="flex flex-col items-center">
      {/* Node box */}
      <div className={`border-2 rounded-xl p-3 w-44 text-center ${colors}`}>
        <p className={`font-mono text-xs font-bold mb-1 ${textColor}`}>
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        <p className="text-[#F0F0F0] text-xs font-medium truncate" title={node.profile.nombre_completo}>
          {node.profile.nombre_completo}
        </p>
        <span className={`text-[10px] font-medium mt-1 inline-block ${textColor}`}>{pkg}</span>
      </div>

      {/* Children */}
      {node.children.length > 0 && depth < 4 && (
        <div className="flex gap-8 mt-6 relative">
          {/* Connector line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-px bg-[#2E2E2E]" />
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col items-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-px bg-[#2E2E2E]" />
              <TreeNodeComponent node={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminRed() {
  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all red_binaria nodes with profile data, limit depth to 5 levels
        const { data: nodos } = await supabaseAdmin
          .from('red_binaria')
          .select('*, profile:profiles!distribuidor_id(*)')
          .order('nivel', { ascending: true })
          .limit(100);

        if (!nodos) return;

        // Build tree structure
        const nodeMap = new Map<string, TreeNode>();
        for (const n of nodos) {
          const node: TreeNode = {
            ...(n as unknown as NodoBinario),
            profile: n.profile as Profile,
            children: [],
          };
          nodeMap.set(node.id, node);
        }

        const treeRoots: TreeNode[] = [];
        for (const [, node] of nodeMap) {
          if (!node.padre_id) {
            treeRoots.push(node);
          } else {
            const parent = nodeMap.get(node.padre_id);
            if (parent) parent.children.push(node);
          }
        }

        setRoots(treeRoots);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Red Binaria</h1>
        <p className="text-[#888888] text-sm mt-1">Visualización del árbol de distribuidores (hasta 5 niveles)</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(paqueteLabel).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border-2 ${paqueteColor[key]}`} />
            <span className="text-[#888888] text-sm">{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6 overflow-auto">
        {loading ? (
          <Spinner />
        ) : roots.length === 0 ? (
          <div className="text-center py-16 text-[#888888]">
            <p className="text-lg font-medium mb-2">Red vacía</p>
            <p className="text-sm">No hay distribuidores en la red binaria aún.</p>
          </div>
        ) : (
          <div className="flex gap-16 overflow-x-auto pb-4">
            {roots.map((root) => (
              <div key={root.id} className="flex-shrink-0">
                <TreeNodeComponent node={root} depth={0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
