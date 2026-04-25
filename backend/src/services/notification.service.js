const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// TODO: activar cuenta Twilio y configurar .env con TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM
const sendWhatsApp = async (to, message) => {
  try {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
      console.log('[WhatsApp] Twilio no configurado. Mensaje simulado:', { to, message })
      return { success: false, reason: 'Twilio no configurado' }
    }

    const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
    const result = await twilio.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message
    })

    return { success: true, sid: result.sid }
  } catch (error) {
    console.error('[WhatsApp] Error:', error.message)
    return { success: false, reason: error.message }
  }
}

// TODO: configurar Firebase proyecto y agregar FIREBASE_SERVER_KEY al .env
const sendPushNotification = async (userId, title, body) => {
  try {
    if (!process.env.FIREBASE_SERVER_KEY) {
      console.log('[Push] Firebase no configurado. Notificación simulada:', { userId, title, body })
      return { success: false, reason: 'Firebase no configurado' }
    }

    // TODO: implementar envío real con Firebase Admin SDK
    // const admin = require('firebase-admin')
    // await admin.messaging().send({ ... })

    return { success: false, reason: 'Firebase pendiente de implementación' }
  } catch (error) {
    console.error('[Push] Error:', error.message)
    return { success: false, reason: error.message }
  }
}

// Envía recordatorio de cita según preferencias del cliente
const sendAppointmentReminder = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      barber: { include: { user: { select: { name: true } } } },
      barbershop: { select: { name: true } },
      service: { select: { name: true } }
    }
  })

  if (!appointment) return

  // Buscar preferencias del cliente
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: appointment.clientId }
  })

  const message = `Hola ${appointment.client.name}, recuerda tu cita en ${appointment.barbershop.name} con ${appointment.barber.user.name} a las ${appointment.startTime}. ¡Te esperamos! 💈`

  // Enviar según preferencia
  if (preferences && preferences.preferWhatsapp && preferences.whatsappNumber) {
    await sendWhatsApp(preferences.whatsappNumber, message)
  } else if (!preferences || preferences.preferPush) {
    await sendPushNotification(appointment.clientId, 'Recordatorio de cita', message)
  }

  // Guardar en tabla Notification
  await prisma.notification.create({
    data: {
      userId: appointment.clientId,
      title: 'Recordatorio de cita',
      body: message,
      type: 'APPOINTMENT_REMINDER'
    }
  })
}

// Guardar o actualizar preferencias de notificación del cliente
const savePreferences = async (userId, data) => {
  return await prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      whatsappNumber: data.whatsappNumber,
      preferWhatsapp: data.preferWhatsapp,
      preferPush: data.preferPush,
      reminderEnabled: data.reminderEnabled
    },
    create: {
      userId,
      whatsappNumber: data.whatsappNumber,
      preferWhatsapp: data.preferWhatsapp ?? false,
      preferPush: data.preferPush ?? true,
      reminderEnabled: data.reminderEnabled ?? true
    }
  })
}

// Ver preferencias de notificación
const getPreferences = async (userId) => {
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId }
  })

  if (!preferences) {
    return { preferWhatsapp: false, preferPush: true, reminderEnabled: true, whatsappNumber: null }
  }

  return preferences
}

// Historial de notificaciones del cliente
const getMyNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

// Marcar una notificación como leída
const markAsRead = async (id, userId) => {
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) throw new Error('Notificación no encontrada')
  if (notification.userId !== userId) throw new Error('Esta notificación no te pertenece')

  return await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  })
}

// Marcar todas las notificaciones como leídas
const markAllAsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  })

  return { message: 'Todas las notificaciones marcadas como leídas' }
}

module.exports = {
  sendWhatsApp,
  sendPushNotification,
  sendAppointmentReminder,
  savePreferences,
  getPreferences,
  getMyNotifications,
  markAsRead,
  markAllAsRead
}
