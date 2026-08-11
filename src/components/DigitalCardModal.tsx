import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Sparkles, 
  Loader2, 
  Eye, 
  Layers, 
  User, 
  Phone, 
  Hash, 
  Camera 
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import type { Profile } from '../lib/types';
import { 
  checkCardRequirements, 
  renderRoundedQR, 
  renderCardFront, 
  renderCardBack, 
  renderCardDual 
} from '../lib/cardCanvas';

interface DigitalCardModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
}

type TabView = 'dual' | 'front' | 'back' | 'qr';

export default function DigitalCardModal({ open, onClose, profile }: DigitalCardModalProps) {
  const navigate = useNavigate();
  const requirements = checkCardRequirements(profile);
  const [generating, setGenerating] = useState(false);
  const [hasGeneratedCard, setHasGeneratedCard] = useState(false);
  const [hasGeneratedQR, setHasGeneratedQR] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('dual');

  // Canvases ocultos para procesamiento en alta resolución
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  // URLs de imagen generadas para la vista previa
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [frontDataUrl, setFrontDataUrl] = useState<string>('');
  const [backDataUrl, setBackDataUrl] = useState<string>('');
  const [dualDataUrl, setDualDataUrl] = useState<string>('');

  const sponsorRef = profile?.username || profile?.codigo_distribuidor || 'SUMAK';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sumakecuador.com';
  const qrTargetUrl = `${baseUrl}/tarjetadigital?ref=${sponsorRef}`;

  // Reset al abrir/cerrar
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

  // Función para generar solamente el código QR
  const handleGenerateOnlyQR = async () => {
    setGenerating(true);
    try {
      if (!qrCanvasRef.current) return;
      await renderRoundedQR(qrCanvasRef.current, qrTargetUrl, '/logo_qr.png', 1000, '#1A4E26');
      const qrUrl = qrCanvasRef.current.toDataURL('image/png');
      setQrDataUrl(qrUrl);
      setHasGeneratedQR(true);
      setActiveTab('qr');
      
      // Auto-scroll suave hasta la vista del QR recién generado
      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err) {
      console.error('Error generando QR:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Función para generar la Tarjeta Digital Completa (Frente + Reverso + Dual)
  const handleGenerateFullCard = async () => {
    setGenerating(true);
    try {
      if (!qrCanvasRef.current || !frontCanvasRef.current || !backCanvasRef.current || !dualCanvasRef.current) {
        return;
      }

      // 1. Generar QR
      await renderRoundedQR(qrCanvasRef.current, qrTargetUrl, '/logo_qr.png', 1000, '#1A4E26');
      const qrUrl = qrCanvasRef.current.toDataURL('image/png');
      setQrDataUrl(qrUrl);

      // 2. Generar Frente
      await renderCardFront(frontCanvasRef.current, profile, 1000, 1500);
      const frontUrl = frontCanvasRef.current.toDataURL('image/png');
      setFrontDataUrl(frontUrl);

      // 3. Generar Reverso con el QR renderizado
      await renderCardBack(backCanvasRef.current, profile, qrCanvasRef.current, 1000, 1500);
      const backUrl = backCanvasRef.current.toDataURL('image/png');
      setBackDataUrl(backUrl);

      // 4. Generar Vista Dual
      renderCardDual(dualCanvasRef.current, frontCanvasRef.current, backCanvasRef.current);
      const dualUrl = dualCanvasRef.current.toDataURL('image/png');
      setDualDataUrl(dualUrl);

      setHasGeneratedCard(true);
      setHasGeneratedQR(true);
      setActiveTab('dual');

      // Auto-scroll suave hasta la vista de la tarjeta generada
      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err) {
      console.error('Error generando tarjeta digital:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Descarga directa en el navegador
  const downloadImage = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const sanitizeName = (str?: string | null) => (str || 'distribuidor').replace(/\s+/g, '_').toLowerCase();
  const baseFilename = `SUMAK_${profile?.codigo_distribuidor || 'ID'}_${sanitizeName(profile?.nombre_completo)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      className="max-h-[92vh] overflow-y-auto"
    >
      {/* Canvases invisibles de renderizado */}
      <div className="hidden">
        <canvas ref={qrCanvasRef} />
        <canvas ref={frontCanvasRef} />
        <canvas ref={backCanvasRef} />
        <canvas ref={dualCanvasRef} />
      </div>

      <div className="space-y-6">
        {/* Encabezado Superior Izquierdo */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8D8CB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center border border-[#1A4E26]/20">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-lg text-[#111111] leading-tight">
                Tarjeta Digital
              </h2>
              <p className="text-xs text-[#6B7280]">
                Credencial oficial con código QR redondeado y afiliación
              </p>
            </div>
          </div>
        </div>

        {/* Centro Superior: Foto de perfil y datos */}
        <div className="flex flex-col items-center text-center p-4 bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl">
          <div className="relative mb-3">
            <div className="ring-4 ring-[#D4AF37] rounded-full p-0.5 shadow-sm">
              <Avatar profile={profile} size={84} />
            </div>
            {profile?.avatar_url && (
              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#22C55E] border-2 border-white flex items-center justify-center text-white text-[10px]" title="Foto lista">
                ✓
              </span>
            )}
          </div>

          <h3 className="font-heading font-bold text-base text-[#111111]">
            {profile?.nombre_completo || profile?.username || 'Distribuidor Independiente'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#EBF4ED] text-[#1A4E26] font-mono text-xs font-bold border border-[#1A4E26]/30">
              {profile?.codigo_distribuidor || 'SUMAK-00000'}
            </span>
            <span className="text-xs text-[#6B7280]">
              {profile?.paquete ? `Paquete ${profile.paquete.toUpperCase()}` : 'Distribuidor'}
            </span>
          </div>

          {/* Comprobación de Requisitos */}
          <div className="w-full mt-4 pt-3 border-t border-[#C8D8CB]/70">
            {requirements.allValid ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30 text-xs font-semibold">
                <CheckCircle2 size={16} className="text-[#22C55E] shrink-0" />
                <span>Tus datos básicos actualizados</span>
              </div>
            ) : (
              <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Para generar la Tarjeta Digital Completa, se requiere:</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  <li className={`flex items-center gap-1.5 ${requirements.hasPhoto ? 'text-[#1A4E26] font-medium' : 'text-amber-700'}`}>
                    {requirements.hasPhoto ? <CheckCircle2 size={13} className="text-[#22C55E]" /> : <Camera size={13} />}
                    <span>Foto de perfil {requirements.hasPhoto ? '(OK)' : '(Faltante)'}</span>
                  </li>
                  <li className={`flex items-center gap-1.5 ${requirements.hasNombre ? 'text-[#1A4E26] font-medium' : 'text-amber-700'}`}>
                    {requirements.hasNombre ? <CheckCircle2 size={13} className="text-[#22C55E]" /> : <User size={13} />}
                    <span>Nombre completo {requirements.hasNombre ? '(OK)' : '(Faltante)'}</span>
                  </li>
                  <li className={`flex items-center gap-1.5 ${requirements.hasCodigo ? 'text-[#1A4E26] font-medium' : 'text-amber-700'}`}>
                    {requirements.hasCodigo ? <CheckCircle2 size={13} className="text-[#22C55E]" /> : <Hash size={13} />}
                    <span>Código distribuidor {requirements.hasCodigo ? '(OK)' : '(Faltante)'}</span>
                  </li>
                  <li className={`flex items-center gap-1.5 ${requirements.hasTelefono ? 'text-[#1A4E26] font-medium' : 'text-amber-700'}`}>
                    {requirements.hasTelefono ? <CheckCircle2 size={13} className="text-[#22C55E]" /> : <Phone size={13} />}
                    <span>Número de celular {requirements.hasTelefono ? '(OK)' : '(Faltante)'}</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Generación */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Botón principal: Tarjeta Digital */}
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/tarjetadigital');
            }}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all duration-200 bg-[#1A4E26] text-white hover:bg-[#163F1E] active:scale-[0.99] cursor-pointer"
            title="Ver Tarjeta Digital Oficial"
          >
            <Sparkles size={18} className="text-[#D4AF37]" />
            <span>Tarjeta Digital</span>
          </button>

          {/* Botón alternativo: Generar solamente el código QR */}
          <button
            type="button"
            onClick={handleGenerateOnlyQR}
            disabled={generating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-[#1A4E26] border border-[#1A4E26]/40 hover:bg-[#EBF4ED] font-semibold text-sm transition-colors shadow-sm cursor-pointer"
            title="Generar únicamente el código QR redondeado"
          >
            <QrCode size={17} />
            <span>Generar solo código QR</span>
          </button>
        </div>

        {/* Vista previa y Descargas tras generar */}
        {(hasGeneratedCard || hasGeneratedQR) && (
          <div ref={previewSectionRef} className="space-y-4 pt-4 border-t border-[#C8D8CB] scroll-mt-6">
            {/* Selector de Pestañas de Vista Previa */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F4F7F5] p-1.5 rounded-xl border border-[#C8D8CB]">
              <div className="flex items-center gap-1">
                {hasGeneratedCard && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'dual'
                          ? 'bg-[#1A4E26] text-white shadow-sm'
                          : 'text-[#6B7280] hover:text-[#111111]'
                      }`}
                    >
                      <Layers size={13} className="inline mr-1" />
                      Vista Dual
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('front')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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

              {/* Botón de descarga según pestaña activa */}
              <div>
                {activeTab === 'dual' && dualDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(dualDataUrl, `${baseFilename}_DUAL.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#c49f2e] text-[#111111] font-bold text-xs shadow-sm transition-colors"
                  >
                    <Download size={14} />
                    <span>Descargar Tarjeta Completa</span>
                  </button>
                )}
                {activeTab === 'front' && frontDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(frontDataUrl, `${baseFilename}_FRENTE.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] hover:bg-[#163F1E] text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <Download size={14} />
                    <span>Descargar Frente (PNG)</span>
                  </button>
                )}
                {activeTab === 'back' && backDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(backDataUrl, `${baseFilename}_REVERSO.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] hover:bg-[#163F1E] text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <Download size={14} />
                    <span>Descargar Reverso (PNG)</span>
                  </button>
                )}
                {activeTab === 'qr' && qrDataUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImage(qrDataUrl, `${baseFilename}_QR.png`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] hover:bg-[#163F1E] text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <Download size={14} />
                    <span>Descargar Código QR (PNG)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contenedor de Vista Previa */}
            <div className="bg-slate-100/80 border border-[#C8D8CB] rounded-2xl p-4 flex items-center justify-center min-h-[300px] overflow-hidden">
              {activeTab === 'dual' && dualDataUrl && (
                <img 
                  src={dualDataUrl} 
                  alt="Vista Dual de Tarjeta" 
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-lg border border-white"
                />
              )}
              {activeTab === 'front' && frontDataUrl && (
                <img 
                  src={frontDataUrl} 
                  alt="Frente de Tarjeta" 
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-lg border border-white"
                />
              )}
              {activeTab === 'back' && backDataUrl && (
                <img 
                  src={backDataUrl} 
                  alt="Reverso de Tarjeta" 
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-lg border border-white"
                />
              )}
              {activeTab === 'qr' && qrDataUrl && (
                <div className="text-center p-4 bg-white rounded-2xl shadow-md border border-[#C8D8CB]">
                  <img 
                    src={qrDataUrl} 
                    alt="Código QR redondeado" 
                    className="w-56 h-56 mx-auto object-contain"
                  />
                  <p className="text-xs text-[#6B7280] mt-3">
                    Código QR redondeado con logo institucional
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Redirige a tu enlace de afiliación oficial
                  </p>
                </div>
              )}
            </div>

            <p className="text-center text-[11px] text-[#9CA3AF]">
              Nota: La tarjeta y el código QR se generan 100% en tu navegador y no ocupan espacio en el servidor.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
