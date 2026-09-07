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
