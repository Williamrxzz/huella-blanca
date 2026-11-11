import { useEffect, useRef, useState } from 'react'
import { ALargeSmall, X } from 'lucide-react'
import {
  aplicarPreferencias,
  borrarPreferencias,
  guardarPreferencias,
  leerPreferencias,
} from '../lib/accesibilidad'

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
  const botonRef = useRef(null)
  const panelRef = useRef(null)

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
    setPrefs(leerPreferencias())
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
        onClick={() => setAbierto((v) => !v)}
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
              checked={prefs.oscuro}
              onChange={(e) => cambiar({ oscuro: e.target.checked })}
            />
            <span>Modo oscuro</span>
          </label>
          {prefs.oscuro && prefs.contraste && (
            <p className="accesibilidad-nota">El alto contraste usa fondo blanco: apagalo para ver el modo oscuro.</p>
          )}
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

          <button className="accesibilidad-restablecer" type="button" onClick={restablecer}>
            Restablecer
          </button>
        </div>
      )}
    </div>
  )
}
