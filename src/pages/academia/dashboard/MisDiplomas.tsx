import { useState, useEffect } from 'react';
import { Award, Download, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { callEdgeFunction } from '../../../lib/supabase';
import type { AcademyDiplomaIssuance } from '../../../lib/academy-types';
import { Link } from 'react-router-dom';

export default function MisDiplomas() {
  const [diplomas, setDiplomas] = useState<AcademyDiplomaIssuance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await academyAPI.getMyDiplomas();
        setDiplomas(data as AcademyDiplomaIssuance[]);
      } catch (err) {
        console.error("Error loading diplomas:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDownload = async (issuanceId: string) => {
    try {
      setDownloadingId(issuanceId);
      const res = await callEdgeFunction<{ ok: boolean; signedUrl: string }>('academy-sign-document-url', {
        issuance_id: issuanceId
      });
      
      if (res.signedUrl) {
        // Open the signed URL in a new tab to download
        window.open(res.signedUrl, '_blank');
      }
    } catch (err) {
      console.error("Error downloading diploma:", err);
      alert("Hubo un error al descargar el diploma. Por favor intenta nuevamente.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black text-[#111111] font-heading">
          Mis Diplomas
        </h1>
        <p className="text-[#6B7280] mt-1 text-lg">
          Gestiona, descarga y verifica tus certificaciones oficiales.
        </p>
      </div>

      {diplomas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] border-dashed p-12 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="text-slate-300" size={40} />
          </div>
          <h3 className="text-xl font-bold text-[#111111] mb-2">Aún no tienes diplomas</h3>
          <p className="text-[#6B7280] mb-8 max-w-md mx-auto">
            Completa los cursos de la academia que generan certificación para obtener tus primeros diplomas verificables digitalmente.
          </p>
          <Link 
            to="/academia/cursos"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A4E26] text-white font-bold hover:bg-[#163F1E] transition-colors"
          >
            Explorar Cursos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diplomas.map((dip) => (
            <div key={dip.id} className="bg-white rounded-2xl border border-[#C8D8CB] overflow-hidden hover:shadow-lg transition-shadow flex flex-col group">
              <div className="bg-[#1A4E26] p-6 text-center relative overflow-hidden">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 mx-auto bg-[#D4AF37] rounded-full flex items-center justify-center shadow-lg mb-4 ring-4 ring-white/10">
                    <Award size={32} className="text-[#0B2913]" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1 leading-tight">
                    {dip.diploma_type?.name}
                  </h3>
                  <p className="text-sm text-[#D4AF37] font-semibold">{dip.program_name}</p>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-0.5">Otorgado a</p>
                    <p className="font-medium text-[#111111]">{dip.participant_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-0.5">Fecha de Emisión</p>
                    <p className="font-medium text-[#111111]">
                      {new Date(dip.issued_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-0.5">Código de Verificación</p>
                    <p className="font-mono font-bold text-[#1A4E26] bg-[#EBF4ED] px-2 py-1 rounded-md inline-block text-sm border border-[#1A4E26]/20">
                      {dip.verification_code}
                    </p>
                  </div>
                </div>
                
                <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleDownload(dip.id)}
                    disabled={downloadingId === dip.id || dip.status === 'revoked'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F4F7F5] text-[#111111] font-bold hover:bg-[#EBF4ED] hover:text-[#1A4E26] transition-colors border border-[#C8D8CB] disabled:opacity-50"
                  >
                    <Download size={18} />
                    {downloadingId === dip.id ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>
                  
                  <Link
                    to={`/academia/verificar?code=${dip.verification_code}`}
                    target="_blank"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[#1A4E26] font-bold hover:bg-slate-50 transition-colors"
                  >
                    <ShieldCheck size={18} />
                    Verificar Credencial
                  </Link>
                </div>
                
                {dip.status === 'revoked' && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                    REVOCADO
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
