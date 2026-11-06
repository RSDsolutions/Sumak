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
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { academyAPI } from '../../../lib/academy';
import { callEdgeFunction } from '../../../lib/supabase';
import type { AcademyDiplomaIssuance } from '../../../lib/academy-types';
import { Link } from 'react-router-dom';

type CredentialType = 'certificado' | 'diploma';
type FilterTab = 'all' | 'certificado' | 'diploma';

interface CredentialCardItem {
  id: string;
  type: CredentialType;
  categoryLabel: string;
  title: string;
  participantName?: string;
  issued_at: string;
  verification_code: string;
  status: 'active' | 'revoked' | 'sample';
  isDiploma?: boolean;
}

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
  if (!dateStr) return '12 ago 2025';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '12 ago 2025';
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Gráficos Vectoriales para Certificado y Diploma
// ---------------------------------------------------------------------------

// Ilustración de Certificado de Curso (Contorno verde con sello de roseta)
function CertificateVector() {
  return (
    <svg className="w-20 h-20 text-[#1A4E26]" viewBox="0 0 80 80" fill="none" stroke="currentColor">
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

// Ilustración de Diploma de Especialidad (Con sello de roseta en oro SUMAK)
function DiplomaVector() {
  return (
    <svg className="w-20 h-20 text-[#1A4E26]" viewBox="0 0 80 80" fill="none" stroke="currentColor">
      <rect x="8" y="14" width="64" height="52" rx="6" strokeWidth="2.4" />
      <rect x="13" y="19" width="54" height="42" rx="3" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
      {/* Sello de diploma dorado */}
      <circle cx="28" cy="38" r="8" strokeWidth="2" stroke="#D4AF37" fill="#FEF3C7" />
      <path d="M25 46 L23 55 L28 52 L33 55 L31 46" strokeWidth="2" strokeLinejoin="round" stroke="#D4AF37" fill="#FEF3C7" />
      {/* Líneas de acreditación */}
      <line x1="42" y1="31" x2="60" y2="31" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="42" y1="37" x2="58" y2="37" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <line x1="42" y1="43" x2="54" y2="43" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <line x1="42" y1="49" x2="50" y2="49" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Componente de Tarjeta de Certificación / Diploma
// ---------------------------------------------------------------------------
function CredentialCard({
  item,
  onDownload,
  isDownloading,
  idx = 0,
}: {
  item: CredentialCardItem;
  onDownload: (id: string, isDiploma?: boolean) => void;
  isDownloading: boolean;
  idx?: number;
}) {
  const theme = CREDENTIAL_PASTEL_PALETTE[idx % CREDENTIAL_PASTEL_PALETTE.length];

  return (
    <div
      className={`bg-gradient-to-br ${theme.bg} rounded-3xl border-0 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-0.5`}
    >
      {/* Zona Superior */}
      <div className="p-5 sm:p-6 flex flex-col items-center flex-1">
        {/* Píldora superior tipo Certificación / Diploma en amarillo con barra dorada a la izquierda */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FEF3C7] text-[#92400E] text-xs font-bold border-l-4 border-[#F59E0B] shadow-2xs">
            {item.type === 'diploma' ? 'Diploma' : 'Certificación'}
          </div>
        </div>

        {/* Gráfico central del certificado o diploma */}
        <div className="flex items-center justify-center py-2 min-h-[90px] group-hover:scale-105 transition-transform duration-300">
          {item.type === 'diploma' ? <DiplomaVector /> : <CertificateVector />}
        </div>

        {/* Categoría: SIEMPRE "CURSO" */}
        <div className="text-center text-[10px] sm:text-xs font-extrabold text-[#1A4E26] uppercase tracking-widest mt-2">
          CURSO
        </div>

        {/* Nombre real del curso en negrita */}
        <h3
          className={`font-black ${theme.title} text-sm sm:text-base text-center px-2 mt-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center leading-snug group-hover:text-[#1A4E26] transition-colors`}
        >
          {item.title}
        </h3>
      </div>

      {/* Datos: Otorgado a, Código de verificación y Fecha de emisión */}
      <div className="py-2.5 px-4 text-center text-xs space-y-1">
        <p className={`text-[11px] ${theme.textMuted} truncate`}>
          Otorgado a: <span className="font-bold text-slate-900">{item.participantName || 'Estudiante SUMAK'}</span>
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

      {/* Fila inferior con ambos botones en verde oscuro con separación lateral de los bordes */}
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-5 pt-2 w-full select-none mt-auto">
        {/* Botón Descargar PDF en verde oscuro */}
        <button
          type="button"
          onClick={() => onDownload(item.id, item.isDiploma)}
          disabled={isDownloading || item.status === 'revoked'}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1A4E26] hover:bg-[#143D1E] active:scale-95 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap shadow-2xs border-0"
          title="Descargar credencial en PDF"
        >
          <Download size={14} className="shrink-0 text-white" />
          <span>{isDownloading ? 'Generando PDF...' : 'Descargar PDF'}</span>
        </button>

        {/* Botón Verificar Credencial en verde oscuro */}
        <Link
          to={`/academia/verificar?code=${item.verification_code}`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1A4E26] hover:bg-[#143D1E] active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap border-0"
          title="Verificar credencial en el registro público oficial"
        >
          <ShieldCheck size={14} className="shrink-0 text-amber-300" />
          <span>Verificar credencial</span>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página Principal de Certificaciones
// ---------------------------------------------------------------------------
export default function MisDiplomas() {
  const { profile } = useAuth();
  const [diplomas, setDiplomas] = useState<AcademyDiplomaIssuance[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [diplomaData, certificateData] = await Promise.all([
          academyAPI.getMyDiplomas(profile?.id),
          academyAPI.getMyCertificates(profile?.id),
        ]);
        setDiplomas((diplomaData || []) as AcademyDiplomaIssuance[]);
        setCertificates((certificateData || []) as any[]);
      } catch (err) {
        console.error('Error loading diplomas:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [profile?.id]);

  const handleDownload = async (issuanceId: string, isDiploma = true) => {
    try {
      setDownloadingId(issuanceId);

      // Si es un diploma oficial con registro de emisión en Supabase
      if (isDiploma && !issuanceId.startsWith('demo-')) {
        const res = await callEdgeFunction<{ ok: boolean; signedUrl: string }>('academy-sign-document-url', {
          issuance_id: issuanceId,
        });
        if (res.signedUrl) {
          window.open(res.signedUrl, '_blank');
          return;
        }
      }

      // Fallback para certificados o demostración: abre la credencial verificable
      window.open(`/academia/verificar?code=${issuanceId}`, '_blank');
    } catch (err) {
      console.error('Error downloading diploma:', err);
      alert('Hubo un error al descargar el documento. Por favor intenta nuevamente.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Mapeo unificado: dividido en Certificaciones y Diplomas con nombre real del curso
  const allCredentials: CredentialCardItem[] = useMemo(() => {
    const items: CredentialCardItem[] = [];

    // Diplomas de programas completados
    diplomas.forEach((dip) => {
      items.push({
        id: dip.id,
        type: 'diploma',
        categoryLabel: 'CURSO',
        title: dip.program_name || dip.diploma_type?.name || 'Nombre del Curso',
        participantName: dip.participant_name || profile?.nombre_completo || 'Estudiante SUMAK',
        issued_at: dip.issued_at,
        verification_code: dip.verification_code,
        status: dip.status === 'revoked' ? 'revoked' : 'active',
        isDiploma: true,
      });
    });

    // Certificaciones de cursos completados
    certificates.forEach((cert) => {
      items.push({
        id: cert.id,
        type: 'certificado',
        categoryLabel: 'CURSO',
        title: cert.course_name || cert.title || 'Nombre del Curso',
        participantName: cert.participant_name || profile?.nombre_completo || 'Estudiante SUMAK',
        issued_at: cert.issued_at,
        verification_code: cert.certificate_number || cert.verification_code || cert.id,
        status: 'active',
        isDiploma: false,
      });
    });

    // Si aún no hay credenciales emitidas en la cuenta, mostramos las de muestra iniciales
    if (items.length === 0) {
      const studentName = profile?.nombre_completo || 'Carlos Mendoza';
      return [
        {
          id: 'demo-cred-1',
          type: 'certificado',
          categoryLabel: 'CURSO',
          title: 'Liderazgo y Duplicación en Red',
          participantName: studentName,
          issued_at: '2025-08-12',
          verification_code: 'SUMAK-LID-2025-001',
          status: 'active',
          isDiploma: false,
        },
        {
          id: 'demo-cred-2',
          type: 'diploma',
          categoryLabel: 'CURSO',
          title: 'Liderazgo y Duplicación en Red',
          participantName: studentName,
          issued_at: '2025-08-12',
          verification_code: 'SUMAK-LID-2025-002',
          status: 'active',
          isDiploma: true,
        },
        {
          id: 'demo-cred-3',
          type: 'certificado',
          categoryLabel: 'CURSO',
          title: 'Cosmética Natural y Fitoterapia',
          participantName: studentName,
          issued_at: '2025-02-04',
          verification_code: 'SUMAK-FIT-2025-001',
          status: 'active',
          isDiploma: false,
        },
        {
          id: 'demo-cred-4',
          type: 'diploma',
          categoryLabel: 'CURSO',
          title: 'Cosmética Natural y Fitoterapia',
          participantName: studentName,
          issued_at: '2025-02-04',
          verification_code: 'SUMAK-FIT-2025-002',
          status: 'active',
          isDiploma: true,
        },
      ];
    }

    return items;
  }, [diplomas, certificates, profile]);

  // Filtrado por pestañas: Todos, Certificaciones o Diplomas
  const filteredCredentials = useMemo(() => {
    if (activeTab === 'all') return allCredentials;
    return allCredentials.filter((c) => c.type === activeTab);
  }, [allCredentials, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#1A4E26]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const certCount = allCredentials.filter((c) => c.type === 'certificado').length;
  const dipCount = allCredentials.filter((c) => c.type === 'diploma').length;

  return (
    <div className="w-full pb-16">
      {/* 1. Header Institucional Full Width — Sin caja contenedora */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Mis Certificaciones
            </h1>

            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Consulta, descarga y verifica todas tus certificaciones y diplomas oficiales emitidos por la Academia SUMAK.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Cuentas con{' '}
              <strong className="text-amber-300 font-bold">
                {allCredentials.length} {allCredentials.length === 1 ? 'credencial registrada' : 'credenciales registradas'}
              </strong>{' '}
              ({certCount} {certCount === 1 ? 'certificación' : 'certificaciones'} y{' '}
              <strong className="text-white font-bold">
                {dipCount} {dipCount === 1 ? 'diploma oficial' : 'diplomas oficiales'}
              </strong>
              ).
            </p>
          </div>

          {/* Floating 3D/Glass Badges */}
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

      {/* 2. Contenido centrado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {/* Pestañas de filtrado divididas en Certificaciones y Diplomas centradas */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 border-b border-slate-200/80 pb-3 text-sm sm:text-base select-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`transition-colors font-medium pb-1 cursor-pointer ${
              activeTab === 'all'
                ? 'text-slate-900 font-bold border-b-2 border-[#1A4E26]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Todos ({allCredentials.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('certificado')}
            className={`transition-colors font-medium pb-1 cursor-pointer ${
              activeTab === 'certificado'
                ? 'text-slate-900 font-bold border-b-2 border-[#1A4E26]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Certificaciones ({certCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diploma')}
            className={`transition-colors font-medium pb-1 cursor-pointer ${
              activeTab === 'diploma'
                ? 'text-slate-900 font-bold border-b-2 border-[#1A4E26]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Diplomas ({dipCount})
          </button>
        </div>

        {/* Grid de Tarjetas (3 Columnas en Desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredCredentials.map((item, idx) => (
            <CredentialCard
              key={item.id}
              item={item}
              onDownload={handleDownload}
              isDownloading={downloadingId === item.id}
              idx={idx}
            />
          ))}
        </div>

        {/* Nota amigable si se muestran credenciales de demostración */}
        {diplomas.length === 0 && certificates.length === 0 && (
          <div className="bg-white/80 rounded-3xl p-6 text-center space-y-2 mt-6 border-0 shadow-xs">
            <p className="text-xs sm:text-sm font-semibold text-[#1A4E26]">
              Mostrando credenciales de demostración. Completa tus evaluaciones y lecciones para emitir tus diplomas y certificaciones oficiales verificadas.
            </p>
            <Link
              to="/academia/dashboard/cursos"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A4E26] hover:underline mt-1"
            >
              Ver mis cursos en progreso →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
