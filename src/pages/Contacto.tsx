import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { Phone, Mail, MapPin, Facebook, Instagram, CheckCircle2, Send } from 'lucide-react';
import { contactInfo } from '../data';
import { useSEO } from '../lib/seo';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

interface FormState {
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
}

export default function Contacto() {
  useSEO({
    title: 'Contacto — Sumak Vida Ecuador',
    description:
      'Contáctanos. Oficinas en Babahoyo, Los Ríos. WhatsApp 0988447019. Email sumak.vida1979@gmail.com. Atención en horario de oficina.',
    url: '/contacto',
  });

  const [form, setForm] = useState<FormState>({ nombre: '', email: '', telefono: '', mensaje: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 bg-hero-gradient overflow-hidden">
        <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#1A4E26] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#1A4E26] text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            Estamos para ayudarte
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#111111] mb-5"
          >
            Contacto
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#6B7280] text-lg max-w-xl mx-auto"
          >
            ¿Tienes preguntas sobre nuestros productos o el plan de afiliación? Escríbenos.
          </motion.p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Form */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-2xl text-[#111111] mb-6">
              Envíanos un mensaje
            </motion.h2>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#EBF4ED] border border-[#1A4E26]/30 rounded-2xl p-10 text-center"
              >
                <CheckCircle2 size={48} className="text-[#1A4E26] mx-auto mb-4" />
                <h3 className="font-heading font-bold text-xl text-[#111111] mb-3">
                  ¡Mensaje enviado!
                </h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">
                  Tu mensaje ha sido enviado. Te contactaremos pronto.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ nombre: '', email: '', telefono: '', mensaje: '' }); }}
                  className="mt-6 text-[#1A4E26] text-sm font-semibold hover:underline"
                >
                  Enviar otro mensaje
                </button>
              </motion.div>
            ) : (
              <motion.form
                variants={fadeUp}
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div>
                  <label htmlFor="nombre" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                    Nombre completo *
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Tu nombre completo"
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3.5 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="tu@email.com"
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3.5 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="telefono" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                    Teléfono
                  </label>
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="09XXXXXXXX"
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3.5 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="mensaje" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                    Mensaje *
                  </label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    required
                    rows={5}
                    value={form.mensaje}
                    onChange={handleChange}
                    placeholder="¿En qué podemos ayudarte?"
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3.5 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#163F1E] shadow-[0_0_20px_rgba(26,78,38,0.25)] transition-all duration-200"
                >
                  Enviar Mensaje <Send size={16} />
                </button>
              </motion.form>
            )}
          </motion.div>

          {/* Contact Info */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="flex flex-col gap-5"
          >
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-2xl text-[#111111] mb-1">
              Información de Contacto
            </motion.h2>

            {[
              {
                icon: <Phone size={18} />,
                title: 'Teléfonos',
                content: `${contactInfo.telefono1} — ${contactInfo.telefono2}`,
              },
              {
                icon: <Mail size={18} />,
                title: 'Correos Electrónicos',
                content: `${contactInfo.emailPrincipal}\n${contactInfo.emailSecundario}`,
              },
              {
                icon: <MapPin size={18} />,
                title: 'Dirección',
                content: contactInfo.direccion,
              },
              {
                icon: <Facebook size={18} />,
                title: 'Facebook',
                content: contactInfo.facebook,
              },
              {
                icon: <Instagram size={18} />,
                title: 'Instagram',
                content: contactInfo.instagram,
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="bg-white border border-[#C8D8CB] rounded-xl p-5 flex gap-4 hover:border-[#1A4E26]/40 hover:shadow-[0_0_12px_rgba(26,78,38,0.08)] transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1A4E26]/10 flex items-center justify-center text-[#1A4E26] shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1.5">{item.title}</p>
                  <p className="text-[#111111] text-sm whitespace-pre-line leading-relaxed">{item.content}</p>
                </div>
              </motion.div>
            ))}

            {/* Map — OpenStreetMap embed (Google bloquea maps.google.com/maps?output=embed
                en iframes desde 2024 con el mensaje "Este contenido está bloqueado") */}
            <motion.div variants={fadeUp} className="rounded-xl overflow-hidden border border-[#C8D8CB] mt-2">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=-79.5346,-1.8016,-79.5279,-1.7962&layer=mapnik&marker=-1.798915,-79.531299"
                width="100%"
                height="360"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Oficina Sumak Vida Ecuador — Babahoyo"
              />
              <a
                href="https://www.google.com/maps?q=-1.798915,-79.531299"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 bg-[#1A4E26] text-white text-xs font-bold text-center hover:bg-[#163F1E] transition-colors"
              >
                Abrir en Google Maps ↗
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
