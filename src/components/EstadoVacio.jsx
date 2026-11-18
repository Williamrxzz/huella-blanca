// Cuando todavía no hay nada que mostrar: en vez de "no hay nada", dice qué
// significa y qué hacer a continuación, para que no haga falta un instructivo.
export default function EstadoVacio({ icono: Icono, titulo, children, accion }) {
  return (
    <div className="estado-vacio">
      {Icono && <Icono size={36} strokeWidth={1.6} aria-hidden="true" />}
      <p className="estado-vacio-titulo">{titulo}</p>
      {children && <p className="ayuda">{children}</p>}
      {accion}
    </div>
  )
}
