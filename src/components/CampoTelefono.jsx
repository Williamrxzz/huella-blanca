// Campo de teléfono del dueño (Registro y Perfil). Muestra, mientras se
// escribe, cómo va a quedar el número que usan los botones de llamar y
// WhatsApp de la ficha pública, o qué le falta. La validación final la hace
// quien guarda, con normalizarTelefono().
import { ERRORES_TELEFONO, normalizarTelefono, telefonoLegible } from '../lib/telefono'

export default function CampoTelefono({ valor, onCambio, mostrarError }) {
  const resultado = normalizarTelefono(valor)
  const hayTexto = valor.trim() !== ''

  return (
    <div className="campo-con-ayuda">
      <input
        className="entrada"
        type="tel"
        inputMode="tel"
        placeholder="Celular con código de área (opcional)"
        aria-label="Celular con código de área (opcional)"
        aria-describedby="telefono-estado"
        aria-invalid={mostrarError && !resultado.ok ? 'true' : undefined}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        autoComplete="tel"
      />
      <p id="telefono-estado" className={`ayuda${mostrarError && !resultado.ok ? ' error' : ''}`} aria-live="polite">
        {!hayTexto
          ? 'Por ejemplo: 297 412 3456.'
          : resultado.ok
            ? `Se va a guardar como ${telefonoLegible(resultado.valor)}.`
            : mostrarError
              ? ERRORES_TELEFONO[resultado.error]
              : 'Con el código de área, sin el 0 ni el 15.'}
      </p>
    </div>
  )
}
