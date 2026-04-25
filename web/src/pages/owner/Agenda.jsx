import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, List, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatTime } from '../../utils/formatters'

const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800',
  CONFIRMED: 'bg-blue-100 border-l-4 border-blue-400 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 border-l-4 border-purple-400 text-purple-800',
  COMPLETED: 'bg-green-100 border-l-4 border-green-400 text-green-800',
  CANCELLED: 'bg-red-100 border-l-4 border-red-400 text-red-500',
  NO_SHOW: 'bg-gray-100 border-l-4 border-gray-400 text-gray-500',
}

export default function OwnerAgenda() {
  const qc = useQueryClient()
  const [viewMode, setViewMode] = useState('list') // 'calendar' | 'list'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [filterBarber, setFilterBarber] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [confirm, setConfirm] = useState(null)

  const { data: shopData } = useQuery({
    queryKey: ['my-barbershops'],
    queryFn: () => api.get('/api/barbershops/my').then(r => r.data),
  })
  const shop = shopData?.barbershops?.[0] || shopData?.[0]
  const shopId = shop?.id

  const dateStr = format(currentDate, 'yyyy-MM-dd')

  const { data: apptData, isLoading } = useQuery({
    queryKey: ['appointments', shopId, dateStr],
    queryFn: () => api.get(`/api/appointments/shop/${shopId}?date=${dateStr}`).then(r => r.data),
    enabled: !!shopId,
  })

  const { data: barbersData } = useQuery({
    queryKey: ['barbers', shopId],
    queryFn: () => api.get(`/api/barbers/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const { data: waitlistData } = useQuery({
    queryKey: ['waitlist', shopId, dateStr],
    queryFn: () => api.get(`/api/waitlist/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const appointments = apptData?.appointments || apptData || []
  const barbers = barbersData?.barbers || barbersData || []
  const waitlist = waitlistData?.waitlist || waitlistData || []

  const { mutate: doAction, isPending: actioning } = useMutation({
    mutationFn: ({ id, action }) => api.put(`/api/appointments/${id}/${action}`),
    onSuccess: () => {
      toast.success('Cita actualizada')
      qc.invalidateQueries(['appointments', shopId, dateStr])
      setSelectedAppt(null)
      setConfirm(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  })

  const { mutate: notifyWaitlist } = useMutation({
    mutationFn: (id) => api.post(`/api/waitlist/${id}/notify`),
    onSuccess: () => toast.success('Notificación enviada'),
    onError: () => toast.error('Error al notificar'),
  })

  const filtered = appointments.filter(a => {
    if (filterBarber && a.barber?.id !== filterBarber) return false
    if (filterStatus && a.status !== filterStatus) return false
    return true
  })

  const getApptSlot = (appt) => {
    const time = appt.time || appt.slot || ''
    return time.slice(0, 5)
  }

  const getApptsByBarberAndHour = (barberId, hour) =>
    appointments.filter(a => a.barber?.id === barberId && getApptSlot(a).startsWith(hour.slice(0, 2)))

  const handleActionConfirm = (id, action, msg) => {
    if (action === 'cancel') {
      setConfirm({ id, action, msg })
    } else {
      doAction({ id, action })
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => subDays(d, 1))}
            className="p-2 rounded-lg border border-gray-soft hover:bg-cream cursor-pointer transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-primary min-w-[180px] text-center capitalize">
            {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
          </span>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))}
            className="p-2 rounded-lg border border-gray-soft hover:bg-cream cursor-pointer transition-colors">
            <ChevronRight size={16} />
          </button>
          <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'border border-gray-soft hover:bg-cream'}`}>
            <List size={16} />
          </button>
          <button onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === 'calendar' ? 'bg-primary text-white' : 'border border-gray-soft hover:bg-cream'}`}>
            <Calendar size={16} />
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <Card title={`Citas del día — ${filtered.length} citas`}>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}
              className="rounded-lg border border-gray-soft px-3 py-1.5 text-sm outline-none focus:border-accent">
              <option value="">Todos los barberos</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.user?.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-soft px-3 py-1.5 text-sm outline-none focus:border-accent">
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="NO_SHOW">No se presentó</option>
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-soft/30 rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl">✂️</span>
              <p className="mt-3 font-semibold text-primary">No hay citas programadas para hoy</p>
              <p className="text-secondary text-sm mt-1">Disfruta el día de descanso</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.sort((a, b) => getApptSlot(a).localeCompare(getApptSlot(b))).map(appt => (
                <div key={appt.id}
                  className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${STATUS_COLORS[appt.status] || 'bg-cream'}`}
                  onClick={() => setSelectedAppt(appt)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm w-16">{formatTime(getApptSlot(appt))}</span>
                      <div>
                        <p className="font-semibold text-sm">{appt.client?.name || '—'}</p>
                        <p className="text-xs opacity-80">{appt.service?.name} · {appt.barber?.user?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{formatCurrency(appt.service?.price || 0)}</span>
                      <Badge status={appt.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card title="Vista calendario">
          {isLoading ? (
            <div className="h-64 bg-gray-soft/30 rounded-lg animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="w-16 p-2 text-secondary font-medium border border-gray-soft/50">Hora</th>
                    {barbers.filter(b => b.isActive !== false).map(b => (
                      <th key={b.id} className="p-2 text-secondary font-medium border border-gray-soft/50 min-w-[120px]">
                        {b.user?.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map(hour => (
                    <tr key={hour}>
                      <td className="p-2 text-secondary text-center border border-gray-soft/50 bg-cream/50">{hour}</td>
                      {barbers.filter(b => b.isActive !== false).map(b => {
                        const appts = getApptsByBarberAndHour(b.id, hour)
                        return (
                          <td key={b.id} className="border border-gray-soft/50 p-1 h-14 align-top">
                            {appts.map(a => (
                              <div key={a.id}
                                className={`p-1 rounded mb-1 cursor-pointer text-xs font-medium truncate ${STATUS_COLORS[a.status] || 'bg-cream'}`}
                                onClick={() => setSelectedAppt(a)}>
                                {a.client?.name?.split(' ')[0]} - {a.service?.name}
                              </div>
                            ))}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <Card title={`Lista de espera — ${waitlist.length} en espera`}>
          <div className="space-y-2">
            {waitlist.map((w, i) => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-cream rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <div>
                    <p className="font-medium text-sm text-black-soft">{w.client?.name || w.user?.name || '—'}</p>
                    <p className="text-xs text-secondary">{w.service?.name || '—'} · {w.preferredTime || 'Sin hora preferida'}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => notifyWaitlist(w.id)}>
                  <Bell size={13} /> Notificar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Appointment Detail Modal */}
      <Modal open={!!selectedAppt} onClose={() => setSelectedAppt(null)} title="Detalle de la cita">
        {selectedAppt && (
          <div className="space-y-4">
            {/* Client info */}
            <div className="flex items-center gap-3 p-3 bg-cream rounded-lg">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {selectedAppt.client?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-black-soft">{selectedAppt.client?.name || '—'}</p>
                {selectedAppt.client?.phone && (
                  <a href={`https://wa.me/${selectedAppt.client.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    className="text-sm text-green-600 hover:underline flex items-center gap-1">
                    💬 {selectedAppt.client.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Appointment details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-cream rounded-lg p-3">
                <p className="text-secondary text-xs">Servicio</p>
                <p className="font-semibold text-black-soft">{selectedAppt.service?.name || '—'}</p>
                <p className="text-accent font-bold">{formatCurrency(selectedAppt.service?.price || 0)}</p>
              </div>
              <div className="bg-cream rounded-lg p-3">
                <p className="text-secondary text-xs">Barbero</p>
                <p className="font-semibold text-black-soft">{selectedAppt.barber?.user?.name || '—'}</p>
              </div>
              <div className="bg-cream rounded-lg p-3">
                <p className="text-secondary text-xs">Hora</p>
                <p className="font-semibold">{formatTime(getApptSlot(selectedAppt))} — {formatTime(
                  (() => {
                    const [h, m] = getApptSlot(selectedAppt).split(':')
                    const end = new Date(0, 0, 0, parseInt(h), parseInt(m) + 40)
                    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
                  })()
                )}</p>
              </div>
              <div className="bg-cream rounded-lg p-3">
                <p className="text-secondary text-xs">Estado</p>
                <Badge status={selectedAppt.status} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-soft">
              {selectedAppt.status === 'PENDING' && (
                <>
                  <Button size="sm" onClick={() => doAction({ id: selectedAppt.id, action: 'confirm' })} loading={actioning}>
                    Confirmar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleActionConfirm(selectedAppt.id, 'cancel', `¿Cancelar la cita de ${selectedAppt.client?.name}? El cliente será notificado.`)}>
                    Cancelar
                  </Button>
                </>
              )}
              {(selectedAppt.status === 'CONFIRMED' || selectedAppt.status === 'IN_PROGRESS') && (
                <>
                  <Button size="sm" onClick={() => doAction({ id: selectedAppt.id, action: 'complete' })} loading={actioning}>
                    Completar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doAction({ id: selectedAppt.id, action: 'noshow' })} loading={actioning}>
                    No se presentó
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleActionConfirm(selectedAppt.id, 'cancel', `¿Cancelar la cita de ${selectedAppt.client?.name}? El cliente será notificado.`)}>
                    Cancelar
                  </Button>
                </>
              )}
              {selectedAppt.status === 'COMPLETED' && selectedAppt.review && (
                <div className="text-sm text-secondary bg-cream p-2 rounded-lg w-full">
                  ⭐ {selectedAppt.review.rating}/5 — "{selectedAppt.review.comment}"
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        message={confirm?.msg}
        confirmLabel="Sí, cancelar cita"
        confirmVariant="danger"
        onConfirm={() => doAction({ id: confirm.id, action: confirm.action })}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
