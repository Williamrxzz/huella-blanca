// Interfaz que se explica sola (2026-11-18): estados vacíos que dicen qué hacer,
// radio de aviso con opciones con significado, selector de foto propio, huella
// en vez de "Sin foto" y acciones ocasionales en la hoja "Más" del panel.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, api, borrarCuenta, check, db, fotoDePerro, rpc, sleep, tokenDe } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:4173'
const email = `prueba-ui-${randomBytes(3).toString('hex')}@example.com`
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const codigos = []
// Conteo de placas al empezar: la prueba tiene que dejarlo igual.
const placas0 = db('select count(*)::int c from placas')[0].c
let id, chrome
try {
  const FOTO = await fotoDePerro()
  id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA interfaz' })
  const token = await tokenDe(email, clave)

  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9458', `--user-data-dir=${DIR}/perfil-interfaz`, 'about:blank'], { stdio: 'ignore' })
  let pestanas
  for (let i = 0; i < 40; i++) { try { pestanas = await (await fetch('http://127.0.0.1:9458/json')).json(); if (pestanas.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
  const ws = new WebSocket(pestanas.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let n = 0
  const esperando = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) } }
  const cmd = (method, params = {}) => new Promise((res) => { const i = ++n; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const ir = async (u) => { await cmd('Page.navigate', { url: B + u }); await sleep(3500) }
  const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  const texto = () => ev('document.body.innerText')
  await cmd('Page.enable'); await cmd('DOM.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })
  await ir('/login')
  await escribir('input[type=email]', email); await escribir('input[type=password]', clave)
  await ev("document.querySelector('button[type=submit]').click()"); await sleep(4500)

  // Panel vacío
  const vacio = await ev("document.querySelector('.estado-vacio')?.innerText || ''")
  check('panel sin mascotas: estado vacío que explica qué hacer', /Todavía no cargaste ninguna mascota/.test(vacio) && /código QR/.test(vacio), vacio.replace(/\n/g, ' · ').slice(0, 90))

  // Historial vacío
  await ir('/mi-historial')
  check('historial vacío: explica cómo se ayuda', /escaneá el código y avisá/.test(await ev("document.querySelector('.estado-vacio')?.innerText || ''")))

  // Alta: radio con opciones y selector de foto propio
  await ir('/mascotas/nueva')
  const opciones = await ev("[...document.querySelectorAll('#radio-aviso option')].map(o=>o.innerText)")
  check('radio de aviso: opciones con significado, empieza en una cuadra', JSON.stringify(opciones) === JSON.stringify(['Una cuadra (100 m)', 'Unas tres cuadras (300 m)', 'El barrio (500 m)', 'Un kilómetro', 'Tres kilómetros']) && (await ev("document.querySelector('#radio-aviso').value")) === '100', JSON.stringify(opciones))
  check('...con una frase que explica qué significa', /te avisamos que podría estar perdida/.test(await texto()))
  check('foto: botón propio "Elegir foto", sin el control del navegador a la vista', (await ev("document.querySelector('.selector-foto-boton')?.innerText.trim()")) === 'Elegir foto' && (await ev("getComputedStyle(document.querySelector('.selector-foto input[type=file]')).width")) === '1px')
  const doc = await cmd('DOM.getDocument', { depth: -1 })
  const q = await cmd('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.selector-foto input[type=file]' })
  await cmd('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [FOTO] })
  await sleep(1500)
  check('al elegir una foto: vista previa y "Cambiar foto"', (await ev("document.querySelector('.selector-foto-boton')?.innerText.trim()")) === 'Cambiar foto' && await ev("!!document.querySelector('.selector-foto img.miniatura')"))

  // Una mascota sin foto ni avisos
  const M = (await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Sinfotito', especie: 'gato', domicilio_lat: -46.43, domicilio_lng: -67.52 }, { Prefer: 'return=representation' }, token)).j[0].id
  const codigo = (await rpc('generar_placa', { p_mascota_id: M }, token)).j
  codigos.push(codigo)
  await ir('/panel')
  check('panel: sin foto se ve una huella, con texto alternativo', await ev("!!document.querySelector('.miniatura.vacia[role=img][aria-label=\"Sin foto\"] svg')"))
  const visibles = await ev("[...document.querySelectorAll('.acciones-mascota > *')].map(b=>b.innerText.trim())")
  check('panel: a la vista solo lo del día a día', JSON.stringify(visibles) === JSON.stringify(['Se perdió', 'Avisos', 'Código QR', 'Más']), JSON.stringify(visibles))
  await ev("[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Más').click()"); await sleep(400)
  const hoja = await ev("[...document.querySelectorAll('.opcion-hoja')].map(b=>b.querySelector('strong').innerText)")
  check('"Más" ofrece editar, modo paseo, reemplazar QR y eliminar (al final)', JSON.stringify(hoja) === JSON.stringify(['Editar datos', 'Modo paseo', 'Reemplazar código QR', 'Eliminar mascota']), JSON.stringify(hoja))
  check('...cada opción explica para qué sirve', await ev("[...document.querySelectorAll('.opcion-hoja small')].every(s=>s.innerText.length > 20)"))
  await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(300)
  check('...y se cierra con Escape', !(await ev("!!document.querySelector('.hoja-acciones')")))

  // Mapa sin avisos y ficha sin foto
  await ir(`/mascotas/${M}/mapa`)
  check('mapa sin avisos: estado vacío que dice qué va a pasar', /Todavía nadie avisó que vio a Sinfotito/.test(await ev("document.querySelector('.estado-vacio')?.innerText || ''")))
  await ir('/m/' + codigo)
  check('ficha sin foto: huella y "Sin foto"', await ev("!!document.querySelector('.foto.vacia svg')") && /Sin foto/.test(await texto()))
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  try { chrome?.kill() } catch { /* ya cerrado */ }
  await borrarCuenta(id)
  for (const c of codigos) db(`delete from placas where codigo = '${c}' and mascota_id is null`)
  const quedan = db(`select (select count(*)::int from auth.users where email = '${email}') cuenta, (select count(*)::int from placas) placas`)[0]
  check('no quedó nada de la prueba', quedan.cuenta === 0 && quedan.placas === placas0, JSON.stringify(quedan))
}
