import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Placeholder — no real auth
  }

  return (
    <div className="bg-[#0F0F0F] min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-8 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/">
              <span className="font-heading font-bold text-4xl text-[#00A86B] tracking-wide">SUMAK</span>
            </Link>
            <h1 className="font-heading font-bold text-xl text-[#F0F0F0] mt-3">Acceso Distribuidores</h1>
            <p className="text-[#888888] text-sm mt-1">Ingresa con tus credenciales</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555]" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl pl-11 pr-4 py-3.5 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555]" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl pl-11 pr-4 py-3.5 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200"
                />
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                className="text-[#888888] text-xs hover:text-[#00A86B] transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] shadow-[0_0_20px_rgba(0,168,107,0.25)] transition-all duration-200 mt-1"
            >
              Iniciar Sesión
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#2E2E2E] text-center">
            <p className="text-[#888888] text-sm">
              ¿Aún no eres distribuidor?{' '}
              <Link to="/registro" className="text-[#00A86B] font-semibold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
