import React from 'react';

interface SumakLogoProps {
  className?: string;
  variant?: 'header' | 'qr' | 'full';
  size?: number;
}

export const SumakLogo: React.FC<SumakLogoProps> = ({ className = '', variant = 'header', size = 48 }) => {
  if (variant === 'qr') {
    return (
      <div className={`relative flex items-center justify-center p-1 bg-white rounded-xl shadow-md border border-[#C8D8CB] ${className}`}>
        <img
          src="/logo_qr.png"
          alt="Logo Sumak QR"
          className="object-contain"
          style={{ width: size, height: size }}
          onError={(e) => {
            // Fallback SVG if image not loaded
            const target = e.currentTarget;
            target.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* Header official Sumak image logo with fallback */}
      <img
        src="/LOGO_SUMAK.png"
        alt="SUMAK VIDA ECUADOR S.A."
        className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm"
        onError={(e) => {
          // Fallback typography if image not found
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
};
