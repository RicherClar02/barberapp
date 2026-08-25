const prisma = require('../lib/prisma')

const round2 = (n) => Math.round(n * 100) / 100

const getBarberCard = async (barberId, requestUser = null) => {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: {
      user: { select: { name: true, avatar: true } },
      barbershop: { select: { id: true, name: true, ownerId: true } }
    }
  })
  if (!barber) throw new Error('Barbero no encontrado')

  // Privacidad: datos financieros, agenda y teléfonos de clientes SOLO
  // para el propio barbero, el owner de SU barbería o un admin.
  // Cualquier otro usuario ve la versión pública (perfil + reseñas).
  const privileged = !!requestUser && (
    requestUser.role === 'ADMIN' ||
    (requestUser.role === 'BARBER' && barber.userId === requestUser.id) ||
    (requestUser.role === 'OWNER' && barber.barbershop.ownerId === requestUser.id)
  )

  // Rating y total de reseñas (solo reseñas verificadas, no flagged)
  const reviews = await prisma.review.findMany({
    where: { barberId, flagged: false },
    select: { rating: true }
  })
  const totalReviews = reviews.length
  const rating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0
  // Regla de negocio: rating < 3.0 con mínimo 5 reseñas = alerta
  const lowRating = totalReviews >= 5 && rating < 3.0

  // Últimas 3 reseñas (visibles en la versión pública)
  const recentReviews = await prisma.review.findMany({
    where: { barberId, flagged: false },
    include: { client: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 3
  })

  const barberProfile = {
    id: barber.id,
    name: barber.user.name,
    avatar: barber.user.avatar,
    specialty: barber.specialty,
    bio: barber.bio,
    rating: Math.round(rating * 10) / 10,
    totalReviews,
    lowRating,
    barbershopName: barber.barbershop.name
  }

  const reviewsPayload = recentReviews.map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    clientName: r.client.name,
    clientAvatar: r.client.avatar,
    createdAt: r.createdAt
  }))

  // Versión pública: solo perfil y reseñas
  if (!privileged) {
    return { barber: barberProfile, recentReviews: reviewsPayload }
  }

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

  // En este punto el solicitante es privilegiado: incluir contacto del cliente
  const formatClient = (client) => ({
    name: client.name,
    avatar: client.avatar,
    phone: client.phone,
    clientWhatsapp: client.whatsappNumber
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

  return {
    barber: barberProfile,
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
    recentReviews: reviewsPayload
  }
}

// Variante por userId (la app móvil consulta con el id del usuario autenticado)
const getBarberCardByUserId = async (userId, requestUser = null) => {
  const barber = await prisma.barber.findFirst({ where: { userId } })
  if (!barber) throw new Error('No tienes perfil de barbero')
  return getBarberCard(barber.id, requestUser)
}

module.exports = { getBarberCard, getBarberCardByUserId }
