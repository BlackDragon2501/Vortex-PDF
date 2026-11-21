# Vórtex PDF

Herramientas PDF de **Vortex Company**: **unir**, **dividir**, **convertir** (PDF a
imágenes/texto, imágenes a PDF), **firmar** con tu firma dibujada, **comprimir sin perder
calidad** (object streams + limpieza de metadatos; modo máximo opcional) y **proteger con
contraseña (AES-256)** con permisos de impresión/copia/modificación.

**Gratis, sin anuncios y 100% local**: todo se procesa en tu navegador, ningún archivo se
sube a ningún servidor. Sin base de datos ni backend: despliegue 100% estático/serverless.

## Desarrollo

```bash
bun install
bun run dev        # http://localhost:3000
bun run lint

# tests de las operaciones (compresion y cifrado, con verificacion via pypdf)
bun scripts/gen-test-pdf.ts
bun scripts/test-new-tools.ts
python3 scripts/verify-new-tools.py
```

## Despliegue en Vercel

1. Sube este repositorio a GitHub (ya está preparado como repo independiente).
2. Importa el repo en Vercel (framework: Next.js detectado automáticamente).
3. Copia la URL entregada por Vercel en el portal Vórtex Studio
   (`repos/vortex-portal/src/lib/apps.ts` → `APP_URLS.pdf`).

## Suite Vórtex

- Portal: **Vórtex Studio** (hub con las URLs de cada app)
- Apps: **Vórtex Editor**, **Vórtex PDF**, Vórtex Music (independiente)

---

Derechos Reservados © 2026 Vortex Company. Todos los derechos reservados. Vórtex Studio
Soporte: vortexmusic.soporte.app@gmail.com
