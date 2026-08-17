import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShoppingCart, Plus, Minus, X, CheckCircle2, AlertCircle, TrendingUp,
  ArrowLeft, ArrowRight, Trash2, Leaf, Sparkles, Upload,
  CreditCard, Receipt, Landmark, Clock, Copy, Check, Package,
} from 'lucide-react';
// Tanda 6: ya no necesitamos levelCommissions ni supabaseAdmin en este
// archivo. La RPC submit_pedido calcula puntos y comisiones server-side.
import { contactInfo, bankAccounts, planConfig } from '../../data';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { logger } from '../../lib/logger';
import {
  type PaymentMethod,
  getPayPalClientId,
  getPayPhoneStoreId,
  getPayPhoneToken,
  isPayPalConfigured,
  isPayPhoneConfigured,
  paymentMethodOptions,
} from '../../lib/payments';
import PayPhoneBox from '../../components/PayPhoneBox';

type Step = 'cart' | 'pay' | 'voucher' | 'done';

// COD-002: ventana de pago viene del catálogo central del plan.
const PAY_WINDOW_SECONDS = planConfig.payWindowMinutes * 60;

function formatMMSS(s: number) {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

export default function NuevoPedido() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, setQty, removeItem, clear, subtotal, savings, puntos } = useCart();
  const [step, setStep] = useState<Step>('cart');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [earnedPuntos, setEarnedPuntos] = useState(0);
  const [compraCalificada, setCompraCalificada] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [totalMes, setTotalMes] = useState(0);

  // Pay step state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [selectedBanco, setSelectedBanco] = useState<string>('');
  const [voucherNumero, setVoucherNumero] = useState('');

  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    if (paymentParam === 'paypal' || paymentParam === 'payphone' || paymentParam === 'transferencia') {
      setSelectedPaymentMethod(paymentParam);
    }
  }, [searchParams]);
  const [copiedField, setCopiedField] = useState<string>('');
  const paypalButtonContainerRef = useRef<HTMLDivElement | null>(null);

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
  const payPhoneTransactionIdRef = useRef<string>(`sumak-${crypto.randomUUID()}`);

  // COD-002: umbral de activación viene del catálogo central del plan.
  const MIN_ACTIVACION = planConfig.minActivacionMensual;
  const willQualify = subtotal >= MIN_ACTIVACION;
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
      setCompraCalificada(all.some((p) => Number(p.total) >= MIN_ACTIVACION));
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
    setSelectedPaymentMethod('transferencia');
    setStep('pay');
  }

  useEffect(() => {
    if (step !== 'pay' || selectedPaymentMethod !== 'paypal' || !isPayPalConfigured() || !paypalButtonContainerRef.current) {
      return;
    }

    let cancelled = false;

    const loadPayPalButtons = async () => {
      try {
        const { loadScript } = await import('@paypal/paypal-js');
        const paypal = await loadScript({
          clientId: getPayPalClientId(),
          currency: 'USD',
          intent: 'capture',
        });

        if (!paypal?.Buttons || cancelled || !paypalButtonContainerRef.current) {
          return;
        }

        const container = paypalButtonContainerRef.current;
        container.innerHTML = '';

        const buttons = paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'pill',
            label: 'pay',
            tagline: false,
          },
          createOrder: (_data, actions) => actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{
              amount: {
                currency_code: 'USD',
                value: total.toFixed(2),
              },
            }],
          }),
          onApprove: async (data, actions) => {
            if (!actions || !actions.order) {
              setError('No pudimos confirmar la captura de PayPal. Inténtalo de nuevo.');
              return;
            }

            const details = await actions.order.capture();
            logger.info('PayPal approved', { data, details });
            setError('');
            setStep('done');
          },
          onError: () => {
            setError('No pudimos iniciar el pago con PayPal. Verifica la configuración del cliente y vuelve a intentarlo.');
          },
        });

        buttons.render(container);
      } catch (err) {
        logger.error('PayPal button init failed', err);
        if (!cancelled) {
          setError('PayPal no está disponible en este momento. Inténtalo más tarde o usa otra forma de pago.');
        }
      }
    };

    void loadPayPalButtons();

    return () => {
      cancelled = true;
    };
  }, [step, selectedPaymentMethod, total]);

  function openExternalCheckout(url: string) {
    const safeUrl = url.trim();
    if (!safeUrl) {
      setError('La URL de pago no está disponible en este momento. Verifica la configuración del proveedor antes de continuar.');
      return;
    }

    const newTab = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (newTab) {
      newTab.opener = null;
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = safeUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    if (document.hasFocus()) {
      window.location.href = safeUrl;
    }
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

  async function handleAcceptPayment() {
    if (selectedPaymentMethod === 'transferencia') {
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
      return;
    }

    if (selectedPaymentMethod === 'paypal') {
      if (!user) {
        setError('Debes iniciar sesión o completar tu registro antes de pagar con PayPal.');
        navigate('/login');
        return;
      }

      if (!isPayPalConfigured()) {
        setError('PayPal no está configurado. Añade VITE_PAYPAL_CLIENT_ID con un Client ID válido para habilitar este método.');
        return;
      }
      setError('Completa el pago con PayPal desde el botón que aparece abajo y después vuelve a confirmar el pedido.');
      return;
    }

    if (selectedPaymentMethod === 'payphone') {
      if (!user) {
        setError('Debes iniciar sesión o completar tu registro antes de pagar con Payphone.');
        navigate('/login');
        return;
      }

      if (!isPayPhoneConfigured()) {
        setError('Payphone no está configurado. Define VITE_PAYPHONE_TOKEN y VITE_PAYPHONE_STORE_ID para activar la cajita de pagos.');
        return;
      }

      setError('');
      return;
    }

    setError('');
  }

  async function handleSubmitFinal() {
    if (items.length === 0 || !user) {
      setError('No hay elementos en el carrito para finalizar.');
      return;
    }

    if (selectedPaymentMethod === 'transferencia' && !voucherFile) {
      setError('Debes subir la foto del voucher de pago para finalizar.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const distribId = user.id;
      let voucherPath: string | null = null;

      if (selectedPaymentMethod === 'transferencia' && voucherFile) {
        // ── 1. Subir voucher a storage (folder = user uid por RLS) ──
        const ext = voucherFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        voucherPath = `${distribId}/${Date.now()}-voucher.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('pedidos-vouchers')
          .upload(voucherPath, voucherFile, { upsert: false });

        if (uploadError) {
          // UX-004: mensaje amable; detalle técnico a consola.
          logger.error('Voucher upload error', uploadError);
          const detail = uploadError.message ? ` — ${uploadError.message}` : '';
          setError(
            'No pudimos guardar tu comprobante. Por favor, intenta de nuevo o contacta a soporte si el problema persiste.' + detail
          );
          setSubmitting(false);
          return;
        }
      }

      // ── 2. Llamar a la RPC atómica submit_pedido ──
      // Tanda 6 (BIZ-001 + ARQ-002): la RPC corre en una sola transacción:
      //   • inserta el pedido con idempotency_key (constraint único: doble-click → reuso)
      //   • inserta los pedido_items
      //   • suma puntos al comprador
      //   • genera comisiones de nivel por upline calificado del mes
      // Todo server-side → el cliente ya no calcula puntos/comisiones ni usa
      // supabaseAdmin para escribirlos. Si algún paso falla, ninguno persiste.
      //
      // Las pack selections se anexan al nombre del item para que el admin
      // las vea sin cambiar el schema de pedido_items.
      const itemsPayload = items.map((item) => {
        const isPack = item.codigo.startsWith('PKG-');
        const nombreFinal = isPack && item.packSelections && item.packSelections.length > 0
          ? `${item.nombre} (incluye: ${item.packSelections
              .map((s) => `${s.cantidad}x ${s.nombre}`)
              .join(', ')})`
          : item.nombre;
        return {
          codigo: item.codigo,
          nombre: nombreFinal,
          cantidad: item.cantidad,
          precio: item.precio,
          pvp: item.pvp,
        };
      });

      const { data: rpcResult, error: rpcError } = await supabase.rpc('submit_pedido', {
        p_idempotency_key: idempotencyKeyRef.current,
        p_items: itemsPayload,
        p_voucher_url: selectedPaymentMethod === 'transferencia' ? voucherPath : null,
        p_voucher_numero: selectedPaymentMethod === 'transferencia' ? voucherNumero.trim() : null,
        p_banco_destino: selectedPaymentMethod === 'transferencia' ? selectedBanco : null,
        p_notas: notes || null,
      });

      if (rpcError) {
        logger.error('submit_pedido RPC error', rpcError);
        const code = rpcError.code ?? '?';
        const msg = rpcError.message ?? 'sin mensaje';
        const hint = rpcError.hint ? ` Hint: ${rpcError.hint}.` : '';
        setError(
          `No pudimos registrar tu pedido. [${code}] ${msg}.${hint} Si persiste, contacta a soporte con este mensaje.`
        );
        setSubmitting(false);
        return;
      }

      // La RPC devuelve { ok, pedido_id, duplicated }. Si duplicated=true
      // significa que ya había sido enviado con esta idempotency_key
      // (doble-click) y reusamos el pedido existente — para el usuario es éxito.
      const result = rpcResult as { ok?: boolean; pedido_id?: string; duplicated?: boolean } | null;
      if (!result?.ok) {
        logger.error('submit_pedido devolvió ok=false', result);
        setError('La aplicación respondió de forma inesperada. Verifica en "Mis Pedidos" si tu pedido fue registrado antes de reintentar.');
        setSubmitting(false);
        return;
      }

      // Éxito → limpiar carrito y mostrar pantalla final.
      if (total >= MIN_ACTIVACION) setCompraCalificada(true);
      setEarnedPuntos(puntos);
      clear();
      expiresAtRef.current = null;
      setStep('done');
    } catch (err) {
      // UX-004: el catch puede atrapar errores de red u otros.
      logger.error('Pedido submission unexpected error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Tuvimos un problema inesperado al enviar tu pedido: ${msg}`);
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
                    <span className="text-[#9CA3AF] uppercase tracking-widest font-bold text-[10px]">
                      {selectedPaymentMethod === 'transferencia' ? 'Banco destino' : 'Método de pago'}
                    </span>
                    <span className="text-[#111111] font-semibold">
                      {selectedPaymentMethod === 'transferencia'
                        ? selectedBanco
                        : selectedPaymentMethod === 'paypal'
                          ? 'PayPal'
                          : 'Payphone'}
                    </span>
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
                  disabled={submitting || (selectedPaymentMethod === 'transferencia' && !voucherFile)}
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

  // ─── PAY STEP (bancos + pasarelas + N° comprobante + countdown) ──
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
              {selectedPaymentMethod === 'transferencia'
                ? 'Transfiere el total a una de nuestras cuentas y registra el número del comprobante.'
                : 'Completa el pago con tu pasarela elegida y luego sube la prueba del pago para confirmar el pedido.'}
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
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5] flex items-center gap-2">
                <CreditCard size={15} className="text-[#1A4E26]" />
                <h2 className="font-heading font-bold text-[#111111] text-sm">Selecciona un método de pago *</h2>
              </div>
              <div className="p-5 space-y-3">
                {paymentMethodOptions.map((method) => {
                  const enabled =
                    method.value === 'transferencia' ||
                    (method.value === 'payphone' && isPayPhoneConfigured()) ||
                    (method.value === 'paypal' && isPayPalConfigured());
                  const selected = selectedPaymentMethod === method.value;

                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => {
                        if (!enabled) return;
                        setSelectedPaymentMethod(method.value);
                        setError('');
                      }}
                      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                        selected ? 'border-[#1A4E26] bg-[#EBF4ED] shadow-[0_8px_24px_rgba(26,78,38,0.15)]' : 'border-[#C8D8CB] bg-white hover:border-[#A8C2AD]'
                      } ${!enabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-heading font-bold text-[#111111] text-base">{method.label}</p>
                          <p className="text-[#6B7280] text-xs mt-1">{enabled ? method.description : 'Configura la variable del proveedor para activarlo.'}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'bg-[#1A4E26] border-[#1A4E26]' : 'border-[#C8D8CB]'}`}>
                          {selected && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {selectedPaymentMethod === 'payphone' && isPayPhoneConfigured() && (
                  <div className="rounded-2xl border border-[#C8D8CB] bg-[#F4F7F5] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-[#6B7280] font-bold">
                      <span>Cajita de pagos</span>
                      <span className="text-[#1A4E26]">Payphone</span>
                    </div>
                    <PayPhoneBox
                      amount={Number(total.toFixed(2))}
                      clientTransactionId={payPhoneTransactionIdRef.current}
                      reference={`Pedido Sumak ${payPhoneTransactionIdRef.current}`}
                      token={getPayPhoneToken()}
                      storeId={getPayPhoneStoreId()}
                    />
                  </div>
                )}

                {selectedPaymentMethod === 'paypal' && isPayPalConfigured() && (
                  <div className="rounded-2xl border border-[#C8D8CB] bg-[#F4F7F5] p-4">
                    <div ref={paypalButtonContainerRef} className="min-h-[56px]" />
                  </div>
                )}

                {selectedPaymentMethod === 'transferencia' && (
                  <div className="space-y-3">
                    <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5] flex items-center gap-2">
                      <CreditCard size={15} className="text-[#1A4E26]" />
                      <h2 className="font-heading font-bold text-[#111111] text-sm">Selecciona la cuenta de destino *</h2>
                    </div>
                    <div className="space-y-3">
                      {bankAccounts.map((b) => {
                        const selected = selectedBanco === b.banco;
                        const accent = b.brandColor ?? '#1A4E26';
                        const docLabel = b.documento ?? 'Identificación';
                        return (
                          <div
                            key={b.banco}
                            className={`relative rounded-2xl border-2 transition-all overflow-hidden ${
                              selected ? 'border-[#1A4E26] bg-[#EBF4ED] shadow-[0_8px_24px_rgba(26,78,38,0.15)]' : 'border-[#C8D8CB] bg-white hover:border-[#A8C2AD]'
                            }`}
                          >
                            <div className="h-1 w-full" style={{ backgroundColor: accent }} />
                            <button
                              type="button"
                              onClick={() => setSelectedBanco(b.banco)}
                              className="w-full flex items-center justify-between gap-3 p-4 text-left"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: selected ? '#1A4E26' : `${accent}20`,
                                    color: selected ? '#FFFFFF' : accent,
                                  }}
                                >
                                  <Landmark size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-heading font-bold text-[#111111] text-base leading-tight">{b.banco}</p>
                                  <p className="text-[#6B7280] text-xs mt-0.5">{b.tipo} · {b.titular}</p>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'bg-[#1A4E26] border-[#1A4E26]' : 'border-[#C8D8CB]'}`}>
                                {selected && <Check size={14} className="text-white" />}
                              </div>
                            </button>

                            {selected && (
                              <div className="px-4 pb-4 pt-1 space-y-2">
                                <div className="flex items-center justify-between gap-3 bg-white border-2 border-[#1A4E26]/30 rounded-xl px-4 py-3">
                                  <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Número de cuenta</p>
                                    <p className="text-[#1A4E26] font-mono font-bold text-xl leading-none mt-1 break-all">{b.numero}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(b.numero, `${b.banco}-num`)}
                                    className="shrink-0 inline-flex items-center gap-1 bg-[#1A4E26] hover:bg-[#163F1E] text-white rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                                  >
                                    {copiedField === `${b.banco}-num` ? (
                                      <><Check size={13} /> Copiado</>
                                    ) : (
                                      <><Copy size={13} /> Copiar</>
                                    )}
                                  </button>
                                </div>

                                {[
                                  { label: 'Beneficiario', value: b.titular, key: `${b.banco}-tit` },
                                  { label: docLabel, value: b.identificacion, key: `${b.banco}-id`, mono: true },
                                  ...(b.email ? [{ label: 'Email', value: b.email, key: `${b.banco}-em`, mono: true }] : []),
                                ].map((row) => (
                                  <div key={row.key} className="flex items-center justify-between gap-3 bg-white border border-[#C8D8CB] rounded-xl px-3 py-2">
                                    <div className="min-w-0">
                                      <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">{row.label}</p>
                                      <p className={`text-[#111111] font-semibold truncate text-sm ${row.mono ? 'font-mono' : ''}`}>{row.value}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(row.value, row.key)}
                                      className="shrink-0 inline-flex items-center gap-1 text-[#1A4E26] hover:bg-[#EBF4ED] rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors"
                                    >
                                      {copiedField === row.key ? (
                                        <><Check size={12} /> Copiado</>
                                      ) : (
                                        <><Copy size={12} /> Copiar</>
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
                )}
              </div>
            </div>

            <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#C8D8CB] bg-[#F4F7F5] flex items-center gap-2">
                <Receipt size={15} className="text-[#1A4E26]" />
                <h2 className="font-heading font-bold text-[#111111] text-sm">Número del comprobante *</h2>
              </div>
              <div className="p-5">
                <p className="text-[#6B7280] text-sm mb-3">
                  {selectedPaymentMethod === 'transferencia'
                    ? 'Una vez realizada la transferencia, escribe aquí el número o referencia que figura en tu voucher.'
                    : 'Escribe aquí la referencia, ID de pedido o comprobante que te dará la pasarela de pago.'}
                </p>
                <input
                  type="text"
                  value={voucherNumero}
                  onChange={(e) => setVoucherNumero(e.target.value)}
                  placeholder={selectedPaymentMethod === 'transferencia' ? 'Ej: 0123456789' : 'Ej: PAY-123456'}
                  className="w-full bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3 text-[#111111] font-mono text-base placeholder-[#9CA3AF] focus:outline-none focus:border-[#1A4E26] transition-colors"
                  autoComplete="off"
                />
                <p className="text-[11px] text-[#9CA3AF] mt-2 flex items-start gap-1.5">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  {selectedPaymentMethod === 'transferencia'
                    ? 'Este número debe coincidir con la foto del voucher que subirás en el siguiente paso.'
                    : 'Guarda esta referencia para identificar tu pago y súbela junto con el comprobante en el siguiente paso.'}
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
                  <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold mb-1">
                    {selectedPaymentMethod === 'transferencia' ? 'Monto a transferir' : 'Monto total'}
                  </p>
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
                  {selectedPaymentMethod === 'transferencia' ? 'Aceptar y subir voucher' : 'Aceptar y continuar'} <ArrowRight size={15} />
                </button>

                <p className="text-[10px] text-[#9CA3AF] text-center leading-tight">
                  {selectedPaymentMethod === 'transferencia'
                    ? 'Tras aceptar podrás subir la foto del voucher. El pedido se enviará al admin solo cuando subas el comprobante.'
                    : 'La pasarela elegida abrirá el pago externo. Cuando el pago quede confirmado, el pedido seguirá adelante sin pedir comprobante manual.'}
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
                      <img src={item.imagen} alt={item.nombre} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
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
                        {item.codigo.startsWith('PKG-') && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-[#D4AF37]/15 text-[#92680A] border border-[#D4AF37]/30 rounded px-1.5 py-0.5">
                            <Sparkles size={9} /> Pack
                          </span>
                        )}
                      </p>
                    </Link>
                    <p className="text-[#6B7280] text-xs mt-0.5">
                      <span className="line-through">${item.pvp.toFixed(2)}</span>{' '}
                      <span className="text-[#1A4E26] font-bold">${item.precio.toFixed(2)}</span>{' '}
                      <span className="text-[#9CA3AF]">c/u</span>
                    </p>
                    {item.packSelections && item.packSelections.length > 0 && (
                      <details className="mt-1.5 text-[10px]">
                        <summary className="text-[#1A4E26] font-bold cursor-pointer hover:text-[#0F2E18] transition-colors inline-flex items-center gap-1">
                          <Package size={10} /> Ver {item.packSelections.reduce((s, x) => s + x.cantidad, 0)} productos incluidos
                        </summary>
                        <ul className="mt-1.5 pl-3 space-y-0.5 border-l border-[#C8D8CB]">
                          {item.packSelections.map((s) => (
                            <li key={s.codigo} className="text-[#6B7280]">
                              <span className="font-bold text-[#1A4E26]">{s.cantidad}x</span> {s.nombre}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
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
                      <p className="font-bold">Faltan ${(MIN_ACTIVACION - subtotal).toFixed(2)} para activarte</p>
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
