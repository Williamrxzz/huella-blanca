// Consentimiento al crear una cuenta (Ley 25.326). Es obligatorio para
// registrarse, nunca para avisar: quien encuentra una mascota no necesita
// cuenta. El enlace abre la política en otra pestaña para no perder lo que se
// estaba completando.
export default function AceptoPrivacidad({ aceptado, onCambio }) {
  return (
    <label className="acepto-privacidad">
      <input type="checkbox" checked={aceptado} onChange={(e) => onCambio(e.target.checked)} required />
      <span>
        Leí y acepto la{' '}
        <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.
      </span>
    </label>
  )
}
