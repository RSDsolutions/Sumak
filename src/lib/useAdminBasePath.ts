import { useLocation } from 'react-router-dom';

/**
 * Devuelve el prefijo de rutas según el contexto actual:
 *   • `/operaciones` si la URL empieza con /operaciones
 *   • `/admin` en cualquier otro caso (default)
 *
 * Los componentes admin/* (Solicitudes, Distribuidores, SolicitudDetalle,
 * DistribuidorDetalle, etc.) se montan desde DOS rutas: `/admin/*` y
 * `/operaciones/*`. Sin este hook, los links internos quedaban hardcoded
 * a `/admin/...` y el ProtectedRoute rebotaba al usuario operaciones.
 *
 * Uso:
 *   const base = useAdminBasePath();
 *   <Link to={`${base}/solicitudes/${id}`}>…</Link>
 *   navigate(`${base}/distribuidores/${id}`);
 */
export function useAdminBasePath(): '/admin' | '/operaciones' {
  const { pathname } = useLocation();
  return pathname.startsWith('/operaciones') ? '/operaciones' : '/admin';
}
