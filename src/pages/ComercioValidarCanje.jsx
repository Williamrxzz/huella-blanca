import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const MOTIVOS_ERROR = {
  sin_permiso: 'Tu cuenta no tiene permiso para validar códigos.',
  codigo_no_encontrado: 'Ese código no existe. Revisalo e intentá de nuevo.',
  fue_donado: 'Ese código fue donado a un refugio, no se retira en un comercio.',
  ya_retirado: 'Ese código ya fue retirado antes.',
  vencido: 'Ese código venció.',
}

export default function ComercioValidarCanje() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [validando, setValidando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function verificarAcceso() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .maybeSingle()

      if (perfil?.rol !== 'comercio' && perfil?.rol !== 'admin') {
        navigate('/panel')
        return
      }

      setVerificando(false)
    }
    verificarAcceso()
  }, [navigate])

  async function validar(e) {
    e.preventDefault()
    setValidando(true)
    setError(null)
    setResultado(null)

    const { data, error: errorRpc } = await supabase.rpc('validar_canje', { p_codigo: codigo })

    setValidando(false)

    if (errorRpc || !data?.ok) {
      setError(MOTIVOS_ERROR[data?.motivo] || 'No pudimos validar el código.')
      return
    }

    setResultado(data)
    setCodigo('')
  }

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Validar código</h1>
      <p className="ayuda">Ingresá el código que te presenta el rescatista para entregarle la placa grabada.</p>

      <form className="formulario-aviso" onSubmit={validar}>
        <input
          className="entrada"
          type="text"
          placeholder="Código (por ejemplo A1B2-C3D4)"
          aria-label="Código del canje"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          required
        />

        {error && <p className="ayuda error">{error}</p>}

        <button className="boton" type="submit" disabled={validando || !codigo.trim()}>
          {validando ? 'Validando…' : 'Validar y entregar'}
        </button>
      </form>

      {resultado && (
        <div className="confirmacion">
          Código {resultado.codigo} válido — entregada por {resultado.comercio}.
        </div>
      )}
    </main>
  )
}
