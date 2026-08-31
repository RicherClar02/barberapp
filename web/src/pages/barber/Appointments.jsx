import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters'

const TABS = [
  { key: 'upcoming', label: 'Próximas', statuses: 'PENDING,CONFIRMED,IN_PROGRESS' },
  { key: 'completed', label: 'Completadas', statuses: 'COMPLETED' },
  { key: 'cancelled', label: 'Canceladas', statuses: 'CANCELLED,NO_SHOW' },
]

export default function BarberAppointments() {
  const [tab, setTab] = useState('upcoming')
  const [fromDate, setFromDate] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)

  const { data: barberData } = useQuery({
    queryKey: ['my-barber-profile'],
    queryFn: () => api.get('/api/barbers/my').then(r => r.data),
  })
  const barber = barberData?.barber || barberData
  // Dos identificadores distintos: /api/earnings/barber/:barberId espera el id
  // del perfil, y /api/appointments/barber/:userId el del usuario (lo compara
  // contra el dueño del token). Confundirlos devuelve 403.
  const barberId = barber?.id
  const barberUserId = barber?.userId
  const barberPct = barber?.barbershop?.config?.barberPercentage || 60

  const currentTab = TABS.find(t => t.key === tab)

  const { data, isLoading } = useQuery({
    queryKey: ['barber-appointments', barberUserId],
    queryFn: () =>
      api.get(`/api/appointments/barber/${barberUserId}`).then(r => r.data),
    enabled: !!barberUserId,
  })

  const { data: statsData } = useQuery({
    queryKey: ['barber-appt-stats', barberId],
    queryFn: () => api.get(`/api/earnings/barber/${barberId}?period=all`).then(r => r.data),
    enabled: !!barberId,
  })

  // El endpoint devuelve la agenda completa del barbero y solo acepta ?date,
  // así que pestaña, fecha desde, búsqueda y paginado se resuelven acá. Si la
  // lista crece, esto se mueve al backend con page/limit/status reales.
  const PAGE_SIZE = 15
  const allAppointments = data?.appointments || data || []
  const wantedStatuses = (currentTab?.statuses || '').split(',')
  const filtered = allAppointments.filter(a => {
    if (!wantedStatuses.includes(a.status)) return false
    if (fromDate && a.date?.slice(0, 10) < fromDate) return false
    if (search && !a.client?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const total = filtered.length
  const appointments = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const stats = statsData?.earnings || {}

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total completadas', value: stats.totalCuts || 0 },
          { label: 'Total ganado', value: formatCurrency(stats.totalEarnings || 0) },
          { label: 'Tasa completadas', value: `${stats.completionRate || 0}%` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-soft p-4 text-center">
            <p className="text-xl font-bold text-primary font-heading">{s.value}</p>
            <p className="text-xs text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-soft p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === t.key ? 'bg-primary text-white' : 'text-secondary hover:bg-cream'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card title={`${currentTab?.label} — ${total}`}>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input placeholder="Buscar cliente..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-soft px-3 py-1.5 text-sm outline-none focus:border-accent flex-1 min-w-[160px]" />
          <input type="date" value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-soft px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>

        {isLoading ? <SkeletonTable rows={6} cols={5} /> : appointments.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-3xl">📋</span>
            <p className="mt-2 text-secondary">No hay citas {currentTab?.label.toLowerCase()}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-soft">
                    {['Cliente', 'Fecha y hora', 'Servicio', 'Precio', 'Mi ganancia', 'Estado', ''].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id} className="border-b border-gray-soft/50 hover:bg-cream">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {a.client?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium truncate max-w-[100px]">{a.client?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-secondary">
                        <p>{formatDate(a.date || a.createdAt)}</p>
                        {a.startTime && <p className="font-medium text-black-soft">{formatTime(a.startTime)}</p>}
                      </td>
                      <td className="py-2.5 px-3">{a.service?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-secondary">{formatCurrency(a.service?.price || 0)}</td>
                      <td className="py-2.5 px-3 font-semibold text-accent">
                        {formatCurrency((a.service?.price || 0) * barberPct / 100)}
                      </td>
                      <td className="py-2.5 px-3"><Badge status={a.status} /></td>
                      <td className="py-2.5 px-3">
                        <Button size="sm" variant="outline" onClick={() => setDetail(a)}>Ver</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-secondary">{total} citas</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <span className="px-3 py-1 bg-cream rounded-lg font-medium">Pág {page}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={appointments.length < 15}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalle de cita">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-cream rounded-lg">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg">
                {detail.client?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold">{detail.client?.name || '—'}</p>
                {detail.client?.phone && (
                  <a href={`https://wa.me/${detail.client.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    className="text-sm text-green-600 hover:underline">
                    💬 {detail.client.phone}
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-cream rounded-lg p-2"><p className="text-xs text-secondary">Fecha</p><p className="font-semibold">{formatDate(detail.date || detail.createdAt)}</p></div>
              <div className="bg-cream rounded-lg p-2">
                <p className="text-xs text-secondary">Hora</p>
                <p className="font-semibold">
                  {detail.startTime
                    ? `${formatTime(detail.startTime)}${detail.endTime ? ` → ${formatTime(detail.endTime)}` : ''}`
                    : '—'}
                </p>
              </div>
              <div className="bg-cream rounded-lg p-2"><p className="text-xs text-secondary">Servicio</p><p className="font-semibold">{detail.service?.name}</p></div>
              <div className="bg-cream rounded-lg p-2"><p className="text-xs text-secondary">Precio</p><p className="font-semibold text-accent">{formatCurrency(detail.service?.price || 0)}</p></div>
              <div className="bg-cream rounded-lg p-2"><p className="text-xs text-secondary">Mi ganancia</p><p className="font-semibold text-green-600">{formatCurrency((detail.service?.price || 0) * barberPct / 100)}</p></div>
              <div className="bg-cream rounded-lg p-2"><p className="text-xs text-secondary">Estado</p><Badge status={detail.status} /></div>
            </div>
            {detail.notes && <div className="bg-cream rounded-lg p-3 text-sm"><p className="text-secondary text-xs mb-1">Notas</p><p>{detail.notes}</p></div>}
            {detail.review && (
              <div className="bg-cream rounded-lg p-3 text-sm">
                <p className="text-secondary text-xs mb-1">Reseña del cliente</p>
                <p className="font-medium">⭐ {detail.review.rating}/5</p>
                {detail.review.comment && <p className="italic text-secondary mt-1">"{detail.review.comment}"</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
