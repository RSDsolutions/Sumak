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
  homeForRole: () => '/admin' | '/operaciones' | '/dashboard' | '/academia/dashboard' | '/login';
  /** Igual que homeForRole pero recibe un profile específico (útil tras signIn). */
  homeForProfile: (p: Profile | null) => '/admin' | '/operaciones' | '/dashboard' | '/academia/dashboard' | '/login';
}

export const LOCAL_MOCK_ADMIN: Profile = {
  id: '16092a90-3e8e-466d-a509-eb6b074a92cd',
  codigo_distribuidor: 'SUMAK-00001',
  username: 'admin',
  nombre_completo: 'Administrador Sumak',
  cedula: '0999999999',
  email: 'admin@sumak.com',
  telefono: '0988447019',
  direccion: 'Oficina Central Sumak',
  ciudad: 'Babahoyo',
  codigo_patrocinador: null,
  patrocinador_id: null,
  paquete: 'lider',
  puntos: 9999,
  estado: 'activo',
  rol: 'admin',
  avatar_url: null,
  fecha_registro: '2026-01-01T00:00:00Z',
  fecha_aprobacion: '2026-01-01T00:00:00Z',
  has_completed_onboarding: true,
};

export const LOCAL_MOCK_ADMIN_USER: User = {
  id: '16092a90-3e8e-466d-a509-eb6b074a92cd',
  app_metadata: {},
  user_metadata: {
    nombre: 'Administrador Sumak',
    rol: 'admin',
  },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
} as User;

export const LOCAL_MOCK_USER: Profile = {
  id: '22222222-2222-4222-8222-222222222222',
  codigo_distribuidor: 'SUMAK-00123',
  username: 'user',
  nombre_completo: 'Usuario Distribuidor',
  cedula: '0988888888',
  email: 'user@sumak.com',
  telefono: '0991234567',
  direccion: 'Av. Principal 123',
  ciudad: 'Guayaquil',
  codigo_patrocinador: 'SUMAK-00001',
  patrocinador_id: '16092a90-3e8e-466d-a509-eb6b074a92cd',
  paquete: 'emprendedor',
  puntos: 150,
  estado: 'activo',
  rol: 'distribuidor',
  avatar_url: null,
  fecha_registro: '2026-01-01T00:00:00Z',
  fecha_aprobacion: '2026-01-01T00:00:00Z',
  has_completed_onboarding: true,
};

export const LOCAL_MOCK_USER_AUTH: User = {
  id: '22222222-2222-4222-8222-222222222222',
  app_metadata: {},
  user_metadata: {
    nombre: 'Usuario Distribuidor',
    rol: 'distribuidor',
  },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
} as User;

export const LOCAL_MOCK_ESTUDIANTE: Profile = {
  id: '33333333-3333-4333-8333-333333333333',
  codigo_distribuidor: 'ACE-00088',
  username: 'estudiante',
  nombre_completo: 'Estudiante Academia Sumak',
  cedula: '0977777777',
  email: 'estudiante@sumak.com',
  telefono: '0997654321',
  direccion: 'Campus Virtual',
  ciudad: 'Quito',
  codigo_patrocinador: null,
  patrocinador_id: null,
  paquete: null,
  puntos: 0,
  estado: 'activo',
  rol: 'distribuidor',
  avatar_url: null,
  fecha_registro: '2026-01-01T00:00:00Z',
  fecha_aprobacion: '2026-01-01T00:00:00Z',
  has_completed_onboarding: true,
};

export const LOCAL_MOCK_ESTUDIANTE_AUTH: User = {
  id: '33333333-3333-4333-8333-333333333333',
  app_metadata: {},
  user_metadata: {
    nombre: 'Estudiante Academia Sumak',
    rol: 'estudiante',
  },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
} as User;

