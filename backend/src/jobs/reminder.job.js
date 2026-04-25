const cron = require('node-cron')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')
const { sendAppointmentReminder } = require('../services/notification.service')
const { expireStaleNotifications } = require('../services/waitlist.service')
const { checkExpiredSubscriptions } = require('../services/subscription.service')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Ejecutar cada minuto: busca citas confirmadas que empiezan en 15 minutos
// y envía recordatorio según preferencia del cliente
const startReminderJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const in15Min = new Date(now.getTime() + 15 * 60 * 1000)

      // Calcular la hora objetivo en formato HH:MM
      const targetHour = String(in15Min.getUTCHours()).padStart(2, '0')
      const targetMinute = String(in15Min.getUTCMinutes()).padStart(2, '0')
      const targetTime = `${targetHour}:${targetMinute}`

      // Buscar citas confirmadas para hoy con startTime = targetTime
      const startOfDay = new Date(now)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setUTCHours(23, 59, 59, 999)

      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          date: { gte: startOfDay, lte: endOfDay },
          startTime: targetTime
        }
      })

      for (const appointment of appointments) {
        await sendAppointmentReminder(appointment.id)
      }

      if (appointments.length > 0) {
        console.log(`[Reminder] Enviados ${appointments.length} recordatorio(s) para las ${targetTime}`)
      }
    } catch (error) {
      console.error('[Reminder] Error en cron job:', error.message)
    }
  })

  console.log('[Reminder] Cron job de recordatorios iniciado (cada minuto)')

  // Cada 5 minutos: expirar entradas de waitlist NOTIFIED sin confirmación
  cron.schedule('*/5 * * * *', async () => {
    try {
      await expireStaleNotifications()
    } catch (error) {
      console.error('[Waitlist] Error en cron de expiración:', error.message)
    }
  })
  console.log('[Waitlist] Cron job de expiración iniciado (cada 5 minutos)')

  // Diariamente a medianoche: verificar suscripciones vencidas
  cron.schedule('0 0 * * *', async () => {
    try {
      await checkExpiredSubscriptions()
    } catch (error) {
      console.error('[Subscriptions] Error en cron de vencimiento:', error.message)
    }
  })
  console.log('[Subscriptions] Cron job de vencimiento iniciado (diario a medianoche)')
}

module.exports = { startReminderJob }
