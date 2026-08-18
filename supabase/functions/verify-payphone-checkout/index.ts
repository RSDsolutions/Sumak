import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  let payload: {
    id?: number | string;
    clientTxId?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Body JSON invalido" }, 400);
  }

  const id = Number(payload.id ?? 0);
  const clientTxId = String(payload.clientTxId ?? "").trim();

  if (!id || !clientTxId) {
    return jsonResponse(req, { error: "Faltan parámetros id o clientTxId" }, 400);
  }

  if (!PAYPHONE_TOKEN && (!PAYPHONE_CLIENT_ID || !PAYPHONE_SECRET_KEY)) {
    return jsonResponse(req, {
      error: "Payphone no configurado en Supabase Secrets.",
    }, 500);
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
    
    if (!verificationResponse.ok) {
      return jsonResponse(req, {
        error: verificationJson?.message ?? "La transacción fue declinada o no pudo ser verificada.",
        approved: false
      }, verificationResponse.status);
    }

    const confirmed = Boolean(verificationJson?.transactionStatus === "Approved");

    return jsonResponse(req, {
      id,
      clientTxId,
      approved: confirmed,
      status: verificationJson?.transactionStatus,
      message: confirmed ? "Pago aprobado" : "Pago rechazado o pendiente",
      details: verificationJson
    });
  } catch (err) {
    return jsonResponse(req, {
      error: "Error de red al conectar con Payphone",
      approved: false
    }, 500);
  }
});
