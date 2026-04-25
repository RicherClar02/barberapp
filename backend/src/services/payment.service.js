const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Registra un pago en efectivo para una cita
// Crea el Payment con method CASH y status COMPLETED
// Cambia el Appointment.status a CONFIRMED
const registerCashPayment = async (appointmentId, userId, userRole) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barbershop: true, barber: true, payment: true }
  })

  if (!appointment) throw new Error('Cita no encontrada')

  // Verificar permisos: solo OWNER o BARBER de esa barbería
  if (userRole === 'OWNER') {
    if (appointment.barbershop.ownerId !== userId) throw new Error('No tienes permiso sobre esta barbería')
  } else if (userRole === 'BARBER') {
    if (appointment.barber.userId !== userId) throw new Error('Esta cita no te pertenece')
  }

  // Si ya tiene pago completado, no permitir duplicar
  if (appointment.payment && appointment.payment.status === 'COMPLETED') {
    throw new Error('Esta cita ya tiene un pago registrado')
  }

  // Si ya existe un pago pendiente, actualizarlo; si no, crear uno nuevo
  let payment
  if (appointment.payment) {
    payment = await prisma.payment.update({
      where: { id: appointment.payment.id },
      data: { method: 'CASH', status: 'COMPLETED' }
    })
  } else {
    payment = await prisma.payment.create({
      data: {
        appointmentId,
        amount: appointment.totalPrice,
        method: 'CASH',
        status: 'COMPLETED'
      }
    })
  }

  // Confirmar la cita
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CONFIRMED' }
  })

  return payment
}

// ─── STRIPE ─────────────────────────────────────────────────────────────────

// Crear PaymentIntent en Stripe para una cita (CLIENT)
const createStripeIntent = async (appointmentId, clientId) => {
  const stripeService = require('./stripe.service')

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barbershop: true, service: true, client: true }
  })
  if (!appointment) throw new Error('Cita no encontrada')
  if (appointment.clientId !== clientId) throw new Error('Esta cita no te pertenece')
  if (appointment.payment?.status === 'COMPLETED') throw new Error('Esta cita ya tiene un pago completado')

  const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent(
    appointment.totalPrice,
    'cop',
    { appointmentId, clientId, barbershopId: appointment.barbershopId }
  )

  // Guardar o actualizar Payment pendiente
  if (appointment.payment) {
    await prisma.payment.update({
      where: { id: appointment.payment.id },
      data: { method: 'CARD', status: 'PENDING', transactionId: paymentIntentId }
    })
  } else {
    await prisma.payment.create({
      data: {
        appointmentId,
        amount: appointment.totalPrice,
        method: 'CARD',
        status: 'PENDING',
        transactionId: paymentIntentId
      }
    })
  }

  return { clientSecret, paymentIntentId }
}

// Procesar webhook de Stripe
const handleStripeWebhook = async (rawBody, signature) => {
  const stripeService = require('./stripe.service')
  const loyaltyService = require('./loyalty.service')

  const event = stripeService.constructWebhookEvent(rawBody, signature)

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const payment = await prisma.payment.findFirst({ where: { transactionId: pi.id } })
    if (payment) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED' } })
      const appt = await prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'CONFIRMED' },
        include: { barbershop: true }
      })
      await loyaltyService.incrementLoyalty(appt.clientId, appt.barbershopId)
      await prisma.notification.create({
        data: {
          userId: appt.clientId,
          title: 'Pago confirmado',
          body: `Tu cita en ${appt.barbershop.name} ha sido confirmada. ¡Te esperamos!`,
          type: 'PAYMENT_CONFIRMED'
        }
      })
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object
    const payment = await prisma.payment.findFirst({ where: { transactionId: pi.id } })
    if (payment) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
      const appt = await prisma.appointment.findUnique({ where: { id: payment.appointmentId } })
      if (appt) {
        await prisma.notification.create({
          data: {
            userId: appt.clientId,
            title: 'Pago fallido',
            body: 'Hubo un problema procesando tu pago. Intenta de nuevo.',
            type: 'PAYMENT_FAILED'
          }
        })
      }
    }
  } else if (event.type === 'refund.created') {
    const refund = event.data.object
    const payment = await prisma.payment.findFirst({ where: { transactionId: refund.payment_intent } })
    if (payment) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
    }
  }

  return { received: true }
}

// Reembolso vía Stripe (OWNER/ADMIN)
const createStripeRefund = async (appointmentId, reason, userId, userRole) => {
  const stripeService = require('./stripe.service')

  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    include: { appointment: { include: { barbershop: true } } }
  })
  if (!payment) throw new Error('No hay pago registrado para esta cita')
  if (payment.status !== 'COMPLETED') throw new Error('Solo se pueden reembolsar pagos completados')
  if (payment.method !== 'CARD' || !payment.transactionId) throw new Error('Este pago no fue con tarjeta de crédito')

  if (userRole === 'OWNER' && payment.appointment.barbershop.ownerId !== userId) {
    throw new Error('No tienes permiso sobre esta barbería')
  }

  const { refundId, status } = await stripeService.createRefund(payment.transactionId)

  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED_BARBERSHOP' }
  })

  return { refundId, status, message: `Reembolso procesado. Motivo: ${reason}` }
}

