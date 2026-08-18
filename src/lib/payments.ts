export type PaymentMethod = 'transferencia' | 'payphone' | 'paypal';

const INVALID_CHECKOUT_HINTS = ['404', 'Errors/404', 'not found'];

function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    const lowered = parsed.href.toLowerCase();
    if (INVALID_CHECKOUT_HINTS.some((hint) => lowered.includes(hint.toLowerCase()))) {
      return '';
    }

    return parsed.href;
  } catch {
    return '';
  }
}

export const paymentMethodOptions: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: 'transferencia',
    label: 'Transferencia bancaria',
    description: 'Paga con depósito o transferencia y luego sube el comprobante.',
  },
  {
    value: 'payphone',
    label: 'Payphone',
    description: 'Temporalmente no disponible.',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    description: 'Temporalmente no disponible.',
  },
];

export function isDigitalPaymentsEnabled() {
  return false;
}

export function getPayPhoneCheckoutUrl() {
  return normalizeHttpUrl(import.meta.env.VITE_PAYPHONE_CHECKOUT_URL ?? '');
}

export function getPayPhoneToken() {
  return (import.meta.env.VITE_PAYPHONE_TOKEN ?? '').trim().replace(/^['"]|['"]$/g, '');
}

export function getPayPhoneStoreId() {
  return (import.meta.env.VITE_PAYPHONE_STORE_ID ?? '').trim().replace(/^['"]|['"]$/g, '');
}

export function isPayPhoneConfigured() {
  return false;
}

export function getPayPalClientId() {
  return (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim().replace(/^['"]|['"]$/g, '');
}

export function isPayPalConfigured() {
  return false;
}

export function getAvailablePaymentMethods() {
  return paymentMethodOptions.filter((method) => {
    if (method.value === 'transferencia') return true;
    if (method.value === 'payphone') return isPayPhoneConfigured();
    if (method.value === 'paypal') return isPayPalConfigured();
    return false;
  });
}
