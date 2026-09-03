import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  
  const { token } = body;
  if (!token) {
    return jsonResponse({ error: "Missing verification token" }, 400);
  }

  // Use anon key for public verification
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabaseAnon.rpc('verify_diploma_public', { p_token: token });

  if (error) {
    return jsonResponse({ error: "Error verifying diploma" }, 500);
  }

  return jsonResponse(data);
});
