// DUE08 (reemplazar código QR) y DUE11 (modo paseo), 2026-11-18.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, api, borrarCuenta, check, db, rpc, sleep, tokenDe } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:4173'
const TAG = 'prueba-paseo-' + randomBytes(3).toString('hex')
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const ids = []
const codigosCreados = []
let chrome

async function cuenta(sufijo) {
  const email = `${TAG}-${sufijo}@example.com`
  const id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  ids.push(id)
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA ' + sufijo })
  return { id, email, token: await tokenDe(email, clave) }
}
const placasDe = (M) => db(`select codigo, estado from placas where mascota_id = '${M}' order by creado_en`)
const casosY = (M) => db(`select (select count(*)::int from casos_perdida where mascota_id = '${M}') casos, (select count(*)::int from notificaciones where mascota_id = '${M}') notis`)[0]

try {
  const A = await cuenta('a')
  const otro = await cuenta('b')
  const M = (await api('POST', '/rest/v1/mascotas', { dueno_id: A.id, nombre: 'Paseadora', especie: 'perro', sexo: 'hembra', domicilio_lat: -46.438, domicilio_lng: -67.528, radio_metros: 100 }, { Prefer: 'return=representation' }, A.token)).j[0].id
  // Código creado como en el alta (generar_placa, con la sesión del dueño)
  let r = await rpc('generar_placa', { p_mascota_id: M }, A.token)
  const viejo = r.j
  codigosCreados.push(viejo)
  check('el alta crea su código', r.s === 200 && /^[0-9A-F]{8}$/.test(viejo || ''), viejo)

  // ---- DUE08: una sola placa activa, garantizado por la base ----
  r = await rpc('generar_placa', { p_mascota_id: M }, A.token)
  check('generar_placa no crea una segunda placa activa', r.s >= 400 && /ya_tiene_placa/.test(JSON.stringify(r.j)), JSON.stringify(r.j).slice(0, 80))
  r = await api('POST', '/rest/v1/placas', { codigo: 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7), mascota_id: M, estado: 'activa' })
  check('la base rechaza una segunda placa activa por cualquier camino (índice único)', r.s === 409 && /placas_una_activa_por_mascota/.test(JSON.stringify(r.j)), r.s)
  r = await rpc('reemplazar_placa', { p_mascota_id: M }, otro.token)
  check('otra cuenta no puede reemplazar el código de esta mascota', r.j?.ok === false && r.j?.motivo === 'mascota_no_encontrada', JSON.stringify(r.j))
  r = await rpc('reemplazar_placa', { p_mascota_id: M })
  check('sin sesión tampoco', r.s >= 400, r.s)
  check('...y la placa sigue igual', JSON.stringify(placasDe(M)) === JSON.stringify([{ codigo: viejo, estado: 'activa' }]))

  // ---- Chrome ----
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9455', `--user-data-dir=${DIR}/perfil-paseo`, 'about:blank'], { stdio: 'ignore' })
  let pestanas
  for (let i = 0; i < 40; i++) { try { pestanas = await (await fetch('http://127.0.0.1:9455/json')).json(); if (pestanas.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
  const ws = new WebSocket(pestanas.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let n = 0
  const esperando = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) } }
  const cmd = (method, params = {}) => new Promise((res) => { const i = ++n; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const ir = async (u) => { await cmd('Page.navigate', { url: B + u }); await sleep(3500) }
  const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const clic = (texto) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(texto)}); if(!b) return false; b.click(); return true})()`)
  const hayBoton = (texto) => ev(`[...document.querySelectorAll('button')].some(b=>b.innerText.trim()===${JSON.stringify(texto)})`)
  const texto = () => ev('document.body.innerText')
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })
  await ir('/login')
  await escribir('input[type=email]', A.email); await escribir('input[type=password]', clave)
  await ev("document.querySelector('button[type=submit]').click(); true"); await sleep(4500)

  // ---- DUE08 en pantalla ----
  check('el panel ofrece "Reemplazar QR"', await clic('Reemplazar QR'))
  await sleep(400)
  const cartel = await texto()
  check('la confirmación nombra el código actual y avisa que deja de funcionar', cartel.includes(viejo) && /deja de funcionar al instante/.test(cartel))
  await clic('Reemplazar'); await sleep(4000)
  const url = new URL(await ev('location.href'))
  const nuevo = url.searchParams.get('codigo')
  codigosCreados.push(nuevo)
  check('lleva al código nuevo y explica que el anterior ya no funciona', url.pathname === '/placas' && url.searchParams.get('reemplazo') === '1' && nuevo !== viejo && /Código QR nuevo/.test(await texto()) && /ya no funciona/.test(await texto()))
  const placas = placasDe(M)
  check('el viejo quedó de baja (conservando la mascota) y hay una sola activa: la nueva', placas.length === 2 && placas[0].codigo === viejo && placas[0].estado === 'baja' && placas[1].codigo === nuevo && placas[1].estado === 'activa', JSON.stringify(placas))
  r = await rpc('ficha_publica', { p_codigo: viejo })
  check('el código viejo ya no muestra la ficha', r.j?.encontrada === false)
  const escaneos0 = db(`select count(*)::int c from escaneos where mascota_id = '${M}'`)[0].c
  r = await rpc('registrar_escaneo', { p_codigo: viejo, p_lat: -46.5, p_lng: -67.6 })
  check('...ni cuenta escaneos', r.j?.ok === false && db(`select count(*)::int c from escaneos where mascota_id = '${M}'`)[0].c === escaneos0, JSON.stringify(r.j))
  r = await rpc('ficha_publica', { p_codigo: nuevo })
  check('el código nuevo muestra la ficha', r.j?.encontrada === true && r.j?.nombre === 'Paseadora')

  // ---- DUE11 en pantalla ----
  await ir('/panel')
  check('el panel ofrece "Modo paseo"', await clic('Modo paseo'))
  await sleep(400)
  check('explica qué hace y ofrece duraciones', /lejos de casa no se abre una\s+posible pérdida/.test(await texto()) && (await ev("document.querySelectorAll('.opciones-duracion input').length")) === 5)
  await ev("[...document.querySelectorAll('.opciones-duracion label')].find(l=>l.innerText.includes('1 día')).querySelector('input').click(); true")
  await clic('Activar'); await sleep(3500)
  const pausa = db(`select extract(epoch from (pausado_hasta - now()))/3600 as horas from mascotas where id = '${M}'`)[0]
  check('activado por 1 día', Math.abs(Number(pausa.horas) - 24) < 0.2, Number(pausa.horas).toFixed(2))
  check('el panel muestra "De paseo hasta…" y "Terminar paseo"', /De paseo hasta/.test(await texto()) && await hayBoton('Terminar paseo'))
  r = await rpc('registrar_escaneo', { p_codigo: nuevo, p_lat: -46.5, p_lng: -67.6 })
  check('en paseo, un escaneo a 8,8 km no abre caso ni avisa', r.j?.lejos_de_casa === false && JSON.stringify(casosY(M)) === '{"casos":0,"notis":0}', JSON.stringify(casosY(M)))
  await clic('Terminar paseo'); await sleep(3000)
  check('terminar el paseo lo apaga', db(`select pausado_hasta from mascotas where id = '${M}'`)[0].pausado_hasta === null && await hayBoton('Modo paseo'))
  // Un modo paseo vencido no cuenta
  await api('PATCH', `/rest/v1/mascotas?id=eq.${M}`, { pausado_hasta: new Date(Date.now() - 60e3).toISOString() })
  await ir('/panel')
  check('un paseo vencido no se muestra como activo', !/De paseo hasta/.test(await texto()) && await hayBoton('Modo paseo'))
  r = await rpc('registrar_escaneo', { p_codigo: nuevo, p_lat: -46.5, p_lng: -67.6 })
  const c = casosY(M)
  check('sin paseo, el mismo escaneo abre la posible pérdida y avisa', r.j?.lejos_de_casa === true && c.casos === 1 && c.notis === 1, JSON.stringify(c))
  await ir('/panel')
  check('con un caso abierto no se ofrece el modo paseo', !(await hayBoton('Modo paseo')) && !(await hayBoton('Terminar paseo')))
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  for (const id of ids) await borrarCuenta(id)
  for (const codigo of codigosCreados.filter(Boolean)) db(`delete from placas where codigo = '${codigo}' and mascota_id is null`)
  try { chrome?.kill() } catch { /* ya cerrado */ }
  const quedan = db(`select (select count(*)::int from auth.users where email like '${TAG}%') cuentas, (select count(*)::int from placas) placas, (select count(*)::int from escaneos where mascota_id is null and placa_id is null and ocurrido_en > now() - interval '1 hour') huerfanos`)[0]
  check('no quedó nada de la prueba', quedan.cuentas === 0 && quedan.placas === 49 && quedan.huerfanos === 0, JSON.stringify(quedan))
}
