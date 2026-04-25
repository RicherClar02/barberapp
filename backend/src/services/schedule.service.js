const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Crea o actualiza los horarios de la semana completa para una barbería
// Recibe un array de 7 objetos: [{ dayOfWeek, openTime, closeTime, isOpen }]
// Si ya existen horarios para ese día, los actualiza; si no, los crea
const setWeekSchedule = async (barbershopId, schedules, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const results = []

  for (const schedule of schedules) {
    const { dayOfWeek, openTime, closeTime, isOpen } = schedule

    if (dayOfWeek < 0 || dayOfWeek > 6) throw new Error(`Día inválido: ${dayOfWeek}`)

    const existing = await prisma.schedule.findFirst({
      where: { barbershopId, dayOfWeek }
    })

    if (existing) {
      const updated = await prisma.schedule.update({
        where: { id: existing.id },
        data: { openTime, closeTime, isOpen }
      })
      results.push(updated)
    } else {
      const created = await prisma.schedule.create({
        data: { barbershopId, dayOfWeek, openTime, closeTime, isOpen }
      })
      results.push(created)
    }
  }

  return results
}

// Trae los horarios de una barbería ordenados por día de la semana
const getSchedulesByShop = async (barbershopId) => {
  return await prisma.schedule.findMany({
    where: { barbershopId },
    orderBy: { dayOfWeek: 'asc' }
  })
}

// Actualiza el horario de un día específico de una barbería
const updateDaySchedule = async (barbershopId, dayOfWeek, data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const day = parseInt(dayOfWeek)
  if (day < 0 || day > 6) throw new Error('Día inválido')

  const existing = await prisma.schedule.findFirst({
    where: { barbershopId, dayOfWeek: day }
  })

  if (!existing) throw new Error('No hay horario registrado para este día')

  return await prisma.schedule.update({
    where: { id: existing.id },
    data: {
      openTime: data.openTime,
      closeTime: data.closeTime,
      isOpen: data.isOpen
    }
  })
}

module.exports = { setWeekSchedule, getSchedulesByShop, updateDaySchedule }
