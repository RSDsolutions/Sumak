import { Link } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { ArrowRight, Trophy } from 'lucide-react';
import { tramo1Ranks, tramo2Ranks } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

function getRankColor(index: number, total: number): string {
  const ratio = index / (total - 1);
  if (ratio < 0.3) return 'border-[#C8D8CB] bg-[#F4F7F5]';
  if (ratio < 0.6) return 'border-[#1A4E26]/30 bg-[#EBF4ED]';
  return 'border-[#D4AF37]/50 bg-gradient-to-br from-[#FFFDF0] to-[#F4F7F5]';
}

function getRankTextColor(index: number, total: number): string {
  const ratio = index / (total - 1);
  if (ratio < 0.3) return 'text-[#6B7280]';
  if (ratio < 0.6) return 'text-[#1A4E26]';
  return 'text-[#D4AF37]';
}

export default function Escaleras() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 bg-hero-gradient overflow-hidden">
        <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#1A4E26] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#1A4E26] text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            Rangos y Bonos
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#111111] mb-5"
          >
            Escaleras de Éxito
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#6B7280] text-lg max-w-2xl mx-auto"
          >
            Tu camino hacia la libertad financiera. Cada rango alcanzado desbloquea bonos
            únicos y recompensas acumulativas.
          </motion.p>
        </div>
      </section>

      {/* Note banner */}
      <div className="bg-[#F4F7F5] border-y border-[#C8D8CB] py-4 px-4 sm:px-6 text-center">
        <p className="text-[#6B7280] text-sm">
          <span className="text-[#D4AF37] font-semibold">Importante:</span> Los bonos de rango se pagan una única vez
          al alcanzarlos y son <span className="text-[#111111] font-medium">acumulativos</span>.
        </p>
      </div>

      {/* Tramo 1 */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="mb-10">
              <span className="text-[#1A4E26] text-sm font-semibold uppercase tracking-widest">Tramo 1</span>
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] mt-1 mb-2">
                Rangos Iniciales
              </h2>
              <p className="text-[#6B7280] text-sm">
                Basados en la cantidad de personas directas afiliadas a tu red.
              </p>
              <div className="w-16 h-1 bg-[#1A4E26] rounded-full mt-4" />
            </motion.div>

            {/* Table header */}
            <motion.div variants={fadeUp} className="hidden md:grid grid-cols-3 gap-4 px-5 mb-3">
              <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">Rango</span>
              <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider text-center">Personas Directas</span>
              <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider text-right">Bono</span>
            </motion.div>

            <div className="flex flex-col gap-3">
              {tramo1Ranks.map((rank, i) => (
                <motion.div
                  key={`${rank.rango}-${i}`}
                  variants={fadeUp}
                  className={`border rounded-xl px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center ${getRankColor(i, tramo1Ranks.length)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i >= 7 ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#C8D8CB] text-[#6B7280]'
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`font-heading font-bold text-base ${getRankTextColor(i, tramo1Ranks.length)}`}>
                      {rank.rango}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-center">
                    <span className="text-[#9CA3AF] text-xs md:hidden">Personas directas:</span>
                    <span className="font-mono font-bold text-[#111111] text-base">{rank.personasDirectas}</span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <span className={`font-heading font-bold text-base ${getRankTextColor(i, tramo1Ranks.length)}`}>
                      {rank.bono}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="border-t border-dashed border-[#C8D8CB] py-6 text-center">
          <Trophy size={28} className="text-[#D4AF37] mx-auto" />
        </div>
      </div>

      {/* Tramo 2 */}
      <section className="py-8 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="mb-10">
              <span className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest">Tramo 2</span>
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] mt-1 mb-2">
                Rangos Avanzados
              </h2>
              <p className="text-[#6B7280] text-sm">
                Basados en niveles de red activos y cantidad de personas en tu red total.
              </p>
              <div className="w-16 h-1 bg-[#D4AF37] rounded-full mt-4" />
            </motion.div>

            {/* Table header */}
            <motion.div variants={fadeUp} className="hidden md:grid grid-cols-4 gap-4 px-5 mb-3">
              <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">Rango</span>
              <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider text-center">Niveles Activos</span>
              <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider text-center">Red</span>
              <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider text-right">Recompensa</span>
            </motion.div>

            <div className="flex flex-col gap-3">
              {tramo2Ranks.map((rank, i) => (
                <motion.div
                  key={`${rank.rango}-${i}`}
                  variants={fadeUp}
                  className={`border rounded-xl px-5 py-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center ${
                    i >= 4
                      ? 'border-[#D4AF37]/50 bg-gradient-to-br from-[#FFFDF0] to-[#F4F7F5] shadow-[0_0_20px_rgba(212,175,55,0.05)]'
                      : 'border-[#1A4E26]/30 bg-[#EBF4ED]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i >= 4 ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#1A4E26]/20 text-[#1A4E26]'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className={`font-heading font-bold text-sm block ${
                        i >= 4 ? 'text-[#D4AF37]' : 'text-[#1A4E26]'
                      }`}>
                        {rank.rango}
                      </span>
                      {rank.extras && (
                        <span className="text-[10px] text-[#D4AF37] opacity-70">{rank.extras}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-center">
                    <span className="text-[#9CA3AF] text-xs md:hidden">Niveles:</span>
                    <span className="font-mono text-[#111111] text-sm font-semibold">{rank.nivelesActivos}</span>
                  </div>

                  <div className="flex items-center gap-2 md:justify-center">
                    <span className="text-[#9CA3AF] text-xs md:hidden">Red:</span>
                    <span className="font-mono font-bold text-[#111111] text-sm">
                      {rank.personasEnRed.toLocaleString()}
                    </span>
                  </div>

                  <div className="md:text-right">
                    <span className={`font-heading font-bold text-base ${
                      i >= 4 ? 'text-[#D4AF37]' : 'text-[#1A4E26]'
                    }`}>
                      {rank.recompensa}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Inspirational CTA */}
      <section className="py-20 px-4 sm:px-6 bg-cta-gradient">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <Trophy size={36} className="text-white mx-auto mb-5 opacity-80" />
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-5">
              ¿Listo para escalar?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Cada rango que alcances te lleva más cerca de la libertad financiera.
              Comienza hoy y construye tu legado con SUMAK.
            </p>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-white text-[#1A4E26] font-bold text-base hover:bg-white/90 transition-all duration-200 shadow-lg"
            >
              Únete Ahora <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
