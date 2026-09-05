import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, GripVertical, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';

export default function AdminProgramBuilder() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [program, setProgram] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'roadmap' | 'prerequisites' | 'completion'>('roadmap');

  const [courseToAdd, setCourseToAdd] = useState('');

  async function loadData() {
    if (!programId) return;
    try {
      const [progData, allCourses] = await Promise.all([
        academyAPI.getAdminProgramDetails(programId),
        academyAPI.getAdminCourses()
      ]);
      setProgram(progData);
      setCourses(allCourses);
    } catch {
      toast.error('Error al cargar datos del programa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [programId]);

  async function updateProgram(updates: any) {
    try {
      await academyAPI.saveAdminProgram(program.id, { ...program, ...updates });
      setProgram({ ...program, ...updates });
      toast.success('Programa actualizado');
    } catch {
      toast.error('No se pudo actualizar');
    }
  }

  async function addCourse() {
    if (!courseToAdd) return;
    try {
      await academyAPI.addCourseToProgram({
        program_id: program.id,
        course_id: courseToAdd,
        sort_order: program.courses.length,
        is_required: true
      });
      setCourseToAdd('');
      toast.success('Curso agregado al Roadmap');
      void loadData();
    } catch {
      toast.error('Error al agregar el curso');
    }
  }

  async function removeCourse(linkId: string) {
    if (!confirm('¿Seguro que deseas retirar este curso del programa?')) return;
    try {
      await academyAPI.removeCourseFromProgram(linkId);
      toast.success('Curso retirado');
      void loadData();
    } catch {
      toast.error('Error al retirar curso');
    }
  }

  async function toggleRequired(linkId: string, currentVal: boolean) {
    try {
      await academyAPI.updateProgramCourse(linkId, { is_required: !currentVal });
      void loadData();
    } catch {
      toast.error('Error al actualizar');
    }
  }

  async function setPrerequisites(programCourseId: string, prereqIds: string[]) {
    try {
      await academyAPI.setProgramCoursePrerequisites(programCourseId, prereqIds);
      toast.success('Prerrequisitos actualizados');
      void loadData();
    } catch {
      toast.error('Error al actualizar prerrequisitos');
    }
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="animate-spin inline mr-3" />Cargando builder...</div>;
  if (!program) return <div className="py-24 text-center">Programa no encontrado</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/admin/academia/programas')} className="flex items-center gap-2 text-sm font-bold text-[#6B7280] hover:text-[#111111]">
        <ArrowLeft size={16} /> Volver a programas
      </button>

      <div>
        <h1 className="text-3xl font-black text-[#111111]">{program.title}</h1>
        <p className="text-[#6B7280]">Configuración avanzada del programa y roadmap de cursos.</p>
      </div>

      <div className="flex items-center gap-4 border-b border-[#E5ECE6] overflow-x-auto">
        {[
          { id: 'general', label: 'Información General' },
          { id: 'roadmap', label: 'Cursos & Roadmap' },
          { id: 'prerequisites', label: 'Candados (Prerrequisitos)' },
          { id: 'completion', label: 'Finalización' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-[#1A4E26] text-[#1A4E26]' : 'border-transparent text-[#6B7280] hover:text-[#111111]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-[24px] border border-[#E5ECE6] p-6 space-y-4">
          <label className="block text-sm font-semibold">Título
            <input value={program.title} onChange={e => setProgram({...program, title: e.target.value})} onBlur={() => updateProgram({ title: program.title })} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2" />
          </label>
          <label className="block text-sm font-semibold">Descripción
            <textarea value={program.description || ''} onChange={e => setProgram({...program, description: e.target.value})} onBlur={() => updateProgram({ description: program.description })} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2" rows={4} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">Estado
              <select value={program.status} onChange={e => updateProgram({ status: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">Modo de Acceso
              <select value={program.access_mode} onChange={e => updateProgram({ access_mode: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="public">Público</option>
                <option value="free_registered">Gratis Registrados</option>
                <option value="sumak_exclusive">Exclusivo Sumak</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-[#E5ECE6] p-6 flex items-end gap-4">
            <label className="flex-1 block text-sm font-semibold">Añadir curso al Roadmap
              <select value={courseToAdd} onChange={e => setCourseToAdd(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="">Seleccionar curso...</option>
                {courses.filter(c => !program.courses.some((pc: any) => pc.course_id === c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
            <button onClick={addCourse} className="px-6 py-2 bg-[#1A4E26] text-white font-bold rounded-xl flex items-center gap-2 h-10">
              <Plus size={16} /> Añadir
            </button>
          </div>

          <div className="bg-white rounded-[24px] border border-[#E5ECE6] divide-y divide-[#E5ECE6]">
            {program.courses?.sort((a: any, b: any) => a.sort_order - b.sort_order).map((pc: any, index: number) => (
              <div key={pc.id} className="p-4 flex items-center gap-4 hover:bg-[#F9FAFB] transition-colors">
                <GripVertical className="text-slate-300 cursor-move" />
                <div className="flex-1">
                  <h3 className="font-bold text-[#111111]">{pc.course?.title}</h3>
                  <p className="text-xs text-[#6B7280]">Orden: {index + 1} • {pc.course?.slug}</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer mr-6">
                  <input type="checkbox" checked={pc.is_required} onChange={() => toggleRequired(pc.id, pc.is_required)} className="w-4 h-4 text-[#1A4E26] rounded" />
                  Obligatorio
                </label>
                <button onClick={() => removeCourse(pc.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {(!program.courses || program.courses.length === 0) && (
              <div className="p-12 text-center text-[#6B7280]">No hay cursos en este programa.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prerequisites' && (
        <div className="bg-white rounded-[24px] border border-[#E5ECE6] divide-y divide-[#E5ECE6]">
          <div className="p-6 bg-slate-50 rounded-t-[24px]">
            <h2 className="font-bold text-[#111111] flex items-center gap-2"><ShieldAlert size={18} className="text-[#B8860B]" /> Configurar candados</h2>
            <p className="text-sm text-[#6B7280] mt-1">Selecciona qué cursos deben estar aprobados antes de que el estudiante pueda acceder a otros.</p>
          </div>
          
          {program.courses?.sort((a: any, b: any) => a.sort_order - b.sort_order).map((pc: any) => {
            const availablePrereqs = program.courses.filter((other: any) => other.id !== pc.id && other.sort_order < pc.sort_order);
            const currentPrereqIds = pc.prerequisites?.map((p: any) => p.prereq_program_course_id) || [];
            
            return (
              <div key={pc.id} className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-[#111111]">{pc.course?.title}</h3>
                  <p className="text-xs text-[#6B7280]">Curso en Roadmap</p>
                </div>
                <div>
                  {availablePrereqs.length === 0 ? (
                    <span className="text-sm text-slate-400 italic">Primer curso de la ruta. Sin prerrequisitos disponibles.</span>
                  ) : (
                    <div className="space-y-2">
                      {availablePrereqs.map((prereq: any) => {
                        const isSelected = currentPrereqIds.includes(prereq.id);
                        return (
                          <label key={prereq.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-[#1A4E26] transition-colors">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...currentPrereqIds, prereq.id] 
                                  : currentPrereqIds.filter((id: string) => id !== prereq.id);
                                setPrerequisites(pc.id, newIds);
                              }}
                              className="w-4 h-4 text-[#1A4E26] rounded border-slate-300"
                            />
                            <span className="text-sm font-medium">{prereq.course?.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'completion' && (
        <div className="bg-white rounded-[24px] border border-[#E5ECE6] p-6 space-y-6">
          <div className="space-y-4 max-w-xl">
            <h2 className="font-bold text-lg">Reglas de Finalización</h2>
            
            <label className="block text-sm font-semibold">Porcentaje de completitud requerido (%)
              <p className="text-xs text-[#6B7280] font-normal mb-2">Porcentaje de los cursos OBLIGATORIOS que deben aprobarse.</p>
              <input 
                type="number" min="0" max="100" 
                value={program.completion_percentage_required} 
                onChange={e => updateProgram({ completion_percentage_required: Number(e.target.value) })}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2" 
              />
            </label>

          </div>
        </div>
      )}

    </div>
  );
}
