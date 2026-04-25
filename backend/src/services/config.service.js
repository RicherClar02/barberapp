const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Ver configuración de una barbería
const getConfig = async (barbershopId) => {
  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId }
  })

  if (!config) throw new Error('No hay configuración para esta barbería')
  return config
}

// Crear configuración inicial de una barbería
const createConfig = async (barbershopId, data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  // Verificar que no exista ya una configuración
  const existing = await prisma.barberShopConfig.findUnique({ where: { barbershopId } })
  if (existing) throw new Error('Ya existe una configuración para esta barbería')

  // Validar porcentajes
  const barberPercentage = data.barberPercentage ?? 60
  const shopPercentage = data.shopPercentage ?? 40
  if (barberPercentage + shopPercentage !== 100) {
    throw new Error('Los porcentajes del barbero y la barbería deben sumar 100')
  }

  return await prisma.barberShopConfig.create({
    data: {
      barbershopId,
      barberPercentage,
      shopPercentage,
      loyaltyEnabled: data.loyaltyEnabled,
      cutsForFreeService: data.cutsForFreeService,
      cancellationWindowMin: data.cancellationWindowMin,
      appointmentDuration: data.appointmentDuration,
      toleranceMinutes: data.toleranceMinutes
    }
  })
}

// Actualizar configuración de una barbería
const updateConfig = async (barbershopId, data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const existing = await prisma.barberShopConfig.findUnique({ where: { barbershopId } })
  if (!existing) throw new Error('No hay configuración para esta barbería. Créala primero.')

  // Validar porcentajes si se envían
  const barberPercentage = data.barberPercentage ?? existing.barberPercentage
  const shopPercentage = data.shopPercentage ?? existing.shopPercentage
  if (barberPercentage + shopPercentage !== 100) {
    throw new Error('Los porcentajes del barbero y la barbería deben sumar 100')
  }

  return await prisma.barberShopConfig.update({
    where: { barbershopId },
    data: {
      barberPercentage,
      shopPercentage,
      ...(data.loyaltyEnabled !== undefined && { loyaltyEnabled: data.loyaltyEnabled }),
      ...(data.cutsForFreeService !== undefined && { cutsForFreeService: data.cutsForFreeService }),
      ...(data.cancellationWindowMin !== undefined && { cancellationWindowMin: data.cancellationWindowMin }),
      ...(data.appointmentDuration !== undefined && { appointmentDuration: data.appointmentDuration }),
      ...(data.toleranceMinutes !== undefined && { toleranceMinutes: data.toleranceMinutes })
    }
  })
}

module.exports = { getConfig, createConfig, updateConfig }
