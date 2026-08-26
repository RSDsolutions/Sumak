import { useState, useEffect } from 'react';
import { Award, Search, Download, Ban, FileText, CheckCircle, XCircle } from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { callEdgeFunction } from '../../../lib/supabase';
import type { AcademyDiplomaIssuance } from '../../../lib/academy-types';

export default function AdminDiplomas() {
  const [diplomas, setDiplomas] = useState<AcademyDiplomaIssuance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadDiplomas();
  }, []);

  async function loadDiplomas() {
    try {
      setIsLoading(true);
      const data = await academyAPI.getAllDiplomas();
      setDiplomas(data as AcademyDiplomaIssuance[]);
    } catch (err) {
      console.error("Error loading diplomas:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownload = async (issuanceId: string) => {
    try {
      setIsProcessingId(issuanceId);
      const res = await callEdgeFunction<{ ok: boolean; signedUrl: string }>('academy-sign-document-url', {
        issuance_id: issuanceId
      });
      if (res.signedUrl) {
        window.open(res.signedUrl, '_blank');
      }
    } catch (err) {
      console.error("Error downloading:", err);
      alert("Error al descargar el diploma.");
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleRevoke = async (issuanceId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas revocar este diploma? Esta acción invalidará el código de verificación públicamente.")) {
      return;
    }
    
    try {
      setIsProcessingId(issuanceId);
      await callEdgeFunction('academy-revoke-diploma', {
        issuance_id: issuanceId,
        reason: 'Revocado por administrador'
      });
      await loadDiplomas();
    } catch (err) {
      console.error("Error revoking:", err);
      alert("Error al revocar el diploma.");
    } finally {
      setIsProcessingId(null);
    }
  };

  const filteredDiplomas = diplomas.filter(d => 
    d.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.verification_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.diploma_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Diplomas y Certificados</h1>
          <p className="text-[#6B7280]">Gestión y auditoría de credenciales emitidas.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#C8D8CB] bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, código o número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#1A4E26] outline-none"
            />
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-[#6B7280]">
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-[#1A4E26]" /> Válidos</span>
            <span className="flex items-center gap-1"><XCircle size={14} className="text-red-500" /> Revocados</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredDiplomas.length === 0 ? (
            <div className="text-center py-20">
              <Award className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">No se encontraron diplomas.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-slate-50">
                  <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Estudiante</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Programa</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Emisión / Código</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDiplomas.map((dip) => (
                  <tr key={dip.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#111111]">{dip.participant_name}</p>
                      <p className="text-xs text-[#6B7280]">#{dip.diploma_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[#111111] text-sm line-clamp-2">{dip.program_name}</p>
                      <p className="text-xs text-[#D4AF37] font-bold mt-0.5">{dip.diploma_type?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#111111]">
                        {new Date(dip.issued_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded mt-1 inline-block">
                        {dip.verification_code}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {dip.status === 'valid' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/20">
                          <CheckCircle size={12} /> Válido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle size={12} /> Revocado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDownload(dip.id)}
                          disabled={isProcessingId === dip.id || dip.status === 'revoked'}
                          className="p-2 text-[#6B7280] hover:text-[#1A4E26] hover:bg-[#EBF4ED] rounded-lg transition-colors disabled:opacity-50"
                          title="Descargar PDF"
                        >
                          <Download size={18} />
                        </button>
                        {dip.status === 'valid' && (
                          <button
                            onClick={() => handleRevoke(dip.id)}
                            disabled={isProcessingId === dip.id}
                            className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Revocar"
                          >
                            <Ban size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
