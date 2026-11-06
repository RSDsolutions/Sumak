import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  !rawUrl.includes('tu-proyecto') &&
  !rawAnonKey.includes('tu-anon-key')
);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ [Sumak] Variables de entorno de Supabase no configuradas o con valores de plantilla.\n' +
    'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local para conectar con la base de datos real.\n' +
    'La aplicación cargará en modo local con datos de respaldo (fallback).'
  );
}

const fallbackUrl = 'https://placeholder-sumak.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

const url = isSupabaseConfigured ? rawUrl! : fallbackUrl;
const anonKey = isSupabaseConfigured ? rawAnonKey! : fallbackKey;

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
    | 'academy-revoke-diploma'
    | 'academy-generate-verified-diploma',
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

export async function callEdgeFunctionMultipart<TResp = unknown>(
  name: 'academy-register-existing-diploma',
  formData: FormData,
): Promise<TResp> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Debes iniciar sesión para registrar un diploma.');
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: anonKey! },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status} en ${name}`);
  return json as TResp;
}

export async function callPublicEdgeFunction<TResp = unknown>(
  name: 'academy-verify-registered-diploma' | 'academy-sign-registered-diploma-url',
  body: Record<string, unknown>,
): Promise<TResp> {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey! },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status} en ${name}`);
  return json as TResp;
}
