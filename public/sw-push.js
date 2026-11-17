// Manejo de Web Push en el service worker. vite-plugin-pwa lo suma al service
// worker generado con importScripts (ver vite.config.js). El contenido lo arma
// la Edge Function `notificar`: { titulo, cuerpo, url, tag }.

self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : '' }
  }

  const titulo = datos.titulo || 'Huella Blanca'
  const opciones = {
    body: datos.cuerpo || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: datos.tag || undefined,
    data: { url: datos.url || '/panel' },
    lang: 'es-AR',
  }

  evento.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = new URL((evento.notification.data && evento.notification.data.url) || '/panel', self.location.origin).href

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          ventana.focus()
          if ('navigate' in ventana) return ventana.navigate(destino)
          return
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})
