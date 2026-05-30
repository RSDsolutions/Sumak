import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, XCircle, ExternalLink, Copy } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';
import { levelCommissions } from '../../data';
import type { Afiliacion, PaqueteKey } from '../../lib/types';

const PAQUETE_PUNTOS: Record<string, number> = {
  basico: 125,
  emprendedor: 225,
  lider: 525,
};

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

interface ApproveModalProps {
  afiliacion: Afiliacion;
  onClose: () => void;
  onSuccess: (code: string, tempPassword: string) => void;
}

interface DistribuidorOption {
  id: string;
  codigo_distribuidor: string;
  nombre_completo: string;
}

function ApproveModal({ afiliacion, onClose, onSuccess }: ApproveModalProps) {
  const [posicion, setPosicion] = useState<'izquierda' | 'derecha'>('izquierda');
  const [padreProfileId, setPadreProfileId] = useState('');
  const [distribuidores, setDistribuidores] = useState<DistribuidorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDist, setLoadingDist] = useState(true);
  const [error, setError] = useState('');

  // Load existing distributors for the dropdown
  useEffect(() => {
    supabaseAdmin
      .from('profiles')
      .select('id, codigo_distribuidor, nombre_completo')
      .order('codigo_distribuidor', { ascending: true })
      .then(({ data }) => {
        setDistribuidores((data as DistribuidorOption[]) ?? []);
        setLoadingDist(false);
      });
  }, []);

  async function handleApprove() {
    setLoading(true);
    setError('');
    try {
      // 1. Generate distributor code
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      const nextNum = (count ?? 0) + 1;
      const codigo = `SUMAK-${String(nextNum).padStart(5, '0')}`;

      // 2. Generate temp password
      const tempPassword = `Sumak${afiliacion.cedula.slice(-4)}!`;

      // 3. Create auth user
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

      // 4. Resolve patrocinador: use the selected padre or look up by code in the form
      let patrocinadorId: string | null = padreProfileId || null;
      if (!patrocinadorId && afiliacion.codigo_patrocinador) {
        const { data: pat } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('codigo_distribuidor', afiliacion.codigo_patrocinador)
          .single();
        patrocinadorId = pat?.id ?? null;
      }

      const packagePuntos = PAQUETE_PUNTOS[afiliacion.paquete_seleccionado] ?? 0;

      // 5. Insert profile with package puntos
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        codigo_distribuidor: codigo,
        nombre_completo: afiliacion.nombre_completo,
        cedula: afiliacion.cedula,
        email: afiliacion.email,
        telefono: afiliacion.telefono,
        direccion: afiliacion.direccion,
        ciudad: afiliacion.ciudad,
        codigo_patrocinador: afiliacion.codigo_patrocinador ?? null,
        patrocinador_id: patrocinadorId,
        paquete: afiliacion.paquete_seleccionado as PaqueteKey,
        puntos: packagePuntos,
        rol: 'distribuidor',
        estado: 'activo',
        fecha_aprobacion: new Date().toISOString(),
      });

      if (profileError) {
        setError('Error al crear perfil: ' + profileError.message);
        return;
      }

      // 6. Find the parent's red_binaria node id (if a parent was selected)
      let padreNodoId: string | null = null;
      const parentProfileId = padreProfileId || patrocinadorId;
      if (parentProfileId) {
        const { data: padreNodo } = await supabaseAdmin
          .from('red_binaria')
          .select('id, nivel')
          .eq('distribuidor_id', parentProfileId)
          .single();
        if (padreNodo) {
          padreNodoId = padreNodo.id;
        }
      }

      // 7. Insert into red_binaria
      const nivelNuevo = padreNodoId ? 2 : 1;
      const { error: redError } = await supabaseAdmin.from('red_binaria').insert({
        distribuidor_id: userId,
        padre_id: padreNodoId,
        posicion: posicion,
        nivel: nivelNuevo,
      });

      if (redError) {
        setError('Error al insertar en red binaria: ' + redError.message);
        return;
      }

      // 8. Update afiliacion state
      await supabaseAdmin
        .from('afiliaciones')
        .update({ estado: 'aprobada' })
        .eq('id', afiliacion.id);

      // 9. Bono de afiliación directa para el patrocinador
      if (patrocinadorId) {
        await supabaseAdmin.from('comisiones').insert({
          beneficiario_id: patrocinadorId,
          origen_id: userId,
          tipo: 'afiliacion',
          monto: 50,
          estado: 'pendiente',
          descripcion: `Bono de afiliación directa — ${afiliacion.nombre_completo}`,
        });
      }

      // 10. Level commissions on package price up the patrocinador chain
      if (packagePuntos > 0) {
        const { data: allProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, patrocinador_id');
        const profMap = new Map<string, { patrocinador_id: string | null }>(
          (allProfiles ?? []).map((p) => [p.id, { patrocinador_id: p.patrocinador_id }])
        );
        const comInserts: object[] = [];
        let upId: string | null = userId;
        for (const lc of levelCommissions) {
          const prof = profMap.get(upId!);
          if (!prof?.patrocinador_id) break;
          upId = prof.patrocinador_id;
          const monto = parseFloat((packagePuntos * lc.porcentaje / 100).toFixed(2));
          if (monto > 0) {
            comInserts.push({
              beneficiario_id: upId,
              origen_id: userId,
              tipo: 'nivel',
              nivel_red: lc.nivel,
              monto,
              estado: 'pendiente',
              descripcion: `Comisión nivel ${lc.nivel} — paquete ${afiliacion.paquete_seleccionado}`,
            });
          }
        }
        if (comInserts.length > 0) await supabaseAdmin.from('comisiones').insert(comInserts);
      }

      // 11. Binary volumes — propagate package puntos up the tree
      if (packagePuntos > 0 && padreNodoId) {
        const mes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
        const { data: allNodos } = await supabaseAdmin
          .from('red_binaria')
          .select('id, distribuidor_id, padre_id, posicion');
        const nodoById = new Map((allNodos ?? []).map((n) => [n.id, n]));
        const nodoByDistrib = new Map((allNodos ?? []).map((n) => [n.distribuidor_id, n]));

        let child = nodoByDistrib.get(userId);
        while (child?.padre_id) {
          const parent = nodoById.get(child.padre_id);
          if (!parent) break;
          const isLeft = child.posicion === 'izquierda';
          const { data: existing } = await supabaseAdmin
            .from('volumenes_binarios')
            .select('id, volumen_izquierda, volumen_derecha')
            .eq('distribuidor_id', parent.distribuidor_id)
            .eq('mes', mes)
            .maybeSingle();
          const newLeft  = Number(existing?.volumen_izquierda ?? 0) + (isLeft ? packagePuntos : 0);
          const newRight = Number(existing?.volumen_derecha  ?? 0) + (isLeft ? 0 : packagePuntos);
          if (existing) {
            await supabaseAdmin.from('volumenes_binarios').update({
              volumen_izquierda: newLeft,
              volumen_derecha: newRight,
              volumen_pareado: Math.min(newLeft, newRight),
            }).eq('id', existing.id);
          } else {
            await supabaseAdmin.from('volumenes_binarios').insert({
              distribuidor_id: parent.distribuidor_id,
              mes,
              volumen_izquierda: isLeft ? packagePuntos : 0,
              volumen_derecha: isLeft ? 0 : packagePuntos,
              volumen_pareado: 0,
              comision_calculada: 0,
              procesado: false,
            });
          }
          child = parent;
        }
      }

      onSuccess(codigo, tempPassword);
    } catch (err) {
      setError('Error inesperado. Intente de nuevo.');
      console.error(err);
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

        {/* Parent distributor dropdown */}
        <div className="mb-4">
          <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
            Ubicar bajo el distribuidor
          </label>
          <select
            value={padreProfileId}
            onChange={(e) => setPadreProfileId(e.target.value)}
            disabled={loadingDist}
            className="w-full bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26] transition-colors appearance-none"
          >
            <option value="">— Sin padre (nodo raíz) —</option>
            {distribuidores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.codigo_distribuidor} — {d.nombre_completo}
              </option>
            ))}
          </select>
          <p className="text-[#9CA3AF] text-xs mt-1">
            {afiliacion.codigo_patrocinador
              ? `Patrocinador declarado: ${afiliacion.codigo_patrocinador}`
              : 'El afiliado no declaró patrocinador'}
          </p>
        </div>

        {/* Position */}
        <div className="mb-6">
          <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-2">
            Posición en el árbol binario
          </label>
          <div className="flex gap-3">
            {(['izquierda', 'derecha'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPosicion(p)}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium capitalize transition-all duration-200 ${
                  posicion === p
                    ? 'border-[#1A4E26] bg-[#1A4E26]/10 text-[#1A4E26]'
                    : 'border-[#C8D8CB] text-[#6B7280] hover:border-[#A8C2AD]'
                }`}
              >
                {p === 'izquierda' ? '⬅ Izquierda (Equipo A)' : 'Derecha (Equipo B) ➡'}
              </button>
            ))}
          </div>
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
          onClose={() => { setSuccessData(null); navigate('/admin/solicitudes'); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/solicitudes')}
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
