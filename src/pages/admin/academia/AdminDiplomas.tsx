import { useState, useEffect } from 'react';
import {
  Award, Search, Download, Ban, FileText, CheckCircle, XCircle,
  Plus, Edit2, Trash2, X, Save, Eye, GraduationCap, User
} from 'lucide-react';
import { supabase, callEdgeFunction } from '../../../lib/supabase';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import type { AcademyDiplomaIssuance } from '../../../lib/academy-types';

type Tab = 'issued' | 'templates' | 'emit';

interface DiplomaType {
  id: string;
  name: string;
  internal_code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const defaultTemplate = {
  version: 1,
  page_size: 'A4',
  orientation: 'landscape',
  title_text: '{{diploma_type_name}}',
  subtitle_text: 'ACADEMIA SUMAK',
  body_text: 'Se otorga el presente diploma a {{participant_name}} por haber completado satisfactoriamente el programa {{course_name}}.',
  footer_text: 'SUMAK VIDA ECUADOR',
  is_active: true,
};

interface Course {
  id: string;
  title: string;
}

interface Student {
  id: string;
  nombre_completo: string;
  email: string;
}

const defaultType: Partial<DiplomaType> = {
  name: '',
  internal_code: '',
  description: '',
  is_active: true,
};

export default function AdminDiplomas() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('issued');

  // --- Diplomas emitidos ---
  const [diplomas, setDiplomas] = useState<AcademyDiplomaIssuance[]>([]);
  const [loadingDiplomas, setLoadingDiplomas] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- Plantillas ---
  const [types, setTypes] = useState<DiplomaType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [editingType, setEditingType] = useState<Partial<DiplomaType> | null>(null);
  const [savingType, setSavingType] = useState(false);

