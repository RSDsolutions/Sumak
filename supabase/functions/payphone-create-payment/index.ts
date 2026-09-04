import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYPHONE_CLIENT_ID = Deno.env.get("PAYPHONE_CLIENT_ID") ?? "";
const PAYPHONE_SECRET_KEY = Deno.env.get("PAYPHONE_SECRET_KEY") ?? "";
const PAYPHONE_TOKEN = Deno.env.get("PAYPHONE_TOKEN") ?? "";
const PAYPHONE_STORE_ID = Deno.env.get("PAYPHONE_STORE_ID") ?? "";
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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: {
    orderId?: string;
    amount?: number | string;
    currency?: string;
    description?: string;
    academyEnrollmentId?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Body JSON invalido" }, 400);
  }

  const orderId = String(payload.orderId ?? "").trim();
  const amount = Number(payload.amount ?? 0);
  const currency = String(payload.currency ?? "USD").trim().toUpperCase();
  const description = String(payload.description ?? "Compra Sumak").trim();
  const academyEnrollmentId = String(payload.academyEnrollmentId ?? "").trim();

  if (!orderId || !Number.isFinite(amount) || amount <= 0) {
    return jsonResponse(req, { error: "Faltan orderId o amount valido" }, 400);
  }

  if (!PAYPHONE_TOKEN && (!PAYPHONE_CLIENT_ID || !PAYPHONE_SECRET_KEY)) {
    return jsonResponse(req, {
      error: "Payphone no configurado. Define PAYPHONE_TOKEN o PAYPHONE_CLIENT_ID + PAYPHONE_SECRET_KEY en Supabase Secrets.",
    }, 500);
  }

  if (!PAYPHONE_STORE_ID) {
    return jsonResponse(req, {
      error: "Payphone no configurado. Define PAYPHONE_STORE_ID en Supabase Secrets para crear links de pago.",
    }, 500);
  }

  if (academyEnrollmentId) {
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("academy_enrollments")
      .select("id, status, course:course_id (price)")
      .eq("id", academyEnrollmentId)
      .eq("user_id", userData.user.id)
      .eq("status", "payment_pending")
      .single();
    const course = enrollment?.course as { price?: number | null } | null;
    if (enrollmentError || !enrollment || !course || course.price === null || course.price === undefined || course.price <= 0) {
      return jsonResponse(req, { error: "La inscripción Academy no está lista para pago." }, 409);
    }
    if (Math.round(amount * 100) !== Math.round(Number(course.price) * 100)) {
      return jsonResponse(req, { error: "El monto no coincide con el precio del curso." }, 400);
    }
  }

  const amountCents = Math.round(Number((Number(amount) * 100).toFixed(0)));
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
      academyEnrollmentId: academyEnrollmentId || null,
    },
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("pagos")
    .insert(paymentRow)
    .select("id, user_id, amount, currency, status")
    .single();

  if (insertError || !inserted) {
    return jsonResponse(req, { error: `No se pudo crear el registro de pago: ${insertError?.message ?? "desconocido"}` }, 500);
  }

  if (academyEnrollmentId) {
    const { error: linkError } = await supabaseAdmin
      .from("academy_enrollments")
      .update({ payment_id: inserted.id })
      .eq("id", academyEnrollmentId)
      .eq("user_id", userData.user.id)
      .eq("status", "payment_pending");
    if (linkError) {
      await supabaseAdmin.from("pagos").delete().eq("id", inserted.id);
      return jsonResponse(req, { error: "No se pudo vincular el pago con la inscripción Academy." }, 500);
    }
  }

  const appUrl = (Deno.env.get("APP_URL") ?? "https://www.sumakecuador.lat").replace(/\/$/, "");
  const returnUrl = `${appUrl}/checkout/return?provider=payphone&orderId=${encodeURIComponent(orderId)}`;
  const cancelUrl = `${appUrl}/checkout/cancel?provider=payphone&orderId=${encodeURIComponent(orderId)}`;

  const providerRequest = {
    amount: amountCents,
    currency,
    reference: description || `Pedido ${orderId}`,
    clientTransactionId: orderId,
    storeId: PAYPHONE_STORE_ID,
    additionalData: JSON.stringify({
      sumakOrderId: orderId,
      sumakUserId: userData.user.id,
      returnUrl,
      cancelUrl,
    }),
    oneTime: true,
    expireIn: 0,
    isAmountEditable: false,
  };

  const providerResponse = await fetch(`${PAYPHONE_BASE_URL.replace(/\/$/, "")}/api/Links`, {
    method: "POST",
    headers: buildPayphoneHeaders(),
    body: JSON.stringify(providerRequest),
  });

  const providerText = await providerResponse.text();
  let providerJson: Record<string, unknown> = {};
  if (providerText) {
    try {
      providerJson = JSON.parse(providerText) as Record<string, unknown>;
    } catch {
      providerJson = { rawText: providerText, url: providerText };
    }
  }

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

    return jsonResponse(req, {
      error: (providerJson as Record<string, unknown>)?.message ?? "Payphone rechazó la creación del pago",
    }, providerResponse.status);
  }

  const providerTransactionId = String(
    providerJson?.transactionId ?? providerJson?.id ?? providerJson?.paymentId ?? providerJson?.clientTransactionId ?? "",
  ).trim();

  const redirectUrl = String(
    providerJson?.redirectUrl ??
      providerJson?.checkoutUrl ??
      providerJson?.paymentUrl ??
      providerJson?.url ??
      providerJson?.link ??
      providerJson?.data ??
      providerJson?.rawText ??
      "",
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

  return jsonResponse(req, {
    paymentId: inserted.id,
    transactionId: providerTransactionId || null,
    redirectUrl: redirectUrl || null,
    status: providerTransactionId ? "processing" : "pending",
  });
});