const AuthContext = createContext<AuthContextValue | null>(null);

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
      // Preservamos null (usuario anterior a la feature) distinto de false (usuario nuevo pendiente de tour).
      // Boolean(null) === false, lo cual causaba que el tour apareciera para todos los usuarios antiguos.
      const localVal = localStorage.getItem(`sumak_onboarding_completed_${uid}`);
      const isCompleted: boolean | null = localVal !== null
        ? localVal === 'true'
        : (data.has_completed_onboarding ?? null);
      const p = { ...(data as Profile), has_completed_onboarding: isCompleted };
      setProfile(p);
      return p;
    }
    setProfile(null);
    return null;
  }

  useEffect(() => {
    // Check for local mock session first (dev only)
    if (import.meta.env.DEV) {
      const mockRole = localStorage.getItem('sumak_local_mock_role');
      const isMockAdmin = localStorage.getItem('sumak_local_mock_admin') === 'true';

      if (mockRole === 'admin' || isMockAdmin) {
        setUser(LOCAL_MOCK_ADMIN_USER);
        setProfile(LOCAL_MOCK_ADMIN);
        setLoading(false);
        return;
      }

      if (mockRole === 'user') {
        setUser(LOCAL_MOCK_USER_AUTH);
        setProfile(LOCAL_MOCK_USER);
        setLoading(false);
        return;
      }

      if (mockRole === 'estudiante') {
        setUser(LOCAL_MOCK_ESTUDIANTE_AUTH);
        setProfile(LOCAL_MOCK_ESTUDIANTE);
        setLoading(false);
        return;
      }
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
      if (import.meta.env.DEV && (localStorage.getItem('sumak_local_mock_role') || localStorage.getItem('sumak_local_mock_admin'))) return;
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

    // Bypass credenciales locales (dev only)
    if (import.meta.env.DEV) {
      if ((trimmed === 'admin' || trimmed === 'admin@sumak.com' || trimmed === 'admin@sumak.ec' || trimmed === 'admin@sumak.local') && password === 'admin') {
        localStorage.setItem('sumak_local_mock_role', 'admin');
        localStorage.setItem('sumak_local_mock_admin', 'true');
        setUser(LOCAL_MOCK_ADMIN_USER);
        setProfile(LOCAL_MOCK_ADMIN);
        return { error: null, profile: LOCAL_MOCK_ADMIN };
      }

      if ((trimmed === 'user' || trimmed === 'user@sumak.com' || trimmed === 'user@sumak.ec' || trimmed === 'user@sumak.local') && password === 'user') {
        localStorage.setItem('sumak_local_mock_role', 'user');
        localStorage.setItem('sumak_local_mock_admin', 'false');
        setUser(LOCAL_MOCK_USER_AUTH);
        setProfile(LOCAL_MOCK_USER);
        return { error: null, profile: LOCAL_MOCK_USER };
      }

      if ((trimmed === 'estudiante' || trimmed === 'estudiante@sumak.com' || trimmed === 'estudiante@sumak.ec' || trimmed === 'estudiante@sumak.local') && password === 'estudiante') {
        localStorage.setItem('sumak_local_mock_role', 'estudiante');
        localStorage.setItem('sumak_local_mock_admin', 'false');
        setUser(LOCAL_MOCK_ESTUDIANTE_AUTH);
        setProfile(LOCAL_MOCK_ESTUDIANTE);
        return { error: null, profile: LOCAL_MOCK_ESTUDIANTE };
      }
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
  }

  const isMockUser = Boolean(
    user?.id === LOCAL_MOCK_ADMIN.id ||
    user?.id === LOCAL_MOCK_USER.id ||
    user?.id === LOCAL_MOCK_ESTUDIANTE.id ||
    localStorage.getItem('sumak_local_mock_role') ||
    localStorage.getItem('sumak_local_mock_admin')
  );

  async function completeOnboarding(): Promise<void> {
    if (!profile) return;
    const updated: Profile = { ...profile, has_completed_onboarding: true };
    setProfile(updated);
    localStorage.setItem(`sumak_onboarding_completed_${profile.id}`, 'true');
    sessionStorage.removeItem('sumak_tour_in_progress');
    sessionStorage.removeItem('sumak_active_tour_stage');

    try {
      await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('id', profile.id);
    } catch {
      // Graceful fallback
    }
  }

  async function resetOnboarding(): Promise<void> {
    if (!profile) return;
    const updated: Profile = { ...profile, has_completed_onboarding: false };
    setProfile(updated);
    localStorage.setItem(`sumak_onboarding_completed_${profile.id}`, 'false');
    sessionStorage.setItem('sumak_tour_in_progress', 'true');
    sessionStorage.removeItem('sumak_active_tour_stage');

    try {
      await supabase
        .from('profiles')
        .update({ has_completed_onboarding: false })
        .eq('id', profile.id);
    } catch {
      // Graceful fallback
    }
  }

  const isAdmin = profile?.rol === 'admin';
  const isDistribuidor = profile?.rol === 'distribuidor';
  const isOperaciones = profile?.rol === 'operaciones';

  function homeForProfile(p: Profile | null): '/admin' | '/operaciones' | '/dashboard' | '/academia/dashboard' | '/login' {
    if (!p) return '/login';
    if (p.rol === 'admin') return '/admin';
    if (p.rol === 'operaciones') return '/operaciones';
    if (p.rol === 'distribuidor') {
      // Los usuarios registrados desde la academia gratuita tienen código ACE-XXXXXXXX
      // Los afiliados/distribuidores de la plataforma tienen otros códigos
      const isAcademyFree = p.codigo_distribuidor?.startsWith('ACE-') ?? false;
      if (isAcademyFree) {
        return '/academia/dashboard';
      }
      return '/dashboard';
    }
    return '/login';
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
