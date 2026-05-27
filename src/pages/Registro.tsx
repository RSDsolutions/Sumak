import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { CheckCircle2, Upload, User, FileText, Package } from 'lucide-react';
import { affiliatePackages } from '../data';

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
                    ? 'bg-[#00A86B] text-white'
                    : isActive
                    ? 'bg-[#00A86B] text-white shadow-[0_0_15px_rgba(0,168,107,0.4)]'
                    : 'bg-[#1A1A1A] border border-[#2E2E2E] text-[#555555]'
                }`}
              >
                {isDone ? <CheckCircle2 size={16} /> : s.num}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${isActive ? 'text-[#00A86B]' : 'text-[#555555]'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-px mb-5 transition-all duration-300 ${
                typeof current === 'number' && current > s.num ? 'bg-[#00A86B]' : 'bg-[#2E2E2E]'
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
      file ? 'border-[#00A86B]/60 bg-[#1A2A20]' : 'border-[#2E2E2E] bg-[#1A1A1A] hover:border-[#3A3A3A]'
    }`}>
      <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="sr-only" onChange={handleChange} />
      {file ? (
        <>
          <CheckCircle2 size={28} className="text-[#00A86B]" />
          <p className="text-[#00A86B] text-sm font-medium text-center truncate max-w-full">{file.name}</p>
        </>
      ) : (
        <>
          <Upload size={28} className="text-[#555555]" />
          <div className="text-center">
            <p className="text-[#888888] text-sm font-medium">{label}</p>
            <p className="text-[#555555] text-xs mt-1">Haga clic o arrastre su archivo aquí</p>
            <p className="text-[#444444] text-[10px] mt-1">JPG, PNG, PDF · Máx 5 MB</p>
          </div>
        </>
      )}
    </label>
  );
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

  function handlePersonalChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPersonal((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function step1Valid(): boolean {
    return !!(personal.nombre && personal.cedula && personal.email && personal.telefono && personal.direccion && personal.ciudad);
  }

  function handleSubmit() {
    setStep('done');
  }

  return (
    <div className="bg-[#0F0F0F] min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#F0F0F0] mb-2">
            Solicitud de Afiliación
          </h1>
          <p className="text-[#888888] text-sm">
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
              className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B]">
                  <User size={20} />
                </div>
                <h2 className="font-heading font-bold text-xl text-[#F0F0F0]">Datos Personales</h2>
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
                    <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                      {field.label} {field.required && <span className="text-[#00A86B]">*</span>}
                    </label>
                    <input
                      name={field.name}
                      type={field.type ?? 'text'}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={personal[field.name as keyof PersonalData]}
                      onChange={handlePersonalChange}
                      className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                    Código del Patrocinador <span className="text-[#555555] font-normal">(opcional)</span>
                  </label>
                  <input
                    name="patrocinador"
                    type="text"
                    placeholder="SUMAK-XXXXX"
                    value={personal.patrocinador}
                    onChange={handlePersonalChange}
                    className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors duration-200"
                  />
                </div>
              </div>

              <button
                onClick={() => step1Valid() && setStep(2)}
                disabled={!step1Valid()}
                className="w-full mt-6 py-4 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,168,107,0.2)] transition-all duration-200"
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
              className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B]">
                  <FileText size={20} />
                </div>
                <h2 className="font-heading font-bold text-xl text-[#F0F0F0]">Documentos Requeridos</h2>
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
                  className="flex-1 py-4 rounded-xl border border-[#2E2E2E] text-[#888888] font-semibold text-sm hover:border-[#3A3A3A] hover:text-[#F0F0F0] transition-all duration-200"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] py-4 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] shadow-[0_0_20px_rgba(0,168,107,0.2)] transition-all duration-200"
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
              className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#00A86B]/10 flex items-center justify-center text-[#00A86B]">
                  <Package size={20} />
                </div>
                <h2 className="font-heading font-bold text-xl text-[#F0F0F0]">Selección de Paquete</h2>
              </div>

              <div className="flex flex-col gap-4 mb-6">
                {affiliatePackages.map((pkg) => {
                  const isSelected = selectedPkg === pkg.nombre;
                  return (
                    <label
                      key={pkg.nombre}
                      className={`relative flex items-start gap-4 border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-[#00A86B] bg-[#1A2A20] shadow-[0_0_20px_rgba(0,168,107,0.15)]'
                          : 'border-[#2E2E2E] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="package"
                        value={pkg.nombre}
                        checked={isSelected}
                        onChange={() => setSelectedPkg(pkg.nombre)}
                        className="mt-1 accent-[#00A86B]"
                      />
                      <div className="flex-grow">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-lg text-[#F0F0F0]">{pkg.nombre}</span>
                            {pkg.destacado && (
                              <span className="bg-[#00A86B] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                          <span className="font-heading font-bold text-2xl text-[#00A86B]">${pkg.precio}</span>
                        </div>
                        <div className="flex gap-4 mt-2 mb-3">
                          <span className="text-xs text-[#888888]">{pkg.puntos} puntos</span>
                          <span className="text-xs text-[#888888]">{pkg.productos} productos</span>
                          <span className="text-xs text-[#00A86B] font-medium">50% descuento</span>
                        </div>
                        <ul className="flex flex-col gap-1.5">
                          {pkg.beneficios.map((b) => (
                            <li key={b} className="flex items-center gap-2 text-xs text-[#888888]">
                              <CheckCircle2 size={12} className="text-[#00A86B] shrink-0" />
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
                  className="flex-1 py-4 rounded-xl border border-[#2E2E2E] text-[#888888] font-semibold text-sm hover:border-[#3A3A3A] hover:text-[#F0F0F0] transition-all duration-200"
                >
                  ← Anterior
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedPkg}
                  className="flex-[2] py-4 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,168,107,0.2)] transition-all duration-200"
                >
                  Enviar Solicitud
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
              className="bg-[#1A1A1A] border border-[#00A86B]/40 rounded-2xl p-10 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-[#00A86B]/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={40} className="text-[#00A86B]" />
              </div>
              <h2 className="font-heading font-bold text-3xl text-[#F0F0F0] mb-4">¡Solicitud Enviada!</h2>
              <p className="text-[#AAAAAA] text-base leading-relaxed max-w-md mx-auto mb-8">
                Tu solicitud de afiliación está en revisión. El equipo de SUMAK verificará tus
                documentos y te contactará en los próximos días hábiles con tus credenciales de
                acceso y tu código de distribuidor.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#00A86B] text-white font-bold hover:bg-[#008F5A] shadow-[0_0_20px_rgba(0,168,107,0.25)] transition-all duration-200"
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
