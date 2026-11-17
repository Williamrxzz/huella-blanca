// TRA05: teléfono normalizado en /perfil, /registro, perfil diferido del panel y check de la base.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { URL_, CHROME, DIR, sleep, resultados, check, db, ANON, api, rpc } from './comun.mjs'
const B = process.env.BASE || 'http://localhost:5173'
const telDe = id => db(`select telefono from perfiles where id='${id}'`)[0]?.telefono ?? null

const cols = "(select count(*) from perfiles) perfiles, (select count(*) from auth.users) usuarios, (select count(*) from mascotas) mascotas"
const base0 = db('select ' + cols)[0]
const TAG = 'prueba-tel-' + randomBytes(3).toString('hex'), clave = randomBytes(12).toString('hex') + 'Aa1!'
const ids = []; let chrome
const mk = async (sufijo, meta, conPerfil) => {
  const email = `${TAG}-${sufijo}@example.com`
  const u = await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true, user_metadata: meta })
  ids.push(u.j.id)
  if (conPerfil) await api('POST', '/rest/v1/perfiles', { id: u.j.id, nombre: 'PRUEBA TEL ' + sufijo })
  return { id: u.j.id, email }
}
try {
  const A = await mk('a', {}, true)
  const C = await mk('c', { nombre: 'Diferido válido', telefono: '0297 15 4123456' }, false)
  const E = await mk('e', { nombre: 'Diferido inválido', telefono: '4123456' }, false)

  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9447', '--user-data-dir=' + DIR + '/perfil-tel-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
  let lista; for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9447/json')).json(); if (lista.find(t => t.type === 'page')) break } catch {} await sleep(250) }
  const ws = new WebSocket(lista.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
  let n = 0; const esp = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && esp.has(m.id)) { esp.get(m.id)(m); esp.delete(m.id) } }
  const cmd = (method, params = {}) => new Promise(r => { const i = ++n; esp.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async x => { const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.result?.value }
  const ir = async u => { await cmd('Page.navigate', { url: u }); await sleep(2500) }
  const set = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
  const ayuda = () => ev(`document.getElementById('telefono-estado')?.innerText`)
  const enviar = async () => { await ev(`document.querySelector('button[type=submit]').click(); true`); await sleep(2500) }
  const salir = async () => { await ev(`localStorage.clear(); true`) }
  const entrar = async c => { await ir(B + '/login'); await set('input[type=email]', c.email); await set('input[type=password]', clave); await enviar(); await sleep(1000) }
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })

  // ---- /perfil ----
  await entrar(A); await ir(B + '/perfil')
  check('perfil vacío muestra el ejemplo', /297 412 3456/.test(await ayuda()), await ayuda())
  await set('input[type=tel]', '0297 15 4123456')
  check('mientras escribe muestra cómo va a quedar', (await ayuda()) === 'Se va a guardar como +54 9 2974123456.', await ayuda())
  await enviar()
  check('guardó en E.164', telDe(A.id) === '+5492974123456', telDe(A.id))
  check('confirma y muestra el número legible', (await ev(`document.body.innerText.includes('Cambios guardados')`)) && (await ev(`document.querySelector('input[type=tel]').value`)) === '+54 9 2974123456', await ev(`document.querySelector('input[type=tel]').value`))
  const r0 = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/tel-perfil-ok.png', Buffer.from(r0.result.data, 'base64'))

  await set('input[type=tel]', '4123456')
  check('sin código de área: pista suave antes de enviar', /código de área/.test(await ayuda()) && !(await ev(`document.getElementById('telefono-estado').className.includes('error')`)), await ayuda())
  await enviar()
  check('al enviar: error claro, en rojo', /Agregá el código de área/.test(await ayuda()) && await ev(`document.getElementById('telefono-estado').className.includes('error')`), await ayuda())
  check('...y no guardó nada', telDe(A.id) === '+5492974123456', telDe(A.id))
  const r1 = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/tel-perfil-error.png', Buffer.from(r1.result.data, 'base64'))

  await set('input[type=tel]', '+34 612 345 678'); await enviar()
  check('número de otro país se respeta', telDe(A.id) === '+34612345678', telDe(A.id))
  await set('input[type=tel]', ''); await enviar()
  check('vaciarlo lo borra (es opcional)', telDe(A.id) === null, String(telDe(A.id)))

  // ---- API directa: el check de la base ----
  const tok = (await (await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: A.email, password: clave }) })).json()).access_token
  const rp = await api('PATCH', `/rest/v1/perfiles?id=eq.${A.id}`, { telefono: '2974123456' }, {}, tok)
  check('API: un número sin formato lo rechaza la base', rp.s === 400 && /perfiles_telefono_e164/.test(JSON.stringify(rp.j)), rp.s)

  // ---- /registro: inválido no se envía ----
  await salir(); await ir(B + '/registro')
  const emailReg = `${TAG}-reg@example.com`
  await set('input[autocomplete=name]', 'Registro'); await set('input[type=email]', emailReg); await set('input[type=password]', clave)
  await set('input[type=tel]', '15 4123456'); await enviar()
  check('registro con teléfono inválido: no avanza y explica', (await ev('location.pathname')) === '/registro' && /código de área/.test(await ayuda()), await ayuda())
  const creados = await api('GET', `/auth/v1/admin/users?per_page=200`)
  check('...y no se creó la cuenta', !(creados.j?.users || []).some(u => u.email === emailReg))
  await set('input[type=tel]', '297 412-3456')
  check('registro: al corregirlo muestra cómo queda', (await ayuda()) === 'Se va a guardar como +54 9 2974123456.', await ayuda())

  // ---- perfil diferido (cuentas con teléfono viejo en user_metadata) ----
  await entrar(C); await sleep(1500)
  check('diferido con "0297 15 ..." → perfil creado y normalizado', telDe(C.id) === '+5492974123456', telDe(C.id))
  await salir(); await entrar(E); await sleep(1500)
  const filaE = db(`select count(*)::int c, max(telefono) t from perfiles where id='${E.id}'`)[0]
  check('diferido con número imposible → perfil creado igual, sin teléfono', filaE.c === 1 && filaE.t === null, JSON.stringify(filaE))
} catch (e) { console.log('ERROR', e) } finally {
  for (const id of ids) { await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id }); await api('DELETE', '/auth/v1/admin/users/' + id) }
  try { chrome?.kill() } catch {}
  const f = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
}
