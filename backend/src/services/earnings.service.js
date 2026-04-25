const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const getPeriodRange = (period) => {
  const now = new Date()
  const start = new Date()

  if (period === 'today') {
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setUTCHours(23, 59, 59, 999)
    return { start, end }
  }

  if (period === 'week') {
    const day = now.getUTCDay()
    const diff = day === 0 ? 6 : day - 1
    start.setUTCDate(now.getUTCDate() - diff)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setUTCHours(23, 59, 59, 999)
    return { start, end }
  }

  // month (default)
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

const round2 = (n) => Math.round(n * 100) / 100

// Ganancias de un barbero en un período
const getBarberEarnings = async (barberId, period, userId, userRole) => {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { barbershop: true }
  })
  if (!barber) throw new Error('Barbero no encontrado')

  if (userRole === 'BARBER' && barber.userId !== userId) {
    throw new Error('No tienes permiso para ver estas ganancias')
  }
  if (userRole === 'OWNER' && barber.barbershop.ownerId !== userId) {
    throw new Error('No tienes permiso sobre esta barbería')
  }

  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId: barber.barbershopId }
  })
  const barberPercentage = config ? config.barberPercentage : 60

  const { start, end } = getPeriodRange(period || 'month')

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      status: 'COMPLETED',
      date: { gte: start, lte: end }
    },
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } }
    },
    orderBy: { date: 'asc' }
  })

  const totalRevenue = appointments.reduce((sum, a) => sum + a.totalPrice, 0)

  return {
    totalEarned: round2(totalRevenue * (barberPercentage / 100)),
    cutsCount: appointments.length,
    period: period || 'month',
    barberPercentage,
    breakdown: appointments.map(a => ({
      date: a.date,
      startTime: a.startTime,
      amount: round2(a.totalPrice * (barberPercentage / 100)),
      clientName: a.client.name,
      service: a.service.name
    }))
  }
}

// Ganancias totales de una barbería en un período
const getShopEarnings = async (barbershopId, period, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId }
  })
  const barberPercentage = config ? config.barberPercentage : 60
  const shopPercentage = config ? config.shopPercentage : 40

  const { start, end } = getPeriodRange(period || 'month')

  const appointments = await prisma.appointment.findMany({
    where: {
      barbershopId,
      status: 'COMPLETED',
      date: { gte: start, lte: end }
    },
    include: {
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { name: true } }
    }
  })

  const totalRevenue = appointments.reduce((sum, a) => sum + a.totalPrice, 0)

  // Agrupar por barbero
  const barberMap = {}
  for (const appt of appointments) {
    const bid = appt.barberId
    if (!barberMap[bid]) {
      barberMap[bid] = { name: appt.barber.user.name, cuts: 0, revenue: 0 }
    }
    barberMap[bid].cuts++
    barberMap[bid].revenue += appt.totalPrice
  }

  const breakdown = Object.entries(barberMap).map(([bid, data]) => ({
    barberId: bid,
    name: data.name,
    cuts: data.cuts,
    revenue: round2(data.revenue),
    earned: round2(data.revenue * (barberPercentage / 100))
  }))

  const topBarber = [...breakdown].sort((a, b) => b.cuts - a.cuts)[0] || null

  return {
    totalRevenue: round2(totalRevenue),
    shopEarnings: round2(totalRevenue * (shopPercentage / 100)),
    barbersEarnings: round2(totalRevenue * (barberPercentage / 100)),
    cutsCount: appointments.length,
    period: period || 'month',
    shopPercentage,
    barberPercentage,
    topBarber,
    breakdown
  }
}

// Vista rápida del día para un barbero
const getBarberTodayQuick = async (barberId, userId) => {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } })
  if (!barber) throw new Error('Barbero no encontrado')
  if (barber.userId !== userId) throw new Error('No tienes permiso para ver estas ganancias')

  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId: barber.barbershopId }
  })
  const barberPercentage = config ? config.barberPercentage : 60

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const completedToday = await prisma.appointment.findMany({
    where: {
      barberId,
      status: 'COMPLETED',
      date: { gte: startOfDay, lte: endOfDay }
    }
  })

  const todayRevenue = completedToday.reduce((sum, a) => sum + a.totalPrice, 0)

  const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`

  const nextAppointment = await prisma.appointment.findFirst({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: startOfDay, lte: endOfDay },
      startTime: { gt: currentTime }
    },
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } }
    },
    orderBy: { startTime: 'asc' }
  })

  return {
    todayEarnings: round2(todayRevenue * (barberPercentage / 100)),
    todayCuts: completedToday.length,
    nextAppointment: nextAppointment
      ? {
          startTime: nextAppointment.startTime,
          clientName: nextAppointment.client.name,
          service: nextAppointment.service.name
        }
      : null
  }
}

module.exports = { getBarberEarnings, getShopEarnings, getBarberTodayQuick }
