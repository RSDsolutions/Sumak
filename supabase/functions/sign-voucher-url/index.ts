// ============================================================
// SUMAK — Edge Function: sign-voucher-url
// ============================================================
// Genera signed URLs para los buckets de vouchers / documentos sin
// exponer service_role en el frontend. Valida que el caller sea
// admin u operaciones, y que el bucket este en la allowlist.
//
// Input (POST JSON):
//   { bucket: text, path: text, expires_in?: int }   // expires_in en segundos, default 3600
//
// Output:
//   200 -> { signedUrl }
//   401 -> no autenticado
//   403 -> no es admin/operaciones
//   400 -> bucket fuera de allowlist o input invalido
//   404 -> path no existe
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Solo estos buckets son firmables via esta funcion. Cualquier otro
// se rechaza con 400 para evitar accesos no previstos.
const BUCKET_ALLOWLIST = new Set([
  "pedidos-vouchers",
  "comisiones-vouchers",
  "pedidos-envios",
  "documentos-afiliacion",
]);

const MAX_EXPIRES_IN = 24 * 3600; // 24h

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 1) Validar JWT del caller
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "No autenticado" }, 401);
  }
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await supabaseAnon.auth.getUser();
  if (userErr || !userRes?.user) {
    return jsonResponse({ error: "No autenticado" }, 401);
  }
  const callerId = userRes.user.id;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("rol, estado")
    .eq("id", callerId)
    .maybeSingle();
  if (
    !profile ||
    profile.estado !== "activo" ||
    (profile.rol !== "admin" && profile.rol !== "operaciones")
  ) {
    return jsonResponse({ error: "Solo admin u operaciones pueden firmar URLs" }, 403);
  }

  // 2) Parsear input
  let body: { bucket?: string; path?: string; expires_in?: number };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body JSON invalido" }, 400);
  }
  const { bucket, path } = body;
  const expiresIn = Math.min(Number(body.expires_in ?? 3600), MAX_EXPIRES_IN);

  if (!bucket || !path) {
    return jsonResponse({ error: "Faltan bucket o path" }, 400);
  }
  if (!BUCKET_ALLOWLIST.has(bucket)) {
    return jsonResponse({ error: `Bucket no permitido: ${bucket}` }, 400);
  }
  if (path.includes("..") || path.startsWith("/")) {
    return jsonResponse({ error: "Path invalido" }, 400);
  }

  // 3) Generar signed URL
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    return jsonResponse({ error: `No se pudo firmar la URL: ${error?.message ?? "desconocido"}` }, 404);
  }

  return jsonResponse({ signedUrl: data.signedUrl });
});
