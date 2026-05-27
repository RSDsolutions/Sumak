import { Link } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { CheckCircle2, ArrowRight, Package, TrendingUp, DollarSign, FileText, User } from 'lucide-react';
import { affiliatePackages } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const incomeStreams = [
  {
    icon: <DollarSign size={26} />,
    title: 'Venta Directa — 50%',
    desc: 'Compra al 50% del PVP y vende al precio público. Ganancia inmediata del 50% en cada venta.',
  },
  {
    icon: <User size={26} />,
    title: 'Bono de Afiliación — $50',
    desc: 'Gana $50 fijos por cada persona que afilien directamente a la red SUMAK con cualquier paquete.',
  },
  {
    icon: <TrendingUp size={26} />,
    title: 'Comisiones Binarias',
    desc: 'Sistema binario continuo ilimitado. Gana el 50% del volumen pareado entre tu equipo izquierdo y derecho.',
  },
];

const requirements = [
  'Cédula de identidad (ambos lados)',
  'Planilla de servicios básicos',
  'Voucher de pago del paquete elegido',
];

const whatYouReceive = [
  'Código único SUMAK-XXXXX de distribuidor',
  '50% de descuento en todos los productos',
  'Acceso al backoffice y árbol genealógico',
  'Folleto digital de bienvenida',
  'Acceso a capacitaciones y entrenamiento',
];

export default function Oportunidad() {
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
            Únete a SUMAK
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#F0F0F0] mb-5"
          >
            Tu Oportunidad de Negocio
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#AAAAAA] text-lg max-w-2xl mx-auto"
          >
            Construye tu libertad financiera vendiendo productos naturales de alta demanda
            y desarrollando tu red de distribuidores.
          </motion.p>
        </div>
      </section>

      {/* Why SUMAK - Income Streams */}
      <section className="py-16 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-[#00A86B] text-sm font-semibold uppercase tracking-widest mb-3">
              ¿Por qué SUMAK?
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-4">
              3 Fuentes de Ingresos
            </motion.h2>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {incomeStreams.map((stream) => (
              <motion.div
                key={stream.title}
                variants={fadeUp}
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8 hover:border-[#00A86B]/40 hover:shadow-[0_0_24px_rgba(0,168,107,0.1)] transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B] mb-5">
                  {stream.icon}
                </div>
                <h3 className="font-heading font-bold text-lg text-[#F0F0F0] mb-3">{stream.title}</h3>
                <p className="text-[#888888] text-sm leading-relaxed">{stream.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-[#00A86B] text-sm font-semibold uppercase tracking-widest mb-3">
              Paquetes de Afiliación
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-4">
              Elige tu Paquete
            </motion.h2>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {affiliatePackages.map((pkg) => (
              <motion.div
                key={pkg.nombre}
                variants={fadeUp}
                className={`relative bg-[#1A1A1A] rounded-2xl p-8 flex flex-col border-2 transition-all duration-300 ${
                  pkg.destacado
                    ? 'border-[#00A86B] shadow-[0_0_40px_rgba(0,168,107,0.2)]'
                    : 'border-[#2E2E2E] hover:border-[#00A86B]/40'
                }`}
              >
                {pkg.destacado && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#00A86B] text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-[0_0_12px_rgba(0,168,107,0.4)]">
                      Más Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-[#888888] text-sm font-medium mb-1">Paquete</p>
                  <h3 className="font-heading font-bold text-2xl text-[#F0F0F0] mb-3">{pkg.nombre}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading font-bold text-5xl text-[#00A86B]">${pkg.precio}</span>
                    <span className="text-[#888888] text-sm">USD</span>
                  </div>
                </div>

                <div className="flex gap-4 mb-6 py-4 border-y border-[#2E2E2E]">
                  <div className="text-center flex-1">
                    <p className="font-bold text-xl text-[#D4AF37]">{pkg.puntos}</p>
                    <p className="text-[10px] text-[#888888]">Puntos</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="font-bold text-xl text-[#F0F0F0]">{pkg.productos}</p>
                    <p className="text-[10px] text-[#888888]">Productos</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="font-bold text-xl text-[#00A86B]">50%</p>
                    <p className="text-[10px] text-[#888888]">Descuento</p>
                  </div>
                </div>

                <ul className="flex flex-col gap-3 mb-8 flex-grow">
                  {pkg.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-[#00A86B] mt-0.5 shrink-0" />
                      <span className="text-[#888888] text-sm">{b}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/registro"
                  className={`w-full py-3.5 rounded-xl text-center font-bold text-sm transition-all duration-200 ${
                    pkg.destacado
                      ? 'bg-[#00A86B] text-white hover:bg-[#008F5A] shadow-[0_0_20px_rgba(0,168,107,0.3)]'
                      : 'border border-[#2E2E2E] text-[#F0F0F0] hover:border-[#00A86B] hover:text-[#00A86B]'
                  }`}
                >
                  Elegir este paquete
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Requirements + What you receive */}
      <section className="py-16 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Requirements */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <FileText size={20} />
              </div>
              <h3 className="font-heading font-bold text-xl text-[#F0F0F0]">¿Qué necesitas para afiliarte?</h3>
            </div>
            <ul className="flex flex-col gap-4">
              {requirements.map((req) => (
                <li key={req} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-[#D4AF37] mt-0.5 shrink-0" />
                  <span className="text-[#AAAAAA] text-sm">{req}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* What you receive */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B]">
                <Package size={20} />
              </div>
              <h3 className="font-heading font-bold text-xl text-[#F0F0F0]">¿Qué recibes al afiliarte?</h3>
            </div>
            <ul className="flex flex-col gap-4">
              {whatYouReceive.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-[#00A86B] mt-0.5 shrink-0" />
                  <span className="text-[#AAAAAA] text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 bg-cta-gradient">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-5">
              ¡Únete Hoy!
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Sé parte de la familia SUMAK y comienza a construir tu futuro financiero mientras
              ayudas a otros a mejorar su salud con productos 100% naturales.
            </p>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-white text-[#00A86B] font-bold text-base hover:bg-white/90 transition-all duration-200 shadow-lg"
            >
              Comenzar Ahora <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
