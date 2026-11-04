// Preferencias de accesibilidad de quien usa la app. Se guardan solo en este
// dispositivo (localStorage): nadie tiene que registrarse para usarlas, y
// quien encuentra una mascota las puede activar igual que el dueño.
//
// Se aplican como atributos `data-*` en <html>; los estilos viven en index.css.

const CLAVE = 'accesibilidad'
export const TAMANOS_TEXTO = ['normal', 'grande', 'muy-grande']

const PREDETERMINADAS = {
  texto: 'normal',
  contraste: false,
  sinAnimaciones: false,
  subrayado: false,
}

function sistemaPide(consulta) {
  try {
    return window.matchMedia(consulta).matches
  } catch {
    return false
  }
}

// Lo que el celular ya tiene configurado vale como punto de partida; si la
// persona elige algo acá, eso pisa al sistema.
export function leerPreferencias() {
  let guardadas
  try {
    guardadas = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}
  } catch {
    guardadas = {}
  }
  return {
    texto: TAMANOS_TEXTO.includes(guardadas.texto) ? guardadas.texto : PREDETERMINADAS.texto,
    contraste:
      typeof guardadas.contraste === 'boolean' ? guardadas.contraste : sistemaPide('(prefers-contrast: more)'),
    sinAnimaciones:
      typeof guardadas.sinAnimaciones === 'boolean'
        ? guardadas.sinAnimaciones
        : sistemaPide('(prefers-reduced-motion: reduce)'),
    subrayado: typeof guardadas.subrayado === 'boolean' ? guardadas.subrayado : PREDETERMINADAS.subrayado,
  }
}

export function aplicarPreferencias(prefs) {
  const raiz = document.documentElement
  raiz.dataset.texto = prefs.texto
  raiz.dataset.contraste = prefs.contraste ? 'alto' : 'normal'
  raiz.dataset.animaciones = prefs.sinAnimaciones ? 'reducidas' : 'normales'
  raiz.dataset.subrayado = prefs.subrayado ? 'si' : 'no'
}

export function guardarPreferencias(prefs) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(prefs))
  } catch {
    // Sin almacenamiento (ventana privada): la preferencia vale solo mientras la pantalla esté abierta.
  }
}

export function borrarPreferencias() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
}

// Posición del botón flotante, como fracción (0 a 1) del espacio disponible en
// pantalla: así sigue en un lugar razonable si se gira el teléfono. Por
// defecto, abajo a la derecha.
const CLAVE_POSICION = 'accesibilidad-posicion'
export const POSICION_PREDETERMINADA = { x: 1, y: 1 }

export function leerPosicion() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_POSICION) || 'null')
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return { x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) }
    }
  } catch {
    // se usa la posición por defecto
  }
  return POSICION_PREDETERMINADA
}

export function guardarPosicion(posicion) {
  try {
    localStorage.setItem(CLAVE_POSICION, JSON.stringify(posicion))
  } catch {
    // sin almacenamiento: vale mientras la pantalla esté abierta
  }
}

export function borrarPosicion() {
  try {
    localStorage.removeItem(CLAVE_POSICION)
  } catch {
    // nada que borrar
  }
}
