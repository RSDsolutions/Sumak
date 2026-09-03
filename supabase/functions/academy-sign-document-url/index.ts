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

  let body: { issuance_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  
  const { issuance_id } = body;
  if (!issuance_id) {
    return jsonResponse({ error: "Missing issuance_id" }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: diploma, error: dErr } = await supabaseAdmin
    .from("academy_diploma_issuances")
    .select("user_id, pdf_storage_path, status")
    .eq("id", issuance_id)
    .maybeSingle();

  if (dErr || !diploma) {
    return jsonResponse({ error: "Diploma not found" }, 404);
  }

  // Only the owner or an admin can download the diploma
  if (diploma.user_id !== callerId) {
    const { data: staffRoles } = await supabaseAdmin
      .from("academy_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["academy_admin"]);
      
    const { data: globalAdmin } = await supabaseAdmin
      .from("profiles")
      .select("rol")
      .eq("id", callerId)
      .maybeSingle();

    const isGlobalAdmin = globalAdmin?.rol === "admin" || globalAdmin?.role === "admin";
    const isAcademyStaff = (staffRoles || []).some((role) => role.role === "academy_admin");
    if (!isGlobalAdmin && !isAcademyStaff) {
      return jsonResponse({ error: "Unauthorized to access this diploma" }, 403);
    }
  }

  // Create a signed URL valid for 60 seconds
  const { data: signedData, error: signErr } = await supabaseAdmin
    .storage
    .from("academy-diplomas")
    .createSignedUrl(diploma.pdf_storage_path, 60, {
      download: true
    });

  if (signErr || !signedData?.signedUrl) {
    return jsonResponse({ error: "Failed to generate signed URL" }, 500);
  }

  return jsonResponse({
    ok: true,
    signedUrl: signedData.signedUrl
  });
});
