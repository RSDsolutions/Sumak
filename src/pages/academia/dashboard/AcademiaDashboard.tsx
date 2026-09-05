import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlayCircle, 
  Award, 
  BookOpen, 
  Clock, 
  ChevronRight,
  TrendingUp,
  TrendingUp,
  FileText,
  Layers
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { displayName } from '../../../lib/profile';
import { academyAPI } from '../../../lib/academy';
import { academyProgramHelper } from '../../../lib/academy';
import type { AcademyEnrollment, AcademyDiplomaIssuance } from '../../../lib/academy-types';

export default function AcademiaDashboard() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [diplomas, setDiplomas] = useState<AcademyDiplomaIssuance[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [enrs, dips, certs, progs] = await Promise.all([
          academyAPI.getMyEnrollments(),
          academyAPI.getMyDiplomas(),
          academyAPI.getMyCertificates(),
          academyProgramHelper.getMyEnrolledPrograms()
        ]);
        setEnrollments(enrs as AcademyEnrollment[]);
        setDiplomas(dips as AcademyDiplomaIssuance[]);
        setCertificates(certs || []);
        setPrograms(progs || []);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  
  // Find the most recently accessed course
  const lastAccessed = enrollments.length > 0 
    ? enrollments.sort((a, b) => 
        new Date(b.last_accessed_at || b.enrolled_at).getTime() - 
        new Date(a.last_accessed_at || a.enrolled_at).getTime()
      )[0] 
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#111111] font-heading">
          Hola, {displayName(profile)}
        </h1>
        <p className="text-[#6B7280] mt-1 text-lg">
          Bienvenido a tu plataforma de aprendizaje.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#C8D8CB] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EBF4ED] flex items-center justify-center text-[#1A4E26]">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#6B7280]">Cursos Activos</p>
            <p className="text-2xl font-black text-[#111111]">{activeEnrollments.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-[#C8D8CB] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#6B7280]">Cursos Completados</p>
            <p className="text-2xl font-black text-[#111111]">{completedEnrollments.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-[#C8D8CB] shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#6B7280]">Certificados Obtenidos</p>
            <p className="text-2xl font-black text-[#111111]">{certificates.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#C8D8CB] shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#6B7280]">Diplomas Obtenidos</p>
            <p className="text-2xl font-black text-[#111111]">{diplomas.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Continuar Aprendiendo & Cursos) */}
        <div className="lg:col-span-2 space-y-8">
          
          {lastAccessed && lastAccessed.status !== 'completed' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#111111] flex items-center gap-2">
                  <PlayCircle className="text-[#1A4E26]" /> Continuar Aprendiendo
                </h2>
              </div>
              
              <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="sm:w-1/3 aspect-video bg-slate-100 rounded-xl overflow-hidden relative">
                    {(lastAccessed as any).course?.cover_image_url ? (
                      <img 
                        src={academyAPI.getPublicImageUrl((lastAccessed as any).course.cover_image_url)} 
                        alt="Course cover" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#EBF4ED] text-[#1A4E26]">
                        <BookOpen size={32} />
                      </div>
                    )}
                  </div>
                  <div className="sm:w-2/3 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-[#111111] mb-1">
                      {(lastAccessed as any).course?.title || 'Curso'}
                    </h3>
                    <p className="text-sm text-[#6B7280] mb-4">
                      Última sesión: {new Date(lastAccessed.last_accessed_at || lastAccessed.enrolled_at).toLocaleDateString()}
                    </p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-[#1A4E26]">Progreso</span>
                        <span className="font-bold">{lastAccessed.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#1A4E26] h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${lastAccessed.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Link 
                        to={`/academia/aprender/${(lastAccessed as any).course?.slug}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-colors"
                      >
                        Reanudar clase <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {programs.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#111111]">Mis Programas Activos</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {programs.map((enr: any) => (
                  <Link 
                    key={enr.id} 
                    to={`/academia/programas/${enr.program?.slug}`}
                    className="bg-[#1A4E26] rounded-[24px] p-6 hover:-translate-y-1 hover:shadow-xl transition-all group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#133A1C] to-transparent opacity-50"></div>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4">
                        <Layers size={24} />
                      </div>
                      <h3 className="font-black text-white text-lg mb-2">{enr.program?.title}</h3>
                      <p className="text-sm text-[#D7E9DF] line-clamp-2 mb-6 flex-1">
                        {enr.program?.description}
                      </p>
                      <div className="flex items-center gap-2 text-white font-bold text-sm">
                        Continuar ruta <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#111111]">Mis Cursos Activos</h2>
              <Link to="/academia/dashboard/cursos" className="text-sm font-medium text-[#1A4E26] hover:underline">
                Ver todos
              </Link>
            </div>
            
            {activeEnrollments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#C8D8CB] border-dashed p-8 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="text-slate-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">No tienes cursos activos</h3>
                <p className="text-[#6B7280] mb-6">Explora nuestro catálogo y comienza a aprender hoy.</p>
                <Link 
                  to="/academia/cursos"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold hover:bg-[#163F1E] transition-colors"
                >
                  Explorar Catálogo
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {activeEnrollments.slice(0,4).map((enr) => (
                  <Link 
                    key={enr.id} 
                    to={`/academia/aprender/${(enr as any).course?.slug}`}
                    className="bg-white rounded-xl border border-[#C8D8CB] p-4 hover:border-[#1A4E26] hover:shadow-md transition-all group"
                  >
                    <h3 className="font-bold text-[#111111] group-hover:text-[#1A4E26] transition-colors mb-2 line-clamp-1">
                      {(enr as any).course?.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-3">
                      <Clock size={14} />
                      <span>Est. {(enr as any).course?.estimated_duration_minutes || 0} min</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-[#1A4E26] h-1.5 rounded-full" 
                        style={{ width: `${enr.progress_percentage}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Diplomas & Actividad) */}
        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#111111]">Últimos Diplomas</h2>
              {diplomas.length > 0 && (
                <Link to="/academia/dashboard/diplomas" className="text-sm font-medium text-[#1A4E26] hover:underline">
                  Ver todos
                </Link>
              )}
            </div>

            {diplomas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#C8D8CB] p-6 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="text-slate-400" size={24} />
                </div>
                <p className="text-[#6B7280] text-sm">Aún no has obtenido diplomas. ¡Sigue aprendiendo para conseguir el tuyo!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {diplomas.slice(0, 3).map((dip) => (
                  <div key={dip.id} className="bg-white rounded-xl border border-[#C8D8CB] p-4 flex gap-3 items-center shadow-sm">
                    <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center text-[#D4AF37] flex-shrink-0">
                      <Award size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#111111] truncate" title={dip.diploma_type?.name}>
                        {dip.diploma_type?.name}
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">
                        {new Date(dip.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
