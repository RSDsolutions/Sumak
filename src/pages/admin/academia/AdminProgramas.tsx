import { useEffect, useState } from 'react';
import { Layers, Loader2, Plus, Trash2 } from 'lucide-react';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import Modal from '../../../components/Modal';

interface Course { id: string; title: string }
interface DiplomaType { id: string; name: string; internal_code: string }
interface LinkItem { id: string; course_id: string; sort_order: number; is_required: boolean; course: Course | null }
interface Program { id: string; title: string; slug: string; description: string | null; status: string; access_mode: string; completion_percentage_required: number; diploma_type_id: string | null; courses: LinkItem[] }
type ProgramForm = { title: string; slug: string; description: string; status: string; access_mode: string; completion_percentage_required: string; diploma_type_id: string };

const emptyForm: ProgramForm = { title: '', slug: '', description: '', status: 'draft', access_mode: 'free_registered', completion_percentage_required: '100', diploma_type_id: '' };

function slugify(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export default function AdminProgramas() {
  const toast = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [diplomaTypes, setDiplomaTypes] = useState<DiplomaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Program | null>(null);
  const [form, setForm] = useState<ProgramForm>(emptyForm);
  const [courseId, setCourseId] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [programData, courseData, diplomaData] = await Promise.all([
        academyAPI.getAdminPrograms(), academyAPI.getAdminCourses(), academyAPI.getAdminDiplomaTypes(),
      ]);
      setPrograms(programData as Program[]);
      setCourses(courseData as Course[]);
      setDiplomaTypes(diplomaData as DiplomaType[]);
    } catch { toast.error('No se pudieron cargar los programas.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function openProgram(program: Program | null) {
    setSelected(program);
    setForm(program ? {
      title: program.title, slug: program.slug, description: program.description ?? '', status: program.status,
      access_mode: program.access_mode, completion_percentage_required: String(program.completion_percentage_required),
      diploma_type_id: program.diploma_type_id ?? '',
    } : emptyForm);
    setCourseId('');
  }

  async function saveProgram(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await academyAPI.saveAdminProgram(selected?.id ?? null, {
        ...form,
        diploma_type_id: form.diploma_type_id || null,
        completion_percentage_required: Number(form.completion_percentage_required),
        sort_order: selected?.courses?.length ?? programs.length,
      });
      const next = selected ? { ...selected, ...saved } : { ...saved, courses: [] } as Program;
      setPrograms((current) => selected ? current.map((item) => item.id === selected.id ? next : item) : [...current, next]);
      setSelected(next);
      toast.success('Programa guardado.');
    } catch { toast.error('No se pudo guardar el programa.'); }
    finally { setSaving(false); }
  }

  async function addCourse() {
    if (!selected || !courseId) return;
    try {
      const link = await academyAPI.addCourseToProgram({ program_id: selected.id, course_id: courseId, sort_order: selected.courses.length + 1, is_required: true });
      const next = { ...selected, courses: [...selected.courses, link as LinkItem] };
      setSelected(next);
      setPrograms((current) => current.map((item) => item.id === next.id ? next : item));
      setCourseId('');
      toast.success('Curso asociado.');
    } catch { toast.error('No se pudo asociar el curso.'); }
  }

  async function removeCourse(link: LinkItem) {
    if (!selected) return;
    try {
      await academyAPI.removeCourseFromProgram(link.id);
      const next = { ...selected, courses: selected.courses.filter((item) => item.id !== link.id) };
      setSelected(next);
      setPrograms((current) => current.map((item) => item.id === next.id ? next : item));
      toast.success('Curso retirado.');
    } catch { toast.error('No se pudo retirar el curso.'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black text-[#111111]">Programas Academy</h1><p className="text-[#6B7280]">Construye rutas formativas y define sus cursos.</p></div>
        <button type="button" onClick={() => openProgram(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A4E26] text-white font-bold"><Plus size={18} /> Nuevo programa</button>
      </div>
      {loading ? <div className="py-16 text-center text-[#6B7280]"><Loader2 className="animate-spin inline mr-2" size={20} /> Cargando...</div> : programs.length === 0 ? <div className="bg-white border border-[#C8D8CB] rounded-2xl p-12 text-center text-[#6B7280]">No hay programas creados.</div> : <div className="grid md:grid-cols-2 gap-4">{programs.map((program) => <button type="button" key={program.id} onClick={() => openProgram(program)} className="text-left bg-white border border-[#C8D8CB] rounded-2xl p-5 hover:shadow-md"><div className="flex items-center gap-3"><Layers className="text-[#1A4E26]" /><h2 className="font-bold flex-1">{program.title}</h2><span className="text-xs font-bold text-[#92680A]">{program.status}</span></div><p className="text-sm text-[#6B7280] mt-3 line-clamp-2">{program.description || 'Sin descripción'}</p><p className="text-xs text-[#6B7280] mt-4">{program.courses?.length || 0} cursos · {program.completion_percentage_required}% requerido</p></button>)}</div>}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || 'Nuevo programa'} size="lg">
        <form onSubmit={saveProgram} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3"><Field label="Título" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value, slug: current.slug || slugify(value) }))} required /><Field label="Slug" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: slugify(value) }))} required /></div>
          <Field label="Descripción" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          <div className="grid sm:grid-cols-2 gap-3"><Select label="Estado" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} options={['draft', 'published', 'archived']} /><Select label="Acceso" value={form.access_mode} onChange={(value) => setForm((current) => ({ ...current, access_mode: value }))} options={['public', 'free_registered', 'sumak_exclusive', 'assigned', 'hidden']} /></div>
          <div className="grid sm:grid-cols-2 gap-3"><Field label="Cumplimiento (%)" value={form.completion_percentage_required} onChange={(value) => setForm((current) => ({ ...current, completion_percentage_required: value }))} type="number" min="0" max="100" /><label className="block text-sm font-semibold text-[#111111]">Tipo de diploma<select value={form.diploma_type_id} onChange={(event) => setForm((current) => ({ ...current, diploma_type_id: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"><option value="">Sin diploma asociado</option>{diplomaTypes.map((type) => <option key={type.id} value={type.id}>{type.name} ({type.internal_code})</option>)}</select></label></div>
          {selected && <div className="border-t border-[#E5ECE6] pt-4"><h3 className="font-bold mb-3">Cursos del programa</h3><div className="flex gap-2 mb-3"><select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl"><option value="">Seleccionar curso</option>{courses.filter((course) => !selected.courses.some((item) => item.course_id === course.id)).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select><button type="button" onClick={() => void addCourse()} className="px-3 rounded-xl bg-[#E8F2EA] text-[#1A4E26]"><Plus size={17} /></button></div>{selected.courses.map((item) => <div key={item.id} className="flex items-center gap-2 text-sm py-2 border-b border-[#E5ECE6]"><span className="flex-1">{item.course?.title || 'Curso'}</span>{item.is_required && <span className="text-xs text-[#92680A]">Obligatorio</span>}<button type="button" onClick={() => void removeCourse(item)} aria-label="Retirar curso" className="text-red-500"><Trash2 size={15} /></button></div>)}</div>}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5ECE6]"><button type="button" onClick={() => setSelected(null)} className="px-4 py-2 text-sm font-bold text-[#6B7280]">Cerrar</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#1A4E26] text-white font-bold text-sm">{saving ? 'Guardando...' : 'Guardar programa'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', min, max, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string; required?: boolean }) { return <label className="block text-sm font-semibold text-[#111111]">{label}<input required={required} type={type} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="block text-sm font-semibold text-[#111111]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
