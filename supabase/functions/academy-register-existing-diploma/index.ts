import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  "https://www.sumakecuador.lat",
  "https://sumak-mu.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://www.sumakecuador.lat",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isAdmin(supabaseAdmin: ReturnType<typeof createClient>, userId: string) {
  return Promise.all([
    supabaseAdmin.from("profiles").select("rol").eq("id", userId).eq("rol", "admin").maybeSingle(),
    supabaseAdmin.from("academy_roles").select("role").eq("user_id", userId).eq("role", "academy_admin").is("revoked_at", null),
  ]).then(([global, academy]) => Boolean(global.data) || (academy.data?.length ?? 0) > 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return jsonResponse(req, { error: "Missing Authorization header" }, 401);
  const jwt = authHeader.slice("Bearer ".length).trim();
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } = await supabaseAnon.auth.getUser(jwt);
  if (authError || !authData.user) return jsonResponse(req, { error: "Invalid token" }, 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  if (!(await isAdmin(supabaseAdmin, authData.user.id))) return jsonResponse(req, { error: "Only Academy administrators can register diplomas" }, 403);

  let form: FormData;
  try { form = await req.formData(); } catch { return jsonResponse(req, { error: "Invalid multipart form" }, 400); }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonResponse(req, { error: "A PDF file is required" }, 400);
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return jsonResponse(req, { error: "Only PDF files are accepted" }, 400);
  if (file.size <= 0 || file.size > MAX_PDF_BYTES) return jsonResponse(req, { error: "PDF exceeds the 15 MB limit" }, 400);

  const pdfBytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
  if (header !== "%PDF-") return jsonResponse(req, { error: "Invalid PDF signature" }, 400);

  const userId = String(form.get("user_id") ?? "").trim();
  const diplomaTypeId = String(form.get("diploma_type_id") ?? "").trim();
  const courseId = String(form.get("course_id") ?? "").trim() || null;
  const participantName = String(form.get("participant_name") ?? "").trim();
  const programName = String(form.get("program_name") ?? "").trim();
  const issuedAt = String(form.get("issued_at") ?? "").trim() || new Date().toISOString();
  const suppliedNumber = String(form.get("diploma_number") ?? "").trim();

  if (!userId || !diplomaTypeId || !participantName || !programName) return jsonResponse(req, { error: "user_id, diploma_type_id, participant_name and program_name are required" }, 400);
  if (Number.isNaN(Date.parse(issuedAt))) return jsonResponse(req, { error: "Invalid issued_at" }, 400);

  const [{ data: recipient }, { data: diplomaType }, { data: template }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("academy_diploma_types").select("id, name, template_version").eq("id", diplomaTypeId).eq("is_active", true).maybeSingle(),
    supabaseAdmin.from("academy_diploma_templates").select("id, version").eq("diploma_type_id", diplomaTypeId).eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!recipient) return jsonResponse(req, { error: "Recipient profile not found" }, 404);
  if (!diplomaType || !template) return jsonResponse(req, { error: "Active diploma type and template are required" }, 400);

  const token = randomToken();
  const tokenHash = await sha256(token);
  const internalId = crypto.randomUUID();
  const originalPath = `manual/originales/${internalId}.pdf`;
  const diplomaNumber = suppliedNumber || await supabaseAdmin.rpc("academy_next_diploma_number").then(({ data }) => data);
  if (!diplomaNumber) return jsonResponse(req, { error: "Could not generate diploma number" }, 500);
  const verificationCode = `SUMAK-${randomToken(9).slice(0, 12).toUpperCase()}`;
  const documentHash = await crypto.subtle.digest("SHA-256", pdfBytes).then((buffer) => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join(""));

  const { error: uploadError } = await supabaseAdmin.storage.from("academy-diplomas").upload(originalPath, pdfBytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) return jsonResponse(req, { error: "Could not store original PDF" }, 500);

  const { data: issuance, error: insertError } = await supabaseAdmin.from("academy_diploma_issuances").insert({
    diploma_number: diplomaNumber,
    verification_code: verificationCode,
    verification_token: token,
    verification_token_hash: tokenHash,
    registration_source: "manual_qr",
    user_id: userId,
    diploma_type_id: diplomaTypeId,
    template_id: template.id,
    course_id: courseId,
    participant_name: participantName,
    program_name: programName,
    document_hash: documentHash,
    hash_algorithm: "sha256",
    pdf_storage_path: originalPath,
    original_pdf_path: originalPath,
    template_version: template.version,
    issued_at: issuedAt,
    status: "issued",
    issued_by: authData.user.id,
  }).select("id, diploma_number, verification_code, verification_token, registration_source, status, issued_at").single();

  if (insertError || !issuance) {
    await supabaseAdmin.storage.from("academy-diplomas").remove([originalPath]);
    console.error("Manual diploma insert failed", insertError);
    return jsonResponse(req, { error: "Could not register diploma" }, 500);
  }

  await supabaseAdmin.from("academy_audit_logs").insert({
    actor_id: authData.user.id,
    action: "diploma_registered",
    entity_type: "diploma",
    entity_id: issuance.id,
    metadata: { registration_source: "manual_qr", diploma_number: issuance.diploma_number, target_user_id: userId },
  });

  return jsonResponse(req, { ok: true, issuance, verification_url: `https://www.sumakecuador.lat/verificar-diploma/${token}` });
});
