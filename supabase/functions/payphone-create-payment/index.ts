import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYPHONE_CLIENT_ID = Deno.env.get("PAYPHONE_CLIENT_ID") ?? "";
const PAYPHONE_SECRET_KEY = Deno.env.get("PAYPHONE_SECRET_KEY") ?? "";
const PAYPHONE_BASE_URL = Deno.env.get("PAYPHONE_BASE_URL") ?? "https://api.payphone.com.ec";

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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: {
    orderId?: string;
    amount?: number | string;
    currency?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };

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

  if (!PAYPHONE_CLIENT_ID || !PAYPHONE_SECRET_KEY) {
    return jsonResponse(
      {
        error: "Payphone no configurado. Define PAYPHONE_CLIENT_ID y PAYPHONE_SECRET_KEY en Supabase Secrets.",
      },
      500,
    );
  }

  const amountCents = Number(amount.toFixed(2));
  const paymentRow = {
    user_id: userData.user.id,
    pedido_id: null,
    afiliacion_id: null,
    provider: "payphone",
    payment_method: "payphone",
    amount: amountCents,
    currency,
    status: "processing",
    metadata: {
      orderId,
      description,
      createdFrom: "edge-function",
      provider: "payphone",
    },
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("pagos")
    .insert(paymentRow)
    .select("id, user_id, amount, currency, status")
    .single();

  if (insertError || !inserted) {
    return jsonResponse({ error: `No se pudo crear el registro de pago: ${insertError?.message ?? "desconocido"}` }, 500);
  }

  const providerRequest = {
    orderId,
    amount: amountCents,
    currency,
    description,
    customer: {
      userId: userData.user.id,
      email: userData.user.email ?? "",
    },
    metadata: {
      sumakOrderId: orderId,
      sumakUserId: userData.user.id,
    },
  };

  const providerResponse = await fetch(`${PAYPHONE_BASE_URL}/api/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${PAYPHONE_CLIENT_ID}:${PAYPHONE_SECRET_KEY}`)}`,
      Accept: "application/json",
    },
    body: JSON.stringify(providerRequest),
  });

  const providerJson = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok) {
    await supabaseAdmin
      .from("pagos")
      .update({
        status: "rejected",
        metadata: {
          ...paymentRow.metadata,
          providerError: providerJson,
        },
      })
      .eq("id", inserted.id);

    return jsonResponse(
      {
        error: providerJson?.message ?? "Payphone rechazó la creación del pago",
      },
      providerResponse.status,
    );
  }

  const providerTransactionId = String(
    providerJson?.transactionId ?? providerJson?.id ?? providerJson?.paymentId ?? "",
  ).trim();

  const redirectUrl = String(
    providerJson?.redirectUrl ?? providerJson?.checkoutUrl ?? providerJson?.paymentUrl ?? "",
  ).trim();

  await supabaseAdmin
    .from("pagos")
    .update({
      transaction_id: providerTransactionId || null,
      metadata: {
        ...paymentRow.metadata,
        providerResponse: providerJson,
      },
      status: providerTransactionId ? "processing" : "pending",
    })
    .eq("id", inserted.id);

  return jsonResponse({
    paymentId: inserted.id,
    transactionId: providerTransactionId || null,
    redirectUrl: redirectUrl || null,
    status: providerTransactionId ? "processing" : "pending",
  });
});
