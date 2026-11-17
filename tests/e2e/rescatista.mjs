// PER08 / REC02: al cerrar el caso, el dueño elige a quién agradecer.
// Escenario armado para que la lógica vieja ("el último que avisó con
// cuenta") se equivoque: Marta avisa primero "Está conmigo" y después Raúl
// avisa "La vi pasar". Tiene que aparecer Marta preseleccionada.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, api, check, db, rpc, sleep, tokenDe } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:5173'
const TAG = 'prueba-resc-' + randomBytes(3).toString('hex')
const CODIGO = 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const cols = '(select count(*) from perfiles)::int perfiles, (select count(*) from mascotas)::int mascotas, (select count(*) from casos_perdida)::int casos, (select count(*) from avistamientos)::int avisos, (select count(*) from placas)::int placas'
const base0 = db('select ' + cols)[0]
const ids = []
let chrome

async function cuenta(sufijo, nombre) {
  const email = `${TAG}-${sufijo}@example.com`
  const id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  ids.push(id)
  await api('POST', '/rest/v1/perfiles', { id, nombre })
  return { id, email, token: await tokenDe(email, clave) }
}
const aviso = (token, situacion) => rpc('registrar_avistamiento', { p_codigo: CODIGO, p_lat: -46.44, p_lng: -67.53, p_origen: 'gps', p_situacion: situacion, p_mensaje: null, p_contacto: null }, token)

