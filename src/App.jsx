import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import FichaPublica from './pages/FichaPublica'
import GeneradorQR from './pages/GeneradorQR'
import Login from './pages/Login'
import Panel from './pages/Panel'

function Inicio() {
  return (
    <main className="pagina">
      <h1>Huella Blanca</h1>
      <p>Red de identificación y recuperación de mascotas.</p>
      <p className="ayuda">
        Para probar la ficha pública, abrí <code>/m/CODIGO</code> con un código
        de la tabla <code>placas</code>.
      </p>
      <Link className="boton" to="/m/PRUEBA">Ver ejemplo</Link>
      <Link className="boton secundario" to="/placas">Generar QR de una placa</Link>
      <Link className="boton secundario" to="/login">Ingresar como dueño</Link>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/placas" element={<GeneradorQR />} />
        <Route path="/login" element={<Login />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/m/:codigo" element={<FichaPublica />} />
      </Routes>
    </BrowserRouter>
  )
}
