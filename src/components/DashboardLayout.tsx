import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  DollarSign,
  ShoppingCart,
  Plus,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Mi Panel', to: '/dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { label: 'Mi Red', to: '/dashboard/red', icon: <Network size={18} /> },
  { label: 'Comisiones', to: '/dashboard/comisiones', icon: <DollarSign size={18} /> },
  { label: 'Pedidos', to: '/dashboard/pedidos', icon: <ShoppingCart size={18} /> },
  { label: 'Nuevo Pedido', to: '/dashboard/pedido/nuevo', icon: <Plus size={18} /> },
  { label: 'Mi Perfil', to: '/dashboard/perfil', icon: <User size={18} /> },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const paqueteBadge = profile?.paquete
    ? { basico: 'Básico', emprendedor: 'Emprendedor', lider: 'Líder' }[profile.paquete]
    : 'DISTRIBUIDOR';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/20">
        <div>
          <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-12 w-auto object-contain brightness-0 invert" />
          <div className="mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-white/20 border border-white/30 rounded px-2 py-0.5">
              {paqueteBadge}
            </span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Profile info */}
      {profile && (
        <div className="px-6 py-4 border-b border-white/20">
          <p className="text-white text-sm font-semibold truncate">{profile.nombre_completo}</p>
          <p className="text-white/60 text-xs mt-0.5">{profile.codigo_distribuidor ?? '—'}</p>
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
        <p className="text-white/50 text-xs truncate mb-3">{profile?.nombre_completo}</p>
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F4F7F5]">
      {/* Desktop sidebar — dark green */}
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

      {/* Mobile drawer — dark green */}
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
            className="text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            <Menu size={22} />
          </button>
          <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-9 w-auto object-contain" />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
