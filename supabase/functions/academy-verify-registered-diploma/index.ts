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
  if (token.length < 32 || token.length > 128) return response(req, { found: false, status: "NOT_FOUND" });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const tokenHash = await hashToken(token);
  const { data: diploma, error } = await supabaseAdmin.from("academy_diploma_issuances").select("id, diploma_number, participant_name, program_name, course_id, diploma_type_id, issued_at, status, verified_pdf_path, original_pdf_path").eq("registration_source", "manual_qr").eq("verification_token_hash", tokenHash).maybeSingle();
  if (error || !diploma) return response(req, { found: false, status: "NOT_FOUND" });
  const [{ data: type }, { data: course }] = await Promise.all([
    supabaseAdmin.from("academy_diploma_types").select("name").eq("id", diploma.diploma_type_id).maybeSingle(),
    diploma.course_id ? supabaseAdmin.from("academy_courses").select("title").eq("id", diploma.course_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  await supabaseAdmin.from("academy_audit_logs").insert({ actor_id: null, action: "diploma_verified", entity_type: "diploma", entity_id: diploma.id, metadata: { registration_source: "manual_qr", diploma_number: diploma.diploma_number, status: diploma.status } });
  return response(req, { found: true, status: diploma.status === "revoked" ? "REVOKED" : ["superseded", "invalidated"].includes(diploma.status) ? "NOT_CURRENT" : "VALID", diploma_number: diploma.diploma_number, participant_name: diploma.participant_name, program_name: diploma.program_name, course_name: course?.title ?? null, diploma_type: type?.name ?? null, issued_at: diploma.issued_at, document_available: Boolean(diploma.verified_pdf_path) });
});
