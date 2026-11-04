// Etiquetas de vista previa (Open Graph) para el enlace de la ficha pública.
//
// Cuando alguien pega https://…/m/CODIGO en WhatsApp, Instagram, Facebook o
// Telegram, esas apps piden la página con un rastreador que NO ejecuta
// JavaScript, así que solo verían el HTML genérico de la app. Esta función arma
// el HTML mínimo con las etiquetas de ESA mascota.
//
// Privacidad: solo se usa lo que `ficha_publica()` devuelve y que ya es público
// en la ficha (nombre, especie, raza, color, foto y si hay un caso abierto).
// Nunca se incluyen señas, salud, teléfono, ubicación ni domicilio: así la
// vista previa respeta por construcción las reglas de visibilidad (DUE05).

const NOMBRE_DEL_SITIO = 'Huella Blanca'
const DESCRIPCION_GENERAL = 'Identificación y recuperación de mascotas perdidas.'

export function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function limpio(valor) {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : ''
}

// "Mestiza" → "mestiza", pero "Jack Russell" se queda igual (tiene otra mayúscula).
function enMinuscula(texto) {
  return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü\s]*$/.test(texto) ? texto.charAt(0).toLowerCase() + texto.slice(1) : texto
}

function recortar(texto, maximo) {
  return texto.length <= maximo ? texto : texto.slice(0, maximo - 1).trimEnd() + '…'
}

function tipoDeAnimal(ficha) {
  const hembra = ficha.sexo === 'hembra'
  if (ficha.especie === 'gato') return hembra ? 'Gata' : 'Gato'
  if (ficha.especie === 'perro') return hembra ? 'Perra' : 'Perro'
  return 'Mascota'
}

export function construirMeta({ ficha, origen, codigo }) {
  const url = `${origen}/m/${encodeURIComponent(codigo)}`
  const general = {
    titulo: NOMBRE_DEL_SITIO,
    descripcion: DESCRIPCION_GENERAL,
    imagen: `${origen}/pwa-512.png`,
    altImagen: NOMBRE_DEL_SITIO,
    tarjeta: 'summary',
    url,
  }

  // Código inexistente, placa sin activar o la consulta falló: vista previa
  // general, sin inventar nada.
  if (!ficha || ficha.encontrada !== true) return general

  const nombre = limpio(ficha.nombre)
  if (!nombre) return general

  const abierto = ficha.estado === 'perdida'
  const sospecha = ficha.estado === 'posible_perdida'
  const titulo = abierto ? `Se perdió ${nombre}` : sospecha ? `Posible pérdida: ${nombre}` : nombre

  const raza = limpio(ficha.raza)
  const color = limpio(ficha.color)
  const descripcionDelAnimal = [tipoDeAnimal(ficha) + (raza ? ' ' + enMinuscula(raza) : ''), color ? enMinuscula(color) : '']
    .filter(Boolean)
    .join(', ')
  const aviso = abierto || sospecha ? ` Si ves a ${nombre}, avisá desde acá, sin registrarte.` : ''

  const foto = typeof ficha.foto_url === 'string' && ficha.foto_url.startsWith('https://') ? ficha.foto_url : null

  return {
    titulo: recortar(titulo, 90),
    descripcion: recortar(descripcionDelAnimal + '.' + aviso, 200),
    imagen: foto || general.imagen,
    altImagen: foto ? `Foto de ${nombre}` : NOMBRE_DEL_SITIO,
    tarjeta: foto ? 'summary_large_image' : 'summary',
    url,
  }
}

export function htmlDeVistaPrevia(meta) {
  const e = escaparHtml
  return `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="UTF-8" />
    <title>${e(meta.titulo)} · ${NOMBRE_DEL_SITIO}</title>
    <meta name="robots" content="noindex" />
    <meta name="description" content="${e(meta.descripcion)}" />
    <link rel="canonical" href="${e(meta.url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${NOMBRE_DEL_SITIO}" />
    <meta property="og:locale" content="es_AR" />
    <meta property="og:title" content="${e(meta.titulo)}" />
    <meta property="og:description" content="${e(meta.descripcion)}" />
    <meta property="og:url" content="${e(meta.url)}" />
    <meta property="og:image" content="${e(meta.imagen)}" />
    <meta property="og:image:alt" content="${e(meta.altImagen)}" />
    <meta name="twitter:card" content="${e(meta.tarjeta)}" />
    <meta name="twitter:title" content="${e(meta.titulo)}" />
    <meta name="twitter:description" content="${e(meta.descripcion)}" />
    <meta name="twitter:image" content="${e(meta.imagen)}" />
  </head>
  <body>
    <h1>${e(meta.titulo)}</h1>
    <p>${e(meta.descripcion)}</p>
    <p><a href="${e(meta.url)}">Abrir la ficha</a></p>
  </body>
</html>
`
}
