import { useEffect, useState } from 'react';
import { Layers, Loader2, Plus, ArrowRight } from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import Modal from '../../../components/Modal';
import { useNavigate } from 'react-router-dom';

interface Course { id: string; title: string }
interface DiplomaType { id: string; name: string; internal_code: string }
interface LinkItem { id: string; course_id: string; sort_order: number; is_required: boolean; course: Course | null }
interface Program { id: string; title: string; slug: string; description: string | null; status: string; access_mode: string; completion_percentage_required: number; diploma_type_id: string | null; courses: LinkItem[] }
type ProgramForm = { title: string; slug: string; description: string; status: string; access_mode: string; completion_percentage_required: string; diploma_type_id: string };

const emptyForm: ProgramForm = { title: '', slug: '', description: '', status: 'draft', access_mode: 'free_registered', completion_percentage_required: '100', diploma_type_id: '' };

function slugify(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export default function AdminProgramas() {
  const toast = useToast();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [diplomaTypes, setDiplomaTypes] = useState<DiplomaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ProgramForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [programData, diplomaData] = await Promise.all([
        academyAPI.getAdminPrograms(), academyAPI.getAdminDiplomaTypes(),
      ]);
      setPrograms(programData as Program[]);
      setDiplomaTypes(diplomaData as DiplomaType[]);
    } catch { toast.error('No se pudieron cargar los programas.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function openNewProgramModal() {
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  async function saveProgram(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await academyAPI.saveAdminProgram(null, {
        ...form,
        diploma_type_id: form.diploma_type_id || null,
        completion_percentage_required: Number(form.completion_percentage_required),
        sort_order: programs.length,
      });
      toast.success('Programa creado exitosamente.');
      setIsModalOpen(false);
      navigate(`/admin/academia/programas/${saved.id}/builder`);
    } catch { toast.error('No se pudo crear el programa.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Programas Academy</h1>
          <p className="text-[#6B7280]">Gestiona rutas formativas y certificaciones de múltiples cursos.</p>
        </div>
        <button type="button" onClick={openNewProgramModal} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A4E26] text-white font-bold transition-transform active:scale-95">
          <Plus size={18} /> Nuevo programa
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#6B7280] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p>Cargando programas...</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-12 text-center text-[#6B7280] shadow-sm">
          No hay programas creados aún.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <button 
              type="button" 
              key={program.id} 
              onClick={() => navigate(`/admin/academia/programas/${program.id}/builder`)} 
              className="text-left bg-white border border-[#E5ECE6] rounded-[24px] p-6 hover:shadow-xl hover:-translate-y-1 hover:border-[#7EE7B0] transition-all duration-300 group flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F2EA] text-[#1A4E26] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Layers size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-[#111111] line-clamp-2">{program.title}</h2>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full mt-2 inline-block ${program.status === 'published' ? 'bg-[#EAFBF1] text-[#169C46]' : 'bg-[#FFF9EA] text-[#B8860B]'}`}>
                    {program.status === 'published' ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#6B7280] flex-1 line-clamp-2 mb-6">
                {program.description || 'Sin descripción'}
              </p>
              <div className="flex items-center justify-between border-t border-[#E5ECE6] pt-4 mt-auto">
                <div className="text-xs text-[#6B7280] font-medium">
                  {program.courses?.length || 0} cursos
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-[#1A4E26]">
                  Configurar <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear nuevo programa" size="lg">
        <form onSubmit={saveProgram} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Título" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value, slug: current.slug || slugify(value) }))} required />
            <Field label="Slug (URL)" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: slugify(value) }))} required />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-[#111111]">Descripción</label>
            <textarea 
              value={form.description} 
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-none h-24"
              placeholder="Describe los objetivos del programa..."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Modo de Acceso" value={form.access_mode} onChange={(value) => setForm((current) => ({ ...current, access_mode: value }))} options={['public', 'free_registered', 'sumak_exclusive', 'assigned', 'hidden']} />
            <label className="block text-sm font-semibold text-[#111111]">
              Tipo de diploma al completar
              <select value={form.diploma_type_id} onChange={(event) => setForm((current) => ({ ...current, diploma_type_id: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">Ninguno</option>
                {diplomaTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name} ({type.internal_code})</option>
                ))}
              </select>
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-[#E5ECE6] mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#6B7280]">Cancelar</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-[#1A4E26] text-white font-bold text-sm shadow-md hover:bg-[#133A1C] transition-colors">
              {saving ? 'Creando...' : 'Crear y continuar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { 
  return (
    <label className="block text-sm font-semibold text-[#111111]">
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl" />
    </label>
  ); 
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { 
  return (
    <label className="block text-sm font-semibold text-[#111111]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  ); 
}
