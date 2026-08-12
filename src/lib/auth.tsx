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
      const localVal = localStorage.getItem(`sumak_onboarding_completed_${uid}`);
      const isCompleted = localVal !== null
        ? localVal === 'true'
        : Boolean(data.has_completed_onboarding);
      const p = { ...(data as Profile), has_completed_onboarding: isCompleted };
      setProfile(p);
      return p;
    }
    setProfile(null);
    return null;
  }

  useEffect(() => {
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

  const isMockUser = false;

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
