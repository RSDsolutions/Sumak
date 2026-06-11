import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  CheckCircle2, Upload, User, FileText, Package, AlertCircle, Sparkles,
  TrendingUp, Users, Wallet, ShieldCheck, Rocket, Heart, Award, Leaf,
  Landmark, Copy, Check, Info,
} from 'lucide-react';
import { affiliatePackages, bankAccounts } from '../data';
import { supabase } from '../lib/supabase';
import { useSEO } from '../lib/seo';
import { explicarCedulaInvalida, validarCedulaEcuatoriana } from '../lib/validators';
import { logger } from '../lib/logger';
import type { PaqueteKey } from '../lib/types';

type Step = 1 | 2 | 3 | 'done';

interface PersonalData {
  nombre: string;
  cedula: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  patrocinador: string;
}

interface UploadFiles {
  cedulaFrente: File | null;
  cedulaReverso: File | null;
  planilla: File | null;
  voucher: File | null;
}

const paqueteKeyMap: Record<string, PaqueteKey> = {
  Básico: 'basico',
  Emprendedor: 'emprendedor',
  Líder: 'lider',
};

const stepVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.25 } },
};

function EcuadorFlag({ className = '' }: { className?: string }) {
  // Usa el GIF animado de la bandera del Ecuador subido por el usuario.
  return (
    <img
      src="/ecuador-flag.gif"
      alt="Bandera del Ecuador"
      className={`object-cover rounded-[3px] shadow-md ring-1 ring-black/10 ${className}`}
    />
  );
}

/**
 * Cinta curva con los colores de la bandera del Ecuador. Va en las esquinas
 * del hero como un listón ondulado: la cinta superior-izquierda viene desde
 * arriba, hace una curva sobre el contenido y sale por la izquierda.
 * La cinta inferior-derecha hace lo opuesto (sale por la derecha-abajo).
 *
 * El "shape" es un rectángulo curvado relleno con un gradiente vertical que
 * crea las tres franjas (amarillo 50%, azul 25%, rojo 25%). Encima va una
 * capa con gradiente blanco→transparente para dar volumen / brillo.
 */
