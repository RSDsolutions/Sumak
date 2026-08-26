import { BookOpen, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminCursos() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Cursos</h1>
          <p className="text-[#6B7280]">Gestión de contenido de la Academia SUMAK.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white font-bold rounded-xl hover:bg-[#163F1E] transition-colors">
          <Plus size={18} />
          Nuevo Curso
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#C8D8CB] p-6 shadow-sm">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A4E26] focus:border-[#1A4E26] outline-none"
          />
        </div>

        <div className="text-center py-12">
          <BookOpen className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Módulo en construcción. Próximamente podrás gestionar el catálogo completo aquí.</p>
        </div>
      </div>
    </div>
  );
}
