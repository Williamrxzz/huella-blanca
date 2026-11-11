import { useEffect, useRef, useState } from 'react'
import { ALargeSmall, X } from 'lucide-react'
import {
  aplicarPreferencias,
  borrarPosicion,
  borrarPreferencias,
  guardarPosicion,
  guardarPreferencias,
  leerPosicion,
  leerPreferencias,
  POSICION_PREDETERMINADA,
} from '../lib/accesibilidad'

const LADO = 48 // tamaño del botón
const MARGEN = 14
const UMBRAL_ARRASTRE = 6 // píxeles que hay que mover para que cuente como arrastre y no como toque

const ESQUINAS = [
  { nombre: 'Arriba izquierda', x: 0, y: 0 },
  { nombre: 'Arriba derecha', x: 1, y: 0 },
  { nombre: 'Abajo izquierda', x: 0, y: 1 },
  { nombre: 'Abajo derecha', x: 1, y: 1 },
]

function aPixeles(pos) {
  const ancho = Math.max(0, window.innerWidth - LADO - MARGEN * 2)
  const alto = Math.max(0, window.innerHeight - LADO - MARGEN * 2)
  return { left: MARGEN + pos.x * ancho, top: MARGEN + pos.y * alto }
}

function aFraccion(left, top) {
  const ancho = Math.max(1, window.innerWidth - LADO - MARGEN * 2)
  const alto = Math.max(1, window.innerHeight - LADO - MARGEN * 2)
  return {
    x: Math.min(1, Math.max(0, (left - MARGEN) / ancho)),
    y: Math.min(1, Math.max(0, (top - MARGEN) / alto)),
  }
}

const OPCIONES_TEXTO = [
  { valor: 'normal', etiqueta: 'Normal', muestra: 'A' },
  { valor: 'grande', etiqueta: 'Grande', muestra: 'A' },
  { valor: 'muy-grande', etiqueta: 'Muy grande', muestra: 'A' },
]

