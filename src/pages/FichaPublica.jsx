import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ETIQUETA_CARACTER = {
  amigable: 'Es amigable',
  temerosa: 'Es temerosa, acercate despacio',
  no_acercarse: 'Mejor no acercarse, avisá al dueño',
}

export default function FichaPublica() {
  const { codigo } = useParams()
  const [ficha, setFicha] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data, error } = await supabase.rpc('ficha_publica', { p_codigo: codigo })
      if (error) setError(error.message)
      else setFicha(data)
      setCargando(false)
    }
    cargar()
  }, [codigo])

  if (cargando) return <main className="pagina"><p>Buscando la mascota…</p></main>

  if (error) return (
    <main className="pagina">
      <h1>Ocurrió un problema</h1>
      <p className="ayuda">{error}</p>
    </main>
  )

  if (!ficha?.encontrada) return (
    <main className="pagina">
      <h1>Placa no reconocida</h1>
      <p>Esta placa no está registrada o todavía no fue asignada a una mascota.</p>
      <p className="ayuda">Código leído: {codigo}</p>
    </main>
  )

  const perdida = ficha.estado === 'perdida' || ficha.estado === 'posible_perdida'

  return (
    <main className="pagina">
      {perdida && (
        <div className="alerta">
          {ficha.estado === 'perdida'
            ? 'Esta mascota está reportada como perdida'
            : 'Esta mascota podría estar perdida'}
        </div>
      )}

      {ficha.foto_url
        ? <img className="foto" src={ficha.foto_url} alt={ficha.nombre} />
        : <div className="foto vacia">Sin foto</div>}

      <h1>{ficha.nombre}</h1>

      <ul className="datos">
        {ficha.especie && <li><span>Especie</span>{ficha.especie}</li>}
        {ficha.raza && <li><span>Raza</span>{ficha.raza}</li>}
        {ficha.tamano && <li><span>Tamaño</span>{ficha.tamano}</li>}
        {ficha.color && <li><span>Color</span>{ficha.color}</li>}
        {ficha.senas && <li><span>Señas</span>{ficha.senas}</li>}
        {ficha.salud && <li><span>Salud</span>{ficha.salud}</li>}
      </ul>

      {ficha.caracter && (
        <p className="caracter">{ETIQUETA_CARACTER[ficha.caracter]}</p>
      )}

      <button className="boton" disabled>La vi acá (próximo paso)</button>
    </main>
  )
}
