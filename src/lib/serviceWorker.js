// Registro del service worker (PWA instalable, avisos push del dueño).
//
// No se registra en la ficha pública (/m/:codigo) ni en /ejemplo: al
// registrarse, el service worker descarga en segundo plano la app entera
// (más de 1 MB) para dejarla instalable, y quien solo escanea un collar en la
// calle, con datos móviles, no la necesita. Se registra en cuanto se abre
// cualquier otra pantalla, incluso si se llega navegando desde una ficha.
const RUTAS_SIN_SERVICE_WORKER = /^\/(m\/|ejemplo(\/|$))/

let registrado = false

export function registrarServiceWorkerSiCorresponde(ruta) {
  if (registrado || RUTAS_SIN_SERVICE_WORKER.test(ruta) || !('serviceWorker' in navigator)) return
  registrado = true
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => { registrado = false })
}
