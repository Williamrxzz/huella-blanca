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

// Para TRA04: nunca le pedimos permiso de ubicación a quien solo está
// mirando la ficha. Si el navegador ya lo tenía concedido de antes (por
// ejemplo, por haber usado "La vi acá"), la conseguimos en silencio; si
// no, no interrumpimos con un cartel de permiso.
export async function pedirUbicacionSiYaHayPermiso() {
  if (!navigator.permissions?.query) return null

  try {
    const estado = await navigator.permissions.query({ name: 'geolocation' })
    if (estado.state !== 'granted') return null
    return await pedirUbicacion()
  } catch {
    return null
  }
}
