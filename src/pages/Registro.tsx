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
  return (
    <div className={`relative overflow-hidden rounded-[3px] shadow-md ring-1 ring-black/10 ${className}`}>
      <div className="absolute inset-0 flex flex-col">
        <div className="h-1/2 bg-[#FFDD00]" />
        <div className="h-1/4 bg-[#0247FE]" />
        <div className="h-1/4 bg-[#E2002A]" />
      </div>
    </div>
  );
}

function GlobeSVG({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="globeGlow" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFDD00" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#FFDD00" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFDD00" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Glow de fondo */}
      <circle cx="120" cy="120" r="115" fill="url(#globeGlow)" />
      {/* Esfera */}
      <circle cx="120" cy="120" r="100" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2" />
      {/* Paralelos (ecuador y trópicos) */}
      <ellipse cx="120" cy="120" rx="100" ry="22" stroke="#FFDD00" strokeOpacity="0.7" strokeWidth="1.5" />
      <ellipse cx="120" cy="120" rx="95" ry="55" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1.2" />
      <ellipse cx="120" cy="120" rx="95" ry="85" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1.2" />
      {/* Meridianos */}
      <ellipse cx="120" cy="120" rx="35" ry="100" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.5" />
      <ellipse cx="120" cy="120" rx="70" ry="100" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.2" />
      <line x1="120" y1="20" x2="120" y2="220" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.5" />
      {/* Sudamérica estilizada (Ecuador resaltado) */}
      <path
        d="M 108 95 Q 118 90 128 100 Q 134 112 132 128 Q 130 148 122 168 Q 116 178 108 175 Q 100 165 102 148 Q 98 130 104 115 Z"
        fill="#FFDD00"
        fillOpacity="0.55"
        stroke="#FFDD00"
        strokeOpacity="0.9"
        strokeWidth="1.2"
      />
      {/* Pin Ecuador */}
      <circle cx="113" cy="120" r="4" fill="#E2002A" />
      <circle cx="113" cy="120" r="7" fill="none" stroke="#E2002A" strokeOpacity="0.6" strokeWidth="1.5" />
    </svg>
  );
}

function HandSVG({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="handFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FFDD00" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Resplandor sobre la palma */}
      <ellipse cx="100" cy="60" rx="50" ry="30" fill="#FFDD00" fillOpacity="0.18" />
      {/* Palma + brazo (mano abierta hacia arriba ofreciendo) */}
      <path
        d="M 55 220
           L 55 150
           Q 55 130 65 120
           L 65 80
           Q 65 70 75 70
           Q 85 70 85 80
           L 85 115
           L 88 115
           L 88 55
           Q 88 45 98 45
           Q 108 45 108 55
           L 108 115
           L 112 115
           L 112 50
           Q 112 40 122 40
           Q 132 40 132 50
           L 132 115
           L 136 115
           L 136 65
           Q 136 55 146 55
           Q 156 55 156 65
           L 156 130
           Q 156 145 148 155
           L 148 220
           Z"
        fill="url(#handFill)"
        stroke="#FFFFFF"
        strokeOpacity="0.85"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Líneas de la palma */}
      <path
        d="M 75 175 Q 100 185 130 170"
        stroke="#FFFFFF"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 80 195 Q 105 200 125 192"
        stroke="#FFFFFF"
        strokeOpacity="0.25"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Hoja brotando de la palma (símbolo de crecimiento) */}
      <g transform="translate(100 110)">
        <path
          d="M 0 20 Q -2 0 0 -25"
          stroke="#FFDD00"
          strokeOpacity="0.9"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 0 -5 Q -12 -8 -16 -22 Q -8 -22 0 -15 Z"
          fill="#FFDD00"
          fillOpacity="0.55"
          stroke="#FFDD00"
          strokeOpacity="0.9"
          strokeWidth="1.5"
        />
        <path
          d="M 0 -15 Q 10 -20 14 -32 Q 6 -32 0 -25 Z"
          fill="#FFDD00"
          fillOpacity="0.4"
          stroke="#FFDD00"
          strokeOpacity="0.85"
          strokeWidth="1.5"
        />
      </g>
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
    return !!(personal.nombre && personal.cedula && personal.email && personal.telefono && personal.direccion && personal.ciudad);
  }

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
      console.error(err);
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

        {/* Franja superior con colores de Ecuador */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="flex-[2] bg-[#FFDD00]" />
          <div className="flex-1 bg-[#0247FE]" />
          <div className="flex-1 bg-[#E2002A]" />
        </div>

        {/* SVG decorativos: globo a la izquierda, mano a la derecha */}
        <motion.div
          initial={{ opacity: 0, x: -40, rotate: -8 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="hidden md:block absolute left-2 lg:left-10 top-1/2 -translate-y-1/2 w-44 lg:w-64 pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <GlobeSVG className="w-full h-auto drop-shadow-[0_0_30px_rgba(255,221,0,0.25)]" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40, rotate: 8 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          className="hidden md:block absolute right-2 lg:right-10 top-1/2 -translate-y-1/2 w-40 lg:w-56 pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <HandSVG className="w-full h-auto drop-shadow-[0_0_30px_rgba(255,221,0,0.25)]" />
          </motion.div>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Badge bandera */}
            <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <EcuadorFlag className="w-6 h-4" />
              <span className="text-white text-xs font-bold uppercase tracking-widest">
                100% Ecuatoriano · Hecho con orgullo
              </span>
            </div>

            {/* Slogan principal */}
            <h1 className="font-heading font-black text-4xl sm:text-6xl lg:text-7xl text-white leading-[1.05] tracking-tight mb-5">
              Afíliate <span className="bg-gradient-to-r from-[#FFDD00] to-[#FFB800] bg-clip-text text-transparent">y crece</span>
              <br />
              <span className="text-white/90 text-3xl sm:text-5xl lg:text-6xl">con SUMAK</span>
            </h1>

            <p className="text-white/75 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
              Transforma tu pasión por el bienestar en un negocio rentable. Únete a la red de
              distribuidores que está cambiando la salud del Ecuador, una familia a la vez.
            </p>

            {/* Stats badges */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2.5">
                <Rocket size={16} className="text-[#FFDD00]" />
                <span className="text-white text-sm font-semibold">Inicia desde $100</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2.5">
                <Award size={16} className="text-[#FFDD00]" />
                <span className="text-white text-sm font-semibold">14 niveles de comisiones</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2.5">
                <Heart size={16} className="text-[#FFDD00]" />
                <span className="text-white text-sm font-semibold">+1.000 familias activas</span>
              </div>
            </div>
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
                      ].map((field) => (
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
                            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200"
                          />
                        </div>
                      ))}
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
