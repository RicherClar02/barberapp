import { useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, CheckCheck, Bell } from 'lucide-react'
import api from '../../api/axios'

const NOTIF_ICONS = {
  APPOINTMENT_CONFIRMED: '📅',
  APPOINTMENT_CANCELLED: '❌',
  APPOINTMENT_COMPLETED: '✅',
  APPOINTMENT_REMINDER: '⏰',
  NEW_REVIEW: '⭐',
  PAYMENT_RECEIVED: '💰',
  SUBSCRIPTION_EXPIRING: '⚠️',
  SYSTEM: '🔔',
}

export default function NotificationPanel({ onClose }) {
  const qc = useQueryClient()
  const panelRef = useRef()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications/my').then(r => r.data),
    refetchInterval: 30000,
  })

  const notifications = data?.notifications || []
  const unread = notifications.filter(n => !n.isRead)

  const { mutate: markOne } = useMutation({
    mutationFn: (id) => api.put(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const { mutate: markAll } = useMutation({
    mutationFn: () => api.put('/api/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-soft z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-soft">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary" />
          <span className="font-semibold text-sm text-black-soft">Notificaciones</span>
          {unread.length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{unread.length}</span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={() => markAll()}
            className="flex items-center gap-1 text-xs text-accent hover:text-secondary cursor-pointer transition-colors">
            <CheckCheck size={13} /> Marcar todas
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={28} className="text-gray-soft mx-auto mb-2" />
            <p className="text-secondary text-sm">No hay notificaciones</p>
          </div>
        ) : (
          notifications.slice(0, 20).map(n => (
            <div key={n.id}
              className={`flex gap-3 px-4 py-3 border-b border-gray-soft/50 cursor-pointer hover:bg-cream transition-colors ${!n.isRead ? 'bg-accent/5' : ''}`}
              onClick={() => !n.isRead && markOne(n.id)}>
              <span className="text-xl flex-shrink-0 mt-0.5">
                {NOTIF_ICONS[n.type] || '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? 'font-semibold text-black-soft' : 'text-secondary'}`}>
                  {n.message || n.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
