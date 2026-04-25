const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const round2 = (n) => Math.round(n * 100) / 100

const getBarberCard = async (barberId, requestingUserRole) => {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: {
      user: { select: { name: true, avatar: true } },
      barbershop: { select: { id: true, name: true, ownerId: true } }
    }
  })
  if (!barber) throw new Error('Barbero no encontrado')

  // Rating y total de reseñas
  const reviews = await prisma.review.findMany({
    where: { barberId },
    select: { rating: true }
  })
  const totalReviews = reviews.length
  const rating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0

  // Configuración para porcentaje
  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId: barber.barbershopId }
  })
  const barberPercentage = config ? config.barberPercentage : 60

  // Citas de hoy
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const todayAppts = await prisma.appointment.findMany({
    where: { barberId, date: { gte: startOfDay, lte: endOfDay } },
    include: {
      client: { select: { name: true, phone: true, whatsappNumber: true, avatar: true } },
      service: { select: { name: true, price: true, duration: true } }
    },
    orderBy: { startTime: 'asc' }
  })

  const completed = todayAppts.filter(a => a.status === 'COMPLETED')
  const pending = todayAppts.filter(a => ['PENDING', 'CONFIRMED'].includes(a.status))
  const earningsToday = round2(
    completed.reduce((sum, a) => sum + a.totalPrice, 0) * (barberPercentage / 100)
  )

  const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
  const nextAppt = pending.find(a => a.startTime >= currentTime)

  const showContact = ['BARBER', 'OWNER'].includes(requestingUserRole)

  const formatClient = (client) => ({
    name: client.name,
    avatar: client.avatar,
    ...(showContact ? { phone: client.phone, clientWhatsapp: client.whatsappNumber } : {})
  })

  // Próximas 5 citas (futuras, no hoy)
  const upcoming = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gt: endOfDay }
    },
    include: {
      client: { select: { name: true, phone: true, whatsappNumber: true, avatar: true } },
      service: { select: { name: true, price: true } }
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    take: 5
  })

  // Últimas 3 reseñas
  const recentReviews = await prisma.review.findMany({
    where: { barberId },
    include: { client: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 3
  })

  return {
    barber: {
      id: barber.id,
      name: barber.user.name,
      avatar: barber.user.avatar,
      specialty: barber.specialty,
      bio: barber.bio,
      rating: Math.round(rating * 10) / 10,
      totalReviews,
      barbershopName: barber.barbershop.name
    },
    today: {
      date: startOfDay.toISOString().split('T')[0],
      totalCuts: todayAppts.length,
      completedCuts: completed.length,
      pendingCuts: pending.length,
      earningsToday,
      nextAppointment: nextAppt
        ? {
            appointmentId: nextAppt.id,
            startTime: nextAppt.startTime,
            endTime: nextAppt.endTime,
            status: nextAppt.status,
            service: nextAppt.service.name,
            ...formatClient(nextAppt.client)
          }
        : null
    },
    upcomingAppointments: upcoming.map(a => ({
      appointmentId: a.id,
      date: a.date,
      startTime: a.startTime,
      status: a.status,
      service: a.service.name,
      servicePrice: a.service.price,
      ...formatClient(a.client)
    })),
    recentReviews: recentReviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      clientName: r.client.name,
      clientAvatar: r.client.avatar,
      createdAt: r.createdAt
    }))
  }
}

module.exports = { getBarberCard }
