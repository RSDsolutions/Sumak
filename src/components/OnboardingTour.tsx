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

export default function OnboardingTour({ forceStart = false, onComplete }: OnboardingTourProps) {
  const { profile, isDistribuidor, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const driverRef = useRef<Driver | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const isNavigatingRef = useRef<boolean>(false);
  const isTourCompletedRef = useRef<boolean>(false);
  const currentStepRef = useRef<number>(0);
  const currentPhaseRef = useRef<'phase1' | 'phase2' | 'phase3'>('phase1');

  const handleDismissTour = useCallback(() => {
    setShowConfirmModal(false);
    sessionStorage.removeItem('sumak_active_tour_stage');
    completeOnboarding();
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, [completeOnboarding]);

  // FASE 1: En /dashboard
  const startDashboardTourPhase1 = useCallback((initialIndex: number = 0) => {
    const welcomeEl = document.querySelector('#tour-welcome-banner') || document.querySelector('[data-tour="welcome-banner"]');
    if (!welcomeEl && !forceStart) return;

    currentPhaseRef.current = 'phase1';

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
      doneBtnText: 'Explorar Tienda 🛍️',
      progressText: 'Paso {{current}} de 6',
      showButtons: ['next', 'previous', 'close'],
      onHighlightStarted: (element, _step, options) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        if (options && options.driver) {
          const idx = options.driver.getActiveIndex();
          if (typeof idx === 'number') currentStepRef.current = idx;
        }
      },
      steps: [
        {
          element: '#tour-welcome-banner',
          popover: {
            title: '✨ ¡Bienvenido a tu Panel de Distribuidor!',
            description: 'Aquí puedes consultar el estado de tu paquete activo, armar tu pack de productos y revisar la activación mensual necesaria para cobrar comisiones.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-sidebar-nav',
          popover: {
            title: '📋 Menú de Control',
            description: 'Desde esta barra de navegación puedes acceder a la Tienda, tu Carrito, el Historial de Pedidos, tu Red de afiliados, tu Escalera de éxito y Comisiones.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-tienda"]',
          popover: {
            title: '🛍️ Catálogo y Paquetes de Inicio',
            description: 'Accede a tus productos con 50% de descuento mayorista y arma tus paquetes de afiliación. ¡Vamos a conocer la tienda interactiva!',
            side: 'right',
            align: 'center',
            onNextClick: () => {
              isNavigatingRef.current = true;
              sessionStorage.setItem('sumak_active_tour_stage', 'tienda');
              driverObj.destroy();
              navigate('/dashboard/tienda');
            },
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current && !isTourCompletedRef.current) {
          const idx = driverObj.getActiveIndex();
          if (typeof idx === 'number') currentStepRef.current = idx;
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

  // FASE 2: En /dashboard/tienda
  const startTiendaTourPhase2 = useCallback((initialIndex: number = 0) => {
    const packBanner = document.querySelector('[data-tour="tienda-pack-banner"]');
    if (!packBanner) return;

    currentPhaseRef.current = 'phase2';

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
      doneBtnText: 'Ver Mi Red y Comisiones →',
      progressText: 'Paso {{current}} de 6',
      showButtons: ['next', 'previous', 'close'],
      onHighlightStarted: (element, _step, options) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        if (options && options.driver) {
          const idx = options.driver.getActiveIndex();
          if (typeof idx === 'number') currentStepRef.current = idx;
        }
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
            title: '🛒 Compra con 50% de Descuento',
            description: 'Agrega cualquier producto a tu carrito a precio mayorista y revisa las insignias de stock en tiempo real.',
            side: 'top',
            align: 'center',
            onNextClick: () => {
              isNavigatingRef.current = true;
              sessionStorage.setItem('sumak_active_tour_stage', 'dashboard_final');
              driverObj.destroy();
              navigate('/dashboard');
            },
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current && !isTourCompletedRef.current) {
          const idx = driverObj.getActiveIndex();
          if (typeof idx === 'number') currentStepRef.current = idx;
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

  // FASE 3: En /dashboard (Red, Escalera, Comisiones)
  const startDashboardTourPhase3 = useCallback((initialIndex: number = 0) => {
    const redNav = document.querySelector('[data-tour="nav-red"]');
    if (!redNav) return;

    currentPhaseRef.current = 'phase3';

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
      doneBtnText: '¡Comenzar a Trabajar! 🚀',
      progressText: 'Paso {{current}} de 6',
      showButtons: ['next', 'previous', 'close'],
      onHighlightStarted: (element, _step, options) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        if (options && options.driver) {
          const idx = options.driver.getActiveIndex();
          if (typeof idx === 'number') currentStepRef.current = idx;
        }
      },
      steps: [
        {
          element: '[data-tour="nav-red"]',
          popover: {
            title: '👥 Construye tu Red de Distribuidores',
            description: 'Revisa tu árbol binario y copia tu código o enlace de afiliación para invitar a nuevos miembros a tu equipo.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="nav-escalera"]',
          popover: {
            title: '🏆 Rangos y Recompensas',
            description: 'Monitorea tu progreso mensual, sube de rango y desbloquea bonos adicionales por volumen y afiliados.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '[data-tour="nav-comisiones"]',
          popover: {
            title: '💰 Gestión de Ingresos',
            description: 'Consulta el saldo acumulado, las comisiones pendientes de cobro y los detalles de tus bonos por afiliación directa.',
            side: 'right',
            align: 'center',
          },
        },
      ],
      onDestroyStarted: () => {
        if (!isNavigatingRef.current) {
          const idx = driverObj.getActiveIndex();
          if (typeof idx === 'number' && idx < 2) {
            currentStepRef.current = idx;
            driverObj.destroy();
            driverRef.current = null;
            setShowConfirmModal(true);
            return;
          }
        }
        isTourCompletedRef.current = true;
        sessionStorage.removeItem('sumak_active_tour_stage');
        completeOnboarding();
        if (onComplete) onComplete();
        driverObj.destroy();
        driverRef.current = null;
      },
    });

    driverRef.current = driverObj;
    driverObj.drive(initialIndex);
  }, [completeOnboarding, onComplete]);

  const handleContinueTour = useCallback(() => {
    setShowConfirmModal(false);
    setTimeout(() => {
      if (currentPhaseRef.current === 'phase1') {
        startDashboardTourPhase1(currentStepRef.current);
      } else if (currentPhaseRef.current === 'phase2') {
        startTiendaTourPhase2(currentStepRef.current);
      } else {
        startDashboardTourPhase3(currentStepRef.current);
      }
    }, 150);
  }, [startDashboardTourPhase1, startTiendaTourPhase2, startDashboardTourPhase3]);

  useEffect(() => {
    if (!profile) return;
    if (!forceStart && (!isDistribuidor || profile.has_completed_onboarding)) {
      return;
    }

    const currentStage = sessionStorage.getItem('sumak_active_tour_stage');

    const timer = setTimeout(() => {
      isNavigatingRef.current = false;

      if (location.pathname === '/dashboard') {
        if (currentStage === 'dashboard_final') {
          startDashboardTourPhase3(0);
        } else {
          startDashboardTourPhase1(0);
        }
      } else if (location.pathname === '/dashboard/tienda' && currentStage === 'tienda') {
        startTiendaTourPhase2(0);
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
    startDashboardTourPhase1,
    startTiendaTourPhase2,
    startDashboardTourPhase3,
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
            className="bg-white rounded-3xl border border-[#C8D8CB] p-6 max-w-sm w-full shadow-2xl text-center relative"
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
