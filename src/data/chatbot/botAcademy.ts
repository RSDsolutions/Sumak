import { bankAccounts, contactInfo } from '../../data';
import type { ChatbotProfileConfig } from './types';

export const botAcademyProfile: ChatbotProfileConfig = {
  id: 'academy',
  name: 'Mentor SUMAK · Academia',
  shortName: 'Guía Académico',
  roleTitle: 'Gestor y Tutor del Campus Virtual SUMAK',
  accentGradient: 'from-[#0B2913] via-[#1A4E26] to-[#245A32]',
  badgeColor: 'bg-[#FEF6E9] text-[#92400E]',
  welcomeSubtitle: 'Tu gestor académico para cursos, pagos, evaluaciones, diplomas QR y recetas magistrales.',
  rootNodeId: 'acad_root',
  quickTopics: [
    { label: 'Certificados y Diplomas', nodeId: 'acad_credentials' },
    { label: 'Estado Pendiente', nodeId: 'acad_pending' },
    { label: 'Métodos de Pago', nodeId: 'acad_payments' },
    { label: 'Credencial Estudiantil QR', nodeId: 'acad_student_card' },
  ],
  nodes: {
    acad_root: {
      id: 'acad_root',
      title: 'Gestor Académico · Menú Principal',
      category: 'Inicio',
      keywords: ['inicio', 'academia', 'campus', 'ayuda', 'menu', 'tutor'],
      message: '¡Hola! Soy Mentor SUMAK, tu gestor y guía académico. Te acompaño desde tu inscripción hasta obtener tu Diploma Oficial verificable con QR:',
      rich: {
        summary: '¿En qué etapa de tu formación académica te puedo ayudar hoy?',
      },
      options: [
        { label: 'Explorar Cursos, Programas e Inscripciones', targetNodeId: 'acad_enroll' },
        { label: 'Pagos de Cursos y Recetas (Transferencia / PayPhone / PayPal)', targetNodeId: 'acad_payments' },
        { label: 'Cómo Estudiar Lecciones y Rendir Evaluaciones', targetNodeId: 'acad_study' },
        { label: 'Certificados, Diplomas y Estado "Pendiente"', targetNodeId: 'acad_credentials', badge: 'QR Oficial' },
        { label: 'Mi Credencial Estudiantil QR', targetNodeId: 'acad_student_card', badge: 'Carné' },
        { label: 'Recetas Magistrales del Dr. Luis Paredes', targetNodeId: 'acad_recipes' },
      ],
    },

    // ── 1. INSCRIPCIONES Y ACCESO ─────────────────────────────────────────────
    acad_enroll: {
      id: 'acad_enroll',
      title: 'Acceso al Campus e Inscripciones',
      category: 'Inscripciones',
      parentNodeId: 'acad_root',
      keywords: ['inscribirme', 'registro', 'catalogo', 'acceso', 'cursos', 'programas', 'entrar'],
      message: 'Puedes ingresar a Academia SUMAK de dos maneras, y tu progreso académico queda guardado de forma segura en tu perfil:',
      rich: {
        bullets: [
          'Si ya eres Distribuidor SUMAK: entra directamente con tu cuenta a /academia/dashboard y tendrás acceso a cursos gratuitos, exclusivos SUMAK y programas.',
          'Si eres Estudiante Independiente: regístrate gratis en /academia/registro para obtener tu cuenta de campus (con Credencial Estudiantil QR).',
          'Cursos Gratuitos se activan al instante al inscribirte; Programas de Especialización inscriben automáticamente todos sus cursos asociados.',
        ],
        actions: [
          { label: 'Explorar Catálogo de Cursos', to: '/academia/dashboard/explorar', variant: 'primary' },
          { label: 'Ver Programas de Especialización', to: '/academia/programas', variant: 'secondary' },
        ],
      },
      options: [
        { label: '¿Cómo pago un curso de pago o receta?', targetNodeId: 'acad_payments' },
        { label: '¿Cómo funciona un Programa de varios cursos?', targetNodeId: 'acad_programs' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    acad_programs: {
      id: 'acad_programs',
      title: 'Programas Formativos y Rutas',
      category: 'Programas',
      parentNodeId: 'acad_enroll',
      keywords: ['programa', 'ruta', 'especializacion', 'prerrequisitos', 'candado', 'modulos'],
      message: 'Un Programa agrupa varios cursos relacionados en una ruta de especialización conducente a un Diploma Oficial:',
      rich: {
        bullets: [
          'Cuando te inscribes a un programa o a cualquiera de sus cursos, la plataforma registra automáticamente tu avance ponderado hacia el Diploma.',
          'Algunos programas tienen cursos ordenados o con prerrequisitos: aprueba el curso previo para desbloquear el siguiente.',
          'Cada curso del programa te entrega su propio Certificado individual al 100%, y al completar todos los cursos obligatorios recibes el Diploma del Programa.',
        ],
        actions: [
          { label: 'Ver Mis Programas', to: '/academia/dashboard/programas', variant: 'primary' },
        ],
      },
      options: [
        { label: '¿Por qué dice Diploma Pendiente?', targetNodeId: 'acad_pending' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    // ── 2. PAGOS DE ACADEMIA ──────────────────────────────────────────────────
    acad_payments: {
      id: 'acad_payments',
      title: 'Pagos: Transferencia, PayPhone y PayPal',
      category: 'Pagos',
      parentNodeId: 'acad_root',
      keywords: ['pagar', 'pago', 'transferencia', 'payphone', 'paypal', 'comprobante', 'voucher', 'aprobacion'],
      message: 'Academia SUMAK acepta 3 métodos de pago oficiales para cursos premium y recetas magistrales:',
      rich: {
        facts: [
          { label: 'Transferencia / Depósito', value: 'Sube foto de voucher · Validación por Staff', highlight: true },
          { label: 'PayPhone (Tarjeta / App)', value: 'Aprobación digital en línea' },
          { label: 'PayPal (Internacional)', value: 'Pago instantáneo con cuenta o tarjeta' },
        ],
        bullets: [
          'Si pagas por Transferencia a Pichincha, Produbanco o Bolivariano, sube tu comprobante en el checkout; tu matrícula quedará como "Pendiente de verificación" hasta que Operaciones/Admin confirme el ingreso.',
          'Al confirmar el pago, el curso o receta se activa automáticamente y recibes notificación en tu panel.',
        ],
        actions: [
          { label: 'Ver Cursos Disponibles', to: '/academia/cursos', variant: 'primary' },
          { label: 'Ver Recetario Oficial', to: '/academia/recetas', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Ver Cuentas Bancarias SUMAK', targetNodeId: 'acad_banks' },
        { label: 'Mi pago demora en aprobarse / Soporte', targetNodeId: 'acad_support' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    acad_banks: {
      id: 'acad_banks',
      title: 'Cuentas Bancarias Autorizadas SUMAK',
      category: 'Pagos',
      parentNodeId: 'acad_payments',
      keywords: ['bancos', 'pichincha', 'produbanco', 'bolivariano', 'numero de cuenta'],
      message: 'Realiza tu transferencia bancaria únicamente a estas cuentas oficiales antes de cargar tu voucher en Academia SUMAK:',
      rich: {
        facts: bankAccounts.map((b) => ({
          label: `${b.banco} (${b.tipo})`,
          value: `N° ${b.numero} · ${b.titular}`,
          highlight: true,
        })),
      },
      options: [
        { label: 'Volver a Métodos de Pago', targetNodeId: 'acad_payments' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    // ── 3. ESTUDIAR Y EVALUACIONES ────────────────────────────────────────────
    acad_study: {
      id: 'acad_study',
      title: 'Visor de Lecciones, Recursos y Evaluaciones',
      category: 'Estudio',
      parentNodeId: 'acad_root',
      keywords: ['estudiar', 'visor', 'leccion', 'evaluacion', 'examen', 'nota', 'botanica', 'posologia', 'completar'],
      message: 'Dentro del aula virtual de cada curso encontrarás contenido clínico enriquecido y herramientas interactivas para aprobar con éxito:',
      rich: {
        steps: [
          'Ingresa a "Mis Cursos" (/academia/dashboard/cursos) y abre tu curso activo.',
          'Recorre cada módulo y marca como completadas todas las lecciones marcadas como Obligatorias (video, lectura clínica, recetas paso a paso o PDF).',
          'Consulta las Fichas Botánicas (Vademécum), alertas de seguridad médica y productos SUMAK dosificados dentro de cada clase.',
          'Rinde las Evaluaciones finales alcanzando o superando el porcentaje mínimo configurado (usualmente 70% u 80%).',
        ],
        actions: [
          { label: 'Ir a Mis Cursos', to: '/academia/dashboard/cursos', variant: 'primary' },
        ],
      },
      options: [
        { label: '¿Qué pasa al completar el 100% del curso?', targetNodeId: 'acad_credentials' },
        { label: '¿Por qué dice Certificado Pendiente?', targetNodeId: 'acad_pending' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    // ── 4. CERTIFICADOS, DIPLOMAS Y ESTADO PENDIENTE ──────────────────────────
    acad_credentials: {
      id: 'acad_credentials',
      title: 'Certificados, Diplomas y Descarga con QR',
      category: 'Acreditación',
      parentNodeId: 'acad_root',
      keywords: ['certificado', 'diploma', 'descargar', 'pdf', 'verificar', 'qr', 'emision'],
      message: 'Nuestro sistema diferencia automáticamente dos tipos de acreditación oficial verificables por QR:',
      rich: {
        facts: [
          { label: 'Certificado de Curso', value: 'Se emite al completar 100% de un curso individual', highlight: true },
          { label: 'Diploma de Programa', value: 'Se emite al aprobar 100% de cursos de un Programa', highlight: true },
          { label: 'Emisión', value: '100% Automática al aprobar última lección/examen' },
          { label: 'Validación Pública', value: 'Código único y QR escaneable en línea' },
        ],
        tip: 'Puedes ver y descargar tus documentos emitidos (con el diseño oficial de SUMAK y su QR) desde la pestaña "Certificaciones".',
        actions: [
          { label: 'Ir a Mis Certificaciones y Diplomas', to: '/academia/dashboard/diplomas', variant: 'primary' },
          { label: 'Verificar un Código o QR', to: '/academia/verificar', variant: 'secondary' },
        ],
      },
      options: [
        { label: '¿Qué significa "Certificado / Diploma Pendiente"?', targetNodeId: 'acad_pending' },
        { label: 'Mi Credencial Estudiantil QR', targetNodeId: 'acad_student_card' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    acad_pending: {
      id: 'acad_pending',
      title: '¿Por qué aparece Certificado o Diploma Pendiente?',
      category: 'Acreditación',
      parentNodeId: 'acad_credentials',
      keywords: ['pendiente', 'en curso', 'no se emite', 'falta', 'progreso'],
      message: 'Mientras estás cursando un curso o un programa, verás una tarjeta en estado "Pendiente (En curso)" en tu panel de Certificaciones:',
      rich: {
        bullets: [
          'Certificado Pendiente (En curso): Estás inscrito en el curso, pero aún te faltan lecciones obligatorias por completar o aprobar el examen final.',
          'Diploma Pendiente (Programa en curso): Ya iniciaste uno o varios cursos del programa, y la barra te muestra cuántos cursos aprobados llevas del total requerido.',
          'Apenas completes el requisito faltante (100% de avance + evaluación aprobada), el sistema desbloquea y emite tu certificado/diploma al instante.',
        ],
        actions: [
          { label: 'Revisar Mi Progreso en Certificaciones', to: '/academia/dashboard/diplomas', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Cómo estudiar y completar lecciones', targetNodeId: 'acad_study' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    // ── 5. CREDENCIAL ESTUDIANTIL QR ──────────────────────────────────────────
    acad_student_card: {
      id: 'acad_student_card',
      title: 'Credencial Estudiantil Digital con QR',
      category: 'Identidad Estudiantil',
      parentNodeId: 'acad_root',
      keywords: ['credencial', 'carnet', 'estudiante', 'qr', 'descargar carnet', 'identificacion'],
      message: 'Todo alumno registrado en Academia SUMAK posee su propia Credencial Estudiantil Oficial, totalmente independiente del carné comercial de distribuidor:',
      rich: {
        bullets: [
          'Incluye tu fotografía, nombre completo, código de estudiante SUMAK, cursos/programas activos y un código QR único verificable.',
          'Al escanear el QR se valida públicamente tu vigencia como estudiante activo de Academia SUMAK.',
          'Puedes visualizar el anverso/reverso y descargar la imagen oficial de alta calidad en 1 clic.',
        ],
        actions: [
          { label: 'Ver y Descargar Mi Credencial QR', to: '/academia/dashboard/credencial', variant: 'primary' },
        ],
      },
      options: [
        { label: 'Ver Mis Certificados y Diplomas', targetNodeId: 'acad_credentials' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    // ── 6. RECETAS MAGISTRALES ─────────────────────────────────────────────────
    acad_recipes: {
      id: 'acad_recipes',
      title: 'Recetas Ancestrales y Magistrales',
      category: 'Recetario',
      parentNodeId: 'acad_root',
      keywords: ['recetas', 'preparacion', 'hierbas', 'ingredientes', 'mis recetas', 'luis paredes'],
      message: 'Las Recetas de Academia SUMAK son formulaciones clínicas desarrolladas por el Dr. Luis Paredes con ingredientes naturales exactos, dosis y preparación paso a paso:',
      rich: {
        steps: [
          'Explora el catálogo público en /academia/recetas y selecciona una o varias recetas.',
          'Elige tu método de pago: Transferencia Bancaria, PayPhone o PayPal.',
          'Una vez aprobado el pago, accede ilimitadamente desde "Mis Recetas" en tu campus virtual.',
        ],
        actions: [
          { label: 'Explorar Recetario Oficial', to: '/academia/recetas', variant: 'primary' },
          { label: 'Ir a Mis Recetas Adquiridas', to: '/academia/dashboard/recetas', variant: 'secondary' },
        ],
      },
      options: [
        { label: 'Ver Métodos de Pago', targetNodeId: 'acad_payments' },
        { label: 'Menú Principal', targetNodeId: 'acad_root' },
      ],
    },

    acad_support: {
      id: 'acad_support',
      title: 'Mesa de Ayuda Académica SUMAK',
      category: 'Soporte',
      parentNodeId: 'acad_root',
      keywords: ['soporte', 'whatsapp', 'ayuda', 'problema', 'secretaria', 'operaciones'],
      message: '¿Necesitas asistencia con tu matrícula, validación de pago o descarga de diploma?',
      rich: {
        facts: [
          { label: 'WhatsApp Academia', value: `+${contactInfo.whatsapp}`, highlight: true },
          { label: 'Correo Institucional', value: contactInfo.emailPrincipal },
        ],
        actions: [
          {
            label: 'Contactar Mesa Académica por WhatsApp',
            to: `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent('Hola Academia SUMAK, necesito asistencia académica.')}`,
            variant: 'whatsapp',
            external: true,
          },
        ],
      },
      options: [
        { label: 'Volver al Menú Principal', targetNodeId: 'acad_root' },
      ],
    },
  },
};
