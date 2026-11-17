// IA02 / costo de la API: sugerir-ficha exige sesión, y hay un límite de 30
// clasificaciones por cuenta y por hora, compartido con subir-foto (tabla
// uso_ia). Para no gastar 30 llamadas reales a Claude, el cupo se llena
// escribiendo filas en uso_ia con la clave de servicio.
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { ANON, URL_, api, check, db, fotoDePerro, tokenDe } from './comun.mjs'

async function funcion(nombre, cuerpo, token) {
  const r = await fetch(`${URL_}/functions/v1/${nombre}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + (token || ANON) },
    body: JSON.stringify(cuerpo),
  })
  let j = null
  try { j = await r.json() } catch { /* sin cuerpo */ }
  return { s: r.status, j }
}

const b64 = (await readFile(await fotoDePerro())).toString('base64')
const email = `prueba-limite-${randomBytes(3).toString('hex')}@example.com`
const clave = randomBytes(12).toString('hex') + 'Aa1!'
let id
try {
  let r = await funcion('sugerir-ficha', { imagen_base64: b64, media_type: 'image/jpeg' })
  check('sugerir-ficha sin sesión → 401, sin llegar a la IA', r.s === 401, `${r.s} ${JSON.stringify(r.j)}`)

  id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  const token = await tokenDe(email, clave)

  r = await funcion('sugerir-ficha', { imagen_base64: b64, media_type: 'image/jpeg' }, token)
  check('sugerir-ficha con sesión → apta y con pase', r.s === 200 && r.j?.categoria === 'apta' && !!r.j?.pase, `${r.s} ${r.j?.categoria}`)
  const pase = r.j?.pase
  let filas = (await api('GET', `/rest/v1/uso_ia?perfil_id=eq.${id}&select=funcion`)).j
  check('uso_ia registró el uso', filas.length === 1 && filas[0].funcion === 'sugerir-ficha', JSON.stringify(filas))

  const lectura = await api('GET', '/rest/v1/uso_ia?select=*', null, {}, token)
  const escritura = await api('POST', '/rest/v1/uso_ia', { perfil_id: id, funcion: 'subir-foto' }, {}, token)
  check('uso_ia cerrada al navegador', lectura.s >= 400 && escritura.s >= 400, `${lectura.s}/${escritura.s}`)

  // completar el cupo: 29 filas más = 30
  await api('POST', '/rest/v1/uso_ia', Array.from({ length: 29 }, () => ({ perfil_id: id, funcion: 'sugerir-ficha' })))
  r = await funcion('sugerir-ficha', { imagen_base64: b64, media_type: 'image/jpeg' }, token)
  check('sugerir-ficha pasado el límite → 429', r.s === 429 && r.j?.error === 'demasiadas_solicitudes', `${r.s} ${JSON.stringify(r.j)}`)

  r = await funcion('subir-foto', { imagen_base64: b64, media_type: 'image/jpeg', tipo: 'mascota', pase: null }, token)
  check('subir-foto sin pase pasado el límite → 429 con motivo', r.s === 429 && !!r.j?.motivo, `${r.s} ${JSON.stringify(r.j)}`)

  r = await funcion('subir-foto', { imagen_base64: b64, media_type: 'image/jpeg', tipo: 'mascota', pase }, token)
  check('subir-foto con pase válido, cupo lleno → se guarda (no llama a la IA)', r.s === 200 && r.j?.ok, `${r.s} ${r.j?.ruta || JSON.stringify(r.j)}`)

  filas = (await api('GET', `/rest/v1/uso_ia?perfil_id=eq.${id}&select=id`)).j
  check('los rechazos no suman filas', filas.length === 30, filas.length)

  // Varias llamadas seguidas sin sesión: responder 401 sin leer el cuerpo
  // colgaba las siguientes en el runtime de Supabase (2026-11-17).
  const tiempos = []
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now()
    const x = await funcion('sugerir-ficha', { imagen_base64: b64, media_type: 'image/jpeg' })
    tiempos.push(`${x.s}/${Date.now() - t0}ms`)
  }
  check('llamadas seguidas sin sesión: todas 401 y rápidas', tiempos.every((t) => t.startsWith('401/') && Number(t.split('/')[1].replace('ms', '')) < 10000), tiempos.join(' '))
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  if (id) {
    const lista = (await api('POST', '/storage/v1/object/list/fotos-mascotas', { prefix: id, limit: 100 })).j
    if (Array.isArray(lista) && lista.length) await api('DELETE', '/storage/v1/object/fotos-mascotas', { prefixes: lista.map((o) => `${id}/${o.name}`) })
    await api('DELETE', `/rest/v1/uso_ia?perfil_id=eq.${id}`)
    await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  const quedan = db(`select (select count(*) from auth.users where email = '${email}')::int usuarios, (select count(*) from uso_ia where perfil_id::text = '${id}')::int uso`)[0]
  check('no quedó nada de la prueba', quedan.usuarios === 0 && quedan.uso === 0, JSON.stringify(quedan))
}
