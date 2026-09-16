import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const ETIQUETA_SITUACION = {
  conmigo: 'Estaba con vos',
  la_vi_pasar: 'La viste pasar',
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

export default function HistorialRescatista() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [avistamientos, setAvistamientos] = useState([])
  const [reencuentros, setReencuentros] = useState([])
  const [comerciosConPlaca, setComerciosConPlaca] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const { data, error: errorHistorial } = await supabase.rpc('historial_rescatista')

      if (errorHistorial) setError('No pudimos cargar tu historial: ' + errorHistorial.message)
      const reencuentrosData = data?.reencuentros || []
      setAvistamientos(data?.avistamientos || [])
      setReencuentros(reencuentrosData)

      if (reencuentrosData.length > 0) {
        // Nunca se pide ni se muestra quién financia la placa (completa o mitad):
        // eso es información administrativa, acá solo interesa dónde retirarla.
        const { data: agradecimientosData } = await supabase
          .from('agradecimientos')
          .select('id, comercios(nombre, telefono)')
          .eq('activo', true)

        setComerciosConPlaca(agradecimientosData || [])
      }

      setCargando(false)
    }
    cargar()
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
              </div>
            </li>
          ))}
        </ul>
      )}

      {comerciosConPlaca.length > 0 && (
        <div className="caracter">
          <strong>Tenés una placa grabada de regalo esperándote</strong>
          <p>Podés retirarla en cualquiera de estos comercios adheridos, o donarla a un refugio si preferís:</p>
          <ul className="lista-mascotas">
            {comerciosConPlaca.map((a) => (
              <li key={a.id}>
                <div>
                  <span className="nombre">{a.comercios?.nombre}</span>
                  {a.comercios?.telefono && <span className="ayuda">{a.comercios.telefono}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
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
