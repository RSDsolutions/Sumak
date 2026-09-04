import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

export type TipoNotificacion = 
  | 'pedido' 
  | 'comision' 
  | 'afiliacion' 
  | 'sistema' 
  | 'alerta' 
  | 'perfil'
  | 'red'
  | 'academy';

export interface AppNotification {
  id: string;
  user_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion: string;
  leido: boolean;
  link?: string | null;
  metadata?: Record<string, unknown>;
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // Cargar notificaciones desde Supabase (fuente canónica)
  // ---------------------------------------------------------------------------
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications((data ?? []) as AppNotification[]);
    } catch {
      // Silenciar: la UI sigue funcionando aunque no haya notificaciones
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // ---------------------------------------------------------------------------
  // Suscripción en tiempo real a nuevas notificaciones del usuario
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as AppNotification) : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
    );
    await supabase
      .from('user_notifications')
      .update({ leido: true })
      .eq('id', id)
      .eq('user_id', user?.id ?? '');
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.leido).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, leido: true })));

    await supabase.rpc('mark_notifications_read', { p_ids: unreadIds });
  };

  const clearNotification = async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase
      .from('user_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id ?? '');
  };

  const clearAll = async () => {
    if (!user) return;
    setNotifications([]);
    await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', user.id);
  };

  /**
   * addNotification: inserta localmente para feedback inmediato.
   * En producción, las notificaciones llegan vía triggers de Supabase
   * y la suscripción en tiempo real. Esta función es útil para notificaciones
   * generadas en el cliente (sin trigger) o para testing.
   */
  const addNotification = (n: Omit<AppNotification, 'id' | 'created_at'>) => {
    const newNotif: AppNotification = {
      ...n,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
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
