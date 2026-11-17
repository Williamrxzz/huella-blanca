// Elegir una contraseña nueva, desde el enlace del email de recuperación.
// El enlace trae un token que el cliente de Supabase convierte en una sesión
// de recuperación; con esa sesión se puede cambiar la contraseña.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

export default function Restablecer() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState('verificando') // verificando | listo | vencido | guardado
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    // getSession espera a que el cliente termine de leer el token del enlace.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (vigente) setEstado(session ? 'listo' : 'vencido')
    })
    return () => { vigente = false }
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setError(null)
    if (contrasena !== repetida) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    setGuardando(true)
    const { error: errorGuardar } = await supabase.auth.updateUser({ password: contrasena })
    setGuardando(false)
    if (errorGuardar) {
      setError(errorGuardar.code === 'same_password'
        ? 'Elegí una contraseña distinta de la anterior.'
        : errorGuardar.code === 'weak_password'
          ? 'Esa contraseña es muy débil. Usá al menos 6 caracteres.'
          : 'No pudimos guardarla: ' + errorGuardar.message)
      return
    }
    setEstado('guardado')
  }

  if (estado === 'verificando') return <main className="pagina"><p>Un momento…</p></main>

  if (estado === 'vencido') return (
    <main className="pagina">
      <Encabezado volver="/login" />
      <h1>El enlace ya no sirve</h1>
      <p className="ayuda">
        Puede que haya vencido o que ya lo hayas usado. Pedí uno nuevo y usalo dentro de la hora.
      </p>
      <Link className="boton" to="/recuperar">Pedir otro enlace</Link>
    </main>
  )

  if (estado === 'guardado') return (
    <main className="pagina">
      <Encabezado />
      <h1>Listo</h1>
      <p className="confirmacion" role="status">Tu contraseña nueva quedó guardada.</p>
      <button className="boton" type="button" onClick={() => navigate('/panel')}>Ir a mi panel</button>
    </main>
  )

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Elegí una contraseña nueva</h1>
      <form className="formulario-aviso" onSubmit={guardar}>
        <input
          className="entrada"
          type="password"
          placeholder="Contraseña nueva"
          aria-label="Contraseña nueva"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <input
          className="entrada"
          type="password"
          placeholder="Repetila"
          aria-label="Repetir la contraseña nueva"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        {error && <p className="ayuda error" role="alert">{error}</p>}
        <button className="boton" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </main>
  )
}
