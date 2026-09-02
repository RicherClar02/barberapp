const prisma = require('../lib/prisma')
const { generateSlots, isSlotFree } = require('./shared/slots.service')

const round2 = (n) => Math.round(n * 100) / 100

// Convierte ISO week (año, semana) al lunes de esa semana
const isoWeekToMonday = (year, week) => {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7)
  return weekStart
}

// Retorna rango de fechas [start, end] y lista de días
const parseDateRange = (month, week) => {
  let start, days = []

  if (month) {
    const [year, m] = month.split('-').map(Number)
    start = new Date(Date.UTC(year, m - 1, 1))
    const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate()
    for (let d = 0; d < daysInMonth; d++) {
      const day = new Date(Date.UTC(year, m - 1, d + 1))
      days.push(day)
    }
  } else if (week) {
    const [year, w] = week.split('-W').map(Number)
    start = isoWeekToMonday(year, w)
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setUTCDate(start.getUTCDate() + d)
      days.push(day)
    }
  } else {
    // Default: current month
    const now = new Date()
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
    for (let d = 0; d < daysInMonth; d++) {
      days.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d + 1)))
    }
  }

  const end = new Date(days[days.length - 1])
  end.setUTCHours(23, 59, 59, 999)
  start.setUTCHours(0, 0, 0, 0)

  return { start, end, days }
}

const { canAccessBarberData } = require('../utils/permissions')

// Privacidad: solo el PROPIO barbero o el OWNER de su barbería
// (antes un usuario con otro rol pasaba la validación; ahora 403)
const verifyBarberAccess = async (barberId, userId, userRole) => {
  return await canAccessBarberData({ id: userId, role: userRole }, barberId)
}

// Vista mensual/semanal del barbero
const getBarberCalendar = async (barberId, query, userId, userRole) => {
  const barber = await verifyBarberAccess(barberId, userId, userRole)

  const { month, week } = query
  const { start, end, days } = parseDateRange(month, week)

  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId: barber.barbershopId }
  })
  const slotDuration = config ? config.appointmentDuration : 40
  const barberPercentage = config ? config.barberPercentage : 60

  const schedules = await prisma.schedule.findMany({ where: { barbershopId: barber.barbershopId } })

  const appointments = await prisma.appointment.findMany({
    where: { barberId, date: { gte: start, lte: end } }
  })

  const calendar = days.map(day => {
    const dayOfWeek = day.getUTCDay()
    const schedule = schedules.find(s => s.dayOfWeek === dayOfWeek)
    const dateStr = day.toISOString().split('T')[0]

    const dayAppts = appointments.filter(a => {
      const d = new Date(a.date)
      return d.toISOString().split('T')[0] === dateStr
    })

    const completed = dayAppts.filter(a => a.status === 'COMPLETED')
    const cancelled = dayAppts.filter(a => ['CANCELLED', 'NO_SHOW'].includes(a.status))
    const active = dayAppts.filter(a => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status))

    const earnings = completed.reduce((sum, a) => sum + a.totalPrice, 0) * (barberPercentage / 100)

    let occupiedSlots = []
    let freeSlots = []

    if (schedule && schedule.isOpen) {
      // Un slot queda ocupado si se solapa con la cita en cualquier punto:
      // una cita de 60 min a las 09:00 sobre grilla de 40 min bloquea
      // también el slot de las 09:40 (antes aparecía libre).
      // gridMinutes = null: grilla encadenada, sin solapes. Esta vista cuenta
      // capacidad del día (freeSlots.length), no ofrece horarios de reserva,
      // así que no usa la grilla de cuartos del flujo de reserva.
      const allSlots = generateSlots(schedule.openTime, schedule.closeTime, slotDuration, null)
      occupiedSlots = allSlots.filter(s => !isSlotFree(s, active)).map(s => s.startTime)
      freeSlots = allSlots.filter(s => isSlotFree(s, active)).map(s => s.startTime)
    }

    return {
      date: dateStr,
      isOpen: !!(schedule && schedule.isOpen),
      totalAppointments: dayAppts.length,
      completedAppointments: completed.length,
      cancelledAppointments: cancelled.length,
      occupiedSlots,
      freeSlots,
      earnings: round2(earnings)
    }
  })

  return { barberId, calendar }
}

// Vista detallada de un día del barbero
const getBarberDay = async (barberId, date, userId, userRole) => {
  const barber = await verifyBarberAccess(barberId, userId, userRole)

  const config = await prisma.barberShopConfig.findUnique({
    where: { barbershopId: barber.barbershopId }
  })
  const barberPercentage = config ? config.barberPercentage : 60

  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const appointments = await prisma.appointment.findMany({
    where: { barberId, date: { gte: dayStart, lte: dayEnd } },
    include: {
      client: { select: { name: true, phone: true, whatsappNumber: true, avatar: true } },
      service: { select: { name: true, price: true, duration: true } }
    },
    orderBy: { startTime: 'asc' }
  })

  return {
    date,
    appointments: appointments.map(a => ({
      appointmentId: a.id,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      client: {
        name: a.client.name,
        phone: a.client.phone,
        whatsappNumber: a.client.whatsappNumber,
        avatar: a.client.avatar
      },
      service: {
        name: a.service.name,
        price: a.service.price,
        duration: a.service.duration
      },
      earnings: round2(a.totalPrice * (barberPercentage / 100))
    }))
  }
}

// Vista del día para toda la barbería (columnas por barbero)
const getShopDay = async (barbershopId, date, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const config = await prisma.barberShopConfig.findUnique({ where: { barbershopId } })
  const barberPercentage = config ? config.barberPercentage : 60

  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const barbers = await prisma.barber.findMany({
    where: { barbershopId, isActive: true },
    include: { user: { select: { name: true, avatar: true } } }
  })

  const allAppts = await prisma.appointment.findMany({
    where: { barbershopId, date: { gte: dayStart, lte: dayEnd } },
    include: {
      client: { select: { name: true, phone: true, whatsappNumber: true, avatar: true } },
      service: { select: { name: true, price: true, duration: true } }
    },
    orderBy: { startTime: 'asc' }
  })

  const columns = barbers.map(barber => {
    const appts = allAppts.filter(a => a.barberId === barber.id)
    return {
      barberId: barber.id,
      barberName: barber.user.name,
      barberAvatar: barber.user.avatar,
      appointments: appts.map(a => ({
        appointmentId: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        client: {
          name: a.client.name,
          phone: a.client.phone,
          whatsappNumber: a.client.whatsappNumber,
          avatar: a.client.avatar
        },
        service: { name: a.service.name, price: a.service.price, duration: a.service.duration },
        earnings: round2(a.totalPrice * (barberPercentage / 100))
      }))
    }
  })

  return { date, barbershopName: barbershop.name, columns }
}

module.exports = { getBarberCalendar, getBarberDay, getShopDay }
