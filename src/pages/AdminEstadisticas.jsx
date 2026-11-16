import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import Encabezado from '../components/Encabezado'

const ESTADOS = {
  perdida: 'Perdidas',
  posible_perdida: 'Posible pérdida',
  cerrada: 'Reencuentros',
  descartada: 'Descartadas',
}

function etiquetaDia(iso) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function Tarjeta({ valor, titulo }) {
  return (
    <div className="admin-tarjeta">
      <span className="admin-tarjeta-valor">{valor}</span>
      <span className="ayuda">{titulo}</span>
    </div>
  )
}

function TablaDatos({ filas, columna1, columna2 }) {
  return (
    <details className="admin-tabla">
      <summary>Ver como tabla</summary>
      <table>
        <thead><tr><th>{columna1}</th><th>{columna2}</th></tr></thead>
        <tbody>
          {filas.map((f) => <tr key={f.etiqueta}><td>{f.etiqueta}</td><td>{f.total}</td></tr>)}
        </tbody>
      </table>
    </details>
  )
}

function GraficoPorDia({ titulo, datos, unidad }) {
  const filas = datos.map((d) => ({ etiqueta: etiquetaDia(d.dia), total: d.total }))
  const suma = filas.reduce((a, f) => a + f.total, 0)
  return (
    <section className="admin-grafico">
      <h2>{titulo}</h2>
      <p className="ayuda">Últimos 30 días: {suma} {unidad}</p>
      <div className="admin-grafico-lienzo" role="img" aria-label={`${titulo}, últimos 30 días, total ${suma}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filas} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--viz-grilla)" vertical={false} />
            <XAxis dataKey="etiqueta" tick={{ fill: 'var(--viz-texto)', fontSize: 11 }}
              tickLine={false} axisLine={{ stroke: 'var(--viz-grilla)' }} interval={6} />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--viz-texto)', fontSize: 11 }}
              tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => [v, titulo]}
              contentStyle={{ background: 'var(--viz-superficie)', border: '1px solid var(--viz-grilla)', borderRadius: 8, color: 'var(--viz-texto-fuerte)' }}
              labelStyle={{ color: 'var(--viz-texto-fuerte)' }}
              itemStyle={{ color: 'var(--viz-texto-fuerte)' }}
            />
            <Area type="monotone" dataKey="total" stroke="var(--viz-serie)" strokeWidth={2}
              fill="var(--viz-serie)" fillOpacity={0.15} dot={false}
              activeDot={{ r: 5, stroke: 'var(--viz-superficie)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <TablaDatos filas={filas} columna1="Día" columna2={titulo} />
    </section>
  )
}

export default function AdminEstadisticas() {
  const navigate = useNavigate()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function iniciar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      const { data: perfil } = await supabase
        .from('perfiles').select('rol').eq('id', session.user.id).maybeSingle()
      if (perfil?.rol !== 'admin') {
        navigate('/panel')
        return
      }
      const { data, error: errorRpc } = await supabase.rpc('admin_estadisticas')
      if (errorRpc) setError('No pudimos cargar las estadísticas: ' + errorRpc.message)
      else setDatos(data)
    }
    iniciar()
  }, [navigate])

  if (!datos && !error) return <main className="pagina"><p>Cargando…</p></main>

  const t = datos?.totales
  const casos = (datos?.casos_por_estado || []).map((c) => ({
    etiqueta: ESTADOS[c.estado] || c.estado, total: c.total,
  }))

  return (
    <main className="pagina">
      <Encabezado />
      <h1>Estadísticas</h1>
      <p className="ayuda">
        <Link to="/admin/cuentas">Cuentas</Link> · <Link to="/admin/placas">Inventario de placas</Link>
      </p>

      {error && <p className="ayuda error" role="alert">{error}</p>}

      {datos && (
        <>
          <div className="admin-tarjetas">
            <Tarjeta valor={t.cuentas} titulo="Cuentas" />
            <Tarjeta valor={t.mascotas_activas} titulo="Mascotas activas" />
            <Tarjeta valor={t.placas_activas} titulo="Placas activas" />
            <Tarjeta valor={t.placas_sin_asignar} titulo="Placas sin asignar" />
            <Tarjeta valor={t.escaneos} titulo="Escaneos" />
            <Tarjeta valor={t.avisos} titulo="Avisos recibidos" />
            <Tarjeta valor={t.casos_abiertos} titulo="Casos abiertos" />
            <Tarjeta valor={t.reencuentros} titulo="Reencuentros" />
          </div>

          <GraficoPorDia titulo="Escaneos por día" datos={datos.escaneos_por_dia} unidad="escaneos" />
          <GraficoPorDia titulo="Avisos por día" datos={datos.avisos_por_dia} unidad="avisos" />

          <section className="admin-grafico">
            <h2>Casos por estado</h2>
            <div className="admin-grafico-lienzo" role="img"
              aria-label={`Casos por estado: ${casos.map((c) => `${c.etiqueta} ${c.total}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={casos} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="var(--viz-grilla)" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={{ fill: 'var(--viz-texto)', fontSize: 11 }}
                    tickLine={false} axisLine={{ stroke: 'var(--viz-grilla)' }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--viz-texto)', fontSize: 11 }}
                    tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--viz-grilla)', fillOpacity: 0.4 }}
                    contentStyle={{ background: 'var(--viz-superficie)', border: '1px solid var(--viz-grilla)', borderRadius: 8, color: 'var(--viz-texto-fuerte)' }}
                    labelStyle={{ color: 'var(--viz-texto-fuerte)' }}
                    itemStyle={{ color: 'var(--viz-texto-fuerte)' }}
                  />
                  <Bar dataKey="total" name="Casos" fill="var(--viz-serie)"
                    radius={[4, 4, 0, 0]} maxBarSize={44}
                    label={{ position: 'top', fill: 'var(--viz-texto-fuerte)', fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <TablaDatos filas={casos} columna1="Estado" columna2="Casos" />
          </section>
        </>
      )}
    </main>
  )
}
