import { CreditCard, Landmark, MessageCircle, Wallet } from 'lucide-react';
import { paymentMethodOptions, type PaymentMethod } from '../lib/payments';

export type PaymentSelection = PaymentMethod | 'whatsapp';

interface PaymentMethodSelectorProps {
  value: PaymentSelection;
  onChange: (value: PaymentSelection) => void;
  includeWhatsApp?: boolean;
  title?: string;
  className?: string;
}

const optionIcons = {
  transferencia: Landmark,
  payphone: Wallet,
  paypal: CreditCard,
  whatsapp: MessageCircle,
} as const;

export default function PaymentMethodSelector({
  value,
  onChange,
  includeWhatsApp = false,
  title = 'Selecciona tu método de pago',
  className = '',
}: PaymentMethodSelectorProps) {
  const options: Array<{ value: PaymentSelection; label: string; description: string }> = includeWhatsApp
    ? [
        ...paymentMethodOptions.map((option) => ({
          value: option.value,
          label: option.label,
          description: option.description,
        })),
        {
          value: 'whatsapp',
          label: 'Comprar por WhatsApp',
          description: 'Habla con atención comercial y coordina tu compra directamente.',
        },
      ]
    : paymentMethodOptions.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
      }));

  return (
    <div className={className}>
      <div className="mb-4">
        <p className="text-[#111111] font-heading font-bold text-lg">{title}</p>
      </div>

      <div className="grid gap-3">
        {options.map((option) => {
          const Icon = optionIcons[option.value as keyof typeof optionIcons] ?? Landmark;
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                selected
                  ? 'border-[#1A4E26] bg-[#EBF4ED] shadow-[0_8px_24px_rgba(26,78,38,0.08)]'
                  : 'border-[#C8D8CB] bg-white hover:border-[#A8C2AD] hover:bg-[#F9FBFA]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl ${
                    selected ? 'bg-[#1A4E26] text-white' : 'bg-[#F4F7F5] text-[#1A4E26]'
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-[#111111] text-sm sm:text-base">{option.label}</p>
                    {selected && <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A4E26]">Seleccionado</span>}
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-[#6B7280] leading-relaxed">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
