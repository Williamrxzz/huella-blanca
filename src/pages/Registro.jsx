import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

export default function Registro() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const placaPendiente = searchParams.get('placa')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [revisarEmail, setRevisarEmail] = useState(false)

  async function crearCuenta(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const { data, error: errorRegistro } = await supabase.auth.signUp({
      email,
      password: contrasena,
      options: { data: { nombre, telefono: telefono.trim() || null } },
    })

    if (errorRegistro) {
      setEnviando(false)
      setError(
        errorRegistro.message.includes('already registered')
          ? 'Ese email ya tiene una cuenta. Iniciá sesión.'
          : errorRegistro.message
      )
      return
    }

    if (!data.session) {
      // El proyecto pide confirmar el email antes de dar la sesión: la placa
      // pendiente (ADM01, activación) se guarda para retomarla en Panel.jsx
      // apenas haya sesión, igual que avisoPendienteId de TRA09.
      if (placaPendiente) localStorage.setItem('placaPendiente', placaPendiente)
      setEnviando(false)
      setRevisarEmail(true)
      return
    }

    const { error: errorPerfil } = await supabase
      .from('perfiles')
      .insert({ id: data.user.id, nombre, telefono: telefono.trim() || null, rol: 'usuario' })

    setEnviando(false)

    if (errorPerfil) {
      setError('La cuenta se creó, pero no pudimos guardar el perfil: ' + errorPerfil.message)
      return
    }

    navigate(placaPendiente ? `/mascotas/nueva?placa=${placaPendiente}` : '/panel')
  }

  if (revisarEmail) return (
    <main className="pagina">
      <Encabezado />
      <h1>Revisá tu email</h1>
      <p className="ayuda">
        Te enviamos un link para confirmar tu cuenta. Después de confirmarla, iniciá sesión.
      </p>
      <Link className="boton secundario" to="/login">Ir a iniciar sesión</Link>
    </main>
  )

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Crear cuenta</h1>
      <p className="ayuda">Para cargar a tu mascota y recibir los avisos.</p>

      <form className="formulario-aviso" onSubmit={crearCuenta}>
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
          type="tel"
          placeholder="Teléfono (opcional)"
          aria-label="Teléfono (opcional)"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          autoComplete="tel"
        />
        <p className="ayuda">
          Para que quien encuentre a tu mascota pueda contactarte. Nunca se muestra en pantalla;
          si no lo cargás ahora, podés hacerlo después desde tu perfil.
        </p>
        <input
          className="entrada"
          type="password"
          placeholder="Contraseña"
          aria-label="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        {error && <p className="ayuda error">{error}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <Link
        className="enlace-discreto"
        to={placaPendiente ? `/login?placa=${placaPendiente}` : '/login'}
      >
        Ya tengo cuenta
      </Link>
    </main>
  )
}
