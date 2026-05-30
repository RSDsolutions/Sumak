import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { CheckCircle2, Upload, User, FileText, Package, AlertCircle } from 'lucide-react';
import { affiliatePackages } from '../data';
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

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { num: 1, label: 'Datos Personales' },
    { num: 2, label: 'Documentos' },
    { num: 3, label: 'Paquete' },
  ];

  return (
    <div className="flex items-center justify-center gap-3 mb-10">
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
  const [step, setStep] = useState<Step>(1);
  const [personal, setPersonal] = useState<PersonalData>({
    nombre: '', cedula: '', email: '', telefono: '', direccion: '', ciudad: '', patrocinador: '',
  });
  const [files, setFiles] = useState<UploadFiles>({
    cedulaFrente: null, cedulaReverso: null, planilla: null, voucher: null,
  });
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submitError, setSubmitError] = useState('');

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

  return (
    <div className="bg-[#F4F7F5] min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-2">
            Solicitud de Afiliación
          </h1>
          <p className="text-[#6B7280] text-sm">
            Únete a la red SUMAK y comienza tu negocio de bienestar natural.
          </p>
        </div>

        {step !== 'done' && <StepIndicator current={step} />}

        <AnimatePresence mode="wait">
          {/* Step 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white border border-[#C8D8CB] rounded-2xl p-6 sm:p-8"
            >
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
                  <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
                    Código del Patrocinador <span className="text-[#9CA3AF] font-normal">(opcional)</span>
                  </label>
                  <input
                    name="patrocinador"
                    type="text"
                    placeholder="SUMAK-XXXXX"
                    value={personal.patrocinador}
                    onChange={handlePersonalChange}
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors duration-200"
                  />
                </div>
              </div>

              <button
                onClick={() => step1Valid() && setStep(2)}
                disabled={!step1Valid()}
                className="w-full mt-6 py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(26,78,38,0.2)] transition-all duration-200"
              >
                Siguiente →
              </button>
            </motion.div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white border border-[#C8D8CB] rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1A4E26]/10 flex items-center justify-center text-[#1A4E26]">
                  <FileText size={20} />
                </div>
                <h2 className="font-heading font-bold text-xl text-[#111111]">Documentos Requeridos</h2>
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
                  className="flex-[2] py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] shadow-[0_0_20px_rgba(26,78,38,0.2)] transition-all duration-200"
                >
                  Siguiente →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white border border-[#C8D8CB] rounded-2xl p-6 sm:p-8"
            >
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
                  className="flex-[2] py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(26,78,38,0.2)] transition-all duration-200"
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
              className="bg-white border border-[#1A4E26]/30 rounded-2xl p-10 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-[#1A4E26]/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={40} className="text-[#1A4E26]" />
              </div>
              <h2 className="font-heading font-bold text-3xl text-[#111111] mb-4">¡Solicitud Enviada!</h2>
              <p className="text-[#6B7280] text-base leading-relaxed max-w-md mx-auto mb-8">
                Tu solicitud de afiliación está en revisión. El equipo de SUMAK verificará tus
                documentos y te contactará en los próximos días hábiles con tus credenciales de
                acceso y tu código de distribuidor.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#1A4E26] text-white font-bold hover:bg-[#163F1E] shadow-[0_0_20px_rgba(26,78,38,0.25)] transition-all duration-200"
              >
                Volver al Inicio
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
