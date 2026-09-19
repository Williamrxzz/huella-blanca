import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

export default function Perfil() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const { data: perfil, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('nombre, telefono')
        .eq('id', session.user.id)
        .maybeSingle()

      if (errorPerfil) setError('No pudimos cargar tu perfil: ' + errorPerfil.message)
      setNombre(perfil?.nombre || '')
      setTelefono(perfil?.telefono || '')
      setCargando(false)
    }
    cargar()
  }, [navigate])

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setGuardado(false)

    const { data: { session } } = await supabase.auth.getSession()

    const { error: errorUpdate } = await supabase
      .from('perfiles')
      .update({ nombre: nombre.trim(), telefono: telefono.trim() || null })
      .eq('id', session.user.id)

    setGuardando(false)

    if (errorUpdate) setError('No pudimos guardar los cambios: ' + errorUpdate.message)
    else setGuardado(true)
  }

  if (cargando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Tu perfil</h1>
      <p className="ayuda">
        El teléfono es el que usa quien encuentra a tu mascota para contactarte — nunca se
        muestra en pantalla, solo lo usa el botón de llamar o escribir por WhatsApp.
      </p>

      <form className="formulario-aviso" onSubmit={guardar}>
        <input
          className="entrada"
          type="text"
          placeholder="Tu nombre"
          aria-label="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="name"
          required
        />
        <input
          className="entrada"
          type="tel"
          placeholder="Teléfono (opcional)"
          aria-label="Teléfono (opcional)"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          autoComplete="tel"
        />

        {error && <p className="ayuda error">{error}</p>}
        {guardado && <p className="confirmacion">Cambios guardados.</p>}

        <button className="boton" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      <Link className="enlace-discreto" to="/panel">Volver al panel</Link>
    </main>
  )
}
