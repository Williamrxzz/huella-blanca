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

const DIAS_EN_PAPELERA = 30

function diasRestantes(eliminadaEn) {
  if (!eliminadaEn) return DIAS_EN_PAPELERA
  const transcurridos = (Date.now() - new Date(eliminadaEn).getTime()) / 86400000
  return Math.max(0, Math.ceil(DIAS_EN_PAPELERA - transcurridos))
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
  const [procesando, setProcesando] = useState(null)
  const [miId, setMiId] = useState(null)
  const [vista, setVista] = useState('cuentas')

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

  async function cambiarEstado(cuenta, eliminar) {
    const nombre = cuenta.nombre || cuenta.email || 'esta cuenta'
    if (eliminar) {
      const confirmado = window.confirm(
        `¿Eliminar la cuenta de ${nombre}?\n\nVa a la papelera y no podrá volver a ingresar. Tenés ${DIAS_EN_PAPELERA} días para restaurarla; después se borra definitivamente, con sus mascotas, fotos, casos y escaneos, y no se puede recuperar.`,
      )
      if (!confirmado) return
    }

    setProcesando(cuenta.id)
    setError(null)
    const { data, error: errorRpc } = await supabase.rpc(
      eliminar ? 'admin_eliminar_cuenta' : 'admin_restaurar_cuenta',
      { p_id: cuenta.id },
    )

    if (errorRpc || data?.ok === false) {
      const codigo = errorRpc?.message || data?.error
      setError(ERRORES_BAJA[codigo] || 'No pudimos completar la acción.')
      setProcesando(null)
      return
    }

    const { data: lista } = await supabase.rpc('admin_listar_cuentas')
    setCuentas(lista || [])
    setAbierta(null)
    setDetalle(null)
    setProcesando(null)
  }

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  const enPapelera = vista === 'papelera'
  const cantidadPapelera = cuentas.filter((c) => c.activa === false).length
  const texto = busqueda.trim().toLowerCase()
  const visibles = cuentas.filter((c) =>
    (c.activa === false) === enPapelera &&
    (!texto ||
    [c.nombre, c.email, c.telefono].some((v) => (v || '').toLowerCase().includes(texto))),
  )

  return (
    <main className="pagina">
      <Encabezado />
      <h1>{enPapelera ? 'Papelera' : 'Cuentas'}</h1>
      <p className="ayuda">
        {enPapelera
          ? `Las cuentas se borran definitivamente a los ${DIAS_EN_PAPELERA} días. Mientras tanto se pueden restaurar.`
          : `${cuentas.length - cantidadPapelera} cuentas registradas.`}{' '}
        <Link to="/admin/placas">Inventario de placas</Link>
      </p>

      <div className="admin-pestanas" role="group" aria-label="Vista">
        <button
          className={`boton-accion${enPapelera ? '' : ' activo'}`}
          type="button"
          aria-pressed={!enPapelera}
          onClick={() => { setVista('cuentas'); setAbierta(null); setDetalle(null) }}
        >
          Cuentas
        </button>
        <button
          className={`boton-accion${enPapelera ? ' activo' : ''}`}
          type="button"
          aria-pressed={enPapelera}
          onClick={() => { setVista('papelera'); setAbierta(null); setDetalle(null) }}
        >
          Papelera ({cantidadPapelera})
        </button>
      </div>

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
        <p className="ayuda">{enPapelera ? 'La papelera está vacía.' : 'No hay cuentas que coincidan.'}</p>
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
                  Alta: {formatearFecha(c.creado_en)}
                  {enPapelera ? '' : ` · Mascotas activas: ${c.mascotas_activas}`}
                </span>
                {enPapelera && (
                  <span className="ayuda error">
                    Eliminada el {formatearFecha(c.eliminada_en)}. Se borra definitivamente en{' '}
                    {diasRestantes(c.eliminada_en)} {diasRestantes(c.eliminada_en) === 1 ? 'día' : 'días'}.
                  </span>
                )}
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
                    className="boton-accion"
                    type="button"
                    disabled={procesando === c.id}
                    onClick={() => cambiarEstado(c, c.activa !== false)}
                  >
                    {procesando === c.id ? 'Procesando…' : c.activa === false ? 'Restaurar cuenta' : 'Eliminar cuenta'}
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
