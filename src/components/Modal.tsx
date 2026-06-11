import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** ancho máximo. default sm */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** si true (default), cerrar al clic en backdrop */
  closeOnBackdrop?: boolean;
  /** mostrar la X en el header. default true */
  showClose?: boolean;
  /** id estable para asociar título y descripción al diálogo (a11y) */
  labelledById?: string;
  /** clase extra para el contenedor blanco interior */
  className?: string;
}

const SIZE_MAX_W: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Modal accesible reutilizable.
 *
 * Atiende UX-002 + A11Y-001:
 *  - role="dialog" + aria-modal="true"
 *  - cierre con ESC
 *  - cierre con click en backdrop (configurable)
 *  - focus trap dentro del modal
 *  - restaura foco al elemento que lo abrió al cerrar
 *  - bloquea scroll del body mientras está abierto
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'sm',
  closeOnBackdrop = true,
  showClose = true,
  labelledById,
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Bloquear scroll del body cuando abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus trap: mover foco al modal cuando abre; restaurar al cerrar
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // mover foco al primer elemento focusable
    const node = dialogRef.current;
    if (node) {
      const focusable = node.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? node).focus();
    }
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Trap del Tab dentro del modal
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const node = dialogRef.current;
    if (!node) return;
    const focusables = Array.from(
      node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm overflow-y-auto py-8"
          onClick={() => closeOnBackdrop && onClose()}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledById}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            className={`bg-white border border-[#C8D8CB] rounded-2xl w-full ${SIZE_MAX_W[size]} shadow-2xl my-auto outline-none ${className}`}
          >
            {(title || showClose) && (
              <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#C8D8CB]">
                <div className="min-w-0">
                  {title && (
                    <h3 id={labelledById} className="font-heading font-bold text-lg text-[#111111] leading-tight">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-[#6B7280] text-xs mt-0.5">{subtitle}</p>
                  )}
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="text-[#9CA3AF] hover:text-[#111111] transition-colors shrink-0 rounded-lg p-1 -m-1"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
