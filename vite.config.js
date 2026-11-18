import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Los encabezados de seguridad viven en vercel.json (los aplica Vercel en
// producción). `vite preview` usa los mismos, para poder probar el build con
// ellos antes de publicar (por ejemplo, que la política de contenido no
// bloquee las fotos, los mapas o la cámara).
const encabezadosProduccion = Object.fromEntries(
  JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
    .headers.find((h) => h.source === '/(.*)').headers.map(({ key, value }) => [key, value])
)

// https://vite.dev/config/
export default defineConfig({
  preview: { headers: encabezadosProduccion },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro lo hace la app (src/lib/serviceWorker.js), no un script
      // en index.html: así la ficha pública no lo registra y quien solo
      // escanea un collar no descarga la app entera en segundo plano.
      injectRegister: false,
      // Manejo de push (public/sw-push.js) sumado al service worker generado.
      workbox: { importScripts: ['sw-push.js'] },
      manifest: {
        name: 'Huella Blanca',
        short_name: 'Huella Blanca',
        description: 'Identificación y recuperación de mascotas perdidas',
        lang: 'es-AR',
        theme_color: '#2e5c8a',
        background_color: '#faf9f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
