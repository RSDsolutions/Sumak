import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, Crown, Search, ChevronRight, Users, Sparkles, ExternalLink,
  Globe, ChefHat, Snowflake, Tv, Laptop, Bike, Car, Home, Plane, MapPin,
  TrendingUp, Award, X,
} from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import { tramo1Ranks, tramo2Ranks, getRangoActual } from '../../data';
import StaircaseVisual, {
  type StaircaseRank,
  type StaircaseUser,
} from '../../components/StaircaseVisual';

interface DistribuidorRow {
  id: string;
  codigo_distribuidor: string | null;
  nombre_completo: string;
  email: string;
  patrocinador_id: string | null;
  estado: string;
}

function getPrizeIcon(text: string, size = 11) {
  if (text.includes('Internacional')) return <Globe size={size} />;
  if (text.includes('Nacional')) return <Plane size={size} />;
  if (text.includes('Local')) return <MapPin size={size} />;
  return null;
}

function getExtraIcon(text: string, size = 11) {
  const t = text.toLowerCase();
  if (t.includes('viaje') || t.includes('internacional')) return <Globe size={size} />;
  if (t.includes('cocina')) return <ChefHat size={size} />;
  if (t.includes('nevera')) return <Snowflake size={size} />;
  if (t.includes('proyector')) return <Tv size={size} />;
  if (t.includes('laptop')) return <Laptop size={size} />;
  if (t.includes('moto')) return <Bike size={size} />;
  if (t.includes('carro')) return <Car size={size} />;
  if (t.includes('casa')) return <Home size={size} />;
  return <Trophy size={size} />;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminEscalera() {
  const [loading, setLoading] = useState(true);
  const [distribuidores, setDistribuidores] = useState<DistribuidorRow[]>([]);
  const [directosByUser, setDirectosByUser] = useState<Map<string, number>>(new Map());
  const [redByUser, setRedByUser] = useState<Map<string, number>>(new Map());
  const [activeTier, setActiveTier] = useState<1 | 2>(1);
  const [expandedT1, setExpandedT1] = useState<number | null>(null);
  const [expandedT2, setExpandedT2] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, codigo_distribuidor, nombre_completo, email, patrocinador_id, estado, rol')
        .eq('rol', 'distribuidor')
        .order('codigo_distribuidor', { ascending: true });

      const list = (profiles ?? []) as (DistribuidorRow & { rol: string })[];
      const justDistrib = list.map(({ rol: _rol, ...rest }) => rest);

      // Directos por user
      const directos = new Map<string, number>();
      const childrenMap = new Map<string, string[]>();
      for (const p of justDistrib) {
        directos.set(p.id, 0);
        if (p.patrocinador_id) {
          const arr = childrenMap.get(p.patrocinador_id) ?? [];
          arr.push(p.id);
          childrenMap.set(p.patrocinador_id, arr);
        }
      }
      for (const p of justDistrib) {
        if (p.patrocinador_id && directos.has(p.patrocinador_id)) {
          directos.set(p.patrocinador_id, (directos.get(p.patrocinador_id) ?? 0) + 1);
        }
      }

      // Red total por user via BFS
      const red = new Map<string, number>();
      for (const p of justDistrib) {
        let total = 0;
        const queue: string[] = [p.id];
        const visited = new Set<string>([p.id]);
        while (queue.length > 0) {
          const current = queue.shift()!;
          const kids = childrenMap.get(current) ?? [];
          for (const k of kids) {
            if (!visited.has(k)) {
              visited.add(k);
              total++;
              queue.push(k);
            }
          }
        }
        red.set(p.id, total);
      }

      setDistribuidores(justDistrib);
      setDirectosByUser(directos);
      setRedByUser(red);
      setLoading(false);
    }
    load();
  }, []);

  // ── Construir mapa de usuarios por rango T1 ──
  const usersByT1 = useMemo(() => {
    const map = new Map<number, StaircaseUser[]>();
    for (const d of distribuidores) {
      const directos = directosByUser.get(d.id) ?? 0;
      const rango = getRangoActual(directos);
      const idx = tramo1Ranks.findIndex((r) => r.rango === rango.rango);
      if (idx < 0) continue;
      const arr = map.get(idx) ?? [];
      arr.push({
        id: d.id,
        nombre: d.nombre_completo,
        codigo: d.codigo_distribuidor ?? '—',
      });
      map.set(idx, arr);
    }
    return map;
  }, [distribuidores, directosByUser]);

  // ── Construir mapa de usuarios por rango T2 ──
  const usersByT2 = useMemo(() => {
    const map = new Map<number, StaircaseUser[]>();
    for (const d of distribuidores) {
      const red = redByUser.get(d.id) ?? 0;
      let idx = -1;
      for (let i = 0; i < tramo2Ranks.length; i++) {
        if (red >= tramo2Ranks[i].personasEnRed) idx = i;
        else break;
      }
      if (idx < 0) continue;
      const arr = map.get(idx) ?? [];
      arr.push({
        id: d.id,
        nombre: d.nombre_completo,
        codigo: d.codigo_distribuidor ?? '—',
      });
      map.set(idx, arr);
    }
    return map;
  }, [distribuidores, redByUser]);

  const t1Ranks: StaircaseRank[] = useMemo(
    () => tramo1Ranks.map((r) => ({
      rango: r.rango,
      requirement: `${r.personasDirectas} direct${r.personasDirectas === 1 ? 'o' : 'os'}`,
      reward: r.bono.split(' +')[0],
      extra: r.bono.includes(' + ')
        ? { icon: getPrizeIcon(r.bono, 10), label: r.bono.split(' + ')[1] }
        : undefined,
    })),
    [],
  );

  const t2Ranks: StaircaseRank[] = useMemo(
    () => tramo2Ranks.map((r) => ({
      rango: r.rango,
      requirement: `${r.personasEnRed.toLocaleString('es-EC')} red · Niv ${r.nivelesActivos}`,
      reward: r.recompensa,
      extra: r.extras
        ? { icon: getExtraIcon(r.extras, 10), label: r.extras }
        : undefined,
    })),
    [],
  );

  // Totales y top rango
  const totalDistribuidores = distribuidores.length;
  const totalT1Cubiertos = useMemo(() => {
    let n = 0;
    for (const arr of usersByT1.values()) n += arr.length;
    return n;
  }, [usersByT1]);
  const topRankT1Idx = useMemo(() => {
    let max = -1;
    for (const idx of usersByT1.keys()) if (idx > max) max = idx;
    return max;
  }, [usersByT1]);
  const topRankT2Idx = useMemo(() => {
    let max = -1;
    for (const idx of usersByT2.keys()) if (idx > max) max = idx;
    return max;
  }, [usersByT2]);

  if (loading) return <Spinner />;

  const expandedIdx = activeTier === 1 ? expandedT1 : expandedT2;
  const expandedUsers = expandedIdx !== null
    ? (activeTier === 1 ? usersByT1.get(expandedIdx) : usersByT2.get(expandedIdx)) ?? []
    : [];
  const expandedRank = expandedIdx !== null
    ? (activeTier === 1 ? tramo1Ranks[expandedIdx] : tramo2Ranks[expandedIdx])
    : null;

  const filteredExpanded = search.trim()
    ? expandedUsers.filter((u) =>
        u.nombre.toLowerCase().includes(search.toLowerCase()) ||
        u.codigo.toLowerCase().includes(search.toLowerCase()))
    : expandedUsers;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
            <Trophy size={26} className="text-[#D4AF37]" />
            Escalera del Éxito
          </h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 uppercase tracking-widest">
            <Sparkles size={11} /> Admin
          </span>
        </div>
        <p className="text-[#6B7280] text-sm mt-1">
          Posición de cada distribuidor en los rangos. Haz clic en un escalón para ver quiénes están ahí.
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#6B7280] text-[10px] font-bold uppercase tracking-widest mb-2">
            <Users size={12} /> Total
          </div>
          <p className="font-heading font-bold text-2xl text-[#111111]">{totalDistribuidores}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">distribuidores activos</p>
        </div>
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#1A4E26] text-[10px] font-bold uppercase tracking-widest mb-2">
            <TrendingUp size={12} /> Tramo 1
          </div>
          <p className="font-heading font-bold text-2xl text-[#1A4E26]">{totalT1Cubiertos}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">en algún rango T1</p>
        </div>
        <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-2">
            <Award size={12} /> Top T1
          </div>
          <p className="font-heading font-bold text-2xl text-[#D4AF37] truncate">
            {topRankT1Idx >= 0 ? tramo1Ranks[topRankT1Idx].rango : '—'}
          </p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">rango más alto alcanzado</p>
        </div>
        <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-2">
            <Crown size={12} /> Top T2
          </div>
          <p className="font-heading font-bold text-2xl text-[#D4AF37] truncate">
            {topRankT2Idx >= 0 ? tramo2Ranks[topRankT2Idx].rango : '—'}
          </p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">tramo avanzado más alto</p>
        </div>
      </div>

      {/* Tabs Tramo 1 / Tramo 2 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTier(1); setExpandedT2(null); }}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTier === 1
              ? 'bg-[#1A4E26] text-white shadow-[0_4px_16px_rgba(26,78,38,0.25)]'
              : 'bg-white border border-[#C8D8CB] text-[#6B7280] hover:border-[#1A4E26]/40'
          }`}
        >
          Tramo 1 · Socio → Gerente
        </button>
        <button
          onClick={() => { setActiveTier(2); setExpandedT1(null); }}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTier === 2
              ? 'bg-[#D4AF37] text-[#0B2913] shadow-[0_4px_16px_rgba(212,175,55,0.3)]'
              : 'bg-white border border-[#C8D8CB] text-[#6B7280] hover:border-[#D4AF37]/40'
          }`}
        >
          Tramo 2 · Gerente → Fundador
        </button>
      </div>

      {/* Escalera */}
      <motion.div
        key={activeTier}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`rounded-3xl p-5 sm:p-6 mb-6 ${
          activeTier === 2
            ? 'bg-gradient-to-br from-[#0F2E18] via-[#1A4E26] to-[#0F2E18]'
            : 'bg-gradient-to-br from-white to-[#F4F7F5] border border-[#C8D8CB]'
        }`}
      >
        <StaircaseVisual
          ranks={activeTier === 1 ? t1Ranks : t2Ranks}
          usersByRank={activeTier === 1 ? usersByT1 : usersByT2}
          onStepClick={(idx) => {
            if (activeTier === 1) {
              setExpandedT1((p) => (p === idx ? null : idx));
            } else {
              setExpandedT2((p) => (p === idx ? null : idx));
            }
            setSearch('');
          }}
          expandedStep={activeTier === 1 ? expandedT1 : expandedT2}
          variant={activeTier === 2 ? 'dark' : 'light'}
          tier={activeTier}
        />
      </motion.div>

      {/* Detalle del escalón seleccionado */}
      <AnimatePresence mode="wait">
        {expandedIdx !== null && expandedRank && (
          <motion.div
            key={`detail-${activeTier}-${expandedIdx}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden mb-6"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#C8D8CB] bg-gradient-to-r from-[#FFFDF0] to-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Trophy size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                    Escalón #{expandedIdx + 1} · Tramo {activeTier}
                  </p>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-[#111111] truncate">
                    {expandedRank.rango}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  if (activeTier === 1) setExpandedT1(null);
                  else setExpandedT2(null);
                }}
                className="text-[#9CA3AF] hover:text-[#111111] transition-colors p-1"
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F9FAFB]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder={`Buscar entre ${expandedUsers.length} distribuidor${expandedUsers.length !== 1 ? 'es' : ''}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-[#C8D8CB] rounded-lg pl-9 pr-3 py-2 text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                />
              </div>
            </div>

            {/* Lista */}
            {filteredExpanded.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Users size={32} className="text-[#9CA3AF] mx-auto mb-2 opacity-50" />
                <p className="text-[#6B7280] text-sm font-medium">
                  {search ? 'Sin resultados' : 'Ningún distribuidor en este rango aún'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#C8D8CB] max-h-[480px] overflow-y-auto">
                {filteredExpanded.map((u, idx) => (
                  <Link
                    key={u.id}
                    to={`/admin/distribuidores/${u.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[#F4F7F5] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1A4E26]/10 text-[#1A4E26] font-bold text-sm flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#111111] truncate">{u.nombre}</p>
                      <p className="text-xs text-[#9CA3AF] font-mono truncate">{u.codigo}</p>
                    </div>
                    <ExternalLink size={14} className="text-[#9CA3AF] group-hover:text-[#1A4E26] transition-colors shrink-0" />
                    <ChevronRight size={16} className="text-[#9CA3AF] shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip */}
      {expandedIdx === null && (
        <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-2xl p-5 text-center">
          <Sparkles size={20} className="text-[#1A4E26] mx-auto mb-2" />
          <p className="text-[#1A4E26] text-sm font-bold mb-1">Explora la red por rango</p>
          <p className="text-[#6B7280] text-xs">
            Haz clic en cualquier escalón de la escalera para ver el listado de distribuidores que están en ese rango.
          </p>
        </div>
      )}
    </div>
  );
}
