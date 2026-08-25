const prisma = require('../lib/prisma')

const { canAccessBarberData } = require('../utils/permissions')

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

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const buildDaily = (appointments, period, shopPct, barberPct) => {
  const now = new Date()

  if (period === 'today') {
    return Array.from({ length: 24 }, (_, h) => {
      const label = `${String(h).padStart(2, '0')}:00`
      const total = appointments
        .filter(a => parseInt(a.startTime.split(':')[0]) === h)
        .reduce((s, a) => s + a.totalPrice, 0)
      return {
        day: label,
        date: now.toISOString().slice(0, 10),
        total: round2(total),
        shopEarnings: round2(total * shopPct / 100),
        barberEarnings: round2(total * barberPct / 100),
      }
    })
  }

  const days = period === 'week' ? 7 : 30
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now)
    d.setUTCDate(now.getUTCDate() - (days - 1 - i))
    const dStr = d.toISOString().slice(0, 10)
    const total = appointments
      .filter(a => a.date.toISOString().slice(0, 10) === dStr)
      .reduce((s, a) => s + a.totalPrice, 0)
    return {
      day: period === 'week' ? DAY_NAMES_ES[d.getUTCDay()] : `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
      date: dStr,
      total: round2(total),
      shopEarnings: round2(total * shopPct / 100),
      barberEarnings: round2(total * barberPct / 100),
    }
  })
}

// Ganancias de un barbero en un período
// Privacidad: solo el PROPIO barbero o el OWNER de su barbería (validado
// en canAccessBarberData; cualquier otro usuario recibe 403)
const getBarberEarnings = async (barberId, period, userId, userRole) => {
  const barber = await canAccessBarberData({ id: userId, role: userRole }, barberId)

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

  const cutsCount = appointments.length

  return {
    totalRevenue: round2(totalRevenue),
    total: round2(totalRevenue),
    shopEarnings: round2(totalRevenue * (shopPercentage / 100)),
    barbersEarnings: round2(totalRevenue * (barberPercentage / 100)),
    barberEarnings: round2(totalRevenue * (barberPercentage / 100)),
    cutsCount,
    completedCuts: cutsCount,
    avgTicket: cutsCount > 0 ? round2(totalRevenue / cutsCount) : 0,
    pendingAmount: 0,
    period: period || 'month',
    shopPercentage,
    barberPercentage,
    topBarber,
    breakdown,
    daily: buildDaily(appointments, period || 'month', shopPercentage, barberPercentage),
  }
}

// Vista rápida del día para un barbero — solo el PROPIO barbero
const getBarberTodayQuick = async (barberId, userId) => {
  const barber = await canAccessBarberData({ id: userId, role: 'BARBER' }, barberId)

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
