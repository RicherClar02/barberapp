import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getDayColor(count) {
  if (count === 0) return ''
  if (count <= 2) return 'bg-green-100 text-green-800'
  if (count <= 5) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function getDotColor(count) {
  if (count === 0) return ''
  if (count <= 2) return 'bg-green-500'
  if (count <= 5) return 'bg-yellow-400'
  return 'bg-red-500'
}

export default function BarberCalendar() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStr = format(currentMonth, 'yyyy-MM')

  const { data: barberData } = useQuery({
    queryKey: ['my-barber-profile'],
    queryFn: () => api.get('/api/barbers/my').then(r => r.data),
  })
  const barberId = barberData?.barber?.id || barberData?.id

  const { data: calData, isLoading } = useQuery({
    queryKey: ['barber-monthly-calendar', barberId, monthStr],
    queryFn: () => api.get(`/api/calendar/barber/${barberId}?month=${monthStr}`).then(r => r.data),
    enabled: !!barberId,
  })

  const appointmentsByDay = calData?.byDay || {}

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start with empty slots (Mon=0, Sun=6 index)
  const startDow = (getDay(monthStart) + 6) % 7 // adjust to Mon-start
  const paddedDays = [...Array(startDow).fill(null), ...days]

  const handleDayClick = (day) => {
    if (!day) return
    const dateStr = format(day, 'yyyy-MM-dd')
    navigate('/barber/agenda', { state: { date: dateStr } })
  }

  return (
    <div className="space-y-6">
      <Card>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-lg border border-gray-soft hover:bg-cream cursor-pointer transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-bold text-primary text-lg font-heading capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-lg border border-gray-soft hover:bg-cream cursor-pointer transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-secondary py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-soft/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={i} />
              const dateKey = format(day, 'yyyy-MM-dd')
              const count = appointmentsByDay[dateKey] || 0
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)

              return (
                <button key={dateKey}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative flex flex-col items-center justify-start pt-1.5 h-16 rounded-lg text-xs cursor-pointer transition-all
                    ${inMonth ? '' : 'opacity-30'}
                    ${today ? 'ring-2 ring-accent' : ''}
                    ${count > 0 ? getDayColor(count) + ' hover:opacity-80' : 'hover:bg-cream'}
                  `}>
                  <span className={`font-semibold text-sm mb-1 ${today ? 'text-accent' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {count > 0 && (
                    <>
                      <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(count)}`} />
                      <span className="text-xs mt-0.5 font-medium">{count}</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-soft">
          <span className="text-xs text-secondary font-medium">Leyenda:</span>
          {[
            { color: 'bg-green-500', label: '1-2 citas (poco ocupado)' },
            { color: 'bg-yellow-400', label: '3-5 citas (medio)' },
            { color: 'bg-red-500', label: '6+ citas (muy ocupado)' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-xs text-secondary">{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Estadísticas del mes">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary font-heading">
              {Object.values(appointmentsByDay).reduce((s, v) => s + v, 0)}
            </p>
            <p className="text-xs text-secondary mt-0.5">Citas totales</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary font-heading">
              {Object.keys(appointmentsByDay).filter(k => appointmentsByDay[k] > 0).length}
            </p>
            <p className="text-xs text-secondary mt-0.5">Días trabajados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent font-heading">
              {Math.round(Object.values(appointmentsByDay).reduce((s, v) => s + v, 0) /
                Math.max(1, Object.keys(appointmentsByDay).filter(k => appointmentsByDay[k] > 0).length) * 10) / 10}
            </p>
            <p className="text-xs text-secondary mt-0.5">Promedio por día</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
