import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, TrendingDown, DollarSign, Scissors, Calendar, Star, AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
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
  const shop = shopData?.barbershops?.[0] || shopData?.[0]
  const shopId = shop?.id

  // Plan vencido: la barbería deja de ser visible para nuevos clientes
  const planExpired = shop && (
    shop.isVisible === false ||
    ['EXPIRED', 'CANCELLED'].includes(shop.subscription?.status)
  )

  const { data: completeness } = useQuery({
    queryKey: ['shop-completeness', shopId],
    queryFn: () => api.get(`/api/barbershops/${shopId}/completeness`).then(r => r.data),
    enabled: !!shopId,
  })

  const { data: overview } = useQuery({
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

  const { data: revenueData } = useQuery({
    queryKey: ['shop-revenue-chart', shopId],
    queryFn: () => api.get(`/api/analytics/shop/${shopId}/overview?period=week`).then(r => r.data),
    enabled: !!shopId,
  })

  const chartData = (revenueData?.dailyRevenue || []).map(d => ({
    date: d.day,
    ingresos: d.revenue,
  }))

  const appointments = apptData?.appointments || apptData || []

  const handleAction = async (id, action) => {
    try {
      await api.put(`/api/appointments/${id}/${action}`)
      toast.success('Cita actualizada')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    }
  }

  const statCards = [
    {
      icon: <DollarSign size={20} className="text-accent" />,
      value: formatCurrency(overview?.revenue?.total || 0),
      label: 'Ingresos hoy',
      trend: '+12%',
      trendUp: true,
    },
    {
      icon: <Scissors size={20} className="text-accent" />,
      value: overview?.appointments?.completed || 0,
      label: 'Cortes hoy',
      trend: `${overview?.appointments?.total || 0} programados`,
      trendUp: null,
    },
    {
      icon: <Calendar size={20} className="text-accent" />,
      value: `${overview?.shopPercentage || 40}%`,
      label: 'Ganancia Barbería',
      trend: 'del total',
      trendUp: null,
    },
    {
      icon: <Star size={20} className="text-accent" />,
      value: `${(overview?.avgRating || 0).toFixed(1)}/5`,
      label: 'Rating promedio',
      trend: `${overview?.reviewCount || 0} reseñas`,
      trendUp: null,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Banner: plan vencido = barbería oculta */}
      {planExpired && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">Tu barbería no es visible.</p>
            <p className="text-sm text-red-600 mt-0.5">
              Renueva tu plan para volver a aparecer. Tus citas ya agendadas no se cancelan,
              pero los nuevos clientes no pueden encontrarte.
            </p>
          </div>
          <Link
            to="/owner/settings"
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
          >
            Renovar plan
          </Link>
        </div>
      )}

      {/* Banner: ficha incompleta */}
      {completeness && !completeness.isComplete && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">
                Tu ficha está al {completeness.percentage}%. Complétala para atraer más clientes.
              </p>
              <div className="mt-2 w-full bg-amber-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${completeness.percentage}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {completeness.checklist?.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-sm">
                    {item.done ? (
                      <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle size={15} className="text-amber-500 flex-shrink-0" />
                    )}
                    <span className={item.done ? 'text-muted line-through' : 'text-amber-800'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Link
              to="/owner/settings"
              className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors flex-shrink-0"
            >
              Completar
            </Link>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center flex-shrink-0">
                {s.icon}
              </div>
              {s.trendUp !== null && (
                <span className={`flex items-center gap-1 text-xs font-medium ${s.trendUp ? 'text-success' : 'text-destructive'}`}>
                  {s.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {s.trend}
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
              {s.trendUp === null && s.trend && (
                <p className="text-xs text-muted/70 mt-0.5">{s.trend}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda del día */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(74,44,10,0.08)]">
            <h3 className="font-semibold text-primary font-heading">
              Agenda del día — {format(new Date(), "d 'de' MMMM", { locale: es })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loadingAppts ? (
              <p className="text-muted text-sm py-8 text-center">Cargando citas...</p>
            ) : appointments.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No hay citas para hoy</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cream">
                    {['Hora', 'Cliente', 'Barbero', 'Servicio', 'Precio', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 8).map((row, i) => (
                    <tr key={row.id || i} className={`border-b border-[rgba(74,44,10,0.06)] hover:bg-cream/50 transition-colors ${i % 2 === 1 ? 'bg-cream/30' : ''}`}>
                      <td className="py-3 px-4 font-semibold text-primary">{formatTime(row.time || row.slot)}</td>
                      <td className="py-3 px-4">{row.client?.name || '—'}</td>
                      <td className="py-3 px-4 text-muted">{row.barber?.user?.name || '—'}</td>
                      <td className="py-3 px-4 text-muted">{row.service?.name || '—'}</td>
                      <td className="py-3 px-4 font-medium text-accent">{formatCurrency(row.price || 0)}</td>
                      <td className="py-3 px-4"><Badge status={row.status} /></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {row.status === 'PENDING' && (
                            <button onClick={() => handleAction(row.id, 'confirm')}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                              Confirmar
                            </button>
                          )}
                          {(row.status === 'CONFIRMED' || row.status === 'IN_PROGRESS') && (
                            <button onClick={() => handleAction(row.id, 'complete')}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                              ✓
                            </button>
                          )}
                          {row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && row.status !== 'NO_SHOW' && (
                            <button onClick={() => handleAction(row.id, 'noshow')}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="font-semibold text-primary font-heading mb-4">Ingresos últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,44,10,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9E8670' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9E8670' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => [formatCurrency(v), 'Ingresos']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(74,44,10,0.12)' }}
              />
              <Line type="monotone" dataKey="ingresos" stroke="#C49A6C" strokeWidth={2.5} dot={{ fill: '#4A2C0A', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barbers performance */}
      {barbersData?.barbers?.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="font-semibold text-primary font-heading mb-4">Rendimiento de barberos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbersData.barbers.map((b) => (
              <div key={b.barberId} className="flex items-center gap-3 p-4 bg-cream rounded-xl">
                <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {b.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary text-sm truncate">{b.name}</p>
                  <p className="text-xs text-muted">{b.cutsToday || 0} cortes hoy · ⭐ {(b.rating || 0).toFixed(1)}</p>
                  <p className="text-xs font-semibold text-accent mt-0.5">{formatCurrency(b.earningsThisMonth || 0)} este mes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
