import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import BotonAccesibilidad from './components/BotonAccesibilidad'
import { supabase } from './lib/supabase'
import { registrarServiceWorkerSiCorresponde } from './lib/serviceWorker'

// Cada pantalla se descarga recién cuando se abre (code splitting): quien
// escanea un collar baja solo la ficha pública, no el panel, los formularios
// ni los gráficos de administración.
const FichaPublica = lazy(() => import('./pages/FichaPublica'))
const GeneradorQR = lazy(() => import('./pages/GeneradorQR'))
const Login = lazy(() => import('./pages/Login'))
const Registro = lazy(() => import('./pages/Registro'))
const Recuperar = lazy(() => import('./pages/Recuperar'))
const Restablecer = lazy(() => import('./pages/Restablecer'))
const Panel = lazy(() => import('./pages/Panel'))
const Perfil = lazy(() => import('./pages/Perfil'))
const AltaMascota = lazy(() => import('./pages/AltaMascota'))
const MapaAvistamientos = lazy(() => import('./pages/MapaAvistamientos'))
const Escanear = lazy(() => import('./pages/Escanear'))
const AdminCuentas = lazy(() => import('./pages/AdminCuentas'))
const AdminEstadisticas = lazy(() => import('./pages/AdminEstadisticas'))
const HistorialColaboracion = lazy(() => import('./pages/HistorialColaboracion'))

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
      <Link className="enlace-discreto" to="/ejemplo">Ver un ejemplo de ficha</Link>
    </main>
  )
}

function ServiceWorker() {
  const { pathname } = useLocation()
  useEffect(() => { registrarServiceWorkerSiCorresponde(pathname) }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ServiceWorker />
      <Suspense fallback={<main className="pagina" aria-busy="true" />}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/placas" element={<GeneradorQR />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/restablecer" element={<Restablecer />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/mascotas/nueva" element={<AltaMascota />} />
        <Route path="/mascotas/:id/editar" element={<AltaMascota />} />
        <Route path="/mascotas/:id/mapa" element={<MapaAvistamientos />} />
        <Route path="/escanear" element={<Escanear />} />
        <Route path="/admin/cuentas" element={<AdminCuentas />} />
        <Route path="/admin/estadisticas" element={<AdminEstadisticas />} />
        <Route path="/mi-historial" element={<HistorialColaboracion />} />
        <Route path="/m/:codigo" element={<FichaPublica />} />
        <Route path="/ejemplo" element={<FichaPublica demo />} />
      </Routes>
      </Suspense>
      <BotonAccesibilidad />
    </BrowserRouter>
  )
}
