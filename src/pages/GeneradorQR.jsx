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

  function descargar() {
    const canvas = contenedorRef.current?.querySelector('canvas')
    if (!canvas) return
    const enlace = document.createElement('a')
    enlace.download = `placa-${placa.codigo}.png`
    enlace.href = canvas.toDataURL('image/png')
    enlace.click()
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
          <button className="boton" onClick={descargar}>Descargar QR</button>
        </>
      )}

      <Link className="boton secundario" to="/panel">Volver a mis mascotas</Link>
    </main>
  )
}
