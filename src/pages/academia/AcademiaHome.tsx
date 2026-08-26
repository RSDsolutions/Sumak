import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Leaf, Award, Users, Star, ChevronRight, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useSEO } from '../../lib/seo';

const features = [
  {
    icon: <BookOpen size={28} />,
    title: 'Cursos de Liderazgo',
    desc: 'Formación de alto impacto para líderes que quieren transformar su negocio y su vida.',
    color: 'bg-[#EBF4ED] text-[#1A4E26]',
  },
  {
    icon: <Leaf size={28} />,
    title: 'Recetas Ancestrales',
    desc: 'Conocimiento de biomedicina ancestral del Dr. Luis Paredes para el bienestar de tu familia.',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    icon: <Award size={28} />,
    title: 'Diplomas Oficiales',
    desc: 'Certifícate con diplomas verificables digitalmente al completar los programas formativos.',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    icon: <Users size={28} />,
    title: 'Comunidad de Líderes',
    desc: 'Conéctate con una comunidad de personas que están cambiando su historia en Ecuador.',
    color: 'bg-purple-50 text-purple-700',
  },
];

const stats = [
  { number: '500+', label: 'Líderes Formados' },
  { number: '20+', label: 'Cursos Disponibles' },
  { number: '100%', label: 'Acceso Remoto' },
  { number: '5★', label: 'Valoración' },
];

const paths = [
  {
    icon: <GraduationCap size={32} />,
    title: 'Ruta de Liderazgo',
    desc: 'Para distribuidores que quieren crecer y alcanzar los más altos rangos en SUMAK.',
    badge: 'Más Popular',
    badgeColor: 'bg-[#D4AF37] text-[#0B2913]',
    link: '/academia/cursos',
    cta: 'Ver Cursos',
    gradient: 'from-[#1A4E26] to-[#2E7D32]',
  },
  {
    icon: <Leaf size={32} />,
    title: 'Recetas Milenarias',
    desc: 'Conocimiento ancestral del Dr. Luis Paredes. Recetas prácticas para el bienestar de tu comunidad.',
    badge: '¡Nuevo!',
    badgeColor: 'bg-emerald-500 text-white',
    link: '/academia/recetas',
    cta: 'Ver Recetas',
    gradient: 'from-[#7B3F00] to-[#A0522D]',
  },
];

