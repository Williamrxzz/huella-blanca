// IA01 + IA02, en una sola llamada: la misma foto, el mismo pedido.
// La IA sugiere, la persona confirma. Nada se guarda de forma automática
// acá — esta función solo devuelve una clasificación y una sugerencia; quien
// la llama decide qué hacer con ellas.
//
// Desde el 2026-11-17 devuelve además un `pase` (ver _shared/pase.ts) cuando
// la foto no fue rechazada y quien llama tiene sesión: `subir-foto` lo acepta
// para guardar esa misma imagen sin volver a clasificarla. La clasificación en
// sí está en _shared/clasificar.ts, compartida con `subir-foto`.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { clasificarImagen } from '../_shared/clasificar.ts'
import { decodificarBase64, firmarPase, sha256Hex } from '../_shared/pase.ts'

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
    const { imagen_base64, media_type } = await req.json()
    if (!imagen_base64 || !media_type) return responder({ error: 'faltan imagen_base64 o media_type' }, 400)

    const resultado = await clasificarImagen(imagen_base64, media_type)
    if (!resultado.ok) return responder({ error: resultado.error, detalle: resultado.detalle }, resultado.status)

    const { clasificacion } = resultado
    let pase: string | null = null
    if (clasificacion.categoria === 'apta' || clasificacion.categoria === 'incorrecta') {
      const uid = await uidDeLaSesion(req)
      if (uid) pase = await firmarPase(uid, await sha256Hex(decodificarBase64(imagen_base64)), clasificacion.categoria)
    }

    return responder({ ...clasificacion, pase })
  } catch (error) {
    return responder({ error: 'fallo_interno', detalle: String(error) }, 500)
  }
})
