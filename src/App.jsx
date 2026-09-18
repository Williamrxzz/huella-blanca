import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import FichaPublica from './pages/FichaPublica'
import GeneradorQR from './pages/GeneradorQR'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Panel from './pages/Panel'
import AltaMascota from './pages/AltaMascota'
import MapaAvistamientos from './pages/MapaAvistamientos'
import Escanear from './pages/Escanear'
import AdminPlacas from './pages/AdminPlacas'
import HistorialRescatista from './pages/HistorialRescatista'
import { supabase } from './lib/supabase'

function Inicio() {
  const [verificando, setVerificando] = useState(true)
  const [haySesion, setHaySesion] = useState(false)

  useEffect(() => {
    async function verificar() {
      const { data: { session } } = await supabase.auth.getSession()
      setHaySesion(Boolean(session))
      setVerificando(false)
    }
    verificar()
  }, [])

  if (verificando) return null
  if (haySesion) return <Navigate to="/panel" replace />

  return (
    <main className="pagina inicio">
      <div className="hero">
        <img className="logo" src="/pwa-512.png" alt="Huella Blanca" />
        <h1>Huella Blanca</h1>
        <p className="subtitulo">
          Identificación y recuperación de mascotas perdidas mediante un
          código QR en el collar.
        </p>
      </div>

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

      <Link className="boton" to="/login">Iniciar sesión</Link>
      <Link className="boton secundario" to="/escanear">Escanear un QR</Link>
      <Link className="enlace-discreto" to="/m/C30A45A9">Ver un ejemplo de ficha</Link>
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
        <Route path="/registro" element={<Registro />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/mascotas/nueva" element={<AltaMascota />} />
        <Route path="/mascotas/:id/editar" element={<AltaMascota />} />
        <Route path="/mascotas/:id/mapa" element={<MapaAvistamientos />} />
        <Route path="/escanear" element={<Escanear />} />
        <Route path="/admin/placas" element={<AdminPlacas />} />
        <Route path="/mi-historial" element={<HistorialRescatista />} />
        <Route path="/m/:codigo" element={<FichaPublica />} />
      </Routes>
    </BrowserRouter>
  )
}
