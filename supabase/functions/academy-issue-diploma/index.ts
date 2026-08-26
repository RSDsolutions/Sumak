import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Generate a random string of specific length using CSPRNG
function generateRandomString(length: number, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

// Format verification code like: 8F4K-29PX-7Q2M
function generateVerificationCode(): string {
  const p1 = generateRandomString(4);
  const p2 = generateRandomString(4);
  const p3 = generateRandomString(4);
  return `${p1}-${p2}-${p3}`;
}

async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function drawCenteredText(page: any, text: string, y: number, size: number, font: any, color: any, pageWidth: number) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (pageWidth - textWidth) / 2, y, size, font, color });
}

function drawCenteredAt(page: any, text: string, centerX: number, y: number, size: number, font: any, color: any) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - textWidth / 2, y, size, font, color });
}

function drawWrappedCenteredText(page: any, text: string, y: number, size: number, font: any, color: any, pageWidth: number, maxWidth: number, lineGap = 7) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  lines.forEach((lineText, index) => drawCenteredText(page, lineText, y - index * (size + lineGap), size, font, color, pageWidth));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    let body: {
      target_user_id?: string;
      user_id?: string;
      diploma_type_id?: string;
      course_id?: string | null;
      participant_name?: string;
      program_name?: string;
    };
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

  let body: {
    target_user_id?: string;
    user_id?: string;
    diploma_type_id?: string;
    course_id?: string | null;
    participant_name?: string;
    program_name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  
  const target_user_id = body.target_user_id || body.user_id || callerId;
  const { diploma_type_id, course_id } = body;
  
  if (!diploma_type_id) {
    return jsonResponse({ error: "Missing diploma_type_id" }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify permissions if checking someone else
  if (target_user_id !== callerId) {
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
      return jsonResponse({ error: "Unauthorized to issue diploma for other users" }, 403);
    }
  }

  // 1. Check Eligibility by calling our other Edge Function
  const { data: eligData, error: eligErr } = await supabaseAnon.functions.invoke('academy-check-eligibility', {
    body: { target_user_id, diploma_type_id, course_id },
    headers: { Authorization: authHeader } // pass through auth
  });

  if (eligErr || !eligData) {
    return jsonResponse({ error: "Error checking eligibility" }, 500);
  }

  if (eligData.eligible === false) {
    if (eligData.existing_diploma_id) {
      return jsonResponse({
        error: "Diploma already exists.",
        existing_diploma_id: eligData.existing_diploma_id
      }, 409);
    }
    return jsonResponse({ error: "User is not eligible.", reasons: eligData.reasons }, 403);
  }

  // 2. Gather data for diploma
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("nombre_completo, username, codigo_distribuidor")
    .eq("id", target_user_id)
    .maybeSingle();

  const participantName = body.participant_name?.trim()
    || userProfile?.nombre_completo
    || userProfile?.username
    || userProfile?.codigo_distribuidor
    || "Estudiante";
  let programName = body.program_name?.trim() || "Programa de Academia";
  if (course_id) {
    const { data: course } = await supabaseAdmin
      .from("academy_courses")
      .select("title")
      .eq("id", course_id)
      .maybeSingle();
    if (course) programName = course.title;
  }

  const { data: dtInfo, error: dtInfoErr } = await supabaseAdmin
    .from("academy_diploma_types")
    .select("name, template_version")
    .eq("id", diploma_type_id)
    .maybeSingle();

  if (dtInfoErr || !dtInfo) {
    return jsonResponse({ error: "Diploma type not found" }, 404);
  }

  const { data: versionedTemplate } = await supabaseAdmin
    .from("academy_diploma_templates")
    .select("*")
    .eq("diploma_type_id", diploma_type_id)
    .eq("version", dtInfo?.template_version || 1)
    .eq("is_active", true)
    .maybeSingle();

  // A type can point to an old version after templates were edited. Use the
  // newest active version rather than blocking manual issuance.
  let template = versionedTemplate;
  if (!template) {
    const { data: latestTemplate } = await supabaseAdmin
      .from("academy_diploma_templates")
      .select("*")
      .eq("diploma_type_id", diploma_type_id)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    template = latestTemplate;
  }

  if (!template) {
    return jsonResponse({ error: "Active template not found for this diploma type" }, 500);
  }

  // 3. Generate Codes
  const verificationCode = generateVerificationCode();
  const verificationToken = generateRandomString(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  
  // Call RPC to get next diploma number
  const { data: diplomaNumber, error: seqErr } = await supabaseAdmin.rpc('academy_next_diploma_number');
  if (seqErr || !diplomaNumber) {
    return jsonResponse({ error: "Error generating diploma number" }, 500);
  }

  // 4. Generate PDF using pdf-lib
  const pdfDoc = await PDFDocument.create();
  let width = 841.89; // A4 landscape
  let height = 595.28;
  if (template.page_size === 'letter') {
    width = 792;
    height = 612;
  }
  if (template.orientation === 'portrait') {
    const temp = width;
    width = height;
    height = temp;
  }

  const page = pdfDoc.addPage([width, height]);
  
  const ink = rgb(0.08, 0.22, 0.13);
  const gold = rgb(0.67, 0.51, 0.14);
  const mutedGold = rgb(0.82, 0.73, 0.47);
  const paper = rgb(0.98, 0.96, 0.88);
  const textColor = rgb(0.15, 0.15, 0.13);

  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });

  // Try to load a custom background image if one is configured.
  if (template.background_image_url) {
    try {
      const imgRes = await fetch(template.background_image_url);
      if (imgRes.ok) {
        const imgBytes = await imgRes.arrayBuffer();
        let bgImage;
        if (template.background_image_url.endsWith('.png')) {
          bgImage = await pdfDoc.embedPng(imgBytes);
        } else {
          bgImage = await pdfDoc.embedJpg(imgBytes);
        }
        page.drawImage(bgImage, { x: 0, y: 0, width, height });
      }
    } catch (e) {
      console.warn("Failed to load background image", e);
    }
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 24;

  // Layered frame and corner ornaments give the generated certificate its
  // printable ceremonial layout without requiring an uploaded PDF template.
  page.drawRectangle({ x: margin, y: margin, width: width - margin * 2, height: height - margin * 2, borderColor: ink, borderWidth: 5 });
  page.drawRectangle({ x: margin + 12, y: margin + 12, width: width - (margin + 12) * 2, height: height - (margin + 12) * 2, borderColor: gold, borderWidth: 1.5 });
  page.drawRectangle({ x: margin + 22, y: margin + 22, width: width - (margin + 22) * 2, height: height - (margin + 22) * 2, borderColor: mutedGold, borderWidth: 0.7 });
  for (const corner of [[margin + 18, height - margin - 18], [width - margin - 18, height - margin - 18], [margin + 18, margin + 18], [width - margin - 18, margin + 18]]) {
    const [x, y] = corner;
    page.drawCircle({ x, y, size: 8, borderColor: gold, borderWidth: 1.5 });
    page.drawCircle({ x, y, size: 3, color: gold });
    page.drawLine({ start: { x: x - 18, y }, end: { x: x + 18, y }, thickness: 1, color: gold });
    page.drawLine({ start: { x, y: y - 18 }, end: { x, y: y + 18 }, thickness: 1, color: gold });
  }

  // Brand lockup.
  drawCenteredText(page, 'SUMAK', height - 88, 42, boldFont, ink, width);
  drawCenteredText(page, 'VIDA ECUADOR S.A.', height - 108, 10, boldFont, gold, width);
  page.drawLine({ start: { x: width / 2 - 125, y: height - 126 }, end: { x: width / 2 + 125, y: height - 126 }, thickness: 1.2, color: gold });

  const title = (template.title_text || '{{diploma_type_name}}').replace('{{diploma_type_name}}', dtInfo?.name || '');
  drawCenteredText(page, title.toUpperCase(), height - 172, 28, boldFont, ink, width);
  drawCenteredText(page, template.subtitle_text || 'ACADEMIA SUMAK', height - 195, 11, font, gold, width);
  page.drawLine({ start: { x: width / 2 - 75, y: height - 211 }, end: { x: width / 2 + 75, y: height - 211 }, thickness: 1, color: mutedGold });

  drawCenteredText(page, 'Se certifica que:', height - 246, 13, font, textColor, width);
  drawCenteredText(page, participantName, height - 292, 25, boldFont, ink, width);
  page.drawLine({ start: { x: width / 2 - 190, y: height - 305 }, end: { x: width / 2 + 190, y: height - 305 }, thickness: 1, color: gold });

  const bodyText = (template.body_text || 'Por haber completado el curso {{course_name}}.')
    .replace('{{participant_name}}', participantName)
    .replace('{{course_name}}', programName);
  drawWrappedCenteredText(page, bodyText, height - 342, 13, font, textColor, width, width - 180, 6);

  const dateText = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
  drawCenteredText(page, `Emitido el ${dateText}`, height - 430, 11, font, textColor, width);

  const signatureY = 92;
  page.drawLine({ start: { x: 120, y: signatureY }, end: { x: 310, y: signatureY }, thickness: 1, color: ink });
  page.drawLine({ start: { x: width - 310, y: signatureY }, end: { x: width - 120, y: signatureY }, thickness: 1, color: ink });
  drawCenteredAt(page, template.signatory_name || 'Dr. Luis Paredes', width / 2 - 215, signatureY - 18, 11, boldFont, textColor);
  drawCenteredAt(page, 'Estudiante', width / 2 + 215, signatureY - 18, 11, font, textColor);
  drawCenteredAt(page, template.signatory_title || 'Formador de formadores', width / 2 - 215, signatureY - 33, 9, font, textColor);
  drawCenteredAt(page, 'Participante', width / 2 + 215, signatureY - 33, 9, font, textColor);

  // Verification info
  drawCenteredText(page, `Diploma N° ${diplomaNumber}  ·  Código ${verificationCode}`, 42, 8, font, gold, width);

  const pdfBytes = await pdfDoc.save();

  // 5. Calculate SHA-256
  const documentHash = await sha256(pdfBytes);
  const pdfStoragePath = `${new Date().getFullYear()}/${target_user_id}/${diplomaNumber}.pdf`;

  // 6. Upload to Storage (academy-diplomas bucket is private)
  const { error: uploadErr } = await supabaseAdmin
    .storage
    .from("academy-diplomas")
    .upload(pdfStoragePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false
    });

  if (uploadErr) {
    return jsonResponse({ error: "Failed to upload diploma PDF", details: uploadErr }, 500);
  }

  // 7. Insert to Database
  const { data: newDiploma, error: insertErr } = await supabaseAdmin
    .from("academy_diploma_issuances")
    .insert({
      diploma_number: diplomaNumber,
      verification_code: verificationCode,
      verification_token: verificationToken,
      user_id: target_user_id,
      diploma_type_id: diploma_type_id,
      template_id: template.id,
      course_id: course_id || null,
      participant_name: participantName,
      program_name: programName,
      document_hash: documentHash,
      hash_algorithm: "sha256",
      pdf_storage_path: pdfStoragePath,
      template_version: template.version,
      status: "issued",
      issued_by: callerId
    })
    .select()
    .single();

  if (insertErr || !newDiploma) {
    return jsonResponse({ error: "Failed to save diploma record", details: insertErr }, 500);
  }

  // 8. Log audit event
  await supabaseAdmin
    .from("academy_audit_logs")
    .insert({
      actor_id: callerId,
      action: "diploma_issued",
      entity_type: "diploma",
      entity_id: newDiploma.id,
      metadata: {
        diploma_number: diplomaNumber,
        target_user: target_user_id,
        course: course_id
      }
    });

  return jsonResponse({
    ok: true,
    diploma_number: diplomaNumber,
    verification_code: verificationCode,
    verification_token: verificationToken,
    id: newDiploma.id
  });
});
