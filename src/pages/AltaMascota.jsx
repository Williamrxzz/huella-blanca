import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { iconoCasa } from '../lib/leaflet-iconos'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import { borrarFoto, fotoAJpegBase64, subirFoto, verificarFoto } from '../lib/fotos'
import { pedirUbicacion } from '../lib/ubicacion'
import { X } from 'lucide-react'
import Encabezado from '../components/Encabezado'
import Cargando from '../components/Cargando'
import SelectorFoto from '../components/SelectorFoto'

const CENTRO_INICIAL = { lat: -46.4380, lng: -67.5280 } // Caleta Olivia

function SelectorMapa({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// DUE10: radio de aviso, con opciones que se entienden sin pensar en metros.
const RADIOS = [
  { metros: 100, etiqueta: 'Una cuadra (100 m)' },
  { metros: 300, etiqueta: 'Unas tres cuadras (300 m)' },
  { metros: 500, etiqueta: 'El barrio (500 m)' },
  { metros: 1000, etiqueta: 'Un kilómetro' },
  { metros: 3000, etiqueta: 'Tres kilómetros' },
]

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
  // Bytes ya reducidos (JPEG en base64) y el pase de la verificación: son los que se guardan.
  const [fotoPreparada, setFotoPreparada] = useState(null)
  const [fotoUrlActual, setFotoUrlActual] = useState(null)
  const [analizandoFoto, setAnalizandoFoto] = useState(false)
  const verificacionActual = useRef(0)
  const [avisoFotoIA, setAvisoFotoIA] = useState(null)
  const [radioMetros, setRadioMetros] = useState(100)
  const [horasConfirmacion, setHorasConfirmacion] = useState(24)
  const [visibilidadSenas, setVisibilidadSenas] = useState('publico')
  const [visibilidadSalud, setVisibilidadSalud] = useState('privado')
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
      setHorasConfirmacion(mascota.horas_confirmacion ?? 24)
      setVisibilidadSenas(mascota.visibilidad_senas)
      setVisibilidadSalud(mascota.visibilidad_salud)
      setSalud(mascota.salud || '')

      const domicilioExistente = { lat: mascota.domicilio_lat, lng: mascota.domicilio_lng }
      setCentroMapa(domicilioExistente)
      setDomicilio(domicilioExistente)
      setCargandoMascota(false)
    }
    iniciar()
  }, [editando, id, navigate])

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0] || null

    // Si no se eligió ningún archivo (por ejemplo, se canceló el selector o se
    // vació el campo tras un rechazo), no se toca el estado: una foto
    // rechazada sigue bloqueando el guardado hasta elegir otra que pase.
    if (!archivo) return

    setError(null)
    setAvisoFotoIA(null)
    setFoto(archivo)

    // La verificación de la foto (IA02) corre siempre, al crear y al editar,
    // para que no se pueda subir una imagen que no sea un animal. Las
    // sugerencias de ficha (IA01) solo se aplican al crear: al editar ya hay
    // datos reales cargados, y no queremos que una foto nueva los pise.
    // Cada elección de foto tiene su número: si la persona elige otra antes de
    // que termine el análisis, la respuesta vieja se ignora.
    const numeroVerificacion = ++verificacionActual.current

    setAnalizandoFoto(true)
    try {
      const base64 = await fotoAJpegBase64(archivo)
      if (numeroVerificacion !== verificacionActual.current) return
      setFotoPreparada({ base64, pase: null })

      const data = await verificarFoto(base64)

      if (numeroVerificacion !== verificacionActual.current) return

      // Error técnico (timeout, sin conexión, API caída, o el modelo no
      // devolvió una clasificación): la IA sugiere y la persona confirma, así
      // que se sigue sin verificar y nunca se traba el alta de la mascota.
      // Solo se bloquea abajo, cuando el modelo SÍ contestó que no hay un animal.
      // (`subir-foto` vuelve a intentar la verificación al guardar.)
      if (!data) {
        setAvisoFotoIA({ tipo: 'sin_verificar', motivo: null })
        return
      }

      setFotoPreparada({ base64, pase: data.pase || null })

      if (data.categoria === 'inapropiada') {
        setFoto(null)
        setFotoPreparada(null)
        e.target.value = ''
        setAvisoFotoIA({ tipo: 'bloqueo', motivo: data.motivo })
        return
      }

      if (data.categoria === 'sin_animal') {
        setFoto(null)
        setFotoPreparada(null)
        e.target.value = ''
        setAvisoFotoIA({ tipo: 'sin_animal', motivo: null })
        return
      }

      if (data.categoria === 'incorrecta') {
        setAvisoFotoIA({ tipo: 'advertencia', motivo: data.motivo })
        return
      }

      if (data.categoria === 'apta' && data.sugerencia && !editando) {
        const s = data.sugerencia
        if (s.especie) setEspecie(s.especie)
        if (s.raza) setRaza(s.raza)
        if (s.tamano) setTamano(s.tamano)
        if (s.color) setColor(s.color)
        if (s.senas) setSenas(s.senas)
        setAvisoFotoIA({ tipo: 'sugerencia', motivo: null })
      }
    } catch {
      // Sin conexión, timeout, lo que sea: se sigue sin verificar.
      if (numeroVerificacion === verificacionActual.current) {
        setAvisoFotoIA({ tipo: 'sin_verificar', motivo: null })
      }
    } finally {
      if (numeroVerificacion === verificacionActual.current) setAnalizandoFoto(false)
    }
  }

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

  // Una foto rechazada por la verificación (sin animal o inapropiada) bloquea el
  // guardado: el campo de foto es opcional, así que sin esto la mascota se
  // guardaría igual, solo que sin foto. Se libera al elegir otra foto que pase.
  const fotoRechazada = avisoFotoIA?.tipo === 'sin_animal' || avisoFotoIA?.tipo === 'bloqueo'

  // Salida explícita del estado de foto rechazada: vuelve a "sin foto elegida"
  // (la foto es opcional) y libera el guardado. No es lo mismo que cancelar el
  // selector de archivos, que no cambia nada.
  function quitarFoto() {
    verificacionActual.current += 1
    setFoto(null)
    setFotoPreparada(null)
    setAvisoFotoIA(null)
    setAnalizandoFoto(false)
    setError(null)
  }

  async function guardar(e) {
    e.preventDefault()
    setError(null)

    if (fotoRechazada || analizandoFoto) {
      setError(
        fotoRechazada
          ? 'Elegí una foto de tu mascota que sí se pueda usar para poder guardar.'
          : 'Esperá a que termine de verificarse la foto.'
      )
      return
    }

    if (!domicilio) {
      setError('Falta marcar el domicilio en el mapa.')
      return
    }

    setGuardando(true)

    let fotoUrl = fotoUrlActual
    let fotoNueva = null
    if (foto && fotoPreparada) {
      try {
        fotoNueva = await subirFoto({ ...fotoPreparada, tipo: 'mascota' })
      } catch (errorSubida) {
        setGuardando(false)
        if (errorSubida.codigo === 'foto_rechazada') {
          // La verificación del servidor la rechazó (por ejemplo, la del
          // navegador había fallado): mismo trato que al elegirla.
          setFoto(null)
          setFotoPreparada(null)
          setAvisoFotoIA(errorSubida.categoria === 'sin_animal'
            ? { tipo: 'sin_animal', motivo: null }
            : { tipo: 'bloqueo', motivo: errorSubida.message })
          return
        }
        setError('No pudimos subir la foto: ' + errorSubida.message)
        return
      }
      fotoUrl = fotoNueva.url
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
      horas_confirmacion: horasConfirmacion,
      salud: salud.trim() || null,
      visibilidad_senas: visibilidadSenas,
      visibilidad_salud: visibilidadSalud,
    }

    if (editando) {
      const { error: errorUpdate } = await supabase
        .from('mascotas')
        .update(datosMascota)
        .eq('id', id)

      setGuardando(false)
      if (errorUpdate) {
        // No quedó guardada: la foto recién subida no tiene a quién pertenecer.
        if (fotoNueva) await borrarFoto(fotoNueva.ruta)
        setError(errorUpdate.message)
        return
      }
      // Se reemplazó la foto: la anterior ya no la usa nadie.
      if (fotoNueva && fotoUrlActual) await borrarFoto(fotoUrlActual)
      navigate('/panel')
      return
    }

    const { data: nuevaMascota, error: errorInsert } = await supabase
      .from('mascotas')
      .insert({ ...datosMascota, dueno_id: sesion.user.id })
      .select()
      .single()

    if (errorInsert) {
      // La mascota no se guardó: se borra la foto para no dejarla huérfana.
      if (fotoNueva) await borrarFoto(fotoNueva.ruta)
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

  if (!sesion || cargandoMascota) return <Cargando texto="Cargando…" />

  if (errorCarga) return (
    <main className="pagina">
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{errorCarga}</p>
    </main>
  )

  return (
    <main className="pagina">
      <Encabezado volver="/panel" />
      <h1>{editando ? 'Editar mascota' : 'Cargar mascota'}</h1>

      <form className="formulario-aviso" onSubmit={guardar}>
        {/* La foto va primero: con ella la IA sugiere especie, tamaño, color y
            señas, y el resto del formulario se completa casi solo. */}
        <SelectorFoto etiqueta="Foto (opcional, pero recomendada)" archivo={foto} urlActual={fotoUrlActual} onChange={elegirFoto} alt={nombre} />

        {/* Recomendación suave: solo informa, no cambia nada (la foto sigue siendo
            opcional). Se muestra al cargar una mascota nueva y desaparece apenas
            se elige una foto, sea válida o rechazada. */}
        {!editando && !foto && !avisoFotoIA && (
          <p className="ayuda">
            Con una foto de tu mascota podemos sugerir los datos de la ficha automáticamente y es más fácil que la reconozcan si se pierde. Podés seguir sin foto si preferís.
          </p>
        )}

        {analizandoFoto && <p className="ayuda">Analizando la foto…</p>}

        {/* Foto rechazada: el mensaje lleva una "×" chica al final para quitarla y
            volver a "sin foto" (que es válido). */}
        {fotoRechazada && (
          <div className="aviso-foto-rechazada" role="alert">
            <p className="ayuda error" role="alert">
              {avisoFotoIA.tipo === 'sin_animal'
                ? 'Esta foto no parece ser de un animal. Subí una foto de tu mascota (perro, gato u otro animal) para continuar.'
                : `Esa foto no se puede usar (${avisoFotoIA.motivo || 'contenido no permitido'}). Elegí otra.`}
            </p>
            <button
              className="boton-x"
              type="button"
              onClick={quitarFoto}
              aria-label="Quitar foto"
              title="Quitar foto"
            >
              <span className="boton-x-circulo">
                <X size={14} strokeWidth={2.5} aria-hidden="true" />
              </span>
            </button>
          </div>
        )}

        {avisoFotoIA?.tipo === 'sin_verificar' && (
          <p className="ayuda">
            No pudimos verificar la foto en este momento. Podés seguir igual.
          </p>
        )}

        {avisoFotoIA?.tipo === 'advertencia' && (
          <p className="ayuda error" role="alert">
            {avisoFotoIA.motivo || 'La foto no se ve del todo clara.'} Podés seguir igual, o elegir otra.
          </p>
        )}

        {avisoFotoIA?.tipo === 'sugerencia' && (
          <p className="confirmacion">
            Completamos algunos campos a partir de la foto — revisalos y corregí lo que no coincida.
          </p>
        )}


        <label className="etiqueta-campo" htmlFor="nombre-mascota">Nombre</label>
        <input
          id="nombre-mascota"
          className="entrada"
          type="text"
          placeholder="Ej.: Blanca"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label className="etiqueta-campo" htmlFor="especie">Especie</label>
        <select
          id="especie"
          className="entrada"
          value={especie}
          onChange={(e) => setEspecie(e.target.value)}
        >
          <option value="perro">Perro</option>
          <option value="gato">Gato</option>
          <option value="otro">Otro</option>
        </select>

        <label className="etiqueta-campo" htmlFor="sexo">Sexo</label>
        <select
          id="sexo"
          className="entrada"
          value={sexo}
          onChange={(e) => setSexo(e.target.value)}
        >
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
        </select>

        <label className="etiqueta-campo" htmlFor="raza">Raza (opcional)</label>
        <input
          id="raza"
          className="entrada"
          type="text"
          placeholder="Ej.: mestiza, caniche"
          value={raza}
          onChange={(e) => setRaza(e.target.value)}
        />

        <label className="etiqueta-campo" htmlFor="tamano">Tamaño</label>
        <select
          id="tamano"
          className="entrada"
          value={tamano}
          onChange={(e) => setTamano(e.target.value)}
        >
          <option value="pequeno">Pequeño</option>
          <option value="mediano">Mediano</option>
          <option value="grande">Grande</option>
        </select>

        <label className="etiqueta-campo" htmlFor="color">Color</label>
        <input
          id="color"
          className="entrada"
          type="text"
          placeholder="Ej.: negra con pecho blanco"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <label className="etiqueta-campo" htmlFor="senas">Señas particulares (opcional)</label>
        <textarea
          id="senas"
          className="entrada"
          placeholder="Ej.: mancha blanca en la pata derecha, cola cortita"
          value={senas}
          onChange={(e) => setSenas(e.target.value)}
          rows={3}
        />

        <label className="etiqueta-campo" htmlFor="visibilidad-senas">¿Quién ve las señas?</label>
        <select
          id="visibilidad-senas"
          className="entrada"
          value={visibilidadSenas}
          onChange={(e) => setVisibilidadSenas(e.target.value)}
        >
          <option value="publico">Cualquiera que escanee la placa</option>
          <option value="perdida">Solo si está perdida</option>
          <option value="privado">Nadie (solo vos)</option>
        </select>

        <label className="etiqueta-campo" htmlFor="caracter">¿Cómo reacciona con desconocidos?</label>
        <select
          id="caracter"
          className="entrada"
          value={caracter}
          onChange={(e) => setCaracter(e.target.value)}
        >
          <option value="amigable">Es amigable</option>
          <option value="temerosa">Es temerosa: hay que acercarse despacio</option>
          <option value="no_acercarse">Mejor no acercarse</option>
        </select>
        <p className="ayuda">Se lo decimos a quien la encuentre, para que sepa cómo acercarse.</p>

        <label className="etiqueta-campo">¿Dónde vive?</label>
        <p className="ayuda">Se guarda solo como un punto en el mapa y no se le muestra nunca a nadie: sirve para avisarte si la escanean lejos de casa.</p>
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
              <Marker position={[domicilio.lat, domicilio.lng]} icon={iconoCasa} title="Domicilio" alt="Domicilio" />
              <Circle
                center={[domicilio.lat, domicilio.lng]}
                radius={radioMetros}
                pathOptions={{ color: '#2e5c8a', weight: 1, fillOpacity: 0.08 }}
              />
            </>
          )}
        </MapContainer>

        <label className="etiqueta-campo" htmlFor="radio-aviso">¿A qué distancia de tu casa te avisamos?</label>
        <select
          id="radio-aviso"
          className="entrada"
          value={radioMetros}
          onChange={(e) => setRadioMetros(Number(e.target.value))}
        >
          {/* Un radio que no esté en la lista (cargado antes) se conserva. */}
          {!RADIOS.some((r) => r.metros === radioMetros) && <option value={radioMetros}>{radioMetros} m</option>}
          {RADIOS.map((r) => <option key={r.metros} value={r.metros}>{r.etiqueta}</option>)}
        </select>
        <p className="ayuda">
          Si escanean su placa más lejos que esto, te avisamos que podría estar perdida. Si suele andar
          suelta por el barrio, elegí un radio más grande.
        </p>

        <label className="etiqueta-campo" htmlFor="plazo-confirmacion">Si te llega una alerta y no respondés, ¿cuánto esperamos?</label>
        <select
          id="plazo-confirmacion"
          className="entrada"
          value={horasConfirmacion}
          onChange={(e) => setHorasConfirmacion(Number(e.target.value))}
        >
          <option value={6}>6 horas</option>
          <option value={12}>12 horas</option>
          <option value={24}>24 horas</option>
          <option value={48}>48 horas</option>
        </select>
        <p className="ayuda">Pasado ese tiempo la marcamos como perdida, y su ficha muestra cómo contactarte.</p>

        <label className="etiqueta-campo" htmlFor="salud">Salud (opcional)</label>
        <textarea
          id="salud"
          className="entrada"
          placeholder="Ej.: toma medicación, es alérgica a…"
          value={salud}
          onChange={(e) => setSalud(e.target.value)}
          rows={2}
        />

        <label className="etiqueta-campo" htmlFor="visibilidad-salud">¿Quién ve la información de salud?</label>
        <select
          id="visibilidad-salud"
          className="entrada"
          value={visibilidadSalud}
          onChange={(e) => setVisibilidadSalud(e.target.value)}
        >
          <option value="publico">Cualquiera que escanee la placa</option>
          <option value="perdida">Solo si está perdida</option>
          <option value="privado">Nadie (solo vos)</option>
        </select>

        {error && <p className="ayuda error" role="alert">{error}</p>}

        {/* Mientras la IA analiza la foto no se puede guardar: si no, una foto
            que después resulta bloqueada llegaría a guardarse igual. */}
        <button className="boton" type="submit" disabled={guardando || analizandoFoto || fotoRechazada}>
          {guardando
            ? 'Guardando…'
            : analizandoFoto
              ? 'Verificando la foto…'
              : fotoRechazada
                ? 'Elegí otra foto para poder guardar'
                : editando ? 'Guardar cambios' : 'Guardar mascota'}
        </button>
      </form>
    </main>
  )
}
