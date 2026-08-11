import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  DollarSign,
  ShoppingCart,
  Store,
  User,
  Menu,
  X,
  LogOut,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { useSEO } from '../lib/seo';
import { displayName } from '../lib/profile';
import CompleteProfileModal from './CompleteProfileModal';
import Avatar from './Avatar';
import NotificationsPopover from './NotificationsPopover';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Mi Panel', to: '/dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { label: 'Tienda', to: '/dashboard/tienda', icon: <Store size={18} /> },
  { label: 'Mi Carrito', to: '/dashboard/pedido/nuevo', icon: <ShoppingCart size={18} />, showBadge: true },
  { label: 'Mis Pedidos', to: '/dashboard/pedidos', icon: <ShoppingCart size={18} /> },
  { label: 'Mi Red', to: '/dashboard/red', icon: <Network size={18} /> },
  { label: 'Mi Escalera', to: '/dashboard/escalera', icon: <Trophy size={18} /> },
  { label: 'Comisiones', to: '/dashboard/comisiones', icon: <DollarSign size={18} /> },
  { label: 'Bono Afiliación', to: '/dashboard/bono-afiliacion', icon: <UserPlus size={18} /> },
  { label: 'Mi Perfil', to: '/dashboard/perfil', icon: <User size={18} /> },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const cartCount = items.reduce((s, i) => s + i.cantidad, 0);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const paqueteBadge = profile?.paquete
    ? { basico: 'Básico', emprendedor: 'Emprendedor', lider: 'Líder' }[profile.paquete]
    : 'DISTRIBUIDOR';

  return (
    <div className="flex flex-col h-full">
      {/* Header — esquina blanca para que el logo se vea bien */}
      <div className="flex items-center justify-between px-6 py-6 bg-white border-b border-[#C8D8CB]">
        <div>
          <Link to="/" className="block group cursor-pointer" title="Ir a la página principal">
            <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-20 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
          </Link>
          <div className="mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A4E26] bg-[#1A4E26]/10 border border-[#1A4E26]/30 rounded px-2 py-0.5">
              {paqueteBadge}
            </span>
          </div>
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
            <p className="text-white/60 text-xs mt-0.5">{profile.codigo_distribuidor ?? '—'}</p>
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
            <span className="flex-1">{item.label}</span>
            {item.showBadge && cartCount > 0 && (
              <span className="bg-[#D4AF37] text-[#0B2913] text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {cartCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/20">
        <p className="text-white/50 text-xs truncate mb-3">{displayName(profile)}</p>
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
  // SEO-001: páginas autenticadas no deben indexarse.
  useSEO({
    title: 'Panel del Distribuidor — Sumak Vida Ecuador',
    description: 'Panel privado de distribuidor SUMAK.',
    noindex: true,
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();
  const { items } = useCart();
  const cartCount = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="flex min-h-screen bg-[#F4F7F5]">
      {/* Desktop sidebar */}
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
          {/* Left: Mobile menu button & logo / breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[#6B7280] hover:text-[#111111] transition-colors relative p-1 cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-[#0B2913] text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <Link to="/" className="lg:hidden flex items-center gap-2 group cursor-pointer" title="Ir a la página principal">
              <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
            </Link>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6B7280]">Oficina Virtual</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-bold text-[#1A4E26] bg-[#EBF4ED] px-2.5 py-0.5 rounded-md border border-[#1A4E26]/20">
                {profile?.codigo_distribuidor || 'Distribuidor'}
              </span>
            </div>
          </div>

          {/* Right: Cart, Notifications & Profile Widget */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Shopping Cart Button */}
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

            {/* Notification Bell Popover */}
            <NotificationsPopover variant="light" />

            {/* Profile Avatar Widget */}
            <Link
              to="/dashboard/perfil"
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-[#F4F7F5] border border-transparent hover:border-[#C8D8CB]/80 transition-all duration-200 group cursor-pointer"
              title="Ir a Mi Perfil"
            >
              <Avatar profile={profile} size={32} className="ring-2 ring-[#1A4E26]/20" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#111111] group-hover:text-[#1A4E26] transition-colors leading-tight truncate max-w-[130px]">
                  {displayName(profile)}
                </p>
                <p className="text-[10px] text-[#6B7280] font-mono leading-none mt-0.5">
                  {profile?.codigo_distribuidor || 'ID'}
                </p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      <CompleteProfileModal />
    </div>
  );
}
