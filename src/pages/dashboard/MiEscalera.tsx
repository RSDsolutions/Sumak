import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Trophy, Crown, Star, Lock, CheckCircle2, ArrowRight, TrendingUp,
  Sparkles, Globe, ChefHat, Snowflake, Tv, Laptop, Bike, Car, Home,
  Plane, MapPin, Gem, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { tramo1Ranks, tramo2Ranks, getRangoActual, getNextRango } from '../../data';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function getPrizeIcon(text: string, size = 14) {
  if (text.includes('Internacional')) return <Globe size={size} />;
  if (text.includes('Nacional')) return <Plane size={size} />;
  if (text.includes('Local')) return <MapPin size={size} />;
  return null;
}

function getExtraIcon(text: string, size = 14) {
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

export default function MiEscalera() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [directos, setDirectos] = useState(0);
  const [redTotal, setRedTotal] = useState(0);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // Cargar todos los profiles distribuidor para construir el árbol de descendientes
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, patrocinador_id')
        .eq('rol', 'distribuidor');

      const list = (allProfiles ?? []) as { id: string; patrocinador_id: string | null }[];

      // Directos: profiles cuyo patrocinador_id = user.id
      const directosCount = list.filter((p) => p.patrocinador_id === user!.id).length;

      // Red total: BFS recursivo desde el user.id por la cadena patrocinador
      const childrenMap = new Map<string, string[]>();
      for (const p of list) {
        if (p.patrocinador_id) {
          const arr = childrenMap.get(p.patrocinador_id) ?? [];
          arr.push(p.id);
          childrenMap.set(p.patrocinador_id, arr);
        }
      }

      let total = 0;
      const queue: string[] = [user!.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = childrenMap.get(current) ?? [];
        for (const child of children) {
          total++;
          queue.push(child);
        }
      }

      setDirectos(directosCount);
      setRedTotal(total);
      setLoading(false);
    }

    load();
  }, [user]);

  // ── Tramo 1 ──
  const rangoT1Actual = useMemo(() => getRangoActual(directos), [directos]);
  const nextT1 = useMemo(() => getNextRango(directos), [directos]);
  const progresoT1 = nextT1
    ? Math.min(100, (directos / nextT1.personasDirectas) * 100)
    : 100;
  const faltanT1 = nextT1 ? Math.max(0, nextT1.personasDirectas - directos) : 0;
  const indiceT1 = tramo1Ranks.findIndex((r) => r.rango === rangoT1Actual.rango);

  // ── Tramo 2 ──
  const rangoT2Actual = useMemo(() => {
    let current = null;
    for (const r of tramo2Ranks) {
      if (redTotal >= r.personasEnRed) current = r;
      else break;
    }
    return current;
  }, [redTotal]);
  const nextT2 = useMemo(() => {
    for (const r of tramo2Ranks) {
      if (r.personasEnRed > redTotal) return r;
    }
    return null;
  }, [redTotal]);
  const progresoT2 = nextT2
    ? Math.min(100, (redTotal / nextT2.personasEnRed) * 100)
    : 100;
  const faltanT2 = nextT2 ? Math.max(0, nextT2.personasEnRed - redTotal) : 0;

  if (loading) return <Spinner />;

  return (
    <div>
      {/* ── Header ───────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
            <Trophy size={26} className="text-[#D4AF37]" />
            Mi Escalera de Éxito
          </h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 uppercase tracking-widest">
            <Sparkles size={11} /> {profile?.codigo_distribuidor ?? '—'}
          </span>
        </div>
        <p className="text-[#6B7280] text-sm mt-1">
          Tu progreso en los dos tramos de la red Sumak. Cada rango desbloquea bonos y recompensas.
        </p>
      </div>

      {/* ── Hero con posición actual ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Tramo 1 hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0F2E18 0%, #1A4E26 50%, #2B6E3A 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.25em]">Tramo 1 · Mi rango actual</span>
              <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {directos} directo{directos !== 1 ? 's' : ''}
              </span>
            </div>
            <h2 className="font-heading font-bold text-3xl text-white mb-1">{rangoT1Actual.rango}</h2>
            <p className="text-[#D4AF37] text-base font-bold mb-5">Bono: {rangoT1Actual.bono}</p>

            {nextT1 ? (
              <>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <p className="text-white/85 text-xs mb-3 leading-relaxed">
                    <Star size={11} className="inline text-[#D4AF37] mr-1" />
                    <strong className="text-[#D4AF37]">Faltan {faltanT1} afiliado{faltanT1 !== 1 ? 's' : ''} directo{faltanT1 !== 1 ? 's' : ''}</strong> para subir a <strong>{nextT1.rango}</strong> y desbloquear <strong className="text-white">{nextT1.bono}</strong>.
                  </p>
                  <div className="w-full bg-black/30 rounded-full h-2.5 mb-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progresoT1}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="bg-gradient-to-r from-[#D4AF37] to-[#E8C94A] h-2.5 rounded-full"
                    />
                  </div>
                  <p className="text-white/60 text-[10px] font-mono">
                    {directos} / {nextT1.personasDirectas} ({Math.round(progresoT1)}%)
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-[#D4AF37]/15 backdrop-blur-sm rounded-2xl p-4 border border-[#D4AF37]/30">
                <Crown size={18} className="text-[#D4AF37] mb-2" />
                <p className="text-[#D4AF37] font-bold text-sm">Rango máximo del Tramo 1 alcanzado</p>
                <p className="text-white/65 text-xs mt-1">Continúa en el Tramo 2 para seguir creciendo.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tramo 2 hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #6B3A00 0%, #A88B20 50%, #D4AF37 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #FFFFFF 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/85 text-[10px] font-bold uppercase tracking-[0.25em]">Tramo 2 · Red total</span>
              <span className="bg-black/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {redTotal.toLocaleString('es-EC')} en red
              </span>
            </div>
            <h2 className="font-heading font-bold text-3xl text-white mb-1">
              {rangoT2Actual?.rango ?? 'Sin rango aún'}
            </h2>
            <p className="text-white/95 text-base font-bold mb-5 flex items-center gap-1.5">
              {rangoT2Actual ? (
                <>
                  Recompensa: {rangoT2Actual.recompensa}
                  {rangoT2Actual.extras && (
                    <span className="inline-flex items-center gap-1 ml-2 bg-black/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {getExtraIcon(rangoT2Actual.extras, 11)} {rangoT2Actual.extras}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-white/65 text-sm">Suma personas a tu red para empezar</span>
              )}
            </p>

            {nextT2 ? (
              <>
                <div className="bg-black/25 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
                  <p className="text-white text-xs mb-3 leading-relaxed">
                    <Star size={11} className="inline text-white mr-1" fill="currentColor" />
                    <strong>Faltan {faltanT2.toLocaleString('es-EC')} persona{faltanT2 !== 1 ? 's' : ''}</strong> en tu red para llegar a <strong>{nextT2.rango}</strong> y desbloquear <strong>{nextT2.recompensa}</strong>
                    {nextT2.extras && <> + <strong>{nextT2.extras}</strong></>}.
                  </p>
                  <div className="w-full bg-black/40 rounded-full h-2.5 mb-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progresoT2}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      className="bg-gradient-to-r from-white to-[#FFE066] h-2.5 rounded-full"
                    />
                  </div>
                  <p className="text-white/70 text-[10px] font-mono">
                    {redTotal.toLocaleString('es-EC')} / {nextT2.personasEnRed.toLocaleString('es-EC')} ({Math.round(progresoT2)}%)
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <Crown size={18} className="text-white mb-2" />
                <p className="text-white font-bold text-sm">¡Fundador Internacional alcanzado!</p>
                <p className="text-white/75 text-xs mt-1">Has llegado al rango máximo de toda la red Sumak.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Tramo 1: lista completa de rangos ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden mb-6"
      >
        <div className="px-5 py-4 bg-[#F4F7F5] border-b border-[#C8D8CB] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-[#1A4E26]" />
            <h2 className="font-heading font-bold text-[#111111] text-sm">Tramo 1 · Camino del Socio al Gerente</h2>
          </div>
          <span className="text-[10px] text-[#9CA3AF] font-medium">
            {indiceT1 + 1} de {tramo1Ranks.length} rangos
          </span>
        </div>

        <div className="divide-y divide-[#C8D8CB]">
          {tramo1Ranks.map((rank, i) => {
            const isCurrent = i === indiceT1;
            const isAchieved = i <= indiceT1;
            const isNext = i === indiceT1 + 1;
            const prizeIcon = getPrizeIcon(rank.bono);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#EBF4ED] to-[#FFFDF0]'
                    : isAchieved
                    ? 'bg-white'
                    : 'bg-[#FAFBFA]'
                }`}
              >
                {/* Indicador */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-[#D4AF37] text-[#0B2913] ring-4 ring-[#D4AF37]/25'
                    : isAchieved
                    ? 'bg-[#1A4E26] text-white'
                    : 'bg-[#F4F7F5] text-[#9CA3AF] border border-[#C8D8CB]'
                }`}>
                  {isCurrent ? (
                    <Star size={16} fill="currentColor" />
                  ) : isAchieved ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Lock size={13} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold text-sm ${isAchieved ? 'text-[#111111]' : 'text-[#6B7280]'}`}>
                      {rank.rango}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded">
                        Aquí estás
                      </span>
                    )}
                    {isNext && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] px-1.5 py-0.5 rounded">
                        Próximo
                      </span>
                    )}
                  </div>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${isAchieved ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
                    <Users size={10} />
                    {rank.personasDirectas} afiliado{rank.personasDirectas !== 1 ? 's' : ''} directo{rank.personasDirectas !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Bono */}
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm flex items-center justify-end gap-1 ${
                    isCurrent ? 'text-[#D4AF37]' : isAchieved ? 'text-[#1A4E26]' : 'text-[#9CA3AF]'
                  }`}>
                    {prizeIcon} {rank.bono}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Tramo 2: rangos avanzados con premios ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-[#D4AF37]/30 rounded-2xl overflow-hidden mb-6"
      >
        <div className="px-5 py-4 bg-gradient-to-r from-[#FFFDF5] to-[#FFFEF7] border-b border-[#D4AF37]/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-[#D4AF37]" />
            <h2 className="font-heading font-bold text-[#111111] text-sm">Tramo 2 · Del Gerente al Fundador Internacional</h2>
          </div>
          <span className="text-[10px] text-[#9CA3AF] font-medium">
            {rangoT2Actual ? tramo2Ranks.findIndex((r) => r.rango === rangoT2Actual.rango && r.personasEnRed === rangoT2Actual.personasEnRed) + 1 : 0} de {tramo2Ranks.length} rangos
          </span>
        </div>

        <div className="divide-y divide-[#D4AF37]/20">
          {tramo2Ranks.map((rank, i) => {
            const currentIdx = rangoT2Actual
              ? tramo2Ranks.findIndex((r) => r.rango === rangoT2Actual.rango && r.personasEnRed === rangoT2Actual.personasEnRed)
              : -1;
            const isCurrent = i === currentIdx;
            const isAchieved = i <= currentIdx;
            const isNext = i === currentIdx + 1;
            const isDiamond = rank.rango.includes('Diamante');
            const isFounder = rank.rango.includes('Fundador');

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className={`flex items-center gap-3 px-5 py-4 transition-colors ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#FFFDF0] to-[#FFFCEB]'
                    : isAchieved
                    ? 'bg-white'
                    : 'bg-[#FAFBFA]'
                }`}
              >
                {/* Indicador */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-[#D4AF37] text-[#0B2913] ring-4 ring-[#D4AF37]/25'
                    : isAchieved
                    ? isFounder
                      ? 'bg-gradient-to-br from-[#FFE066] to-[#D4AF37] text-[#0B2913]'
                      : isDiamond
                      ? 'bg-[#D4AF37] text-white'
                      : 'bg-[#1A4E26] text-white'
                    : 'bg-[#F4F7F5] text-[#9CA3AF] border border-[#C8D8CB]'
                }`}>
                  {isFounder && isAchieved ? (
                    <Crown size={17} />
                  ) : isDiamond && isAchieved ? (
                    <Gem size={16} />
                  ) : isCurrent ? (
                    <Star size={17} fill="currentColor" />
                  ) : isAchieved ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Lock size={13} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold text-sm ${isAchieved ? 'text-[#111111]' : 'text-[#6B7280]'}`}>
                      {rank.rango}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded">
                        Aquí estás
                      </span>
                    )}
                    {isNext && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] px-1.5 py-0.5 rounded">
                        Próximo
                      </span>
                    )}
                  </div>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${isAchieved ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
                    <Users size={10} />
                    {rank.personasEnRed.toLocaleString('es-EC')} personas · Niveles {rank.nivelesActivos}
                  </p>
                </div>

                {/* Recompensa + premio */}
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm ${
                    isCurrent ? 'text-[#D4AF37]' : isAchieved ? (isFounder ? 'text-[#D4AF37]' : '[#1A4E26]') : 'text-[#9CA3AF]'
                  }`}>
                    {rank.recompensa}
                  </p>
                  {rank.extras && (
                    <p className={`text-[10px] font-bold inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded ${
                      isAchieved
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
                        : 'bg-[#F4F7F5] text-[#9CA3AF] border border-[#C8D8CB]'
                    }`}>
                      {getExtraIcon(rank.extras, 10)} {rank.extras}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Consejos / Tips ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-[#EBF4ED] to-white border border-[#1A4E26]/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-[#1A4E26]" />
          <h2 className="font-heading font-bold text-[#111111] text-base">¿Cómo subir de rango?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-xl p-4 border border-[#C8D8CB]">
            <div className="w-9 h-9 bg-[#1A4E26]/10 rounded-lg flex items-center justify-center mb-2">
              <Users size={18} className="text-[#1A4E26]" />
            </div>
            <p className="font-bold text-[#111111] text-sm mb-1">Invita directos</p>
            <p className="text-[#6B7280] text-xs leading-relaxed">
              Cada persona que se afilie con tu código suma a tu Tramo 1.
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#C8D8CB]">
            <div className="w-9 h-9 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center mb-2">
              <TrendingUp size={18} className="text-[#D4AF37]" />
            </div>
            <p className="font-bold text-[#111111] text-sm mb-1">Activa tu mes</p>
            <p className="text-[#6B7280] text-xs leading-relaxed">
              Compra $100+ en un solo pedido cada mes para mantener tu cupo a comisiones.
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#C8D8CB]">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
              <Star size={18} className="text-blue-600" fill="currentColor" />
            </div>
            <p className="font-bold text-[#111111] text-sm mb-1">Apoya tu red</p>
            <p className="text-[#6B7280] text-xs leading-relaxed">
              Acompaña a tu equipo para que también crezcan: cada uno multiplica tu Tramo 2.
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/red"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all shadow-[0_4px_16px_rgba(26,78,38,0.2)]"
        >
          Ver mi red <ArrowRight size={15} />
        </Link>
      </motion.div>
    </div>
  );
}
