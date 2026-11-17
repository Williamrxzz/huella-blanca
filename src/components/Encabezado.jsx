import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

// Cabecera de todas las pantallas: el logo (va al inicio) y, si la pantalla
// tiene una pantalla "padre", un botón de volver a la izquierda, como en
// cualquier app móvil. Reemplaza los botones "Volver al panel" que antes iban
// al pie, con el mismo peso que las acciones principales.
export default function Encabezado({ volver = null }) {
  return (
    <header className="encabezado">
      {volver && (
        <Link to={volver} className="encabezado-volver" aria-label="Volver">
          <ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      )}
      <Link to="/" className="encabezado-logo-enlace" aria-label="Ir al inicio">
        <img src="/pwa-512.png" alt="" className="encabezado-logo" />
      </Link>
    </header>
  )
}