// ─── EPAYCO ──────────────────────────────────────────────────────────────────

// Iniciar pago con ePayco (CLIENT)
const createEpaycoPayment = async (appointmentId, method, clientId) => {
  const epaycoService = require('./epayco.service')

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barbershop: true, service: true, client: true }
  })
  if (!appointment) throw new Error('Cita no encontrada')
  if (appointment.clientId !== clientId) throw new Error('Esta cita no te pertenece')

  const response = await epaycoService.createTransaction({
    amount: appointment.totalPrice,
    description: `Pago cita - ${appointment.service.name} en ${appointment.barbershop.name}`,
    appointmentId,
    clientEmail: appointment.client.email,
    clientName: appointment.client.name,
    method
  })

  const transactionId = response?.data?.x_ref_payco || response?.transactionID || String(Date.now())

  await prisma.payment.create({
    data: {
      appointmentId,
      amount: appointment.totalPrice,
      method,
      status: 'PENDING',
      transactionId
    }
  })

  return response
}

// Confirmar webhook ePayco
const handleEpaycoWebhook = async (params) => {
  const epaycoService = require('./epayco.service')
  const loyaltyService = require('./loyalty.service')

  const isValid = epaycoService.verifySignature(params)
  if (!isValid) throw new Error('Firma ePayco inválida')

  const { x_extra1: appointmentId, x_transaction_state } = params
  const payment = await prisma.payment.findUnique({ where: { appointmentId } })
  if (!payment) return { message: 'Pago no encontrado' }

  const isApproved = x_transaction_state === 'Aceptada'

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: isApproved ? 'COMPLETED' : 'FAILED' }
  })

  if (isApproved) {
    const appt = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
      include: { barbershop: true }
    })
    await loyaltyService.incrementLoyalty(appt.clientId, appt.barbershopId)
    await prisma.notification.create({
      data: {
        userId: appt.clientId,
        title: 'Pago confirmado',
        body: `Tu cita en ${appt.barbershop.name} fue confirmada. ¡Te esperamos!`,
        type: 'PAYMENT_CONFIRMED'
      }
    })
  } else {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } })
    if (appt) {
      await prisma.notification.create({
        data: {
          userId: appt.clientId,
          title: 'Pago rechazado',
          body: 'Tu pago con ePayco fue rechazado. Intenta de nuevo.',
          type: 'PAYMENT_FAILED'
        }
      })
    }
  }

  return { received: true }
}

// Verificar estado de transacción ePayco (CLIENT)
const verifyEpaycoTransaction = async (transactionId, clientId) => {
  const epaycoService = require('./epayco.service')

  const payment = await prisma.payment.findFirst({ where: { transactionId } })
  if (!payment) throw new Error('Transacción no encontrada')

  const appt = await prisma.appointment.findUnique({ where: { id: payment.appointmentId } })
  if (appt?.clientId !== clientId) throw new Error('No tienes permiso para ver esta transacción')

  const result = await epaycoService.verifyTransaction(transactionId)

  // Actualizar BD si el estado cambió
  const newStatus = result.status === 'Aceptada' ? 'COMPLETED' : result.status === 'Rechazada' ? 'FAILED' : payment.status
  if (newStatus !== payment.status) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: newStatus } })
    if (newStatus === 'COMPLETED') {
      await prisma.appointment.update({ where: { id: payment.appointmentId }, data: { status: 'CONFIRMED' } })
    }
  }

  return { ...result, paymentStatus: newStatus }
}

// Ver el pago de una cita específica
const getPaymentByAppointment = async (appointmentId, userId, userRole) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barbershop: true }
  })

  if (!appointment) throw new Error('Cita no encontrada')

  // Verificar permisos: CLIENT dueño de la cita u OWNER de la barbería
  if (userRole === 'CLIENT' && appointment.clientId !== userId) {
    throw new Error('Esta cita no te pertenece')
  }
  if (userRole === 'OWNER' && appointment.barbershop.ownerId !== userId) {
    throw new Error('No tienes permiso sobre esta barbería')
  }

  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        include: {
          client: { select: { name: true, email: true } },
          service: { select: { name: true, price: true } },
          barber: { include: { user: { select: { name: true } } } }
        }
      }
    }
  })

  if (!payment) throw new Error('No hay pago registrado para esta cita')
  return payment
}

