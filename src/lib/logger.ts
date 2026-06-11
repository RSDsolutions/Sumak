/**
 * Logger centralizado (COD-009).
 *
 * Hoy: en dev hace console.*; en prod silencia los logs informativos
 * y deja los errores también en consola (con prefijo).
 *
 * Mañana: este es el punto único donde conectar Sentry / LogRocket
 * sin tener que tocar cada llamada de la app. Cuando esa integración
 * exista, sustituye el `console.error` por `Sentry.captureException(err)`.
 */

const isDev = import.meta.env.DEV;
const PREFIX = '[Sumak]';

type LogContext = Record<string, unknown> | unknown;

function format(msg: string): string {
  return `${PREFIX} ${msg}`;
}

export const logger = {
  /** Errores reales. En producción se mantienen en consola con prefijo. */
  error(msg: string, ctx?: LogContext) {
    if (ctx !== undefined) {
      // eslint-disable-next-line no-console
      console.error(format(msg), ctx);
    } else {
      // eslint-disable-next-line no-console
      console.error(format(msg));
    }
    // TODO: Sentry.captureException(ctx instanceof Error ? ctx : new Error(msg))
  },

  /** Advertencias no críticas. */
  warn(msg: string, ctx?: LogContext) {
    if (!isDev) return;
    if (ctx !== undefined) {
      // eslint-disable-next-line no-console
      console.warn(format(msg), ctx);
    } else {
      // eslint-disable-next-line no-console
      console.warn(format(msg));
    }
  },

  /** Info de diagnóstico, solo visible en dev. */
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
