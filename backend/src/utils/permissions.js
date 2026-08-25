const prisma = require('../lib/prisma')

// Validación reutilizable de privacidad de datos del barbero.
// Solo pueden acceder a estadísticas/finanzas/teléfonos de un barbero:
// - el PROPIO barbero (requestUser.id === barber.userId)
// - el OWNER de su barbería
// - un ADMIN de la plataforma
// Cualquier otro usuario (incluido OTRO barbero) → no permitido.
// Retorna el registro del barbero para evitar una segunda consulta.
const canAccessBarberData = async (requestUser, barberId) => {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { barbershop: { select: { id: true, name: true, ownerId: true } } }
  })

  if (!barber) {
    const error = new Error('Barbero no encontrado')
    error.status = 404
    throw error
  }

  const isSelf = requestUser.role === 'BARBER' && barber.userId === requestUser.id
  const isOwner = requestUser.role === 'OWNER' && barber.barbershop.ownerId === requestUser.id
  const isAdmin = requestUser.role === 'ADMIN'

  if (!isSelf && !isOwner && !isAdmin) {
    const error = new Error('No tienes permiso para ver los datos de este barbero')
    error.status = 403
    throw error
  }

  return barber
}

module.exports = { canAccessBarberData }
