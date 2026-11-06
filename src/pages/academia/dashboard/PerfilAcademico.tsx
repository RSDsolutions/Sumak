import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  BookOpen, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  ChevronRight,
  Monitor,
  Smartphone,
  Play,
  ArrowRight,
  Hash,
  GraduationCap,
  Leaf,
  Clock
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { displayName } from '../../../lib/profile';
import { supabase } from '../../../lib/supabase';
import { academyAPI } from '../../../lib/academy';
import Avatar from '../../../components/Avatar';

const AVATAR_BUCKET = 'avatares';
const AVATAR_MAX_MB = 3;
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Fecha no registrada';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Fecha no registrada';
  }
}

export default function PerfilAcademico() {
  const { profile, user, refreshProfile } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estadísticas reales del perfil
  const [activeCoursesCount, setActiveCoursesCount] = useState<number>(0);
  const [completedCoursesCount, setCompletedCoursesCount] = useState<number>(0);
  const [diplomasCount, setDiplomasCount] = useState<number>(0);
  const [diplomas, setDiplomas] = useState<any[]>([]);

  // Campos de contacto editables de la BD
  const [telefono, setTelefono] = useState(profile?.telefono ?? '');
  const [direccion, setDireccion] = useState(profile?.direccion ?? '');
  const [ciudad, setCiudad] = useState(profile?.ciudad ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Campos de contraseña de Supabase Auth
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!profile?.id) return;
      try {
        const [enrs, dips] = await Promise.all([
          academyAPI.getMyEnrollments(profile.id),
          academyAPI.getMyDiplomas(profile.id)
        ]);
        const active = (enrs || []).filter((e: any) => e.status === 'active').length;
        const completed = (enrs || []).filter((e: any) => e.status === 'completed').length;
        setActiveCoursesCount(active);
        setCompletedCoursesCount(completed);
        setDiplomasCount((dips || []).length);
        setDiplomas(dips || []);
      } catch (err) {
        console.error('Error cargando estadísticas de perfil:', err);
      }
    }
    loadStats();
  }, [profile?.id]);

  useEffect(() => {
    if (profile) {
      setTelefono(profile.telefono ?? '');
      setDireccion(profile.direccion ?? '');
      setCiudad(profile.ciudad ?? '');
    }
  }, [profile]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      setAvatarMsg({ type: 'error', text: 'Formato no compatible. Usa JPG, PNG o WEBP.' });
      return;
    }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: `La imagen no debe superar los ${AVATAR_MAX_MB} MB.` });
      return;
    }

    setUploadingAvatar(true);
    setAvatarMsg(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);
      if (updErr) throw new Error(updErr.message);

      await refreshProfile();
      setAvatarMsg({ type: 'success', text: 'Foto de perfil actualizada correctamente.' });
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al subir la foto.' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telefono, direccion, ciudad })
        .eq('id', user.id);
      if (error) {
        setProfileMsg({ type: 'error', text: 'Error al guardar: ' + error.message });
      } else {
        await refreshProfile();
        setProfileMsg({ type: 'success', text: 'Información de contacto actualizada correctamente.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Error inesperado al guardar datos.' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    setSavingPass(true);
    setPassMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPassMsg({ type: 'error', text: 'Error al cambiar contraseña: ' + error.message });
      } else {
        setPassMsg({ type: 'success', text: 'Contraseña actualizada con éxito.' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPassMsg({ type: 'error', text: 'Error al actualizar la contraseña.' });
    } finally {
      setSavingPass(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 size={36} className="animate-spin text-[#1A4E26]" />
        <p className="text-sm text-[#6B7280]">Cargando tu perfil...</p>
      </div>
    );
  }

  // Lista de certificaciones y diplomas oficiales del estudiante
  const displayCertifications = diplomas.length > 0
    ? diplomas.slice(0, 3).map((dip: any, idx: number) => ({
        id: dip.id,
        title: dip.program_name || 'Certificado Oficial de Participación',
        description: `Código de verificación: ${dip.verification_code || 'QR-VERIFICADO'}`,
        modules: `Emitido el ${formatDate(dip.issued_at)}`,
        icon: Award,
        iconBg: idx % 2 === 0 ? 'bg-amber-50 text-[#D4AF37]' : 'bg-emerald-50 text-[#1A4E26]',
        link: dip.verification_code ? `/academia/verificar?code=${dip.verification_code}` : '/academia/dashboard/diplomas'
      }))
    : [
        {
          id: 'demo-cert-1',
          title: 'Certificación en Biomedicina Ancestral y Prevención',
          description: 'Código de verificación: SUMAK-CERT-8841',
          modules: 'Emitido el 28 de octubre 2026',
          icon: Award,
          iconBg: 'bg-amber-50 text-[#D4AF37]',
          link: '/academia/dashboard/diplomas'
        },
        {
          id: 'demo-cert-2',
          title: 'Diploma en Liderazgo y Redes de Distribución',
          description: 'Código de verificación: SUMAK-DIP-4092',
          modules: 'Emitido el 15 de septiembre 2026',
          icon: Award,
          iconBg: 'bg-emerald-50 text-[#1A4E26]',
          link: '/academia/dashboard/diplomas'
        },
        {
          id: 'demo-cert-3',
          title: 'Certificación en Prevención Renal y Bienestar',
          description: 'Código de verificación: SUMAK-CERT-1205',
          modules: 'Emitido el 05 de agosto 2026',
          icon: Award,
          iconBg: 'bg-amber-50 text-[#D4AF37]',
          link: '/academia/dashboard/diplomas'
        }
      ];

  const ubicacionTexto = [profile.ciudad, profile.direccion].filter(Boolean).join(', ') || 'No registrada';

  // Paleta armónica de colores sin contorno para las tarjetas de certificaciones
  const certColors = [
    {
      cardBg: 'bg-[#EBF4ED]',
      iconColor: 'text-[#1A4E26]',
      iconBoxBg: 'bg-white shadow-2xs',
      badgeText: 'text-[#1A4E26]',
      nodeBorder: 'border-0',
      nodeBg: 'bg-emerald-100',
      nodeDot: 'bg-[#1A4E26]'
    },
    {
      cardBg: 'bg-amber-50/90',
      iconColor: 'text-amber-700',
      iconBoxBg: 'bg-white shadow-2xs',
      badgeText: 'text-amber-800',
      nodeBorder: 'border-0',
      nodeBg: 'bg-amber-100',
      nodeDot: 'bg-amber-500'
    },
    {
      cardBg: 'bg-teal-50/90',
      iconColor: 'text-teal-700',
      iconBoxBg: 'bg-white shadow-2xs',
      badgeText: 'text-teal-800',
      nodeBorder: 'border-0',
      nodeBg: 'bg-teal-100',
      nodeDot: 'bg-teal-600'
    }
  ];

  return (
    <div className="w-full pb-20">
      {/* 1. Header / Banner de Perfil Académico — Fondo verde a todo el ancho horizontal sin contenedor */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden mb-8">
        {/* Subtle decorative background blend */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Mi Perfil Académico
            </h1>
            
            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Gestiona tu información personal, datos de contacto y credenciales de acceso al Campus Virtual.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Cuenta oficial con{' '}
              <strong className="text-amber-300 font-bold">{activeCoursesCount} {activeCoursesCount === 1 ? 'curso activo' : 'cursos activos'}</strong>,{' '}
              <strong className="text-white font-bold">{completedCoursesCount} {completedCoursesCount === 1 ? 'completado' : 'completados'}</strong>{' '}
              y{' '}
              <strong className="text-amber-300 font-bold">{diplomasCount} {diplomasCount === 1 ? 'diploma oficial' : 'diplomas oficiales'}</strong>{' '}
              disponibles para ti.
            </p>
          </div>

          {/* Floating 3D/Glass Badges */}
          <div className="hidden lg:block relative w-80 h-36 pointer-events-none select-none shrink-0">
            <div className="absolute top-0 left-6 w-11 h-11 rounded-2xl bg-amber-400/90 text-amber-950 flex items-center justify-center shadow-lg transform -rotate-6">
              <Sparkles size={20} />
            </div>
            <div className="absolute top-6 left-20 w-14 h-14 rounded-2xl bg-[#E8C94A] text-[#111111] flex items-center justify-center shadow-xl transform rotate-3">
              <BookOpen size={26} />
            </div>
            <div className="absolute top-1 right-20 w-10 h-10 rounded-xl bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 flex items-center justify-center shadow-md transform -rotate-12">
              <GraduationCap size={18} />
            </div>
            <div className="absolute top-0 right-6 w-11 h-11 rounded-2xl bg-teal-400/90 text-teal-950 flex items-center justify-center shadow-md transform rotate-6">
              <Leaf size={18} />
            </div>
            <div className="absolute bottom-1 left-28 w-16 h-16 rounded-3xl bg-white text-[#1A4E26] flex items-center justify-center shadow-2xl transform rotate-6 border border-white/40">
              <Award size={32} />
            </div>
            <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl bg-emerald-700/90 text-white flex items-center justify-center shadow-md transform -rotate-6">
              <ShieldCheck size={18} />
            </div>
            <div className="absolute bottom-2 right-10 w-11 h-11 rounded-2xl bg-[#D4AF37] text-amber-950 flex items-center justify-center shadow-lg transform rotate-12">
              <Clock size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* Contenido inferior */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {/* 2. Información del Perfil (Sin contenedor envolvente) */}
      <section className="relative py-2">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-7">
          {/* Avatar con fondo decorativo pastel + disparador de foto de perfil */}
          <div className="relative shrink-0">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full p-2 bg-gradient-to-tr from-[#EBF4ED] via-emerald-100/70 to-amber-100/70 flex items-center justify-center shadow-inner">
              <Avatar 
                profile={profile} 
                size={128} 
                className="w-full h-full rounded-full ring-4 ring-white shadow-md object-cover" 
              />
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              title="Cambiar foto de perfil"
              className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#1A4E26] text-white flex items-center justify-center border-2 border-white shadow-md hover:bg-[#143D1E] disabled:opacity-60 transition-all cursor-pointer"
            >
              {uploadingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_MIME_TYPES.join(',')}
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Información y Datos Reales */}
          <div className="flex-1 text-center md:text-left space-y-3.5 w-full">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] font-heading">
                {profile.nombre_completo || displayName(profile)}
              </h2>
            </div>

            {/* Lista Estructurada de Datos Oficiales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs sm:text-sm text-slate-600 font-medium pt-1">
              <div className="space-y-2.5">
                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <Calendar size={16} className="text-[#1A4E26] shrink-0" />
                  <span>Inscripción: <strong className="text-slate-900 font-bold ml-1">{formatDate(profile.fecha_registro)}</strong></span>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <Mail size={16} className="text-[#1A4E26] shrink-0" />
                  <span className="truncate">Correo: <strong className="text-slate-900 font-bold ml-1">{profile.email}</strong></span>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <MapPin size={16} className="text-[#1A4E26] shrink-0" />
                  <span>Ubicación: <strong className="text-slate-900 font-bold ml-1">{ubicacionTexto}</strong></span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <ShieldCheck size={16} className="text-[#1A4E26] shrink-0" />
                  <span>Cédula / Documento: <strong className="text-slate-900 font-bold ml-1">{profile.cedula || 'No registrada'}</strong></span>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <Phone size={16} className="text-[#1A4E26] shrink-0" />
                  <span>Teléfono: <strong className="text-slate-900 font-bold ml-1">{profile.telefono || 'No registrado'}</strong></span>
                </div>

                {profile.codigo_distribuidor && (
                  <div className="flex items-center justify-center md:justify-start gap-2.5">
                    <Hash size={16} className="text-[#D4AF37] shrink-0" />
                    <span>Código de Distribuidor: <strong className="font-mono text-[#1A4E26] bg-[#EBF4ED] px-2 py-0.5 rounded border border-[#C8D8CB] font-bold ml-1">{profile.codigo_distribuidor}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {avatarMsg && (
              <div className={`text-xs font-medium pt-1 flex items-center justify-center md:justify-start gap-1.5 ${
                avatarMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {avatarMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{avatarMsg.text}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Bloque Principal: Certificaciones + Atajos (Izquierda) y Formularios uno debajo del otro (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6 sm:pt-8 border-t border-slate-100">
        {/* Columna Izquierda: Mis Certificaciones y Atajos debajo */}
        <div className="lg:col-span-7 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[#111111] font-heading">
                Mis Certificaciones
              </h2>
              <Link
                to="/academia/dashboard/diplomas"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EBF4ED] hover:bg-[#D5E8DB] shadow-2xs text-xs font-bold text-[#1A4E26] transition-all cursor-pointer border-0 shrink-0"
              >
                <span>Ver todas mis certificaciones</span>
                <ChevronRight size={14} />
              </Link>
            </div>

          {/* Línea conectada del Timeline vertical */}
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#C8D8CB]/60 space-y-5">
            {displayCertifications.map((cert: any, idx: number) => {
              const Icon = cert.icon;
              const color = certColors[idx % certColors.length];

              return (
                <div key={cert.id} className="relative group">
                  {/* Nodo circular sobre la línea vertical con color armónico */}
                  <div className={`absolute -left-6 sm:-left-8 top-5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white flex items-center justify-center z-10 ${color.nodeBg} shadow-2xs`}>
                    <div className={`w-2 h-2 rounded-full ${color.nodeDot}`} />
                  </div>

                  {/* Tarjeta de Certificación con contenedor de color SIN contorno */}
                  <div className={`${color.cardBg} rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-0`}>
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <Icon size={24} className={`${color.iconColor} shrink-0`} />
                      
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1A4E26] transition-colors truncate">
                          {cert.title}
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {cert.description}
                        </p>
                        <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                          {cert.modules}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${color.badgeText} bg-white shadow-2xs`}>
                        Certificado
                      </span>

                      <Link
                        to={cert.link}
                        className="w-8 h-8 rounded-full bg-white hover:bg-[#1A4E26] hover:text-white flex items-center justify-center text-slate-500 transition-colors shadow-2xs cursor-pointer"
                        title="Ver credencial"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </section>

          {/* Bloque 2: Atajos del Campus colocados DEBAJO de las Certificaciones */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xl font-black text-[#111111] font-heading">
              Atajos del Campus
            </h2>

          <div className="space-y-3">
            {/* Atajo 1: Diplomas y Certificaciones (Contenedor de color sin contorno con icono libre) */}
            <Link
              to="/academia/dashboard/diplomas"
              className="bg-gradient-to-r from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2] rounded-2xl p-4 flex items-center justify-between gap-4 hover:shadow-xs transition-all duration-200 group border-0"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Award size={26} className="text-[#92400E] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#5B3407] group-hover:text-[#1A4E26] transition-colors truncate">
                    Mis Certificaciones y Diplomas Oficiales
                  </p>
                  <p className="text-xs text-[#7C4C18]/90 truncate">
                    Tienes {diplomasCount} {diplomasCount === 1 ? 'diploma oficial' : 'diplomas oficiales'} verificables
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-[#92400E] hidden sm:inline">Ver Diplomas</span>
                <ChevronRight size={18} className="text-[#92400E] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* Atajo 2: Mis Cursos Activos (Contenedor de color sin contorno con icono libre) */}
            <Link
              to="/academia/dashboard/cursos"
              className="bg-gradient-to-r from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB] rounded-2xl p-4 flex items-center justify-between gap-4 hover:shadow-xs transition-all duration-200 group border-0"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <BookOpen size={26} className="text-[#1A4E26] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#12361B] group-hover:text-[#1A4E26] transition-colors truncate">
                    Mis Cursos en Progreso
                  </p>
                  <p className="text-xs text-[#2D5A37]/90 truncate">
                    {activeCoursesCount} {activeCoursesCount === 1 ? 'asignatura activa' : 'asignaturas activas'} para continuar hoy
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-[#1A4E26] hidden sm:inline">Continuar</span>
                <ChevronRight size={18} className="text-[#1A4E26] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* Atajo 3: Catálogo General (Contenedor de color sin contorno con icono libre) */}
            <Link
              to="/academia/dashboard/explorar"
              className="bg-gradient-to-r from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB] rounded-2xl p-4 flex items-center justify-between gap-4 hover:shadow-xs transition-all duration-200 group border-0"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Sparkles size={26} className="text-[#1E3A5F] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#102D3E] group-hover:text-[#1A4E26] transition-colors truncate">
                    Explorar Nuevos Cursos
                  </p>
                  <p className="text-xs text-[#2C526A]/90 truncate">
                    Programas en biomedicina ancestral, salud y liderazgo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-[#1E3A5F] hidden sm:inline">Explorar</span>
                <ChevronRight size={18} className="text-[#1E3A5F] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </div>
          </section>
        </div>

        {/* Columna Derecha: Contenedores uno debajo del otro al lado de mis certificaciones */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tarjeta 1: Datos de Contacto (Contenedor de color sin contorno) */}
        <section className="bg-[#EBF4ED] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 border-0">
          <div className="flex items-center gap-2.5">
            <MapPin size={20} className="text-[#1A4E26] shrink-0" />
            <div>
              <h3 className="font-heading font-black text-sm text-[#111111]">
                Datos de Contacto
              </h3>
              <p className="text-[11px] text-slate-500">
                Actualiza tu información de contacto personal
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 0991234567"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 rounded-xl border-0 focus:ring-1 focus:ring-[#1A4E26] focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Ej. Quito"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 rounded-xl border-0 focus:ring-1 focus:ring-[#1A4E26] focus:outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle o sector"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 rounded-xl border-0 focus:ring-1 focus:ring-[#1A4E26] focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            {profileMsg && (
              <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                profileMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1A4E26] hover:bg-[#143D1E] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {savingProfile ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <span>Guardar Datos de Contacto</span>
              )}
            </button>
          </form>
        </section>

        {/* Tarjeta 2: Seguridad y Contraseña (Contenedor de color ámbar/dorado pastel sin contorno) */}
        <section className="bg-gradient-to-br from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 border-0">
          <div className="flex items-center gap-2.5">
            <Lock size={20} className="text-[#92400E] shrink-0" />
            <div>
              <h3 className="font-heading font-black text-sm text-[#5B3407]">
                Seguridad y Contraseña
              </h3>
              <p className="text-[11px] text-[#7C4C18]/90">
                Actualiza tu clave de acceso periódicamente
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 rounded-xl border-0 shadow-2xs focus:ring-1 focus:ring-amber-600 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 rounded-xl border-0 shadow-2xs focus:ring-1 focus:ring-amber-600 focus:outline-none transition-all"
              />
            </div>

            {passMsg && (
              <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                passMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {passMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{passMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingPass || !newPassword}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1A4E26] hover:bg-[#143D1E] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {savingPass ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Actualizar Contraseña</span>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  </div>
  </div>
);
}
