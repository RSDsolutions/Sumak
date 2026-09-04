import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
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
  User,
  Menu,
  X,
  LogOut,
  BookOpen,
  Award,
  Layers,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSEO } from '../lib/seo';
import Avatar from './Avatar';
import NotificationsPopover from './NotificationsPopover';

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
  { label: 'Academia: Cursos', to: '/admin/academia/cursos', icon: <BookOpen size={18} /> },
  { label: 'Academia: Inscripciones', to: '/admin/academia/inscripciones', icon: <BookOpen size={18} /> },
  { label: 'Academia: Programas', to: '/admin/academia/programas', icon: <Layers size={18} /> },
  { label: 'Academia: Lives', to: '/admin/academia/lives', icon: <BookOpen size={18} /> },
  { label: 'Academia: Recetas', to: '/admin/academia/recetas', icon: <BookOpen size={18} /> },
  { label: 'Academia: Cobros Recetas', to: '/admin/academia/cobros', icon: <DollarSign size={18} /> },
  { label: 'Academia: Diplomas', to: '/admin/academia/diplomas', icon: <Award size={18} /> },
  { label: 'Mi Perfil', to: '/admin/perfil', icon: <User size={18} /> },
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
        <div className="flex items-center gap-2 mb-3">
          <Avatar profile={profile} size={28} className="ring-2 ring-white/20" />
          <p className="text-white/50 text-xs truncate">{profile?.email}</p>
        </div>
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
  const { profile } = useAuth();

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

      {/* Main Container */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen min-w-0">
        {/* Top Header Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#C8D8CB] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
          {/* Left: Mobile hamburger & Logo / Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[#6B7280] hover:text-[#111111] transition-colors p-1 cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="lg:hidden flex items-center gap-2 group cursor-pointer" title="Ir a la página principal">
              <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded px-1.5 py-0.5">
                ADMIN
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6B7280]">Panel de Administración</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37] bg-[#1A4E26] text-white px-2 py-0.5 rounded border border-[#163F1E]">
                ADMINISTRADOR
              </span>
            </div>
          </div>

          {/* Right: Notifications & Profile Widget */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell Popover */}
            <NotificationsPopover variant="light" />

            {/* Profile Avatar Widget */}
            <Link
              to="/admin/perfil"
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-[#F4F7F5] border border-transparent hover:border-[#C8D8CB]/80 transition-all duration-200 group cursor-pointer"
              title="Ir a Perfil de Administrador"
            >
              <Avatar profile={profile} size={32} className="ring-2 ring-[#D4AF37]/40" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#111111] group-hover:text-[#1A4E26] transition-colors leading-tight truncate max-w-[130px]">
                  {profile?.nombre_completo || 'Administrador'}
                </p>
                <p className="text-[10px] text-[#6B7280] font-medium leading-none mt-0.5">
                  {profile?.email || 'admin@sumak.com'}
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

