import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCheck, 
  Package, 
  DollarSign, 
  UserPlus, 
  CreditCard, 
  Users, 
  AlertTriangle, 
  Sparkles, 
  Inbox, 
  ExternalLink,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useNotifications, TipoNotificacion, AppNotification } from '../lib/notifications';

interface NotificationsPopoverProps {
  /** Estilo según el fondo del header donde se ubica */
  variant?: 'light' | 'dark';
  className?: string;
}

/** Formateador de tiempo relativo en español */
function formatRelativeTime(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMin = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMin < 1) return 'Justo ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `hace ${diffDays}d`;
    return new Date(isoDate).toLocaleDateString('es-EC', { month: 'short', day: 'numeric' });
  } catch {
    return 'Reciente';
  }
}

/** Icono y estilo según el tipo de notificación */
function getNotificationVisuals(tipo: TipoNotificacion) {
  switch (tipo) {
    case 'comision':
      return {
        icon: <DollarSign size={15} className="text-[#B8860B]" />,
        bg: 'bg-amber-50 border-amber-200',
      };
    case 'pedido':
      return {
        icon: <Package size={15} className="text-[#1A4E26]" />,
        bg: 'bg-emerald-50 border-emerald-200',
      };
    case 'afiliacion':
      return {
        icon: <UserPlus size={15} className="text-blue-700" />,
        bg: 'bg-blue-50 border-blue-200',
      };
    case 'perfil':
      return {
        icon: <CreditCard size={15} className="text-teal-700" />,
        bg: 'bg-teal-50 border-teal-200',
      };
    case 'red':
      return {
        icon: <Users size={15} className="text-purple-700" />,
        bg: 'bg-purple-50 border-purple-200',
      };
    case 'alerta':
      return {
        icon: <AlertTriangle size={15} className="text-rose-600" />,
        bg: 'bg-rose-50 border-rose-200',
      };
    case 'sistema':
    default:
      return {
        icon: <Sparkles size={15} className="text-[#1A4E26]" />,
        bg: 'bg-[#EBF4ED] border-[#C8D8CB]',
      };
  }
}

export default function NotificationsPopover({ 
  variant = 'light', 
  className = '' 
}: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Manejo de clic en una notificación
  const handleItemClick = (notification: AppNotification) => {
    if (!notification.leido) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
      navigate(notification.link);
    }
  };

  const isDark = variant === 'dark';

  return (
    <div ref={popoverRef} className={`relative inline-block ${className}`}>
      {/* Botón de la Campana */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
        aria-expanded={isOpen}
        title={`Notificaciones (${unreadCount} no leídas)`}
        className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
          isDark
            ? 'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15'
            : 'text-[#1A4E26] bg-[#F4F7F5] hover:bg-[#EBF4ED] border border-[#C8D8CB]/80 hover:border-[#1A4E26]/40 shadow-xs'
        } ${isOpen ? (isDark ? 'bg-white/15 text-white ring-2 ring-white/30' : 'bg-[#EBF4ED] text-[#1A4E26] ring-2 ring-[#1A4E26]/20') : ''}`}
      >
        <Bell size={20} className="transition-transform duration-200 group-hover:scale-105" />

        {/* Badge Dinámico en Rojo (#DC2626) */}
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-[#DC2626] text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-sm animate-in fade-in zoom-in-75 duration-200"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel Desplegable (Popover) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2.5 w-[320px] sm:w-[380px] origin-top-right rounded-2xl bg-white shadow-[0_12px_36px_rgba(0,0,0,0.14)] border border-[#C8D8CB] z-50 overflow-hidden flex flex-col text-slate-800"
          >
            {/* Header del Popover */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#FAFCFA] border-b border-[#C8D8CB]/80">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm text-[#111111] tracking-wide">
                  Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF4ED] text-[#1A4E26] text-[11px] font-extrabold border border-[#1A4E26]/20">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A4E26] hover:text-[#163F1E] hover:underline transition-colors cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={14} className="text-[#1A4E26]" />
                  <span>Marcar leídas</span>
                </button>
              )}
            </div>

            {/* Body: Lista de Notificaciones con scroll interno */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 overscroll-contain">
              {notifications.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-[#F4F7F5] flex items-center justify-center mb-2.5 text-slate-400">
                    <Inbox size={22} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">No tienes notificaciones</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Te avisaremos cuando haya novedades importantes</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const visuals = getNotificationVisuals(n.tipo);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`px-4 py-3 transition-colors flex items-start gap-3 cursor-pointer group select-none ${
                        !n.leido 
                          ? 'bg-[#F4F9F5] hover:bg-[#EAF3EC]' 
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {/* Icono de Tipo */}
                      <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${visuals.bg} shadow-2xs mt-0.5`}>
                        {visuals.icon}
                      </div>

                      {/* Contenido de Notificación */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs font-heading truncate ${!n.leido ? 'font-bold text-[#111111]' : 'font-semibold text-slate-700'}`}>
                            {n.titulo}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                          {n.descripcion}
                        </p>

                        {n.link && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[#1A4E26] mt-1 group-hover:underline">
                            <span>Ver detalle</span>
                            <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                          </div>
                        )}
                      </div>

                      {/* Punto indicador de no leída */}
                      {!n.leido && (
                        <span className="w-2 h-2 rounded-full bg-[#1A4E26] shrink-0 mt-1.5 ring-2 ring-emerald-100" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer del Popover */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 bg-[#FAFCFA] border-t border-[#C8D8CB]/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">
                  {notifications.length} {notifications.length === 1 ? 'notificación' : 'notificaciones'}
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                  title="Limpiar todo el historial"
                >
                  <Trash2 size={12} />
                  <span>Limpiar</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
