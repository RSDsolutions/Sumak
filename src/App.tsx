import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './lib/auth';
import { CartProvider } from './lib/cart';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import AdminLayout from './components/AdminLayout';
import DashboardLayout from './components/DashboardLayout';

// Public pages
import Home from './pages/Home';
import Nosotros from './pages/Nosotros';
import Productos from './pages/Productos';
import ProductDetail from './pages/ProductDetail';
import Oportunidad from './pages/Oportunidad';
import Plan from './pages/Plan';
import Escaleras from './pages/Escaleras';
import Contacto from './pages/Contacto';
import Registro from './pages/Registro';
import Login from './pages/Login';
import Manual from './pages/Manual';

// Distribuidor dashboard pages
import Overview from './pages/dashboard/Overview';
import MiRed from './pages/dashboard/MiRed';
import MisComisiones from './pages/dashboard/MisComisiones';
import MisPedidos from './pages/dashboard/MisPedidos';
import NuevoPedido from './pages/dashboard/NuevoPedido';
import MiPerfil from './pages/dashboard/MiPerfil';
import Tienda from './pages/dashboard/Tienda';
import TiendaProducto from './pages/dashboard/TiendaProducto';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Solicitudes from './pages/admin/Solicitudes';
import SolicitudDetalle from './pages/admin/SolicitudDetalle';
import Distribuidores from './pages/admin/Distribuidores';
import DistribuidorDetalle from './pages/admin/DistribuidorDetalle';
import AdminComisiones from './pages/admin/AdminComisiones';
import AdminPedidos from './pages/admin/AdminPedidos';
import AdminRed from './pages/admin/AdminRed';

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
        <ScrollToTop />
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
        </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
