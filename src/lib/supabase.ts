import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

// Client for regular operations (respects RLS)
export const supabase = createClient(url, anonKey);

// Admin client (bypasses RLS — only use in admin-protected routes)
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
