import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Star, Clock, BookOpen } from 'lucide-react';
import { academyAPI } from '../../lib/academy';
import type { AcademyCourse, AcademyCategory } from '../../lib/academy-types';

export default function CatalogoCursos() {
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await academyAPI.getCourses(true);
        setCourses(data);
        // Extract unique categories
        const cats = new Map();
        data.forEach(c => {
          if (c.category) {
            cats.set(c.category.id, c.category);
          }
        });
        setCategories(Array.from(cats.values()));
      } catch (err) {
        console.error("Error loading courses:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || c.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-[#F4F7F5] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#1A4E26] py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-heading font-black text-white mb-4">
            Catálogo de Cursos
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Descubre programas diseñados para potenciar tus habilidades y hacer crecer tu negocio.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} />
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#F4F7F5] rounded-xl border-none focus:ring-2 focus:ring-[#1A4E26] outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-[#1A4E26] text-white' 
                  : 'bg-[#F4F7F5] text-[#6B7280] hover:bg-[#EBF4ED] hover:text-[#1A4E26]'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id 
                    ? 'bg-[#1A4E26] text-white' 
                    : 'bg-[#F4F7F5] text-[#6B7280] hover:bg-[#EBF4ED] hover:text-[#1A4E26]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#C8D8CB] border-dashed">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-[#111111] mb-2">No se encontraron cursos</h3>
            <p className="text-[#6B7280]">Intenta con otros términos de búsqueda o categorías.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map(course => (
              <Link 
                to={`/academia/cursos/${course.slug}`} 
                key={course.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#C8D8CB] hover:border-[#1A4E26] shadow-sm hover:shadow-xl transition-all group flex flex-col"
              >
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  {course.cover_image_url ? (
                    <img 
                      src={academyAPI.getPublicImageUrl(course.cover_image_url)} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#1A4E26]/20">
                      <BookOpen size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                    {course.category && (
                      <span className="px-2.5 py-1 text-[10px] font-bold text-white bg-white/20 backdrop-blur-md rounded-md uppercase tracking-wider">
                        {course.category.name}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-sm text-[#6B7280] mb-3">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{course.estimated_duration_minutes || 0} min</span>
                    </div>
                    {course.level && (
                      <div className="flex items-center gap-1 capitalize">
                        <span>• Nivel {course.level}</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#111111] mb-2 group-hover:text-[#1A4E26] transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  
                  <p className="text-[#6B7280] text-sm mb-6 line-clamp-2 flex-1">
                    {course.short_description || course.description}
                  </p>
                  
                  <div className="pt-4 border-t border-slate-100 mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#EBF4ED] flex items-center justify-center text-[#1A4E26] font-bold text-xs uppercase">
                        {course.instructor?.nombre_completo?.charAt(0) || 'S'}
                      </div>
                      <span className="text-sm font-medium text-[#111111] truncate max-w-[120px]">
                        {course.instructor?.nombre_completo || 'Staff SUMAK'}
                      </span>
                    </div>
                    
                    <span className="text-[#1A4E26] font-bold text-sm bg-[#EBF4ED] px-3 py-1.5 rounded-lg">
                      Ver Detalles
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
