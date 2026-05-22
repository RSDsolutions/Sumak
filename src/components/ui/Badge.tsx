import React from 'react';

export interface BadgeProps extends React.ComponentProps<"span"> {
  children: React.ReactNode;
  color?: 'red' | 'green' | 'amber' | 'outline';
  className?: string;
  pill?: boolean;
}

export function Badge({ children, color = 'outline', className = '', pill = true, ...props }: BadgeProps) {
  const colors = {
    red: "bg-alert-red text-khaki-white",
    green: "bg-field-green text-tactical-black font-semibold",
    amber: "bg-amber text-tactical-black font-semibold",
    outline: "border border-tactical-border text-muted-dark"
  };

  const radius = pill ? "rounded-full" : "rounded-[2px]";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] font-medium ${colors[color]} ${radius} ${className}`} {...props}>
      {children}
    </span>
  );
}
