import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const maintenanceSecret = Deno.env.get("ACADEMY_MAINTENANCE_SECRET") ?? "";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  if (!maintenanceSecret || request.headers.get("x-academy-maintenance-secret") !== maintenanceSecret) {
    return response({ error: "Unauthorized" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: expired, error } = await supabaseAdmin.rpc("expire_academy_enrollments");
  if (error) return response({ error: "No se pudieron expirar las inscripciones." }, 500);
  return response({ ok: true, expired: Number(expired ?? 0) });
});