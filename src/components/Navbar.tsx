import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const Logo = () => (
  <Link to="/" className="flex items-center gap-3">
    <div className="relative w-11 h-11 rounded-full border-2 border-brand-emerald flex items-center justify-center bg-brand-black shrink-0">
      <div className="flex flex-col items-center">
        <span className="font-heading font-bold text-[#F0F0F0] text-[10px] tracking-widest">SUMAK</span>
        <span className="text-brand-gold text-[6px] font-medium tracking-[0.25em] uppercase mt-[1px]">ECUADOR</span>
      </div>
    </div>
    <div className="hidden sm:flex flex-col justify-center">
      <span className="font-heading font-bold text-[#F0F0F0] text-lg leading-tight tracking-wide">SUMAK</span>
      <span className="text-brand-gold text-[9px] font-medium tracking-[0.25em] uppercase">ECUADOR</span>
    </div>
  </Link>
);

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Productos', path: '/productos' },
    { name: 'Plan Multinivel', path: '/plan-multinivel' },
    { name: 'Cómo Funciona', path: '/como-funciona' },
    { name: 'Testimonios', path: '/testimonios' },
    { name: 'Contacto', path: '/contacto' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || !isHome || mobileMenuOpen
          ? 'bg-[#0F0F0F]/95 backdrop-blur-md border-b border-brand-border py-4'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <Logo />

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative text-sm transition-colors duration-200 ${
                  isActive ? 'text-[#F0F0F0]' : 'text-brand-text-muted hover:text-[#F0F0F0]'
                }`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-0 w-full h-[2px] bg-brand-emerald rounded-full"></span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden xl:flex items-center gap-4">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-text-muted hover:text-[#F0F0F0] transition-all duration-200 text-xs font-semibold"
          >
            Ingresar
          </Link>
          <Link
            to="/registro"
            className="px-5 py-2.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover shadow-emerald-glow transition-all duration-200 text-xs font-semibold"
          >
            Unirse Ahora
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden text-brand-emerald p-2"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[73px] bg-[#0F0F0F] z-40 flex flex-col p-6 overflow-y-auto w-full xl:hidden">
          <nav className="flex flex-col gap-6 mt-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-xl font-heading font-semibold ${
                  location.pathname === link.path ? 'text-brand-emerald' : 'text-[#F0F0F0]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-10 pb-6 flex flex-col gap-4">
            <Link
              to="/registro"
              className="w-full py-4 text-center rounded-xl bg-brand-emerald text-white font-semibold text-lg shadow-emerald-glow"
            >
              Unirse Ahora
            </Link>
            <Link
              to="/login"
              className="w-full py-4 text-center rounded-xl border border-brand-border text-[#F0F0F0] font-semibold text-lg"
            >
              Ingresar al Sistema
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
