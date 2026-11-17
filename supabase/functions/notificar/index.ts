// Envía por Web Push una notificación de la tabla `notificaciones` a todos los
// dispositivos suscriptos del dueño. La llama la base (trigger con pg_net) al
// insertar la fila; nunca el navegador. Se autentica con un secreto compartido
// (`NOTIFICAR_SECRET`, el mismo guardado en Vault), no con la sesión de nadie.
//
// Las claves VAPID viven en el secreto `VAPID_CLAVES` (JSON con publicKey y
// privateKey en formato JWK). La clave pública es la misma que usa el
// navegador en src/lib/push.js.
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'

const CONTACTO = 'https://huella-blanca.vercel.app'
const UN_DIA = 24 * 60 * 60

type Suscripcion = { id: string; endpoint: string; p256dh: string; auth: string }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ ok: false, error: 'metodo_no_permitido' }, { status: 405 })

  const secreto = Deno.env.get('NOTIFICAR_SECRET')
  if (!secreto || req.headers.get('x-notificar-secret') !== secreto) {
    return Response.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
  }

  let id: string | undefined
  try {
    id = (await req.json())?.id
  } catch {
    // cuerpo inválido
  }
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, error: 'id_invalido' }, { status: 400 })

  const servicio = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: noti } = await servicio
    .from('notificaciones')
    .select('id, perfil_id, titulo, cuerpo, url, tipo, enviada_en')
    .eq('id', id)
    .maybeSingle()
  if (!noti) return Response.json({ ok: false, error: 'no_encontrada' }, { status: 404 })
  if (noti.enviada_en) return Response.json({ ok: true, repetida: true })

  const { data: suscripciones } = await servicio
    .from('suscripciones_push')
    .select('id, endpoint, p256dh, auth')
    .eq('perfil_id', noti.perfil_id)

  const resultado: Record<string, unknown> & { enviadas: number; fallidas: number; dadas_de_baja: number; errores: string[] } = {
    enviadas: 0, fallidas: 0, dadas_de_baja: 0, sin_suscripcion: !suscripciones?.length, errores: [],
  }

  if (suscripciones?.length) {
    let servidor: webpush.ApplicationServer
    try {
      const claves = await webpush.importVapidKeys(JSON.parse(Deno.env.get('VAPID_CLAVES') ?? ''), { extractable: false })
      servidor = await webpush.ApplicationServer.new({ contactInformation: CONTACTO, vapidKeys: claves })
    } catch (e) {
      return Response.json({ ok: false, error: 'vapid_invalido', detalle: String(e) }, { status: 500 })
    }

    const carga = JSON.stringify({ titulo: noti.titulo, cuerpo: noti.cuerpo, url: noti.url, tag: `${noti.tipo}-${noti.id}` })

    await Promise.all(
      (suscripciones as Suscripcion[]).map(async (s) => {
        try {
          await servidor
            .subscribe({ endpoint: s.endpoint, keys: { auth: s.auth, p256dh: s.p256dh } })
            .pushTextMessage(carga, { ttl: UN_DIA })
          resultado.enviadas++
          await servicio.from('suscripciones_push').update({ ultimo_envio_en: new Date().toISOString() }).eq('id', s.id)
        } catch (e) {
          // 404 o 410 del servicio de push: la suscripción ya no existe (el
          // navegador la canceló); se borra para no insistir.
          const status = e instanceof webpush.PushMessageError ? e.response.status : null
          if (status === 404 || status === 410) {
            resultado.dadas_de_baja++
            await servicio.from('suscripciones_push').delete().eq('id', s.id)
          } else {
            resultado.fallidas++
            // Se guarda el motivo (sin datos de la suscripción) para poder diagnosticar desde la base.
            resultado.errores.push(status ? `HTTP ${status}` : String(e).slice(0, 200))
          }
        }
      }),
    )
  }

  await servicio
    .from('notificaciones')
    .update({ enviada_en: new Date().toISOString(), resultado })
    .eq('id', noti.id)

  return Response.json({ ok: true, ...resultado })
})
