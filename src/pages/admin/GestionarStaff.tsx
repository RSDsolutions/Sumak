import { useEffect, useMemo, useState } from 'react';
import {
  UserCog, KeyRound, Mail, Pencil, Crown, Shield, Search, AlertCircle,
  CheckCircle2, Eye, EyeOff, AlertTriangle, Loader2, X,
} from 'lucide-react';
import { supabase, callEdgeFunction } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';
import type { Profile, RolUsuario } from '../../lib/types';

type StaffProfile = Pick<
  Profile,
  | 'id'
  | 'codigo_distribuidor'
  | 'username'
  | 'nombre_completo'
  | 'email'
  | 'telefono'
  | 'direccion'
  | 'ciudad'
  | 'rol'
  | 'estado'
  | 'fecha_registro'
>;

interface ProfilePatch {
  nombre_completo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
}

interface StaffUpdateResponse {
  ok: boolean;
  updated?: { password?: boolean; email?: boolean; profile?: boolean };
}

const ROLE_BADGE: Record<RolUsuario, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
  admin: {
    bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/40',
    label: 'Admin', icon: <Crown size={11} />,
  },
  operaciones: {
    bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200',
    label: 'Operaciones', icon: <Shield size={11} />,
  },
  distribuidor: {
    bg: 'bg-[#F4F7F5]', text: 'text-[#6B7280]', border: 'border-[#C8D8CB]',
    label: 'Distribuidor', icon: null,
  },
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal: cambiar contrasena
// ─────────────────────────────────────────────────────────────
function ChangePasswordModal({
  open,
  target,
  isSelf,
  onClose,
  onSuccess,
}: {
  open: boolean;
  target: StaffProfile | null;
  isSelf: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('form');
      setPwd('');
      setPwdConfirm('');
      setShowPwd(false);
      setError(null);
      setSaving(false);
    }
  }, [open, target?.id]);

  if (!target) return null;

  const tooShort = pwd.length > 0 && pwd.length < 8;
  const mismatch = pwd.length > 0 && pwdConfirm.length > 0 && pwd !== pwdConfirm;
  const canSubmit = pwd.length >= 8 && pwd === pwdConfirm;

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      if (tooShort) setError('La contrasena debe tener al menos 8 caracteres.');
      else if (mismatch) setError('Las contrasenas no coinciden.');
      else setError('Completa ambos campos.');
      return;
    }
    setStep('confirm');
  }

  async function handleConfirm() {
    if (!canSubmit || !target) return;
    setSaving(true);
    setError(null);
    try {
      await callEdgeFunction<StaffUpdateResponse>('admin-staff-update', {
        target_user_id: target.id,
        new_password: pwd,
      });
      toast.success(
        isSelf
          ? 'Tu contraseña fue actualizada.'
          : `Contraseña de ${target.nombre_completo ?? target.email} actualizada.`,
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña.');
      setStep('form');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Cambiar contraseña"
      subtitle={target.nombre_completo ?? target.email}
      size="md"
      closeOnBackdrop={!saving}
      showClose={!saving}
      labelledById="staff-change-pwd-title"
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmitForm} className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800 text-xs leading-relaxed">
              {isSelf ? (
                <>Vas a cambiar <strong>tu propia contraseña</strong>. Tu sesión actual seguirá activa, pero deberás usar la nueva contraseña al volver a iniciar sesión.</>
              ) : (
                <>Vas a cambiar la contraseña de <strong>{target.nombre_completo ?? target.email}</strong>. Avísale por un canal seguro — esta contraseña no se enviará automáticamente.</>
              )}
            </p>
          </div>

          <div>
            <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
              Nueva contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
                autoFocus
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 pr-11 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111111] transition-colors"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {tooShort && (
              <p className="text-red-600 text-[11px] mt-1.5 flex items-center gap-1">
                <AlertCircle size={11} /> Necesita al menos 8 caracteres.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              required
              className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
            />
            {mismatch && (
              <p className="text-red-600 text-[11px] mt-1.5 flex items-center gap-1">
                <AlertCircle size={11} /> Las contraseñas no coinciden.
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-[1.5] py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] disabled:opacity-50 transition-all"
            >
              Continuar
            </button>
          </div>
        </form>
      ) : (
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="text-red-800 text-xs leading-relaxed">
              <p className="font-bold mb-1">Confirmá que querés cambiar la contraseña</p>
              <p>
                {isSelf
                  ? 'Es tu propia cuenta. Tu sesión actual seguirá activa.'
                  : `${target.nombre_completo ?? target.email} (${target.rol === 'admin' ? 'admin' : 'operaciones'}) no podrá entrar con su contraseña anterior. Asegurate de avisarle.`}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="flex-[1.5] py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Aplicando…
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  Confirmar cambio
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal: editar perfil + email
// ─────────────────────────────────────────────────────────────
function EditProfileModal({
  open,
  target,
  onClose,
  onSuccess,
}: {
  open: boolean;
  target: StaffProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && target) {
      setNombre(target.nombre_completo ?? '');
      setEmail(target.email ?? '');
      setTelefono(target.telefono ?? '');
      setDireccion(target.direccion ?? '');
      setCiudad(target.ciudad ?? '');
      setError(null);
      setSaving(false);
    }
  }, [open, target]);

  if (!target) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setError(null);

    const nombreTrim = nombre.trim();
    const emailTrim = email.trim().toLowerCase();
    if (nombreTrim.length < 3) {
      setError('El nombre completo debe tener al menos 3 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setError('Email invalido.');
      return;
    }

    const profilePatch: ProfilePatch = {};
    if (nombreTrim !== (target.nombre_completo ?? '')) profilePatch.nombre_completo = nombreTrim;
    if (telefono.trim() !== (target.telefono ?? '')) profilePatch.telefono = telefono.trim() || null;
    if (direccion.trim() !== (target.direccion ?? '')) profilePatch.direccion = direccion.trim() || null;
    if (ciudad.trim() !== (target.ciudad ?? '')) profilePatch.ciudad = ciudad.trim() || null;
    const emailChanged = emailTrim !== (target.email ?? '').toLowerCase();

    if (Object.keys(profilePatch).length === 0 && !emailChanged) {
      setError('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { target_user_id: target.id };
      if (Object.keys(profilePatch).length > 0) payload.profile = profilePatch;
      if (emailChanged) payload.new_email = emailTrim;

      await callEdgeFunction<StaffUpdateResponse>('admin-staff-update', payload);
      toast.success('Perfil actualizado.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Editar perfil"
      subtitle={`${ROLE_BADGE[target.rol].label} · ${target.codigo_distribuidor ?? target.id.slice(0, 8)}`}
      size="md"
      closeOnBackdrop={!saving}
      showClose={!saving}
      labelledById="staff-edit-profile-title"
    >
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Mail size={11} /> Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
          <p className="text-[#9CA3AF] text-[11px] mt-1.5 leading-relaxed">
            Cambiar el email también cambia las credenciales de acceso del usuario.
          </p>
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
              className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26] transition-colors"
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
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[1.5] py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────
export default function GestionarStaff() {
  const { user, isAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState<'todos' | 'admin' | 'operaciones'>('todos');

  const [pwdTarget, setPwdTarget] = useState<StaffProfile | null>(null);
  const [editTarget, setEditTarget] = useState<StaffProfile | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, codigo_distribuidor, username, nombre_completo, email, telefono, direccion, ciudad, rol, estado, fecha_registro')
        .in('rol', ['admin', 'operaciones'])
        .order('rol', { ascending: true })
        .order('nombre_completo', { ascending: true });
      if (error) throw error;
      setStaff((data ?? []) as StaffProfile[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = staff;
    if (rolFilter !== 'todos') list = list.filter((s) => s.rol === rolFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((s) =>
        (s.nombre_completo ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.username ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [staff, rolFilter, search]);

  if (!isAdmin) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-600" />
        <h2 className="font-heading font-bold text-lg text-[#111111] mb-1">Acceso restringido</h2>
        <p className="text-[#6B7280] text-sm">Solo el administrador puede gestionar al personal interno.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
          <UserCog size={24} className="text-[#1A4E26]" />
          Gestionar Personal
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          Administra contraseñas, email y datos de los usuarios admin y operaciones del sistema.
        </p>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-amber-800 text-xs leading-relaxed">
          <p className="font-bold mb-0.5">Operación crítica</p>
          <p>
            Cambiar la contraseña o el email afecta el acceso del usuario al sistema. Comunícalo por un canal seguro.
            Esta vista no permite gestionar distribuidores — sus credenciales se manejan por separado.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(['todos', 'admin', 'operaciones'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRolFilter(r)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all border ${
                rolFilter === r
                  ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                  : 'bg-white text-[#6B7280] border-[#C8D8CB] hover:border-[#A8C2AD]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o usuario..."
            className="w-full pl-9 pr-3 py-2 bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl text-xs text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
          />
        </div>
        {(search || rolFilter !== 'todos') && (
          <button
            onClick={() => { setSearch(''); setRolFilter('todos'); }}
            className="text-xs text-[#6B7280] hover:text-[#111111] underline flex items-center gap-1"
          >
            <X size={11} /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <UserCog size={40} className="mx-auto mb-3 text-[#9CA3AF] opacity-30" />
            <p className="text-lg font-bold mb-1 text-[#111111]">Sin resultados</p>
            <p className="text-sm">No hay usuarios staff con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Usuario', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const isSelf = s.id === user?.id;
                  const role = ROLE_BADGE[s.rol];
                  return (
                    <tr key={s.id} className="border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[#111111] text-xs font-bold flex items-center gap-1.5">
                          {s.nombre_completo ?? <span className="text-[#9CA3AF] italic">Sin nombre</span>}
                          {isSelf && (
                            <span className="text-[10px] font-bold text-[#1A4E26] bg-[#EBF4ED] border border-[#1A4E26]/30 rounded-full px-1.5 py-0.5">
                              Tú
                            </span>
                          )}
                        </p>
                        {s.username && (
                          <p className="text-[#6B7280] text-[10px]">@{s.username}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#6B7280] text-xs whitespace-nowrap">{s.email}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${role.bg} ${role.text} ${role.border}`}>
                          {role.icon}
                          {role.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          s.estado === 'activo'
                            ? 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setEditTarget(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#C8D8CB] text-[#111111] text-[11px] font-bold hover:border-[#1A4E26] transition-colors"
                          >
                            <Pencil size={12} /> Editar perfil
                          </button>
                          <button
                            onClick={() => setPwdTarget(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A4E26] text-white text-[11px] font-bold hover:bg-[#163F1E] transition-all"
                          >
                            <KeyRound size={12} /> Cambiar contraseña
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-3 text-center text-[10px] text-[#9CA3AF]">
          Mostrando <strong>{filtered.length}</strong> de {staff.length} usuarios staff
        </div>
      )}

      <ChangePasswordModal
        open={!!pwdTarget}
        target={pwdTarget}
        isSelf={pwdTarget?.id === user?.id}
        onClose={() => setPwdTarget(null)}
        onSuccess={load}
      />
      <EditProfileModal
        open={!!editTarget}
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={load}
      />
    </div>
  );
}
