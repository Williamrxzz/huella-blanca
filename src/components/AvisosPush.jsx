// Tarjeta del panel para activar o desactivar los avisos push en este
// dispositivo (PER04). No bloquea nada: el panel funciona igual sin activarlos.
import { useEffect, useState } from 'react'
import { activarPush, desactivarPush, esIosSinInstalar, estadoPush } from '../lib/push'

const MENSAJES_ERROR = {
  denegado: 'El navegador tiene bloqueadas las notificaciones para este sitio. Habilitalas desde la configuración del sitio y probá de nuevo.',
  sin_service_worker: 'Este navegador todavía no terminó de instalar la app. Recargá la página y probá de nuevo.',
  no_soportado: 'Este navegador no permite notificaciones.',
}

export default function AvisosPush({ perfilId }) {
  const [estado, setEstado] = useState('cargando')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    estadoPush().then((e) => { if (vigente) setEstado(e) })
    return () => { vigente = false }
  }, [])

  // En iPhone/iPad sin la app instalada el navegador no tiene PushManager: se
  // explica cómo instalarla en vez de no mostrar nada.
  if (esIosSinInstalar()) {
    return (
      <div className="avisos-push">
        <p>
          Para recibir avisos cuando escaneen la placa, agregá Huella Blanca a la pantalla de inicio
          (Compartir → «Agregar a inicio») y activalos desde ahí.
        </p>
      </div>
    )
  }

  if (estado === 'cargando' || estado === 'no_soportado') return null

  async function alternar() {
    setOcupado(true)
    setError(null)
    try {
      if (estado === 'activo') {
        await desactivarPush()
        setEstado('inactivo')
      } else {
        await activarPush(perfilId)
        setEstado('activo')
      }
    } catch (e) {
      const codigo = e?.message
      setError(MENSAJES_ERROR[codigo] || 'No pudimos activar los avisos. Probá de nuevo.')
      if (codigo === 'denegado') setEstado('denegado')
    } finally {
      setOcupado(false)
    }
  }

  const activo = estado === 'activo'

  return (
    <div className={`avisos-push${activo ? ' activo' : ''}`}>
      <p>
        {activo
          ? 'Este dispositivo recibe avisos cuando escanean la placa o alguien ve a tu mascota.'
          : 'Recibí un aviso en este dispositivo cuando escaneen la placa o alguien vea a tu mascota, aunque no tengas la app abierta.'}
      </p>
      <div className="acciones-aviso">
        <button className="boton-accion" type="button" onClick={alternar} disabled={ocupado || estado === 'denegado'}>
          {ocupado ? 'Un momento…' : activo ? 'Desactivar avisos' : 'Activar avisos'}
        </button>
      </div>
      {(error || estado === 'denegado') && (
        <p className="ayuda error" role="alert">{error || MENSAJES_ERROR.denegado}</p>
      )}
    </div>
  )
}
