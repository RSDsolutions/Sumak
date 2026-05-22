import { Shield, Battery, Heart, Leaf, Zap, Brain, Flame, Activity, Star } from 'lucide-react';

interface BottleProps {
  category: string;
  className?: string;
}

export function ProductBottleSVG({ category, className = "" }: BottleProps) {
  // Simple mapping to give unique variations based on category
  const renderIcon = () => {
    switch (category) {
      case 'Energía': return <Zap className="text-[#1A1A1A] w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />;
      case 'Inmunidad': return <Shield className="text-[#1A1A1A] w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />;
      case 'Detox': return <Leaf className="text-[#1A1A1A] w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />;
      case 'Proteínas': return <Battery className="text-[#1A1A1A] w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />;
      case 'Quema de Grasa': return <Flame className="text-[#1A1A1A] w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />;
      case 'Bienestar': default: return <Heart className="text-[#1A1A1A] w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />;
    }
  };

  return (
    <div className={`relative flex items-center justify-center w-full h-full bg-[#1A1A1A] overflow-hidden ${className}`}>
      {/* Background hexagon pattern (subtle) */}
      <svg className="absolute inset-0 w-full h-full opacity-10" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
         <defs>
            <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
               <polygon points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2" fill="none" stroke="#00A86B" strokeWidth="1"/>
               <polygon points="49.8,22 62.3,29.2 62.3,43.7 49.8,50.9 37.3,43.7 37.3,29.2" fill="none" stroke="#00A86B" strokeWidth="1"/>
            </pattern>
         </defs>
         <rect x="0" y="0" width="100%" height="100%" fill="url(#hexagons)"/>
      </svg>
      
      {/* Bottle Silhouette */}
      <div className="relative w-[120px] h-[180px] drop-shadow-xl z-10 transition-transform duration-300 group-hover:scale-105">
        {/* Cap */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-8 bg-[#2A2A2A] rounded-t-lg border-b-2 border-[#151515]">
           {/* Cap ridges */}
           <div className="flex justify-between px-2 w-full h-full opacity-30">
              <div className="w-[1px] h-full bg-white"></div>
              <div className="w-[1px] h-full bg-white"></div>
              <div className="w-[1px] h-full bg-white"></div>
              <div className="w-[1px] h-full bg-white"></div>
           </div>
        </div>
        
        {/* Body */}
        <div className="absolute top-8 left-0 w-full h-[148px] bg-[#222222] rounded-t-xl rounded-b-2xl border border-[#333333] shadow-inner flex overflow-hidden">
           {/* Label Wrapper */}
           <div className="w-[90%] left-[5%] absolute top-4 bottom-4 bg-[#2A2A2A] border border-[#333333] rounded-md overflow-hidden">
               {/* Emerald Stripe */}
               <div className="absolute top-8 w-full h-12 bg-brand-emerald flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                     {renderIcon()}
                  </div>
               </div>
               
               {/* Label Details */}
               <div className="absolute bottom-4 left-0 w-full text-center">
                  <div className="w-10 h-1 bg-[#444] rounded-full mx-auto mb-2"></div>
                  <div className="w-16 h-1 bg-[#444] rounded-full mx-auto"></div>
               </div>
           </div>
           
           {/* Bottle Highlight */}
           <div className="absolute top-0 right-2 w-4 h-full bg-white opacity-[0.03] rounded-full blur-md"></div>
        </div>
      </div>
    </div>
  );
}
