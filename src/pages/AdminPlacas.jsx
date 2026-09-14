import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'
import NavAdmin from '../components/NavAdmin'

const ESTADOS = {
  sin_asignar: 'Sin asignar',
  baja: 'Dada de baja',
  activa: 'Activa',
  perdida: 'Perdida',
}

function estadoDeLaPlaca(placa, mascotasConCasoAbierto) {
  if (placa.estado === 'baja') return 'baja'
  // El vínculo real con una mascota manda por sobre el texto de "estado",
  // que puede quedar desactualizado si la mascota se borró de otra forma.
  if (!placa.mascota_id) return 'sin_asignar'
  if (mascotasConCasoAbierto.has(placa.mascota_id)) return 'perdida'
  return 'activa'
}

export default function AdminPlacas() {
  const navigate = useNavigate()
  const [verificando, setVerificando] = useState(true)
  const [placas, setPlacas] = useState([])
  const [mascotasConCasoAbierto, setMascotasConCasoAbierto] = useState(new Set())
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

      if (perfil?.rol !== 'admin') {
        navigate('/panel')
        return
      }

      const { data: placasData, error: errorPlacas } = await supabase
        .from('placas')
        .select('*, mascotas(nombre)')
        .order('creado_en', { ascending: false })

      if (errorPlacas) setError('No pudimos cargar las placas: ' + errorPlacas.message)
      setPlacas(placasData || [])

      const { data: casosAbiertos } = await supabase
        .from('casos_perdida')
        .select('mascota_id')
        .in('estado', ['perdida', 'posible_perdida'])

      setMascotasConCasoAbierto(new Set((casosAbiertos || []).map((c) => c.mascota_id)))
      setVerificando(false)
    }
    verificarAcceso()
  }, [navigate])

  if (verificando) return <main className="pagina"><p>Cargando…</p></main>

  return (
    <main className="pagina">
      <Encabezado />
      <NavAdmin />
      <h1>Inventario de placas</h1>
      <p className="ayuda">Estado de cada placa generada, para controlar cuántas están libres, activas o perdidas.</p>

      {error && <p className="ayuda error">{error}</p>}

      {placas.length === 0 ? (
        <p className="ayuda">Todavía no hay placas generadas.</p>
      ) : (
        <ul className="lista-mascotas">
          {placas.map((p) => {
            const estado = estadoDeLaPlaca(p, mascotasConCasoAbierto)
            return (
              <li key={p.id}>
                <div>
                  <span className="nombre">{p.codigo}</span>
                  <span className="ayuda">
                    {p.mascotas?.nombre ? `Vinculada a ${p.mascotas.nombre}` : 'Sin mascota vinculada'}
                  </span>
                  <span className={`etiqueta-estado-placa etiqueta-estado-placa-${estado}`}>
                    {ESTADOS[estado]}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
