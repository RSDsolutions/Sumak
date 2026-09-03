import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  const userId = userRes.user.id;

  let body: { attempt_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { attempt_id } = body;
  if (!attempt_id) {
    return jsonResponse({ error: "Missing attempt_id" }, 400);
  }

  // Use service_role to grade (bypasses RLS)
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the attempt belongs to the user and is submitted or in progress
  const { data: attempt, error: attemptErr } = await supabaseAdmin
    .from("academy_attempts")
    .select(`
      id, user_id, assessment_id, status,
      academy_assessments ( passing_score )
    `)
    .eq("id", attempt_id)
    .maybeSingle();

  if (attemptErr || !attempt) {
    return jsonResponse({ error: "Attempt not found" }, 404);
  }
  if (attempt.user_id !== userId) {
    // Check if the user is staff, in case they are grading someone else
    const { data: staffRoles } = await supabaseAdmin
      .from("academy_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["academy_admin", "instructor"]);
      
    const { data: globalAdmin } = await supabaseAdmin
      .from("profiles")
      .select("rol")
      .eq("id", userId)
      .eq("rol", "admin")
      .maybeSingle();

    const isStaff = (staffRoles && staffRoles.length > 0) || globalAdmin;
    if (!isStaff) {
      return jsonResponse({ error: "Unauthorized" }, 403);
    }
  }

  if (attempt.status === "graded") {
    return jsonResponse({ error: "Already graded" }, 409);
  }

  // Get all answers for this attempt
  const { data: answers, error: ansErr } = await supabaseAdmin
    .from("academy_answers")
    .select("id, question_id, selected_option_ids")
    .eq("attempt_id", attempt_id);
    
  if (ansErr) return jsonResponse({ error: "Error fetching answers" }, 500);

  // Get all questions and correct options for this assessment
  const { data: questions, error: qErr } = await supabaseAdmin
    .from("academy_questions")
    .select(`
      id, question_type, points,
      academy_question_options ( id, is_correct )
    `)
    .eq("assessment_id", attempt.assessment_id);

  if (qErr || !questions) return jsonResponse({ error: "Error fetching questions" }, 500);

  let totalScore = 0;
  let maxScore = 0;
  const updates = [];

  for (const q of questions) {
    maxScore += Number(q.points);
    const answer = answers?.find((a) => a.question_id === q.id);
    
    let isCorrect = false;
    let pointsEarned = 0;

    if (answer && answer.selected_option_ids && answer.selected_option_ids.length > 0) {
      const correctOptionIds = q.academy_question_options
        .filter((opt: any) => opt.is_correct)
        .map((opt: any) => opt.id);

      const selectedSet = new Set(answer.selected_option_ids);
      const correctSet = new Set(correctOptionIds);

      // Check if sets are exactly the same
      if (selectedSet.size === correctSet.size) {
        let exactMatch = true;
        for (const id of selectedSet) {
          if (!correctSet.has(id)) {
            exactMatch = false;
            break;
          }
        }
        if (exactMatch) {
          isCorrect = true;
          pointsEarned = Number(q.points);
          totalScore += pointsEarned;
        }
      }

      updates.push({
        id: answer.id,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });
    }
  }

  // Bulk update answers
  for (const up of updates) {
    await supabaseAdmin
      .from("academy_answers")
      .update({ is_correct: up.is_correct, points_earned: up.points_earned })
      .eq("id", up.id);
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const passed = percentage >= (attempt.academy_assessments?.passing_score || 0);

  // Update attempt
  const { error: updErr } = await supabaseAdmin
    .from("academy_attempts")
    .update({
      score: totalScore,
      max_score: maxScore,
      percentage: percentage,
      passed: passed,
      status: "graded",
      graded_at: new Date().toISOString(),
      submitted_at: attempt.status === "in_progress" ? new Date().toISOString() : undefined,
    })
    .eq("id", attempt_id);

  if (updErr) return jsonResponse({ error: "Error updating attempt" }, 500);

  return jsonResponse({
    ok: true,
    score: totalScore,
    max_score: maxScore,
    percentage,
    passed,
  });
});
