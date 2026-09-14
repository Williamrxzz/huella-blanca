import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'
import NavAdmin from '../components/NavAdmin'

const TIPOS = {
  descuento: 'Descuento',
  producto: 'Producto',
  servicio: 'Servicio',
}

function formatearFecha(fecha) {
  if (!fecha) return null
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR')
}

export default function AdminAgradecimientos() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [comercios, setComercios] = useState([])
  const [agradecimientos, setAgradecimientos] = useState([])

  const [comercioId, setComercioId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('descuento')
  const [vigencia, setVigencia] = useState('')
  const [maxCanjes, setMaxCanjes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function cargar() {
    const { data: comerciosData } = await supabase
      .from('comercios')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')

    setComercios(comerciosData || [])
    if (comerciosData?.length && !comercioId) setComercioId(comerciosData[0].id)

    const { data: agradecimientosData, error: errorAgradecimientos } = await supabase
      .from('agradecimientos')
      .select('*, comercios(nombre)')
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
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      tipo,
      vigencia: vigencia || null,
      max_canjes: maxCanjes ? Number(maxCanjes) : null,
      activo: true,
    })

    setEnviando(false)

    if (errorInsert) {
      setError('No pudimos crear el agradecimiento: ' + errorInsert.message)
      return
    }

    setTitulo('')
    setDescripcion('')
    setTipo('descuento')
    setVigencia('')
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
        Lo que cada comercio ofrece a quien ayuda a reencontrar una mascota — nunca dinero.
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

          <input
            className="entrada"
            type="text"
            placeholder="Título (por ejemplo: 20% en alimento balanceado)"
            aria-label="Título del agradecimiento"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />

          <textarea
            className="entrada"
            placeholder="Descripción (opcional)"
            aria-label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
          />

          <select
            className="entrada"
            aria-label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {Object.entries(TIPOS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>

          <label className="ayuda" htmlFor="vigencia-agradecimiento">Válido hasta (opcional)</label>
          <input
            id="vigencia-agradecimiento"
            className="entrada"
            type="date"
            value={vigencia}
            onChange={(e) => setVigencia(e.target.value)}
          />

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
                <span className="nombre">{a.titulo}</span>
                <span className="ayuda">
                  {a.comercios?.nombre} · {TIPOS[a.tipo] || a.tipo}
                </span>
                {a.descripcion && <span className="ayuda">{a.descripcion}</span>}
                <span className="ayuda">
                  {a.vigencia ? `Válido hasta ${formatearFecha(a.vigencia)}` : 'Sin fecha límite'}
                  {a.max_canjes ? ` · Máx. ${a.max_canjes} canjes` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
