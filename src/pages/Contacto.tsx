import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { Phone, Mail, MapPin, Facebook, Instagram, CheckCircle2, Send } from 'lucide-react';
import { contactInfo } from '../data';

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
    <div className="bg-[#0F0F0F]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 bg-hero-gradient overflow-hidden">
        <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#00A86B] opacity-[0.05] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#00A86B] text-sm font-semibold uppercase tracking-[0.3em] mb-4"
          >
            Estamos para ayudarte
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-[#F0F0F0] mb-5"
          >
            Contacto
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#AAAAAA] text-lg max-w-xl mx-auto"
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
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-2xl text-[#F0F0F0] mb-6">
              Envíanos un mensaje
            </motion.h2>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1A2A20] border border-[#00A86B]/40 rounded-2xl p-10 text-center"
              >
                <CheckCircle2 size={48} className="text-[#00A86B] mx-auto mb-4" />
                <h3 className="font-heading font-bold text-xl text-[#F0F0F0] mb-3">
                  ¡Mensaje enviado!
                </h3>
                <p className="text-[#AAAAAA] text-sm leading-relaxed">
                  Tu mensaje ha sido enviado. Te contactaremos pronto.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ nombre: '', email: '', telefono: '', mensaje: '' }); }}
                  className="mt-6 text-[#00A86B] text-sm font-semibold hover:underline"
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
                  <label htmlFor="nombre" className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
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
                    className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl px-4 py-3.5 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
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
                    className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl px-4 py-3.5 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="telefono" className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                    Teléfono
                  </label>
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="09XXXXXXXX"
                    className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl px-4 py-3.5 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="mensaje" className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
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
                    className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl px-4 py-3.5 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#00A86B] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#008F5A] shadow-[0_0_20px_rgba(0,168,107,0.25)] transition-all duration-200"
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
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-2xl text-[#F0F0F0] mb-1">
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
                className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-5 flex gap-4 hover:border-[#00A86B]/30 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B] shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-1.5">{item.title}</p>
                  <p className="text-[#F0F0F0] text-sm whitespace-pre-line leading-relaxed">{item.content}</p>
                </div>
              </motion.div>
            ))}

            {/* Map */}
            <motion.div variants={fadeUp} className="rounded-xl overflow-hidden border border-[#2E2E2E] mt-2">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3990.5!2d-79.534!3d-1.8016!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91d4e0eee3f1e3d7%3A0x5b1b2b3c4d5e6f7a!2sBabahoyo%2C%20Ecuador!5e0!3m2!1ses!2sec!4v1620000000000!5m2!1ses!2sec"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa Babahoyo Ecuador"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
