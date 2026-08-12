import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Camera, Loader2, QrCode, HelpCircle, Compass } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Avatar from '../../components/Avatar';
import DigitalCardModal from '../../components/DigitalCardModal';
import ProfileTour from '../../components/ProfileTour';

const paqueteLabel: Record<string, string> = {
  basico: 'Básico ($125)',
  emprendedor: 'Emprendedor ($225)',
  lider: 'Líder ($525)',
};

const AVATAR_BUCKET = 'avatares';
const AVATAR_MAX_MB = 3;
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function MiPerfil() {
  const { profile, user, refreshProfile, resetOnboarding } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const [telefono, setTelefono] = useState(profile?.telefono ?? '');
  const [direccion, setDireccion] = useState(profile?.direccion ?? '');
  const [ciudad, setCiudad] = useState(profile?.ciudad ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
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
        setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente.' });
      }
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
        setPassMsg({ type: 'success', text: 'Contraseña cambiada exitosamente.' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSavingPass(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      setAvatarMsg({ type: 'error', text: 'Formato no soportado. Usa JPG, PNG o WEBP.' });
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
      setAvatarMsg({ type: 'success', text: 'Foto de perfil actualizada.' });
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al subir la foto.' });
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!profile) return null;

  const paqueteBadgeClass = profile.paquete === 'lider'
    ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30'
    : profile.paquete === 'emprendedor'
    ? 'text-[#1A4E26] bg-[#EBF4ED] border-[#1A4E26]/30'
    : 'text-[#6B7280] bg-[#F4F7F5] border-[#C8D8CB]';

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Mi Perfil</h1>
        <p className="text-[#6B7280] text-sm mt-1">Gestiona tu información personal y credenciales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile info — non-editable */}
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
          <div data-tour="perfil-avatar-info" className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar profile={profile} size={64} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Cambiar foto de perfil"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1A4E26] text-white flex items-center justify-center border-2 border-white shadow-sm hover:bg-[#163F1E] disabled:opacity-60 transition-colors"
              >
                {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_MIME_TYPES.join(',')}
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-[#111111]">Información Personal</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-[#9CA3AF] text-xs">Toca el ícono para cambiar tu foto (JPG, PNG o WEBP, máx. {AVATAR_MAX_MB} MB)</p>
                <button
                  type="button"
                  data-tour="perfil-tarjeta-qr"
                  onClick={() => setShowCardModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EBF4ED] text-[#1A4E26] hover:bg-[#1A4E26] hover:text-white border border-[#1A4E26]/30 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Generar Tarjeta Digital QR"
                >
                  <QrCode size={14} className="shrink-0" />
                  <span>Tarjeta Digital QR</span>
                </button>
              </div>
            </div>
          </div>

          {avatarMsg && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-4 ${
              avatarMsg.type === 'success'
                ? 'bg-[#EBF4ED] border border-[#1A4E26]/30 text-[#1A4E26]'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {avatarMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {avatarMsg.text}
            </div>
          )}

          <dl className="space-y-4 mb-6">
            {[
              { label: 'Nombre Completo', value: profile.nombre_completo ?? 'Pendiente — completar', tourId: undefined },
              { label: 'Usuario', value: profile.username ? `@${profile.username}` : '—', tourId: undefined },
              { label: 'Cédula', value: profile.cedula ?? 'Pendiente — completar', tourId: undefined },
              { label: 'Email', value: profile.email, tourId: undefined },
              { label: 'Código Distribuidor', value: profile.codigo_distribuidor ?? '—', tourId: 'perfil-codigo-distribuidor' },
            ].map(({ label, value, tourId }) => (
              <div key={label} data-tour={tourId}>
                <dt className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-[#111111] text-sm bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${paqueteBadgeClass}`}>
              {profile.paquete ? paqueteLabel[profile.paquete] : '—'}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border capitalize ${
              profile.estado === 'activo'
                ? 'text-[#1A4E26] bg-[#EBF4ED] border-[#1A4E26]/30'
                : 'text-red-600 bg-red-50 border-red-200'
            }`}>
              {profile.estado}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-[#C8D8CB] text-[#9CA3AF] text-xs space-y-1">
            <p>Registro: {new Date(profile.fecha_registro).toLocaleDateString('es-EC')}</p>
            {profile.fecha_aprobacion && (
              <p>Aprobación: {new Date(profile.fecha_aprobacion).toLocaleDateString('es-EC')}</p>
            )}
            {profile.codigo_patrocinador && (
              <p>Patrocinador: {profile.codigo_patrocinador}</p>
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-6">
          <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
            <h2 className="font-heading font-semibold text-[#111111] mb-5">Editar Datos de Contacto</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="09XXXXXXXX"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Av. Principal 123"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Babahoyo"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                />
              </div>

              {profileMsg && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                  profileMsg.type === 'success'
                    ? 'bg-[#EBF4ED] border border-[#1A4E26]/30 text-[#1A4E26]'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {profileMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-60 transition-all duration-200 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
              >
                {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#1A4E26]/10 rounded-xl flex items-center justify-center">
                <Lock size={20} className="text-[#1A4E26]" />
              </div>
              <h2 className="font-heading font-semibold text-[#111111]">Cambiar Contraseña</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                />
              </div>

              {passMsg && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                  passMsg.type === 'success'
                    ? 'bg-[#EBF4ED] border border-[#1A4E26]/30 text-[#1A4E26]'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {passMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {passMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={savingPass}
                className="w-full py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-60 transition-all duration-200 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
              >
                {savingPass ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>

          {/* Ayuda y Tour Guiado */}
          <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
                <HelpCircle size={18} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#111111]">Tour Guiado del Panel</h3>
                <p className="text-xs text-[#6B7280]">Repasa las funciones clave de tu plataforma</p>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
              ¿Quieres volver a ver la guía interactiva para conocer cómo funcionan la tienda, tu red y tus comisiones?
            </p>
            <button
              type="button"
              onClick={async () => {
                await resetOnboarding();
                navigate('/dashboard');
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-[#1A4E26] text-[#1A4E26] hover:bg-[#EBF4ED] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Compass size={15} />
              <span>Reiniciar Tour de Bienvenida</span>
            </button>
          </div>
        </div>
      </div>

      <DigitalCardModal 
        open={showCardModal} 
        onClose={() => setShowCardModal(false)} 
        profile={profile} 
      />

      <ProfileTour />
    </div>
  );
}