  // --- Emitir diploma ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [emitForm, setEmitForm] = useState({
    student_id: '',
    course_id: '',
    diploma_type_id: '',
    participant_name: '',
    program_name: '',
  });
  const [emitting, setEmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => { loadDiplomas(); }, []);

  useEffect(() => {
    if (tab === 'templates') loadTypes();
    if (tab === 'emit') loadEmitData();
  }, [tab]);

  // ── Diplomas emitidos ──────────────────────────────────────────────────────
  async function loadDiplomas() {
    try {
      setLoadingDiplomas(true);
      const data = await academyAPI.getAllDiplomas();
      setDiplomas(data as AcademyDiplomaIssuance[]);
    } catch {
      toast.error('Error al cargar los diplomas');
    } finally {
      setLoadingDiplomas(false);
    }
  }

  async function handleDownload(issuanceId: string) {
    try {
      setProcessingId(issuanceId);
      const res = await callEdgeFunction<{ ok: boolean; signedUrl: string }>('academy-sign-document-url', {
        issuance_id: issuanceId,
      });
      if (res.signedUrl) window.open(res.signedUrl, '_blank');
    } catch (err: any) {
      console.error('Error downloading diploma:', err);
      toast.error(err?.message || 'Error al descargar el diploma');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRevoke(issuanceId: string) {
    if (!window.confirm('¿Revocar este diploma? El código de verificación quedará inválido.')) return;
    try {
      setProcessingId(issuanceId);
      await callEdgeFunction('academy-revoke-diploma', {
        issuance_id: issuanceId,
        reason: 'Revocado por administrador',
      });
      toast.success('Diploma revocado');
      await loadDiplomas();
    } catch {
      toast.error('Error al revocar el diploma');
    } finally {
      setProcessingId(null);
    }
  }

  const filteredDiplomas = diplomas.filter(d =>
    (d.participant_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.verification_code ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.diploma_number ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Plantillas ─────────────────────────────────────────────────────────────
  async function loadTypes() {
    setLoadingTypes(true);
    const { data, error } = await supabase
      .from('academy_diploma_types')
      .select('*')
      .order('name');
    if (error) {
      toast.error('Error al cargar plantillas');
    } else {
      const diplomaTypes = data as DiplomaType[];
      setTypes(diplomaTypes);

      // The type form and the PDF template are separate records. Repair older
      // types created before template generation was wired into the admin UI.
      await Promise.all(diplomaTypes.map(async (type) => {
        const { data: template } = await supabase
          .from('academy_diploma_templates')
          .select('id')
          .eq('diploma_type_id', type.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!template) {
          await supabase.from('academy_diploma_templates').insert({
            diploma_type_id: type.id,
            ...defaultTemplate,
          });
        }
      }));
    }
    setLoadingTypes(false);
  }

  async function saveType() {
    if (!editingType?.name || !editingType?.internal_code) {
      toast.error('Nombre y código interno son requeridos');
      return;
    }
    setSavingType(true);
    try {
      if (editingType.id) {
        const { error } = await supabase
          .from('academy_diploma_types')
          .update({
            name: editingType.name,
            internal_code: editingType.internal_code,
            description: editingType.description,
            is_active: editingType.is_active,
          })
          .eq('id', editingType.id);
        if (error) throw error;
        toast.success('Plantilla actualizada');
      } else {
        const { data: createdType, error } = await supabase
          .from('academy_diploma_types')
          .insert({
            name: editingType.name,
            internal_code: editingType.internal_code,
            description: editingType.description,
            is_active: editingType.is_active ?? true,
          })
          .select('id')
          .single();
        if (error) throw error;

        const { error: templateError } = await supabase
          .from('academy_diploma_templates')
          .insert({
            diploma_type_id: createdType.id,
            ...defaultTemplate,
          });
        if (templateError) throw templateError;
        toast.success('Plantilla creada');
      }
      setEditingType(null);
      await loadTypes();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar plantilla');
    } finally {
      setSavingType(false);
    }
  }

  async function deleteType(id: string) {
    if (!window.confirm('¿Eliminar esta plantilla de diploma?')) return;
    const { error } = await supabase.from('academy_diploma_types').delete().eq('id', id);
    if (error) toast.error('Error al eliminar. Puede que haya diplomas asociados.');
    else { toast.success('Plantilla eliminada'); await loadTypes(); }
  }

  // ── Emitir diploma ─────────────────────────────────────────────────────────
  async function loadEmitData() {
    const [coursesRes, studentsRes] = await Promise.all([
      supabase.from('academy_courses').select('id, title').order('title'),
      supabase.from('profiles').select('id, nombre_completo, email').order('nombre_completo'),
    ]);
    if (coursesRes.data) setCourses(coursesRes.data as Course[]);
    if (studentsRes.data) setStudents(studentsRes.data as Student[]);
    if (types.length === 0) await loadTypes();
  }

  function handleStudentSelect(id: string) {
    const student = students.find(s => s.id === id);
    setEmitForm(f => ({
      ...f,
      student_id: id,
      participant_name: student?.nombre_completo ?? '',
    }));
  }

  function handleCourseSelect(id: string) {
    const course = courses.find(c => c.id === id);
    setEmitForm(f => ({
      ...f,
      course_id: id,
      program_name: course?.title ?? '',
    }));
  }

  async function handleEmit() {
    if (!emitForm.student_id || !emitForm.diploma_type_id || !emitForm.participant_name || !emitForm.program_name) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    setEmitting(true);
    try {
      const res = await callEdgeFunction<{ ok: boolean; diploma_number: string }>('academy-issue-diploma', {
        user_id: emitForm.student_id,
        diploma_type_id: emitForm.diploma_type_id,
        course_id: emitForm.course_id || null,
        participant_name: emitForm.participant_name,
        program_name: emitForm.program_name,
      });
      toast.success(`✅ Diploma emitido: #${res.diploma_number}`);
      setEmitForm({ student_id: '', course_id: '', diploma_type_id: '', participant_name: '', program_name: '' });
      setStudentSearch('');
    } catch (err: any) {
      toast.error(err.message || 'Error al emitir el diploma');
    } finally {
      setEmitting(false);
    }
  }

  const filteredStudents = students.filter(s =>
    (s.nombre_completo ?? '').toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-black text-[#111111]">Diplomas y Certificados</h1>
        <p className="text-[#6B7280]">Gestión de credenciales: plantillas, emisión y auditoría.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: 'issued', label: 'Emitidos', icon: <Award size={16} /> },
          { id: 'templates', label: 'Plantillas', icon: <FileText size={16} /> },
          { id: 'emit', label: 'Emitir Diploma', icon: <Plus size={16} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-[#1A4E26] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Emitidos ── */}
      {tab === 'issued' && (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#C8D8CB] bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre, código o número..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#1A4E26] outline-none"
              />
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-[#6B7280]">
              <span className="flex items-center gap-1"><CheckCircle size={14} className="text-[#1A4E26]" /> Válidos: {diplomas.filter(d => d.status === 'valid' || d.status === 'issued').length}</span>
              <span className="flex items-center gap-1"><XCircle size={14} className="text-red-500" /> Revocados: {diplomas.filter(d => d.status === 'revoked').length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingDiplomas ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredDiplomas.length === 0 ? (
              <div className="text-center py-20">
                <Award className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-slate-500">No se encontraron diplomas.</p>
                <button
                  onClick={() => setTab('emit')}
                  className="mt-4 inline-flex items-center gap-2 bg-[#1A4E26] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#163F1E] transition"
                >
                  <Plus size={16} /> Emitir primer diploma
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#C8D8CB] bg-slate-50">
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Estudiante</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Programa</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Emisión / Código</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDiplomas.map(dip => (
                    <tr key={dip.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#111111]">{dip.participant_name}</p>
                        <p className="text-xs text-[#6B7280]">#{dip.diploma_number}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#111111] text-sm line-clamp-2">{dip.program_name}</p>
                        <p className="text-xs text-[#D4AF37] font-bold mt-0.5">{dip.diploma_type?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#111111]">
                          {new Date(dip.issued_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded mt-1 inline-block">
                          {dip.verification_code}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {dip.status === 'valid' || dip.status === 'issued' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/20">
                            <CheckCircle size={12} /> {dip.status === 'issued' ? 'Emitido' : 'Válido'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle size={12} /> Revocado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDownload(dip.id)}
                            disabled={processingId === dip.id || ['revoked', 'superseded', 'invalidated'].includes(dip.status)}
                            className="p-2 text-[#6B7280] hover:text-[#1A4E26] hover:bg-[#EBF4ED] rounded-lg transition-colors disabled:opacity-50"
                            title="Descargar PDF"
                          >
                            <Download size={18} />
                          </button>
                          {(dip.status === 'valid' || dip.status === 'issued') && (
                            <button
                              onClick={() => handleRevoke(dip.id)}
                              disabled={processingId === dip.id}
                              className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Revocar"
                            >
                              <Ban size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Plantillas ── */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Tipos y diseños PDF generados por el sistema.</p>
            <button
              onClick={() => setEditingType({ ...defaultType })}
              className="flex items-center gap-2 bg-[#1A4E26] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#163F1E] transition"
            >
              <Plus size={16} /> Nuevo tipo y diseño
            </button>
          </div>

          {loadingTypes ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : types.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center shadow-sm">
              <FileText className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500 mb-4">No hay plantillas. Crea la primera.</p>
              <button
                onClick={() => setEditingType({ ...defaultType })}
                className="bg-[#1A4E26] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#163F1E] transition"
              >
                <Plus size={16} className="inline mr-1" /> Crear Plantilla
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {types.map(type => (
                <div key={type.id} className="bg-white border border-[#C8D8CB] rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                  {/* Preview Card */}
                  <div className="bg-gradient-to-br from-[#1A4E26] to-[#163F1E] rounded-xl p-4 text-white text-center">
                    <Award size={28} className="mx-auto mb-2 text-[#D4AF37]" />
                    <p className="font-black text-sm uppercase tracking-wider">{type.name}</p>
                    <p className="text-xs text-white/60 mt-1 font-mono">{type.internal_code}</p>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-sm">{type.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${type.is_active ? 'bg-[#EBF4ED] text-[#1A4E26]' : 'bg-gray-100 text-gray-500'}`}>
                        {type.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {type.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{type.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setEditingType(type)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-semibold text-[#1A4E26] bg-[#EBF4ED] hover:bg-[#1A4E26]/20 rounded-lg transition"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button
                      onClick={() => deleteType(type.id)}
                      className="flex items-center justify-center p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Emitir Diploma ── */}
      {tab === 'emit' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-[#EBF4ED] rounded-xl flex items-center justify-center">
                <GraduationCap size={20} className="text-[#1A4E26]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Emitir Diploma Manual</h2>
                <p className="text-sm text-gray-500">Genera un diploma para un estudiante específico.</p>
              </div>
            </div>

            {/* Estudiante */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <User size={14} className="inline mr-1" /> Estudiante *
              </label>
              <input
                type="text"
                placeholder="Buscar estudiante por nombre o email..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none mb-2"
              />
              {studentSearch && (
                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                  {filteredStudents.slice(0, 10).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { handleStudentSelect(s.id); setStudentSearch(s.nombre_completo); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 transition ${emitForm.student_id === s.id ? 'bg-[#EBF4ED] text-[#1A4E26] font-semibold' : ''}`}
                    >
                      <span className="font-medium">{s.nombre_completo}</span>
                      <span className="text-xs text-gray-400 ml-2">{s.email}</span>
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>
                  )}
                </div>
              )}
              {emitForm.student_id && (
                <p className="text-xs text-[#1A4E26] font-semibold mt-1">
                  ✓ Seleccionado: {students.find(s => s.id === emitForm.student_id)?.nombre_completo}
                </p>
              )}
            </div>

            {/* Nombre del participante */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre en el Diploma *</label>
              <input
                type="text"
                value={emitForm.participant_name}
                onChange={e => setEmitForm(f => ({ ...f, participant_name: e.target.value }))}
                placeholder="Nombre completo tal como aparecerá en el diploma"
                className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none"
              />
            </div>

            {/* Curso (opcional) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Curso (opcional)</label>
              <select
                value={emitForm.course_id}
                onChange={e => handleCourseSelect(e.target.value)}
                className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none"
              >
                <option value="">-- Sin curso específico --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            {/* Nombre del programa */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Programa *</label>
              <input
                type="text"
                value={emitForm.program_name}
                onChange={e => setEmitForm(f => ({ ...f, program_name: e.target.value }))}
                placeholder="Ej: Liderazgo Transformacional, Salud Ancestral..."
                className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none"
              />
            </div>

            {/* Tipo de diploma */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Diploma *</label>
              {types.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  No hay plantillas. <button onClick={() => setTab('templates')} className="font-semibold underline">Crea una primero</button>.
                </div>
              ) : (
                <select
                  value={emitForm.diploma_type_id}
                  onChange={e => setEmitForm(f => ({ ...f, diploma_type_id: e.target.value }))}
                  className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none"
                >
                  <option value="">-- Selecciona tipo --</option>
                  {types.filter(t => t.is_active).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.internal_code})</option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleEmit}
              disabled={emitting || !emitForm.student_id || !emitForm.diploma_type_id || !emitForm.participant_name || !emitForm.program_name}
              className="w-full flex items-center justify-center gap-2 bg-[#1A4E26] text-white py-3 rounded-xl font-bold hover:bg-[#163F1E] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Award size={18} /> Emitir Diploma</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Plantilla ── */}
      {editingType !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingType.id ? 'Editar Plantilla' : 'Nueva Plantilla de Diploma'}
              </h2>
              <button onClick={() => setEditingType(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Preview */}
              <div className="bg-gradient-to-br from-[#1A4E26] to-[#163F1E] rounded-xl p-6 text-white text-center mb-2">
                <Award size={36} className="mx-auto mb-2 text-[#D4AF37]" />
                <p className="font-black text-lg uppercase tracking-wider">{editingType.name || 'Nombre del Diploma'}</p>
                <p className="text-white/60 text-xs mt-1">ACADEMIA SUMAK · Líder que Cambia Vidas</p>
                <p className="text-white/40 text-xs font-mono mt-1">{editingType.internal_code || 'CÓDIGO'}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Diploma *</label>
                <input
                  type="text"
                  value={editingType.name || ''}
                  onChange={e => setEditingType(t => ({ ...t!, name: e.target.value }))}
                  placeholder="Ej: Certificado de Participación, Diploma de Honor..."
                  className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Código Interno *</label>
                <input
                  type="text"
                  value={editingType.internal_code || ''}
                  onChange={e => setEditingType(t => ({ ...t!, internal_code: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
                  placeholder="Ej: CERT_PART, DIPLOMA_HONOR..."
                  className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[#1A4E26] outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Solo mayúsculas, números y guiones bajos.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={editingType.description || ''}
                  onChange={e => setEditingType(t => ({ ...t!, description: e.target.value }))}
                  rows={3}
                  placeholder="Descripción interna para identificar este tipo de diploma..."
                  className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingType.is_active ?? true}
                  onChange={e => setEditingType(t => ({ ...t!, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-[#1A4E26] rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Plantilla activa (disponible para emitir)
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setEditingType(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveType}
                disabled={savingType}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1A4E26] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#163F1E] transition disabled:opacity-50"
              >
                {savingType ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
