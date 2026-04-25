const { PrismaClient } = require('@prisma/client')
// AGREGAR ESTO PARA USAR PRISMA CON POSTGRESQL!!!
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Crea una barbería nueva en la base de datos
// Solo los usuarios con rol OWNER pueden hacer esto
const createBarbershop = async (data, ownerId) => {
  const barbershop = await prisma.barbershop.create({
    data: {
      ...data,
      ownerId
    }
  })
  return barbershop
}

// Trae todas las barberías activas ordenadas por prioridad:
// 1. PREMIUM con anuncio activo, 2. PREMIUM sin anuncio,
// 3. STANDARD por rating, 4. BASIC por rating
const getAllBarbershops = async (filters = {}) => {
  const { city, plan, search } = filters
  const now = new Date()

  const barbershops = await prisma.barbershop.findMany({
    where: {
      isActive: true,
      ...(city && { city }),
      ...(plan && { plan }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } }
        ]
      })
    },
    include: {
      barbers: {
        where: { isActive: true },
        include: { user: { select: { name: true, avatar: true } } }
      },
      services: { where: { isActive: true } },
      reviews: { select: { rating: true } },
      schedules: true,
      photos: true,
      advertisements: {
        where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
        select: { id: true }
      }
    }
  })

  const withRating = barbershops.map(b => ({
    ...b,
    avgRating: b.reviews.length ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length : 0,
    hasActiveAd: b.advertisements.length > 0
  }))

  // Orden: PREMIUM+ad > PREMIUM > STANDARD (rating desc) > BASIC (rating desc)
  const planOrder = { PREMIUM: 0, STANDARD: 1, BASIC: 2 }
  withRating.sort((a, b) => {
    const aPriority = planOrder[a.plan] ?? 3
    const bPriority = planOrder[b.plan] ?? 3
    if (aPriority !== bPriority) return aPriority - bPriority
    if (a.plan === 'PREMIUM' && a.hasActiveAd !== b.hasActiveAd) return a.hasActiveAd ? -1 : 1
    return b.avgRating - a.avgRating
  })

  return withRating
}

// Trae el detalle completo de UNA barbería por su ID
// Se usa cuando el cliente toca una barbería para ver su perfil
const getBarbershopById = async (id) => {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      barbers: {
        where: { isActive: true },
        include: { user: { select: { name: true, avatar: true } } }
      },
      services: { where: { isActive: true } },
      reviews: {
        include: { client: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' }
      },
      schedules: true,
      photos: true
    }
  })

  if (!barbershop) throw new Error('Barbería no encontrada')
  return barbershop
}

// Actualiza los datos de una barbería
// Solo el dueño de esa barbería puede editarla
const updateBarbershop = async (id, data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id } })

  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso para editar esta barbería')

  return await prisma.barbershop.update({
    where: { id },
    data
  })
}

// Trae todas las barberías que pertenecen a un dueño específico
// Se usa en el panel de administración del dueño
const getMyBarbershops = async (ownerId) => {
  return await prisma.barbershop.findMany({
    where: { ownerId },
    include: {
      barbers: true,
      services: true,
      reviews: { select: { rating: true } }
    }
  })
}

module.exports = { createBarbershop, getAllBarbershops, getBarbershopById, updateBarbershop, getMyBarbershops }