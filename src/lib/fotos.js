// Fotos en el bucket público `fotos-mascotas`: subir, borrar y pasar de la URL
// pública a la ruta interna. El borrado solo puede hacerlo el dueño de la
// carpeta (política de Storage `fotos_mascotas_borrado_propio_dueno`).
import { supabase } from './supabase'

export const BUCKET_FOTOS = 'fotos-mascotas'

const MARCA_PUBLICA = `/storage/v1/object/public/${BUCKET_FOTOS}/`

// Sube la foto y devuelve { ruta, url }. Lanza el error de Storage si falla.
export async function subirFoto(carpeta, prefijo, archivo) {
  const ruta = `${carpeta}/${prefijo}${Date.now()}-${archivo.name}`
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, archivo)
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta)
  return { ruta, url: data.publicUrl }
}

// Ruta interna a partir de la URL pública, o null si no es una foto nuestra.
export function rutaDesdeUrl(url) {
  if (typeof url !== 'string') return null
  const i = url.indexOf(MARCA_PUBLICA)
  if (i < 0) return null
  const ruta = url.slice(i + MARCA_PUBLICA.length).split('?')[0]
  try {
    return decodeURIComponent(ruta)
  } catch {
    return ruta
  }
}

// Borra una foto por su ruta o su URL pública. Nunca lanza: si no se puede
// borrar (por ejemplo, ya no existe) queda una foto huérfana, pero no se
// interrumpe lo que la persona estaba haciendo.
export async function borrarFoto(rutaOUrl) {
  const ruta = rutaOUrl?.includes(MARCA_PUBLICA) ? rutaDesdeUrl(rutaOUrl) : rutaOUrl
  if (!ruta) return false
  const { error } = await supabase.storage.from(BUCKET_FOTOS).remove([ruta])
  return !error
}
