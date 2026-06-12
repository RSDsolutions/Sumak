/**
 * Logger centralizado (COD-009 + OPS-004).
 *
 * Estrategia:
 *  - Dev: console.* con prefijo, todo visible.
 *  - Prod: errores van a consola + opcionalmente a Sentry si
 *    window.Sentry está cargado (zero-bundle: cargas Sentry con
 *    el "Loader Script" en index.html cuando el admin tenga DSN).
 *
 * Para activar Sentry SIN tocar el bundle:
 *   1. Cuenta gratis en https://sentry.io → nuevo proyecto "browser".
 *   2. Copia el Loader Script (Settings → Loader Script) — tiene el
 *      formato `<script src="https://js.sentry-cdn.com/<key>.min.js"
 *      crossorigin="anonymous"></script>`.
 *   3. Pégalo en `index.html` dentro del `<head>`.
 *   4. Actualiza la CSP en `vercel.json` agregando
 *      `https://js.sentry-cdn.com https://*.ingest.sentry.io` a
 *      `script-src` y `connect-src`.
 *   5. Listo — cualquier llamada a `logger.error(...)` envía el
 *      evento. Si el admin no hace el setup, la app funciona
 *      idéntica (no-op).
 */

const isDev = import.meta.env.DEV;
const PREFIX = '[Sumak]';

type LogContext = Record<string, unknown> | unknown;

interface SentryLike {
  captureException: (err: unknown, hint?: { extra?: Record<string, unknown> }) => void;
  captureMessage: (msg: string, level?: 'info' | 'warning' | 'error') => void;
}

declare global {
  interface Window {
    Sentry?: SentryLike;
  }
}

function format(msg: string): string {
  return `${PREFIX} ${msg}`;
}

/** Manda a Sentry si está disponible. No-op en otro caso. Best-effort. */
function reportToSentry(msg: string, ctx?: LogContext, level: 'error' | 'warning' = 'error') {
  const sentry = typeof window !== 'undefined' ? window.Sentry : undefined;
  if (!sentry) return;
  try {
    if (ctx instanceof Error) {
      sentry.captureException(ctx, { extra: { sumakMessage: msg } });
    } else if (level === 'error') {
      // Wrappeamos un Error para que Sentry preserve la stack del momento.
      const err = new Error(msg);
      sentry.captureException(err, { extra: ctx ? { ctx } : undefined });
    } else {
      sentry.captureMessage(msg, level);
    }
  } catch {
    // si Sentry está corrupto/mal-configurado, no rompemos el log normal
  }
}

export const logger = {
  /** Errores reales. Producción: consola con prefijo + Sentry si activo. */
  error(msg: string, ctx?: LogContext) {
    if (ctx !== undefined) {
      // eslint-disable-next-line no-console
      console.error(format(msg), ctx);
    } else {
      // eslint-disable-next-line no-console
      console.error(format(msg));
    }
    reportToSentry(msg, ctx, 'error');
  },

  /** Advertencias no críticas. */
  warn(msg: string, ctx?: LogContext) {
    if (isDev) {
      if (ctx !== undefined) {
        // eslint-disable-next-line no-console
        console.warn(format(msg), ctx);
      } else {
        // eslint-disable-next-line no-console
        console.warn(format(msg));
      }
    }
    // En prod silencioso en consola pero igual reporta a Sentry como warning
    // para que el admin tenga el evento aunque sea no-crítico.
    reportToSentry(msg, ctx, 'warning');
  },

  /** Info de diagnóstico, solo visible en dev. Nunca va a Sentry. */
  info(msg: string, ctx?: LogContext) {
    if (!isDev) return;
    if (ctx !== undefined) {
      // eslint-disable-next-line no-console
      console.info(format(msg), ctx);
    } else {
      // eslint-disable-next-line no-console
      console.info(format(msg));
    }
  },
};
