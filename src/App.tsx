import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './lib/auth';
import { CartProvider } from './lib/cart';
import { ToastProvider } from './lib/toast';
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

// Distribuidor dashboard pages
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const Overview = lazy(() => import('./pages/dashboard/Overview'));
const MiRed = lazy(() => import('./pages/dashboard/MiRed'));
const MisComisiones = lazy(() => import('./pages/dashboard/MisComisiones'));
const MisPedidos = lazy(() => import('./pages/dashboard/MisPedidos'));
const NuevoPedido = lazy(() => import('./pages/dashboard/NuevoPedido'));
const MiPerfil = lazy(() => import('./pages/dashboard/MiPerfil'));
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                  <MisComisiones />
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
                  <AdminComisiones />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mis-comisiones"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminMisComisiones />
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
            path="/operaciones/solicitudes"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <Solicitudes />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones/solicitudes/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <SolicitudDetalle />
                </OperacionesLayout>
              </ProtectedRoute>
            }
          />
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
            path="/operaciones/comisiones"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                <OperacionesLayout>
                  <AdminComisiones />
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
        </Routes>
        </Suspense>
        </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
