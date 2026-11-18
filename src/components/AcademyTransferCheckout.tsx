import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Info,
  Landmark,
  Lock,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { bankAccounts, type BankAccount } from '../data';
import {
  getAllPaymentMethodsWithStatus,
  getPayPhoneStoreId,
  getPayPhoneToken,
  isPayPhoneConfigured,
  type PaymentMethod,
} from '../lib/payments';
import PayPhoneBox from './PayPhoneBox';

export interface CheckoutItemSummary {
  id: string;
  title: string;
  price: number;
}

interface AcademyTransferCheckoutProps {
  recipes?: CheckoutItemSummary[];
  items?: CheckoutItemSummary[];
  summaryTitle?: string;
  total: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (file: File, bank: BankAccount, voucherNumber: string) => void;
  onDigitalPayment?: (provider: 'payphone' | 'paypal') => void;
  clientTransactionId?: string;
}

type Step = 'method_and_account' | 'voucher';

export default function AcademyTransferCheckout({
  recipes,
  items,
  summaryTitle = 'Resumen de Compra Académica',
  total,
  submitting,
  onClose,
  onSubmit,
  onDigitalPayment,
  clientTransactionId,
}: AcademyTransferCheckoutProps) {
  const lineItems = items ?? recipes ?? [];
  const paymentMethods = getAllPaymentMethodsWithStatus();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [step, setStep] = useState<Step>('method_and_account');
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(bankAccounts[0] ?? null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  async function copyValue(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('No se pudo copiar el dato.');
    }
  }

  function handleContinue() {
    if (paymentMethod === 'transferencia') {
      if (!selectedBank) {
        setError('Selecciona la cuenta bancaria de destino.');
        return;
      }
      setError('');
      setStep('voucher');
      return;
    }

    if (onDigitalPayment && (paymentMethod === 'payphone' || paymentMethod === 'paypal')) {
      setError('');
      onDigitalPayment(paymentMethod);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedBank) {
      setStep('method_and_account');
      setError('Selecciona la cuenta de destino.');
      return;
    }
    if (voucherNumber.trim().length < 4) {
      setError('Ingresa el número de comprobante (mínimo 4 caracteres).');
      return;
    }
    if (!receiptFile) {
      setError('Debes subir la imagen o PDF del comprobante de pago.');
      return;
    }
    if (receiptFile.size > 5 * 1024 * 1024) {
      setError('El comprobante no puede superar los 5 MB.');
      return;
    }
    setError('');
    onSubmit(receiptFile, selectedBank, voucherNumber.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Checkout SUMAK Academy</h2>
            <p className="text-white/80 text-xs sm:text-sm mt-1">
              {step === 'method_and_account'
                ? 'Selecciona tu método de pago y realiza tu inscripción o compra'
                : 'Adjunta tu comprobante bancario para verificación y activación'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Resumen de Ítems */}
          <div className="bg-[#F4F7F5] border border-[#C8D8CB] p-4 rounded-xl space-y-2.5">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Landmark size={15} className="text-[#1A4E26]" /> {summaryTitle}
            </h3>
            <ul className="space-y-1.5">
              {lineItems.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium truncate mr-4">{item.title}</span>
                  <span className="font-bold text-gray-900 shrink-0">${item.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2.5 border-t border-[#C8D8CB] flex justify-between font-black text-lg">
              <span className="text-gray-900">Total a Pagar</span>
              <span className="text-[#1A4E26]">${total.toFixed(2)} USD</span>
            </div>
          </div>

          {step === 'method_and_account' ? (
            <>
              {/* Selector de Método de Pago (Transferencia Activa + Pasarelas Digitales Pre-integradas) */}
              <div className="space-y-2.5">
                <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                  1. Método de Pago
                </h3>
                <div className="grid gap-2.5">
                  {paymentMethods.map((method) => {
                    const isSelected = paymentMethod === method.value;
                    const Icon =
                      method.value === 'transferencia'
                        ? Landmark
                        : method.value === 'payphone'
                          ? Wallet
                          : CreditCard;

                    return (
                      <button
                        key={method.value}
                        type="button"
                        disabled={!method.enabled}
                        onClick={() => {
                          if (method.enabled) {
                            setPaymentMethod(method.value);
                            setError('');
                          }
                        }}
                        className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                          !method.enabled
                            ? 'border-slate-200 bg-slate-50/80 opacity-75 cursor-not-allowed'
                            : isSelected
                              ? 'border-[#1A4E26] bg-[#EBF4ED] shadow-2xs'
                              : 'border-[#C8D8CB] bg-white hover:border-[#1A4E26]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              !method.enabled
                                ? 'bg-slate-200 text-slate-500'
                                : isSelected
                                  ? 'bg-[#1A4E26] text-white'
                                  : 'bg-[#F4F7F5] text-[#1A4E26]'
                            }`}
                          >
                            <Icon size={17} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm text-gray-900">{method.label}</span>
                              {method.enabled ? (
                                isSelected && (
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#1A4E26] text-white px-2 py-0.5 rounded-full">
                                    Activo
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                                  <Lock size={10} /> Próximamente
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">{method.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contenido según el método elegido */}
              {paymentMethod === 'transferencia' && (
                <>
                  <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl flex gap-3">
                    <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-blue-900">
                      <p className="font-bold mb-0.5">Transferencia o Depósito bajo Confirmación</p>
                      <p>
                        Transfiere exactamente <strong>${total.toFixed(2)} USD</strong> a una de nuestras cuentas oficiales y en el siguiente paso sube tu comprobante.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                      2. Selecciona la cuenta de destino *
                    </h3>
                    {bankAccounts.map((bank) => {
                      const selected = selectedBank?.banco === bank.banco;
                      return (
                        <button
                          key={bank.banco}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={`w-full text-left rounded-xl border p-4 transition-colors ${
                            selected
                              ? 'border-[#1A4E26] bg-[#EBF4ED]'
                              : 'border-[#C8D8CB] hover:border-[#1A4E26]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{bank.banco}</p>
                              <p className="text-xs text-gray-500">{bank.tipo}</p>
                            </div>
                            {selected && <Check size={18} className="text-[#1A4E26]" />}
                          </div>
                          <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-xs">
                            <span className="text-gray-500">Número de cuenta</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                void copyValue(bank.numero, `${bank.banco}-number`);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.stopPropagation();
                                  void copyValue(bank.numero, `${bank.banco}-number`);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[#1A4E26] font-mono font-bold hover:underline"
                            >
                              {bank.numero} <Copy size={12} />
                            </span>
                            <span className="text-gray-500">Beneficiario</span>
                            <span className="font-semibold text-gray-800">{bank.titular}</span>
                            <span className="text-gray-500">{bank.documento || 'RUC / C.I.'}</span>
                            <span className="font-mono font-semibold text-gray-800">
                              {bank.identificacion}
                            </span>
                          </div>
                          {copied === `${bank.banco}-number` && (
                            <p className="text-[11px] font-bold text-[#1A4E26] mt-2">
                              ✓ Número de cuenta copiado al portapapeles
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {paymentMethod === 'payphone' && isPayPhoneConfigured() && clientTransactionId && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700">
                    Completa tu pago directo con Cajita PayPhone o continúa al link seguro:
                  </p>
                  <PayPhoneBox
                    amount={total}
                    clientTransactionId={clientTransactionId}
                    reference={summaryTitle}
                    token={getPayPhoneToken()}
                    storeId={getPayPhoneStoreId()}
                  />
                </div>
              )}

              {error && <p className="text-xs sm:text-sm font-semibold text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleContinue}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1A4E26] hover:bg-[#0F2E18] text-white font-black rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  {paymentMethod === 'transferencia' ? (
                    <>
                      Subir Comprobante <ArrowRight size={17} />
                    </>
                  ) : submitting ? (
                    'Conectando pasarela...'
                  ) : (
                    <>
                      Pagar con {paymentMethod === 'payphone' ? 'PayPhone' : 'PayPal'}{' '}
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#EBF4ED] border border-[#C8D8CB] flex items-center justify-between text-xs sm:text-sm text-[#0B2913]">
                <span className="flex items-center gap-2">
                  <Landmark size={16} className="text-[#1A4E26]" />
                  Cuenta destino: <strong>{selectedBank?.banco}</strong> ({selectedBank?.numero})
                </span>
                <button
                  type="button"
                  onClick={() => setStep('method_and_account')}
                  className="text-xs font-bold text-[#1A4E26] hover:underline"
                >
                  Cambiar
                </button>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                  Número de comprobante / referencia bancaria *
                </label>
                <input
                  value={voucherNumber}
                  onChange={(event) => setVoucherNumber(event.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4E26]"
                  placeholder="Ej. 094812349"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                  Archivo del comprobante (Imagen o PDF) *
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#1A4E26] bg-gray-50 border-gray-300 transition-colors">
                  <Upload size={24} className="text-[#1A4E26] mb-1.5" />
                  <p className="text-xs sm:text-sm text-gray-600 font-medium text-center px-3">
                    {receiptFile
                      ? `✓ ${receiptFile.name}`
                      : 'Haz clic para adjuntar foto o PDF del comprobante (máx. 5 MB)'}
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => setReceiptFile(event.target.files?.[0] || null)}
                    required
                  />
                </label>
              </div>

              {error && <p className="text-xs sm:text-sm font-semibold text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('method_and_account')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl text-sm"
                >
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#1A4E26] hover:bg-[#0F2E18] text-white font-black rounded-xl disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Enviando comprobante...' : 'Confirmar y Enviar Pago'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
