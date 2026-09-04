import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Download, ExternalLink, Search, ShieldCheck, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { callPublicEdgeFunction } from '../../lib/supabase';
import { useSEO } from '../../lib/seo';

interface VerificationResult { found: boolean; status: 'VALID' | 'REVOKED' | 'NOT_CURRENT' | 'NOT_FOUND'; diploma_number?: string; participant_name?: string; program_name?: string; course_name?: string | null; diploma_type?: string | null; issued_at?: string; document_available?: boolean }

export default function VerificarDiplomaPublico() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  useSEO({ title: 'Verificar Diploma — SUMAK', description: 'Verificación pública de diplomas SUMAK.' });

  useEffect(() => {
    async function verify() {
      if (!token) { setResult({ found: false, status: 'NOT_FOUND' }); setLoading(false); return; }
      try { setResult(await callPublicEdgeFunction<VerificationResult>('academy-verify-registered-diploma', { token })); }
      catch { setResult({ found: false, status: 'NOT_FOUND' }); }
      finally { setLoading(false); }
    }
    void verify();
  }, [token]);

  async function openDocument() {
    if (!token) return;
    try { const response = await callPublicEdgeFunction<{ signed_url: string }>('academy-sign-registered-diploma-url', { token }); setDocumentUrl(response.signed_url); window.open(response.signed_url, '_blank', 'noopener,noreferrer'); }
    catch { setDocumentUrl(null); }
  }

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center bg-[#F4F7F5]"><div className="h-10 w-10 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" /></div>;
  const valid = result?.found && result.status === 'VALID';
  const revoked = result?.found && result.status === 'REVOKED';
  return <div className="min-h-[70vh] bg-[#F4F7F5] py-12 px-4"><div className="max-w-2xl mx-auto"><div className="text-center mb-8"><ShieldCheck className="mx-auto text-[#1A4E26]" size={44} /><h1 className="text-3xl font-black text-[#111111] mt-4">Verificación de diploma</h1><p className="text-[#6B7280] mt-2">Consulta pública de credenciales emitidas por SUMAK.</p></div><div className={`bg-white rounded-2xl border-2 ${valid ? 'border-[#1A4E26]' : revoked ? 'border-amber-400' : 'border-red-300'} shadow-sm overflow-hidden`}><div className={`p-6 text-center text-white ${valid ? 'bg-[#1A4E26]' : revoked ? 'bg-amber-500' : 'bg-red-500'}`}>{valid ? <CheckCircle className="mx-auto" size={42} /> : revoked ? <AlertTriangle className="mx-auto" size={42} /> : <XCircle className="mx-auto" size={42} />}<h2 className="text-2xl font-black mt-3">{valid ? 'Diploma verificado' : revoked ? 'Diploma revocado' : 'Diploma no encontrado'}</h2><p className="text-white/80 text-sm mt-1">{valid ? 'Este diploma fue emitido oficialmente por SUMAK.' : revoked ? 'Este diploma fue emitido anteriormente, pero ya no es válido.' : 'El código no corresponde a un diploma registrado por SUMAK.'}</p></div>{result?.found && <div className="p-6 sm:p-8 space-y-5"><Info label="Titular" value={result.participant_name} /><Info label="Programa" value={result.program_name} /><Info label="Formación" value={result.course_name || result.diploma_type} /><div className="grid sm:grid-cols-2 gap-5"><Info label="Fecha de emisión" value={result.issued_at ? new Date(result.issued_at).toLocaleDateString('es-EC') : undefined} /><Info label="Número" value={result.diploma_number} /></div>{result.document_available && <div className="flex flex-wrap gap-3 pt-4 border-t border-[#E5ECE6]"><button type="button" onClick={() => void openDocument()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold"><ExternalLink size={17} /> Ver diploma</button><button type="button" onClick={() => void openDocument()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#C8D8CB] text-[#1A4E26] font-bold"><Download size={17} /> Descargar PDF</button>{documentUrl && <span className="sr-only">Documento listo</span>}</div>}</div>}</div></div></div>;
}

function Info({ label, value }: { label: string; value?: string }) { return <div><p className="text-xs uppercase tracking-wider font-bold text-[#6B7280]">{label}</p><p className="text-lg font-semibold text-[#111111] mt-1">{value || 'No disponible'}</p></div>; }