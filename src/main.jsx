// Primero de todo: un enlace de recuperación de contraseña va a /restablecer
// (ver el módulo). Tiene que correr antes de crear el cliente de Supabase.
import './lib/desvioRecuperacion'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { aplicarPreferencias, leerPreferencias } from './lib/accesibilidad'

// Se aplican antes de dibujar la app para que no haya un parpadeo con el tamaño o los colores por defecto.
aplicarPreferencias(leerPreferencias())

// Sin StrictMode: el doble montaje que hace en desarrollo choca con
// Leaflet ("Map container is already initialized") y rompe toda la app.
createRoot(document.getElementById('root')).render(<App />)
