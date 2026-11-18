// Web Push para el dueño (PER04 / PER03): suscribir este dispositivo a los
// avisos y guardar la suscripción en `suscripciones_push`. El envío lo hace la
// Edge Function `notificar`, que firma con la clave privada VAPID; esta es la
// clave pública, que no es secreta.
import { supabase } from './supabase'
import { registrarServiceWorkerSiCorresponde } from './serviceWorker'

export const CLAVE_PUBLICA_VAPID =
  'BF_I5bjyWIILm8s9Y5DliwA50vYwgoXaA4AHBOmGprB9lEzBi1psn6wUHqAar7zerco8tmLQaGyZ_GjwuNC2FDo'

function base64UrlABytes(base64Url) {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(base64)
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

export function pushSoportado() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// En iPhone/iPad el push solo funciona con la app agregada a la pantalla de inicio.
export function esIosSinInstalar() {
  // El iPad en modo escritorio se presenta como Mac, pero con pantalla táctil.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  return ios && !instalada
}

// Para consultar el estado: si todavía no hay service worker, no hay
// suscripción posible (o estamos en `npm run dev`).
async function registroActivo() {
  if (!navigator.serviceWorker.controller && !(await navigator.serviceWorker.getRegistration())) return null
  return navigator.serviceWorker.ready
}

// Para activar: desde el 2026-11-18 el service worker lo registra la app un
// instante después de abrir cada pantalla (src/lib/serviceWorker.js), así que
// si la persona toca "Activar avisos" enseguida puede no estar todavía. En vez
// de rendirse, lo registra en ese momento y espera a que esté listo (hasta 20 s).
async function registroParaActivar() {
  const existente = await registroActivo()
  if (existente) return existente
  registrarServiceWorkerSiCorresponde(window.location.pathname)
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 20000)),
  ])
}

// 'no_soportado' | 'denegado' | 'activo' | 'inactivo'
export async function estadoPush() {
  if (!pushSoportado()) return 'no_soportado'
  if (Notification.permission === 'denied') return 'denegado'
  const registro = await registroActivo()
  if (!registro) return 'inactivo'
  const suscripcion = await registro.pushManager.getSubscription()
  return suscripcion ? 'activo' : 'inactivo'
}

export async function activarPush(perfilId) {
  if (!pushSoportado()) throw new Error('no_soportado')
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('denegado')

  const registro = await registroParaActivar()
  if (!registro) throw new Error('sin_service_worker')

  const suscripcion =
    (await registro.pushManager.getSubscription()) ||
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlABytes(CLAVE_PUBLICA_VAPID),
    }))

  const { endpoint, keys } = suscripcion.toJSON()
  const { error } = await supabase
    .from('suscripciones_push')
    .upsert(
      { perfil_id: perfilId, endpoint, p256dh: keys.p256dh, auth: keys.auth, navegador: navegadorCorto() },
      { onConflict: 'endpoint' },
    )
  if (error) {
    await suscripcion.unsubscribe().catch(() => {})
    throw error
  }
  return suscripcion
}

export async function desactivarPush() {
  const registro = await registroActivo()
  const suscripcion = registro ? await registro.pushManager.getSubscription() : null
  if (!suscripcion) return
  await supabase.from('suscripciones_push').delete().eq('endpoint', suscripcion.endpoint)
  await suscripcion.unsubscribe()
}

function navegadorCorto() {
  const ua = navigator.userAgent
  const so = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Otro'
  const nav = /Firefox/.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Otro'
  return `${so} · ${nav}`
}
