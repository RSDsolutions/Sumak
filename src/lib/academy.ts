import { supabase } from './supabase';
import type { 
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
        category:category_id (name, slug),
        instructor:instructor_id (nombre_completo)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (onlyPublished) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AcademyCourse[];
  },

  async getCourseBySlug(slug: string) {
    const { data, error } = await supabase
      .from('academy_courses')
      .select(`
        *,
        category:category_id (name, slug),
        instructor:instructor_id (nombre_completo)
      `)
      .eq('slug', slug)
      .single();
      
    if (error) throw error;
    return data as AcademyCourse;
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
    
    // Sort lessons manually since postgREST nested ordering can be tricky
    if (data) {
      data.forEach(m => {
        if (m.lessons) {
          m.lessons.sort((a: any, b: any) => a.sort_order - b.sort_order);
          if (onlyPublished) {
            m.lessons = m.lessons.filter((l: any) => l.is_published);
          }
        }
      });
    }
    
    return data as AcademyModule[];
  },

  // Enrollments
  async enrollInCourse(courseId: string) {
    const { data, error } = await supabase
      .from('academy_enrollments')
      .insert({ course_id: courseId })
      .select()
      .single();
      
    if (error) throw error;
    return data as AcademyEnrollment;
  },

  async getMyEnrollments() {
    const { data, error } = await supabase
      .from('academy_enrollments')
      .select(`
        *,
        course:course_id (
          title, slug, cover_image_url, estimated_duration_minutes
        )
      `)
      .order('last_accessed_at', { ascending: false, nullsFirst: false });
      
    if (error) throw error;
    return data;
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
    // Upsert pattern
    const { data: existing } = await supabase
      .from('academy_progress')
      .select('id')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('academy_progress')
        .update({
          status,
          progress_percentage: percentage,
          playback_seconds: playbackSeconds,
          last_accessed_at: new Date().toISOString(),
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('academy_progress')
        .insert({
          lesson_id: lessonId,
          course_id: courseId,
          status,
          progress_percentage: percentage,
          playback_seconds: playbackSeconds,
          started_at: new Date().toISOString(),
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Diplomas
  async getMyDiplomas() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const { data, error } = await supabase
      .from('academy_diploma_issuances')
      .select(`
        *,
        diploma_type:academy_diploma_types (*)
      `)
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data as AcademyDiplomaIssuance[];
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
          id, question_type, question_text, points, sort_order,
          options:academy_question_options (id, option_text, sort_order)
        )
      `)
      .eq('id', assessmentId)
      .single();
      
    if (error) throw error;
    
    // Sort questions and options
    if (data && data.questions) {
      data.questions.sort((a: any, b: any) => a.sort_order - b.sort_order);
      data.questions.forEach((q: any) => {
        if (q.options) {
          q.options.sort((a: any, b: any) => a.sort_order - b.sort_order);
        }
      });
    }
    
    return data;
  },
  
  async startAttempt(assessmentId: string) {
    const { data, error } = await supabase
      .from('academy_attempts')
      .insert({ assessment_id: assessmentId, status: 'in_progress' })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id as string;
  },
  
  async saveAnswers(attemptId: string, answers: { question_id: string, selected_option_ids: string[] }[]) {
    // Upsert answers
    const payload = answers.map(a => ({
      attempt_id: attemptId,
      question_id: a.question_id,
      selected_option_ids: a.selected_option_ids
    }));
    
    // Clear old answers for this attempt first, simpler than upserting individually
    await supabase.from('academy_answers').delete().eq('attempt_id', attemptId);
    
    const { error } = await supabase.from('academy_answers').insert(payload);
    if (error) throw error;
  }
};
