import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function PaymentReturn() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const provider = searchParams.get('provider') ?? 'payphone';
  const status = searchParams.get('status') ?? searchParams.get('payment_status') ?? (location.pathname.includes('/cancel') ? 'cancelled' : 'success');
  const orderId = searchParams.get('orderId') ?? searchParams.get('reference') ?? '';

  const providerLabel = provider === 'paypal' ? 'PayPal' : provider === 'payphone' ? 'Payphone' : 'Pago';
  const isSuccess = ['success', 'approved', 'completed', 'paid'].includes(status.toLowerCase());
  const isCancelled = ['cancel', 'cancelled', 'rejected', 'failed', 'error'].includes(status.toLowerCase());

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