function EcuadorRibbon({
  variant,
  className = '',
}: {
  variant: 'top-left' | 'bottom-right';
  className?: string;
}) {
  const isTop = variant === 'top-left';
  const id = isTop ? 'tl' : 'br';

  // Path en forma de cinta con punta (V) en el extremo "interior".
  // El otro extremo sale fuera del viewport para simular que la cinta entra
  // desde la esquina. La punta es un pico triangular: la cinta sube hasta el
  // pico, hace un quiebre hacia afuera, y baja de regreso.
  // ViewBox 800x300, altura aproximada de la cinta ~120.
  const ribbonPath = isTop
    ? // Top-left: entra por arriba-izquierda, termina en punta hacia la derecha.
      'M -60 20 ' +
      'C 200 60, 380 220, 680 130 ' +     // curva descendente
      'L 770 188 ' +                       // diagonal a la punta exterior
      'L 680 250 ' +                       // diagonal de vuelta
      'C 380 340, 200 180, -60 140 Z'      // curva ascendente de regreso
    : // Bottom-right: entra por abajo-derecha, termina en punta hacia la izquierda.
      'M 860 80 ' +
      'C 580 -10, 380 140, 120 30 ' +      // curva ascendente
      'L 30 95 ' +                         // diagonal a la punta exterior izquierda
      'L 120 150 ' +                       // diagonal de vuelta
      'C 380 260, 580 110, 860 200 Z';     // curva descendente de regreso

  // Línea de brillo (sigue solo el borde superior, hasta la punta).
  const shinePath = isTop
    ? 'M -60 22 C 200 62, 380 222, 680 132 L 770 188'
    : 'M 860 82 C 580 -8, 380 142, 120 32 L 30 95';

  return (
    <svg
      viewBox="0 0 800 300"
      preserveAspectRatio="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Gradiente bandera del Ecuador: amarillo (mitad), azul, rojo */}
        <linearGradient id={`flag-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFDD00" />
          <stop offset="50%" stopColor="#FFDD00" />
          <stop offset="50%" stopColor="#0247FE" />
          <stop offset="75%" stopColor="#0247FE" />
          <stop offset="75%" stopColor="#E2002A" />
          <stop offset="100%" stopColor="#E2002A" />
        </linearGradient>

        {/* Brillo blanco que recorre la cinta longitudinalmente */}
        <linearGradient id={`shine-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Sombra de profundidad */}
        <filter id={`shadow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="0" dy="4" result="shadowOffset" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Sombra interior sutil para sugerir el "doblez" */}
        <linearGradient id={`shade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.15" />
          <stop offset="20%" stopColor="#000000" stopOpacity="0" />
          <stop offset="80%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Capa 1: la cinta con la bandera */}
      <path d={ribbonPath} fill={`url(#flag-${id})`} filter={`url(#shadow-${id})`} />
      {/* Capa 2: sombra interior (oscurece bordes superior e inferior) */}
      <path d={ribbonPath} fill={`url(#shade-${id})`} />
      {/* Capa 3: brillo metálico que viaja a lo largo */}
      <path d={ribbonPath} fill={`url(#shine-${id})`} opacity="0.9" />
      {/* Capa 4: línea de luz superior para brillo extra (se detiene en la punta) */}
      <path
        d={shinePath}
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { num: 1, label: 'Datos Personales' },
    { num: 2, label: 'Documentos' },
    { num: 3, label: 'Paquete' },
  ];

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {steps.map((s, i) => {
        const isActive = current === s.num;
        const isDone = current === 'done' || (typeof current === 'number' && current > s.num);
        return (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isDone
                    ? 'bg-[#1A4E26] text-white'
                    : isActive
                    ? 'bg-[#1A4E26] text-white shadow-[0_0_15px_rgba(26,78,38,0.3)]'
                    : 'bg-[#F4F7F5] border border-[#C8D8CB] text-[#9CA3AF]'
                }`}
              >
                {isDone ? <CheckCircle2 size={16} /> : s.num}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${isActive ? 'text-[#1A4E26]' : 'text-[#9CA3AF]'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-px mb-5 transition-all duration-300 ${
                typeof current === 'number' && current > s.num ? 'bg-[#1A4E26]' : 'bg-[#C8D8CB]'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function UploadArea({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  }

  return (
    <label className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-200 ${
      file ? 'border-[#1A4E26]/50 bg-[#EBF4ED]' : 'border-[#C8D8CB] bg-[#F4F7F5] hover:border-[#A8C2AD]'
    }`}>
      <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="sr-only" onChange={handleChange} />
      {file ? (
        <>
          <CheckCircle2 size={28} className="text-[#1A4E26]" />
          <p className="text-[#1A4E26] text-sm font-medium text-center truncate max-w-full">{file.name}</p>
        </>
      ) : (
        <>
          <Upload size={28} className="text-[#9CA3AF]" />
          <div className="text-center">
            <p className="text-[#6B7280] text-sm font-medium">{label}</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Haga clic o arrastre su archivo aquí</p>
            <p className="text-[#9CA3AF] text-[10px] mt-1">JPG, PNG, PDF · Máx 5 MB</p>
          </div>
        </>
      )}
    </label>
  );
}

async function uploadFile(file: File, cedula: string, name: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${cedula}/${Date.now()}-${name}.${ext}`;
  const { error } = await supabase.storage
    .from('documentos-afiliacion')
    .upload(path, file, { upsert: false });
  if (error) return null;
  return path;
}

export default function Registro() {
  useSEO({
    title: 'Solicitud de Afiliación — Sumak Vida Ecuador',
    description:
      'Únete a la red Sumak Vida Ecuador. Completa tu solicitud de afiliación con paquetes desde $125 y comienza tu negocio de bienestar natural.',
    url: '/registro',
  });

  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref')?.trim() ?? '';
  const [step, setStep] = useState<Step>(1);
  const [personal, setPersonal] = useState<PersonalData>({
    nombre: '', cedula: '', email: '', telefono: '', direccion: '', ciudad: '',
    patrocinador: refParam ? refParam.toUpperCase() : '',
  });
  const [refLocked, setRefLocked] = useState(!!refParam);
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [sponsorChecking, setSponsorChecking] = useState(false);
  const [sponsorInvalid, setSponsorInvalid] = useState(false);

  useEffect(() => {
    const code = personal.patrocinador.trim().toUpperCase();
    if (!code) {
      setSponsorName(null);
      setSponsorInvalid(false);
      return;
    }
    setSponsorChecking(true);
    setSponsorInvalid(false);
    const handle = setTimeout(async () => {
      // SEC-003: usar RPC pública que solo devuelve campos no sensibles
      // (id, código, nombre). No expone cédula, teléfono ni dirección.
      const { data } = await supabase.rpc('lookup_sponsor', { p_codigo: code });
      const sponsor = Array.isArray(data) ? data[0] : null;
      if (sponsor) {
        setSponsorName(sponsor.nombre_completo);
        setSponsorInvalid(false);
      } else {
        setSponsorName(null);
        setSponsorInvalid(true);
      }
      setSponsorChecking(false);
    }, 400);
    return () => clearTimeout(handle);
  }, [personal.patrocinador]);
  const [files, setFiles] = useState<UploadFiles>({
    cedulaFrente: null, cedulaReverso: null, planilla: null, voucher: null,
  });
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [copiedField, setCopiedField] = useState<string>('');

  function copyToClipboard(value: string, key: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(''), 1500);
    });
  }

  function handlePersonalChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPersonal((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function step1Valid(): boolean {
    return !!(
      personal.nombre &&
      personal.cedula &&
      validarCedulaEcuatoriana(personal.cedula) &&
      personal.email &&
      personal.telefono &&
      personal.direccion &&
      personal.ciudad
    );
  }

  // BIZ-014: feedback en tiempo real bajo el input de cédula.
  // Solo se muestra cuando el usuario ha escrito al menos 10 dígitos
  // (longitud completa de cédula EC) para no marcar inválido mientras escribe.
  const cedulaError =
    personal.cedula.length >= 10 ? explicarCedulaInvalida(personal.cedula) : null;

  async function handleSubmit() {
    if (!selectedPkg) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const uploadResults: Record<string, string | null> = {
        doc_cedula_frente: null,
        doc_cedula_reverso: null,
        doc_planilla: null,
        doc_voucher: null,
      };

      if (files.cedulaFrente) {
        setUploadProgress('Subiendo cédula (frente)...');
        uploadResults.doc_cedula_frente = await uploadFile(files.cedulaFrente, personal.cedula, 'cedula-frente');
      }
      if (files.cedulaReverso) {
        setUploadProgress('Subiendo cédula (reverso)...');
        uploadResults.doc_cedula_reverso = await uploadFile(files.cedulaReverso, personal.cedula, 'cedula-reverso');
      }
      if (files.planilla) {
        setUploadProgress('Subiendo planilla de servicios...');
        uploadResults.doc_planilla = await uploadFile(files.planilla, personal.cedula, 'planilla');
      }
      if (files.voucher) {
        setUploadProgress('Subiendo voucher de pago...');
        uploadResults.doc_voucher = await uploadFile(files.voucher, personal.cedula, 'voucher');
      }

      setUploadProgress('Guardando solicitud...');

      const paqueteKey: PaqueteKey = paqueteKeyMap[selectedPkg] ?? 'basico';

      const { error } = await supabase.from('afiliaciones').insert({
        nombre_completo: personal.nombre,
        cedula: personal.cedula,
        email: personal.email,
        telefono: personal.telefono,
        direccion: personal.direccion,
        ciudad: personal.ciudad,
        codigo_patrocinador: personal.patrocinador || null,
        paquete_seleccionado: paqueteKey,
        doc_cedula_frente: uploadResults.doc_cedula_frente,
        doc_cedula_reverso: uploadResults.doc_cedula_reverso,
        doc_planilla: uploadResults.doc_planilla,
        doc_voucher: uploadResults.doc_voucher,
      });

      if (error) {
        setSubmitError('Error al guardar la solicitud: ' + error.message);
        return;
      }

      setStep('done');
    } catch (err) {
      setSubmitError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      logger.error('Afiliación submit unexpected error', err);
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  }

  const benefits = [
    { icon: TrendingUp, title: 'Hasta 40% de comisión directa', desc: 'Por cada afiliación que patrocines.' },
    { icon: Users, title: 'Red binaria 14 niveles', desc: 'Comisiones por puntos en toda tu organización.' },
    { icon: Wallet, title: 'Activación accesible', desc: 'Mantén tu rango con solo $100/mes.' },
    { icon: ShieldCheck, title: 'Empresa registrada', desc: 'RUC ecuatoriano y operación legal en el país.' },
  ];

  return (
    <div className="bg-[#F4F7F5] min-h-screen">
      {/* Hero llamativo con bandera de Ecuador */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1A4E26] via-[#163F1E] to-[#0E2A14] pt-28 pb-32 px-4 sm:px-6">
        {/* Acentos decorativos */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #FFDD00 0%, transparent 40%), radial-gradient(circle at 80% 70%, #0247FE 0%, transparent 40%)',
        }} />
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#FFDD00]/5 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#E2002A]/5 blur-3xl" />

        {/* Cinta de bandera del Ecuador en la esquina superior-izquierda */}
        <motion.div
          initial={{ opacity: 0, x: -40, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute -top-4 -left-4 w-[58%] md:w-[48%] lg:w-[42%] pointer-events-none z-[1]"
          aria-hidden="true"
        >
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [0, 0.4, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <EcuadorRibbon variant="top-left" className="w-full h-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
          </motion.div>
        </motion.div>

        {/* Cinta de bandera del Ecuador en la esquina inferior-derecha */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
          className="absolute -bottom-4 -right-4 w-[58%] md:w-[48%] lg:w-[42%] pointer-events-none z-[1]"
          aria-hidden="true"
        >
          <motion.div
            animate={{ y: [0, 6, 0], rotate: [0, -0.4, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <EcuadorRibbon variant="bottom-right" className="w-full h-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
          </motion.div>
        </motion.div>

        {/* Destellos animados (sparkles) */}
        {[
          { left: '12%', top: '28%', delay: 0.0, size: 4 },
          { left: '88%', top: '20%', delay: 0.8, size: 3 },
          { left: '20%', top: '70%', delay: 1.6, size: 3 },
          { left: '78%', top: '78%', delay: 0.4, size: 4 },
          { left: '50%', top: '15%', delay: 2.2, size: 3 },
          { left: '35%', top: '85%', delay: 1.1, size: 3 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#FFDD00] pointer-events-none z-[1]"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              boxShadow: '0 0 12px 4px rgba(255,221,0,0.55)',
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.6, 1.4, 0.6],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: s.delay,
            }}
            aria-hidden="true"
          />
        ))}

        <div className="relative max-w-6xl mx-auto z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center"
          >
            {/* Badge bandera */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="inline-flex items-center gap-2.5 bg-black/30 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5 mb-7 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
            >
              <EcuadorFlag className="w-7 h-5" />
              <span className="text-white text-xs font-bold uppercase tracking-[0.18em]">
                100% Ecuatoriano · Hecho con orgullo
              </span>
            </motion.div>

            {/* Slogan principal con SUMAK metálico */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="font-heading font-black text-5xl sm:text-7xl lg:text-[5.5rem] leading-[1.02] tracking-tight mb-5 drop-shadow-[0_4px_15px_rgba(0,0,0,0.45)]"
            >
              <span className="text-white">Afíliate </span>
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(180deg, #FFE761 0%, #FFDD00 50%, #FFB800 100%)',
                }}
              >
                y crece
              </span>
              <br />
              <span className="text-white/95">con </span>
              <span
                className="bg-clip-text text-transparent inline-block"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #FFFFFF 0%, #E5E7EB 30%, #9CA3AF 55%, #E5E7EB 78%, #FFFFFF 100%)',
                }}
              >
                SUMAK
              </span>
            </motion.h1>

            {/* Hojita decorativa amarilla entre slogan y descripción */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="flex items-center justify-center gap-3 mb-7"
              aria-hidden="true"
            >
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#FFDD00]/60" />
              <motion.svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                animate={{ rotate: [-6, 6, -6] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path
                  d="M 12 22 Q 4 16 6 6 Q 14 8 16 16 Q 18 10 22 8 Q 20 18 12 22 Z"
                  fill="#FFDD00"
                  stroke="#FFDD00"
                  strokeWidth="1"
                />
              </motion.svg>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#FFDD00]/60" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95 }}
              className="text-white/85 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            >
              Transforma tu pasión por el bienestar en un negocio rentable. Únete a la red de
              distribuidores que está cambiando la salud del Ecuador, una familia a la vez.
            </motion.p>

            {/* Stats badges con resplandor amarillo */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="flex flex-wrap justify-center gap-3 sm:gap-4"
            >
              {[
                { icon: Rocket, label: 'Inicia desde $100' },
                { icon: Award, label: '14 niveles de comisiones' },
                { icon: Heart, label: '+1.000 familias activas' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -3, scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                  className="group relative flex items-center gap-2 bg-black/35 backdrop-blur-md border border-[#FFDD00]/25 rounded-2xl px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:border-[#FFDD00]/55 transition-colors"
                >
                  <div className="absolute -inset-px rounded-2xl bg-[#FFDD00]/0 group-hover:bg-[#FFDD00]/5 transition-colors" />
                  <s.icon size={17} className="text-[#FFDD00] drop-shadow-[0_0_8px_rgba(255,221,0,0.5)] relative" />
                  <span className="text-white text-sm font-semibold relative">{s.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contenido principal — formulario + panel lateral */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-20 relative z-10 pb-20">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna formulario */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#C8D8CB] rounded-2xl shadow-xl shadow-[#1A4E26]/5 p-6 sm:p-8">
              {step !== 'done' && (
                <div className="text-center mb-6">
                  <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] mb-1.5">
                    Solicitud de Afiliación
                  </h2>
                  <p className="text-[#6B7280] text-sm">
                    Completa estos 3 pasos y empieza tu camino con SUMAK.
                  </p>
                </div>
              )}

              {step !== 'done' && <StepIndicator current={step} />}

              <AnimatePresence mode="wait">
                {/* Step 1 */}
                {step === 1 && (
                  <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#1A4E26]/10 flex items-center justify-center text-[#1A4E26]">
                        <User size={20} />
                      </div>
                      <h2 className="font-heading font-bold text-xl text-[#111111]">Datos Personales</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { name: 'nombre', label: 'Nombre completo', required: true, placeholder: 'Juan Pérez' },
                        { name: 'cedula', label: 'Cédula de identidad', required: true, placeholder: '1234567890' },
                        { name: 'email', label: 'Email', required: true, placeholder: 'tu@email.com', type: 'email' },
                        { name: 'telefono', label: 'Teléfono', required: true, placeholder: '09XXXXXXXX', type: 'tel' },
                        { name: 'direccion', label: 'Dirección', required: true, placeholder: 'Av. Principal 123' },
                        { name: 'ciudad', label: 'Ciudad', required: true, placeholder: 'Babahoyo' },
                      ].map((field) => {
                        const isCedula = field.name === 'cedula';
                        const showCedulaError = isCedula && cedulaError;
                        const inputClasses = `w-full bg-white border rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none transition-colors duration-200 ${
                          showCedulaError
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-[#C8D8CB] focus:border-[#1A4E26]'
                        }`;
                        return (
                          <div key={field.name}>
                            <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                              {field.label} {field.required && <span className="text-[#1A4E26]">*</span>}
                            </label>
                            <input
                              name={field.name}
                              type={field.type ?? 'text'}
                              required={field.required}
                              placeholder={field.placeholder}
                              value={personal[field.name as keyof PersonalData]}
                              onChange={handlePersonalChange}
                              inputMode={isCedula ? 'numeric' : undefined}
                              maxLength={isCedula ? 10 : undefined}
                              aria-invalid={showCedulaError ? 'true' : undefined}
                              aria-describedby={showCedulaError ? 'cedula-error' : undefined}
                              className={inputClasses}
                            />
                            {/* BIZ-014: feedback validación cédula */}
                            {showCedulaError && (
                              <p id="cedula-error" className="mt-1.5 text-red-600 text-xs flex items-center gap-1.5">
                                <AlertCircle size={12} aria-hidden="true" /> {cedulaError}
                              </p>
                            )}
                            {isCedula && !cedulaError && personal.cedula.length === 10 && (
                              <p className="mt-1.5 text-[#1A4E26] text-xs flex items-center gap-1.5 font-medium">
                                <CheckCircle2 size={12} aria-hidden="true" /> Cédula válida
                              </p>
                            )}
                          </div>
                        );
                      })}
                      <div className="sm:col-span-2">
                        <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span>Código del Patrocinador <span className="text-[#9CA3AF] font-normal">(opcional)</span></span>
                          {refLocked && (
                            <span className="inline-flex items-center gap-1 text-[#1A4E26] text-[10px] font-bold normal-case tracking-normal">
                              <Sparkles size={11} /> Invitado por referido
                            </span>
                          )}
                        </label>
                        <input
                          name="patrocinador"
                          type="text"
                          placeholder="SUMAK-XXXXX"
                          value={personal.patrocinador}
                          onChange={(e) => setPersonal((prev) => ({ ...prev, patrocinador: e.target.value.toUpperCase() }))}
                          readOnly={refLocked}
                          className={`w-full border rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none transition-colors duration-200 ${
                            refLocked
                              ? 'bg-[#EBF4ED] border-[#1A4E26]/30 cursor-not-allowed'
                              : sponsorInvalid
                              ? 'bg-white border-amber-300 focus:border-amber-500'
                              : sponsorName
                              ? 'bg-white border-[#1A4E26]/30 focus:border-[#1A4E26]'
                              : 'bg-white border-[#C8D8CB] focus:border-[#1A4E26]'
                          }`}
                        />
                        {personal.patrocinador.trim() && (
                          <div className="mt-2">
                            {sponsorChecking ? (
                              <p className="text-[#9CA3AF] text-xs flex items-center gap-1.5">
                                <span className="w-3 h-3 border-2 border-[#9CA3AF] border-t-transparent rounded-full animate-spin" />
                                Verificando código...
                              </p>
                            ) : sponsorName ? (
                              <p className="text-[#1A4E26] text-xs flex items-center gap-1.5 font-medium">
                                <CheckCircle2 size={13} /> Patrocinador: <strong>{sponsorName}</strong>
                              </p>
                            ) : sponsorInvalid ? (
                              <p className="text-amber-600 text-xs flex items-center gap-1.5">
                                <AlertCircle size={13} /> Código no encontrado. Verifica con tu patrocinador.
                              </p>
                            ) : null}
                          </div>
                        )}
                        {refLocked && (
                          <button
                            type="button"
                            onClick={() => { setRefLocked(false); }}
                            className="mt-2 text-[#6B7280] text-[11px] underline hover:text-[#111111]"
                          >
                            Editar código manualmente
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => step1Valid() && setStep(2)}
                      disabled={!step1Valid()}
                      className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-[#1A4E26] to-[#256B36] text-white font-bold text-sm hover:from-[#163F1E] hover:to-[#1F5A2D] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_-8px_rgba(26,78,38,0.5)] transition-all duration-200"
                    >
                      Siguiente →
                    </button>
                  </motion.div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#1A4E26]/10 flex items-center justify-center text-[#1A4E26]">
                        <FileText size={20} />
                      </div>
                      <h2 className="font-heading font-bold text-xl text-[#111111]">Documentos Requeridos</h2>
                    </div>

                    {/* Cuentas bancarias para el deposito/transferencia */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Landmark size={18} className="text-[#1A4E26]" />
                        <h3 className="font-heading font-bold text-base text-[#111111]">
                          Realiza tu depósito o transferencia
                        </h3>
                      </div>
                      <div className="flex items-start gap-2.5 bg-[#FFF8E1] border border-[#FFDD00]/40 rounded-xl px-4 py-3 mb-4">
                        <Info size={16} className="text-[#B8860B] shrink-0 mt-0.5" />
                        <p className="text-[#6B4F00] text-xs leading-relaxed">
                          Deposita o transfiere el valor del paquete que vas a seleccionar a una de
                          estas cuentas. Luego sube el <strong>voucher de pago</strong> abajo junto
                          con tus documentos.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {bankAccounts.map((b) => (
                          <div
                            key={b.banco}
                            className="rounded-xl border border-[#C8D8CB] bg-gradient-to-br from-white to-[#F4F7F5] overflow-hidden"
                          >
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#1A4E26] text-white">
                              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                                <Landmark size={16} className="text-[#FFDD00]" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-heading font-bold text-sm leading-tight">{b.banco}</p>
                                <p className="text-white/70 text-[11px]">{b.tipo}</p>
                              </div>
                            </div>

                            <div className="p-3 space-y-2">
                              {[
                                { label: 'N° de Cuenta', value: b.numero, key: `${b.banco}-num`, highlight: true },
                                { label: 'Titular', value: b.titular, key: `${b.banco}-tit` },
                                { label: 'Identificación', value: b.identificacion, key: `${b.banco}-id` },
                                ...(b.email ? [{ label: 'Email', value: b.email, key: `${b.banco}-em` }] : []),
                              ].map((row) => (
                                <div
                                  key={row.key}
                                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 border ${
                                    row.highlight
                                      ? 'bg-[#EBF4ED] border-[#1A4E26]/30'
                                      : 'bg-white border-[#E5E7EB]'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF] font-bold">
                                      {row.label}
                                    </p>
                                    <p className={`font-mono font-semibold truncate ${
                                      row.highlight ? 'text-[#1A4E26] text-base' : 'text-[#111111] text-xs'
                                    }`}>
                                      {row.value}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(row.value, row.key)}
                                    className="shrink-0 inline-flex items-center gap-1 text-[#1A4E26] hover:bg-[#EBF4ED] active:bg-[#D7E8DA] rounded-md px-2 py-1.5 text-[10px] font-semibold transition-colors"
                                    aria-label={`Copiar ${row.label}`}
                                  >
                                    {copiedField === row.key ? (
                                      <>
                                        <Check size={11} /> Copiado
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} /> Copiar
                                      </>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-[#C8D8CB]" />
                      <span className="text-[#6B7280] text-[11px] font-bold uppercase tracking-widest">
                        Sube tus documentos
                      </span>
                      <div className="flex-1 h-px bg-[#C8D8CB]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <UploadArea
                        label="Cédula (frente)"
                        file={files.cedulaFrente}
                        onFile={(f) => setFiles((prev) => ({ ...prev, cedulaFrente: f }))}
                      />
                      <UploadArea
                        label="Cédula (reverso)"
                        file={files.cedulaReverso}
                        onFile={(f) => setFiles((prev) => ({ ...prev, cedulaReverso: f }))}
                      />
                      <UploadArea
                        label="Planilla de servicios básicos"
                        file={files.planilla}
                        onFile={(f) => setFiles((prev) => ({ ...prev, planilla: f }))}
                      />
                      <UploadArea
                        label="Voucher de pago"
                        file={files.voucher}
                        onFile={(f) => setFiles((prev) => ({ ...prev, voucher: f }))}
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 py-4 rounded-xl border border-[#C8D8CB] text-[#6B7280] font-semibold text-sm hover:border-[#A8C2AD] hover:text-[#111111] transition-all duration-200"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-[#1A4E26] to-[#256B36] text-white font-bold text-sm hover:from-[#163F1E] hover:to-[#1F5A2D] shadow-[0_8px_20px_-8px_rgba(26,78,38,0.5)] transition-all duration-200"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#1A4E26]/10 flex items-center justify-center text-[#1A4E26]">
                        <Package size={20} />
                      </div>
                      <h2 className="font-heading font-bold text-xl text-[#111111]">Selección de Paquete</h2>
                    </div>

                    {submitError && (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-600 text-sm">{submitError}</p>
                      </div>
                    )}

                    {submitting && (
                      <div className="flex items-center gap-3 bg-[#EBF4ED] border border-[#1A4E26]/30 rounded-xl px-4 py-3 mb-4">
                        <div className="w-4 h-4 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin shrink-0" />
                        <p className="text-[#1A4E26] text-sm">{uploadProgress || 'Procesando...'}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-4 mb-6">
                      {affiliatePackages.map((pkg) => {
                        const isSelected = selectedPkg === pkg.nombre;
                        return (
                          <label
                            key={pkg.nombre}
                            className={`relative flex items-start gap-4 border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-[#1A4E26] bg-[#EBF4ED] shadow-[0_0_20px_rgba(26,78,38,0.1)]'
                                : 'border-[#C8D8CB] bg-white hover:border-[#A8C2AD]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="package"
                              value={pkg.nombre}
                              checked={isSelected}
                              onChange={() => setSelectedPkg(pkg.nombre)}
                              className="mt-1 accent-[#1A4E26]"
                            />
                            <div className="flex-grow">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-heading font-bold text-lg text-[#111111]">{pkg.nombre}</span>
                                  {pkg.destacado && (
                                    <span className="bg-[#1A4E26] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <span className="font-heading font-bold text-2xl text-[#1A4E26]">${pkg.precio}</span>
                              </div>
                              <div className="flex gap-4 mt-2 mb-3">
                                <span className="text-xs text-[#6B7280]">{pkg.puntos} puntos</span>
                                <span className="text-xs text-[#6B7280]">{pkg.productos} productos</span>
                                <span className="text-xs text-[#1A4E26] font-medium">50% descuento</span>
                              </div>
                              <ul className="flex flex-col gap-1.5">
                                {pkg.beneficios.map((b) => (
                                  <li key={b} className="flex items-center gap-2 text-xs text-[#6B7280]">
                                    <CheckCircle2 size={12} className="text-[#1A4E26] shrink-0" />
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(2)}
                        disabled={submitting}
                        className="flex-1 py-4 rounded-xl border border-[#C8D8CB] text-[#6B7280] font-semibold text-sm hover:border-[#A8C2AD] hover:text-[#111111] transition-all duration-200 disabled:opacity-40"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!selectedPkg || submitting}
                        className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-[#1A4E26] to-[#256B36] text-white font-bold text-sm hover:from-[#163F1E] hover:to-[#1F5A2D] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_-8px_rgba(26,78,38,0.5)] transition-all duration-200"
                      >
                        {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Done */}
                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-6"
                  >
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#1A4E26] to-[#256B36] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(26,78,38,0.3)]">
                      <CheckCircle2 size={48} className="text-white" />
                      <div className="absolute -top-2 -right-2">
                        <EcuadorFlag className="w-8 h-6" />
                      </div>
                    </div>
                    <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#111111] mb-3">
                      ¡Bienvenido a la familia SUMAK!
                    </h2>
                    <p className="text-[#6B7280] text-base leading-relaxed max-w-md mx-auto mb-8">
                      Tu solicitud está en revisión. El equipo de SUMAK verificará tus documentos
                      y te contactará en los próximos días hábiles con tus credenciales de acceso
                      y tu código de distribuidor.
                    </p>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#1A4E26] to-[#256B36] text-white font-bold hover:from-[#163F1E] hover:to-[#1F5A2D] shadow-[0_8px_20px_-8px_rgba(26,78,38,0.5)] transition-all duration-200"
                    >
                      Volver al Inicio
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Panel lateral con beneficios */}
          <aside className="space-y-5">
            {/* Card "Por qué afiliarte" */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-lg shadow-[#1A4E26]/5"
            >
              <div className="flex items-center gap-2 mb-5">
                <Sparkles size={18} className="text-[#1A4E26]" />
                <h3 className="font-heading font-bold text-lg text-[#111111]">
                  ¿Por qué afiliarte?
                </h3>
              </div>
              <ul className="space-y-4">
                {benefits.map((b) => (
                  <li key={b.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1A4E26] to-[#256B36] flex items-center justify-center text-white shrink-0">
                      <b.icon size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#111111] leading-tight">{b.title}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Card "Hecho en Ecuador" */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#1A4E26] via-[#163F1E] to-[#0E2A14] text-white shadow-lg shadow-[#1A4E26]/20"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#FFDD00]/10 blur-2xl" />
              <div className="relative">
                <EcuadorFlag className="w-12 h-8 mb-4" />
                <h3 className="font-heading font-bold text-lg mb-2">
                  Hecho con orgullo en Ecuador 🇪🇨
                </h3>
                <p className="text-white/75 text-sm leading-relaxed mb-4">
                  SUMAK es una empresa <strong className="text-white">100% ecuatoriana</strong>,
                  con productos formulados a base de plantas medicinales de nuestra tierra.
                </p>
                <div className="flex items-center gap-2 text-xs text-[#FFDD00] font-semibold">
                  <Leaf size={14} />
                  <span>Bienestar natural · Tradición andina</span>
                </div>
              </div>
            </motion.div>

            {/* Card testimonial / CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-[#FFB800]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#111111] text-sm italic leading-relaxed mb-3">
                "Empecé con el paquete Básico hace 8 meses. Hoy tengo una red de 47 personas
                y un ingreso adicional que cambió la vida de mi familia."
              </p>
              <p className="text-[#1A4E26] text-xs font-bold">
                María C. · Distribuidora Líder · Guayaquil
              </p>
            </motion.div>

            {/* Login link */}
            <div className="text-center bg-white border border-[#C8D8CB] rounded-2xl p-5">
              <p className="text-[#6B7280] text-sm">¿Ya tienes cuenta?</p>
              <Link to="/login" className="text-[#1A4E26] font-bold text-sm hover:underline">
                Inicia sesión aquí →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
