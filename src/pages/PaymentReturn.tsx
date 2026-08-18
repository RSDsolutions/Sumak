import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { supabase } from '../lib/supabase';

const PENDING_EXTERNAL_CHECKOUT_KEY = 'sumak_pending_external_checkout_v1';

type PendingExternalCheckout = {
  provider: 'payphone' | 'paypal';
  idempotencyKey: string;
  notes: string | null;
  createdAt: number;
  items: Array<{
    codigo: string;
    nombre: string;
    pvp: number;
    precio: number;
    cantidad: number;
    packSelections?: Array<{ codigo: string; nombre: string; cantidad: number }>;
  }>;
};

type PaymentStatusState = 'verifying' | 'approved' | 'declined' | 'error';

export default function PaymentReturn() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clear } = useCart();

  const provider = searchParams.get('provider') ?? 'payphone';
  const providerLabel = provider === 'paypal' ? 'PayPal' : provider === 'payphone' ? 'Payphone' : 'Pago';

  // Parámetros de la URL
  const payphoneStatus = searchParams.get('transactionStatus'); // Approved | Declined | Canceled
  const genericStatus = searchParams.get('status') ?? searchParams.get('payment_status');
  const isPathCancel = location.pathname.includes('/cancel');
  const orderId = searchParams.get('orderId') ?? searchParams.get('id') ?? searchParams.get('reference') ?? '';
  const clientTxId = searchParams.get('clientTransactionId') ?? searchParams.get('clientTxId') ?? '';

  // Estados de la vista
  const [statusState, setStatusState] = useState<PaymentStatusState>(() => {
    // Si la URL dice explícitamente que fue cancelado o rechazado desde el inicio
    if (payphoneStatus === 'Declined' || payphoneStatus === 'Canceled') return 'declined';
    const s = (genericStatus ?? (isPathCancel ? 'cancelled' : '')).toLowerCase();
    if (['cancel', 'cancelled', 'rejected', 'failed', 'error', 'declined'].includes(s)) return 'declined';
    return 'verifying';
  });

  const [statusMessage, setStatusMessage] = useState<string>(() => {
    if (payphoneStatus === 'Declined') return 'El pago fue declinado por tu banco o por fondos insuficientes.';
    if (payphoneStatus === 'Canceled') return 'Cancelaste el proceso de pago en la pasarela.';
    return 'Verificando el estado de tu pago...';
  });

  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [pedidoItems, setPedidoItems] = useState<PendingExternalCheckout['items']>([]);
  const [pedidoTotal, setPedidoTotal] = useState(0);

  useEffect(() => {
    // Si ya determinamos que fue rechazado desde los parámetros de la URL, no hay nada que verificar
    if (statusState === 'declined') return;

    let cancelled = false;

    async function processPaymentReturn() {
      setStatusState('verifying');
      setStatusMessage('Verificando confirmación del pago...');

      try {
        // ── 1. VERIFICACIÓN CRIPTOGRÁFICA CON PAYPHONE ──
        if (provider === 'payphone') {
          if (!orderId && !clientTxId) {
            throw new Error('No se recibieron los identificadores de la transacción de Payphone.');
          }

          setStatusMessage('Consultando a los servidores de Payphone...');

          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payphone-checkout', {
            body: { id: orderId, clientTxId },
          });

          if (verifyError) {
            throw new Error('No pudimos contactar a Payphone para verificar la transacción. Intenta nuevamente.');
          }

          if (!verifyData?.approved) {
            const rawStatus = verifyData?.status ?? 'Declined';
            const failMsg = rawStatus === 'Canceled'
              ? 'Cancelaste el pago en Payphone.'
              : rawStatus === 'Declined'
                ? 'Tu pago fue rechazado por el banco (fondos insuficientes o tarjeta no autorizada).'
                : (verifyData?.message || 'El pago no fue aprobado por Payphone.');

            if (!cancelled) {
              setStatusState('declined');
              setStatusMessage(failMsg);
            }
            return;
          }
        }

        // ── 2. RECUPERAR ITEMS DEL CARRITO / CHECKOUT ──
        const stored = localStorage.getItem(PENDING_EXTERNAL_CHECKOUT_KEY);
        let pending: PendingExternalCheckout | null = null;
        if (stored) {
          try {
            pending = JSON.parse(stored) as PendingExternalCheckout;
          } catch {
            localStorage.removeItem(PENDING_EXTERNAL_CHECKOUT_KEY);
          }
        }

        if (!pending || !pending.items || pending.items.length === 0) {
          // Si no hay items en localStorage pero el pago fue aprobado
          if (!cancelled) {
            setStatusState('approved');
            setStatusMessage('Pago confirmado por Payphone. Tu pedido está siendo procesado por el administrador.');
          }
          return;
        }

        // ── 3. REGISTRAR PEDIDO EN SUPABASE VÍA RPC ──
        setStatusMessage('Pago aprobado con éxito. Creando tu pedido en el sistema...');

        const itemsSnapshot = pending.items;
        const totalAmount = itemsSnapshot.reduce((s, i) => s + i.precio * i.cantidad, 0);

        const itemsPayload = itemsSnapshot.map((item) => {
          const isPack = item.codigo.startsWith('PKG-');
          const nombreFinal = isPack && item.packSelections && item.packSelections.length > 0
            ? `${item.nombre} (incluye: ${item.packSelections.map((s) => `${s.cantidad}x ${s.nombre}`).join(', ')})`
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
          p_idempotency_key: pending.idempotencyKey,
          p_items: itemsPayload,
          p_voucher_url: null,
          p_voucher_numero: orderId || clientTxId || null,
          p_banco_destino: providerLabel,
          p_notas: pending.notes ?? null,
        });

        if (rpcError) {
          throw rpcError;
        }

        const result = rpcResult as { ok?: boolean; pedido_id?: string; duplicated?: boolean } | null;
        if (!result?.ok) {
          throw new Error('El pago fue confirmado, pero hubo un detalle al asentar el pedido. Contacta a soporte.');
        }

        if (!cancelled) {
          localStorage.removeItem(PENDING_EXTERNAL_CHECKOUT_KEY);
          clear();
          setPedidoId(result.pedido_id ?? null);
          setPedidoItems(itemsSnapshot);
          setPedidoTotal(totalAmount);
          setStatusState('approved');
          setStatusMessage(`Tu pago con ${providerLabel} fue confirmado y tu pedido ya fue enviado al admin.`);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Ocurrió un error al procesar el pago.';
          setStatusState('error');
          setStatusMessage(msg);
        }
      }
    }

    void processPaymentReturn();

    return () => {
      cancelled = true;
    };
  }, [clientTxId, orderId, provider, providerLabel]);

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA 1: PAGO DECLINADO / RECHAZADO / CANCELADO
  // ══════════════════════════════════════════════════════════════════════════
  if (statusState === 'declined') {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-red-200 bg-white shadow-[0_20px_60px_rgba(239,68,68,0.12)] overflow-hidden">
          <div className="bg-gradient-to-br from-red-600 to-rose-700 px-8 py-8 text-center text-white">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <XCircle size={44} className="text-white" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
              Pago No Completado
            </h1>
            <p className="text-red-100 text-sm max-w-md mx-auto leading-relaxed">
              {statusMessage}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-900 text-xs sm:text-sm">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No se realizó ningún cobro</p>
                <p className="text-red-700 mt-0.5 text-xs">
                  Tu pedido <strong>no fue procesado</strong> porque la transacción fue declinada por la pasarela de pagos. Puedes volver a intentarlo con otra tarjeta o saldo.
                </p>
              </div>
            </div>

            {orderId && (
              <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3 flex items-center justify-between text-xs font-mono">
                <span className="text-[#6B7280]">Referencia {providerLabel}:</span>
                <span className="font-bold text-[#111111]">{orderId}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl border border-[#C8D8CB] bg-white px-4 py-3 text-sm font-semibold text-[#111111] hover:bg-[#F4F7F5] transition-colors"
              >
                Volver a la tienda
              </Link>
              <Link
                to="/dashboard/pedido/nuevo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A4E26] px-4 py-3 text-sm font-bold text-white hover:bg-[#163F1E] transition-all shadow-md"
              >
                <ShoppingCart size={16} /> Reintentar Pedido
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA 2: VERIFICANDO EN PROCESO
  // ══════════════════════════════════════════════════════════════════════════
  if (statusState === 'verifying') {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-[#C8D8CB] bg-white shadow-[0_20px_60px_rgba(17,17,17,0.08)] overflow-hidden">
          <div className="bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] px-8 py-10 text-center text-white">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <Loader2 size={44} className="text-white animate-spin" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
              Verificando tu pago
            </h1>
            <p className="text-white/85 text-sm max-w-md mx-auto">
              {statusMessage}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-4 text-center">
            <p className="text-[#6B7280] text-xs sm:text-sm">
              Por favor no cierres ni recargues esta pestaña mientras confirmamos la transacción con los servidores de {providerLabel}.
            </p>
            <div className="w-full bg-[#EBF4ED] h-2 rounded-full overflow-hidden">
              <div className="bg-[#1A4E26] h-full w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA 3: ERROR DE PROCESAMIENTO O COMUNICACIÓN
  // ══════════════════════════════════════════════════════════════════════════
  if (statusState === 'error') {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-amber-200 bg-white shadow-[0_20px_60px_rgba(245,158,11,0.12)] overflow-hidden">
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 px-8 py-8 text-center text-white">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-4">
              <AlertTriangle size={44} className="text-white" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
              Aviso sobre tu pago
            </h1>
            <p className="text-amber-100 text-sm max-w-md mx-auto">
              {statusMessage}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs sm:text-sm">
              <p className="font-bold">¿Qué puedes hacer?</p>
              <p className="mt-1 text-xs text-amber-800">
                Si tu dinero no fue debitado, puedes reintentar el pedido. Si ya se debitó de tu cuenta, contacta a soporte con tu identificador de transacción.
              </p>
            </div>

            {orderId && (
              <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3 flex items-center justify-between text-xs font-mono">
                <span className="text-[#6B7280]">Referencia:</span>
                <span className="font-bold text-[#111111]">{orderId}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl border border-[#C8D8CB] bg-white px-4 py-3 text-sm font-semibold text-[#111111] hover:bg-[#F4F7F5] transition-colors"
              >
                Volver al inicio
              </Link>
              <Link
                to="/dashboard/pedido/nuevo"
                className="inline-flex items-center justify-center rounded-xl bg-[#1A4E26] px-4 py-3 text-sm font-bold text-white hover:bg-[#163F1E] transition-colors"
              >
                Reintentar compra
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA 4: PAGO APROBADO Y PEDIDO CONFIRMADO
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-[28px] border border-[#C8D8CB] bg-white shadow-[0_20px_60px_rgba(26,78,38,0.12)] overflow-hidden">
        <div className="bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] px-8 py-8 text-center text-white">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
            <CheckCircle2 size={44} className="text-white" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
            ¡Pago Aprobado y Pedido Confirmado!
          </h1>
          <p className="text-white/85 text-sm max-w-md mx-auto leading-relaxed">
            {statusMessage}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          {pedidoId && (
            <div className="flex items-center justify-between bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-2xl px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#1A4E26] font-bold">N° de Pedido Oficial</p>
                <p className="text-[#111111] font-mono font-extrabold text-base mt-0.5">{pedidoId.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="bg-[#1A4E26] text-white p-2 rounded-xl">
                <CheckCircle2 size={20} />
              </div>
            </div>
          )}

          {orderId && (
            <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3 flex items-center justify-between text-xs font-mono">
              <span className="text-[#6B7280]">Referencia {providerLabel}:</span>
              <span className="font-bold text-[#111111]">{orderId}</span>
            </div>
          )}

          {pedidoItems.length > 0 && (
            <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#C8D8CB] bg-white">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Productos del pedido</span>
              </div>
              <div className="p-3.5 space-y-2.5 max-h-48 overflow-y-auto">
                {pedidoItems.map((item) => (
                  <div key={item.codigo} className="flex justify-between items-center gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#111111] font-medium truncate">{item.nombre}</p>
                      <p className="text-[#9CA3AF]">{item.cantidad} × ${item.precio.toFixed(2)}</p>
                    </div>
                    <p className="text-[#1A4E26] font-bold shrink-0">${(item.precio * item.cantidad).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              {pedidoTotal > 0 && (
                <div className="px-4 py-3 border-t border-[#C8D8CB] bg-white flex justify-between items-center">
                  <span className="font-heading font-bold text-[#111111] text-sm">Total Pagado</span>
                  <span className="font-heading font-bold text-xl text-[#1A4E26]">${pedidoTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {pedidoTotal > 0 && (
            <div className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-4 py-3">
              <span className="text-[#D4AF37] font-semibold text-sm">
                ★ Ganaste <span className="font-bold">{Math.round(pedidoTotal)} puntos</span>
              </span>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            Tu pedido ya está en manos del administrador para ser preparado y despachado.
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-[#C8D8CB] bg-[#F4F7F5] px-4 py-3 text-sm font-semibold text-[#111111] hover:border-[#A8C2AD] transition-colors"
            >
              Volver a la tienda
            </Link>
            <Link
              to="/dashboard/pedidos"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A4E26] px-4 py-3 text-sm font-bold text-white hover:bg-[#163F1E] transition-all shadow-md"
            >
              Ver mis pedidos <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
