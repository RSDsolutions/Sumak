import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface ProtectedRouteProps {
  allowedRoles: ('admin' | 'distribuidor')[];
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
  const { user, profile, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) return <Spinner />;

  if (!allowedRoles.includes(profile.rol)) {
    if (profile.rol === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
