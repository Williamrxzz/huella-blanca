// IA03: hoja de "compartir la búsqueda" de una mascota perdida. Se abre desde
// el panel y desde la pantalla de avisos. Ofrece lo que la gente realmente
// reenvía: un afiche (imagen con foto, nombre, descripción y QR) para WhatsApp,
// estados e Instagram, y un texto editable con el enlace de la ficha.
//
// La plantilla propone; la persona corrige el texto antes de mandarlo. Si el
// afiche no se puede generar (foto que no carga, navegador raro), el texto
// sigue disponible: nunca bloquea.
import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Check, Copy, Download, ImageIcon, MessageCircle, RotateCcw, Share2, X } from 'lucide-react'
import { armarTextoBusqueda, enlaceWhatsApp } from '../lib/textoBusqueda'
import { generarAfiche } from '../lib/afiche'

async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto)
  } catch {
    // Navegadores sin portapapeles moderno (o sin permiso): campo temporal.
    const campo = document.createElement('textarea')
    campo.value = texto
    campo.style.position = 'fixed'
    campo.style.opacity = '0'
    document.body.appendChild(campo)
    campo.select()
    try { document.execCommand('copy') } catch { /* nada más que intentar */ }
    document.body.removeChild(campo)
  }
}

function descargar(blob, nombre) {
  const enlace = document.createElement('a')
  enlace.download = nombre
  enlace.href = URL.createObjectURL(blob)
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

export default function CompartirBusqueda({ mascota, caso, onCerrar }) {
  const origen = window.location.origin
  const codigo = mascota.placas?.find((p) => p.estado === 'activa')?.codigo || null
  const url = codigo ? `${origen}/m/${codigo}` : origen
  const textoSugerido = armarTextoBusqueda({ mascota, caso, origen })

  const [texto, setTexto] = useState(textoSugerido)
  const [editando, setEditando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [afiche, setAfiche] = useState(null) // { blob, url }
  const [generando, setGenerando] = useState(true)
  const [aviso, setAviso] = useState(null)
  const qrRef = useRef(null)

  const puedeCompartir = typeof navigator.share === 'function'

  useEffect(() => {
    let vigente = true
    let urlVista = null
    async function armar() {
      try {
        const blob = await generarAfiche({
          mascota, caso, codigo, origen, qrCanvas: qrRef.current?.querySelector('canvas') || null,
        })
        if (!vigente) return
        urlVista = URL.createObjectURL(blob)
        setAfiche({ blob, url: urlVista })
      } catch {
        if (vigente) setAviso('No pudimos armar el afiche en este navegador. El texto se puede compartir igual.')
      } finally {
        if (vigente) setGenerando(false)
      }
    }
    armar()
    return () => {
      vigente = false
      if (urlVista) URL.revokeObjectURL(urlVista)
    }
  }, [mascota, caso, codigo, origen])

  // Cerrar con Escape, como cualquier hoja.
  useEffect(() => {
    function alTeclear(e) { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  async function compartirAfiche() {
    if (!afiche) return
    const archivo = new File([afiche.blob], `se-perdio-${(mascota.nombre || 'mascota').toLowerCase()}.png`, { type: 'image/png' })
    if (puedeCompartir && navigator.canShare?.({ files: [archivo] })) {
      try {
        // El texto viaja como pie de la imagen en WhatsApp (Android); en iOS
        // algunos destinos solo toman la imagen, por eso el enlace también va
        // impreso en el afiche.
        await navigator.share({ files: [archivo], title: `Se perdió ${mascota.nombre}`, text: texto })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    descargar(afiche.blob, archivo.name)
    setAviso('Afiche descargado. Subilo a tu estado o mandalo por donde quieras.')
  }

  async function compartirTexto() {
    if (puedeCompartir) {
      try {
        await navigator.share({ title: `Se perdió ${mascota.nombre}`, text: texto })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    window.open(enlaceWhatsApp(texto), '_blank', 'noopener,noreferrer')
  }

  async function copiar() {
    await copiarAlPortapapeles(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="superposicion" onClick={onCerrar}>
      <div
        className="hoja-compartir"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-compartir"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hoja-compartir-cabecera">
          <h2 id="titulo-compartir">Compartir la búsqueda de {mascota.nombre}</h2>
          <button className="hoja-compartir-cerrar" type="button" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="ayuda">
          Cuanta más gente lo vea, más rápido vuelve. Mandalo a tus grupos, subilo a tu estado y pedí que lo reenvíen.
        </p>

        {/* QR oculto: solo sirve para dibujarlo dentro del afiche. */}
        <div ref={qrRef} className="oculto" aria-hidden="true">
          <QRCodeCanvas value={url} size={340} level="H" includeMargin />
        </div>

        <section className="hoja-compartir-bloque">
          <h3><ImageIcon size={16} aria-hidden="true" /> Afiche</h3>
          <div className="afiche-vista">
            {afiche ? (
              <img src={afiche.url} alt={`Afiche: se perdió ${mascota.nombre}`} />
            ) : (
              <div className="afiche-vista-vacia">{generando ? 'Armando el afiche…' : 'Sin afiche'}</div>
            )}
          </div>
          <button className="boton" type="button" onClick={compartirAfiche} disabled={!afiche}>
            {puedeCompartir ? <Share2 size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
            {puedeCompartir ? 'Compartir afiche' : 'Descargar afiche'}
          </button>
        </section>

        <section className="hoja-compartir-bloque">
          <h3><MessageCircle size={16} aria-hidden="true" /> Mensaje</h3>
          {editando ? (
            <>
              <textarea
                className="entrada hoja-compartir-texto"
                aria-label="Mensaje para compartir"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={9}
              />
              <div className="hoja-compartir-texto-acciones">
                <button className="boton-accion" type="button" onClick={() => setEditando(false)}>
                  <Check size={16} aria-hidden="true" /> Listo
                </button>
                <button className="boton-accion" type="button" onClick={() => setTexto(textoSugerido)} disabled={texto === textoSugerido}>
                  <RotateCcw size={16} aria-hidden="true" /> Restablecer
                </button>
              </div>
            </>
          ) : (
            <button className="hoja-compartir-previa" type="button" onClick={() => setEditando(true)} aria-label="Editar el mensaje">
              <pre>{texto}</pre>
              <span className="ayuda">Tocá para editar</span>
            </button>
          )}
          <div className="acciones-mascota">
            <button className="boton-accion" type="button" onClick={compartirTexto}>
              <Share2 size={16} aria-hidden="true" />
              {puedeCompartir ? 'Compartir texto' : 'Abrir en WhatsApp'}
            </button>
            <button className={`boton-accion${copiado ? ' copiado' : ''}`} type="button" onClick={copiar}>
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copiado ? 'Copiado' : 'Copiar texto'}
            </button>
          </div>
          <span className="solo-lectores" role="status">{copiado ? 'Texto copiado' : ''}</span>
        </section>

        {aviso && <p className="ayuda" role="status">{aviso}</p>}
      </div>
    </div>
  )
}
