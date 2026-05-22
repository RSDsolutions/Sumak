import React from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-heading uppercase tracking-widest text-sm transition-all duration-200 border-radius-0";
  
  const variants = {
    primary: "bg-alert-red text-khaki-white hover:bg-alert-red-hover hover:shadow-[0_4px_14px_rgba(200,55,26,0.25)] rounded-none",
    outline: "border border-tactical-border text-khaki-white hover:bg-olive-dark rounded-none",
    ghost: "text-muted-dark hover:text-alert-red bg-transparent rounded-none"
  };

  const px = variant === 'ghost' ? 'px-2' : 'px-10';
  const py = variant === 'ghost' ? 'py-2' : 'py-4';

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${px} ${py} font-bold tracking-[0.2em] uppercase text-sm ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
