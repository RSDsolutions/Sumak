import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { DistributorData, CardStatus } from '../../components/credencial/types';
import { Interactive3DCard } from '../../components/credencial/Interactive3DCard';
import { SumakLogo } from '../../components/credencial/SumakLogo';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function TarjetaDigital() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Helper para iniciales
  const getInitials = (name?: string | null) => {
    if (!name) return 'SK';
    const parts = name.replace('@', '').split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return 'SK';
  };

  const sponsorRef = profile?.username || profile?.codigo_distribuidor || 'SUMAK';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sumakecuador.com';

  // Datos base tomados del perfil real de Sumak
  const defaultDistributorData: DistributorData = {
    companyName: 'SUMAK VIDA ECUADOR',
    companySub: 'CÓDIGO DIGITAL DE AFILIACIÓN',
    fullName: (profile?.nombre_completo || profile?.username || 'DISTRIBUIDOR INDEPENDIENTE').toUpperCase(),
    officialCode: profile?.codigo_distribuidor || 'SUMAK-00000',
    category: profile?.rol === 'admin' 
      ? 'ADMINISTRADOR GENERAL' 
      : (profile?.paquete ? `PAQUETE ${profile.paquete.toUpperCase()}` : 'DISTRIBUIDOR INDEPENDIENTE'),
    status: (profile?.estado?.toUpperCase() as CardStatus) || 'ACTIVO',
    validityArea: 'VÁLIDO EN TODO EL TERRITORIO NACIONAL',
    avatarInitials: getInitials(profile?.nombre_completo || profile?.username),
    avatarImage: profile?.avatar_url || undefined,
    qrUrl: `${baseUrl}/tarjetadigital?ref=${sponsorRef}`,
    website: 'www.sumakecuador.com',
    supportText: 'Soporte Oficial',
    scanTitle: '¡ESCANEA Y CONÉCTATE!',
    scanInstruction:
      'Apunta la cámara de tu teléfono a este código QR para afiliarte directamente como nuevo distribuidor o comprar tus productos con descuento exclusivo.',
  };

  const [distributor, setDistributor] = useState<DistributorData>(defaultDistributorData);

  // Sincronizar si cambia el perfil
  useEffect(() => {
    if (profile) {
      setDistributor({
        companyName: 'SUMAK VIDA ECUADOR',
        companySub: 'CÓDIGO DIGITAL DE AFILIACIÓN',
        fullName: (profile.nombre_completo || profile.username || 'DISTRIBUIDOR INDEPENDIENTE').toUpperCase(),
        officialCode: profile.codigo_distribuidor || 'SUMAK-00000',
        category: profile.rol === 'admin' 
          ? 'ADMINISTRADOR GENERAL' 
          : (profile.paquete ? `PAQUETE ${profile.paquete.toUpperCase()}` : 'DISTRIBUIDOR INDEPENDIENTE'),
        status: (profile.estado?.toUpperCase() as CardStatus) || 'ACTIVO',
        validityArea: 'VÁLIDO EN TODO EL TERRITORIO NACIONAL',
        avatarInitials: getInitials(profile.nombre_completo || profile.username),
        avatarImage: profile.avatar_url || undefined,
        qrUrl: `${baseUrl}/tarjetadigital?ref=${profile.username || profile.codigo_distribuidor || 'SUMAK'}`,
        website: 'www.sumakecuador.com',
        supportText: 'Soporte Oficial',
        scanTitle: '¡ESCANEA Y CONÉCTATE!',
        scanInstruction:
          'Apunta la cámara de tu teléfono a este código QR para afiliarte directamente como nuevo distribuidor o comprar tus productos con descuento exclusivo.',
      });
    }
  }, [profile, baseUrl]);

  return (
    <div className="min-h-screen bg-[#F4F7F5] text-slate-800 flex flex-col font-sans selection:bg-[#1A4E26] selection:text-white">
      {/* BRAND TOP HEADER BAR (Minimalista, sin botones superiores de toolbar) */}
      <header className="no-print bg-[#1A4E26] text-white py-3 px-4 sm:px-8 border-b border-[#163F1E] shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer mr-1"
              title="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <SumakLogo variant="header" size={32} />
            <div className="hidden sm:block pl-3 border-l border-white/20">
              <h1 className="text-sm font-extrabold tracking-wider text-white font-heading uppercase">
                Tarjeta Digital Oficial
              </h1>
              <p className="text-[10px] text-emerald-200/80 font-medium">
                SUMAK VIDA ECUADOR S.A.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-500/50 text-[11px] font-bold text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>UI Card Verificada</span>
            </span>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE — VISTA GIRO 3D PREDETERMINADA */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10 flex flex-col items-center justify-center">
        <div className="w-full flex flex-col items-center justify-center my-auto">
          <Interactive3DCard data={distributor} />
        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="no-print py-4 px-6 border-t border-[#C8D8CB] bg-white/70 text-center text-xs text-[#6B7280] mt-auto">
        <p className="font-medium">
          Credencial Digital Oficial <span className="font-bold text-[#1A4E26]">SUMAK VIDA ECUADOR S.A.</span>
        </p>
      </footer>
    </div>
  );
}
