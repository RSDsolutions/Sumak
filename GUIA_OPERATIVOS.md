# Guía de operativos — Tanda 7

> Documento de activación para los hallazgos de la Tanda 7. Cada uno está **listo en código** pero requiere acción externa (Supabase, Cloudflare, Sentry, GitHub) para activarse en producción.
>
> Lee la sección que necesites; el orden es independiente.

---

## SEC-006 · Security headers (Vercel) — **automático en el próximo deploy**

Ya activo. Cuando Vercel haga el próximo deploy de `main`, todas las rutas saldrán con:

- `Content-Security-Policy` que bloquea scripts externos, iframes (clickjacking), submits a sitios externos y mixed content.
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` que niega geolocation, mic, camera, payment, USB, sensores.
- `Strict-Transport-Security: max-age=1y; includeSubDomains; preload` (HSTS)

### Verificar

```bash
curl -I https://sumak.com.ec/ | grep -iE 'content-security|x-frame|strict-transport|referrer'
```

### Si alguna feature deja de funcionar

CSP es estricto. Si necesitas permitir un CDN nuevo:

1. Abre `vercel.json` → bloque `Content-Security-Policy`.
2. Agrega el origen al directive correcto (`script-src`, `style-src`, `connect-src`, etc.).
3. Redeploy.

---

## OPS-001 · CI workflow (GitHub Actions) — **automático en próximo PR**

El workflow `.github/workflows/ci.yml` corre en cada PR a `main` y cada push directo:

1. `npm ci`
2. `npm run lint` (typecheck — pre-existing errors no rompen, ver TODO en el yml)
3. `npm run build` con env vars dummy
4. Verifica que `dist/index.html` y `dist/assets/` existan

No despliega nada. El deploy sigue por el workflow `deploy.yml` existente.

### Verificar

Abre un PR cualquiera — debe aparecer un check verde "CI / Typecheck + Build".

---

## SEC-008 · Bucket constraints (Supabase) — **correr SQL una vez**

Migración 009 fija límites server-side: 5 MB por archivo, solo JPG/PNG/WebP/HEIC/PDF.

### Aplicar

1. SQL Editor de Supabase → New query.
2. Pegar el contenido de `supabase/migrations/009_bucket_constraints.sql`.
3. Run.

### Verificar

```sql
select id, file_size_limit, allowed_mime_types
  from storage.buckets
 where id in ('pedidos-vouchers', 'documentos-afiliacion');
```

Debe mostrar `5242880` y los 5 mime types.

---

## SEC-007 · Captcha en login (Cloudflare Turnstile) — **3 pasos externos**

El scaffolding está listo en `src/components/Captcha.tsx`. Para activarlo:

### Paso 1 — Cuenta gratuita en Cloudflare

1. Si no tienes Cloudflare, regístrate gratis: <https://dash.cloudflare.com>
2. Sidebar → **Turnstile** → "Add site".
3. Domain: `sumak.com.ec` (y tu dominio de staging si tienes).
4. Widget mode: **Managed** (recomendado).
5. Pre-clearance: **Off** (no necesitamos).
6. Crear → copia las dos keys que aparecen:
   - **Site Key** (pública, va al frontend)
   - **Secret Key** (privada, va a Supabase Auth)

### Paso 2 — Configurar Supabase Auth

1. Supabase Dashboard → Project Settings → **Authentication** → **Auth Providers** → Captcha protection.
2. Activar y seleccionar **Cloudflare Turnstile**.
3. Pegar el **Secret Key**.
4. Save.

### Paso 3 — Variable de entorno en Vercel

1. Vercel Dashboard → tu proyecto → Settings → **Environment Variables**.
2. Agregar:
   - Name: `VITE_TURNSTILE_SITE_KEY`
   - Value: el Site Key del paso 1
   - Environments: Production, Preview, Development
3. Redeploy.

### Comportamiento

- Sin la env var: el componente `Captcha` renderiza `null` y el login funciona como hoy.
- Con la env var: aparece el widget de Turnstile bajo el campo de contraseña; el botón de login queda deshabilitado hasta resolverlo.

### Verificar

DevTools del navegador en `/login` → debe verse el iframe de `challenges.cloudflare.com`. La CSP de `vercel.json` ya lo permite.

---

## OPS-004 · Sentry (errores) — **5 pasos externos**

`src/lib/logger.ts` está preparado para reportar a Sentry sin agregar peso al bundle. Usamos el "Loader Script" oficial.

### Paso 1 — Cuenta gratuita en Sentry

1. <https://sentry.io> → Sign up (free tier 5k events/mes).
2. New project → Platform: **Browser JavaScript**.
3. Copy el **DSN** (algo como `https://abc123@o12345.ingest.sentry.io/67890`).

### Paso 2 — Loader Script en index.html

En Sentry → Project Settings → **Loader Script** copia el snippet, algo así:

```html
<script
  src="https://js.sentry-cdn.com/<TU_PUBLIC_KEY>.min.js"
  crossorigin="anonymous"
></script>
```

Pégalo en `index.html` dentro del `<head>`, cerca de los otros scripts.

### Paso 3 — Extender CSP

En `vercel.json` agregar al `Content-Security-Policy`:

- `script-src`: añadir `https://js.sentry-cdn.com`
- `connect-src`: añadir `https://*.ingest.sentry.io`

### Paso 4 — Configurar el cliente (en el HEAD del index.html, después del loader script)

```html
<script>
  Sentry.onLoad(function () {
    Sentry.init({
      environment: 'production',
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    });
  });
</script>
```

### Paso 5 — Verificar

Después de deploy, abre DevTools en cualquier página y en consola:
```js
throw new Error('test sentry');
```
Debe aparecer en el panel de Sentry en <1 min.

A partir de ese momento, **toda** llamada a `logger.error('mensaje', err)` envía el evento.

---

## Resumen visual

```
┌──────────────────┬───────────────────┬─────────────────────────┐
│ Hallazgo         │ Estado en código  │ Acción externa          │
├──────────────────┼───────────────────┼─────────────────────────┤
│ SEC-006 headers  │ ✅ vercel.json    │ Ninguna (auto en deploy)│
│ OPS-001 CI       │ ✅ ci.yml         │ Ninguna (auto en PR)    │
│ SEC-008 buckets  │ ✅ migration 009  │ Correr SQL en Supabase  │
│ SEC-007 captcha  │ ✅ scaffolding    │ 3 pasos (CF + SB + env) │
│ OPS-004 Sentry   │ ✅ logger ready   │ 5 pasos (Sentry CDN+CSP)│
└──────────────────┴───────────────────┴─────────────────────────┘
```

Si activás los 5, cierran 5 hallazgos más del tracking. Caso contrario, el código sigue funcionando idéntico (todo es opt-in).

---

*Última actualización: Tanda 7.*
