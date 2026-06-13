import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, XCircle, ExternalLink, Copy } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAdminBasePath } from '../../lib/useAdminBasePath';
import type { Afiliacion } from '../../lib/types';

// Tanda 6: las tablas PAQUETE_PUNTOS/PAQUETE_PRECIOS y la cadena
// upline ya no se calculan aquí — todo lo hace la RPC server-side
// public.finish_approve_afiliacion. Los números (125/225/525) están
// replicados en el SQL de la RPC; cuando se cambien, hay que actualizar
// la RPC también (migración 008 o posterior).

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
    aprobada: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
    rechazada: 'bg-red-50 text-red-600 border border-red-200',
  };
  return map[estado] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

const paqueteKeyFull: Record<string, string> = {
  basico: 'Básico ($125)',
  emprendedor: 'Emprendedor ($225)',
  lider: 'Líder ($525)',
};

// SEC-005: contraseña temporal con entropía criptográfica.
// Evita el patrón predecible "Sumak{4 últimos dígitos cédula}!"
// que era trivial de adivinar conociendo la cédula del usuario.
function generateTempPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += charset[b % charset.length];
  return 'Sumak' + s + '!';
}

interface ApproveModalProps {
  afiliacion: Afiliacion;
  onClose: () => void;
  onSuccess: (code: string, tempPassword: string) => void;
}

interface DistribuidorOption {
  id: string;
  codigo_distribuidor: string;
  nombre_completo: string;
  rol: string;
}

