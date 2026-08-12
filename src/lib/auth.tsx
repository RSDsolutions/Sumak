import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /**
   * Hace login y devuelve el profile fresco (necesario para redirect por rol).
   * `captchaToken` opcional — solo necesario si SEC-007 está activado (Turnstile).
   */
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isDistribuidor: boolean;
  /** true si el usuario tiene rol 'operaciones' (gestiona pedidos, comisiones y solicitudes). */
  isOperaciones: boolean;
  /** true si el usuario está en sesión local mock/bypass (sin JWT Supabase). */
  isMockUser: boolean;
  /** Marca el tour de bienvenida / onboarding como completado en DB y localmente. */
  completeOnboarding: () => Promise<void>;
  /** Reinicia el tour para volver a verlo. */
  resetOnboarding: () => Promise<void>;
  /** Ruta home según el rol — usar en redirects de Login y ProtectedRoute. */
  homeForRole: () => '/admin' | '/operaciones' | '/dashboard' | '/login';
  /** Igual que homeForRole pero recibe un profile específico (útil tras signIn). */
  homeForProfile: (p: Profile | null) => '/admin' | '/operaciones' | '/dashboard' | '/login';
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCAL_MOCK_ADMIN: Profile = {
  id: '16092a90-3e8e-466d-a509-eb6b074a92cd',
  codigo_distribuidor: 'ADM-001',
  username: 'admin',
  nombre_completo: 'Administrador Local',
  cedula: '0000000000',
  email: 'admin@sumak.com',
  telefono: '0999999999',
  direccion: 'Oficina Central',
  ciudad: 'Quito',
  codigo_patrocinador: null,
  patrocinador_id: null,
  paquete: 'lider',
  puntos: 9999,
  estado: 'activo',
  rol: 'admin',
  avatar_url: null,
  fecha_registro: '2026-01-01T00:00:00Z',
  fecha_aprobacion: '2026-01-01T00:00:00Z',
};

const LOCAL_MOCK_ADMIN_USER: User = {
  id: '16092a90-3e8e-466d-a509-eb6b074a92cd',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'admin@sumak.com',
} as User;

const LOCAL_MOCK_USER_PROFILE: Profile = {
  id: '04210cbe-dab8-4047-9d36-0a3f33c29856',
  codigo_distribuidor: 'SUMAK-00030',
  username: 'user',
  nombre_completo: 'Usuario Distribuidor Local',
  cedula: '0928374651',
  email: 'user@sumak.com',
  telefono: '0987654321',
  direccion: 'Av. 9 de Octubre y Malecón',
  ciudad: 'Guayaquil',
  codigo_patrocinador: 'SUMAK-00001',
  patrocinador_id: '16092a90-3e8e-466d-a509-eb6b074a92cd',
  paquete: 'emprendedor',
  puntos: 1250,
  estado: 'activo',
  rol: 'distribuidor',
  avatar_url: null,
  fecha_registro: '2026-01-15T10:00:00Z',
  fecha_aprobacion: '2026-01-15T12:00:00Z',
};

