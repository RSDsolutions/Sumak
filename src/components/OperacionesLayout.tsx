import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  ShoppingCart,
  UserPlus,
  Users,
  Network,
  Trophy,
  Package,
  User,
  Menu,
  X,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSEO } from '../lib/seo';
import Avatar from './Avatar';
import NotificationsPopover from './NotificationsPopover';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
}

/**
 * Layout del rol "operaciones".
 *
 * Scope (migration 011): el rol se acota a su responsabilidad real:
 * comisiones e ingresos. Las acciones estructurales (aprobar
 * afiliaciones, suspender distribuidores, cancelar pedidos) quedan
 * solo para admin.
 *
 * Menu: Dashboard, Comisiones, Pedidos. Nada de Solicitudes,
 * Distribuidores ni Red.
 */
const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/operaciones', icon: <LayoutDashboard size={18} aria-hidden="true" />, end: true },
  { label: 'Comisiones', to: '/operaciones/comisiones', icon: <DollarSign size={18} aria-hidden="true" /> },
  { label: 'Bono Afiliación', to: '/operaciones/bono-afiliacion', icon: <UserPlus size={18} aria-hidden="true" /> },
  { label: 'Productos', to: '/operaciones/productos', icon: <Package size={18} aria-hidden="true" /> },
  { label: 'Pedidos', to: '/operaciones/pedidos', icon: <ShoppingCart size={18} aria-hidden="true" /> },
  { label: 'Distribuidores', to: '/operaciones/distribuidores', icon: <Users size={18} aria-hidden="true" /> },
  { label: 'Red Binaria', to: '/operaciones/red', icon: <Network size={18} aria-hidden="true" /> },
  { label: 'Escalera del Éxito', to: '/operaciones/escalera', icon: <Trophy size={18} aria-hidden="true" /> },
  { label: 'Academia: Recetas', to: '/operaciones/academia/recetas', icon: <BookOpen size={18} aria-hidden="true" /> },
  { label: 'Academia: Cobros Recetas', to: '/operaciones/academia/cobros', icon: <DollarSign size={18} aria-hidden="true" /> },
  { label: 'Mi Perfil', to: '/operaciones/perfil', icon: <User size={18} aria-hidden="true" /> },
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
      {/* Header — esquina blanca para que el logo se vea bien */}
      <div className="flex items-center justify-between px-6 py-6 bg-white border-b border-[#C8D8CB]">
        <div>
          <Link to="/" className="block group cursor-pointer" title="Ir a la página principal">
            <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-20 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
          </Link>
          <div className="mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-700 bg-sky-100 border border-sky-300 rounded px-2 py-0.5">
              OPERACIONES
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Profile info */}
      {profile && (
        <div className="px-6 py-4 border-b border-white/20 flex items-center gap-3">
          <Avatar profile={profile} size={40} className="ring-2 ring-white/20" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{profile.nombre_completo}</p>
            <p className="text-white/60 text-xs mt-0.5 truncate">{profile.email}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/20">
        <p className="text-white/50 text-xs truncate mb-3">{profile?.email}</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <LogOut size={16} aria-hidden="true" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function OperacionesLayout({ children }: { children: React.ReactNode }) {
  // SEO-001: el panel privado no debe indexarse.
  useSEO({
    title: 'Panel de Operaciones — Sumak Vida Ecuador',
    description: 'Panel privado de operaciones SUMAK.',
    noindex: true,
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#F4F7F5]">
      {/* Desktop sidebar — dark green con identidad operaciones (azul cielo en badge) */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#1A4E26] fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-[#1A4E26] transition-transform duration-300 lg:hidden"
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen min-w-0">
        {/* Top Header Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#C8D8CB] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
          {/* Left: Mobile hamburger & Logo / Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              className="text-[#6B7280] hover:text-[#111111] transition-colors p-1 cursor-pointer lg:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <Link to="/" className="lg:hidden flex items-center gap-2 group cursor-pointer" title="Ir a la página principal">
              <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-sky-700 bg-sky-100 border border-sky-200 rounded px-1.5 py-0.5">
                OPERACIONES
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6B7280]">Panel de Operaciones</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                STAFF
              </span>
            </div>
          </div>

          {/* Right: Notifications & Profile Widget */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell Popover */}
            <NotificationsPopover variant="light" />

            {/* Profile Avatar Widget */}
            <Link
              to="/operaciones/perfil"
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-[#F4F7F5] border border-transparent hover:border-[#C8D8CB]/80 transition-all duration-200 group cursor-pointer"
              title="Ir a Mi Perfil"
            >
              <Avatar profile={profile} size={32} className="ring-2 ring-sky-300" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#111111] group-hover:text-[#1A4E26] transition-colors leading-tight truncate max-w-[130px]">
                  {profile?.nombre_completo || 'Operaciones'}
                </p>
                <p className="text-[10px] text-[#6B7280] font-medium leading-none mt-0.5">
                  {profile?.email || 'operaciones@sumak.com'}
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

