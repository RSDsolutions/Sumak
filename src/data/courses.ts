export interface Area {
  id: string;
  name: string;
  color: 'red' | 'green' | 'amber';
}

export interface Course {
  slug: string;
  title: string;
  areaId: string;
  targetAudience: string;
  duration: string;
  modality: 'Presencial' | 'Virtual' | 'En campo';
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  description: string;
}

export const areas: Area[] = [
  { id: 'seguridad-tactica', name: 'Seguridad Táctica', color: 'red' },
  { id: 'rescate', name: 'Rescate', color: 'green' },
  { id: 'incendios', name: 'Contra Incendios', color: 'red' },
  { id: 'primeros-auxilios', name: 'Primeros Auxilios', color: 'amber' },
];

export const courses: Course[] = [
  {
    slug: 'tacticas-intervencion-policial',
    title: 'Tácticas de Intervención Policial',
    areaId: 'seguridad-tactica',
    targetAudience: 'PARA: POLICÍAS',
    duration: '40 HORAS',
    modality: 'En campo',
    level: 'Avanzado',
    description: 'Técnicas avanzadas de reducción, ingreso táctico a estructuras y control de sospechosos bajo fuego.'
  },
  {
    slug: 'operaciones-alto-riesgo',
    title: 'Operaciones de Alto Riesgo',
    areaId: 'seguridad-tactica',
    targetAudience: 'PARA: MILITARES · POLICÍAS',
    duration: '60 HORAS',
    modality: 'En campo',
    level: 'Avanzado',
    description: 'Planeamiento y ejecución de misiones especiales en entornos urbanos y rurales.'
  },
  {
    slug: 'control-disturbios',
    title: 'Control de Disturbios y Multitudes',
    areaId: 'seguridad-tactica',
    targetAudience: 'PARA: POLICÍAS',
    duration: '24 HORAS',
    modality: 'Presencial',
    level: 'Intermedio',
    description: 'Formaciones, uso progresivo de la fuerza y técnicas de repliegue táctico.'
  },
  {
    slug: 'rescate-confinados',
    title: 'Rescate en Espacios Confinados',
    areaId: 'rescate',
    targetAudience: 'PARA: BOMBEROS · CRUZ ROJA',
    duration: '32 HORAS',
    modality: 'En campo',
    level: 'Avanzado',
    description: 'Extracción de víctimas en silos, tanques y estructuras colapsadas.'
  },
  {
    slug: 'rescate-alturas',
    title: 'Rescate en Alturas y Rappel',
    areaId: 'rescate',
    targetAudience: 'PARA: BOMBEROS · POLICÍAS',
    duration: '40 HORAS',
    modality: 'En campo',
    level: 'Intermedio',
    description: 'Sistemas de cuerdas, anclajes y descenso táctico/emergencia.'
  },
  {
    slug: 'rescate-acuatico',
    title: 'Rescate Acuático y Fluvial',
    areaId: 'rescate',
    targetAudience: 'PARA: BOMBEROS · CRUZ ROJA',
    duration: '30 HORAS',
    modality: 'En campo',
    level: 'Intermedio',
    description: 'Salvamento en aguas abiertas y ríos de corriente rápida.'
  },
  {
    slug: 'incendios-estructurales',
    title: 'Extinción de Incendios Estructurales',
    areaId: 'incendios',
    targetAudience: 'PARA: BOMBEROS',
    duration: '48 HORAS',
    modality: 'En campo',
    level: 'Avanzado',
    description: 'Ataque interior, ventilación táctica y búsqueda bajo condiciones de baja visibilidad.'
  },
  {
    slug: 'incendios-forestales',
    title: 'Incendios Forestales y de Interfaz',
    areaId: 'incendios',
    targetAudience: 'PARA: BOMBEROS · FFAA',
    duration: '40 HORAS',
    modality: 'En campo',
    level: 'Intermedio',
    description: 'Manejo de herramientas, ataque en laderas y seguridad del bombero forestal.'
  },
  {
    slug: 'hazmat',
    title: 'Manejo de Materiales Peligrosos (HAZMAT)',
    areaId: 'incendios',
    targetAudience: 'PARA: BOMBEROS · BRIGADAS',
    duration: '24 HORAS',
    modality: 'Presencial',
    level: 'Intermedio',
    description: 'Identificación, aislamiento y descontaminación de agentes químicos.'
  },
  {
    slug: 'bls',
    title: 'Primeros Auxilios Avanzados (BLS)',
    areaId: 'primeros-auxilios',
    targetAudience: 'PARA: TODO CUERPO',
    duration: '16 HORAS',
    modality: 'Presencial',
    level: 'Básico',
    description: 'Soporte vital básico, RCP e inmovilización de traumas.'
  },
  {
    slug: 'emergencias-masivas',
    title: 'Gestión de Emergencias Masivas',
    areaId: 'primeros-auxilios',
    targetAudience: 'PARA: TODO CUERPO',
    duration: '20 HORAS',
    modality: 'Virtual',
    level: 'Avanzado',
    description: 'Sistema de comando de incidentes y triage START.'
  },
  {
    slug: 'liderazgo-crisis',
    title: 'Liderazgo en Escenarios de Crisis',
    areaId: 'seguridad-tactica',
    targetAudience: 'PARA: OFICIALES',
    duration: '16 HORAS',
    modality: 'Virtual',
    level: 'Avanzado',
    description: 'Toma de decisiones bajo presión extrema y protocolos de cadena de mando.'
  }
];
