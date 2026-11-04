import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './lib/leaflet-iconos'
import './index.css'
import App from './App.jsx'
import { aplicarPreferencias, leerPreferencias } from './lib/accesibilidad'

// Se aplican antes de dibujar la app para que no haya un parpadeo con el tamaño o los colores por defecto.
aplicarPreferencias(leerPreferencias())

// Sin StrictMode: el doble montaje que hace en desarrollo choca con
// Leaflet ("Map container is already initialized") y rompe toda la app.
createRoot(document.getElementById('root')).render(<App />)
