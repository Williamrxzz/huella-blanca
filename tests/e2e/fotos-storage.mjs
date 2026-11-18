// Punto 6: fugas de Storage. Con Chrome real contra el servidor de desarrollo:
//  - editar y reemplazar la foto borra la anterior;
//  - un guardado que falla después de subir la foto la borra (rollback);
//  - crear con foto funciona igual que antes;
//  - un usuario no puede borrar fotos de otro.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { fotoDePerro, URL_, CHROME, DIR, sleep, resultados, check, db, SERVICE, ANON, api, rpc } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:5173'
const FOTO = await fotoDePerro()

const fotosDe = (uid) => db(`select name from storage.objects where bucket_id='fotos-mascotas' and name like '${uid}/%' order by created_at`).map(f => f.name)

const TAG = 'prueba-fotos-' + randomBytes(3).toString('hex')
const cols = "(select count(*) from perfiles) perfiles, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from auth.users) usuarios_auth, (select count(*) from storage.objects where bucket_id='fotos-mascotas') fotos, (select count(*) from notificaciones) notificaciones"
const base0 = db('select ' + cols)[0]
console.log('línea base:', JSON.stringify(base0))

const ids = []
let chrome
try {
  const clave = randomBytes(12).toString('hex') + 'Aa1!'
  const mk = async (sufijo, nombre) => {
    const email = `${TAG}-${sufijo}@example.com`
    const u = await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })
    if (u.s >= 300) throw new Error('crear usuario ' + JSON.stringify(u))
    ids.push(u.j.id)
    await api('POST', '/rest/v1/perfiles', { id: u.j.id, nombre, rol: 'usuario' })
    return { id: u.j.id, email }
  }
  const A = await mk('a', 'PRUEBA FOTOS A')
  const Bu = await mk('b', 'PRUEBA FOTOS B')
  // mascota de A con una foto "anterior" subida por API (como si la hubiera cargado antes)
  const fotoBytes = await (await import('node:fs/promises')).readFile(FOTO)
  const rutaVieja = `${A.id}/vieja-${Date.now()}.jpeg`
  const up = await fetch(`${URL_}/storage/v1/object/fotos-mascotas/${rutaVieja}`, { method: 'POST', headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'image/jpeg' }, body: fotoBytes })
  check('foto anterior subida por API', up.status === 200, up.status)
  const urlVieja = `${URL_}/storage/v1/object/public/fotos-mascotas/${rutaVieja}`
  const m = await api('POST', '/rest/v1/mascotas', { dueno_id: A.id, nombre: 'Fotito', especie: 'perro', sexo: 'macho', domicilio_lat: -46.4380, domicilio_lng: -67.5280, foto_url: urlVieja }, { Prefer: 'return=representation' })
  const M = m.j[0].id

  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9446', '--user-data-dir=' + DIR + '/perfil-fotos', 'about:blank'], { stdio: 'ignore' })
  let lista
  for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9446/json')).json(); if (lista.find(t => t.type === 'page')) break } catch {} await sleep(250) }
  const ws = new WebSocket(lista.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let n = 0; const esp = new Map()
  ws.onmessage = e => { const msg = JSON.parse(e.data); if (msg.id && esp.has(msg.id)) { esp.get(msg.id)(msg); esp.delete(msg.id) } }
  const cmd = (method, params = {}) => new Promise(r => { const i = ++n; esp.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async x => { const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.exceptionDetails ? 'EXC: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) : r.result?.result?.value }
  const foto = async nombre => { const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/' + nombre, Buffer.from(r.result.data, 'base64')) }
  const ir = async u => { await cmd('Page.navigate', { url: u }); await sleep(2500) }
  await cmd('Page.enable'); await cmd('DOM.enable')
  await cmd('Browser.grantPermissions', { origin: B, permissions: ['geolocation'] })
  await cmd('Emulation.setGeolocationOverride', { latitude: -46.4380, longitude: -67.5280, accuracy: 10 })
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })

  const set = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return 'no existe '+${JSON.stringify(sel)}; const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype); Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true})); return true})()`)
  const elegirArchivo = async () => {
    const doc = await cmd('DOM.getDocument', { depth: -1 })
    const q = await cmd('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' })
    await cmd('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [FOTO] })
    // espera a que termine la verificación de la foto (IA) y se habilite guardar
    for (let i = 0; i < 60; i++) { const t = await ev(`document.body.innerText.includes('Analizando la foto')`); if (!t) break; await sleep(1000) }
    return ev(`document.querySelector('button[type=submit]')?.disabled`)
  }
  const entrar = async (cuenta) => {
    await ir(B + '/login')
    await set('input[type=email]', cuenta.email); await set('input[type=password]', clave)
    await ev(`document.querySelector('button[type=submit]').click(); true`)
    await sleep(3500)
  }

  await entrar(A)
  check('login de A', (await ev('location.pathname')) === '/panel', await ev('location.pathname'))

  // ---- 1. editar y reemplazar la foto: la vieja se borra ----
  await ir(`${B}/mascotas/${M}/editar`); await sleep(1500)
  check('el formulario de edición carga la mascota', (await ev(`document.querySelector('input[placeholder*="Nombre"], input[aria-label*="Nombre"]')?.value`)) === 'Fotito' || (await ev('document.body.innerText')).includes('Fotito'))
  let habilitado = await elegirArchivo()
  check('foto nueva elegida y verificada (guardar habilitado)', habilitado === false, 'disabled=' + habilitado)
  await ev(`document.querySelector('button[type=submit]').click(); true`)
  for (let i = 0; i < 30; i++) { if ((await ev('location.pathname')) === '/panel') break; await sleep(500) }
  check('guardó y volvió al panel', (await ev('location.pathname')) === '/panel', await ev('location.pathname'))
  let fotos = fotosDe(A.id)
  const urlAhora = db(`select foto_url from mascotas where id='${M}'`)[0].foto_url
  check('la foto anterior se borró de Storage', !fotos.includes(rutaVieja), JSON.stringify(fotos))
  check('queda exactamente la foto nueva, y es la de la mascota', fotos.length === 1 && urlAhora.endsWith(fotos[0]), urlAhora?.slice(-40))
  const rutaActual = fotos[0]

  // ---- 2. editar sin cambiar la foto: no se borra nada ----
  await ir(`${B}/mascotas/${M}/editar`); await sleep(1500)
  await ev(`document.querySelector('button[type=submit]').click(); true`)
  for (let i = 0; i < 30; i++) { if ((await ev('location.pathname')) === '/panel') break; await sleep(500) }
  check('editar sin foto nueva conserva la foto actual', JSON.stringify(fotosDe(A.id)) === JSON.stringify([rutaActual]))

  // ---- 3. guardado que falla después de subir la foto (rollback) ----
  // Se fuerza el fallo con un plazo de confirmación fuera del rango permitido
  // por la base (check 1..168), eligiendo una opción agregada al select.
  await ir(`${B}/mascotas/${M}/editar`); await sleep(1500)
  habilitado = await elegirArchivo()
  check('segunda foto nueva verificada', habilitado === false, 'disabled=' + habilitado)
  await ev(`(()=>{const s=document.querySelector('select[aria-label="Plazo para confirmar una posible pérdida"]'); const o=document.createElement('option'); o.value='999'; o.textContent='999'; s.appendChild(o); return true})()`)
  await set('select[aria-label="Plazo para confirmar una posible pérdida"]', '999')
  await ev(`document.querySelector('button[type=submit]').click(); true`)
  for (let i = 0; i < 30; i++) { const t = await ev(`document.querySelector('.error')?.innerText || ''`); if (t) break; await sleep(500) }
  const errorTxt = await ev(`document.querySelector('.error')?.innerText || ''`)
  check('el guardado falló y se mostró el error', /horas_confirmacion|check/i.test(errorTxt), errorTxt.slice(0, 80))
  await sleep(1500)
  fotos = fotosDe(A.id)
  check('la foto subida en ese intento se borró (rollback)', fotos.length === 1 && fotos[0] === rutaActual, JSON.stringify(fotos))
  check('la mascota conserva su foto anterior', db(`select foto_url from mascotas where id='${M}'`)[0].foto_url.endsWith(rutaActual))
  await foto('fotos-1-error.png')

  // ---- 4. crear con foto, con fallo y sin fallo ----
  await ir(`${B}/mascotas/nueva`); await sleep(1500)
  await set('input[placeholder*="Nombre"]', 'Nuevito')
  await ev(`[...document.querySelectorAll('button')].find(b=>/ubicación actual/i.test(b.innerText)).click(); true`)
  await sleep(2500)
  habilitado = await elegirArchivo()
  check('alta: foto elegida y verificada', habilitado === false, 'disabled=' + habilitado)
  await ev(`(()=>{const s=document.querySelector('select[aria-label="Plazo para confirmar una posible pérdida"]'); const o=document.createElement('option'); o.value='999'; o.textContent='999'; s.appendChild(o); return true})()`)
  await set('select[aria-label="Plazo para confirmar una posible pérdida"]', '999')
  await ev(`document.querySelector('button[type=submit]').click(); true`)
  for (let i = 0; i < 30; i++) { const t = await ev(`document.querySelector('.error')?.innerText || ''`); if (t) break; await sleep(500) }
  check('alta fallida muestra el error', /horas_confirmacion|check/i.test(await ev(`document.querySelector('.error')?.innerText || ''`)))
  await sleep(1500)
  check('alta fallida: la foto subida se borró', JSON.stringify(fotosDe(A.id)) === JSON.stringify([rutaActual]), JSON.stringify(fotosDe(A.id)))
  check('alta fallida: no se creó la mascota', Number(db(`select count(*) from mascotas where dueno_id='${A.id}'`)[0].count) === 1)
  // ahora con un plazo válido
  await set('select[aria-label="Plazo para confirmar una posible pérdida"]', '24')
  await ev(`document.querySelector('button[type=submit]').click(); true`)
  for (let i = 0; i < 40; i++) { if ((await ev('location.pathname')) !== '/mascotas/nueva') break; await sleep(500) }
  check('alta correcta: salió del formulario', (await ev('location.pathname')) !== '/mascotas/nueva', await ev('location.pathname'))
  const nueva = db(`select id, foto_url from mascotas where dueno_id='${A.id}' and nombre='Nuevito'`)[0]
  fotos = fotosDe(A.id)
  check('alta correcta: mascota creada con su foto en Storage', nueva && fotos.length === 2 && fotos.some(f => nueva.foto_url.endsWith(f)), JSON.stringify(fotos))

  // ---- 5. seguridad: B no puede borrar fotos de A ----
  const login = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: Bu.email, password: clave }) })
  const tokenB = (await login.json()).access_token
  const del = await fetch(`${URL_}/storage/v1/object/fotos-mascotas`, { method: 'DELETE', headers: { apikey: ANON, Authorization: 'Bearer ' + tokenB, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [rutaActual] }) })
  const delJ = await del.json().catch(() => null)
  check('B no puede borrar una foto de A', fotosDe(A.id).includes(rutaActual), `${del.status} ${JSON.stringify(delJ).slice(0, 80)}`)
  const delAnon = await fetch(`${URL_}/storage/v1/object/fotos-mascotas`, { method: 'DELETE', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [rutaActual] }) })
  check('anon tampoco', fotosDe(A.id).includes(rutaActual), delAnon.status)
  ws.close()
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message || String(e))
} finally {
  console.log('limpiando…')
  for (const id of ids) {
    const rutas = (await api('POST', '/rest/v1/rpc/rutas_fotos_cuenta', { p_id: id })).j
    if (Array.isArray(rutas) && rutas.length) await fetch(`${URL_}/storage/v1/object/fotos-mascotas`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: rutas }) })
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id }); await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  db(`delete from placas where mascota_id is null and estado='baja' and creado_en > now() - interval '15 minutes'`)
  try { chrome?.kill() } catch {}
  const f = db('select ' + cols)[0]
  check('la base y Storage quedaron como estaban', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
  process.exit(0)
}
