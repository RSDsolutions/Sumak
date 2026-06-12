import { useEffect, useRef } from 'react';

/**
 * Captcha de Cloudflare Turnstile (SEC-007).
 *
 * Scaffolding listo para activarse cuando el admin:
 *  1. Cree un sitio gratuito en https://dash.cloudflare.com/?to=/:account/turnstile
 *  2. Configure el captcha en Supabase Auth → Project Settings → Captcha
 *  3. Agregue VITE_TURNSTILE_SITE_KEY=... a .env.local y al deploy
 *
 * Cuando la env var NO está definida, este componente renderiza null
 * y el login funciona igual que hoy (backward compatible).
 *
 * El script se carga lazy desde el CDN de Cloudflare la primera vez
 * que se monta el widget. CSP debe permitir:
 *   script-src https://challenges.cloudflare.com
 *   frame-src  https://challenges.cloudflare.com
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface CaptchaProps {
  /** callback con el token cuando el usuario resuelve el captcha. */
  onToken: (token: string) => void;
  /** llamado si Turnstile reporta error de red o token caducado. */
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

const SCRIPT_ID = '__sumak_turnstile_script__';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';

function ensureScript(): Promise<void> {
  if (document.getElementById(SCRIPT_ID)) {
    // ya cargado o en carga
    if (window.turnstile) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const prev = window.onTurnstileLoad;
      window.onTurnstileLoad = () => { prev?.(); resolve(); };
    });
  }
  return new Promise<void>((resolve) => {
    window.onTurnstileLoad = () => resolve();
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
}

export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '';
export const CAPTCHA_ENABLED = TURNSTILE_SITE_KEY.length > 0;

export default function Captcha({ onToken, onError, theme = 'light' }: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!CAPTCHA_ENABLED) return;
    let cancelled = false;

    ensureScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => onToken(token),
        'error-callback': () => onError?.(),
        'expired-callback': () => onError?.(),
        theme,
        size: 'flexible',
      });
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
    // intencionalmente no depende de onToken/onError para no re-renderizar
    // el widget en cada cambio de closure del Login (sería problema visual).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  if (!CAPTCHA_ENABLED) return null;
  return <div ref={containerRef} className="my-3 flex justify-center min-h-[65px]" />;
}
