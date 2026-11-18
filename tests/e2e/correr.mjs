// Corre las pruebas de punta a punta, de a una, y resume.
//
//   PRUEBAS_EN_PRODUCCION=si npm run test:e2e              (todas)
//   PRUEBAS_EN_PRODUCCION=si npm run test:e2e -- telefono  (las que coincidan)
//
// Las pruebas de pantalla corren contra el BUILD DE PRODUCCIÓN servido con
// `vite preview` (http://localhost:4173): el mismo código dividido, el mismo
// service worker y los mismos encabezados de seguridad que Vercel (vite.config.js
// los lee de vercel.json). El runner reconstruye siempre antes de empezar, para
// no probar una versión vieja, y levanta el servidor si no está corriendo (lo
// apaga al terminar). Con BASE=https://huella-blanca.vercel.app se prueba
// directamente producción. Antes y después borra restos de pruebas
// cortadas (ver limpiar.mjs) y compara la base con la línea base.
import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { CWD, db, sleep } from './comun.mjs'
import { limpiarRestos } from './limpiar.mjs'

// Orden: primero las que solo usan la API (rápidas), después las de Chrome.
const PRUEBAS = [
  { archivo: 'seguridad-rol.mjs', que: 'Una cuenta común no puede hacerse administradora' },
  { archivo: 'bajas-logicas.mjs', que: 'Bajas lógicas garantizadas por la base; funciones solo con cuenta' },
  { archivo: 'limite-ia.mjs', que: 'sugerir-ficha con sesión y límite de uso de la IA' },
  { archivo: 'notificaciones.mjs', que: 'Notificaciones al dueño (PER04, PER03)' },
  { archivo: 'limite-push.mjs', que: 'Límite de frecuencia de los push' },
  { archivo: 'eliminar-cuenta.py', que: 'Eliminar cuentas desde /admin/cuentas' },
  { archivo: 'reemplazo-paseo.mjs', que: 'Reemplazar código QR (DUE08) y modo paseo (DUE11)', servidor: 'preview' },
  { archivo: 'placas.mjs', que: 'Placas: QR automático, placas sin mascota no reconocidas (ADM01 retirada)', servidor: 'preview' },
  { archivo: 'recuperar-contrasena.mjs', que: 'Recuperar la contraseña por email', servidor: 'preview' },
  { archivo: 'telefono.mjs', que: 'Teléfono en formato internacional (TRA05)', servidor: 'preview' },
  { archivo: 'ficha-avisos.mjs', que: 'Mensaje del dueño, aviso sin ubicación, reclamo (PER07, TRA11, TRA09)', servidor: 'preview' },
  { archivo: 'ejemplo-escalado.mjs', que: 'Ficha de ejemplo, escaneos del dueño, caso escalado', servidor: 'preview' },
  { archivo: 'rescatista.mjs', que: 'Al cerrar el caso, el dueño elige a quién agradecer (PER08, REC02)', servidor: 'preview' },
  { archivo: 'fotos-ia.mjs', que: 'Verificación de fotos en el servidor (IA02)', servidor: 'preview' },
  { archivo: 'fotos-storage.mjs', que: 'Fotos: reemplazo y rollback en Storage', servidor: 'preview' },
  { archivo: 'estadisticas.mjs', que: 'Estadísticas de administración (DAT05)', servidor: 'preview' },
  { archivo: 'admin-cuentas.mjs', que: 'Pantalla de cuentas del administrador', servidor: 'preview' },
  { archivo: 'privacidad.mjs', que: 'Política de privacidad, consentimiento y eliminar la propia cuenta (Ley 25.326)', servidor: 'preview' },
  { archivo: 'encabezados.mjs', que: 'Encabezados de seguridad; la CSP no bloquea nada en ninguna pantalla', servidor: 'preview' },
  { archivo: 'push.mjs', que: 'Web Push de punta a punta en Chrome', servidor: 'preview' },
]

const SERVIDORES = {
  preview: {
    url: 'http://localhost:4173/',
    iniciar: () => spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: CWD, stdio: 'ignore' }),
  },
}
const BASE = process.env.BASE || SERVIDORES.preview.url.replace(/\/$/, '')
let construido = false

async function responde(url) {
  try { return (await fetch(url)).ok } catch { return false }
}

const levantados = []
async function asegurarServidor(nombre) {
  if (process.env.BASE) return // se prueba un sitio ya publicado
  const s = SERVIDORES[nombre]
  if (!construido) {
    console.log('(build de producción)')
    const b = spawnSync('npm', ['run', 'build'], { cwd: CWD, encoding: 'utf8' })
    if (b.status !== 0) throw new Error('No se pudo hacer el build: ' + b.stderr.slice(-500))
    construido = true
  }
  if (await responde(s.url)) return
  console.log(`(levantando ${s.url})`)
  levantados.push(s.iniciar())
  for (let i = 0; i < 60; i++) {
    if (await responde(s.url)) return
    await sleep(1000)
  }
  throw new Error(`${s.url} no respondió`)
}

