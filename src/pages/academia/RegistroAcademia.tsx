import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  GraduationCap, User, Phone, Mail, Lock, ArrowRight,
  CheckCircle2, Leaf, Shield, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSEO } from '../../lib/seo';
import { useToast } from '../../lib/toast';

const STEPS = ['Datos personales', 'Cuenta', 'Listo'] as const;

export default function RegistroAcademia() {
  useSEO({
    title: 'Crear cuenta — Academia Sumak',
    description: 'Regístrate gratis en la Academia Sumak y accede a cursos de liderazgo y conocimiento ancestral.',
    url: '/academia/registro',
  });

  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_completo: '',
    cedula: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  function update(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  function validateStep0() {
    if (!form.nombre_completo.trim()) return 'Ingresa tu nombre completo.';
    if (!form.cedula.trim()) return 'Ingresa tu cédula.';
    if (!form.telefono.trim()) return 'Ingresa tu teléfono.';
    return null;
  }

  function validateStep1() {
    if (!form.email.trim() || !form.email.includes('@')) return 'Ingresa un correo electrónico válido.';
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  function nextStep() {
    const err = step === 0 ? validateStep0() : validateStep1();
    if (err) { setError(err); return; }
    setError('');
    if (step === 1) {
      handleSubmit();
    } else {
      setStep((s) => (s + 1) as 0 | 1 | 2);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      // 1. Crear usuario en auth.users
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: { nombre_completo: form.nombre_completo },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este correo ya está registrado. ¿Quieres iniciar sesión?');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (!signUpData.user) {
        setError('Error inesperado. Inténtalo de nuevo.');
        return;
      }

      // 2. Crear profile de academia (auto-aprobado, sin referido ni paquete)
      const { error: profileError } = await supabase.rpc('create_academy_profile', {
        p_nombre_completo: form.nombre_completo.trim(),
        p_cedula: form.cedula.trim(),
        p_telefono: form.telefono.trim(),
      });

      if (profileError) {
        // Si el perfil ya existe (conflicto), no es un error crítico
        console.warn('Profile create warning:', profileError.message);
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error inesperado. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09150F] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#1A4E26]/30 rounded-full blur-[130px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-[#D4AF37]/15 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/academia" className="inline-flex items-center gap-2 mb-5 group">
              <GraduationCap size={36} className="text-[#D4AF37] group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="font-black text-white text-lg leading-none">ACADEMIA</p>
                <p className="font-black text-[#D4AF37] text-lg leading-none">SUMAK</p>
              </div>
            </Link>

            {step < 2 && (
              <>
                <h1 className="text-2xl font-black text-white">Crea tu cuenta gratis</h1>
                <p className="text-white/50 mt-1 text-sm">Sin tarjeta. Sin referido. Sin compromiso.</p>
              </>
            )}
          </div>

          {/* Progress dots */}
          {step < 2 && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {STEPS.slice(0, 2).map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    i < step ? 'bg-[#D4AF37] text-[#0B2913]' :
                    i === step ? 'bg-white text-[#0B2913] ring-2 ring-[#D4AF37]' :
                    'bg-white/10 text-white/30'
                  }`}>
                    {i < step ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-white' : 'text-white/30'}`}>
                    {label}
                  </span>
                  {i < 1 && <div className="w-8 h-px bg-white/10 mx-1" />}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm mb-4">
              {error}
            </div>
          )}

          {/* ── Step 0: Personal data ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Nombre Completo *</label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={form.nombre_completo}
                    onChange={e => update('nombre_completo', e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Cédula de Identidad *</label>
                <div className="relative">
                  <Shield size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={form.cedula}
                    onChange={e => update('cedula', e.target.value.replace(/\D/g, ''))}
                    placeholder="Tu número de cédula"
                    maxLength={13}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Teléfono / WhatsApp *</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={e => update('telefono', e.target.value)}
                    placeholder="0999 123 456"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition"
                  />
                </div>
              </div>

              <button
                onClick={nextStep}
                className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#F3D568] text-[#0B2913] font-black py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
              >
                Continuar <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* ── Step 1: Account data ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Correo Electrónico *</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Contraseña *</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength */}
                {form.password && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        form.password.length >= i * 3
                          ? i <= 2 ? 'bg-yellow-400' : 'bg-[#1A4E26]'
                          : 'bg-white/10'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Confirmar Contraseña *</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => update('confirmPassword', e.target.value)}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition"
                  />
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <CheckCircle2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1A4E26]" />
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(0); setError(''); }}
                  className="flex-1 py-3.5 border border-white/10 text-white/60 font-bold rounded-xl hover:bg-white/5 transition"
                >
                  Atrás
                </button>
                <button
                  onClick={nextStep}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#F3D568] text-[#0B2913] font-black py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#0B2913] border-t-transparent rounded-full animate-spin" />
                  ) : 'Crear cuenta'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Done ── */}
          {step === 2 && (
            <div className="text-center py-4 space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1A4E26] to-[#2E7D32] rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(26,78,38,0.5)]">
                <Leaf size={36} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2">¡Bienvenido/a!</h2>
                <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
                  Tu cuenta fue creada exitosamente. Ahora puedes acceder a cursos gratuitos, recetas ancestrales y más.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
                <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Tu cuenta incluye:</p>
                {[
                  'Acceso a cursos gratuitos',
                  'Biblioteca de conocimiento ancestral',
                  'Diplomas verificables al completar programas',
                  'Comunidad de líderes SUMAK',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle2 size={14} className="text-[#D4AF37] flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/academia/dashboard', { replace: true })}
                className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#F3D568] text-[#0B2913] font-black py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
              >
                <GraduationCap size={20} /> Ir a mi Academia
              </button>
            </div>
          )}

          {step < 2 && (
            <p className="text-center text-white/30 text-xs mt-6">
              ¿Ya tienes cuenta?{' '}
              <Link to="/academia/login" className="text-[#D4AF37] font-bold hover:text-[#F3D568] transition">
                Iniciar sesión
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
