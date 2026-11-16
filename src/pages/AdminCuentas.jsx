import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

function formatearFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function enlaceMapa(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
}

function DetalleCuenta({ detalle }) {
  return (
    <div className="admin-detalle">
      <p className="ayuda">
        Último ingreso: {formatearFecha(detalle.ultimo_ingreso)} · Avisos dados: {detalle.avisos_dados}
      </p>

      {detalle.mascotas.length === 0 ? (
        <p className="ayuda">Esta cuenta no cargó mascotas.</p>
      ) : (
        <ul className="admin-mascotas">
          {detalle.mascotas.map((m) => (
            <li key={m.id}>
              <strong>{m.nombre}</strong>{' '}
              <span className="ayuda">
                {m.especie}{m.raza ? ` · ${m.raza}` : ''}{m.activa ? '' : ' · desactivada'}
              </span>
              <span className="ayuda">
                Placa: {m.placa || 'sin placa'} · Escaneos: {m.escaneos} · Avisos: {m.avistamientos}
              </span>
              {m.caso_abierto && (
                <span className="ayuda">
                  Caso abierto: {m.caso_abierto === 'perdida' ? 'perdida' : 'posible pérdida'}
                </span>
              )}
              {m.domicilio_lat != null && m.domicilio_lng != null ? (
                <span className="ayuda">
                  Domicilio: {Number(m.domicilio_lat).toFixed(5)}, {Number(m.domicilio_lng).toFixed(5)} (radio{' '}
                  {m.radio_metros} m) ·{' '}
                  <a href={enlaceMapa(m.domicilio_lat, m.domicilio_lng)} target="_blank" rel="noreferrer">
                    Ver en el mapa
                  </a>
                </span>
              ) : (
                <span className="ayuda">Domicilio: sin cargar</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ERRORES_BAJA = {
  cuenta_propia: 'No podés eliminar tu propia cuenta.',
  cuenta_admin: 'No se puede eliminar una cuenta de administrador.',
  cuenta_no_encontrada: 'No encontramos esa cuenta.',
  no_autorizado: 'Tu cuenta no tiene permiso para esto.',
}

export default function AdminCuentas() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [cuentas, setCuentas] = useState([])
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [eliminando, setEliminando] = useState(null)
  const [miId, setMiId] = useState(null)

  useEffect(() => {
    async function iniciar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      setMiId(session.user.id)

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .maybeSingle()

      if (perfil?.rol !== 'admin') {
        navigate('/panel')
        return
      }

      const { data, error: errorRpc } = await supabase.rpc('admin_listar_cuentas')
      if (errorRpc) setError('No pudimos cargar las cuentas: ' + errorRpc.message)
      setCuentas(data || [])
      setVerificando(false)
    }
    iniciar()
  }, [navigate])

  async function verDetalle(id) {
    if (abierta === id) {
      setAbierta(null)
      setDetalle(null)
      return
    }
    setAbierta(id)
    setDetalle(null)
    setCargandoDetalle(true)
    const { data, error: errorRpc } = await supabase.rpc('admin_detalle_cuenta', { p_id: id })
    setCargandoDetalle(false)
    if (errorRpc) {
      setError('No pudimos cargar el detalle: ' + errorRpc.message)
      return
    }
    setDetalle(data)
  }

  async function eliminar(cuenta) {
    const nombre = cuenta.nombre || cuenta.email || 'esta cuenta'
    const confirmado = window.confirm(
      `¿Eliminar definitivamente la cuenta de ${nombre}?\n\nSe borran su cuenta, sus mascotas, fotos, casos, escaneos y avisos. No se puede deshacer.`,
    )
    if (!confirmado) return

    setEliminando(cuenta.id)
    setError(null)
    const { data, error: errorFn } = await supabase.functions.invoke('eliminar-cuenta', {
      body: { id: cuenta.id },
    })

    // Cuando la función responde con un error HTTP, el código viene en el cuerpo de la respuesta.
    let codigo = data?.ok === false ? data.error : null
    if (errorFn) {
      try {
        codigo = (await errorFn.context.json())?.error
      } catch {
        codigo = 'desconocido'
      }
    }

    if (codigo) {
      setError(ERRORES_BAJA[codigo] || 'No pudimos eliminar la cuenta. Probá de nuevo.')
      setEliminando(null)
      return
    }

    const { data: lista } = await supabase.rpc('admin_listar_cuentas')
    setCuentas(lista || [])
    setAbierta(null)
    setDetalle(null)
    setEliminando(null)
  }

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  const texto = busqueda.trim().toLowerCase()
  const visibles = cuentas.filter((c) =>
    !texto ||
    [c.nombre, c.email, c.telefono].some((v) => (v || '').toLowerCase().includes(texto)),
  )

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Cuentas</h1>
      <p className="ayuda">
        {cuentas.length} cuentas registradas. <Link to="/admin/placas">Inventario de placas</Link>
      </p>

      <input
        className="entrada"
        type="search"
        placeholder="Buscar por nombre, email o teléfono"
        aria-label="Buscar cuenta"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {error && <p className="ayuda error" role="alert">{error}</p>}

      {visibles.length === 0 ? (
        <p className="ayuda">No hay cuentas que coincidan.</p>
      ) : (
        <ul className="lista-mascotas">
          {visibles.map((c) => (
            <li key={c.id}>
              <div>
                <span className="nombre">
                  {c.nombre || 'Sin nombre'}{c.rol === 'admin' ? ' (admin)' : ''}
                </span>
                <span className="ayuda">{c.email || 'Sin email'} · {c.telefono || 'Sin teléfono'}</span>
                <span className="ayuda">
                  Alta: {formatearFecha(c.creado_en)} · Mascotas activas: {c.mascotas_activas}
                </span>
                <button
                  className="boton-accion"
                  type="button"
                  aria-expanded={abierta === c.id}
                  onClick={() => verDetalle(c.id)}
                >
                  {abierta === c.id ? 'Ocultar detalle' : 'Ver detalle'}
                </button>
                {c.rol !== 'admin' && c.id !== miId && (
                  <button
                    className="boton-accion peligro"
                    type="button"
                    disabled={eliminando === c.id}
                    onClick={() => eliminar(c)}
                  >
                    {eliminando === c.id ? 'Eliminando…' : 'Eliminar cuenta'}
                  </button>
                )}
                {abierta === c.id && cargandoDetalle && <p className="ayuda">Cargando…</p>}
                {abierta === c.id && detalle && <DetalleCuenta detalle={detalle} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
