const { PrismaClient } = require('@prisma/client')
// AGREGAR ESTO PARA USAR PRISMA CON POSTGRESQL!!!
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Crea un servicio nuevo dentro de una barbería
// Ejemplo: "Corte clásico - $25.000 - 30 min"
const createService = async (data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: data.barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  return await prisma.service.create({ data })
}

// Trae todos los servicios activos de una barbería
// Se muestra en el perfil de la barbería como catálogo de servicios
const getServicesByShop = async (barbershopId) => {
  return await prisma.service.findMany({
    where: { barbershopId, isActive: true },
    orderBy: { price: 'asc' }
  })
}

// Actualiza un servicio — precio, duración, nombre, etc.
const updateService = async (id, data, ownerId) => {
  const service = await prisma.service.findUnique({
    where: { id },
    include: { barbershop: true }
  })

  if (!service) throw new Error('Servicio no encontrado')
  if (service.barbershop.ownerId !== ownerId) throw new Error('No tienes permiso para editar este servicio')

  return await prisma.service.update({ where: { id }, data })
}

// Desactiva un servicio en lugar de eliminarlo
// Así no se rompen las citas históricas que usaron ese servicio
const deleteService = async (id, ownerId) => {
  const service = await prisma.service.findUnique({
    where: { id },
    include: { barbershop: true }
  })

  if (!service) throw new Error('Servicio no encontrado')
  if (service.barbershop.ownerId !== ownerId) throw new Error('No tienes permiso para eliminar este servicio')

  return await prisma.service.update({ where: { id }, data: { isActive: false } })
}

module.exports = { createService, getServicesByShop, updateService, deleteService }