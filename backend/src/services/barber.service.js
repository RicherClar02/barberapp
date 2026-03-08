const { PrismaClient } = require('@prisma/client')
// AGREGAR ESTO PARA USAR PRISMA CON POSTGRESQL!!!
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Convierte un usuario existente en barbero de una barbería
// El dueño llama a este endpoint para agregar un barbero a su negocio
// El usuario ya debe estar registrado en la app con rol BARBER
const addBarber = async ({ userId, barbershopId, specialty, bio }, ownerId) => {

  // Verificamos que la barbería le pertenece al dueño que hace la petición
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  // Verificamos que el usuario existe y tiene rol BARBER
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Usuario no encontrado')
  if (user.role !== 'BARBER') throw new Error('El usuario debe tener rol de Barbero')

  // Verificamos que no esté ya registrado en esa barbería
  const existing = await prisma.barber.findFirst({ where: { userId, barbershopId } })
  if (existing) throw new Error('Este barbero ya pertenece a la barbería')

  return await prisma.barber.create({
    data: { userId, barbershopId, specialty, bio },
    include: { user: { select: { name: true, email: true, avatar: true } } }
  })
}

// Trae todos los barberos de una barbería específica
// Se usa en el perfil de la barbería para mostrar el equipo
const getBarbersByShop = async (barbershopId) => {
  return await prisma.barber.findMany({
    where: { barbershopId, isActive: true },
    include: {
      user: { select: { name: true, avatar: true, phone: true } },
      reviews: { select: { rating: true } }
    }
  })
}

// Trae el perfil completo de un barbero con sus citas y reseñas
// Se usa cuando el cliente quiere ver el detalle de un barbero específico
const getBarberById = async (id) => {
  const barber = await prisma.barber.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, avatar: true } },
      barbershop: { select: { name: true, address: true } },
      reviews: {
        include: { client: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  })

  if (!barber) throw new Error('Barbero no encontrado')
  return barber
}

// Actualiza la especialidad o bio de un barbero
// Solo el dueño de la barbería puede editar sus barberos
const updateBarber = async (id, data, ownerId) => {
  const barber = await prisma.barber.findUnique({
    where: { id },
    include: { barbershop: true }
  })

  if (!barber) throw new Error('Barbero no encontrado')
  if (barber.barbershop.ownerId !== ownerId) throw new Error('No tienes permiso para editar este barbero')

  return await prisma.barber.update({ where: { id }, data })
}

module.exports = { addBarber, getBarbersByShop, getBarberById, updateBarber }