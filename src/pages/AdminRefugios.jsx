import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'
import NavAdmin from '../components/NavAdmin'

export default function AdminRefugios() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [refugios, setRefugios] = useState([])

  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)

  async function cargar() {
    const { data: refugiosData, error: errorRefugios } = await supabase
      .from('refugios')
      .select('*')
      .order('nombre')

    if (errorRefugios) setError('No pudimos cargar los refugios: ' + errorRefugios.message)
    setRefugios(refugiosData || [])
  }

  useEffect(() => {
    async function verificarAcceso() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .maybeSingle()

      if (perfil?.rol !== 'admin') {
        navigate('/panel')
        return
      }

      await cargar()
      setVerificando(false)
    }
    verificarAcceso()
  }, [navigate])

  async function crearRefugio(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const { error: errorInsert } = await supabase.from('refugios').insert({
      nombre: nombre.trim(),
      contacto: contacto.trim() || null,
      activo: true,
    })

    setEnviando(false)

    if (errorInsert) {
      setError('No pudimos crear el refugio: ' + errorInsert.message)
      return
    }

    setNombre('')
    setContacto('')
    await cargar()
  }

  async function alternarActivo(refugio) {
    setCambiandoEstado(refugio.id)

    const { error: errorUpdate } = await supabase
      .from('refugios')
      .update({ activo: !refugio.activo })
      .eq('id', refugio.id)

    setCambiandoEstado(null)

    if (errorUpdate) {
      setError('No pudimos cambiar el estado: ' + errorUpdate.message)
      return
    }

    await cargar()
  }

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <NavAdmin />
      <h1>Refugios</h1>
      <p className="ayuda">Adónde puede donar la placa un rescatista en vez de retirarla.</p>

      <form className="formulario-aviso" onSubmit={crearRefugio}>
        <input
          className="entrada"
          type="text"
          placeholder="Nombre del refugio"
          aria-label="Nombre del refugio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <input
          className="entrada"
          type="text"
          placeholder="Contacto (opcional)"
          aria-label="Contacto"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
        />

        {error && <p className="ayuda error">{error}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear refugio'}
        </button>
      </form>

      {refugios.length === 0 ? (
        <p className="ayuda">Todavía no hay refugios cargados.</p>
      ) : (
        <ul className="lista-mascotas">
          {refugios.map((r) => (
            <li key={r.id}>
              <div>
                <span className="nombre">
                  {r.nombre} {!r.activo && <span className="ayuda">(inactivo)</span>}
                </span>
                {r.contacto && <span className="ayuda">{r.contacto}</span>}
                <div className="acciones-mascota">
                  <button
                    className="boton-accion"
                    type="button"
                    onClick={() => alternarActivo(r)}
                    disabled={cambiandoEstado === r.id}
                  >
                    {r.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
