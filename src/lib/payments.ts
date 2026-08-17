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
    description: 'Paga con tarjeta, saldo o link seguro de Payphone.',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    description: 'Pago seguro con PayPal para compras rápidas y verificables.',
  },
];

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
  const token = getPayPhoneToken();
  const storeId = getPayPhoneStoreId();
  return Boolean(token && storeId) || Boolean(getPayPhoneCheckoutUrl());
}

export function getPayPalClientId() {
  return (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim().replace(/^['"]|['"]$/g, '');
}

export function isPayPalConfigured() {
  const clientId = getPayPalClientId();
  if (!clientId) return false;
  if (clientId.length < 12) return false;
  return !/^(?:test|demo|placeholder|changeme|your_|example|tu_)/i.test(clientId);
}

export function getAvailablePaymentMethods() {
  return paymentMethodOptions.filter((method) => {
    if (method.value === 'transferencia') return true;
    if (method.value === 'payphone') return isPayPhoneConfigured();
    if (method.value === 'paypal') return isPayPalConfigured();
    return false;
  });
}
