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

// Trae todas las barberías activas
// Se usa en la pantalla de inicio y el mapa
const getAllBarbershops = async (filters = {}) => {
  const { city, plan, search } = filters

  return await prisma.barbershop.findMany({
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
      photos: true
    },
    orderBy: [
      { plan: 'desc' },   // PREMIUM aparece primero
      { createdAt: 'desc' }
    ]
  })
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