const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Retorna anuncios activos, pagados y vigentes
// Ordenados aleatoriamente para rotación, incrementa views
const getActiveAds = async () => {
  const now = new Date()

  const ads = await prisma.advertisement.findMany({
    where: {
      isActive: true,
      isPaid: true,
      startsAt: { lte: now },
      endsAt: { gte: now }
    },
    include: {
      barbershop: { select: { name: true, logo: true } }
    }
  })

  // Incrementar views de cada anuncio retornado
  for (const ad of ads) {
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: { views: { increment: 1 } }
    })
  }

  // Ordenar aleatoriamente para rotación
  const shuffled = ads.sort(() => Math.random() - 0.5)

  return shuffled
}

// Registrar click en un anuncio
const registerClick = async (id) => {
  const ad = await prisma.advertisement.findUnique({ where: { id } })
  if (!ad) throw new Error('Anuncio no encontrado')

  return await prisma.advertisement.update({
    where: { id },
    data: { clicks: { increment: 1 } }
  })
}

// Crear anuncio — OWNER
const createAd = async (data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: data.barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  return await prisma.advertisement.create({
    data: {
      barbershopId: data.barbershopId,
      title: data.title,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      isPaid: false
    }
  })
}

// Editar anuncio propio — OWNER
const updateAd = async (id, data, ownerId) => {
  const ad = await prisma.advertisement.findUnique({
    where: { id },
    include: { barbershop: true }
  })

  if (!ad) throw new Error('Anuncio no encontrado')
  if (ad.barbershop.ownerId !== ownerId) throw new Error('No tienes permiso para editar este anuncio')

  return await prisma.advertisement.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.mediaUrl && { mediaUrl: data.mediaUrl }),
      ...(data.mediaType && { mediaType: data.mediaType }),
      ...(data.startsAt && { startsAt: new Date(data.startsAt) }),
      ...(data.endsAt && { endsAt: new Date(data.endsAt) })
    }
  })
}

// Activar anuncio y marcar como pagado — ADMIN
const activateAd = async (id, amountPaid) => {
  const ad = await prisma.advertisement.findUnique({ where: { id } })
  if (!ad) throw new Error('Anuncio no encontrado')

  return await prisma.advertisement.update({
    where: { id },
    data: { isPaid: true, isActive: true, amountPaid }
  })
}

// Ver anuncios de una barbería con stats — OWNER
const getShopAds = async (barbershopId, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  return await prisma.advertisement.findMany({
    where: { barbershopId },
    orderBy: { createdAt: 'desc' }
  })
}

// Desactivar anuncio — OWNER o ADMIN
const deleteAd = async (id, userId, userRole) => {
  const ad = await prisma.advertisement.findUnique({
    where: { id },
    include: { barbershop: true }
  })

  if (!ad) throw new Error('Anuncio no encontrado')

  if (userRole === 'OWNER' && ad.barbershop.ownerId !== userId) {
    throw new Error('No tienes permiso para desactivar este anuncio')
  }

  return await prisma.advertisement.update({
    where: { id },
    data: { isActive: false }
  })
}

module.exports = { getActiveAds, registerClick, createAd, updateAd, activateAd, getShopAds, deleteAd }
