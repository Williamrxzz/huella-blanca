import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import { pedirUbicacion } from '../lib/ubicacion'
import Encabezado from '../components/Encabezado'

const CENTRO_INICIAL = { lat: -46.4380, lng: -67.5280 } // Caleta Olivia

function SelectorMapa({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function AltaMascota() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()
  const [sesion, setSesion] = useState(null)
  const [cargandoMascota, setCargandoMascota] = useState(editando)

  const [nombre, setNombre] = useState('')
  const [especie, setEspecie] = useState('perro')
  const [sexo, setSexo] = useState('macho')
  const [raza, setRaza] = useState('')
  const [tamano, setTamano] = useState('mediano')
  const [color, setColor] = useState('')
  const [senas, setSenas] = useState('')
  const [caracter, setCaracter] = useState('amigable')
  const [foto, setFoto] = useState(null)
  const [fotoUrlActual, setFotoUrlActual] = useState(null)
  const [radioMetros, setRadioMetros] = useState(100)
  const [mostrarSalud, setMostrarSalud] = useState(false)
  const [salud, setSalud] = useState('')

  const [centroMapa, setCentroMapa] = useState(CENTRO_INICIAL)
  const [domicilio, setDomicilio] = useState(null)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    async function iniciar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      setSesion(session)

      if (!editando) return

      const { data: mascota, error: errorMascota } = await supabase
        .from('mascotas')
        .select('*')
        .eq('id', id)
        .single()

      if (errorMascota || !mascota) {
        setErrorCarga('No pudimos encontrar esa mascota.')
        setCargandoMascota(false)
        return
      }

      setNombre(mascota.nombre)
      setEspecie(mascota.especie)
      setSexo(mascota.sexo || 'macho')
      setRaza(mascota.raza || '')
      setTamano(mascota.tamano || 'mediano')
      setColor(mascota.color || '')
      setSenas(mascota.senas || '')
      setCaracter(mascota.caracter)
      setFotoUrlActual(mascota.foto_url)
      setRadioMetros(mascota.radio_metros)
      setMostrarSalud(mascota.mostrar_salud)
      setSalud(mascota.salud || '')

      const domicilioExistente = { lat: mascota.domicilio_lat, lng: mascota.domicilio_lng }
      setCentroMapa(domicilioExistente)
      setDomicilio(domicilioExistente)
      setCargandoMascota(false)
    }
    iniciar()
  }, [editando, id, navigate])

  async function usarUbicacionActual() {
    setBuscandoUbicacion(true)
    setError(null)
    const resultado = await pedirUbicacion()
    setBuscandoUbicacion(false)
    if (resultado) {
      setCentroMapa(resultado)
      setDomicilio(resultado)
    } else {
      setError('No pudimos obtener tu ubicación automáticamente. Tocá el mapa para marcar el domicilio.')
    }
  }

  async function guardar(e) {
    e.preventDefault()
    setError(null)

    if (!domicilio) {
      setError('Falta marcar el domicilio en el mapa.')
      return
    }

    setGuardando(true)

    let fotoUrl = fotoUrlActual
    if (foto) {
      const ruta = `${sesion.user.id}/${Date.now()}-${foto.name}`
      const { error: errorSubida } = await supabase.storage
        .from('fotos-mascotas')
        .upload(ruta, foto)

      if (errorSubida) {
        setGuardando(false)
        setError('No pudimos subir la foto: ' + errorSubida.message)
        return
      }

      const { data } = supabase.storage.from('fotos-mascotas').getPublicUrl(ruta)
      fotoUrl = data.publicUrl
    }

    const datosMascota = {
      nombre,
      especie,
      sexo,
      raza: raza.trim() || null,
      tamano,
      color: color.trim() || null,
      senas: senas.trim() || null,
      caracter,
      foto_url: fotoUrl,
      domicilio_lat: domicilio.lat,
      domicilio_lng: domicilio.lng,
      radio_metros: radioMetros,
      mostrar_salud: mostrarSalud,
      salud: mostrarSalud ? (salud.trim() || null) : null,
    }

    if (editando) {
      const { error: errorUpdate } = await supabase
        .from('mascotas')
        .update(datosMascota)
        .eq('id', id)

      setGuardando(false)
      if (errorUpdate) setError(errorUpdate.message)
      else navigate('/panel')
      return
    }

    const { data: nuevaMascota, error: errorInsert } = await supabase
      .from('mascotas')
      .insert({ ...datosMascota, dueno_id: sesion.user.id })
      .select()
      .single()

    if (errorInsert) {
      setGuardando(false)
      setError(errorInsert.message)
      return
    }

    const { data: codigo, error: errorPlaca } = await supabase.rpc('generar_placa', {
      p_mascota_id: nuevaMascota.id,
    })

    setGuardando(false)

    if (errorPlaca) {
      // La mascota ya quedó guardada; el código se puede vincular después desde el panel.
      navigate('/panel')
      return
    }

    navigate(`/placas?codigo=${codigo}&nueva=1`)
  }

  if (!sesion || cargandoMascota) return <main className="pagina"><p>Cargando…</p></main>

  if (errorCarga) return (
    <main className="pagina">
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{errorCarga}</p>
    </main>
  )

  return (
    <main className="pagina">
      <Encabezado />
      <h1>{editando ? 'Editar mascota' : 'Cargar mascota'}</h1>

      <form className="formulario-aviso" onSubmit={guardar}>
        <input
          className="entrada"
          type="text"
          placeholder="Nombre"
          aria-label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <select
          className="entrada"
          aria-label="Especie"
          value={especie}
          onChange={(e) => setEspecie(e.target.value)}
        >
          <option value="perro">Perro</option>
          <option value="gato">Gato</option>
          <option value="otro">Otro</option>
        </select>

        <select
          className="entrada"
          aria-label="Sexo"
          value={sexo}
          onChange={(e) => setSexo(e.target.value)}
        >
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
        </select>

        <input
          className="entrada"
          type="text"
          placeholder="Raza (opcional)"
          aria-label="Raza"
          value={raza}
          onChange={(e) => setRaza(e.target.value)}
        />

        <select
          className="entrada"
          aria-label="Tamaño"
          value={tamano}
          onChange={(e) => setTamano(e.target.value)}
        >
          <option value="pequeno">Pequeño</option>
          <option value="mediano">Mediano</option>
          <option value="grande">Grande</option>
        </select>

        <input
          className="entrada"
          type="text"
          placeholder="Color"
          aria-label="Color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <textarea
          className="entrada"
          placeholder="Señas particulares (opcional)"
          aria-label="Señas particulares"
          value={senas}
          onChange={(e) => setSenas(e.target.value)}
          rows={3}
        />

        <select
          className="entrada"
          aria-label="Carácter"
          value={caracter}
          onChange={(e) => setCaracter(e.target.value)}
        >
          <option value="amigable">Amigable</option>
          <option value="temerosa">Temerosa</option>
          <option value="no_acercarse">Mejor no acercarse</option>
        </select>

        {fotoUrlActual && !foto && (
          <img className="miniatura" src={fotoUrlActual} alt={nombre} />
        )}

        <label className="campo-archivo">
          {fotoUrlActual ? 'Cambiar foto (opcional)' : 'Foto (opcional)'}
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
        </label>

        <button
          type="button"
          className="boton secundario"
          onClick={usarUbicacionActual}
          disabled={buscandoUbicacion}
        >
          {buscandoUbicacion ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
        </button>

        <p className="ayuda">
          {domicilio
            ? `Domicilio marcado (${domicilio.lat.toFixed(5)}, ${domicilio.lng.toFixed(5)}). Tocá el mapa para corregirlo.`
            : 'Tocá el mapa para marcar el domicilio.'}
          {' '}El círculo muestra el radio de aviso configurado abajo.
        </p>

        <MapContainer
          key={`${centroMapa.lat}-${centroMapa.lng}`}
          center={[centroMapa.lat, centroMapa.lng]}
          zoom={14}
          className="mapa-domicilio"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <SelectorMapa onSeleccionar={setDomicilio} />
          {domicilio && (
            <>
              <Marker position={[domicilio.lat, domicilio.lng]} />
              <Circle
                center={[domicilio.lat, domicilio.lng]}
                radius={radioMetros}
                pathOptions={{ color: '#2e5c8a', weight: 1, fillOpacity: 0.08 }}
              />
            </>
          )}
        </MapContainer>

        <label className="campo-archivo">
          Radio de aviso (metros)
          <input
            className="entrada"
            type="number"
            value={radioMetros}
            onChange={(e) => setRadioMetros(Number(e.target.value))}
            min={100}
            step={100}
          />
        </label>

        <label className="casilla">
          <input
            type="checkbox"
            checked={mostrarSalud}
            onChange={(e) => setMostrarSalud(e.target.checked)}
          />
          Mostrar información de salud en la ficha pública
        </label>

        {mostrarSalud && (
          <textarea
            className="entrada"
            placeholder="Información de salud"
            aria-label="Información de salud"
            value={salud}
            onChange={(e) => setSalud(e.target.value)}
            rows={2}
          />
        )}

        {error && <p className="ayuda error">{error}</p>}

        <button className="boton" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar mascota'}
        </button>
      </form>
    </main>
  )
}
