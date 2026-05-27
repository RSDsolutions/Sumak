import { motion, type Variants } from 'motion/react';
import { Shield, Users, Heart, Lightbulb, Star, Zap, Leaf, FlaskConical } from 'lucide-react';
import { contactInfo } from '../data';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const pillars = [
  {
    icon: <Leaf size={24} />,
    title: 'Bienestar Natural',
    desc: 'Productos que cuidan tu salud, formulados con ingredientes de origen natural y orgánico.',
  },
  {
    icon: <Users size={24} />,
    title: 'Crecimiento Colaborativo',
    desc: 'Un modelo de negocio que potencia el éxito mutuo a través de la red de distribuidores.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Calidad y Confianza',
    desc: 'Garantizamos excelencia en cada uno de nuestros productos, elaborados bajo altos estándares.',
  },
];

const values = [
  { icon: <Shield size={22} />, title: 'Integridad', desc: 'Actuamos con honestidad y transparencia en todo lo que hacemos.' },
  { icon: <Users size={22} />, title: 'Trabajo en Equipo', desc: 'Fomentamos la colaboración para alcanzar metas comunes.' },
  { icon: <Heart size={22} />, title: 'Pasión', desc: 'Nos dedicamos con entusiasmo a ofrecer productos y servicios que transformen vidas.' },
  { icon: <Lightbulb size={22} />, title: 'Innovación', desc: 'Buscamos constantemente nuevas formas de mejorar nuestros productos y servicios.' },
  { icon: <Star size={22} />, title: 'Confianza', desc: 'Construimos relaciones basadas en el respeto y la lealtad.' },
  { icon: <Zap size={22} />, title: 'Simplicidad', desc: 'Simplificamos procesos para que nuestra red de mercadeo sea accesible para todos.' },
];

export default function Nosotros() {
  return (
    <div className="bg-[#0F0F0F]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 bg-hero-gradient overflow-hidden">
        <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#00A86B] opacity-[0.05] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#00A86B] text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            Inicio &nbsp;/&nbsp; Nosotros
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#F0F0F0] mb-5"
          >
            Sobre Nosotros
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#AAAAAA] text-lg max-w-2xl mx-auto"
          >
            Más de 15 años rescatando la sabiduría ancestral andina para transformar
            la salud y el bienestar de Ecuador.
          </motion.p>
        </div>
      </section>

      {/* Welcome / Gerente */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
          >
            <motion.div variants={fadeUp} className="flex flex-col items-center md:items-start gap-5">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#1A2A20] to-[#1A1A1A] border-2 border-[#00A86B]/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,168,107,0.15)]">
                <span className="font-heading font-bold text-3xl text-[#00A86B]">LP</span>
              </div>
              <div className="text-center md:text-left">
                <p className="font-heading font-bold text-xl text-[#F0F0F0]">{contactInfo.gerenteGeneral}</p>
                <p className="text-[#00A86B] text-sm font-medium">Gerente General</p>
                <p className="text-[#888888] text-sm">Sumak Vida Ecuador S.A.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-5">
                Bienvenida del Gerente General
              </h2>
              <p className="text-[#AAAAAA] text-base leading-relaxed mb-4">
                Durante más de 15 años, SUMAK ha sido un referente en la elaboración de productos
                naturales basados en la sabiduría ancestral andina. Nuestra misión es simple pero
                transformadora: acercar el poder de la naturaleza a cada hogar ecuatoriano.
              </p>
              <p className="text-[#AAAAAA] text-base leading-relaxed">
                A través de nuestro laboratorio ancestral Sumak Jambi, combinamos el conocimiento
                milenario de las plantas medicinales con estándares modernos de calidad, para ofrecer
                productos que realmente transforman vidas.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#1A1A1A] rounded-2xl p-8 border border-[#2E2E2E] border-l-4 border-l-[#00A86B]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B]">
                <Leaf size={20} />
              </div>
              <h3 className="font-heading font-bold text-xl text-[#F0F0F0]">Misión</h3>
            </div>
            <p className="text-[#AAAAAA] text-sm leading-relaxed">
              Elaborar y ofrecer productos naturales a base de plantas medicinales, rescatando la
              sabiduría ancestral y aplicando prácticas responsables, para promover la salud, el
              bienestar y la armonía con la naturaleza.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#1A1A1A] rounded-2xl p-8 border border-[#2E2E2E] border-l-4 border-l-[#D4AF37]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <Star size={20} />
              </div>
              <h3 className="font-heading font-bold text-xl text-[#F0F0F0]">Visión</h3>
            </div>
            <p className="text-[#AAAAAA] text-sm leading-relaxed">
              Ser una empresa reconocida por promover la medicina natural y ancestral, elaborando
              productos vegetales de calidad que aporten al bienestar integral y al respeto por la
              naturaleza.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-3">
              Nuestros Pilares
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
            {pillars.map((p) => (
              <motion.div
                key={p.title}
                variants={fadeUp}
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-7 hover:border-[#00A86B]/40 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B] mb-4">
                  {p.icon}
                </div>
                <h3 className="font-heading font-bold text-[#F0F0F0] mb-2">{p.title}</h3>
                <p className="text-[#888888] text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values */}
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
              Cultura
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-3">
              Nuestros Valores
            </motion.h2>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {values.map((v) => (
              <motion.div
                key={v.title}
                variants={fadeUp}
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-6 flex gap-4 hover:border-[#00A86B]/30 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B] shrink-0 mt-0.5">
                  {v.icon}
                </div>
                <div>
                  <h4 className="font-heading font-bold text-[#F0F0F0] mb-1">{v.title}</h4>
                  <p className="text-[#888888] text-sm leading-relaxed">{v.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Lab section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-gradient-to-br from-[#1A2A20] to-[#1A1A1A] border border-[#00A86B]/30 rounded-2xl p-10 flex flex-col md:flex-row gap-8 items-center shadow-[0_0_40px_rgba(0,168,107,0.08)]"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B] shrink-0">
              <FlaskConical size={40} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-3">
                Sumak Jambi — Laboratorio Ancestral
              </h2>
              <p className="text-[#AAAAAA] text-base leading-relaxed">
                Nuestro laboratorio ancestral es el corazón de SUMAK. Aquí combinamos la sabiduría
                de los conocimientos indígenas andinos con los más altos estándares de calidad y
                buenas prácticas de manufactura. Cada producto que elaboramos es 100% natural,
                trazable y responsable con el medio ambiente.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Company Data */}
      <section className="py-16 px-4 sm:px-6 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0] mb-3">
              Información Corporativa
            </motion.h2>
            <motion.div variants={fadeUp} className="w-16 h-1 bg-[#00A86B] rounded-full mx-auto" />
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { label: 'Razón Social', value: contactInfo.empresa },
              { label: 'Nombre Comercial', value: contactInfo.nombreComercial },
              { label: 'RUC', value: contactInfo.ruc },
              { label: 'Gerente General', value: contactInfo.gerenteGeneral },
              { label: 'Teléfonos', value: `${contactInfo.telefono1} — ${contactInfo.telefono2}` },
              { label: 'Email Principal', value: contactInfo.emailPrincipal },
              { label: 'Email Secundario', value: contactInfo.emailSecundario },
              { label: 'Dirección', value: contactInfo.direccion },
              { label: 'Sitio Web', value: contactInfo.web },
            ].map((item) => (
              <motion.div
                key={item.label}
                variants={fadeUp}
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-5"
              >
                <p className="text-[#00A86B] text-xs font-semibold uppercase tracking-wider mb-2">{item.label}</p>
                <p className="text-[#F0F0F0] text-sm font-medium break-all">{item.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
