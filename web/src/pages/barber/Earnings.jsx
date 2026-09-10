import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import { SkeletonStat, SkeletonTable } from '../../components/ui/Skeleton'
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters'

const PERIODS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
]

export default function BarberEarnings() {
  const [period, setPeriod] = useState('month')

  const { data: barberData } = useQuery({
    queryKey: ['my-barber-profile'],
    queryFn: () => api.get('/api/barbers/my').then(r => r.data),
  })
  const barberId = barberData?.barber?.id || barberData?.id

  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['barber-earnings', barberId, period],
    queryFn: () => api.get(`/api/earnings/barber/${barberId}?period=${period}`).then(r => r.data),
    enabled: !!barberId,
  })

  // El resumen de fidelización queda oculto hasta que exista la ruta que lo
  // alimenta: GET /api/loyalty/barber/:barberId no está montada en el backend.
  // loyalty.routes.js solo expone /:shopId, /shop/:shopId/clients y /redeem, y
  // esta llamada tiene dos segmentos, así que no coincide con ninguna.

  // El controlador envuelve la respuesta en { earnings }; el breakdown vive
  // dentro de ese objeto, no al lado. Leerlo un nivel más arriba lo dejaba
  // siempre vacío.
  const earnings = earningsData?.earnings || earningsData || {}
  const breakdown = earnings.breakdown || []

  // La serie la calcula el backend a partir del MISMO rango que el total, así
  // que las barras suman lo que dice la tarjeta de arriba. Antes esto era
  // Math.floor(Math.random()): la gráfica mostraba dinero de semanas en las que
  // no había ni una cita en la base.
  const chartData = (earnings.daily || []).map(d => ({
    label: d.day,
    ganancia: d.barberEarnings,
  }))

  return (
    <div className="space-y-6">
      {/* Period tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-soft p-1 w-fit">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${period === p.key ? 'bg-primary text-white' : 'text-secondary hover:bg-cream'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Main earnings card */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonStat key={i} />)}
        </div>
      ) : (
        <div className="bg-primary rounded-2xl p-6 text-white">
          <p className="text-cream/70 text-sm font-medium">Mi ganancia — {PERIODS.find(p => p.key === period)?.label}</p>
          <p className="text-4xl font-bold mt-2 font-heading">{formatCurrency(earnings.totalEarned || 0)}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-cream/60 text-xs">Cortes completados</p>
              <p className="text-xl font-bold mt-0.5">{earnings.cutsCount || 0}</p>
            </div>
            <div>
              <p className="text-cream/60 text-xs">Ticket promedio</p>
              <p className="text-xl font-bold mt-0.5">{formatCurrency(earnings.avgTicket || 0)}</p>
            </div>
            <div>
              <p className="text-cream/60 text-xs">Tasa de éxito</p>
              <p className="text-xl font-bold mt-0.5">
                {earnings.successRate == null ? '—' : `${earnings.successRate}%`}
              </p>
              <p className="text-cream/60 text-xs mt-0.5">
                {earnings.successRate == null
                  ? 'Sin citas resueltas todavía'
                  : `${earnings.cutsCount || 0} de ${earnings.resolvedCount || 0} citas resueltas`}
              </p>
            </div>
            <div>
              <p className="text-cream/60 text-xs">Mi porcentaje</p>
              <p className="text-xl font-bold mt-0.5 text-accent">{earnings.barberPercentage ?? 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <Card title="Ganancias por período">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8B5E3C' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8B5E3C' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [formatCurrency(v), 'Ganancia']} />
            <Bar dataKey="ganancia" fill="#C49A6C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Breakdown table */}
      <Card title="Desglose de cortes">
        {isLoading ? <SkeletonTable rows={5} cols={4} /> : breakdown.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-3xl">✂️</span>
            <p className="mt-2 text-secondary text-sm">Sin cortes registrados en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-soft">
                  {['Fecha y hora', 'Cliente', 'Servicio', 'Mi ganancia'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.map((item, i) => (
                  <tr key={i} className="border-b border-gray-soft/50 hover:bg-cream">
                    <td className="py-2.5 px-3 text-xs text-secondary">
                      <p>{formatDate(item.date)}</p>
                      {item.startTime && <p>{formatTime(item.startTime)}</p>}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{item.clientName || '—'}</td>
                    <td className="py-2.5 px-3">{item.service || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-accent">{formatCurrency(item.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  )
}
