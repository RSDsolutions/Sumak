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

interface VolumeData {
  volumen_izquierda: number;
  volumen_derecha: number;
  volumen_pareado: number;
}

interface TreeNode extends NodoBinario {
  profile: Profile;
  children: TreeNode[];
}

function TreeNodeComponent({
  node,
  volMap,
  depth,
}: {
  node: TreeNode;
  volMap: Map<string, VolumeData>;
  depth: number;
}) {
  if (depth > 4) return null;
  const pkg = node.profile.paquete ?? 'basico';
  const borderColor =
    pkg === 'lider' ? 'border-[#D4AF37]/50' : pkg === 'emprendedor' ? 'border-[#00A86B]/40' : 'border-[#555555]';
  const bgColor =
    pkg === 'lider' ? 'bg-[#D4AF37]/5' : pkg === 'emprendedor' ? 'bg-[#00A86B]/5' : 'bg-[#222222]';
  const codeColor =
    pkg === 'lider' ? 'text-[#D4AF37]' : pkg === 'emprendedor' ? 'text-[#00A86B]' : 'text-[#AAAAAA]';

  const vol = volMap.get(node.distribuidor_id);

  return (
    <div className="flex flex-col items-center">
      <div className={`border-2 rounded-xl p-3 w-48 text-center ${borderColor} ${bgColor}`}>
        <p className={`font-mono text-xs font-bold mb-0.5 ${codeColor}`}>
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        <p className="text-[#F0F0F0] text-xs font-medium truncate mb-1" title={node.profile.nombre_completo}>
          {node.profile.nombre_completo}
        </p>
        <p className="text-[#D4AF37] text-[10px] font-semibold">
          ★ {node.profile.puntos ?? 0} pts propios
        </p>
        {vol && (vol.volumen_izquierda > 0 || vol.volumen_derecha > 0) && (
          <div className="mt-1.5 pt-1.5 border-t border-[#2E2E2E] grid grid-cols-2 gap-1 text-[9px] text-center">
            <span className="text-[#00A86B]">A: {vol.volumen_izquierda}pts</span>
            <span className="text-[#00A86B]">B: {vol.volumen_derecha}pts</span>
          </div>
        )}
      </div>

      {node.children.length > 0 && depth < 4 && (
        <div className="flex gap-8 mt-6 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-px bg-[#2E2E2E]" />
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col items-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-px bg-[#2E2E2E]" />
              <TreeNodeComponent node={child} volMap={volMap} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminRed() {
  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [volMap, setVolMap] = useState<Map<string, VolumeData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const mes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

        const [{ data: nodos }, { data: vols }] = await Promise.all([
          supabaseAdmin.from('red_binaria').select('*').order('nivel', { ascending: true }).limit(100),
          supabaseAdmin.from('volumenes_binarios').select('*').eq('mes', mes),
        ]);

        if (!nodos || nodos.length === 0) return;

        const distIds = nodos.map((n) => n.distribuidor_id);
        const { data: perfiles } = await supabaseAdmin.from('profiles').select('*').in('id', distIds);

        const profileMap = new Map<string, Profile>();
        for (const p of perfiles ?? []) profileMap.set(p.id, p as Profile);

        const vm = new Map<string, VolumeData>();
        for (const v of vols ?? []) {
          vm.set(v.distribuidor_id, {
            volumen_izquierda: Number(v.volumen_izquierda),
            volumen_derecha: Number(v.volumen_derecha),
            volumen_pareado: Number(v.volumen_pareado),
          });
        }
        setVolMap(vm);

        const nodeMap = new Map<string, TreeNode>();
        for (const n of nodos) {
          const profile = profileMap.get(n.distribuidor_id);
          if (!profile) continue;
          nodeMap.set(n.id, { ...(n as unknown as NodoBinario), profile, children: [] });
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

  const mes = new Date().toLocaleString('es-EC', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Red Binaria</h1>
        <p className="text-[#888888] text-sm mt-1">Árbol de distribuidores con volúmenes de {mes}</p>
      </div>

      {/* Volume summary per root */}
      {!loading && roots.length > 0 && (
        <div className="mb-6 space-y-3">
          {roots.map((root) => {
            const vol = volMap.get(root.distribuidor_id);
            return (
              <div key={root.id} className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <span className="font-mono text-xs text-[#00A86B] font-bold mr-2">
                      {root.profile.codigo_distribuidor}
                    </span>
                    <span className="text-[#F0F0F0] text-sm font-medium">{root.profile.nombre_completo}</span>
                  </div>
                  <span className="text-[#D4AF37] text-xs font-semibold">★ {root.profile.puntos ?? 0} pts propios</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#222222] rounded-xl p-3">
                    <p className="text-[#888888] text-xs mb-1">Equipo A (Izq)</p>
                    <p className="text-[#00A86B] font-bold text-lg">{vol?.volumen_izquierda ?? 0}</p>
                    <p className="text-[#555555] text-[10px]">puntos</p>
                  </div>
                  <div className="bg-[#222222] rounded-xl p-3">
                    <p className="text-[#888888] text-xs mb-1">Equipo B (Der)</p>
                    <p className="text-[#00A86B] font-bold text-lg">{vol?.volumen_derecha ?? 0}</p>
                    <p className="text-[#555555] text-[10px]">puntos</p>
                  </div>
                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                    <p className="text-[#888888] text-xs mb-1">Pareado</p>
                    <p className="text-[#D4AF37] font-bold text-lg">{vol?.volumen_pareado ?? 0}</p>
                    <p className="text-[#555555] text-[10px]">puntos</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All distributors volume table */}
      {!loading && roots.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-3 border-b border-[#2E2E2E]">
            <h2 className="text-[#F0F0F0] text-sm font-semibold">Volúmenes por Distribuidor — {mes}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2E2E2E]">
                  {['Distribuidor', 'Pts Propios', 'Equipo A', 'Equipo B', 'Pareado'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[#888888] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roots.flatMap((root) => {
                  const allNodes: TreeNode[] = [];
                  const collect = (n: TreeNode) => { allNodes.push(n); n.children.forEach(collect); };
                  collect(root);
                  return allNodes;
                }).map((node) => {
                  const vol = volMap.get(node.distribuidor_id);
                  return (
                    <tr key={node.id} className="border-b border-[#2E2E2E] hover:bg-[#222222] transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[#F0F0F0] text-sm">{node.profile.nombre_completo}</p>
                        <p className="text-[#888888] text-xs font-mono">{node.profile.codigo_distribuidor}</p>
                      </td>
                      <td className="px-5 py-3 text-[#D4AF37] font-semibold">★ {node.profile.puntos ?? 0}</td>
                      <td className="px-5 py-3 text-[#00A86B] font-semibold">{vol?.volumen_izquierda ?? 0}</td>
                      <td className="px-5 py-3 text-[#00A86B] font-semibold">{vol?.volumen_derecha ?? 0}</td>
                      <td className="px-5 py-3 text-[#D4AF37] font-semibold">{vol?.volumen_pareado ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tree visualization */}
      <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6 overflow-auto">
        {loading ? (
          <Spinner />
        ) : roots.length === 0 ? (
          <div className="text-center py-16 text-[#888888]">
            <p className="text-lg font-medium mb-2">Red vacía</p>
            <p className="text-sm">No hay distribuidores en la red binaria aún.</p>
          </div>
        ) : (
          <div className="flex gap-16 overflow-x-auto pb-4 pt-2">
            {roots.map((root) => (
              <div key={root.id} className="flex-shrink-0">
                <TreeNodeComponent node={root} volMap={volMap} depth={0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
