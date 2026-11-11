// Borrado definitivo de las cuentas que llevan 30 días o más en la papelera.
// Lo dispara una vez por día pg_cron (ver supabase/purgar-cuentas-cron.sql),
// nunca el navegador. Para cada cuenta vencida, en este orden:
//   1. borra sus fotos de Storage (desde SQL no se pueden borrar),
//   2. borra sus datos de la base (purgar_cuenta),
//   3. borra el usuario de Auth (email y contraseña).
// Si un paso falla, se corta ahí y la cuenta se reintenta al día siguiente.
import { createClient } from 'npm:@supabase/supabase-js@2'

const DIAS_EN_PAPELERA = 30
const BUCKET = 'fotos-mascotas'

Deno.serve(async (req) => {
  // Solo quien conozca el secreto compartido con pg_cron puede ejecutarla.
  const secreto = Deno.env.get('CRON_SECRET')
  if (!secreto || req.headers.get('x-cron-secret') !== secreto) {
    return new Response('No autorizado', { status: 401 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const limite = new Date(Date.now() - DIAS_EN_PAPELERA * 24 * 60 * 60 * 1000).toISOString()
  const { data: vencidas, error } = await admin
    .from('perfiles')
    .select('id')
    .eq('activa', false)
    .lte('eliminada_en', limite)

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })

  const resultado: { borradas: string[]; fallidas: { id: string; paso: string; error: string }[] } = {
    borradas: [],
    fallidas: [],
  }

  for (const { id } of vencidas ?? []) {
    const { data: rutas, error: errorRutas } = await admin.rpc('rutas_fotos_cuenta', { p_id: id })
    if (errorRutas) {
      resultado.fallidas.push({ id, paso: 'rutas', error: errorRutas.message })
      continue
    }

    if (rutas?.length) {
      const { error: errorFotos } = await admin.storage.from(BUCKET).remove(rutas)
      if (errorFotos) {
        resultado.fallidas.push({ id, paso: 'fotos', error: errorFotos.message })
        continue
      }
    }

    const { error: errorBase } = await admin.rpc('purgar_cuenta', { p_id: id })
    if (errorBase) {
      resultado.fallidas.push({ id, paso: 'base', error: errorBase.message })
      continue
    }

    const { error: errorAuth } = await admin.auth.admin.deleteUser(id)
    if (errorAuth) {
      resultado.fallidas.push({ id, paso: 'auth', error: errorAuth.message })
      continue
    }

    resultado.borradas.push(id)
  }

  return Response.json({ ok: true, ...resultado })
})
