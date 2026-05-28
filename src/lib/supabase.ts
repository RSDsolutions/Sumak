import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase.\n' +
    'Asegúrate de que .env.local tiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.\n' +
    'Reinicia el servidor de desarrollo después de crear o modificar .env.local.'
  );
}

// Client for regular operations (respects RLS)
export const supabase = createClient(url, anonKey);

// Admin client (bypasses RLS — only use in admin-protected routes)
export const supabaseAdmin = createClient(url, serviceKey ?? anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
