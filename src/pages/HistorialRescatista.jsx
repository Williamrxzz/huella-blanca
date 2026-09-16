import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const ETIQUETA_SITUACION = {
  conmigo: 'Estaba con vos',
  la_vi_pasar: 'La viste pasar',
}

const MOTIVOS_ERROR = {
  caso_no_habilitado: 'Ese reencuentro todavía no está habilitado para generar el código.',
  caso_ya_canjeado: 'Ya generaste un código para este reencuentro.',
  agradecimiento_no_disponible: 'Ese comercio ya no tiene una placa disponible.',
  tope_alcanzado: 'Ese comercio ya entregó todas las placas que tenía disponibles.',
  refugio_no_valido: 'Elegí un refugio válido.',
  accion_invalida: 'Elegí si vas a retirarla o donarla.',
}

function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function GenerarCanje({ reencuentro, comercios, refugios, onGenerado }) {
  const [comercioId, setComercioId] = useState(comercios[0]?.id || '')
  const [accion, setAccion] = useState('retirar')
  const [refugioId, setRefugioId] = useState(refugios[0]?.id || '')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function generar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const { data, error: errorRpc } = await supabase.rpc('generar_canje', {
      p_caso_id: reencuentro.id,
      p_agradecimiento_id: comercioId,
      p_accion: accion,
      p_refugio_id: accion === 'donar' ? refugioId : null,
    })

    setEnviando(false)

    if (errorRpc || !data?.ok) {
      setError(MOTIVOS_ERROR[data?.motivo] || 'No pudimos generar el código.')
      return
    }

    onGenerado()
  }

  return (
    <form className="formulario-aviso" onSubmit={generar}>
      <select className="entrada" aria-label="Dónde retirar la placa" value={comercioId} onChange={(e) => setComercioId(e.target.value)}>
        {comercios.map((c) => (
          <option key={c.id} value={c.id}>{c.comercios?.nombre}</option>
        ))}
      </select>

      <div className="opciones-situacion">
        <label>
          <input type="radio" name={`accion-${reencuentro.id}`} value="retirar" checked={accion === 'retirar'} onChange={() => setAccion('retirar')} />
          Retirarla yo
        </label>
        <label>
          <input type="radio" name={`accion-${reencuentro.id}`} value="donar" checked={accion === 'donar'} onChange={() => setAccion('donar')} />
          Donarla a un refugio
        </label>
      </div>

      {accion === 'donar' && (
        refugios.length === 0 ? (
          <p className="ayuda error">Todavía no hay refugios cargados para donarla.</p>
        ) : (
          <select className="entrada" aria-label="Refugio" value={refugioId} onChange={(e) => setRefugioId(e.target.value)}>
            {refugios.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        )
      )}

      {error && <p className="ayuda error">{error}</p>}

      <button className="boton" type="submit" disabled={enviando || (accion === 'donar' && refugios.length === 0)}>
        {enviando ? 'Generando…' : 'Generar código'}
      </button>
    </form>
  )
}

export default function HistorialRescatista() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [avistamientos, setAvistamientos] = useState([])
  const [reencuentros, setReencuentros] = useState([])
  const [comerciosConPlaca, setComerciosConPlaca] = useState([])
  const [refugiosActivos, setRefugiosActivos] = useState([])
  const [error, setError] = useState(null)

  async function cargar() {
    const { data, error: errorHistorial } = await supabase.rpc('historial_rescatista')

    if (errorHistorial) setError('No pudimos cargar tu historial: ' + errorHistorial.message)
    const reencuentrosData = data?.reencuentros || []
    setAvistamientos(data?.avistamientos || [])
    setReencuentros(reencuentrosData)

    if (reencuentrosData.some((r) => !r.canje_codigo)) {
      // Nunca se pide ni se muestra quién financia la placa (completa o mitad):
      // eso es información administrativa, acá solo interesa dónde retirarla.
      const { data: agradecimientosData } = await supabase
        .from('agradecimientos')
        .select('id, comercios(nombre, telefono)')
        .eq('activo', true)
      setComerciosConPlaca(agradecimientosData || [])

      const { data: refugiosData } = await supabase
        .from('refugios')
        .select('id, nombre')
        .eq('activo', true)
      setRefugiosActivos(refugiosData || [])
    }

    setCargando(false)
  }

  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      await cargar()
    }
    verificarSesion()
  }, [navigate])

  if (cargando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Tu colaboración</h1>
      <p className="ayuda">Cada aviso y cada reencuentro en el que ayudaste queda registrado acá.</p>

      {error && <p className="ayuda error">{error}</p>}

      <h2>Reencuentros logrados</h2>
      {reencuentros.length === 0 ? (
        <p className="ayuda">Todavía ninguna mascota volvió a casa gracias a un aviso tuyo.</p>
      ) : (
        <ul className="lista-mascotas">
          {reencuentros.map((r) => (
            <li key={r.id}>
              {r.mascota_foto
                ? <img className="miniatura" src={r.mascota_foto} alt={r.mascota_nombre} />
                : <div className="miniatura vacia">Sin foto</div>}
              <div>
                <span className="nombre">{r.mascota_nombre}</span>
                <span className="ayuda">Volvió a casa el {formatearFecha(r.cerrado_en)}</span>

                {r.canje_codigo ? (
                  <p className="confirmacion">
                    Código {r.canje_codigo} —{' '}
                    {r.canje_estado === 'donado'
                      ? `donada a ${r.canje_refugio}`
                      : `pendiente de retirar en ${r.canje_comercio}`}
                  </p>
                ) : comerciosConPlaca.length === 0 ? (
                  <p className="ayuda">Todavía no hay ningún comercio con placas disponibles.</p>
                ) : (
                  <GenerarCanje
                    reencuentro={r}
                    comercios={comerciosConPlaca}
                    refugios={refugiosActivos}
                    onGenerado={cargar}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Avisos que diste</h2>
      {avistamientos.length === 0 ? (
        <p className="ayuda">Todavía no avisaste sobre ninguna mascota.</p>
      ) : (
        <ul className="lista-mascotas">
          {avistamientos.map((a) => (
            <li key={a.id}>
              {a.mascota_foto
                ? <img className="miniatura" src={a.mascota_foto} alt={a.mascota_nombre} />
                : <div className="miniatura vacia">Sin foto</div>}
              <div>
                <span className="nombre">{a.mascota_nombre}</span>
                <span className="ayuda">
                  {ETIQUETA_SITUACION[a.situacion] || a.situacion} · {formatearFecha(a.creado_en)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
