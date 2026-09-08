import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import FichaPublica from './pages/FichaPublica'
import GeneradorQR from './pages/GeneradorQR'
import Login from './pages/Login'
import Panel from './pages/Panel'
import AltaMascota from './pages/AltaMascota'
import MapaAvistamientos from './pages/MapaAvistamientos'

function Inicio() {
  return (
    <main className="pagina inicio">
      <img className="logo" src="/pwa-512.png" alt="Huella Blanca" />
      <h1>Huella Blanca</h1>
      <p className="subtitulo">
        Identificación y recuperación de mascotas perdidas mediante un
        código QR en el collar.
      </p>

      <ol className="pasos">
        <li>
          <span className="numero">1</span>
          Tu mascota lleva una chapita con un código QR único.
        </li>
        <li>
          <span className="numero">2</span>
          Quien la encuentra lo escanea con la cámara y ve su ficha —
          sin instalar nada ni registrarse.
        </li>
        <li>
          <span className="numero">3</span>
          Vos recibís el aviso al instante y coordinás el reencuentro.
        </li>
      </ol>

      <Link className="boton" to="/login">Ingresar como dueño</Link>
      <Link className="boton secundario" to="/m/C30A45A9">Ver un ejemplo de ficha</Link>
      <Link className="enlace-discreto" to="/placas">Generar QR de una placa</Link>
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
        <Route path="/mascotas/nueva" element={<AltaMascota />} />
        <Route path="/mascotas/:id/editar" element={<AltaMascota />} />
        <Route path="/mascotas/:id/mapa" element={<MapaAvistamientos />} />
        <Route path="/m/:codigo" element={<FichaPublica />} />
      </Routes>
    </BrowserRouter>
  )
}
