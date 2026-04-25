const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const round2 = (n) => Math.round(n * 100) / 100

const getPeriodRange = (period) => {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  end.setUTCHours(23, 59, 59, 999)

  if (period === 'today') {
    start.setUTCHours(0, 0, 0, 0)
  } else if (period === 'week') {
    const day = now.getUTCDay() || 7
    start.setUTCDate(now.getUTCDate() - day + 1)
    start.setUTCHours(0, 0, 0, 0)
  } else {
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
  }
  return { start, end }
}

const getPrevPeriodRange = (period) => {
  const { start, end } = getPeriodRange(period)
  const duration = end - start
  return { start: new Date(start - duration - 1), end: new Date(start - 1) }
}

const verifyOwner = async (barbershopId, ownerId) => {
  const b = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!b) throw new Error('Barbería no encontrada')
  if (b.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')
  return b
}

// Vista general de la barbería
const getShopOverview = async (barbershopId, period, ownerId) => {
  await verifyOwner(barbershopId, ownerId)

  const { start, end } = getPeriodRange(period || 'month')
  const prev = getPrevPeriodRange(period || 'month')

  const config = await prisma.barberShopConfig.findUnique({ where: { barbershopId } })
  const barberPct = config ? config.barberPercentage : 60
  const shopPct = config ? config.shopPercentage : 40

  const appts = await prisma.appointment.findMany({
    where: { barbershopId, date: { gte: start, lte: end } },
    include: {
      service: { select: { id: true, name: true } },
      barber: { include: { user: { select: { name: true } } } },
      client: { select: { id: true } }
    }
  })

  const prevAppts = await prisma.appointment.findMany({
    where: { barbershopId, status: 'COMPLETED', date: { gte: prev.start, lte: prev.end } }
  })

  const completed = appts.filter(a => a.status === 'COMPLETED')
  const cancelled = appts.filter(a => a.status === 'CANCELLED')
  const noShow = appts.filter(a => a.status === 'NO_SHOW')

  const totalRevenue = completed.reduce((s, a) => s + a.totalPrice, 0)
  const prevRevenue = prevAppts.reduce((s, a) => s + a.totalPrice, 0)
  const revChange = prevRevenue > 0
    ? `${totalRevenue >= prevRevenue ? '+' : ''}${round2(((totalRevenue - prevRevenue) / prevRevenue) * 100)}%`
    : 'N/A'

  // Top servicios
  const svcMap = {}
  for (const a of completed) {
    const key = a.service.id
    if (!svcMap[key]) svcMap[key] = { name: a.service.name, count: 0, revenue: 0 }
    svcMap[key].count++
    svcMap[key].revenue += a.totalPrice
  }
  const topServices = Object.values(svcMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(s => ({ ...s, revenue: round2(s.revenue) }))

  // Top barberos
  const barberMap = {}
  for (const a of completed) {
    const bid = a.barberId
    if (!barberMap[bid]) barberMap[bid] = { name: a.barber.user.name, cuts: 0, revenue: 0 }
    barberMap[bid].cuts++
    barberMap[bid].revenue += a.totalPrice
  }
  const topBarbers = await Promise.all(
    Object.entries(barberMap)
      .sort(([, a], [, b]) => b.cuts - a.cuts)
      .slice(0, 3)
      .map(async ([barberId, data]) => {
        const reviews = await prisma.review.aggregate({ where: { barberId }, _avg: { rating: true } })
        return { ...data, revenue: round2(data.revenue), earnings: round2(data.revenue * (barberPct / 100)), rating: round2(reviews._avg.rating || 0) }
      })
  )

  // Horas pico
  const hourMap = {}
  for (const a of appts) {
    const hour = a.startTime.split(':')[0] + ':00'
    hourMap[hour] = (hourMap[hour] || 0) + 1
  }
  const busyHours = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)

  // Clientes nuevos vs recurrentes
  const clientIds = [...new Set(completed.map(a => a.client.id))]
  let newClients = 0, returningClients = 0
  for (const clientId of clientIds) {
    const prev = await prisma.appointment.findFirst({
      where: { barbershopId, clientId, status: 'COMPLETED', date: { lt: start } }
    })
    if (prev) returningClients++
    else newClients++
  }

  return {
    period: period || 'month',
    revenue: {
      total: round2(totalRevenue),
      shopEarnings: round2(totalRevenue * (shopPct / 100)),
      barbersEarnings: round2(totalRevenue * (barberPct / 100)),
      vsLastPeriod: revChange
    },
    appointments: {
      total: appts.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      completionRate: appts.length > 0 ? `${round2((completed.length / appts.length) * 100)}%` : '0%'
    },
    topServices,
    topBarbers,
    busyHours,
    newClients,
    returningClients
  }
}

