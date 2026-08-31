import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, Lock, AtSign, ArrowRight, Leaf } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useSEO } from '../../lib/seo';

export default function LoginAcademia() {
  useSEO({
    title: 'Ingresar — Academia Sumak',
    description: 'Accede a tu cuenta de la Academia Sumak.',
    noindex: true,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { signIn, homeForProfile } = useAuth();
  const navigate = useNavigate();

  async function resolveEmail(value: string): Promise<string | null> {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes('@')) return trimmed;
    // Intentar resolver como username
    const { data } = await supabase.rpc('get_email_for_login', { p_username: trimmed.toLowerCase() });
    return data as string | null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resolvedEmail = await resolveEmail(email);
      if (!resolvedEmail) {
        setError('No encontramos una cuenta con esos datos. Verifica tu correo.');
        return;
      }
      const { error: signInError, profile } = await signIn(resolvedEmail, password);
      if (signInError) {
        setError('Correo o contraseña incorrectos. Intenta de nuevo.');
      } else {
        // Usuarios de academia gratuita tienen código ACE-. Los afiliados van a la plataforma.
        const isAcademyFree = profile?.codigo_distribuidor?.startsWith('ACE-') ?? true;
        if (isAcademyFree) {
          navigate('/academia/dashboard', { replace: true });
        } else {
          navigate(homeForProfile(profile), { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const resolvedEmail = await resolveEmail(email);
    if (!resolvedEmail) {
      setError('Ingresa tu correo electrónico primero.');
      return;
    }
    await supabase.auth.resetPasswordForEmail(resolvedEmail, {
      redirectTo: `${window.location.origin}/academia/login`,
    });
    setResetSent(true);
  }

  return (
    <div className="min-h-screen bg-[#09150F] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-1/4 w-80 h-80 bg-[#1A4E26]/40 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/academia" className="inline-flex items-center gap-2 mb-6 group">
              <GraduationCap size={36} className="text-[#D4AF37] group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="font-black text-white text-lg leading-none">ACADEMIA</p>
                <p className="font-black text-[#D4AF37] text-lg leading-none">SUMAK</p>
              </div>
            </Link>
            <h1 className="text-2xl font-black text-white">Bienvenido de vuelta</h1>
            <p className="text-white/50 mt-2 text-sm">Ingresa a tu espacio de aprendizaje</p>
          </div>

          {resetSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#EBF4ED] rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf size={28} className="text-[#1A4E26]" />
              </div>
              <p className="font-bold text-white text-lg mb-2">¡Correo enviado!</p>
              <p className="text-white/50 text-sm">Revisa tu bandeja y sigue las instrucciones para restablecer tu contraseña.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Correo o Usuario</label>
                <div className="relative">
                  <AtSign size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-white/40 hover:text-white/70 transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#F3D568] text-[#0B2913] font-black py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#0B2913] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><ArrowRight size={20} /> Ingresar a mi Academia</>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-2">
            <p className="text-white/40 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/academia/registro" className="text-[#D4AF37] font-bold hover:text-[#F3D568] transition">
                Regístrate gratis
              </Link>
            </p>
            <p className="text-white/25 text-xs">
              ¿Eres distribuidor?{' '}
              <Link to="/login" className="text-white/40 hover:text-white/60 transition underline">
                Accede aquí
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
