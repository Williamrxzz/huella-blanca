import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import { pedirUbicacion, pedirUbicacionSiYaHayPermiso } from '../lib/ubicacion'
import Encabezado from '../components/Encabezado'

const INFO_CARACTER = {
  amigable: {
    etiqueta: 'Es amigable',
    recomendacion: 'Podés acercarte con calma. Hablale suave y dejá que te huela la mano antes de tocarla.',
  },
  temerosa: {
    etiqueta: 'Es temerosa, acercate despacio',
    recomendacion: 'No la persigas ni le grites. Agachate, hablale bajito y dejá que sea ella quien se acerque.',
  },
  no_acercarse: {
    etiqueta: 'Mejor no acercarse, avisá al dueño',
    recomendacion: 'No intentes tocarla ni agarrarla. Quedate a distancia, avisá al dueño con tu ubicación y esperá indicaciones.',
  },
}

const CENTRO_INICIAL = { lat: -46.4380, lng: -67.5280 } // Caleta Olivia

function SelectorMapa({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function FichaPublica() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const [ficha, setFicha] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [activando, setActivando] = useState(false)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  const [ubicacion, setUbicacion] = useState(null)
  const [centroMapa, setCentroMapa] = useState(CENTRO_INICIAL)
  const [origenUbicacion, setOrigenUbicacion] = useState(null)
  const [situacion, setSituacion] = useState('la_vi_pasar')
  const [mensaje, setMensaje] = useState('')
  const [contacto, setContacto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [avisoEnviado, setAvisoEnviado] = useState(false)
  const [avistamientoId, setAvistamientoId] = useState(null)
  const [mostrarCuenta, setMostrarCuenta] = useState(false)
  const [nombreCuenta, setNombreCuenta] = useState('')
  const [emailCuenta, setEmailCuenta] = useState('')
  const [contrasenaCuenta, setContrasenaCuenta] = useState('')
  const [creandoCuenta, setCreandoCuenta] = useState(false)
  const [errorCuenta, setErrorCuenta] = useState(null)
  const [cuentaCreada, setCuentaCreada] = useState(false)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data, error } = await supabase.rpc('ficha_publica', { p_codigo: codigo })
      if (error) setError(error.message)
      else setFicha(data)
      setCargando(false)
    }
    cargar()

    async function registrarEscaneo() {
      // DAT01 pide registrar CADA escaneo, no solo los que tienen ubicación:
      // sin permiso concedido de antes, igual queda la fecha y hora.
      const ubicacion = await pedirUbicacionSiYaHayPermiso()
      await supabase.rpc('registrar_escaneo', {
        p_codigo: codigo,
        p_lat: ubicacion?.lat ?? null,
        p_lng: ubicacion?.lng ?? null,
      })
    }
    registrarEscaneo()
  }, [codigo])

  async function activarPlaca() {
    setActivando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) navigate(`/mascotas/nueva?placa=${codigo}`)
    else navigate(`/registro?placa=${codigo}`)
  }

  async function abrirFormulario() {
    setMostrarFormulario(true)
    setBuscandoUbicacion(true)
    const resultado = await pedirUbicacion()
    if (resultado) {
      setUbicacion(resultado)
      setCentroMapa(resultado)
      setOrigenUbicacion('gps')
    }
    setBuscandoUbicacion(false)
  }

  function elegirEnMapa(coords) {
    setUbicacion(coords)
    setOrigenUbicacion('manual')
  }

  async function enviarAviso(e) {
    e.preventDefault()
    setErrorEnvio(null)

    if (!ubicacion) {
      setErrorEnvio('Marcá en el mapa dónde la viste.')
      return
    }

    setEnviando(true)

    const { data, error } = await supabase.rpc('registrar_avistamiento', {
      p_codigo: codigo,
      p_lat: ubicacion.lat,
      p_lng: ubicacion.lng,
      p_origen: origenUbicacion || 'manual',
      p_situacion: situacion,
      p_mensaje: mensaje.trim() || null,
      p_contacto: contacto.trim() || null,
    })

    setEnviando(false)
    if (error) {
      setErrorEnvio(error.message)
      return
    }
    setAvistamientoId(data?.avistamiento_id || null)
    setAvisoEnviado(true)
  }

  async function crearCuentaYReclamar(e) {
    e.preventDefault()
    setCreandoCuenta(true)
    setErrorCuenta(null)

    const { data, error: errorRegistro } = await supabase.auth.signUp({
      email: emailCuenta,
      password: contrasenaCuenta,
      options: { data: { nombre: nombreCuenta } },
    })

    if (errorRegistro) {
      setCreandoCuenta(false)
      setErrorCuenta(
        errorRegistro.message.includes('already registered')
          ? 'Ese email ya tiene una cuenta. Iniciá sesión desde el panel para vincular tu ayuda.'
          : errorRegistro.message
      )
      return
    }

    if (!data.session) {
      // Falta confirmar el email: todavía no hay sesión para reclamar el aviso.
      // Se guarda el id para reclamarlo cuando la persona vuelva ya logueada.
      if (avistamientoId) localStorage.setItem('avisoPendienteId', avistamientoId)
      setCreandoCuenta(false)
      setCuentaCreada(true)
      return
    }

    await supabase.from('perfiles').insert({ id: data.user.id, nombre: nombreCuenta, rol: 'usuario' })

    if (avistamientoId) {
      await supabase.rpc('reclamar_avistamiento', { p_avistamiento_id: avistamientoId })
    }

    setCreandoCuenta(false)
    setCuentaCreada(true)
  }

  if (cargando) return <main className="pagina"><p>Buscando la mascota…</p></main>

  if (error) return (
    <main className="pagina">
      <Encabezado />
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{error}</p>
    </main>
  )

  if (ficha?.sin_activar) return (
    <main className="pagina">
      <Encabezado />
      <h1>Esta placa todavía no está activada</h1>
      <p>Para usarla, primero hay que cargar los datos de la mascota que la va a llevar.</p>
      <button className="boton" onClick={activarPlaca} disabled={activando}>
        {activando ? 'Un momento…' : 'Activar esta placa'}
      </button>
      <p className="ayuda">Código: {codigo}</p>
    </main>
  )

  if (!ficha?.encontrada) return (
    <main className="pagina">
      <Encabezado />
      <h1>Placa no reconocida</h1>
      <p>Esta placa no está registrada.</p>
      <p className="ayuda">Código leído: {codigo}</p>
    </main>
  )

  const perdida = ficha.estado === 'perdida' || ficha.estado === 'posible_perdida'

  return (
    <main className="pagina">
      <Encabezado />
      {perdida && (
        <div className={`alerta ${ficha.estado === 'perdida' ? 'confirmada' : 'posible'}`}>
          <span className="punto" aria-hidden="true" />
          <div>
            <strong>
              {ficha.estado === 'perdida' ? 'Reportada como perdida' : 'Podría estar perdida'}
            </strong>
            <p>
              {ficha.estado === 'perdida'
                ? 'El dueño confirmó que no está en su casa. Si la ves, avisale.'
                : 'Se detectó un escaneo lejos de su domicilio y el dueño todavía no lo confirmó.'}
            </p>
          </div>
        </div>
      )}

      {ficha.foto_url
        ? <img className="foto" src={ficha.foto_url} alt={ficha.nombre} />
        : <div className="foto vacia">Sin foto</div>}

      <h1>¡Hola! Soy {ficha.nombre}</h1>
      <p className="ayuda">Llamala por su nombre, para que se acerque con más confianza.</p>

      <ul className="datos">
        {ficha.especie && <li><span>Especie</span>{ficha.especie}</li>}
        {ficha.sexo && <li><span>Sexo</span>{ficha.sexo === 'macho' ? 'Macho' : 'Hembra'}</li>}
        {ficha.raza && <li><span>Raza</span>{ficha.raza}</li>}
        {ficha.tamano && <li><span>Tamaño</span>{ficha.tamano}</li>}
        {ficha.color && <li><span>Color</span>{ficha.color}</li>}
        {ficha.senas && <li><span>Señas</span>{ficha.senas}</li>}
        {ficha.salud && <li><span>Salud</span>{ficha.salud}</li>}
      </ul>

      {ficha.caracter && INFO_CARACTER[ficha.caracter] && (
        <div className="caracter">
          <strong>{INFO_CARACTER[ficha.caracter].etiqueta}</strong>
          <p>{INFO_CARACTER[ficha.caracter].recomendacion}</p>
        </div>
      )}

      {perdida && ficha.ultima_lat != null && ficha.ultima_lng != null && (
        <>
          <p className="subtitulo-mapa">Última ubicación donde se encontraba {ficha.nombre}</p>
          <MapContainer
            center={[ficha.ultima_lat, ficha.ultima_lng]}
            zoom={15}
            className="mapa-domicilio"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Circle
              center={[ficha.ultima_lat, ficha.ultima_lng]}
              radius={100}
              pathOptions={{ color: '#2e5c8a', weight: 1, fillOpacity: 0.12 }}
            />
          </MapContainer>
        </>
      )}

      {perdida && (ficha.contacto_tel || ficha.contacto_whatsapp) && (
        <div className="contacto-dueno">
          {ficha.contacto_whatsapp && (
            <a className="boton" href={ficha.contacto_whatsapp} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          )}
          {ficha.contacto_tel && (
            <a className="boton secundario" href={ficha.contacto_tel}>
              Llamar al dueño
            </a>
          )}
        </div>
      )}

      {avisoEnviado ? (
        <>
          <div className="confirmacion">
            ¡Gracias! Avisamos al dueño de {ficha.nombre}.
          </div>

          {cuentaCreada ? (
            <p className="ayuda">
              Tu ayuda quedó registrada. Revisá tu email si hace falta confirmar la cuenta.
            </p>
          ) : mostrarCuenta ? (
            <form className="formulario-aviso" onSubmit={crearCuentaYReclamar}>
              <p className="ayuda">Creá una cuenta para que tu ayuda quede registrada.</p>
              <input
                className="entrada"
                type="text"
                placeholder="Tu nombre"
                aria-label="Tu nombre"
                value={nombreCuenta}
                onChange={(e) => setNombreCuenta(e.target.value)}
                autoComplete="name"
                required
              />
              <input
                className="entrada"
                type="email"
                placeholder="Email"
                aria-label="Email"
                value={emailCuenta}
                onChange={(e) => setEmailCuenta(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                className="entrada"
                type="password"
                placeholder="Contraseña"
                aria-label="Contraseña"
                value={contrasenaCuenta}
                onChange={(e) => setContrasenaCuenta(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
              {errorCuenta && <p className="ayuda error">{errorCuenta}</p>}
              <button className="boton" type="submit" disabled={creandoCuenta}>
                {creandoCuenta ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
              <button
                className="boton secundario"
                type="button"
                onClick={() => setMostrarCuenta(false)}
                disabled={creandoCuenta}
              >
                No, gracias
              </button>
            </form>
          ) : (
            <button className="boton secundario" onClick={() => setMostrarCuenta(true)}>
              Crear cuenta para que quede registrada mi ayuda
            </button>
          )}
        </>
      ) : !mostrarFormulario ? (
        <button className="boton" onClick={abrirFormulario}>La vi acá</button>
      ) : (
        <form className="formulario-aviso" onSubmit={enviarAviso}>
          {buscandoUbicacion ? (
            <p className="ayuda">Obteniendo tu ubicación…</p>
          ) : (
            <>
              <p className="ayuda">
                {ubicacion
                  ? 'Ubicación obtenida. Tocá el mapa si querés corregir el punto exacto.'
                  : 'No pudimos obtener tu ubicación automáticamente. Tocá el mapa para marcar dónde la viste.'}
              </p>
              <MapContainer
                key={`${centroMapa.lat}-${centroMapa.lng}`}
                center={[centroMapa.lat, centroMapa.lng]}
                zoom={ubicacion ? 16 : 13}
                className="mapa-domicilio"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <SelectorMapa onSeleccionar={elegirEnMapa} />
                {ubicacion && <Marker position={[ubicacion.lat, ubicacion.lng]} />}
              </MapContainer>
            </>
          )}

          <div className="opciones-situacion">
            <label>
              <input
                type="radio"
                name="situacion"
                value="la_vi_pasar"
                checked={situacion === 'la_vi_pasar'}
                onChange={() => setSituacion('la_vi_pasar')}
              />
              La vi pasar
            </label>
            <label>
              <input
                type="radio"
                name="situacion"
                value="conmigo"
                checked={situacion === 'conmigo'}
                onChange={() => setSituacion('conmigo')}
              />
              Está conmigo
            </label>
          </div>

          <textarea
            className="entrada"
            placeholder="Contanos más (opcional)"
            aria-label="Contanos más"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={3}
          />

          <input
            className="entrada"
            type="text"
            placeholder="Tu teléfono o Instagram, para que te contacten (opcional)"
            aria-label="Tu teléfono o Instagram"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
          />

          {errorEnvio && <p className="ayuda error">{errorEnvio}</p>}

          <button className="boton" type="submit" disabled={enviando || buscandoUbicacion}>
            {enviando ? 'Enviando…' : 'Enviar aviso'}
          </button>
        </form>
      )}
    </main>
  )
}
