import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { formatCurrency, formatTime } from '../../utils/formatters'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8am - 8pm

const STATUS_BG = {
  PENDING: 'bg-yellow-50 border-l-4 border-yellow-400',
  CONFIRMED: 'bg-blue-50 border-l-4 border-blue-400',
  IN_PROGRESS: 'bg-purple-50 border-l-4 border-purple-400',
  COMPLETED: 'bg-green-50 border-l-4 border-green-400',
  CANCELLED: 'bg-gray-100 border-l-4 border-gray-300 opacity-60',
  NO_SHOW: 'bg-red-50 border-l-4 border-red-300 opacity-70',
}

export default function BarberAgenda() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAppt, setSelectedAppt] = useState(null)
  const nowRef = useRef()

  const dateStr = format(currentDate, 'yyyy-MM-dd')
  const isTodayView = isToday(currentDate)

  // Get barber profile
  const { data: barberData } = useQuery({
    queryKey: ['my-barber-profile'],
    queryFn: () => api.get('/api/barbers/my').then(r => r.data),
  })
  const barberId = barberData?.barber?.id || barberData?.id

  // Get barber card (stats)
  const { data: cardData } = useQuery({
    queryKey: ['barber-card', barberId],
    queryFn: () => api.get(`/api/barber-card/${barberId}`).then(r => r.data),
    enabled: !!barberId,
  })

  // Get appointments for the day
  const { data: calData, isLoading } = useQuery({
    queryKey: ['barber-calendar', barberId, dateStr],
    queryFn: () => api.get(`/api/calendar/barber/${barberId}/day/${dateStr}`).then(r => r.data),
    enabled: !!barberId,
    refetchInterval: 60000,
  })

  const appointments = calData?.appointments || calData || []

  const { mutate: doAction, isPending: actioning } = useMutation({
    mutationFn: ({ id, action }) => api.put(`/api/appointments/${id}/${action}`),
    onSuccess: () => {
      toast.success('Cita actualizada')
      qc.invalidateQueries({ queryKey: ['barber-calendar', barberId, dateStr] })
      qc.invalidateQueries({ queryKey: ['barber-card', barberId] })
      setSelectedAppt(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  // Scroll to current time
  useEffect(() => {
    if (isTodayView && nowRef.current) {
      nowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isTodayView, isLoading])

  const getApptAtHour = (hour) =>
    appointments.filter(a => {
      const h = parseInt((a.time || a.slot || '00:00').split(':')[0])
      return h === hour
    })

  const card = cardData?.barber || cardData
  const todayStats = cardData?.today || {}
  const nextAppt = appointments.find(a => a.status === 'PENDING' || a.status === 'CONFIRMED')

  const currentHour = new Date().getHours()

  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard icon="✂️" title="Cortes hoy"
          value={`${todayStats.completed || 0} / ${appointments.length}`} />
        <MiniCard icon="⏰" title="Próxima cita"
          value={nextAppt ? `${formatTime(nextAppt.time || nextAppt.slot)} · ${nextAppt.client?.name?.split(' ')[0]}` : 'Sin citas'} />
        <MiniCard icon="💰" title="Ganado hoy"
          value={formatCurrency(todayStats.earnings || 0)} accent />
        <MiniCard icon="⭐" title="Mi rating"
          value={`${(card?.rating || 0).toFixed(1)} / 5`} />
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => subDays(d, 1))}
            className="p-2 rounded-lg border border-gray-soft hover:bg-cream cursor-pointer transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-primary min-w-[200px] text-center capitalize">
            {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
          </span>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))}
            className="p-2 rounded-lg border border-gray-soft hover:bg-cream cursor-pointer transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        {!isTodayView && (
          <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        )}
      </div>

      {/* Timeline */}
      <Card title={`Agenda del día — ${appointments.length} citas`}>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}</div>
        ) : (
          <div className="relative space-y-0">
            {HOURS.map(hour => {
              const appts = getApptAtHour(hour)
              const isCurrentHour = isTodayView && hour === currentHour
              const nextHourAppts = getApptAtHour(hour + 1)
              const hasGap = appts.length > 0 && nextHourAppts.length === 0

              return (
                <div key={hour}>
                  {/* Hour marker */}
                  <div ref={isCurrentHour ? nowRef : null}
                    className="flex gap-3 items-start py-1">
                    <span className={`text-xs w-12 flex-shrink-0 font-medium pt-1 ${isCurrentHour ? 'text-red-500' : 'text-secondary'}`}>
                      {String(hour).padStart(2, '0')}:00
                    </span>
                    <div className="flex-1">
                      {/* Red line for current time */}
                      {isCurrentHour && (
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                      )}

                      {appts.length > 0 ? (
                        <div className="space-y-2">
                          {appts.map(a => (
                            <div key={a.id}
                              className={`rounded-lg p-3 cursor-pointer hover:opacity-90 transition-opacity ${STATUS_BG[a.status] || 'bg-cream'} ${a.status === 'CANCELLED' ? 'line-through' : ''}`}
                              onClick={() => setSelectedAppt(a)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                                    {a.client?.avatar
                                      ? <img src={a.client.avatar} alt="" className="w-full h-full object-cover" />
                                      : a.client?.name?.[0]?.toUpperCase() || '?'
                                    }
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm text-black-soft">{a.client?.name || '—'}</p>
                                    <p className="text-xs text-secondary">{a.service?.name}</p>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <div>
                                    <p className="text-xs font-medium text-primary">
                                      {formatTime(a.time || a.slot)} → {formatTime(
                                        (() => {
                                          const [h, m] = (a.time || a.slot || '00:00').split(':')
                                          const end = new Date(0, 0, 0, parseInt(h), parseInt(m) + 40)
                                          return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
                                        })()
                                      )}
                                    </p>
                                    <p className="text-xs font-bold text-accent">{formatCurrency(a.service?.price || 0)}</p>
                                  </div>
                                  {a.status === 'COMPLETED'
                                    ? <Check size={18} className="text-green-500" />
                                    : <Badge status={a.status} />
                                  }
                                </div>
                              </div>

                              {/* Quick action buttons */}
                              {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                                <div className="flex gap-2 mt-2 pt-2 border-t border-black/5"
                                  onClick={e => e.stopPropagation()}>
                                  {a.status === 'PENDING' && (
                                    <Button size="sm" onClick={() => doAction({ id: a.id, action: 'confirm' })} loading={actioning}>
                                      Confirmar
                                    </Button>
                                  )}
                                  {a.status === 'CONFIRMED' && (
                                    <>
                                      <Button size="sm" onClick={() => doAction({ id: a.id, action: 'complete' })} loading={actioning}>
                                        Completar
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => doAction({ id: a.id, action: 'no-show' })} loading={actioning}>
                                        No-show
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-soft/60 rounded-lg px-3 py-2 text-xs text-gray-400">
                          Disponible {String(hour).padStart(2, '0')}:00 – {String(hour + 1).padStart(2, '0')}:00
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {appointments.length === 0 && !isLoading && (
              <div className="text-center py-10">
                <span className="text-4xl">✂️</span>
                <p className="mt-3 font-semibold text-primary">No hay citas para este día</p>
                <p className="text-sm text-secondary mt-1">Disfruta tu descanso</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Appointment Detail Modal */}
      <Modal open={!!selectedAppt} onClose={() => setSelectedAppt(null)} title="Detalle de la cita">
        {selectedAppt && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-cream rounded-lg">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden">
                {selectedAppt.client?.avatar
                  ? <img src={selectedAppt.client.avatar} alt="" className="w-full h-full object-cover" />
                  : selectedAppt.client?.name?.[0]?.toUpperCase() || '?'
                }
              </div>
              <div>
                <p className="font-semibold text-black-soft">{selectedAppt.client?.name || '—'}</p>
                {selectedAppt.client?.phone && (
                  <a href={`https://wa.me/${selectedAppt.client.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    className="text-sm text-green-600 hover:underline flex items-center gap-1 mt-0.5">
                    📱 {selectedAppt.client.phone}
                  </a>
                )}
                {selectedAppt.client?.phone && (
                  <a href={`tel:${selectedAppt.client.phone}`}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    📞 Llamar
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-cream rounded-lg p-3">
                <p className="text-secondary text-xs">Servicio</p>
                <p className="font-semibold">{selectedAppt.service?.name || '—'}</p>
                <p className="text-accent font-bold">{formatCurrency(selectedAppt.service?.price || 0)}</p>
              </div>
              <div className="bg-cream rounded-lg p-3">
                <p className="text-secondary text-xs">Hora</p>
                <p className="font-semibold">{formatTime(selectedAppt.time || selectedAppt.slot)}</p>
              </div>
            </div>

            {selectedAppt.notes && (
              <div className="bg-cream rounded-lg p-3 text-sm">
                <p className="text-secondary text-xs mb-1">Notas del cliente</p>
                <p>{selectedAppt.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-secondary">Estado:</span>
              <Badge status={selectedAppt.status} />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-soft">
              {selectedAppt.status === 'PENDING' && (
                <Button size="sm" onClick={() => doAction({ id: selectedAppt.id, action: 'confirm' })} loading={actioning}>
                  Confirmar
                </Button>
              )}
              {(selectedAppt.status === 'CONFIRMED' || selectedAppt.status === 'IN_PROGRESS') && (
                <>
                  <Button size="sm" onClick={() => doAction({ id: selectedAppt.id, action: 'complete' })} loading={actioning}>
                    Completar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doAction({ id: selectedAppt.id, action: 'no-show' })} loading={actioning}>
                    No-show
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MiniCard({ icon, title, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-soft p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-secondary font-medium">{title}</span>
      </div>
      <p className={`font-bold text-sm ${accent ? 'text-accent' : 'text-primary'} font-heading truncate`}>{value}</p>
    </div>
  )
}
