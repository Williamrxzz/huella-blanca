import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const RUBROS = {
  veterinaria: 'Veterinaria',
  forrajeria: 'Forrajería',
  otro: 'Otro',
}

export default function AdminComercios() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [comercios, setComercios] = useState([])

  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState('veterinaria')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)

  async function cargar() {
    const { data: comerciosData, error: errorComercios } = await supabase
      .from('comercios')
      .select('*')
      .order('creado_en', { ascending: false })

    if (errorComercios) setError('No pudimos cargar los comercios: ' + errorComercios.message)
    setComercios(comerciosData || [])
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

  async function crearComercio(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const { error: errorInsert } = await supabase.from('comercios').insert({
      nombre: nombre.trim(),
      rubro,
      direccion: direccion.trim() || null,
      telefono: telefono.trim() || null,
      activo: true,
    })

    setEnviando(false)

    if (errorInsert) {
      setError('No pudimos crear el comercio: ' + errorInsert.message)
      return
    }

    setNombre('')
    setRubro('veterinaria')
    setDireccion('')
    setTelefono('')
    await cargar()
  }

  async function alternarActivo(comercio) {
    setCambiandoEstado(comercio.id)

    const { error: errorUpdate } = await supabase
      .from('comercios')
      .update({ activo: !comercio.activo })
      .eq('id', comercio.id)

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
      <h1>Comercios adheridos</h1>
      <p className="ayuda">Alta de veterinarias, forrajerías y otros comercios que ofrecen agradecimientos.</p>

      <form className="formulario-aviso" onSubmit={crearComercio}>
        <input
          className="entrada"
          type="text"
          placeholder="Nombre del comercio"
          aria-label="Nombre del comercio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <select
          className="entrada"
          aria-label="Rubro"
          value={rubro}
          onChange={(e) => setRubro(e.target.value)}
        >
          {Object.entries(RUBROS).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>

        <input
          className="entrada"
          type="text"
          placeholder="Dirección (opcional)"
          aria-label="Dirección"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
        />

        <input
          className="entrada"
          type="text"
          placeholder="Teléfono o contacto (opcional)"
          aria-label="Teléfono o contacto"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />

        {error && <p className="ayuda error">{error}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear comercio'}
        </button>
      </form>

      {comercios.length === 0 ? (
        <p className="ayuda">Todavía no hay comercios cargados.</p>
      ) : (
        <ul className="lista-mascotas">
          {comercios.map((c) => (
            <li key={c.id}>
              <div>
                <span className="nombre">
                  {c.nombre} {!c.activo && <span className="ayuda">(inactivo)</span>}
                </span>
                <span className="ayuda">
                  {RUBROS[c.rubro] || c.rubro}
                  {c.direccion ? ` · ${c.direccion}` : ''}
                </span>
                {c.telefono && <span className="ayuda">{c.telefono}</span>}
                <div className="acciones-mascota">
                  <button
                    className="boton-accion"
                    type="button"
                    onClick={() => alternarActivo(c)}
                    disabled={cambiandoEstado === c.id}
                  >
                    {c.activo ? 'Desactivar' : 'Activar'}
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
