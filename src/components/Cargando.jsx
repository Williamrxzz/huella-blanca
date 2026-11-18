// Mientras se carga una pantalla: un indicador que gira y una frase que dice
// qué se está buscando, en vez de un "Cargando…" suelto. Respeta "reducir
// animaciones" (accesibilidad): el indicador deja de girar.
export default function Cargando({ texto = 'Cargando…' }) {
  return (
    <main className="pagina cargando" aria-busy="true">
      <div className="cargando-indicador" aria-hidden="true" />
      <p role="status">{texto}</p>
    </main>
  )
}
