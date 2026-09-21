import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const ESTADOS = {
  sin_asignar: 'Sin asignar',
  baja: 'Dada de baja',
  activa: 'Activa',
  perdida: 'Perdida',
}

const ERRORES_LOTE = {
  cantidad_invalida: 'La cantidad tiene que ser entre 1 y 50.',
  no_autorizado: 'Tu cuenta no tiene permiso para generar placas.',
}

function estadoDeLaPlaca(placa, mascotasConCasoAbierto) {
  if (placa.estado === 'baja') return 'baja'
  // El vínculo real con una mascota manda por sobre el texto de "estado",
  // que puede quedar desactualizado si la mascota se borró de otra forma.
  if (!placa.mascota_id) return 'sin_asignar'
  if (mascotasConCasoAbierto.has(placa.mascota_id)) return 'perdida'
  return 'activa'
}

function TarjetaQR({ codigo }) {
  const contenedorRef = useRef(null)
  const url = `${window.location.origin}/m/${codigo}`

  function descargar() {
    const canvas = contenedorRef.current?.querySelector('canvas')
    if (!canvas) return
    const enlace = document.createElement('a')
    enlace.download = `placa-${codigo}.png`
    enlace.href = canvas.toDataURL('image/png')
    enlace.click()
  }

  return (
    <li>
      <div>
        <span className="nombre">{codigo}</span>
        <div className="qr" ref={contenedorRef}>
          <QRCodeCanvas value={url} size={160} level="H" includeMargin />
        </div>
        <button className="boton-accion" type="button" onClick={descargar}>Descargar QR</button>
      </div>
    </li>
  )
}

export default function AdminPlacas() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [placas, setPlacas] = useState([])
  const [mascotasConCasoAbierto, setMascotasConCasoAbierto] = useState(new Set())
  const [error, setError] = useState(null)
  const [cantidadLote, setCantidadLote] = useState(10)
  const [generandoLote, setGenerandoLote] = useState(false)
  const [errorLote, setErrorLote] = useState(null)
  const [ultimoLote, setUltimoLote] = useState(null)

  async function cargarPlacas() {
    const { data: placasData, error: errorPlacas } = await supabase
      .from('placas')
      .select('*, mascotas(nombre)')
      .order('creado_en', { ascending: false })

    if (errorPlacas) setError('No pudimos cargar las placas: ' + errorPlacas.message)
    setPlacas(placasData || [])

    const { data: casosAbiertos } = await supabase
      .from('casos_perdida')
      .select('mascota_id')
      .in('estado', ['perdida', 'posible_perdida'])

    setMascotasConCasoAbierto(new Set((casosAbiertos || []).map((c) => c.mascota_id)))
  }

  async function generarLote(e) {
    e.preventDefault()
    setGenerandoLote(true)
    setErrorLote(null)
    setUltimoLote(null)

    const { data, error: errorRpc } = await supabase.rpc('generar_lote_placas', {
      p_cantidad: Number(cantidadLote),
    })

    setGenerandoLote(false)

    if (errorRpc) {
      setErrorLote(ERRORES_LOTE[errorRpc.message] || 'No pudimos generar el lote.')
      return
    }

    setUltimoLote(data?.codigos || [])
    await cargarPlacas()
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

      await cargarPlacas()
      setVerificando(false)
    }
    verificarAcceso()
  }, [navigate])

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Inventario de placas</h1>
      <p className="ayuda">Estado de cada placa generada, para controlar cuántas están libres, activas o perdidas.</p>

      <form className="formulario-aviso" onSubmit={generarLote}>
        <label className="campo-archivo">
          Generar lote (cantidad)
          <input
            className="entrada"
            type="number"
            value={cantidadLote}
            onChange={(e) => setCantidadLote(e.target.value)}
            min={1}
            max={50}
          />
        </label>

        {errorLote && <p className="ayuda error">{errorLote}</p>}

        <button className="boton" type="submit" disabled={generandoLote}>
          {generandoLote ? 'Generando…' : 'Generar lote'}
        </button>
      </form>

      {ultimoLote && ultimoLote.length > 0 && (
        <>
          <h2>Lote generado — descargá cada QR para imprimir</h2>
          <ul className="lista-mascotas">
            {ultimoLote.map((codigo) => (
              <TarjetaQR key={codigo} codigo={codigo} />
            ))}
          </ul>
        </>
      )}

      {error && <p className="ayuda error">{error}</p>}

      {placas.length === 0 ? (
        <p className="ayuda">Todavía no hay placas generadas.</p>
      ) : (
        <ul className="lista-mascotas">
          {placas.map((p) => {
            const estado = estadoDeLaPlaca(p, mascotasConCasoAbierto)
            return (
              <li key={p.id}>
                <div>
                  <span className="nombre">{p.codigo}</span>
                  <span className="ayuda">
                    {p.mascotas?.nombre ? `Vinculada a ${p.mascotas.nombre}` : 'Sin mascota vinculada'}
                  </span>
                  <span className={`etiqueta-estado-placa etiqueta-estado-placa-${estado}`}>
                    {ESTADOS[estado]}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
