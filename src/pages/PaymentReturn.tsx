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
        const itemsPayload = pending!.items.map((item) => {
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
          p_voucher_numero: null,
          p_banco_destino: null,
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
  }, [clear, isSuccess, provider, user]);

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-[28px] border border-[#C8D8CB] bg-white shadow-[0_20px_60px_rgba(17,17,17,0.08)] p-8 sm:p-10 text-center">
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${isSuccess ? 'bg-[#EBF4ED] text-[#1A4E26]' : isCancelled ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
          {isSuccess ? <CheckCircle2 size={42} /> : isCancelled ? <XCircle size={42} /> : <ArrowRight size={42} />}
        </div>

        <h1 className="mt-6 font-heading text-3xl font-bold text-[#111111]">
          {isSuccess ? 'Pago confirmado' : isCancelled ? 'Pago cancelado' : 'Pago pendiente'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          {isSuccess
            ? `Tu pago con ${providerLabel} ha sido confirmado correctamente.`
            : isCancelled
              ? `El pago con ${providerLabel} fue cancelado o no se completó.`
              : `Tu pago con ${providerLabel} está en proceso. Puedes volver a intentarlo o continuar más tarde.`}
        </p>

        {isFinalizing && (
          <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FBFA] px-4 py-3 text-sm text-[#111111]">
            Estamos registrando tu pedido, por favor espera unos segundos...
          </div>
        )}

        {finalError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {finalError}
          </div>
        )}

        {orderId && (
          <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FBFA] px-4 py-3 text-sm text-[#111111]">
            <span className="text-[#6B7280]">Referencia: </span>
            <span className="font-semibold">{orderId}</span>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
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
