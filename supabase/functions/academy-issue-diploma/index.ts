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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

  let body: { target_user_id?: string; diploma_type_id?: string; course_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  
  const target_user_id = body.target_user_id || callerId;
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

  const participantName = userProfile?.nombre_completo || userProfile?.username || userProfile?.codigo_distribuidor || "Estudiante";

  let programName = "Programa de Academia";
  if (course_id) {
    const { data: course } = await supabaseAdmin
      .from("academy_courses")
      .select("title")
      .eq("id", course_id)
      .maybeSingle();
    if (course) programName = course.title;
  }

  const { data: dtInfo } = await supabaseAdmin
    .from("academy_diploma_types")
    .select("name, template_version")
    .eq("id", diploma_type_id)
    .maybeSingle();

  const { data: template } = await supabaseAdmin
    .from("academy_diploma_templates")
    .select("*")
    .eq("diploma_type_id", diploma_type_id)
    .eq("version", dtInfo?.template_version || 1)
    .maybeSingle();

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
  
  // Try to load background image if URL provided (requires fetching the image)
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

  // Add text
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const title = (template.title_text || '{{diploma_type_name}}').replace('{{diploma_type_name}}', dtInfo?.name || '');
  page.drawText(title, { x: 50, y: height - 100, size: 36, font: boldFont, color: rgb(0, 0, 0) });
  
  const bodyText = (template.body_text || 'Por haber completado el curso {{course_name}}.')
    .replace('{{participant_name}}', participantName)
    .replace('{{course_name}}', programName);
  page.drawText(participantName, { x: 50, y: height - 200, size: 28, font: boldFont, color: rgb(0.1, 0.3, 0.15) });
  page.drawText(bodyText, { x: 50, y: height - 250, size: 18, font });

  // Verification info
  page.drawText(`Diploma N°: ${diplomaNumber}`, { x: 50, y: 50, size: 10, font });
  page.drawText(`Código de Verificación: ${verificationCode}`, { x: 50, y: 35, size: 10, font });

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
