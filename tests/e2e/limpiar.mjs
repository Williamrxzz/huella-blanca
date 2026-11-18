// Borra lo que haya quedado de pruebas cortadas a mitad de camino (por
// ejemplo, por un error de red): cuentas `prueba-…@example.com` con todo lo
// suyo (mascotas, casos, escaneos, avisos, fotos) y las placas de prueba.
// Solo toca datos que crean las pruebas: las cuentas se reconocen por el email
// las placas por el código (las reales son hexadecimales; las de prueba
// empiezan con T, TP o PP, que no lo son) y las fotos sueltas por su carpeta
// (`prueba-…/`, la que usa eliminar-cuenta.py).
//
//   PRUEBAS_EN_PRODUCCION=si node tests/e2e/limpiar.mjs
import { pathToFileURL } from 'node:url'
import { api, borrarCuenta, db } from './comun.mjs'

const EMAIL_PRUEBA = /^prueba-[a-z0-9-]+@example\.com$/

export async function limpiarRestos() {
  const borradas = []
  const { j } = await api('GET', '/auth/v1/admin/users?per_page=1000')
  for (const u of (j?.users || []).filter((x) => EMAIL_PRUEBA.test(x.email))) {
    await borrarCuenta(u.id)
    borradas.push(u.email)
  }
  const placas = db("delete from placas where mascota_id is null and codigo ~ '^(T[0-9A-F]{7}|TP[0-9A-F]{6}|PP[0-9A-F]{6})$' returning codigo")
  const fotos = db("select name from storage.objects where bucket_id = 'fotos-mascotas' and name like 'prueba-%/%'").map((f) => f.name)
  if (fotos.length) await api('DELETE', '/storage/v1/object/fotos-mascotas', { prefixes: fotos })
  return { cuentas: borradas, placas: placas.map((p) => p.codigo), fotos }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await limpiarRestos()
  console.log(`Cuentas de prueba borradas: ${r.cuentas.length}${r.cuentas.length ? ' (' + r.cuentas.join(', ') + ')' : ''}`)
  console.log(`Placas de prueba borradas: ${r.placas.length}`)
  console.log(`Fotos de prueba borradas: ${r.fotos.length}`)
}
