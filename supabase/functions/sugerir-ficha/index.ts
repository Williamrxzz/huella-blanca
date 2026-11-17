// IA01 + IA02, en una sola llamada: la misma foto, el mismo pedido.
// La IA sugiere, la persona confirma. Nada se guarda de forma automática
// acá — esta función solo devuelve una clasificación y una sugerencia; quien
// la llama decide qué hacer con ellas.
//
// Exige sesión y respeta el límite por hora de _shared/limite.ts.
//
// Desde el 2026-11-17 devuelve además un `pase` (ver _shared/pase.ts) cuando
// la foto no fue rechazada: `subir-foto` lo acepta
// para guardar esa misma imagen sin volver a clasificarla. La clasificación en
// sí está en _shared/clasificar.ts, compartida con `subir-foto`.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { clasificarImagen } from '../_shared/clasificar.ts'
import { decodificarBase64, firmarPase, sha256Hex } from '../_shared/pase.ts'
import { MOTIVO_LIMITE, registrarUsoIa } from '../_shared/limite.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function responder(cuerpo: Record<string, unknown>, status = 200) {
  return Response.json(cuerpo, { status, headers: CORS })
}

async function uidDeLaSesion(req: Request) {
  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization) return null
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data } = await cliente.auth.getUser()
  return data?.user?.id ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Sesión obligatoria ANTES de llamar a la API (revisión de seguridad del
    // 2026-11-17): antes clasificaba sin sesión, y la clave anon es pública,
    // así que cualquiera podía gastar la cuenta de Claude. Los dos usos reales
    // (alta/edición de mascota y foto de reencuentro) siempre tienen sesión; si
    // esto responde 401 o 429, la app sigue sin verificar, como ante cualquier
    // fallo de la IA.
    //
    // El cuerpo se lee ANTES de responder 401: si la función contesta sin
    // consumir la foto que el navegador está mandando, el runtime de Supabase
    // deja colgadas las siguientes peticiones (se vio en la prueba: 401, y
    // después 503 o sin respuesta). Leerlo no llama a la IA ni cuesta nada.
    const { imagen_base64, media_type } = await req.json()
    const uid = await uidDeLaSesion(req)
    if (!uid) return responder({ error: 'no_autorizado' }, 401)
    if (!imagen_base64 || !media_type) return responder({ error: 'faltan imagen_base64 o media_type' }, 400)

    if (!(await registrarUsoIa(uid, 'sugerir-ficha'))) {
      return responder({ error: 'demasiadas_solicitudes', motivo: MOTIVO_LIMITE }, 429)
    }

    const resultado = await clasificarImagen(imagen_base64, media_type)
    if (!resultado.ok) return responder({ error: resultado.error, detalle: resultado.detalle }, resultado.status)

    const { clasificacion } = resultado
    let pase: string | null = null
    if (clasificacion.categoria === 'apta' || clasificacion.categoria === 'incorrecta') {
      pase = await firmarPase(uid, await sha256Hex(decodificarBase64(imagen_base64)), clasificacion.categoria)
    }

    return responder({ ...clasificacion, pase })
  } catch (error) {
    return responder({ error: 'fallo_interno', detalle: String(error) }, 500)
  }
})
