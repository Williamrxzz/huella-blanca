// "Las bajas son lógicas, nunca físicas" (CLAUDE.md, sección 2), garantizado
// por la base: un dueño no puede borrar con la API sus mascotas, casos,
// escaneos ni avisos; sí puede darlas de baja (activa = false) y cerrar casos.
// Además, las funciones que necesitan cuenta no las puede llamar `anon`.
// Ver la migración 20261117000009_limpieza_permisos.sql.
// Y dar de baja una mascota cierra su caso abierto, por pantalla y por API
// (migración 20261118000002; el caso fantasma de Liliana).
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, api, check, db, rpc, sleep, tokenDe } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:4173'

const email = `prueba-bajas-${randomBytes(3).toString('hex')}@example.com`
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const base0 = db('select (select count(*) from perfiles)::int perfiles, (select count(*) from mascotas)::int mascotas, (select count(*) from casos_perdida)::int casos, (select count(*) from placas)::int placas')[0]
let id
try {
  id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA bajas' })
  const token = await tokenDe(email, clave)
  const rep = { Prefer: 'return=representation' }

  // Lo que sí tiene que poder hacer el dueño (el uso normal de la app).
  let r = await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Bajita', especie: 'gato', domicilio_lat: -46.43, domicilio_lng: -67.52 }, rep, token)
  check('el dueño crea su mascota', r.s === 201, r.s)
  const M = r.j?.[0]?.id
  r = await api('GET', `/rest/v1/mascotas?id=eq.${M}&select=id`, null, {}, token)
  check('...la ve', r.s === 200 && r.j?.length === 1)
  r = await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual' }, rep, token)
  check('marca la pérdida (crea el caso)', r.s === 201, r.s)
  const C = r.j?.[0]?.id
  r = await api('GET', `/rest/v1/casos_perdida?id=eq.${C}&select=id`, null, {}, token)
  check('...lo ve', r.s === 200 && r.j?.length === 1)

  // Lo que no tiene que poder hacer: borrar.
  r = await api('DELETE', `/rest/v1/casos_perdida?id=eq.${C}`, null, rep, token)
  check('no puede borrar su caso', db(`select count(*)::int c from casos_perdida where id = '${C}'`)[0].c === 1, r.s)
  r = await api('DELETE', `/rest/v1/mascotas?id=eq.${M}`, null, rep, token)
  check('no puede borrar su mascota', db(`select count(*)::int c from mascotas where id = '${M}'`)[0].c === 1, r.s)

  // Las bajas lógicas siguen funcionando.
  r = await api('PATCH', `/rest/v1/casos_perdida?id=eq.${C}`, { estado: 'cerrada', cerrado_en: new Date().toISOString() }, rep, token)
  check('cierra el caso (estado)', r.s === 200 && r.j?.[0]?.estado === 'cerrada', r.s)
  r = await api('PATCH', `/rest/v1/mascotas?id=eq.${M}`, { activa: false }, rep, token)
  check('da de baja la mascota (activa = false)', r.s === 200 && r.j?.[0]?.activa === false, r.s)

  // Dar de baja una mascota con un caso abierto lo cierra (antes quedaba abierto).
  const caso = (id) => db(`select estado, cerrado_en is not null cerrado, mensaje_agradecimiento, foto_reencuentro_url, rescatista_id from casos_perdida where id = '${id}'`)[0]
  // a) por la API, con una posible pérdida automática
  const M2 = (await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Bajaapi', especie: 'gato', domicilio_lat: -46.43, domicilio_lng: -67.52 }, rep, token)).j[0].id
  const C2 = (await api('POST', '/rest/v1/casos_perdida', { mascota_id: M2, estado: 'posible_perdida', origen: 'automatico' }, rep)).j[0].id
  await api('PATCH', `/rest/v1/mascotas?id=eq.${M2}`, { activa: false }, rep, token)
  const c2 = caso(C2)
  check('API: dar de baja la mascota cierra su posible pérdida abierta', c2.estado === 'cerrada' && c2.cerrado === true, JSON.stringify(c2))
  check('...sin agradecimiento, foto ni rescatista', c2.mensaje_agradecimiento === null && c2.foto_reencuentro_url === null && c2.rescatista_id === null)
  // b) por pantalla: "Eliminar mascota" en el panel, como lo hace el dueño
  const M3 = (await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Bajapanel', especie: 'perro', domicilio_lat: -46.43, domicilio_lng: -67.52 }, rep, token)).j[0].id
  const C3 = (await api('POST', '/rest/v1/casos_perdida', { mascota_id: M3, estado: 'perdida', origen: 'manual', mensaje: 'Se escapó' }, rep, token)).j[0].id
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9457', `--user-data-dir=${DIR}/perfil-bajas`, 'about:blank'], { stdio: 'ignore' })
  try {
    let pestanas
    for (let i = 0; i < 40; i++) { try { pestanas = await (await fetch('http://127.0.0.1:9457/json')).json(); if (pestanas.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
    const ws = new WebSocket(pestanas.find((t) => t.type === 'page').webSocketDebuggerUrl)
    await new Promise((res) => { ws.onopen = res })
    let n = 0
    const esperando = new Map()
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) } }
    const cmd = (method, params = {}) => new Promise((res) => { const i = ++n; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
    const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
    const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true}))})()`)
    await cmd('Page.enable')
    await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })
    await cmd('Page.navigate', { url: B + '/login' }); await sleep(3000)
    await escribir('input[type=email]', email); await escribir('input[type=password]', clave)
    await ev("document.querySelector('button[type=submit]').click()"); await sleep(4500)
    const abrioMas = await ev(`(()=>{const li=[...document.querySelectorAll('li')].find(l=>l.innerText.includes('Bajapanel')); const b=li&&[...li.querySelectorAll('button')].find(b=>b.innerText.trim()==='Más'); if(!b) return false; b.click(); return true})()`)
    await sleep(400)
    const elimino = abrioMas && await ev(`(()=>{const b=[...document.querySelectorAll('.opcion-hoja')].find(b=>b.querySelector('strong')?.innerText.trim()==='Eliminar mascota'); if(!b) return false; b.click(); return true})()`)
    await sleep(500)
    await ev("[...document.querySelectorAll('.tarjeta-confirmacion button')].find(b=>b.innerText.trim()==='Eliminar').click()"); await sleep(3500)
    const c3 = caso(C3)
    check('panel: "Eliminar mascota" con el caso abierto lo cierra', elimino && db(`select activa from mascotas where id = '${M3}'`)[0].activa === false && c3.estado === 'cerrada' && c3.cerrado === true, JSON.stringify(c3))
    check('...y no queda ningún caso abierto de una mascota dada de baja', db("select count(*)::int c from casos_perdida c join mascotas m on m.id = c.mascota_id where not m.activa and c.estado in ('perdida', 'posible_perdida')")[0].c === 0)
  } finally {
    try { chrome.kill() } catch { /* ya cerrado */ }
  }

  // Funciones que necesitan cuenta.
  r = await rpc('generar_placa', { p_mascota_id: M })
  check('anon no puede llamar a generar_placa', r.s === 401 || r.s === 403 || r.s === 404, r.s)
  r = await rpc('historial_colaboracion', {})
  check('anon no puede llamar a historial_colaboracion', r.s === 401 || r.s === 403 || r.s === 404, r.s)
  r = await rpc('historial_colaboracion', {}, token)
  check('con sesión, historial_colaboracion responde', r.s === 200, r.s)
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  if (id) {
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id })
    await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  const fin = db('select (select count(*) from perfiles)::int perfiles, (select count(*) from mascotas)::int mascotas, (select count(*) from casos_perdida)::int casos, (select count(*) from placas)::int placas')[0]
  check('la base quedó como estaba', JSON.stringify(fin) === JSON.stringify(base0), JSON.stringify(fin))
}
