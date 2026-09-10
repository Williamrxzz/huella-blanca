import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function iniciarSesion(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: contrasena,
    })

    setEnviando(false)
    if (error) setError('Email o contraseña incorrectos')
    else navigate('/panel')
  }

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Ingresar</h1>
      <p className="ayuda">Accedé para gestionar la búsqueda de tu mascota.</p>

      <form className="formulario-aviso" onSubmit={iniciarSesion}>
        <input
          className="entrada"
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="entrada"
          type="password"
          placeholder="Contraseña"
          aria-label="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="ayuda error">{error}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <Link className="enlace-discreto" to="/registro">Crear una cuenta</Link>
    </main>
  )
}
