import { useEffect } from 'react';

/**
 * Hook de SEO por ruta (atiende SEO-001 y SEO-003).
 *
 * Mantiene title, description, canonical, Open Graph, Twitter Cards y
 * opcionalmente JSON-LD (Schema.org) al día con la página actual.
 *
 * Como es una SPA, el index.html sirve un default para crawlers que NO
 * ejecutan JS. Cuando la página monta este hook, los crawlers que SÍ
 * ejecutan JS (Googlebot moderno, Facebook scraper, etc.) ven los meta
 * tags correctos.
 *
 * Nota: para SEO completo con crawlers viejos, lo ideal sería migrar
 * a Next.js / Astro o pre-renderizar con vite-plugin-ssg. Eso es SEO-004
 * en la auditoría y queda diferido.
 */

interface SEOInput {
  title?: string;
  description?: string;
  /** ruta absoluta o relativa para og:image. default = logo Sumak */
  image?: string;
  type?: 'website' | 'article' | 'product';
  /** path relativo o URL absoluta para canonical y og:url */
  url?: string;
  noindex?: boolean;
  /** objeto JSON-LD para Schema.org structured data */
  jsonLd?: object;
}

const SITE_BASE_URL = 'https://sumak.com.ec';
const DEFAULT_TITLE = 'Sumak Vida Ecuador — Productos Naturales y Oportunidad Multinivel';
const DEFAULT_DESCRIPTION =
  'Productos naturales de bienestar formulados con plantas medicinales ecuatorianas. Únete a la red Sumak Vida Ecuador y construye tu negocio multinivel.';
const DEFAULT_IMAGE = '/LOGO_SUMAK.png';

function upsertMeta(name: string, content: string, attrKey: 'name' | 'property' = 'name') {
  const selector = `meta[${attrKey}="${name}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrKey, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  const selector = `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const JSON_LD_ID = '__sumak_jsonld__';

function setJsonLd(data: object) {
  let el = document.getElementById(JSON_LD_ID);
  if (!el) {
    el = document.createElement('script');
    el.id = JSON_LD_ID;
    el.setAttribute('type', 'application/ld+json');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd() {
  const el = document.getElementById(JSON_LD_ID);
  if (el) el.remove();
}

function absolutize(pathOrUrl: string, fallback: string): string {
  const value = pathOrUrl || fallback;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${SITE_BASE_URL}${value}`;
  return `${SITE_BASE_URL}/${value}`;
}

export function useSEO({
  title,
  description,
  image,
  type = 'website',
  url,
  noindex = false,
  jsonLd,
}: SEOInput) {
  // Serializamos jsonLd para la dependencia del effect (estable por contenido).
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const finalTitle = title || DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESCRIPTION;
    const finalImage = absolutize(image || '', DEFAULT_IMAGE);
    const finalUrl = url
      ? (url.startsWith('http') ? url : `${SITE_BASE_URL}${url.startsWith('/') ? url : '/' + url}`)
      : `${SITE_BASE_URL}${window.location.pathname}`;

    document.title = finalTitle;

    upsertMeta('description', finalDesc);
    upsertMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    upsertMeta('og:type', type, 'property');
    upsertMeta('og:title', finalTitle, 'property');
    upsertMeta('og:description', finalDesc, 'property');
    upsertMeta('og:image', finalImage, 'property');
    upsertMeta('og:url', finalUrl, 'property');
    upsertMeta('og:site_name', 'Sumak Vida Ecuador', 'property');
    upsertMeta('og:locale', 'es_EC', 'property');

    // Twitter Cards
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', finalTitle);
    upsertMeta('twitter:description', finalDesc);
    upsertMeta('twitter:image', finalImage);

    // Canonical
    upsertLink('canonical', finalUrl);

    if (jsonLd) {
      setJsonLd(jsonLd);
    } else {
      removeJsonLd();
    }
  }, [title, description, image, type, url, noindex, jsonLdKey, jsonLd]);
}
