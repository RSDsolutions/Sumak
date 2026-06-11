# Sumak Vida Ecuador — Plataforma Web

Sitio público + plataforma multinivel (dashboard de distribuidor y panel de administración) de **Sumak Vida Ecuador S.A.**

> Cierra COD-008 de la auditoría interna.
> Si vienes a este repo por primera vez, lee primero este README; el detalle de qué se ha auditado y arreglado está en [AUDITORIA_SUMAK.md](AUDITORIA_SUMAK.md) y el seguimiento por hallazgo en [TRACKING_AUDITORIA.md](TRACKING_AUDITORIA.md).

---

## Stack

- **React 19** + **TypeScript 5.8**
- **Vite 6** (dev server + build)
- **Tailwind v4** con tokens de marca en `@theme` (`src/index.css`)
- **React Router 7** (SPA)
- **Motion 12** (animaciones)
- **Lucide** (iconos)
- **Supabase** (Postgres + Auth + Storage + RLS) como backend

Sin dependencias de framework de UI (Radix/MUI) ni librerías de fetching (React Query). El estado server-side se maneja a mano con `useEffect` + `useState`.

---

## Setup local

### 1. Pre-requisitos

- Node.js ≥ 20
- npm (incluido con Node)
- Un proyecto de Supabase con su URL + claves (anon, service_role)

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Crea `.env.local` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

> ⚠️ **SEC-001 abierto**: la `SERVICE_ROLE_KEY` se está usando en el cliente y queda visible en el bundle de producción. Esto es un riesgo de seguridad pendiente — ver [TRACKING_AUDITORIA.md](TRACKING_AUDITORIA.md). Mientras tanto, **no expongas el repo público** sin antes rotar esta key y migrar a Edge Functions.

### 4. Aplicar migraciones SQL

Las migraciones están en `supabase/migrations/` numeradas en orden. Hoy se aplican manualmente desde el SQL Editor del dashboard de Supabase:

1. Abre Supabase → SQL Editor → New query.
2. Pega el contenido del archivo `.sql` y ejecuta.
3. Repite en orden hasta la última.

> Cuando se introduzca Supabase CLI (OPS-003), esto se hará con `supabase db push`.

### 5. Arrancar dev server

```bash
npm run dev
```

Abre `http://localhost:3000`. HMR activo por defecto.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite con HMR en `:3000` |
| `npm run build` | Build de producción a `dist/` con code-splitting y vendor chunks |
| `npm run preview` | Sirve el `dist/` para verificar la build localmente |
| `npm run lint` | Solo type-check (`tsc --noEmit`). Pendiente integrar ESLint (COD-004) |
| `npm run clean` | Borra `dist/` y `server.js` |

---

## Estructura del proyecto

```
sumak/
├── index.html              ← entry HTML con meta defaults + SPA redirect
├── vite.config.ts          ← config con manualChunks de vendors
├── public/                 ← assets estáticos servidos en raíz
│   ├── LOGO_SUMAK.png
│   ├── products/           ← imágenes de catálogo (slug.png)
│   ├── ingredientes/       ← imágenes de ingredientes
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── main.tsx            ← entry React + ErrorBoundary global
│   ├── App.tsx             ← BrowserRouter + lazy() de pages + providers
│   ├── index.css           ← Tailwind + tokens + focus styles
│   ├── data.ts             ← productos, planConfig, contactInfo, ranks, etc.
│   ├── components/
│   │   ├── Navbar.tsx, Footer.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── AdminLayout.tsx, DashboardLayout.tsx
│   │   ├── Modal.tsx       ← reutilizable: focus trap + ESC + aria-modal
│   │   └── Skeleton.tsx
│   ├── lib/
│   │   ├── auth.tsx        ← Supabase Auth + Profile context
│   │   ├── cart.tsx        ← carrito persistido en localStorage
│   │   ├── supabase.ts     ← clients anon + admin
│   │   ├── toast.tsx       ← ToastProvider in-house
│   │   ├── seo.tsx         ← useSEO hook (title, OG, JSON-LD)
│   │   ├── badges.ts       ← labels y colores de estados/tipos centralizados
│   │   ├── validators.ts   ← validador de cédula EC + otros
│   │   ├── logger.ts       ← wrapper sobre console.*
│   │   └── types.ts        ← tipos de dominio (Profile, Pedido, Comision...)
│   └── pages/
│       ├── (públicas)      ← Home, Productos, ProductDetail, etc.
│       ├── dashboard/      ← distribuidor (auth)
│       └── admin/          ← administración (auth + rol admin)
└── supabase/
    └── migrations/         ← *.sql numerados, idempotentes
```

---

## Convenciones de código

- **Estados y badges**: usar [`src/lib/badges.ts`](src/lib/badges.ts). No duplicar mapas locales.
- **Constantes del plan**: usar `planConfig` exportado desde `src/data.ts`. No hardcodear `0.5`, `100`, `0.40` o tiempos.
- **Logs**: usar `logger.error/warn/info` desde `src/lib/logger.ts`, no `console.*` directo (excepto en `main.tsx` ErrorBoundary).
- **Toasts y modales**: usar `useToast()` y `<Modal>`. El Modal trae focus trap y ESC built-in.
- **SEO por página**: cada page pública llama `useSEO({...})`. Las páginas autenticadas en layouts setean `noindex`.
- **Tailwind**: hay tokens de color en `index.css` `@theme` (`brand-emerald`, `brand-gold`, etc.). Las hex sueltas siguen funcionando pero la dirección es migrar a tokens.

---

## Deploy

Hoy: **GitHub Pages** (manual). Hay un workaround SPA en `index.html` para que las rutas profundas funcionen.

Pasos:
1. `npm run build`
2. Subir `dist/` a la rama `gh-pages` (o configurar GitHub Actions — pendiente OPS-001).

> **SEO-004 / SEC-006 abiertos**: GitHub Pages no permite custom headers (CSP) ni reescritura nativa de rutas SPA. La auditoría recomienda migrar a **Vercel / Netlify / Cloudflare Pages** que solucionan ambos puntos.

---

## Estado de auditoría

Resumen al día (ver [TRACKING_AUDITORIA.md](TRACKING_AUDITORIA.md) para el detalle marcable):

- ✅ Resueltos completos: hallazgos donde el código activo aplica el fix
- 🔄 Mitigados: infraestructura disponible (RPC, columna, componente), pendiente adopción
- ⏳ Pendientes: ni código ni infra todavía

---

## Documentos relacionados

- [AUDITORIA_SUMAK.md](AUDITORIA_SUMAK.md) — auditoría inicial completa (78 hallazgos)
- [AUDITORIA_FASE1_NOTAS.md](AUDITORIA_FASE1_NOTAS.md) — qué se atendió en Fase 1 (seguridad + integridad)
- [TRACKING_AUDITORIA.md](TRACKING_AUDITORIA.md) — tracking marcable de los 78 hallazgos

---

## Soporte

Material corporativo (PDFs del plan, propuestas, revista): pedir a operaciones de Sumak. **No están en el repo** por OPS-006.

- Email: `sumak.vida1979@gmail.com`
- WhatsApp: `+593 988 447 019`
- Web: `https://sumak.com.ec`
- RUC: `1291781000001`
- Oficina: 5 de Junio entre Bolívar y Calderón, Edificio Santana, primer piso, Oficina SUMAK, Babahoyo, Los Ríos
