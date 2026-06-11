import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShoppingCart, Plus, Minus, X, CheckCircle2, AlertCircle, TrendingUp,
  ArrowLeft, ArrowRight, Trash2, Leaf, Sparkles, Upload,
  CreditCard, Receipt, Landmark, Clock, Copy, Check,
} from 'lucide-react';
import { levelCommissions, contactInfo, bankAccounts } from '../../data';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';

type Step = 'cart' | 'pay' | 'voucher' | 'done';

const PAY_WINDOW_SECONDS = 15 * 60;

function formatMMSS(s: number) {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

export default function NuevoPedido() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { items, setQty, removeItem, clear, subtotal, savings, puntos } = useCart();
  const [step, setStep] = useState<Step>('cart');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [earnedPuntos, setEarnedPuntos] = useState(0);
  const [compraCalificada, setCompraCalificada] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [totalMes, setTotalMes] = useState(0);

  // Pay step state
  const [selectedBanco, setSelectedBanco] = useState<string>('');
  const [voucherNumero, setVoucherNumero] = useState('');
  const [copiedField, setCopiedField] = useState<string>('');

  // Voucher step state
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Countdown
  const [secondsLeft, setSecondsLeft] = useState(PAY_WINDOW_SECONDS);
  const expiresAtRef = useRef<number | null>(null);

  // BIZ-005: idempotency_key generada una vez por sesión de checkout.
  // Si el usuario hace doble-click en "Enviar pedido", la segunda inserción
  // falla con 23505 (unique violation) y se trata como éxito sin duplicar.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const willQualify = subtotal >= 100;
  const total = subtotal;
  const selectedBancoData = bankAccounts.find((b) => b.banco === selectedBanco);

  useEffect(() => {
    if (!user) return;
    async function checkMonthly() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from('pedidos')
        .select('id, total, estado')
        .eq('distribuidor_id', user!.id)
        .in('estado', ['procesando', 'enviado', 'entregado'])
        .gte('created_at', startOfMonth);

      const all = (data ?? []) as { id: string; total: number }[];
      const totalMesAcum = all.reduce((s, p) => s + Number(p.total), 0);
      setTotalMes(totalMesAcum);
      setCompraCalificada(all.some((p) => Number(p.total) >= 100));
      setLoadingStatus(false);
    }
    checkMonthly();
  }, [user]);

  // Countdown logic — corre mientras estamos en pay o voucher
  useEffect(() => {
    if (step !== 'pay' && step !== 'voucher') {
      expiresAtRef.current = null;
      return;
    }
    if (expiresAtRef.current === null) {
      expiresAtRef.current = Date.now() + PAY_WINDOW_SECONDS * 1000;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAtRef.current! - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setError('Se agotó el tiempo para completar el pago. Por favor, vuelve al carrito y vuelve a intentarlo.');
        setStep('cart');
        setSelectedBanco('');
        setVoucherNumero('');
        setVoucherFile(null);
        setVoucherPreview(null);
        expiresAtRef.current = null;
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step]);

  function startPayStep() {
    setError('');
    setSelectedBanco('');
    setVoucherNumero('');
    setVoucherFile(null);
    setVoucherPreview(null);
    expiresAtRef.current = Date.now() + PAY_WINDOW_SECONDS * 1000;
    setSecondsLeft(PAY_WINDOW_SECONDS);
    // BIZ-005: nueva sesión de checkout → nueva idempotency_key
    idempotencyKeyRef.current = crypto.randomUUID();
    setStep('pay');
  }

  function onVoucherFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5 MB.');
      return;
    }
    setError('');
    setVoucherFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setVoucherPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(key);
      setTimeout(() => setCopiedField(''), 1500);
    } catch {
      // ignore
    }
  }

  function handleAcceptPayment() {
    if (!selectedBanco) {
      setError('Selecciona el banco al que realizaste la transferencia.');
      return;
    }
    if (voucherNumero.trim().length < 4) {
      setError('Ingresa el número de comprobante de la transferencia (mínimo 4 caracteres).');
      return;
    }
    setError('');
    setStep('voucher');
  }

  async function handleSubmitFinal() {
    if (items.length === 0 || !user || !voucherFile) {
      setError('Debes subir la foto del voucher de pago para finalizar.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const distribId = user.id;

      // 1. Upload voucher to storage. Folder = user uid (RLS path check).
      const ext = voucherFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const voucherPath = `${distribId}/${Date.now()}-voucher.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('pedidos-vouchers')
        .upload(voucherPath, voucherFile, { upsert: false });

      if (uploadError) {
        const msg = uploadError.message.toLowerCase();
        if (msg.includes('bucket not found') || msg.includes('not found')) {
          setError('El sistema aún no está configurado para recibir vouchers. Contacta al administrador para que ejecute la migración SQL "004b_voucher_bucket_fix.sql".');
        } else if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy')) {
          setError('No tienes permisos para subir vouchers. Pide al administrador que verifique las políticas del bucket "pedidos-vouchers".');
        } else {
          setError('Error al subir el voucher: ' + uploadError.message);
        }
        setSubmitting(false);
        return;
      }

      // 2. Create pedido directly as 'procesando' (label: Procesado)
      // BIZ-005: idempotency_key impide doble-submit (constraint único en BD).
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          distribuidor_id: distribId,
          estado: 'procesando',
          tipo_precio: 'distribuidor',
          total: parseFloat(total.toFixed(2)),
          puntos_generados: puntos,
          notas: notes || null,
          voucher_url: voucherPath,
          voucher_numero: voucherNumero.trim(),
          banco_destino: selectedBanco,
          idempotency_key: idempotencyKeyRef.current,
        })
        .select()
        .single();

      if (pedidoError || !pedidoData) {
        // BIZ-005: violación de unique en idempotency_key = pedido duplicado
        // por doble-click. Buscamos el original y mostramos éxito sin duplicar.
        if (pedidoError?.code === '23505') {
          const { data: existing } = await supabase
            .from('pedidos')
            .select('id')
            .eq('idempotency_key', idempotencyKeyRef.current)
            .maybeSingle();
          if (existing) {
            setEarnedPuntos(puntos);
            clear();
            expiresAtRef.current = null;
            setStep('done');
            return;
          }
        }
        setError('Error al crear el pedido: ' + (pedidoError?.message ?? 'desconocido'));
        setSubmitting(false);
        return;
      }

      // 3. Insert items
      const itemsRows = items.map((item) => ({
        pedido_id: pedidoData.id,
        producto_codigo: item.codigo,
        producto_nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: parseFloat((item.precio * item.cantidad).toFixed(2)),
      }));
      const { error: itemsError } = await supabase.from('pedido_items').insert(itemsRows);
      if (itemsError) {
        setError('Error al guardar los productos: ' + itemsError.message);
        setSubmitting(false);
        return;
      }

      // 4. Sumar puntos al comprador
      if (puntos > 0) {
        const { data: myProfile } = await supabaseAdmin
          .from('profiles').select('puntos').eq('id', distribId).single();
        if (myProfile) {
          await supabaseAdmin
            .from('profiles')
            .update({ puntos: Number(myProfile.puntos) + puntos })
            .eq('id', distribId);
        }
      }

      // 5. Comisiones por nivel — upline con compra calificada del mes
      if (puntos > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: allProfiles } = await supabaseAdmin
          .from('profiles').select('id, patrocinador_id');
        const profMap = new Map<string, string | null>();
        for (const p of allProfiles ?? []) profMap.set(p.id, p.patrocinador_id);

        const uplineChain: Array<{ id: string; nivel: number; porcentaje: number }> = [];
        let upId: string | null = distribId;
        for (const lc of levelCommissions) {
          const sponsorId = profMap.get(upId!) ?? null;
          if (!sponsorId) break;
          upId = sponsorId;
          uplineChain.push({ id: upId, nivel: lc.nivel, porcentaje: lc.porcentaje });
        }

        if (uplineChain.length > 0) {
          const uplineIds = uplineChain.map((u) => u.id);
          const { data: eligibleOrders } = await supabaseAdmin
            .from('pedidos').select('distribuidor_id')
            .in('distribuidor_id', uplineIds)
            .in('estado', ['procesando', 'enviado', 'entregado'])
            .gte('total', 100).gte('created_at', startOfMonth);
          const eligibleSet = new Set((eligibleOrders ?? []).map((o: { distribuidor_id: string }) => o.distribuidor_id));

          const comInserts: object[] = [];
          for (const entry of uplineChain) {
            if (eligibleSet.has(entry.id)) {
              const monto = parseFloat((puntos * entry.porcentaje / 100).toFixed(2));
              if (monto > 0) {
                comInserts.push({
                  beneficiario_id: entry.id,
                  origen_id: distribId,
                  pedido_id: pedidoData.id, // BIZ-002
                  tipo: 'nivel',
                  nivel_red: entry.nivel,
                  monto,
                  estado: 'pendiente',
                  descripcion: `Comisión nivel ${entry.nivel}`,
                });
              }
            }
          }
          if (comInserts.length > 0) await supabaseAdmin.from('comisiones').insert(comInserts);
        }
      }

      if (total >= 100) setCompraCalificada(true);
      setEarnedPuntos(puntos);
      clear();
      expiresAtRef.current = null;
      setStep('done');
    } catch (err) {
      setError('Error inesperado. Intenta de nuevo.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── DONE ────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-md bg-white border border-[#C8D8CB] rounded-3xl p-8 shadow-[0_15px_60px_rgba(26,78,38,0.1)]"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_8px_24px_rgba(26,78,38,0.3)]">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="font-heading font-bold text-3xl text-[#111111] mb-2">¡Pedido enviado!</h2>
          <p className="text-[#6B7280] mb-6">
            Tu pedido está marcado como <strong className="text-[#1A4E26]">Procesado</strong>.
            El admin revisará tu pago y coordinará el envío.
          </p>

          {earnedPuntos > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-5 py-3 mb-4 w-full justify-center">
              <Sparkles size={16} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] font-semibold text-sm">
                Ganaste <span className="font-bold">{earnedPuntos} puntos</span>
              </span>
            </div>
          )}

          {compraCalificada && (
            <div className="flex items-center gap-2 bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl px-5 py-3 mb-6 text-sm text-[#1A4E26] font-semibold">
              <TrendingUp size={16} />
              Estás habilitado para comisiones este mes
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/dashboard/tienda"
              className="py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] font-semibold text-sm hover:border-[#A8C2AD] hover:text-[#111111] transition-all"
            >
              Seguir comprando
            </Link>
            <button
              onClick={() => navigate('/dashboard/pedidos')}
              className="py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all shadow-[0_4px_16px_rgba(26,78,38,0.2)]"
            >
              Ver mis pedidos
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── COUNTDOWN BANNER (compartido por pay y voucher) ──
  const countdownBanner = (step === 'pay' || step === 'voucher') && (
    <div className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 mb-6 border ${
      secondsLeft <= 120
        ? 'bg-red-50 border-red-200'
        : secondsLeft <= 300
          ? 'bg-amber-50 border-amber-200'
          : 'bg-[#EBF4ED] border-[#1A4E26]/20'
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          secondsLeft <= 120 ? 'bg-red-500' : secondsLeft <= 300 ? 'bg-amber-500' : 'bg-[#1A4E26]'
        }`}>
          <Clock size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${
            secondsLeft <= 120 ? 'text-red-700' : secondsLeft <= 300 ? 'text-amber-700' : 'text-[#1A4E26]'
          }`}>
            Tienes {formatMMSS(secondsLeft)} para completar el pago
          </p>
          <p className={`text-xs ${
            secondsLeft <= 120 ? 'text-red-600' : secondsLeft <= 300 ? 'text-amber-600' : 'text-[#1A4E26]/80'
          }`}>
            Si no envías el comprobante a tiempo, el pedido se cancela automáticamente para liberar el cupo.
          </p>
        </div>
      </div>
      <div className={`shrink-0 font-heading font-bold text-2xl sm:text-3xl tabular-nums ${
        secondsLeft <= 120 ? 'text-red-600' : secondsLeft <= 300 ? 'text-amber-600' : 'text-[#1A4E26]'
      }`}>
        {formatMMSS(secondsLeft)}
      </div>
    </div>
  );

  // ─── VOUCHER UPLOAD STEP ─────────────────────────────
  if (step === 'voucher') {
    return (
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
              <Receipt size={24} className="text-[#1A4E26]" />
              Sube tu comprobante
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">Adjunta la foto o captura del voucher para enviar tu pedido al admin.</p>
          </div>
          <button
            onClick={() => { setStep('pay'); setError(''); }}
            className="inline-flex items-center gap-1.5 text-[#6B7280] text-sm font-semibold hover:text-[#1A4E26] transition-colors"
          >
            <ArrowLeft size={14} /> Volver a datos de pago
          </button>
        </div>

        {countdownBanner}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: voucher upload + notes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5] flex items-center gap-2">
                <Receipt size={15} className="text-[#1A4E26]" />
                <h2 className="font-heading font-bold text-[#111111] text-sm">Comprobante de pago *</h2>
              </div>
              <div className="p-5">
                <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-4 mb-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] uppercase tracking-widest font-bold text-[10px]">Banco destino</span>
                    <span className="text-[#111111] font-semibold">{selectedBanco}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] uppercase tracking-widest font-bold text-[10px]">N° comprobante</span>
                    <span className="text-[#111111] font-semibold font-mono">{voucherNumero}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] uppercase tracking-widest font-bold text-[10px]">Monto</span>
                    <span className="text-[#1A4E26] font-bold">${total.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-[#6B7280] text-sm mb-4">
                  Sube la foto o captura del voucher de transferencia/depósito.
                  El admin verá esta imagen junto al N° de comprobante para verificar tu pago.
                </p>

                {voucherPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#C8D8CB] bg-[#F4F7F5]">
                    <img src={voucherPreview} alt="Voucher" className="w-full max-h-80 object-contain" />
                    <button
                      onClick={() => { setVoucherFile(null); setVoucherPreview(null); }}
                      className="absolute top-2 right-2 bg-white/95 border border-[#C8D8CB] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-red-600 transition-colors inline-flex items-center gap-1"
                    >
                      <X size={12} /> Cambiar
                    </button>
                  </div>
                ) : (
                  <label className="relative flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#C8D8CB] hover:border-[#A8C2AD] rounded-xl p-10 cursor-pointer transition-all bg-[#F4F7F5]">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onVoucherFile(f); }}
                    />
                    <Upload size={32} className="text-[#9CA3AF]" />
                    <div className="text-center">
                      <p className="text-[#6B7280] text-sm font-medium">Sube tu voucher de pago</p>
                      <p className="text-[#9CA3AF] text-xs mt-1">JPG, PNG o PDF · Máx 5 MB</p>
                    </div>
                  </label>
                )}

                {voucherFile && (
                  <div className="mt-3 flex items-center gap-2 text-[#1A4E26] text-xs">
                    <CheckCircle2 size={13} />
                    <span className="font-medium">{voucherFile.name}</span>
                    <span className="text-[#9CA3AF]">({(voucherFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5]">
                <h2 className="font-heading font-bold text-[#111111] text-sm">Notas para el admin (opcional)</h2>
              </div>
              <div className="p-5">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dirección de envío, indicaciones especiales, etc."
                  rows={3}
                  className="w-full bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#C8D8CB] bg-[#F4F7F5]">
                <h2 className="font-heading font-bold text-[#111111] text-sm">Resumen del pedido</h2>
              </div>

              <div className="p-5 space-y-3">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.codigo} className="flex justify-between items-start gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#111111] truncate font-medium">{item.nombre}</p>
                        <p className="text-[#9CA3AF]">{item.cantidad} × ${item.precio.toFixed(2)}</p>
                      </div>
                      <p className="text-[#111111] font-semibold shrink-0">${(item.precio * item.cantidad).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#C8D8CB] pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Subtotal</span>
                    <span className="text-[#111111] font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#D4AF37]">Ahorro 50%</span>
                    <span className="text-[#D4AF37] font-semibold">- ${savings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#D4AF37]">★ Puntos a ganar</span>
                    <span className="text-[#D4AF37] font-bold">{puntos} pts</span>
                  </div>
                </div>

                <div className="border-t border-[#C8D8CB] pt-3 flex justify-between items-baseline">
                  <span className="font-heading font-bold text-[#111111]">Total</span>
                  <span className="font-heading font-bold text-2xl text-[#1A4E26]">${total.toFixed(2)}</span>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmitFinal}
                  disabled={submitting || !voucherFile}
                  className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(26,78,38,0.25)] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Enviar pedido <ArrowRight size={15} />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#9CA3AF] text-center leading-tight">
                  Al confirmar, el admin recibirá el N° de comprobante, banco, voucher e items del pedido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PAY STEP (bancos + N° comprobante + countdown) ──
  if (step === 'pay') {
    return (
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
              <Landmark size={24} className="text-[#1A4E26]" />
              Datos de Pago
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              Transfiere el total a una de nuestras cuentas y registra el número del comprobante.
            </p>
          </div>
          <button
            onClick={() => { setStep('cart'); setError(''); expiresAtRef.current = null; }}
            className="inline-flex items-center gap-1.5 text-[#6B7280] text-sm font-semibold hover:text-[#1A4E26] transition-colors"
          >
            <ArrowLeft size={14} /> Volver al carrito
          </button>
        </div>

        {countdownBanner}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: bancos + voucher numero */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5] flex items-center gap-2">
                <CreditCard size={15} className="text-[#1A4E26]" />
                <h2 className="font-heading font-bold text-[#111111] text-sm">Selecciona la cuenta de destino *</h2>
              </div>
              <div className="p-5 space-y-3">
                {bankAccounts.map((b) => {
                  const selected = selectedBanco === b.banco;
                  return (
                    <div
                      key={b.banco}
                      className={`rounded-2xl border-2 transition-all overflow-hidden ${
                        selected ? 'border-[#1A4E26] bg-[#EBF4ED] shadow-[0_8px_24px_rgba(26,78,38,0.15)]' : 'border-[#C8D8CB] bg-white hover:border-[#A8C2AD]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedBanco(b.banco)}
                        className="w-full flex items-center justify-between gap-3 p-4 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-[#1A4E26]' : 'bg-[#F4F7F5] border border-[#C8D8CB]'}`}>
                            <Landmark size={18} className={selected ? 'text-white' : 'text-[#1A4E26]'} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-[#111111] text-base leading-tight">{b.banco}</p>
                            <p className="text-[#6B7280] text-xs mt-0.5">{b.tipo}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'bg-[#1A4E26] border-[#1A4E26]' : 'border-[#C8D8CB]'}`}>
                          {selected && <Check size={14} className="text-white" />}
                        </div>
                      </button>

                      {selected && (
                        <div className="px-4 pb-4 pt-1 space-y-2 text-xs">
                          {[
                            { label: 'Número de cuenta', value: b.numero, key: `${b.banco}-num` },
                            { label: 'Titular', value: b.titular, key: `${b.banco}-tit` },
                            { label: 'Identificación', value: b.identificacion, key: `${b.banco}-id` },
                            ...(b.email ? [{ label: 'Email', value: b.email, key: `${b.banco}-em` }] : []),
                          ].map((row) => (
                            <div key={row.key} className="flex items-center justify-between gap-3 bg-white border border-[#C8D8CB] rounded-xl px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">{row.label}</p>
                                <p className="text-[#111111] font-mono font-semibold truncate">{row.value}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(row.value, row.key)}
                                className="shrink-0 inline-flex items-center gap-1 text-[#1A4E26] hover:bg-[#EBF4ED] rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors"
                              >
                                {copiedField === row.key ? (
                                  <>
                                    <Check size={12} /> Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} /> Copiar
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5] flex items-center gap-2">
                <Receipt size={15} className="text-[#1A4E26]" />
                <h2 className="font-heading font-bold text-[#111111] text-sm">Número del comprobante *</h2>
              </div>
              <div className="p-5">
                <p className="text-[#6B7280] text-sm mb-3">
                  Una vez realizada la transferencia, escribe aquí el número o referencia que figura en tu voucher.
                </p>
                <input
                  type="text"
                  value={voucherNumero}
                  onChange={(e) => setVoucherNumero(e.target.value)}
                  placeholder="Ej: 0123456789"
                  className="w-full bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] font-mono text-base placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                  autoComplete="off"
                />
                <p className="text-[11px] text-[#9CA3AF] mt-2 flex items-start gap-1.5">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  Este número debe coincidir con la foto del voucher que subirás en el siguiente paso.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>
                Si tienes dudas con el pago, contacta al admin por WhatsApp{' '}
                <a href={`https://wa.me/${contactInfo.whatsapp}`} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                  {contactInfo.telefono1}
                </a>.
              </p>
            </div>
          </div>

          {/* Right: summary + accept */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#C8D8CB] bg-[#F4F7F5]">
                <h2 className="font-heading font-bold text-[#111111] text-sm">Resumen del pedido</h2>
              </div>

              <div className="p-5 space-y-3">
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.codigo} className="flex justify-between items-start gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#111111] truncate font-medium">{item.nombre}</p>
                        <p className="text-[#9CA3AF]">{item.cantidad} × ${item.precio.toFixed(2)}</p>
                      </div>
                      <p className="text-[#111111] font-semibold shrink-0">${(item.precio * item.cantidad).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#EBF4ED] rounded-xl p-4 border border-[#1A4E26]/20">
                  <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-1">Monto a transferir</p>
                  <p className="font-heading font-bold text-3xl text-[#1A4E26]">${total.toFixed(2)}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleAcceptPayment}
                  className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] shadow-[0_8px_24px_rgba(26,78,38,0.25)] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Aceptar y subir voucher <ArrowRight size={15} />
                </button>

                <p className="text-[10px] text-[#9CA3AF] text-center leading-tight">
                  Tras aceptar podrás subir la foto del voucher. El pedido se enviará al admin solo cuando subas el comprobante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CART (default) ─────────────────────────────────
  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
            <ShoppingCart size={24} className="text-[#1A4E26]" />
            Tu Carrito
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            {items.length === 0
              ? 'Tu carrito está vacío. Visita la tienda para añadir productos.'
              : `Revisa tu pedido. Hola, ${profile?.nombre_completo?.split(' ')[0] ?? ''}.`}
          </p>
        </div>
        <Link
          to="/dashboard/tienda"
          className="inline-flex items-center gap-1.5 text-[#1A4E26] text-sm font-semibold hover:gap-2 transition-all"
        >
          <ArrowLeft size={14} /> Volver a la tienda
        </Link>
      </div>

      {/* Mensaje de expiración si vienen de un pay step caducado */}
      {error && items.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Activación mensual */}
      {!loadingStatus && (
        <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 mb-6 border ${
          compraCalificada
            ? 'bg-[#EBF4ED] border-[#1A4E26]/20'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            compraCalificada ? 'bg-[#1A4E26]' : 'bg-amber-500'
          }`}>
            {compraCalificada ? <CheckCircle2 size={18} className="text-white" /> : <AlertCircle size={18} className="text-white" />}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold mb-1 ${compraCalificada ? 'text-[#1A4E26]' : 'text-amber-700'}`}>
              {compraCalificada
                ? '✓ Activo este mes — recibes comisiones'
                : 'Aún no estás activo este mes'
              }
            </p>
            <p className={`text-xs ${compraCalificada ? 'text-[#1A4E26]/80' : 'text-amber-600'}`}>
              {compraCalificada
                ? `Has cumplido la meta de $100 en un solo pedido este mes. Total acumulado: $${totalMes.toFixed(2)}. Recuerda: el contador reinicia el próximo mes.`
                : `Realiza al menos un pedido de $100 o más en un solo pedido este mes para mantener tu cupo de comisiones. Acumulado este mes: $${totalMes.toFixed(2)}.`}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-[#C8D8CB] rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-[#F4F7F5] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} className="text-[#9CA3AF]" />
          </div>
          <h3 className="font-heading font-bold text-xl text-[#111111] mb-2">Tu carrito está vacío</h3>
          <p className="text-[#6B7280] text-sm mb-6 max-w-sm mx-auto">
            Explora el catálogo y agrega productos a tu precio distribuidor para empezar.
          </p>
          <Link
            to="/dashboard/tienda"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all shadow-[0_8px_24px_rgba(26,78,38,0.25)]"
          >
            <Plus size={16} /> Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Items list */}
          <div className="xl:col-span-2 bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#C8D8CB] flex items-center justify-between bg-[#F4F7F5]">
              <h2 className="font-heading font-bold text-[#111111] text-sm">
                {items.length} producto{items.length !== 1 ? 's' : ''} en tu carrito
              </h2>
              <button
                onClick={clear}
                className="text-[#6B7280] hover:text-red-600 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} /> Vaciar carrito
              </button>
            </div>

            <div className="divide-y divide-[#C8D8CB]">
              {items.map((item) => (
                <div key={item.codigo} className="px-6 py-4 flex items-center gap-4">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0 overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Leaf size={20} className="text-[#1A4E26] opacity-40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link to={`/dashboard/tienda/${item.codigo}`} className="block">
                      <p className="text-[#111111] font-bold text-sm leading-tight truncate hover:text-[#1A4E26] transition-colors">
                        {item.nombre}
                      </p>
                    </Link>
                    <p className="text-[#6B7280] text-xs mt-0.5">
                      <span className="line-through">${item.pvp.toFixed(2)}</span>{' '}
                      <span className="text-[#1A4E26] font-bold">${item.precio.toFixed(2)}</span>{' '}
                      <span className="text-[#9CA3AF]">c/u</span>
                    </p>
                  </div>

                  <div className="flex items-center border border-[#C8D8CB] rounded-xl overflow-hidden shrink-0">
                    <button
                      onClick={() => setQty(item.codigo, item.cantidad - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                      aria-label="Disminuir"
                    >
                      <Minus size={12} className="text-[#6B7280]" />
                    </button>
                    <span className="w-9 text-center font-bold text-[#111111] text-sm">{item.cantidad}</span>
                    <button
                      onClick={() => setQty(item.codigo, item.cantidad + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                      aria-label="Aumentar"
                    >
                      <Plus size={12} className="text-[#6B7280]" />
                    </button>
                  </div>

                  <div className="text-right shrink-0 w-20 sm:w-24">
                    <p className="font-heading font-bold text-[#111111] text-base">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.codigo)}
                      className="text-[#9CA3AF] hover:text-red-600 text-xs mt-1 transition-colors flex items-center gap-1 justify-end ml-auto"
                    >
                      <X size={11} /> Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="xl:col-span-1">
            <div className="sticky top-6 bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#C8D8CB] bg-[#F4F7F5]">
                <h2 className="font-heading font-bold text-[#111111] text-sm">Resumen del pedido</h2>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Subtotal ({items.length})</span>
                  <span className="text-[#111111] font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#D4AF37]">Ahorro total (50%)</span>
                  <span className="text-[#D4AF37] font-semibold">- ${savings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#D4AF37]">★ Puntos a ganar</span>
                  <span className="text-[#D4AF37] font-bold">{puntos} pts</span>
                </div>

                <div className="border-t border-[#C8D8CB] pt-3 flex justify-between items-baseline">
                  <span className="font-heading font-bold text-[#111111]">Total</span>
                  <span className="font-heading font-bold text-2xl text-[#1A4E26]">${total.toFixed(2)}</span>
                </div>

                {willQualify && !compraCalificada && (
                  <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl p-3 flex items-start gap-2 text-xs text-[#1A4E26]">
                    <TrendingUp size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">¡Este pedido te activa el mes!</p>
                      <p className="text-[#1A4E26]/80 leading-snug">Superas los $100 — tendrás cupo a comisiones este mes.</p>
                    </div>
                  </div>
                )}

                {!willQualify && !compraCalificada && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Faltan ${(100 - subtotal).toFixed(2)} para activarte</p>
                      <p className="text-amber-600 leading-snug">Necesitas $100 en un solo pedido para mantener tu cupo a comisiones este mes.</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={startPayStep}
                  disabled={items.length === 0}
                  className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(26,78,38,0.25)] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Continuar al pago <ArrowRight size={15} />
                </button>
                <p className="text-[10px] text-[#9CA3AF] text-center flex items-center justify-center gap-1">
                  <Clock size={11} /> Tendrás 15 minutos para transferir y subir el voucher
                </p>
                <Link
                  to="/dashboard/tienda"
                  className="w-full py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-semibold hover:border-[#A8C2AD] hover:text-[#111111] transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={14} /> Seguir comprando
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
