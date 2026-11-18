import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import https from 'node:https'
import { URL_, CHROME, DIR, sleep, resultados, check, db, SERVICE, api, rpc } from './comun.mjs'

const TAG = 'prueba-est-' + randomBytes(4).toString('hex')
const cols = "(select count(*) from perfiles) perfiles, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from escaneos) escaneos, (select count(*) from avistamientos) avistamientos, (select count(*) from auth.users) usuarios_auth, (select count(*) from storage.objects where bucket_id='fotos-mascotas') fotos"
const base0 = db('select ' + cols)[0]
console.log('línea base:', JSON.stringify(base0))

const ids = []
let chrome
try {
  const clave = randomBytes(12).toString('hex') + 'Aa1!'
  const mk = async (e, nombre, rol) => {
    const u = await api('POST', '/auth/v1/admin/users', { email: `${TAG}-${e}@example.com`, password: clave, email_confirm: true })
    if (u.s >= 300) throw new Error('crear usuario ' + JSON.stringify(u))
    ids.push(u.j.id)
    const p = await api('POST', '/rest/v1/perfiles', { id: u.j.id, nombre, rol }, { Prefer: 'return=representation' })
    if (p.s >= 300) throw new Error('perfil ' + JSON.stringify(p))
    return { id: u.j.id, email: `${TAG}-${e}@example.com` }
  }
  const C = await mk('c', 'PRUEBA ADMIN EST', 'admin')
  const U = await mk('u', 'PRUEBA USUARIO EST', 'usuario')
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9444', '--user-data-dir=' + DIR + '/perfil-ui', 'about:blank'], { stdio: 'ignore' })
  let lista
  for (let i = 0; i < 40; i++) { try { lista = await (await fetch('http://127.0.0.1:9444/json')).json(); if (lista.find(t => t.type === 'page')) break } catch {} await sleep(250) }
  const ws = new WebSocket(lista.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let n = 0; const esp = new Map(); let dialogos = []
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.id && esp.has(m.id)) { esp.get(m.id)(m); esp.delete(m.id) }
    if (m.method === 'Page.javascriptDialogOpening') {
      dialogos.push(m.params.message)
      cmd('Page.handleJavaScriptDialog', { accept: true })
    }
  }
  const cmd = (method, params = {}) => new Promise(r => { const i = ++n; esp.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async x => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
  const foto = async nombre => { const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/' + nombre, Buffer.from(r.result.data, 'base64')) }
  const ir = async u => { await cmd('Page.navigate', { url: u }); await sleep(2500) }
  await cmd('Page.enable')
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true })
  const B = process.env.BASE || 'http://localhost:5173'

  const entrar = async (cuenta) => {
    await ir(B + '/login')
    await ev(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};
      set(document.querySelector('input[type=email]'),${JSON.stringify(cuenta.email)}); set(document.querySelector('input[type=password]'),${JSON.stringify(clave)});
      document.querySelector('button[type=submit]').click(); return true})()`)
    await sleep(3500)
  }
  // usuario común: rebotado
  await entrar(U)
  await ir(B + '/admin/estadisticas')
  check('usuario común: /admin/estadisticas lo rebota al panel', (await ev('location.pathname')) === '/panel', await ev('location.pathname'))
  const rpcU = await ev(`(async()=>{const k=Object.keys(localStorage).find(k=>k.includes('auth-token'));const t=JSON.parse(localStorage[k]).access_token;const r=await fetch(${JSON.stringify(URL_)}+'/rest/v1/rpc/admin_estadisticas',{method:'POST',headers:{apikey:${JSON.stringify(SERVICE)},Authorization:'Bearer '+t,'Content-Type':'application/json'},body:'{}'});return r.status+' '+(await r.text()).slice(0,80)})()`)
  check('usuario común: la función rechaza', /^4/.test(rpcU), rpcU)
  await ev('localStorage.clear()')
  // admin
  await entrar(C)
  await ir(B + '/admin/estadisticas')
  await sleep(1500)
  check('admin entra a /admin/estadisticas', (await ev('location.pathname')) === '/admin/estadisticas')
  const txt = await ev('document.body.innerText')
  check('muestra tarjetas y los tres gráficos', /Cuentas/.test(txt) && /Escaneos por día/.test(txt) && /Avisos por día/.test(txt) && /Casos por estado/.test(txt))
  check('hay gráficos SVG dibujados', (await ev("document.querySelectorAll('.recharts-surface').length")) >= 3, await ev("document.querySelectorAll('.recharts-surface').length"))
  const real = db("select (select count(*) from escaneos) e, (select count(*) from perfiles) p")[0]
  const tarj = await ev("[...document.querySelectorAll('.admin-tarjeta')].map(t=>t.innerText.replace(/\\n/g,' '))")
  check('los totales coinciden con la base', tarj.some(t=>t.startsWith(real.e+' Escaneos')) && tarj.some(t=>t.startsWith(real.p+' Cuentas')), JSON.stringify(tarj.slice(0,5)))
  const desborde = await ev('document.documentElement.scrollWidth > innerWidth')
  check('sin scroll horizontal', desborde === false)
  await foto('est-1-claro.png')
  await ev("(()=>{const k='accesibilidad';const p=JSON.parse(localStorage[k]||'{}');p.oscuro=true;localStorage[k]=JSON.stringify(p)})()")
  await ir(B + '/admin/estadisticas'); await sleep(1500)
  check('modo oscuro activo', (await ev('document.documentElement.dataset.tema')) === 'oscuro')
  await foto('est-2-oscuro.png')
  await ev("document.querySelectorAll('.admin-tabla summary').forEach(s=>s.click())")
  check('la tabla alternativa se despliega', (await ev("document.querySelectorAll('.admin-tabla table').length")) >= 3)
  check('ya no muestra "placas sin asignar" (circuito retirado el 2026-11-17)', !/sin asignar/i.test(txt))
  await ir(B + '/panel'); await sleep(1500)
  const enl = await ev("[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>h&&h.startsWith('/admin/'))")
  check('el panel muestra los dos enlaces de administración', ['/admin/estadisticas','/admin/cuentas'].every(h=>enl.includes(h)) && !enl.includes('/admin/placas'), JSON.stringify(enl))
  ws.close()
} catch (e) { check('la prueba terminó sin excepciones', false, e.message || String(e)) } finally {
  console.log('limpiando…')
  for (const id of ids) { await api('DELETE', '/rest/v1/perfiles?id=eq.' + id); await api('DELETE', '/auth/v1/admin/users/' + id) }
  try { chrome?.kill() } catch {}
  const f = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
  process.exit(0)
}