// Ver todas las transacciones de una barbería con filtros
const getShopPayments = async (barbershopId, filters, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const { startDate, endDate, status, method } = filters

  const where = {
    appointment: { barbershopId }
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setUTCHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  if (status) where.status = status
  if (method) where.method = method

  const payments = await prisma.payment.findMany({
    where,
    include: {
      appointment: {
        include: {
          client: { select: { name: true } },
          service: { select: { name: true } },
          barber: { include: { user: { select: { name: true } } } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Resumen
  const completedPayments = payments.filter(p => p.status === 'COMPLETED')
  const totalRecaudado = completedPayments.reduce((sum, p) => sum + p.amount, 0)

  return {
    payments,
    summary: {
      totalRecaudado,
      cantidadTransacciones: payments.length,
      cantidadCompletadas: completedPayments.length
    }
  }
}

// Dashboard financiero de la barbería
const getFinancialSummary = async (barbershopId, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const now = new Date()

  // Inicio del día
  const startOfDay = new Date(now)
  startOfDay.setUTCHours(0, 0, 0, 0)

  // Inicio de la semana (lunes)
  const startOfWeek = new Date(now)
  const dayOfWeek = startOfWeek.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - diff)
  startOfWeek.setUTCHours(0, 0, 0, 0)

  // Inicio del mes
  const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)

  // Totales por período
  const [totalDay, totalWeek, totalMonth] = await Promise.all([
    prisma.payment.aggregate({
      where: { appointment: { barbershopId }, status: 'COMPLETED', createdAt: { gte: startOfDay } },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { appointment: { barbershopId }, status: 'COMPLETED', createdAt: { gte: startOfWeek } },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { appointment: { barbershopId }, status: 'COMPLETED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true }
    })
  ])

  // Desglose por método de pago (mes actual)
  const paymentsByMethod = await prisma.payment.groupBy({
    by: ['method'],
    where: { appointment: { barbershopId }, status: 'COMPLETED', createdAt: { gte: startOfMonth } },
    _sum: { amount: true },
    _count: { id: true }
  })

  // Top 5 servicios más vendidos (mes actual)
  const topServices = await prisma.appointment.groupBy({
    by: ['serviceId'],
    where: { barbershopId, status: 'COMPLETED', date: { gte: startOfMonth } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  })

  // Traer nombres de los servicios
  const serviceIds = topServices.map(s => s.serviceId)
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true, price: true }
  })

  const topServicesWithNames = topServices.map(s => {
    const service = services.find(sv => sv.id === s.serviceId)
    return {
      serviceName: service ? service.name : 'Desconocido',
      price: service ? service.price : 0,
      totalCitas: s._count.id
    }
  })

  // Citas completadas vs canceladas (mes actual)
  const [completadas, canceladas] = await Promise.all([
    prisma.appointment.count({
      where: { barbershopId, status: 'COMPLETED', date: { gte: startOfMonth } }
    }),
    prisma.appointment.count({
      where: { barbershopId, status: 'CANCELLED', date: { gte: startOfMonth } }
    })
  ])

  return {
    ingresos: {
      hoy: totalDay._sum.amount || 0,
      semana: totalWeek._sum.amount || 0,
      mes: totalMonth._sum.amount || 0
    },
    metodosPago: paymentsByMethod.map(p => ({
      method: p.method,
      total: p._sum.amount || 0,
      cantidad: p._count.id
    })),
    topServicios: topServicesWithNames,
    citas: {
      completadas,
      canceladas
    }
  }
}

// Registrar reembolso manual
const refundPayment = async (appointmentId, userId, userRole) => {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    include: { appointment: { include: { barbershop: true } } }
  })

  if (!payment) throw new Error('No hay pago registrado para esta cita')
  if (payment.status === 'REFUNDED') throw new Error('Este pago ya fue reembolsado')
  if (payment.status !== 'COMPLETED') throw new Error('Solo se pueden reembolsar pagos completados')

  // Verificar permisos
  if (userRole === 'OWNER') {
    if (payment.appointment.barbershop.ownerId !== userId) throw new Error('No tienes permiso sobre esta barbería')
  }
  // ADMIN puede reembolsar cualquier pago

  // TODO: Integrar Stripe refund aquí
  // if (payment.method === 'CARD' && payment.transactionId) {
  //   await stripe.refunds.create({ payment_intent: payment.transactionId })
  // }

  // TODO: Integrar ePayco refund aquí
  // TODO: Integrar PayU refund aquí

  return await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'REFUNDED' }
  })
}

module.exports = {
  registerCashPayment,
  getPaymentByAppointment,
  getShopPayments,
  getFinancialSummary,
  refundPayment,
  createStripeIntent,
  handleStripeWebhook,
  createStripeRefund,
  createEpaycoPayment,
  handleEpaycoWebhook,
  verifyEpaycoTransaction
}
