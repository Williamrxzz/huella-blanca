// Afiche de búsqueda (IA03): una imagen lista para compartir en WhatsApp,
// estados e Instagram cuando la mascota está perdida. Se dibuja en un canvas
// del navegador con los datos de la ficha, la foto y el QR de la placa; no
// depende de ningún servicio ni manda nada a ningún lado.
//
// Mismas reglas de privacidad que el texto y la ficha pública: sin teléfono,
// sin domicilio, sin el mensaje privado del dueño; las señas solo si son
// públicas (DUE05). Nunca bloquea: si la foto no carga, va un recuadro con la
// huella; si falta un dato, se omite.

const ANCHO = 1080
const ALTO = 1350 // 4:5, el formato que WhatsApp e Instagram muestran completo

const COLORES = {
  fondo: '#faf9f7',
  banda: '#b23b3b',
  texto: '#1f1f1f',
  textoSuave: '#5c5a55',
  marco: '#e8e6e2',
  azul: '#2e5c8a',
}

const FUENTE = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function cargarImagen(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const imagen = new Image()
    imagen.crossOrigin = 'anonymous' // la foto viene de Storage, que permite CORS
    imagen.onload = () => resolve(imagen)
    imagen.onerror = () => resolve(null)
    imagen.src = url
  })
}

// Parte un texto en líneas que entren en `anchoMaximo`, hasta `maximoLineas`
// (la última se corta con "…" si hace falta).
function partirLineas(ctx, texto, anchoMaximo, maximoLineas) {
  const palabras = String(texto).split(/\s+/).filter(Boolean)
  const lineas = []
  let actual = ''
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (ctx.measureText(prueba).width <= anchoMaximo || !actual) {
      actual = prueba
    } else {
      lineas.push(actual)
      actual = palabra
    }
  }
  if (actual) lineas.push(actual)
  if (lineas.length > maximoLineas) {
    const recorte = lineas.slice(0, maximoLineas)
    let ultima = recorte[maximoLineas - 1]
    while (ultima.length > 1 && ctx.measureText(ultima + '…').width > anchoMaximo) ultima = ultima.slice(0, -1)
    recorte[maximoLineas - 1] = ultima + '…'
    return recorte
  }
  return lineas
}

function rectanguloRedondeado(ctx, x, y, ancho, alto, radio) {
  ctx.beginPath()
  ctx.moveTo(x + radio, y)
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, radio)
  ctx.arcTo(x + ancho, y + alto, x, y + alto, radio)
  ctx.arcTo(x, y + alto, x, y, radio)
  ctx.arcTo(x, y, x + ancho, y, radio)
  ctx.closePath()
}

// Dibuja la foto recortada "cover", centrada: no sabemos dónde está el animal
// dentro de la foto, y el centro es lo que menos suele dejar afuera.
function dibujarFoto(ctx, imagen, x, y, ancho, alto) {
  const escala = Math.max(ancho / imagen.width, alto / imagen.height)
  const w = imagen.width * escala
  const h = imagen.height * escala
  ctx.drawImage(imagen, x + (ancho - w) / 2, y + (alto - h) / 2, w, h)
}

function descripcionCorta(mascota) {
  const hembra = mascota.sexo === 'hembra'
  let tipo
  if (mascota.especie === 'gato') tipo = hembra ? 'Gata' : 'Gato'
  else if (mascota.especie === 'perro') tipo = hembra ? 'Perra' : 'Perro'
  else tipo = 'Mascota'
  const tamano = { pequeno: hembra ? 'pequeña' : 'pequeño', mediano: hembra ? 'mediana' : 'mediano', grande: 'grande' }[mascota.tamano]
  const partes = [tipo]
  if (mascota.raza?.trim()) partes.push(mascota.raza.trim().toLowerCase())
  if (tamano) partes.push(tamano)
  if (mascota.color?.trim()) partes.push(mascota.color.trim().toLowerCase())
  return partes.join(' · ')
}

