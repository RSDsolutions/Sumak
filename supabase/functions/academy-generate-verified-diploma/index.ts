import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return jsonResponse(req, { error: "Missing Authorization header" }, 401);
  const { data: authData, error: authError } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(authHeader.slice("Bearer ".length).trim());
  if (authError || !authData.user) return jsonResponse(req, { error: "Invalid token" }, 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const [{ data: globalAdmin }, { data: academyAdmin }] = await Promise.all([
    supabaseAdmin.from("profiles").select("rol").eq("id", authData.user.id).eq("rol", "admin").maybeSingle(),
    supabaseAdmin.from("academy_roles").select("role").eq("user_id", authData.user.id).eq("role", "academy_admin").is("revoked_at", null),
  ]);
  if (!globalAdmin && !(academyAdmin?.length)) return jsonResponse(req, { error: "Only Academy administrators can generate verified diplomas" }, 403);

  let body: { issuance_id?: string; x?: number; y?: number; size?: number };
  try { body = await req.json(); } catch { return jsonResponse(req, { error: "Invalid JSON body" }, 400); }
  if (!body.issuance_id) return jsonResponse(req, { error: "issuance_id is required" }, 400);

  const { data: issuance, error: issuanceError } = await supabaseAdmin.from("academy_diploma_issuances").select("id, diploma_number, verification_token, original_pdf_path, verified_pdf_path, participant_name, program_name, registration_source").eq("id", body.issuance_id).eq("registration_source", "manual_qr").maybeSingle();
  if (issuanceError || !issuance) return jsonResponse(req, { error: "Manual diploma not found" }, 404);
  if (!issuance.original_pdf_path || !issuance.verification_token) return jsonResponse(req, { error: "Original PDF is not ready" }, 409);
  if (issuance.verified_pdf_path) return jsonResponse(req, { ok: true, already_generated: true, verified_pdf_path: issuance.verified_pdf_path, verification_url: `https://www.sumakecuador.lat/verificar-diploma/${issuance.verification_token}` });

  const { data: original, error: downloadError } = await supabaseAdmin.storage.from("academy-diplomas").download(issuance.original_pdf_path);
  if (downloadError || !original) return jsonResponse(req, { error: "Could not read original PDF" }, 500);
  const originalBytes = new Uint8Array(await original.arrayBuffer());
  if (new TextDecoder().decode(originalBytes.slice(0, 5)) !== "%PDF-") return jsonResponse(req, { error: "Stored file is not a valid PDF" }, 400);

  const verificationUrl = `https://www.sumakecuador.lat/verificar-diploma/${issuance.verification_token}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "H", margin: 1, width: 420 });
  const qrBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (char) => char.charCodeAt(0));
  const pdf = await PDFDocument.load(originalBytes);
  const qrImage = await pdf.embedPng(qrBytes);
  const qrSize = Math.max(56, Math.min(Number(body.size ?? 84), 180));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const x = Math.max(8, Math.min(Number(body.x ?? 36), width - qrSize - 8));
    const y = Math.max(8, Math.min(Number(body.y ?? 36), height - qrSize - 8));
    page.drawImage(qrImage, { x, y, width: qrSize, height: qrSize });
    page.drawText("Verificar diploma", { x, y: Math.max(4, y - 12), size: 7, font, color: rgb(0.1, 0.3, 0.15) });
  }

  const verifiedBytes = await pdf.save();
  const verifiedPath = `manual/verificados/${issuance.id}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage.from("academy-diplomas").upload(verifiedPath, verifiedBytes, { contentType: "application/pdf", upsert: false });
  if (uploadError && uploadError.message.toLowerCase().includes("already exists")) return jsonResponse(req, { ok: true, already_generated: true, verified_pdf_path: verifiedPath, verification_url: verificationUrl });
  if (uploadError) return jsonResponse(req, { error: "Could not store verified PDF" }, 500);

  const { error: updateError } = await supabaseAdmin.from("academy_diploma_issuances").update({ verified_pdf_path: verifiedPath, pdf_storage_path: verifiedPath, qr_generated_at: new Date().toISOString(), metadata: { qr: { x: body.x ?? 36, y: body.y ?? 36, size: qrSize, url: verificationUrl }, source: "manual_qr" } }).eq("id", issuance.id);
  if (updateError) { await supabaseAdmin.storage.from("academy-diplomas").remove([verifiedPath]); return jsonResponse(req, { error: "Could not save verified PDF record" }, 500); }

  await supabaseAdmin.from("academy_audit_logs").insert({ actor_id: authData.user.id, action: "qr_generated", entity_type: "diploma", entity_id: issuance.id, metadata: { verified_pdf_path: verifiedPath, diploma_number: issuance.diploma_number } });
  await supabaseAdmin.from("academy_audit_logs").insert({ actor_id: authData.user.id, action: "verified_pdf_generated", entity_type: "diploma", entity_id: issuance.id, metadata: { diploma_number: issuance.diploma_number } });
  return jsonResponse(req, { ok: true, verified_pdf_path: verifiedPath, verification_url: verificationUrl });
});
