import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Trophy, Crown, Star, ArrowRight, TrendingUp,
  Sparkles, Users, Calendar, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { tramo1Ranks, tramo2Ranks, getRangoActual, getNextRango } from '../../data';
import StaircaseVisual, { type StaircaseRank } from '../../components/StaircaseVisual';

// Devuelve [inicio, finExclusivo) del mes calendario para una fecha dada.
function monthRange(date: Date): { start: Date; end: Date; label: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const label = start.toLocaleString('es-EC', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function MiEscalera() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [directos, setDirectos] = useState(0);
  const [redTotal, setRedTotal] = useState(0);
  // BIZ: la escalera de exito es MENSUAL — se reinicia cada mes.
  // Solo cuentan los afiliados (directos y red) cuya fecha de aprobacion
  // este dentro del mes seleccionado. El usuario puede navegar a meses
  // anteriores para ver su historial.
  const [monthOffset, setMonthOffset] = useState(0);
  const monthDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const { start: monthStart, end: monthEnd, label: monthLabel } = useMemo(
    () => monthRange(monthDate),
    [monthDate],
  );
  const isCurrentMonth = monthOffset === 0;

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      // Cargar todos los profiles distribuidor con su fecha de aprobacion.
      // Si fecha_aprobacion es null cae a fecha_registro como fallback.
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, patrocinador_id, fecha_aprobacion, fecha_registro')
        .eq('rol', 'distribuidor');

      const list = (allProfiles ?? []) as {
        id: string;
        patrocinador_id: string | null;
        fecha_aprobacion: string | null;
        fecha_registro: string | null;
      }[];

      const startMs = monthStart.getTime();
      const endMs = monthEnd.getTime();
      const inMonth = (p: typeof list[number]) => {
        const dateStr = p.fecha_aprobacion ?? p.fecha_registro;
        if (!dateStr) return false;
        const t = new Date(dateStr).getTime();
        return t >= startMs && t < endMs;
      };

      // Directos del mes: profiles cuyo patrocinador_id = user.id
      // y cuya fecha cae en el mes seleccionado.
      const directosCount = list.filter(
        (p) => p.patrocinador_id === user!.id && inMonth(p),
      ).length;

      // Mapa hijo→padres (toda la red, sin filtrar) para descender.
      const childrenMap = new Map<string, string[]>();
      const byId = new Map<string, typeof list[number]>();
      for (const p of list) {
        byId.set(p.id, p);
        if (p.patrocinador_id) {
          const arr = childrenMap.get(p.patrocinador_id) ?? [];
          arr.push(p.id);
          childrenMap.set(p.patrocinador_id, arr);
        }
      }

      // Red total del mes: BFS descendente; solo cuenta a los que se
      // afiliaron en este mes.
      let total = 0;
      const queue: string[] = [user!.id];
      const seen = new Set<string>([user!.id]);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = childrenMap.get(current) ?? [];
        for (const child of children) {
          if (seen.has(child)) continue;
          seen.add(child);
          const childData = byId.get(child);
          if (childData && inMonth(childData)) total++;
          queue.push(child);
        }
      }

      setDirectos(directosCount);
      setRedTotal(total);
      setLoading(false);
    }

    load();
  }, [user, monthStart, monthEnd]);

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
  const indiceT2 = rangoT2Actual
    ? tramo2Ranks.findIndex(
        (r) => r.rango === rangoT2Actual.rango && r.personasEnRed === rangoT2Actual.personasEnRed,
      )
    : -1;

  // StaircaseVisual auto-resuelve imagen+icono del premio a partir del label.
  const t1RanksForStair: StaircaseRank[] = useMemo(
    () => tramo1Ranks.map((r) => {
      const prizeLabel = r.bono.includes(' + ') ? r.bono.split(' + ')[1] : null;
      return {
        rango: r.rango,
        requirement: `${r.personasDirectas} direct${r.personasDirectas === 1 ? 'o' : 'os'}`,
        reward: r.bono.split(' +')[0],
        extra: prizeLabel ? { label: prizeLabel } : undefined,
      };
    }),
    [],
  );

  const t2RanksForStair: StaircaseRank[] = useMemo(
    () => tramo2Ranks.map((r) => ({
      rango: r.rango,
      requirement: `${r.personasEnRed.toLocaleString('es-EC')} red · Niv ${r.nivelesActivos}`,
      reward: r.recompensa,
      extra: r.extras ? { label: r.extras, image: r.extraImage } : undefined,
    })),
    [],
  );

  if (loading) return <Spinner />;

  return (
    <div>
      {/* ── Header ───────────────────────────────── */}
      <div className="mb-4">
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

      {/* ── Selector de mes + aviso de reset mensual ───────── */}
      <div className="bg-gradient-to-r from-[#FFF8DC] to-[#FFFEF7] border-2 border-[#D4AF37]/40 rounded-2xl p-4 mb-6 shadow-[0_4px_16px_rgba(212,175,55,0.12)]">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
            <RefreshCw size={18} className="text-[#92680A]" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="font-bold text-[#0B2913] text-sm flex items-center gap-1.5 flex-wrap">
              <Calendar size={13} className="text-[#92680A]" />
              Escalera de
              <span className="capitalize">{monthLabel}</span>
              {isCurrentMonth && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1A4E26] text-white px-2 py-0.5 rounded">
                  Mes actual
                </span>
              )}
            </p>
            <p className="text-[#5C4200] text-xs mt-1 leading-relaxed">
              Los rangos se calculan <strong>por mes calendario</strong> y se reinician el día 1.
              Solo cuentan los distribuidores afiliados en este mes a tu red para definir tu rango.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="w-9 h-9 rounded-lg bg-white border border-[#D4AF37]/40 flex items-center justify-center text-[#92680A] hover:bg-[#FFF4CC] transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              disabled={isCurrentMonth}
              className="w-9 h-9 rounded-lg bg-white border border-[#D4AF37]/40 flex items-center justify-center text-[#92680A] hover:bg-[#FFF4CC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => setMonthOffset(0)}
                className="ml-1 px-3 h-9 rounded-lg bg-[#D4AF37] text-[#0B2913] text-xs font-bold hover:bg-[#E8C94A] transition-colors"
              >
                Hoy
              </button>
            )}
          </div>
        </div>
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
              <span className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.25em]">Tramo 1 · Rango del mes</span>
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
              <span className="text-white/85 text-[10px] font-bold uppercase tracking-[0.25em]">Tramo 2 · Red del mes</span>
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
                      <Trophy size={11} /> {rangoT2Actual.extras}
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

      {/* ── Tramo 1: escalera visual ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-white to-[#F4F7F5] border border-[#C8D8CB] rounded-3xl overflow-hidden mb-6"
      >
        <div className="px-5 py-4 bg-white border-b border-[#C8D8CB] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-[#1A4E26]" />
            <h2 className="font-heading font-bold text-[#111111] text-sm">Tramo 1 · Camino del Socio al Gerente</h2>
          </div>
          <span className="text-[10px] text-[#9CA3AF] font-medium">
            Escalón {indiceT1 + 1} de {tramo1Ranks.length}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <StaircaseVisual
            ranks={t1RanksForStair}
            currentIndex={indiceT1}
            variant="light"
            tier={1}
          />
        </div>
      </motion.div>

      {/* ── Tramo 2: escalera visual ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl overflow-hidden mb-6 bg-gradient-to-br from-[#0F2E18] via-[#1A4E26] to-[#0F2E18]"
      >
        <div className="px-5 py-4 bg-black/30 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-[#D4AF37]" />
            <h2 className="font-heading font-bold text-white text-sm">Tramo 2 · Del Gerente al Fundador Internacional</h2>
          </div>
          <span className="text-[10px] text-white/60 font-medium">
            {indiceT2 >= 0 ? `Escalón ${indiceT2 + 1} de ${tramo2Ranks.length}` : `Aún no inicias el Tramo 2`}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <StaircaseVisual
            ranks={t2RanksForStair}
            currentIndex={indiceT2}
            variant="dark"
            tier={2}
          />
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
