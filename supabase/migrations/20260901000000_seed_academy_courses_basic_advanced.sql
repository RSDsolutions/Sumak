-- ============================================================
-- SUMAK — Migration 034
-- Seed de dos cursos de Academia: básico y avanzado
-- ============================================================

-- 1) Asegurar categoría
DO $$
DECLARE
  v_category_id uuid;
BEGIN
  SELECT id INTO v_category_id
  FROM public.academy_categories
  WHERE slug = 'formacion';

  IF v_category_id IS NULL THEN
    INSERT INTO public.academy_categories (
      name,
      slug,
      description,
      icon_name,
      sort_order,
      is_active
    )
    VALUES (
      'Formación',
      'formacion',
      'Cursos básicos y avanzados para fortalecer liderazgo, conocimiento y acción comercial.',
      'BookOpen',
      1,
      true
    )
    RETURNING id INTO v_category_id;
  END IF;
END $$;

-- 2) Curso básico
DO $$
DECLARE
  v_course_id uuid;
  v_module_id uuid;
BEGIN
  INSERT INTO public.academy_courses (
    title,
    slug,
    description,
    short_description,
    category_id,
    level,
    estimated_duration_minutes,
    status,
    access_mode,
    prerequisites,
    passing_percentage,
    generates_certificate,
    published_at,
    sort_order,
    metadata,
    price
  )
  VALUES (
    'Curso Básico: Fundamentos Sumak',
    'curso-basico-fundamentos-sumak',
    'Un curso práctico para comprender la estructura, los valores y las primeras acciones que te permiten avanzar con claridad en tu negocio.',
    'Aprende los fundamentos del negocio y cómo empezar con confianza.',
    (SELECT id FROM public.academy_categories WHERE slug = 'formacion' LIMIT 1),
    'beginner',
    120,
    'published',
    'free_registered',
    'Sin requisitos previos.',
    70,
    true,
    now(),
    1,
    '{
      "objectives": [
        "Entender la propuesta de valor de Sumak.",
        "Definir tus primeros pasos de ventas y liderazgo.",
        "Aplicar actividades prácticas para fortalecer la acción real."
      ],
      "activities": [
        "Mapa de objetivos personales",
        "Diagnóstico de tu punto de partida",
        "Plan de 30 días con acciones concretas"
      ]
    }'::jsonb,
    0
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    category_id = EXCLUDED.category_id,
    level = EXCLUDED.level,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    status = EXCLUDED.status,
    access_mode = EXCLUDED.access_mode,
    prerequisites = EXCLUDED.prerequisites,
    passing_percentage = EXCLUDED.passing_percentage,
    generates_certificate = EXCLUDED.generates_certificate,
    published_at = EXCLUDED.published_at,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata,
    price = EXCLUDED.price,
    updated_at = now()
  RETURNING id INTO v_course_id;

  IF v_course_id IS NULL THEN
    SELECT id INTO v_course_id
    FROM public.academy_courses
    WHERE slug = 'curso-basico-fundamentos-sumak';
  END IF;

  DELETE FROM public.academy_lessons
  WHERE module_id IN (
    SELECT id FROM public.academy_modules WHERE course_id = v_course_id
  );

  DELETE FROM public.academy_modules
  WHERE course_id = v_course_id;

  INSERT INTO public.academy_modules (course_id, title, description, sort_order, is_published)
  VALUES (
    v_course_id,
    'Módulo 1 · Base y propósito',
    'Comprende la visión, la propuesta de valor y la forma de avanzar con conciencia.',
    1,
    true
  )
  RETURNING id INTO v_module_id;

  INSERT INTO public.academy_lessons (
    module_id,
    title,
    description,
    content_type,
    text_content,
    duration_seconds,
    sort_order,
    is_published,
    is_free_preview,
    estimated_minutes
  )
  VALUES
    (
      v_module_id,
      'Qué es Sumak y por qué importa',
      'Conoce la visión, la estructura y la intención detrás del negocio.',
      'text',
      '<h3>¿Qué es Sumak?</h3><p>Sumak encarna una propuesta de crecimiento personal, bienestar y negocio con sentido. La clave no es solo vender, sino comprender cómo aportar valor real y llevar una experiencia clara a quienes te rodean.</p><ul><li>Conoce la misión y la forma de trabajar.</li><li>Identifica tu propósito al entrar al negocio.</li><li>Entiende que la confianza se construye con claridad.</li></ul><h4>Actividad:</h4><p>Escribe 3 razones por las que quieres formar parte de Sumak y 3 acciones concretas que puedes hacer en los próximos 7 días.</p>',
      360,
      1,
      true,
      true,
      8
    ),
    (
      v_module_id,
      'Tu primer paso con estructura',
      'Organiza tus primeros pasos sin saturarte ni perder dirección.',
      'text',
      '<h3>Tu enfoque inicial</h3><p>Antes de vender, necesitas claridad. Define cuál es tu objetivo, qué te permite avanzar y cómo medir tus primeros resultados.</p><ul><li>Establece un objetivo realista.</li><li>Define un plan de contacto y seguimiento.</li><li>Haz seguimiento con consistencia.</li></ul><h4>Actividad:</h4><p>Diseña una lista con 5 acciones concretas para tu primer mes y marca cuáles podrás ejecutar de forma consistente.</p>',
      420,
      2,
      true,
      false,
      10
    );

  INSERT INTO public.academy_modules (course_id, title, description, sort_order, is_published)
  VALUES (
    v_course_id,
    'Módulo 2 · Comunicación y confianza',
    'Aprende a comunicar valor, escuchar con intención y sostener conversaciones genuinas.',
    2,
    true
  )
  RETURNING id INTO v_module_id;

  INSERT INTO public.academy_lessons (
    module_id,
    title,
    description,
    content_type,
    text_content,
    duration_seconds,
    sort_order,
    is_published,
    is_free_preview,
    estimated_minutes
  )
  VALUES
    (
      v_module_id,
      'Cómo hablar con claridad',
      'Haz que la propuesta sea fácil de entender para otras personas.',
      'text',
      '<h3>Conversación clara</h3><p>La clave es hablar de beneficios, no solo de producto. Las personas compran cuando entienden el valor, la intención y la utilidad para su vida.</p><ul><li>Explica de manera simple.</li><li>Haz preguntas antes de ofrecer.</li><li>Conecta la propuesta con necesidades reales.</li></ul><h4>Actividad:</h4><p>Graba una respuesta de 60 segundos explicando Sumak como si se lo contaras a una persona cercana. Revisa si suena clara, útil y natural.</p>',
      420,
      1,
      true,
      false,
      10
    ),
    (
      v_module_id,
      'Activación semanal del plan',
      'Convierte la intención en acción cada semana.',
      'text',
      '<h3>Actúa con constancia</h3><p>No hace falta hacer todo a la vez. La clave es mantener una rutina simple y realista que ayude a avanzar sin estrés.</p><ol><li>Define 3 contactos por semana.</li><li>Pregunta, escucha y comparte valor.</li><li>Documenta cuáles conversaciones te llevaron a una siguiente acción.</li></ol><h4>Actividad:</h4><p>Elabora una mini agenda semanal con 3 objetivos claros, 3 conversaciones planeadas y 1 seguimiento para cada una.</p>',
      360,
      2,
      true,
      false,
      8
    );
