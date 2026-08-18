import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    return jsonResponse(req, { error: "Method not allowed", approved: false }, 405);
  }

  let payload: {
    id?: number | string;
    clientTxId?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Body JSON invalido", approved: false }, 400);
  }

  const id = Number(payload.id ?? 0);
  const clientTxId = String(payload.clientTxId ?? "").trim();

  if (!id || !clientTxId) {
    return jsonResponse(req, { error: "Faltan parámetros id o clientTxId", approved: false }, 200);
  }

  if (!PAYPHONE_TOKEN && (!PAYPHONE_CLIENT_ID || !PAYPHONE_SECRET_KEY)) {
    return jsonResponse(req, {
      error: "Payphone no está configurado en Supabase Secrets.",
      approved: false
    }, 200);
  }

  const verificationUrl = `${PAYPHONE_BASE_URL.replace(/\/$/, "")}/api/button/V2/Confirm`;

  try {
    const verificationResponse = await fetch(verificationUrl, {
      method: "POST",
      headers: buildPayphoneHeaders(),
      body: JSON.stringify({
        id,
        clientTxId,
      }),
    });

    const verificationJson = await verificationResponse.json().catch(() => ({}));
    
    // Si la respuesta no es 2xx o si transactionStatus no es Approved
    const isApproved = verificationResponse.ok && (
      verificationJson?.transactionStatus === "Approved" ||
      verificationJson?.status === "Approved" ||
      verificationJson?.statusCode === 3
    );

    const transactionStatus = String(
      verificationJson?.transactionStatus ||
      verificationJson?.status ||
      (isApproved ? "Approved" : "Declined")
    );

    const message = isApproved
      ? "Pago confirmado con Payphone"
      : (verificationJson?.message || "La transacción fue declinada por el banco o Payphone.");

    return jsonResponse(req, {
      id,
      clientTxId,
      approved: isApproved,
      status: transactionStatus,
      message,
      details: verificationJson
    }, 200);
  } catch (err) {
    return jsonResponse(req, {
      error: "Error de conexión con los servidores de Payphone",
      approved: false,
      status: "Error"
    }, 200);
  }
});
