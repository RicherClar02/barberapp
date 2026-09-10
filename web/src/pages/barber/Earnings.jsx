import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
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
  const barberPct = barberData?.barber?.barbershop?.config?.barberPercentage || barberData?.barbershop?.config?.barberPercentage || 60

  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['barber-earnings', barberId, period],
    queryFn: () => api.get(`/api/earnings/barber/${barberId}?period=${period}`).then(r => r.data),
    enabled: !!barberId,
  })

  // El resumen de fidelización queda oculto hasta que exista la ruta que lo
  // alimenta: GET /api/loyalty/barber/:barberId no está montada en el backend.
  // loyalty.routes.js solo expone /:shopId, /shop/:shopId/clients y /redeem, y
  // esta llamada tiene dos segmentos, así que no coincide con ninguna.

  const earnings = earningsData?.earnings || earningsData || {}
  const breakdown = earningsData?.breakdown || []

  // Chart data based on period
  const chartData = (() => {
    if (period === 'today') {
      return Array.from({ length: 12 }, (_, i) => ({
        label: `${String(i + 8).padStart(2, '0')}h`,
        ganancia: Math.floor(Math.random() * 30000),
      }))
    }
    if (period === 'week') {
      return Array.from({ length: 7 }, (_, i) => ({
        label: format(subDays(new Date(), 6 - i), 'EEE', { locale: es }),
        ganancia: Math.floor(Math.random() * 80000),
      }))
    }
    return Array.from({ length: 4 }, (_, i) => ({
      label: `Sem ${i + 1}`,
      ganancia: Math.floor(Math.random() * 300000),
    }))
  })()

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
          <p className="text-4xl font-bold mt-2 font-heading">{formatCurrency(earnings.total || 0)}</p>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-cream/60 text-xs">Cortes realizados</p>
              <p className="text-xl font-bold mt-0.5">{earnings.cuts || 0}</p>
            </div>
            <div>
              <p className="text-cream/60 text-xs">Ticket promedio</p>
              <p className="text-xl font-bold mt-0.5">{formatCurrency(earnings.avgTicket || 0)}</p>
            </div>
            <div>
              <p className="text-cream/60 text-xs">Mi porcentaje</p>
              <p className="text-xl font-bold mt-0.5 text-accent">{barberPct}%</p>
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
        {isLoading ? <SkeletonTable rows={5} cols={5} /> : breakdown.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-3xl">✂️</span>
            <p className="mt-2 text-secondary text-sm">Sin cortes registrados en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-soft">
                  {['Fecha y hora', 'Cliente', 'Servicio', 'Precio', 'Mi ganancia'].map(h => (
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
                    <td className="py-2.5 px-3">{item.serviceName || '—'}</td>
                    <td className="py-2.5 px-3 text-secondary">{formatCurrency(item.price || 0)}</td>
                    <td className="py-2.5 px-3 font-semibold text-accent">{formatCurrency(item.barberEarning || (item.price * barberPct / 100) || 0)}</td>
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
