import { StrictMode, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ──────────────────────────────────────────────────────────────
// Auto-reload en ChunkLoadError tras un deploy nuevo (ARQ-007)
//
// Cuando Vercel publica un nuevo deploy, los chunks JS cambian de
// hash (Plan-AAA.js -> Plan-BBB.js). Si el usuario tenia la pagina
// abierta antes del deploy, su index.html cacheado todavia pide
// los chunks viejos; Vercel responde 404 -> ChunkLoadError ->
// pantalla "Algo salio mal".
//
// La cura es recargar el index.html, que ya viene fresco gracias
// al Cache-Control: must-revalidate que tenemos en vercel.json.
//
// Lo hacemos silencioso (sin mostrar el modal) UNA sola vez por
// sesion para evitar loops si el reload no soluciona.
// ──────────────────────────────────────────────────────────────

const RELOAD_FLAG = 'sumak_chunk_reload_attempted';

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  // Error puede ser un Event en vite:preloadError, o un Error normal.
  const errObj = error as { message?: string; name?: string };
  const msg = (errObj.message ?? String(error)).toLowerCase();
  return (
    errObj.name === 'ChunkLoadError' ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk')
  );
}

function tryReloadOnce(): boolean {
  // sessionStorage = solo esta sesion de pestana; al cerrar la pestana
  // se borra y permitimos reintentar en futuras sesiones.
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === '1') return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // sessionStorage bloqueado (modo privado estricto). Recargamos igual.
  }
  // Truco de cache busting: anadir un timestamp asegura que index.html
  // se sirva fresco aun si algun proxy intermedio lo cachea.
  const url = new URL(window.location.href);
  url.searchParams.set('_r', String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

// Vite emite este evento cuando un import() falla al precargar.
// Lo capturamos ANTES de que llegue a React, para no mostrar el modal.
window.addEventListener('vite:preloadError', (event) => {
  if (tryReloadOnce()) {
    event.preventDefault();
  }
});

// Por si ChunkLoadError llega como rejection no manejada:
window.addEventListener('unhandledrejection', (event) => {
  if (isChunkLoadError(event.reason) && tryReloadOnce()) {
    event.preventDefault();
  }
});

/**
 * Error Boundary global (ARQ-006).
 *
 * Captura cualquier excepción no manejada en el árbol de React
 * y muestra una UI con la paleta de marca + acciones para que el
 * usuario no se quede frente a una pantalla en blanco.
 *
 * El detalle técnico va a console.error (en producción se podría
 * mandar a Sentry desde aquí — ver OPS-004 en la auditoría).
 */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // ChunkLoadError: intentamos reload silencioso y devolvemos null
    // para que React no renderice el modal mientras la pagina recarga.
    if (isChunkLoadError(error) && tryReloadOnce()) {
      return { error: null };
    }
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En producción esto se podría enviar a Sentry/LogRocket.
    // Por ahora solo a consola.
    console.error('Sumak — error no manejado:', error, info);
  }

  handleReload = () => {
    // Limpiamos el flag para que el auto-reload vuelva a funcionar en
    // futuros chunk errors despues de este intento manual.
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
    window.location.reload();
  };

  handleHome = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
    window.location.href = '/';
  };

  render() {
    if (this.state.error) {
      const message = this.state.error.message || 'Error desconocido';
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            background: '#F4F7F5',
            color: '#111111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: '100%',
              background: '#FFFFFF',
              border: '1px solid #C8D8CB',
              borderRadius: 20,
              padding: '2.5rem 2rem',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(15,46,24,0.08)',
            }}
          >
            <img
              src="/LOGO_SUMAK.png"
              alt="Sumak Vida"
              style={{ height: 56, margin: '0 auto 1.5rem', display: 'block' }}
            />
            <h1
              style={{
                fontFamily: 'Poppins, system-ui, sans-serif',
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#111111',
                margin: '0 0 0.5rem',
              }}
            >
              Algo salió mal
            </h1>
            <p
              style={{
                color: '#6B7280',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                margin: '0 0 1.5rem',
              }}
            >
              Tuvimos un problema técnico. Intenta recargar la página;
              si persiste, contacta a soporte.
            </p>

            <details
              style={{
                textAlign: 'left',
                background: '#F4F7F5',
                border: '1px solid #C8D8CB',
                borderRadius: 10,
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#6B7280',
                  fontWeight: 600,
                }}
              >
                Detalle técnico
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                {message}
              </pre>
            </details>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  background: '#1A4E26',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.85rem 1.5rem',
                  borderRadius: 12,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(26,78,38,0.2)',
                }}
              >
                Recargar página
              </button>
              <button
                onClick={this.handleHome}
                style={{
                  background: '#FFFFFF',
                  color: '#6B7280',
                  border: '1px solid #C8D8CB',
                  padding: '0.85rem 1.5rem',
                  borderRadius: 12,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
