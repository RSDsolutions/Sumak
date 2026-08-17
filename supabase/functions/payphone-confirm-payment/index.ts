import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYPHONE_CLIENT_ID = Deno.env.get("PAYPHONE_CLIENT_ID") ?? "";
const PAYPHONE_SECRET_KEY = Deno.env.get("PAYPHONE_SECRET_KEY") ?? "";
const PAYPHONE_TOKEN = Deno.env.get("PAYPHONE_TOKEN") ?? "";
const PAYPHONE_BASE_URL = Deno.env.get("PAYPHONE_BASE_URL") ?? "https://pay.payphonetodoesposible.com";

function buildPayphoneHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (PAYPHONE_TOKEN.trim()) {
    headers.Authorization = `Bearer ${PAYPHONE_TOKEN.trim()}`;
    return headers;
  }

  if (PAYPHONE_CLIENT_ID.trim() && PAYPHONE_SECRET_KEY.trim()) {
    headers.Authorization = `Basic ${btoa(`${PAYPHONE_CLIENT_ID.trim()}:${PAYPHONE_SECRET_KEY.trim()}`)}`;
  }

  return headers;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*";
  const allowOrigin = origin === "null" ? "*" : origin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse(req, { error: "Falta Authorization: Bearer <jwt>" }, 401);
  }

  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return jsonResponse(req, { error: "Token invalido" }, 401);
  }

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return jsonResponse(req, { error: "Token invalido o expirado" }, 401);
  }

  let payload: {
    paymentId?: string;
    transactionId?: string;
    orderId?: string;
    amount?: number | string;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Body JSON invalido" }, 400);
  }

  const paymentId = String(payload.paymentId ?? "").trim();
  const transactionId = String(payload.transactionId ?? "").trim();
  const orderId = String(payload.orderId ?? "").trim();
  const amount = Number(payload.amount ?? 0);

  if (!paymentId && !transactionId) {
    return jsonResponse(req, { error: "Falta paymentId o transactionId" }, 400);
  }

  if (!PAYPHONE_TOKEN && (!PAYPHONE_CLIENT_ID || !PAYPHONE_SECRET_KEY)) {
    return jsonResponse(req, {
      error: "Payphone no configurado. Define PAYPHONE_TOKEN o PAYPHONE_CLIENT_ID + PAYPHONE_SECRET_KEY en Supabase Secrets.",
    }, 500);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: paymentRow, error: paymentError } = await supabaseAdmin
    .from("pagos")
    .select("id, user_id, amount, transaction_id, metadata, status")
    .or(`id.eq.${paymentId},transaction_id.eq.${transactionId}`)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    return jsonResponse(req, { error: "Pago no encontrado" }, 404);
  }

  if (paymentRow.user_id !== userData.user.id) {
    return jsonResponse(req, { error: "El pago no pertenece a este usuario" }, 403);
  }

  const verificationUrl = `${PAYPHONE_BASE_URL.replace(/\/$/, "")}/api/Links/verify`;

  const verificationResponse = await fetch(verificationUrl, {
    method: "POST",
    headers: buildPayphoneHeaders(),
    body: JSON.stringify({
      paymentId: paymentId || paymentRow.id,
      transactionId,
      orderId,
      amount: amount || Number(paymentRow.amount),
    }),
  });

  const verificationJson = await verificationResponse.json().catch(() => ({}));
  if (!verificationResponse.ok) {
    return jsonResponse(req, {
      error: verificationJson?.message ?? "No se pudo verificar el pago con Payphone",
    }, verificationResponse.status);
  }

  const confirmed = Boolean(verificationJson?.approved ?? verificationJson?.status === "approved");
  const newStatus = confirmed ? "approved" : paymentRow.status;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("pagos")
    .update({
      status: newStatus,
      paid_at: confirmed ? new Date().toISOString() : null,
      metadata: {
        ...((paymentRow.metadata as Record<string, unknown>) ?? {}),
        verification: verificationJson,
      },
    })
    .eq("id", paymentRow.id)
    .select("id, status, paid_at")
    .single();

  if (updateError || !updated) {
    return jsonResponse(req, { error: `No se pudo actualizar el pago: ${updateError?.message ?? "desconocido"}` }, 500);
  }

  return jsonResponse(req, {
    paymentId: paymentRow.id,
    status: updated.status,
    approved: confirmed,
    message: confirmed ? "Pago confirmado por Payphone" : "Pago pendiente de confirmaci?n",
  });
});
