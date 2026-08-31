import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ArrowRight, LayoutDashboard, ShoppingCart, GraduationCap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import Avatar from './Avatar';
import NotificationsPopover from './NotificationsPopover';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile } = useAuth();
  const { items } = useCart();
  const cartCount = items.reduce((s, i) => s + i.cantidad, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Nosotros', path: '/nosotros' },
    { name: 'Productos', path: '/productos' },
    { name: 'Oportunidad', path: '/oportunidad' },
    { name: 'Plan Multinivel', path: '/plan-multinivel' },
    { name: 'Escaleras de Éxito', path: '/escaleras' },
    { name: 'Contacto', path: '/contacto' },
  ];

  const dashboardPath = profile?.rol === 'admin'
    ? '/admin'
    : (profile?.rol === 'operaciones' ? '/operaciones' : '/dashboard');

  // Header siempre blanco — solo cambia la sombra al hacer scroll
  const headerClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b ${
    isScrolled || mobileMenuOpen
      ? 'border-[#C8D8CB] shadow-[0_4px_20px_rgba(26,78,38,0.08)]'
      : 'border-transparent'
  }`;

  return (
    <>
      <header className={headerClasses}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <motion.img
              src="/LOGO_SUMAK.png"
              alt="Sumak Vida"
              className={`w-auto object-contain transition-all duration-300 ${
                isScrolled ? 'h-11' : 'h-14'
              }`}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-3 py-2 group"
                >
                  <span className={`relative text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                    isActive ? 'text-[#1A4E26]' : 'text-[#6B7280] group-hover:text-[#1A4E26]'
                  }`}>
                    {link.name}
                  </span>
                  {/* Underline animation */}
                  <span
                    className={`absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-[#1A4E26] origin-left transition-transform duration-300 ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                  {/* Active dot */}
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D4AF37] transition-all"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Academia CTA Button - Desktop */}
          <Link
            to={user ? '/academia/dashboard' : '/academia/login'}
            className={`hidden xl:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 border ${
              location.pathname.startsWith('/academia')
                ? 'bg-[#1A4E26] text-[#D4AF37] border-[#1A4E26]'
                : 'text-[#1A4E26] border-[#1A4E26]/30 bg-[#EBF4ED] hover:bg-[#1A4E26] hover:text-[#D4AF37]'
            }`}
          >
            <GraduationCap size={16} />
            Academia
          </Link>

          {/* Desktop CTA buttons or Authenticated Widget */}
          <div className="hidden xl:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Cart Button */}
                <Link
                  to="/dashboard/pedido/nuevo"
                  className="relative p-2 sm:p-2.5 rounded-xl text-[#1A4E26] bg-[#F4F7F5] hover:bg-[#EBF4ED] border border-[#C8D8CB]/80 hover:border-[#1A4E26]/40 transition-all duration-200 flex items-center justify-center shadow-xs cursor-pointer"
                  title="Mi Carrito de Pedido"
                  aria-label="Ver carrito"
                >
                  <ShoppingCart size={20} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-[#D4AF37] text-[#0B2913] text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>

                {/* Global Notification Popover */}
                <NotificationsPopover variant="light" />

                {/* Dashboard Profile Access */}
                <Link
                  to={dashboardPath}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#EBF4ED] hover:bg-[#dcefe0] border border-[#1A4E26]/20 transition-all duration-200 group cursor-pointer"
                  title="Ir a mi panel"
                >
                  <Avatar profile={profile} size={28} className="ring-2 ring-[#1A4E26]/20" />
                  <span className="text-xs font-bold text-[#1A4E26] flex items-center gap-1">
                    <LayoutDashboard size={14} />
                    <span>Mi Panel</span>
                  </span>
                </Link>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="relative px-4 py-2 rounded-lg text-sm font-medium text-[#6B7280] hover:text-[#1A4E26] transition-colors duration-200 group"
                >
                  <span className="relative z-10">Iniciar Sesión</span>
                  <span className="absolute inset-0 rounded-lg bg-[#F4F7F5] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Link>
                <Link
                  to="/registro"
                  className="group relative px-5 py-2.5 rounded-lg bg-[#1A4E26] text-white text-sm font-semibold overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(26,78,38,0.35)]"
                >
                  {/* Animated background */}
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-[#1A4E26] via-[#2B6E3A] to-[#1A4E26] bg-[length:200%_100%] group-hover:bg-[position:100%_0%] transition-[background-position] duration-700"
                  />
                  <span className="relative flex items-center gap-1.5">
                    Únete Ahora
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden text-[#1A4E26] p-2 -mr-1 rounded-lg hover:bg-[#F4F7F5] transition-colors"
            aria-label="Toggle menu"
            whileTap={{ scale: 0.92 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileMenuOpen ? (
                <motion.span
                  key="x"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.18 }}
                  className="block"
                >
                  <X size={26} />
                </motion.span>
              ) : (
                <motion.span
                  key="m"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.18 }}
                  className="block"
                >
                  <Menu size={26} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="xl:hidden fixed inset-0 top-14 bg-white z-40 flex flex-col overflow-y-auto"
          >
            <motion.nav
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
              }}
              className="flex flex-col px-6 pt-8 gap-1"
            >
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <motion.div
                    key={link.path}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
                    }}
                  >
                    <Link
                      to={link.path}
                      className={`flex items-center justify-between py-4 text-lg font-heading font-semibold border-b border-[#E0EAE2] transition-colors duration-150 group ${
                        isActive ? 'text-[#1A4E26]' : 'text-[#111111] hover:text-[#1A4E26]'
                      }`}
                    >
                      <span>{link.name}</span>
                      <ArrowRight
                        size={18}
                        className={`transition-transform duration-200 ${
                          isActive ? 'text-[#1A4E26]' : 'text-[#9CA3AF] group-hover:text-[#1A4E26] group-hover:translate-x-1'
                        }`}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </motion.nav>

            {/* Academia link in mobile menu */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mx-6 mt-4"
            >
              <Link
                to={user ? '/academia/dashboard' : '/academia/login'}
                className="flex items-center justify-between w-full py-4 px-5 rounded-2xl bg-[#1A4E26] text-white font-bold text-base"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap size={20} className="text-[#D4AF37]" />
                  <span>Academia Sumak</span>
                </div>
                <ArrowRight size={18} className="text-[#D4AF37]" />
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-auto px-6 pb-10 pt-8 flex flex-col gap-3"
            >
              {user ? (
                <Link
                  to={dashboardPath}
                  className="w-full py-4 text-center rounded-xl bg-[#1A4E26] text-white font-bold text-base shadow-[0_8px_24px_rgba(26,78,38,0.35)] flex items-center justify-center gap-2"
                >
                  <LayoutDashboard size={18} />
                  Mi Panel
                </Link>
              ) : (
                <>
                  <Link
                    to="/registro"
                    className="w-full py-4 text-center rounded-xl bg-[#1A4E26] text-white font-bold text-base shadow-[0_8px_24px_rgba(26,78,38,0.35)] flex items-center justify-center gap-2"
                  >
                    Únete Ahora
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full py-4 text-center rounded-xl border border-[#C8D8CB] text-[#111111] font-semibold text-base"
                  >
                    Iniciar Sesión
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
