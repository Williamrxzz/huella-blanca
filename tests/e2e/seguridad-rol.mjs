// Seguridad (2026-11-17): una cuenta común no puede hacerse administradora.
// Antes de la migración 20261117000002 esto pasaba: el insert del perfil con
// rol = 'admin' devolvía 201 y la cuenta veía todas las cuentas. Si alguna vez
// esta prueba falla, el agujero volvió.
import { randomBytes } from 'node:crypto'
import { api, check, db, tokenDe } from './comun.mjs'

const email = `prueba-rol-${randomBytes(3).toString('hex')}@example.com`
const clave = randomBytes(12).toString('hex') + 'Aa1!'
const base0 = db('select (select count(*) from perfiles)::int perfiles, (select count(*) from auth.users)::int usuarios, (select count(*) from placas)::int placas')[0]
let id
try {
  id = (await api('POST', '/auth/v1/admin/users', { email, password: clave, email_confirm: true })).j.id
  const token = await tokenDe(email, clave)
  const representacion = { Prefer: 'return=representation' }

  let r = await api('POST', '/rest/v1/perfiles', { id, nombre: 'atacante', rol: 'admin' }, representacion, token)
  check('crear el perfil propio con rol admin → rechazado', r.s === 403 || r.s === 401, r.s)

  r = await api('POST', '/rest/v1/perfiles', { id, nombre: 'normal', telefono: '+5492974123456' }, representacion, token)
  check('crearlo sin rol (como Registro.jsx) → 201, queda usuario', r.s === 201 && r.j?.[0]?.rol === 'usuario', `${r.s} ${r.j?.[0]?.rol}`)

  r = await api('PATCH', `/rest/v1/perfiles?id=eq.${id}`, { nombre: 'editado', telefono: '+5492974654321' }, representacion, token)
  check('editar nombre y teléfono (como Perfil.jsx) → 200', r.s === 200 && r.j?.[0]?.nombre === 'editado', r.s)

  r = await api('PATCH', `/rest/v1/perfiles?id=eq.${id}`, { rol: 'admin' }, representacion, token)
  check('cambiarse el rol a admin → rechazado', r.s === 403 || r.s === 401, r.s)
  check('...y el rol sigue siendo usuario', db(`select rol from perfiles where id = '${id}'`)[0]?.rol === 'usuario')

  r = await api('POST', '/rest/v1/rpc/admin_listar_cuentas', {}, {}, token)
  check('admin_listar_cuentas como usuario común → no_autorizado', r.s >= 400 && /no_autorizado/.test(JSON.stringify(r.j)), r.s)
  r = await api('POST', '/rest/v1/rpc/generar_lote_placas', { p_cantidad: 1 }, {}, token)
  check('generar_lote_placas como usuario común → no_autorizado', r.s >= 400 && /no_autorizado/.test(JSON.stringify(r.j)), r.s)

  // Trigger de respaldo: aunque alguien vuelva a otorgar el privilegio de
  // columna por error, un usuario común no puede quedar como admin. Se prueba
  // simulando su sesión (el trigger deja el rol igual, así que el update no
  // cambia nada aunque se confirme).
  const respaldo = db(`begin; select set_config('request.jwt.claims', json_build_object('sub', '${id}')::text, true); update perfiles set rol = 'admin' where id = '${id}' returning rol as rol_despues;`)
  check('trigger de respaldo: el update queda en usuario', respaldo[0]?.rol_despues === 'usuario', JSON.stringify(respaldo))
} catch (e) {
  check('la prueba terminó sin excepciones', false, e.message)
} finally {
  if (id) {
    await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id })
    await api('DELETE', '/auth/v1/admin/users/' + id)
  }
  const fin = db('select (select count(*) from perfiles)::int perfiles, (select count(*) from auth.users)::int usuarios, (select count(*) from placas)::int placas')[0]
  check('la base quedó como estaba', JSON.stringify(fin) === JSON.stringify(base0), JSON.stringify(fin))
}
