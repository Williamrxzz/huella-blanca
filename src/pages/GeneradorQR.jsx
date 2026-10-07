import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

export default function GeneradorQR() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const codigoParam = (searchParams.get('codigo') || '').trim().toUpperCase()
  const esMascotaNueva = searchParams.get('nueva') === '1'
  const contenedorRef = useRef(null)

  const [verificando, setVerificando] = useState(true)
  const [placa, setPlaca] = useState(null)
  const [sinAcceso, setSinAcceso] = useState(false)

  useEffect(() => {
    async function verificar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      if (!codigoParam) {
        setVerificando(false)
        return
      }

      // La RLS de "placas" ya solo deja ver las propias (unidas a una
      // mascota del dueño autenticado): si no aparece, no es suya.
      const { data } = await supabase
        .from('placas')
        .select('codigo, mascotas(nombre)')
        .eq('codigo', codigoParam)
        .maybeSingle()

      if (!data) setSinAcceso(true)
      else setPlaca(data)
      setVerificando(false)
    }
    verificar()
  }, [codigoParam, navigate])

  const url = placa ? `${window.location.origin}/m/${placa.codigo}` : ''

  function obtenerBlob() {
    const canvas = contenedorRef.current?.querySelector('canvas')
    if (!canvas) return Promise.resolve(null)
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  function descargar(blob) {
    const enlace = document.createElement('a')
    enlace.download = `placa-${placa.codigo}.png`
    enlace.href = URL.createObjectURL(blob)
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }

  async function compartirQR() {
    const blob = await obtenerBlob()
    if (!blob) return

    const archivo = new File([blob], `placa-${placa.codigo}.png`, { type: 'image/png' })
    const puedeCompartirArchivo = navigator.canShare?.({ files: [archivo] })

    if (puedeCompartirArchivo) {
      try {
        await navigator.share({
          files: [archivo],
          title: `Código QR de ${placa.mascotas?.nombre || 'tu mascota'}`,
        })
        return
      } catch (err) {
        // Si la persona cancela el panel de compartir, no hacemos nada más.
        // Cualquier otro error cae en la descarga, igual que si no soportara compartir.
        if (err?.name === 'AbortError') return
      }
    }

    descargar(blob)
  }

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <h1>{esMascotaNueva ? '¡Mascota cargada!' : 'Código QR'}</h1>

      {sinAcceso && (
        <p className="ayuda error">No tenés acceso a esa placa.</p>
      )}

      {!codigoParam && !sinAcceso && (
        <p className="ayuda">Entrá desde el panel de tu mascota para ver su código QR.</p>
      )}

      {placa && (
        <>
          <p className="ayuda">
            {esMascotaNueva
              ? 'Descargá este QR e imprimilo (podés pegarlo en el collar mientras conseguís una chapita resistente).'
              : `Código de ${placa.mascotas?.nombre || 'tu mascota'}.`}
          </p>
          <div className="qr" ref={contenedorRef}>
            <QRCodeCanvas value={url} size={240} level="H" includeMargin />
          </div>
          <p className="ayuda">{url}</p>
          <button className="boton" onClick={compartirQR}>Compartir QR</button>
        </>
      )}

      <Link className="boton secundario" to="/panel">Volver a mis mascotas</Link>
    </main>
  )
}
