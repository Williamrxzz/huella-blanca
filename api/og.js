// Función de Vercel que devuelve la vista previa (Open Graph) de la ficha
// pública SOLO a los rastreadores de WhatsApp, Instagram, Facebook, Telegram,
// etc. El desvío se decide en vercel.json por el user-agent: las personas
// siguen recibiendo la aplicación de siempre.
//
// Solo LEE la ficha con `ficha_publica()` (una consulta pública). No llama a
// `registrar_escaneo()`: un rastreador no es alguien que escaneó la placa y no
// debe contar como escaneo ni abrir una sospecha de pérdida.
import { construirMeta, htmlDeVistaPrevia } from './_meta.js'

const CODIGO_VALIDO = /^[A-Za-z0-9]{4,32}$/

async function leerFicha(codigo) {
  const url = process.env.VITE_SUPABASE_URL
  const clave = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !clave || !CODIGO_VALIDO.test(codigo)) return null
  try {
    const respuesta = await fetch(`${url}/rest/v1/rpc/ficha_publica`, {
      method: 'POST',
      headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_codigo: codigo }),
      signal: AbortSignal.timeout(4000),
    })
    return respuesta.ok ? await respuesta.json() : null
  } catch {
    // Sin conexión o demora: se devuelve la vista previa general.
    return null
  }
}

export default async function handler(req, res) {
  const codigo = String(req.query?.codigo ?? '')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const origen = host ? `https://${host}` : 'https://huella-blanca.vercel.app'

  const ficha = await leerFicha(codigo)
  const html = htmlDeVistaPrevia(construirMeta({ ficha, origen, codigo }))

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Robots-Tag', 'noindex')
  // Un minuto de caché en el borde: alcanza para ráfagas de rastreadores sin
  // retrasar mucho un cambio de estado (por ejemplo, al marcarla como perdida).
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  res.status(200).send(html)
}
