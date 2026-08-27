const prisma = require('../lib/prisma')

// Campos editables del catálogo. `barbershopId` solo se acepta al crear, donde
// se valida contra el dueño; en la edición queda fuera para que un servicio no
// pueda migrarse a otra barbería.
const CREATE_SERVICE_FIELDS = ['barbershopId', 'name', 'description', 'price', 'duration', 'image', 'isActive']
const UPDATE_SERVICE_FIELDS = ['name', 'description', 'price', 'duration', 'image', 'isActive']

// Crea un servicio nuevo dentro de una barbería
// Ejemplo: "Corte clásico - $25.000 - 30 min"
const createService = async (data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: data.barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const createData = {}
  for (const field of CREATE_SERVICE_FIELDS) {
    if (data[field] !== undefined) createData[field] = data[field]
  }

  return await prisma.service.create({ data: createData })
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

  const updateData = {}
  for (const field of UPDATE_SERVICE_FIELDS) {
    if (data[field] !== undefined) updateData[field] = data[field]
  }

  return await prisma.service.update({ where: { id }, data: updateData })
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