import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const allowedOrigins = new Set(["https://www.sumakecuador.lat", "https://sumak-mu.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"]);
let requestOrigin = "https://www.sumakecuador.lat";

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") ?? requestOrigin;
  requestOrigin = allowedOrigins.has(origin) ? origin : "https://www.sumakecuador.lat";
  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }
  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return jsonResponse({ error: "Empty token" }, 401);
  }

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userRes, error: userErr } = await supabaseAnon.auth.getUser(jwt);
  if (userErr || !userRes?.user) {
    return jsonResponse({ error: "Invalid token" }, 401);
  }
  const callerId = userRes.user.id;

  let body: { issuance_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  
  const { issuance_id, reason } = body;
  if (!issuance_id) {
    return jsonResponse({ error: "Missing issuance_id" }, 400);
  }
  if (!reason || reason.trim().length < 5) {
    return jsonResponse({ error: "A valid revocation reason is required (min 5 chars)" }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller is admin
  const { data: globalAdmin } = await supabaseAdmin
    .from("profiles")
    .select("rol")
    .eq("id", callerId)
    .eq("rol", "admin")
    .maybeSingle();
    
  const { data: staffRoles } = await supabaseAdmin
    .from("academy_roles")
    .select("role")
    .eq("user_id", callerId)
    .in("role", ["academy_admin"]);
    
  if (!globalAdmin && (!staffRoles || staffRoles.length === 0)) {
    return jsonResponse({ error: "Unauthorized. Only admins can revoke diplomas." }, 403);
  }

  // Fetch diploma
  const { data: diploma, error: dErr } = await supabaseAdmin
    .from("academy_diploma_issuances")
    .select("id, status, diploma_number, user_id")
    .eq("id", issuance_id)
    .maybeSingle();

  if (dErr || !diploma) {
    return jsonResponse({ error: "Diploma not found" }, 404);
  }

  if (diploma.status === "revoked") {
    return jsonResponse({ error: "Diploma is already revoked" }, 409);
  }

  // Revoke diploma
  const { error: updErr } = await supabaseAdmin
    .from("academy_diploma_issuances")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: callerId,
      revocation_reason: reason
    })
    .eq("id", issuance_id);

  if (updErr) {
    return jsonResponse({ error: "Failed to revoke diploma" }, 500);
  }

  // Log audit event
  await supabaseAdmin
    .from("academy_audit_logs")
    .insert({
      actor_id: callerId,
      action: "diploma_revoked",
      entity_type: "diploma",
      entity_id: issuance_id,
      metadata: {
        diploma_number: diploma.diploma_number,
        target_user: diploma.user_id,
        reason: reason
      }
    });

  return jsonResponse({
    ok: true,
    message: `Diploma ${diploma.diploma_number} has been revoked successfully.`
  });
});
