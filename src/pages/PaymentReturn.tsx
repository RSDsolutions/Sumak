import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
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

export default function PaymentReturn() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clear } = useCart();

  const provider = searchParams.get('provider') ?? 'payphone';

  // --- Leer el estado real del pago ---
  // Payphone Payment Box V2 envía: ?id=...&clientTransactionId=...&transactionStatus=Approved|Declined|Canceled
  // PayPal envía: ?status=success|cancelled
  // Si no hay ningún parámetro de estado conocido, no asumimos nada.
  const payphoneStatus = searchParams.get('transactionStatus'); // Approved | Declined | Canceled
  const genericStatus = searchParams.get('status') ?? searchParams.get('payment_status');
  const isPathCancel = location.pathname.includes('/cancel');

  // Determinar el estado real:
  // Para Payphone: confiar en transactionStatus de la URL
  // Para otros: confiar en status/payment_status o la ruta
  let resolvedStatus: 'approved' | 'declined' | 'unknown';
  if (provider === 'payphone') {
    if (payphoneStatus === 'Approved') resolvedStatus = 'approved';
    else if (payphoneStatus === 'Declined' || payphoneStatus === 'Canceled') resolvedStatus = 'declined';
    else resolvedStatus = 'unknown'; // No hay status → no asumimos nada hasta verificar con backend
  } else {
    // PayPal y otros
    const s = (genericStatus ?? (isPathCancel ? 'cancelled' : '')).toLowerCase();
    if (['success', 'approved', 'completed', 'paid'].includes(s)) resolvedStatus = 'approved';
    else if (['cancel', 'cancelled', 'rejected', 'failed', 'error'].includes(s)) resolvedStatus = 'declined';
    else resolvedStatus = 'unknown';
  }

  const orderId = searchParams.get('orderId') ?? searchParams.get('id') ?? searchParams.get('reference') ?? '';
  const providerLabel = provider === 'paypal' ? 'PayPal' : provider === 'payphone' ? 'Payphone' : 'Pago';

  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalError, setFinalError] = useState('');
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [pedidoItems, setPedidoItems] = useState<PendingExternalCheckout['items']>([]);
  const [pedidoTotal, setPedidoTotal] = useState(0);
  const [isFinalized, setIsFinalized] = useState(false);

  // Solo intentar registrar si el estado es aprobado o desconocido (desconocido → verificar con backend)
  const shouldAttemptFinalize = resolvedStatus === 'approved' || resolvedStatus === 'unknown';

  useEffect(() => {
    if (!shouldAttemptFinalize || !user || !['payphone', 'paypal'].includes(provider)) return;

    const stored = localStorage.getItem(PENDING_EXTERNAL_CHECKOUT_KEY);
    if (!stored) {
      // Sin datos en localStorage: no podemos registrar el pedido
      if (resolvedStatus === 'approved') {
        setFinalError(
          'No encontramos los datos de tu compra guardados en este navegador. ' +
          'Si el pago fue debitado, contacta al admin con tu referencia de Payphone.'
        );
      }
      return;
    }

    let pending: PendingExternalCheckout | null = null;
    try {
      pending = JSON.parse(stored) as PendingExternalCheckout;
    } catch {
      localStorage.removeItem(PENDING_EXTERNAL_CHECKOUT_KEY);
      return;
    }

    if (!pending || pending.provider !== provider) return;

    let cancelled = false;

    async function finalizePendingCheckout() {
      setIsFinalizing(true);
      setFinalError('');

      try {
        // --- VERIFICACIÓN CON BACKEND PARA PAYPHONE ---
        // Para Payphone, si el URL ya trae transactionStatus=Approved no necesitamos verificar.
        // Si el status es desconocido, llamamos al backend para confirmar.
        // Nota: Si el URL trajo Declined/Canceled, nunca llegamos aquí (shouldAttemptFinalize = false).
        if (provider === 'payphone' && resolvedStatus === 'unknown') {
          const clientTxId = searchParams.get('clientTransactionId');
          if (!orderId || !clientTxId) {
            throw new Error('Faltan datos de la transacción para verificar el pago con Payphone.');
          }

          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payphone-checkout', {
            body: { id: orderId, clientTxId },
          });

          if (verifyError || !verifyData) {
            throw new Error('No se pudo conectar con Payphone para verificar tu pago. Intenta de nuevo o contacta al admin.');
          }

          if (!verifyData.approved) {
            const reason = verifyData.status === 'Canceled' ? 'Cancelaste el pago en Payphone.'
                         : verifyData.status === 'Declined' ? 'El pago fue declinado (verifica tus fondos o contacta a tu banco).'
                         : 'El pago no fue aprobado por Payphone.';
            throw new Error(`${reason} Por favor, intenta nuevamente.`);
          }
        }

        // --- REGISTRAR EL PEDIDO EN LA BD ---
        const itemsSnapshot = pending!.items;
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
          p_idempotency_key: pending!.idempotencyKey,
          p_items: itemsPayload,
          p_voucher_url: null,
          p_voucher_numero: orderId || null,
          p_banco_destino: providerLabel,
          p_notas: pending!.notes ?? null,
        });

        if (rpcError) {
          throw rpcError;
        }

        const result = rpcResult as { ok?: boolean; pedido_id?: string; duplicated?: boolean } | null;
        if (!result?.ok) {
          throw new Error('El pago fue confirmado pero el pedido no pudo registrarse. Contacta al admin con tu referencia.');
        }

        if (!cancelled) {
          localStorage.removeItem(PENDING_EXTERNAL_CHECKOUT_KEY);
          clear();
          setPedidoId(result.pedido_id ?? null);
          setPedidoItems(itemsSnapshot);
          setPedidoTotal(totalAmount);
          setIsFinalized(true);
        }
      } catch (error) {
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : 'No se pudo registrar el pedido automáticamente.';
          setFinalError(msg);
        }
      } finally {
        if (!cancelled) {
          setIsFinalizing(false);
        }
      }
    }

    void finalizePendingCheckout();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, provider, resolvedStatus, orderId]);

  // ─── ESTADO: PAGO DECLINADO / CANCELADO ───────────────────────────────────
  if (resolvedStatus === 'declined') {
    const isDeclined = payphoneStatus === 'Declined';
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-red-200 bg-white shadow-[0_20px_60px_rgba(17,17,17,0.08)] overflow-hidden">
          <div className="bg-gradient-to-br from-red-600 to-red-700 px-8 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-4">
              <XCircle size={42} className="text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-white mb-1">
              {isDeclined ? 'Pago rechazado' : 'Pago cancelado'}
            </h1>
            <p className="text-white/80 text-sm">
              {isDeclined
                ? 'Tu pago fue rechazado. Verifica tus fondos o usa otra forma de pago.'
                : 'Cancelaste el proceso de pago en Payphone.'}
            </p>
          </div>
          <div className="p-6">
            {orderId && (
              <div className="mb-4 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Referencia {providerLabel}</p>
                <p className="text-[#111111] font-mono font-bold text-sm mt-0.5">{orderId}</p>
              </div>
            )}
            <p className="text-sm text-[#6B7280] mb-5">
              {isDeclined
                ? 'No se realizó ningún cargo. Puedes intentarlo de nuevo con otra tarjeta o método de pago.'
                : 'No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl border border-[#C8D8CB] bg-[#F4F7F5] px-4 py-3 text-sm font-semibold text-[#111111] transition hover:border-[#A8C2AD]"
              >
                Volver al inicio
              </Link>
              <Link
                to="/dashboard/pedido/nuevo"
                className="inline-flex items-center justify-center rounded-xl bg-[#1A4E26] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#163F1E]"
              >
                Intentar de nuevo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ESTADO: PAGO APROBADO o EN VERIFICACIÓN ──────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-[28px] border border-[#C8D8CB] bg-white shadow-[0_20px_60px_rgba(17,17,17,0.08)] overflow-hidden">
        <div className={`px-8 py-8 text-center ${
          finalError && !isFinalized
            ? 'bg-gradient-to-br from-red-600 to-red-700'
            : isFinalized
              ? 'bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A]'
              : 'bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A]'
        }`}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
            {isFinalizing
              ? <Loader2 size={42} className="text-white animate-spin" />
              : finalError && !isFinalized
                ? <XCircle size={42} className="text-white" />
                : isFinalized
                  ? <CheckCircle2 size={42} className="text-white" />
                  : <CheckCircle2 size={42} className="text-white" />
            }
          </div>
          <h1 className="font-heading text-3xl font-bold text-white mb-1">
            {isFinalizing
              ? 'Verificando pago...'
              : finalError && !isFinalized
                ? 'Problema con el pago'
                : isFinalized
                  ? '¡Pedido confirmado!'
                  : 'Verificando pago...'}
          </h1>
          <p className="text-white/80 text-sm">
            {isFinalizing
              ? 'Confirmando el pago con Payphone y registrando tu pedido...'
              : finalError && !isFinalized
                ? 'Hubo un problema al procesar tu pago.'
                : isFinalized
                  ? `Tu pago con ${providerLabel} fue confirmado y el pedido está en proceso.`
                  : 'Por favor espera...'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {isFinalizing && (
            <div className="flex items-center gap-3 bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl px-4 py-3 text-sm text-[#1A4E26]">
              <div className="w-4 h-4 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Confirmando pago y registrando pedido. No cierres esta página...</span>
            </div>
          )}

          {finalError && !isFinalized && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-sm text-red-700">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="font-semibold">{finalError}</p>
              </div>
              {finalError.includes('contacta') ? null : (
                <p className="text-xs text-red-600 mt-1">
                  Si crees que el cargo fue realizado, contacta al admin con tu referencia: <strong>{orderId}</strong>
                </p>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:bg-red-50"
                >
                  Volver al inicio
                </Link>
                <Link
                  to="/dashboard/pedido/nuevo"
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Intentar de nuevo
                </Link>
              </div>
            </div>
          )}

          {isFinalized && (
            <>
              {pedidoId && (
                <div className="flex items-center justify-between bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">N° de Pedido</p>
                    <p className="text-[#111111] font-mono font-bold text-sm mt-0.5">{pedidoId.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <CheckCircle2 size={20} className="text-[#1A4E26]" />
                </div>
              )}

              {pedidoItems.length > 0 && (
                <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#C8D8CB] bg-white">
                    <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Productos del pedido</span>
                  </div>
                  <div className="p-3 space-y-2 max-h-44 overflow-y-auto">
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
                      <span className="font-heading font-bold text-[#111111] text-sm">Total pagado</span>
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
                El admin verificará tu pago y coordinará el envío. Te notificaremos cuando esté listo.
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-xl border border-[#C8D8CB] bg-[#F4F7F5] px-4 py-3 text-sm font-semibold text-[#111111] transition hover:border-[#A8C2AD]"
                >
                  Volver al inicio
                </Link>
                <Link
                  to="/dashboard/pedidos"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A4E26] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#163F1E]"
                >
                  Ver mis pedidos <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
