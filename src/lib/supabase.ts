import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase.\n' +
    'Asegúrate de que .env.local tiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.\n' +
    'Reinicia el servidor de desarrollo después de crear o modificar .env.local.'
  );
}

// Único cliente — usa el anon key + JWT del usuario logueado.
// Las operaciones admin viajan por RPCs SECURITY DEFINER (con gate via
// is_admin / is_operaciones_or_admin) o por Edge Functions cuando
// necesitamos service_role (auth.admin.*, storage.createSignedUrl).
//
// Antes existia un export `supabaseAdmin` con la service_role key, lo
// que la incluia en el bundle servido al browser. Eliminado en SEC-001
// para evitar bypass total de RLS por cualquiera con devtools.
export const supabase = createClient(url, anonKey);

/**
 * Helper para invocar Edge Functions de Sumak.
 * Inyecta el JWT del usuario logueado en Authorization para que la
 * Edge Function pueda validar al caller y su rol.
 *
 * Lanza si la respuesta no es 2xx — el caller debe try/catch.
 */
export async function callEdgeFunction<TResp = unknown>(
  name: 'approve-afiliacion' | 'sign-voucher-url',
  body: Record<string, unknown>,
): Promise<TResp> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No autenticado');
  }
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': anonKey!,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { error?: string })?.error ?? `Error ${res.status} en ${name}`;
    throw new Error(msg);
  }
  return json as TResp;
}
