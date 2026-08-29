import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { colors } from '../constants/theme'

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0'
  return `$${Number(amount).toLocaleString('es-CO')}`
}

// Un día de calendario ("2026-08-29") o un DateTime que representa un día y no
// un instante: las citas se guardan con date = medianoche UTC, así que llegan
// como "2026-08-29T00:00:00.000Z".
const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z?)?$/

// new Date("2026-08-29") se parsea como medianoche UTC, y date-fns lo formatea
// en la hora del dispositivo: en toda América eso cae en el día anterior, así
// que la pantalla mostraba "viernes 28" para una cita del sábado 29. Un día de
// calendario no tiene zona horaria — se construye local para que el número que
// se lee sea el mismo que viaja en la URL. Un timestamp real (createdAt) sí es
// un instante y se sigue convirtiendo a la hora del dispositivo.
const toDisplayDate = (value) => {
  if (value instanceof Date) return value
  const match = String(value).match(CALENDAR_DAY)
  if (!match) return new Date(value)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export const formatDate = (date) => {
  if (!date) return ''
  return format(toDisplayDate(date), "EEEE d 'de' MMMM", { locale: es })
}

export const formatDateShort = (date) => {
  if (!date) return ''
  return format(toDisplayDate(date), 'd MMM yyyy', { locale: es })
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
