const prisma = require('../lib/prisma')
const { incrementLoyalty } = require('./loyalty.service')
const { notifyNextInWaitlist } = require('./waitlist.service')
const { sendPushNotification } = require('./notification.service')
const {
  generateSlots,
  filterAvailableSlots,
  filterPastSlots,
  isPastDateTime,
} = require('./shared/slots.service')

// Formatea una fecha a texto legible en español (ej: "lunes 15 de junio")
const formatDateEs = (date) => {
  return new Date(date).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  })
}

// Notifica al barbero asignado (push + registro en tabla Notification)
const notifyBarber = async (barberUserId, title, body) => {
  await prisma.notification.create({
    data: { userId: barberUserId, title, body, type: 'BARBER_AGENDA' }
  })
  await sendPushNotification(barberUserId, title, body)
}

// Genera los slots disponibles para un barbero en una fecha específica
// Lógica: toma el horario del día, genera slots cada X minutos (duración del servicio),
// y excluye los que ya tienen citas PENDING o CONFIRMED
const getAvailability = async (barbershopId, barberId, date, serviceId) => {
  // Verificar que el barbero pertenece a la barbería
  const barber = await prisma.barber.findFirst({
    where: { id: barberId, barbershopId, isActive: true }
  })
  if (!barber) throw new Error('Barbero no encontrado en esta barbería')

  // Obtener el servicio para saber la duración
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service || !service.isActive) throw new Error('Servicio no encontrado o inactivo')

  // Obtener el horario del día de la semana
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getUTCDay() // 0=Domingo, 6=Sábado

  const schedule = await prisma.schedule.findFirst({
    where: { barbershopId, dayOfWeek }
  })

  if (!schedule || !schedule.isOpen) {
    return { slots: [], message: 'La barbería no abre este día' }
  }

  // Generar todos los slots posibles según la duración del servicio
  const allSlots = generateSlots(schedule.openTime, schedule.closeTime, service.duration)

  // Buscar citas existentes del barbero en esa fecha que estén activas
  const startOfDay = new Date(date)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      barberId,
      date: { gte: startOfDay, lte: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
    },
    select: { startTime: true, endTime: true }
  })

  // Filtrar slots que no se solapen con citas existentes, y descartar los que
  // ya pasaron cuando la fecha pedida es hoy: la grilla se genera de apertura a
  // cierre sin mirar el reloj, así que a las 18:00 seguía ofreciendo las 08:00.
  const freeSlots = filterAvailableSlots(allSlots, existingAppointments)
  const availableSlots = filterPastSlots(freeSlots, date)

  return { slots: availableSlots, duration: service.duration, serviceName: service.name }
}

