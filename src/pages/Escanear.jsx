import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import jsQR from 'jsqr'

export default function Escanear() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    let stream = null
    let animacion = null

    function detener() {
      activo = false
      if (animacion) cancelAnimationFrame(animacion)
      stream?.getTracks().forEach((track) => track.stop())
    }

    function procesarResultado(texto) {
      detener()
      try {
        const url = new URL(texto)
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search)
        } else {
          window.location.href = texto
        }
      } catch {
        setError(`Se leyó "${texto}", pero no es un link válido.`)
      }
    }

    function escanearCuadro() {
      if (!activo) return
      const video = videoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animacion = requestAnimationFrame(escanearCuadro)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const contexto = canvas.getContext('2d')
      contexto.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imagen = contexto.getImageData(0, 0, canvas.width, canvas.height)
      const resultado = jsQR(imagen.data, imagen.width, imagen.height)

      if (resultado?.data) {
        procesarResultado(resultado.data)
        return
      }

      animacion = requestAnimationFrame(escanearCuadro)
    }

    async function iniciar() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (!activo) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        escanearCuadro()
      } catch {
        setError('No pudimos acceder a la cámara. Revisá los permisos del navegador.')
      }
    }

    iniciar()
    return detener
  }, [navigate])

  return (
    <main className="pagina">
      <h1>Escanear QR</h1>
      <p className="ayuda">Apuntá la cámara al código QR de la placa.</p>

      {error ? (
        <p className="ayuda error">{error}</p>
      ) : (
        <div className="visor-camara">
          <video ref={videoRef} playsInline muted aria-hidden="true" />
        </div>
      )}
      <canvas ref={canvasRef} className="oculto" />

      <Link className="boton secundario" to="/">Cancelar</Link>
    </main>
  )
}
