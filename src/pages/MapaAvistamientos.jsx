import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { iconoAviso, iconoCasa } from '../lib/leaflet-iconos'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import { borrarFoto, fotoAJpegBase64, subirFoto, verificarFoto } from '../lib/fotos'
import Encabezado from '../components/Encabezado'
import CompartirBusqueda from '../components/CompartirBusqueda'
import { MapPin, Megaphone } from 'lucide-react'
import Cargando from '../components/Cargando'
import EstadoVacio from '../components/EstadoVacio'
import SelectorFoto from '../components/SelectorFoto'

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

// PER08 / REC02: al cerrar el caso, el dueño elige a quién agradecer entre
// quienes avisaron con cuenta (antes se asignaba solo al último que avisó).
// "Está conmigo" va preseleccionado; siempre se puede elegir "Nadie de la
// lista". El mensaje y la foto son para esa persona (los ve en su historial),
// así que solo se piden si se eligió a alguien.
const NADIE = 'nadie'

function FormularioReencuentro({ mascota, casoId, onCancelar, onConfirmar, enviando }) {
  const [colaboradores, setColaboradores] = useState(null) // null = cargando
  const [errorColaboradores, setErrorColaboradores] = useState(false)
  const [elegido, setElegido] = useState(NADIE)
  const [mensaje, setMensaje] = useState('')
  // Foto preparada ({ base64, pase }) y estado de su verificación (IA02): la
  // misma regla que la foto de perfil de la mascota.
  const [foto, setFoto] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [avisoFoto, setAvisoFoto] = useState(null)
  const eleccionActual = useRef(0)

  useEffect(() => {
    let vigente = true
    supabase.rpc('colaboradores_del_caso', { p_caso_id: casoId }).then(({ data, error }) => {
      if (!vigente) return
      const lista = !error && Array.isArray(data) ? data : []
      setErrorColaboradores(Boolean(error))
      setColaboradores(lista)
      const conmigo = lista.find((c) => c.hubo_conmigo)
      if (conmigo) setElegido(conmigo.perfil_id)
    })
    return () => { vigente = false }
  }, [casoId])

  const rescatista = colaboradores?.find((c) => c.perfil_id === elegido) || null

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

        {colaboradores === null ? (
          <p className="ayuda">Buscando quién avisó…</p>
        ) : colaboradores.length > 0 ? (
          <fieldset className="opciones-rescatista">
            <legend>¿Quién te ayudó?</legend>
            {colaboradores.map((c) => (
              <label key={c.perfil_id}>
                <input
                  type="radio"
                  name="rescatista"
                  value={c.perfil_id}
                  checked={elegido === c.perfil_id}
                  onChange={() => setElegido(c.perfil_id)}
                />
                <span>
                  <strong>{c.nombre}</strong>
                  <small>
                    {c.hubo_conmigo
                      ? `Avisó que tenía a ${mascota.nombre}`
                      : c.avisos === 1 ? 'Dio 1 aviso' : `Dio ${c.avisos} avisos`}
                    {' · '}{formatearFecha(c.ultimo_aviso_en)}
                  </small>
                </span>
              </label>
            ))}
            <label>
              <input type="radio" name="rescatista" value={NADIE} checked={elegido === NADIE} onChange={() => setElegido(NADIE)} />
              <span><strong>Nadie de la lista</strong></span>
            </label>
          </fieldset>
        ) : (
          <p className="ayuda">
            {errorColaboradores
              ? 'No pudimos cargar quién avisó. Podés cerrar el caso igual.'
              : 'Nadie avisó con una cuenta, así que no hay a quién dejarle un agradecimiento en la app. Si alguien dejó su contacto en un aviso, podés escribirle.'}
          </p>
        )}

        {rescatista && (
          <>
            <p className="ayuda">
              Si querés, dejale a {rescatista.nombre} un mensaje o una foto del reencuentro (opcional): lo va a
              ver en su historial de colaboración.
            </p>
        <textarea
          className="entrada"
          placeholder="Un mensaje para quien ayudó (opcional)"
          aria-label="Mensaje de agradecimiento"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
        />

        <SelectorFoto
          etiqueta="Foto del reencuentro (opcional)"
          vistaPrevia={foto ? `data:image/jpeg;base64,${foto.base64}` : null}
          onChange={elegirFoto}
          alt="Foto del reencuentro"
        />

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
          </>
        )}

        <div className="acciones-tarjeta">
          <button className="boton terciario" type="button" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button
            className="boton"
            type="button"
            onClick={() => onConfirmar(rescatista
              ? { rescatistaId: rescatista.perfil_id, mensaje: mensaje.trim() || null, foto }
              : { rescatistaId: null, mensaje: null, foto: null })}
            disabled={enviando || analizando || colaboradores === null}
          >
            {enviando ? 'Guardando…' : analizando ? 'Verificando la foto…' : 'Cerrar el caso'}
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
  const [compartiendo, setCompartiendo] = useState(false)

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/login')
      return
    }

    const { data: datosMascota, error: errorMascota } = await supabase
      .from('mascotas')
      .select('*, placas(codigo, estado)')
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
      .select('id, estado, origen, ultima_lat, ultima_lng, iniciado_en')
      .eq('mascota_id', id)
      .in('estado', ['perdida', 'posible_perdida'])
      .maybeSingle()

    setMascota(datosMascota)
    setAvistamientos(datosAvistamientos || [])
    setCaso(casoAbierto || null)
    setCargando(false)
  }

  // Carga inicial desde Supabase: el estado se actualiza cuando responde la base,
  // no de forma sincrónica. `cargar` también la llaman las acciones de la pantalla.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate])

  async function volvioACasa({ rescatistaId, mensaje, foto }) {
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

    // La base verifica que el rescatista haya avisado en este caso.
    const { data: cierre, error: errorRpc } = await supabase.rpc('cerrar_caso', {
      p_caso_id: caso.id,
      p_rescatista_id: rescatistaId,
      p_mensaje: mensaje,
      p_foto_url: fotoUrl,
    })
    const errorCierreCaso = errorRpc || (cierre?.ok ? null : { message: cierre?.motivo || 'error' })

    // El caso no se cerró: la foto del reencuentro no tiene a qué pertenecer.
    if (errorCierreCaso && fotoNueva) await borrarFoto(fotoNueva.ruta)

    setCerrando(false)
    setMostrarFormularioVolvio(false)
    if (errorCierreCaso) setErrorCierre('No pudimos cerrar el caso: ' + errorCierreCaso.message)
    else cargar()
  }

  if (cargando) return <Cargando texto="Cargando los avisos…" />

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

      {caso?.estado === 'perdida' && (
        <button className="boton" type="button" onClick={() => setCompartiendo(true)}>
          <Megaphone size={18} aria-hidden="true" />
          Compartir la búsqueda
        </button>
      )}
      {caso && (
        <button
          className={caso.estado === 'perdida' ? 'boton secundario' : 'boton'}
          type="button"
          onClick={() => setMostrarFormularioVolvio(true)}
          disabled={cerrando}
        >
          {cerrando ? 'Cerrando…' : `${mascota.nombre} volvió a casa`}
        </button>
      )}

      {compartiendo && (
        <CompartirBusqueda mascota={mascota} caso={caso} onCerrar={() => setCompartiendo(false)} />
      )}

      {errorCierre && <p className="ayuda error" role="alert">{errorCierre}</p>}

      {mostrarFormularioVolvio && (
        <FormularioReencuentro
          mascota={mascota}
          casoId={caso.id}
          onCancelar={() => setMostrarFormularioVolvio(false)}
          onConfirmar={volvioACasa}
          enviando={cerrando}
        />
      )}

      {avistamientos.length === 0 && (
        <EstadoVacio icono={MapPin} titulo={`Todavía nadie avisó que vio a ${mascota.nombre}`}>
          {caso
            ? 'Cuando alguien escanee su placa y avise, el aviso aparece acá con el lugar y la hora, y te llega una notificación. Compartir la búsqueda hace que más gente la vea.'
            : 'Si alguna vez se pierde y alguien la ve, el aviso aparece acá con el lugar y la hora.'}
        </EstadoVacio>
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
