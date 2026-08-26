import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Info, Landmark, Upload } from 'lucide-react';
import { bankAccounts, type BankAccount } from '../data';

interface RecipeSummary {
  id: string;
  title: string;
  price: number;
}

interface AcademyTransferCheckoutProps {
  recipes: RecipeSummary[];
  total: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (file: File, bank: BankAccount, voucherNumber: string) => void;
}

type Step = 'account' | 'voucher';

export default function AcademyTransferCheckout({
  recipes,
  total,
  submitting,
  onClose,
  onSubmit,
}: AcademyTransferCheckoutProps) {
  const [step, setStep] = useState<Step>('account');
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
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

  function continueToVoucher() {
    if (!selectedBank) {
      setError('Selecciona la cuenta de destino.');
      return;
    }
    setError('');
    setStep('voucher');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedBank) {
      setStep('account');
      setError('Selecciona la cuenta de destino.');
      return;
    }
    if (voucherNumber.trim().length < 4) {
      setError('Ingresa el número de comprobante (mínimo 4 caracteres).');
      return;
    }
    if (!receiptFile) {
      setError('Debes subir el comprobante de pago.');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 flex flex-col">
        <div className="bg-gradient-to-r from-[#1A4E26] to-[#2E7D32] px-6 py-5 rounded-t-2xl">
          <h2 className="text-xl font-black text-white">Confirmar Pago</h2>
          <p className="text-white/70 text-sm mt-1">
            {step === 'account' ? 'Selecciona la cuenta y registra tu transferencia' : 'Sube tu comprobante para desbloquear'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-[#F4F7F5] border border-[#C8D8CB] p-4 rounded-xl space-y-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Landmark size={16} className="text-[#1A4E26]" /> Resumen de Recetas
            </h3>
            <ul className="space-y-2">
              {recipes.map((recipe) => (
                <li key={recipe.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate mr-4">{recipe.title}</span>
                  <span className="font-bold text-gray-900">${recipe.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-[#C8D8CB] flex justify-between font-black text-lg">
              <span className="text-gray-900">Total</span>
              <span className="text-[#1A4E26]">${total.toFixed(2)}</span>
            </div>
          </div>

          {step === 'account' ? (
            <>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">Pago por transferencia</p>
                  <p>Transfiere exactamente <strong>${total.toFixed(2)}</strong> a una de nuestras cuentas.</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 text-sm">Selecciona la cuenta de destino *</h3>
                {bankAccounts.map((bank) => {
                  const selected = selectedBank?.banco === bank.banco;
                  return (
                    <button
                      key={bank.banco}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`w-full text-left rounded-xl border p-4 transition-colors ${selected ? 'border-[#1A4E26] bg-[#EBF4ED]' : 'border-[#C8D8CB] hover:border-[#1A4E26]'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">{bank.banco}</p>
                          <p className="text-xs text-gray-500">{bank.tipo}</p>
                        </div>
                        {selected && <Check size={20} className="text-[#1A4E26]" />}
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-xs">
                        <span className="text-gray-500">Número de cuenta</span>
                        <button type="button" onClick={(event) => { event.stopPropagation(); void copyValue(bank.numero, `${bank.banco}-number`); }} className="flex items-center gap-1 text-[#1A4E26] font-mono font-bold">
                          {bank.numero} <Copy size={13} />
                        </button>
                        <span className="text-gray-500">Beneficiario</span><span className="font-semibold text-gray-800">{bank.titular}</span>
                        <span className="text-gray-500">Identificación</span><span className="font-mono font-semibold text-gray-800">{bank.identificacion}</span>
                      </div>
                      {copied === `${bank.banco}-number` && <p className="text-xs text-[#1A4E26] mt-2">Número copiado</p>}
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-700 font-bold bg-gray-100 rounded-xl">Cancelar</button>
                <button type="button" onClick={continueToVoucher} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1A4E26] text-white font-black rounded-xl">Continuar <ArrowRight size={18} /></button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-700"><Landmark size={16} className="text-[#1A4E26]" /> Cuenta seleccionada: <strong>{selectedBank?.banco}</strong></div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Número de comprobante *</label>
                <input value={voucherNumber} onChange={(event) => setVoucherNumber(event.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1A4E26]" placeholder="Ej. 12345678" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subir comprobante *</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#1A4E26] bg-gray-50 border-gray-300">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 text-center px-3">{receiptFile ? receiptFile.name : 'Foto o PDF del comprobante (máx. 5 MB)'}</p>
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setReceiptFile(event.target.files?.[0] || null)} required />
                </label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('account')} className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-700 font-bold bg-gray-100 rounded-xl"><ArrowLeft size={18} /> Atrás</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-[#1A4E26] text-white font-black rounded-xl disabled:opacity-50">{submitting ? 'Enviando...' : 'Confirmar Pago'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
