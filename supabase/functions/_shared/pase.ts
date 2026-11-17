// "Pase" de una foto ya verificada: liga el resultado de la verificación a los
// bytes exactos de la imagen (su SHA-256) y a la cuenta que la mandó, firmado
// con HMAC. Así `subir-foto` guarda sin volver a llamar a la IA solo si recibe
// la MISMA imagen que `sugerir-ficha` ya clasificó. Si cambian los bytes o la
// cuenta, el pase no sirve y se vuelve a clasificar.
//
// La clave de firma es la service_role key del proyecto, que ambas funciones
// reciben del entorno y nunca sale del servidor.

const VIGENCIA_MS = 2 * 60 * 60 * 1000 // dos horas para terminar el formulario

function aBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto: string) {
  const relleno = '='.repeat((4 - (texto.length % 4)) % 4)
  return Uint8Array.from(atob((texto + relleno).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
}

export function decodificarBase64(base64: string) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export async function sha256Hex(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function claveHmac() {
  const secreto = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function firmarPase(uid: string, hash: string, categoria: string) {
  const cuerpo = new TextEncoder().encode(JSON.stringify({ uid, hash, categoria, exp: Date.now() + VIGENCIA_MS }))
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', await claveHmac(), cuerpo))
  return `${aBase64Url(cuerpo)}.${aBase64Url(firma)}`
}

// Devuelve la categoría del pase si es válido para esa cuenta y esos bytes; si no, null.
export async function verificarPase(pase: unknown, uid: string, hash: string) {
  if (typeof pase !== 'string' || !pase.includes('.')) return null
  try {
    const [cuerpoB64, firmaB64] = pase.split('.')
    const cuerpo = deBase64Url(cuerpoB64)
    const valido = await crypto.subtle.verify('HMAC', await claveHmac(), deBase64Url(firmaB64), cuerpo)
    if (!valido) return null
    const datos = JSON.parse(new TextDecoder().decode(cuerpo))
    if (datos.uid !== uid || datos.hash !== hash || typeof datos.exp !== 'number' || datos.exp < Date.now()) return null
    return typeof datos.categoria === 'string' ? datos.categoria : null
  } catch {
    return null
  }
}
