import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

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

  const isHome = location.pathname === '/';
  const navBg = isScrolled || !isHome || mobileMenuOpen
    ? 'bg-white/95 backdrop-blur-md border-b border-[#C8D8CB] shadow-sm'
    : 'bg-transparent';

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-14 w-auto object-contain" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                    isActive ? 'text-[#111111]' : 'text-[#6B7280] hover:text-[#111111]'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#1A4E26] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA buttons */}
          <div className="hidden xl:flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg border border-[#C8D8CB] text-[#6B7280] hover:text-[#111111] hover:border-[#A8C2AD] transition-all duration-200 text-sm font-medium"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/registro"
              className="px-5 py-2 rounded-lg bg-[#1A4E26] text-white hover:bg-[#163F1E] transition-all duration-200 text-sm font-semibold shadow-[0_0_20px_rgba(26,78,38,0.25)]"
            >
              Únete Ahora
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden text-[#1A4E26] p-2 -mr-1"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </header>

      {/* Mobile menu — outside <header> so backdrop-filter doesn't affect fixed positioning */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 top-16 bg-white z-40 flex flex-col overflow-y-auto">
          <nav className="flex flex-col px-6 pt-8 gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`py-4 text-lg font-heading font-semibold border-b border-[#E0EAE2] transition-colors duration-150 ${
                    isActive ? 'text-[#1A4E26]' : 'text-[#111111]'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-6 pb-10 pt-8 flex flex-col gap-3">
            <Link
              to="/registro"
              className="w-full py-4 text-center rounded-xl bg-[#1A4E26] text-white font-bold text-base shadow-[0_0_20px_rgba(26,78,38,0.3)]"
            >
              Únete Ahora
            </Link>
            <Link
              to="/login"
              className="w-full py-4 text-center rounded-xl border border-[#C8D8CB] text-[#111111] font-semibold text-base"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
