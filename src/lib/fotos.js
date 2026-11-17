// Fotos del bucket público `fotos-mascotas`.
//
// Desde el 2026-11-17 el navegador no sube directo a Storage: prepara la foto
// (JPEG reducido), la manda a `sugerir-ficha` para verificarla y recibe un
// "pase"; al guardar, manda esos mismos bytes y el pase a `subir-foto`, que es
// la única que escribe en el bucket. Si no hay pase (la verificación falló o
// no se hizo), `subir-foto` clasifica ella misma; solo rechaza cuando la IA
// contestó que no hay un animal o que la foto es inapropiada.
import { supabase } from './supabase'

export const BUCKET_FOTOS = 'fotos-mascotas'

const MARCA_PUBLICA = `/storage/v1/object/public/${BUCKET_FOTOS}/`

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1])
    lector.onerror = reject
    lector.readAsDataURL(archivo)
  })
}

// Reduce la foto y la convierte a JPEG. La API de Claude solo acepta JPEG, PNG,
// GIF y WebP (no HEIC, el formato de las fotos de iPhone) y rechaza imágenes
// muy pesadas; además viaja menos y responde más rápido. Esos mismos bytes son
// los que después se guardan.
export async function fotoAJpegBase64(archivo, ladoMaximo = 1280) {
  const imagen = await createImageBitmap(archivo)
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(1, Math.round(imagen.width * escala))
  lienzo.height = Math.max(1, Math.round(imagen.height * escala))
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  imagen.close?.()
  const jpeg = await new Promise((resolve, reject) => {
    lienzo.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('sin_jpeg'))), 'image/jpeg', 0.85)
  })
  return archivoABase64(jpeg)
}

// Verifica la foto con la IA. Devuelve la respuesta de `sugerir-ficha`
// ({ categoria, motivo, sugerencia, pase }) o null si hubo un fallo técnico
// (sin conexión, API caída, el modelo no clasificó): en ese caso se sigue sin
// verificar, nunca se traba a la persona.
export async function verificarFoto(base64) {
  try {
    const { data, error } = await supabase.functions.invoke('sugerir-ficha', {
      body: { imagen_base64: base64, media_type: 'image/jpeg' },
    })
    if (error || !data || data.error) return null
    return data
  } catch {
    return null
  }
}

// Guarda la foto a través de `subir-foto`. Devuelve { ruta, url }. Lanza un
// Error con `codigo` ('foto_rechazada', 'no_autorizado', ...) si no se guardó.
export async function subirFoto({ base64, pase, tipo }) {
  const { data, error } = await supabase.functions.invoke('subir-foto', {
    body: { imagen_base64: base64, media_type: 'image/jpeg', tipo, pase: pase || null },
  })
  let respuesta = data
  if (error) {
    try {
      respuesta = await error.context.json()
    } catch {
      respuesta = null
    }
  }
  if (!respuesta?.ok) {
    const e = new Error(respuesta?.motivo || respuesta?.error || error?.message || 'no_se_pudo_guardar')
    e.codigo = respuesta?.error || 'desconocido'
    e.categoria = respuesta?.categoria || null
    throw e
  }
  return { ruta: respuesta.ruta, url: respuesta.url }
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
