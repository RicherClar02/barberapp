import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$ 0 COP'
  return `$ ${Number(amount).toLocaleString('es-CO')} COP`
}

// Un día de calendario ("2026-09-01") o un DateTime que representa un día y no
// un instante: las citas se guardan con date = medianoche UTC, así que llegan
// como "2026-09-01T00:00:00.000Z".
const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z?)?$/

// new Date("2026-09-01") se parsea como medianoche UTC, y date-fns lo formatea
// en la hora del navegador: en Bogotá (UTC-5) eso cae en el día anterior, así
// que el panel mostraba "31 de agosto" para una cita del 1 de septiembre. Un
// día de calendario no tiene zona horaria — se construye local para que el
// número que se lee sea el mismo que viaja en la URL. Un timestamp real
// (createdAt) sí es un instante y se sigue convirtiendo a la hora local.
// Mismo criterio que mobile/src/utils/formatters.js.
export const toDisplayDate = (value) => {
  if (value instanceof Date) return value
  const match = String(value).match(CALENDAR_DAY)
  if (!match) return new Date(value)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export const formatDate = (date) => {
  if (!date) return ''
  return format(toDisplayDate(date), "d 'de' MMMM, yyyy", { locale: es })
}

export const formatTime = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export const getStatusColor = (status) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    CANCELLED_BARBERSHOP: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

export const getStatusLabel = (status) => {
  const labels = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    CANCELLED_BARBERSHOP: 'Cancelada',
    NO_SHOW: 'No se presentó',
  }
  return labels[status] || status
}
