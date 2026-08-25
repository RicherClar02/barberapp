import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { colors } from '../constants/theme'

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0'
  return `$${Number(amount).toLocaleString('es-CO')}`
}

export const formatDate = (date) => {
  if (!date) return ''
  return format(new Date(date), "EEEE d 'de' MMMM", { locale: es })
}

export const formatDateShort = (date) => {
  if (!date) return ''
  return format(new Date(date), 'd MMM yyyy', { locale: es })
}

export const formatTime = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export const timeAgo = (date) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export const getStatusColor = (status) => {
  const map = {
    PENDING: colors.accent,
    CONFIRMED: '#3B82F6',
    IN_PROGRESS: '#8B5CF6',
    COMPLETED: colors.success,
    CANCELLED: colors.error,
    NO_SHOW: '#9CA3AF',
  }
  return map[status] || '#9CA3AF'
}

export const getStatusLabel = (status) => {
  const map = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No se presentó',
  }
  return map[status] || status
}

export const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export const getGreetingEmoji = () => {
  const hour = new Date().getHours()
  if (hour < 12) return '☀️'
  if (hour < 18) return '🌤️'
  return '🌙'
}