END $$;

-- 3) Curso avanzado
DO $$
DECLARE
  v_course_id uuid;
  v_module_id uuid;
BEGIN
  INSERT INTO public.academy_courses (
    title,
    slug,
    description,
    short_description,
    category_id,
    level,
    estimated_duration_minutes,
    status,
    access_mode,
    prerequisites,
    passing_percentage,
    generates_certificate,
    published_at,
    sort_order,
    metadata,
    price
  )
  VALUES (
    'Curso Avanzado: Estrategia y Crecimiento',
    'curso-avanzado-estrategia-crecimiento',
    'Profundiza en liderazgo, conversión y escalamiento para convertir tu red en un sistema sostenible y con mayor impacto.',
    'Diseña procesos más avanzados para vender, liderar y duplicar resultados.',
    (SELECT id FROM public.academy_categories WHERE slug = 'formacion' LIMIT 1),
    'advanced',
    210,
    'published',
    'free_registered',
    'Recomendado haber completado el curso básico.',
    75,
    true,
    now(),
    2,
    '{
      "objectives": [
        "Construir un proceso de venta más claro y repetible.",
        "Desarrollar liderazgo para acompañar a otros.",
        "Diseñar hábitos para escalar la red con disciplina."
      ],
      "activities": [
        "Análisis de tu proceso de conversación",
        "Plan de acompañamiento a tu red",
        "Sistema de seguimiento y metas semanales"
      ]
    }'::jsonb,
    0
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    category_id = EXCLUDED.category_id,
    level = EXCLUDED.level,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    status = EXCLUDED.status,
    access_mode = EXCLUDED.access_mode,
    prerequisites = EXCLUDED.prerequisites,
    passing_percentage = EXCLUDED.passing_percentage,
    generates_certificate = EXCLUDED.generates_certificate,
    published_at = EXCLUDED.published_at,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata,
    price = EXCLUDED.price,
    updated_at = now()
  RETURNING id INTO v_course_id;

  IF v_course_id IS NULL THEN
    SELECT id INTO v_course_id
    FROM public.academy_courses
    WHERE slug = 'curso-avanzado-estrategia-crecimiento';
  END IF;

  DELETE FROM public.academy_lessons
  WHERE module_id IN (
    SELECT id FROM public.academy_modules WHERE course_id = v_course_id
  );

  DELETE FROM public.academy_modules
  WHERE course_id = v_course_id;

  INSERT INTO public.academy_modules (course_id, title, description, sort_order, is_published)
  VALUES (
    v_course_id,
    'Módulo 1 · Posicionamiento y diferenciación',
    'Construye un mensaje más sólido para destacar y conectar con personas que realmente encajan.',
    1,
    true
  )
  RETURNING id INTO v_module_id;

  INSERT INTO public.academy_lessons (
    module_id,
    title,
    description,
    content_type,
    text_content,
    duration_seconds,
    sort_order,
    is_published,
    is_free_preview,
    estimated_minutes
  )
  VALUES
    (
      v_module_id,
      'Cómo posicionarte con claridad',
      'Distingue tu valor, tu enfoque y tu forma de ofrecer soluciones.',
      'text',
      '<h3>Posicionamiento</h3><p>El crecimiento real comienza cuando puedes explicar sin ruido qué haces, para quién y por qué tu propuesta aporta valor. Un buen posicionamiento mejora la confianza y reduce la fricción.</p><ul><li>Define tu público ideal.</li><li>Expresa un beneficio claro.</li><li>Evita mensajes genéricos o confusos.</li></ul><h4>Actividad:</h4><p>Escribe un mensaje de 3 líneas que describa tu propuesta de negocio para una persona nueva. Luego prueba si se entiende en menos de 10 segundos.</p>',
      420,
      1,
      true,
      false,
      10
    ),
    (
      v_module_id,
      'Diagnóstico de tu proceso de venta',
      'Evalúa qué está funcionando y dónde aparece fricción en tu conversión.',
      'text',
      '<h3>Revisa tu proceso</h3><p>Un sistema avanzado no se basa en suerte; se basa en observación, medición y mejora constante. Pregúntate dónde la gente se interesa, dónde duda y dónde se queda.</p><ul><li>Analiza tus conversaciones.</li><li>Identifica patrones de duda.</li><li>Haz ajustes basados en evidencia.</li></ul><h4>Actividad:</h4><p>Haz una revisión de tus últimas 5 conversaciones y anota qué preguntas abren el interés, qué dudas aparecen y qué mensajes se repiten.</p>',
      480,
      2,
      true,
      false,
      12
    );

  INSERT INTO public.academy_modules (course_id, title, description, sort_order, is_published)
  VALUES (
    v_course_id,
    'Módulo 2 · Liderazgo y acompañamiento',
    'Acompaña mejor a otros, mejora la experiencia y crea un flujo más claro de apoyo.',
    2,
    true
  )
  RETURNING id INTO v_module_id;

  INSERT INTO public.academy_lessons (
    module_id,
    title,
    description,
    content_type,
    text_content,
    duration_seconds,
    sort_order,
    is_published,
    is_free_preview,
    estimated_minutes
  )
  VALUES
    (
      v_module_id,
      'Liderazgo que acompaña, no que controla',
      'Aprende a orientar a otras personas desde claridad y confianza.',
      'text',
      '<h3>Liderar con claridad</h3><p>El liderazgo en redes no se trata de imponer; se trata de acompañar con estructura, enfoque y paciencia. Una buena guía ayuda a otros a avanzar sin frustrarse ni perder rumbo.</p><ul><li>Escucha antes de orientar.</li><li>Haz que cada paso sea simple.</li><li>Valora el progreso real.</li></ul><h4>Actividad:</h4><p>Escribe un mini plan de acompañamiento para 1 persona de tu red. Incluye objetivos, seguimiento y 3 preguntas que la ayuden a avanzar.</p>',
      480,
      1,
      true,
      false,
      12
    ),
    (
      v_module_id,
      'Sistema de seguimiento',
      'Usa un seguimiento consistente para mantener el ritmo y medir avances.',
      'text',
      '<h3>Seguimiento efectivo</h3><p>La continuidad se aprende a través de procesos claros y seguimiento respetuoso. Cuando existe un método, la energía se transforma en ejecución.</p><ul><li>Agenda revisiones periódicas.</li><li>Observa señales de avance.</li><li>Corrige sin castigar.</li></ul><h4>Actividad:</h4><p>Diseña un archivo o sistema personal para registrar reuniones, compromisos y próximos pasos. Define qué métricas te permitirán saber si va bien.</p>',
      420,
      2,
      true,
      false,
      10
    );
END $$;
