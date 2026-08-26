import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ShieldCheck, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

export default function VerificarDiploma() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || searchParams.get('token') || '';
  
  const [code, setCode] = useState(initialCode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-verify if code is present in URL on load
  useEffect(() => {
    if (initialCode) {
      handleVerify(initialCode);
    }
  }, [initialCode]);

  const handleVerify = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) {
      setError('Por favor ingresa un código válido.');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    setResult(null);
    
    // Update URL without reloading
    setSearchParams({ code: codeToVerify });
    
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const res = await fetch(`${url}/functions/v1/academy-verify-diploma`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey
        },
        body: JSON.stringify({ token: codeToVerify })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al verificar el diploma');
      }
      
      if (data.is_valid || data.status === 'revoked') {
        setResult(data);
      } else {
        setError('El código ingresado no corresponde a un diploma emitido por Academia SUMAK.');
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de conexión. Intenta nuevamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(code);
  };

  return (
    <div className="min-h-[80vh] bg-[#F4F7F5] flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <ShieldCheck className="mx-auto text-[#1A4E26] mb-4" size={48} />
          <h1 className="text-3xl font-black text-[#111111] mb-2 font-heading">
            Verificación de Credenciales
          </h1>
          <p className="text-[#6B7280]">
            Ingresa el código de verificación o token único impreso en el diploma para validar su autenticidad.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-[#C8D8CB] p-6 sm:p-8 mb-8">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
              <input
                type="text"
                placeholder="Ej. SUMAK-8F4K-29PX-7Q2M"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#1A4E26] focus:border-[#1A4E26] outline-none font-mono text-lg transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !code.trim()}
              className="px-8 py-4 bg-[#1A4E26] text-white font-bold rounded-xl hover:bg-[#163F1E] transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 shadow-md"
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verificando
                </>
              ) : (
                'Verificar'
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4">
            <ShieldAlert className="text-red-500 shrink-0" size={28} />
            <div>
              <h3 className="font-bold text-red-800 text-lg mb-1">Credencial No Encontrada</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            {result.is_valid && result.status !== 'revoked' ? (
              <div className="bg-white border-2 border-[#1A4E26] rounded-2xl overflow-hidden shadow-2xl shadow-[#1A4E26]/10">
                <div className="bg-[#1A4E26] text-white p-6 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[#1A4E26] mb-4">
                    <CheckCircle size={40} />
                  </div>
                  <h2 className="text-2xl font-black mb-1">Credencial Válida</h2>
                  <p className="text-white/80 font-mono text-sm">Registro verificado y sellado digitalmente.</p>
                </div>
                
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Otorgado a</p>
                    <p className="text-xl font-bold text-[#111111]">{result.participant_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Por haber completado</p>
                    <p className="text-lg font-medium text-[#111111]">{result.program_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Fecha de Emisión</p>
                      <p className="font-medium text-[#111111]">
                        {new Date(result.issued_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">N° de Diploma</p>
                      <p className="font-mono font-medium text-[#111111]">{result.diploma_number}</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#EBF4ED] p-4 rounded-xl border border-[#1A4E26]/20 flex items-start gap-3 mt-4">
                    <ShieldCheck className="text-[#1A4E26] shrink-0 mt-0.5" size={20} />
                    <p className="text-xs text-[#1A4E26]">
                      Este documento ha sido emitido de manera oficial por Academia SUMAK. Su integridad está protegida criptográficamente.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-red-500 rounded-2xl overflow-hidden shadow-2xl shadow-red-500/10">
                <div className="bg-red-500 text-white p-6 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 mb-4">
                    <XCircle size={40} />
                  </div>
                  <h2 className="text-2xl font-black mb-1">Credencial Revocada</h2>
                  <p className="text-white/80 text-sm">Este diploma ha sido invalidado por la administración.</p>
                </div>
                
                <div className="p-6 sm:p-8 space-y-6 opacity-60 grayscale">
                  <div>
                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Otorgado a</p>
                    <p className="text-xl font-bold text-[#111111]">{result.participant_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Programa</p>
                    <p className="text-lg font-medium text-[#111111]">{result.program_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Fecha de Revocación</p>
                    <p className="font-medium text-red-600">
                      {new Date(result.revoked_at || new Date()).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
