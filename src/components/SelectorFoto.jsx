// Elegir una foto con un botón propio ("Elegir foto" / "Cambiar foto") y su
// vista previa, en vez del control del navegador ("Elegir archivo / Ningún
// archivo seleccionado"), que desentona y no dice qué se espera. El input
// sigue existiendo (oculto a la vista, no al teclado ni a los lectores de
// pantalla) y abre la cámara o la galería del teléfono.
import { useEffect, useMemo } from 'react'
import { Camera } from 'lucide-react'

export default function SelectorFoto({ etiqueta, archivo, vistaPrevia, urlActual, onChange, alt = '' }) {
  const urlArchivo = useMemo(() => (archivo instanceof Blob ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => () => { if (urlArchivo) URL.revokeObjectURL(urlArchivo) }, [urlArchivo])

  const previa = vistaPrevia || urlArchivo || urlActual
  return (
    <div className="selector-foto">
      <span className="selector-foto-etiqueta">{etiqueta}</span>
      <div className="selector-foto-fila">
        {previa && <img className="miniatura" src={previa} alt={alt} />}
        <label className="boton secundario selector-foto-boton">
          <Camera size={18} aria-hidden="true" />
          {previa ? 'Cambiar foto' : 'Elegir foto'}
          <input className="solo-lectores" type="file" accept="image/*" onChange={onChange} />
        </label>
      </div>
    </div>
  )
}
