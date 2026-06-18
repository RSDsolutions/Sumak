import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  Users,
  DollarSign,
  ShoppingCart,
  Network,
  Crown,
  Trophy,
  UserPlus,
  UserCog,
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
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} /> },
  { label: 'Solicitudes', to: '/admin/solicitudes', icon: <FileCheck size={18} /> },
  { label: 'Distribuidores', to: '/admin/distribuidores', icon: <Users size={18} /> },
  { label: 'Comisiones', to: '/admin/comisiones', icon: <DollarSign size={18} /> },
  { label: 'Bono Afiliación', to: '/admin/bono-afiliacion', icon: <UserPlus size={18} /> },
  { label: 'Mis Comisiones', to: '/admin/mis-comisiones', icon: <Crown size={18} /> },
  { label: 'Mi Bono Afiliación', to: '/admin/mi-bono-afiliacion', icon: <UserPlus size={18} /> },
  { label: 'Productos', to: '/admin/productos', icon: <Package size={18} /> },
  { label: 'Pedidos', to: '/admin/pedidos', icon: <ShoppingCart size={18} /> },
  { label: 'Red Binaria', to: '/admin/red', icon: <Network size={18} /> },
  { label: 'Escalera del Éxito', to: '/admin/escalera', icon: <Trophy size={18} /> },
  { label: 'Gestionar Personal', to: '/admin/personal', icon: <UserCog size={18} /> },
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
          <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-14 w-auto object-contain" />
          <div className="mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#92680A] bg-[#D4AF37]/15 border border-[#D4AF37]/50 rounded px-2 py-0.5">
              ADMIN
            </span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111111] transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
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
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // SEO-001: páginas autenticadas no deben indexarse.
  useSEO({
    title: 'Administración — Sumak Vida Ecuador',
    description: 'Panel de administración SUMAK.',
    noindex: true,
  });

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
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-4 border-b border-[#C8D8CB] bg-white shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            <Menu size={22} />
          </button>
          <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-9 w-auto object-contain" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded px-2 py-0.5">
            ADMIN
          </span>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