// Botón flotante con el panel de accesibilidad. Está en todas las pantallas
// (incluida la ficha pública, que es donde más se necesita).
export default function BotonAccesibilidad() {
  const [abierto, setAbierto] = useState(false)
  const [prefs, setPrefs] = useState(leerPreferencias)
  const [posicion, setPosicion] = useState(leerPosicion)
  const [, setTamanoVentana] = useState(0)
  const botonRef = useRef(null)
  const panelRef = useRef(null)
  const arrastre = useRef(null)
  const huboArrastre = useRef(false)

  // Si se gira el teléfono o cambia el tamaño de la ventana, se recalcula el lugar.
  useEffect(() => {
    const alCambiar = () => setTamanoVentana((n) => n + 1)
    window.addEventListener('resize', alCambiar)
    return () => window.removeEventListener('resize', alCambiar)
  }, [])

  useEffect(() => {
    aplicarPreferencias(prefs)
  }, [prefs])

  // Escape cierra y devuelve el foco al botón; tocar afuera también cierra.
  useEffect(() => {
    if (!abierto) return
    function alTeclear(e) {
      if (e.key === 'Escape') {
        setAbierto(false)
        botonRef.current?.focus()
      }
    }
    function alTocar(e) {
      if (!panelRef.current?.contains(e.target) && !botonRef.current?.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('pointerdown', alTocar)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('pointerdown', alTocar)
    }
  }, [abierto])

  function cambiar(cambio) {
    const nuevas = { ...prefs, ...cambio }
    setPrefs(nuevas)
    guardarPreferencias(nuevas)
  }

  function restablecer() {
    borrarPreferencias()
    borrarPosicion()
    setPrefs(leerPreferencias())
    setPosicion(POSICION_PREDETERMINADA)
  }

  function moverA(nueva) {
    setPosicion(nueva)
    guardarPosicion(nueva)
  }

  // Arrastrar con el dedo o el mouse. Un movimiento corto sigue siendo un toque.
  function alPresionar(e) {
    if (e.button !== undefined && e.button !== 0) return
    const { left, top } = aPixeles(posicion)
    arrastre.current = { x0: e.clientX, y0: e.clientY, left0: left, top0: top, moviendo: false }
    huboArrastre.current = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function alMover(e) {
    const a = arrastre.current
    if (!a) return
    const dx = e.clientX - a.x0
    const dy = e.clientY - a.y0
    if (!a.moviendo && Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return
    a.moviendo = true
    huboArrastre.current = true
    setPosicion(aFraccion(a.left0 + dx, a.top0 + dy))
  }

  function alSoltar() {
    const a = arrastre.current
    arrastre.current = null
    if (a?.moviendo) guardarPosicion(posicion)
  }

  function alTocar() {
    // Si recién se arrastró, soltar el dedo no debe abrir ni cerrar el panel.
    if (huboArrastre.current) {
      huboArrastre.current = false
      return
    }
    setAbierto((v) => !v)
  }

  const lugar = aPixeles(posicion)
  const abreHaciaArriba = posicion.y > 0.5
  const alineadoALaDerecha = posicion.x > 0.5
  // El panel se acomoda junto al botón pero siempre dentro de la pantalla.
  const anchoPanel = Math.min(300, window.innerWidth - MARGEN * 2)
  const izquierdaIdeal = alineadoALaDerecha ? lugar.left + LADO - anchoPanel : lugar.left
  const estiloPanel = {
    left: Math.min(Math.max(MARGEN, izquierdaIdeal), window.innerWidth - anchoPanel - MARGEN),
    ...(abreHaciaArriba
      ? { bottom: window.innerHeight - lugar.top + 8, maxHeight: Math.max(160, lugar.top - 8 - MARGEN) }
      : { top: lugar.top + LADO + 8, maxHeight: Math.max(160, window.innerHeight - lugar.top - LADO - 8 - MARGEN) }),
  }

  return (
    <div className="accesibilidad">
      <button
        ref={botonRef}
        className="accesibilidad-boton"
        type="button"
        aria-label="Accesibilidad"
        aria-expanded={abierto}
        aria-controls="panel-accesibilidad"
        style={{ left: lugar.left, top: lugar.top }}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClick={alTocar}
      >
        <ALargeSmall size={28} aria-hidden="true" />
      </button>

      {abierto && (
        <div
          id="panel-accesibilidad"
          ref={panelRef}
          className="accesibilidad-panel"
          role="dialog"
          aria-label="Opciones de accesibilidad"
          style={estiloPanel}
        >
          <div className="accesibilidad-cabecera">
            <strong>Accesibilidad</strong>
            <button
              className="accesibilidad-cerrar"
              type="button"
              aria-label="Cerrar"
              onClick={() => {
                setAbierto(false)
                botonRef.current?.focus()
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <fieldset className="accesibilidad-grupo">
            <legend>Tamaño del texto</legend>
            <div className="accesibilidad-tamanos">
              {OPCIONES_TEXTO.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  className={`accesibilidad-tamano tamano-${o.valor}`}
                  aria-pressed={prefs.texto === o.valor}
                  onClick={() => cambiar({ texto: o.valor })}
                >
                  <span aria-hidden="true">{o.muestra}</span>
                  <small>{o.etiqueta}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="accesibilidad-opcion">
            <input
              type="checkbox"
              role="switch"
              checked={prefs.contraste}
              onChange={(e) => cambiar({ contraste: e.target.checked })}
            />
            <span>Alto contraste</span>
          </label>
          <label className="accesibilidad-opcion">
            <input
              type="checkbox"
              role="switch"
              checked={prefs.sinAnimaciones}
              onChange={(e) => cambiar({ sinAnimaciones: e.target.checked })}
            />
            <span>Reducir animaciones</span>
          </label>
          <label className="accesibilidad-opcion">
            <input
              type="checkbox"
              role="switch"
              checked={prefs.subrayado}
              onChange={(e) => cambiar({ subrayado: e.target.checked })}
            />
            <span>Subrayar enlaces y botones</span>
          </label>

          <fieldset className="accesibilidad-grupo">
            <legend>Lugar del botón</legend>
            <p className="accesibilidad-nota">Podés arrastrarlo o elegir una esquina.</p>
            <div className="accesibilidad-esquinas">
              {ESQUINAS.map((e) => (
                <button
                  key={e.nombre}
                  type="button"
                  className="accesibilidad-esquina"
                  aria-pressed={Math.abs(posicion.x - e.x) < 0.02 && Math.abs(posicion.y - e.y) < 0.02}
                  onClick={() => moverA({ x: e.x, y: e.y })}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          </fieldset>

          <button className="accesibilidad-restablecer" type="button" onClick={restablecer}>
            Restablecer
          </button>
        </div>
      )}
    </div>
  )
}
