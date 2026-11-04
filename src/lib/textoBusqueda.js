// IA03: arma el texto para compartir (WhatsApp, redes) cuando una mascota está
// perdida, con los datos de su ficha y la última ubicación conocida.
//
// Es una plantilla, no una consulta a la IA: sale al instante, no depende de
// ningún servicio y no manda los datos de la mascota a ningún lado. Nunca
// bloquea: si falta un dato (raza, color, señas, ubicación, placa) simplemente
// se omite esa línea y el texto se arma igual con lo que haya.
//
// Privacidad (mismas reglas que la ficha pública):
// - No incluye el teléfono del dueño: quien la vea avisa desde la ficha.
// - No incluye el mensaje que el dueño dejó al reportar la pérdida (PER07).
// - Las señas se omiten si el dueño las marcó como "no se muestran" (DUE05).
// - La ubicación se redondea (≈110 m), igual que la zona aproximada de la ficha.
//
// Sin emojis a propósito: la página de WhatsApp a la que lleva wa.me los
// muestra como "�" (probado con 🐾, 🙏, ⚠️, 🔍 y 🐶 en escritorio y con agente de
// iPhone). El texto plano se ve igual en WhatsApp, SMS y redes.

function limpio(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function descripcionDelAnimal(mascota) {
  const hembra = mascota.sexo === 'hembra'
  const tamano = { pequeno: 'pequeño', mediano: 'mediano', grande: 'grande' }[mascota.tamano]
  let tipo
  if (mascota.especie === 'gato') tipo = hembra ? 'una gata' : 'un gato'
  else if (mascota.especie === 'perro') tipo = hembra ? 'una perra' : 'un perro'
  else tipo = 'una mascota'
  return tipo + (tamano ? ` de tamaño ${tamano}` : '')
}

export function armarTextoBusqueda({ mascota, caso, origen }) {
  const nombre = limpio(mascota?.nombre) || 'Mi mascota'
  const lineas = [`¡SE PERDIÓ ${nombre.toUpperCase()}!`, '', `${nombre} es ${descripcionDelAnimal(mascota || {})}.`]

  const raza = limpio(mascota?.raza)
  const color = limpio(mascota?.color)
  const senas = mascota?.visibilidad_senas === 'privado' ? '' : limpio(mascota?.senas)
  if (raza) lineas.push(`Raza: ${raza}`)
  if (color) lineas.push(`Color: ${color}`)
  if (senas) lineas.push(`Señas: ${senas}`)

  // El enlace de la ficha va PRIMERO: WhatsApp arma la vista previa (foto y
  // nombre) con el primer enlace del mensaje, y el de Maps taparía la tarjeta.
  const placa = mascota?.placas?.find((p) => p.estado === 'activa')
  if (placa?.codigo && origen) {
    lineas.push('', `Si ves a ${nombre}, avisá desde acá, sin registrarte: ${origen}/m/${placa.codigo}`)
  } else {
    lineas.push('', `Si ves a ${nombre}, por favor avisá al dueño.`)
  }

  const lat = caso?.ultima_lat
  const lng = caso?.ultima_lng
  if (typeof lat === 'number' && typeof lng === 'number') {
    lineas.push('', `Última ubicación conocida (zona aproximada): https://www.google.com/maps?q=${lat.toFixed(3)},${lng.toFixed(3)}`)
  }

  lineas.push('', '¡Compartilo, por favor!')
  return lineas.join('\n')
}

export function enlaceWhatsApp(texto) {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}
