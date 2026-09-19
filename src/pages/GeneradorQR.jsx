import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import Encabezado from '../components/Encabezado'

export default function GeneradorQR() {
  const [searchParams] = useSearchParams()
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '')
  const esMascotaNueva = searchParams.get('nueva') === '1'
  const contenedorRef = useRef(null)

  const codigoNormalizado = codigo.trim().toUpperCase()
  const url = codigoNormalizado ? `${window.location.origin}/m/${codigoNormalizado}` : ''

  function descargar() {
    const canvas = contenedorRef.current?.querySelector('canvas')
    if (!canvas) return
    const enlace = document.createElement('a')
    enlace.download = `placa-${codigoNormalizado}.png`
    enlace.href = canvas.toDataURL('image/png')
    enlace.click()
  }

  return (
    <main className="pagina">
      <Encabezado />
      <h1>{esMascotaNueva ? '¡Mascota cargada!' : 'Generador de QR'}</h1>
      <p className="ayuda">
        {esMascotaNueva
          ? 'Descargá este QR e imprimilo (podés pegarlo en el collar mientras conseguís una chapita resistente).'
          : 'Escribí el código de una placa para generar el QR que se imprime en la chapita del collar.'}
      </p>

      <input
        className="entrada"
        type="text"
        placeholder="Código de placa"
        aria-label="Código de placa"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        autoFocus={!esMascotaNueva}
      />

      {url && (
        <>
          <div className="qr" ref={contenedorRef}>
            <QRCodeCanvas value={url} size={240} level="H" includeMargin />
          </div>
          <p className="ayuda">{url}</p>
          <button className="boton" onClick={descargar}>Descargar QR</button>
        </>
      )}

      {esMascotaNueva && (
        <Link className="boton secundario" to="/panel">Volver a mis mascotas</Link>
      )}
    </main>
  )
}
