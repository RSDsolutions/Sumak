import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DistributorData } from './types';
import { SumakLogo } from './SumakLogo';

interface CardBackProps {
  data: DistributorData;
  className?: string;
  showWatermark?: boolean;
}

export const CardBack: React.FC<CardBackProps> = ({
  data,
  className = '',
  showWatermark = true,
}) => {
  // Construct the QR payload value (URL encoded in QR, not visible as plain text)
  const qrPayload = data.qrUrl || `https://${data.website || 'sumakecuador.com'}/registro?ref=${data.officialCode}`;

  return (
    <div
      className={`relative w-[340px] sm:w-[380px] h-[540px] sm:h-[590px] bg-white rounded-[24px] shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between select-none card-container ${className}`}
      style={{
        boxShadow: '0 20px 40px -15px rgba(26, 78, 38, 0.18), 0 0 0 1px rgba(0,0,0,0.05)',
      }}
    >
      {/* Background Watermark Pattern */}
      {showWatermark && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden flex items-center justify-center">
          <div className="w-[400px] h-[400px] rounded-full border-[30px] border-[#1A4E26] flex items-center justify-center -rotate-12">
            <div className="w-[260px] h-[260px] rounded-full border-[15px] border-[#1A4E26]" />
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="relative bg-[#1A4E26] text-white pt-5 pb-4 px-4 flex flex-col items-center text-center rounded-t-[23px]">
        <h3 className="text-white font-extrabold text-base sm:text-lg tracking-wider font-heading uppercase">
          {data.companyName || 'SUMAK VIDA ECUADOR'}
        </h3>
        <p className="text-[10px] sm:text-[11px] font-bold text-[#D4AF37] tracking-widest uppercase mt-0.5 font-heading">
          {data.companySub || 'CÓDIGO DIGITAL DE AFILIACIÓN'}
        </p>

        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B]" />
      </div>

      {/* BODY CONTENT SECTION WITH QR CODE */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-3 z-10">
        {/* QR CODE CONTAINER BOX */}
        <div className="w-full bg-white border border-[#C8D8CB] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col items-center">
          <div className="relative p-2 bg-white rounded-xl flex items-center justify-center border border-slate-100">
            <QRCodeSVG
              value={qrPayload}
              size={195}
              fgColor="#1A4E26"
              bgColor="#ffffff"
              level="H"
              marginSize={1}
            />

            {/* Logo overlay in center of QR code */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white p-1 rounded-xl shadow-md border border-[#C8D8CB] flex items-center justify-center">
                <SumakLogo variant="qr" size={38} />
              </div>
            </div>
          </div>
        </div>

        {/* SCAN TEXT & INSTRUCTIONS */}
        <div className="text-center mt-3 mb-1 px-2">
          <h4 className="text-slate-900 font-extrabold text-sm sm:text-base uppercase tracking-wider font-heading">
            {data.scanTitle || '¡ESCANEA Y CONÉCTATE!'}
          </h4>
          <p className="text-slate-600 text-[10px] sm:text-[11px] leading-relaxed max-w-[270px] mx-auto my-2 font-medium">
            {data.scanInstruction ||
              'Apunta la cámara de tu teléfono a este código QR para afiliarte directamente como nuevo distribuidor o comprar tus productos con descuento exclusivo.'}
          </p>
          <div className="inline-block bg-[#EBF4ED] px-3 py-1 rounded-md mt-1 border border-[#C8D8CB]/80">
            <p className="text-slate-600 font-mono text-[10px] sm:text-xs font-semibold tracking-wider">
              Distribuidor ID: <span className="text-[#1A4E26] font-bold">{data.officialCode}</span>
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION */}
      <div className="pb-4 pt-2 text-center border-t border-slate-100 bg-slate-50/50 rounded-b-[23px]">
        <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold tracking-wider">
          {data.website || 'www.sumakecuador.com'} <span className="text-slate-300 mx-1.5">•</span> {data.supportText || 'Soporte Oficial'}
        </p>
      </div>
    </div>
  );
};
