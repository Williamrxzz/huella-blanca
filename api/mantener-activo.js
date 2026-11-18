// Mantiene activo el proyecto de Supabase (desde el 2026-11-18).
//
// El plan gratuito de Supabase pausa el proyecto después de 7 días sin
// actividad, y una ficha que no carga en una demo (o con una mascota perdida)
// es el peor caso. Vercel llama a esta función una vez por día (cron gratuito,
// ver "crons" en vercel.json) y hace una lectura liviana: ficha_publica con un
// código que no existe. Toca la base, no escribe nada y no cuenta como escaneo.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const clave = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !clave) {
    res.status(500).json({ ok: false, error: 'faltan_variables' })
    return
  }
  try {
    const respuesta = await fetch(`${url}/rest/v1/rpc/ficha_publica`, {
      method: 'POST',
      headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_codigo: 'MANTENER-ACTIVO' }),
    })
    const cuerpo = await respuesta.json().catch(() => null)
    const ok = respuesta.ok && cuerpo?.encontrada === false
    res.status(ok ? 200 : 502).json({ ok, estado: respuesta.status })
  } catch (error) {
    res.status(502).json({ ok: false, error: String(error) })
  }
}
