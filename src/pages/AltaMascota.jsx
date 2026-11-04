import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import { pedirUbicacion } from '../lib/ubicacion'
import { X } from 'lucide-react'
import Encabezado from '../components/Encabezado'

const CENTRO_INICIAL = { lat: -46.4380, lng: -67.5280 } // Caleta Olivia

const ERRORES_VINCULAR = {
  placa_no_encontrada: 'No encontramos esa placa',
  placa_ya_asignada: 'Esa placa ya está asignada a otra mascota',
  mascota_no_encontrada: 'No pudimos identificar la mascota',
}

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1])
    lector.onerror = reject
    lector.readAsDataURL(archivo)
  })
}

// Reduce la foto y la convierte a JPEG antes de mandarla a la IA. La API solo
// acepta JPEG, PNG, GIF y WebP (no HEIC, el formato de las fotos de iPhone) y
// rechaza imágenes muy pesadas: así la verificación no falla por el formato o
// el tamaño del archivo, y además viaja menos y responde más rápido.
async function fotoAJpegBase64(archivo, ladoMaximo = 1280) {
  const imagen = await createImageBitmap(archivo)
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(1, Math.round(imagen.width * escala))
  lienzo.height = Math.max(1, Math.round(imagen.height * escala))
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  imagen.close?.()
  const jpeg = await new Promise((resolve, reject) => {
    lienzo.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('sin_jpeg'))), 'image/jpeg', 0.85)
  })
  return archivoABase64(jpeg)
}

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
  const [searchParams] = useSearchParams()
  const placaAActivar = !editando ? searchParams.get('placa') : null
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
  const [analizandoFoto, setAnalizandoFoto] = useState(false)
  const verificacionActual = useRef(0)
  const [avisoFotoIA, setAvisoFotoIA] = useState(null)
  const [radioMetros, setRadioMetros] = useState(100)
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
      const { data, error: errorFn } = await supabase.functions.invoke('sugerir-ficha', {
        body: { imagen_base64: base64, media_type: 'image/jpeg' },
      })

      if (numeroVerificacion !== verificacionActual.current) return

      // Error técnico (timeout, sin conexión, API caída, o el modelo no
      // devolvió una clasificación): la IA sugiere y la persona confirma, así
      // que se sigue sin verificar y nunca se traba el alta de la mascota.
      // Solo se bloquea abajo, cuando el modelo SÍ contestó que no hay un animal.
      if (errorFn || !data || data.error) {
        setAvisoFotoIA({ tipo: 'sin_verificar', motivo: null })
        return
      }

      if (data.categoria === 'inapropiada') {
        setFoto(null)
        e.target.value = ''
        setAvisoFotoIA({ tipo: 'bloqueo', motivo: data.motivo })
        return
      }

      if (data.categoria === 'sin_animal') {
        setFoto(null)
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

    if (placaAActivar) {
      const { data: resultado, error: errorVincular } = await supabase.rpc('vincular_placa', {
        p_codigo: placaAActivar,
        p_mascota_id: nuevaMascota.id,
      })

      setGuardando(false)

      if (errorVincular || !resultado?.ok) {
        setError(
          (ERRORES_VINCULAR[resultado?.error] || 'No pudimos activar la placa') +
            ' — igual guardamos a tu mascota, podés vincular la placa después desde el panel.'
        )
        return
      }

      navigate(`/placas?codigo=${placaAActivar}&nueva=1`)
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

      {placaAActivar && (
        <p className="ayuda">
          Vas a activar la placa <strong>{placaAActivar}</strong>: al guardar, queda vinculada a esta mascota.
        </p>
      )}

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
          aria-label="Quién ve las señas particulares"
          value={visibilidadSenas}
          onChange={(e) => setVisibilidadSenas(e.target.value)}
        >
          <option value="publico">Señas: las ve cualquiera que escanee la placa</option>
          <option value="perdida">Señas: solo si está perdida</option>
          <option value="privado">Señas: no se muestran</option>
        </select>

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
          <input type="file" accept="image/*" onChange={elegirFoto} />
        </label>

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

        <textarea
          className="entrada"
          placeholder="Información de salud (opcional)"
          aria-label="Información de salud"
          value={salud}
          onChange={(e) => setSalud(e.target.value)}
          rows={2}
        />

        <select
          className="entrada"
          aria-label="Quién ve la información de salud"
          value={visibilidadSalud}
          onChange={(e) => setVisibilidadSalud(e.target.value)}
        >
          <option value="publico">Salud: la ve cualquiera que escanee la placa</option>
          <option value="perdida">Salud: solo si está perdida</option>
          <option value="privado">Salud: no se muestra</option>
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
