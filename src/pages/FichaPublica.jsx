import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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
  const [ficha, setFicha] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

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
      const ubicacion = await pedirUbicacionSiYaHayPermiso()
      if (!ubicacion) return
      await supabase.rpc('registrar_escaneo', {
        p_codigo: codigo,
        p_lat: ubicacion.lat,
        p_lng: ubicacion.lng,
      })
    }
    registrarEscaneo()
  }, [codigo])

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

    const { error } = await supabase.rpc('registrar_avistamiento', {
      p_codigo: codigo,
      p_lat: ubicacion.lat,
      p_lng: ubicacion.lng,
      p_origen: origenUbicacion || 'manual',
      p_situacion: situacion,
      p_mensaje: mensaje.trim() || null,
      p_contacto: contacto.trim() || null,
    })

    setEnviando(false)
    if (error) setErrorEnvio(error.message)
    else setAvisoEnviado(true)
  }

  if (cargando) return <main className="pagina"><p>Buscando la mascota…</p></main>

  if (error) return (
    <main className="pagina">
      <Encabezado />
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{error}</p>
    </main>
  )

  if (!ficha?.encontrada) return (
    <main className="pagina">
      <Encabezado />
      <h1>Placa no reconocida</h1>
      <p>Esta placa no está registrada o todavía no fue asignada a una mascota.</p>
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
        <div className="confirmacion">
          ¡Gracias! Avisamos al dueño de {ficha.nombre}.
        </div>
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
