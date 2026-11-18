import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'
import Cargando from '../components/Cargando'
import SinFoto from '../components/SinFoto'
import EstadoVacio from '../components/EstadoVacio'
import { HeartHandshake } from 'lucide-react'

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

export default function HistorialColaboracion() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [avistamientos, setAvistamientos] = useState([])
  const [reencuentros, setReencuentros] = useState([])
  const [error, setError] = useState(null)

  async function cargar() {
    const { data, error: errorHistorial } = await supabase.rpc('historial_colaboracion')

    if (errorHistorial) setError('No pudimos cargar tu historial: ' + errorHistorial.message)
    setAvistamientos(data?.avistamientos || [])
    setReencuentros(data?.reencuentros || [])
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

  if (cargando) return <Cargando texto="Cargando tu historial…" />

  return (
    <main className="pagina">
      <Encabezado volver="/panel" />
      <h1>Tu colaboración</h1>
      <p className="ayuda">Cada aviso y cada reencuentro en el que ayudaste queda registrado acá.</p>

      {error && <p className="ayuda error" role="alert">{error}</p>}

      <h2>Reencuentros logrados</h2>
      {reencuentros.length === 0 ? (
        <p className="ayuda">Todavía ninguna mascota volvió a casa gracias a un aviso tuyo.</p>
      ) : (
        <ul className="lista-mascotas">
          {reencuentros.map((r) => (
            <li key={r.id}>
              {r.mascota_foto
                ? <img className="miniatura" src={r.mascota_foto} alt={r.mascota_nombre} />
                : <SinFoto />}
              <div>
                <span className="nombre">{r.mascota_nombre}</span>
                <span className="ayuda">Volvió a casa el {formatearFecha(r.cerrado_en)}</span>

                {(r.mensaje_agradecimiento || r.foto_reencuentro_url) && (
                  <div className="caracter">
                    <strong>El dueño te dejó un agradecimiento</strong>
                    {r.mensaje_agradecimiento && <p>{r.mensaje_agradecimiento}</p>}
                    {r.foto_reencuentro_url && (
                      <img className="foto" src={r.foto_reencuentro_url} alt="Foto del reencuentro" />
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Avisos que diste</h2>
      {avistamientos.length === 0 ? (
        <EstadoVacio icono={HeartHandshake} titulo="Todavía no avisaste sobre ninguna mascota">
          Si encontrás una mascota con una placa de Huella Blanca, escaneá el código y avisá desde su
          ficha: tu ayuda queda registrada acá.
        </EstadoVacio>
      ) : (
        <ul className="lista-mascotas">
          {avistamientos.map((a) => (
            <li key={a.id}>
              {a.mascota_foto
                ? <img className="miniatura" src={a.mascota_foto} alt={a.mascota_nombre} />
                : <SinFoto />}
              <div>
                <span className="nombre">{a.mascota_nombre}</span>
                <span className="ayuda">
                  {ETIQUETA_SITUACION[a.situacion] || a.situacion} · {formatearFecha(a.creado_en)}
                </span>
                {a.mensaje && <span className="ayuda">{a.mensaje}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
