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
  oscuro: false,
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
    oscuro:
      typeof guardadas.oscuro === 'boolean' ? guardadas.oscuro : sistemaPide('(prefers-color-scheme: dark)'),
  }
}

export function aplicarPreferencias(prefs) {
  const raiz = document.documentElement
  raiz.dataset.texto = prefs.texto
  raiz.dataset.contraste = prefs.contraste ? 'alto' : 'normal'
  raiz.dataset.animaciones = prefs.sinAnimaciones ? 'reducidas' : 'normales'
  raiz.dataset.subrayado = prefs.subrayado ? 'si' : 'no'
  // El alto contraste (negro sobre blanco) manda sobre el modo oscuro: no se combinan.
  raiz.dataset.tema = prefs.oscuro && !prefs.contraste ? 'oscuro' : 'claro'
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
