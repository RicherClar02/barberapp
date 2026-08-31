const prisma = require('../lib/prisma')
const { shopTodayUtcMidnight, endOfShopDay } = require('./shared/slots.service')

const PLAN_OFFER_LIMITS = { BASIC: 0, STANDARD: 1, PREMIUM: Infinity }

// validFrom y validUntil son días de calendario guardados como medianoche UTC.
// Compararlos contra `new Date()` mezclaba día con instante: en Bogotá la
// oferta arrancaba 5h antes (7pm de la víspera) y moría 29h antes, o sea que
// durante todo su último día ya figuraba vencida. Se compara contra el día de
// hoy en la zona de la barbería, en la misma representación.
const getActiveOffers = async (barbershopId) => {
  const now = new Date()
  const hoy = shopTodayUtcMidnight(now)
  const where = {
    isActive: true,
    validFrom: { lte: hoy },
    validUntil: { gte: hoy },
    barbershop: { plan: { in: ['STANDARD', 'PREMIUM'] } }
  }
  if (barbershopId) where.barbershopId = barbershopId

  const offers = await prisma.offer.findMany({
    where,
    include: {
      barbershop: { select: { name: true, logo: true, plan: true } },
      service: { select: { name: true, price: true } }
    },
    orderBy: { validUntil: 'asc' }
  })

  return offers.map(o => {
    // La cuenta regresiva va hasta el final del último día, no hasta su
    // medianoche: si no, marcaba 0h durante todo el día en que aún vale.
    const msLeft = endOfShopDay(o.validUntil) - now
    const horasRestantes = Math.floor(msLeft / (1000 * 60 * 60))
    const minutosRestantes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60))
    return { ...o, horasRestantes, minutosRestantes }
  })
}

// Ver ofertas de la barbería (OWNER)
const getShopOffers = async (barbershopId, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const hoy = shopTodayUtcMidnight()
  const offers = await prisma.offer.findMany({
    where: { barbershopId },
    include: { service: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return offers.map(o => ({
    ...o,
    vigente: o.isActive && o.validFrom <= hoy && o.validUntil >= hoy,
    usosRestantes: o.maxUses ? o.maxUses - o.currentUses : null
  }))
}

// Crear oferta (OWNER)
const createOffer = async (data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: data.barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const limit = PLAN_OFFER_LIMITS[barbershop.plan]
  if (limit === 0) throw new Error('El plan BASIC no permite crear ofertas. Actualiza tu plan.')

  if (limit !== Infinity) {
    const hoy = shopTodayUtcMidnight()
    const activeCount = await prisma.offer.count({
      where: {
        barbershopId: data.barbershopId,
        isActive: true,
        validFrom: { lte: hoy },
        validUntil: { gte: hoy }
      }
    })
    if (activeCount >= limit) {
      throw new Error(`El plan ${barbershop.plan} solo permite ${limit} oferta(s) activa(s) al mismo tiempo.`)
    }
  }

  return await prisma.offer.create({
    data: {
      barbershopId: data.barbershopId,
      title: data.title,
      description: data.description,
      discountPct: data.discountPct || 0,
      discountFixed: data.discountFixed,
      serviceId: data.serviceId || null,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      maxUses: data.maxUses || null,
      code: data.code || null
    }
  })
}

// Editar oferta (OWNER) — solo si no ha comenzado aún
const updateOffer = async (id, data, ownerId) => {
  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { barbershop: true }
  })
  if (!offer) throw new Error('Oferta no encontrada')
  if (offer.barbershop.ownerId !== ownerId) throw new Error('No tienes permiso para editar esta oferta')
  // Mismo criterio de día de calendario que la vigencia: una oferta que
  // arranca mañana todavía se puede editar hoy. Comparado crudo, a partir de
  // las 7pm de hoy ya se daba por empezada y bloqueaba la edición.
  if (offer.validFrom <= shopTodayUtcMidnight()) throw new Error('No puedes editar una oferta que ya comenzó')

  return await prisma.offer.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.discountPct !== undefined && { discountPct: data.discountPct }),
      ...(data.discountFixed !== undefined && { discountFixed: data.discountFixed }),
      ...(data.validFrom && { validFrom: new Date(data.validFrom) }),
      ...(data.validUntil && { validUntil: new Date(data.validUntil) }),
      ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
      ...(data.code !== undefined && { code: data.code })
    }
  })
}

// Desactivar oferta (OWNER)
const deleteOffer = async (id, ownerId) => {
  const offer = await prisma.offer.findUnique({ where: { id }, include: { barbershop: true } })
  if (!offer) throw new Error('Oferta no encontrada')
  if (offer.barbershop.ownerId !== ownerId) throw new Error('No tienes permiso')

  return await prisma.offer.update({ where: { id }, data: { isActive: false } })
}

// Validar código promocional (CLIENT)
const validateCode = async (code, barbershopId, serviceId) => {
  const hoy = shopTodayUtcMidnight()
  const offer = await prisma.offer.findFirst({
    where: {
      code,
      barbershopId,
      isActive: true,
      validFrom: { lte: hoy },
      validUntil: { gte: hoy }
    }
  })

  if (!offer) return { valid: false, message: 'Código inválido o expirado' }

  if (offer.maxUses && offer.currentUses >= offer.maxUses) {
    return { valid: false, message: 'Este código ya alcanzó el límite de usos' }
  }

  if (offer.serviceId && serviceId && offer.serviceId !== serviceId) {
    return { valid: false, message: 'Este código no aplica para el servicio seleccionado' }
  }

  return {
    valid: true,
    offerId: offer.id,
    discountPct: offer.discountPct,
    discountFixed: offer.discountFixed,
    offerTitle: offer.title
  }
}

// Función interna: aplicar oferta al crear cita
const applyOffer = async (offerId) => {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } })
  if (!offer) return

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: { currentUses: { increment: 1 } }
  })

  if (updated.maxUses && updated.currentUses >= updated.maxUses) {
    await prisma.offer.update({ where: { id: offerId }, data: { isActive: false } })
  }
}

module.exports = { getActiveOffers, getShopOffers, createOffer, updateOffer, deleteOffer, validateCode, applyOffer }