function ApproveModal({ afiliacion, onClose, onSuccess }: ApproveModalProps) {
  const [padreProfileId, setPadreProfileId] = useState('');
  const [distribuidores, setDistribuidores] = useState<DistribuidorOption[]>([]);
  const [adminProfile, setAdminProfile] = useState<DistribuidorOption | null>(null);
  const [referidoProfile, setReferidoProfile] = useState<DistribuidorOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDist, setLoadingDist] = useState(true);
  const [error, setError] = useState('');
  // BIZ: ahora cualquier distribuidor puede tener N frontales (no solo el admin).
  // Si el admin marca esta opcion, el nuevo nodo se coloca como frontal
  // (posicion=NULL) en vez de ocupar izquierda o derecha del binario estricto.
  const [abrirComoFrontal, setAbrirComoFrontal] = useState(false);

  // Load existing distributors for the dropdown and auto-suggest placement
  useEffect(() => {
    supabaseAdmin
      .from('profiles')
      .select('id, codigo_distribuidor, nombre_completo, rol')
      .order('codigo_distribuidor', { ascending: true })
      .then(({ data }) => {
        const list = (data as DistribuidorOption[]) ?? [];
        setDistribuidores(list);
        const admin = list.find((d) => d.rol === 'admin') ?? null;
        setAdminProfile(admin);

        // Auto-suggest placement based on declared codigo_patrocinador
        let suggested: DistribuidorOption | null = null;
        if (afiliacion.codigo_patrocinador) {
          suggested = list.find((d) => d.codigo_distribuidor === afiliacion.codigo_patrocinador) ?? null;
          setReferidoProfile(suggested);
        }
        // Fallback: admin
        const initial = suggested ?? admin;
        if (initial) setPadreProfileId(initial.id);

        setLoadingDist(false);
      });
  }, [afiliacion.codigo_patrocinador]);

  async function handleApprove() {
    setLoading(true);
    setError('');
    try {
      // 0. Pre-check: no puede existir ya un profile con esta cedula o email.
      // Sin esto el flujo crea el auth.user, intenta insertar el profile y
      // explota con "profiles_cedula_key", dejando un auth.user huerfano.
      const { data: existingByCedula } = await supabaseAdmin
        .from('profiles')
        .select('id, codigo_distribuidor, nombre_completo, email, estado')
        .eq('cedula', afiliacion.cedula)
        .maybeSingle();
      if (existingByCedula) {
        setError(
          `Ya existe un distribuidor con la cédula ${afiliacion.cedula}: ` +
          `${existingByCedula.codigo_distribuidor} — ${existingByCedula.nombre_completo} ` +
          `(${existingByCedula.email}, estado: ${existingByCedula.estado}). ` +
          `Si fue un intento de aprobación previo que falló a medias, elimina ese ` +
          `perfil desde "Distribuidores" antes de reintentar. Si la persona ya está ` +
          `afiliada, rechaza esta solicitud.`
        );
        return;
      }

      const { data: existingByEmail } = await supabaseAdmin
        .from('profiles')
        .select('id, codigo_distribuidor, nombre_completo, cedula')
        .eq('email', afiliacion.email)
        .maybeSingle();
      if (existingByEmail) {
        setError(
          `Ya existe un distribuidor con el email ${afiliacion.email}: ` +
          `${existingByEmail.codigo_distribuidor} — ${existingByEmail.nombre_completo} ` +
          `(cédula ${existingByEmail.cedula}). El afiliado debe usar otro email, ` +
          `o elimina el perfil existente desde "Distribuidores".`
        );
        return;
      }

      // ── 1. Generar código distribuidor ──
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      const nextNum = (count ?? 0) + 1;
      const codigo = `SUMAK-${String(nextNum).padStart(5, '0')}`;

      // ── 2. Generar contraseña temporal (SEC-005: crypto-random) ──
      const tempPassword = generateTempPassword();

      // ── 3. Crear auth.user ──
      // Es el único paso que requiere supabaseAdmin (no hay equivalente
      // en SQL nativo de Supabase Auth). El resto va por la RPC atómica.
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: afiliacion.email,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        setError('Error al crear usuario: ' + (authError?.message ?? 'desconocido'));
        return;
      }

      const userId = authData.user.id;

      // ── 4. Llamar a la RPC atómica ──
      // Tanda 6 (SEC-002 + ARQ-001 + ARQ-002): la RPC corre en una sola
      // transacción server-side:
      //   • Inserta profile con todos los campos correctos
      //   • Resuelve patrocinador del código declarado (o admin si no)
      //   • Inserta nodo en red_binaria con posición auto-asignada
      //     (izq/der, o frontal si abrirComoFrontal=true / padre es admin)
      //   • Marca afiliación como aprobada
      //   • Crea pedido inicial procesado + items del paquete
      //   • Crea comisión de referido 40% para el patrocinador
      //   • Crea comisiones por nivel hasta 14 niveles a upline calificado
      // Si cualquier paso falla, NADA se persiste (rollback automático).
      //
      // Si falla la RPC, hacemos rollback del auth.user para no dejar
      // huérfanos que bloquearían reintentos.
      const padrePerfil = padreProfileId || null;
      // Migration 011: usamos el wrapper approve_afiliacion que valida
      // que el caller sea admin. finish_approve_afiliacion ya no esta
      // accesible para 'authenticated' directamente.
      const { data: rpcResult, error: rpcError } = await supabase.rpc('approve_afiliacion', {
        p_afiliacion_id: afiliacion.id,
        p_user_id: userId,
        p_codigo: codigo,
        p_padre_profile_id: padrePerfil,
        p_abrir_como_frontal: abrirComoFrontal,
      });

      if (rpcError) {
        // Rollback best-effort: borramos el auth.user creado en el paso 3.
        await supabaseAdmin.auth.admin.deleteUser(userId).catch((cleanupErr) => {
          logger.error('No se pudo limpiar auth.user huérfano tras fallar RPC', cleanupErr);
        });
        const codeStr = rpcError.code ? `[${rpcError.code}] ` : '';
        setError(
          `${codeStr}${rpcError.message ?? 'Error desconocido al aprobar afiliación.'} ` +
          'El sistema revirtió todos los cambios. Revisa los datos y reintenta.'
        );
        return;
      }

      // La RPC devuelve { ok, codigo, pedido_id }
      const result = rpcResult as { ok?: boolean; codigo?: string; pedido_id?: string } | null;
      if (!result?.ok) {
        await supabaseAdmin.auth.admin.deleteUser(userId).catch((cleanupErr) => {
          logger.error('No se pudo limpiar auth.user huérfano', cleanupErr);
        });
        setError('La aprobación no se completó. Reintenta.');
        return;
      }

      onSuccess(codigo, tempPassword);
    } catch (err) {
      logger.error('handleApprove unexpected error', err);
      setError(err instanceof Error ? err.message : 'Error inesperado. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-heading font-bold text-lg text-[#111111] mb-4">Aprobar Solicitud</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Patrocinador declarado (sponsor de comisión por referido) */}
        <div className="mb-4 bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl px-4 py-3">
          <p className="text-[#1A4E26] text-xs font-bold uppercase tracking-wider mb-1.5">
            Patrocinador (comisión por referido)
          </p>
          {referidoProfile ? (
            <div>
              <p className="text-[#111111] text-sm font-semibold">{referidoProfile.nombre_completo}</p>
              <p className="text-[#1A4E26] text-xs font-mono mt-0.5">{referidoProfile.codigo_distribuidor}</p>
            </div>
          ) : afiliacion.codigo_patrocinador ? (
            <p className="text-amber-700 text-sm">
              Código declarado: <strong>{afiliacion.codigo_patrocinador}</strong> (no encontrado en la red — la comisión por referido irá al admin)
            </p>
          ) : (
            <p className="text-[#6B7280] text-sm">
              El afiliado no declaró patrocinador — la comisión por referido (40%) irá al admin.
            </p>
          )}
        </div>

        {/* Ubicación en la red binaria */}
        <div className="mb-4">
          <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
            Ubicar en la red binaria (puede diferir del patrocinador)
          </label>
          <select
            value={padreProfileId}
            onChange={(e) => setPadreProfileId(e.target.value)}
            disabled={loadingDist}
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26] transition-colors appearance-none"
          >
            {distribuidores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.rol === 'admin' ? '★ ' : ''}{d.codigo_distribuidor} — {d.nombre_completo}{d.rol === 'admin' ? ' (Admin)' : ''}
              </option>
            ))}
          </select>
          <p className="text-[#9CA3AF] text-xs mt-1.5">
            {referidoProfile
              ? `Sugerido: bajo ${referidoProfile.codigo_distribuidor} (su patrocinador). Puedes reubicarlo si lo necesitas.`
              : 'Sugerido: bajo el admin como frontal directo.'}
          </p>
        </div>

        {/* Checkbox: abrir como frontal nuevo (cualquier distribuidor puede) */}
        {padreProfileId && distribuidores.find((d) => d.id === padreProfileId)?.rol !== 'admin' && (
          <div className="mb-4">
            <label className="flex items-start gap-3 cursor-pointer bg-[#FFFDF0] border border-[#D4AF37]/40 rounded-xl px-4 py-3 hover:bg-[#FFFCE5] transition-colors">
              <input
                type="checkbox"
                checked={abrirComoFrontal}
                onChange={(e) => setAbrirComoFrontal(e.target.checked)}
                className="mt-0.5 accent-[#D4AF37]"
              />
              <div>
                <p className="text-[#92680A] text-sm font-bold">
                  Abrir como frontal nuevo bajo este distribuidor
                </p>
                <p className="text-[#6B7280] text-xs mt-0.5 leading-relaxed">
                  En lugar de ocupar izquierda o derecha del binario, el nuevo afiliado se cuelga
                  como un frontal directo. El padre puede tener N frontales en paralelo, igual
                  que el admin. Útil cuando ambas posiciones ya están ocupadas o el padre quiere
                  organizar su red en múltiples ramas.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Posición auto-asignada */}
        <div className="mb-6 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3">
          <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1">Posición en la red</p>
          {!padreProfileId ? (
            <p className="text-[#9CA3AF] text-sm">Selecciona un partner para ver la posición</p>
          ) : distribuidores.find((d) => d.id === padreProfileId)?.rol === 'admin' ? (
            <p className="text-[#1A4E26] text-sm font-medium">Frontal directo del admin (sin posición izq/der)</p>
          ) : abrirComoFrontal ? (
            <p className="text-[#92680A] text-sm font-medium">⭐ Frontal nuevo del distribuidor (sin posición izq/der)</p>
          ) : (
            <p className="text-[#1A4E26] text-sm font-medium">Se asigna automáticamente: Izquierda si libre, Derecha si no</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            disabled={loading || loadingDist}
            className="flex-[2] py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Procesando...' : 'Confirmar Aprobación'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RejectModalProps {
  afiliacionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function RejectModal({ afiliacionId, onClose, onSuccess }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    await supabaseAdmin
      .from('afiliaciones')
      .update({ estado: 'rechazada', notas_admin: reason })
      .eq('id', afiliacionId);
    setLoading(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-heading font-bold text-lg text-[#111111] mb-4">Rechazar Solicitud</h3>
        <div className="mb-4">
          <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
            Motivo del rechazo *
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica el motivo del rechazo..."
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-red-400 transition-colors resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleReject}
            disabled={!reason.trim() || loading}
            className="flex-[2] py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SuccessModalProps {
  codigo: string;
  tempPassword: string;
  onClose: () => void;
}

function SuccessModal({ codigo, tempPassword, onClose }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="bg-white border border-[#1A4E26]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-[#1A4E26]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={28} className="text-[#1A4E26]" />
          </div>
          <h3 className="font-heading font-bold text-xl text-[#111111]">Distribuidor Aprobado</h3>
          <p className="text-[#6B7280] text-sm mt-1">Comparte las credenciales con el nuevo distribuidor</p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-4">
            <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1">Código Distribuidor</p>
            <div className="flex items-center justify-between">
              <p className="text-[#111111] font-mono font-bold text-lg">{codigo}</p>
              <button onClick={() => copy(codigo)} className="text-[#9CA3AF] hover:text-[#1A4E26] transition-colors">
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-4">
            <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1">Contraseña Temporal</p>
            <div className="flex items-center justify-between">
              <p className="text-[#111111] font-mono font-bold text-lg">{tempPassword}</p>
              <button onClick={() => copy(tempPassword)} className="text-[#9CA3AF] hover:text-[#1A4E26] transition-colors">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>

        {copied && <p className="text-center text-[#1A4E26] text-sm mb-3">Copiado al portapapeles</p>}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

export default function SolicitudDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useAdminBasePath();
  const [afiliacion, setAfiliacion] = useState<Afiliacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [successData, setSuccessData] = useState<{ codigo: string; tempPassword: string } | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data } = await supabaseAdmin.from('afiliaciones').select('*').eq('id', id).single();
      if (data) {
        setAfiliacion(data as Afiliacion);
        // Generate signed URLs for documents
        const docs: Record<string, string | null> = {
          doc_cedula_frente: data.doc_cedula_frente,
          doc_cedula_reverso: data.doc_cedula_reverso,
          doc_planilla: data.doc_planilla,
          doc_voucher: data.doc_voucher,
        };
        const urls: Record<string, string> = {};
        for (const [key, path] of Object.entries(docs)) {
          if (path) {
            const { data: signedData } = await supabaseAdmin.storage
              .from('documentos-afiliacion')
              .createSignedUrl(path as string, 3600);
            if (signedData?.signedUrl) urls[key] = signedData.signedUrl;
          }
        }
        setDocUrls(urls);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function handleApproveSuccess(codigo: string, tempPassword: string) {
    setShowApprove(false);
    setSuccessData({ codigo, tempPassword });
    if (afiliacion) setAfiliacion({ ...afiliacion, estado: 'aprobada' });
  }

  function handleRejectSuccess() {
    setShowReject(false);
    if (afiliacion) setAfiliacion({ ...afiliacion, estado: 'rechazada' });
  }

  if (loading) return <Spinner />;
  if (!afiliacion) {
    return (
      <div className="text-center py-20 text-[#6B7280]">
        Solicitud no encontrada.
      </div>
    );
  }

  const docLabels: Record<string, string> = {
    doc_cedula_frente: 'Cédula (frente)',
    doc_cedula_reverso: 'Cédula (reverso)',
    doc_planilla: 'Planilla de servicios',
    doc_voucher: 'Voucher de pago',
  };

  return (
    <div>
      {showApprove && (
        <ApproveModal
          afiliacion={afiliacion}
          onClose={() => setShowApprove(false)}
          onSuccess={handleApproveSuccess}
        />
      )}
      {showReject && (
        <RejectModal
          afiliacionId={afiliacion.id}
          onClose={() => setShowReject(false)}
          onSuccess={handleRejectSuccess}
        />
      )}
      {successData && (
        <SuccessModal
          codigo={successData.codigo}
          tempPassword={successData.tempPassword}
          onClose={() => { setSuccessData(null); navigate(`${basePath}/solicitudes`); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`${basePath}/solicitudes`)}
          className="text-[#6B7280] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-heading font-bold text-2xl text-[#111111]">{afiliacion.nombre_completo}</h1>
          <p className="text-[#6B7280] text-sm">Solicitud de afiliación</p>
        </div>
        <span className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${estadoBadge(afiliacion.estado)}`}>
          {afiliacion.estado}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal data */}
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-[#111111] mb-4">Datos Personales</h2>
          <dl className="space-y-3">
            {[
              { label: 'Nombre', value: afiliacion.nombre_completo },
              { label: 'Cédula', value: afiliacion.cedula },
              { label: 'Email', value: afiliacion.email },
              { label: 'Teléfono', value: afiliacion.telefono },
              { label: 'Dirección', value: afiliacion.direccion },
              { label: 'Ciudad', value: afiliacion.ciudad },
              { label: 'Patrocinador', value: afiliacion.codigo_patrocinador ?? '—' },
              { label: 'Paquete', value: paqueteKeyFull[afiliacion.paquete_seleccionado] ?? afiliacion.paquete_seleccionado },
              { label: 'Fecha', value: new Date(afiliacion.created_at).toLocaleString('es-EC') },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <dt className="text-[#6B7280] text-sm shrink-0">{label}</dt>
                <dd className="text-[#111111] text-sm text-right">{value}</dd>
              </div>
            ))}
          </dl>

          {afiliacion.notas_admin && (
            <div className="mt-4 pt-4 border-t border-[#C8D8CB]">
              <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1">Notas Admin</p>
              <p className="text-red-600 text-sm">{afiliacion.notas_admin}</p>
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-[#111111] mb-4">Documentos</h2>
          <div className="space-y-3">
            {Object.entries(docLabels).map(([key, label]) => {
              const url = docUrls[key];
              return (
                <div key={key} className="flex items-center justify-between bg-[#F4F7F5] rounded-xl px-4 py-3 border border-[#C8D8CB]">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className={url ? 'text-[#1A4E26]' : 'text-[#9CA3AF]'} />
                    <span className="text-[#111111] text-sm">{label}</span>
                  </div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#1A4E26] text-xs hover:underline"
                    >
                      Ver <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-[#9CA3AF] text-xs">No subido</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      {afiliacion.estado === 'pendiente' && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowApprove(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
          >
            <CheckCircle size={16} />
            Aprobar
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all duration-200"
          >
            <XCircle size={16} />
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
