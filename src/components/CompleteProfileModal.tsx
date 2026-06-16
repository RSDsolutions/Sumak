import { useState } from 'react';
import { UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isProfileIncomplete } from '../lib/profile';
import { explicarCedulaInvalida } from '../lib/validators';

/**
 * Modal forzoso al primer login de un distribuidor seedeado (mig 023).
 * Aparece automáticamente cuando el profile no tiene nombre_completo o cedula
 * y bloquea el dashboard hasta que el usuario complete los datos faltantes.
 */
export default function CompleteProfileModal() {
  const { user, profile, refreshProfile } = useAuth();

  const [nombre, setNombre] = useState(profile?.nombre_completo ?? '');
  const [cedula, setCedula] = useState(profile?.cedula ?? '');
  const [telefono, setTelefono] = useState(profile?.telefono ?? '');
  const [direccion, setDireccion] = useState(profile?.direccion ?? '');
  const [ciudad, setCiudad] = useState(profile?.ciudad ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = !!profile && isProfileIncomplete(profile);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setError(null);

    const nombreTrim = nombre.trim();
    const cedulaTrim = cedula.trim();

    if (nombreTrim.length < 3) {
      setError('Ingresa tu nombre completo (mínimo 3 caracteres).');
      return;
    }
    const cedulaError = explicarCedulaInvalida(cedulaTrim);
    if (!cedulaTrim) {
      setError('La cédula es obligatoria.');
      return;
    }
    if (cedulaError) {
      setError(cedulaError);
      return;
    }

    setSaving(true);
    const update: Record<string, string | null> = {
      nombre_completo: nombreTrim,
      cedula: cedulaTrim,
    };
    if (telefono.trim()) update.telefono = telefono.trim();
    if (direccion.trim()) update.direccion = direccion.trim();
    if (ciudad.trim()) update.ciudad = ciudad.trim();

    const { error: dbError } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', user.id);

    if (dbError) {
      // 23505 = unique_violation (cedula duplicada)
      if (dbError.code === '23505' || /duplicate|unique/i.test(dbError.message)) {
        setError('Esa cédula ya está registrada en otro distribuidor.');
      } else {
        setError('No pudimos guardar tus datos: ' + dbError.message);
      }
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
  }

  return (
    <Modal
      open={open}
      onClose={() => { /* no-op: bloqueado hasta completar */ }}
      title="Completa tu perfil"
      subtitle="Necesitamos algunos datos para activar tu cuenta de distribuidor"
      size="md"
      closeOnBackdrop={false}
      showClose={false}
      labelledById="complete-profile-title"
    >
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div className="flex items-start gap-3 bg-[#FFF8E6] border border-amber-200 rounded-xl px-4 py-3">
          <UserCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">
            Tu cuenta fue precargada por el equipo SUMAK. Para continuar,
            confirma tu <strong>nombre completo</strong> y tu <strong>cédula</strong>.
            Los datos de contacto son opcionales pero recomendados.
          </p>
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan Pérez Andrade"
            required
            autoFocus
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
            Cédula <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10 dígitos"
            maxLength={10}
            required
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-60 transition-all duration-200 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
        >
          {saving ? (
            'Guardando...'
          ) : (
            <>
              <CheckCircle2 size={16} /> Guardar y continuar
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
