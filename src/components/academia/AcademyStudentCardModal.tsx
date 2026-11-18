import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Download,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Loader2,
  Eye,
  Layers,
} from 'lucide-react';
import Modal from '../Modal';
import Avatar from '../Avatar';
import type { Profile } from '../../lib/types';
import {
  type AcademyStudentCardData,
  getAcademyStudentCode,
  getAcademyAcademicRank,
  getStudentInitials,
  renderAcademyRoundedQR,
  renderAcademyStudentCardFront,
  renderAcademyStudentCardBack,
  renderAcademyStudentCardDual,
} from '../../lib/academyCardCanvas';

interface AcademyStudentCardModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  activeCoursesCount: number;
  completedCoursesCount: number;
  diplomasCount: number;
}

type TabView = 'dual' | 'front' | 'back' | 'qr';

export default function AcademyStudentCardModal({
  open,
  onClose,
  profile,
  activeCoursesCount,
  completedCoursesCount,
  diplomasCount,
}: AcademyStudentCardModalProps) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [hasGeneratedCard, setHasGeneratedCard] = useState(false);
  const [hasGeneratedQR, setHasGeneratedQR] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('dual');

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [frontDataUrl, setFrontDataUrl] = useState<string>('');
  const [backDataUrl, setBackDataUrl] = useState<string>('');
  const [dualDataUrl, setDualDataUrl] = useState<string>('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sumakecuador.com';
  const studentCode = getAcademyStudentCode(profile?.id, profile?.fecha_registro);
  const fullName = profile?.nombre_completo || profile?.username || 'Estudiante SUMAK Academy';
  const qrTargetUrl = `${baseUrl}/academia/credencial?uid=${profile?.id || ''}&matricula=${studentCode}`;

  const studentData: AcademyStudentCardData = {
    userId: profile?.id || '',
    fullName,
    studentCode,
    academicRank: getAcademyAcademicRank(activeCoursesCount, completedCoursesCount, diplomasCount),
    facultyLabel: 'Escuela de Biomedicina Ancestral y Salud Renal',
    status: (profile?.estado?.toUpperCase() as AcademyStudentCardData['status']) || 'ACTIVO',
    avatarInitials: getStudentInitials(fullName),
    avatarImage: profile?.avatar_url || undefined,
    ciudad: profile?.ciudad || undefined,
    registeredAt: profile?.fecha_registro || undefined,
    activeCoursesCount,
    completedCoursesCount,
    diplomasCount,
    qrUrl: qrTargetUrl,
  };

  useEffect(() => {
    if (open) {
      setGenerating(false);
      setHasGeneratedCard(false);
      setHasGeneratedQR(false);
      setQrDataUrl('');
      setFrontDataUrl('');
      setBackDataUrl('');
      setDualDataUrl('');
      setActiveTab('dual');
    }
  }, [open]);

  const handleGenerateOnlyQR = async () => {
    setGenerating(true);
    try {
      if (!qrCanvasRef.current) return;
      await renderAcademyRoundedQR(qrCanvasRef.current, qrTargetUrl, '/logo_qr.png', 1000, '#0F2E18');
      setQrDataUrl(qrCanvasRef.current.toDataURL('image/png'));
      setHasGeneratedQR(true);
      setActiveTab('qr');
      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err) {
      console.error('Error generando QR estudiantil:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFullCard = async () => {
    setGenerating(true);
    try {
      if (!qrCanvasRef.current || !frontCanvasRef.current || !backCanvasRef.current || !dualCanvasRef.current) {
        return;
      }

      await renderAcademyRoundedQR(qrCanvasRef.current, qrTargetUrl, '/logo_qr.png', 1000, '#0F2E18');
      setQrDataUrl(qrCanvasRef.current.toDataURL('image/png'));

      await renderAcademyStudentCardFront(frontCanvasRef.current, studentData, 1000, 1500);
      setFrontDataUrl(frontCanvasRef.current.toDataURL('image/png'));

      await renderAcademyStudentCardBack(backCanvasRef.current, studentData, qrCanvasRef.current, 1000, 1500);
      setBackDataUrl(backCanvasRef.current.toDataURL('image/png'));

      renderAcademyStudentCardDual(dualCanvasRef.current, frontCanvasRef.current, backCanvasRef.current);
      setDualDataUrl(dualCanvasRef.current.toDataURL('image/png'));

      setHasGeneratedCard(true);
      setHasGeneratedQR(true);
      setActiveTab('dual');

      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err) {
      console.error('Error generando credencial estudiantil:', err);
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const sanitizeName = (str?: string | null) => (str || 'estudiante').replace(/\s+/g, '_').toLowerCase();
  const baseFilename = `CREDENCIAL_ACADEMIA_${studentCode}_${sanitizeName(profile?.nombre_completo)}`;

  return (
    <Modal open={open} onClose={onClose} size="lg" className="max-h-[92vh] overflow-y-auto">
      <div className="hidden">
        <canvas ref={qrCanvasRef} />
        <canvas ref={frontCanvasRef} />
        <canvas ref={backCanvasRef} />
        <canvas ref={dualCanvasRef} />
      </div>

      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8D8CB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F2E18] text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/40">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="font-heading font-black text-lg text-[#111111] leading-tight">
                Credencial Estudiantil — SUMAK Academy
              </h2>
              <p className="text-xs text-[#6B7280]">
                Carnet académico oficial con código QR de verificación estudiantil
              </p>
            </div>
          </div>
        </div>

        {/* Resumen del Estudiante */}
        <div className="flex flex-col items-center text-center p-4 bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl">
          <div className="relative mb-3">
            <div className="ring-4 ring-[#D4AF37] rounded-full p-0.5 shadow-sm">
              <Avatar profile={profile} size={80} />
            </div>
            <span
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#0F2E18] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37]"
              title="Estudiante Verificado"
            >
              <GraduationCap size={12} />
            </span>
          </div>

          <h3 className="font-heading font-black text-base text-[#0F2E18]">{fullName}</h3>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
            <span className="inline-flex items-center px-3 py-0.5 rounded-lg bg-[#EBF4ED] text-[#0F2E18] font-mono text-xs font-black border border-[#1A4E26]/30">
              Matrícula: {studentCode}
            </span>
            <span className="text-xs font-bold text-[#B8860B]">
              {studentData.academicRank}
            </span>
          </div>

          <div className="w-full mt-3 pt-3 border-t border-[#C8D8CB]/70 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/25 text-xs font-semibold">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>
                {activeCoursesCount} en curso · {completedCoursesCount} aprobados · {diplomasCount} diplomas
              </span>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleGenerateFullCard}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs sm:text-sm shadow-sm transition-all bg-[#D4AF37] text-[#0F2E18] hover:bg-[#c49f2e] cursor-pointer disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>Generar para Descargar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/academia/dashboard/credencial');
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all bg-[#1A4E26] text-white hover:bg-[#143D1E] cursor-pointer"
          >
            <Sparkles size={16} className="text-[#D4AF37]" />
            <span>Ver Credencial 3D</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateOnlyQR}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-[#1A4E26] border border-[#1A4E26]/40 hover:bg-[#EBF4ED] font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <QrCode size={16} />
            <span>Generar Solo QR</span>
          </button>
        </div>

        {/* Vista Previa y Descargas */}
        {(hasGeneratedCard || hasGeneratedQR) && (
          <div ref={previewSectionRef} className="space-y-4 pt-4 border-t border-[#C8D8CB] scroll-mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F4F7F5] p-1.5 rounded-xl border border-[#C8D8CB]">
              <div className="flex items-center gap-1">
                {hasGeneratedCard && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'dual'
                          ? 'bg-[#1A4E26] text-white shadow-sm'
                          : 'text-[#6B7280] hover:text-[#111111]'
                      }`}
                    >
                      <Layers size={13} className="inline mr-1" />
                      Completa (Dual)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('front')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'front'
                          ? 'bg-[#1A4E26] text-white shadow-sm'
                          : 'text-[#6B7280] hover:text-[#111111]'
                      }`}
                    >
                      <Eye size={13} className="inline mr-1" />
                      Frente
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('back')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'back'
                          ? 'bg-[#1A4E26] text-white shadow-sm'
                          : 'text-[#6B7280] hover:text-[#111111]'
                      }`}
                    >
                      <Eye size={13} className="inline mr-1" />
                      Reverso
                    </button>
                  </>
                )}
                {hasGeneratedQR && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('qr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'qr'
                        ? 'bg-[#1A4E26] text-white shadow-sm'
                        : 'text-[#6B7280] hover:text-[#111111]'
                    }`}
                  >
                    <QrCode size={13} className="inline mr-1" />
                    Solo QR
                  </button>
                )}
              </div>

              <div>
                {activeTab === 'dual' && dualDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(dualDataUrl, `${baseFilename}_COMPLETA.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F2E18] font-black text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Descargar Credencial Completa</span>
                  </button>
                )}
                {activeTab === 'front' && frontDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(frontDataUrl, `${baseFilename}_FRENTE.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] hover:bg-[#163F1E] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Descargar Frente (PNG)</span>
                  </button>
                )}
                {activeTab === 'back' && backDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(backDataUrl, `${baseFilename}_REVERSO.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] hover:bg-[#163F1E] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Descargar Reverso (PNG)</span>
                  </button>
                )}
                {activeTab === 'qr' && qrDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(qrDataUrl, `${baseFilename}_QR.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] hover:bg-[#163F1E] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Descargar Código QR (PNG)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-100/80 border border-[#C8D8CB] rounded-2xl p-4 flex items-center justify-center min-h-[300px] overflow-hidden">
              {activeTab === 'dual' && dualDataUrl && (
                <img
                  src={dualDataUrl}
                  alt="Vista Dual de Credencial Estudiantil"
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-lg border border-white"
                />
              )}
              {activeTab === 'front' && frontDataUrl && (
                <img
                  src={frontDataUrl}
                  alt="Frente de Credencial Estudiantil"
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-lg border border-white"
                />
              )}
              {activeTab === 'back' && backDataUrl && (
                <img
                  src={backDataUrl}
                  alt="Reverso de Credencial Estudiantil"
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-lg border border-white"
                />
              )}
              {activeTab === 'qr' && qrDataUrl && (
                <div className="text-center p-4 bg-white rounded-2xl shadow-md border border-[#C8D8CB]">
                  <img
                    src={qrDataUrl}
                    alt="Código QR Estudiantil"
                    className="w-56 h-56 mx-auto object-contain"
                  />
                  <p className="text-xs font-bold text-[#0F2E18] mt-3">
                    Código QR de Identidad Estudiantil ({studentCode})
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Exclusivo para validación académica en SUMAK Academy
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
