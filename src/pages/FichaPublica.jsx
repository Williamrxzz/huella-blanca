import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { pedirUbicacion } from '../lib/ubicacion'

const ETIQUETA_CARACTER = {
  amigable: 'Es amigable',
  temerosa: 'Es temerosa, acercate despacio',
  no_acercarse: 'Mejor no acercarse, avisá al dueño',
}

export default function FichaPublica() {
  const { codigo } = useParams()
  const [ficha, setFicha] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false)
  const [ubicacion, setUbicacion] = useState(null)
  const [situacion, setSituacion] = useState('la_vi_pasar')
  const [referencia, setReferencia] = useState('')
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
  }, [codigo])

  async function abrirFormulario() {
    setMostrarFormulario(true)
    setBuscandoUbicacion(true)
    const resultado = await pedirUbicacion()
    setUbicacion(resultado)
    setBuscandoUbicacion(false)
  }

  async function enviarAviso(e) {
    e.preventDefault()
    setEnviando(true)
    setErrorEnvio(null)

    const origen = ubicacion ? 'gps' : 'manual'
    const mensajeFinal = origen === 'manual' && referencia.trim()
      ? `Lugar: ${referencia.trim()}${mensaje.trim() ? ' — ' + mensaje.trim() : ''}`
      : mensaje.trim() || null

    const { error } = await supabase.rpc('registrar_avistamiento', {
      p_codigo: codigo,
      p_lat: ubicacion?.lat ?? null,
      p_lng: ubicacion?.lng ?? null,
      p_origen: origen,
      p_situacion: situacion,
      p_mensaje: mensajeFinal,
      p_contacto: contacto.trim() || null,
    })

    setEnviando(false)
    if (error) setErrorEnvio(error.message)
    else setAvisoEnviado(true)
  }

  if (cargando) return <main className="pagina"><p>Buscando la mascota…</p></main>

  if (error) return (
    <main className="pagina">
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{error}</p>
    </main>
  )

  if (!ficha?.encontrada) return (
    <main className="pagina">
      <h1>Placa no reconocida</h1>
      <p>Esta placa no está registrada o todavía no fue asignada a una mascota.</p>
      <p className="ayuda">Código leído: {codigo}</p>
    </main>
  )

  const perdida = ficha.estado === 'perdida' || ficha.estado === 'posible_perdida'

  return (
    <main className="pagina">
      {perdida && (
        <div className="alerta">
          {ficha.estado === 'perdida'
            ? 'Esta mascota está reportada como perdida'
            : 'Esta mascota podría estar perdida'}
        </div>
      )}

      {ficha.foto_url
        ? <img className="foto" src={ficha.foto_url} alt={ficha.nombre} />
        : <div className="foto vacia">Sin foto</div>}

      <h1>{ficha.nombre}</h1>

      <ul className="datos">
        {ficha.especie && <li><span>Especie</span>{ficha.especie}</li>}
        {ficha.sexo && <li><span>Sexo</span>{ficha.sexo === 'macho' ? 'Macho' : 'Hembra'}</li>}
        {ficha.raza && <li><span>Raza</span>{ficha.raza}</li>}
        {ficha.tamano && <li><span>Tamaño</span>{ficha.tamano}</li>}
        {ficha.color && <li><span>Color</span>{ficha.color}</li>}
        {ficha.senas && <li><span>Señas</span>{ficha.senas}</li>}
        {ficha.salud && <li><span>Salud</span>{ficha.salud}</li>}
      </ul>

      {ficha.caracter && (
        <p className="caracter">{ETIQUETA_CARACTER[ficha.caracter]}</p>
      )}

      {avisoEnviado ? (
        <div className="confirmacion">
          ¡Gracias! Avisamos al dueño de {ficha.nombre}.
        </div>
      ) : !mostrarFormulario ? (
        <button className="boton" onClick={abrirFormulario}>La vi acá</button>
      ) : (
        <form className="formulario-aviso" onSubmit={enviarAviso}>
          {buscandoUbicacion && (
            <p className="ayuda">Obteniendo tu ubicación…</p>
          )}

          {!buscandoUbicacion && ubicacion && (
            <p className="ayuda">Ubicación obtenida ✓</p>
          )}

          {!buscandoUbicacion && !ubicacion && (
            <>
              <p className="ayuda">
                No pudimos obtener tu ubicación automáticamente. Contanos dónde fue.
              </p>
              <input
                className="entrada"
                type="text"
                placeholder="Ej: esquina de San Martín y Belgrano"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
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
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={3}
          />

          <input
            className="entrada"
            type="text"
            placeholder="Tu teléfono o Instagram, para que te contacten (opcional)"
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
