// /ejemplo sin tocar la base; escaneos del dueño ignorados; texto de caso escalado solo.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { URL_, CHROME, DIR, sleep, resultados, check, db, ANON, api, rpc } from './comun.mjs'
const B = process.env.BASE || 'http://localhost:5173'

const cols = "(select count(*) from perfiles) perfiles, (select count(*) from auth.users) usuarios, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from avistamientos) avistamientos, (select count(*) from escaneos) escaneos, (select count(*) from notificaciones) notificaciones"
const base0 = db('select ' + cols)[0]
const blanca = () => db(`select (select count(*) from escaneos e where e.mascota_id=m.id)::int escaneos, (select count(*) from avistamientos a where a.mascota_id=m.id)::int avisos, (select count(*) from notificaciones n where n.mascota_id=m.id)::int notis from mascotas m where m.nombre='Blanca'`)[0]
const blanca0 = blanca()
const TAG = 'prueba-ej-' + randomBytes(3).toString('hex'), clave = randomBytes(12).toString('hex') + 'Aa1!'
const CODIGO = 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
let id, chrome
try {
  const u = await api('POST', '/auth/v1/admin/users', { email: `${TAG}@example.com`, password: clave, email_confirm: true }); id = u.j.id
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA ejemplo' })
  const M = (await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Escalada', especie: 'perro', sexo: 'hembra', domicilio_lat: -46.4380, domicilio_lng: -67.5280, radio_metros: 100, horas_confirmacion: 1 }, { Prefer: 'return=representation' })).j[0].id
  await api('POST', '/rest/v1/placas', { codigo: CODIGO, mascota_id: M, estado: 'activa' })
  const tok = (await (await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${TAG}@example.com`, password: clave }) })).json()).access_token
  const cuenta = () => db(`select (select count(*) from escaneos where mascota_id='${M}')::int esc, (select count(*) from casos_perdida where mascota_id='${M}')::int casos, (select count(*) from notificaciones where mascota_id='${M}')::int notis`)[0]

  // ---- escaneo del dueño ----
  let r = await rpc('registrar_escaneo', { p_codigo: CODIGO, p_lat: -46.50, p_lng: -67.60 }, tok)
  check('dueño escanea su placa lejos de casa → propio, sin registrar', r.j?.propio === true && (c => c.esc === 0 && c.casos === 0 && c.notis === 0)(cuenta()), `${JSON.stringify(r.j)} ${JSON.stringify(cuenta())}`)
  r = await rpc('registrar_escaneo', { p_codigo: CODIGO, p_lat: -46.50, p_lng: -67.60 })
  const c1 = cuenta()
  check('otra persona escanea lejos → escaneo, posible pérdida y aviso', r.j?.ok && !r.j?.propio && c1.esc === 1 && c1.casos === 1 && c1.notis === 1, JSON.stringify(c1))

  // ---- escalado automático ----
  const elegibles = db(`select count(*)::int c from casos_perdida c join mascotas m on m.id=c.mascota_id where c.estado='posible_perdida' and c.mascota_id <> '${M}' and c.iniciado_en < now() - make_interval(hours => m.horas_confirmacion) - interval '5 minutes'`)[0].c
  if (elegibles > 0) throw new Error(`hay ${elegibles} casos reales que escalarían: no se corre escalar_casos_sin_respuesta`)
  r = await rpc('ficha_publica', { p_codigo: CODIGO })
  check('posible pérdida → perdida_automatica false', r.j?.estado === 'posible_perdida' && r.j?.perdida_automatica === false, `${r.j?.estado} ${r.j?.perdida_automatica}`)
  db(`update casos_perdida set iniciado_en = now() - interval '2 hours' where mascota_id='${M}'`)
  const escaladosReales0 = db(`select count(*)::int c from casos_perdida where escalado_en is not null and mascota_id <> '${M}'`)[0].c
  db(`select escalar_casos_sin_respuesta()`)
  const caso = db(`select estado, escalado_en is not null escalado from casos_perdida where mascota_id='${M}'`)[0]
  check('pasa sola a perdida y queda marcada', caso.estado === 'perdida' && caso.escalado === true, JSON.stringify(caso))
  check('...ningún caso real tocado', db(`select count(*)::int c from casos_perdida where escalado_en is not null and mascota_id <> '${M}'`)[0].c === escaladosReales0)
  r = await rpc('ficha_publica', { p_codigo: CODIGO })
  check('ficha_publica → perdida_automatica true', r.j?.estado === 'perdida' && r.j?.perdida_automatica === true)
  const rb = await rpc('ficha_publica', { p_codigo: 'C30A45A9' })
  check('Blanca (la confirmó su dueño) → perdida_automatica false', rb.j?.estado === 'perdida' && rb.j?.perdida_automatica === false, `${rb.j?.estado} ${rb.j?.perdida_automatica}`)

  // ---- Chrome ----
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9449', '--user-data-dir=' + DIR + '/perfil-ej-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
  let lista; for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9449/json')).json(); if (lista.find(t => t.type === 'page')) break } catch {} await sleep(250) }
  const ws = new WebSocket(lista.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
  let n = 0; const esp = new Map(); const pedidos = []
  ws.onmessage = e => { const x = JSON.parse(e.data); if (x.id && esp.has(x.id)) { esp.get(x.id)(x); esp.delete(x.id) } if (x.method === 'Network.requestWillBeSent') pedidos.push(x.params.request.method + ' ' + x.params.request.url) }
  const cmd = (method, params = {}) => new Promise(r => { const i = ++n; esp.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async x => { const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.result?.value }
  const ir = async u => { await cmd('Page.navigate', { url: u }); await sleep(3000) }
  const foto = async nombre => { const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/' + nombre, Buffer.from(r.result.data, 'base64')) }
  const clic = texto => ev(`(()=>{const b=[...document.querySelectorAll('button,a')].find(b=>b.innerText.trim()===${JSON.stringify(texto)}); if(!b) return false; b.click(); return true})()`)
  const setTexto = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  await cmd('Page.enable'); await cmd('Network.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })
  await cmd('Browser.grantPermissions', { origin: B, permissions: ['geolocation'] })
  await cmd('Emulation.setGeolocationOverride', { latitude: -46.50, longitude: -67.60, accuracy: 10 })

  // Texto del caso escalado
  await ir(`${B}/m/${CODIGO}`)
  const alerta = await ev(`document.querySelector('.alerta')?.innerText`)
  check('ficha del caso escalado: no dice que el dueño confirmó', /su familia todavía no respondió/.test(alerta || '') && !/confirmó/.test(alerta || ''), alerta)
  await foto('ficha-escalada.png')

  // Inicio → /ejemplo
  await ir(B + '/')
  check('el inicio enlaza a /ejemplo', (await ev(`[...document.querySelectorAll('a')].find(a=>/ejemplo de ficha/.test(a.innerText))?.getAttribute('href')`)) === '/ejemplo')
  pedidos.length = 0
  await clic('Ver un ejemplo de ficha'); await sleep(3000)
  check('abre /ejemplo', (await ev('location.pathname')) === '/ejemplo')
  const txt = await ev('document.body.innerText')
  check('aclara que es un ejemplo', /Ficha de ejemplo\./.test(txt) && /no se envía nada a nadie/.test(txt))
  check('muestra a Blanca, la alerta y el mensaje', /Soy Blanca/.test(txt) && /Su familia confirmó/.test(txt) && /Se asusta con los ruidos/.test(txt))
  check('botones de contacto sin enlace real', (await ev(`[...document.querySelectorAll('.contacto-dueno a')].length`)) === 0 && (await ev(`document.querySelectorAll('.contacto-dueno button').length`)) === 2)
  await clic('WhatsApp'); await sleep(300)
  check('...y explican qué harían', /En una ficha real, esto abre WhatsApp/.test(await ev('document.body.innerText')))
  await foto('ejemplo-arriba.png')
  await clic('La vi acá'); await sleep(2500)
  await setTexto('.formulario-aviso textarea', 'Prueba del ejemplo')
  await ev(`document.querySelector('.formulario-aviso button[type=submit]').click(); true`); await sleep(1500)
  const txt2 = await ev('document.body.innerText')
  check('aviso simulado: agradece y aclara que no se envió', /¡Gracias!/.test(txt2) && /Esto es un ejemplo: no se envió nada/.test(txt2) && !/Crear cuenta/.test(txt2))
  const aSupabase = pedidos.filter(p => p.includes('supabase.co') && !p.includes('/storage/v1/object/public/'))
  check('el ejemplo no hizo ningún pedido a la base', aSupabase.length === 0, aSupabase.join(' | ') || 'ninguno')

  // El dueño, con sesión, abre la ficha de su mascota lejos de casa
  await ir(B + '/login')
  await setTexto('input[type=email]', `${TAG}@example.com`); await setTexto('input[type=password]', clave)
  await ev(`document.querySelector('button[type=submit]').click(); true`); await sleep(4000)
  const antes = cuenta().esc
  await ir(`${B}/m/${CODIGO}`); await sleep(2000)
  check('el dueño abre su propia ficha: no suma escaneo', cuenta().esc === antes, `${antes} → ${cuenta().esc}`)
} catch (e) { console.log('ERROR', e.message || e) } finally {
  if (id) { await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id }); await api('DELETE', '/auth/v1/admin/users/' + id) }
  db(`delete from placas where codigo='${CODIGO}'`)
  try { chrome?.kill() } catch {}
  const f = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  check('Blanca: ni escaneos, ni avisos, ni notificaciones nuevas', JSON.stringify(blanca()) === JSON.stringify(blanca0), JSON.stringify(blanca()))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
}
