const prisma = require('../lib/prisma')

const { canAccessBarberData } = require('../utils/permissions')
const { nowInShopTimezone } = require('./shared/slots.service')

// Appointment.date se guarda como medianoche UTC del día de calendario, así que
// los bordes del período tienen que ser medianoche UTC del día CIVIL de la
// barbería. Calcularlos con el reloj del proceso, que corre en UTC, corría el
// período: en Colombia (UTC-5), a partir de las 19:00 el servidor ya está en el
// día siguiente, así que "hoy" preguntaba por la fecha de mañana y devolvía
// cero — con la lista de abajo mostrando cortes que sí existían.
const utcMidnight = (y, m, d) => new Date(Date.UTC(y, m, d, 0, 0, 0, 0))

const getPeriodRange = (period, now = new Date()) => {
  const [year, month, day] = nowInShopTimezone(now).date.split('-').map(Number)
  const hoy = utcMidnight(year, month - 1, day)
  // El día en curso cuenta entero: las citas de hoy también son de este período.
  const end = new Date(hoy.getTime() + 24 * 60 * 60 * 1000 - 1)

  if (period === 'today') return { start: hoy, end }

  if (period === 'week') {
    // Semana de lunes a domingo, como se lee un calendario en la barbería.
    const dow = hoy.getUTCDay()
    const desdeLunes = dow === 0 ? 6 : dow - 1
    return { start: new Date(hoy.getTime() - desdeLunes * 24 * 60 * 60 * 1000), end }
  }

  // month (default)
  return { start: utcMidnight(year, month - 1, 1), end }
}

const round2 = (n) => Math.round(n * 100) / 100

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// La serie de la gráfica se deriva del MISMO rango que el total, así que las
// barras suman exactamente totalEarned. Antes la ventana era "los últimos 7/30
// días" contra un total que iba de lunes o del día 1, y las dos cifras no
// cuadraban.
const buildDaily = (appointments, period, shopPct, barberPct, range) => {
  const bucket = (total) => ({
    total: round2(total),
    shopEarnings: round2(total * shopPct / 100),
    barberEarnings: round2(total * barberPct / 100),
  })

  const isoDe = (d) => new Date(d).toISOString().slice(0, 10)

  if (period === 'today') {
    const dStr = isoDe(range.start)
    return Array.from({ length: 24 }, (_, h) => {
      const total = appointments
        .filter(a => parseInt(a.startTime.split(':')[0], 10) === h)
        .reduce((s, a) => s + a.totalPrice, 0)
      return { day: `${String(h).padStart(2, '0')}:00`, date: dStr, ...bucket(total) }
    })
  }

  const MS_DIA = 24 * 60 * 60 * 1000
  const primero = new Date(`${isoDe(range.start)}T00:00:00.000Z`).getTime()
  const ultimo = new Date(`${isoDe(range.end)}T00:00:00.000Z`).getTime()
  const dias = Math.round((ultimo - primero) / MS_DIA) + 1

  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(primero + i * MS_DIA)
    const dStr = d.toISOString().slice(0, 10)
    const total = appointments
      .filter(a => isoDe(a.date) === dStr)
      .reduce((s, a) => s + a.totalPrice, 0)
    return {
      day: period === 'week' ? DAY_NAMES_ES[d.getUTCDay()] : `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
      date: dStr,
      ...bucket(total),
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
  const shopPercentage = config ? config.shopPercentage : 40

  const { start, end } = getPeriodRange(period || 'month')

  // El dinero sale SOLO de las citas COMPLETED de ESTE barbero. barberId ya
  // pasó por canAccessBarberData, así que es el barbero autenticado o uno de
  // los de su dueño; ningún otro llega hasta acá.
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
  const cutsCount = appointments.length

  // Tasa de éxito: de las citas de este barbero que YA se resolvieron en el
  // período, cuántas terminaron en corte. El denominador son las resueltas, no
  // todas: una cita de mañana todavía no es un éxito ni un fracaso.
  // EXPIRED queda fuera a propósito — es el estado neutro para las que nadie
  // cerró, y no le atribuye la culpa a nadie.
  const RESUELTAS = ['COMPLETED', 'NO_SHOW', 'CANCELLED']
  const porEstado = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      barberId,
      status: { in: RESUELTAS },
      date: { gte: start, lte: end }
    },
    _count: { _all: true }
  })

  const conteo = Object.fromEntries(porEstado.map(g => [g.status, g._count._all]))
  const resueltas = RESUELTAS.reduce((sum, estado) => sum + (conteo[estado] || 0), 0)

  return {
    totalEarned: round2(totalRevenue * (barberPercentage / 100)),
    cutsCount,
    period: period || 'month',
    barberPercentage,
    // Promedio de lo que gana el barbero por corte, no del precio del servicio:
    // es la cifra que el barbero puede comparar contra totalEarned.
    avgTicket: cutsCount > 0 ? round2((totalRevenue * (barberPercentage / 100)) / cutsCount) : 0,
    // Porcentaje entero: sin citas resueltas no es 0 %, es que todavía no hay
    // nada que medir. Los conteos van al lado para que la cifra se pueda auditar.
    successRate: resueltas > 0 ? Math.round((cutsCount / resueltas) * 100) : null,
    resolvedCount: resueltas,
    noShowCount: conteo.NO_SHOW || 0,
    cancelledCount: conteo.CANCELLED || 0,
    breakdown: appointments.map(a => ({
      date: a.date,
      startTime: a.startTime,
      amount: round2(a.totalPrice * (barberPercentage / 100)),
      clientName: a.client.name,
      service: a.service.name
    })),
    // Serie real para la gráfica. Antes el panel la inventaba con Math.random().
    daily: buildDaily(appointments, period || 'month', shopPercentage, barberPercentage, { start, end }),
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
    daily: buildDaily(appointments, period || 'month', shopPercentage, barberPercentage, { start, end }),
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

module.exports = { getBarberEarnings, getShopEarnings, getBarberTodayQuick, getPeriodRange, buildDaily }
