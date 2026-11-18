// Prueba de Web Push de punta a punta con Chrome real (headless): activar los
// avisos desde el panel, provocar un escaneo lejos de casa y comprobar que la
// notificación llega al service worker.
import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, sleep, resultados, check, db, SERVICE, api, rpc } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:4173'

const TAG = 'prueba-push-' + randomBytes(3).toString('hex')
const cols = "(select count(*) from perfiles) perfiles, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from escaneos) escaneos, (select count(*) from avistamientos) avistamientos, (select count(*) from auth.users) usuarios_auth, (select count(*) from notificaciones) notificaciones, (select count(*) from suscripciones_push) suscripciones"
const base0 = db('select ' + cols)[0]
console.log('línea base:', JSON.stringify(base0))

const ids = []
let chrome
try {
  const clave = randomBytes(12).toString('hex') + 'Aa1!'
  const email = `${TAG}@example.com`
  const u = await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })
  if (u.s >= 300) throw new Error('crear usuario ' + JSON.stringify(u))
  const P = u.j.id; ids.push(P)
  await api('POST', '/rest/v1/perfiles', { id: P, nombre: 'PRUEBA PUSH', rol: 'usuario' })
  const m = await api('POST', '/rest/v1/mascotas', { dueno_id: P, nombre: 'Pushi', especie: 'gato', domicilio_lat: -46.4380, domicilio_lng: -67.5280, radio_metros: 100 }, { Prefer: 'return=representation' })
  const M = m.j[0].id
  const codigo = 'PP' + randomBytes(3).toString('hex').toUpperCase()
  await api('POST', '/rest/v1/placas', { codigo, mascota_id: M, estado: 'activa' })

  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9445', '--user-data-dir=' + DIR + '/perfil-push', 'about:blank'], { stdio: 'ignore' })
  let lista
  for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9445/json')).json(); if (lista.find(t => t.type === 'page')) break } catch {} await sleep(250) }
  const ws = new WebSocket(lista.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let n = 0; const esp = new Map()
  ws.onmessage = e => { const msg = JSON.parse(e.data); if (msg.id && esp.has(msg.id)) { esp.get(msg.id)(msg); esp.delete(msg.id) } }
  const cmd = (method, params = {}) => new Promise(r => { const i = ++n; esp.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async x => { const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.exceptionDetails ? 'EXC: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) : r.result?.result?.value }
  const foto = async nombre => { const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/' + nombre, Buffer.from(r.result.data, 'base64')) }
  const ir = async u => { await cmd('Page.navigate', { url: u }); await sleep(2500) }
  await cmd('Page.enable')
  await cmd('Browser.grantPermissions', { origin: B, permissions: ['notifications'] })
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })

  await ir(B + '/login')
  await ev(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};
    set(document.querySelector('input[type=email]'),${JSON.stringify(email)}); set(document.querySelector('input[type=password]'),${JSON.stringify(clave)});
    document.querySelector('button[type=submit]').click(); return true})()`)
  await sleep(3500)
  check('login lleva a /panel', (await ev('location.pathname')) === '/panel', await ev('location.pathname'))

  // el service worker tiene que estar registrado y con el manejador de push
  const sw = await ev(`(async()=>{const r=await navigator.serviceWorker.ready; return {scope:r.scope, activo:!!r.active, permiso:Notification.permission}})()`)
  check('service worker activo y permiso de notificaciones concedido', sw?.activo && sw.permiso === 'granted', JSON.stringify(sw))
  const swFuente = await (await fetch(B + '/sw.js')).text()
  check('el service worker importa sw-push.js', /importScripts\([^)]*sw-push\.js/.test(swFuente))

  const diag = await ev(`(async()=>{const reg=await navigator.serviceWorker.getRegistration(); return {push:'PushManager' in window, noti:'Notification' in window, controller:!!navigator.serviceWorker.controller, reg:!!reg, ua:navigator.userAgent.slice(0,80), standalone:matchMedia('(display-mode: standalone)').matches, mascotas:document.querySelectorAll('.lista-mascotas li').length, html:document.querySelector('main')?.innerHTML.slice(0,300)}})()`)
  console.log('diagnóstico:', JSON.stringify(diag))
  const tarjeta = await ev(`document.querySelector('.avisos-push')?.innerText || null`)
  check('el panel muestra la tarjeta de avisos', !!tarjeta && /Activar avisos/.test(tarjeta), tarjeta && tarjeta.slice(0, 60))
  await foto('push-1-antes.png')

  // activar
  await ev(`[...document.querySelectorAll('.avisos-push button')].find(b=>/Activar/.test(b.innerText)).click(); true`)
  // La suscripción la resuelve el servicio de push del navegador (FCM en
  // Chrome): con una conexión lenta puede tardar bastante más de 25 s.
  const t0 = Date.now()
  for (let i = 0; i < 120; i++) { const t = await ev(`document.querySelector('.avisos-push')?.innerText || ''`); if (/Desactivar avisos|error|No pudimos/.test(t)) break; await sleep(500) }
  console.log(`activación: ${((Date.now() - t0) / 1000).toFixed(1)} s · botón:`, await ev(`document.querySelector('.avisos-push button')?.innerText`))
  console.log('sondeo subscribe directo:', await ev(`(async()=>{try{const r=await navigator.serviceWorker.ready; const k='BF_I5bjyWIILm8s9Y5DliwA50vYwgoXaA4AHBOmGprB9lEzBi1psn6wUHqAar7zerco8tmLQaGyZ_GjwuNC2FDo'; const pad='='.repeat((4-k.length%4)%4); const b=atob((k+pad).replace(/-/g,'+').replace(/_/g,'/')); const key=Uint8Array.from(b,c=>c.charCodeAt(0)); const s=await Promise.race([r.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:key}), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout 15s')),15000))]); return 'OK '+s.endpoint.slice(0,50)}catch(e){return 'ERR '+e.name+': '+e.message}})()`))
  const despues = await ev(`document.querySelector('.avisos-push')?.innerText || ''`)
  check('tras el clic la tarjeta pasa a "Desactivar avisos" sin error', /Desactivar avisos/.test(despues) && !/No pudimos/.test(despues), despues.slice(0, 120))
  await foto('push-2-activo.png')
  const sub = db(`select endpoint, navegador from suscripciones_push where perfil_id='${P}'`)
  check('la suscripción quedó guardada con endpoint del servicio de push', sub.length === 1 && /^https:\/\//.test(sub[0].endpoint), sub[0] && sub[0].endpoint.slice(0, 40) + '… · ' + sub[0].navegador)

  // provocar el aviso: escaneo lejos de casa → posible pérdida
  const antes = Number(db(`select count(*) from notificaciones where perfil_id='${P}'`)[0].count)
  const r = await rpc('registrar_escaneo', { p_codigo: codigo, p_lat: -46.4600, p_lng: -67.5280 })
  check('escaneo lejos registrado', r.s === 200 && r.j.lejos_de_casa === true)
  let noti
  for (let i = 0; i < 15; i++) { noti = db(`select titulo, cuerpo, enviada_en, resultado from notificaciones where perfil_id='${P}' order by creado_en desc limit 1`)[0]; if (noti?.enviada_en) break; await sleep(1500) }
  check('la Edge Function envió el push (enviadas=1, sin fallas)', noti?.resultado?.enviadas === 1 && noti.resultado.fallidas === 0, JSON.stringify(noti?.resultado))

  // ¿llegó al service worker?
  let mostradas = []
  for (let i = 0; i < 20; i++) {
    mostradas = await ev(`(async()=>{const r=await navigator.serviceWorker.ready; const ns=await r.getNotifications(); return ns.map(n=>({titulo:n.title, cuerpo:n.body, url:n.data&&n.data.url, tag:n.tag}))})()`)
    if (Array.isArray(mostradas) && mostradas.length) break
    await sleep(1000)
  }
  check('la notificación se MOSTRÓ en el dispositivo con el título y el texto esperados', Array.isArray(mostradas) && mostradas.some(x => x.titulo === noti?.titulo && x.cuerpo === noti?.cuerpo), JSON.stringify(mostradas).slice(0, 200))
  check('...con la url del panel para abrir al tocarla', Array.isArray(mostradas) && mostradas.some(x => x.url === '/panel'), JSON.stringify(mostradas.map?.(x => x.url)))
  check('en la base quedó registrada', Number(db(`select count(*) from notificaciones where perfil_id='${P}'`)[0].count) === antes + 1)

  // desactivar
  await ev(`[...document.querySelectorAll('.avisos-push button')].find(b=>/Desactivar/.test(b.innerText)).click(); true`)
  for (let i = 0; i < 20; i++) { const t = await ev(`document.querySelector('.avisos-push')?.innerText || ''`); if (/Activar avisos/.test(t)) break; await sleep(500) }
  check('desactivar vuelve a "Activar avisos"', /Activar avisos/.test(await ev(`document.querySelector('.avisos-push')?.innerText || ''`)))
  check('...y borra la suscripción de la base', Number(db(`select count(*) from suscripciones_push where perfil_id='${P}'`)[0].count) === 0)
  const subNav = await ev(`(async()=>{const r=await navigator.serviceWorker.ready; return !!(await r.pushManager.getSubscription())})()`)
  check('...y el navegador ya no está suscripto', subNav === false, subNav)
  ws.close()
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message || String(e))
} finally {
  console.log('limpiando…')
  for (const id of ids) { await rpc('purgar_cuenta', { p_id: id }, SERVICE); await api('DELETE', '/auth/v1/admin/users/' + id) }
  db(`delete from placas where codigo like 'PP%' and mascota_id is null and creado_en > now() - interval '10 minutes'`)
  try { chrome?.kill() } catch {}
  const f = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
  process.exit(0)
}
