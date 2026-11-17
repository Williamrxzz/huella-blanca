// Placas después de retirar el circuito por lote (2026-11-17): cada mascota
// tiene su código QR automático; una placa sin mascota (dada de baja, o de una
// cuenta eliminada) no se reconoce ni se puede "activar"; si una mascota
// quedó sin código, el panel lo crea.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, api, check, db, rpc, sleep, tokenDe } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:5173'
const email = `prueba-placas-${randomBytes(3).toString('hex')}@example.com`
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const cols = '(select count(*) from perfiles)::int perfiles, (select count(*) from mascotas)::int mascotas, (select count(*) from placas)::int placas, (select count(*) from escaneos)::int escaneos'
const base0 = db('select ' + cols)[0]
let id, chrome
try {
  // ---- base ----
  const baja = db("select codigo from placas where estado = 'baja' and mascota_id is null limit 1")[0]?.codigo
  let r = await rpc('ficha_publica', { p_codigo: baja })
  check('placa dada de baja: no reconocida y sin "activar"', r.j?.encontrada === false && !('sin_activar' in (r.j || {})), JSON.stringify(r.j))
  r = await rpc('generar_lote_placas', { p_cantidad: 1 })
  check('generar_lote_placas ya no existe', r.s === 404, r.s)
  r = await rpc('vincular_placa', { p_codigo: 'X', p_mascota_id: '00000000-0000-0000-0000-000000000000' })
  check('vincular_placa ya no existe', r.s === 404, r.s)
  check('no quedan placas sin asignar', db("select count(*)::int c from placas where estado = 'sin_asignar'")[0].c === 0)

  // ---- una mascota sin código: el panel lo crea ----
  id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA placas' })
  const token = await tokenDe(email, clave)
  const M = (await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Sincodigo', especie: 'perro', domicilio_lat: -46.43, domicilio_lng: -67.52 }, { Prefer: 'return=representation' }, token)).j[0].id

  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9452', `--user-data-dir=${DIR}/perfil-placas`, 'about:blank'], { stdio: 'ignore' })
  let pestanas
  for (let i = 0; i < 40; i++) { try { pestanas = await (await fetch('http://127.0.0.1:9452/json')).json(); if (pestanas.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
  const ws = new WebSocket(pestanas.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let n = 0
  const esperando = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) } }
  const cmd = (method, params = {}) => new Promise((res) => { const i = ++n; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const ir = async (u) => { await cmd('Page.navigate', { url: u }); await sleep(3000) }
  const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const clic = (texto) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(texto)}); if(!b) return false; b.click(); return true})()`)
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })

  // Ficha de una placa dada de baja, en pantalla (no registra escaneo).
  const escaneos0 = db('select count(*)::int c from escaneos')[0].c
  await ir(`${B}/m/${baja}`)
  const t = await ev('document.body.innerText')
  check('en pantalla: "Placa no reconocida", sin botón para activarla', /Placa no reconocida/.test(t) && !/Activar esta placa/.test(t), t.slice(0, 60))
  check('...y no cuenta como escaneo', db('select count(*)::int c from escaneos')[0].c === escaneos0)

  await ir(B + '/login')
  await escribir('input[type=email]', email)
  await escribir('input[type=password]', clave)
  await ev("document.querySelector('button[type=submit]').click(); true")
  await sleep(4000)
  check('el panel ya no ofrece "vincular placa"', !/Vincular placa|Código de la placa/.test(await ev('document.body.innerText')))
  check('a la mascota sin código le ofrece crearlo', await clic('Crear su código QR'))
  await sleep(3000)
  const placa = db(`select codigo, estado from placas where mascota_id = '${M}'`)[0]
  check('se creó su código, activo', placa?.estado === 'activa' && /^[0-9A-F]{8}$/.test(placa.codigo), JSON.stringify(placa))
  check('...y ahora el panel ofrece ver su QR', !!(await ev(`[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/placas?codigo=${placa?.codigo}')`)))
  r = await rpc('ficha_publica', { p_codigo: placa?.codigo })
  check('...y su ficha pública funciona', r.j?.encontrada === true && r.j?.nombre === 'Sincodigo')
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  if (id) {
    // purgar_cuenta deja las placas de la cuenta de baja; la de esta prueba se borra.
    const codigos = db(`select p.codigo from placas p join mascotas m on m.id = p.mascota_id where m.dueno_id = '${id}'`).map((x) => x.codigo)
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id })
    await api('DELETE', '/auth/v1/admin/users/' + id)
    for (const c of codigos) db(`delete from placas where codigo = '${c}' and mascota_id is null`)
  }
  try { chrome?.kill() } catch { /* ya cerrado */ }
  const fin = db('select ' + cols)[0]
  check('la base quedó como estaba', fin.perfiles === base0.perfiles && fin.mascotas === base0.mascotas && fin.placas === base0.placas, JSON.stringify(fin))
}
