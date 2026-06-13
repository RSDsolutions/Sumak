// ============================================================
// SUMAK — Edge Function: approve-afiliacion
// ============================================================
// Reemplaza al codigo cliente-side de SolicitudDetalle.tsx que
// usaba supabaseAdmin con service_role expuesto en el bundle.
//
// Flujo:
//   1. Valida JWT del caller -> debe ser admin
//   2. Pre-check: cedula y email no existen ya en profiles
//   3. Genera password temporal crypto-random
//   4. auth.admin.createUser (server-side, service_role NO expuesta)
//   5. Llama RPC public.approve_afiliacion atomica
//   6. Si la RPC falla -> auth.admin.deleteUser (rollback)
//   7. Devuelve { codigo, tempPassword }
//
// Input (POST JSON):
//   {
//     afiliacion_id: uuid,
//     codigo: text,             // SUMAK-XXXXX
//     padre_profile_id?: uuid,  // opcional
//     abrir_como_frontal?: bool // opcional, default false
//   }
//
// Output:
//   200 -> { ok: true, codigo, tempPassword, pedido_id }
//   401 -> no autenticado
//   403 -> no es admin
//   400/409 -> validacion / pre-check
//   500 -> error interno
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS basico — el frontend de Sumak vive en el mismo origen Supabase
// pero el browser exige preflight para preflight OPTIONS.
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

// Genera password temporal de ~14 chars con entropia crypto.
function generateTempPassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += charset[b % charset.length];
  return "Sumak" + s + "!";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 1) Validar JWT del caller y obtener rol
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "No autenticado" }, 401);
  }
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await supabaseAnon.auth.getUser();
  if (userErr || !userRes?.user) {
    return jsonResponse({ error: "No autenticado" }, 401);
  }
  const callerId = userRes.user.id;

  // Cliente con service_role para todo lo demas (server-side, nunca llega al browser)
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("rol, estado")
    .eq("id", callerId)
    .maybeSingle();
  if (!callerProfile || callerProfile.rol !== "admin" || callerProfile.estado !== "activo") {
    return jsonResponse({ error: "Solo admin puede aprobar afiliaciones" }, 403);
  }

  // 2) Parsear body
  let body: {
    afiliacion_id?: string;
    codigo?: string;
    padre_profile_id?: string | null;
    abrir_como_frontal?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body JSON invalido" }, 400);
  }
  const { afiliacion_id, codigo, padre_profile_id, abrir_como_frontal } = body;
  if (!afiliacion_id || !codigo) {
    return jsonResponse({ error: "Faltan afiliacion_id o codigo" }, 400);
  }

  // 3) Cargar afiliacion y pre-checks
  const { data: afiliacion, error: aErr } = await supabaseAdmin
    .from("afiliaciones")
    .select("*")
    .eq("id", afiliacion_id)
    .maybeSingle();
  if (aErr || !afiliacion) {
    return jsonResponse({ error: "Afiliacion no encontrada" }, 404);
  }
  if (afiliacion.estado !== "pendiente") {
    return jsonResponse({ error: `La afiliacion ya esta en estado ${afiliacion.estado}` }, 409);
  }

  // Pre-check cedula
  const { data: existingByCedula } = await supabaseAdmin
    .from("profiles")
    .select("id, codigo_distribuidor, nombre_completo, email, estado")
    .eq("cedula", afiliacion.cedula)
    .maybeSingle();
  if (existingByCedula) {
    return jsonResponse({
      error:
        `Ya existe un distribuidor con la cedula ${afiliacion.cedula}: ` +
        `${existingByCedula.codigo_distribuidor} - ${existingByCedula.nombre_completo} ` +
        `(${existingByCedula.email}, estado: ${existingByCedula.estado}). ` +
        `Si fue un intento previo que fallo a medias, elimina ese perfil ` +
        `desde 'Distribuidores' antes de reintentar.`,
    }, 409);
  }

  // Pre-check email
  const { data: existingByEmail } = await supabaseAdmin
    .from("profiles")
    .select("id, codigo_distribuidor, nombre_completo, cedula")
    .eq("email", afiliacion.email)
    .maybeSingle();
  if (existingByEmail) {
    return jsonResponse({
      error:
        `Ya existe un distribuidor con el email ${afiliacion.email}: ` +
        `${existingByEmail.codigo_distribuidor} - ${existingByEmail.nombre_completo} ` +
        `(cedula ${existingByEmail.cedula}).`,
    }, 409);
  }

  // 4) Crear auth.user
  const tempPassword = generateTempPassword();
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: afiliacion.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authErr || !authData?.user) {
    return jsonResponse({ error: `Error creando usuario: ${authErr?.message ?? "desconocido"}` }, 500);
  }
  const userId = authData.user.id;

  // 5) Llamar RPC approve_afiliacion (atomica). Si falla -> rollback del auth.user.
  // Usamos service_role para llamar la RPC porque la RPC valida que el caller sea
  // admin internamente. Pero como aqui ya validamos al caller admin manualmente
  // y la RPC valida via is_admin(), necesitamos que is_admin() devuelva true.
  // Como llamamos con service_role, is_admin() devuelve false (no es auth.uid).
  // Solucion: invocamos a finish_approve_afiliacion directamente (que tiene
  // grant a service_role).
  const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc(
    "finish_approve_afiliacion",
    {
      p_afiliacion_id: afiliacion_id,
      p_user_id: userId,
      p_codigo: codigo,
      p_padre_profile_id: padre_profile_id ?? null,
      p_abrir_como_frontal: !!abrir_como_frontal,
    },
  );

  if (rpcErr) {
    // Rollback best-effort
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    const code = rpcErr.code ? `[${rpcErr.code}] ` : "";
    return jsonResponse({
      error: `${code}${rpcErr.message ?? "Error en RPC"} - rollback aplicado`,
    }, 500);
  }

  const result = rpcResult as { ok?: boolean; codigo?: string; pedido_id?: string } | null;
  if (!result?.ok) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    return jsonResponse({ error: "La aprobacion no se completo - rollback aplicado" }, 500);
  }

  return jsonResponse({
    ok: true,
    codigo: result.codigo ?? codigo,
    tempPassword,
    pedido_id: result.pedido_id ?? null,
  });
});
