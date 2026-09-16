import { NavLink } from 'react-router-dom'

const SECCIONES = [
  { to: '/admin/comercios', etiqueta: 'Comercios' },
  { to: '/admin/agradecimientos', etiqueta: 'Agradecimientos' },
  { to: '/admin/placas', etiqueta: 'Placas' },
  { to: '/admin/refugios', etiqueta: 'Refugios' },
]

export default function NavAdmin() {
  return (
    <nav className="nav-admin">
      {SECCIONES.map((s) => (
        <NavLink
          key={s.to}
          to={s.to}
          className={({ isActive }) => 'nav-admin-enlace' + (isActive ? ' activo' : '')}
        >
          {s.etiqueta}
        </NavLink>
      ))}
    </nav>
  )
}