function fechaCorta(iso) {
  if (!iso) return null
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

// Devuelve un Blob PNG con el afiche. `qrCanvas` es el canvas del QR ya
// dibujado (qrcode.react); `logoUrl` es el ícono de la app.
export async function generarAfiche({ mascota, caso, codigo, origen, qrCanvas, logoUrl = '/pwa-512.png' }) {
  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO
  lienzo.height = ALTO
  const ctx = lienzo.getContext('2d')

  const [foto, logo] = await Promise.all([cargarImagen(mascota.foto_url), cargarImagen(logoUrl)])
  const nombre = (mascota.nombre || 'Mi mascota').trim()
  const hembra = mascota.sexo === 'hembra'

  // Fondo
  ctx.fillStyle = COLORES.fondo
  ctx.fillRect(0, 0, ANCHO, ALTO)

  // Banda superior
  ctx.fillStyle = COLORES.banda
  ctx.fillRect(0, 0, ANCHO, 190)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 108px ${FUENTE}`
  ctx.fillText(hembra ? 'SE PERDIÓ' : 'SE PERDIÓ', ANCHO / 2, 82)
  ctx.font = `500 40px ${FUENTE}`
  ctx.fillText(`Ayudanos a encontrar${hembra ? 'la' : 'lo'}`, ANCHO / 2, 150)

  // Foto
  const fotoX = 80
  const fotoY = 230
  const fotoAncho = ANCHO - 160
  const fotoAlto = 580
  ctx.save()
  rectanguloRedondeado(ctx, fotoX, fotoY, fotoAncho, fotoAlto, 28)
  ctx.clip()
  if (foto) {
    dibujarFoto(ctx, foto, fotoX, fotoY, fotoAncho, fotoAlto)
  } else {
    ctx.fillStyle = COLORES.marco
    ctx.fillRect(fotoX, fotoY, fotoAncho, fotoAlto)
    if (logo) {
      ctx.globalAlpha = 0.35
      ctx.drawImage(logo, ANCHO / 2 - 130, fotoY + fotoAlto / 2 - 170, 260, 260)
      ctx.globalAlpha = 1
    }
    ctx.fillStyle = COLORES.textoSuave
    ctx.font = `500 36px ${FUENTE}`
    ctx.fillText('Sin foto', ANCHO / 2, fotoY + fotoAlto / 2 + 150)
  }
  ctx.restore()

  // Nombre y descripción
  ctx.fillStyle = COLORES.texto
  ctx.textAlign = 'center'
  ctx.font = `800 92px ${FUENTE}`
  let y = 895
  ctx.fillText(nombre, ANCHO / 2, y)

  ctx.font = `500 40px ${FUENTE}`
  ctx.fillStyle = COLORES.textoSuave
  y += 66
  for (const linea of partirLineas(ctx, descripcionCorta(mascota), ANCHO - 160, 1)) {
    ctx.fillText(linea, ANCHO / 2, y)
  }

  const senas = mascota.visibilidad_senas === 'privado' ? '' : (mascota.senas || '').trim()
  if (senas) {
    ctx.font = `400 34px ${FUENTE}`
    y += 48
    for (const linea of partirLineas(ctx, `Señas: ${senas}`, ANCHO - 200, 2)) {
      ctx.fillText(linea, ANCHO / 2, y)
      y += 44
    }
  }

  // Pie: QR + cómo avisar
  const pieY = 1090
  ctx.fillStyle = '#fff'
  rectanguloRedondeado(ctx, 60, pieY - 20, ANCHO - 120, 230, 24)
  ctx.fill()
  ctx.strokeStyle = COLORES.marco
  ctx.lineWidth = 3
  ctx.stroke()

  const qrTamano = 170
  if (qrCanvas) ctx.drawImage(qrCanvas, 90, pieY, qrTamano, qrTamano)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLORES.texto
  ctx.font = `700 40px ${FUENTE}`
  const textoX = 90 + qrTamano + 36
  ctx.fillText(`¿${hembra ? 'La' : 'Lo'} viste? Escaneá el código`, textoX, pieY + 52)
  ctx.font = `400 32px ${FUENTE}`
  ctx.fillStyle = COLORES.textoSuave
  ctx.fillText('o entrá al enlace y avisá sin registrarte:', textoX, pieY + 100)
  ctx.font = `600 32px ${FUENTE}`
  ctx.fillStyle = COLORES.azul
  const enlace = codigo && origen ? `${origen.replace(/^https?:\/\//, '')}/m/${codigo}` : ''
  if (enlace) ctx.fillText(enlace, textoX, pieY + 148)
  const desde = fechaCorta(caso?.iniciado_en)
  if (desde) {
    ctx.font = `400 28px ${FUENTE}`
    ctx.fillStyle = COLORES.textoSuave
    ctx.fillText(`Perdid${hembra ? 'a' : 'o'} desde el ${desde}`, textoX, pieY + 188)
  }

  // Firma
  if (logo) ctx.drawImage(logo, ANCHO / 2 - 130, ALTO - 38, 28, 28)
  ctx.textAlign = 'left'
  ctx.font = `500 26px ${FUENTE}`
  ctx.fillStyle = COLORES.textoSuave
  ctx.fillText('Huella Blanca', ANCHO / 2 - 94, ALTO - 16)

  return new Promise((resolve, reject) => {
    lienzo.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('sin_png'))), 'image/png')
  })
}