const LOCAL_MOCK_REGULAR_USER: User = {
  id: '04210cbe-dab8-4047-9d36-0a3f33c29856',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-15T10:00:00Z',
  email: 'user@sumak.com',
} as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    if (!error && data) {
      const isCompleted = data.has_completed_onboarding ?? (localStorage.getItem(`sumak_onboarding_completed_${uid}`) === 'true');
      const p = { ...(data as Profile), has_completed_onboarding: !!isCompleted };
      setProfile(p);
      return p;
    }
    setProfile(null);
    return null;
  }

  useEffect(() => {
    // Check for local mock session first
    const mockRole = localStorage.getItem('sumak_local_mock_role');
    const isMockAdmin = localStorage.getItem('sumak_local_mock_admin') === 'true';

    if (mockRole === 'admin' || isMockAdmin) {
      setUser(LOCAL_MOCK_ADMIN_USER);
      setProfile(LOCAL_MOCK_ADMIN);
      setLoading(false);
      return;
    }

    if (mockRole === 'user' || mockRole === 'distribuidor') {
      const isCompleted = localStorage.getItem(`sumak_onboarding_completed_${LOCAL_MOCK_USER_PROFILE.id}`) === 'true';
      setUser(LOCAL_MOCK_REGULAR_USER);
      setProfile({ ...LOCAL_MOCK_USER_PROFILE, has_completed_onboarding: isCompleted });
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem('sumak_local_mock_role') || localStorage.getItem('sumak_local_mock_admin')) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(
    email: string, password: string, captchaToken?: string,
  ): Promise<{ error: string | null; profile: Profile | null }> {
    const trimmed = email.trim().toLowerCase();
    
    // Bypass local admin
    if ((trimmed === 'admin' || trimmed === 'admin@sumak.com') && password === 'admin') {
      localStorage.setItem('sumak_local_mock_role', 'admin');
      localStorage.setItem('sumak_local_mock_admin', 'true');
      setUser(LOCAL_MOCK_ADMIN_USER);
      setProfile(LOCAL_MOCK_ADMIN);
      return { error: null, profile: LOCAL_MOCK_ADMIN };
    }

    // Bypass local user / distribuidor
    if ((trimmed === 'user' || trimmed === 'user@sumak.com') && password === 'user') {
      localStorage.setItem('sumak_local_mock_role', 'user');
      localStorage.removeItem('sumak_local_mock_admin');
      setUser(LOCAL_MOCK_REGULAR_USER);
      setProfile(LOCAL_MOCK_USER_PROFILE);
      return { error: null, profile: LOCAL_MOCK_USER_PROFILE };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      // SEC-007: si Supabase Auth tiene captcha activo, el token va aquí.
      // Cuando no está activado, Supabase ignora el campo.
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      return { error: 'Credenciales incorrectas. Verifica tu email y contraseña.', profile: null };
    }
    let p: Profile | null = null;
    if (data.user) p = await fetchProfile(data.user.id);
    return { error: null, profile: p };
  }

  async function signOut(): Promise<void> {
    localStorage.removeItem('sumak_local_mock_role');
    localStorage.removeItem('sumak_local_mock_admin');
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile(): Promise<void> {
    const mockRole = localStorage.getItem('sumak_local_mock_role');
    const isMockAdmin = localStorage.getItem('sumak_local_mock_admin') === 'true';

    if (mockRole === 'admin' || isMockAdmin) {
      setUser(LOCAL_MOCK_ADMIN_USER);
      setProfile(LOCAL_MOCK_ADMIN);
      return;
    }
    if (mockRole === 'user' || mockRole === 'distribuidor') {
      setUser(LOCAL_MOCK_REGULAR_USER);
      setProfile(LOCAL_MOCK_USER_PROFILE);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
  }

  const isMockUser = Boolean(
    user?.id === LOCAL_MOCK_REGULAR_USER.id ||
    user?.id === LOCAL_MOCK_ADMIN_USER.id ||
    localStorage.getItem('sumak_local_mock_role') ||
    localStorage.getItem('sumak_local_mock_admin')
  );

  async function completeOnboarding(): Promise<void> {
    if (!profile) return;
    const updated: Profile = { ...profile, has_completed_onboarding: true };
    setProfile(updated);
    localStorage.setItem(`sumak_onboarding_completed_${profile.id}`, 'true');

    if (!isMockUser) {
      try {
        await supabase
          .from('profiles')
          .update({ has_completed_onboarding: true })
          .eq('id', profile.id);
      } catch {
        // Graceful fallback
      }
    }
  }

  async function resetOnboarding(): Promise<void> {
    if (!profile) return;
    const updated: Profile = { ...profile, has_completed_onboarding: false };
    setProfile(updated);
    localStorage.removeItem(`sumak_onboarding_completed_${profile.id}`);

    if (!isMockUser) {
      try {
        await supabase
          .from('profiles')
          .update({ has_completed_onboarding: false })
          .eq('id', profile.id);
      } catch {
        // Graceful fallback
      }
    }
  }

  const isAdmin = profile?.rol === 'admin';
  const isDistribuidor = profile?.rol === 'distribuidor';
  const isOperaciones = profile?.rol === 'operaciones';

  function homeForProfile(p: Profile | null): '/admin' | '/operaciones' | '/dashboard' | '/login' {
    if (!p) return '/login';
    if (p.rol === 'admin') return '/admin';
    if (p.rol === 'operaciones') return '/operaciones';
    return '/dashboard';
  }

  function homeForRole() {
    return homeForProfile(profile);
  }

  return (
    <AuthContext.Provider
      value={{
        user, profile, loading,
        signIn, signOut, refreshProfile,
        isAdmin, isDistribuidor, isOperaciones,
        isMockUser,
        completeOnboarding, resetOnboarding,
        homeForRole, homeForProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
