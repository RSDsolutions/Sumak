import React from 'react';

export function Crosshair({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="2" fill="currentColor" />
    </svg>
  );
}

export function RankStripe({ className = '' }: { className?: string }) {
  return (
     <div className={`flex space-x-1 ${className}`}>
        <div className="w-8 h-[2px] bg-alert-red" />
        <div className="w-8 h-[2px] bg-alert-red" />
        <div className="w-8 h-[2px] bg-alert-red" />
     </div>
  );
}

export function CompassRose({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" />
      <path d="M50 2 L60 40 L98 50 L60 60 L50 98 L40 60 L2 50 L40 40 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M50 20 L55 45 L80 50 L55 55 L50 80 L45 55 L20 50 L45 45 Z" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}
