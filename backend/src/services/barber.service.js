const prisma = require('../lib/prisma')

const BARBER_LIMITS = { BASIC: 2, STANDARD: 4, PREMIUM: Infinity }

// Campos editables de un barbero. `userId` y `barbershopId` quedan fuera: son
// la identidad del vínculo y reasignarlos movería el perfil a otra persona o a
// otro negocio. `isActive` sí entra porque este es hoy el único endpoint que
// permite dar de baja a un barbero.
const UPDATE_BARBER_FIELDS = ['specialty', 'bio', 'isActive']

// Convierte un usuario existente en barbero de una barbería
const addBarber = async ({ userId, barbershopId, specialty, bio }, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  // Validar límite de barberos según plan
  const limit = BARBER_LIMITS[barbershop.plan] ?? 1
  if (limit !== Infinity) {
    const activeCount = await prisma.barber.count({ where: { barbershopId, isActive: true } })
    if (activeCount >= limit) {
      throw new Error(`Tu plan ${barbershop.plan} solo permite ${limit} barbero(s) activo(s). Actualiza tu plan para agregar más.`)
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Usuario no encontrado')
  if (user.role !== 'BARBER') throw new Error('El usuario debe tener rol de Barbero')

  const existing = await prisma.barber.findFirst({ where: { userId, barbershopId } })
  if (existing) throw new Error('Este barbero ya pertenece a la barbería')

  return await prisma.barber.create({
    data: { userId, barbershopId, specialty, bio },
    include: { user: { select: { name: true, email: true, avatar: true } } }
  })
}

// Trae todos los barberos de una barbería específica
// Se usa en el perfil de la barbería para mostrar el equipo
// Incluye avgRating y lowRating (rating < 3.0 con mínimo 5 reseñas)
const getBarbersByShop = async (barbershopId) => {
  const barbers = await prisma.barber.findMany({
    where: { barbershopId, isActive: true },
    include: {
      user: { select: { name: true, avatar: true, phone: true } },
      reviews: { where: { flagged: false }, select: { rating: true } }
    }
  })

  return barbers.map(b => {
    const avgRating = b.reviews.length
      ? Math.round(b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length * 10) / 10
      : 0
    return {
      ...b,
      avgRating,
      totalReviews: b.reviews.length,
      lowRating: b.reviews.length >= 5 && avgRating < 3.0
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

  const updateData = {}
  for (const field of UPDATE_BARBER_FIELDS) {
    if (data[field] !== undefined) updateData[field] = data[field]
  }

  // Reactivar consume un cupo del plan igual que un alta. Sin esta comprobación
  // el tope se evade dando de baja barberos, agregando otros y reactivando los
  // primeros: `addBarber` solo cuenta los que están activos.
  if (updateData.isActive === true && barber.isActive === false) {
    const limit = BARBER_LIMITS[barber.barbershop.plan] ?? 1
    if (limit !== Infinity) {
      const activeCount = await prisma.barber.count({
        where: { barbershopId: barber.barbershopId, isActive: true }
      })
      if (activeCount >= limit) {
        throw new Error(`Tu plan ${barber.barbershop.plan} solo permite ${limit} barbero(s) activo(s). Actualiza tu plan para agregar más.`)
      }
    }
  }

  return await prisma.barber.update({ where: { id }, data: updateData })
}

module.exports = { addBarber, getBarbersByShop, getBarberById, updateBarber }