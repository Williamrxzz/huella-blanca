import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Panel() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [mascotas, setMascotas] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const { data } = await supabase
        .from('mascotas')
        .select('*')
        .order('creado_en', { ascending: false })

      setMascotas(data || [])
      setCargando(false)
    }
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
            <li key={m.id}>
              <span className="nombre">{m.nombre}</span>
              <span className="ayuda">{m.especie}{m.raza ? ` · ${m.raza}` : ''}</span>
            </li>
          ))}
        </ul>
      )}

      <button className="boton secundario" onClick={cerrarSesion}>Cerrar sesión</button>
    </main>
  )
}
