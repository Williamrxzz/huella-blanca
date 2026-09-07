import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function GeneradorQR() {
  const [codigo, setCodigo] = useState('')
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
      <h1>Generador de QR</h1>
      <p className="ayuda">
        Escribí el código de una placa para generar el QR que se imprime en la
        chapita del collar.
      </p>

      <input
        className="entrada"
        type="text"
        placeholder="Código de placa"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        autoFocus
      />

      {url && (
        <>
          <div className="qr" ref={contenedorRef}>
            <QRCodeCanvas value={url} size={240} includeMargin />
          </div>
          <p className="ayuda">{url}</p>
          <button className="boton" onClick={descargar}>Descargar QR</button>
        </>
      )}
    </main>
  )
}
