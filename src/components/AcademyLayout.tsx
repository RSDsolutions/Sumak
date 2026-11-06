import React, { useState } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Layers,
  Award,
  User,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Leaf,
  Search,
  Sparkles,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSEO } from '../lib/seo';
import { displayName } from '../lib/profile';
import Avatar from './Avatar';
import NotificationsPopover from './NotificationsPopover';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Inicio', to: '/academia/dashboard', icon: GraduationCap, end: true },
  { label: 'Mis Cursos', to: '/academia/dashboard/cursos', icon: BookOpen },
  { label: 'Explorar Catálogo', to: '/academia/dashboard/explorar', icon: Compass },
  { label: 'Programas', to: '/academia/dashboard/programas', icon: Layers },
  { label: 'Mis Recetas', to: '/academia/dashboard/recetas', icon: Leaf },
  { label: 'Certificaciones', to: '/academia/dashboard/diplomas', icon: Award },
  { label: 'Mi Perfil', to: '/academia/dashboard/perfil', icon: User },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#133A1C] via-[#1A4E26] to-[#12361A] text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 bg-white border-b border-[#C8D8CB]">
        <div>
          <Link to="/academia" onClick={onClose} className="block group cursor-pointer" title="Ir a Academia">
            <div className="flex items-center gap-2">
              <GraduationCap size={32} className="text-[#1A4E26] group-hover:scale-105 transition-transform" />
              <div className="font-heading font-black text-xl text-[#1A4E26] leading-none">
                ACADEMIA<br /><span className="text-[#D4AF37]">SUMAK</span>
              </div>
            </div>
          </Link>
        </div>
        {onClose && (
          <button 
            type="button"
            onClick={onClose} 
            className="text-[#6B7280] hover:text-[#111111] transition-colors p-1"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Switcher: Back to Distribuidor / Oficina Virtual */}
      <div className="px-4 pt-4 pb-2">
        <Link 
          to="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-100/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group"
          title="Regresar al panel de Distribuidor"
        >
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white/80 group-hover:text-white transition-colors">
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate leading-tight">Oficina Virtual</p>
            <p className="text-[10px] text-emerald-200/60 font-normal">Panel Distribuidor</p>
          </div>
          <ArrowUpRight size={13} className="text-white/40 group-hover:text-white/80 transition-colors" />
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto custom-sidebar-scrollbar space-y-1">
        <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200/50">
          Navegación Académica
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold shadow-xs border border-white/20'
                    : 'text-emerald-100/75 hover:text-white hover:bg-white/10 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Subtle active indicator bar */}
                  {isActive && (
                    <span 
                      aria-hidden="true"
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                    />
                  )}

                  <Icon 
                    size={18} 
                    className={`shrink-0 transition-colors ${
                      isActive 
                        ? 'text-[#D4AF37]' 
                        : 'text-emerald-200/70 group-hover:text-white'
                    }`} 
                  />

                  <span className="flex-1 truncate">{item.label}</span>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer & Student Profile Card */}
      <div className="p-4 border-t border-white/10 bg-black/15">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/5 border border-white/10">
          <Avatar profile={profile} size={36} className="ring-2 ring-[#D4AF37]/40 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-bold truncate leading-tight">
              {displayName(profile)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <p className="text-[10px] text-emerald-200/70 truncate">Estudiante Activo</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-100/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-200"
        >
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  useSEO({
    title: 'Campus Virtual — SUMAK Academy',
    description: 'Plataforma educativa y de formación profesional de SUMAK.',
    noindex: true,
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/academia/dashboard/explorar?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7F5] font-sans antialiased text-[#111111]">
      {/* Desktop Sidebar (Fixed width 260px) */}
      <aside 
        aria-label="Barra lateral de navegación"
        className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-30 shadow-xl border-r border-[#133A1C]"
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside
        aria-label="Menú móvil de navegación"
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transition-transform duration-300 ease-in-out lg:hidden shadow-2xl"
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main Workspace Container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        {/* Modern Sticky Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#C8D8CB]/50 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 transition-all">
          {/* Left: Mobile trigger & breadcrumb / search */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#111111] hover:bg-[#F4F7F5] border border-transparent hover:border-[#C8D8CB] transition-all focus:outline-none"
              aria-label="Abrir menú de navegación"
            >
              <Menu size={20} />
            </button>

            {/* Institutional Brand Badge */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-xs font-black tracking-tight text-[#1A4E26] font-heading uppercase">
                SUMAK
              </span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                Campus Virtual
              </span>
            </div>

            {/* Quick Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm hidden md:block">
              <Search 
                size={16} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cursos, temas o lecciones..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F7F5] hover:bg-[#EBF0EC] focus:bg-white text-[#111111] placeholder-[#6B7280] rounded-xl border border-transparent hover:border-[#C8D8CB] focus:border-[#1A4E26] focus:outline-none focus:ring-2 focus:ring-[#1A4E26]/20 transition-all"
              />
            </form>
          </div>

          {/* Right: Quick catalog link, Notifications & Student profile widget */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/academia/dashboard/explorar"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1A4E26] hover:bg-[#EBF4ED] border border-transparent hover:border-[#C8D8CB] transition-all"
            >
              <Compass size={14} className="text-[#1A4E26]" />
              <span>Explorar</span>
            </Link>

            <div className="h-5 w-px bg-[#C8D8CB]/60 hidden sm:block" />

            <NotificationsPopover variant="light" />

            <Link
              to="/academia/dashboard/perfil"
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-[#F4F7F5] border border-transparent hover:border-[#C8D8CB] transition-all group"
              title="Ver mi perfil de estudiante"
            >
              <Avatar profile={profile} size={32} className="ring-2 ring-[#D4AF37]/50" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#111111] group-hover:text-[#1A4E26] transition-colors leading-tight truncate max-w-[120px]">
                  {displayName(profile)}
                </p>
                <p className="text-[10px] text-[#6B7280] font-medium leading-none mt-0.5">
                  Estudiante
                </p>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Canvas — Ancho completo horizontal */}
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
