import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import https from 'node:https'
import { CHROME, DIR, sleep, resultados, check, db, api } from './comun.mjs'

const TAG = 'prueba-ui-' + randomBytes(4).toString('hex')
const cols = "(select count(*) from perfiles) perfiles, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from escaneos) escaneos, (select count(*) from avistamientos) avistamientos, (select count(*) from auth.users) usuarios_auth, (select count(*) from storage.objects where bucket_id='fotos-mascotas') fotos"
const base0 = db('select ' + cols)[0]
console.log('línea base:', JSON.stringify(base0))

const ids = []
let chrome
try {
  // admin de prueba (C) y cuenta a eliminar (A)
  const clave = randomBytes(12).toString('hex') + 'Aa1!'
  const mk = async (e, nombre, rol) => {
    const u = await api('POST', '/auth/v1/admin/users', { email: `${TAG}-${e}@example.com`, password: clave, email_confirm: true })
    if (u.s >= 300) throw new Error('crear usuario ' + JSON.stringify(u))
    ids.push(u.j.id)
    const p = await api('POST', '/rest/v1/perfiles', { id: u.j.id, nombre, rol, telefono: '+5490000000000' }, { Prefer: 'return=representation' })
    if (p.s >= 300) throw new Error('perfil ' + JSON.stringify(p))
    return { id: u.j.id, email: `${TAG}-${e}@example.com` }
  }
  const C = await mk('c', 'PRUEBA ADMIN UI', 'admin')
  const A = await mk('a', 'PRUEBA CUENTA UI', 'usuario')
  await api('POST', '/rest/v1/mascotas', { dueno_id: A.id, nombre: 'PruebaUI', especie: 'perro', domicilio_lat: -46.43, domicilio_lng: -67.52 }, { Prefer: 'return=representation' })

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
  const B = 'http://localhost:5173'

  // login real con el formulario
  await ir(B + '/login')
  await ev(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};
    set(document.querySelector('input[type=email]'),${JSON.stringify(C.email)}); set(document.querySelector('input[type=password]'),${JSON.stringify(clave)});
    document.querySelector('button[type=submit]').click(); return true})()`)
  await sleep(3500)
  check('login del admin de prueba lleva a /panel', (await ev('location.pathname')) === '/panel', await ev('location.pathname'))

  await ir(B + '/admin/cuentas')
  check('el admin entra a /admin/cuentas (no lo rebota)', (await ev('location.pathname')) === '/admin/cuentas')
  const textoLista = await ev('document.body.innerText')
  check('la lista muestra la cuenta de prueba, con email y teléfono', textoLista.includes('PRUEBA CUENTA UI') && textoLista.includes(`${TAG}-a@example.com`) && textoLista.includes('+5490000000000'))
  check('no quedan restos de la papelera en la pantalla', !/papelera|restaurar/i.test(textoLista))
  await foto('ui-1-lista.png')

  // detalle de la cuenta de prueba
  await ev(`(()=>{const li=[...document.querySelectorAll('.lista-mascotas li')].find(l=>l.innerText.includes('PRUEBA CUENTA UI')); li.querySelector('button').click(); return true})()`)
  await sleep(2500)
  const det = await ev(`[...document.querySelectorAll('.lista-mascotas li')].find(l=>l.innerText.includes('PRUEBA CUENTA UI')).innerText`)
  check('el detalle muestra la mascota y el domicilio con enlace al mapa', det.includes('PruebaUI') && det.includes('-46.43000') && det.includes('Ver en el mapa'))
  await foto('ui-2-detalle.png')

  // modo oscuro en esta pantalla
  await ev(`localStorage.setItem('accesibilidad', JSON.stringify({oscuro:true})); true`)
  await ir(B + '/admin/cuentas')
  check('modo oscuro activo en /admin/cuentas', (await ev('document.documentElement.dataset.tema')) === 'oscuro')
  await foto('ui-3-oscuro.png')
  await ev(`localStorage.setItem('accesibilidad', JSON.stringify({oscuro:false})); true`)
  await ir(B + '/admin/cuentas')

  // botones: la cuenta propia y otros admins NO tienen "Eliminar cuenta"
  const propios = await ev(`[...document.querySelectorAll('.lista-mascotas li')].filter(l=>/\\(admin\\)/.test(l.innerText)).map(l=>/Eliminar cuenta/.test(l.innerText))`)
  check('las cuentas admin no muestran "Eliminar cuenta"', propios.length >= 1 && propios.every(x => x === false), JSON.stringify(propios))

  // eliminar con clics reales
  const antes = db(`select count(*) c from perfiles where id='${A.id}'`)[0].c
  await ev(`(()=>{const li=[...document.querySelectorAll('.lista-mascotas li')].find(l=>l.innerText.includes('PRUEBA CUENTA UI')); [...li.querySelectorAll('button')].find(b=>b.innerText==='Eliminar cuenta').click(); return true})()`)
  await sleep(6000)
  check('apareció la confirmación, nombra a la cuenta y avisa que no se puede deshacer', dialogos.length === 1 && dialogos[0].includes('PRUEBA CUENTA UI') && /No se puede deshacer/.test(dialogos[0]), JSON.stringify(dialogos).slice(0, 160))
  const despues = db(`select (select count(*) from perfiles where id='${A.id}') p, (select count(*) from auth.users where id='${A.id}') u, (select count(*) from mascotas where dueno_id='${A.id}') m`)[0]
  check('tras el clic la cuenta dejó de existir en perfiles, Auth y mascotas', antes === 1 && despues.p === 0 && despues.u === 0 && despues.m === 0, JSON.stringify(despues))
  const textoDespues = await ev('document.body.innerText')
  check('la pantalla se actualizó sola: ya no aparece la cuenta', !textoDespues.includes('PRUEBA CUENTA UI'))
  check('...y no mostró ningún error', !(await ev(`!!document.querySelector('[role=alert]')`)))
  await foto('ui-4-despues.png')

  // cancelar la confirmación no borra nada: se prueba con la cuenta admin C ya excluida, así que se valida con otra de prueba
  const E = await mk('e', 'PRUEBA CANCELAR UI', 'usuario')
  await ir(B + '/admin/cuentas')
  const original = await ev('window.confirm.toString()')
  await ev(`window.__confirm = window.confirm; window.confirm = () => false; true`)
  await ev(`(()=>{const li=[...document.querySelectorAll('.lista-mascotas li')].find(l=>l.innerText.includes('PRUEBA CANCELAR UI')); [...li.querySelectorAll('button')].find(b=>b.innerText==='Eliminar cuenta').click(); return true})()`)
  await sleep(2500)
  check('si se cancela la confirmación, la cuenta NO se borra', db(`select count(*) c from perfiles where id='${E.id}'`)[0].c === 1)
} catch (e) {
  console.log(e.stack); resultados.push(false); console.log('FAIL la prueba se interrumpió')
} finally {
  console.log('limpiando…')
  try {
    chrome?.kill()
    if (ids.length) {
      const l = ids.map(i => `'${i}'`).join(',')
      const sub = `select id from mascotas where dueno_id in (${l})`
      db(`delete from escaneos where mascota_id in (${sub})`); db(`delete from avistamientos where mascota_id in (${sub}) or reportado_por in (${l})`)
      db(`delete from casos_perdida where mascota_id in (${sub}) or rescatista_id in (${l})`)
      db(`delete from mascotas where dueno_id in (${l})`); db(`delete from perfiles where id in (${l})`)
      for (const i of ids) await api('DELETE', '/auth/v1/admin/users/' + i)
    }
  } catch (e) { console.log('ERROR limpieza:', e.message) }
  const base1 = db('select ' + cols)[0]
  console.log('línea base final:', JSON.stringify(base1))
  check('después de limpiar, la base quedó exactamente como estaba', JSON.stringify(base0) === JSON.stringify(base1))
  console.log(`\nRESULTADO: ${resultados.filter(Boolean).length}/${resultados.length} verificaciones pasaron`)
  process.exit(resultados.every(Boolean) ? 0 : 1)
}