// Análisis de clientes
const getShopClients = async (barbershopId, ownerId) => {
  await verifyOwner(barbershopId, ownerId)

  const appts = await prisma.appointment.findMany({
    where: { barbershopId, status: 'COMPLETED' },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { date: 'asc' }
  })

  const clientMap = {}
  for (const a of appts) {
    const cid = a.client.id
    if (!clientMap[cid]) clientMap[cid] = { name: a.client.name, visits: 0, totalSpent: 0, firstVisit: a.date, lastVisit: a.date }
    clientMap[cid].visits++
    clientMap[cid].totalSpent += a.totalPrice
    if (a.date > clientMap[cid].lastVisit) clientMap[cid].lastVisit = a.date
  }

  const clients = Object.values(clientMap)
  const totalUnique = clients.length
  const returning = clients.filter(c => c.visits > 1).length
  const returningRate = totalUnique > 0 ? `${round2((returning / totalUnique) * 100)}%` : '0%'

  const topClients = clients
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10)
    .map(c => ({ ...c, totalSpent: round2(c.totalSpent) }))

  // Retención por mes (últimos 6 meses)
  const retentionByMonth = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const mEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59, 999))
    const monthAppts = appts.filter(a => a.date >= mStart && a.date <= mEnd)
    const monthClients = [...new Set(monthAppts.map(a => a.client.id))]
    let newC = 0, retC = 0
    for (const cid of monthClients) {
      const prev = appts.find(a => a.client.id === cid && a.date < mStart)
      if (prev) retC++
      else newC++
    }
    retentionByMonth.push({
      month: mStart.toISOString().slice(0, 7),
      newClients: newC,
      returningClients: retC
    })
  }

  return { totalUniqueClients: totalUnique, returningRate, topClients, retentionByMonth }
}

// Rendimiento por barbero
const getShopBarbers = async (barbershopId, ownerId) => {
  await verifyOwner(barbershopId, ownerId)

  const config = await prisma.barberShopConfig.findUnique({ where: { barbershopId } })
  const barberPct = config ? config.barberPercentage : 60

  const barbers = await prisma.barber.findMany({
    where: { barbershopId, isActive: true },
    include: { user: { select: { name: true, avatar: true } } }
  })

  const now = new Date()
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const startWeek = new Date(now)
  const day = now.getUTCDay() || 7
  startWeek.setUTCDate(now.getUTCDate() - day + 1)
  startWeek.setUTCHours(0, 0, 0, 0)
  const startToday = new Date(now)
  startToday.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setUTCHours(23, 59, 59, 999)

  return await Promise.all(barbers.map(async barber => {
    const [monthAppts, weekAppts, todayAppts, reviews] = await Promise.all([
      prisma.appointment.findMany({ where: { barberId: barber.id, date: { gte: startMonth } } }),
      prisma.appointment.findMany({ where: { barberId: barber.id, date: { gte: startWeek } } }),
      prisma.appointment.findMany({ where: { barberId: barber.id, date: { gte: startToday, lte: endOfDay } } }),
      prisma.review.aggregate({ where: { barberId: barber.id }, _avg: { rating: true }, _count: true })
    ])

    const completedMonth = monthAppts.filter(a => a.status === 'COMPLETED')
    const earningsMonth = completedMonth.reduce((s, a) => s + a.totalPrice, 0) * (barberPct / 100)

    const total = monthAppts.length || 1
    const cancellationRate = `${round2((monthAppts.filter(a => a.status === 'CANCELLED').length / total) * 100)}%`
    const noShowRate = `${round2((monthAppts.filter(a => a.status === 'NO_SHOW').length / total) * 100)}%`

    return {
      barberId: barber.id,
      name: barber.user.name,
      avatar: barber.user.avatar,
      cutsThisMonth: completedMonth.length,
      cutsThisWeek: weekAppts.filter(a => a.status === 'COMPLETED').length,
      cutsToday: todayAppts.filter(a => a.status === 'COMPLETED').length,
      earningsThisMonth: round2(earningsMonth),
      rating: round2(reviews._avg.rating || 0),
      reviewCount: reviews._count,
      cancellationRate,
      noShowRate
    }
  }))
}

// Analytics de toda la plataforma (ADMIN)
const getPlatformAnalytics = async () => {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const [
    totalBarbershops, activeBarbershops, totalBarbers, totalClients,
    todayAppts, subscriptions, topBarbershops, adStats
  ] = await Promise.all([
    prisma.barbershop.count(),
    prisma.barbershop.count({ where: { isActive: true } }),
    prisma.barber.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.appointment.count({ where: { date: { gte: startOfDay, lte: endOfDay } } }),
    prisma.subscription.findMany({ include: { barbershop: { select: { plan: true } } } }),
    prisma.barbershop.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { appointments: true, reviews: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: 10
    }),
    prisma.advertisement.aggregate({ _count: true, _sum: { views: true, clicks: true } })
  ])

  const revenueByPlan = { BASIC: 0, STANDARD: 0, PREMIUM: 0 }
  const subStats = { active: 0, expired: 0, byPlan: { BASIC: 0, STANDARD: 0, PREMIUM: 0 } }
  for (const sub of subscriptions) {
    if (sub.status === 'ACTIVE') { subStats.active++; revenueByPlan[sub.plan] += sub.amountPaid }
    if (sub.status === 'EXPIRED') subStats.expired++
    subStats.byPlan[sub.plan] = (subStats.byPlan[sub.plan] || 0) + 1
  }

  const topShops = topBarbershops.map(b => ({
    id: b.id, name: b.name, city: b.city,
    appointments: b._count.appointments,
    rating: b.reviews.length > 0 ? round2(b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length) : 0
  })).sort((a, b) => b.appointments - a.appointments).slice(0, 5)

  return {
    totalBarbershops, activeBarbershops, totalBarbers, totalClients,
    totalAppointmentsToday: todayAppts,
    revenueByPlan,
    subscriptionStats: subStats,
    topBarbershops: topShops,
    adStats: {
      totalAds: adStats._count,
      totalViews: adStats._sum.views || 0,
      totalClicks: adStats._sum.clicks || 0
    }
  }
}

module.exports = { getShopOverview, getShopClients, getShopBarbers, getPlatformAnalytics }
