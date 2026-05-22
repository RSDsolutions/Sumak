# Sumak

Aplicación web React/Vite para TAKTIS Training Institute, con catálogo de cursos, páginas institucionales, blog, certificaciones y formulario de contacto por WhatsApp.

## Requisitos

- Node.js 20 o superior
- npm

## Desarrollo

```bash
npm install
npm run dev
```

La app se levanta por defecto en `http://localhost:3000`.

## Validación

```bash
npm run lint
npm run build
npm run test:e2e
```

Las pruebas E2E recorren las rutas públicas, validan clics principales, menú móvil, formulario de WhatsApp y enlaces vacíos.
