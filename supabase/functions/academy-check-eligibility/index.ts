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
      return jsonResponse({ error: "Unauthorized to check other users" }, 403);
    }
  }

  // Fetch diploma type requirements
  const { data: diplomaType, error: dtErr } = await supabaseAdmin
    .from("academy_diploma_types")
    .select("requirements, is_active")
    .eq("id", diploma_type_id)
    .maybeSingle();

  if (dtErr || !diplomaType) {
    return jsonResponse({ error: "Diploma type not found" }, 404);
  }
  if (!diplomaType.is_active) {
    return jsonResponse({ error: "Diploma type is inactive" }, 400);
  }

  // Check if diploma already issued
  const { data: existingDiploma } = await supabaseAdmin
    .from("academy_diploma_issuances")
    .select("id, status")
    .eq("user_id", target_user_id)
    .eq("diploma_type_id", diploma_type_id)
    .in("status", ["issued", "valid"])
    .maybeSingle();

  if (existingDiploma) {
    return jsonResponse({ 
      eligible: false, 
      reason: "Diploma already issued and valid.",
      existing_diploma_id: existingDiploma.id
    });
  }

  const reqs = diplomaType.requirements || {};
  let eligible = true;
  const reasons: string[] = [];

  // Check 1: Course completion (if course_id is provided or required_course_ids exist)
  let coursesToCheck: string[] = [];
  if (course_id) {
    coursesToCheck.push(course_id);
  }
  if (reqs.required_course_ids && Array.isArray(reqs.required_course_ids)) {
    coursesToCheck = [...new Set([...coursesToCheck, ...reqs.required_course_ids])];
  }

  if (coursesToCheck.length > 0) {
    const minProgress = reqs.min_progress_pct ?? 100;
    
    // Fetch enrollments for these courses
    const { data: enrollments } = await supabaseAdmin
      .from("academy_enrollments")
      .select("course_id, progress_percentage, status")
      .eq("user_id", target_user_id)
      .in("course_id", coursesToCheck);

    for (const cid of coursesToCheck) {
      const enr = enrollments?.find(e => e.course_id === cid);
      if (!enr) {
        eligible = false;
        reasons.push(`Not enrolled in required course: ${cid}`);
        continue;
      }
      if (enr.progress_percentage < minProgress) {
        eligible = false;
        reasons.push(`Progress in course ${cid} is ${enr.progress_percentage}%. Required: ${minProgress}%`);
      }
    }
  }

  // Check 2: Assessment completion
  if (reqs.requires_assessment) {
    let assessmentsToCheck: string[] = [];
    if (coursesToCheck.length > 0) {
      // Find final assessments for these courses
      const { data: assessments } = await supabaseAdmin
        .from("academy_assessments")
        .select("id, course_id")
        .in("course_id", coursesToCheck)
        .eq("is_final_exam", true)
        .eq("is_published", true);
        
      if (assessments && assessments.length > 0) {
        assessmentsToCheck = assessments.map(a => a.id);
      }
    }

    if (assessmentsToCheck.length > 0) {
      const minScore = reqs.min_assessment_score ?? 70;
      
      const { data: attempts } = await supabaseAdmin
        .from("academy_attempts")
        .select("assessment_id, percentage, passed, status")
        .eq("user_id", target_user_id)
        .in("assessment_id", assessmentsToCheck)
        .eq("status", "graded");

      for (const aid of assessmentsToCheck) {
        // Find best attempt
        const userAttempts = attempts?.filter(a => a.assessment_id === aid) || [];
        const bestAttempt = userAttempts.sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];
        
        if (!bestAttempt) {
          eligible = false;
          reasons.push(`No graded attempts for required assessment: ${aid}`);
        } else if ((bestAttempt.percentage || 0) < minScore) {
          eligible = false;
          reasons.push(`Best score for assessment ${aid} is ${bestAttempt.percentage}%. Required: ${minScore}%`);
        }
      }
    }
  }

  // Check 3: Minimum courses completed overall
  if (reqs.min_courses_completed && reqs.min_courses_completed > 0) {
    const minPct = reqs.min_progress_pct ?? 100;
    const { count } = await supabaseAdmin
      .from("academy_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", target_user_id)
      .gte("progress_percentage", minPct);
      
    if ((count || 0) < reqs.min_courses_completed) {
      eligible = false;
      reasons.push(`Completed ${count || 0} courses. Required: ${reqs.min_courses_completed}`);
    }
  }

  return jsonResponse({
    eligible,
    reasons: reasons.length > 0 ? reasons : undefined,
  });
});
