// IA02 de punta a punta: verificación de fotos en el servidor (subir-foto,
// sugerir-ficha y el pase firmado), con Chrome real contra el servidor de
// desarrollo: foto apta, foto sin animal (un cartel dibujado en el navegador),
// subida directa a Storage bloqueada, pase que no sirve para otros bytes ni
// para otra cuenta, y la foto de reencuentro al cerrar un caso.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { fotoDePerro, URL_, CHROME, DIR, sleep, resultados, check, db, SERVICE, ANON, api, rpc } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:5173'
const FOTO = await fotoDePerro()

const fotosDe = (uid) => db(`select name from storage.objects where bucket_id='fotos-mascotas' and name like '${uid}/%' order by created_at`).map(f => f.name)

const TAG = 'prueba-ia02-' + randomBytes(3).toString('hex')
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

  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9446', '--user-data-dir=' + DIR + '/perfil-ia02', 'about:blank'], { stdio: 'ignore' })
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
  check('el formulario de edición carga la mascota', (await ev(`document.querySelector('#nombre-mascota')?.value`)) === 'Fotito' || (await ev('document.body.innerText')).includes('Fotito'))
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
  await ev(`(()=>{const s=document.querySelector('#plazo-confirmacion'); const o=document.createElement('option'); o.value='999'; o.textContent='999'; s.appendChild(o); return true})()`)
  await set('#plazo-confirmacion', '999')
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
  await set('#nombre-mascota', 'Nuevito')
  await ev(`[...document.querySelectorAll('button')].find(b=>/ubicación actual/i.test(b.innerText)).click(); true`)
  await sleep(2500)
  habilitado = await elegirArchivo()
  check('alta: foto elegida y verificada', habilitado === false, 'disabled=' + habilitado)
  await ev(`(()=>{const s=document.querySelector('#plazo-confirmacion'); const o=document.createElement('option'); o.value='999'; o.textContent='999'; s.appendChild(o); return true})()`)
  await set('#plazo-confirmacion', '999')
  await ev(`document.querySelector('button[type=submit]').click(); true`)
  for (let i = 0; i < 30; i++) { const t = await ev(`document.querySelector('.error')?.innerText || ''`); if (t) break; await sleep(500) }
  check('alta fallida muestra el error', /horas_confirmacion|check/i.test(await ev(`document.querySelector('.error')?.innerText || ''`)))
  await sleep(1500)
  check('alta fallida: la foto subida se borró', JSON.stringify(fotosDe(A.id)) === JSON.stringify([rutaActual]), JSON.stringify(fotosDe(A.id)))
  check('alta fallida: no se creó la mascota', Number(db(`select count(*) from mascotas where dueno_id='${A.id}'`)[0].count) === 1)
  // ahora con un plazo válido
  await set('#plazo-confirmacion', '24')
  await ev(`document.querySelector('button[type=submit]').click(); true`)
  for (let i = 0; i < 40; i++) { if ((await ev('location.pathname')) !== '/mascotas/nueva') break; await sleep(500) }
  check('alta correcta: salió del formulario', (await ev('location.pathname')) !== '/mascotas/nueva', await ev('location.pathname'))
  const nueva = db(`select id, foto_url from mascotas where dueno_id='${A.id}' and nombre='Nuevito'`)[0]
  fotos = fotosDe(A.id)
  check('alta correcta: mascota creada con su foto en Storage', nueva && fotos.length === 2 && fotos.some(f => nueva.foto_url.endsWith(f)), JSON.stringify(fotos))

  // ---- 5. seguridad: el navegador ya no puede subir directo a Storage ----
  const loginA = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: A.email, password: clave }) })
  const tokenA = (await loginA.json()).access_token
  const directa = await fetch(`${URL_}/storage/v1/object/fotos-mascotas/${A.id}/directa-${Date.now()}.jpeg`, { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + tokenA, 'Content-Type': 'image/jpeg' }, body: fotoBytes })
  check('subida directa a Storage con sesión: rechazada', directa.status >= 400, directa.status)
  check('...y no quedó nada nuevo en Storage', fotosDe(A.id).length === 2)
  const sobre = await fetch(`${URL_}/storage/v1/object/fotos-mascotas/${rutaActual}`, { method: 'PUT', headers: { apikey: ANON, Authorization: 'Bearer ' + tokenA, 'Content-Type': 'image/jpeg' }, body: fotoBytes })
  check('sobrescribir una foto propia directo: rechazado', sobre.status >= 400, sobre.status)
  const login = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: Bu.email, password: clave }) })
  const tokenB = (await login.json()).access_token
  const del = await fetch(`${URL_}/storage/v1/object/fotos-mascotas`, { method: 'DELETE', headers: { apikey: ANON, Authorization: 'Bearer ' + tokenB, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [rutaActual] }) })
  check('B no puede borrar una foto de A', fotosDe(A.id).includes(rutaActual), del.status)

  // ---- 6. subir-foto: sin sesión, bytes inválidos, foto sin animal ----
  const fn = async (cuerpo, token) => { const r = await fetch(URL_ + '/functions/v1/subir-foto', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + (token || ANON) }, body: JSON.stringify(cuerpo) }); return { s: r.status, j: await r.json().catch(() => null) } }
  const b64Perro = fotoBytes.toString('base64')
  let r = await fn({ imagen_base64: b64Perro, media_type: 'image/jpeg', tipo: 'mascota' })
  check('subir-foto sin sesión: 401', r.s === 401, r.s + ' ' + JSON.stringify(r.j))
  r = await fn({ imagen_base64: Buffer.from('esto no es una imagen').toString('base64'), media_type: 'image/jpeg', tipo: 'mascota' }, tokenA)
  check('subir-foto con bytes que no son JPEG: 400', r.s === 400 && r.j?.error === 'imagen_invalida', r.s + ' ' + JSON.stringify(r.j))
  r = await fn({ imagen_base64: b64Perro, media_type: 'image/png', tipo: 'mascota' }, tokenA)
  check('subir-foto con otro tipo: 400', r.s === 400, r.s)
  // imagen sin animal, generada en el navegador (un cartel de texto)
  const b64Cartel = await ev(`(async()=>{const c=document.createElement('canvas'); c.width=640; c.height=400; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,640,400); x.fillStyle='#000'; x.font='bold 64px sans-serif'; x.fillText('FACTURA N° 1234', 30, 120); x.font='28px sans-serif'; x.fillText('Total: $ 45.000', 30, 200); x.fillText('Gracias por su compra', 30, 260); const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9)); const fr=new FileReader(); return await new Promise(r=>{fr.onload=()=>r(String(fr.result).split(',')[1]); fr.readAsDataURL(b)})})()`)
  const antesCartel = fotosDe(A.id).length
  r = await fn({ imagen_base64: b64Cartel, media_type: 'image/jpeg', tipo: 'mascota' }, tokenA)
  check('subir-foto con una imagen sin animal y sin pase: 422 foto_rechazada', r.s === 422 && r.j?.error === 'foto_rechazada' && r.j.categoria === 'sin_animal', r.s + ' ' + JSON.stringify(r.j))
  check('...y no se guardó nada', fotosDe(A.id).length === antesCartel)
  // pase de otra imagen: no sirve, se vuelve a clasificar (y como es un perro, pasa)
  const sf = await fetch(URL_ + '/functions/v1/sugerir-ficha', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + tokenA }, body: JSON.stringify({ imagen_base64: b64Cartel, media_type: 'image/jpeg' }) })
  const sfJ = await sf.json()
  check('sugerir-ficha con el cartel: sin_animal y sin pase', sfJ.categoria === 'sin_animal' && !sfJ.pase, JSON.stringify(sfJ).slice(0, 80))
  const sf2 = await fetch(URL_ + '/functions/v1/sugerir-ficha', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + tokenA }, body: JSON.stringify({ imagen_base64: b64Perro, media_type: 'image/jpeg' }) })
  const sf2J = await sf2.json()
  check('sugerir-ficha con el perro: apta y con pase', sf2J.categoria === 'apta' && typeof sf2J.pase === 'string', sf2J.categoria)
  r = await fn({ imagen_base64: b64Cartel, media_type: 'image/jpeg', tipo: 'mascota', pase: sf2J.pase }, tokenA)
  check('el pase del perro no sirve para subir el cartel (se reclasifica y rechaza)', r.s === 422, r.s + ' ' + JSON.stringify(r.j))
  const t0 = Date.now()
  r = await fn({ imagen_base64: b64Perro, media_type: 'image/jpeg', tipo: 'mascota', pase: sf2J.pase }, tokenA)
  const ms = Date.now() - t0
  check('con el pase correcto sube sin volver a clasificar', r.s === 200 && r.j?.ok && r.j.verificada === true && r.j.categoria === 'apta' && ms < 2500, `${r.s} ${ms} ms ${JSON.stringify(r.j).slice(0, 60)}`)
  const rutaPorPase = r.j?.ruta
  check('...la foto quedó en la carpeta de A', rutaPorPase && fotosDe(A.id).includes(rutaPorPase))
  const sf3 = await fetch(URL_ + '/functions/v1/sugerir-ficha', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON }, body: JSON.stringify({ imagen_base64: b64Perro, media_type: 'image/jpeg' }) })
  const sf3t = await sf3.text()
  check('sugerir-ficha sin sesión: 401, no llega a la IA', sf3.status === 401, sf3.status + ' ' + sf3t.slice(0, 60))
  const login2 = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: Bu.email, password: clave }) })
  const tokenB2 = (await login2.json()).access_token
  r = await fn({ imagen_base64: b64Perro, media_type: 'image/jpeg', tipo: 'mascota', pase: sf2J.pase }, tokenB2)
  check('el pase de A no vale para B (se reclasifica; es un perro, pasa) y va a la carpeta de B', r.s === 200 && r.j?.ruta?.startsWith(Bu.id + '/'), r.s + ' ' + (r.j?.ruta || '').slice(0, 20))

  // ---- 7. foto de reencuentro por pantalla ----
  const caso = await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual' }, { Prefer: 'return=representation' })
  const casoId = caso.j[0].id
  // La foto del reencuentro es para quien ayudó (la ve en su historial): desde
  // el 2026-11-17 se pide solo si el dueño elige a alguien que avisó con
  // cuenta. B avisa "Está conmigo" y queda preseleccionado.
  await api('POST', '/rest/v1/avistamientos', { mascota_id: M, caso_id: casoId, origen: 'manual', situacion: 'conmigo', mensaje: 'La tengo yo', reportado_por: Bu.id })
  await ir(`${B}/mascotas/${M}/mapa`); await sleep(2500)
  await ev(`[...document.querySelectorAll('button')].find(b=>/volvió a casa/.test(b.innerText)).click(); true`)
  await sleep(2500)
  check('se abrió el formulario de reencuentro, con B elegido', /Foto del reencuentro/.test(await ev('document.body.innerText')) && !!(await ev(`document.querySelector('.opciones-rescatista input:checked')?.closest('label')?.innerText.includes('Avisó que tenía')`)))
  habilitado = await elegirArchivo()
  const antesRe = fotosDe(A.id).length
  await ev(`[...document.querySelectorAll('button')].find(b=>/^Cerrar el caso$/.test(b.innerText.trim())).click(); true`)
  for (let i = 0; i < 30; i++) { const e = db(`select estado, foto_reencuentro_url from casos_perdida where id='${casoId}'`)[0]; if (e.estado === 'cerrada') break; await sleep(500) }
  const cerrado = db(`select estado, foto_reencuentro_url, rescatista_id::text = '${Bu.id}' as rescatista_b from casos_perdida where id='${casoId}'`)[0]
  const fotosRe = fotosDe(A.id)
  check('el caso se cerró con B como rescatista y la foto guardada por subir-foto', cerrado.estado === 'cerrada' && cerrado.rescatista_b && cerrado.foto_reencuentro_url && fotosRe.length === antesRe + 1 && fotosRe.some(f => f.includes('/reencuentro-') && cerrado.foto_reencuentro_url.endsWith(f)), JSON.stringify(cerrado).slice(0, 120))
  await foto('ia02-reencuentro.png')
  ws.close()
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message || String(e))
} finally {
  console.log('limpiando…')
  for (const id of ids) {
    // todo lo que haya en la carpeta de la cuenta, esté referenciado o no
    const rutas = db(`select name from storage.objects where bucket_id='fotos-mascotas' and name like '${id}/%'`).map(f => f.name)
    if (rutas.length) await fetch(`${URL_}/storage/v1/object/fotos-mascotas`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: rutas }) })
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id }); await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  db(`delete from placas where mascota_id is null and estado='baja' and creado_en > now() - interval '15 minutes'`)
  try { chrome?.kill() } catch {}
  const f = db('select ' + cols)[0]
  check('la base y Storage quedaron como estaban', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
  process.exit(0)
}
