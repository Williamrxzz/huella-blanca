import { Link } from 'react-router-dom'

export default function Encabezado() {
  return (
    <Link to="/" className="encabezado" aria-label="Ir al inicio">
      <img src="/pwa-512.png" alt="" className="encabezado-logo" />
    </Link>
  )
}
