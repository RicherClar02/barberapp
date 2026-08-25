const prisma = require('../lib/prisma')

const { checkReviewFraud } = require('./fraud.service')
const { logFlaggedReview } = require('../utils/securityLog')

const forbidden = (message) => {
  const error = new Error(message)
  error.status = 403
  return error
}

// Crea una reseña para una cita completada (anti-fraude):
// - cita existe, pertenece al cliente y está COMPLETED (reseña solo con cita real)
// - completada hace menos de 14 días (no reseñas de citas viejas)
// - 1 reseña por cita (appointmentId unique)
// - patrones sospechosos → flagged (no cuenta para el rating hasta aprobación ADMIN)
const createReview = async (data, clientId) => {
  const { appointmentId, rating, comment } = data

  // Validar rating
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('El rating debe ser entre 1 y 5')
  }

  // Verificar que la cita existe y pertenece al cliente
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { payment: { select: { status: true } } }
  })

  if (!appointment) throw new Error('Cita no encontrada')
  if (appointment.clientId !== clientId) throw forbidden('Esta cita no te pertenece')
  if (appointment.status !== 'COMPLETED') throw forbidden('Solo puedes reseñar citas completadas')

  // La cita debe haber sido pagada o completada hace menos de 14 días
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const completedAt = new Date(appointment.updatedAt)
  if (completedAt < fourteenDaysAgo) {
    throw forbidden('Solo puedes reseñar citas de los últimos 14 días')
  }

  // Verificar que no exista ya una reseña para esta cita
  const existingReview = await prisma.review.findUnique({
    where: { appointmentId }
  })
  if (existingReview) throw new Error('Ya existe una reseña para esta cita')

  // Detección de patrones sospechosos (la reseña se crea pero marcada)
  const fraud = await checkReviewFraud(clientId, appointment.barbershopId, rating)

  const review = await prisma.review.create({
    data: {
      clientId,
      barbershopId: appointment.barbershopId,
      barberId: appointment.barberId,
      appointmentId,
      rating,
      comment,
      flagged: fraud.flagged,
      flagReason: fraud.reason
    },
    include: {
      client: { select: { name: true, avatar: true } },
      barber: { include: { user: { select: { name: true } } } }
    }
  })

  if (fraud.flagged) {
    logFlaggedReview(review.id, clientId, appointment.barbershopId, fraud.reason)
  }

  return review
}

// Trae las reseñas de una barbería con paginación
// Se muestra en el perfil de la barbería
const getReviewsByShop = async (barbershopId, filters = {}) => {
  const page = parseInt(filters.page) || 1
  const limit = parseInt(filters.limit) || 10
  const skip = (page - 1) * limit

  // Solo reseñas no marcadas como fraude cuentan y se muestran
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { barbershopId, flagged: false },
      include: {
        client: { select: { name: true, avatar: true } },
        barber: { include: { user: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.review.count({ where: { barbershopId, flagged: false } })
  ])

  // Calcular promedio de la barbería (solo reseñas verificadas)
  const avgResult = await prisma.review.aggregate({
    where: { barbershopId, flagged: false },
    _avg: { rating: true },
    _count: { rating: true }
  })

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    average: avgResult._avg.rating ? parseFloat(avgResult._avg.rating.toFixed(1)) : 0,
    totalReviews: avgResult._count.rating
  }
}

// Trae las reseñas de un barbero específico
const getReviewsByBarber = async (barberId) => {
  const reviews = await prisma.review.findMany({
    where: { barberId, flagged: false },
    include: {
      client: { select: { name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const avgResult = await prisma.review.aggregate({
    where: { barberId, flagged: false },
    _avg: { rating: true },
    _count: { rating: true }
  })

  return {
    reviews,
    average: avgResult._avg.rating ? parseFloat(avgResult._avg.rating.toFixed(1)) : 0,
    totalReviews: avgResult._count.rating
  }
}

// Elimina una reseña inapropiada — solo ADMIN
const deleteReview = async (id) => {
  const review = await prisma.review.findUnique({ where: { id } })
  if (!review) throw new Error('Reseña no encontrada')

  await prisma.review.delete({ where: { id } })
  return { message: 'Reseña eliminada' }
}

module.exports = { createReview, getReviewsByShop, getReviewsByBarber, deleteReview }
