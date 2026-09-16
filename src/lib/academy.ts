import { supabase } from './supabase';
import type { 
  AcademyCategory,
  AcademyCourse, 
  AcademyModule, 
  AcademyLesson, 
  AcademyEnrollment,
  AcademyProgress,
  AcademyDiplomaIssuance
} from './academy-types';

export const academyAPI = {
  // Courses
  async getCourses(onlyPublished = true) {
    let query = supabase
      .from('academy_courses')
      .select(`
        *,
        category:category_id (name, slug)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (onlyPublished) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    const instructorIds = [...new Set(data.filter(c => c.instructor_id).map(c => c.instructor_id))];
    let profileMap = new Map();

    if (instructorIds.length > 0) {
      try {
        const { data: profiles, error: profileErr } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', instructorIds);
        if (!profileErr && profiles) {
          profileMap = new Map(profiles.map(p => [p.id, p]));
        }
      } catch {
        // Ignorar si el usuario no tiene permisos de lectura sobre la tabla profiles
      }
    }

    return data.map(c => ({
      ...c,
      instructor: c.instructor_id ? (profileMap.get(c.instructor_id) || null) : null
    })) as AcademyCourse[];
  },

  async getAdminCategories() {
    const { data, error } = await supabase
      .from('academy_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data as AcademyCategory[];
  },

  async getAvailableLives() {
    const { data, error } = await supabase
      .from('academy_live_sessions')
      .select('*')
      .eq('status', 'published')
      .order('session_date', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true });
    if (error) {
      if (error.code === '42501') return [];
      throw error;
    }
    return data ?? [];
  },

  async getAdminLives() {
    const { data, error } = await supabase.from('academy_live_sessions').select('*').order('session_date', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },

  async saveAdminLive(liveId: string | null, input: { title: string; description: string; session_date: string | null; video_provider: string | null; video_external_id: string | null; video_url: string | null; duration_seconds: number | null; status: string; access_mode: string }) {
    const query = liveId ? supabase.from('academy_live_sessions').update(input).eq('id', liveId) : supabase.from('academy_live_sessions').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async getPrograms() {
    const { data, error } = await supabase
      .from('academy_programs')
      .select('*, courses:academy_program_courses (sort_order, is_required, course:course_id (id, title, slug, estimated_duration_minutes))')
      .eq('status', 'published')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getProgramBySlug(slug: string) {
    const { data, error } = await supabase
      .from('academy_programs')
      .select('*, courses:academy_program_courses (sort_order, is_required, course:course_id (id, title, slug, estimated_duration_minutes))')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error) throw error;
    return data;
  },

  async getMyProgramProgress(programId: string) {
    const { data, error } = await supabase.rpc('get_my_program_progress', { p_program_id: programId });
    if (error) throw error;
    return data;
  },

  async enrollInProgram(programId: string) {
    const { data, error } = await supabase.rpc('enroll_academy_program', { p_program_id: programId });
    if (error) throw error;
    return data;
  },

  async createRecipePurchase(input: { recipeIds: string[]; paymentMethod: string; receiptPath: string; bankName: string; voucherNumber: string }) {
    const { data, error } = await supabase.rpc('create_academy_recipe_purchase', {
      p_recipe_ids: input.recipeIds,
      p_payment_method: input.paymentMethod,
      p_payment_receipt_url: input.receiptPath,
      p_banco_destino: input.bankName,
      p_voucher_numero: input.voucherNumber,
    });
    if (error) throw error;
    return data as { purchase_id: string; total_amount: number; status: string };
  },

  async uploadAndCreateRecipePurchase(input: { userId: string; recipeIds: string[]; receiptFile: File; bankName: string; voucherNumber: string }) {
    if (input.receiptFile.size > 5 * 1024 * 1024) throw new Error('El comprobante no puede superar los 5 MB.');
    const extension = input.receiptFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const receiptPath = `${input.userId}/${Date.now()}-voucher.${extension}`;
    const { error: uploadError } = await supabase.storage.from('academy-receipts').upload(receiptPath, input.receiptFile, { upsert: false });
    if (uploadError) throw uploadError;
    try {
      return await academyAPI.createRecipePurchase({ recipeIds: input.recipeIds, paymentMethod: 'transferencia', receiptPath, bankName: input.bankName, voucherNumber: input.voucherNumber });
    } catch (error) {
      await supabase.storage.from('academy-receipts').remove([receiptPath]);
      throw error;
    }
  },

  async reviewRecipePurchase(purchaseId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    const { data, error } = await supabase.rpc('review_academy_recipe_purchase', { p_purchase_id: purchaseId, p_status: status, p_rejection_reason: rejectionReason ?? null });
    if (error) throw error;
    return data;
  },

  async getAdminPrograms() {
    const { data, error } = await supabase.from('academy_programs').select('*, courses:academy_program_courses (id, course_id, sort_order, is_required, course:course_id (id, title))').order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getAdminDiplomaTypes() {
    const { data, error } = await supabase.from('academy_diploma_types').select('id, name, internal_code').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveAdminProgram(programId: string | null, input: { title: string; slug: string; description: string; status: string; access_mode: string; completion_percentage_required: number; diploma_type_id: string | null; sort_order: number }) {
    const query = programId ? supabase.from('academy_programs').update(input).eq('id', programId) : supabase.from('academy_programs').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async addCourseToProgram(input: { program_id: string; course_id: string; sort_order: number; is_required: boolean }) {
    const { data, error } = await supabase.from('academy_program_courses').insert(input).select('*, course:course_id (id, title)').single();
    if (error) throw error;
    return data;
  },

  async removeCourseFromProgram(linkId: string) {
    const { error } = await supabase.from('academy_program_courses').delete().eq('id', linkId);
    if (error) throw error;
  },

  async getAdminCourses() {
    const { data, error } = await supabase
      .from('academy_courses')
      .select('*, category:category_id (name, slug)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (!data) return [];

    const instructorIds = [...new Set(data.filter(c => c.instructor_id).map(c => c.instructor_id))];
    let profileMap = new Map();
    
    if (instructorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('id', instructorIds);
      if (profiles) {
        profileMap = new Map(profiles.map(p => [p.id, p]));
      }
    }

    return data.map(c => ({
      ...c,
      instructor: c.instructor_id ? (profileMap.get(c.instructor_id) || null) : null
    })) as AcademyCourse[];
  },

  async getAdminEnrollments() {
    const { data, error } = await supabase
      .from('academy_enrollments')
      .select(`
        *,
        course:course_id (title, price, slug)
      `)
      .order('enrolled_at', { ascending: false });
    
    if (error) throw error;
    if (!data) return [];

    const userIds = [...new Set(data.map(e => e.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nombre_completo, username')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    
    return data.map(e => ({
      ...e,
      user: profileMap.get(e.user_id) || null
    }));
  },

  async reviewEnrollment(enrollmentId: string, decision: 'approve' | 'reject', reason?: string) {
    const { data, error } = await supabase.rpc('review_academy_enrollment', {
      p_enrollment_id: enrollmentId,
      p_decision: decision,
      p_rejection_reason: reason ?? null,
    });
    if (error) throw error;
    return data as AcademyEnrollment;
  },

  async createAdminCategory(input: Pick<AcademyCategory, 'name' | 'slug' | 'description' | 'sort_order'>) {
    const { data, error } = await supabase
      .from('academy_categories')
      .insert({ ...input, is_active: true })
      .select()
      .single();
    if (error) throw error;
    return data as AcademyCategory;
  },


  async saveAdminCourse(courseId: string | null, input: {
    title: string;
    slug: string;
    short_description: string;
    description: string;
    category_id: string | null;
    instructor_id: string | null;
    level: string;
    access_mode: string;
    status: string;
    estimated_duration_minutes: number | null;
    passing_percentage: number;
    generates_certificate: boolean;
    price: number;
  }) {
    const query = courseId
      ? supabase.from('academy_courses').update(input).eq('id', courseId)
      : supabase.from('academy_courses').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as AcademyCourse;
  },

  async deleteAdminCourse(courseId: string) {
    const { error } = await supabase.from('academy_courses').delete().eq('id', courseId);
    if (error) throw error;
  },

  async getAdminCourseContent(courseId: string) {
    const { data, error } = await supabase
      .from('academy_modules')
      .select('*, lessons:academy_lessons (*)')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((module) => ({
      ...module,
      lessons: (module.lessons ?? []).sort((a: AcademyLesson, b: AcademyLesson) => a.sort_order - b.sort_order),
    })) as AcademyModule[];
  },

  async saveAdminModule(moduleId: string | null, input: { course_id: string; title: string; description: string; sort_order: number; is_published: boolean }) {
    const query = moduleId
      ? supabase.from('academy_modules').update(input).eq('id', moduleId)
      : supabase.from('academy_modules').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as AcademyModule;
  },

  async deleteAdminModule(moduleId: string) {
    const { error } = await supabase.from('academy_modules').delete().eq('id', moduleId);
    if (error) throw error;
  },

  async saveAdminLesson(lessonId: string | null, input: Partial<AcademyLesson> & { module_id: string; title: string; content_type: string; sort_order: number }) {
    const query = lessonId
      ? supabase.from('academy_lessons').update(input).eq('id', lessonId)
      : supabase.from('academy_lessons').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as AcademyLesson;
  },

  async deleteAdminLesson(lessonId: string) {
    const { error } = await supabase.from('academy_lessons').delete().eq('id', lessonId);
    if (error) throw error;
  },

  async getAdminLessonResources(lessonId: string) {
    const { data, error } = await supabase
      .from('academy_resources')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async uploadAdminResource(courseId: string, lessonId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${courseId}/${lessonId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage.from('academy-content').upload(fileName, file);
    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from('academy-content').getPublicUrl(data.path);
    return { path: data.path, publicUrl: urlData.publicUrl };
  },

  async createAdminResource(input: { lesson_id: string; title: string; description: string; file_url: string; file_name: string; file_type: string; sort_order: number }) {
    const { data, error } = await supabase
      .from('academy_resources')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAdminResource(resourceId: string) {
    const { data: resource } = await supabase.from('academy_resources').select('file_url').eq('id', resourceId).single();
    if (resource && resource.file_url && resource.file_url.includes('/storage/v1/object/public/academy-content/')) {
      const path = resource.file_url.split('/storage/v1/object/public/academy-content/')[1];
      if (path) {
        await supabase.storage.from('academy-content').remove([path]);
      }
    }
    const { error } = await supabase.from('academy_resources').delete().eq('id', resourceId);
    if (error) throw error;
  },

  async getAdminAssessments(courseId: string) {
    const { data, error } = await supabase.from('academy_assessments').select('*, questions:academy_questions (id, question_text, question_type, points, sort_order, explanation, options:academy_question_options (id, option_text, is_correct, sort_order))').eq('course_id', courseId).order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /** Obtiene evaluaciones de un curso con info de mÃ³dulo (para Ã¡rbol de contenido) */
  async getAdminAssessmentsForTree(courseId: string) {
    const { data, error } = await supabase
      .from('academy_assessments')
      .select('id, title, module_id, is_final_exam, is_published, sort_order, passing_score')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /** Obtiene los intentos del estudiante actual para una evaluaciÃ³n */
  async getMyAttempts(assessmentId: string) {
    const { data, error } = await supabase
      .from('academy_attempts')
      .select('id, score, max_score, percentage, passed, status, started_at, submitted_at, graded_at')
      .eq('assessment_id', assessmentId)
      .order('started_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Obtiene los intentos del estudiante para TODAS las evaluaciones de un curso */
  async getMyAttemptsForCourse(courseId: string) {
    const { data: assessments } = await supabase
      .from('academy_assessments')
      .select('id')
      .eq('course_id', courseId);
    if (!assessments || assessments.length === 0) return [];
    const assessmentIds = assessments.map(a => a.id);
    const { data, error } = await supabase
      .from('academy_attempts')
      .select('id, assessment_id, percentage, passed, status, started_at, graded_at')
      .in('assessment_id', assessmentIds)
      .eq('status', 'graded')
      .order('started_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async saveAdminAssessment(assessmentId: string | null, input: {
    course_id: string; module_id?: string | null; title: string; description: string;
    passing_score: number; max_attempts: number | null; time_limit_minutes?: number | null;
    is_final_exam: boolean; is_published: boolean; sort_order: number;
    randomize_questions?: boolean;
  }) {
    const query = assessmentId ? supabase.from('academy_assessments').update(input).eq('id', assessmentId) : supabase.from('academy_assessments').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async createAdminQuestion(input: { assessment_id: string; question_text: string; question_type: string; points: number; sort_order: number; explanation?: string; options: { option_text: string; is_correct: boolean; sort_order: number }[] }) {
    const { options, ...questionInput } = input;
    const { data: question, error } = await supabase.from('academy_questions').insert(questionInput).select().single();
    if (error) throw error;
    if (options.length) {
      const { error: optionsError } = await supabase.from('academy_question_options').insert(options.map((option) => ({ ...option, question_id: question.id })));
      if (optionsError) throw optionsError;
    }
    return question;
  },

  async deleteAdminQuestion(questionId: string) {
    const { error } = await supabase.from('academy_questions').delete().eq('id', questionId);
    if (error) throw error;
  },

  async deleteAdminAssessment(assessmentId: string) {
    const { error } = await supabase.from('academy_assessments').delete().eq('id', assessmentId);
    if (error) throw error;
  },

  async getAdminInstructors() {
    // 1. Obtener usuarios que tienen el rol de instructor en academy_roles
    const { data: rolesData } = await supabase
      .from('academy_roles')
      .select('user_id')
      .eq('role', 'instructor')
      .is('revoked_at', null);

    const instructorIds = (rolesData ?? []).map(r => r.user_id);

    // 2. Obtener perfiles que son admin o que su ID estÃ¡ en la lista de instructores
    let query = supabase.from('profiles').select('id, nombre_completo, email, rol');
    
    if (instructorIds.length > 0) {
      query = query.or(`rol.in.(admin,instructor),id.in.(${instructorIds.join(',')})`);
    } else {
      query = query.in('rol', ['admin', 'instructor']);
    }

    const { data, error } = await query.order('nombre_completo', { ascending: true });
    
    if (error) throw error;
    
    return data.map(p => ({
      ...p,
      is_admin: p.rol === 'admin'
    }));
  },

  async searchUsersForInstructor(searchQuery: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre_completo, email, rol')
      .or(`nombre_completo.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },

  async assignInstructorRole(userId: string) {
    const { error } = await supabase
      .from('academy_roles')
      .insert({ user_id: userId, role: 'instructor' });
    if (error) throw error;
  },

  async revokeInstructorRole(userId: string) {
    const { error } = await supabase
      .from('academy_roles')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('role', 'instructor')
      .is('revoked_at', null);
    if (error) throw error;
  },

  async getCourseBySlug(slug: string) {
    const { data, error } = await supabase
      .from('academy_courses')
      .select(`
        *,
        category:category_id (name, slug)
      `)
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let instructor = null;
    if (data.instructor_id) {
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .eq('id', data.instructor_id)
          .maybeSingle();
        if (!profileErr && profile) {
          instructor = profile;
        }
      } catch {
        // Ignorar si el usuario no tiene permisos de lectura sobre la tabla profiles
      }
    }

    return {
      ...data,
      instructor
    } as AcademyCourse;
  },

  async getCourseModules(courseId: string, onlyPublished = true) {
    let query = supabase
      .from('academy_modules')
      .select(`
        *,
        lessons:academy_lessons (*)
      `)
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });

    if (onlyPublished) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [] as AcademyModule[];
    
    // Sort lessons manually since postgREST nested ordering can be tricky
    data.forEach(m => {
      if (m.lessons) {
        m.lessons.sort((a: any, b: any) => a.sort_order - b.sort_order);
        if (onlyPublished) {
          m.lessons = m.lessons.filter((l: any) => l.is_published);
        }
      }
    });
    
    return data as AcademyModule[];
  },

  // Enrollments
  async enrollInCourse(courseId: string) {
    const { data, error } = await supabase.rpc('request_academy_enrollment', {
      p_course_id: courseId,
    });
    if (error) throw error;
    const result = data as { enrollment: AcademyEnrollment };
    return result.enrollment;
  },

  async getMyEnrollments(userId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = userId || user?.id;
    if (!uid) return [];

    const { data, error } = await supabase
      .from('academy_enrollments')
      .select(`
        *,
        course:course_id (
          title, slug, cover_image_url, estimated_duration_minutes
        )
      `)
      .eq('user_id', uid)
      .order('last_accessed_at', { ascending: false, nullsFirst: false });
      
    if (error) {
      console.warn('Error al obtener inscripciones:', error.message);
      return [];
    }
    return data ?? [];
  },
  
  async checkEnrollment(courseId: string) {
    const { data, error } = await supabase
      .from('academy_enrollments')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle();
      
    if (error) throw error;
    return data as AcademyEnrollment | null;
  },

  // Progress
  async getMyProgress(courseId: string) {
    const { data, error } = await supabase
      .from('academy_progress')
      .select('*')
      .eq('course_id', courseId);
      
    if (error) throw error;
    return data as AcademyProgress[];
  },

  async updateProgress(lessonId: string, courseId: string, status: 'in_progress' | 'completed', percentage: number, playbackSeconds = 0) {
    const { data, error } = await supabase.rpc('update_academy_progress', {
      p_lesson_id: lessonId,
      p_course_id: courseId,
      p_status: status,
      p_percentage: percentage,
      p_playback_seconds: playbackSeconds,
    });
    if (error) throw error;
    return data as AcademyProgress;
  },

  // Diplomas
  async getMyDiplomas(userId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = userId || user?.id;
    if (!uid) return [];

    const { data, error } = await supabase
      .from('academy_diploma_issuances')
      .select(`
        *,
        diploma_type:academy_diploma_types (*)
      `)
      .eq('user_id', uid)
      .order('issued_at', { ascending: false });

    if (error) {
      console.warn('Error al obtener diplomas:', error.message);
      return [];
    }
    return (data ?? []) as AcademyDiplomaIssuance[];
  },

  async getMyCertificates(_userId?: string) {
    // En el backend las certificaciones oficiales están unificadas en academy_diploma_issuances
    return [];
  },

  async issueCourseCertificate(courseId: string) {
    const { data, error } = await supabase.rpc('issue_academy_course_certificate', {
      p_course_id: courseId,
    });
    if (error) throw error;
    return data;
  },
  
  async getAllDiplomas() {
    const { data, error } = await supabase
      .from('academy_diploma_issuances')
      .select(`
        *,
        diploma_type:academy_diploma_types (*)
      `)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data as AcademyDiplomaIssuance[];
  },

  async revokeDiploma(diplomaId: string) {
    const { error } = await supabase
      .from('academy_diploma_issuances')
      .delete()
      .eq('id', diplomaId);
    if (error) throw error;
  },
  
  // Storage
  getPublicImageUrl(path: string | null) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('academy-content').getPublicUrl(path);
    return data.publicUrl;
  },

  // Assessments
  async getAssessment(assessmentId: string) {
    const { data, error } = await supabase
      .from('academy_assessments')
      .select(`
        *,
        questions:academy_questions (
          id, question_type, question_text, points, sort_order
        )
      `)
      .eq('id', assessmentId)
      .single();
      
    if (error) throw error;

    const questionIds = (data?.questions ?? []).map((question: { id: string }) => question.id);
    const { data: options, error: optionsError } = questionIds.length
      ? await supabase
        .from('academy_question_options_public')
        .select('id, question_id, option_text, sort_order')
        .in('question_id', questionIds)
      : { data: [], error: null };

    if (optionsError) throw optionsError;
    
    // Sort questions and options
    if (data && data.questions) {
      data.questions.sort((a: any, b: any) => a.sort_order - b.sort_order);
      data.questions.forEach((q: any) => {
        q.options = (options ?? [])
          .filter((option: { question_id: string }) => option.question_id === q.id)
          .sort((a: any, b: any) => a.sort_order - b.sort_order);
      });
    }
    
    return data;
  },
  
  async startAttempt(assessmentId: string) {
    const { data, error } = await supabase.rpc('start_academy_attempt', {
      p_assessment_id: assessmentId,
    });
      
    if (error) throw error;
    return data as string;
  },
  
  async saveAnswers(attemptId: string, answers: { question_id: string, selected_option_ids: string[] }[]) {
    const { error } = await supabase.rpc('save_academy_answers', {
      p_attempt_id: attemptId,
      p_answers: answers,
    });
    if (error) throw error;
  },

  /** Obtiene un curso por ID con categoría e instructor */
  async getAdminCourseById(courseId: string) {
    const { data, error } = await supabase
      .from('academy_courses')
      .select('*, category:category_id (id, name, slug)')
      .eq('id', courseId)
      .single();
    if (error) throw error;
    if (!data) return null;

    let instructor = null;
    if (data.instructor_id) {
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .eq('id', data.instructor_id)
          .maybeSingle();
        if (!profileErr && profile) {
          instructor = profile;
        }
      } catch {
        // Ignorar si el usuario no tiene permisos de lectura sobre la tabla profiles
      }
    }

    return {
      ...data,
      instructor
    } as AcademyCourse;
  },

  /** Sube portada del curso al bucket academy-content y devuelve la URL pÃºblica */
  async uploadAdminCourseCover(courseId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `covers/${courseId}/cover_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('academy-content').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('academy-content').getPublicUrl(data.path);
    return urlData.publicUrl;
  },

  /** Actualiza campos parciales de un curso (para autosave de tabs individuales) */
  async patchAdminCourse(courseId: string, patch: Partial<AcademyCourse>) {
    const { data, error } = await supabase
      .from('academy_courses')
      .update(patch)
      .eq('id', courseId)
      .select()
      .single();
    if (error) throw error;
    return data as AcademyCourse;
  },

  /** Obtiene una evaluaciÃ³n completa con preguntas y opciones para ediciÃ³n admin */
  async getAdminAssessment(assessmentId: string) {
    const { data, error } = await supabase
      .from('academy_assessments')
      .select('*, questions:academy_questions (id, question_text, question_type, points, sort_order, options:academy_question_options (id, option_text, is_correct, sort_order))')
      .eq('id', assessmentId)
      .single();
    if (error) throw error;
    return data;
  },

  /** Actualiza una pregunta existente con sus opciones (delete+insert opciones) */
  async updateAdminQuestion(questionId: string, input: { question_text: string; question_type: string; points: number; explanation?: string; options: { option_text: string; is_correct: boolean; sort_order: number }[] }) {
    const { options, ...questionData } = input;
    const { error: qErr } = await supabase.from('academy_questions').update(questionData).eq('id', questionId);
    if (qErr) throw qErr;
    // Reemplazar opciones
    await supabase.from('academy_question_options').delete().eq('question_id', questionId);
    if (options.length) {
      const { error: optErr } = await supabase.from('academy_question_options').insert(options.map(o => ({ ...o, question_id: questionId })));
      if (optErr) throw optErr;
    }
  },

  /** Actualiza tÃ­tulo/descripciÃ³n de un mÃ³dulo inline */
  async patchAdminModule(moduleId: string, patch: { title?: string; description?: string; is_published?: boolean }) {
    const { data, error } = await supabase.from('academy_modules').update(patch).eq('id', moduleId).select().single();
    if (error) throw error;
    return data as AcademyModule;
  },

  async getAdminProgramDetails(programId: string) {
    const { data, error } = await supabase.from('academy_programs').select('*, courses:academy_program_courses (*, course:course_id (*), prerequisites:academy_program_course_prereqs!academy_program_course_prereqs_program_course_id_fkey (id, prereq_program_course_id))').eq('id', programId).single();
    if (error) throw error;
    return data;
  },

  async updateProgramCourse(linkId: string, updates: { sort_order?: number; is_required?: boolean }) {
    const { error } = await supabase.from('academy_program_courses').update(updates).eq('id', linkId);
    if (error) throw error;
  },

  async setProgramCoursePrerequisites(programCourseId: string, prereqIds: string[]) {
    await supabase.from('academy_program_course_prereqs').delete().eq('program_course_id', programCourseId);
    if (prereqIds.length > 0) {
      const inserts = prereqIds.map(id => ({ program_course_id: programCourseId, prereq_program_course_id: id }));
      const { error } = await supabase.from('academy_program_course_prereqs').insert(inserts);
      if (error) throw error;
    }
  },
};

export const academyProgramHelper = {
  async getMyEnrolledPrograms(userId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = userId || user?.id;
    if (!uid) return [];
    const { data, error } = await supabase
      .from('academy_program_enrollments')
      .select('*, program:program_id (id, title, slug, cover_image_url, description, status, courses:academy_program_courses (id))')
      .eq('user_id', uid)
      .eq('status', 'active');
    if (error) {
      console.warn('Error al obtener programas matriculados:', error.message);
      return [];
    }
    return data ?? [];
  }
};

