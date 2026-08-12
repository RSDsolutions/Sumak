import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth';

export type TipoNotificacion = 
  | 'pedido' 
  | 'comision' 
  | 'afiliacion' 
  | 'sistema' 
  | 'alerta' 
  | 'perfil'
  | 'red';

export interface AppNotification {
  id: string;
  user_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion: string;
  leido: boolean;
  link?: string | null;
  created_at: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addNotification: (n: Omit<AppNotification, 'id' | 'created_at'>) => void;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** Generador de notificaciones iniciales según el rol del usuario (vacío por defecto) */
function generateInitialNotifications(_userId: string, _role: string, _name?: string | null): AppNotification[] {
  return [];
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const storageKey = user ? `sumak_notifications_${user.id}` : null;

  // Cargar notificaciones para el usuario en sesión
  const loadNotifications = useCallback(async () => {
    if (!user || !storageKey) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Leer desde localStorage
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotifications(parsed);
            setLoading(false);
            return;
          }
        } catch {
          // Ignorar error de parseo
        }
      }

      // 2. Generar notificaciones iniciales contextuales
      const role = profile?.rol || 'distribuidor';
      const initial = generateInitialNotifications(user.id, role, profile?.nombre_completo);
      setNotifications(initial);
      localStorage.setItem(storageKey, JSON.stringify(initial));
    } finally {
      setLoading(false);
    }
  }, [user, profile, storageKey]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Marcar una notificación como leída
  const markAsRead = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, leido: true } : n));
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, leido: true }));
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Eliminar una notificación
  const clearNotification = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Limpiar todas
  const clearAll = async () => {
    setNotifications([]);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  // Añadir notificación en tiempo real
  const addNotification = (n: Omit<AppNotification, 'id' | 'created_at'>) => {
    const newNotif: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const unreadCount = notifications.filter((n) => !n.leido).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        addNotification,
        refresh: loadNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de un NotificationProvider');
  }
  return context;
}
