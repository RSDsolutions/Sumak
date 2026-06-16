import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  ShoppingCart,
  UserPlus,
  Users,
  Network,
  Trophy,
  Package,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSEO } from '../lib/seo';

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
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/20">
        <div>
          <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-14 w-auto object-contain" />
          <div className="mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300 bg-sky-400/20 border border-sky-400/40 rounded px-2 py-0.5">
              OPERACIONES
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Profile info */}
      {profile && (
        <div className="px-6 py-4 border-b border-white/20">
          <p className="text-white text-sm font-semibold truncate">{profile.nombre_completo}</p>
          <p className="text-white/60 text-xs mt-0.5 truncate">{profile.email}</p>
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

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-4 border-b border-[#C8D8CB] bg-white shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-9 w-auto object-contain" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-700 bg-sky-100 border border-sky-200 rounded px-2 py-0.5">
            OPERACIONES
          </span>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
