import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', hover = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10
        shadow-[0_8px_32px_0_rgba(124,58,237,0.15)]
        ${hover ? 'transition-all duration-300 hover:bg-white/10 hover:border-[#7C3AED]/30 hover:shadow-[0_8px_32px_0_rgba(124,58,237,0.25)]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