export default function AcademiaHome() {
  const { profile } = useAuth();

  useSEO({
    title: 'Academia Sumak — Líderes que Cambian Vidas',
    description: 'La academia de formación de SUMAK VIDA ECUADOR. Cursos de liderazgo, recetas ancestrales y diplomas oficiales para líderes que transforman su comunidad.',
  });

  return (
    <div className="bg-white overflow-hidden">

      {/* ── HERO ── */}
      <div className="relative bg-[#09150F] min-h-screen flex items-center overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#1A4E26]/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[#D4AF37]/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-10 w-64 h-64 bg-[#2E7D32]/30 rounded-full blur-[80px]" />

        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
          {/* Label */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-8">
            <GraduationCap size={18} className="text-[#D4AF37]" />
            <span className="text-white/70 text-sm font-semibold tracking-wider">Plataforma Educativa Oficial de SUMAK</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6">
            Academia Sumak
            <span className="block bg-gradient-to-r from-[#D4AF37] via-[#F3D568] to-[#D4AF37] bg-clip-text text-transparent mt-2">
              Líderes que Cambian
            </span>
            <span className="block text-white mt-2">Vidas</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/60 mb-12 leading-relaxed">
            Formación de alto impacto para distribuidores y líderes de SUMAK. Conocimiento ancestral, liderazgo moderno y certifícate para transformar tu comunidad.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {profile ? (
              <Link
                to="/academia/dashboard"
                className="group relative px-8 py-4 bg-[#D4AF37] text-[#0B2913] font-black text-lg rounded-2xl hover:bg-[#F3D568] transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] flex items-center gap-3"
              >
                <GraduationCap size={22} />
                Ir a mi Panel
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <Link
                to="/registro"
                className="group relative px-8 py-4 bg-[#D4AF37] text-[#0B2913] font-black text-lg rounded-2xl hover:bg-[#F3D568] transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] flex items-center gap-3"
              >
                <Zap size={22} />
                Empieza Gratis
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            <Link
              to="/academia/cursos"
              className="px-8 py-4 bg-white/5 border border-white/20 text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition-all flex items-center gap-3 backdrop-blur-sm"
            >
              <BookOpen size={22} />
              Ver Catálogo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <p className="text-3xl font-black text-[#D4AF37]">{stat.number}</p>
                <p className="text-white/50 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div className="py-24 bg-[#F4F7F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] border border-[#C8D8CB] px-4 py-1.5 rounded-full mb-4">
              Todo lo que Ofrecemos
            </span>
            <h2 className="text-4xl font-black text-gray-900">Un ecosistema completo</h2>
            <p className="text-gray-500 text-lg mt-3 max-w-xl mx-auto">de formación para líderes que quieren crecer en todos los aspectos de su vida.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 hover:-translate-y-1 group">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-[#1A4E26] transition-colors">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PATHS ── */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#1A4E26] bg-[#EBF4ED] border border-[#C8D8CB] px-4 py-1.5 rounded-full mb-4">
              Elige tu Camino
            </span>
            <h2 className="text-4xl font-black text-gray-900">¿Por dónde quieres empezar?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {paths.map((path) => (
              <div key={path.title} className={`relative bg-gradient-to-br ${path.gradient} rounded-3xl p-8 text-white overflow-hidden group`}>
                {/* Shine effect */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative">
                  <span className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 ${path.badgeColor}`}>
                    {path.badge}
                  </span>
                  <div className="mb-4 opacity-90">{path.icon}</div>
                  <h3 className="text-2xl font-black mb-3">{path.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed mb-8">{path.desc}</p>
                  <Link
                    to={path.link}
                    className="inline-flex items-center gap-2 bg-white/15 border border-white/30 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/25 transition-all group-hover:translate-x-1 duration-300"
                  >
                    {path.cta} <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DR. LUIS PAREDES SECTION ── */}
      <div className="py-24 bg-gradient-to-br from-[#0B2913] to-[#1A4E26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-white space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full px-4 py-2">
                <Leaf size={16} className="text-[#D4AF37]" />
                <span className="text-[#D4AF37] text-sm font-bold">Biomedicina Ancestral</span>
              </div>
              <h2 className="text-4xl font-black leading-tight">
                Conocimiento del
                <span className="block text-[#D4AF37]">Dr. Luis Paredes</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed">
                Médico Funcional con años de experiencia en biomedicina ancestral andina y amazónica. Sus recetas y conocimientos han ayudado a miles de personas a mejorar su bienestar de forma natural.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Shield size={20} />, text: 'Remedios seguros y naturales' },
                  { icon: <Globe size={20} />, text: 'Sabiduría andina y amazónica' },
                  { icon: <Star size={20} />, text: 'Años de experiencia' },
                  { icon: <Leaf size={20} />, text: 'Ingredientes accesibles' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-white/80">
                    <div className="text-[#D4AF37]">{item.icon}</div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/academia/recetas"
                className="inline-flex items-center gap-3 bg-[#D4AF37] text-[#0B2913] font-black px-8 py-4 rounded-2xl hover:bg-[#F3D568] transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
              >
                <Leaf size={22} />
                Ver Recetas Disponibles
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { emoji: '🌱', title: 'Digestión y Gastritis', desc: 'Remedios naturales para el sistema digestivo' },
                { emoji: '💪', title: 'Articulaciones', desc: 'Cuidado natural de músculos y articulaciones' },
                { emoji: '🌿', title: 'Inflamación', desc: 'Plantas antiinflamatorias milenarias' },
                { emoji: '❤️', title: 'Bienestar General', desc: 'Hábitos ancestrales para la salud integral' },
              ].map((card) => (
                <div key={card.title} className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/15 transition-all">
                  <div className="text-3xl mb-3">{card.emoji}</div>
                  <h4 className="text-white font-bold text-sm mb-1">{card.title}</h4>
                  <p className="text-white/60 text-xs">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div className="py-24 bg-[#F4F7F5]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12">
            <div className="w-20 h-20 bg-[#1A4E26] rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap size={40} className="text-[#D4AF37]" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              ¿Listo para cambiar tu vida?
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
              Únete a la Academia SUMAK y forma parte de una comunidad de líderes comprometidos con el bienestar y el éxito.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {profile ? (
                <Link
                  to="/academia/dashboard"
                  className="px-8 py-4 bg-[#1A4E26] text-white font-black rounded-2xl hover:bg-[#163F1E] transition-all hover:shadow-lg text-lg flex items-center gap-2"
                >
                  <GraduationCap size={22} />
                  Ir a mi Panel
                </Link>
              ) : (
                <Link
                  to="/registro"
                  className="px-8 py-4 bg-[#1A4E26] text-white font-black rounded-2xl hover:bg-[#163F1E] transition-all hover:shadow-lg text-lg flex items-center gap-2"
                >
                  <Zap size={22} />
                  Comienza Hoy
                </Link>
              )}
              <Link
                to="/academia/recetas"
                className="px-8 py-4 bg-[#D4AF37]/10 border-2 border-[#D4AF37] text-[#92680A] font-black rounded-2xl hover:bg-[#D4AF37]/20 transition-all text-lg flex items-center gap-2"
              >
                <Leaf size={22} />
                Ver Recetas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
