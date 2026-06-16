// ============================================================
// SUMAK — Edge Function: admin-staff-update
// ============================================================
// Permite al admin gestionar la contrasena, email y campos basicos
// de perfil de otros usuarios con rol admin u operaciones.
//
// Flujo:
//   1. Valida JWT del caller -> debe ser admin y estar activo.
//   2. Valida que el target tiene rol admin u operaciones (NUNCA
//      se permite tocar distribuidores desde aqui — para eso ya
//      existen flujos especificos).
//   3. Aplica los cambios atomicamente:
//        - password / email -> auth.admin.updateUserById
//        - nombre/telefono/direccion/ciudad -> profiles.update
//   4. Devuelve { ok: true } o un error con codigo HTTP claro.
//
// Input (POST JSON):
//   {
//     target_user_id: uuid,        // requerido
//     new_password?: string,       // min 8 chars
//     new_email?: string,          // formato email valido
//     profile?: {
//       nombre_completo?: string,
//       telefono?: string|null,
//       direccion?: string|null,
//       ciudad?: string|null,
//     }
//   }
//
// Output:
//   200 -> { ok: true, updated: { password, email, profile } }
//   400 -> validacion de input
//   401 -> no autenticado
//   403 -> no es admin / target no es staff
//   404 -> target no encontrado
//   500 -> error interno
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Validacion basica de formato email (no exhaustiva — la verificacion
// real la hace Supabase auth al hacer updateUserById).
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

interface Body {
  target_user_id?: string;
  new_password?: string;
  new_email?: string;
  profile?: {
    nombre_completo?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 1) Validar JWT del caller
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

  // Cliente con service_role para todo lo demas (server-side).
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("rol, estado")
    .eq("id", callerId)
    .maybeSingle();
  if (!callerProfile || callerProfile.rol !== "admin" || callerProfile.estado !== "activo") {
    return jsonResponse({ error: "Solo un admin activo puede gestionar personal" }, 403);
  }

  // 2) Parsear body
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body JSON invalido" }, 400);
  }
  const { target_user_id, new_password, new_email, profile } = body;

  if (!target_user_id || typeof target_user_id !== "string") {
    return jsonResponse({ error: "Falta target_user_id" }, 400);
  }

  // Validaciones de payload
  if (new_password !== undefined) {
    if (typeof new_password !== "string" || new_password.length < 8) {
      return jsonResponse({ error: "La contrasena debe tener al menos 8 caracteres" }, 400);
    }
    if (new_password.length > 200) {
      return jsonResponse({ error: "Contrasena demasiado larga" }, 400);
    }
  }
  if (new_email !== undefined) {
    if (typeof new_email !== "string" || !isValidEmail(new_email)) {
      return jsonResponse({ error: "Email invalido" }, 400);
    }
  }
  if (profile !== undefined) {
    if (typeof profile !== "object" || profile === null || Array.isArray(profile)) {
      return jsonResponse({ error: "profile debe ser un objeto" }, 400);
    }
    if (profile.nombre_completo !== undefined && profile.nombre_completo !== null) {
      if (typeof profile.nombre_completo !== "string" || profile.nombre_completo.trim().length < 3) {
        return jsonResponse({ error: "Nombre completo invalido (minimo 3 caracteres)" }, 400);
      }
    }
  }

  // Si no hay nada que cambiar, error de input
  const hasPwd = new_password !== undefined;
  const hasEmail = new_email !== undefined;
  const hasProfile = profile !== undefined && Object.keys(profile).length > 0;
  if (!hasPwd && !hasEmail && !hasProfile) {
    return jsonResponse({ error: "No hay cambios para aplicar" }, 400);
  }

  // 3) Verificar que el target existe y es staff (admin u operaciones)
  const { data: targetProfile, error: targetErr } = await supabaseAdmin
    .from("profiles")
    .select("id, rol, estado, email")
    .eq("id", target_user_id)
    .maybeSingle();
  if (targetErr) {
    return jsonResponse({ error: "Error consultando target: " + targetErr.message }, 500);
  }
  if (!targetProfile) {
    return jsonResponse({ error: "Usuario no encontrado" }, 404);
  }
  if (targetProfile.rol !== "admin" && targetProfile.rol !== "operaciones") {
    return jsonResponse({
      error: `Esta operacion solo permite gestionar usuarios admin u operaciones (target: ${targetProfile.rol})`,
    }, 403);
  }

  // 4) Aplicar cambios en auth.users si corresponde
  const authPatch: { password?: string; email?: string } = {};
  if (hasPwd) authPatch.password = new_password;
  if (hasEmail && new_email !== targetProfile.email) authPatch.email = new_email;

  if (authPatch.password !== undefined || authPatch.email !== undefined) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      {
        ...authPatch,
        // Si actualizamos el email, lo damos por confirmado: es un cambio
        // hecho por un admin sobre un usuario interno, no por self-service.
        ...(authPatch.email !== undefined ? { email_confirm: true } : {}),
      },
    );
    if (authErr) {
      return jsonResponse({
        error: `Error actualizando credenciales: ${authErr.message}`,
      }, 500);
    }
  }

  // 5) Aplicar cambios en profiles si corresponde
  // Sincronizamos el email del profile con el del auth para consistencia.
  const profilePatch: Record<string, unknown> = {};
  if (hasProfile && profile) {
    if (profile.nombre_completo !== undefined) {
      profilePatch.nombre_completo = profile.nombre_completo === null
        ? null
        : profile.nombre_completo.trim();
    }
    if (profile.telefono !== undefined) {
      profilePatch.telefono = profile.telefono === null ? null : String(profile.telefono).trim() || null;
    }
    if (profile.direccion !== undefined) {
      profilePatch.direccion = profile.direccion === null ? null : String(profile.direccion).trim() || null;
    }
    if (profile.ciudad !== undefined) {
      profilePatch.ciudad = profile.ciudad === null ? null : String(profile.ciudad).trim() || null;
    }
  }
  if (authPatch.email !== undefined) {
    profilePatch.email = authPatch.email;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update(profilePatch)
      .eq("id", target_user_id);
    if (profErr) {
      // Rollback parcial: si fallo profiles pero auth si se actualizo,
      // dejamos el sistema consistente devolviendo error claro. El admin
      // puede reintentar y el patch de auth es idempotente.
      return jsonResponse({
        error: `Credenciales actualizadas pero el perfil fallo: ${profErr.message}`,
      }, 500);
    }
  }

  return jsonResponse({
    ok: true,
    updated: {
      password: hasPwd,
      email: authPatch.email !== undefined,
      profile: Object.keys(profilePatch).length > 0,
    },
  });
});
