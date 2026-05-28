import { useState } from 'react';
import { User, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const paqueteLabel: Record<string, string> = {
  basico: 'Básico ($125)',
  emprendedor: 'Emprendedor ($225)',
  lider: 'Líder ($525)',
};

export default function MiPerfil() {
  const { profile, user } = useAuth();

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

  if (!profile) return null;

  const paqueteBadgeClass = profile.paquete === 'lider'
    ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30'
    : profile.paquete === 'emprendedor'
    ? 'text-[#00A86B] bg-[#00A86B]/10 border-[#00A86B]/30'
    : 'text-[#AAAAAA] bg-[#555555]/10 border-[#555555]/30';

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Mi Perfil</h1>
        <p className="text-[#888888] text-sm mt-1">Gestiona tu información personal y credenciales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile info — non-editable */}
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#00A86B]/10 rounded-xl flex items-center justify-center">
              <User size={20} className="text-[#00A86B]" />
            </div>
            <h2 className="font-heading font-semibold text-[#F0F0F0]">Información Personal</h2>
          </div>

          <dl className="space-y-4 mb-6">
            {[
              { label: 'Nombre Completo', value: profile.nombre_completo },
              { label: 'Cédula', value: profile.cedula },
              { label: 'Email', value: profile.email },
              { label: 'Código Distribuidor', value: profile.codigo_distribuidor ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-[#F0F0F0] text-sm bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3">
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
                ? 'text-[#00A86B] bg-[#00A86B]/10 border-[#00A86B]/30'
                : 'text-red-400 bg-red-500/10 border-red-500/30'
            }`}>
              {profile.estado}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2E2E2E] text-[#888888] text-xs space-y-1">
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
          <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-[#F0F0F0] mb-5">Editar Datos de Contacto</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="09XXXXXXXX"
                  className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Av. Principal 123"
                  className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Babahoyo"
                  className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors"
                />
              </div>

              {profileMsg && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                  profileMsg.type === 'success'
                    ? 'bg-[#00A86B]/10 border border-[#00A86B]/30 text-[#00A86B]'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {profileMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] disabled:opacity-60 transition-all duration-200"
              >
                {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#00A86B]/10 rounded-xl flex items-center justify-center">
                <Lock size={20} className="text-[#00A86B]" />
              </div>
              <h2 className="font-heading font-semibold text-[#F0F0F0]">Cambiar Contraseña</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="w-full bg-[#222222] border border-[#2E2E2E] rounded-xl px-4 py-3 text-[#F0F0F0] text-sm placeholder-[#555555] focus:outline-none focus:border-[#00A86B] transition-colors"
                />
              </div>

              {passMsg && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                  passMsg.type === 'success'
                    ? 'bg-[#00A86B]/10 border border-[#00A86B]/30 text-[#00A86B]'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {passMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {passMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={savingPass}
                className="w-full py-3 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] disabled:opacity-60 transition-all duration-200"
              >
                {savingPass ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