const COLS = "(select count(*) from perfiles)::int perfiles, (select count(*) from auth.users)::int usuarios, (select count(*) from mascotas)::int mascotas, (select count(*) from placas)::int placas, (select count(*) from casos_perdida)::int casos, (select count(*) from avistamientos)::int avisos, (select count(*) from escaneos)::int escaneos, (select count(*) from notificaciones)::int notificaciones, (select count(*) from storage.objects where bucket_id = 'fotos-mascotas')::int fotos, (select count(*) from escaneos where mascota_id is null and placa_id is null)::int escaneos_huerfanos"

const filtros = process.argv.slice(2)
const elegidas = filtros.length ? PRUEBAS.filter((p) => filtros.some((f) => p.archivo.includes(f))) : PRUEBAS
if (!elegidas.length) {
  console.error('Ninguna prueba coincide con: ' + filtros.join(', '))
  process.exit(2)
}

const previos = await limpiarRestos()
if (previos.cuentas.length || previos.placas.length || previos.fotos.length) {
  console.log(`Restos de pruebas anteriores borrados: ${previos.cuentas.length} cuentas, ${previos.placas.length} placas, ${previos.fotos.length} fotos`)
}
const base0 = db('select ' + COLS)[0]

const resumen = []
try {
  for (const p of elegidas) {
    if (p.servidor) await asegurarServidor(p.servidor)
    console.log(`\n=== ${p.archivo} — ${p.que}`)
    const ruta = join(CWD, 'tests', 'e2e', p.archivo)
    const [cmd, args] = p.archivo.endsWith('.py') ? ['python3', [ruta]] : ['node', [ruta]]
    const t0 = Date.now()
    const r = spawnSync(cmd, args, { cwd: CWD, encoding: 'utf8', env: { ...process.env, BASE }, maxBuffer: 20 * 1024 * 1024 })
    const salida = (r.stdout || '') + (r.stderr || '')
    const pasaron = (salida.match(/^PASS /gm) || []).length
    const fallaron = salida.match(/^FAIL .*$/gm) || []
    for (const f of fallaron) console.log('  ' + f.slice(0, 300))
    if (r.status !== 0 && !fallaron.length) console.log('  ' + salida.trim().split('\n').slice(-5).join('\n  '))
    const ok = r.status === 0
    console.log(`  ${ok ? 'OK' : 'FALLÓ'}: ${pasaron} de ${pasaron + fallaron.length} (${Math.round((Date.now() - t0) / 1000)} s)`)
    resumen.push({ archivo: p.archivo, ok, pasaron, total: pasaron + fallaron.length })
  }
} finally {
  for (const proceso of levantados) proceso.kill()
  const restos = await limpiarRestos()
  if (restos.cuentas.length || restos.placas.length || restos.fotos.length) {
    console.log(`\nRestos que dejaron las pruebas (ya borrados): ${restos.cuentas.length} cuentas, ${restos.placas.length} placas, ${restos.fotos.length} fotos`)
  }
}

const base1 = db('select ' + COLS)[0]
const cambios = Object.keys(base0).filter((k) => base0[k] !== base1[k]).map((k) => `${k} ${base0[k]} → ${base1[k]}`)

console.log('\n=== Resumen')
for (const r of resumen) console.log(`${r.ok ? 'OK   ' : 'FALLÓ'} ${r.archivo.padEnd(22)} ${r.pasaron}/${r.total}`)
const total = resumen.reduce((a, r) => a + r.total, 0)
const pasaron = resumen.reduce((a, r) => a + r.pasaron, 0)
console.log(`\n${pasaron} de ${total} verificaciones; ${resumen.filter((r) => r.ok).length} de ${resumen.length} pruebas en verde.`)
// Los escaneos los puede sumar gente real mientras corren las pruebas: se
// informa, pero no se toma como falla.
// (Los escaneos sin mascota ni placa solo pueden quedar de una prueba mal limpiada: esos sí cuentan.)
const cambiosPropios = cambios.filter((c) => !c.startsWith('escaneos ') )
if (cambios.length) console.log('La base cambió durante las pruebas: ' + cambios.join(', '))
else console.log('La base quedó igual que al empezar.')
process.exitCode = resumen.every((r) => r.ok) && cambiosPropios.length === 0 ? 0 : 1
