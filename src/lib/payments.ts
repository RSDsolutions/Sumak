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

export function isDigitalPaymentsEnabled(): boolean {
  const flag = String(import.meta.env.VITE_ENABLE_DIGITAL_PAYMENTS ?? '')
    .trim()
    .toLowerCase();
  return flag === 'true' || flag === '1';
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

export function isPayPhoneConfigured(): boolean {
  if (!isDigitalPaymentsEnabled()) return false;
  return Boolean(getPayPhoneToken() && getPayPhoneStoreId());
}

export function getPayPalClientId() {
  return (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim().replace(/^['"]|['"]$/g, '');
}

export function isPayPalConfigured(): boolean {
  if (!isDigitalPaymentsEnabled()) return false;
  return Boolean(getPayPalClientId());
}

export const paymentMethodOptions: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: 'transferencia',
    label: 'Transferencia bancaria',
    description: 'Paga con depósito o transferencia y sube el comprobante para confirmación.',
  },
  {
    value: 'payphone',
    label: 'PayPhone (Tarjeta o Saldo)',
    description: isPayPhoneConfigured()
      ? 'Paga al instante con tarjeta Visa/Mastercard o saldo PayPhone.'
      : 'Pasarela integrada — Se activará al finalizar el despliegue de la Academia.',
  },
  {
    value: 'paypal',
    label: 'PayPal / Tarjeta Internacional',
    description: isPayPalConfigured()
      ? 'Paga en línea de forma inmediata con tu cuenta PayPal o tarjeta.'
      : 'Pasarela integrada — Se activará al finalizar el despliegue de la Academia.',
  },
];

export function getAvailablePaymentMethods() {
  return paymentMethodOptions.filter((method) => {
    if (method.value === 'transferencia') return true;
    if (method.value === 'payphone') return isPayPhoneConfigured();
    if (method.value === 'paypal') return isPayPalConfigured();
    return false;
  });
}

export function getAllPaymentMethodsWithStatus(): Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  enabled: boolean;
}> {
  return paymentMethodOptions.map((method) => ({
    ...method,
    enabled:
      method.value === 'transferencia'
        ? true
        : method.value === 'payphone'
          ? isPayPhoneConfigured()
          : isPayPalConfigured(),
  }));
}
