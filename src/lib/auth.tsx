import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Hace login y devuelve el profile fresco (necesario para redirect por rol). */
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isDistribuidor: boolean;
  /** true si el usuario tiene rol 'operaciones' (gestiona pedidos, comisiones y solicitudes). */
  isOperaciones: boolean;
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
      const p = data as Profile;
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
    email: string, password: string,
  ): Promise<{ error: string | null; profile: Profile | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: 'Credenciales incorrectas. Verifica tu email y contraseña.', profile: null };
    }
    let p: Profile | null = null;
    if (data.user) p = await fetchProfile(data.user.id);
    return { error: null, profile: p };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user.id);
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
