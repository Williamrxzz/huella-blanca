import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const ERRORES_VINCULAR = {
  placa_no_encontrada: 'No existe una placa con ese código',
  placa_ya_asignada: 'Esa placa ya está asignada a otra mascota',
  mascota_no_encontrada: 'No pudimos identificar la mascota',
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
  const [marcando, setMarcando] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const [error, setError] = useState(null)
  const [errorCaso, setErrorCaso] = useState(null)

  const placaActiva = mascota.placas?.find((p) => p.estado === 'activa')

  async function marcarPerdida() {
    setMarcando(true)
    setErrorCaso(null)

    const { error: errorRpc } = caso
      ? await supabase.from('casos_perdida').update({ estado: 'perdida' }).eq('id', caso.id)
      : await supabase.from('casos_perdida').insert({ mascota_id: mascota.id, estado: 'perdida', origen: 'manual' })

    setMarcando(false)
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
            <button className="boton-accion alerta" type="button" onClick={marcarPerdida} disabled={marcando}>
              {marcando ? 'Marcando…' : 'Marcar como perdida'}
            </button>
          )}
          {caso?.estado === 'posible_perdida' && (
            <button className="boton-accion alerta" type="button" onClick={marcarPerdida} disabled={marcando}>
              {marcando ? 'Confirmando…' : 'Confirmar pérdida'}
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
