import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'
import CampoTelefono from '../components/CampoTelefono'
import { normalizarTelefono, telefonoLegible } from '../lib/telefono'
import { Trash2 } from 'lucide-react'

export default function Perfil() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [guardado, setGuardado] = useState(false)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)
  const [eliminando, setEliminando] = useState(false) // muestra la confirmación
  const [palabra, setPalabra] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [errorBorrado, setErrorBorrado] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const { data: perfil, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('nombre, telefono, rol')
        .eq('id', session.user.id)
        .maybeSingle()

      if (errorPerfil) setError('No pudimos cargar tu perfil: ' + errorPerfil.message)
      setNombre(perfil?.nombre || '')
      setTelefono(telefonoLegible(perfil?.telefono) || '')
      setEsAdmin(perfil?.rol === 'admin')
      setCargando(false)
    }
    cargar()
  }, [navigate])

  async function guardar(e) {
    e.preventDefault()
    setIntentoGuardar(true)
    const tel = normalizarTelefono(telefono)
    if (!tel.ok) return
    setGuardando(true)
    setError(null)
    setGuardado(false)

    const { data: { session } } = await supabase.auth.getSession()

    const { error: errorUpdate } = await supabase
      .from('perfiles')
      .update({ nombre: nombre.trim(), telefono: tel.valor })
      .eq('id', session.user.id)

    setGuardando(false)

    if (errorUpdate) setError('No pudimos guardar los cambios: ' + errorUpdate.message)
    else {
      setGuardado(true)
      setIntentoGuardar(false)
      setTelefono(telefonoLegible(tel.valor))
    }
  }

  // Derecho de supresión (Ley 25.326): la persona borra su cuenta sola, al
  // instante y por completo, con la misma Edge Function que usa el
  // administrador (`eliminar-cuenta`, modo `propia`).
  async function eliminarMiCuenta() {
    setBorrando(true)
    setErrorBorrado(null)
    const { data, error: errorFuncion } = await supabase.functions.invoke('eliminar-cuenta', { body: { propia: true } })
    if (errorFuncion || !data?.ok) {
      setBorrando(false)
      setErrorBorrado('No pudimos eliminar la cuenta. Probá de nuevo en un momento.')
      return
    }
    await supabase.auth.signOut({ scope: 'local' })
    try { localStorage.removeItem('avisoPendienteId') } catch { /* sin almacenamiento */ }
    navigate('/', { replace: true, state: { cuentaEliminada: true } })
  }

  if (cargando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado volver="/panel" />
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
        <CampoTelefono
          valor={telefono}
          onCambio={(v) => { setTelefono(v); setGuardado(false) }}
          mostrarError={intentoGuardar}
        />

        {error && <p className="ayuda error" role="alert">{error}</p>}
        {guardado && <p className="confirmacion">Cambios guardados.</p>}

        <button className="boton" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      <section className="zona-eliminar">
        <h2>Eliminar mi cuenta</h2>
        {esAdmin ? (
          <p className="ayuda">
            Las cuentas de administración no se eliminan desde acá, para que la app no quede sin
            nadie que la administre.
          </p>
        ) : !eliminando ? (
          <button className="boton peligro" type="button" onClick={() => setEliminando(true)}>
            <Trash2 size={18} aria-hidden="true" /> Eliminar mi cuenta
          </button>
        ) : (
          <div className="confirmar-eliminar" role="alertdialog" aria-labelledby="titulo-eliminar">
            <p id="titulo-eliminar">
              <strong>Se borra todo, al instante y para siempre:</strong> tus datos, tus mascotas y
              sus fotos, sus casos, avisos y escaneos. Sus placas dejan de funcionar. Los avisos que
              diste sobre mascotas de otras personas quedan, pero sin tu nombre ni tu contacto.
              No se puede deshacer.
            </p>
            <label className="ayuda" htmlFor="palabra-eliminar">Para confirmar, escribí ELIMINAR</label>
            <input
              id="palabra-eliminar"
              className="entrada"
              type="text"
              value={palabra}
              onChange={(e) => setPalabra(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
            />
            {errorBorrado && <p className="ayuda error" role="alert">{errorBorrado}</p>}
            <button
              className="boton peligro"
              type="button"
              onClick={eliminarMiCuenta}
              disabled={borrando || palabra.trim().toUpperCase() !== 'ELIMINAR'}
            >
              {borrando ? 'Eliminando…' : 'Eliminar mi cuenta para siempre'}
            </button>
            <button className="boton terciario" type="button" onClick={() => { setEliminando(false); setPalabra('') }} disabled={borrando}>
              Cancelar
            </button>
          </div>
        )}
        <p className="ayuda"><Link to="/privacidad">Política de privacidad</Link></p>
      </section>
    </main>
  )
}
