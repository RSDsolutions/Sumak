import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Library,
  Layers,
  Award,
  User,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Leaf,
  FileText
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSEO } from '../lib/seo';
import { displayName } from '../lib/profile';
import Avatar from './Avatar';
import NotificationsPopover from './NotificationsPopover';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Inicio', to: '/academia/dashboard', icon: <GraduationCap size={18} />, end: true },
  { label: 'Mis Cursos', to: '/academia/dashboard/cursos', icon: <BookOpen size={18} /> },
  { label: 'Explorar Cursos', to: '/academia/cursos', icon: <Library size={18} /> },
  { label: 'Programas', to: '/academia/programas', icon: <Layers size={18} /> },
  { label: 'Mis Recetas', to: '/academia/dashboard/recetas', icon: <Leaf size={18} /> },
  { label: 'Certificaciones', to: '/academia/dashboard/diplomas', icon: <Award size={18} /> },
  { label: 'Mi Perfil', to: '/academia/dashboard/perfil', icon: <User size={18} /> },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 bg-white border-b border-[#C8D8CB]">
        <div>
          <Link to="/academia" className="block group cursor-pointer" title="Ir a Academia">
            <div className="flex items-center gap-2">
              <GraduationCap size={32} className="text-[#1A4E26] group-hover:scale-105 transition-transform" />
              <div className="font-heading font-black text-xl text-[#1A4E26] leading-none">
                ACADEMIA<br /><span className="text-[#D4AF37]">SUMAK</span>
              </div>
            </div>
          </Link>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111111] transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Profile info */}
      {profile && (
        <div className="px-6 py-4 border-b border-white/20 flex items-center gap-3">
          <Avatar profile={profile} size={40} className="ring-2 ring-white/20" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{displayName(profile)}</p>
            <p className="text-white/60 text-xs mt-0.5">Estudiante</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-sidebar-scrollbar scroll-smooth">
        <Link 
          to="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/10"
        >
          <ChevronLeft size={18} />
          <span className="flex-1">Volver a Oficina Virtual</span>
        </Link>
        
        <div className="h-px w-full bg-white/20 mb-4" />

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white border border-white/30 shadow-emerald-glow'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/20">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  useSEO({
    title: 'Mi Academia — Sumak Vida Ecuador',
    description: 'Plataforma educativa de SUMAK.',
    noindex: true,
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#F4F7F5]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#1A4E26] fixed inset-y-0 left-0 z-30 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-[#1A4E26] transition-transform duration-300 lg:hidden shadow-2xl"
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#C8D8CB] px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs">
          {/* Left: Mobile menu button & logo / breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[#6B7280] hover:text-[#111111] transition-colors relative p-1 cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6B7280]">Academia SUMAK</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/30">
                Estudiante
              </span>
            </div>
          </div>

          {/* Right: Notifications & Profile Widget */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationsPopover variant="light" />

            <Link
              to="/academia/dashboard/perfil"
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-[#F4F7F5] border border-transparent hover:border-[#C8D8CB]/80 transition-all duration-200 group cursor-pointer"
              title="Ir a Mi Perfil"
            >
              <Avatar profile={profile} size={32} className="ring-2 ring-[#D4AF37]/50" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#111111] group-hover:text-[#1A4E26] transition-colors leading-tight truncate max-w-[130px]">
                  {displayName(profile)}
                </p>
                <p className="text-[10px] text-[#6B7280] font-mono leading-none mt-0.5">
                  Estudiante
                </p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
