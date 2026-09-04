import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGINS = new Set(["https://www.sumakecuador.lat", "https://sumak-mu.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"]);
function headers(req: Request) { const origin = req.headers.get("Origin") ?? ""; return { "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://www.sumakecuador.lat", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" }; }
function response(req: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: headers(req) }); }
async function hashToken(token: string) { const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)); return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "POST") return response(req, { error: "Method not allowed" }, 405);
  let body: { token?: string };
  try { body = await req.json(); } catch { return response(req, { error: "Invalid JSON body" }, 400); }
  const token = body.token?.trim() ?? "";
  if (token.length < 32 || token.length > 128) return response(req, { error: "Diploma not found" }, 404);
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: diploma } = await admin.from("academy_diploma_issuances").select("id, verified_pdf_path, status").eq("registration_source", "manual_qr").eq("verification_token_hash", await hashToken(token)).maybeSingle();
  if (!diploma || !diploma.verified_pdf_path) return response(req, { error: "Verified PDF not available" }, 404);
  const { data, error } = await admin.storage.from("academy-diplomas").createSignedUrl(diploma.verified_pdf_path, 300, { download: false });
  if (error || !data?.signedUrl) return response(req, { error: "Could not generate document URL" }, 500);
  await admin.from("academy_audit_logs").insert({ actor_id: null, action: "diploma_downloaded", entity_type: "diploma", entity_id: diploma.id, metadata: { registration_source: "manual_qr" } });
  return response(req, { ok: true, signed_url: data.signedUrl });
});