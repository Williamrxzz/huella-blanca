// Corre las pruebas de punta a punta, de a una, y resume.
//
//   PRUEBAS_EN_PRODUCCION=si npm run test:e2e              (todas)
//   PRUEBAS_EN_PRODUCCION=si npm run test:e2e -- telefono  (las que coincidan)
//
// Levanta lo que haga falta si no está corriendo: el servidor de desarrollo
// (http://localhost:5173) y, para la prueba de push, el build de producción
// (http://localhost:4173; el service worker solo existe en el build). Lo que
// levanta, lo apaga al terminar. Antes y después borra restos de pruebas
// cortadas (ver limpiar.mjs) y compara la base con la línea base.
import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { CWD, db, sleep } from './comun.mjs'
import { limpiarRestos } from './limpiar.mjs'

// Orden: primero las que solo usan la API (rápidas), después las de Chrome.
const PRUEBAS = [
  { archivo: 'seguridad-rol.mjs', que: 'Una cuenta común no puede hacerse administradora' },
  { archivo: 'limite-ia.mjs', que: 'sugerir-ficha con sesión y límite de uso de la IA' },
  { archivo: 'notificaciones.mjs', que: 'Notificaciones al dueño (PER04, PER03)' },
  { archivo: 'limite-push.mjs', que: 'Límite de frecuencia de los push' },
  { archivo: 'eliminar-cuenta.py', que: 'Eliminar cuentas desde /admin/cuentas' },
  { archivo: 'telefono.mjs', que: 'Teléfono en formato internacional (TRA05)', servidor: 'dev' },
  { archivo: 'ficha-avisos.mjs', que: 'Mensaje del dueño, aviso sin ubicación, reclamo (PER07, TRA11, TRA09)', servidor: 'dev' },
  { archivo: 'ejemplo-escalado.mjs', que: 'Ficha de ejemplo, escaneos del dueño, caso escalado', servidor: 'dev' },
  { archivo: 'fotos-ia.mjs', que: 'Verificación de fotos en el servidor (IA02)', servidor: 'dev' },
  { archivo: 'fotos-storage.mjs', que: 'Fotos: reemplazo y rollback en Storage', servidor: 'dev' },
  { archivo: 'estadisticas.mjs', que: 'Estadísticas de administración (DAT05)', servidor: 'dev' },
  { archivo: 'admin-cuentas.mjs', que: 'Pantalla de cuentas del administrador', servidor: 'dev' },
  { archivo: 'push.mjs', que: 'Web Push de punta a punta en Chrome', servidor: 'preview' },
]

const SERVIDORES = {
  dev: { url: 'http://localhost:5173/', iniciar: () => spawn('npx', ['vite', '--port', '5173', '--strictPort'], { cwd: CWD, stdio: 'ignore' }) },
  preview: {
    url: 'http://localhost:4173/',
    iniciar: () => {
      const b = spawnSync('npm', ['run', 'build'], { cwd: CWD, encoding: 'utf8' })
      if (b.status !== 0) throw new Error('No se pudo hacer el build: ' + b.stderr.slice(-500))
      return spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: CWD, stdio: 'ignore' })
    },
  },
}

async function responde(url) {
  try { return (await fetch(url)).ok } catch { return false }
}

const levantados = []
async function asegurarServidor(nombre) {
  const s = SERVIDORES[nombre]
  if (await responde(s.url)) return
  console.log(`(levantando ${s.url})`)
  levantados.push(s.iniciar())
  for (let i = 0; i < 60; i++) {
    if (await responde(s.url)) return
    await sleep(1000)
  }
  throw new Error(`${s.url} no respondió`)
}

const COLS = "(select count(*) from perfiles)::int perfiles, (select count(*) from auth.users)::int usuarios, (select count(*) from mascotas)::int mascotas, (select count(*) from placas)::int placas, (select count(*) from casos_perdida)::int casos, (select count(*) from avistamientos)::int avisos, (select count(*) from escaneos)::int escaneos, (select count(*) from notificaciones)::int notificaciones, (select count(*) from storage.objects where bucket_id = 'fotos-mascotas')::int fotos"

const filtros = process.argv.slice(2)
const elegidas = filtros.length ? PRUEBAS.filter((p) => filtros.some((f) => p.archivo.includes(f))) : PRUEBAS
if (!elegidas.length) {
  console.error('Ninguna prueba coincide con: ' + filtros.join(', '))
  process.exit(2)
}

const previos = await limpiarRestos()
if (previos.cuentas.length || previos.placas.length) {
  console.log(`Restos de pruebas anteriores borrados: ${previos.cuentas.length} cuentas, ${previos.placas.length} placas`)
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
    const r = spawnSync(cmd, args, { cwd: CWD, encoding: 'utf8', env: process.env, maxBuffer: 20 * 1024 * 1024 })
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
  if (restos.cuentas.length || restos.placas.length) {
    console.log(`\nRestos que dejaron las pruebas (ya borrados): ${restos.cuentas.length} cuentas, ${restos.placas.length} placas`)
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
const cambiosPropios = cambios.filter((c) => !c.startsWith('escaneos'))
if (cambios.length) console.log('La base cambió durante las pruebas: ' + cambios.join(', '))
else console.log('La base quedó igual que al empezar.')
process.exitCode = resumen.every((r) => r.ok) && cambiosPropios.length === 0 ? 0 : 1
