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

/** Generador de notificaciones iniciales según el rol del usuario */
function generateInitialNotifications(userId: string, role: string, name?: string | null): AppNotification[] {
  const now = Date.now();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (role === 'admin' || role === 'operaciones') {
    return [
      {
        id: `notif-admin-1-${userId}`,
        user_id: userId,
        tipo: 'afiliacion',
        titulo: 'Nueva Solicitud de Afiliación',
        descripcion: 'El aspirante Carlos Mendoza ha enviado su comprobante para el Paquete Líder.',
        leido: false,
        link: '/admin/solicitudes',
        created_at: new Date(now - 12 * min).toISOString(),
      },
      {
        id: `notif-admin-2-${userId}`,
        user_id: userId,
        tipo: 'pedido',
        titulo: 'Comprobante de Pago Cargado',
        descripcion: 'Pedido #1042 tiene un nuevo comprobante bancario por $225.00 pendiente de revisión.',
        leido: false,
        link: '/admin/pedidos',
        created_at: new Date(now - 45 * min).toISOString(),
      },
      {
        id: `notif-admin-3-${userId}`,
        user_id: userId,
        tipo: 'sistema',
        titulo: 'Cierre de Periodo Binario',
        descripcion: 'El cálculo de comisiones semanales finalizó exitosamente sin incidencias.',
        leido: true,
        link: '/admin/comisiones',
        created_at: new Date(now - 2 * day).toISOString(),
      },
    ];
  }

  // Notificaciones para Distribuidor / Usuario
  return [
    {
      id: `notif-dist-1-${userId}`,
      user_id: userId,
      tipo: 'comision',
      titulo: '¡Comisión Acreditada!',
      descripcion: 'Has recibido $45.00 por bono de patrocinio directo en tu billetera digital.',
      leido: false,
      link: '/dashboard/comisiones',
      created_at: new Date(now - 8 * min).toISOString(),
    },
    {
      id: `notif-dist-cro-1-${userId}`,
      user_id: userId,
      tipo: 'sistema',
      titulo: '¡Tu descuento de recompra del 50% está activo!',
      descripcion: 'Aprovecha tus precios mayoristas exclusivos antes del cierre de ciclo mensual.',
      leido: false,
      link: '/dashboard/tienda',
      created_at: new Date(now - 25 * min).toISOString(),
    },
    {
      id: `notif-dist-cro-2-${userId}`,
      user_id: userId,
      tipo: 'alerta',
      titulo: 'Stock Limitado en Moringa Plus',
      descripcion: 'Quedan pocas unidades disponibles en bodega central para entrega inmediata.',
      leido: false,
      link: '/dashboard/tienda/moringa-plus',
      created_at: new Date(now - 50 * min).toISOString(),
    },
    {
      id: `notif-dist-2-${userId}`,
      user_id: userId,
      tipo: 'perfil',
      titulo: 'Tarjeta Digital Oficial Lista',
      descripcion: 'Tu credencial interactiva 3D y código QR ya están disponibles para compartir.',
      leido: true,
      link: '/tarjetadigital',
      created_at: new Date(now - 1 * hour).toISOString(),
    },
    {
      id: `notif-dist-3-${userId}`,
      user_id: userId,
      tipo: 'pedido',
      titulo: 'Pedido Despachado',
      descripcion: 'Tu pedido #1038 ha sido enviado con guía Servientrega #92837410.',
      leido: true,
      link: '/dashboard/pedidos',
      created_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: `notif-dist-4-${userId}`,
      user_id: userId,
      tipo: 'red',
      titulo: 'Nuevo Miembro en tu Red',
      descripcion: 'Se ha registrado un nuevo distribuidor en tu rama izquierda.',
      leido: true,
      link: '/dashboard/red',
      created_at: new Date(now - 3 * day).toISOString(),
    },
  ];
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
      // 1. Intentar leer desde base de datos Supabase si la tabla existe
      try {
        const { data, error } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setNotifications(data as AppNotification[]);
          localStorage.setItem(storageKey, JSON.stringify(data));
          setLoading(false);
          return;
        }
      } catch {
        // Fallback a localStorage
      }

      // 2. Leer desde localStorage
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

      // 3. Generar notificaciones iniciales contextuales
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

    try {
      await supabase
        .from('notificaciones')
        .update({ leido: true })
        .eq('id', id);
    } catch {
      // No bloqueante
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, leido: true }));
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase
          .from('notificaciones')
          .update({ leido: true })
          .eq('user_id', user.id);
      } catch {
        // No bloqueante
      }
    }
  };

  // Eliminar una notificación
  const clearNotification = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    try {
      await supabase.from('notificaciones').delete().eq('id', id);
    } catch {
      // No bloqueante
    }
  };

  // Limpiar todas
  const clearAll = async () => {
    setNotifications([]);
    if (storageKey) localStorage.removeItem(storageKey);

    if (user) {
      try {
        await supabase.from('notificaciones').delete().eq('user_id', user.id);
      } catch {
        // No bloqueante
      }
    }
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
