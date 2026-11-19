import { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Download,
  ShieldCheck,
  GraduationCap,
  Loader2,
  Sparkles,
  BookOpen,
  Leaf,
  Clock,
  CheckCircle2,
  PlayCircle,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { academyAPI } from '../../../lib/academy';
import { callEdgeFunction } from '../../../lib/supabase';
import { generateAndDownloadCredentialDocument } from '../../../lib/credentialDocumentGenerator';
import type { AcademyDiplomaIssuance } from '../../../lib/academy-types';
import { Link } from 'react-router-dom';

type CredentialType = 'certificado' | 'diploma';
type FilterTab = 'all' | 'certificado' | 'diploma';
type StateFilter = 'all' | 'issued' | 'pending';

interface IssuedCredentialCardItem {
  kind: 'issued';
  id: string;
  type: CredentialType;
  categoryLabel: string;
  title: string;
  participantName: string;
  issued_at: string;
  verification_code: string;
  diploma_number?: string;
  status: 'active' | 'revoked' | 'pending_pdf';
  pdfStoragePath?: string | null;
}

interface PendingCertificateItem {
  kind: 'pending_certificate';
  id: string;
  type: 'certificado';
  course_id: string;
  title: string;
  slug: string;
  enrollment_status: string;
  payment_status?: string;
  progress_percentage: number;
  total_lessons: number;
  completed_lessons: number;
  total_assessments: number;
  passed_assessments: number;
}

interface PendingDiplomaItem {
  kind: 'pending_diploma';
  id: string;
  type: 'diploma';
  program_id: string;
  title: string;
  slug: string;
  description?: string | null;
  required_courses: number;
  completed_courses: number;
  enrolled_courses: number;
  progress_percentage: number;
}

type UnifiedCredentialItem =
  | IssuedCredentialCardItem
  | PendingCertificateItem
  | PendingDiplomaItem;

const CREDENTIAL_PASTEL_PALETTE = [
  {
    bg: 'from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]',
    title: 'text-[#12361B]',
    textMuted: 'text-[#2D5A37]',
  },
  {
    bg: 'from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]',
    title: 'text-[#5B3407]',
    textMuted: 'text-[#7C4C18]',
  },
  {
    bg: 'from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]',
    title: 'text-[#102D3E]',
    textMuted: 'text-[#2C526A]',
  },
  {
    bg: 'from-[#ECF6EE] via-[#DCEFDF] to-[#CDE7D2]',
    title: 'text-[#0D381E]',
    textMuted: 'text-[#1F542F]',
  },
  {
    bg: 'from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2]',
    title: 'text-[#4D3A13]',
    textMuted: 'text-[#71541B]',
  },
];

function formatCredentialDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Gráficos Vectoriales para Certificado y Diploma
// ---------------------------------------------------------------------------
function CertificateVector({ pending = false }: { pending?: boolean }) {
  return (
    <svg
      className={`w-20 h-20 ${pending ? 'text-slate-500 opacity-75' : 'text-[#1A4E26]'}`}
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
    >
      <rect x="8" y="14" width="64" height="52" rx="6" strokeWidth="2.2" />
      <rect x="13" y="19" width="54" height="42" rx="3" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <circle cx="28" cy="38" r="8" strokeWidth="1.8" />
      <path d="M25 46 L23 55 L28 52 L33 55 L31 46" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <line x1="42" y1="31" x2="60" y2="31" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="37" x2="58" y2="37" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <line x1="42" y1="43" x2="54" y2="43" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <line x1="42" y1="49" x2="50" y2="49" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function DiplomaVector({ pending = false }: { pending?: boolean }) {
  return (
    <svg
      className={`w-20 h-20 ${pending ? 'text-amber-700/75' : 'text-[#1A4E26]'}`}
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
    >
      <rect x="8" y="14" width="64" height="52" rx="6" strokeWidth="2.4" />
      <rect x="13" y="19" width="54" height="42" rx="3" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
      <circle
        cx="28"
        cy="38"
        r="8"
        strokeWidth="2"
        stroke={pending ? '#B45309' : '#D4AF37'}
        fill={pending ? '#FEF3C7' : '#FEF3C7'}
      />
      <path
        d="M25 46 L23 55 L28 52 L33 55 L31 46"
        strokeWidth="2"
        strokeLinejoin="round"
        stroke={pending ? '#B45309' : '#D4AF37'}
        fill="#FEF3C7"
      />
      <line x1="42" y1="31" x2="60" y2="31" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="42" y1="37" x2="58" y2="37" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <line x1="42" y1="43" x2="54" y2="43" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <line x1="42" y1="49" x2="50" y2="49" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de Credencial EMITIDA (Certificado o Diploma Oficial)
// ---------------------------------------------------------------------------
function IssuedCredentialCard({
  item,
  onDownload,
  isDownloading,
  idx = 0,
}: {
  item: IssuedCredentialCardItem;
  onDownload: (item: IssuedCredentialCardItem) => void;
  isDownloading: boolean;
  idx?: number;
}) {
  const theme = CREDENTIAL_PASTEL_PALETTE[idx % CREDENTIAL_PASTEL_PALETTE.length];

  return (
    <div
      className={`bg-gradient-to-br ${theme.bg} rounded-3xl border-0 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-0.5`}
    >
      <div className="p-5 sm:p-6 flex flex-col items-center flex-1">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-100 text-[#0F2E18] text-xs font-extrabold border-l-4 border-[#1A4E26] shadow-2xs">
            <CheckCircle2 size={13} className="text-[#1A4E26]" />
            {item.type === 'diploma' ? 'Diploma Oficial Emitido' : 'Certificado Oficial Emitido'}
          </div>
        </div>

        <div className="flex items-center justify-center py-2 min-h-[90px] group-hover:scale-105 transition-transform duration-300">
          {item.type === 'diploma' ? <DiplomaVector /> : <CertificateVector />}
        </div>

        <div className="text-center text-[10px] sm:text-xs font-extrabold text-[#1A4E26] uppercase tracking-widest mt-2">
          {item.categoryLabel}
        </div>

        <h3
          className={`font-black ${theme.title} text-sm sm:text-base text-center px-2 mt-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center leading-snug group-hover:text-[#1A4E26] transition-colors`}
        >
          {item.title}
        </h3>
      </div>

      <div className="py-2.5 px-4 text-center text-xs space-y-1">
        <p className={`text-[11px] ${theme.textMuted} truncate`}>
          Otorgado a: <span className="font-bold text-slate-900">{item.participantName}</span>
        </p>
        <p className={`text-[11px] ${theme.textMuted}`}>
          Código de verificación:{' '}
          <span className="font-mono font-bold text-[#1A4E26] bg-white/90 px-1.5 py-0.5 rounded text-[10px] border-0 shadow-2xs">
            {item.verification_code}
          </span>
        </p>
        <p className={`text-[11px] ${theme.textMuted} pt-0.5`}>
          Emitido el: <span className="font-bold text-slate-800 ml-1">{formatCredentialDate(item.issued_at)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pb-5 pt-2 w-full select-none mt-auto">
        <button
          type="button"
          onClick={() => onDownload(item)}
          disabled={isDownloading || item.status === 'revoked'}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1A4E26] hover:bg-[#143D1E] active:scale-95 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap shadow-2xs border-0"
          title="Descargar documento oficial"
        >
          <Download size={14} className="shrink-0 text-white" />
          <span>{isDownloading ? 'Generando...' : 'Descargar'}</span>
        </button>

        <Link
          to={`/academia/verificar?code=${item.verification_code}`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#0F2E18] hover:bg-[#1A4E26] active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap border-0"
          title="Verificar credencial en el registro público oficial"
        >
          <ShieldCheck size={14} className="shrink-0 text-amber-300" />
          <span>Verificar</span>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de CERTIFICADO PENDIENTE (Curso que el alumno está cursando)
// ---------------------------------------------------------------------------
function PendingCertificateCard({ item }: { item: PendingCertificateItem }) {
  const isPaymentPending = item.enrollment_status === 'payment_pending' || item.enrollment_status === 'pending';
  const targetUrl = isPaymentPending
    ? `/academia/cursos/${item.slug}`
    : `/academia/aprender/${item.slug}`;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-[#F4F7F5] to-[#EBF3ED] rounded-3xl border border-[#C8D8CB] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      <div className="p-5 sm:p-6 flex flex-col items-center flex-1">
        {/* Badge Certificado Pendiente */}
        <div className="mb-3 flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-extrabold border-l-4 border-amber-500 shadow-2xs">
          <Clock size={13} className="text-amber-700 shrink-0" />
          <span>Certificado Pendiente (En curso)</span>
        </div>

        {/* Ilustración con candado de progreso */}
        <div className="relative flex items-center justify-center py-2 min-h-[90px]">
          <CertificateVector pending />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Lock size={13} />
          </div>
        </div>

        <div className="text-center text-[10px] sm:text-xs font-extrabold text-amber-800 uppercase tracking-widest mt-2">
          CURSO EN PROGRESO
        </div>

        <h3 className="font-black text-[#111111] text-sm sm:text-base text-center px-2 mt-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center leading-snug">
          {item.title}
        </h3>

        {/* Barra de progreso del curso */}
        <div className="w-full mt-4 bg-white/90 rounded-2xl p-3.5 border border-[#C8D8CB]/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">Avance para Certificado</span>
            <span className="text-[#1A4E26] font-black">{item.progress_percentage}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1A4E26] to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${item.progress_percentage}%` }}
            />
          </div>

          <div className="pt-1 space-y-1 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span>Lecciones obligatorias:</span>
              <strong className="text-slate-900">
                {item.completed_lessons} / {item.total_lessons} completadas
              </strong>
            </div>
            {item.total_assessments > 0 && (
              <div className="flex items-center justify-between">
                <span>Evaluación del curso:</span>
                <strong className={item.passed_assessments >= item.total_assessments ? 'text-emerald-700' : 'text-amber-700'}>
                  {item.passed_assessments >= item.total_assessments
                    ? 'Aprobada'
                    : `${item.passed_assessments}/${item.total_assessments} pendiente`}
                </strong>
              </div>
            )}
            {isPaymentPending && (
              <p className="text-[10px] font-bold text-amber-800 pt-1">
                ⚠️ Inscripción con pago/aprobación en proceso
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2 w-full">
        <Link
          to={targetUrl}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1A4E26] hover:bg-[#143D1E] text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
        >
          <PlayCircle size={15} />
          <span>{isPaymentPending ? 'Ver Estado de Inscripción' : 'Continuar Curso para Certificarme'}</span>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de DIPLOMA PENDIENTE (Programa que el alumno está cursando)
// ---------------------------------------------------------------------------
function PendingDiplomaCard({ item }: { item: PendingDiplomaItem }) {
  return (
    <div className="bg-gradient-to-br from-[#FFFDF7] via-[#FEF6E4] to-[#FCE9C5] rounded-3xl border border-[#E8C97A] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      <div className="p-5 sm:p-6 flex flex-col items-center flex-1">
        {/* Badge Diploma Pendiente */}
        <div className="mb-3 flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-200/80 text-[#78350F] text-xs font-extrabold border-l-4 border-[#D4AF37] shadow-2xs">
          <Clock size={13} className="text-[#92400E] shrink-0" />
          <span>Diploma Pendiente (Programa en curso)</span>
        </div>

        {/* Ilustración de Diploma con candado */}
        <div className="relative flex items-center justify-center py-2 min-h-[90px]">
          <DiplomaVector pending />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#D4AF37] text-[#0F2E18] flex items-center justify-center shadow-sm">
            <Lock size={13} />
          </div>
        </div>

        <div className="text-center text-[10px] sm:text-xs font-extrabold text-[#92400E] uppercase tracking-widest mt-2">
          PROGRAMA DE ESPECIALIZACIÓN EN CURSO
        </div>

        <h3 className="font-black text-[#451A03] text-sm sm:text-base text-center px-2 mt-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center leading-snug">
          {item.title}
        </h3>

        {/* Barra de progreso del programa */}
        <div className="w-full mt-4 bg-white/90 rounded-2xl p-3.5 border border-amber-300/70 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#78350F]">Avance del Programa</span>
            <span className="text-[#92400E] font-black">{item.progress_percentage}%</span>
          </div>
          <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#B45309] to-[#D4AF37] rounded-full transition-all duration-500"
              style={{ width: `${item.progress_percentage}%` }}
            />
          </div>

          <div className="pt-1 space-y-1 text-[11px] text-[#78350F]">
            <div className="flex items-center justify-between">
              <span>Cursos requeridos aprobados:</span>
              <strong className="text-[#451A03]">
                {item.completed_courses} de {item.required_courses} cursos
              </strong>
            </div>
            <p className="text-[10px] text-[#92400E] pt-0.5">
              Completa los {item.required_courses} cursos del programa para emitir automáticamente tu Diploma Oficial.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2 w-full">
        <Link
          to={`/academia/dashboard/programas/${item.slug}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#92400E] hover:bg-[#78350F] text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
        >
          <GraduationCap size={15} />
          <span>Continuar Ruta del Programa</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página Principal de Certificaciones y Diplomas
// ---------------------------------------------------------------------------
export default function MisDiplomas() {
  const { profile } = useAuth();
  const [diplomas, setDiplomas] = useState<AcademyDiplomaIssuance[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [pendingCertificates, setPendingCertificates] = useState<PendingCertificateItem[]>([]);
  const [pendingDiplomas, setPendingDiplomas] = useState<PendingDiplomaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // 1. Sincronizar primero en BD (emite automáticamente certificados/diplomas si el alumno ya cumplió el 100%)
        // y obtener los pendientes en progreso
        const syncData = await academyAPI.syncAndGetMyCredentials();

        // 2. Obtener certificados y diplomas ya emitidos
        const [diplomaData, certificateData] = await Promise.all([
          academyAPI.getMyDiplomas(profile?.id),
          academyAPI.getMyCertificates(profile?.id),
        ]);

        const dips = (diplomaData || []) as AcademyDiplomaIssuance[];
        const certs = (certificateData || []) as any[];

        setDiplomas(dips);
        setCertificates(certs);

        setPendingCertificates(
          (syncData.pending_certificates || []).map((pc) => ({
            kind: 'pending_certificate' as const,
            id: `pending-cert-${pc.course_id}`,
            type: 'certificado' as const,
            ...pc,
          }))
        );

        setPendingDiplomas(
          (syncData.pending_diplomas || []).map((pd) => ({
            kind: 'pending_diploma' as const,
            id: `pending-dip-${pd.program_id}`,
            type: 'diploma' as const,
            ...pd,
          }))
        );

        // 3. Pre-generar PDF en segundo plano para los que estén en 'pending_pdf'
        const pendingPdfItems = [...dips, ...certs].filter((x: any) => x.status === 'pending_pdf');
        for (const pending of pendingPdfItems) {
          callEdgeFunction<{ success?: boolean; path?: string }>('academy-generate-certificate-pdf', {
            certificate_id: pending.id,
          })
            .then((res) => {
              if (res?.path) {
                setCertificates((prev) =>
                  prev.map((c) => (c.id === pending.id ? { ...c, status: 'valid', pdf_storage_path: res.path } : c))
                );
                setDiplomas((prev) =>
                  prev.map((d) =>
                    d.id === pending.id ? ({ ...d, status: 'valid', pdf_storage_path: res.path } as any) : d
                  )
                );
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Error loading credentials:', err);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [profile?.id]);

  const handleDownload = async (item: IssuedCredentialCardItem) => {
    try {
      setDownloadingId(item.id);

      // Intentar obtener el PDF oficial en Storage vía Edge Function
      try {
        if (item.status === 'pending_pdf' || !item.pdfStoragePath) {
          const genRes = await callEdgeFunction<{ success?: boolean; path?: string }>(
            'academy-generate-certificate-pdf',
            { certificate_id: item.id }
          ).catch(() => null);

          if (genRes?.path) {
            setCertificates((prev) =>
              prev.map((c) => (c.id === item.id ? { ...c, status: 'valid', pdf_storage_path: genRes.path } : c))
            );
            setDiplomas((prev) =>
              prev.map((d) => (d.id === item.id ? ({ ...d, status: 'valid', pdf_storage_path: genRes.path } as any) : d))
            );
          }
        }

        const res = await callEdgeFunction<{ ok: boolean; signedUrl: string }>('academy-sign-document-url', {
          issuance_id: item.id,
        }).catch(() => null);

        if (res?.signedUrl) {
          window.open(res.signedUrl, '_blank');
          return;
        }
      } catch {
        // Si la Edge Function no está disponible, usar el generador vectorial local en alta resolución
      }

      // Generador local infalible en alta resolución con código QR verificable
      await generateAndDownloadCredentialDocument({
        type: item.type,
        title: item.title,
        participantName: item.participantName,
        verificationCode: item.verification_code,
        diplomaNumber: item.diploma_number,
        issuedAt: item.issued_at,
      });
    } catch (err) {
      console.error('Error downloading credential:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Mapeo de credenciales emitidas
  const issuedCredentials: IssuedCredentialCardItem[] = useMemo(() => {
    const items: IssuedCredentialCardItem[] = [];

    diplomas.forEach((dip: any) => {
      items.push({
        kind: 'issued',
        id: dip.id,
        type: 'diploma',
        categoryLabel: 'PROGRAMA DE ESPECIALIZACIÓN',
        title: dip.program_name || dip.diploma_type?.name || 'Diploma de Programa SUMAK',
        participantName: dip.participant_name || profile?.nombre_completo || 'Estudiante SUMAK',
        issued_at: dip.issued_at,
        verification_code: dip.verification_code,
        diploma_number: dip.diploma_number,
        status: dip.status === 'revoked' ? 'revoked' : dip.status === 'pending_pdf' ? 'pending_pdf' : 'active',
        pdfStoragePath: dip.pdf_storage_path ?? null,
      });
    });

    certificates.forEach((cert: any) => {
      items.push({
        kind: 'issued',
        id: cert.id,
        type: 'certificado',
        categoryLabel: 'CURSO OFICIAL',
        title: cert.course_name || cert.program_name || cert.title || 'Certificado de Curso SUMAK',
        participantName: cert.participant_name || profile?.nombre_completo || 'Estudiante SUMAK',
        issued_at: cert.issued_at,
        verification_code: cert.verification_code || cert.diploma_number || cert.id,
        diploma_number: cert.diploma_number,
        status: cert.status === 'revoked' ? 'revoked' : cert.status === 'pending_pdf' ? 'pending_pdf' : 'active',
        pdfStoragePath: cert.pdf_storage_path ?? null,
      });
    });

    return items;
  }, [diplomas, certificates, profile?.nombre_completo]);

  // Lista combinada de emitidos + pendientes
  const allItems: UnifiedCredentialItem[] = useMemo(() => {
    return [...issuedCredentials, ...pendingDiplomas, ...pendingCertificates];
  }, [issuedCredentials, pendingDiplomas, pendingCertificates]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (stateFilter === 'issued' && item.kind !== 'issued') return false;
      if (stateFilter === 'pending' && item.kind === 'issued') return false;
      return true;
    });
  }, [allItems, activeTab, stateFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-[#1A4E26]">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-xs font-medium text-slate-500">
          Sincronizando tu progreso académico y estado de certificaciones...
        </p>
      </div>
    );
  }

  const issuedCertCount = issuedCredentials.filter((c) => c.type === 'certificado').length;
  const issuedDipCount = issuedCredentials.filter((c) => c.type === 'diploma').length;
  const pendingCertCount = pendingCertificates.length;
  const pendingDipCount = pendingDiplomas.length;

  return (
    <div className="w-full pb-16">
      {/* 1. Header Institucional Full Width */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Mis Certificaciones y Diplomas
            </h1>

            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Tus certificados se emiten automáticamente al completar el 100% de cada curso, y tu diploma oficial se desbloquea al completar todos los cursos de un programa.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Tienes{' '}
              <strong className="text-amber-300 font-bold">
                {issuedCertCount} {issuedCertCount === 1 ? 'certificado emitido' : 'certificados emitidos'}
              </strong>
              ,{' '}
              <strong className="text-white font-bold">
                {issuedDipCount} {issuedDipCount === 1 ? 'diploma emitido' : 'diplomas emitidos'}
              </strong>{' '}
              y{' '}
              <strong className="text-amber-300 font-bold">
                {pendingCertCount + pendingDipCount} en progreso (pendientes)
              </strong>
              .
            </p>
          </div>

          <div className="hidden lg:block relative w-80 h-36 pointer-events-none select-none shrink-0">
            <div className="absolute top-0 left-6 w-11 h-11 rounded-2xl bg-amber-400/90 text-amber-950 flex items-center justify-center shadow-lg transform -rotate-6">
              <Sparkles size={20} />
            </div>
            <div className="absolute top-6 left-20 w-14 h-14 rounded-2xl bg-[#E8C94A] text-[#111111] flex items-center justify-center shadow-xl transform rotate-3">
              <BookOpen size={26} />
            </div>
            <div className="absolute top-1 right-20 w-10 h-10 rounded-xl bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 flex items-center justify-center shadow-md transform -rotate-12">
              <GraduationCap size={18} />
            </div>
            <div className="absolute top-0 right-6 w-11 h-11 rounded-2xl bg-teal-400/90 text-teal-950 flex items-center justify-center shadow-md transform rotate-6">
              <Leaf size={18} />
            </div>
            <div className="absolute bottom-1 left-28 w-16 h-16 rounded-3xl bg-white text-[#1A4E26] flex items-center justify-center shadow-2xl transform rotate-6 border border-white/40">
              <Award size={32} />
            </div>
            <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl bg-emerald-700/90 text-white flex items-center justify-center shadow-md transform -rotate-6">
              <ShieldCheck size={18} />
            </div>
            <div className="absolute bottom-2 right-10 w-11 h-11 rounded-2xl bg-[#D4AF37] text-amber-950 flex items-center justify-center shadow-lg transform rotate-12">
              <Clock size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Barra de Filtros (Por Tipo y por Estado Emitido vs Pendiente) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          {/* Pestañas por tipo: Todos / Certificados de Curso / Diplomas de Programa */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm sm:text-base select-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`transition-colors cursor-pointer ${
                activeTab === 'all' ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              Todos ({allItems.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('certificado')}
              className={`inline-flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'certificado'
                  ? 'text-slate-900 font-black'
                  : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Certificados de Curso ({issuedCertCount + pendingCertCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diploma')}
              className={`inline-flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'diploma'
                  ? 'text-slate-900 font-black'
                  : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Diplomas de Programa ({issuedDipCount + pendingDipCount})
            </button>
          </div>

          {/* Filtro secundario por estado: Todos / Emitidos / Pendientes en curso */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#C8D8CB]">
            {(
              [
                { key: 'all', label: 'Todos', count: allItems.length },
                { key: 'issued', label: 'Emitidos', count: issuedCredentials.length },
                { key: 'pending', label: 'Pendientes (En curso)', count: pendingCertCount + pendingDipCount },
              ] as const
            ).map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStateFilter(st.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stateFilter === st.key
                    ? 'bg-[#1A4E26] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label} ({st.count})
              </button>
            ))}
          </div>
        </div>

        {/* 3. Grid de Certificados y Diplomas (Emitidos + Pendientes) */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-3">
            <Award size={44} className="text-[#1A4E26] mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">
              {stateFilter === 'issued'
                ? 'Aún no tienes certificados o diplomas emitidos en esta categoría'
                : 'No tienes cursos o programas en progreso en esta sección'}
            </h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm">
              Inscríbete en un curso o programa de SUMAK Academy. Mientras estés cursando verás aquí tu certificado o diploma pendiente con tu porcentaje de avance en tiempo real.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                to="/academia/dashboard/explorar"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#143D1E] transition-colors"
              >
                <BookOpen size={14} /> Explorar Cursos
              </Link>
              <Link
                to="/academia/dashboard/programas"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-xs font-bold hover:bg-[#FDE68A] transition-colors"
              >
                <GraduationCap size={14} /> Ver Programas
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, idx) => {
              if (item.kind === 'issued') {
                return (
                  <IssuedCredentialCard
                    key={item.id}
                    item={item}
                    onDownload={handleDownload}
                    isDownloading={downloadingId === item.id}
                    idx={idx}
                  />
                );
              }
              if (item.kind === 'pending_diploma') {
                return <PendingDiplomaCard key={item.id} item={item} />;
              }
              return <PendingCertificateCard key={item.id} item={item} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
