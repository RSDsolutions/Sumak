import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  Building2,
  GraduationCap,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Video,
  Leaf,
  Wallet,
  ExternalLink,
  ChevronRight,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSEO } from '../lib/seo';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';
import NotificationsPopover from './NotificationsPopover';
import AdminCommandPalette, { type CommandPaletteItem } from './AdminCommandPalette';

type WorkspaceKey = 'plataforma' | 'academia';

interface NavItem {
  label: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  badgeKey?: 'solicitudes' | 'pedidos' | 'cobrosAcademia' | 'inscripcionesAcademia';
  keywords?: string[];
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface PendingBadges {
  solicitudes: number;
  pedidos: number;
  cobrosAcademia: number;
  inscripcionesAcademia: number;
}

const PLATAFORMA_SECTIONS: NavSection[] = [
  {
    title: 'Visión General',
    items: [
      {
        label: 'Panel General',
        description: 'Resumen ejecutivo de Plataforma y Academia',
        to: '/admin',
        icon: <LayoutDashboard size={18} />,
        end: true,
        keywords: ['inicio', 'dashboard', 'resumen', 'home', 'metricas'],
      },
    ],
  },
  {
    title: 'Operación Comercial',
    items: [
      {
        label: 'Solicitudes',
        description: 'Aprobar o revisar nuevas afiliaciones',
        to: '/admin/solicitudes',
        icon: <FileCheck size={18} />,
        badgeKey: 'solicitudes',
        keywords: ['afiliaciones', 'registros', 'pendientes', 'aprobar'],
      },
      {
        label: 'Pedidos y Envíos',
        description: 'Despachos, vouchers y seguimiento de órdenes',
        to: '/admin/pedidos',
        icon: <ShoppingCart size={18} />,
        badgeKey: 'pedidos',
        keywords: ['ordenes', 'ventas', 'envios', 'compras', 'vouchers'],
      },
      {
        label: 'Catálogo de Productos',
        description: 'Precios, stock, presentaciones y fórmulas',
        to: '/admin/productos',
        icon: <Package size={18} />,
        keywords: ['inventario', 'tienda', 'stock', 'catalogo'],
      },
    ],
  },
  {
    title: 'Red y Distribuidores',
    items: [
      {
        label: 'Distribuidores',
        description: 'Directorio de socios y estados de cuenta',
        to: '/admin/distribuidores',
        icon: <Users size={18} />,
        keywords: ['socios', 'usuarios', 'clientes', 'miembros'],
      },
      {
        label: 'Red Binaria',
        description: 'Árbol genealógico y volumen de piernas',
        to: '/admin/red',
        icon: <Network size={18} />,
        keywords: ['arbol', 'binario', 'mlm', 'estructura'],
      },
      {
        label: 'Escalera del Éxito',
        description: 'Rangos, metas y premios alcanzados',
        to: '/admin/escalera',
        icon: <Trophy size={18} />,
        keywords: ['rangos', 'premios', 'metas', 'niveles'],
      },
    ],
  },
  {
    title: 'Finanzas y Bonos',
    items: [
      {
        label: 'Comisiones de Red',
        description: 'Liquidación y pagos de comisiones MLM',
        to: '/admin/comisiones',
        icon: <DollarSign size={18} />,
        keywords: ['pagos', 'liquidaciones', 'dinero', 'ganancias'],
      },
      {
        label: 'Bono de Afiliación',
        description: 'Bonos directos por nuevos ingresos',
        to: '/admin/bono-afiliacion',
        icon: <UserPlus size={18} />,
        keywords: ['bonos', 'inicio rapido', 'afiliacion'],
      },
      {
        label: 'Mis Comisiones',
        description: 'Historial personal de comisiones generadas',
        to: '/admin/mis-comisiones',
        icon: <Crown size={18} />,
        keywords: ['propias', 'cuenta personal'],
      },
      {
        label: 'Mi Bono Afiliación',
        description: 'Bonos personales por patrocinio directo',
        to: '/admin/mi-bono-afiliacion',
        icon: <Sparkles size={18} />,
        keywords: ['bono personal', 'patrocinio'],
      },
    ],
  },
  {
    title: 'Equipo',
    items: [
      {
        label: 'Gestionar Personal',
        description: 'Roles de administración y secretaría operacional',
        to: '/admin/personal',
        icon: <UserCog size={18} />,
        keywords: ['staff', 'operaciones', 'roles', 'permisos', 'secretaria'],
      },
    ],
  },
];

const ACADEMIA_SECTIONS: NavSection[] = [
  {
    title: 'Visión General',
    items: [
      {
        label: 'Panel General',
        description: 'Volver al resumen ejecutivo global',
        to: '/admin',
        icon: <LayoutDashboard size={18} />,
        end: true,
        keywords: ['dashboard', 'inicio', 'resumen'],
      },
    ],
  },
  {
    title: 'Oferta Educativa',
    items: [
      {
        label: 'Cursos y Constructor',
        description: 'Crear cursos, módulos, lecciones y exámenes',
        to: '/admin/academia/cursos',
        icon: <BookOpen size={18} />,
        keywords: ['clases', 'modulos', 'lecciones', 'builder', 'editor'],
      },
      {
        label: 'Programas y Rutas',
        description: 'Especializaciones multipaso y prerrequisitos',
        to: '/admin/academia/programas',
        icon: <Layers size={18} />,
        keywords: ['especializaciones', 'rutas', 'diplomados'],
      },
      {
        label: 'Recetas Magistrales',
        description: 'Catálogo de fórmulas herbales y precios',
        to: '/admin/academia/recetas',
        icon: <Leaf size={18} />,
        keywords: ['fitoterapia', 'herbolaria', 'formulas', 'plantas'],
      },
      {
        label: 'Biblioteca de Lives',
        description: 'Grabaciones de clases y sesiones en vivo',
        to: '/admin/academia/lives',
        icon: <Video size={18} />,
        keywords: ['videos', 'zoom', 'grabaciones', 'talleres'],
      },
    ],
  },
  {
    title: 'Alumnos y Finanzas',
    items: [
      {
        label: 'Cobros y Pagos',
        description: 'Aprobar transferencias, PayPhone y PayPal',
        to: '/admin/academia/cobros',
        icon: <Wallet size={18} />,
        badgeKey: 'cobrosAcademia',
        keywords: ['pagos', 'transferencias', 'vouchers', 'payphone', 'paypal'],
      },
      {
        label: 'Inscripciones',
        description: 'Matrículas de estudiantes, estados y accesos',
        to: '/admin/academia/inscripciones',
        icon: <UserCheck size={18} />,
        badgeKey: 'inscripcionesAcademia',
        keywords: ['alumnos', 'matriculas', 'estudiantes', 'accesos'],
      },
      {
        label: 'Instructores',
        description: 'Docentes asignados a cursos de la academia',
        to: '/admin/academia/instructores',
        icon: <Users size={18} />,
        keywords: ['profesores', 'docentes', 'formadores'],
      },
    ],
  },
  {
    title: 'Acreditación',
    items: [
      {
        label: 'Diplomas y Certificados',
        description: 'Estudio visual de plantillas, emitidos y QR',
        to: '/admin/academia/diplomas',
        icon: <Award size={18} />,
        keywords: ['plantillas', 'certificados', 'qr', 'estudio visual', 'titulos'],
      },
    ],
  },
];

function resolvePageHeader(pathname: string): {
  workspace: WorkspaceKey | 'cuenta';
  title: string;
  subtitle: string;
} {
  if (pathname === '/admin/perfil') {
    return { workspace: 'cuenta', title: 'Mi Perfil', subtitle: 'Configuración de tu cuenta administrativa' };
  }
  if (pathname.startsWith('/admin/academia/cursos/') && pathname.includes('/lecciones/')) {
    return { workspace: 'academia', title: 'Editor de Lección', subtitle: 'Redacción visual, recetas y recursos clínicos' };
  }
  if (pathname.startsWith('/admin/academia/cursos/') && pathname.includes('/evaluaciones/')) {
    return { workspace: 'academia', title: 'Constructor de Evaluación', subtitle: 'Preguntas, puntaje mínimo y configuración' };
  }
  if (pathname.startsWith('/admin/academia/cursos/') && pathname.includes('/builder')) {
    return { workspace: 'academia', title: 'Constructor del Curso', subtitle: 'Módulos, lecciones, evaluaciones y certificación' };
  }
  if (pathname.startsWith('/admin/academia/programas/') && pathname.includes('/builder')) {
    return { workspace: 'academia', title: 'Constructor de Programa', subtitle: 'Roadmap de cursos y requisitos del diploma' };
  }
  if (pathname.startsWith('/admin/solicitudes/')) {
    return { workspace: 'plataforma', title: 'Detalle de Solicitud', subtitle: 'Revisión de comprobante y aprobación de afiliación' };
  }
  if (pathname.startsWith('/admin/distribuidores/')) {
    return { workspace: 'plataforma', title: 'Ficha de Distribuidor', subtitle: 'Perfil comercial, pedidos y red del socio' };
  }

  const allItems = [
    ...PLATAFORMA_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, ws: 'plataforma' as const }))),
    ...ACADEMIA_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, ws: 'academia' as const }))),
  ];

  const exact = allItems.find((i) => i.to === pathname);
  if (exact) {
    return { workspace: exact.ws, title: exact.label, subtitle: exact.description };
  }

  return pathname.startsWith('/admin/academia')
    ? { workspace: 'academia', title: 'Academia SUMAK', subtitle: 'Gestión del Campus Virtual' }
    : { workspace: 'plataforma', title: 'Panel Administrativo', subtitle: 'Gestión integral de SUMAK Vida Ecuador' };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useSEO({
    title: 'Administración — Sumak Vida Ecuador',
    description: 'Panel ejecutivo de administración SUMAK.',
    noindex: true,
  });

  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sumak_admin_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const routeWorkspace: WorkspaceKey = location.pathname.startsWith('/admin/academia')
    ? 'academia'
    : 'plataforma';
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>(routeWorkspace);

  const [badges, setBadges] = useState<PendingBadges>({
    solicitudes: 0,
    pedidos: 0,
    cobrosAcademia: 0,
    inscripcionesAcademia: 0,
  });

  // Sync sidebar workspace when route changes
  useEffect(() => {
    if (location.pathname.startsWith('/admin/academia')) {
      setActiveWorkspace('academia');
    } else if (location.pathname !== '/admin' && location.pathname !== '/admin/perfil') {
      setActiveWorkspace('plataforma');
    }
  }, [location.pathname]);

  // Persist sidebar collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('sumak_admin_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Load lightweight pending badges for menu attention indicators
  useEffect(() => {
    let mounted = true;
    async function fetchBadges() {
      try {
        const [solRes, pedRes, recPayRes, enrollPayRes] = await Promise.all([
          supabase.from('afiliaciones').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
          supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'procesando'),
          supabase
            .from('academy_recipe_purchases')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'processing']),
          supabase
            .from('academy_enrollments')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'payment_pending']),
        ]);

        if (!mounted) return;
        const recCount = recPayRes.count ?? 0;
        const enrCount = enrollPayRes.count ?? 0;
        setBadges({
          solicitudes: solRes.count ?? 0,
          pedidos: pedRes.count ?? 0,
          cobrosAcademia: recCount + enrCount,
          inscripcionesAcademia: enrCount,
        });
      } catch {
        // non-blocking
      }
    }
    void fetchBadges();
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  const commandItems = useMemo<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = [];
    PLATAFORMA_SECTIONS.forEach((sec) =>
      sec.items.forEach((it) =>
        items.push({
          label: it.label,
          description: it.description,
          to: it.to,
          workspace: 'plataforma',
          group: sec.title,
          icon: it.icon,
          keywords: it.keywords,
        })
      )
    );
    ACADEMIA_SECTIONS.forEach((sec) =>
      sec.items.forEach((it) => {
        if (it.to === '/admin') return; // avoid duplicating Panel General
        items.push({
          label: it.label,
          description: it.description,
          to: it.to,
          workspace: 'academia',
          group: sec.title,
          icon: it.icon,
          keywords: it.keywords,
        });
      })
    );
    items.push({
      label: 'Mi Perfil',
      description: 'Configuración de cuenta y contraseña',
      to: '/admin/perfil',
      workspace: 'cuenta',
      group: 'Cuenta',
      icon: <User size={18} />,
      keywords: ['perfil', 'clave', 'avatar'],
    });
    return items;
  }, []);

  const headerInfo = useMemo(() => resolvePageHeader(location.pathname), [location.pathname]);
  const plataformaUrgentCount = badges.solicitudes + badges.pedidos;
  const academiaUrgentCount = badges.cobrosAcademia;
  const activeSections = activeWorkspace === 'academia' ? ACADEMIA_SECTIONS : PLATAFORMA_SECTIONS;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function switchWorkspace(target: WorkspaceKey, navigateToDefault = false) {
    setActiveWorkspace(target);
    if (navigateToDefault) {
      if (target === 'academia' && !location.pathname.startsWith('/admin/academia')) {
        navigate('/admin/academia/cursos');
      } else if (target === 'plataforma' && location.pathname.startsWith('/admin/academia')) {
        navigate('/admin');
      }
    }
  }

  const renderSidebarContent = (isCompact: boolean, onCloseMobile?: () => void) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#071D0F] via-[#0B2915] to-[#081F10] text-white relative overflow-hidden">
      {/* Subtle top ambient glow */}
      <div className="pointer-events-none absolute -top-24 -left-16 w-60 h-60 rounded-full bg-[#D4AF37]/10 blur-3xl" />

      {/* Brand Lockup */}
      <div className={`relative z-10 flex items-center ${isCompact ? 'justify-center px-3' : 'justify-between px-4'} h-16 border-b border-white/[0.08] shrink-0`}>
        <Link
          to="/admin"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group min-w-0"
          title="SUMAK Vida — Panel Ejecutivo"
        >
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-[#D4AF37]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="w-full h-full object-contain" />
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <p className="font-heading font-extrabold text-sm tracking-tight text-white leading-none truncate">
                SUMAK VIDA
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#071D0F] bg-gradient-to-r from-[#E8C94A] to-[#D4AF37] rounded-md px-1.5 py-0.5 leading-none">
                  ADMIN SUITE
                </span>
              </div>
            </div>
          )}
        </Link>

        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        ) : (
          !isCompact && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Contraer barra lateral"
            >
              <PanelLeftClose size={17} />
            </button>
          )
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCompact && !onCloseMobile && (
        <div className="flex justify-center pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-xl text-white/60 hover:text-[#D4AF37] hover:bg-white/10 transition-colors"
            title="Expandir menú"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      {/* Workspace Switcher: PLATAFORMA vs ACADEMIA */}
      <div className={`relative z-10 ${isCompact ? 'px-2.5 py-2.5' : 'px-3.5 pt-4 pb-2'} shrink-0`}>
        {isCompact ? (
          <div className="flex flex-col gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => switchWorkspace('plataforma')}
              title="Cambiar a Plataforma Comercial"
              className={`relative p-2.5 rounded-xl flex items-center justify-center transition-all ${
                activeWorkspace === 'plataforma'
                  ? 'bg-gradient-to-br from-[#1E5C2D] to-[#143F1E] text-[#E8C94A] shadow-md ring-1 ring-[#D4AF37]/40'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 size={18} />
              {plataformaUrgentCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#071D0F]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => switchWorkspace('academia')}
              title="Cambiar a Academia SUMAK"
              className={`relative p-2.5 rounded-xl flex items-center justify-center transition-all ${
                activeWorkspace === 'academia'
                  ? 'bg-gradient-to-br from-[#1E5C2D] to-[#143F1E] text-[#E8C94A] shadow-md ring-1 ring-[#D4AF37]/40'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <GraduationCap size={18} />
              {academiaUrgentCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-[#071D0F]" />
              )}
            </button>
          </div>
        ) : (
          <div className="bg-black/35 p-1 rounded-2xl border border-white/[0.09] grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => switchWorkspace('plataforma')}
              className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeWorkspace === 'plataforma'
                  ? 'bg-gradient-to-r from-[#1D5B2C] to-[#267038] text-white shadow-md ring-1 ring-[#D4AF37]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Building2 size={14} className={activeWorkspace === 'plataforma' ? 'text-[#E8C94A]' : ''} />
              <span>Plataforma</span>
              {plataformaUrgentCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[#071D0F] text-[10px] font-black inline-flex items-center justify-center">
                  {plataformaUrgentCount > 99 ? '99+' : plataformaUrgentCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => switchWorkspace('academia')}
              className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeWorkspace === 'academia'
                  ? 'bg-gradient-to-r from-[#1D5B2C] to-[#267038] text-white shadow-md ring-1 ring-[#D4AF37]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <GraduationCap size={14} className={activeWorkspace === 'academia' ? 'text-[#E8C94A]' : ''} />
              <span>Academia</span>
              {academiaUrgentCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4AF37] text-[#071D0F] text-[10px] font-black inline-flex items-center justify-center">
                  {academiaUrgentCount > 99 ? '99+' : academiaUrgentCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Navigation Sections */}
      <nav className="relative z-10 flex-1 px-3 py-2 overflow-y-auto custom-sidebar-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeWorkspace}
            initial={{ opacity: 0, x: activeWorkspace === 'academia' ? 8 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeWorkspace === 'academia' ? -8 : 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="space-y-4"
          >
            {activeSections.map((section) => (
              <div key={section.title}>
                {!isCompact ? (
                  <p className="px-3 mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-200/45">
                    {section.title}
                  </p>
                ) : (
                  <div className="my-2 mx-2 h-px bg-white/[0.08]" />
                )}

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onCloseMobile}
                        title={isCompact ? `${item.label} — ${item.description}` : undefined}
                        className={({ isActive }) =>
                          `relative flex items-center ${
                            isCompact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                          } rounded-xl text-[13px] transition-all duration-150 group ${
                            isActive
                              ? 'bg-white/[0.13] text-white font-semibold shadow-xs border border-white/[0.12]'
                              : 'text-emerald-100/70 hover:text-white hover:bg-white/[0.06] font-medium border border-transparent'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !isCompact && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#D4AF37]" />
                            )}
                            <span
                              className={`shrink-0 transition-colors ${
                                isActive
                                  ? 'text-[#E8C94A]'
                                  : 'text-emerald-200/55 group-hover:text-emerald-100'
                              }`}
                            >
                              {item.icon}
                            </span>
                            {!isCompact && (
                              <>
                                <span className="flex-1 truncate">{item.label}</span>
                                {badgeCount > 0 && (
                                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-[#071D0F] text-[10px] font-black inline-flex items-center justify-center shadow-xs">
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                  </span>
                                )}
                              </>
                            )}
                            {isCompact && badgeCount > 0 && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </nav>

      {/* Bottom Utility & Account Footer */}
      <div className="relative z-10 border-t border-white/[0.08] bg-black/20 p-3 space-y-2 shrink-0">
        {!isCompact && (
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              to="/"
              target="_blank"
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-[11px] font-semibold text-emerald-100/75 hover:text-white transition-colors"
            >
              <ExternalLink size={12} /> Web SUMAK
            </Link>
            <Link
              to="/academia"
              target="_blank"
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-[11px] font-semibold text-emerald-100/75 hover:text-white transition-colors"
            >
              <GraduationCap size={12} /> Ver Campus
            </Link>
          </div>
        )}

        <div className={`flex items-center ${isCompact ? 'flex-col gap-2' : 'gap-2.5'}`}>
          <Link
            to="/admin/perfil"
            onClick={onCloseMobile}
            title="Ir a Mi Perfil"
            className={`flex items-center gap-2.5 flex-1 min-w-0 p-1.5 rounded-xl hover:bg-white/[0.08] transition-colors ${
              isCompact ? 'justify-center' : ''
            }`}
          >
            <Avatar profile={profile} size={34} className="ring-2 ring-[#D4AF37]/50 shrink-0" />
            {!isCompact && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {profile?.nombre_completo || 'Administrador'}
                </p>
                <p className="text-[10px] text-emerald-200/55 truncate mt-0.5">
                  {profile?.email || 'admin@sumak.com'}
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            title="Cerrar Sesión"
            className="p-2 rounded-xl text-white/55 hover:text-red-300 hover:bg-red-500/15 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F3F6F4]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-200 shadow-[4px_0_24px_rgba(7,29,15,0.14)] ${
          collapsed ? 'w-[80px]' : 'w-[272px]'
        }`}
      >
        {renderSidebarContent(collapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#071D0F]/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        className="fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300 lg:hidden shadow-2xl"
      >
        {renderSidebarContent(false, () => setMobileOpen(false))}
      </aside>

      {/* Main Content Container */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-200 ${
          collapsed ? 'lg:ml-[80px]' : 'lg:ml-[272px]'
        }`}
      >
        {/* Executive Top Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-xl border-b border-[#DCE7DF] px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Hamburger + Dynamic Breadcrumb & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#1A4E26] hover:bg-[#EBF4ED] transition-colors cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    headerInfo.workspace === 'academia'
                      ? 'bg-amber-100/90 text-[#8A5A00]'
                      : headerInfo.workspace === 'cuenta'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-[#EBF4ED] text-[#1A4E26]'
                  }`}
                >
                  {headerInfo.workspace === 'academia' ? (
                    <GraduationCap size={11} />
                  ) : (
                    <Building2 size={11} />
                  )}
                  {headerInfo.workspace === 'academia'
                    ? 'Academia'
                    : headerInfo.workspace === 'cuenta'
                    ? 'Cuenta'
                    : 'Plataforma'}
                </span>
                <ChevronRight size={12} className="text-slate-300 hidden sm:inline" />
                <span className="font-extrabold text-[#111111] truncate text-xs sm:text-sm">
                  {headerInfo.title}
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 truncate mt-0.5">
                {headerInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Center: Quick Command Search Trigger (Ctrl+K) */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden md:flex items-center gap-2.5 w-64 xl:w-80 px-3.5 py-2 rounded-xl bg-[#F4F7F5] hover:bg-[#EBF2ED] border border-[#DCE7DF] text-slate-500 text-xs transition-all cursor-pointer group"
          >
            <Search size={14} className="text-[#1A4E26] shrink-0" />
            <span className="flex-1 text-left truncate">Buscar módulo o sección...</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#DCE7DF] rounded-md text-[10px] font-mono font-bold text-slate-400 group-hover:text-[#1A4E26]">
              Ctrl K
            </kbd>
          </button>

          {/* Right: Quick Workspace Jump + Search icon (mobile) + Notifications + Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-[#1A4E26] hover:bg-[#EBF4ED] transition-colors"
              aria-label="Buscar sección"
            >
              <Search size={18} />
            </button>

            {/* Quick Cross-Workspace Jump Button */}
            <button
              type="button"
              onClick={() =>
                switchWorkspace(routeWorkspace === 'academia' ? 'plataforma' : 'academia', true)
              }
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                routeWorkspace === 'academia'
                  ? 'bg-[#EBF4ED] text-[#1A4E26] border-[#C8D8CB] hover:bg-[#1A4E26] hover:text-white'
                  : 'bg-[#FEF6E9] text-[#8A5A00] border-[#E8C97A] hover:bg-[#D4AF37] hover:text-[#071D0F]'
              }`}
              title={
                routeWorkspace === 'academia'
                  ? 'Cambiar a Plataforma Comercial'
                  : 'Cambiar a Academia SUMAK'
              }
            >
              {routeWorkspace === 'academia' ? (
                <>
                  <Building2 size={13} /> Ir a Plataforma
                </>
              ) : (
                <>
                  <GraduationCap size={13} /> Ir a Academia
                </>
              )}
            </button>

            <NotificationsPopover variant="light" />

            <Link
              to="/admin/perfil"
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#F8FBF9] hover:bg-[#EBF4ED] border border-[#DCE7DF] transition-all group"
              title="Mi Perfil de Administrador"
            >
              <Avatar profile={profile} size={30} className="ring-2 ring-[#D4AF37]/50" />
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-[#111111] group-hover:text-[#1A4E26] leading-tight truncate max-w-[120px]">
                  {profile?.nombre_completo?.split(' ')[0] || 'Admin'}
                </p>
                <p className="text-[9px] font-black uppercase tracking-wider text-[#92680A] leading-none mt-0.5">
                  Administrador
                </p>
              </div>
            </Link>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* Ctrl+K Command Palette */}
      <AdminCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        items={commandItems}
      />
    </div>
  );
}
