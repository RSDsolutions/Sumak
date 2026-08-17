export type PaymentMethod = 'transferencia' | 'payphone' | 'paypal';

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
  return (import.meta.env.VITE_PAYPHONE_CHECKOUT_URL ?? '').trim();
}

export function isPayPhoneConfigured() {
  return Boolean(getPayPhoneCheckoutUrl());
}

export function getPayPalClientId() {
  return (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '').trim();
}

export function isPayPalConfigured() {
  return Boolean(getPayPalClientId());
}

export function getAvailablePaymentMethods() {
  return paymentMethodOptions.filter((method) => {
    if (method.value === 'transferencia') return true;
    if (method.value === 'payphone') return isPayPhoneConfigured();
    if (method.value === 'paypal') return isPayPalConfigured();
    return false;
  });
}
