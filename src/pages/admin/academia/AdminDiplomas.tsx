import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award, Search, Download, Ban, FileText, CheckCircle, XCircle,
  Plus, Edit2, Trash2, X, Save, Eye, GraduationCap, User, ShieldCheck,
  Copy, ExternalLink, LayoutTemplate, Clock, Image as ImageIcon,
  Loader2, Sparkles, BookOpen, RefreshCw
} from 'lucide-react';
import { supabase, callEdgeFunction, callEdgeFunctionMultipart, callPublicEdgeFunction } from '../../../lib/supabase';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import {
  STARTER_PRESETS,
  normalizeTemplateDesign,
  type PageOrientation,
  type PageSizeId,
} from '../../../lib/credentialTemplateTypes';
import {
  generateAndDownloadCredentialDocument,
  renderCredentialPreviewDataUrl,
  type CredentialDocumentInput,
} from '../../../lib/credentialDocumentGenerator';
import AdminTemplateBuilder from './AdminTemplateBuilder';

type Tab = 'issued' | 'pending' | 'templates' | 'emit' | 'register';

interface DiplomaTypeRecord {
  id: string;
  name: string;
  internal_code: string;
  description: string | null;
  credential_category?: 'certificate' | 'diploma';
  is_active: boolean;
  created_at: string;
  template?: {
    id: string;
    version: number;
    page_size: string;
    orientation: string;
    background_image_url?: string | null;
    signatory_name?: string | null;
    signatory_title?: string | null;
    layout_config?: any;
  } | null;
}

interface IssuanceRow {
  id: string;
  diploma_number: string;
  verification_code: string;
  verification_token: string;
  user_id: string;
  diploma_type_id: string;
  template_id: string;
  course_id: string | null;
  program_id?: string | null;
  participant_name: string;
  program_name: string;
  course_name?: string | null;
  credential_type?: 'certificate' | 'diploma' | null;
  status: string;
  issued_at: string;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  pdf_storage_path?: string | null;
  registration_source?: string | null;
  metadata?: Record<string, any>;
  diploma_type?: {
    id?: string;
    name: string;
    internal_code: string;
    credential_category?: 'certificate' | 'diploma';
  } | null;
  template?: any;
}

interface CourseItem {
  id: string;
  title: string;
  diploma_type_id?: string | null;
}

interface ProgramItem {
  id: string;
  title: string;
  diploma_type_id?: string | null;
}

interface StudentItem {
  id: string;
  nombre_completo: string;
  email: string;
}

function getIssuanceKind(d: IssuanceRow): 'certificado' | 'diploma' {
  if (d.credential_type === 'certificate') return 'certificado';
  if (d.credential_type === 'diploma') return 'diploma';
  if (
    d.diploma_type?.credential_category === 'certificate' ||
    String(d.diploma_type?.internal_code || '').toUpperCase().startsWith('CERT')
  ) {
    return 'certificado';
  }
  return 'diploma';
}

function getTypeCategory(t: DiplomaTypeRecord): 'certificate' | 'diploma' {
  if (t.credential_category === 'certificate' || t.credential_category === 'diploma') {
    return t.credential_category;
  }
  return String(t.internal_code || '').toUpperCase().startsWith('CERT') ||
    String(t.name || '').toLowerCase().includes('certificado')
    ? 'certificate'
    : 'diploma';
}

