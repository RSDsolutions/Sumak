import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
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

function TreeNodeCard({ node, depth }: { node: TreeNode; depth: number }) {
  if (depth > 4) return null;
  const pkg = node.profile.paquete ?? 'basico';
  const isFrontal = !node.posicion && depth === 1;

  const borderColor =
    pkg === 'lider' ? 'border-[#D4AF37]/60' :
    pkg === 'emprendedor' ? 'border-[#1A4E26]/40' :
    'border-[#C8D8CB]';
  const bgColor =
    pkg === 'lider' ? 'bg-[#FFFDF0]' :
    pkg === 'emprendedor' ? 'bg-[#EBF4ED]' :
    'bg-[#F4F7F5]';
  const codeColor =
    pkg === 'lider' ? 'text-[#D4AF37]' :
    pkg === 'emprendedor' ? 'text-[#1A4E26]' :
    'text-[#6B7280]';

  return (
    <div className="flex flex-col items-center">
      <div className={`border-2 rounded-xl p-3 w-44 text-center ${borderColor} ${bgColor}`}>
        <p className={`font-mono text-xs font-bold mb-0.5 ${codeColor}`}>
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        <p className="text-[#111111] text-xs font-medium truncate mb-1" title={node.profile.nombre_completo}>
          {node.profile.nombre_completo}
        </p>
        <p className="text-[#D4AF37] text-[10px] font-semibold">★ {node.profile.puntos ?? 0} pts</p>
        {isFrontal && (
          <span className="text-[10px] font-bold text-[#1A4E26] mt-0.5 inline-block">Frontal</span>
        )}
        {node.posicion && (
          <span className="text-[10px] text-[#9CA3AF] mt-0.5 inline-block capitalize">
            {node.posicion === 'izquierda' ? '⬅ Izq' : 'Der ➡'}
          </span>
        )}
      </div>

      {node.children.length > 0 && depth < 4 && (
        <div className="flex gap-6 mt-5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 h-5 w-px bg-[#C8D8CB]" />
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col items-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 h-5 w-px bg-[#C8D8CB]" />
              <TreeNodeCard node={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminRootCard({ node }: { node: TreeNode }) {
  const total = countNodes(node) - 1;
  return (
    <div className="flex flex-col items-center">
      {/* Admin node */}
      <div className="border-2 border-[#1A4E26] bg-[#EBF4ED] rounded-xl p-4 w-52 text-center shadow-[0_0_16px_rgba(26,78,38,0.12)]">
        <p className="font-mono text-xs font-bold text-[#1A4E26] mb-0.5">
          {node.profile.codigo_distribuidor ?? '—'}
        </p>
        <p className="text-[#111111] text-sm font-bold truncate mb-1" title={node.profile.nombre_completo}>
          {node.profile.nombre_completo}
        </p>
        <p className="text-[#D4AF37] text-[10px] font-semibold">★ {node.profile.puntos ?? 0} pts</p>
        <span className="text-[10px] font-bold text-[#1A4E26] mt-0.5 inline-block uppercase tracking-wider">ADMIN</span>
      </div>

      {node.children.length > 0 && (
        <>
          {/* Línea vertical desde admin hacia barra horizontal */}
          <div className="h-6 w-px bg-[#C8D8CB]" />
          {/* Barra horizontal */}
          <div className="relative flex items-start justify-center">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 bg-[#C8D8CB] h-px"
                style={{ width: `calc(${(node.children.length - 1)} * 12rem + ${(node.children.length - 1)} * 1.5rem)` }}
              />
            )}
            <div className="flex gap-6">
              {node.children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="h-5 w-px bg-[#C8D8CB]" />
                  <TreeNodeCard node={child} depth={1} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {node.children.length === 0 && (
        <p className="text-[#9CA3AF] text-xs mt-4">Sin distribuidores en red aún</p>
      )}

      <div className="flex items-center gap-1.5 text-[#6B7280] text-xs mt-4">
        <Users size={12} />
        {total} distribuidor{total !== 1 ? 'es' : ''} en la red
      </div>
    </div>
  );
}

export default function AdminRed() {
  const [adminNode, setAdminNode] = useState<TreeNode | null>(null);
  const [orphans, setOrphans] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [allNodes, setAllNodes] = useState<TreeNode[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: nodos } = await supabaseAdmin
          .from('red_binaria')
          .select('*')
          .order('nivel', { ascending: true })
          .limit(500);

        if (!nodos || nodos.length === 0) return;

        const distIds = nodos.map((n) => n.distribuidor_id);
        const { data: perfiles } = await supabaseAdmin.from('profiles').select('*').in('id', distIds);

        const profileMap = new Map<string, Profile>();
        for (const p of perfiles ?? []) profileMap.set(p.id, p as Profile);

        const nodeMap = new Map<string, TreeNode>();
        for (const n of nodos) {
          const profile = profileMap.get(n.distribuidor_id);
          if (!profile) continue;
          nodeMap.set(n.id, { ...(n as unknown as NodoBinario), profile, children: [] });
        }

        const roots: TreeNode[] = [];
        for (const [, node] of nodeMap) {
          if (!node.padre_id) {
            roots.push(node);
          } else {
            const parent = nodeMap.get(node.padre_id);
            if (parent) parent.children.push(node);
          }
        }

        // Find admin root (rol = 'admin')
        const adminRoot = roots.find((r) => r.profile.rol === 'admin') ?? roots[0] ?? null;
        const orphanRoots = roots.filter((r) => r !== adminRoot);

        const flat: TreeNode[] = [];
        const collect = (n: TreeNode) => { flat.push(n); n.children.forEach(collect); };
        if (adminRoot) collect(adminRoot);

        setAdminNode(adminRoot);
        setOrphans(orphanRoots);
        setAllNodes(flat);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Red de Distribuidores</h1>
        <p className="text-[#6B7280] text-sm mt-1">Árbol Frontal Directo Binario Continuo</p>
      </div>

      {/* Tabla de distribuidores */}
      {!loading && allNodes.length > 0 && (
        <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5] flex items-center justify-between">
            <h2 className="text-[#111111] text-sm font-semibold">Distribuidores en Red</h2>
            <span className="text-[#6B7280] text-xs">{allNodes.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Distribuidor', 'Paquete', 'Pts Propios', 'Nivel', 'Posición', 'Upline'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allNodes.map((node) => (
                  <tr key={node.id} className="border-b border-[#C8D8CB] hover:bg-[#F4F7F5] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[#111111] text-sm font-medium">{node.profile.nombre_completo}</p>
                      <p className="text-[#6B7280] text-xs font-mono">{node.profile.codigo_distribuidor}</p>
                    </td>
                    <td className="px-5 py-3 capitalize text-[#6B7280] text-sm">{node.profile.paquete ?? '—'}</td>
                    <td className="px-5 py-3 text-[#D4AF37] font-semibold">★ {node.profile.puntos ?? 0}</td>
                    <td className="px-5 py-3 text-[#111111] text-sm">{node.nivel}</td>
                    <td className="px-5 py-3 text-[#6B7280] text-sm">
                      {!node.posicion ? (
                        <span className="text-[#1A4E26] font-medium text-xs">Frontal</span>
                      ) : node.posicion === 'izquierda' ? '⬅ Izquierda' : 'Derecha ➡'}
                    </td>
                    <td className="px-5 py-3 text-[#6B7280] text-xs">
                      {node.padre_id ? (allNodes.find((n) => n.id === node.padre_id)?.profile.codigo_distribuidor ?? '—') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Árbol visual */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 overflow-auto">
        {loading ? (
          <Spinner />
        ) : !adminNode ? (
          <div className="text-center py-16 text-[#6B7280]">
            <p className="text-lg font-medium mb-2">Red vacía</p>
            <p className="text-sm">No hay distribuidores en la red aún.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center overflow-x-auto pb-4 pt-2 min-w-max mx-auto">
            <AdminRootCard node={adminNode} />

            {orphans.length > 0 && (
              <div className="mt-10 pt-6 border-t border-[#C8D8CB] w-full">
                <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-4 text-center">
                  Nodos sin conectar
                </p>
                <div className="flex gap-8 justify-center flex-wrap">
                  {orphans.map((orphan) => (
                    <TreeNodeCard key={orphan.id} node={orphan} depth={0} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
