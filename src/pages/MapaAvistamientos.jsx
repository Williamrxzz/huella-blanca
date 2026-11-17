import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { iconoAviso, iconoCasa } from '../lib/leaflet-iconos'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import { borrarFoto, fotoAJpegBase64, subirFoto, verificarFoto } from '../lib/fotos'
import Encabezado from '../components/Encabezado'

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

function FormularioReencuentro({ mascota, onCancelar, onConfirmar, enviando }) {
  const [mensaje, setMensaje] = useState('')
  // Foto preparada ({ base64, pase }) y estado de su verificación (IA02): la
  // misma regla que la foto de perfil de la mascota.
  const [foto, setFoto] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [avisoFoto, setAvisoFoto] = useState(null)
  const eleccionActual = useRef(0)

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0] || null
    if (!archivo) return
    const numero = ++eleccionActual.current
    setAvisoFoto(null)
    setFoto(null)
    setAnalizando(true)
    try {
      const base64 = await fotoAJpegBase64(archivo)
      if (numero !== eleccionActual.current) return
      setFoto({ base64, pase: null })
      const data = await verificarFoto(base64)
      if (numero !== eleccionActual.current) return
      if (!data) {
        setAvisoFoto({ tipo: 'sin_verificar' })
        return
      }
      if (data.categoria === 'sin_animal' || data.categoria === 'inapropiada') {
        setFoto(null)
        e.target.value = ''
        setAvisoFoto({ tipo: 'rechazada', categoria: data.categoria, motivo: data.motivo })
        return
      }
      setFoto({ base64, pase: data.pase || null })
      if (data.categoria === 'incorrecta') setAvisoFoto({ tipo: 'advertencia', motivo: data.motivo })
    } catch {
      if (numero === eleccionActual.current) setAvisoFoto({ tipo: 'sin_verificar' })
    } finally {
      if (numero === eleccionActual.current) setAnalizando(false)
    }
  }

  return (
    <div className="superposicion">
      <div className="tarjeta-confirmacion">
        <h2>{mascota.nombre} volvió a casa</h2>
        <p className="ayuda">
          Si querés, dejale un agradecimiento a quien ayudó (opcional): un mensaje, una foto del
          reencuentro, o las dos cosas.
        </p>

        <textarea
          className="entrada"
          placeholder="Un mensaje para quien ayudó (opcional)"
          aria-label="Mensaje de agradecimiento"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
        />

        <label className="campo-archivo">
          Foto del reencuentro (opcional)
          <input type="file" accept="image/*" onChange={elegirFoto} />
        </label>

        {analizando && <p className="ayuda">Analizando la foto…</p>}
        {avisoFoto?.tipo === 'rechazada' && (
          <p className="ayuda error" role="alert">
            {avisoFoto.categoria === 'sin_animal'
              ? 'Esta foto no parece ser de un animal. Elegí una foto del reencuentro con tu mascota, o seguí sin foto.'
              : `Esa foto no se puede usar (${avisoFoto.motivo || 'contenido no permitido'}). Elegí otra o seguí sin foto.`}
          </p>
        )}
        {avisoFoto?.tipo === 'advertencia' && (
          <p className="ayuda error" role="alert">
            {avisoFoto.motivo || 'La foto no se ve del todo clara.'} Podés seguir igual, o elegir otra.
          </p>
        )}
        {avisoFoto?.tipo === 'sin_verificar' && (
          <p className="ayuda">No pudimos verificar la foto en este momento. Podés seguir igual.</p>
        )}

        <div className="acciones-tarjeta">
          <button className="boton terciario" type="button" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button
            className="boton"
            type="button"
            onClick={() => onConfirmar({ mensaje: mensaje.trim() || null, foto })}
            disabled={enviando || analizando}
          >
            {enviando ? 'Guardando…' : analizando ? 'Verificando la foto…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Ajusta el mapa para que se vean a la vez el domicilio y todos los avisos con
// ubicación, en vez de quedar fijo sobre el domicilio con avisos fuera de la
// vista. Solo vuelve a ajustar cuando cambian los puntos, no en cada dibujo.
function AjustarVista({ puntos }) {
  const map = useMap()
  const clave = JSON.stringify(puntos)
  useEffect(() => {
    if (puntos.length < 2) return
    map.fitBounds(puntos, { padding: [40, 40], maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, clave])
  return null
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
  const [mostrarFormularioVolvio, setMostrarFormularioVolvio] = useState(false)

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

  async function volvioACasa({ mensaje, foto }) {
    setCerrando(true)
    setErrorCierre(null)

    let fotoUrl = null
    let fotoNueva = null
    if (foto) {
      try {
        fotoNueva = await subirFoto({ ...foto, tipo: 'reencuentro' })
      } catch (errorSubida) {
        setCerrando(false)
        setErrorCierre(errorSubida.codigo === 'foto_rechazada'
          ? 'Esa foto no se puede usar: elegí otra o cerrá el caso sin foto.'
          : 'No pudimos subir la foto: ' + errorSubida.message)
        return
      }
      fotoUrl = fotoNueva.url
    }

    const { data: avistamientoConColaborador } = await supabase
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
        rescatista_id: avistamientoConColaborador?.reportado_por ?? null,
        mensaje_agradecimiento: mensaje,
        foto_reencuentro_url: fotoUrl,
      })
      .eq('id', caso.id)

    // El caso no se cerró: la foto del reencuentro no tiene a qué pertenecer.
    if (errorCierreCaso && fotoNueva) await borrarFoto(fotoNueva.ruta)

    setCerrando(false)
    setMostrarFormularioVolvio(false)
    if (errorCierreCaso) setErrorCierre('No pudimos cerrar el caso: ' + errorCierreCaso.message)
    else cargar()
  }

  if (cargando) return <main className="pagina"><p>Cargando…</p></main>

  if (error) return (
    <main className="pagina">
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{error}</p>
    </main>
  )

  const conUbicacion = avistamientos.filter((a) => a.lat != null && a.lng != null)
  const sinUbicacion = avistamientos.length - conUbicacion.length
  // La consulta viene del más nuevo al más viejo; el número cuenta al revés
  // (1 = el primer aviso) para leer el recorrido en orden. El rojo es el aviso
  // más reciente que tiene ubicación, o sea el que se ve en el mapa.
  const numeroDeAviso = (a) => avistamientos.length - avistamientos.indexOf(a)
  const idMasReciente = conUbicacion[0]?.id

  return (
    <main className="pagina">
      <Encabezado volver="/panel" />
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
        <button className="boton" type="button" onClick={() => setMostrarFormularioVolvio(true)} disabled={cerrando}>
          {cerrando ? 'Cerrando…' : `${mascota.nombre} volvió a casa`}
        </button>
      )}

      {errorCierre && <p className="ayuda error" role="alert">{errorCierre}</p>}

      {mostrarFormularioVolvio && (
        <FormularioReencuentro
          mascota={mascota}
          onCancelar={() => setMostrarFormularioVolvio(false)}
          onConfirmar={volvioACasa}
          enviando={cerrando}
        />
      )}

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

        <AjustarVista
          puntos={[
            [mascota.domicilio_lat, mascota.domicilio_lng],
            ...conUbicacion.map((a) => [a.lat, a.lng]),
          ]}
        />

        <Marker position={[mascota.domicilio_lat, mascota.domicilio_lng]} icon={iconoCasa} title="Domicilio" alt="Domicilio">
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
          <Marker
            key={a.id}
            position={[a.lat, a.lng]}
            icon={iconoAviso(numeroDeAviso(a), a.id === idMasReciente)}
            title={`Aviso ${numeroDeAviso(a)}`}
          >
            <Popup>
              <strong>Aviso {numeroDeAviso(a)}{a.id === idMasReciente ? ' (el más reciente)' : ''}</strong>
              <br />
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
              <div className="fila-principal-avistamiento">
                <span className="situacion-avistamiento">
                  <span className={`numero-aviso${a.id === idMasReciente ? ' reciente' : ''}`}>{numeroDeAviso(a)}</span>
                  {ETIQUETA_SITUACION[a.situacion] || a.situacion}
                </span>
                <span className="hora-avistamiento">{formatearFecha(a.creado_en)}</span>
              </div>
              {(a.mensaje || a.contacto) && (
                <div className="detalle-avistamiento">
                  {a.mensaje && <span>{a.mensaje}</span>}
                  {a.contacto && <span>Contacto: {a.contacto}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

    </main>
  )
}
