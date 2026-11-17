// Límite de clasificaciones con la IA por cuenta y por hora (tabla `uso_ia`).
// Lo comparten `sugerir-ficha` y `subir-foto`: el límite es uno solo, cuente
// por donde cuente. Un uso normal (cargar y corregir las fotos de un par de
// mascotas) queda muy lejos; solo frena a quien llama la función en bucle.
//
// Si la tabla no responde, deja pasar: un problema del contador nunca debe
// trabar a un dueño real.
import { createClient } from 'npm:@supabase/supabase-js@2'

export const LIMITE_POR_HORA = 30

export async function registrarUsoIa(uid: string, funcion: 'sugerir-ficha' | 'subir-foto') {
  const servicio = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await servicio
    .from('uso_ia')
    .select('id', { count: 'exact', head: true })
    .eq('perfil_id', uid)
    .gte('creado_en', haceUnaHora)
  if (error) return true
  if ((count ?? 0) >= LIMITE_POR_HORA) return false
  await servicio.from('uso_ia').insert({ perfil_id: uid, funcion })
  return true
}

export const MOTIVO_LIMITE = 'Subiste muchas fotos en poco tiempo. Esperá un rato y probá de nuevo.'
