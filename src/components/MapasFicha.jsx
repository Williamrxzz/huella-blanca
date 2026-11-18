// Los dos mapas de la ficha pública, en un archivo aparte para cargarlos solo
// cuando se muestran: Leaflet es lo más pesado de la ficha, y una ficha de una
// mascota en casa no muestra ningún mapa. Quien escanea un collar en la calle,
// con datos móviles, ve la ficha antes y gasta menos.
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import '../lib/leaflet-iconos'

const CAPA = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
}

// PER07: zona aproximada (100 m) de la última ubicación, nunca un punto exacto.
export function ZonaUltimaUbicacion({ lat, lng }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} className="mapa-domicilio">
      <TileLayer {...CAPA} />
      <Circle center={[lat, lng]} radius={100} pathOptions={{ color: '#2e5c8a', weight: 1, fillOpacity: 0.12 }} />
    </MapContainer>
  )
}

function AlTocar({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// TRA11: marcar o corregir dónde se vio a la mascota.
export function SelectorLugar({ centro, ubicacion, onSeleccionar }) {
  return (
    <MapContainer
      key={`${centro.lat}-${centro.lng}`}
      center={[centro.lat, centro.lng]}
      zoom={ubicacion ? 16 : 13}
      className="mapa-domicilio"
    >
      <TileLayer {...CAPA} />
      <AlTocar onSeleccionar={onSeleccionar} />
      {ubicacion && <Marker position={[ubicacion.lat, ubicacion.lng]} />}
    </MapContainer>
  )
}
