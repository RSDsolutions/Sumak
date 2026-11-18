import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  GraduationCap,
  RotateCw,
  Sparkles,
  Download,
  QrCode,
  Layers,
  CreditCard,
  CheckCircle2,
  Share2,
  Check,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Award,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { academyAPI } from '../../../lib/academy';
import {
  type AcademyStudentCardData,
  getAcademyStudentCode,
  getAcademyAcademicRank,
  getStudentInitials,
  renderAcademyRoundedQR,
  renderAcademyStudentCardFront,
  renderAcademyStudentCardBack,
  renderAcademyStudentCardDual,
} from '../../../lib/academyCardCanvas';

type ViewMode = 'flip3d' | 'split' | 'front' | 'back';

// ---------------------------------------------------------------------------
// Frente Visual del Carnet Estudiantil SUMAK Academy
// ---------------------------------------------------------------------------
function StudentCardFrontView({ data }: { data: AcademyStudentCardData }) {
  return (
    <div
      className="relative w-[340px] sm:w-[380px] h-[560px] sm:h-[600px] bg-[#FAFDFB] rounded-[24px] shadow-2xl border border-[#C8D8CB] overflow-hidden flex flex-col justify-between select-none"
      style={{
        boxShadow: '0 22px 45px -15px rgba(15, 46, 24, 0.24), 0 0 0 1px rgba(15,46,24,0.06)',
      }}
    >
      {/* Marca de agua académica */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] overflow-hidden flex items-center justify-center">
        <div className="w-[380px] h-[380px] rounded-full border-[26px] border-[#0F2E18] flex items-center justify-center rotate-12">
          <div className="w-[240px] h-[240px] rounded-full border-[12px] border-[#D4AF37]" />
        </div>
      </div>

      {/* CABECERA ACADÉMICA */}
      <div className="relative bg-gradient-to-br from-[#0B2412] via-[#133A1C] to-[#1A4E26] text-white pt-4 pb-3.5 px-4 flex flex-col items-center text-center rounded-t-[23px]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
            <GraduationCap size={19} />
          </div>
          <div className="text-left">
            <p className="text-[9px] font-bold tracking-[0.2em] text-[#D4AF37] uppercase leading-none">
              Campus Virtual Oficial
            </p>
            <h3 className="text-sm sm:text-base font-black tracking-wider text-white font-heading uppercase leading-tight">
              ACADEMIA SUMAK
            </h3>
          </div>
        </div>

        <span className="mt-2 inline-block px-3 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[9px] sm:text-[10px] font-extrabold text-[#FBE697] tracking-widest uppercase">
          Credencial Oficial de Estudiante
        </span>

        {/* Franja dorada */}
        <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B]" />
      </div>

      {/* CUERPO DEL CARNET ESTUDIANTIL */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-3 z-10">
        {/* Foto / Iniciales */}
        <div className="relative my-1.5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[5px] border-[#D4AF37] bg-[#0F2E18] shadow-lg flex items-center justify-center overflow-hidden">
            {data.avatarImage ? (
              <img
                src={data.avatarImage}
                alt={data.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#D4AF37] text-3xl sm:text-4xl font-black tracking-wider font-heading">
                {data.avatarInitials}
              </span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1A4E26] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-md">
            <GraduationCap size={14} />
          </div>
        </div>

        {/* Nombre del Estudiante */}
        <h2 className="text-[#0F2E18] font-black text-sm sm:text-base tracking-wide text-center mt-2 uppercase leading-snug max-w-[290px] font-heading line-clamp-2">
          {data.fullName}
        </h2>
        <p className="text-[9px] sm:text-[10px] font-bold text-[#4A7C59] uppercase tracking-wider mt-0.5 text-center">
          {data.facultyLabel}
        </p>

        {/* Caja de Matrícula Estudiantil */}
        <div className="bg-[#EBF4ED] border border-[#1A4E26]/35 rounded-2xl px-5 py-2 text-center my-2.5 w-full max-w-[270px] shadow-2xs">
          <span className="text-[8px] sm:text-[9px] text-[#4A7C59] tracking-widest font-extrabold uppercase block">
            Matrícula Académica Estudiantil
          </span>
          <span className="text-xs sm:text-sm font-black text-[#0F2E18] tracking-widest font-mono">
            {data.studentCode}
          </span>
        </div>

        {/* Condición Académica */}
        <div className="text-center my-0.5">
          <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase block">
            Condición Académica
          </span>
          <p className="text-[11px] sm:text-xs font-black text-[#B8860B] tracking-wider uppercase mt-0.5 font-heading">
            {data.academicRank}
          </p>
        </div>

        {/* Indicadores Académicos (Cursos / Aprobados / Diplomas) */}
        <div className="grid grid-cols-3 gap-1 w-full max-w-[280px] bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl py-2 px-2 mt-2 text-center">
          <div>
            <p className="text-xs sm:text-sm font-black text-[#1A4E26]">{data.activeCoursesCount}</p>
            <p className="text-[8px] font-bold text-[#6B7280] uppercase">En Curso</p>
          </div>
          <div className="border-x border-[#C8D8CB]">
            <p className="text-xs sm:text-sm font-black text-[#1A4E26]">{data.completedCoursesCount}</p>
            <p className="text-[8px] font-bold text-[#6B7280] uppercase">Aprobados</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-black text-[#B8860B]">{data.diplomasCount}</p>
            <p className="text-[8px] font-bold text-[#6B7280] uppercase">Diplomas</p>
          </div>
        </div>

        {/* Estado */}
        <div className="mt-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-emerald-50 border-emerald-300 text-[#0F2E18] text-[10px] font-extrabold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ESTUDIANTE {data.status}</span>
          </div>
        </div>
      </div>

      {/* PIE DEL CARNET */}
      <div className="pb-3 pt-1.5 text-center border-t border-slate-100 bg-slate-50/60 rounded-b-[23px]">
        <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold tracking-[0.16em] uppercase">
          Documento Académico Verificable • SUMAK Academy
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reverso Visual del Carnet Estudiantil con QR Académico
// ---------------------------------------------------------------------------
function StudentCardBackView({ data }: { data: AcademyStudentCardData }) {
  return (
    <div
      className="relative w-[340px] sm:w-[380px] h-[560px] sm:h-[600px] bg-[#FAFDFB] rounded-[24px] shadow-2xl border border-[#C8D8CB] overflow-hidden flex flex-col justify-between select-none"
      style={{
        boxShadow: '0 22px 45px -15px rgba(15, 46, 24, 0.24), 0 0 0 1px rgba(15,46,24,0.06)',
      }}
    >
      {/* CABECERA */}
      <div className="relative bg-gradient-to-br from-[#0B2412] via-[#133A1C] to-[#1A4E26] text-white pt-4 pb-3.5 px-4 flex flex-col items-center text-center rounded-t-[23px]">
        <h3 className="text-white font-black text-sm sm:text-base tracking-wider font-heading uppercase">
          ACADEMIA SUMAK ECUADOR
        </h3>
        <p className="text-[9px] sm:text-[10px] font-bold text-[#D4AF37] tracking-widest uppercase mt-0.5 font-heading">
          Verificación Digital de Matrícula Estudiantil
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B]" />
      </div>

      {/* CONTENEDOR QR */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-3 z-10">
        <div className="w-full bg-white border-2 border-[#D4AF37]/60 rounded-2xl p-4 shadow-sm flex flex-col items-center">
          <div className="relative p-2 bg-white rounded-xl flex items-center justify-center border border-slate-100">
            <QRCodeSVG
              value={data.qrUrl}
              size={190}
              fgColor="#0F2E18"
              bgColor="#ffffff"
              level="H"
              marginSize={1}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white p-1.5 rounded-xl shadow-md border-2 border-[#D4AF37] flex items-center justify-center">
                <GraduationCap size={26} className="text-[#0F2E18]" />
              </div>
            </div>
          </div>
        </div>

        {/* Instrucciones de escaneo */}
        <div className="text-center mt-3 px-2">
          <h4 className="text-[#0F2E18] font-black text-xs sm:text-sm uppercase tracking-wider font-heading">
            ¡Validación Académica con QR!
          </h4>
          <p className="text-slate-600 text-[10px] sm:text-[11px] leading-relaxed max-w-[275px] mx-auto my-1.5 font-medium">
            Escanea este código QR con la cámara de tu teléfono para verificar la matrícula estudiantil, cursos aprobados y certificaciones en SUMAK Academy.
          </p>
          <div className="inline-block bg-[#EBF4ED] px-3 py-1 rounded-lg mt-1 border border-[#1A4E26]/30">
            <p className="text-slate-700 font-mono text-[10px] sm:text-xs font-semibold tracking-wider">
              Matrícula: <span className="text-[#0F2E18] font-black">{data.studentCode}</span>
            </p>
          </div>
        </div>
      </div>

      {/* PIE */}
      <div className="pb-3 pt-1.5 text-center border-t border-slate-100 bg-slate-50/60 rounded-b-[23px]">
        <p className="text-[9px] text-[#0F2E18] font-bold tracking-wider">
          Campus Virtual SUMAK Academy • Registro Académico
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página Principal de Credencial Estudiantil (3D + Descarga PNG)
// ---------------------------------------------------------------------------
export default function CredencialEstudiantil() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isInsideDashboard = location.pathname.startsWith('/academia/dashboard');
  const scannedUid = searchParams.get('uid');
  const targetUserId = scannedUid || profile?.id || '';

  const [studentData, setStudentData] = useState<AcademyStudentCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('flip3d');
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [shine, setShine] = useState({ opacity: 0, x: 50, y: 50 });
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Canvases ocultos para exportación PNG en alta resolución
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dualCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sumakecuador.com';

  useEffect(() => {
    let cancelled = false;

    async function loadCredentialData() {
      setLoading(true);
      try {
        // Caso 1: Escaneo público por QR (?uid=...) o usuario autenticado
        if (targetUserId) {
          const { data: pubData, error: pubErr } = await supabase.rpc('get_public_student_credential', {
            p_user_id: targetUserId,
          });

          if (!pubErr && pubData && !cancelled) {
            const d = pubData as {
              user_id: string;
              full_name: string;
              avatar_url?: string | null;
              ciudad?: string | null;
              status: string;
              registered_at?: string | null;
              student_code: string;
              active_courses_count: number;
              completed_courses_count: number;
              diplomas_count: number;
            };

            const active = Number(d.active_courses_count ?? 0);
            const completed = Number(d.completed_courses_count ?? 0);
            const diplomas = Number(d.diplomas_count ?? 0);
            const code = d.student_code || getAcademyStudentCode(d.user_id, d.registered_at);

            setStudentData({
              userId: d.user_id,
              fullName: d.full_name,
              studentCode: code,
              academicRank: getAcademyAcademicRank(active, completed, diplomas),
              facultyLabel: 'Escuela de Biomedicina Ancestral y Salud Renal',
              status: (d.status as AcademyStudentCardData['status']) || 'ACTIVO',
              avatarInitials: getStudentInitials(d.full_name),
              avatarImage: d.avatar_url || undefined,
              ciudad: d.ciudad || undefined,
              registeredAt: d.registered_at || undefined,
              activeCoursesCount: active,
              completedCoursesCount: completed,
              diplomasCount: diplomas,
              qrUrl: `${baseUrl}/academia/credencial?uid=${d.user_id}&matricula=${code}`,
            });
            setLoading(false);
            return;
          }
        }

        // Fallback con sesión local si aún no respondió la RPC
        if (profile && !cancelled) {
          const [enrs, dips] = await Promise.all([
            academyAPI.getMyEnrollments(profile.id).catch(() => []),
            academyAPI.getMyDiplomas(profile.id).catch(() => []),
          ]);
          const active = (enrs || []).filter((e: any) => e.status === 'active').length;
          const completed = (enrs || []).filter((e: any) => e.status === 'completed').length;
          const diplomas = (dips || []).length;
          const code = getAcademyStudentCode(profile.id, profile.fecha_registro);
          const fullName = profile.nombre_completo || profile.username || 'Estudiante SUMAK';

          setStudentData({
            userId: profile.id,
            fullName,
            studentCode: code,
            academicRank: getAcademyAcademicRank(active, completed, diplomas),
            facultyLabel: 'Escuela de Biomedicina Ancestral y Salud Renal',
            status: (profile.estado?.toUpperCase() as AcademyStudentCardData['status']) || 'ACTIVO',
            avatarInitials: getStudentInitials(fullName),
            avatarImage: profile.avatar_url || undefined,
            ciudad: profile.ciudad || undefined,
            registeredAt: profile.fecha_registro || undefined,
            activeCoursesCount: active,
            completedCoursesCount: completed,
            diplomasCount: diplomas,
            qrUrl: `${baseUrl}/academia/credencial?uid=${profile.id}&matricula=${code}`,
          });
        }
      } catch (err) {
        console.error('Error cargando credencial estudiantil:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCredentialData();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, profile, baseUrl]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setRotateX(((y - centerY) / centerY) * -11);
    setRotateY(((x - centerX) / centerX) * 11);
    setShine({
      opacity: 0.32,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setShine({ opacity: 0, x: 50, y: 50 });
  };

  async function handleDownload(target: 'dual' | 'front' | 'back' | 'qr') {
    if (!studentData) return;
    if (!qrCanvasRef.current || !frontCanvasRef.current || !backCanvasRef.current || !dualCanvasRef.current) {
      return;
    }

    setDownloadingType(target);
    try {
      await renderAcademyRoundedQR(qrCanvasRef.current, studentData.qrUrl, '/logo_qr.png', 1000, '#0F2E18');

      const safeName = studentData.fullName.replace(/\s+/g, '_').toLowerCase();
      const baseFilename = `CREDENCIAL_ACADEMIA_${studentData.studentCode}_${safeName}`;

      if (target === 'qr') {
        triggerDownload(qrCanvasRef.current.toDataURL('image/png'), `${baseFilename}_QR.png`);
        return;
      }

      await renderAcademyStudentCardFront(frontCanvasRef.current, studentData, 1000, 1500);
      if (target === 'front') {
        triggerDownload(frontCanvasRef.current.toDataURL('image/png'), `${baseFilename}_FRENTE.png`);
        return;
      }

      await renderAcademyStudentCardBack(backCanvasRef.current, studentData, qrCanvasRef.current, 1000, 1500);
      if (target === 'back') {
        triggerDownload(backCanvasRef.current.toDataURL('image/png'), `${baseFilename}_REVERSO.png`);
        return;
      }

      renderAcademyStudentCardDual(dualCanvasRef.current, frontCanvasRef.current, backCanvasRef.current);
      triggerDownload(dualCanvasRef.current.toDataURL('image/png'), `${baseFilename}_COMPLETA.png`);
    } catch (err) {
      console.error('Error descargando credencial académica:', err);
    } finally {
      setDownloadingType(null);
    }
  }

  function triggerDownload(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleCopyVerificationLink() {
    if (!studentData) return;
    navigator.clipboard.writeText(studentData.qrUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#1A4E26]">
        <Loader2 className="animate-spin" size={36} />
        <p className="text-sm font-medium text-[#6B7280]">Generando credencial estudiantil de SUMAK Academy...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <GraduationCap size={48} className="mx-auto text-[#1A4E26] mb-3" />
        <h1 className="text-xl font-black text-[#111111]">Credencial Estudiantil no encontrada</h1>
        <p className="text-sm text-[#6B7280] mt-2">
          Inicia sesión en el Campus Virtual de SUMAK Academy para visualizar y descargar tu carnet estudiantil con QR.
        </p>
        <Link
          to="/academia/login"
          className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-xl bg-[#1A4E26] text-white text-sm font-bold"
        >
          Iniciar sesión en Academia
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full pb-16">
      {/* Canvases ocultos para renderizado de descarga en alta resolución */}
      <div className="hidden">
        <canvas ref={qrCanvasRef} />
        <canvas ref={frontCanvasRef} />
        <canvas ref={backCanvasRef} />
        <canvas ref={dualCanvasRef} />
      </div>

      {/* Si se abre fuera del Dashboard (ej. en /academia/credencial o al escanear el QR), mostrar Topbar Académico */}
      {!isInsideDashboard && (
        <header className="bg-gradient-to-r from-[#0B2412] via-[#133A1C] to-[#1A4E26] text-white py-3.5 px-4 sm:px-8 border-b border-[#D4AF37]/30 shadow-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Volver"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h1 className="text-sm font-black tracking-wider text-white uppercase">
                    Credencial Estudiantil Oficial
                  </h1>
                  <p className="text-[10px] text-[#FBE697] font-semibold">
                    SUMAK ACADEMY • CAMPUS VIRTUAL
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/90 border border-emerald-400/40 text-[11px] font-bold text-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Matrícula Verificada</span>
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Banner institucional cuando está dentro del Campus Virtual */}
      {isInsideDashboard && (
        <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-7 sm:py-8 text-white relative overflow-hidden mb-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#FBE697] bg-white/10 border border-[#D4AF37]/40 px-3 py-1 rounded-full">
                <ShieldCheck size={13} /> Identificación Oficial del Campus Virtual
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
                Mi Credencial Estudiantil con QR
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
                Carnet académico exclusivo para estudiantes de SUMAK Academy. Visualízalo en 3D o descárgalo en alta resolución (PNG) con tu código QR de verificación estudiantil.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl px-4 py-3 text-right shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-[#FBE697] font-bold">Matrícula Activa</p>
              <p className="font-mono text-base sm:text-lg font-black text-white">{studentData.studentCode}</p>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* BARRA DE HERRAMIENTAS: MODO DE VISTA + DESCARGAS DIRECTAS */}
        <div className="bg-white border border-[#C8D8CB] rounded-2xl shadow-xs p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Selector de Vista */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F7F5] p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('flip3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'flip3d'
                  ? 'bg-[#1A4E26] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCw size={13} />
              <span>Giro 3D Interactivo</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-[#1A4E26] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={13} />
              <span>Frente y Reverso</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('front')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'front'
                  ? 'bg-[#1A4E26] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard size={13} />
              <span>Solo Frente</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('back')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'back'
                  ? 'bg-[#1A4E26] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode size={13} />
              <span>Solo Reverso QR</span>
            </button>
          </div>

          {/* Botones de Descarga en Alta Resolución */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={downloadingType !== null}
              onClick={() => void handleDownload('dual')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F2E18] font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>{downloadingType === 'dual' ? 'Generando...' : 'Descargar Completa (Dual)'}</span>
            </button>

            <button
              type="button"
              disabled={downloadingType !== null}
              onClick={() => void handleDownload('front')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A4E26] hover:bg-[#143D1E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>{downloadingType === 'front' ? '...' : 'Frente PNG'}</span>
            </button>

            <button
              type="button"
              disabled={downloadingType !== null}
              onClick={() => void handleDownload('back')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A4E26] hover:bg-[#143D1E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>{downloadingType === 'back' ? '...' : 'Reverso PNG'}</span>
            </button>

            <button
              type="button"
              disabled={downloadingType !== null}
              onClick={() => void handleDownload('qr')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EBF4ED] hover:bg-[#d7eadb] text-[#1A4E26] border border-[#C8D8CB] font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <QrCode size={14} />
              <span>{downloadingType === 'qr' ? '...' : 'Solo QR'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyVerificationLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs transition-all cursor-pointer"
              title="Copiar enlace de verificación estudiantil"
            >
              {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
              <span>{copiedLink ? 'Copiado' : 'Compartir'}</span>
            </button>
          </div>
        </div>

        {/* ÁREA DE VISUALIZACIÓN DE LA CREDENCIAL ESTUDIANTIL */}
        <div className="py-4 flex flex-col items-center justify-center">
          {viewMode === 'flip3d' && (
            <div className="flex flex-col items-center">
              <div
                className="perspective-1000 cursor-pointer group my-2"
                onClick={() => setIsFlipped(!isFlipped)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <motion.div
                  className="relative transform-style-3d transition-transform duration-700 ease-out"
                  animate={{
                    rotateY: isFlipped ? 180 : rotateY,
                    rotateX: isFlipped ? 0 : rotateX,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                  }}
                >
                  {/* Brillo holográfico */}
                  <div
                    className="absolute inset-0 rounded-[24px] pointer-events-none z-30 transition-opacity duration-300"
                    style={{
                      opacity: shine.opacity,
                      background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 65%)`,
                    }}
                  />

                  {/* FRENTE */}
                  <div className="backface-hidden">
                    <StudentCardFrontView data={studentData} />
                  </div>

                  {/* REVERSO */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180">
                    <StudentCardBackView data={studentData} />
                  </div>
                </motion.div>
              </div>

              {/* Botón de giro 3D */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0F2E18] to-[#1A4E26] text-white text-xs font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
                  <span>Voltear Credencial ({isFlipped ? 'Ver Frente' : 'Ver Reverso con QR'})</span>
                </button>

                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Haz clic en la tarjeta para ver el QR estudiantil</span>
                </span>
              </div>
            </div>
          )}

          {viewMode === 'split' && (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
              <div className="space-y-2 text-center">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#1A4E26]">
                  Anverso — Identificación Estudiantil
                </span>
                <StudentCardFrontView data={studentData} />
              </div>
              <div className="space-y-2 text-center">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#1A4E26]">
                  Reverso — Código QR Académico
                </span>
                <StudentCardBackView data={studentData} />
              </div>
            </div>
          )}

          {viewMode === 'front' && <StudentCardFrontView data={studentData} />}
          {viewMode === 'back' && <StudentCardBackView data={studentData} />}
        </div>

        {/* FICHA DE VERIFICACIÓN ACADÉMICA INFERIOR */}
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-5 sm:p-6 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#6B7280] uppercase">Estado de Matrícula</p>
              <p className="text-sm font-black text-[#0F2E18]">
                Estudiante {studentData.status} ({studentData.studentCode})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#B8860B] flex items-center justify-center shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#6B7280] uppercase">Historial de Cursos</p>
              <p className="text-sm font-black text-[#111111]">
                {studentData.activeCoursesCount} en curso · {studentData.completedCoursesCount} aprobados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EBF4ED] text-[#1A4E26] flex items-center justify-center shrink-0">
              <Award size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#6B7280] uppercase">Credenciales y Diplomas</p>
              <p className="text-sm font-black text-[#111111]">
                {studentData.diplomasCount} {studentData.diplomasCount === 1 ? 'certificación emitida' : 'certificaciones emitidas'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
