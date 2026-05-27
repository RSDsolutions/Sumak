import { motion, type Variants } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { levelCommissions } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// Binary tree node component
function TreeNode({
  label,
  sub,
  highlight = false,
}: {
  label: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 border text-center min-w-[80px] ${
        highlight
          ? 'bg-[#00A86B] border-[#00A86B] text-white shadow-[0_0_20px_rgba(0,168,107,0.4)]'
          : 'bg-[#1A1A1A] border-[#2E2E2E] text-[#F0F0F0]'
      }`}
    >
      <span className="font-heading font-bold text-sm">{label}</span>
      {sub && <span className="text-[10px] opacity-70 mt-0.5">{sub}</span>}
    </div>
  );
}

function TreeLine() {
  return <div className="w-px h-6 bg-[#2E2E2E]" />;
}

function TreeHLine({ wide = false }: { wide?: boolean }) {
  return <div className={`h-px bg-[#2E2E2E] ${wide ? 'w-32 sm:w-48' : 'w-16 sm:w-24'}`} />;
}

export default function Plan() {
  return (
    <div className="bg-[#0F0F0F]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 bg-hero-gradient overflow-hidden">
        <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#00A86B] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#00A86B] text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            Compensación
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#F0F0F0] mb-5"
          >
            Plan Multinivel
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#AAAAAA] text-lg max-w-2xl mx-auto"
          >
            Un sistema binario continuo e ilimitado diseñado para que toda tu red genere ingresos
            de forma escalable y sostenible.
          </motion.p>
        </div>
      </section>

      {/* Binary System Explanation */}
      <section className="py-16 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-3">
                Sistema Binario Continuo Ilimitado
              </h2>
              <div className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto mb-5" />
              <p className="text-[#AAAAAA] text-base max-w-2xl mx-auto">
                Tu red se divide en dos equipos: Equipo A (izquierda) y Equipo B (derecha).
                Las comisiones se calculan sobre el menor volumen de los dos equipos,
                garantizando un crecimiento equilibrado.
              </p>
            </motion.div>

            {/* Binary Tree Visual */}
            <motion.div variants={fadeUp} className="flex flex-col items-center py-8 overflow-x-auto">
              <div className="flex flex-col items-center min-w-[320px]">
                {/* Root */}
                <TreeNode label="TÚ" sub="Nivel 0" highlight />
                <TreeLine />

                {/* Level 1 branches */}
                <div className="flex items-start gap-0">
                  <div className="flex flex-col items-end">
                    <TreeHLine />
                  </div>
                  <div className="flex flex-col items-center">
                    <TreeHLine wide />
                  </div>
                  <div className="flex flex-col items-start">
                    <TreeHLine />
                  </div>
                </div>

                <div className="flex gap-32 sm:gap-48">
                  <div className="flex flex-col items-center gap-0">
                    <div className="w-px h-0 bg-[#2E2E2E]" />
                    <TreeNode label="Equipo A" sub="Izquierda" />
                    <TreeLine />
                    <div className="flex gap-6">
                      <div className="flex flex-col items-center">
                        <TreeLine />
                        <TreeNode label="Nivel 2" />
                        <TreeLine />
                        <div className="flex gap-3">
                          <TreeNode label="N3" />
                          <TreeNode label="N3" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <TreeLine />
                        <TreeNode label="Nivel 2" />
                        <TreeLine />
                        <div className="flex gap-3">
                          <TreeNode label="N3" />
                          <TreeNode label="N3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-px h-0 bg-[#2E2E2E]" />
                    <TreeNode label="Equipo B" sub="Derecha" />
                    <TreeLine />
                    <div className="flex gap-6">
                      <div className="flex flex-col items-center">
                        <TreeLine />
                        <TreeNode label="Nivel 2" />
                        <TreeLine />
                        <div className="flex gap-3">
                          <TreeNode label="N3" />
                          <TreeNode label="N3" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <TreeLine />
                        <TreeNode label="Nivel 2" />
                        <TreeLine />
                        <div className="flex gap-3">
                          <TreeNode label="N3" />
                          <TreeNode label="N3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[#555555] text-xs mt-8">
                  Hasta 14 niveles — después del nivel 14 se genera un nuevo código
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Binary Commission Mechanics */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-3">
                Cómo Funciona la Comisión Binaria
              </h2>
              <div className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
            </motion.div>

            {/* 4 cards */}
            <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Volumen Izquierda', val: '$1,000', color: 'text-[#AAAAAA]' },
                { label: 'Volumen Derecha', val: '$1,000', color: 'text-[#AAAAAA]' },
                { label: 'Volumen Pareado', val: '$1,000', color: 'text-[#D4AF37]' },
                { label: 'Comisión 50%', val: '$500', color: 'text-[#00A86B]' },
              ].map((card) => (
                <motion.div
                  key={card.label}
                  variants={fadeUp}
                  className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-5 text-center"
                >
                  <p className={`font-heading font-bold text-3xl ${card.color} mb-2`}>{card.val}</p>
                  <p className="text-[#888888] text-xs">{card.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Example box */}
            <motion.div
              variants={fadeUp}
              className="bg-gradient-to-r from-[#1A2A20] to-[#1A1A1A] border border-[#00A86B]/30 rounded-xl p-6 text-center"
            >
              <p className="text-[#888888] text-sm mb-3 font-medium uppercase tracking-wider">
                Ejemplo de cálculo
              </p>
              <p className="font-heading text-[#F0F0F0] text-xl sm:text-2xl">
                Izq: <span className="text-[#AAAAAA]">$1,000</span>
                &nbsp;+&nbsp;
                Der: <span className="text-[#AAAAAA]">$1,000</span>
                &nbsp;=&nbsp;
                <span className="text-[#D4AF37]">$1,000 pareado</span>
                &nbsp;=&nbsp;
                <span className="text-[#00A86B] font-bold">$500 comisión</span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Affiliation Bonus */}
      <section className="py-10 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-[#1A2A10] to-[#1A1A1A] border-2 border-[#D4AF37]/40 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(212,175,55,0.1)]"
          >
            <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">
              Bono Especial
            </p>
            <h3 className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-4">
              Bono de Afiliación Directa: <span className="text-[#D4AF37]">$50</span>
            </h3>
            <p className="text-[#AAAAAA] text-base max-w-lg mx-auto">
              Gana el 40% del paquete de cada nuevo afiliado que traigas directamente.
              Esto equivale a <strong className="text-[#F0F0F0]">$50 fijos</strong> por afiliación,
              sin importar el paquete elegido.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Level Commissions Table */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-3">
                Comisiones por Nivel
              </h2>
              <div className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
            </motion.div>

            <motion.div variants={fadeUp} className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-2 bg-[#222222] px-6 py-3 border-b border-[#2E2E2E]">
                <span className="text-[#888888] text-xs font-semibold uppercase tracking-wider">Nivel</span>
                <span className="text-[#888888] text-xs font-semibold uppercase tracking-wider text-right">Comisión</span>
              </div>
              {levelCommissions.map((lc) => (
                <div
                  key={lc.nivel}
                  className={`grid grid-cols-2 px-6 py-3.5 border-b border-[#2E2E2E] last:border-0 ${
                    lc.nivel === 2
                      ? 'bg-[#00A86B]/8'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        lc.nivel === 2
                          ? 'bg-[#00A86B] text-white'
                          : 'bg-[#222222] text-[#888888]'
                      }`}
                    >
                      {lc.nivel}
                    </span>
                    <span className={`text-sm ${lc.nivel === 2 ? 'text-[#F0F0F0] font-semibold' : 'text-[#AAAAAA]'}`}>
                      Nivel {lc.nivel}
                      {lc.nivel === 2 && <span className="ml-2 text-[10px] text-[#00A86B] font-bold uppercase">Mayor</span>}
                    </span>
                  </div>
                  <span className={`text-right font-bold text-base ${
                    lc.nivel === 2 ? 'text-[#00A86B]' : 'text-[#F0F0F0]'
                  }`}>
                    {lc.porcentaje}%
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.p variants={fadeUp} className="text-center text-[#555555] text-sm mt-4">
              Activación mínima: compra de $100/mes para mantener comisiones activas.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Direct Sales */}
      <section className="py-16 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-3">
                Ganancia por Venta Directa
              </h2>
              <div className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
            </motion.div>

            <motion.div variants={fadeUp} className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8">
              <p className="text-[#AAAAAA] text-base mb-6 text-center">
                Compra al <span className="text-[#00A86B] font-bold">50% del PVP</span>, vende al precio público.
                Ganancia directa del <span className="text-[#00A86B] font-bold">50%</span>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'PVP Público', val: '$25.00', color: 'text-[#AAAAAA]' },
                  { label: 'Tu Costo (50%)', val: '$12.50', color: 'text-[#D4AF37]' },
                  { label: 'Tu Ganancia', val: '$12.50', color: 'text-[#00A86B]' },
                ].map((item) => (
                  <div key={item.label} className="bg-[#222222] rounded-xl p-5 text-center">
                    <p className={`font-heading font-bold text-3xl ${item.color} mb-1`}>{item.val}</p>
                    <p className="text-[#888888] text-xs">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[#555555] text-xs text-center mt-4">
                Ejemplo basado en producto de $25.00 PVP
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Growth Example */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-3">
                El Poder del Crecimiento Exponencial
              </h2>
              <p className="text-[#888888] text-sm">Si cada persona invita a 2 personas...</p>
              <div className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto mt-3" />
            </motion.div>

            <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { nivel: 1, personas: 2 },
                { nivel: 2, personas: 4 },
                { nivel: 3, personas: 8 },
                { nivel: 4, personas: 16 },
                { nivel: 5, personas: 32 },
                { nivel: 6, personas: 64 },
                { nivel: 7, personas: 128 },
              ].map((row, i) => (
                <motion.div
                  key={row.nivel}
                  variants={fadeUp}
                  className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-4 text-center"
                  style={{ opacity: 0.6 + i * 0.06 }}
                >
                  <p className="text-[#555555] text-[10px] uppercase tracking-wider mb-1">Nivel {row.nivel}</p>
                  <p className="font-heading font-bold text-xl text-[#00A86B]">{row.personas}</p>
                  <p className="text-[#888888] text-[10px]">personas</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 text-center">
              <Link
                to="/escaleras"
                className="inline-flex items-center gap-2 text-[#00A86B] font-semibold text-sm hover:underline"
              >
                Ver todos los rangos y bonos de escalera <ArrowRight size={15} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
