import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import jsQR from 'jsqr'
import { ExternalLink, ScanLine } from 'lucide-react'
import Encabezado from '../components/Encabezado'
import { interpretarCodigo } from '../lib/codigoQR'


export default function Escanear() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [enlaceExterno, setEnlaceExterno] = useState(null)
  const [intento, setIntento] = useState(0) // cambiarlo vuelve a prender la cámara

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
      const resultado = interpretarCodigo(texto, window.location.origin)
      if (resultado.tipo === 'propio') navigate(resultado.ruta)
      else if (resultado.tipo === 'externo') setEnlaceExterno(resultado.url)
      else setError('Este código no es el de una placa de Huella Blanca.')
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
  }, [navigate, intento])

  function escanearOtro() {
    setError(null)
    setEnlaceExterno(null)
    setIntento((n) => n + 1)
  }

  return (
    <main className="pagina">
      <Encabezado volver="/" />
      <h1>Escanear QR</h1>
      <p className="ayuda">Apuntá la cámara al código QR de la placa.</p>

      {enlaceExterno ? (
        <div role="alert">
          <p>Este código no es de una placa de Huella Blanca. Lleva a otro sitio:</p>
          <p className="enlace-leido">{enlaceExterno}</p>
          <p className="ayuda">Abrilo solo si confiás en quien lo puso.</p>
          <a className="boton secundario" href={enlaceExterno} rel="noopener noreferrer">
            <ExternalLink size={18} aria-hidden="true" /> Abrir de todos modos
          </a>
          <button className="boton" type="button" onClick={escanearOtro}>
            <ScanLine size={18} aria-hidden="true" /> Escanear otro código
          </button>
        </div>
      ) : error ? (
        <>
          <p className="ayuda error" role="alert">{error}</p>
          <button className="boton" type="button" onClick={escanearOtro}>
            <ScanLine size={18} aria-hidden="true" /> Escanear otro código
          </button>
        </>
      ) : (
        <div className="visor-camara">
          <video ref={videoRef} playsInline muted aria-hidden="true" />
        </div>
      )}
      <canvas ref={canvasRef} className="oculto" />

      <Link className="boton terciario" to="/">Cancelar</Link>
    </main>
  )
}
