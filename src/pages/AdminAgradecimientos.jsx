import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'
import NavAdmin from '../components/NavAdmin'

const TITULO_FIJO = 'Placa grabada de regalo'

const APORTES = {
  completa: 'Aporta la placa completa',
  mitad: 'Aporta la mitad (el proyecto cubre el resto)',
}

export default function AdminAgradecimientos() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [comercios, setComercios] = useState([])
  const [agradecimientos, setAgradecimientos] = useState([])

  const [comercioId, setComercioId] = useState('')
  const [aporte, setAporte] = useState('completa')
  const [maxCanjes, setMaxCanjes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function cargar() {
    const { data: comerciosData } = await supabase
      .from('comercios')
      .select('id, nombre, telefono')
      .eq('activo', true)
      .order('nombre')

    setComercios(comerciosData || [])
    if (comerciosData?.length && !comercioId) setComercioId(comerciosData[0].id)

    const { data: agradecimientosData, error: errorAgradecimientos } = await supabase
      .from('agradecimientos')
      .select('*, comercios(nombre, telefono)')
      .order('id', { ascending: false })

    if (errorAgradecimientos) setError('No pudimos cargar los agradecimientos: ' + errorAgradecimientos.message)
    setAgradecimientos(agradecimientosData || [])
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

  async function crearAgradecimiento(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const { error: errorInsert } = await supabase.from('agradecimientos').insert({
      comercio_id: comercioId,
      titulo: TITULO_FIJO,
      tipo: 'producto',
      aporte,
      max_canjes: maxCanjes ? Number(maxCanjes) : null,
      activo: true,
    })

    setEnviando(false)

    if (errorInsert) {
      setError('No pudimos crear el agradecimiento: ' + errorInsert.message)
      return
    }

    setAporte('completa')
    setMaxCanjes('')
    await cargar()
  }

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <NavAdmin />
      <h1>Agradecimientos</h1>
      <p className="ayuda">
        El agradecimiento es siempre una placa grabada de regalo — nunca dinero. Acá solo se define
        cómo la financia cada comercio adherido.
      </p>

      {comercios.length === 0 ? (
        <p className="ayuda error">Todavía no hay comercios activos. Cargá uno primero en "Comercios adheridos".</p>
      ) : (
        <form className="formulario-aviso" onSubmit={crearAgradecimiento}>
          <select
            className="entrada"
            aria-label="Comercio"
            value={comercioId}
            onChange={(e) => setComercioId(e.target.value)}
            required
          >
            {comercios.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <select
            className="entrada"
            aria-label="Cómo aporta la placa"
            value={aporte}
            onChange={(e) => setAporte(e.target.value)}
          >
            {Object.entries(APORTES).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>

          <input
            className="entrada"
            type="number"
            min="1"
            placeholder="Cantidad máxima de canjes (opcional)"
            aria-label="Cantidad máxima de canjes"
            value={maxCanjes}
            onChange={(e) => setMaxCanjes(e.target.value)}
          />

          {error && <p className="ayuda error">{error}</p>}

          <button className="boton" type="submit" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear agradecimiento'}
          </button>
        </form>
      )}

      {agradecimientos.length === 0 ? (
        <p className="ayuda">Todavía no hay agradecimientos cargados.</p>
      ) : (
        <ul className="lista-mascotas">
          {agradecimientos.map((a) => (
            <li key={a.id}>
              <div>
                <span className="nombre">{a.comercios?.nombre}</span>
                <span className="ayuda">{APORTES[a.aporte] || a.aporte}</span>
                {a.comercios?.telefono && <span className="ayuda">{a.comercios.telefono}</span>}
                {a.max_canjes && <span className="ayuda">Máx. {a.max_canjes} canjes</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
