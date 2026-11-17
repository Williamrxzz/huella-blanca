// Teléfono del dueño en formato internacional (E.164), que es lo que necesitan
// los botones de contacto de la ficha pública (TRA05): `tel:+549...` y
// `wa.me/549...`. Antes se guardaba el texto tal cual y `ficha_publica()` le
// pegaba un "+" adelante: "2974123456" terminaba en `tel:+2974123456`, un
// número inexistente (revisión del 2026-11-17).
//
// Se asume Argentina salvo que el número empiece con "+" u "00" y otro código
// de país. Los celulares argentinos en formato internacional son
// +54 9 <código de área sin 0><número sin 15>: 10 dígitos después del 549.
// Se agrega siempre el 9 (celular): el contacto es para llamar o escribir por
// WhatsApp al dueño, que en la práctica es un celular.

export const ERRORES_TELEFONO = {
  falta_area: 'Agregá el código de área, sin el 0 (por ejemplo, 297 para Caleta Olivia).',
  invalido: 'No parece un número de celular. Escribilo con el código de área, por ejemplo 297 412 3456.',
}

function celularArgentino(nacional) {
  let n = nacional
  if (n.length === 11 && n.startsWith('9')) n = n.slice(1) // "9" de celular ya escrito
  if (n.startsWith('0')) n = n.slice(1) // 0 del código de área
  if (n.length === 12) {
    // Tiene el 15 después del código de área (2, 3 o 4 dígitos). Si hay más
    // de una forma posible de sacarlo, no se adivina.
    const posiciones = [2, 3, 4].filter((a) => n.slice(a, a + 2) === '15')
    if (posiciones.length !== 1) return { ok: false, error: 'invalido' }
    const a = posiciones[0]
    n = n.slice(0, a) + n.slice(a + 2)
  }
  if (n.length < 10) return { ok: false, error: 'falta_area' }
  if (n.length !== 10 || !/^[1-3]/.test(n)) return { ok: false, error: 'invalido' }
  return { ok: true, valor: '+549' + n }
}

// Devuelve { ok: true, valor } (valor null si está vacío, porque el teléfono
// es opcional) o { ok: false, error } con una clave de ERRORES_TELEFONO.
export function normalizarTelefono(texto) {
  const crudo = String(texto ?? '').trim()
  if (!crudo) return { ok: true, valor: null }
  let digitos = crudo.replace(/\D/g, '')
  if (!digitos) return { ok: false, error: 'invalido' }
  const internacional = crudo.startsWith('+') || crudo.startsWith('00')
  if (crudo.startsWith('00')) digitos = digitos.slice(2)

  if (internacional) {
    if (digitos.startsWith('54')) return celularArgentino(digitos.slice(2))
    if (digitos.length >= 8 && digitos.length <= 15 && !digitos.startsWith('0')) return { ok: true, valor: '+' + digitos }
    return { ok: false, error: 'invalido' }
  }
  // "54 9 297..." escrito sin el "+"
  if (digitos.startsWith('54') && (digitos.length === 12 || digitos.length === 13)) {
    return celularArgentino(digitos.slice(2))
  }
  return celularArgentino(digitos)
}

// "+5492974123456" → "+54 9 2974123456"; otros países, tal cual.
export function telefonoLegible(e164) {
  if (!e164) return ''
  if (e164.startsWith('+549') && e164.length === 14) return `+54 9 ${e164.slice(4)}`
  return e164
}
