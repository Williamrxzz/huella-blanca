// Prueba de punta a punta del circuito de notificaciones (base → pg_net → Edge
// Function). Crea un dueño de prueba con mascota y placa, provoca cada hecho
// que debería avisar y verifica la fila en `notificaciones` y su envío.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { URL_, sleep, resultados, check, db, SERVICE, ANON, api, rpc } from './comun.mjs'

const TAG = 'prueba-noti-' + randomBytes(3).toString('hex')
const cols = "(select count(*) from perfiles) perfiles, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from escaneos) escaneos, (select count(*) from avistamientos) avistamientos, (select count(*) from auth.users) usuarios_auth, (select count(*) from notificaciones) notificaciones, (select count(*) from suscripciones_push) suscripciones"
const base0 = db('select ' + cols)[0]
console.log('línea base:', JSON.stringify(base0))

// Espera a que la Edge Function marque la notificación (pg_net es asíncrono).
async function esperarEnvio(id, ms = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const f = db(`select enviada_en, resultado from notificaciones where id = '${id}'`)[0]
    if (f?.enviada_en) return f
    await sleep(1500)
  }
  return db(`select enviada_en, resultado from notificaciones where id = '${id}'`)[0]
}
const ultimaNoti = (perfil) => db(`select id, tipo, titulo, cuerpo, url from notificaciones where perfil_id = '${perfil}' order by creado_en desc limit 1`)[0]
const cuantas = (perfil) => Number(db(`select count(*) from notificaciones where perfil_id = '${perfil}'`)[0].count)

