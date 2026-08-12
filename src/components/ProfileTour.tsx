import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface ProfileTourProps {
  forceStart?: boolean;
  onComplete?: () => void;
}

export default function ProfileTour({ forceStart = false, onComplete }: ProfileTourProps) {
  const { profile, isDistribuidor } = useAuth();
  const driverRef = useRef<Driver | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);
  const isTourCompletedRef = useRef<boolean>(false);
  const currentStepRef = useRef<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const storageKey = profile ? `sumak_profile_tour_completed_${profile.id}` : '';

  const startTour = useCallback((initialIndex: number = 0) => {
    const qrBtn = document.querySelector('[data-tour="perfil-tarjeta-qr"]');
    if (!qrBtn) return;

    hasTriggeredRef.current = true;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(11, 41, 19, 0.75)',
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: 'sumak-driver-popover',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Entendido! 🎉',
      progressText: 'Paso {{current}} de {{total}}',
      showButtons: ['next', 'previous', 'close'],
      onHighlightStarted: (element, _step, options) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (options && options.driver) {
          const idx = options.driver.getActiveIndex();
          if (typeof idx === 'number') currentStepRef.current = idx;
        }
      },
      steps: [
        {
          element: '[data-tour="perfil-tarjeta-qr"]',
          popover: {
            title: '🪪 Tarjeta Digital y Código QR',
            description: 'Genera y descarga tu credencial oficial 3D interactiva y código QR personalizado para compartir tu enlace de referido con nuevos prospectos.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="perfil-avatar-info"]',
          popover: {
            title: '📸 Foto y Datos Personales',
            description: 'Mantén tu fotografía y número de celular al día para que tu tarjeta digital se genere con tus datos oficiales completos.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="perfil-codigo-distribuidor"]',
          popover: {
            title: '🔗 Tu Código de Distribuidor',
            description: 'Este es tu identificador único en Sumak. Compártelo con las personas que desees registrar en tu equipo binario.',
            side: 'top',
            align: 'start',
          },
        },
      ],
      onDestroyStarted: () => {
        const idx = driverObj.getActiveIndex();
        if (typeof idx === 'number' && idx < 2 && !isTourCompletedRef.current) {
          currentStepRef.current = idx;
          driverObj.destroy();
          driverRef.current = null;
          setShowConfirmModal(true);
          return;
        }

        isTourCompletedRef.current = true;
        if (storageKey) localStorage.setItem(storageKey, 'true');
        if (onComplete) onComplete();
        driverObj.destroy();
        driverRef.current = null;
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(initialIndex);
  }, [storageKey, onComplete]);

  useEffect(() => {
    if (!profile || !isDistribuidor) return;
    const isCompleted = localStorage.getItem(storageKey) === 'true';
    if (!forceStart && isCompleted) return;
    if (hasTriggeredRef.current && !forceStart) return;

    const timer = setTimeout(() => {
      startTour(0);
    }, 600);

    return () => {
      clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [profile, isDistribuidor, forceStart, storageKey, startTour]);

  function handleContinueTour() {
    setShowConfirmModal(false);
    setTimeout(() => {
      startTour(currentStepRef.current);
    }, 150);
  }

  function handleDismissTour() {
    setShowConfirmModal(false);
    if (storageKey) localStorage.setItem(storageKey, 'true');
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {showConfirmModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none"
          style={{ zIndex: 2147483647 }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            className="bg-white rounded-3xl border border-[#C8D8CB] p-6 max-w-sm w-full shadow-2xl text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/30">
              <HelpCircle size={24} />
            </div>
            <h3 className="font-heading font-bold text-lg text-[#0B2913] mb-2">
              ¿Continuar tour de perfil?
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-6">
              Aprenderás a generar tu tarjeta digital QR y compartir tu código de distribuidor. Si lo descartas, podrás reiniciarlo cuando quieras.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleContinueTour}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1A4E26] to-[#256B36] text-white font-bold text-sm hover:from-[#163F1E] hover:to-[#1F5A2D] transition-all shadow-[0_4px_12px_rgba(26,78,38,0.3)] cursor-pointer active:scale-98"
              >
                Continuar tour guiado
              </button>
              <button
                type="button"
                onClick={handleDismissTour}
                className="w-full py-2.5 rounded-xl border border-[#C8D8CB] hover:bg-[#F4F7F5] text-[#6B7280] hover:text-[#111111] font-semibold text-xs transition-colors cursor-pointer"
              >
                Descartar tour
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
