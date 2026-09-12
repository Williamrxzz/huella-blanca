import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const ERRORES_VINCULAR = {
  placa_no_encontrada: 'No existe una placa con ese código',
  placa_ya_asignada: 'Esa placa ya está asignada a otra mascota',
  mascota_no_encontrada: 'No pudimos identificar la mascota',
}

function SelectorMapa({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function FormularioPerdida({ mascota, onCancelar, onConfirmar, enviando }) {
  const [ubicacion, setUbicacion] = useState(null)
  const [mensaje, setMensaje] = useState('')

  function confirmar() {
    onConfirmar({ ubicacion, mensaje: mensaje.trim() || null })
  }

  return (
    <div className="superposicion">
      <div className="tarjeta-confirmacion">
        <h2>Reportar a {mascota.nombre} como perdida</h2>
        <p className="ayuda">
          Opcional: marcá dónde la viste por última vez y dejá un mensaje para quien la encuentre.
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
          <SelectorMapa onSeleccionar={setUbicacion} />
          {ubicacion && <Marker position={[ubicacion.lat, ubicacion.lng]} />}
        </MapContainer>
        <p className="ayuda">
          {ubicacion
            ? `Última ubicación marcada (${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}).`
            : 'Tocá el mapa para marcar dónde la viste por última vez (opcional).'}
        </p>

        <textarea
          className="entrada"
          placeholder="Mensaje para quien la encuentre (opcional)"
          aria-label="Mensaje para quien la encuentre"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
        />

        <div className="acciones-tarjeta">
          <button className="boton secundario" type="button" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="boton" type="button" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Reportando…' : 'Reportar como perdida'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CartelConfirmacion({ titulo, texto, onCancelar, onConfirmar, confirmando }) {
  return (
    <div className="superposicion">
      <div className="tarjeta-confirmacion" role="alertdialog" aria-modal="true" aria-labelledby="titulo-confirmacion">
        <h2 id="titulo-confirmacion">{titulo}</h2>
        <p className="ayuda">{texto}</p>
        <div className="acciones-tarjeta">
          <button className="boton secundario" type="button" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="boton peligro" type="button" onClick={onConfirmar} disabled={confirmando}>
            {confirmando ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FilaMascota({ mascota, caso, onVinculada, onEliminada, onCasoActualizado }) {
  const [codigo, setCodigo] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [mostrandoFormularioPerdida, setMostrandoFormularioPerdida] = useState(false)
  const [marcando, setMarcando] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const [error, setError] = useState(null)
  const [errorCaso, setErrorCaso] = useState(null)

  const placaActiva = mascota.placas?.find((p) => p.estado === 'activa')

  async function marcarPerdida({ ubicacion, mensaje }) {
    setMarcando(true)
    setErrorCaso(null)

    const datosCaso = {
      estado: 'perdida',
      mensaje,
      ultima_lat: ubicacion?.lat ?? null,
      ultima_lng: ubicacion?.lng ?? null,
    }

    const { error: errorRpc } = caso
      ? await supabase.from('casos_perdida').update(datosCaso).eq('id', caso.id)
      : await supabase.from('casos_perdida').insert({ ...datosCaso, mascota_id: mascota.id, origen: 'manual' })

    setMarcando(false)
    setMostrandoFormularioPerdida(false)
    if (errorRpc) setErrorCaso('No pudimos marcarla: ' + errorRpc.message)
    else onCasoActualizado()
  }

  async function descartarSospecha() {
    setDescartando(true)
    setErrorCaso(null)

    const { error: errorRpc } = await supabase
      .from('casos_perdida')
      .update({ estado: 'descartada', cerrado_en: new Date().toISOString() })
      .eq('id', caso.id)

    setDescartando(false)
    if (errorRpc) setErrorCaso('No pudimos descartarla: ' + errorRpc.message)
    else onCasoActualizado()
  }

  async function vincular(e) {
    e.preventDefault()
    setVinculando(true)
    setError(null)

    const { data, error: errorRpc } = await supabase.rpc('vincular_placa', {
      p_codigo: codigo.trim().toUpperCase(),
      p_mascota_id: mascota.id,
    })

    setVinculando(false)

    if (errorRpc || !data?.ok) {
      setError(ERRORES_VINCULAR[data?.error] || 'No pudimos vincular la placa')
      return
    }

    setCodigo('')
    onVinculada()
  }

  async function eliminar() {
    setEliminando(true)
    const { error: errorUpdate } = await supabase
      .from('mascotas')
      .update({ activa: false })
      .eq('id', mascota.id)

    setEliminando(false)
    setConfirmando(false)
    if (errorUpdate) setError('No pudimos eliminarla: ' + errorUpdate.message)
    else onEliminada()
  }

  return (
    <li>
      {mascota.foto_url
        ? <img className="miniatura" src={mascota.foto_url} alt={mascota.nombre} />
        : <div className="miniatura vacia">Sin foto</div>}
      <div>
        <span className="nombre">{mascota.nombre}</span>
        <span className="ayuda">{mascota.especie}{mascota.raza ? ` · ${mascota.raza}` : ''}</span>

        {placaActiva ? (
          <span className="ayuda">Placa: {placaActiva.codigo}</span>
        ) : (
          <form className="vincular-placa" onSubmit={vincular}>
            <input
              className="entrada"
              type="text"
              placeholder="Código de la placa"
              aria-label={`Código de la placa para ${mascota.nombre}`}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            <button className="boton secundario" type="submit" disabled={vinculando}>
              {vinculando ? 'Vinculando…' : 'Vincular placa'}
            </button>
          </form>
        )}

        <div className="acciones-mascota">
          <Link className="boton-accion" to={`/mascotas/${mascota.id}/editar`}>Editar</Link>
          <Link className="boton-accion" to={`/mascotas/${mascota.id}/mapa`}>Mapa</Link>

          {!caso && (
            <button className="boton-accion alerta" type="button" onClick={() => setMostrandoFormularioPerdida(true)}>
              Marcar como perdida
            </button>
          )}
          {caso?.estado === 'posible_perdida' && (
            <button className="boton-accion alerta" type="button" onClick={() => setMostrandoFormularioPerdida(true)}>
              Confirmar pérdida
            </button>
          )}
          {caso?.estado === 'posible_perdida' && caso?.origen === 'automatico' && (
            <button className="boton-accion" type="button" onClick={descartarSospecha} disabled={descartando}>
              {descartando ? 'Descartando…' : 'No, está conmigo'}
            </button>
          )}
          {caso?.estado === 'perdida' && (
            <span className="estado-caso">Perdida — buscando</span>
          )}

          <button className="boton-accion peligro" type="button" onClick={() => setConfirmando(true)}>
            Eliminar
          </button>
        </div>

        {error && <p className="ayuda error">{error}</p>}
        {errorCaso && <p className="ayuda error">{errorCaso}</p>}
      </div>

      {confirmando && (
        <CartelConfirmacion
          titulo={`¿Eliminar a ${mascota.nombre}?`}
          texto="Ya no va a aparecer en tu panel. Los avistamientos y casos ya registrados no se borran."
          onCancelar={() => setConfirmando(false)}
          onConfirmar={eliminar}
          confirmando={eliminando}
        />
      )}

      {mostrandoFormularioPerdida && (
        <FormularioPerdida
          mascota={mascota}
          onCancelar={() => setMostrandoFormularioPerdida(false)}
          onConfirmar={marcarPerdida}
          enviando={marcando}
        />
      )}
    </li>
  )
}

export default function Panel() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [mascotas, setMascotas] = useState([])
  const [casos, setCasos] = useState({})

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/login')
      return
    }

    const avisoPendienteId = localStorage.getItem('avisoPendienteId')
    if (avisoPendienteId) {
      await supabase.rpc('reclamar_avistamiento', { p_avistamiento_id: avisoPendienteId })
      localStorage.removeItem('avisoPendienteId')
    }

    const { data } = await supabase
      .from('mascotas')
      .select('*, placas(codigo, estado)')
      .eq('activa', true)
      .order('creado_en', { ascending: false })

    const { data: casosAbiertos } = await supabase
      .from('casos_perdida')
      .select('id, mascota_id, estado, origen')
      .in('estado', ['perdida', 'posible_perdida'])

    const casosPorMascota = {}
    for (const caso of casosAbiertos || []) {
      casosPorMascota[caso.mascota_id] = caso
    }

    setMascotas(data || [])
    setCasos(casosPorMascota)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [navigate])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (cargando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Mis mascotas</h1>

      {mascotas.length === 0 ? (
        <p className="ayuda">Todavía no cargaste ninguna mascota.</p>
      ) : (
        <ul className="lista-mascotas">
          {mascotas.map((m) => (
            <FilaMascota
              key={m.id}
              mascota={m}
              caso={casos[m.id] || null}
              onVinculada={cargar}
              onEliminada={cargar}
              onCasoActualizado={cargar}
            />
          ))}
        </ul>
      )}

      <Link className="boton" to="/mascotas/nueva">Cargar mascota</Link>
      <button className="boton secundario" onClick={cerrarSesion}>Cerrar sesión</button>
    </main>
  )
}
