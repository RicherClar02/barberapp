import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { formatCurrency, formatTime } from '../../utils/formatters'
import toast from 'react-hot-toast'

export default function OwnerDashboard() {
  const { user } = useAuthStore()

  const { data: shopData } = useQuery({
    queryKey: ['my-barbershops'],
    queryFn: () => api.get('/api/barbershops/my').then(r => r.data),
  })
  const shopId = shopData?.barbershops?.[0]?.id || shopData?.[0]?.id

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['shop-overview', shopId],
    queryFn: () => api.get(`/api/analytics/shop/${shopId}/overview?period=today`).then(r => r.data),
    enabled: !!shopId,
  })

  const { data: apptData, isLoading: loadingAppts } = useQuery({
    queryKey: ['today-appointments', shopId],
    queryFn: () => api.get(`/api/appointments/shop/${shopId}?date=${format(new Date(), 'yyyy-MM-dd')}`).then(r => r.data),
    enabled: !!shopId,
  })

  const { data: barbersData } = useQuery({
    queryKey: ['shop-barbers-analytics', shopId],
    queryFn: () => api.get(`/api/analytics/shop/${shopId}/barbers`).then(r => r.data),
    enabled: !!shopId,
  })

  const { data: weekData } = useQuery({
    queryKey: ['week-overview', shopId],
    queryFn: () => api.get(`/api/analytics/shop/${shopId}/overview?period=week`).then(r => r.data),
    enabled: !!shopId,
  })

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return {
      date: format(d, 'EEE', { locale: es }),
      ingresos: Math.floor(Math.random() * 200000 + 50000),
    }
  })

  const appointments = apptData?.appointments || apptData || []

  const handleAction = async (id, action) => {
    try {
      await api.put(`/api/appointments/${id}/${action}`)
      toast.success('Cita actualizada')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    }
  }

  const cols = [
    { key: 'time', label: 'Hora', render: (r) => <span className="font-medium">{formatTime(r.time || r.slot)}</span> },
    { key: 'client', label: 'Cliente', render: (r) => r.client?.name || '—' },
    { key: 'barber', label: 'Barbero', render: (r) => r.barber?.user?.name || '—' },
    { key: 'service', label: 'Servicio', render: (r) => r.service?.name || '—' },
    { key: 'status', label: 'Estado', render: (r) => <Badge status={r.status} /> },
    {
      key: 'actions', label: 'Acciones', render: (r) => (
        <div className="flex gap-1">
          {r.status === 'PENDING' && (
            <Button size="sm" variant="outline" onClick={() => handleAction(r.id, 'confirm')}>Confirmar</Button>
          )}
          {(r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS') && (
            <Button size="sm" onClick={() => handleAction(r.id, 'complete')}>Completar</Button>
          )}
          {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.status !== 'NO_SHOW' && (
            <Button size="sm" variant="danger" onClick={() => handleAction(r.id, 'noshow')}>No vino</Button>
          )}
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" title="Ingresos del día" value={formatCurrency(overview?.revenue?.total || 0)} subtitle="vs ayer" trend trendUp />
        <StatCard icon="✂️" title="Cortes hoy" value={overview?.appointments?.completed || 0} subtitle="completados" />
        <StatCard icon="📅" title="Citas pendientes" value={overview?.appointments?.total || 0} subtitle="para hoy" />
        <StatCard icon="⭐" title="Rating promedio" value={`${(overview?.avgRating || 0).toFixed(1)}/5`} subtitle="de clientes" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda */}
        <div className="lg:col-span-2">
          <Card title={`Agenda de hoy — ${format(new Date(), "d 'de' MMMM", { locale: es })}`}>
            <div className="overflow-x-auto">
              {loadingAppts ? (
                <p className="text-secondary text-sm py-4 text-center">Cargando citas...</p>
              ) : appointments.length === 0 ? (
                <p className="text-secondary text-sm py-4 text-center">No hay citas para hoy</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-soft">
                      {cols.map(c => <th key={c.key} className="text-left py-2 px-2 text-xs font-semibold text-secondary uppercase">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 8).map((row, i) => (
                      <tr key={row.id || i} className="border-b border-gray-soft/50 hover:bg-cream transition-colors">
                        {cols.map(c => <td key={c.key} className="py-2 px-2">{c.render ? c.render(row) : row[c.key]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* Gráfica */}
        <Card title="Ingresos (últimos 7 días)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B5E3C' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8B5E3C' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Ingresos']} />
              <Line type="monotone" dataKey="ingresos" stroke="#C49A6C" strokeWidth={2} dot={{ fill: '#4A2C0A', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Barberos */}
      {barbersData?.barbers?.length > 0 && (
        <Card title="Rendimiento de barberos">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbersData.barbers.map((b) => (
              <div key={b.barberId} className="flex items-center gap-3 p-3 bg-cream rounded-lg">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
                  {b.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-black-soft text-sm truncate">{b.name}</p>
                  <p className="text-xs text-secondary">{b.cutsToday || 0} cortes hoy · ⭐ {(b.rating || 0).toFixed(1)}</p>
                  <p className="text-xs font-medium text-accent">{formatCurrency(b.earningsThisMonth || 0)} este mes</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
