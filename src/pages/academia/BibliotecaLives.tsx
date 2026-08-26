import { PlayCircle, Clock, Calendar } from 'lucide-react';
import { useSEO } from '../../lib/seo';

export default function BibliotecaLives() {
  useSEO({ title: 'Biblioteca de Lives — Academia Sumak' });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Biblioteca de Lives</h1>
        <p className="text-gray-500 mt-1">Grabaciones de las sesiones en vivo y masterclasses.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center shadow-sm">
        <div className="w-20 h-20 bg-[#EBF4ED] rounded-full flex items-center justify-center mx-auto mb-6">
          <PlayCircle size={40} className="text-[#1A4E26]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Próximamente</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          Estamos preparando este espacio donde podrás acceder a todas las grabaciones de nuestras masterclasses exclusivas para que las veas a tu propio ritmo.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
            <Clock size={18} className="text-[#D4AF37]" />
            Acceso 24/7
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
            <Calendar size={18} className="text-[#D4AF37]" />
            Sesiones Semanales
          </div>
        </div>
      </div>
    </div>
  );
}
