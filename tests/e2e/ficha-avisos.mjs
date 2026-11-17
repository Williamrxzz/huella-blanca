// PER07 (mensaje del dueño en la ficha), TRA11 (aviso sin ubicación), TRA09 (reclamo con ventana de 7 días).
// Todo con una mascota y placa temporales: nada toca a Blanca ni avisa al dueño real.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { URL_, CHROME, DIR, sleep, resultados, check, db, ANON, api, rpc } from './comun.mjs'
const B = process.env.BASE || 'http://localhost:5173'

const cols = "(select count(*) from perfiles) perfiles, (select count(*) from auth.users) usuarios, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from avistamientos) avistamientos, (select count(*) from escaneos) escaneos, (select count(*) from notificaciones) notificaciones"
const base0 = db('select ' + cols)[0]
const blancaAntes = db(`select c.estado, c.ultima_lat, c.ultima_lng, (select count(*) from avistamientos a where a.mascota_id=m.id) avisos from mascotas m left join casos_perdida c on c.mascota_id=m.id and c.estado in ('perdida','posible_perdida') where m.nombre='Blanca'`)[0]
const TAG = 'prueba-avisos-' + randomBytes(3).toString('hex'), clave = randomBytes(12).toString('hex') + 'Aa1!'
const CODIGO = 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
const ids = []; let chrome
const mk = async (suf, nombre) => { const email = `${TAG}-${suf}@example.com`; const u = await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true }); ids.push(u.j.id); await api('POST', '/rest/v1/perfiles', { id: u.j.id, nombre }); return { id: u.j.id, email } }
const tokenDe = async c => (await (await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: c.email, password: clave }) })).json()).access_token
const MENSAJE = 'Responde al nombre de Toby.\nLe tienen miedo a las motos. <b>no es html</b>'
try {
  const A = await mk('a', 'PRUEBA dueño'), C = await mk('c', 'PRUEBA ayudante')
  const m = await api('POST', '/rest/v1/mascotas', { dueno_id: A.id, nombre: 'Tobyprueba', especie: 'perro', sexo: 'macho', domicilio_lat: -46.4380, domicilio_lng: -67.5280, radio_metros: 100000 }, { Prefer: 'return=representation' })
  const M = m.j[0].id
  await api('POST', '/rest/v1/placas', { codigo: CODIGO, mascota_id: M, estado: 'activa' })
  const caso = await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual', mensaje: MENSAJE, ultima_lat: -46.44, ultima_lng: -67.53 }, { Prefer: 'return=representation' })
  const casoId = caso.j[0].id
  const ultima = () => db(`select ultima_lat, ultima_lng from casos_perdida where id='${casoId}'`)[0]

  // ---- API: TRA11 ----
  let r = await rpc('registrar_avistamiento', { p_codigo: CODIGO, p_lat: null, p_lng: null, p_origen: 'manual', p_situacion: 'la_vi_pasar', p_mensaje: '   ', p_contacto: null })
  check('sin ubicación y sin texto → falta_lugar', r.j?.ok === false && r.j?.motivo === 'falta_lugar', JSON.stringify(r.j))
  r = await rpc('registrar_avistamiento', { p_codigo: CODIGO, p_lat: null, p_lng: null, p_origen: 'gps', p_situacion: 'la_vi_pasar', p_mensaje: 'Frente a la escuela 14', p_contacto: null })
  check('sin ubicación con texto → ok', r.j?.ok === true, JSON.stringify(r.j))
  const av1 = db(`select lat, lng, origen, mensaje from avistamientos where id='${r.j?.avistamiento_id}'`)[0]
  check('...guardado sin coordenadas y como manual', av1?.lat === null && av1?.origen === 'manual', JSON.stringify(av1))
  check('...NO borró la última ubicación del caso', ultima().ultima_lat === -46.44, JSON.stringify(ultima()))
  r = await rpc('registrar_avistamiento', { p_codigo: CODIGO, p_lat: -46.45, p_lng: -67.54, p_origen: 'gps', p_situacion: 'conmigo', p_mensaje: null, p_contacto: null })
  check('con ubicación → actualiza la última ubicación', r.j?.ok && ultima().ultima_lat === -46.45, JSON.stringify(ultima()))

  // ---- API: TRA09 ----
  const viejo = await rpc('registrar_avistamiento', { p_codigo: CODIGO, p_lat: -46.45, p_lng: -67.54, p_origen: 'gps', p_situacion: 'la_vi_pasar', p_mensaje: null, p_contacto: null })
  const vencido = await rpc('registrar_avistamiento', { p_codigo: CODIGO, p_lat: -46.45, p_lng: -67.54, p_origen: 'gps', p_situacion: 'la_vi_pasar', p_mensaje: null, p_contacto: null })
  const idViejo = viejo.j.avistamiento_id, idVencido = vencido.j.avistamiento_id
  db(`update avistamientos set creado_en = now() - interval '2 days' where id='${idViejo}'; update avistamientos set creado_en = now() - interval '8 days' where id='${idVencido}'`)
  r = await rpc('reclamar_avistamiento', { p_avistamiento_id: idViejo })
  check('reclamar sin sesión: no ejecutable por anon', r.s >= 400, r.s)
  const tokC = await tokenDe(C)
  r = await rpc('reclamar_avistamiento', { p_avistamiento_id: idVencido }, tokC)
  check('aviso de hace 8 días → no_reclamable', r.j?.ok === false, JSON.stringify(r.j))

  // ---- Chrome ----
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9448', '--user-data-dir=' + DIR + '/perfil-avisos-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
  let lista; for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9448/json')).json(); if (lista.find(t => t.type === 'page')) break } catch {} await sleep(250) }
  const ws = new WebSocket(lista.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
  let n = 0; const esp = new Map(); ws.onmessage = e => { const x = JSON.parse(e.data); if (x.id && esp.has(x.id)) { esp.get(x.id)(x); esp.delete(x.id) } }
  const cmd = (method, params = {}) => new Promise(r => { const i = ++n; esp.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async x => { const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.result?.value }
  const ir = async u => { await cmd('Page.navigate', { url: u }); await sleep(3000) }
  const foto = async nombre => { const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(DIR + '/' + nombre, Buffer.from(r.result.data, 'base64')) }
  const setTexto = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const clic = texto => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(texto)}); if(!b) return false; b.click(); return true})()`)
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })
  await cmd('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied' })

  // PER07
  await ir(`${B}/m/${CODIGO}`)
  const bloque = await ev(`document.querySelector('.alerta-mensaje')?.innerText`)
  check('PER07: la ficha muestra el mensaje de la familia', /mensaje de su familia/i.test(bloque || '') && bloque?.includes('Responde al nombre de Toby.'), bloque)
  check('PER07: respeta el salto de línea y no interpreta HTML', bloque?.includes('Toby.\nLe tienen') && bloque?.includes('<b>no es html</b>') && !(await ev(`!!document.querySelector('.alerta-mensaje b')`)))
  await foto('ficha-mensaje.png')

  // TRA11 por pantalla
  check('abre el formulario', await clic('La vi acá'))
  for (let i = 0; i < 14; i++) { if (!(await ev(`document.body.innerText.includes('Obteniendo tu ubicación')`))) break; await sleep(1000) }
  const ayudaMapa = await ev(`[...document.querySelectorAll('.formulario-aviso .ayuda')].map(p=>p.innerText).join(' | ')`)
  check('sin permiso: ofrece mapa o texto', /contanos el lugar/.test(ayudaMapa), ayudaMapa)
  check('el campo pide el lugar', (await ev(`document.querySelector('.formulario-aviso textarea').placeholder`))?.startsWith('¿Dónde la viste?'))
  await ev(`document.querySelector('.formulario-aviso button[type=submit]').click(); true`); await sleep(800)
  const err = await ev(`document.querySelector('.formulario-aviso [role=alert]')?.innerText`)
  check('sin punto ni texto: explica qué falta', /contanos el lugar en el texto/.test(err || ''), err)
  await foto('aviso-sin-ubicacion-error.png')
  const antes = db(`select count(*)::int c from avistamientos where mascota_id='${M}'`)[0].c
  await setTexto('.formulario-aviso textarea', 'En la plaza San Martín, cerca del kiosco')
  await ev(`document.querySelector('.formulario-aviso button[type=submit]').click(); true`); await sleep(3000)
  const nuevo = db(`select lat, origen, mensaje from avistamientos where mascota_id='${M}' order by creado_en desc limit 1`)[0]
  check('con texto y sin punto: el aviso se envía', db(`select count(*)::int c from avistamientos where mascota_id='${M}'`)[0].c === antes + 1 && nuevo.lat === null && nuevo.mensaje.includes('plaza San Martín'), JSON.stringify(nuevo))
  check('...y la pantalla lo confirma', /Crear cuenta para que quede registrada/.test(await ev('document.body.innerText')))
  await foto('aviso-sin-ubicacion-ok.png')

  // TRA09: Panel reclama un aviso de hace 2 días (antes la ventana era 1 hora)
  await ev(`localStorage.setItem('avisoPendienteId', ${JSON.stringify(idViejo)}); true`)
  await ir(B + '/login')
  await setTexto('input[type=email]', C.email); await setTexto('input[type=password]', clave)
  await ev(`document.querySelector('button[type=submit]').click(); true`); await sleep(4500)
  const banner = await ev(`document.querySelector('.aviso-telefono[role=status]')?.innerText`)
  check('Panel: confirma el aviso asociado, con el nombre', /Tu aviso sobre Tobyprueba quedó registrado/.test(banner || ''), banner)
  check('...quedó a nombre de la cuenta', db(`select reportado_por from avistamientos where id='${idViejo}'`)[0].reportado_por === C.id)
  check('...y se borró el pendiente', (await ev(`localStorage.getItem('avisoPendienteId')`)) === null)
  await foto('panel-reclamo.png')
  r = await rpc('reclamar_avistamiento', { p_avistamiento_id: idViejo }, tokC)
  check('reclamarlo de nuevo → no_reclamable', r.j?.ok === false, JSON.stringify(r.j))
} catch (e) { console.log('ERROR', e) } finally {
  for (const id of ids) { await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id }); await api('DELETE', '/auth/v1/admin/users/' + id) }
  db(`delete from placas where codigo='${CODIGO}'`)
  try { chrome?.kill() } catch {}
  const f = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  const blancaDespues = db(`select c.estado, c.ultima_lat, c.ultima_lng, (select count(*) from avistamientos a where a.mascota_id=m.id) avisos from mascotas m left join casos_perdida c on c.mascota_id=m.id and c.estado in ('perdida','posible_perdida') where m.nombre='Blanca'`)[0]
  check('Blanca sin tocar', JSON.stringify(blancaDespues) === JSON.stringify(blancaAntes))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
}
