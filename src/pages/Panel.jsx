import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ERRORES_VINCULAR = {
  placa_no_encontrada: 'No existe una placa con ese código',
  placa_ya_asignada: 'Esa placa ya está asignada a otra mascota',
  mascota_no_encontrada: 'No pudimos identificar la mascota',
}

function FilaMascota({ mascota, onVinculada, onEliminada }) {
  const [codigo, setCodigo] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState(null)

  const placaActiva = mascota.placas?.find((p) => p.estado === 'activa')

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
    if (!confirm(`¿Eliminar a ${mascota.nombre}? Ya no va a aparecer en tu panel.`)) return

    setEliminando(true)
    const { error: errorUpdate } = await supabase
      .from('mascotas')
      .update({ activa: false })
      .eq('id', mascota.id)

    setEliminando(false)
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
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            <button className="boton secundario" type="submit" disabled={vinculando}>
              {vinculando ? 'Vinculando…' : 'Vincular placa'}
            </button>
          </form>
        )}

        <button className="enlace-eliminar" type="button" onClick={eliminar} disabled={eliminando}>
          {eliminando ? 'Eliminando…' : 'Eliminar mascota'}
        </button>

        {error && <p className="ayuda error">{error}</p>}
      </div>
    </li>
  )
}

export default function Panel() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [mascotas, setMascotas] = useState([])

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

    setMascotas(data || [])
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
      <h1>Mis mascotas</h1>

      {mascotas.length === 0 ? (
        <p className="ayuda">Todavía no cargaste ninguna mascota.</p>
      ) : (
        <ul className="lista-mascotas">
          {mascotas.map((m) => (
            <FilaMascota key={m.id} mascota={m} onVinculada={cargar} onEliminada={cargar} />
          ))}
        </ul>
      )}

      <Link className="boton" to="/mascotas/nueva">Cargar mascota</Link>
      <button className="boton secundario" onClick={cerrarSesion}>Cerrar sesión</button>
    </main>
  )
}
