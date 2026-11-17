// Recuperar la contraseña: /login → /recuperar → enlace del email →
// /restablecer → contraseña nueva. El enlace se genera con la API de
// administración (es el mismo que llega por email), así no hace falta un
// correo real. Se abre apuntando al INICIO de la app para probar también el
// desvío a /restablecer (src/lib/desvioRecuperacion.js), que cubre el caso de
// que la URL de vuelta no esté entre las permitidas del proyecto.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { CHROME, DIR, api, check, sleep } from './comun.mjs'

const B = process.env.BASE || 'http://localhost:5173'
const TAG = 'prueba-clave-' + randomBytes(3).toString('hex')
const email = `${TAG}@example.com`
const vieja = randomBytes(10).toString('hex') + 'Aa1!'
const nueva = randomBytes(10).toString('hex') + 'Bb2!'
const puedeEntrar = async (clave) => {
  const r = await api('POST', '/auth/v1/token?grant_type=password', { email, password: clave })
  return r.s === 200 && !!r.j?.access_token
}

let id, chrome
try {
  id = (await api('POST', '/auth/v1/admin/users', { email, password: vieja, email_confirm: true })).j.id
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA clave' })

  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9450', `--user-data-dir=${DIR}/perfil-clave`, 'about:blank'], { stdio: 'ignore' })
  let lista
  for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9450/json')).json(); if (lista.find((t) => t.type === 'page')) break } catch { /* todavía no */ } await sleep(250) }
  const ws = new WebSocket(lista.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => { ws.onopen = r })
  let n = 0
  const esperando = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id) } }
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++n; esperando.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const ir = async (u) => { await cmd('Page.navigate', { url: u }); await sleep(3000) }
  const escribir = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const enviar = async () => { await ev("document.querySelector('button[type=submit]').click(); true"); await sleep(2500) }
  const texto = () => ev('document.body.innerText')
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })

  // ---- /login → /recuperar ----
  await ir(B + '/login')
  check('el login ofrece recuperar la contraseña', (await ev("[...document.querySelectorAll('a')].find(a=>/Olvidaste/.test(a.innerText))?.getAttribute('href')")) === '/recuperar')
  await ir(B + '/recuperar')
  // Un email sin cuenta: Supabase responde igual y no manda nada.
  await escribir('input[type=email]', `prueba-noexiste-${randomBytes(3).toString('hex')}@example.com`)
  await enviar()
  const t1 = await texto()
  check('pedir el enlace: respuesta neutra, no revela si la cuenta existe', /Revisá tu email/.test(t1) && /Si hay una cuenta con/.test(t1), t1.slice(0, 90))

  // ---- el enlace del email ----
  const enlace = await api('POST', '/auth/v1/admin/generate_link', { type: 'recovery', email, redirect_to: `${B}/restablecer` })
  check('Supabase genera el enlace de recuperación', enlace.s === 200 && !!enlace.j?.action_link, enlace.s)
  const verificado = await fetch(enlace.j.action_link, { redirect: 'manual' })
  const destino = verificado.headers.get('location') || ''
  const vuelta = new URL(destino)
  console.log(`  (Supabase devuelve a: ${vuelta.origin}${vuelta.pathname} — ${vuelta.pathname === '/restablecer' ? 'la URL pedida está permitida' : 'la URL pedida NO está permitida; vuelve al Site URL'})`)
  check('el enlace devuelve un token de recuperación', /type=recovery/.test(vuelta.hash) && /access_token=/.test(vuelta.hash))

  // Se abre en el INICIO de la app local con el token: tiene que desviar.
  await ir(`${B}/${vuelta.hash}`)
  check('desde el inicio, el enlace lleva a /restablecer', (await ev('location.pathname')) === '/restablecer', await ev('location.pathname'))
  check('pide la contraseña nueva', /Elegí una contraseña nueva/.test(await texto()))
  check('el token no queda a la vista en la dirección', !/access_token/.test(await ev('location.href')))

  await escribir('input[aria-label="Contraseña nueva"]', nueva)
  await escribir('input[aria-label="Repetir la contraseña nueva"]', nueva + 'x')
  await enviar()
  check('si no coinciden, lo dice', /no coinciden/.test(await texto()))
  await escribir('input[aria-label="Repetir la contraseña nueva"]', nueva)
  await enviar()
  check('guarda la contraseña nueva', /Tu contraseña nueva quedó guardada/.test(await texto()))
  check('entra con la nueva', await puedeEntrar(nueva))
  check('ya no entra con la vieja', !(await puedeEntrar(vieja)))

  // ---- sin token (enlace vencido o abierto en otro navegador) ----
  await ev('localStorage.clear(); true')
  await ir(B + '/restablecer')
  const t2 = await texto()
  check('sin token válido: explica y ofrece pedir otro enlace', /El enlace ya no sirve/.test(t2) && /Pedir otro enlace/.test(t2))
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  if (id) {
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id })
    await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  try { chrome?.kill() } catch { /* ya cerrado */ }
  const r = await api('GET', '/auth/v1/admin/users?per_page=1000')
  check('no quedó la cuenta de prueba', !(r.j?.users || []).some((u) => u.email === email))
}
