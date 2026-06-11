import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-white',
    border: 'border-[#1A4E26]/30',
    text: 'text-[#1A4E26]',
    icon: <CheckCircle2 size={18} className="text-[#1A4E26]" aria-hidden="true" />,
  },
  error: {
    bg: 'bg-white',
    border: 'border-red-300',
    text: 'text-red-600',
    icon: <AlertCircle size={18} className="text-red-500" aria-hidden="true" />,
  },
  info: {
    bg: 'bg-white',
    border: 'border-[#C8D8CB]',
    text: 'text-[#111111]',
    icon: <Info size={18} className="text-[#6B7280]" aria-hidden="true" />,
  },
};

const AUTO_DISMISS_MS = 3000;

/**
 * Toast provider in-house — sin dependencias externas.
 * Atiende UX-010 (toast al añadir al carrito) y otros mensajes
 * de retroalimentación corta sin bloquear al usuario.
 *
 * Posicionado fixed bottom-right en desktop; full-width inferior
 * en mobile. role="status" + aria-live="polite" → lectores de
 * pantalla anuncian sin interrumpir el flujo.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => remove(id), AUTO_DISMISS_MS);
  }, [remove]);

  const success = useCallback((message: string) => show(message, 'success'), [show]);
  const error = useCallback((message: string) => show(message, 'error'), [show]);
  const info = useCallback((message: string) => show(message, 'info'), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[9999] flex flex-col gap-2 sm:max-w-sm pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const s = TYPE_STYLES[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className={`${s.bg} ${s.border} border rounded-xl px-4 py-3 shadow-[0_10px_30px_rgba(15,46,24,0.12)] flex items-start gap-3 pointer-events-auto`}
              >
                <div className="shrink-0 mt-0.5">{s.icon}</div>
                <p className={`flex-1 text-sm leading-snug ${s.text}`}>{t.message}</p>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label="Cerrar notificación"
                  className="text-[#9CA3AF] hover:text-[#111111] transition-colors shrink-0 -m-1 p-1 rounded"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
