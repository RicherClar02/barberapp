const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')
const { sendWhatsApp, sendPushNotification } = require('./notification.service')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Unirse a la lista de espera
const joinWaitlist = async (data, clientId) => {
  const { barbershopId, barberId, serviceId, date, preferredTime } = data

  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop || !barbershop.isActive) throw new Error('Barbería no encontrada o inactiva')

  const barber = await prisma.barber.findFirst({ where: { id: barberId, barbershopId, isActive: true } })
  if (!barber) throw new Error('Barbero no encontrado en esta barbería')

  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service || !service.isActive) throw new Error('Servicio no encontrado o inactivo')

  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)

  // Evitar duplicados: mismo cliente, barbero y fecha
  const existing = await prisma.waitlist.findFirst({
    where: { clientId, barberId, date: dayStart }
  })
  if (existing) throw new Error('Ya estás en la lista de espera para este barbero en esa fecha')

  // Calcular posición
  const count = await prisma.waitlist.count({
    where: { barberId, date: dayStart, status: { in: ['WAITING', 'NOTIFIED'] } }
  })

  return await prisma.waitlist.create({
    data: {
      barbershopId,
      barberId,
      serviceId,
      clientId,
      date: dayStart,
      preferredTime,
      position: count + 1
    },
    include: {
      barbershop: { select: { name: true } },
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { name: true } }
    }
  })
}

// Ver en qué listas de espera está el cliente
const getMyWaitlist = async (clientId) => {
  return await prisma.waitlist.findMany({
    where: { clientId, status: { in: ['WAITING', 'NOTIFIED'] } },
    include: {
      barbershop: { select: { name: true, address: true } },
      barber: { include: { user: { select: { name: true, avatar: true } } } },
      service: { select: { name: true, price: true } }
    },
    orderBy: [{ date: 'asc' }, { position: 'asc' }]
  })
}

// Salir de la lista de espera
const leaveWaitlist = async (id, clientId) => {
  const entry = await prisma.waitlist.findUnique({ where: { id } })
  if (!entry) throw new Error('Entrada en lista de espera no encontrada')
  if (entry.clientId !== clientId) throw new Error('Esta entrada no te pertenece')
  if (!['WAITING', 'NOTIFIED'].includes(entry.status)) {
    throw new Error('No puedes salir de una lista con estado CONFIRMED o EXPIRED')
  }

  await prisma.waitlist.delete({ where: { id } })
  return { message: 'Saliste de la lista de espera correctamente' }
}

// Ver lista de espera de la barbería (OWNER/BARBER)
const getShopWaitlist = async (barbershopId, userId, userRole, filters = {}) => {
  if (userRole === 'OWNER') {
    const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
    if (!barbershop || barbershop.ownerId !== userId) throw new Error('No tienes permiso sobre esta barbería')
  } else if (userRole === 'BARBER') {
    const barber = await prisma.barber.findFirst({ where: { userId, barbershopId, isActive: true } })
    if (!barber) throw new Error('No perteneces a esta barbería')
  }

  const where = { barbershopId }
  if (filters.date) {
    const d = new Date(filters.date)
    d.setUTCHours(0, 0, 0, 0)
    const dEnd = new Date(d)
    dEnd.setUTCHours(23, 59, 59, 999)
    where.date = { gte: d, lte: dEnd }
  }
  if (filters.barberId) where.barberId = filters.barberId

  return await prisma.waitlist.findMany({
    where,
    include: {
      client: { select: { name: true, phone: true, whatsappNumber: true, avatar: true } },
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { name: true, price: true } }
    },
    orderBy: [{ date: 'asc' }, { position: 'asc' }]
  })
}

// Notificar al siguiente en la lista de espera cuando se libera un slot
const notifyNextInWaitlist = async (barberId, date, slot) => {
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const entry = await prisma.waitlist.findFirst({
    where: { barberId, date: { gte: dayStart, lte: dayEnd }, status: 'WAITING' },
    orderBy: { position: 'asc' },
    include: {
      client: {
        include: { notificationPreference: true }
      },
      barbershop: { select: { name: true } },
      barber: { include: { user: { select: { name: true } } } }
    }
  })

  if (!entry) return

  const message = `¡Hola ${entry.client.name}! Se liberó un espacio en ${entry.barbershop.name} con ${entry.barber.user.name} hoy a las ${slot}. ¿Deseas confirmar tu cita? Tienes 10 minutos para responder. 💈`

  const prefs = entry.client.notificationPreference
  if (prefs?.preferWhatsapp && prefs?.whatsappNumber) {
    await sendWhatsApp(prefs.whatsappNumber, message)
  } else {
    await sendPushNotification(entry.clientId, '¡Espacio disponible!', message)
  }

  await prisma.notification.create({
    data: {
      userId: entry.clientId,
      title: '¡Espacio disponible!',
      body: message,
      type: 'WAITLIST_NOTIFY'
    }
  })

  await prisma.waitlist.update({
    where: { id: entry.id },
    data: { status: 'NOTIFIED', notifiedAt: new Date() }
  })
}

// Expirar entradas NOTIFIED que lleven más de 10 minutos sin confirmar
// y notificar al siguiente
const expireStaleNotifications = async () => {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000)

  const stale = await prisma.waitlist.findMany({
    where: { status: 'NOTIFIED', notifiedAt: { lt: cutoff } }
  })

  for (const entry of stale) {
    await prisma.waitlist.update({
      where: { id: entry.id },
      data: { status: 'EXPIRED' }
    })
    await notifyNextInWaitlist(entry.barberId, entry.date, entry.preferredTime || '')
  }
}

module.exports = {
  joinWaitlist,
  getMyWaitlist,
  leaveWaitlist,
  getShopWaitlist,
  notifyNextInWaitlist,
  expireStaleNotifications
}
