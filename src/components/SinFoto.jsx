// Lugar de la foto cuando la mascota no tiene: una huella en vez de un texto.
import { PawPrint } from 'lucide-react'

export default function SinFoto({ grande = false }) {
  return (
    <div className={grande ? 'foto vacia' : 'miniatura vacia'} role="img" aria-label="Sin foto">
      <PawPrint size={grande ? 56 : 26} strokeWidth={1.6} aria-hidden="true" />
      {grande && <span>Sin foto</span>}
    </div>
  )
}
