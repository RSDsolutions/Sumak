import { useEffect, useId, useRef, useState } from 'react';

interface PayPhoneBoxProps {
  amount: number;
  currency?: string;
  clientTransactionId: string;
  reference: string;
  token: string;
  storeId: string;
}

declare global {
  interface Window {
    PPaymentButtonBox?: new (config: Record<string, unknown>) => {
      render: (container: string | HTMLElement) => void;
    };
  }
}

export default function PayPhoneBox({
  amount,
  currency = 'USD',
  clientTransactionId,
  reference,
  token,
  storeId,
}: PayPhoneBoxProps) {
  const mountId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const amountCents = Math.max(1, Math.round(Number(amount) * 100));

    if (!token || !storeId) {
      setError('Falta el token o Store ID de Payphone en la configuración del sitio.');
      return;
    }

    const cssUrl = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css';
    const scriptUrl = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js';

    const ensureStylesheet = () => {
      let link = document.querySelector<HTMLLinkElement>('link[data-payphone-box-css="true"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        link.dataset.payphoneBoxCss = 'true';
        document.head.appendChild(link);
      }
    };

    const renderBox = () => {
      if (!containerRef.current || !window.PPaymentButtonBox) {
        setError('La cajita de pago de Payphone no está disponible en este momento.');
        return;
      }

      const config = {
        token,
        clientTransactionId,
        amount: amountCents,
        amountWithoutTax: amountCents,
        currency,
        storeId,
        reference,
        lang: 'es',
        defaultMethod: 'card',
        timeZone: -5,
        optionalParameter: `Pedido ${reference}`,
      };

      try {
        const box = new window.PPaymentButtonBox(config);
        containerRef.current.id = mountId;
        containerRef.current.innerHTML = '';
        box.render(mountId);
        setError('');
      } catch {
        setError('No pudimos inicializar la cajita de Payphone con estos datos.');
      }
    };

    ensureStylesheet();

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-payphone-box-sdk="true"]');
    if (window.PPaymentButtonBox) {
      renderBox();
      return;
    }

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        renderBox();
      } else {
        existingScript.addEventListener('load', renderBox, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.type = 'module';
    script.async = true;
    script.dataset.payphoneBoxSdk = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      renderBox();
    }, { once: true });
    script.addEventListener('error', () => {
      setError('No se pudo cargar el SDK de Payphone. Revisa la conexión o la configuración del proveedor.');
    }, { once: true });
    document.head.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [amount, clientTransactionId, currency, reference, storeId, token]);

  return (
    <div className="space-y-3">
      <div ref={containerRef} id={mountId} className="min-h-[76px] rounded-xl border border-[#C8D8CB] bg-white p-2" />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
