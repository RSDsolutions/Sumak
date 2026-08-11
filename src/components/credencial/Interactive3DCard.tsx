import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CardFront } from './CardFront';
import { CardBack } from './CardBack';
import { DistributorData } from './types';
import { RotateCw, Sparkles } from 'lucide-react';

interface Interactive3DCardProps {
  data: DistributorData;
  className?: string;
}

export const Interactive3DCard: React.FC<Interactive3DCardProps> = ({ data, className = '' }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [shine, setShine] = useState({ opacity: 0, x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -12; // tilt up/down
    const rY = ((x - centerX) / centerX) * 12;  // tilt left/right

    setRotateX(rX);
    setRotateY(rY);
    setShine({
      opacity: 0.35,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setShine({ opacity: 0, x: 50, y: 50 });
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 3D Flip Container */}
      <div
        className="perspective-1000 cursor-pointer group my-2"
        onClick={handleFlip}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="relative transform-style-3d transition-transform duration-700 ease-out"
          animate={{
            rotateY: isFlipped ? 180 : rotateY,
            rotateX: isFlipped ? 0 : rotateX,
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 24,
          }}
        >
          {/* Holographic Reflection Layer */}
          <div
            className="absolute inset-0 rounded-[24px] pointer-events-none z-30 transition-opacity duration-300"
            style={{
              opacity: shine.opacity,
              background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 65%)`,
            }}
          />

          {/* FRONT SIDE */}
          <div className="backface-hidden">
            <CardFront data={data} />
          </div>

          {/* BACK SIDE */}
          <div className="absolute inset-0 backface-hidden rotate-y-180">
            <CardBack data={data} />
          </div>
        </motion.div>
      </div>

      {/* Control Instruction & Flip Toggle Button */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleFlip}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1A4E26] to-[#2B6E3A] text-white text-xs font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
          <span>Voltear Tarjeta ({isFlipped ? 'Ver Frente' : 'Ver Reverso'})</span>
        </button>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Mueve el cursor para efecto 3D</span>
        </span>
      </div>
    </div>
  );
};
