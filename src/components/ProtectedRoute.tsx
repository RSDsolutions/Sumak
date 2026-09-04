import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { RolUsuario } from '../lib/types';

interface ProtectedRouteProps {
  allowedRoles: RolUsuario[];
  children: React.ReactNode;
}

function Spinner() {
  // UX-005: paleta de marca (verde Sumak) sobre fondo claro,
  // consistente con el resto del dashboard.
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="min-h-screen bg-[#F4F7F5] flex items-center justify-center"
    >
      <div className="w-10 h-10 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, profile, loading, homeForRole } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    if (window.location.pathname.startsWith('/academia')) {
      return <Navigate to="/academia/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!profile) return <Spinner />;

  if (!allowedRoles.includes(profile.rol)) {
    // Redirige al home propio del rol en lugar de caer siempre en /dashboard.
    return <Navigate to={homeForRole()} replace />;
  }


  // Usuarios exclusivos de academia: no tienen paquete MLM (básico, emprendedor, lider)
  // Los afiliados/distribuidores de la plataforma tienen un paquete asignado.
  const isAcademyOnly = profile.rol === 'distribuidor' && !profile.paquete;

  if (isAcademyOnly) {
    const path = window.location.pathname;
    const isAcademiaRoute = path.startsWith('/academia');
    const isPerfilRoute = path.startsWith('/perfil');
    if (!isAcademiaRoute && !isPerfilRoute) {
      return <Navigate to="/academia/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
