import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './lib/auth';
import { NotificationProvider } from './lib/notifications';
import { CartProvider } from './lib/cart';
import { ToastProvider } from './lib/toast';
import { ProductsProvider } from './lib/productos';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';

// PERF-002: code-splitting por ruta. Cada page se descarga bajo demanda
// la primera vez que el usuario la visita. Reduce el bundle inicial
// significativamente. Vite genera un chunk por cada lazy() import.
//
// Los layouts son livianos pero también los importamos sincrónicamente
// porque envuelven páginas autenticadas que ya pagan el costo de auth.

// Public pages
const Home = lazy(() => import('./pages/Home'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const Productos = lazy(() => import('./pages/Productos'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Oportunidad = lazy(() => import('./pages/Oportunidad'));
const Plan = lazy(() => import('./pages/Plan'));
const Escaleras = lazy(() => import('./pages/Escaleras'));
const Contacto = lazy(() => import('./pages/Contacto'));
const Registro = lazy(() => import('./pages/Registro'));
const Login = lazy(() => import('./pages/Login'));
const Manual = lazy(() => import('./pages/Manual'));
const Pack = lazy(() => import('./pages/Pack'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));

// Distribuidor dashboard pages
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const Overview = lazy(() => import('./pages/dashboard/Overview'));
const MiRed = lazy(() => import('./pages/dashboard/MiRed'));
const MisComisiones = lazy(() => import('./pages/dashboard/MisComisiones'));
const MisPedidos = lazy(() => import('./pages/dashboard/MisPedidos'));
const NuevoPedido = lazy(() => import('./pages/dashboard/NuevoPedido'));
const MiPerfil = lazy(() => import('./pages/dashboard/MiPerfil'));
const CredencialDigital = lazy(() => import('./pages/dashboard/CredencialDigital'));
const MiEscalera = lazy(() => import('./pages/dashboard/MiEscalera'));
const Tienda = lazy(() => import('./pages/dashboard/Tienda'));
const TiendaProducto = lazy(() => import('./pages/dashboard/TiendaProducto'));
const TiendaPack = lazy(() => import('./pages/dashboard/TiendaPack'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Solicitudes = lazy(() => import('./pages/admin/Solicitudes'));
const SolicitudDetalle = lazy(() => import('./pages/admin/SolicitudDetalle'));
const Distribuidores = lazy(() => import('./pages/admin/Distribuidores'));
const DistribuidorDetalle = lazy(() => import('./pages/admin/DistribuidorDetalle'));
const AdminComisiones = lazy(() => import('./pages/admin/AdminComisiones'));
const AdminMisComisiones = lazy(() => import('./pages/admin/AdminMisComisiones'));
const AdminPedidos = lazy(() => import('./pages/admin/AdminPedidos'));
const AdminRed = lazy(() => import('./pages/admin/AdminRed'));
const AdminEscalera = lazy(() => import('./pages/admin/AdminEscalera'));
const GestionarStaff = lazy(() => import('./pages/admin/GestionarStaff'));
const AdminProductos = lazy(() => import('./pages/admin/AdminProductos'));
const AdminCursos = lazy(() => import('./pages/admin/academia/AdminCursos'));
const AdminDiplomas = lazy(() => import('./pages/admin/academia/AdminDiplomas'));
const AdminRecetas = lazy(() => import('./pages/admin/academia/AdminRecetas'));
const AdminCobrosRecetas = lazy(() => import('./pages/admin/academia/AdminCobrosRecetas'));

// Academy pages
const AcademyLayout = lazy(() => import('./components/AcademyLayout'));
const AcademiaHome = lazy(() => import('./pages/academia/AcademiaHome'));
const CatalogoCursos = lazy(() => import('./pages/academia/CatalogoCursos'));
const CursoDetalle = lazy(() => import('./pages/academia/CursoDetalle'));
const BibliotecaLives = lazy(() => import('./pages/academia/BibliotecaLives'));
const Programas = lazy(() => import('./pages/academia/Programas'));
const VerificarDiploma = lazy(() => import('./pages/academia/VerificarDiploma'));
const AcademiaDashboard = lazy(() => import('./pages/academia/dashboard/AcademiaDashboard'));
const MisCursos = lazy(() => import('./pages/academia/dashboard/MisCursos'));
const MisDiplomas = lazy(() => import('./pages/academia/dashboard/MisDiplomas'));
const PerfilAcademico = lazy(() => import('./pages/academia/dashboard/PerfilAcademico'));
const MisRecetas = lazy(() => import('./pages/academia/dashboard/MisRecetas'));
const VisorLeccion = lazy(() => import('./pages/academia/VisorLeccion'));
const Evaluacion = lazy(() => import('./pages/academia/Evaluacion'));
const Recetas = lazy(() => import('./pages/academia/Recetas'));
const LoginAcademia = lazy(() => import('./pages/academia/LoginAcademia'));
const RegistroAcademia = lazy(() => import('./pages/academia/RegistroAcademia'));

// Operaciones pages (rol delegado para pedidos / comisiones / solicitudes).
// Reusa componentes de admin/* — sólo cambia el layout (OperacionesLayout)
// y el ProtectedRoute que permite 'admin' o 'operaciones'.
const OperacionesLayout = lazy(() => import('./components/OperacionesLayout'));
const OperacionesOverview = lazy(() => import('./pages/operaciones/Overview'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex flex-col min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Public layout wrapper (Navbar + Footer)
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-brand-black">
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

/**
 * Fallback global para `<Suspense>` mientras se descarga el chunk de la ruta.
 * Usa la paleta de marca, igual que el spinner del ProtectedRoute.
 */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Cargando página"
      className="min-h-screen bg-[#F4F7F5] flex items-center justify-center"
    >
      <div className="w-10 h-10 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function isMaintenanceModeEnabled(value: string | boolean | undefined) {
  return value === true || value === 'true' || value === '1';
}

function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-[#09150F] text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-[#0a2017]/40 backdrop-blur-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#7EE7B0]/40 bg-[#1A4E26]/70 text-lg font-black tracking-[0.25em] text-[#EAFBF1]">
          SUMAK
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-[#7EE7B0]">
          Mantenimiento
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
          Estamos realizando ajustes
        </h1>
        <p className="mt-5 text-base text-[#D7E9DF] md:text-lg">
          La plataforma principal está temporalmente deshabilitada mientras terminamos tareas
          importantes. Pronto volveremos a estar disponibles.
        </p>

        <div className="mt-8 rounded-2xl border border-[#7EE7B0]/20 bg-[#10261b] px-5 py-4 text-sm text-[#EAFBF1]">
          Gracias por tu paciencia. La preview sigue disponible para seguir trabajando en los cambios.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isMaintenanceMode = isMaintenanceModeEnabled(import.meta.env.VITE_MAINTENANCE_MODE);

  if (isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ProductsProvider>
          <CartProvider>
          <ToastProvider>
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
          {/* ── PUBLIC ROUTES ─────────────────────────────── */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <PageTransition><Home /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/nosotros"
            element={
              <PublicLayout>
                <PageTransition><Nosotros /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/productos"
            element={
              <PublicLayout>
                <PageTransition><Productos /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/productos/:slug"
            element={
              <PublicLayout>
                <PageTransition><ProductDetail /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/oportunidad"
            element={
              <PublicLayout>
                <PageTransition><Oportunidad /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/plan-multinivel"
            element={
              <PublicLayout>
                <PageTransition><Plan /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/escaleras"
            element={
              <PublicLayout>
                <PageTransition><Escaleras /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/contacto"
            element={
              <PublicLayout>
                <PageTransition><Contacto /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/registro"
            element={
              <PublicLayout>
                <PageTransition><Registro /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/manual"
            element={
              <PublicLayout>
                <PageTransition><Manual /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/packs/:slug"
            element={
              <PublicLayout>
                <PageTransition><Pack /></PageTransition>
              </PublicLayout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/checkout/return"
            element={
              <PublicLayout>
                <PageTransition><PaymentReturn /></PageTransition>
              </PublicLayout>
            }
          />
          <Route
            path="/checkout/cancel"
            element={
              <PublicLayout>
                <PageTransition><PaymentReturn /></PageTransition>
              </PublicLayout>
            }
          />

          {/* ── DISTRIBUIDOR ROUTES ───────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <Overview />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/red"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <MiRed />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/escalera"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <MiEscalera />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/comisiones"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <MisComisiones scope="no-afiliacion" />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/bono-afiliacion"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <MisComisiones scope="afiliacion" />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pedidos"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <MisPedidos />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pedido/nuevo"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <NuevoPedido />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tienda"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <Tienda />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tienda/pack/:slug"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <TiendaPack />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tienda/:slug"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <TiendaProducto />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/perfil"
            element={
              <ProtectedRoute allowedRoles={['distribuidor']}>
                <DashboardLayout>
                  <MiPerfil />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tarjetadigital"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <CredencialDigital />
              </ProtectedRoute>
            }
          />
          <Route
            path="/TarjetaDigital"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <CredencialDigital />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tarjetadigital"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <CredencialDigital />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tarjetadigital"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CredencialDigital />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credencial"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <CredencialDigital />
              </ProtectedRoute>
            }
          />

          {/* ── ACADEMIA ROUTES ───────────────────────────── */}
          {/* Public & authenticated access combined logic */}
          <Route path="/academia" element={<PublicLayout><PageTransition><AcademiaHome /></PageTransition></PublicLayout>} />
          <Route path="/academia/cursos" element={<PublicLayout><PageTransition><CatalogoCursos /></PageTransition></PublicLayout>} />
          <Route path="/academia/cursos/:slug" element={<PublicLayout><PageTransition><CursoDetalle /></PageTransition></PublicLayout>} />
          <Route path="/academia/recetas" element={<PublicLayout><PageTransition><Recetas /></PageTransition></PublicLayout>} />
          <Route path="/academia/programas" element={<PublicLayout><PageTransition><Programas /></PageTransition></PublicLayout>} />
          <Route path="/academia/verificar" element={<PublicLayout><PageTransition><VerificarDiploma /></PageTransition></PublicLayout>} />
          {/* Auth pages for academy — standalone, no PublicLayout nav */}
          <Route path="/academia/login" element={<Suspense fallback={null}><LoginAcademia /></Suspense>} />
          <Route path="/academia/registro" element={<Suspense fallback={null}><RegistroAcademia /></Suspense>} />
          
          <Route
            path="/academia/dashboard"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <AcademyLayout>
                  <AcademiaDashboard />
                </AcademyLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/dashboard/cursos"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <AcademyLayout>
                  <MisCursos />
                </AcademyLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/dashboard/biblioteca"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <AcademyLayout>
                  <BibliotecaLives />
                </AcademyLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/dashboard/recetas"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <AcademyLayout>
                  <MisRecetas />
                </AcademyLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/dashboard/diplomas"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <AcademyLayout>
                  <MisDiplomas />
                </AcademyLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/dashboard/perfil"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <AcademyLayout>
                  <PerfilAcademico />
                </AcademyLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/aprender/:slug"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <VisorLeccion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/evaluacion/:assessmentId"
            element={
              <ProtectedRoute allowedRoles={['distribuidor', 'admin', 'operaciones']}>
                <Evaluacion />
              </ProtectedRoute>
            }
          />

          {/* ── ADMIN ROUTES ──────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/solicitudes"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Solicitudes />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/solicitudes/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <SolicitudDetalle />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/distribuidores"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Distribuidores />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/distribuidores/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <DistribuidorDetalle />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/comisiones"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminComisiones scope="no-afiliacion" />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bono-afiliacion"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminComisiones scope="afiliacion" />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mis-comisiones"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminMisComisiones scope="no-afiliacion" />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mi-bono-afiliacion"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminMisComisiones scope="afiliacion" />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pedidos"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminPedidos />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/red"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminRed />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/escalera"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminEscalera />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/personal"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <GestionarStaff />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/productos"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminProductos />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academia/cursos"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminCursos />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academia/diplomas"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminDiplomas />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academia/recetas"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminRecetas />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academia/cobros"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminCobrosRecetas />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/perfil"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <MiPerfil />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ── OPERACIONES ROUTES ───────────────────────── */}
          {/* Reusan componentes admin/* — la lógica RLS y los gates de UI
              ya están escritos para admin y siguen funcionando con
              rol='operaciones' gracias a is_operaciones_or_admin() en BD. */}
          <Route
            path="/operaciones"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <OperacionesOverview />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/comisiones"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminComisiones scope="no-afiliacion" />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/bono-afiliacion"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminComisiones scope="afiliacion" />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/pedidos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminPedidos />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          {/* Operaciones: lectura de la red binaria y la escalera del éxito,
              y detalle de cualquier distribuidor (read-only — suspender/activar
              sigue siendo solo admin, ya gateado en cada componente). */}
          <Route
            path="/operaciones/distribuidores"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <Distribuidores />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/distribuidores/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <DistribuidorDetalle />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/red"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminRed />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/escalera"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminEscalera />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/productos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminProductos />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/academia/recetas"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminRecetas />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/academia/cobros"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminCobrosRecetas />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/perfil"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <MiPerfil />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
        </Suspense>
        </ToastProvider>
        </CartProvider>
        </ProductsProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