// ---------------------------------------------------------------------------
// Live Miniature Preview Component for Template Cards
// ---------------------------------------------------------------------------
function TemplateMiniPreview({ type }: { type: DiplomaTypeRecord }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const category = getTypeCategory(type);

  useEffect(() => {
    let active = true;
    const design = normalizeTemplateDesign(type.template, category);
    renderCredentialPreviewDataUrl(
      {
        type: category === 'certificate' ? 'certificado' : 'diploma',
        title: category === 'certificate' ? 'Curso Clínico de Fitoterapia SUMAK' : 'Programa de Especialización en Salud Renal',
        participantName: 'María Elena Zambrano',
        verificationCode: 'SUMAK-PREVIEW',
        diplomaNumber: category === 'certificate' ? 'SUMAK-CERT-2026-001' : 'SUMAK-DIP-2026-001',
        issuedAt: new Date().toISOString(),
        diplomaTypeName: type.name,
        signatoryName: type.template?.signatory_name || 'Dr. Luis Paredes',
        signatoryTitle: type.template?.signatory_title || 'Director Médico • SUMAK Academy',
        designOverride: design,
      },
      0.55
    )
      .then((url) => {
        if (active) setPreviewUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [type, category]);

  if (!previewUrl) {
    return (
      <div className="w-full aspect-[1.414/1] rounded-xl bg-gradient-to-br from-[#0B2913] to-[#1A4E26] flex flex-col items-center justify-center text-white/80 gap-2">
        <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Generando vista...</span>
      </div>
    );
  }

  return (
    <div className="w-full aspect-[1.414/1] rounded-xl overflow-hidden bg-slate-100 border border-[#C8D8CB]/80 flex items-center justify-center">
      <img src={previewUrl} alt={type.name} className="w-full h-full object-contain" />
    </div>
  );
}

export default function AdminDiplomas() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('issued');

  // --- Emitidos ---
  const [issuances, setIssuances] = useState<IssuanceRow[]>([]);
  const [loadingIssuances, setLoadingIssuances] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'certificado' | 'diploma'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'revoked'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- Preview Modal for any issued credential ---
  const [previewItem, setPreviewItem] = useState<IssuanceRow | null>(null);
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // --- Revoke Modal ---
  const [revokeTarget, setRevokeTarget] = useState<IssuanceRow | null>(null);
  const [revokeReason, setRevokeReason] = useState('Revocado por administración académica');
  const [revoking, setRevoking] = useState(false);

  // --- Pendientes (En Curso) ---
  const [pendingCerts, setPendingCerts] = useState<any[]>([]);
  const [pendingDips, setPendingDips] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<'all' | 'certificado' | 'diploma'>('all');

  // --- Plantillas ---
  const [types, setTypes] = useState<DiplomaTypeRecord[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'certificate' | 'diploma'>('all');
  const [editingType, setEditingType] = useState<{
    id?: string;
    name: string;
    internal_code: string;
    description: string;
    credential_category: 'certificate' | 'diploma';
    is_active: boolean;
    starterPresetId: string;
    pageSize: PageSizeId;
    orientation: PageOrientation;
  } | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [buildingTemplateId, setBuildingTemplateId] = useState<string | null>(null);

  // --- Emisión Manual (Certificado o Diploma) ---
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [emitForm, setEmitForm] = useState({
    credential_type: 'certificate' as 'certificate' | 'diploma',
    student_id: '',
    course_id: '',
    program_id: '',
    diploma_type_id: '',
    participant_name: '',
    program_name: '',
    issued_at: new Date().toISOString().slice(0, 10),
  });
  const [emitting, setEmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // --- Registrar PDF Externo + QR ---
  const [registerStudentSearch, setRegisterStudentSearch] = useState('');
  const [registerForm, setRegisterForm] = useState({
    user_id: '',
    diploma_type_id: '',
    course_id: '',
    participant_name: '',
    program_name: '',
    diploma_number: '',
    issued_at: new Date().toISOString().slice(0, 10),
  });
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registeredUrl, setRegisteredUrl] = useState<string | null>(null);

  // ── Data Loaders ───────────────────────────────────────────────────────────

  const loadDiplomas = useCallback(async () => {
    try {
      setLoadingIssuances(true);
      const data = await academyAPI.getAllDiplomas();
      setIssuances(data as IssuanceRow[]);
    } catch {
      toast.error('Error al cargar los certificados y diplomas.');
    } finally {
      setLoadingIssuances(false);
    }
  }, [toast]);

  const loadTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const { data: typeRows, error } = await supabase
        .from('academy_diploma_types')
        .select('*')
        .order('credential_category')
        .order('name');
      if (error) throw error;

      const { data: tplRows } = await supabase
        .from('academy_diploma_templates')
        .select('*')
        .eq('is_active', true)
        .order('version', { ascending: false });

      const tplMap = new Map<string, any>();
      (tplRows ?? []).forEach((t: any) => {
        if (!tplMap.has(t.diploma_type_id)) tplMap.set(t.diploma_type_id, t);
      });

      const enriched: DiplomaTypeRecord[] = [];
      for (const dt of (typeRows ?? []) as DiplomaTypeRecord[]) {
        let tpl = tplMap.get(dt.id);
        if (!tpl) {
          const cat = getTypeCategory(dt);
          const preset = STARTER_PRESETS.find((p) =>
            cat === 'certificate' ? p.id === 'sumak_clinical_emerald' : p.id === 'sumak_ceremonial_gold'
          )!;
          const { data: createdTpl } = await supabase
            .from('academy_diploma_templates')
            .insert({
              diploma_type_id: dt.id,
              version: 1,
              page_size: 'A4',
              orientation: 'landscape',
              title_text: dt.name,
              subtitle_text: 'ACADEMIA SUMAK VIDA ECUADOR',
              signatory_name: 'Dr. Luis Paredes',
              signatory_title: 'Director Médico y Formador de Formadores • SUMAK Academy',
              layout_config: preset.build(cat),
              is_active: true,
            })
            .select('*')
            .single();
          tpl = createdTpl;
        }
        enriched.push({ ...dt, template: tpl ?? null });
      }
      setTypes(enriched);
    } catch {
      toast.error('Error al cargar las plantillas.');
    } finally {
      setLoadingTypes(false);
    }
  }, [toast]);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await academyAPI.getAdminPendingCredentials();
      setPendingCerts(data.pending_certificates || []);
      setPendingDips(data.pending_diplomas || []);
    } catch {
      toast.error('Error al cargar credenciales pendientes.');
    } finally {
      setLoadingPending(false);
    }
  }, [toast]);

  const loadEmitData = useCallback(async () => {
    const [coursesRes, programsRes, studentsRes] = await Promise.all([
      supabase.from('academy_courses').select('id, title, diploma_type_id').order('title'),
      supabase.from('academy_programs').select('id, title, diploma_type_id').order('title'),
      supabase.from('profiles').select('id, nombre_completo, email').order('nombre_completo'),
    ]);
    if (coursesRes.data) setCourses(coursesRes.data as CourseItem[]);
    if (programsRes.data) setPrograms(programsRes.data as ProgramItem[]);
    if (studentsRes.data) setStudents(studentsRes.data as StudentItem[]);
  }, []);

  useEffect(() => {
    void loadDiplomas();
    void loadTypes();
    void loadPending();
  }, [loadDiplomas, loadTypes, loadPending]);

  useEffect(() => {
    if (tab === 'emit' || tab === 'register') {
      void loadEmitData();
    }
  }, [tab, loadEmitData]);

  // ── Build Document Input for Preview & Downloads ───────────────────────────

  function toCredentialInput(dip: IssuanceRow): CredentialDocumentInput {
    const kind = getIssuanceKind(dip);
    return {
      type: kind,
      title: dip.course_name || dip.program_name || dip.diploma_type?.name || 'Formación SUMAK Academy',
      participantName: dip.participant_name || 'Estudiante SUMAK',
      verificationCode: dip.verification_code,
      diplomaNumber: dip.diploma_number,
      issuedAt: dip.issued_at,
      diplomaTypeName: dip.diploma_type?.name,
      signatoryName: dip.template?.signatory_name || undefined,
      signatoryTitle: dip.template?.signatory_title || undefined,
      templateId: dip.template_id,
      diplomaTypeId: dip.diploma_type_id,
    };
  }

  async function openVisualPreview(dip: IssuanceRow) {
    setPreviewItem(dip);
    setPreviewImgUrl(null);
    setLoadingPreview(true);
    try {
      const url = await renderCredentialPreviewDataUrl(toCredentialInput(dip), 1.45);
      setPreviewImgUrl(url);
    } catch {
      toast.error('No se pudo renderizar la vista previa.');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleDownload(dip: IssuanceRow, format: 'pdf' | 'png' = 'pdf') {
    try {
      setProcessingId(`${dip.id}-${format}`);
      // Si es un PDF externo registrado manualmente con QR, abrir su PDF firmado del storage
      if (format === 'pdf' && dip.registration_source === 'manual_qr' && dip.pdf_storage_path) {
        try {
          const res = await callEdgeFunction<{ ok: boolean; signedUrl: string }>('academy-sign-document-url', {
            issuance_id: dip.id,
          });
          if (res?.signedUrl) {
            window.open(res.signedUrl, '_blank');
            return;
          }
        } catch {
          // fallback to visual renderer
        }
      }

      await generateAndDownloadCredentialDocument(toCredentialInput(dip), format);
      toast.success(`Descargando ${format.toUpperCase()} oficial con la plantilla visual.`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar el documento.');
    } finally {
      setProcessingId(null);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await academyAPI.adminRevokeCredential(revokeTarget.id, revokeReason);
      toast.success('Credencial revocada correctamente.');
      setRevokeTarget(null);
      setRevokeReason('Revocado por administración académica');
      await loadDiplomas();
    } catch (err: any) {
      toast.error(err?.message || 'Error al revocar la credencial.');
    } finally {
      setRevoking(false);
    }
  }

  // ── Template Type CRUD ─────────────────────────────────────────────────────

  function openNewTypeModal(defaultCat: 'certificate' | 'diploma' = 'diploma') {
    setEditingType({
      name: '',
      internal_code: defaultCat === 'certificate' ? 'CERT_' : 'DIP_',
      description: '',
      credential_category: defaultCat,
      is_active: true,
      starterPresetId: defaultCat === 'certificate' ? 'sumak_clinical_emerald' : 'sumak_ceremonial_gold',
      pageSize: 'A4',
      orientation: 'landscape',
    });
  }

  async function saveType(openStudioAfter = false) {
    if (!editingType?.name.trim() || !editingType?.internal_code.trim()) {
      toast.error('Nombre y código interno son obligatorios.');
      return;
    }
    setSavingType(true);
    try {
      let targetTemplateId: string | null = null;

      if (editingType.id) {
        const { error } = await supabase
          .from('academy_diploma_types')
          .update({
            name: editingType.name.trim(),
            internal_code: editingType.internal_code.trim().toUpperCase(),
            description: editingType.description.trim() || null,
            credential_category: editingType.credential_category,
            is_active: editingType.is_active,
          })
          .eq('id', editingType.id);
        if (error) throw error;

        const existing = types.find((t) => t.id === editingType.id);
        targetTemplateId = existing?.template?.id ?? null;
        toast.success('Tipo de plantilla actualizado.');
      } else {
        const { data: createdType, error } = await supabase
          .from('academy_diploma_types')
          .insert({
            name: editingType.name.trim(),
            internal_code: editingType.internal_code.trim().toUpperCase(),
            description: editingType.description.trim() || null,
            credential_category: editingType.credential_category,
            is_active: editingType.is_active,
          })
          .select('id')
          .single();
        if (error) throw error;

        const starter =
          STARTER_PRESETS.find((p) => p.id === editingType.starterPresetId) ?? STARTER_PRESETS[0];
        const initialDesign = starter.build(editingType.credential_category);
        initialDesign.canvas.pageSize = editingType.pageSize;
        initialDesign.canvas.orientation = editingType.orientation;

        const { data: createdTpl, error: tplErr } = await supabase
          .from('academy_diploma_templates')
          .insert({
            diploma_type_id: createdType.id,
            version: 1,
            page_size: editingType.pageSize,
            orientation: editingType.orientation,
            title_text: editingType.name.trim(),
            subtitle_text: 'ACADEMIA SUMAK VIDA ECUADOR',
            signatory_name: 'Dr. Luis Paredes',
            signatory_title: 'Director Médico y Formador de Formadores • SUMAK Academy',
            layout_config: initialDesign,
            is_active: true,
          })
          .select('id')
          .single();
        if (tplErr) throw tplErr;

        targetTemplateId = createdTpl.id;
        toast.success('Plantilla creada con diseño base profesional.');
      }

      setEditingType(null);
      await loadTypes();

      if (openStudioAfter && targetTemplateId) {
        setBuildingTemplateId(targetTemplateId);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la plantilla.');
    } finally {
      setSavingType(false);
    }
  }

  async function duplicateType(type: DiplomaTypeRecord) {
    try {
      const cat = getTypeCategory(type);
      const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
      const { data: createdType, error } = await supabase
        .from('academy_diploma_types')
        .insert({
          name: `${type.name} (Copia)`,
          internal_code: `${type.internal_code}_${suffix}`,
          description: type.description,
          credential_category: cat,
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;

      const designCopy = normalizeTemplateDesign(type.template, cat);
      await supabase.from('academy_diploma_templates').insert({
        diploma_type_id: createdType.id,
        version: 1,
        page_size: designCopy.canvas.pageSize,
        orientation: designCopy.canvas.orientation,
        background_image_url: type.template?.background_image_url || null,
        title_text: `${type.name} (Copia)`,
        subtitle_text: 'ACADEMIA SUMAK VIDA ECUADOR',
        signatory_name: type.template?.signatory_name || 'Dr. Luis Paredes',
        signatory_title: type.template?.signatory_title || 'Director Médico • SUMAK Academy',
        layout_config: designCopy,
        is_active: true,
      });

      toast.success('Plantilla duplicada con todo su diseño visual.');
      await loadTypes();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo duplicar la plantilla.');
    }
  }

  async function deleteType(id: string) {
    if (!window.confirm('¿Eliminar esta plantilla? Si existen credenciales emitidas con ella, no se podrá borrar.')) return;
    const { error } = await supabase.from('academy_diploma_types').delete().eq('id', id);
    if (error) toast.error('No se puede eliminar porque existen certificados o diplomas emitidos con esta plantilla.');
    else {
      toast.success('Plantilla eliminada.');
      await loadTypes();
    }
  }

  // ── Manual Emit (Certificate or Diploma) ───────────────────────────────────

  function handleEmitStudentSelect(s: StudentItem) {
    setStudentSearch(s.nombre_completo);
    setEmitForm((f) => ({ ...f, student_id: s.id, participant_name: s.nombre_completo }));
  }

  function handleEmitCourseSelect(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    const defaultCertType =
      course?.diploma_type_id ||
      types.find((t) => t.is_active && getTypeCategory(t) === 'certificate')?.id ||
      '';
    setEmitForm((f) => ({
      ...f,
      course_id: courseId,
      program_id: '',
      program_name: course?.title ?? f.program_name,
      diploma_type_id: defaultCertType || f.diploma_type_id,
    }));
  }

  function handleEmitProgramSelect(programId: string) {
    const prog = programs.find((p) => p.id === programId);
    const defaultDipType =
      prog?.diploma_type_id ||
      types.find((t) => t.is_active && getTypeCategory(t) === 'diploma')?.id ||
      '';
    setEmitForm((f) => ({
      ...f,
      program_id: programId,
      course_id: '',
      program_name: prog?.title ?? f.program_name,
      diploma_type_id: defaultDipType || f.diploma_type_id,
    }));
  }

  function prefillEmitFromPending(item: any, kind: 'certificate' | 'diploma') {
    const defaultTypeId =
      item.diploma_type_id ||
      types.find((t) => t.is_active && getTypeCategory(t) === kind)?.id ||
      '';
    setEmitForm({
      credential_type: kind,
      student_id: item.user_id,
      course_id: kind === 'certificate' ? item.course_id : '',
      program_id: kind === 'diploma' ? item.program_id : '',
      diploma_type_id: defaultTypeId,
      participant_name: item.student_name,
      program_name: kind === 'certificate' ? item.course_title : item.program_title,
      issued_at: new Date().toISOString().slice(0, 10),
    });
    setStudentSearch(item.student_name);
    setTab('emit');
  }

  async function handleEmitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!emitForm.student_id || !emitForm.diploma_type_id || !emitForm.participant_name.trim() || !emitForm.program_name.trim()) {
      toast.error('Completa todos los campos requeridos.');
      return;
    }
    setEmitting(true);
    try {
      const res = await academyAPI.adminIssueCredential({
        user_id: emitForm.student_id,
        credential_type: emitForm.credential_type,
        diploma_type_id: emitForm.diploma_type_id,
        participant_name: emitForm.participant_name.trim(),
        program_name: emitForm.program_name.trim(),
        course_id: emitForm.credential_type === 'certificate' ? emitForm.course_id || null : null,
        program_id: emitForm.credential_type === 'diploma' ? emitForm.program_id || null : null,
        issued_at: emitForm.issued_at ? new Date(`${emitForm.issued_at}T12:00:00Z`).toISOString() : undefined,
      });
      toast.success(
        `${emitForm.credential_type === 'diploma' ? 'Diploma' : 'Certificado'} emitido: #${res.diploma_number}`
      );
      setEmitForm((f) => ({
        ...f,
        student_id: '',
        course_id: '',
        program_id: '',
        participant_name: '',
        program_name: '',
      }));
      setStudentSearch('');
      await Promise.all([loadDiplomas(), loadPending()]);
      setTab('issued');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo emitir la credencial.');
    } finally {
      setEmitting(false);
    }
  }

  // ── External PDF + QR Registration ─────────────────────────────────────────

  async function registerExistingDiploma(event: React.FormEvent) {
    event.preventDefault();
    if (!registerFile) {
      toast.error('Selecciona un PDF original.');
      return;
    }
    setRegistering(true);
    try {
      const formData = new FormData();
      formData.append('file', registerFile);
      Object.entries(registerForm).forEach(([key, value]) => formData.append(key, value));
      const result = await callEdgeFunctionMultipart<{ issuance: { id: string }; verification_url: string }>(
        'academy-register-existing-diploma',
        formData
      );
      await callEdgeFunction('academy-generate-verified-diploma', { issuance_id: result.issuance.id });
      setRegisteredUrl(result.verification_url);
      toast.success('Diploma externo registrado con QR verificable.');
      setRegisterFile(null);
      await loadDiplomas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el diploma.');
    } finally {
      setRegistering(false);
    }
  }

  async function openRegisteredPdf() {
    if (!registeredUrl) return;
    const token = registeredUrl.split('/').pop();
    if (!token) return;
    try {
      const result = await callPublicEdgeFunction<{ signed_url: string }>('academy-sign-registered-diploma-url', {
        token,
      });
      window.open(result.signed_url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('El PDF verificable todavía no está disponible.');
    }
  }

  async function copyRegisteredUrl() {
    if (!registeredUrl) return;
    await navigator.clipboard.writeText(registeredUrl);
    toast.success('URL de verificación copiada.');
  }

  // ── Computed Metrics & Filters ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const validItems = issuances.filter((d) => !['revoked', 'superseded', 'invalidated'].includes(d.status));
    const certs = validItems.filter((d) => getIssuanceKind(d) === 'certificado').length;
    const dips = validItems.filter((d) => getIssuanceKind(d) === 'diploma').length;
    const revoked = issuances.filter((d) => d.status === 'revoked').length;
    return {
      totalValid: validItems.length,
      certs,
      dips,
      revoked,
      pendingTotal: pendingCerts.length + pendingDips.length,
      activeTemplates: types.filter((t) => t.is_active).length,
    };
  }, [issuances, pendingCerts.length, pendingDips.length, types]);

  const filteredIssuances = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return issuances.filter((d) => {
      const kind = getIssuanceKind(d);
      if (kindFilter !== 'all' && kind !== kindFilter) return false;
      const isRevoked = d.status === 'revoked';
      if (statusFilter === 'valid' && isRevoked) return false;
      if (statusFilter === 'revoked' && !isRevoked) return false;
      if (!q) return true;
      return (
        (d.participant_name || '').toLowerCase().includes(q) ||
        (d.program_name || '').toLowerCase().includes(q) ||
        (d.course_name || '').toLowerCase().includes(q) ||
        (d.verification_code || '').toLowerCase().includes(q) ||
        (d.diploma_number || '').toLowerCase().includes(q)
      );
    });
  }, [issuances, searchTerm, kindFilter, statusFilter]);

  const filteredTemplates = useMemo(() => {
    return types.filter((t) => {
      if (templateCategoryFilter === 'all') return true;
      return getTypeCategory(t) === templateCategoryFilter;
    });
  }, [types, templateCategoryFilter]);

  const filteredStudents = students.filter(
    (s) =>
      (s.nombre_completo ?? '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(studentSearch.toLowerCase())
  );
  const filteredRegisterStudents = students.filter(
    (s) =>
      (s.nombre_completo ?? '').toLowerCase().includes(registerStudentSearch.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(registerStudentSearch.toLowerCase())
  );

  // ── UI RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Full-Screen Visual Template Studio */}
      {buildingTemplateId && (
        <AdminTemplateBuilder
          templateId={buildingTemplateId}
          onClose={() => setBuildingTemplateId(null)}
          onSaved={() => {
            void loadTypes();
            void loadDiplomas();
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Certificados y Diplomas Oficiales
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Estudio visual de plantillas, monitoreo de emitidos y en curso, emisión manual y validación QR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void loadDiplomas();
              void loadTypes();
              void loadPending();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#C8D8CB] bg-white text-xs font-bold text-[#1A4E26] hover:bg-[#F4F7F5] transition"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('templates');
              openNewTypeModal('diploma');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#143D1E] shadow-xs transition"
          >
            <LayoutTemplate size={15} /> Nueva Plantilla Visual
          </button>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Válidos</span>
            <Award size={16} className="text-[#1A4E26]" />
          </div>
          <p className="text-2xl font-black text-[#0B2913] mt-1">{stats.totalValid}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.revoked} revocados</p>
        </div>

        <div className="bg-gradient-to-br from-[#EBF4ED] to-white rounded-2xl border border-[#C8D8CB] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A4E26]">Certificados</span>
            <BookOpen size={16} className="text-[#1A4E26]" />
          </div>
          <p className="text-2xl font-black text-[#1A4E26] mt-1">{stats.certs}</p>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">{pendingCerts.length} en curso</p>
        </div>

        <div className="bg-gradient-to-br from-[#FEF6E9] to-white rounded-2xl border border-[#E8C97A] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E]">Diplomas</span>
            <GraduationCap size={16} className="text-[#B8860B]" />
          </div>
          <p className="text-2xl font-black text-[#78350F] mt-1">{stats.dips}</p>
          <p className="text-[11px] text-amber-800/80 mt-0.5">{pendingDips.length} en curso</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pendientes</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1">{stats.pendingTotal}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Estudiantes cursando</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-[#C8D8CB] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Plantillas</span>
            <LayoutTemplate size={16} className="text-[#1A4E26]" />
          </div>
          <p className="text-2xl font-black text-[#111] mt-1">{stats.activeTemplates}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Diseños activos</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white border border-[#C8D8CB] rounded-2xl p-1.5 shadow-2xs">
        {(
          [
            { id: 'issued', label: `Emitidos (${issuances.length})`, icon: <Award size={15} /> },
            { id: 'pending', label: `Pendientes (${stats.pendingTotal})`, icon: <Clock size={15} /> },
            { id: 'templates', label: `Plantillas y Diseño (${types.length})`, icon: <LayoutTemplate size={15} /> },
            { id: 'emit', label: 'Emitir Manual', icon: <Plus size={15} /> },
            { id: 'register', label: 'Registrar PDF + QR', icon: <ShieldCheck size={15} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              tab === t.id
                ? 'bg-[#1A4E26] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#111] hover:bg-slate-100'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: EMITIDOS (CERTIFICADOS Y DIPLOMAS)
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'issued' && (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#C8D8CB] bg-[#F8FBF8] flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar estudiante, curso/programa, código o registro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#C8D8CB] rounded-xl text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter by Type */}
              <div className="flex bg-white border border-[#C8D8CB] rounded-xl p-0.5 text-xs font-bold">
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'certificado', label: 'Certificados' },
                    { id: 'diploma', label: 'Diplomas' },
                  ] as const
                ).map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKindFilter(k.id)}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      kindFilter === k.id ? 'bg-[#1A4E26] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              {/* Filter by Status */}
              <div className="flex bg-white border border-[#C8D8CB] rounded-xl p-0.5 text-xs font-bold">
                {(
                  [
                    { id: 'all', label: 'Estado: Todos' },
                    { id: 'valid', label: 'Válidos' },
                    { id: 'revoked', label: 'Revocados' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-2.5 py-1.5 rounded-lg transition ${
                      statusFilter === s.id ? 'bg-[#0B2913] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingIssuances ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-[#1A4E26]" size={32} />
              </div>
            ) : filteredIssuances.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Award className="mx-auto text-slate-300 mb-3" size={44} />
                <p className="font-bold text-slate-600">No se encontraron credenciales con estos filtros.</p>
                <button
                  type="button"
                  onClick={() => setTab('emit')}
                  className="mt-4 inline-flex items-center gap-2 bg-[#1A4E26] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#143D1E] transition"
                >
                  <Plus size={15} /> Emitir Certificado o Diploma
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#C8D8CB] bg-slate-50 text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider">
                    <th className="px-5 py-3.5">Tipo</th>
                    <th className="px-5 py-3.5">Estudiante & Registro</th>
                    <th className="px-5 py-3.5">Curso / Programa & Plantilla</th>
                    <th className="px-5 py-3.5">Emisión & Código QR</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredIssuances.map((dip) => {
                    const kind = getIssuanceKind(dip);
                    const isRevoked = dip.status === 'revoked';
                    return (
                      <tr key={dip.id} className="hover:bg-[#F8FBF8] transition-colors">
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              kind === 'diploma'
                                ? 'bg-[#FEF6E9] text-[#92400E] border border-[#E8C97A]'
                                : 'bg-[#EBF4ED] text-[#1A4E26] border border-[#C8D8CB]'
                            }`}
                          >
                            {kind === 'diploma' ? <GraduationCap size={12} /> : <BookOpen size={12} />}
                            {kind === 'diploma' ? 'Diploma' : 'Certificado'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[#111]">{dip.participant_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-mono text-slate-500">#{dip.diploma_number}</span>
                            {dip.registration_source === 'manual_qr' && (
                              <span className="text-[9px] font-black bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                                PDF+QR
                              </span>
                            )}
                            {dip.metadata?.issued_mode === 'manual' && (
                              <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                MANUAL
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="font-semibold text-[#111] text-sm line-clamp-1">
                            {dip.course_name || dip.program_name}
                          </p>
                          <p className="text-xs text-[#92680A] font-semibold mt-0.5 truncate">
                            Plantilla: {dip.diploma_type?.name || 'Estándar SUMAK'}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-semibold text-slate-700">
                            {new Date(dip.issued_at).toLocaleDateString('es-EC', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded mt-1 inline-block">
                            {dip.verification_code}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {!isRevoked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle size={12} /> Válido
                            </span>
                          ) : (
                            <span
                              title={dip.revocation_reason || 'Revocado'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200"
                            >
                              <XCircle size={12} /> Revocado
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void openVisualPreview(dip)}
                              className="p-2 text-slate-500 hover:text-[#1A4E26] hover:bg-[#EBF4ED] rounded-lg transition"
                              title="Vista Previa Visual"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownload(dip, 'pdf')}
                              disabled={processingId === `${dip.id}-pdf` || isRevoked}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#1A4E26] bg-[#EBF4ED] hover:bg-[#1A4E26] hover:text-white rounded-lg transition disabled:opacity-40"
                              title="Descargar PDF Oficial"
                            >
                              {processingId === `${dip.id}-pdf` ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Download size={13} />
                              )}
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownload(dip, 'png')}
                              disabled={processingId === `${dip.id}-png` || isRevoked}
                              className="p-2 text-slate-500 hover:text-[#1A4E26] hover:bg-[#EBF4ED] rounded-lg transition disabled:opacity-40"
                              title="Descargar Imagen PNG Alta Resolución"
                            >
                              {processingId === `${dip.id}-png` ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <ImageIcon size={16} />
                              )}
                            </button>
                            <a
                              href={`/academia/verificar?code=${encodeURIComponent(dip.verification_code)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition"
                              title="Ver página de verificación pública"
                            >
                              <ExternalLink size={15} />
                            </a>
                            {!isRevoked && (
                              <button
                                type="button"
                                onClick={() => setRevokeTarget(dip)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Revocar credencial"
                              >
                                <Ban size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: PENDIENTES (ESTUDIANTES EN CURSO)
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'pending' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#C8D8CB]">
            <div>
              <h2 className="text-base font-black text-[#111]">Monitoreo de Certificados y Diplomas Pendientes</h2>
              <p className="text-xs text-slate-500">
                Estudiantes que actualmente están cursando cursos o programas y aún no han recibido su credencial.
              </p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(
                [
                  { id: 'all', label: `Todos (${stats.pendingTotal})` },
                  { id: 'certificado', label: `Certificados (${pendingCerts.length})` },
                  { id: 'diploma', label: `Diplomas (${pendingDips.length})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPendingFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    pendingFilter === f.id ? 'bg-[#1A4E26] text-white' : 'text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loadingPending ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-[#1A4E26]" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pending Diplomas */}
              {(pendingFilter === 'all' || pendingFilter === 'diploma') &&
                pendingDips.map((pd) => (
                  <div
                    key={pd.program_enrollment_id}
                    className="bg-gradient-to-br from-[#FFFDF7] to-[#FEF6E9] border border-[#E8C97A] rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200/80 text-amber-950">
                          <Clock size={11} /> Diploma Pendiente (En curso)
                        </span>
                        <h3 className="font-black text-[#451A03] text-base mt-1.5">{pd.program_title}</h3>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          {pd.student_name}{' '}
                          {pd.student_email && <span className="text-slate-400 font-normal">• {pd.student_email}</span>}
                        </p>
                      </div>
                      <span className="text-lg font-black text-[#92400E]">{pd.progress_percentage}%</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#B45309] to-[#D4AF37] rounded-full"
                          style={{ width: `${pd.progress_percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-amber-900">
                        <span>
                          Cursos aprobados: <strong>{pd.completed_courses} / {pd.required_courses}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => prefillEmitFromPending(pd, 'diploma')}
                          className="font-extrabold text-[#1A4E26] hover:underline"
                        >
                          Emitir Diploma Manual →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Pending Certificates */}
              {(pendingFilter === 'all' || pendingFilter === 'certificado') &&
                pendingCerts.map((pc) => (
                  <div
                    key={pc.enrollment_id}
                    className="bg-white border border-[#C8D8CB] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#EBF4ED] text-[#1A4E26]">
                          <Clock size={11} /> Certificado Pendiente (En curso)
                        </span>
                        <h3 className="font-black text-[#111] text-base mt-1.5">{pc.course_title}</h3>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          {pc.student_name}{' '}
                          {pc.student_email && <span className="text-slate-400 font-normal">• {pc.student_email}</span>}
                        </p>
                      </div>
                      <span className="text-lg font-black text-[#1A4E26]">{pc.progress_percentage}%</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1A4E26] rounded-full"
                          style={{ width: `${pc.progress_percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Estado matrícula: <strong className="capitalize">{pc.enrollment_status}</strong></span>
                        <button
                          type="button"
                          onClick={() => prefillEmitFromPending(pc, 'certificate')}
                          className="font-extrabold text-[#1A4E26] hover:underline"
                        >
                          Emitir Certificado Manual →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {((pendingFilter === 'all' && pendingCerts.length === 0 && pendingDips.length === 0) ||
                (pendingFilter === 'certificado' && pendingCerts.length === 0) ||
                (pendingFilter === 'diploma' && pendingDips.length === 0)) && (
                <div className="col-span-full bg-white rounded-2xl border border-dashed border-[#C8D8CB] p-12 text-center text-slate-500">
                  <CheckCircle size={36} className="mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold">No hay credenciales pendientes en esta categoría.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: PLANTILLAS Y ESTUDIO DE DISEÑO VISUAL
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'templates' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#C8D8CB]">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit">
              {(
                [
                  { id: 'all', label: `Todas (${types.length})` },
                  {
                    id: 'certificate',
                    label: `Certificados (${types.filter((t) => getTypeCategory(t) === 'certificate').length})`,
                  },
                  {
                    id: 'diploma',
                    label: `Diplomas (${types.filter((t) => getTypeCategory(t) === 'diploma').length})`,
                  },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTemplateCategoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    templateCategoryFilter === f.id ? 'bg-[#1A4E26] text-white' : 'text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openNewTypeModal('certificate')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EBF4ED] text-[#1A4E26] hover:bg-[#D5E8D9] text-xs font-extrabold transition"
              >
                <Plus size={14} /> Nueva Plantilla de Certificado
              </button>
              <button
                type="button"
                onClick={() => openNewTypeModal('diploma')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A4E26] text-white hover:bg-[#143D1E] text-xs font-extrabold transition shadow-xs"
              >
                <Sparkles size={14} className="text-[#D4AF37]" /> Nueva Plantilla de Diploma
              </button>
            </div>
          </div>

          {loadingTypes ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-[#1A4E26]" size={32} />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#C8D8CB] p-12 text-center">
              <LayoutTemplate className="mx-auto text-slate-300 mb-3" size={44} />
              <p className="font-bold text-slate-600">No hay plantillas en esta categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTemplates.map((type) => {
                const cat = getTypeCategory(type);
                return (
                  <div
                    key={type.id}
                    className="bg-white border border-[#C8D8CB] rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col gap-3.5 group"
                  >
                    {/* Live Visual Miniature Preview */}
                    <div className="relative">
                      <TemplateMiniPreview type={type} />
                      <button
                        type="button"
                        onClick={() => type.template?.id && setBuildingTemplateId(type.template.id)}
                        className="absolute inset-0 bg-[#0B2913]/75 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 text-white rounded-xl cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-[#D4AF37] text-[#0B2913] flex items-center justify-center shadow-lg">
                          <LayoutTemplate size={22} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider">Abrir Estudio Visual</span>
                      </button>

                      <span
                        className={`absolute top-2.5 left-2.5 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs ${
                          cat === 'diploma'
                            ? 'bg-[#D4AF37] text-[#0B2913]'
                            : 'bg-[#1A4E26] text-white'
                        }`}
                      >
                        {cat === 'diploma' ? 'Diploma' : 'Certificado'}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-[#111] text-sm leading-snug">{type.name}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            type.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {type.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">
                        {type.internal_code} • {type.template?.page_size || 'A4'}{' '}
                        {type.template?.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}
                      </p>
                      {type.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 pt-0.5">{type.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => type.template?.id && setBuildingTemplateId(type.template.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-extrabold text-white bg-[#1A4E26] hover:bg-[#143D1E] rounded-xl transition"
                      >
                        <LayoutTemplate size={14} /> Diseñar Plantilla
                      </button>
                      <button
                        type="button"
                        onClick={() => void duplicateType(type)}
                        className="p-2 text-slate-500 hover:text-[#1A4E26] hover:bg-[#EBF4ED] rounded-xl transition"
                        title="Duplicar diseño"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingType({
                            id: type.id,
                            name: type.name,
                            internal_code: type.internal_code,
                            description: type.description || '',
                            credential_category: cat,
                            is_active: type.is_active,
                            starterPresetId: 'sumak_ceremonial_gold',
                            pageSize: (type.template?.page_size === 'letter' ? 'letter' : 'A4') as PageSizeId,
                            orientation: (type.template?.orientation === 'portrait' ? 'portrait' : 'landscape') as PageOrientation,
                          })
                        }
                        className="p-2 text-slate-500 hover:text-[#1A4E26] hover:bg-[#EBF4ED] rounded-xl transition"
                        title="Configurar nombre y código"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteType(type.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: EMISIÓN MANUAL (CERTIFICADO O DIPLOMA)
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'emit' && (
        <form onSubmit={handleEmitManual} className="max-w-2xl bg-white rounded-2xl border border-[#C8D8CB] shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 bg-[#EBF4ED] rounded-2xl flex items-center justify-center">
              <GraduationCap size={22} className="text-[#1A4E26]" />
            </div>
            <div>
              <h2 className="font-black text-base text-[#111]">Emitir Certificado o Diploma Manual</h2>
              <p className="text-xs text-slate-500">
                Emite una credencial oficial inmediata con código QR verificable y notificación al estudiante.
              </p>
            </div>
          </div>

          {/* Selector Certificado vs Diploma */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setEmitForm((f) => ({
                  ...f,
                  credential_type: 'certificate',
                  program_id: '',
                  diploma_type_id:
                    types.find((t) => t.is_active && getTypeCategory(t) === 'certificate')?.id || f.diploma_type_id,
                }))
              }
              className={`p-3.5 rounded-xl border-2 text-left transition ${
                emitForm.credential_type === 'certificate'
                  ? 'border-[#1A4E26] bg-[#EBF4ED]'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm text-[#0B2913]">
                <BookOpen size={16} className="text-[#1A4E26]" /> Certificado de Curso
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Acredita la aprobación de un curso específico.</p>
            </button>

            <button
              type="button"
              onClick={() =>
                setEmitForm((f) => ({
                  ...f,
                  credential_type: 'diploma',
                  course_id: '',
                  diploma_type_id:
                    types.find((t) => t.is_active && getTypeCategory(t) === 'diploma')?.id || f.diploma_type_id,
                }))
              }
              className={`p-3.5 rounded-xl border-2 text-left transition ${
                emitForm.credential_type === 'diploma'
                  ? 'border-[#D4AF37] bg-[#FEF6E9]'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm text-[#78350F]">
                <GraduationCap size={16} className="text-[#B8860B]" /> Diploma de Programa
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Acredita una especialización o ruta completa.</p>
            </button>
          </div>

          {/* Estudiante */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              <User size={13} className="inline mr-1" /> Estudiante *
            </label>
            <input
              type="text"
              placeholder="Buscar estudiante por nombre o email..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setEmitForm((f) => ({ ...f, student_id: '' }));
              }}
              className="w-full border border-[#C8D8CB] rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#1A4E26] outline-none"
            />
            {studentSearch && !emitForm.student_id && (
              <div className="mt-1 border border-slate-200 rounded-xl max-h-44 overflow-y-auto bg-white shadow-md">
                {filteredStudents.slice(0, 12).map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => handleEmitStudentSelect(s)}
                    className="w-full text-left px-3.5 py-2 text-sm hover:bg-[#EBF4ED] border-b border-slate-100 last:border-0"
                  >
                    <span className="font-bold text-[#111]">{s.nombre_completo}</span>
                    <span className="text-xs text-slate-400 ml-2">{s.email}</span>
                  </button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="px-3.5 py-2.5 text-xs text-slate-400">Sin resultados</p>
                )}
              </div>
            )}
            {emitForm.student_id && (
              <p className="text-xs text-[#1A4E26] font-bold mt-1">
                ✓ Seleccionado: {students.find((s) => s.id === emitForm.student_id)?.nombre_completo || emitForm.participant_name}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Curso o Programa */}
            {emitForm.credential_type === 'certificate' ? (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Curso Asociado (Opcional)
                </label>
                <select
                  value={emitForm.course_id}
                  onChange={(e) => handleEmitCourseSelect(e.target.value)}
                  className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">-- Seleccionar curso --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Programa Asociado (Opcional)
                </label>
                <select
                  value={emitForm.program_id}
                  onChange={(e) => handleEmitProgramSelect(e.target.value)}
                  className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">-- Seleccionar programa --</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Plantilla Visual */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Plantilla Visual *
              </label>
              <select
                required
                value={emitForm.diploma_type_id}
                onChange={(e) => setEmitForm((f) => ({ ...f, diploma_type_id: e.target.value }))}
                className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-sm bg-white"
              >
                <option value="">-- Seleccionar diseño --</option>
                {types
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      [{getTypeCategory(t) === 'certificate' ? 'CERT' : 'DIP'}] {t.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Nombre Público en la Credencial *
              </label>
              <input
                required
                type="text"
                value={emitForm.participant_name}
                onChange={(e) => setEmitForm((f) => ({ ...f, participant_name: e.target.value }))}
                placeholder="Ej: Dra. María Elena Zambrano Paredes"
                className="w-full border border-[#C8D8CB] rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Fecha de Emisión *
              </label>
              <input
                required
                type="date"
                value={emitForm.issued_at}
                onChange={(e) => setEmitForm((f) => ({ ...f, issued_at: e.target.value }))}
                className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Título del {emitForm.credential_type === 'diploma' ? 'Programa / Especialización' : 'Curso / Taller'} *
            </label>
            <input
              required
              type="text"
              value={emitForm.program_name}
              onChange={(e) => setEmitForm((f) => ({ ...f, program_name: e.target.value }))}
              placeholder="Título exacto que se imprimirá en el documento..."
              className="w-full border border-[#C8D8CB] rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={emitting || !emitForm.student_id || !emitForm.diploma_type_id}
            className="w-full flex items-center justify-center gap-2 bg-[#1A4E26] text-white py-3 rounded-xl font-black text-sm hover:bg-[#143D1E] transition disabled:opacity-50"
          >
            {emitting ? <Loader2 size={18} className="animate-spin" /> : <Award size={18} />}
            {emitting
              ? 'Emitiendo credencial...'
              : emitForm.credential_type === 'diploma'
              ? 'Emitir Diploma Oficial Ahora'
              : 'Emitir Certificado Oficial Ahora'}
          </button>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5: REGISTRAR PDF EXTERNO + QR
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'register' && (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm p-6 sm:p-8 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-black text-[#111]">Registrar Diploma PDF Externo + QR Verificable</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Ideal para diplomas ya diseñados externamente en PDF: el archivo original se conserva y se genera una copia verificable con código QR oficial.
            </p>
          </div>
          <form onSubmit={registerExistingDiploma} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Beneficiario *
                  <input
                    required={!registerForm.user_id}
                    value={registerStudentSearch}
                    onChange={(event) => {
                      setRegisterStudentSearch(event.target.value);
                      setRegisterForm((current) => ({ ...current, user_id: '' }));
                    }}
                    placeholder="Buscar por nombre o email..."
                    className="mt-1 w-full px-3 py-2 border border-[#C8D8CB] rounded-xl bg-white text-sm font-normal"
                  />
                </label>
                {registerStudentSearch && !registerForm.user_id && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#C8D8CB] bg-white shadow-lg">
                    {filteredRegisterStudents.slice(0, 10).map((student) => (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => {
                          setRegisterStudentSearch(`${student.nombre_completo} · ${student.email}`);
                          setRegisterForm((current) => ({
                            ...current,
                            user_id: student.id,
                            participant_name: student.nombre_completo,
                          }));
                        }}
                        className="block w-full border-b border-[#E5ECE6] px-3 py-2 text-left text-sm last:border-0 hover:bg-[#EBF4ED]"
                      >
                        <span className="font-semibold">{student.nombre_completo}</span>
                        <span className="ml-2 text-xs text-[#6B7280]">{student.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Tipo de Credencial *
                <select
                  required
                  value={registerForm.diploma_type_id}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, diploma_type_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-[#C8D8CB] rounded-xl bg-white text-sm font-normal"
                >
                  <option value="">Seleccionar tipo</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>{type.name} ({type.internal_code})</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Curso (Opcional)
                <select
                  value={registerForm.course_id}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, course_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-[#C8D8CB] rounded-xl bg-white text-sm font-normal"
                >
                  <option value="">Sin curso específico</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Fecha de emisión *
                <input
                  required
                  type="date"
                  value={registerForm.issued_at}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, issued_at: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-[#C8D8CB] rounded-xl text-sm font-normal"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Nombre público *
                <input
                  required
                  value={registerForm.participant_name}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, participant_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-[#C8D8CB] rounded-xl text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Número de diploma (Opcional)
                <input
                  value={registerForm.diploma_number}
                  onChange={(e) => setRegisterForm((current) => ({ ...current, diploma_number: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-[#C8D8CB] rounded-xl text-sm font-normal"
                />
              </label>
            </div>

            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Programa o formación *
              <input
                required
                value={registerForm.program_name}
                onChange={(e) => setRegisterForm((current) => ({ ...current, program_name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-[#C8D8CB] rounded-xl text-sm font-normal"
              />
            </label>

            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Archivo PDF Original *
              <input
                required
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setRegisterFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm font-normal text-[#6B7280] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EBF4ED] file:px-3 file:py-2 file:font-bold file:text-[#1A4E26]"
              />
            </label>

            {registeredUrl && (
              <div className="rounded-xl bg-[#EBF4ED] border border-[#C8D8CB] p-4 text-sm">
                <p className="font-bold text-[#1A4E26]">Diploma registrado y PDF verificable generado</p>
                <p className="text-[#6B7280] mt-1 break-all text-xs">{registeredUrl}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => void copyRegisteredUrl()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#C8D8CB] text-[#1A4E26] font-bold text-xs"
                  >
                    <Copy size={14} /> Copiar URL
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(registeredUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#C8D8CB] text-[#1A4E26] font-bold text-xs"
                  >
                    <ExternalLink size={14} /> Verificar
                  </button>
                  <button
                    type="button"
                    onClick={() => void openRegisteredPdf()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] text-white font-bold text-xs"
                  >
                    <Eye size={14} /> Ver PDF verificable
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={registering}
                className="px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white font-bold text-sm disabled:opacity-60"
              >
                {registering ? 'Registrando...' : 'Registrar Diploma PDF + QR'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR TIPO DE PLANTILLA ── */}
      {editingType !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-black text-[#111]">
                  {editingType.id ? 'Configurar Plantilla' : 'Crear Nueva Plantilla de Certificado o Diploma'}
                </h2>
                <p className="text-xs text-slate-500">
                  Define el tipo y elige un diseño base para abrirlo en el Estudio Visual.
                </p>
              </div>
              <button type="button" onClick={() => setEditingType(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Category Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setEditingType((t) =>
                      t
                        ? {
                            ...t,
                            credential_category: 'certificate',
                            starterPresetId: 'sumak_clinical_emerald',
                            internal_code:
                              !t.id && (!t.internal_code || t.internal_code === 'DIP_') ? 'CERT_' : t.internal_code,
                          }
                        : t
                    )
                  }
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    editingType.credential_category === 'certificate'
                      ? 'border-[#1A4E26] bg-[#EBF4ED]'
                      : 'border-slate-200'
                  }`}
                >
                  <p className="text-xs font-black text-[#0B2913] flex items-center gap-1.5">
                    <BookOpen size={14} className="text-[#1A4E26]" /> Certificado de Curso
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Para cursos individuales y talleres.</p>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingType((t) =>
                      t
                        ? {
                            ...t,
                            credential_category: 'diploma',
                            starterPresetId: 'sumak_ceremonial_gold',
                            internal_code:
                              !t.id && (!t.internal_code || t.internal_code === 'CERT_') ? 'DIP_' : t.internal_code,
                          }
                        : t
                    )
                  }
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    editingType.credential_category === 'diploma'
                      ? 'border-[#D4AF37] bg-[#FEF6E9]'
                      : 'border-slate-200'
                  }`}
                >
                  <p className="text-xs font-black text-[#78350F] flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-[#B8860B]" /> Diploma de Programa
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Para especializaciones y rutas formativas.</p>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Plantilla *</label>
                  <input
                    type="text"
                    value={editingType.name}
                    onChange={(e) => setEditingType((t) => (t ? { ...t, name: e.target.value } : t))}
                    placeholder="Ej: Certificado Oficial de Fitoterapia..."
                    className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A4E26]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código Interno *</label>
                  <input
                    type="text"
                    value={editingType.internal_code}
                    onChange={(e) =>
                      setEditingType((t) =>
                        t ? { ...t, internal_code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') } : t
                      )
                    }
                    placeholder="Ej: CERT_FITOTERAPIA"
                    className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[#1A4E26]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción interna</label>
                <textarea
                  rows={2}
                  value={editingType.description}
                  onChange={(e) => setEditingType((t) => (t ? { ...t, description: e.target.value } : t))}
                  placeholder="Describe cuándo se usa esta plantilla..."
                  className="w-full border border-[#C8D8CB] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A4E26] resize-none"
                />
              </div>

              {/* Starter Preset Picker (only on Create) */}
              {!editingType.id && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Elige el Diseño Base Inicial
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editingType.pageSize}
                        onChange={(e) =>
                          setEditingType((t) => (t ? { ...t, pageSize: e.target.value as PageSizeId } : t))
                        }
                        className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="A4">A4</option>
                        <option value="letter">Carta</option>
                      </select>
                      <select
                        value={editingType.orientation}
                        onChange={(e) =>
                          setEditingType((t) => (t ? { ...t, orientation: e.target.value as PageOrientation } : t))
                        }
                        className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="landscape">Horizontal</option>
                        <option value="portrait">Vertical</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {STARTER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setEditingType((t) => (t ? { ...t, starterPresetId: preset.id } : t))}
                        className={`rounded-xl border-2 overflow-hidden text-left transition ${
                          editingType.starterPresetId === preset.id
                            ? 'border-[#1A4E26] ring-1 ring-[#1A4E26]'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="h-10 relative" style={{ background: preset.previewBg }}>
                          <div
                            className="absolute inset-1.5 border rounded-xs"
                            style={{ borderColor: preset.previewAccent }}
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] font-extrabold text-[#111] leading-tight">{preset.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editingType.is_active}
                  onChange={(e) => setEditingType((t) => (t ? { ...t, is_active: e.target.checked } : t))}
                  className="accent-[#1A4E26] w-4 h-4"
                />
                Plantilla activa y disponible para cursos / programas
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingType}
                onClick={() => void saveType(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-[#1A4E26] text-[#1A4E26] bg-white hover:bg-[#EBF4ED] rounded-xl disabled:opacity-50"
              >
                <Save size={14} /> Solo Guardar
              </button>
              <button
                type="button"
                disabled={savingType}
                onClick={() => void saveType(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black bg-[#1A4E26] text-white hover:bg-[#143D1E] rounded-xl shadow-xs disabled:opacity-50"
              >
                {savingType ? <Loader2 size={14} className="animate-spin" /> : <LayoutTemplate size={14} />}
                Guardar y Abrir Estudio Visual →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VISTA PREVIA VISUAL DE CREDENCIAL EMITIDA ── */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0B2913] text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm">
                  {previewItem.participant_name} — {previewItem.course_name || previewItem.program_name}
                </h3>
                <p className="text-[11px] text-emerald-200 font-mono">
                  #{previewItem.diploma_number} • Código: {previewItem.verification_code}
                </p>
              </div>
              <button type="button" onClick={() => setPreviewItem(null)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 bg-slate-100 flex items-center justify-center min-h-[380px]">
              {loadingPreview || !previewImgUrl ? (
                <div className="flex flex-col items-center gap-2 text-[#1A4E26]">
                  <Loader2 size={32} className="animate-spin" />
                  <span className="text-xs font-bold">Renderizando credencial con su plantilla oficial...</span>
                </div>
              ) : (
                <img
                  src={previewImgUrl}
                  alt="Vista previa credencial"
                  className="max-h-[65vh] w-auto rounded-lg shadow-xl border border-slate-200"
                />
              )}
            </div>
            <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <a
                href={`/academia/verificar?code=${encodeURIComponent(previewItem.verification_code)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A4E26] hover:underline"
              >
                <ShieldCheck size={15} /> Abrir Registro de Verificación Pública
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(previewItem, 'png')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#C8D8CB] text-xs font-bold text-[#1A4E26] hover:bg-[#F4F7F5]"
                >
                  <ImageIcon size={14} /> Descargar PNG
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(previewItem, 'pdf')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A4E26] text-white text-xs font-bold hover:bg-[#143D1E]"
                >
                  <Download size={14} /> Descargar PDF Oficial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REVOCAR CREDENCIAL ── */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Ban size={20} />
              </div>
              <div>
                <h3 className="font-black text-base text-[#111]">Revocar Credencial</h3>
                <p className="text-xs text-slate-500">#{revokeTarget.diploma_number} • {revokeTarget.participant_name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Al revocar este documento, su código QR de verificación pública mostrará inmediatamente el estado <strong>REVOCADO</strong>.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Motivo de revocación *</label>
              <textarea
                rows={2}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={revoking || revokeReason.trim().length < 5}
                onClick={() => void confirmRevoke()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {revoking ? 'Revocando...' : 'Confirmar Revocación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
