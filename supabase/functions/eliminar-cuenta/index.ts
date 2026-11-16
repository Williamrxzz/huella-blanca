// Elimina una cuenta de forma definitiva, al instante. La llama el panel de
// administración (/admin/cuentas); nunca corre sola. Para la cuenta indicada,
// en este orden:
//   1. borra sus fotos de Storage (desde SQL no se pueden borrar),
//   2. borra sus datos de la base (purgar_cuenta),
//   3. borra el usuario de Auth (email y contraseña).
// Si un paso falla se corta ahí y se avisa; no queda nada a medias en silencio.
// Quien llama tiene que ser administrador: se verifica acá, con su sesión, y
// no solo en la pantalla.
import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET = 'fotos-mascotas'

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

  const url = Deno.env.get('SUPABASE_URL')!
  const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  // 1) Quién llama: su sesión tiene que ser válida y su perfil, de administrador.
  const authorization = req.headers.get('Authorization') ?? ''
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: sesion } = await comoUsuario.auth.getUser()
  const quien = sesion?.user
  if (!quien) return responder({ ok: false, error: 'no_autorizado' }, 401)

  const { data: perfilAdmin } = await servicio.from('perfiles').select('rol').eq('id', quien.id).maybeSingle()
  if (perfilAdmin?.rol !== 'admin') return responder({ ok: false, error: 'no_autorizado' }, 403)

  // 2) Qué cuenta: no la propia ni la de otro administrador.
  let id: string | undefined
  try {
    id = (await req.json())?.id
  } catch {
    // cuerpo vacío o inválido
  }
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return responder({ ok: false, error: 'cuenta_invalida' }, 400)
  if (id === quien.id) return responder({ ok: false, error: 'cuenta_propia' }, 400)

  const { data: objetivo } = await servicio.from('perfiles').select('rol').eq('id', id).maybeSingle()
  if (!objetivo) return responder({ ok: false, error: 'cuenta_no_encontrada' }, 404)
  if (objetivo.rol === 'admin') return responder({ ok: false, error: 'cuenta_admin' }, 400)

  // 3) Borrado: fotos, base y por último el usuario de Auth.
  const { data: rutas, error: errorRutas } = await servicio.rpc('rutas_fotos_cuenta', { p_id: id })
  if (errorRutas) return responder({ ok: false, error: 'fallo_rutas', detalle: errorRutas.message }, 500)

  if (rutas?.length) {
    const { error: errorFotos } = await servicio.storage.from(BUCKET).remove(rutas)
    if (errorFotos) return responder({ ok: false, error: 'fallo_fotos', detalle: errorFotos.message }, 500)
  }

  const { error: errorBase } = await servicio.rpc('purgar_cuenta', { p_id: id })
  if (errorBase) return responder({ ok: false, error: 'fallo_base', detalle: errorBase.message }, 500)

  const { error: errorAuth } = await servicio.auth.admin.deleteUser(id)
  if (errorAuth) return responder({ ok: false, error: 'fallo_auth', detalle: errorAuth.message }, 500)

  return responder({ ok: true })
})
