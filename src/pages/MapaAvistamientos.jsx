import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'
import { supabase } from '../lib/supabase'

const ETIQUETA_SITUACION = {
  conmigo: 'Está con esta persona',
  la_vi_pasar: 'La vieron pasar',
}

function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MapaAvistamientos() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [mascota, setMascota] = useState(null)
  const [avistamientos, setAvistamientos] = useState([])
  const [caso, setCaso] = useState(null)
  const [cerrando, setCerrando] = useState(false)
  const [errorCierre, setErrorCierre] = useState(null)
  const [error, setError] = useState(null)

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/login')
      return
    }

    const { data: datosMascota, error: errorMascota } = await supabase
      .from('mascotas')
      .select('*')
      .eq('id', id)
      .single()

    if (errorMascota || !datosMascota) {
      setError('No pudimos encontrar esa mascota.')
      setCargando(false)
      return
    }

    const { data: datosAvistamientos } = await supabase
      .from('avistamientos')
      .select('*')
      .eq('mascota_id', id)
      .order('creado_en', { ascending: false })

    const { data: casoAbierto } = await supabase
      .from('casos_perdida')
      .select('id, estado')
      .eq('mascota_id', id)
      .in('estado', ['perdida', 'posible_perdida'])
      .maybeSingle()

    setMascota(datosMascota)
    setAvistamientos(datosAvistamientos || [])
    setCaso(casoAbierto || null)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [id, navigate])

  async function volvioACasa() {
    setCerrando(true)
    setErrorCierre(null)

    const { data: avistamientoConRescatista } = await supabase
      .from('avistamientos')
      .select('reportado_por')
      .eq('caso_id', caso.id)
      .not('reportado_por', 'is', null)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { error: errorCierreCaso } = await supabase
      .from('casos_perdida')
      .update({
        estado: 'cerrada',
        cerrado_en: new Date().toISOString(),
        rescatista_id: avistamientoConRescatista?.reportado_por ?? null,
      })
      .eq('id', caso.id)

    setCerrando(false)
    if (errorCierreCaso) setErrorCierre('No pudimos cerrar el caso: ' + errorCierreCaso.message)
    else cargar()
  }

  if (cargando) return <main className="pagina"><p>Cargando…</p></main>

  if (error) return (
    <main className="pagina">
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{error}</p>
      <Link className="boton secundario" to="/panel">Volver al panel</Link>
    </main>
  )

  const conUbicacion = avistamientos.filter((a) => a.lat != null && a.lng != null)
  const sinUbicacion = avistamientos.length - conUbicacion.length

  return (
    <main className="pagina">
      <h1>Avistamientos de {mascota.nombre}</h1>

      {caso && (
        <div className={`alerta ${caso.estado === 'perdida' ? 'confirmada' : 'posible'}`}>
          <span className="punto" aria-hidden="true" />
          <div>
            <strong>
              {caso.estado === 'perdida' ? 'Perdida — buscando' : 'Podría estar perdida'}
            </strong>
            <p>Cuando {mascota.nombre} vuelva a casa, cerrá el caso acá.</p>
          </div>
        </div>
      )}

      {caso && (
        <button className="boton" type="button" onClick={volvioACasa} disabled={cerrando}>
          {cerrando ? 'Cerrando…' : `${mascota.nombre} volvió a casa`}
        </button>
      )}

      {errorCierre && <p className="ayuda error">{errorCierre}</p>}

      {avistamientos.length === 0 && (
        <p className="ayuda">Todavía no reportaron haber visto a {mascota.nombre}.</p>
      )}

      {sinUbicacion > 0 && (
        <p className="ayuda">
          {sinUbicacion === 1
            ? 'Hay 1 aviso sin ubicación exacta (ver lista abajo).'
            : `Hay ${sinUbicacion} avisos sin ubicación exacta (ver lista abajo).`}
        </p>
      )}

      <p className="ayuda">
        El círculo marca el radio de aviso configurado ({mascota.radio_metros} m):
        fuera de esa zona, un escaneo dispara la detección automática de pérdida.
      </p>

      <MapContainer
        center={[mascota.domicilio_lat, mascota.domicilio_lng]}
        zoom={14}
        className="mapa-domicilio"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[mascota.domicilio_lat, mascota.domicilio_lng]}>
          <Popup>Domicilio de {mascota.nombre}</Popup>
        </Marker>
        <Circle
          center={[mascota.domicilio_lat, mascota.domicilio_lng]}
          radius={mascota.radio_metros}
          pathOptions={{ color: '#2e5c8a', weight: 1, fillOpacity: 0.08 }}
        >
          <Popup>Radio de aviso: {mascota.radio_metros} m</Popup>
        </Circle>

        {conUbicacion.map((a) => (
          <Marker key={a.id} position={[a.lat, a.lng]}>
            <Popup>
              <strong>{ETIQUETA_SITUACION[a.situacion] || a.situacion}</strong>
              <br />
              {formatearFecha(a.creado_en)}
              {a.mensaje && <><br />{a.mensaje}</>}
              {a.contacto && <><br />Contacto: {a.contacto}</>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {avistamientos.length > 0 && (
        <ul className="lista-avistamientos">
          {avistamientos.map((a) => (
            <li key={a.id}>
              <span className="nombre">{ETIQUETA_SITUACION[a.situacion] || a.situacion}</span>
              <span className="ayuda">{formatearFecha(a.creado_en)}</span>
              {a.mensaje && <span className="ayuda">{a.mensaje}</span>}
              {a.contacto && <span className="ayuda">Contacto: {a.contacto}</span>}
            </li>
          ))}
        </ul>
      )}

      <Link className="boton secundario" to="/panel">Volver al panel</Link>
    </main>
  )
}
