// PER04: límite de frecuencia de los push y tope de avisos. Mascota temporal, nada toca a Blanca.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { sleep, resultados, check, db, api, rpc } from './comun.mjs'

const cols = "(select count(*) from perfiles) perfiles, (select count(*) from auth.users) usuarios, (select count(*) from mascotas) mascotas, (select count(*) from placas) placas, (select count(*) from casos_perdida) casos, (select count(*) from avistamientos) avistamientos, (select count(*) from notificaciones) notificaciones"
const base0 = db('select ' + cols)[0]
const blancaNotif0 = db(`select count(*)::int c from notificaciones n join mascotas m on m.id=n.mascota_id where m.nombre='Blanca'`)[0].c
const TAG = 'prueba-push-' + randomBytes(3).toString('hex'), clave = randomBytes(12).toString('hex') + 'Aa1!'
const CODIGO = 'T' + randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
let id
try {
  const u = await api('POST', '/auth/v1/admin/users', { email: `${TAG}@example.com`, password: clave, email_confirm: true }); id = u.j.id
  await api('POST', '/rest/v1/perfiles', { id, nombre: 'PRUEBA push' })
  const M = (await api('POST', '/rest/v1/mascotas', { dueno_id: id, nombre: 'Pushprueba', especie: 'perro', sexo: 'hembra', domicilio_lat: -46.4380, domicilio_lng: -67.5280, radio_metros: 100 }, { Prefer: 'return=representation' })).j[0].id
  await api('POST', '/rest/v1/placas', { codigo: CODIGO, mascota_id: M, estado: 'activa' })
  const casoId = (await api('POST', '/rest/v1/casos_perdida', { mascota_id: M, estado: 'perdida', origen: 'manual' }, { Prefer: 'return=representation' })).j[0].id
  const notifs = () => db(`select tipo, cuerpo, (resultado->>'omitida') omitida from notificaciones where mascota_id='${M}' order by creado_en, id`)
  const aviso = (sit = 'la_vi_pasar') => rpc('registrar_avistamiento', { p_codigo: CODIGO, p_lat: -46.439, p_lng: -67.529, p_origen: 'gps', p_situacion: sit, p_mensaje: null, p_contacto: null })

  // 1) tres escaneos seguidos con caso abierto: sale uno, se omiten dos
  for (let i = 0; i < 3; i++) await rpc('registrar_escaneo', { p_codigo: CODIGO, p_lat: -46.439, p_lng: -67.529 })
  let n = notifs()
  check('3 escaneos → 3 en el historial', n.length === 3 && n.every(x => x.tipo === 'escaneo'), n.length)
  check('...sale el primero, se omiten los otros dos', !n[0].omitida && n[1].omitida === 'limite_frecuencia' && n[2].omitida === 'limite_frecuencia', n.map(x => x.omitida || 'enviada').join(','))

  // 2) avisos: el primero resume los escaneos omitidos
  await aviso()
  n = notifs()
  check('el aviso siguiente sale y resume lo omitido', !n[3].omitida && n[3].cuerpo.endsWith('Además: 2 escaneos más. Mirá el mapa.'), n[3].cuerpo)
  // 3 avisos más → 5 enviadas en 10 min; el sexto y séptimo se omiten
  for (let i = 0; i < 5; i++) await aviso(i === 4 ? 'conmigo' : 'la_vi_pasar')
  n = notifs()
  const patron = n.map(x => (x.omitida ? 'o' : 'E')).join('')
  check('tope de 5 push en 10 minutos (el 5.º "la vi pasar" se omite)', patron.slice(0, 8) === 'EooEEEEo', patron)
  check('"Está conmigo" sale igual, pasado el tope de 10 minutos', !n[8].omitida && n[8].cuerpo.startsWith('Está con la persona que avisó'), n[8].cuerpo)
  check('...los avisos se guardaron todos igual', db(`select count(*)::int c from avistamientos where mascota_id='${M}'`)[0].c === 6)

  // 3) pasan 11 minutos (se corre todo para atrás): vuelve a salir, con el resumen
  db(`update notificaciones set creado_en = creado_en - interval '11 minutes' where mascota_id='${M}'`)
  await aviso()
  n = notifs()
  check('pasada la ventana sale, sin omitidas pendientes de resumir', !n.at(-1).omitida && !n.at(-1).cuerpo.includes('Además'), n.at(-1).cuerpo)

  // 4) tope por hora: 12 enviadas en una hora
  db(`update notificaciones set creado_en = creado_en - interval '11 minutes' where mascota_id='${M}'`)
  for (let i = 0; i < 5; i++) await aviso()
  db(`update notificaciones set creado_en = creado_en - interval '11 minutes' where mascota_id='${M}'`)
  for (let i = 0; i < 4; i++) await aviso()
  n = notifs()
  const enHora = db(`select count(*)::int c from notificaciones where mascota_id='${M}' and creado_en > now() - interval '1 hour' and resultado->>'omitida' is null`)[0].c
  check('tope de 12 push por hora', enHora === 12 && n.at(-1).omitida === 'limite_frecuencia', `${enHora} enviadas en la hora; última: ${n.at(-1).omitida}`)

  // 5) tope duro de avisos: 20 por hora
  const totalAv = db(`select count(*)::int c from avistamientos where mascota_id='${M}'`)[0].c
  for (let i = totalAv; i < 20; i++) await aviso()
  const r21 = await aviso()
  check('aviso 21 en una hora → demasiados_avisos', r21.j?.ok === false && r21.j?.motivo === 'demasiados_avisos', `${db(`select count(*)::int c from avistamientos where mascota_id='${M}'`)[0].c} avisos; ${JSON.stringify(r21.j)}`)

  // 6) "¿está perdida?" nunca se frena, aunque el tope esté lleno
  db(`update casos_perdida set estado='cerrada', cerrado_en=now() where id='${casoId}'`)
  await rpc('registrar_escaneo', { p_codigo: CODIGO, p_lat: -46.48, p_lng: -67.58 })
  n = notifs()
  check('posible pérdida sale con el tope lleno', n.at(-1).tipo === 'posible_perdida' && !n.at(-1).omitida, `${n.at(-1).tipo} ${n.at(-1).omitida || 'enviada'}`)

  // 7) la Edge Function procesó las enviadas y no las omitidas
  await sleep(6000)
  const proc = db(`select count(*) filter (where resultado->>'omitida' is null and enviada_en is not null)::int procesadas, count(*) filter (where resultado->>'omitida' is null and enviada_en is null)::int pendientes, count(*) filter (where resultado->>'omitida' is not null and enviada_en is not null)::int omitidas_enviadas from notificaciones where mascota_id='${M}'`)[0]
  check('las enviadas pasaron por la Edge Function; las omitidas no', proc.pendientes === 0 && proc.omitidas_enviadas === 0 && proc.procesadas > 0, JSON.stringify(proc))
} catch (e) { console.log('ERROR', e) } finally {
  if (id) { await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id }); await api('DELETE', '/auth/v1/admin/users/' + id) }
  db(`delete from placas where codigo='${CODIGO}'`)
  const f = db('select ' + cols)[0]
  check('la base quedó como estaba', JSON.stringify(f) === JSON.stringify(base0), JSON.stringify(f))
  check('Blanca sin notificaciones nuevas', db(`select count(*)::int c from notificaciones n join mascotas m on m.id=n.mascota_id where m.nombre='Blanca'`)[0].c === blancaNotif0)
  console.log(`RESULTADO: ${resultados.filter(Boolean).length}/${resultados.length}`)
}
