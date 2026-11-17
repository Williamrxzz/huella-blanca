// "Las bajas son lógicas, nunca físicas" (CLAUDE.md, sección 2), garantizado
// por la base: un dueño no puede borrar con la API sus mascotas, casos,
// escaneos ni avisos; sí puede darlas de baja (activa = false) y cerrar casos.
// Además, las funciones que necesitan cuenta no las puede llamar `anon`.
// Ver la migración 20261117000009_limpieza_permisos.sql.
import { randomBytes } from 'node:crypto'
import { api, check, db, rpc, tokenDe } from './comun.mjs'

const email = `prueba-bajas-${randomBytes(3).toString('hex')}@example.com`
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const base0 = db('select (select count(*) from perfiles)::int perfiles, (select count(*) from mascotas)::int mascotas, (select count(*) from casos_perdida)::int casos, (select count(*) from placas)::int placas')[0]
let id
try {
  id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA bajas' })
  const token = await tokenDe(email, clave)
  const rep = { Prefer: 'return=representation' }

  // Lo que sí tiene que poder hacer el dueño (el uso normal de la app).
  let r = await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Bajita', especie: 'gato', domicilio_lat: -46.43, domicilio_lng: -67.52 }, rep, token)
  check('el dueño crea su mascota', r.s === 201, r.s)
  const M = r.j?.[0]?.id
  r = await api('GET', `/rest/v1/mascotas?id=eq.${M}&select=id`, null, {}, token)
  check('...la ve', r.s === 200 && r.j?.length === 1)
  r = await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual' }, rep, token)
  check('marca la pérdida (crea el caso)', r.s === 201, r.s)
  const C = r.j?.[0]?.id
  r = await api('GET', `/rest/v1/casos_perdida?id=eq.${C}&select=id`, null, {}, token)
  check('...lo ve', r.s === 200 && r.j?.length === 1)

  // Lo que no tiene que poder hacer: borrar.
  r = await api('DELETE', `/rest/v1/casos_perdida?id=eq.${C}`, null, rep, token)
  check('no puede borrar su caso', db(`select count(*)::int c from casos_perdida where id = '${C}'`)[0].c === 1, r.s)
  r = await api('DELETE', `/rest/v1/mascotas?id=eq.${M}`, null, rep, token)
  check('no puede borrar su mascota', db(`select count(*)::int c from mascotas where id = '${M}'`)[0].c === 1, r.s)

  // Las bajas lógicas siguen funcionando.
  r = await api('PATCH', `/rest/v1/casos_perdida?id=eq.${C}`, { estado: 'cerrada', cerrado_en: new Date().toISOString() }, rep, token)
  check('cierra el caso (estado)', r.s === 200 && r.j?.[0]?.estado === 'cerrada', r.s)
  r = await api('PATCH', `/rest/v1/mascotas?id=eq.${M}`, { activa: false }, rep, token)
  check('da de baja la mascota (activa = false)', r.s === 200 && r.j?.[0]?.activa === false, r.s)

  // Funciones que necesitan cuenta.
  r = await rpc('generar_placa', { p_mascota_id: M })
  check('anon no puede llamar a generar_placa', r.s === 401 || r.s === 403 || r.s === 404, r.s)
  r = await rpc('historial_colaboracion', {})
  check('anon no puede llamar a historial_colaboracion', r.s === 401 || r.s === 403 || r.s === 404, r.s)
  r = await rpc('historial_colaboracion', {}, token)
  check('con sesión, historial_colaboracion responde', r.s === 200, r.s)
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  if (id) {
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id })
    await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  const fin = db('select (select count(*) from perfiles)::int perfiles, (select count(*) from mascotas)::int mascotas, (select count(*) from casos_perdida)::int casos, (select count(*) from placas)::int placas')[0]
  check('la base quedó como estaba', JSON.stringify(fin) === JSON.stringify(base0), JSON.stringify(fin))
}
