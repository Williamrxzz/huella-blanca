// Lo que comparten las pruebas de punta a punta (tests/e2e).
//
// Estas pruebas corren CONTRA LA BASE REAL de Supabase (no hay un proyecto de
// pruebas aparte): crean cuentas temporales `prueba-…@example.com`, hacen lo
// que tengan que hacer y las borran al terminar, comparando la base con una
// línea base. Por eso no arrancan si no se pide en forma explícita:
//
//   PRUEBAS_EN_PRODUCCION=si npm run test:e2e
//
// Las claves (anon y service_role) se piden al CLI de Supabase en cada
// ejecución (hace falta `npx supabase login` y el proyecto vinculado); nunca
// se escriben en el repositorio ni se imprimen.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.PRUEBAS_EN_PRODUCCION !== 'si') {
  console.error(
    'Estas pruebas escriben en la base de producción (con cuentas temporales que se borran).\n' +
    'Para correrlas: PRUEBAS_EN_PRODUCCION=si npm run test:e2e'
  )
  process.exit(2)
}

export const CWD = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const REF = 'pgnxanjiswmytdocdhuw'
export const URL_ = `https://${REF}.supabase.co`
export const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
// Carpeta temporal de esta ejecución: perfiles de Chrome, capturas, fotos.
export const DIR = mkdtempSync(join(tmpdir(), 'huella-e2e-'))
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- resultados ----
export const resultados = []
let vigilandoSalida = false
export function check(nombre, ok, detalle = '') {
  // En una prueba, el código de salida refleja el resultado: 1 si algo falló.
  // (Se activa con el primer check: el runner y limpiar.mjs no verifican nada.)
  if (!vigilandoSalida) {
    vigilandoSalida = true
    process.on('exit', () => {
      if (resultados.some((r) => !r)) process.exitCode = 1
    })
  }
  resultados.push(!!ok)
  const extra = detalle !== '' && detalle != null ? `  [${detalle}]` : ''
  console.log((ok ? 'PASS ' : 'FAIL ') + nombre + extra)
}

// ---- base y API ----
export function cli(args) {
  return spawnSync('npx', ['supabase', ...args], { cwd: CWD, encoding: 'utf8', timeout: 90_000 }).stdout
}

// Con un límite de tiempo: si la red se corta, el CLI puede quedar colgado
// indefinidamente; mejor fallar en 90 s y reintentar una vez.
export function db(sql, intento = 1) {
  const r = spawnSync('npx', ['supabase', 'db', 'query', '--linked', sql], { cwd: CWD, encoding: 'utf8', timeout: 90_000 })
  if (r.error?.code === 'ETIMEDOUT' || r.signal) {
    if (intento < 2) return db(sql, intento + 1)
    throw new Error('db: la consulta no respondió en 90 s (¿conexión?)')
  }
  const t = r.stdout + r.stderr
  const i = t.indexOf('{')
  if (i < 0) throw new Error('db: ' + t.slice(0, 300))
  const o = JSON.parse(t.slice(i, t.lastIndexOf('}') + 1))
  if (!o.rows) throw new Error('db: ' + JSON.stringify(o).slice(0, 300))
  return o.rows
}

const claves = JSON.parse(cli(['projects', 'api-keys', '--project-ref', REF, '-o', 'json']) || '[]')
export const SERVICE = claves.find((k) => k.name === 'service_role')?.api_key
export const ANON = claves.find((k) => k.name === 'anon')?.api_key
if (!SERVICE || !ANON) {
  console.error('No se pudieron obtener las claves del proyecto. ¿Hiciste `npx supabase login`?')
  process.exit(2)
}

// `clave` decide el rol (service_role por defecto, o el token de una sesión).
export async function api(metodo, ruta, cuerpo, extra = {}, clave = SERVICE) {
  const r = await fetch(URL_ + ruta, {
    method: metodo,
    headers: { apikey: ANON, Authorization: 'Bearer ' + clave, 'Content-Type': 'application/json', ...extra },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const t = await r.text()
  let j = null
  try { j = t ? JSON.parse(t) : null } catch { j = t }
  return { s: r.status, j }
}

export const rpc = (nombre, params, clave = ANON) => api('POST', '/rest/v1/rpc/' + nombre, params, {}, clave)

export async function tokenDe(email, clave) {
  const r = await fetch(URL_ + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: clave }),
  })
  return (await r.json()).access_token
}

// ---- foto de un perro real ----
// Las pruebas de IA02 necesitan la foto de un animal de verdad. No se guarda
// en el repositorio (es público): se baja la foto pública de una mascota
// (perro) ya cargada en la app, la misma que ve cualquiera en su ficha.
let fotoCache = null
export async function fotoDePerro() {
  if (fotoCache) return fotoCache
  const fila = db("select foto_url from mascotas where especie = 'perro' and activa and foto_url is not null order by creado_en limit 1")[0]
  if (!fila) throw new Error('No hay ninguna mascota (perro) con foto para usar en la prueba')
  const r = await fetch(fila.foto_url)
  if (!r.ok) throw new Error('No se pudo bajar la foto de prueba: HTTP ' + r.status)
  // El navegador y subir-foto trabajan con JPEG: si la foto no lo es, la
  // prueba que la usa lo va a notar.
  fotoCache = join(DIR, 'perro.jpg')
  writeFileSync(fotoCache, Buffer.from(await r.arrayBuffer()))
  return fotoCache
}

// Borra una cuenta de prueba con todo lo suyo. `purgar_cuenta` se niega a
// borrar administradores (protección de producción), así que a una cuenta de
// prueba admin primero se le baja el rol. Sin esto, la cuenta se borraba por
// la cascada de Auth y dejaba escaneos huérfanos (se vio el 2026-11-18).
export async function borrarCuenta(id) {
  if (!id) return
  await api('PATCH', `/rest/v1/perfiles?id=eq.${id}`, { rol: 'usuario' })
  const lista = (await api('POST', '/storage/v1/object/list/fotos-mascotas', { prefix: id, limit: 1000 })).j
  if (Array.isArray(lista) && lista.length) {
    await api('DELETE', '/storage/v1/object/fotos-mascotas', { prefixes: lista.map((o) => `${id}/${o.name}`) })
  }
  await api('POST', '/rest/v1/rpc/purgar_cuenta', { p_id: id })
  await api('DELETE', '/auth/v1/admin/users/' + id)
}
