export function pedirUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    let resuelto = false
    const finalizar = (valor) => {
      if (resuelto) return
      resuelto = true
      resolve(valor)
    }

    // Algunos navegadores (Chrome/Safari en macOS sin permiso de
    // Localización del sistema) nunca llaman ni al éxito ni al error,
    // ignorando el timeout de la propia API. Por eso forzamos un límite
    // propio: no puede depender de que el navegador responda.
    setTimeout(() => finalizar(null), 8000)

    navigator.geolocation.getCurrentPosition(
      (pos) => finalizar({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => finalizar(null),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}
