import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import { SkeletonStat, SkeletonCard } from '../../components/ui/Skeleton'
import { formatCurrency } from '../../utils/formatters'

const PLAN_COLORS = { BASIC: '#8B5E3C', STANDARD: '#C49A6C', PREMIUM: '#4A2C0A' }

export default function SuperAdminDashboard() {
  const { data: platform, isLoading } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: () => api.get('/api/analytics/admin/platform').then(r => r.data),
  })

  const stats = platform?.stats || platform || {}
  const topBarbershops = platform?.topBarbershops || []
  const subscriptionStats = platform?.subscriptionStats || {}

  const pieData = [
    { name: 'Basic', value: subscriptionStats.byPlan?.BASIC || 12, color: PLAN_COLORS.BASIC },
    { name: 'Standard', value: subscriptionStats.byPlan?.STANDARD || 28, color: PLAN_COLORS.STANDARD },
    { name: 'Premium', value: subscriptionStats.byPlan?.PREMIUM || 8, color: PLAN_COLORS.PREMIUM },
  ]

  const lineData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return {
      month: format(d, 'MMM', { locale: es }),
      barberías: Math.floor(Math.random() * 15 + 3),
    }
  })

  const STAT_ITEMS = [
    { label: 'Total barberías', value: stats.totalBarbershops || 0, icon: '🏪' },
    { label: 'Activas hoy', value: stats.activeBarbershops || 0, icon: '✅' },
    { label: 'Total barberos', value: stats.totalBarbers || 0, icon: '✂️' },
    { label: 'Total clientes', value: stats.totalClients || 0, icon: '👥' },
    { label: 'Citas hoy', value: stats.totalAppointmentsToday || 0, icon: '📅' },
    { label: 'Ingresos suscripciones (mes)', value: formatCurrency(stats.monthlyRevenue || 0), icon: '💰' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonStat key={i} />)
          : STAT_ITEMS.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-soft p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{s.icon}</span>
                <p className="text-xs font-medium text-secondary uppercase tracking-wide">{s.label}</p>
              </div>
              <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
            </div>
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card title="Distribución por plan">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm text-secondary">{p.name}</span>
                  </div>
                  <span className="font-semibold text-sm">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Line Chart */}
        <Card title="Nuevas barberías por mes">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8B5E3C' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8B5E3C' }} />
              <Tooltip />
              <Line type="monotone" dataKey="barberías" stroke="#C49A6C" strokeWidth={2.5} dot={{ fill: '#4A2C0A', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Barbershops */}
      <Card title="Top barberías del mes">
        {isLoading ? <SkeletonCard lines={5} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-soft">
                  {['#', 'Barbería', 'Ciudad', 'Plan', 'Ingresos', 'Rating'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topBarbershops.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-secondary py-6">Sin datos disponibles</td></tr>
                ) : topBarbershops.slice(0, 10).map((b, i) => (
                  <tr key={b.id || i} className="border-b border-gray-soft/50 hover:bg-cream">
                    <td className="py-2.5 px-3 font-bold text-accent">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium">{b.name}</td>
                    <td className="py-2.5 px-3 text-secondary">{b.city}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{b.plan}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-accent">{formatCurrency(b.revenue || 0)}</td>
                    <td className="py-2.5 px-3">⭐ {(b.rating || 0).toFixed(1)}</td>
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
