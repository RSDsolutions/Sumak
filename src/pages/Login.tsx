import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useSEO } from '../lib/seo';
import Captcha, { CAPTCHA_ENABLED } from '../components/Captcha';

export default function Login() {
  useSEO({
    title: 'Acceso Distribuidor — Sumak Vida Ecuador',
    description: 'Inicia sesión con tu código de distribuidor SUMAK.',
    url: '/login',
    noindex: true,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  // SEC-007: token de Cloudflare Turnstile. Solo se requiere si CAPTCHA_ENABLED.
  const [captchaToken, setCaptchaToken] = useState('');

  const { signIn, homeForProfile } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (CAPTCHA_ENABLED && !captchaToken) {
      setError('Por favor completa el captcha antes de iniciar sesión.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: signInError, profile } = await signIn(
        email,
        password,
        captchaToken || undefined,
      );
      if (signInError) {
        setError(signInError);
        // Captcha token es de un solo uso; limpiamos para que reintente.
        setCaptchaToken('');
      } else {
        // Redirige según el rol del profile recién obtenido.
        // admin → /admin, operaciones → /operaciones, distribuidor → /dashboard.
        navigate(homeForProfile(profile), { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Ingresa tu email primero para restablecer la contraseña.');
      return;
    }
    setResetLoading(true);
    setError('');
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetSent(true);
    setResetLoading(false);
  }

  return (
    <div className="bg-[#F4F7F5] min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-8 sm:p-10 shadow-[0_0_40px_rgba(26,78,38,0.08)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-16 w-auto object-contain mx-auto" />
            </Link>
            <h1 className="font-heading font-bold text-xl text-[#111111] mt-3">Acceso Distribuidores</h1>
            <p className="text-[#6B7280] text-sm mt-1">Ingresa con tus credenciales</p>
          </div>

          {resetSent ? (
            <div className="bg-[#EBF4ED] border border-[#1A4E26]/30 rounded-xl p-5 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[#1A4E26] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#111111] text-sm font-medium">Correo enviado</p>
                <p className="text-[#6B7280] text-sm mt-1">
                  Revisa tu bandeja de entrada para restablecer tu contraseña.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl pl-11 pr-4 py-3.5 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl pl-11 pr-4 py-3.5 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-[#6B7280] text-xs hover:text-[#1A4E26] transition-colors duration-200 disabled:opacity-50"
                >
                  {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                </button>
              </div>

              {/* SEC-007: captcha si está configurado en .env */}
              <Captcha onToken={setCaptchaToken} onError={() => setCaptchaToken('')} />

              <button
                type="submit"
                disabled={loading || (CAPTCHA_ENABLED && !captchaToken)}
                className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] shadow-[0_0_20px_rgba(26,78,38,0.25)] transition-all duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>

              {CAPTCHA_ENABLED && (
                <p className="text-[10px] text-[#9CA3AF] text-center inline-flex items-center justify-center gap-1">
                  <ShieldCheck size={11} aria-hidden="true" />
                  Protegido por Cloudflare Turnstile
                </p>
              )}
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#C8D8CB] text-center">
            <p className="text-[#6B7280] text-sm">
              ¿Aún no eres distribuidor?{' '}
              <Link to="/registro" className="text-[#1A4E26] font-semibold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
