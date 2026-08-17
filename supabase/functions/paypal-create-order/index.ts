import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
const PAYPAL_BASE_URL = Deno.env.get("PAYPAL_BASE_URL") ?? "https://api-m.paypal.com";

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

  let payload: { orderId?: string; amount?: number | string; currency?: string; description?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Body JSON invalido" }, 400);
  }

  const orderId = String(payload.orderId ?? "").trim();
  const amount = Number(payload.amount ?? 0);
  const currency = String(payload.currency ?? "USD").trim().toUpperCase();
  const description = String(payload.description ?? "Compra Sumak").trim();

  if (!orderId || !Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({ error: "Faltan orderId o amount valido" }, 400);
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

  const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: orderId,
        description,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      }],
      application_context: {
        brand_name: "Sumak",
        user_action: "PAY_NOW",
        return_url: `${Deno.env.get("APP_URL") ?? "http://localhost:3000"}/checkout/return?provider=paypal&orderId=${encodeURIComponent(orderId)}`,
        cancel_url: `${Deno.env.get("APP_URL") ?? "http://localhost:3000"}/checkout/cancel?provider=paypal&orderId=${encodeURIComponent(orderId)}`,
      },
    }),
  });

  const orderJson = await orderResponse.json().catch(() => ({}));
  if (!orderResponse.ok) {
    return jsonResponse({ error: orderJson?.message ?? "No se pudo crear la orden de PayPal" }, orderResponse.status);
  }

  const approvalUrl = (orderJson?.links ?? []).find((link: Record<string, string>) => link.rel === "approve")?.href ?? null;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const paymentRow = {
    user_id: userData.user.id,
    pedido_id: null,
    afiliacion_id: null,
    provider: "paypal",
    payment_method: "paypal",
    amount,
    currency,
    status: "processing",
    transaction_id: String(orderJson?.id ?? ""),
    metadata: {
      orderId,
      description,
      providerResponse: orderJson,
    },
  };

  await supabaseAdmin.from("pagos").insert(paymentRow);

  return jsonResponse({
    orderId: orderJson?.id ?? null,
    approvalUrl,
    status: "processing",
  });
});
