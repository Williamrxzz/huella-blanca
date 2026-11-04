import L from 'leaflet'
import marcador2x from 'leaflet/dist/images/marker-icon-2x.png'
import marcador from 'leaflet/dist/images/marker-icon.png'
import sombra from 'leaflet/dist/images/marker-shadow.png'

// Vite no resuelve las URLs de íconos que Leaflet arma por default.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marcador2x,
  iconUrl: marcador,
  shadowUrl: sombra,
})

// Ícono de casa para marcar el domicilio de la mascota (círculo azul con una
// casa blanca). El punto exacto queda en el centro del círculo.
export const iconoCasa = L.divIcon({
  className: 'icono-casa',
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
})
