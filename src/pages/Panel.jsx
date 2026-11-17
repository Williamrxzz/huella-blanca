import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { ChevronRight, House, LogOut, MapPin, Megaphone, Pencil, QrCode, Trash2, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { normalizarTelefono } from '../lib/telefono'
import Encabezado from '../components/Encabezado'
import AvisosPush from '../components/AvisosPush'
import CompartirBusqueda from '../components/CompartirBusqueda'

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
          <button className="boton terciario" type="button" onClick={onCancelar}>
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
          <button className="boton terciario" type="button" onClick={onCancelar}>
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

// IA03: texto listo para compartir mientras la mascota está perdida. Se arma en
// cada render con los datos actuales de la ficha y del caso, así que se
// actualiza solo si cambian (por ejemplo, al volver de editar la mascota).
function FilaMascota({ mascota, caso, onCodigoCreado, onEliminada, onCasoActualizado }) {
  const [generando, setGenerando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [mostrandoFormularioPerdida, setMostrandoFormularioPerdida] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
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

  // El código QR se crea solo al cargar la mascota (AltaMascota). Si en ese
  // momento falló (por ejemplo, sin conexión), se puede crear desde acá.
  async function crearCodigo() {
    setGenerando(true)
    setError(null)
    const { error: errorRpc } = await supabase.rpc('generar_placa', { p_mascota_id: mascota.id })
    setGenerando(false)
    if (errorRpc) setError('No pudimos crear el código. Probá de nuevo en un momento.')
    else onCodigoCreado()
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

        {caso?.estado === 'perdida' && (
          <span className="estado-caso">
            <TriangleAlert size={14} aria-hidden="true" />
            Perdida, en búsqueda
          </span>
        )}

        {!placaActiva && (
          <button className="boton secundario" type="button" onClick={crearCodigo} disabled={generando}>
            <QrCode size={18} aria-hidden="true" />
            {generando ? 'Creando…' : 'Crear su código QR'}
          </button>
        )}

        <div className="acciones-mascota">
          {/* Primero lo que cambia el estado de la mascota (perdida / conmigo),
              después las acciones de consulta, y al final, solo texto, eliminar. */}
          {!caso && (
            <button className="boton-accion alerta" type="button" onClick={() => setMostrandoFormularioPerdida(true)}>
              <TriangleAlert size={17} aria-hidden="true" />
              Se perdió
            </button>
          )}
          {caso?.estado === 'posible_perdida' && (
            <button className="boton-accion alerta" type="button" onClick={() => setMostrandoFormularioPerdida(true)}>
              <TriangleAlert size={17} aria-hidden="true" />
              Sí, se perdió
            </button>
          )}
          {caso?.estado === 'posible_perdida' && caso?.origen === 'automatico' && (
            <button className="boton-accion" type="button" onClick={descartarSospecha} disabled={descartando}>
              <House size={17} aria-hidden="true" />
              {descartando ? 'Descartando…' : 'Está conmigo'}
            </button>
          )}
          {caso?.estado === 'perdida' && (
            <button className="boton-accion alerta" type="button" onClick={() => setCompartiendo(true)}>
              <Megaphone size={17} aria-hidden="true" />
              Compartir búsqueda
            </button>
          )}

          <Link className="boton-accion" to={`/mascotas/${mascota.id}/mapa`}>
            <MapPin size={17} aria-hidden="true" />
            Avisos
          </Link>
          <Link className="boton-accion" to={`/mascotas/${mascota.id}/editar`}>
            <Pencil size={17} aria-hidden="true" />
            Editar
          </Link>
          {placaActiva && (
            <Link className="boton-accion" to={`/placas?codigo=${placaActiva.codigo}`}>
              <QrCode size={17} aria-hidden="true" />
              Código QR
            </Link>
          )}

          <button className="boton-accion peligro" type="button" onClick={() => setConfirmando(true)}>
            <Trash2 size={16} aria-hidden="true" />
            Eliminar mascota
          </button>
        </div>

        {error && <p className="ayuda error" role="alert">{error}</p>}
        {errorCaso && <p className="ayuda error" role="alert">{errorCaso}</p>}

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

      {compartiendo && (
        <CompartirBusqueda mascota={mascota} caso={caso} onCerrar={() => setCompartiendo(false)} />
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
  const [esAdmin, setEsAdmin] = useState(false)
  const [perfilId, setPerfilId] = useState(null)
  const [telefono, setTelefono] = useState(null)
  const [avisoTelefonoCerrado, setAvisoTelefonoCerrado] = useState(false)
  const [avisoReclamado, setAvisoReclamado] = useState(null) // nombre de la mascota

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/login')
      return
    }

    setPerfilId(session.user.id)

    const { data: perfilExistente } = await supabase
      .from('perfiles')
      .select('id, rol, telefono')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!perfilExistente) {
      // Si el registro pidió confirmar el email, la fila en "perfiles" queda
      // pendiente hasta este primer ingreso ya logueado.
      // Cuentas registradas antes del 2026-11-17 pueden traer el teléfono sin
      // normalizar: se normaliza, y si no se puede, se deja vacío (el panel
      // invita a cargarlo en /perfil) en vez de que falle el alta del perfil.
      const telNormalizado = normalizarTelefono(session.user.user_metadata?.telefono)
      const telefonoInicial = telNormalizado.ok ? telNormalizado.valor : null
      await supabase.from('perfiles').insert({
        id: session.user.id,
        nombre: session.user.user_metadata?.nombre || '',
        telefono: telefonoInicial,
        // rol no se manda: la base lo fija en 'usuario' (el navegador no puede elegirlo).
      })
      setTelefono(telefonoInicial)
    } else {
      setEsAdmin(perfilExistente.rol === 'admin')
      setTelefono(perfilExistente.telefono)
    }

    // TRA09/REC09: un aviso hecho antes de tener cuenta. Se mira el resultado:
    // si se asoció, se confirma en pantalla; si ya no se puede (vencido, ya
    // reclamado), se descarta; si falló la conexión, queda para el próximo
    // ingreso en vez de perderse en silencio.
    const avisoPendienteId = localStorage.getItem('avisoPendienteId')
    if (avisoPendienteId) {
      const { data: reclamo, error: errorReclamo } = await supabase.rpc('reclamar_avistamiento', { p_avistamiento_id: avisoPendienteId })
      if (!errorReclamo) {
        localStorage.removeItem('avisoPendienteId')
        if (reclamo?.ok) setAvisoReclamado(reclamo.mascota || 'la mascota')
      }
    }

    // Restos del circuito de placas por lote, retirado el 2026-11-17.
    localStorage.removeItem('placaPendiente')

    const { data } = await supabase
      .from('mascotas')
      .select('*, placas(codigo, estado)')
      .eq('activa', true)
      .order('creado_en', { ascending: false })

    const { data: casosAbiertos } = await supabase
      .from('casos_perdida')
      .select('id, mascota_id, estado, origen, ultima_lat, ultima_lng, iniciado_en')
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

      {perfilId && mascotas.length > 0 && <AvisosPush perfilId={perfilId} />}

      {avisoReclamado && (
        <div className="aviso-telefono" role="status">
          <p>Tu aviso sobre {avisoReclamado} quedó registrado en tu cuenta. ¡Gracias por ayudar!</p>
          <div className="acciones-aviso">
            <Link className="boton-accion" to="/mi-historial">Ver mi historial</Link>
            <button className="boton-accion" type="button" onClick={() => setAvisoReclamado(null)} aria-label="Cerrar aviso">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {mascotas.length > 0 && !telefono && !avisoTelefonoCerrado && (
        <div className="aviso-telefono">
          <p>Cargá tu teléfono para que quien encuentre a tu mascota pueda llamarte.</p>
          <div className="acciones-aviso">
            <Link className="boton-accion" to="/perfil">Cargar teléfono</Link>
            <button
              className="boton-accion"
              type="button"
              onClick={() => setAvisoTelefonoCerrado(true)}
              aria-label="Cerrar aviso"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {mascotas.length === 0 ? (
        <p className="ayuda">Todavía no cargaste ninguna mascota.</p>
      ) : (
        <ul className="lista-mascotas">
          {mascotas.map((m) => (
            <FilaMascota
              key={m.id}
              mascota={m}
              caso={casos[m.id] || null}
              onCodigoCreado={cargar}
              onEliminada={cargar}
              onCasoActualizado={cargar}
            />
          ))}
        </ul>
      )}

      <Link className="boton" to="/mascotas/nueva">Cargar mascota</Link>

      <nav className="lista-enlaces" aria-label="Más opciones">
        <Link to="/perfil">Tu perfil<ChevronRight size={18} aria-hidden="true" /></Link>
        <Link to="/mi-historial">Tu colaboración<ChevronRight size={18} aria-hidden="true" /></Link>
        {esAdmin && (
          <>
            <Link to="/admin/estadisticas">Estadísticas (administración)<ChevronRight size={18} aria-hidden="true" /></Link>
            <Link to="/admin/cuentas">Cuentas (administración)<ChevronRight size={18} aria-hidden="true" /></Link>
          </>
        )}
      </nav>

      <button className="boton terciario" onClick={cerrarSesion}>
        <LogOut size={18} aria-hidden="true" />
        Cerrar sesión
      </button>
    </main>
  )
}
