import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

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
  getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
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
      program_id?: string;
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
    program_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  
  const target_user_id = body.target_user_id || body.user_id || callerId;
  let { diploma_type_id, course_id } = body;
  const { program_id } = body;
  
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (program_id) {
    const { data: program } = await supabaseAdmin
      .from("academy_programs")
      .select("title, diploma_type_id")
      .eq("id", program_id)
      .eq("status", "published")
      .maybeSingle();
    if (!program) return jsonResponse({ error: "Program not found" }, 404);
    if (program.diploma_type_id && diploma_type_id && program.diploma_type_id !== diploma_type_id) {
      return jsonResponse({ error: "Diploma type does not match program" }, 400);
    }
    diploma_type_id = diploma_type_id || program.diploma_type_id || undefined;
    course_id = undefined;
  }
  if (!diploma_type_id) return jsonResponse({ error: "Missing diploma_type_id" }, 400);

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
    .eq("role", "academy_admin")
    .is("revoked_at", null);

  if (!globalAdmin && (!staffRoles || staffRoles.length === 0)) {
    return jsonResponse({ error: "Only Academy administrators can issue diplomas" }, 403);
  }

  // 1. Check Eligibility by calling our other Edge Function
  const { data: eligData, error: eligErr } = await supabaseAnon.functions.invoke('academy-check-eligibility', {
    body: { target_user_id, diploma_type_id, course_id, program_id },
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
  if (program_id) {
    const { data: program } = await supabaseAdmin.from("academy_programs").select("title").eq("id", program_id).maybeSingle();
    if (program) programName = program.title;
  }
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

    // Helpers
    const hexToRgbColor = (hex: string) => {
      hex = hex.replace(/^#/, '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const bigint = parseInt(hex, 16);
      const r = ((bigint >> 16) & 255) / 255;
      const g = ((bigint >> 8) & 255) / 255;
      const b = (bigint & 255) / 255;
      return rgb(r, g, b);
    };

    const getFont = (fStr: string) => {
      if (fStr === 'bold') return boldFont;
      if (fStr === 'italic') return italicFont;
      return font;
    };

    const drawDynamicText = (text: string, config: any) => {
      if (!config || config.visible === false) return;
      const f = getFont(config.font || 'normal');
      const size = config.size || 14;
      const color = hexToRgbColor(config.color || '#000000');
      
      const textWidth = f.widthOfTextAtSize(text, size);
      let renderX = config.x;
      
      if (config.align === 'center') {
        renderX = config.x - textWidth / 2;
      } else if (config.align === 'right') {
        renderX = config.x - textWidth;
      }

      const renderY = height - config.y;

      // Handle wrapping for long texts like body if max_width is provided
      if (config.max_width && textWidth > config.max_width) {
        drawWrappedCenteredText(page, text, renderY, size, f, color, width, config.max_width, 6);
      } else {
        page.drawText(text, { x: renderX, y: renderY, size, font: f, color });
      }
    };

    // Default config fallback if none exists
    const layoutConfig = template.layout_config || {
      "participant_name": { "x": width/2, "y": 290, "size": 36, "color": "#0a2213", "align": "center", "font": "bold", "visible": true },
      "course_name": { "x": width/2, "y": 380, "size": 24, "color": "#111111", "align": "center", "font": "bold", "visible": true },
      "issue_date": { "x": width/2, "y": 440, "size": 12, "color": "#333333", "align": "center", "font": "normal", "visible": true },
      "verification_text": { "x": width/2, "y": height - 45, "size": 9, "color": "#ab8224", "align": "center", "font": "normal", "visible": true }
    };

    // Render elements dynamically
    const dateText = `Emitido el ${new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    const footerText = `Diploma N° ${diplomaNumber}  |  Código de Verificación: ${verificationCode}`;

    if (layoutConfig.participant_name) drawDynamicText(participantName, layoutConfig.participant_name);
    if (layoutConfig.course_name) drawDynamicText(programName, layoutConfig.course_name);
    if (layoutConfig.issue_date) drawDynamicText(dateText, layoutConfig.issue_date);
    if (layoutConfig.verification_text) drawDynamicText(footerText, layoutConfig.verification_text);

    // QR Placeholder
    if (layoutConfig.qr_code && layoutConfig.qr_code.visible !== false) {
      const qx = layoutConfig.qr_code.x;
      const qy = height - layoutConfig.qr_code.y;
      const qsize = layoutConfig.qr_code.size || 80;
      page.drawRectangle({ x: qx, y: qy - qsize, width: qsize, height: qsize, borderColor: rgb(0,0,0), borderWidth: 1 });
      page.drawText("QR", { x: qx + qsize/2 - 10, y: qy - qsize/2, size: 10, font: font, color: rgb(0,0,0) });
    }

    // ----------------------------------------------------
    // FALLBACK DE BORDES SI NO HAY BACKGROUND
    // ----------------------------------------------------
    if (!template.background_image_url) {
      const ink = hexToRgbColor('#0a2213');
      const gold = hexToRgbColor('#ab8224');
      const mutedGold = hexToRgbColor('#d1b978');
      const margin = 24;

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

      drawDynamicText('ACADEMIA SUMAK', { x: width/2, y: 88, size: 42, font: 'bold', align: 'center', color: '#0a2213' });
      drawDynamicText('SUMAK VIDA ECUADOR S.A.', { x: width/2, y: 108, size: 10, font: 'bold', align: 'center', color: '#ab8224' });
    }

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
    console.error("Failed to upload diploma PDF", uploadErr);
    return jsonResponse({ error: "Failed to upload diploma PDF" }, 500);
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
    console.error("Failed to save diploma record", insertErr);
    await supabaseAdmin.storage.from("academy-diplomas").remove([pdfStoragePath]);
    if (insertErr?.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("academy_diploma_issuances")
        .select("id, diploma_number, verification_code, course_id")
        .eq("user_id", target_user_id)
        .eq("diploma_type_id", diploma_type_id)
        .not("status", "in", "(revoked,superseded,invalidated)")
        .limit(20);
      const sameDiploma = existing?.find((item) => item.course_id === (course_id || null));
      if (sameDiploma) return jsonResponse({ ok: true, already_issued: true, ...sameDiploma });
    }
    return jsonResponse({ error: "Failed to save diploma record" }, 500);
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
