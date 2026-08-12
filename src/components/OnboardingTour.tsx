import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface OnboardingTourProps {
  forceStart?: boolean;
  onComplete?: () => void;
}

type TourPhase = 'dashboard' | 'tienda' | 'red' | 'escalera' | 'comisiones';

function getVisibleElement(selector: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return elements[0] || null;
}

export default function OnboardingTour({ forceStart = false, onComplete }: OnboardingTourProps) {
  const { profile, isDistribuidor, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const driverRef = useRef<Driver | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const isNavigatingRef = useRef<boolean>(false);
  const isTourCompletedRef = useRef<boolean>(false);
  const currentPhaseRef = useRef<TourPhase>('dashboard');
  const currentStepIndexRef = useRef<number>(0);

  const updateProgressBadge = (globalStep: number, total: number = 9) => {
    setTimeout(() => {
      const progressEl = document.querySelector('.driver-popover-progress-text');
      if (progressEl) {
        progressEl.textContent = `Paso ${globalStep} de ${total}`;
      }
    }, 15);
  };

  const handleDismissTour = useCallback(() => {
    setShowConfirmModal(false);
    sessionStorage.removeItem('sumak_active_tour_stage');
    completeOnboarding();
    window.dispatchEvent(new CustomEvent('sumak-tour-close-mobile-sidebar'));
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, [completeOnboarding]);

  // ==========================================
  // FASE 1: /dashboard (Pasos 1, 2, 3 de 9)
  // ==========================================
  const startDashboardTour = useCallback((initialIndex: number = 0) => {
    const welcomeEl = getVisibleElement('#tour-welcome-banner') || getVisibleElement('[data-tour="welcome-banner"]');
    if (!welcomeEl && !forceStart) return;

    currentPhaseRef.current = 'dashboard';

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(11, 41, 19, 0.75)',
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: 'sumak-driver-popover',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Atrás',
      doneBtnText: 'Ir a Tienda 🛍️',
      showButtons: ['next', 'previous', 'close'],
      onHighlightStarted: (element, step, options) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        const idx = options?.driver?.getActiveIndex() ?? 0;
        currentStepIndexRef.current = idx;

        // Si es el paso 2 o 3, en móviles abrimos automáticamente el drawer de navegación
        if (idx >= 1 && window.innerWidth < 1024) {
          window.dispatchEvent(new CustomEvent('sumak-tour-open-mobile-sidebar'));
        } else if (idx === 0 && window.innerWidth < 1024) {
          window.dispatchEvent(new CustomEvent('sumak-tour-close-mobile-sidebar'));
        }

        updateProgressBadge(idx + 1, 9);
      },
      steps: [
        {
          element: '#tour-welcome-banner',
          popover: {
            title: '✨ Bienvenido a tu Panel',
            description: 'Aquí puedes consultar el estado de tu paquete activo, pedidos recientes y tu activación mensual necesaria para cobrar comisiones.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: () => (getVisibleElement('#tour-sidebar-nav') || getVisibleElement('[data-tour="sidebar-nav"]') || document.querySelector('#tour-sidebar-nav') || document.body) as Element,
          popover: {
            title: '📋 Menú de Control',
            description: 'Desde esta barra de navegación puedes acceder a la Tienda, Carrito, Pedidos, Red de afiliados, Escalera de éxito y Comisiones.',
            side: window.innerWidth < 1024 ? 'bottom' : 'right',
            align: 'start',
          },
        },
        {
          element: () => (getVisibleElement('[data-tour="nav-tienda"]') || document.querySelector('[data-tour="nav-tienda"]') || document.body) as Element,
          popover: {
            title: '🛍️ Catálogo y Tienda',
            description: 'Accede a tus productos con 50% de descuento mayorista y arma tus paquetes de afiliación. ¡Vamos a ver la tienda interactiva!',
            side: window.innerWidth < 1024 ? 'top' : 'right',
            align: 'center',
            onNextClick: () => {
              isNavigatingRef.current = true;
              sessionStorage.setItem('sumak_active_tour_stage', 'tienda');
              window.dispatchEvent(new CustomEvent('sumak-tour-close-mobile-sidebar'));
              driverObj.destroy();
              navigate('/dashboard/tienda');
            },
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current && !isTourCompletedRef.current) {
          const idx = driverObj.getActiveIndex();
          if (typeof idx === 'number') currentStepIndexRef.current = idx;
          driverObj.destroy();
          driverRef.current = null;
          setShowConfirmModal(true);
        } else {
          driverObj.destroy();
          driverRef.current = null;
        }
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(initialIndex);
  }, [forceStart, navigate]);

  // ==========================================
  // FASE 2: /dashboard/tienda (Pasos 4, 5, 6 de 9)
  // ==========================================
  const startTiendaTour = useCallback((initialIndex: number = 0) => {
    const packBanner = getVisibleElement('[data-tour="tienda-pack-banner"]');
    if (!packBanner) return;

    currentPhaseRef.current = 'tienda';
    window.dispatchEvent(new CustomEvent('sumak-tour-close-mobile-sidebar'));

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(11, 41, 19, 0.75)',
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: 'sumak-driver-popover',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Atrás',
      doneBtnText: 'Ver Mi Red 👥',
      showButtons: ['next', 'previous', 'close'],
      onHighlightStarted: (element, _step, options) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        const idx = options?.driver?.getActiveIndex() ?? 0;
        currentStepIndexRef.current = idx;
        updateProgressBadge(idx + 4, 9);
      },
      steps: [
        {
          element: '[data-tour="tienda-pack-banner"]',
          popover: {
            title: '📦 Armado de Paquetes',
            description: 'En esta sección puedes seleccionar y configurar tu paquete de afiliación con los productos exactos que desees agregar a tu pedido.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="tienda-filtros"]',
          popover: {
            title: '🔍 Buscador y Categorías',
            description: 'Filtra rápidamente por líneas de nutrición, belleza o salud y encuentra los productos disponibles al instante.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="tienda-producto-card"]',
          popover: {
            title: '🛒 50% de Descuento',
            description: 'Agrega cualquier producto a tu carrito a precio mayorista y revisa las insignias de stock en tiempo real.',
            side: 'top',
            align: 'center',
            onNextClick: () => {
              isNavigatingRef.current = true;
              sessionStorage.setItem('sumak_active_tour_stage', 'red');
              driverObj.destroy();
              navigate('/dashboard/red');
            },
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current && !isTourCompletedRef.current) {
          const idx = driverObj.getActiveIndex();
          if (typeof idx === 'number') currentStepIndexRef.current = idx;
          driverObj.destroy();
          driverRef.current = null;
          setShowConfirmModal(true);
        } else {
          driverObj.destroy();
          driverRef.current = null;
        }
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(initialIndex);
  }, [navigate]);

  // ==========================================
  // FASE 3: /dashboard/red (Paso 7 de 9)
  // ==========================================
  const startRedTour = useCallback(() => {
    const redTree = getVisibleElement('[data-tour="red-tree-container"]');
    if (!redTree) return;

    currentPhaseRef.current = 'red';
    currentStepIndexRef.current = 0;
    window.dispatchEvent(new CustomEvent('sumak-tour-close-mobile-sidebar'));

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(11, 41, 19, 0.75)',
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: 'sumak-driver-popover',
      nextBtnText: 'Ver Escalera 🏆',
      prevBtnText: '← Atrás',
      doneBtnText: 'Ver Escalera 🏆',
      showButtons: ['next', 'close'],
      onHighlightStarted: (element) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        updateProgressBadge(7, 9);
      },
      steps: [
        {
          element: '[data-tour="red-tree-container"]',
          popover: {
            title: '👥 Mi Red de Distribuidores',
            description: 'Visualiza tu árbol binario en tiempo real, verifica el balance de tus ramas izquierda y derecha y comparte tu código de patrocinador.',
            side: 'top',
            align: 'start',
            onNextClick: () => {
              isNavigatingRef.current = true;
              sessionStorage.setItem('sumak_active_tour_stage', 'escalera');
              driverObj.destroy();
              navigate('/dashboard/escalera');
            },
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current && !isTourCompletedRef.current) {
          driverObj.destroy();
          driverRef.current = null;
          setShowConfirmModal(true);
        } else {
          driverObj.destroy();
          driverRef.current = null;
        }
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(0);
  }, [navigate]);

  // ==========================================
  // FASE 4: /dashboard/escalera (Paso 8 de 9)
  // ==========================================
  const startEscaleraTour = useCallback(() => {
    const escaleraHero = getVisibleElement('[data-tour="escalera-staircase-container"]');
    if (!escaleraHero) return;

    currentPhaseRef.current = 'escalera';
    currentStepIndexRef.current = 0;
    window.dispatchEvent(new CustomEvent('sumak-tour-close-mobile-sidebar'));

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(11, 41, 19, 0.75)',
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: 'sumak-driver-popover',
      nextBtnText: 'Ver Comisiones 💰',
      prevBtnText: '← Atrás',
      doneBtnText: 'Ver Comisiones 💰',
      showButtons: ['next', 'close'],
      onHighlightStarted: (element) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        updateProgressBadge(8, 9);
      },
      steps: [
        {
          element: '[data-tour="escalera-staircase-container"]',
          popover: {
            title: '🏆 Mi Escalera de Éxito',
            description: 'Monitorea tu rango mensual, los afiliados que te faltan para subir de nivel y los bonos en efectivo que desbloqueas cada mes.',
            side: 'top',
            align: 'start',
            onNextClick: () => {
              isNavigatingRef.current = true;
              sessionStorage.setItem('sumak_active_tour_stage', 'comisiones');
              driverObj.destroy();
              navigate('/dashboard/comisiones');
            },
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current && !isTourCompletedRef.current) {
          driverObj.destroy();
          driverRef.current = null;
          setShowConfirmModal(true);
        } else {
          driverObj.destroy();
          driverRef.current = null;
        }
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(0);
  }, [navigate]);

  // ==========================================
  // FASE 5: /dashboard/comisiones (Paso 9 de 9)
  // ==========================================
  const startComisionesTour = useCallback(() => {
    const cards = getVisibleElement('[data-tour="comisiones-summary-cards"]');
    if (!cards) return;

    currentPhaseRef.current = 'comisiones';
    currentStepIndexRef.current = 0;
    window.dispatchEvent(new CustomEvent('sumak-tour-close-mobile-sidebar'));

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(11, 41, 19, 0.75)',
      stagePadding: 8,
      stageRadius: 16,
      popoverClass: 'sumak-driver-popover',
      nextBtnText: '¡Finalizar! 🎉',
      prevBtnText: '← Atrás',
      doneBtnText: '¡Finalizar! 🎉',
      showButtons: ['next', 'close'],
      onHighlightStarted: (element) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        updateProgressBadge(9, 9);
      },
      steps: [
        {
          element: '[data-tour="comisiones-summary-cards"]',
          popover: {
            title: '💰 Gestión de Comisiones',
            description: 'Consulta tus ganancias generadas por afiliación directa, bonos binarios liquidados y el estado de tu calificación mensual.',
            side: 'top',
            align: 'start',
            onNextClick: () => {
              isTourCompletedRef.current = true;
              sessionStorage.removeItem('sumak_active_tour_stage');
              completeOnboarding();
              if (onComplete) onComplete();
              driverObj.destroy();
              driverRef.current = null;
              navigate('/dashboard');
            },
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current) {
          isTourCompletedRef.current = true;
          sessionStorage.removeItem('sumak_active_tour_stage');
          completeOnboarding();
          if (onComplete) onComplete();
        }
        driverObj.destroy();
        driverRef.current = null;
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(0);
  }, [completeOnboarding, onComplete, navigate]);

  const handleContinueTour = useCallback(() => {
    setShowConfirmModal(false);
    setTimeout(() => {
      if (currentPhaseRef.current === 'dashboard') {
        startDashboardTour(currentStepIndexRef.current);
      } else if (currentPhaseRef.current === 'tienda') {
        startTiendaTour(currentStepIndexRef.current);
      } else if (currentPhaseRef.current === 'red') {
        startRedTour();
      } else if (currentPhaseRef.current === 'escalera') {
        startEscaleraTour();
      } else if (currentPhaseRef.current === 'comisiones') {
        startComisionesTour();
      }
    }, 150);
  }, [startDashboardTour, startTiendaTour, startRedTour, startEscaleraTour, startComisionesTour]);

  useEffect(() => {
    if (!profile) return;
    if (!forceStart && (!isDistribuidor || profile.has_completed_onboarding)) {
      return;
    }

    const currentStage = sessionStorage.getItem('sumak_active_tour_stage');

    const timer = setTimeout(() => {
      isNavigatingRef.current = false;

      if (location.pathname === '/dashboard') {
        if (!currentStage) {
          startDashboardTour(0);
        }
      } else if (location.pathname === '/dashboard/tienda' && currentStage === 'tienda') {
        startTiendaTour(0);
      } else if (location.pathname === '/dashboard/red' && currentStage === 'red') {
        startRedTour();
      } else if (location.pathname === '/dashboard/escalera' && currentStage === 'escalera') {
        startEscaleraTour();
      } else if (location.pathname === '/dashboard/comisiones' && currentStage === 'comisiones') {
        startComisionesTour();
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [
    profile,
    isDistribuidor,
    forceStart,
    location.pathname,
    startDashboardTour,
    startTiendaTour,
    startRedTour,
    startEscaleraTour,
    startComisionesTour,
  ]);

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
            className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 max-w-sm w-full shadow-[0_24px_60px_-12px_rgba(11,41,19,0.35)] text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/30">
              <HelpCircle size={24} />
            </div>
            <h3 className="font-heading font-bold text-lg text-[#0B2913] mb-2">
              ¿Continuar tour guiado?
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-6">
              Aprenderás a armar tus paquetes, comprar con 50% de descuento y cobrar comisiones. Si lo descartas, podrás reiniciarlo desde <strong>Mi Perfil</strong>.
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
