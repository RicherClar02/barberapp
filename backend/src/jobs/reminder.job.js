const cron = require('node-cron')
const prisma = require('../lib/prisma')
const { sendAppointmentReminder } = require('../services/notification.service')
const { expireStaleNotifications } = require('../services/waitlist.service')
const { checkExpiredSubscriptions } = require('../services/subscription.service')
const { purgeOldDrafts } = require('../services/chatbot.service')
const { expireStaleAppointments } = require('../services/appointment.service')

const toHHMM = (date) => {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

// Ejecutar cada minuto: doble recordatorio al cliente.
// - 15 minutos antes: recordatorio normal (reminder15Sent evita duplicados)
// - 5 minutos antes: último aviso con tolerancia (reminder5Sent evita duplicados)
// Se usa ventana (ahora, ahora+N] en vez de hora exacta para no perder
// recordatorios si el cron se salta un minuto.
const startReminderJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const nowTime = toHHMM(now)
      const t15 = toHHMM(new Date(now.getTime() + 15 * 60 * 1000))
      const t5 = toHHMM(new Date(now.getTime() + 5 * 60 * 1000))

      const startOfDay = new Date(now)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setUTCHours(23, 59, 59, 999)

      // Recordatorio de 15 minutos
      const appts15 = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          date: { gte: startOfDay, lte: endOfDay },
          reminder15Sent: false,
          startTime: { gt: nowTime, lte: t15 }
        },
        select: { id: true }
      })

      for (const appointment of appts15) {
        await sendAppointmentReminder(appointment.id, 15)
      }

      // Recordatorio de 5 minutos
      const appts5 = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          date: { gte: startOfDay, lte: endOfDay },
          reminder5Sent: false,
          startTime: { gt: nowTime, lte: t5 }
        },
        select: { id: true }
      })

      for (const appointment of appts5) {
        await sendAppointmentReminder(appointment.id, 5)
      }

      if (appts15.length > 0 || appts5.length > 0) {
        console.log(`[Reminder] Enviados ${appts15.length} recordatorio(s) de 15 min y ${appts5.length} de 5 min`)
      }
    } catch (error) {
      console.error('[Reminder] Error en cron job:', error.message)
    }
  })

  console.log('[Reminder] Cron job de recordatorios iniciado (cada minuto, 15 y 5 min)')

  // Cada 5 minutos: expirar entradas de waitlist NOTIFIED sin confirmación
  cron.schedule('*/5 * * * *', async () => {
    try {
      await expireStaleNotifications()
    } catch (error) {
      console.error('[Waitlist] Error en cron de expiración:', error.message)
    }
  })
  console.log('[Waitlist] Cron job de expiración iniciado (cada 5 minutos)')

  // Cada hora: marcar como vencidas las citas a las que se les pasó la hora y
  // nadie cerró. Estado neutro: no decide si el cliente vino o no — eso lo
  // sigue decidiendo el barbero, que conserva ambos botones sobre una vencida.
  cron.schedule('0 * * * *', async () => {
    try {
      const vencidas = await expireStaleAppointments()
      if (vencidas > 0) console.log(`[Appointments] ${vencidas} cita(s) marcadas como vencidas`)
    } catch (error) {
      console.error('[Appointments] Error en cron de vencimiento de citas:', error.message)
    }
  })
  console.log('[Appointments] Cron job de vencimiento de citas iniciado (cada hora)')

  // Diariamente a medianoche: verificar suscripciones vencidas
  cron.schedule('0 0 * * *', async () => {
    try {
      await checkExpiredSubscriptions()
    } catch (error) {
      console.error('[Subscriptions] Error en cron de vencimiento:', error.message)
    }
  })
  console.log('[Subscriptions] Cron job de vencimiento iniciado (diario a medianoche)')

  // Diariamente a medianoche: borrar borradores de reserva abandonados.
  // No es lo que hace segura la reserva —de eso se encarga el TTL de 30 min
  // que se aplica al leer, y que funciona aunque este cron nunca corra—, solo
  // evita que la tabla crezca sin techo.
  cron.schedule('0 0 * * *', async () => {
    try {
      const borrados = await purgeOldDrafts()
      if (borrados > 0) console.log(`[Chatbot] ${borrados} borrador(es) de reserva abandonados eliminados`)
    } catch (error) {
      console.error('[Chatbot] Error en cron de limpieza de borradores:', error.message)
    }
  })
  console.log('[Chatbot] Cron job de limpieza de borradores iniciado (diario a medianoche)')
}

module.exports = { startReminderJob }
