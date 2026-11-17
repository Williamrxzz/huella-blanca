// Recuperar la contraseña: se pide el email y Supabase manda un enlace que
// lleva a /restablecer. Un dueño que olvidó la clave no puede quedar afuera
// justo cuando su mascota se pierde.
//
// La respuesta es siempre la misma, exista o no la cuenta: así esta pantalla
// no sirve para averiguar qué emails están registrados.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState(null)

  async function pedirEnlace(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error: errorEnvio } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    setEnviando(false)
    if (errorEnvio) {
      // El servicio de email de Supabase limita cuántos se mandan por hora.
      setError(errorEnvio.status === 429 || /rate limit/i.test(errorEnvio.message)
        ? 'Pediste varios enlaces seguidos. Esperá unos minutos y probá de nuevo.'
        : 'No pudimos mandar el enlace. Revisá tu conexión y probá de nuevo.')
      return
    }
    setEnviado(true)
  }

  if (enviado) return (
    <main className="pagina">
      <Encabezado volver="/login" />
      <h1>Revisá tu email</h1>
      <p className="ayuda">
        Si hay una cuenta con <strong>{email.trim()}</strong>, te mandamos un enlace para elegir una
        contraseña nueva. Puede tardar unos minutos; mirá también en spam.
      </p>
      <Link className="boton secundario" to="/login">Volver a ingresar</Link>
    </main>
  )

  return (
    <main className="pagina">
      <Encabezado volver="/login" />
      <h1>¿Olvidaste tu contraseña?</h1>
      <p className="ayuda">Escribí el email de tu cuenta y te mandamos un enlace para elegir una nueva.</p>

      <form className="formulario-aviso" onSubmit={pedirEnlace}>
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
        {error && <p className="ayuda error" role="alert">{error}</p>}
        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Mandarme el enlace'}
        </button>
      </form>
    </main>
  )
}
