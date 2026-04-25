const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Ver puntos de fidelidad de un cliente en una barbería
const getClientLoyalty = async (barbershopId, clientId) => {
  let loyalty = await prisma.clientLoyalty.findUnique({
    where: { clientId_barbershopId: { clientId, barbershopId } }
  })

  if (!loyalty) {
    return {
      totalCuts: 0,
      freeCutsEarned: 0,
      freeCutsUsed: 0,
      freeCutsAvailable: 0,
      cutsUntilFree: null,
      lastVisit: null
    }
  }

  // Obtener configuración para saber cuántos cortes faltan
  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId }
  })

  const cutsForFree = config ? config.cutsForFreeService : 10
  const cutsUntilFree = cutsForFree - (loyalty.totalCuts % cutsForFree)

  return {
    totalCuts: loyalty.totalCuts,
    freeCutsEarned: loyalty.freeCutsEarned,
    freeCutsUsed: loyalty.freeCutsUsed,
    freeCutsAvailable: loyalty.freeCutsEarned - loyalty.freeCutsUsed,
    cutsUntilFree: cutsUntilFree === cutsForFree ? cutsForFree : cutsUntilFree,
    lastVisit: loyalty.lastVisit
  }
}

// Ranking de clientes frecuentes de una barbería
const getShopClientsRanking = async (barbershopId, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  return await prisma.clientLoyalty.findMany({
    where: { barbershopId },
    include: {
      client: { select: { name: true, phone: true, avatar: true, whatsappNumber: true } }
    },
    orderBy: { totalCuts: 'desc' }
  })
}

// Canjear corte gratis
const redeemFreeCut = async (barbershopId, clientId) => {
  const loyalty = await prisma.clientLoyalty.findUnique({
    where: { clientId_barbershopId: { clientId, barbershopId } }
  })

  if (!loyalty) throw new Error('No tienes historial de fidelidad en esta barbería')

  const available = loyalty.freeCutsEarned - loyalty.freeCutsUsed
  if (available <= 0) throw new Error('No tienes cortes gratis disponibles')

  return await prisma.clientLoyalty.update({
    where: { clientId_barbershopId: { clientId, barbershopId } },
    data: { freeCutsUsed: { increment: 1 } }
  })
}

// Función interna: incrementar fidelidad cuando una cita se completa
// Se llama desde appointment.service cuando status cambia a COMPLETED
const incrementLoyalty = async (clientId, barbershopId) => {
  // Verificar si la barbería tiene fidelización habilitada
  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId }
  })

  // Si no hay config o fidelización desactivada, no hacer nada
  if (!config || !config.loyaltyEnabled) return null

  // Buscar o crear registro de fidelidad
  let loyalty = await prisma.clientLoyalty.findUnique({
    where: { clientId_barbershopId: { clientId, barbershopId } }
  })

  if (!loyalty) {
    loyalty = await prisma.clientLoyalty.create({
      data: { clientId, barbershopId, totalCuts: 0, freeCutsEarned: 0, freeCutsUsed: 0 }
    })
  }

  // Incrementar cortes
  const newTotalCuts = loyalty.totalCuts + 1
  const earnedFree = newTotalCuts % config.cutsForFreeService === 0 ? 1 : 0

  return await prisma.clientLoyalty.update({
    where: { clientId_barbershopId: { clientId, barbershopId } },
    data: {
      totalCuts: newTotalCuts,
      freeCutsEarned: { increment: earnedFree },
      lastVisit: new Date()
    }
  })
}

module.exports = { getClientLoyalty, getShopClientsRanking, redeemFreeCut, incrementLoyalty }
