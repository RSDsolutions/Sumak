export type PaymentMethod = 'transferencia' | 'payphone' | 'paypal' | 'stripe';

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
    description: 'Paga de forma segura con tarjeta o saldo disponible en Payphone.',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    description: 'Pago seguro con PayPal para compras rápidas y verificables.',
  },
  {
    value: 'stripe',
    label: 'Stripe',
    description: 'Pago con tarjeta u otros métodos habilitados en Stripe.',
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

export function getStripePublishableKey() {
  return (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim();
}

export function getStripeCheckoutUrl() {
  return (
    (import.meta.env.VITE_STRIPE_CHECKOUT_URL ?? import.meta.env.VITE_STRIPE_PAYMENT_LINK ?? '')
      .trim()
  );
}

export function isStripeConfigured() {
  return Boolean(getStripePublishableKey() || getStripeCheckoutUrl());
}