try {
  const A = await cuenta('a', 'PRUEBA dueño')
  const marta = await cuenta('m', 'Marta Gómez')
  const raul = await cuenta('r', 'Raúl Pérez')
  const M = (await api('POST', '/rest/v1/mascotas', { dueno_id: A.id, nombre: 'Rescatada', especie: 'perro', sexo: 'hembra', domicilio_lat: -46.438, domicilio_lng: -67.528, radio_metros: 100 }, { Prefer: 'return=representation' })).j[0].id
  await api('POST', '/rest/v1/placas', { codigo: CODIGO, mascota_id: M, estado: 'activa' })
  const C = (await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual' }, { Prefer: 'return=representation' }, A.token)).j[0].id

  await aviso(marta.token, 'conmigo')
  await sleep(1100)
  await aviso(raul.token, 'la_vi_pasar')
  await aviso(undefined, 'la_vi_pasar') // sin cuenta: no se puede agradecer en la app

  // ---- la función que arma la lista ----
  let r = await rpc('colaboradores_del_caso', { p_caso_id: C }, A.token)
  const lista = r.j || []
  check('el dueño ve a quienes avisaron con cuenta (2, no el anónimo)', r.s === 200 && lista.length === 2, JSON.stringify(lista.map((x) => x.nombre)))
  check('...primero quien dijo "Está conmigo", con su primer nombre', lista[0]?.nombre === 'Marta' && lista[0]?.hubo_conmigo === true && lista[1]?.nombre === 'Raúl')
  r = await rpc('colaboradores_del_caso', { p_caso_id: C }, raul.token)
  check('otra cuenta no puede ver la lista de un caso ajeno', r.s >= 400, r.s)
  r = await rpc('colaboradores_del_caso', { p_caso_id: C })
  check('sin sesión tampoco', r.s >= 400, r.s)

  // ---- el rescatista ya no se escribe a mano ----
  r = await api('PATCH', `/rest/v1/casos_perdida?id=eq.${C}`, { rescatista_id: raul.id }, {}, A.token)
  check('el navegador no puede escribir rescatista_id', r.s === 401 || r.s === 403, r.s)
  r = await rpc('cerrar_caso', { p_caso_id: C, p_rescatista_id: A.id, p_mensaje: null, p_foto_url: null }, A.token)
  check('cerrar_caso rechaza a alguien que no avisó en el caso', r.j?.ok === false && r.j?.motivo === 'rescatista_invalido', JSON.stringify(r.j))
  r = await rpc('cerrar_caso', { p_caso_id: C, p_rescatista_id: marta.id, p_mensaje: 'x', p_foto_url: null }, raul.token)
  check('otra cuenta no puede cerrar el caso', r.j?.ok === false && r.j?.motivo === 'no_autorizado', JSON.stringify(r.j))
  check('...el caso sigue abierto', db(`select estado from casos_perdida where id = '${C}'`)[0].estado === 'perdida')

  // ---- en pantalla ----
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9451', `--user-data-dir=${DIR}/perfil-resc`, 'about:blank'], { stdio: 'ignore' })
  let pestanas
  for (let i = 0; i < 40; i++) { try { pestanas = await (await fetch('http://127.0.0.1:9451/json')).json(); if (pestanas.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
  const ws = new WebSocket(pestanas.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let n = 0
  const esperando = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) } }
  const cmd = (method, params = {}) => new Promise((res) => { const i = ++n; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const ir = async (u) => { await cmd('Page.navigate', { url: u }); await sleep(3000) }
  const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const clic = (texto) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(texto)}); if(!b) return false; b.click(); return true})()`)
  const elegirOpcion = (texto) => ev(`(()=>{const l=[...document.querySelectorAll('.opciones-rescatista label')].find(l=>l.innerText.includes(${JSON.stringify(texto)})); if(!l) return false; l.querySelector('input').click(); return true})()`)
  const elegidaAhora = () => ev(`document.querySelector('.opciones-rescatista input:checked')?.closest('label')?.innerText`)
  const hayMensaje = () => ev(`!!document.querySelector('textarea[aria-label="Mensaje de agradecimiento"]')`)
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })

  await ir(B + '/login')
  await escribir('input[type=email]', A.email)
  await escribir('input[type=password]', clave)
  await ev("document.querySelector('button[type=submit]').click(); true")
  await sleep(4000)
  await ir(`${B}/mascotas/${M}/mapa`)
  check('abre el formulario de cierre', await clic('Rescatada volvió a casa'))
  await sleep(2500)
  const opciones = await ev("[...document.querySelectorAll('.opciones-rescatista label')].map(l=>l.innerText.split('\\n')[0])")
  check('lista: Marta, Raúl y "Nadie de la lista"', JSON.stringify(opciones) === JSON.stringify(['Marta', 'Raúl', 'Nadie de la lista']), JSON.stringify(opciones))
  check('Marta preseleccionada, con "Avisó que tenía a Rescatada"', /Marta[\s\S]*Avisó que tenía a Rescatada/.test(await elegidaAhora() || ''), await elegidaAhora())
  check('con alguien elegido se ofrece el mensaje', await hayMensaje())
  await elegirOpcion('Nadie de la lista'); await sleep(300)
  check('con "Nadie de la lista" no se pide mensaje ni foto', !(await hayMensaje()))
  await elegirOpcion('Marta'); await sleep(300)
  await escribir('textarea[aria-label="Mensaje de agradecimiento"]', '¡Gracias por cuidarla!')
  const r0 = await cmd('Page.captureScreenshot', { format: 'png' })
  ;(await import('node:fs')).writeFileSync(`${DIR}/rescatista.png`, Buffer.from(r0.result.data, 'base64'))
  check('cierra el caso', await clic('Cerrar el caso'))
  await sleep(3500)
  const cerrado = db(`select estado, rescatista_id::text r, mensaje_agradecimiento m from casos_perdida where id = '${C}'`)[0]
  check('caso cerrado con Marta como rescatista y su mensaje', cerrado.estado === 'cerrada' && cerrado.r === marta.id && cerrado.m === '¡Gracias por cuidarla!', JSON.stringify({ ...cerrado, r: cerrado.r === marta.id ? 'Marta' : cerrado.r === raul.id ? 'Raúl' : cerrado.r }))

  r = await rpc('historial_colaboracion', {}, marta.token)
  check('Marta ve el reencuentro y el mensaje en su historial', JSON.stringify(r.j).includes('¡Gracias por cuidarla!'))
  r = await rpc('historial_colaboracion', {}, raul.token)
  check('Raúl no tiene ese reencuentro', !JSON.stringify(r.j).includes('¡Gracias por cuidarla!'))

  // ---- lo que el panel sigue necesitando hacer con casos_perdida ----
  r = await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual', mensaje: 'Otra vez', ultima_lat: -46.44, ultima_lng: -67.53 }, { Prefer: 'return=representation' }, A.token)
  check('el panel puede marcar otra pérdida (PER01)', r.s === 201, r.s)
  const C2 = r.j?.[0]?.id
  r = await api('PATCH', `/rest/v1/casos_perdida?id=eq.${C2}`, { mensaje: 'Corregido', ultima_lat: -46.45, ultima_lng: -67.54 }, { Prefer: 'return=representation' }, A.token)
  check('...y corregir el mensaje y la ubicación (PER07)', r.s === 200 && r.j?.[0]?.mensaje === 'Corregido', r.s)
  r = await rpc('colaboradores_del_caso', { p_caso_id: C2 }, A.token)
  check('un caso sin avisos con cuenta: lista vacía', r.s === 200 && Array.isArray(r.j) && r.j.length === 0, JSON.stringify(r.j))
  r = await rpc('cerrar_caso', { p_caso_id: C2, p_rescatista_id: null, p_mensaje: null, p_foto_url: null }, A.token)
  check('...y se cierra sin rescatista', r.j?.ok === true && db(`select estado, rescatista_id from casos_perdida where id = '${C2}'`)[0].rescatista_id === null)
  r = await rpc('cerrar_caso', { p_caso_id: C2, p_rescatista_id: null, p_mensaje: null, p_foto_url: null }, A.token)
  check('un caso ya cerrado no se vuelve a cerrar', r.j?.ok === false && r.j?.motivo === 'caso_cerrado', JSON.stringify(r.j))
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  for (const id of ids) {
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id })
    await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  db(`delete from placas where codigo = '${CODIGO}'`)
  try { chrome?.kill() } catch { /* ya cerrado */ }
  const fin = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(fin) === JSON.stringify(base0), JSON.stringify(fin))
}
