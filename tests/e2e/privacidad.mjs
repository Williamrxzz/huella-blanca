// Ley 25.326 (2026-11-18): política de privacidad visible, consentimiento al
// crear la cuenta (nunca para avisar) y derecho de supresión: cada persona
// elimina su propia cuenta desde /perfil, al instante y por completo.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, URL_, ANON, api, borrarCuenta, check, db, rpc, sleep, tokenDe } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:4173'
const TAG = 'prueba-priv-' + randomBytes(3).toString('hex')
const CODIGO_A = 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
const CODIGO_B = 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const ids = []
let chrome

async function cuenta(sufijo, nombre, { conPerfil = true, rol = 'usuario', meta = {} } = {}) {
  const email = `${TAG}-${sufijo}@example.com`
  const id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: meta })).j.id
  ids.push(id)
  if (conPerfil) await api('POST', '/rest/v1/perfiles', { id, nombre, rol })
  return { id, email }
}
const funcion = async (body, token) => {
  const r = await fetch(`${URL_}/functions/v1/eliminar-cuenta`, { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  let j = null
  try { j = await r.json() } catch { /* sin cuerpo */ }
  return { s: r.status, j }
}

try {
  // ---- datos: A se va a eliminar; B es otra familia (A avisó sobre su mascota) ----
  const A = await cuenta('a', 'PRUEBA se va')
  const Bc = await cuenta('b', 'PRUEBA se queda')
  const admin = await cuenta('admin', 'PRUEBA admin', { rol: 'admin' })
  const diferida = await cuenta('d', 'Diferida', { conPerfil: false, meta: { nombre: 'Diferida', privacidad_aceptada_en: '2026-11-18T10:00:00.000Z' } })
  const MA = (await api('POST', '/rest/v1/mascotas', { dueno_id: A.id, nombre: 'Seva', especie: 'gato', domicilio_lat: -46.43, domicilio_lng: -67.52 }, { Prefer: 'return=representation' })).j[0].id
  const MB = (await api('POST', '/rest/v1/mascotas', { dueno_id: Bc.id, nombre: 'Sequeda', especie: 'perro', domicilio_lat: -46.43, domicilio_lng: -67.52 }, { Prefer: 'return=representation' })).j[0].id
  await api('POST', '/rest/v1/placas', [{ codigo: CODIGO_A, mascota_id: MA, estado: 'activa' }, { codigo: CODIGO_B, mascota_id: MB, estado: 'activa' }])
  await rpc('registrar_escaneo', { p_codigo: CODIGO_A, p_lat: null, p_lng: null })
  const tokA = await tokenDe(A.email, clave)
  const avisoDeA = (await rpc('registrar_avistamiento', { p_codigo: CODIGO_B, p_lat: -46.44, p_lng: -67.53, p_origen: 'gps', p_situacion: 'la_vi_pasar', p_mensaje: 'La vi', p_contacto: 'mi celu' }, tokA)).j.avistamiento_id

  // ---- la API ----
  let r = await funcion({ id: Bc.id }, tokA)
  check('un usuario común no puede borrar la cuenta de otro', r.s === 403, r.s)
  r = await funcion({ propia: true }, await tokenDe(admin.email, clave))
  check('una cuenta admin no puede borrarse a sí misma', r.s === 400 && r.j?.error === 'cuenta_admin', JSON.stringify(r.j))

  // ---- Chrome ----
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9454', `--user-data-dir=${DIR}/perfil-priv`, 'about:blank'], { stdio: 'ignore' })
  let pestanas
  for (let i = 0; i < 40; i++) { try { pestanas = await (await fetch('http://127.0.0.1:9454/json')).json(); if (pestanas.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
  const ws = new WebSocket(pestanas.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((res) => { ws.onopen = res })
  let n = 0
  const esperando = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) } }
  const cmd = (method, params = {}) => new Promise((res) => { const i = ++n; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const ir = async (u) => { await cmd('Page.navigate', { url: B + u }); await sleep(3000) }
  const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const clic = (texto) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(texto)}); if(!b) return false; b.click(); return true})()`)
  const texto = () => ev('document.body.innerText')
  const entrar = async (c) => { await ev('localStorage.clear(); true'); await ir('/login'); await escribir('input[type=email]', c.email); await escribir('input[type=password]', clave); await ev("document.querySelector('button[type=submit]').click(); true"); await sleep(4000) }
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })

  // La política
  await ir('/privacidad')
  const pol = await texto()
  check('la política explica qué se guarda y quién lo ve', /Nunca ve tu domicilio/.test(pol) && /Anthropic/.test(pol) && /eliminar tu\s+cuenta/i.test(pol))
  check('incluye la leyenda de la Ley 25.326 y la Agencia de Acceso a la Información Pública', /25\.326/.test(pol) && /Agencia de Acceso a la Información Pública/.test(pol))
  await ir('/')
  check('el inicio enlaza a la política', await ev("[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/privacidad')"))

  // Registro: sin aceptar no se envía (no se manda ningún registro real: no hay email)
  await ir('/registro')
  await escribir('input[autocomplete=name]', 'Nadie'); await escribir('input[type=email]', `${TAG}-noenviar@example.com`); await escribir('input[type=password]', clave)
  check('registro: hay casilla de consentimiento obligatoria', await ev("!!document.querySelector('.acepto-privacidad input[type=checkbox][required]')"))
  check('...sin marcarla, el formulario no es válido', !(await ev("document.querySelector('form').checkValidity()")))
  await ev("document.querySelector('.acepto-privacidad input').click(); true")
  check('...marcándola, sí', await ev("document.querySelector('form').checkValidity()"))

  // Avisar sigue sin pedir nada
  await ir('/m/' + CODIGO_B)
  await clic('La vi acá'); await sleep(9500)
  check('para avisar no se pide consentimiento ni cuenta', !(await ev("!!document.querySelector('.formulario-aviso .acepto-privacidad')")) && /Cómo usamos estos datos/.test(await texto()))

  // Consentimiento guardado en el perfil diferido
  await entrar(diferida)
  check('perfil diferido: guarda la fecha de aceptación', db(`select privacidad_aceptada_en::text f from perfiles where id = '${diferida.id}'`)[0]?.f?.startsWith('2026-11-18 10:00'))

  // Admin: no ofrece borrarse
  await entrar(admin)
  await ir('/perfil')
  check('admin: el perfil explica que no puede eliminarse desde acá', /no se eliminan desde acá/.test(await texto()) && !(await ev("[...document.querySelectorAll('button')].some(b=>/Eliminar mi cuenta/.test(b.innerText))")))

  // A elimina su cuenta
  await entrar(A)
  await ir('/perfil')
  check('el perfil ofrece eliminar la cuenta', await clic('Eliminar mi cuenta'))
  await sleep(400)
  check('explica qué se borra y que no se puede deshacer', /No se puede deshacer/.test(await texto()))
  await escribir('#palabra-eliminar', 'borrar')
  check('con otra palabra el botón no se habilita', await ev("[...document.querySelectorAll('button')].find(b=>/para siempre/.test(b.innerText)).disabled"))
  await escribir('#palabra-eliminar', 'eliminar')
  check('con ELIMINAR (sin importar mayúsculas) se habilita', !(await ev("[...document.querySelectorAll('button')].find(b=>/para siempre/.test(b.innerText)).disabled")))
  await clic('Eliminar mi cuenta para siempre'); await sleep(6000)
  check('vuelve al inicio y lo confirma', (await ev('location.pathname')) === '/' && /Tu cuenta y todos sus datos se eliminaron/.test(await texto()))
  const resto = db(`select (select count(*)::int from auth.users where id = '${A.id}') usuario, (select count(*)::int from perfiles where id = '${A.id}') perfil, (select count(*)::int from mascotas where dueno_id = '${A.id}') mascotas, (select count(*)::int from escaneos e join placas p on p.id = e.placa_id where p.codigo = '${CODIGO_A}') escaneos`)[0]
  check('no queda nada de A: usuario, perfil, mascotas ni escaneos', resto.usuario === 0 && resto.perfil === 0 && resto.mascotas === 0 && resto.escaneos === 0, JSON.stringify(resto))
  const aviso = db(`select reportado_por, contacto from avistamientos where id = '${avisoDeA}'`)[0]
  check('el aviso que A dio sobre la mascota de B queda, sin su cuenta ni su contacto', aviso && aviso.reportado_por === null && aviso.contacto === null, JSON.stringify(aviso))
  check('B y su mascota siguen intactos', db(`select count(*)::int c from mascotas where id = '${MB}'`)[0].c === 1)
  r = await rpc('ficha_publica', { p_codigo: CODIGO_A })
  check('la placa de A deja de funcionar', r.j?.encontrada === false)
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  for (const id of ids) await borrarCuenta(id)
  db(`delete from placas where codigo in ('${CODIGO_A}', '${CODIGO_B}')`)
  try { chrome?.kill() } catch { /* ya cerrado */ }
  const quedan = db(`select (select count(*)::int from auth.users where email like '${TAG}%') cuentas, (select count(*)::int from escaneos where mascota_id is null and placa_id is null and ocurrido_en > now() - interval '1 hour') huerfanos`)[0]
  check('no quedó nada de la prueba', quedan.cuentas === 0 && quedan.huerfanos === 0, JSON.stringify(quedan))
}
