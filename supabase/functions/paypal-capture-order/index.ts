import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
const PAYPAL_BASE_URL = Deno.env.get("PAYPAL_BASE_URL") ?? "https://api-m.sandbox.paypal.com";

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

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Falta Authorization: Bearer <jwt>" }, 401);
  }

  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return jsonResponse({ error: "Token invalido" }, 401);
  }

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Token invalido o expirado" }, 401);
  }

  let payload: { orderId?: string; paymentId?: string; amount?: number | string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Body JSON invalido" }, 400);
  }

  const orderId = String(payload.orderId ?? "").trim();
  const paymentId = String(payload.paymentId ?? "").trim();
  const amount = Number(payload.amount ?? 0);

  if (!orderId && !paymentId) {
    return jsonResponse({ error: "Falta orderId o paymentId" }, 400);
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    return jsonResponse(
      {
        error: "PayPal no configurado. Define PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en Supabase Secrets.",
      },
      500,
    );
  }

  const tokenResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const tokenJson = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    return jsonResponse({ error: tokenJson?.error_description ?? "No se pudo autenticar con PayPal" }, tokenResponse.status);
  }

  const accessToken = String(tokenJson?.access_token ?? "").trim();
  if (!accessToken) {
    return jsonResponse({ error: "PayPal no devolvio access_token" }, 502);
  }

  const captureId = orderId || paymentId;
  const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(captureId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const captureJson = await captureResponse.json().catch(() => ({}));
  if (!captureResponse.ok) {
    return jsonResponse({ error: captureJson?.message ?? "No se pudo capturar la orden de PayPal" }, captureResponse.status);
  }

  const approved = captureJson?.status === "COMPLETED";
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: paymentRow, error: paymentError } = await supabaseAdmin
    .from("pagos")
    .select("id, user_id, amount, transaction_id, status")
    .or(`transaction_id.eq.${orderId},transaction_id.eq.${paymentId}`)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    return jsonResponse({ error: "Pago de PayPal no encontrado" }, 404);
  }

  if (paymentRow.user_id !== userData.user.id) {
    return jsonResponse({ error: "El pago no pertenece a este usuario" }, 403);
  }

  const result = await supabaseAdmin
    .from("pagos")
    .update({
      status: approved ? "approved" : "rejected",
      paid_at: approved ? new Date().toISOString() : null,
      metadata: {
        capture: captureJson,
      },
    })
    .eq("id", paymentRow.id)
    .select();

  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  return jsonResponse({
    status: approved ? "approved" : "rejected",
    paymentId: paymentRow.id,
    orderId,
    message: approved ? "Pago confirmado" : "Pago no confirmado",
  });
});
