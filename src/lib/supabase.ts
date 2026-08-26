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

export const supabase = createClient(url, anonKey);

export async function callEdgeFunction<TResp = unknown>(
  name:
    | 'approve-afiliacion'
    | 'sign-voucher-url'
    | 'admin-staff-update'
    | 'payphone-create-payment'
    | 'payphone-confirm-payment'
    | 'paypal-create-order'
    | 'paypal-capture-order'
    | 'academy-grade-assessment'
    | 'academy-check-eligibility'
    | 'academy-issue-diploma'
    | 'academy-verify-diploma'
    | 'academy-sign-document-url'
    | 'academy-revoke-diploma',
  body: Record<string, unknown>,
): Promise<TResp> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Debes iniciar sesión o completar tu registro antes de continuar con el pago.');
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
