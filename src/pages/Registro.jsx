import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'
import CampoTelefono from '../components/CampoTelefono'
import AceptoPrivacidad from '../components/AceptoPrivacidad'
import { normalizarTelefono } from '../lib/telefono'

export default function Registro() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [revisarEmail, setRevisarEmail] = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)
  const [intentoEnviar, setIntentoEnviar] = useState(false)

  async function crearCuenta(e) {
    e.preventDefault()
    setIntentoEnviar(true)
    // TRA05: el teléfono se guarda ya en formato internacional; uno que no se
    // pueda marcar no se guarda (el campo dice qué le falta). Es opcional:
    // vacío, pasa.
    const tel = normalizarTelefono(telefono)
    if (!tel.ok) return
    setEnviando(true)
    setError(null)

    const { data, error: errorRegistro } = await supabase.auth.signUp({
      email,
      password: contrasena,
      // La fecha de aceptación viaja en los metadatos por si el perfil se crea
      // después (confirmación de email pendiente, ver Panel.jsx).
      options: { data: { nombre, telefono: tel.valor, privacidad_aceptada_en: new Date().toISOString() } },
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
      // El proyecto pide confirmar el email antes de dar la sesión.
      setEnviando(false)
      setRevisarEmail(true)
      return
    }

    const { error: errorPerfil } = await supabase
      .from('perfiles')
      .insert({ id: data.user.id, nombre, telefono: tel.valor, privacidad_aceptada_en: new Date().toISOString() })

    setEnviando(false)

    if (errorPerfil) {
      setError('La cuenta se creó, pero no pudimos guardar el perfil: ' + errorPerfil.message)
      return
    }

    navigate('/panel')
  }

  if (revisarEmail) return (
    <main className="pagina">
      <Encabezado volver="/login" />
      <h1>Revisá tu email</h1>
      <p className="ayuda">
        Te enviamos un link para confirmar tu cuenta. Después de confirmarla, iniciá sesión.
      </p>
      <Link className="boton secundario" to="/login">Ir a iniciar sesión</Link>
    </main>
  )

  return (
    <main className="pagina">
      <Encabezado volver="/login" />
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
        <CampoTelefono valor={telefono} onCambio={setTelefono} mostrarError={intentoEnviar} />
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
        <AceptoPrivacidad aceptado={aceptaPrivacidad} onCambio={setAceptaPrivacidad} />

        {error && <p className="ayuda error" role="alert">{error}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <Link className="enlace-discreto" to="/login">Ya tengo cuenta</Link>
    </main>
  )
}