// Crea una nueva cita
// Validaciones: barbería activa, barbero pertenece, servicio activo, slot disponible
const createAppointment = async (data, clientId) => {
  const { barbershopId, barberId, serviceId, date, startTime } = data

  // Validar barbería activa
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop || !barbershop.isActive) throw new Error('Barbería no encontrada o inactiva')

  // Validar barbero pertenece a la barbería
  const barber = await prisma.barber.findFirst({
    where: { id: barberId, barbershopId, isActive: true }
  })
  if (!barber) throw new Error('Barbero no encontrado en esta barbería')

  // Validar servicio activo
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service || !service.isActive) throw new Error('Servicio no encontrado o inactivo')
  if (service.barbershopId !== barbershopId) throw new Error('El servicio no pertenece a esta barbería')

  // Calcular endTime basado en la duración del servicio
  const [startH, startM] = startTime.split(':').map(Number)
  const endTotal = startH * 60 + startM + service.duration
  const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`

  // La cita tiene que ser a futuro. La disponibilidad ya no ofrece los cupos
  // que pasaron, pero sin esta validación se podían crear igual llamando al
  // endpoint directo: se aceptaba una cita para ayer. Misma comparación contra
  // la hora de la barbería que usa filterPastSlots, para que la lista de cupos
  // y lo que el backend acepta no puedan discrepar.
  const dateObj = new Date(date)
  const dateKey = dateObj.toISOString().slice(0, 10)
  if (isPastDateTime(dateKey, startTime)) {
    throw new Error('No se puede reservar en una fecha u hora que ya pasó. Elegí un horario futuro.')
  }

  // Verificar que el horario está dentro del horario de la barbería
  const dayOfWeek = dateObj.getUTCDay()

  const schedule = await prisma.schedule.findFirst({
    where: { barbershopId, dayOfWeek }
  })

  if (!schedule || !schedule.isOpen) throw new Error('La barbería no abre este día')
  if (startTime < schedule.openTime || endTime > schedule.closeTime) {
    throw new Error('El horario seleccionado está fuera del horario de la barbería')
  }

  // Verificar que no hay conflicto con otra cita del mismo barbero
  const startOfDay = new Date(date)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const conflict = await prisma.appointment.findFirst({
    where: {
      barberId,
      date: { gte: startOfDay, lte: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } }
      ]
    }
  })

  if (conflict) throw new Error('El barbero ya tiene una cita en ese horario')

  const appointment = await prisma.appointment.create({
    data: {
      clientId,
      barbershopId,
      barberId,
      serviceId,
      date: startOfDay,
      startTime,
      endTime,
      totalPrice: service.price,
      status: 'PENDING'
    },
    include: {
      client: { select: { name: true } },
      barbershop: { select: { name: true, address: true } },
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { name: true, price: true, duration: true } }
    }
  })

  // Notificar al barbero asignado (también aplica cuando el sistema
  // asignó el barbero por "cualquier barbero")
  await notifyBarber(
    barber.userId,
    'Nueva reserva 💈',
    `${appointment.client.name} reservó ${service.name} el ${formatDateEs(startOfDay)} a las ${startTime}`
  )

  return appointment
}

// Trae las citas del cliente autenticado
const getMyAppointments = async (clientId) => {
  return await prisma.appointment.findMany({
    where: { clientId },
    include: {
      barbershop: { select: { name: true, address: true, phone: true } },
      barber: { include: { user: { select: { name: true, avatar: true } } } },
      service: { select: { name: true, price: true, duration: true } }
    },
    orderBy: { date: 'desc' }
  })
}

// Agenda del barbero autenticado por fecha (la app móvil consulta por userId)
// Privacidad: solo el propio barbero puede ver su agenda
const getBarberAppointments = async (targetUserId, requestUserId, date) => {
  if (targetUserId !== requestUserId) throw new Error('No tienes permiso para ver esta agenda')

  const barber = await prisma.barber.findFirst({ where: { userId: targetUserId } })
  if (!barber) throw new Error('No tienes perfil de barbero')

  const where = { barberId: barber.id }
  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setUTCHours(23, 59, 59, 999)
    where.date = { gte: startOfDay, lte: endOfDay }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      client: { select: { name: true, phone: true, whatsappNumber: true, avatar: true } },
      service: { select: { id: true, name: true, price: true, duration: true } }
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  })

  return appointments.map(a => ({
    ...a,
    price: a.totalPrice,
    client: { ...a.client, whatsapp: a.client.whatsappNumber }
  }))
}

// Trae la agenda de una barbería con filtros opcionales
// Solo accesible para el dueño o barberos de esa barbería
const getShopAppointments = async (barbershopId, filters = {}, userId, userRole) => {
  // Verificar permisos
  if (userRole === 'OWNER') {
    const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
    if (!barbershop || barbershop.ownerId !== userId) throw new Error('No tienes permiso sobre esta barbería')
  } else if (userRole === 'BARBER') {
    const barber = await prisma.barber.findFirst({
      where: { userId, barbershopId, isActive: true }
    })
    if (!barber) throw new Error('No perteneces a esta barbería')
  } else {
    throw new Error('No tienes permiso para ver la agenda')
  }

  const { date, barberId, status } = filters

  const where = { barbershopId }

  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setUTCHours(23, 59, 59, 999)
    where.date = { gte: startOfDay, lte: endOfDay }
  }

  if (barberId) where.barberId = barberId
  if (status) where.status = status

  return await prisma.appointment.findMany({
    where,
    include: {
      client: { select: { name: true, phone: true, avatar: true } },
      barber: { include: { user: { select: { name: true } } } },
      service: { select: { name: true, price: true, duration: true } }
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  })
}

// Confirmar cita — solo OWNER o BARBER de esa barbería
const confirmAppointment = async (id, userId, userRole) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { barbershop: true, barber: true }
  })

  if (!appointment) throw new Error('Cita no encontrada')
  if (appointment.status !== 'PENDING') throw new Error('Solo se pueden confirmar citas pendientes')

  await verifyShopPermission(appointment, userId, userRole)

  return await prisma.appointment.update({
    where: { id },
    data: { status: 'CONFIRMED' }
  })
}

// Cancelar cita — CLIENT puede cancelar si es PENDING/CONFIRMED, OWNER/BARBER pueden cancelar las suyas
const cancelAppointment = async (id, userId, userRole, cancelReason) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { barbershop: true, barber: true, payment: true }
  })

  if (!appointment) throw new Error('Cita no encontrada')

  let cancelledByShop = false
  let cancelledByClient = false

  if (userRole === 'CLIENT') {
    if (appointment.clientId !== userId) throw new Error('Esta cita no te pertenece')
    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      throw new Error('Solo puedes cancelar citas pendientes o confirmadas')
    }
    cancelledByClient = true
  } else if (userRole === 'OWNER') {
    if (appointment.barbershop.ownerId !== userId) throw new Error('No tienes permiso sobre esta barbería')
    cancelledByShop = true
  } else if (userRole === 'BARBER') {
    if (appointment.barber.userId !== userId) throw new Error('Esta cita no te pertenece')
    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      throw new Error('Solo puedes cancelar citas pendientes o confirmadas')
    }
    cancelledByShop = true
  } else {
    throw new Error('No tienes permiso para cancelar esta cita')
  }

  // Si cancela la barbería (BARBER), el motivo es obligatorio
  if (userRole === 'BARBER' && (!cancelReason || !cancelReason.trim())) {
    throw new Error('Debes indicar el motivo de la cancelación')
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED', cancelReason }
  })

  // Si cancela el cliente: notificar al barbero asignado
  if (cancelledByClient) {
    const client = await prisma.user.findUnique({
      where: { id: appointment.clientId },
      select: { name: true }
    })
    await notifyBarber(
      appointment.barber.userId,
      'Cita cancelada',
      `${client.name} canceló su cita de las ${appointment.startTime}`
    )
  }

  // Si cancela la barbería: notificar al cliente con disculpa y procesar reembolso
  if (cancelledByShop) {
    await prisma.notification.create({
      data: {
        userId: appointment.clientId,
        title: 'Cita cancelada por la barbería',
        body: `Lamentamos informarte que tu cita en ${appointment.barbershop.name} ha sido cancelada.${cancelReason ? ` Motivo: ${cancelReason}.` : ''} Disculpa los inconvenientes. Puedes reagendar cuando quieras. 💈`,
        type: 'CANCELLED_BY_SHOP'
      }
    })

    if (appointment.payment && appointment.payment.status === 'COMPLETED') {
      await prisma.payment.update({
        where: { id: appointment.payment.id },
        data: { status: 'REFUNDED' }
      })
    }

    // Notificar al siguiente en lista de espera
    await notifyNextInWaitlist(appointment.barberId, appointment.date, appointment.startTime)
  }

  return updated
}

// Marcar cita como completada — solo OWNER o BARBER
const completeAppointment = async (id, userId, userRole) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { barbershop: true, barber: true }
  })

  if (!appointment) throw new Error('Cita no encontrada')
  if (!['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status)) {
    throw new Error('Solo se pueden completar citas confirmadas o en progreso')
  }

  await verifyShopPermission(appointment, userId, userRole)

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'COMPLETED' }
  })

  // Incrementar fidelidad del cliente
  await incrementLoyalty(appointment.clientId, appointment.barbershopId)

  return updated
}

// Marcar cita como no-show — solo OWNER o BARBER
// Requiere que hayan pasado al menos 10 minutos desde la hora de inicio
const noShowAppointment = async (id, userId, userRole) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { barbershop: true, barber: true }
  })

  if (!appointment) throw new Error('Cita no encontrada')
  if (!['CONFIRMED', 'PENDING'].includes(appointment.status)) {
    throw new Error('Solo se pueden marcar como no-show citas pendientes o confirmadas')
  }

  // Verificar tolerancia de 10 minutos
  const [startH, startM] = appointment.startTime.split(':').map(Number)
  const apptStart = new Date(appointment.date)
  apptStart.setUTCHours(startH, startM, 0, 0)
  const diffMin = (Date.now() - apptStart.getTime()) / (1000 * 60)

  if (diffMin < 10) {
    const remaining = Math.ceil(10 - diffMin)
    throw new Error(`Debes esperar al menos 10 minutos desde la hora de inicio. Faltan ${remaining} minuto(s).`)
  }

  await verifyShopPermission(appointment, userId, userRole)

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'NO_SHOW' }
  })

  // Notificar al cliente
  await prisma.notification.create({
    data: {
      userId: appointment.clientId,
      title: 'Cita cancelada - No presentaste',
      body: `Tu cita en ${appointment.barbershop.name} fue cancelada porque no te presentaste a tiempo. Puedes reagendar cuando quieras. 💈`,
      type: 'NO_SHOW'
    }
  })

  // Notificar al siguiente en lista de espera
  await notifyNextInWaitlist(appointment.barberId, appointment.date, appointment.startTime)

  return updated
}

// Reprogramar cita por imprevisto del barbero — solo BARBER (la suya) u OWNER
// Valida que el nuevo slot esté libre y notifica al cliente.
// El cliente puede cancelar sin penalidad tras una reprogramación (rescheduledByShop)
const rescheduleAppointment = async (id, { newDate, newStartTime, reason }, userId, userRole) => {
  if (!newDate || !newStartTime) throw new Error('newDate y newStartTime son obligatorios')
  if (!reason || !reason.trim()) throw new Error('Debes indicar el motivo de la reprogramación')

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { barbershop: true, barber: true, service: true }
  })

  if (!appointment) throw new Error('Cita no encontrada')
  if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
    throw new Error('Solo se pueden reprogramar citas pendientes o confirmadas')
  }

  await verifyShopPermission(appointment, userId, userRole)

  // Calcular nuevo endTime con la duración del servicio
  const [startH, startM] = newStartTime.split(':').map(Number)
  const endTotal = startH * 60 + startM + appointment.service.duration
  const newEndTime = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`

  // Validar horario de la barbería para el nuevo día
  const dayOfWeek = new Date(newDate).getUTCDay()
  const schedule = await prisma.schedule.findFirst({
    where: { barbershopId: appointment.barbershopId, dayOfWeek }
  })
  if (!schedule || !schedule.isOpen) throw new Error('La barbería no abre ese día')
  if (newStartTime < schedule.openTime || newEndTime > schedule.closeTime) {
    throw new Error('El nuevo horario está fuera del horario de la barbería')
  }

  // Validar que el nuevo slot esté libre (excluyendo esta misma cita)
  const startOfDay = new Date(newDate)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(newDate)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const conflict = await prisma.appointment.findFirst({
    where: {
      id: { not: id },
      barberId: appointment.barberId,
      date: { gte: startOfDay, lte: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      AND: [
        { startTime: { lt: newEndTime } },
        { endTime: { gt: newStartTime } }
      ]
    }
  })
  if (conflict) throw new Error('El barbero ya tiene una cita en ese horario')

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      date: startOfDay,
      startTime: newStartTime,
      endTime: newEndTime,
      rescheduledByShop: true,
      rescheduleReason: reason
    },
    include: {
      client: { select: { name: true } },
      barbershop: { select: { name: true } },
      service: { select: { name: true } }
    }
  })

  // Notificar al cliente
  const message = `Tu cita fue reprogramada para ${formatDateEs(startOfDay)} a las ${newStartTime}. Motivo: ${reason}. Si no puedes asistir, cancélala sin costo.`
  await prisma.notification.create({
    data: {
      userId: appointment.clientId,
      title: 'Cita reprogramada 📅',
      body: message,
      type: 'APPOINTMENT_RESCHEDULED'
    }
  })
  await sendPushNotification(appointment.clientId, 'Cita reprogramada 📅', message)

  return updated
}

// Verifica que el usuario sea dueño o barbero de la barbería de la cita
const verifyShopPermission = async (appointment, userId, userRole) => {
  if (userRole === 'OWNER') {
    if (appointment.barbershop.ownerId !== userId) throw new Error('No tienes permiso sobre esta barbería')
  } else if (userRole === 'BARBER') {
    if (appointment.barber.userId !== userId) throw new Error('Esta cita no te pertenece')
  } else {
    throw new Error('No tienes permiso para esta acción')
  }
}

module.exports = {
  getAvailability,
  createAppointment,
  getMyAppointments,
  getBarberAppointments,
  getShopAppointments,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  noShowAppointment,
  rescheduleAppointment
}
