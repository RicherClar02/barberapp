import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$ 0 COP'
  return `$ ${Number(amount).toLocaleString('es-CO')} COP`
}

export const formatDate = (date) => {
  if (!date) return ''
  return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es })
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
