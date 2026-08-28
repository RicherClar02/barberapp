const prisma = require('../lib/prisma')

// Mismos valores que los @default de BarberShopConfig en schema.prisma.
// Se mantienen acá para poder responder un GET sin fila todavía creada; si se
// cambian los defaults del modelo, hay que cambiarlos también acá.
const CONFIG_DEFAULTS = {
  barberPercentage: 60,
  shopPercentage: 40,
  loyaltyEnabled: true,
  cutsForFreeService: 10,
  cancellationWindowMin: 60,
  appointmentDuration: 40,
  toleranceMinutes: 10,
}

// Ver configuración de una barbería.
// Las barberías creadas antes de que createBarbershop generara la config no
// tienen fila. Devolver 404 dejaba las pestañas de Porcentajes y Fidelización
// inutilizables. Se responden los defaults del modelo, que es lo que la
// barbería está usando de hecho, con isDefault:true para que el panel sepa que
// todavía no hay nada guardado. Un GET no escribe: la fila la crea el primer
// PUT o POST.
const getConfig = async (barbershopId) => {
  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId }
  })

  if (!config) return { barbershopId, ...CONFIG_DEFAULTS, isDefault: true }
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

  // Una barbería anterior a que createBarbershop generara la config no tiene
  // fila. Antes esto cortaba con "créala primero", pero ninguna pantalla llama
  // a POST /api/config, así que el dueño quedaba sin salida. Se parte de los
  // mismos defaults que devuelve getConfig y el upsert de abajo crea la fila en
  // el primer guardado: un PUT que crea si no existe sigue siendo idempotente.
  const existing =
    (await prisma.barberShopConfig.findUnique({ where: { barbershopId } })) || CONFIG_DEFAULTS

  // Validar porcentajes si se envían
  const barberPercentage = data.barberPercentage ?? existing.barberPercentage
  const shopPercentage = data.shopPercentage ?? existing.shopPercentage
  if (barberPercentage + shopPercentage !== 100) {
    throw new Error('Los porcentajes del barbero y la barbería deben sumar 100')
  }

  const campos = {
    barberPercentage,
    shopPercentage,
    ...(data.loyaltyEnabled !== undefined && { loyaltyEnabled: data.loyaltyEnabled }),
    ...(data.cutsForFreeService !== undefined && { cutsForFreeService: data.cutsForFreeService }),
    ...(data.cancellationWindowMin !== undefined && { cancellationWindowMin: data.cancellationWindowMin }),
    ...(data.appointmentDuration !== undefined && { appointmentDuration: data.appointmentDuration }),
    ...(data.toleranceMinutes !== undefined && { toleranceMinutes: data.toleranceMinutes })
  }

  return await prisma.barberShopConfig.upsert({
    where: { barbershopId },
    update: campos,
    create: { barbershopId, ...CONFIG_DEFAULTS, ...campos }
  })
}

module.exports = { getConfig, createConfig, updateConfig }
