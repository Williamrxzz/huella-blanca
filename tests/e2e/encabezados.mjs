// Encabezados de seguridad (vercel.json): están presentes y la política de
// contenido (CSP) no bloquea nada que la app use. Recorre todas las pantallas
// con Chrome contra el build de producción (vite preview usa los mismos
// encabezados que Vercel) y registra cada violación que reporta el navegador.
//
// Por defecto contra http://localhost:4173 (correr.mjs lo levanta); con
// BASE=https://huella-blanca.vercel.app se prueba producción.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, api, borrarCuenta, check, db, sleep } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:4173'
const TAG = 'prueba-csp-' + randomBytes(3).toString('hex')
const CODIGO = 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const ids = []
let chrome

try {
  // ---- encabezados ----
  const r0 = await fetch(B + '/m/' + CODIGO)
  const h = (n) => r0.headers.get(n) || ''
  check('Content-Security-Policy presente', /default-src 'self'/.test(h('content-security-policy')) && /frame-ancestors 'none'/.test(h('content-security-policy')))
  check('X-Content-Type-Options: nosniff', h('x-content-type-options') === 'nosniff')
  check('Referrer-Policy no manda la ruta a otros sitios', h('referrer-policy') === 'strict-origin-when-cross-origin')
  check('X-Frame-Options: DENY', h('x-frame-options') === 'DENY')
  check('Permissions-Policy: cámara y ubicación solo para la app', /camera=\(self\)/.test(h('permissions-policy')) && /geolocation=\(self\)/.test(h('permissions-policy')))

  // ---- datos: un dueño admin con una mascota perdida y un aviso con cuenta ----
  const email = `${TAG}@example.com`
  const id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  ids.push(id)
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA csp', rol: 'admin' })
  const fotoUrl = db("select foto_url from mascotas where foto_url is not null and activa order by creado_en limit 1")[0]?.foto_url ?? null
  const M = (await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Cespe', especie: 'perro', sexo: 'hembra', domicilio_lat: -46.438, domicilio_lng: -67.528, foto_url: fotoUrl }, { Prefer: 'return=representation' })).j[0].id
  await api('POST', '/rest/v1/placas', { codigo: CODIGO, mascota_id: M, estado: 'activa' })
  await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual', ultima_lat: -46.44, ultima_lng: -67.52 })

  // ---- Chrome con cámara falsa, registrando violaciones de CSP ----
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9453', `--user-data-dir=${DIR}/perfil-csp`,
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', 'about:blank'], { stdio: 'ignore' })
  let pestanas
  for (let i = 0; i < 40; i++) { try { pestanas = await (await fetch('http://127.0.0.1:9453/json')).json(); if (pestanas.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
  const ws = new WebSocket(pestanas.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let n = 0
  const esperando = new Map()
  const violaciones = []
  let pantalla = ''
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) }
    if (m.method === 'Log.entryAdded' && /Content Security Policy|Refused to/i.test(m.params.entry.text)) violaciones.push(`${pantalla}: ${m.params.entry.text.slice(0, 160)}`)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      const t = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
      if (/Content Security Policy|Refused to/i.test(t)) violaciones.push(`${pantalla}: ${t.slice(0, 160)}`)
    }
  }
  const cmd = (method, params = {}) => new Promise((res) => { const i = ++n; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const ir = async (ruta, espera = 3500) => { pantalla = ruta; await cmd('Page.navigate', { url: B + ruta }); await sleep(espera) }
  const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const clic = (texto) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(texto)}); if(!b) return false; b.click(); return true})()`)
  await cmd('Page.enable'); await cmd('Log.enable'); await cmd('Runtime.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })
  await cmd('Browser.grantPermissions', { origin: B, permissions: ['geolocation'] })
  await cmd('Emulation.setGeolocationOverride', { latitude: -46.44, longitude: -67.52, accuracy: 10 })

  // Público
  await ir('/')
  await ir('/ejemplo')
  check('ejemplo: el mapa carga sus mosaicos', await ev("document.querySelectorAll('.leaflet-tile-loaded').length > 0"))
  await clic('La vi acá'); await sleep(4000)
  await ir('/m/' + CODIGO, 5000)
  check('ficha: la foto de Storage se ve', !fotoUrl || await ev("(()=>{const i=document.querySelector('img.foto'); return !!i && i.complete && i.naturalWidth>0})()"))
  check('ficha: el mapa de la última ubicación carga', await ev("document.querySelectorAll('.leaflet-tile-loaded').length > 0"))
  await ir('/escanear', 4000)
  check('escanear: la cámara se abre', await ev("(()=>{const v=document.querySelector('video'); return !!v && !!v.srcObject})()"))
  await ir('/recuperar')

  // Con sesión
  await ir('/login')
  await escribir('input[type=email]', email); await escribir('input[type=password]', clave)
  await ev("document.querySelector('button[type=submit]').click(); true"); await sleep(4000)
  pantalla = '/panel'; await sleep(1500)
  check('el service worker se registra fuera de la ficha', await ev("navigator.serviceWorker.getRegistration().then(r=>!!r)"))
  await ir(`/mascotas/${M}/mapa`, 5000)
  await clic('Compartir la búsqueda'); await sleep(5000)
  check('el afiche se genera (foto + QR en canvas)', await ev("(()=>{const i=document.querySelector('.afiche-vista img'); return !!i && i.naturalWidth===1080})()"))
  await ir('/mascotas/nueva', 4000)
  await ir(`/mascotas/${M}/editar`, 4000)
  await ir('/placas?codigo=' + CODIGO)
  await ir('/perfil')
  await ir('/mi-historial')
  await ir('/admin/estadisticas', 4000)
  check('estadísticas: los gráficos se dibujan', await ev("document.querySelectorAll('.recharts-surface').length >= 3"))
  await ir('/admin/cuentas')

  check('ninguna violación de la política de contenido en todo el recorrido', violaciones.length === 0, violaciones.join(' | ') || 'ninguna')
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  for (const id of ids) await borrarCuenta(id)
  db(`delete from placas where codigo = '${CODIGO}'`)
  try { chrome?.kill() } catch { /* ya cerrado */ }
}
