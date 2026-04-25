const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Crea una reseña para una cita completada
// Validaciones: cita existe, pertenece al cliente, está COMPLETED, no tiene reseña previa
const createReview = async (data, clientId) => {
  const { appointmentId, rating, comment } = data

  // Validar rating
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('El rating debe ser entre 1 y 5')
  }

  // Verificar que la cita existe y pertenece al cliente
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId }
  })

  if (!appointment) throw new Error('Cita no encontrada')
  if (appointment.clientId !== clientId) throw new Error('Esta cita no te pertenece')
  if (appointment.status !== 'COMPLETED') throw new Error('Solo puedes reseñar citas completadas')

  // Verificar que no exista ya una reseña para esta cita
  const existingReview = await prisma.review.findUnique({
    where: { appointmentId }
  })
  if (existingReview) throw new Error('Ya existe una reseña para esta cita')

  // Crear la reseña
  const review = await prisma.review.create({
    data: {
      clientId,
      barbershopId: appointment.barbershopId,
      barberId: appointment.barberId,
      appointmentId,
      rating,
      comment
    },
    include: {
      client: { select: { name: true, avatar: true } },
      barber: { include: { user: { select: { name: true } } } }
    }
  })

  return review
}

// Trae las reseñas de una barbería con paginación
// Se muestra en el perfil de la barbería
const getReviewsByShop = async (barbershopId, filters = {}) => {
  const page = parseInt(filters.page) || 1
  const limit = parseInt(filters.limit) || 10
  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { barbershopId },
      include: {
        client: { select: { name: true, avatar: true } },
        barber: { include: { user: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.review.count({ where: { barbershopId } })
  ])

  // Calcular promedio de la barbería
  const avgResult = await prisma.review.aggregate({
    where: { barbershopId },
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
    where: { barberId },
    include: {
      client: { select: { name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const avgResult = await prisma.review.aggregate({
    where: { barberId },
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