const ids = []
try {
  // ---- estructura ----
  const objetos = db("select (select count(*) from information_schema.tables where table_name in ('suscripciones_push','notificaciones')) tablas, (select count(*) from pg_trigger where tgname in ('notificaciones_enviar','escaneos_notificar','avistamientos_notificar')) triggers, (select count(*) from cron.job where jobname='escalar-casos-sin-respuesta') cron, (select count(*) from vault.decrypted_secrets where name='notificar_secret') vault")[0]
  check('tablas, triggers, cron y secreto en Vault existen', objetos.tablas == 2 && objetos.triggers == 3 && objetos.cron == 1 && objetos.vault == 1, JSON.stringify(objetos))

  // ---- datos de prueba ----
  const clave = randomBytes(12).toString('hex') + 'Aa1!'
  const u = await api('POST', '/auth/v1/admin/users', { email: `${TAG}@example.com`, password: clave, email_confirm: true })
  if (u.s >= 300) throw new Error('crear usuario ' + JSON.stringify(u))
  const D = u.j.id; ids.push(D)
  await api('POST', '/rest/v1/perfiles', { id: D, nombre: 'PRUEBA NOTI', rol: 'usuario' })
  const m = await api('POST', '/rest/v1/mascotas', { dueno_id: D, nombre: 'Notis', especie: 'perro', domicilio_lat: -46.4380, domicilio_lng: -67.5280, radio_metros: 100, horas_confirmacion: 6 }, { Prefer: 'return=representation' })
  const M = m.j[0].id
  const codigo = 'PN' + randomBytes(3).toString('hex').toUpperCase()
  await api('POST', '/rest/v1/placas', { codigo, mascota_id: M, estado: 'activa' })

  // ---- 1. escaneo cerca de casa, sin caso: NO avisa ----
  let r = await rpc('registrar_escaneo', { p_codigo: codigo, p_lat: -46.4381, p_lng: -67.5281 })
  check('escaneo cerca de casa registra ok', r.s === 200 && r.j.ok === true && !r.j.lejos_de_casa, JSON.stringify(r.j))
  check('...y NO genera notificación', cuantas(D) === 0, cuantas(D))

  // ---- 2. escaneo lejos: posible pérdida → aviso ----
  r = await rpc('registrar_escaneo', { p_codigo: codigo, p_lat: -46.4600, p_lng: -67.5280 })
  check('escaneo lejos abre posible pérdida', r.s === 200 && r.j.lejos_de_casa === true && r.j.caso_id, JSON.stringify(r.j))
  let n = ultimaNoti(D)
  check('genera notificación tipo posible_perdida con distancia', n?.tipo === 'posible_perdida' && /km de tu casa/.test(n.cuerpo) && /Notis/.test(n.titulo), n && `${n.titulo} — ${n.cuerpo}`)
  let env = await esperarEnvio(n.id)
  check('la Edge Function la marcó como enviada (sin suscripción todavía)', env?.enviada_en && env.resultado?.sin_suscripcion === true, JSON.stringify(env?.resultado))
  const casoId = r.j.caso_id

  // ---- 3. segundo escaneo lejos con caso abierto → tipo escaneo ----
  r = await rpc('registrar_escaneo', { p_codigo: codigo, p_lat: -46.4700, p_lng: -67.5280 })
  n = ultimaNoti(D)
  check('escaneo con caso abierto avisa tipo escaneo', n?.tipo === 'escaneo' && /Escanearon la placa de Notis/.test(n.titulo) && /km de tu casa/.test(n.cuerpo), n && `${n.titulo} — ${n.cuerpo}`)

  // ---- 4. avistamiento sin sesión con GPS ----
  r = await rpc('registrar_avistamiento', { p_codigo: codigo, p_lat: -46.4500, p_lng: -67.5280, p_origen: 'gps', p_situacion: 'conmigo', p_mensaje: 'prueba', p_contacto: null })
  check('avistamiento sin sesión registra ok', r.s === 200 && r.j.ok === true, JSON.stringify(r.j))
  n = ultimaNoti(D)
  check('avisa tipo avistamiento con situación y distancia', n?.tipo === 'avistamiento' && /Alguien vio a Notis/.test(n.titulo) && /Está con la persona que avisó, a .* de tu casa\./.test(n.cuerpo) && !/Confirmá/.test(n.cuerpo), n && `${n.titulo} — ${n.cuerpo}`)
  check('...con url al mapa de la mascota', n?.url === `/mascotas/${M}/mapa`, n?.url)

  // ---- 5. avistamiento sin ubicación ----
  // Desde TRA11 (2026-11-17), sin coordenadas hace falta describir el lugar.
  r = await rpc('registrar_avistamiento', { p_codigo: codigo, p_lat: null, p_lng: null, p_origen: 'manual', p_situacion: 'la_vi_pasar', p_mensaje: 'Frente a la escuela', p_contacto: null })
  n = ultimaNoti(D)
  check('avistamiento sin ubicación avisa sin distancia', n?.tipo === 'avistamiento' && n.cuerpo === 'La vieron pasar.', n?.cuerpo)

  // ---- 6. suscripción falsa (claves válidas, endpoint inexistente) → se da de baja ----
  const { webcrypto } = await import('node:crypto')
  const par = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const p256dh = Buffer.from(await webcrypto.subtle.exportKey('raw', par.publicKey)).toString('base64url')
  const auth = randomBytes(16).toString('base64url')
  const endpoint = 'https://huella-blanca.vercel.app/api/push-inexistente-' + TAG
  const s = await api('POST', '/rest/v1/suscripciones_push', { perfil_id: D, endpoint, p256dh, auth, navegador: 'prueba' }, { Prefer: 'return=representation' })
  check('suscripción de prueba creada', s.s === 201, s.s)
  // Límite de frecuencia (2026-11-17): un escaneo a segundos del anterior se
  // omite; se simula que pasaron 11 minutos.
  db(`update notificaciones set creado_en = creado_en - interval '11 minutes' where mascota_id = '${M}'`)
  r = await rpc('registrar_escaneo', { p_codigo: codigo, p_lat: -46.4700, p_lng: -67.5280 })
  n = ultimaNoti(D)
  env = await esperarEnvio(n.id)
  check('la función intentó el push y dio de baja la suscripción muerta (404)', env?.resultado && env.resultado.sin_suscripcion === false && env.resultado.dadas_de_baja === 1, JSON.stringify(env?.resultado))
  check('...la suscripción ya no está en la tabla', Number(db(`select count(*) from suscripciones_push where perfil_id='${D}'`)[0].count) === 0)

  // ---- 7. paso automático a perdida ----
  const otrosElegibles = Number(db(`select count(*) from casos_perdida c join mascotas m on m.id = c.mascota_id where c.estado = 'posible_perdida' and c.id <> '${casoId}' and c.iniciado_en < now() - make_interval(hours => m.horas_confirmacion)`)[0].count)
  if (otrosElegibles > 0) {
    console.log(`OMITIDO el escalado: hay ${otrosElegibles} caso(s) reales que el cron también pasaría a perdida; no se tocan desde la prueba`)
  } else {
    db(`update casos_perdida set iniciado_en = now() - interval '7 hours' where id = '${casoId}'`)
    const esc = db('select public.escalar_casos_sin_respuesta() as n')[0]
    check('escalar_casos_sin_respuesta pasó 1 caso', Number(esc.n) === 1, esc.n)
    const caso = db(`select estado from casos_perdida where id='${casoId}'`)[0]
    check('el caso quedó en perdida', caso.estado === 'perdida')
    n = ultimaNoti(D)
    check('avisa tipo perdida_automatica con las horas', n?.tipo === 'perdida_automatica' && /Notis pasó a perdida/.test(n.titulo) && /6 h sin respuesta/.test(n.cuerpo), n && `${n.titulo} — ${n.cuerpo}`)
    check('correr de nuevo no vuelve a escalar', Number(db('select public.escalar_casos_sin_respuesta() as n')[0].n) === 0)
  }

  // ---- 8. seguridad ----
  let a = await api('GET', '/rest/v1/notificaciones?select=id', null, {}, ANON)
  check('anon no lee notificaciones', a.s === 200 && Array.isArray(a.j) && a.j.length === 0 || a.s === 401, a.s + ' ' + JSON.stringify(a.j).slice(0, 60))
  a = await api('GET', '/rest/v1/suscripciones_push?select=id', null, {}, ANON)
  check('anon no lee suscripciones', a.s === 200 && Array.isArray(a.j) && a.j.length === 0 || a.s === 401, a.s)
  a = await api('POST', '/rest/v1/rpc/escalar_casos_sin_respuesta', {}, {}, ANON)
  check('anon no puede ejecutar el escalado', a.s >= 400, a.s)
  a = await api('POST', '/rest/v1/rpc/encolar_notificacion', { p_perfil_id: D, p_mascota_id: M, p_tipo: 'escaneo', p_titulo: 'x', p_cuerpo: 'x', p_url: '/' }, {}, ANON)
  check('anon no puede encolar notificaciones', a.s >= 400, a.s)
  // sesión del dueño: ve las suyas
  const login = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${TAG}@example.com`, password: clave }) })
  const token = (await login.json()).access_token
  const propias = await fetch(URL_ + '/rest/v1/notificaciones?select=tipo', { headers: { apikey: ANON, Authorization: 'Bearer ' + token } })
  const lista = await propias.json()
  check('el dueño ve sus notificaciones (y solo las suyas)', Array.isArray(lista) && lista.length === cuantas(D) && lista.length >= 5, lista.length)
  const fn = await fetch(URL_ + '/functions/v1/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) })
  check('la Edge Function sin secreto responde 401', fn.status === 401, fn.status)
  const fn2 = await fetch(URL_ + '/functions/v1/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ id: n.id }) })
  check('...también con una sesión de usuario', fn2.status === 401, fn2.status)
} catch (e) {
  console.log('ERROR', e)
} finally {
  console.log('limpiando…')
  for (const id of ids) { await rpc('purgar_cuenta', { p_id: id }, SERVICE); await api('DELETE', '/auth/v1/admin/users/' + id) }
  db(`delete from placas where codigo like 'PN%' and mascota_id is null and creado_en > now() - interval '10 minutes'`)
  const f = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
}
