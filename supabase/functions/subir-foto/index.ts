// IA02 del lado del servidor: la ÚNICA forma de guardar una foto en el bucket
// `fotos-mascotas` (el navegador ya no tiene permiso de subida directa). Pasos:
//   1. quien llama tiene que tener sesión;
//   2. si trae un `pase` válido para estos mismos bytes (lo emitió
//      `sugerir-ficha` al elegir la foto), no se vuelve a clasificar;
//   3. si no, se clasifica acá; "sin_animal" e "inapropiada" se rechazan y no
//      se guarda nada; un fallo técnico de la IA deja pasar la foto sin
//      verificar (la app sigue funcionando si la IA no responde);
//   4. se guarda en la carpeta de la cuenta con la clave de servicio.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { clasificarImagen } from '../_shared/clasificar.ts'
import { decodificarBase64, sha256Hex, verificarPase } from '../_shared/pase.ts'
import { MOTIVO_LIMITE, registrarUsoIa } from '../_shared/limite.ts'

const BUCKET = 'fotos-mascotas'
const TAMANO_MAXIMO = 6 * 1024 * 1024
const PREFIJOS: Record<string, string> = { mascota: '', reencuentro: 'reencuentro-' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function responder(cuerpo: Record<string, unknown>, status = 200) {
  return Response.json(cuerpo, { status, headers: CORS })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ ok: false, error: 'metodo_no_permitido' }, 405)

  // El cuerpo se lee antes de cualquier respuesta: contestar sin consumir la
  // foto que se está subiendo deja colgadas las peticiones siguientes en el
  // runtime de Supabase (ver sugerir-ficha).
  let cuerpo: any
  let cuerpoValido = true
  try {
    cuerpo = await req.json()
  } catch {
    cuerpoValido = false
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: sesion } = await comoUsuario.auth.getUser()
  const uid = sesion?.user?.id
  if (!uid) return responder({ ok: false, error: 'no_autorizado' }, 401)
  if (!cuerpoValido) return responder({ ok: false, error: 'cuerpo_invalido' }, 400)
  const { imagen_base64, media_type, tipo, pase } = cuerpo ?? {}
  if (typeof imagen_base64 !== 'string' || media_type !== 'image/jpeg' || !(tipo in PREFIJOS)) {
    return responder({ ok: false, error: 'parametros_invalidos' }, 400)
  }

  let bytes: Uint8Array
  try {
    bytes = decodificarBase64(imagen_base64)
  } catch {
    return responder({ ok: false, error: 'imagen_invalida' }, 400)
  }
  if (bytes.length === 0 || bytes.length > TAMANO_MAXIMO) return responder({ ok: false, error: 'imagen_invalida' }, 400)
  // Un JPEG empieza siempre con FF D8.
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return responder({ ok: false, error: 'imagen_invalida' }, 400)

  const hash = await sha256Hex(bytes)
  let categoria = await verificarPase(pase, uid, hash)
  let verificada = categoria !== null

  if (!categoria) {
    // Sin pase hay que llamar a la IA: cuenta para el límite por hora. Pasado
    // el límite no se guarda sin verificar (sería la forma de saltear IA02).
    if (!(await registrarUsoIa(uid, 'subir-foto'))) {
      return responder({ ok: false, error: 'demasiadas_solicitudes', motivo: MOTIVO_LIMITE }, 429)
    }
    const resultado = await clasificarImagen(imagen_base64, media_type)
    if (resultado.ok) {
      categoria = resultado.clasificacion.categoria
      verificada = true
      if (categoria === 'sin_animal' || categoria === 'inapropiada') {
        return responder({ ok: false, error: 'foto_rechazada', categoria, motivo: resultado.clasificacion.motivo }, 422)
      }
    } else {
      // La IA no respondió: se guarda igual, sin verificar.
      categoria = 'sin_verificar'
    }
  }

  const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const ruta = `${uid}/${PREFIJOS[tipo]}${Date.now()}-${hash.slice(0, 12)}.jpg`
  const { error: errorSubida } = await servicio.storage.from(BUCKET).upload(ruta, bytes, { contentType: 'image/jpeg' })
  if (errorSubida) return responder({ ok: false, error: 'no_se_pudo_guardar', detalle: errorSubida.message }, 500)

  const { data } = servicio.storage.from(BUCKET).getPublicUrl(ruta)
  return responder({ ok: true, ruta, url: data.publicUrl, categoria, verificada })
})
