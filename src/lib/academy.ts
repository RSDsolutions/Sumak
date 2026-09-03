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

const fallbackCategory = {
  id: 'fallback-category',
  name: 'Formación',
  slug: 'formacion',
  description: 'Cursos básicos y avanzados para fortalecer tu negocio y tu capacidad de liderazgo.',
  icon_name: 'BookOpen',
  sort_order: 1,
  is_active: true,
  created_at: new Date().toISOString(),
};

const fallbackBasicCourse: AcademyCourse = {
  id: 'fallback-basic-course',
  title: 'Curso Básico: Fundamentos Sumak',
  slug: 'curso-basico-fundamentos-sumak',
  description: 'Un curso práctico para comprender la estructura, los valores y las primeras acciones que te permiten avanzar con claridad en tu negocio.',
  short_description: 'Aprende los fundamentos del negocio y cómo empezar con confianza.',
  cover_image_url: null,
  instructor_id: null,
  category_id: fallbackCategory.id,
  level: 'beginner',
  estimated_duration_minutes: 120,
  status: 'published',
  access_mode: 'free_registered',
  prerequisites: 'Sin requisitos previos.',
  passing_percentage: 70,
  generates_certificate: true,
  diploma_type_id: null,
  published_at: new Date().toISOString(),
  sort_order: 1,
  metadata: {
    objectives: [
      'Entender la propuesta de valor de Sumak.',
      'Definir tus primeros pasos de ventas y liderazgo.',
      'Aplicar actividades prácticas para fortalecer la acción real.'
    ],
    activities: [
      'Mapa de objetivos personales',
      'Diagnóstico de tu punto de partida',
      'Plan de 30 días con acciones concretas'
    ]
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: fallbackCategory,
  instructor: { nombre_completo: 'Staff SUMAK' }
};

const fallbackAdvancedCourse: AcademyCourse = {
  id: 'fallback-advanced-course',
  title: 'Curso Avanzado: Estrategia y Crecimiento',
  slug: 'curso-avanzado-estrategia-crecimiento',
  description: 'Profundiza en liderazgo, conversión y escalamiento para convertir tu red en un sistema sostenible y con mayor impacto.',
  short_description: 'Diseña procesos más avanzados para vender, liderar y duplicar resultados.',
  cover_image_url: null,
  instructor_id: null,
  category_id: fallbackCategory.id,
  level: 'advanced',
  estimated_duration_minutes: 210,
  status: 'published',
  access_mode: 'free_registered',
  prerequisites: 'Recomendado haber completado el curso básico.',
  passing_percentage: 75,
  generates_certificate: true,
  diploma_type_id: null,
  published_at: new Date().toISOString(),
  sort_order: 2,
  metadata: {
    objectives: [
      'Construir un proceso de venta más claro y repetible.',
      'Desarrollar liderazgo para acompañar a otros.',
      'Diseñar hábitos para escalar la red con disciplina.'
    ],
    activities: [
      'Análisis de tu proceso de conversación',
      'Plan de acompañamiento a tu red',
      'Sistema de seguimiento y metas semanales'
    ]
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: fallbackCategory,
  instructor: { nombre_completo: 'Staff SUMAK' }
};

const fallbackCourses: AcademyCourse[] = [fallbackBasicCourse, fallbackAdvancedCourse];

const fallbackModulesByCourseId: Record<string, AcademyModule[]> = {
  'fallback-basic-course': [
    {
      id: 'fallback-basic-module-1',
      course_id: 'fallback-basic-course',
      title: 'Módulo 1 · Base y propósito',
      description: 'Comprende la visión, la propuesta de valor y la forma de avanzar con conciencia.',
      sort_order: 1,
      is_published: true,
      created_at: new Date().toISOString(),
      lessons: [
        {
          id: 'fallback-basic-lesson-1',
          module_id: 'fallback-basic-module-1',
          title: 'Qué es Sumak y por qué importa',
          description: 'Conoce la visión, la estructura y la intención detrás del negocio.',
          content_type: 'text',
          text_content: '<h3>¿Qué es Sumak?</h3><p>Sumak encarna una propuesta de crecimiento personal, bienestar y negocio con sentido. La clave no es solo vender, sino comprender cómo aportar valor real y llevar una experiencia clara a quienes te rodean.</p><ul><li>Conoce la misión y la forma de trabajar.</li><li>Identifica tu propósito al entrar al negocio.</li><li>Entiende que la confianza se construye con claridad.</li></ul><h4>Actividad:</h4><p>Escribe 3 razones por las que quieres formar parte de Sumak y 3 acciones concretas que puedes hacer en los próximos 7 días.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 360,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 1,
          is_published: true,
          is_free_preview: true,
          estimated_minutes: 8,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'fallback-basic-lesson-2',
          module_id: 'fallback-basic-module-1',
          title: 'Tu primer paso con estructura',
          description: 'Organiza tus primeros pasos sin saturarte ni perder dirección.',
          content_type: 'text',
          text_content: '<h3>Tu enfoque inicial</h3><p>Antes de vender, necesitas claridad. Define cuál es tu objetivo, qué te permite avanzar y cómo medir tus primeros resultados.</p><ul><li>Establece un objetivo realista.</li><li>Define un plan de contacto y seguimiento.</li><li>Haz seguimiento con consistencia.</li></ul><h4>Actividad:</h4><p>Diseña una lista con 5 acciones concretas para tu primer mes y marca cuáles podrás ejecutar de forma consistente.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 420,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 2,
          is_published: true,
          is_free_preview: false,
          estimated_minutes: 10,
          metadata: {},
          created_at: new Date().toISOString(),
        }
      ]
    },
    {
      id: 'fallback-basic-module-2',
      course_id: 'fallback-basic-course',
      title: 'Módulo 2 · Comunicación y confianza',
      description: 'Aprende a comunicar valor, escuchar con intención y sostener conversaciones genuinas.',
      sort_order: 2,
      is_published: true,
      created_at: new Date().toISOString(),
      lessons: [
        {
          id: 'fallback-basic-lesson-3',
          module_id: 'fallback-basic-module-2',
          title: 'Cómo hablar con claridad',
          description: 'Haz que la propuesta sea fácil de entender para otras personas.',
          content_type: 'text',
          text_content: '<h3>Conversación clara</h3><p>La clave es hablar de beneficios, no solo de producto. Las personas compran cuando entienden el valor, la intención y la utilidad para su vida.</p><ul><li>Explica de manera simple.</li><li>Haz preguntas antes de ofrecer.</li><li>Conecta la propuesta con necesidades reales.</li></ul><h4>Actividad:</h4><p>Graba una respuesta de 60 segundos explicando Sumak como si se lo contaras a una persona cercana. Revisa si suena clara, útil y natural.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 420,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 1,
          is_published: true,
          is_free_preview: false,
          estimated_minutes: 10,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'fallback-basic-lesson-4',
          module_id: 'fallback-basic-module-2',
          title: 'Activación semanal del plan',
          description: 'Convierte la intención en acción cada semana.',
          content_type: 'text',
          text_content: '<h3>Actúa con constancia</h3><p>No hace falta hacer todo a la vez. La clave es mantener una rutina simple y realista que ayude a avanzar sin estrés.</p><ol><li>Define 3 contactos por semana.</li><li>Pregunta, escucha y comparte valor.</li><li>Documenta cuáles conversaciones te llevaron a una siguiente acción.</li></ol><h4>Actividad:</h4><p>Elabora una mini agenda semanal con 3 objetivos claros, 3 conversaciones planeadas y 1 seguimiento para cada una.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 360,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 2,
          is_published: true,
          is_free_preview: false,
          estimated_minutes: 8,
          metadata: {},
          created_at: new Date().toISOString(),
        }
      ]
    }
  ],
  'fallback-advanced-course': [
    {
      id: 'fallback-advanced-module-1',
      course_id: 'fallback-advanced-course',
      title: 'Módulo 1 · Posicionamiento y diferenciación',
      description: 'Construye un mensaje más sólido para destacar y conectar con personas que realmente encajan.',
      sort_order: 1,
      is_published: true,
      created_at: new Date().toISOString(),
      lessons: [
        {
          id: 'fallback-advanced-lesson-1',
          module_id: 'fallback-advanced-module-1',
          title: 'Cómo posicionarte con claridad',
          description: 'Distingue tu valor, tu enfoque y tu forma de ofrecer soluciones.',
          content_type: 'text',
          text_content: '<h3>Posicionamiento</h3><p>El crecimiento real comienza cuando puedes explicar sin ruido qué haces, para quién y por qué tu propuesta aporta valor. Un buen posicionamiento mejora la confianza y reduce la fricción.</p><ul><li>Define tu público ideal.</li><li>Expresa un beneficio claro.</li><li>Evita mensajes genéricos o confusos.</li></ul><h4>Actividad:</h4><p>Escribe un mensaje de 3 líneas que describa tu propuesta de negocio para una persona nueva. Luego prueba si se entiende en menos de 10 segundos.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 420,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 1,
          is_published: true,
          is_free_preview: false,
          estimated_minutes: 10,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'fallback-advanced-lesson-2',
          module_id: 'fallback-advanced-module-1',
          title: 'Diagnóstico de tu proceso de venta',
          description: 'Evalúa qué está funcionando y dónde aparece fricción en tu conversión.',
          content_type: 'text',
          text_content: '<h3>Revisa tu proceso</h3><p>Un sistema avanzado no se basa en suerte; se basa en observación, medición y mejora constante. Pregúntate dónde la gente se interesa, dónde duda y dónde se queda.</p><ul><li>Analiza tus conversaciones.</li><li>Identifica patrones de duda.</li><li>Haz ajustes basados en evidencia.</li></ul><h4>Actividad:</h4><p>Haz una revisión de tus últimas 5 conversaciones y anota qué preguntas abren el interés, qué dudas aparecen y qué mensajes se repiten.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 480,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 2,
          is_published: true,
          is_free_preview: false,
          estimated_minutes: 12,
          metadata: {},
          created_at: new Date().toISOString(),
        }
      ]
    },
    {
      id: 'fallback-advanced-module-2',
      course_id: 'fallback-advanced-course',
      title: 'Módulo 2 · Liderazgo y acompañamiento',
      description: 'Acompaña mejor a otros, mejora la experiencia y crea un flujo más claro de apoyo.',
      sort_order: 2,
      is_published: true,
      created_at: new Date().toISOString(),
      lessons: [
        {
          id: 'fallback-advanced-lesson-3',
          module_id: 'fallback-advanced-module-2',
          title: 'Liderazgo que acompaña, no que controla',
          description: 'Aprende a orientar a otras personas desde claridad y confianza.',
          content_type: 'text',
          text_content: '<h3>Liderar con claridad</h3><p>El liderazgo en redes no se trata de imponer; se trata de acompañar con estructura, enfoque y paciencia. Una buena guía ayuda a otros a avanzar sin frustrarse ni perder rumbo.</p><ul><li>Escucha antes de orientar.</li><li>Haz que cada paso sea simple.</li><li>Valora el progreso real.</li></ul><h4>Actividad:</h4><p>Escribe un mini plan de acompañamiento para 1 persona de tu red. Incluye objetivos, seguimiento y 3 preguntas que la ayuden a avanzar.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 480,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 1,
          is_published: true,
          is_free_preview: false,
          estimated_minutes: 12,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'fallback-advanced-lesson-4',
          module_id: 'fallback-advanced-module-2',
          title: 'Sistema de seguimiento',
          description: 'Usa un seguimiento consistente para mantener el ritmo y medir avances.',
          content_type: 'text',
          text_content: '<h3>Seguimiento efectivo</h3><p>La continuidad se aprende a través de procesos claros y seguimiento respetuoso. Cuando existe un método, la energía se transforma en ejecución.</p><ul><li>Agenda revisiones periódicas.</li><li>Observa señales de avance.</li><li>Corrige sin castigar.</li></ul><h4>Actividad:</h4><p>Diseña un archivo o sistema personal para registrar reuniones, compromisos y próximos pasos. Define qué métricas te permitirán saber si va bien.</p>',
          video_provider: null,
          video_external_id: null,
          video_url: null,
          thumbnail_url: null,
          duration_seconds: 420,
          file_url: null,
          file_name: null,
          external_url: null,
          assessment_id: null,
          sort_order: 2,
          is_published: true,
          is_free_preview: false,
          estimated_minutes: 10,
          metadata: {},
          created_at: new Date().toISOString(),
        }
      ]
    }
  ]
};

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
    if (error || !data || data.length === 0) {
      return fallbackCourses as AcademyCourse[];
    }
    return data as AcademyCourse[];
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
    if (error) throw error;
    return data ?? [];
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

  async getMyProgramProgress(programId: string) {
    const { data, error } = await supabase.rpc('get_my_program_progress', { p_program_id: programId });
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

  async getAdminPrograms() {
    const { data, error } = await supabase.from('academy_programs').select('*, courses:academy_program_courses (id, course_id, sort_order, is_required, course:course_id (id, title))').order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveAdminProgram(programId: string | null, input: { title: string; slug: string; description: string; status: string; access_mode: string; completion_percentage_required: number; sort_order: number }) {
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
      .select('*, category:category_id (name, slug), instructor:instructor_id (nombre_completo)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as AcademyCourse[];
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

  async saveAdminLesson(lessonId: string | null, input: Partial<AcademyLesson> & { module_id: string; title: string; content_type: string; sort_order: number }) {
    const query = lessonId
      ? supabase.from('academy_lessons').update(input).eq('id', lessonId)
      : supabase.from('academy_lessons').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as AcademyLesson;
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
    const { error } = await supabase.from('academy_resources').delete().eq('id', resourceId);
    if (error) throw error;
  },

  async getAdminAssessments(courseId: string) {
    const { data, error } = await supabase.from('academy_assessments').select('*, questions:academy_questions (id, question_text, question_type, points, sort_order, options:academy_question_options (id, option_text, is_correct, sort_order))').eq('course_id', courseId).order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async saveAdminAssessment(assessmentId: string | null, input: { course_id: string; title: string; description: string; passing_score: number; max_attempts: number | null; is_final_exam: boolean; is_published: boolean; sort_order: number }) {
    const query = assessmentId ? supabase.from('academy_assessments').update(input).eq('id', assessmentId) : supabase.from('academy_assessments').insert(input);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async createAdminQuestion(input: { assessment_id: string; question_text: string; question_type: string; points: number; sort_order: number; options: { option_text: string; is_correct: boolean; sort_order: number }[] }) {
    const { options, ...questionInput } = input;
    const { data: question, error } = await supabase.from('academy_questions').insert(questionInput).select().single();
    if (error) throw error;
    if (options.length) {
      const { error: optionsError } = await supabase.from('academy_question_options').insert(options.map((option) => ({ ...option, question_id: question.id })));
      if (optionsError) throw optionsError;
    }
    return question;
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
      .maybeSingle();

    if (error) {
      const fallback = fallbackCourses.find((course) => course.slug === slug);
      if (fallback) return fallback as AcademyCourse;
      throw error;
    }

    if (!data) {
      const fallback = fallbackCourses.find((course) => course.slug === slug) ?? fallbackCourses[0];
      return fallback as AcademyCourse;
    }

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
    if (error || !data || data.length === 0) {
      return (fallbackModulesByCourseId[courseId] || []) as AcademyModule[];
    }
    
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
    const { data, error } = await supabase.rpc('enroll_academy_course', {
      p_course_id: courseId,
    });
      
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

  async getMyCertificates() {
    const { data, error } = await supabase.rpc('get_my_academy_certificates');
    if (error) throw error;
    return data ?? [];
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
  }
};
