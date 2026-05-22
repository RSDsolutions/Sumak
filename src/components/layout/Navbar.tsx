import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield } from 'lucide-react';
import { Button } from '../ui/Button';

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const links = [
    { name: 'Inicio', path: '/' },
    { name: 'Cursos', path: '/cursos' },
    { name: 'Instructores', path: '/instructores' },
    { name: 'Certificaciones', path: '/certificaciones' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contacto', path: '/contacto' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-tactical-black border-b-2 border-alert-red">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
            <div className="relative">
              <Shield className="w-8 h-8 text-alert-red opacity-80" strokeWidth={1} />
              <div className="absolute inset-0 border-t border-alert-red transform rotate-45 scale-50 opacity-80"></div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-4 h-[1px] bg-muted-dark"></div>
                <span className="font-heading text-2xl font-bold text-khaki-white tracking-[0.1em]">TAKTIS</span>
                <div className="w-4 h-[1px] bg-muted-dark"></div>
              </div>
              <span className="text-[9px] font-medium text-alert-red tracking-[0.3em] uppercase">Training Institute</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex gap-6">
              {links.map((link) => {
                const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center text-xs font-medium tracking-wider uppercase transition-colors ${isActive ? 'text-khaki-white' : 'text-muted-dark hover:text-khaki-white'}`}
                  >
                    {isActive ? (
                      <div className="w-0.5 h-4 bg-alert-red mr-2" />
                    ) : (
                      <div className="w-0.5 h-4 bg-transparent mr-2" />
                    )}
                    {link.name}
                  </Link>
                );
              })}
            </div>
            <Link to="/contacto">
              <Button>Inscribirse</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-alert-red p-2 hover:bg-olive-dark rounded-sm transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 top-20 bg-tactical-black z-40 overflow-y-auto">
          <div className="flex flex-col px-6 py-8 gap-6">
            {links.map((link) => {
              const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-3xl font-heading uppercase tracking-wide flex items-center gap-4 ${isActive ? 'text-khaki-white' : 'text-muted-dark hover:text-khaki-white'}`}
                >
                  {isActive && <div className="w-[4px] h-8 bg-alert-red rounded-sm" />}
                  {link.name}
                </Link>
              );
            })}
            <div className="mt-8 pt-8 border-t border-tactical-border">
              <Link to="/contacto" onClick={() => setIsOpen(false)}>
                <Button className="w-full text-lg py-4">Inscribirse Ahora</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
