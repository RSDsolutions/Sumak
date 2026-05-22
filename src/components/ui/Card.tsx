import React from 'react';

export interface CardProps extends React.ComponentProps<"div"> {
  className?: string;
  children: React.ReactNode;
  accentColor?: 'red' | 'green' | 'amber' | 'none';
  hoverEffect?: boolean;
}

export function Card({ className = '', children, accentColor = 'none', hoverEffect = true, ...props }: CardProps) {
  const accentStyles = {
    red: "border-l-[4px] border-l-alert-red hover:shadow-[0_8px_30px_rgba(200,55,26,0.2)]",
    green: "border-l-[4px] border-l-field-green hover:shadow-[0_8px_30px_rgba(138,175,90,0.2)]",
    amber: "border-l-[4px] border-l-amber hover:shadow-[0_8px_30px_rgba(232,160,48,0.2)]",
    none: "border hover:border-olive-hover"
  };

  const hoverStyle = hoverEffect ? "hover:-translate-y-1 transition-all duration-300" : "";

  return (
    <div className={`relative bg-olive-dark border border-tactical-border rounded-none overflow-hidden ${accentStyles[accentColor]} ${hoverStyle} ${className}`} {...props}>
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `linear-gradient(45deg, transparent 49%, var(--color-tactical-border) 49%, var(--color-tactical-border) 51%, transparent 51%)`,
            backgroundSize: '12px 12px'
        }}></div>
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
