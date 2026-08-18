import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
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
  const status = searchParams.get('status') ?? searchParams.get('payment_status') ?? (location.pathname.includes('/cancel') ? 'cancelled' : 'success');
  const orderId = searchParams.get('orderId') ?? searchParams.get('reference') ?? '';
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalError, setFinalError] = useState('');
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [pedidoItems, setPedidoItems] = useState<PendingExternalCheckout['items']>([]);
  const [pedidoTotal, setPedidoTotal] = useState(0);
  const [isFinalized, setIsFinalized] = useState(false);

  const providerLabel = provider === 'paypal' ? 'PayPal' : provider === 'payphone' ? 'Payphone' : 'Pago';
  const isSuccess = ['success', 'approved', 'completed', 'paid'].includes(status.toLowerCase());
  const isCancelled = ['cancel', 'cancelled', 'rejected', 'failed', 'error'].includes(status.toLowerCase());

  useEffect(() => {
    if (!isSuccess || !user || !['payphone', 'paypal'].includes(provider)) return;

    const stored = localStorage.getItem(PENDING_EXTERNAL_CHECKOUT_KEY);
    if (!stored) return;

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
        // --- NUEVA VERIFICACIÓN DE PAYPHONE ---
        // Payphone redirige de vuelta independientemente de si el pago fue aprobado, rechazado o cancelado
        // sin un parámetro 'status' claro en la URL en el Payment Box. 
        // Verificamos criptográficamente con el backend antes de registrar el pedido.
        if (provider === 'payphone') {
          const clientTxId = searchParams.get('clientTransactionId');
          if (!orderId || !clientTxId) {
            throw new Error('Faltan datos de la transacción para verificar el pago con Payphone.');
          }

          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payphone-checkout', {
            body: { id: orderId, clientTxId },
          });

          if (verifyError || !verifyData) {
            throw new Error('No se pudo establecer conexión con Payphone para verificar tu pago.');
          }

          if (!verifyData.approved) {
            // El pago no fue aprobado (fondos insuficientes, declinado, etc)
            const reason = verifyData.status === 'Canceled' ? 'Cancelaste el pago en Payphone.' 
                         : verifyData.status === 'Declined' ? 'El pago fue declinado (verifica tus fondos o contacta a tu banco).'
                         : 'El pago no fue aprobado por Payphone.';
            
            throw new Error(`${reason} Por favor, intenta nuevamente.`);
          }
        }
        // ---------------------------------------

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
          throw new Error('La confirmación del pago llegó, pero el pedido no pudo registrarse.');
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
  }, [clear, isSuccess, orderId, provider, providerLabel, user]);

  if (isCancelled) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-red-200 bg-white shadow-[0_20px_60px_rgba(17,17,17,0.08)] p-8 sm:p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 mb-6">
            <XCircle size={42} />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[#111111] mb-3">Pago cancelado</h1>
          <p className="text-sm leading-6 text-[#6B7280] mb-6">
            El pago con {providerLabel} fue cancelado o no se completó. Puedes intentarlo nuevamente.
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
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-[#C8D8CB] bg-white shadow-[0_20px_60px_rgba(17,17,17,0.08)] overflow-hidden">
          <div className="bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] px-8 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              {isFinalizing
                ? <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 size={42} className="text-white" />
              }
            </div>
            <h1 className="font-heading text-3xl font-bold text-white mb-1">
              {isFinalizing ? 'Registrando tu pedido...' : isFinalized ? '¡Pedido confirmado!' : 'Pago recibido'}
            </h1>
            <p className="text-white/80 text-sm">
              {isFinalizing
                ? 'Estamos registrando tu pedido, por favor espera unos segundos...'
                : isFinalized
                  ? `Tu pago con ${providerLabel} fue confirmado y el pedido está en proceso.`
                  : `Tu pago con ${providerLabel} ha sido confirmado correctamente.`}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {isFinalizing && (
              <div className="flex items-center gap-3 bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl px-4 py-3 text-sm text-[#1A4E26]">
                <div className="w-4 h-4 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Registrando tu pedido en el sistema. No cierres esta página...</span>
              </div>
            )}

            {finalError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <p className="font-semibold mb-1">No pudimos registrar tu pedido automáticamente</p>
                <p className="text-xs">{finalError}</p>
                <p className="text-xs mt-1 text-red-600">
                  Tu pago sí fue procesado por {providerLabel}. Contacta al admin con tu referencia para que lo registren manualmente.
                </p>
              </div>
            )}

            {pedidoId && (
              <div className="flex items-center justify-between bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">N° de Pedido</p>
                  <p className="text-[#111111] font-mono font-bold text-sm mt-0.5">{pedidoId.slice(0, 8).toUpperCase()}</p>
                </div>
                <CheckCircle2 size={20} className="text-[#1A4E26]" />
              </div>
            )}

            {orderId && !pedidoId && (
              <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Referencia {providerLabel}</p>
                <p className="text-[#111111] font-mono font-bold text-sm mt-0.5">{orderId}</p>
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

            {isFinalized && pedidoTotal > 0 && (
              <div className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-4 py-3">
                <span className="text-[#D4AF37] font-semibold text-sm">
                  ★ Ganaste <span className="font-bold">{Math.round(pedidoTotal)} puntos</span>
                </span>
              </div>
            )}

            {isFinalized && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                El admin verificará tu pago y coordinará el envío. Te notificaremos cuando esté listo.
              </div>
            )}

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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-[28px] border border-amber-200 bg-white shadow-[0_20px_60px_rgba(17,17,17,0.08)] p-8 sm:p-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-6">
          <ArrowRight size={42} />
        </div>
        <h1 className="font-heading text-3xl font-bold text-[#111111] mb-3">Pago pendiente</h1>
        <p className="text-sm leading-6 text-[#6B7280] mb-6">
          Tu pago con {providerLabel} está en proceso. Puedes volver a intentarlo o continuar más tarde.
        </p>
        {orderId && (
          <div className="mb-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FBFA] px-4 py-3 text-sm text-[#111111]">
            <span className="text-[#6B7280]">Referencia: </span>
            <span className="font-semibold font-mono">{orderId}</span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#C8D8CB] bg-[#F4F7F5] px-4 py-3 text-sm font-semibold text-[#111111] transition hover:border-[#A8C2AD]"
          >
            Volver al inicio
          </Link>
          <Link
            to="/dashboard/pedidos"
            className="inline-flex items-center justify-center rounded-xl bg-[#1A4E26] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#163F1E]"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}
