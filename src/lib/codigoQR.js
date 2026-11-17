// Qué hacer con el texto leído de un QR. Solo se sigue un link de esta misma
// app (con el router) o, si la persona lo confirma, uno web de otro sitio.
// Cualquier otro esquema (javascript:, data:, file:, intent:...) se rechaza:
// navegar a lo que diga un QR sin mirarlo permitía ejecutar código dentro de
// la app o mandar a la persona a cualquier lado (revisión del 2026-11-17).
export function interpretarCodigo(texto, origenPropio) {
  let url
  try {
    url = new URL(texto)
  } catch {
    return { tipo: 'invalido' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { tipo: 'invalido' }
  if (url.origin === origenPropio) return { tipo: 'propio', ruta: url.pathname + url.search }
  return { tipo: 'externo', url: url.href }
}
