const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const PLAN_PRICES = { BASIC: 30000, STANDARD: 60000, PREMIUM: 120000 }
const PLAN_ANNUAL = { BASIC: 300000, STANDARD: 600000, PREMIUM: 1100000 }

// Calcular precio con descuento anual
const calculatePrice = (plan, months) => {
  if (months >= 12) return PLAN_ANNUAL[plan]
  return PLAN_PRICES[plan] * months
}

// Crear o renovar suscripción — OWNER
const createSubscription = async (data, ownerId) => {
  const { barbershopId, plan, months, paymentMethod } = data

  if (!['BASIC', 'STANDARD', 'PREMIUM'].includes(plan)) {
    throw new Error('Plan inválido. Use BASIC, STANDARD o PREMIUM')
  }
  if (!months || months < 1) throw new Error('El número de meses debe ser al menos 1')

  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const amountPaid = PLAN_PRICES[plan] * months

  // Calcular endDate
  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setUTCMonth(endDate.getUTCMonth() + months)

  // TODO: integrar pasarela de pago aquí

  // Upsert suscripción
  const subscription = await prisma.subscription.upsert({
    where: { barbershopId },
    update: {
      plan,
      status: 'ACTIVE',
      startDate,
      endDate,
      amountPaid,
      paymentMethod,
      autoRenew: true
    },
    create: {
      barbershopId,
      plan,
      status: 'ACTIVE',
      startDate,
      endDate,
      amountPaid,
      paymentMethod,
      autoRenew: true
    }
  })

  // Actualizar plan en la barbería
  await prisma.barbershop.update({
    where: { id: barbershopId },
    data: {
      plan,
      planExpiresAt: endDate,
      isFeatured: plan === 'PREMIUM'
    }
  })

  return subscription
}

// Ver suscripciones propias — OWNER
const getMySubscriptions = async (ownerId) => {
  const barbershops = await prisma.barbershop.findMany({
    where: { ownerId },
    include: {
      subscription: true
    }
  })

  const now = new Date()
  return barbershops
    .filter(b => b.subscription)
    .map(b => {
      const sub = b.subscription
      const daysLeft = Math.max(0, Math.ceil((new Date(sub.endDate) - now) / (1000 * 60 * 60 * 24)))
      return {
        subscriptionId: sub.id,
        barbershopId: b.id,
        barbershopName: b.name,
        plan: sub.plan,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        daysLeft,
        autoRenew: sub.autoRenew,
        amountPaid: sub.amountPaid
      }
    })
}

// Ver todas las suscripciones — ADMIN
const getAllSubscriptions = async (filters = {}) => {
  const where = {}
  if (filters.status) where.status = filters.status
  if (filters.plan) where.plan = filters.plan

  return await prisma.subscription.findMany({
    where,
    include: { barbershop: { select: { name: true, city: true, ownerId: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

// Cancelar renovación automática — OWNER
const cancelAutoRenew = async (id, ownerId) => {
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: { barbershop: true }
  })
  if (!sub) throw new Error('Suscripción no encontrada')
  if (sub.barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta suscripción')

  return await prisma.subscription.update({
    where: { id },
    data: { autoRenew: false }
  })
}

// Cron: verificar suscripciones vencidas
const checkExpiredSubscriptions = async () => {
  const now = new Date()

  const expired = await prisma.subscription.findMany({
    where: { endDate: { lt: now }, status: 'ACTIVE' },
    include: { barbershop: { select: { id: true, name: true, ownerId: true } } }
  })

  for (const sub of expired) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' }
    })

    await prisma.barbershop.update({
      where: { id: sub.barbershopId },
      data: { plan: 'BASIC', isFeatured: false }
    })

    await prisma.notification.create({
      data: {
        userId: sub.barbershop.ownerId,
        title: 'Suscripción vencida',
        body: `Tu suscripción en ${sub.barbershop.name} venció. Renueva para mantener tu visibilidad en la plataforma.`,
        type: 'SUBSCRIPTION_EXPIRED'
      }
    })
  }

  if (expired.length > 0) {
    console.log(`[Subscriptions] ${expired.length} suscripción(es) marcada(s) como EXPIRED`)
  }
}

// ─── STRIPE CHECKOUT ────────────────────────────────────────────────────────

// Crear PaymentIntent de Stripe para activar suscripción (OWNER)
const createCheckout = async ({ barbershopId, plan, months }, ownerId) => {
  const stripeService = require('./stripe.service')

  if (!['BASIC', 'STANDARD', 'PREMIUM'].includes(plan)) throw new Error('Plan inválido')
  if (!months || months < 1) throw new Error('El número de meses debe ser al menos 1')

  const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const amount = calculatePrice(plan, months)

  const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent(
    amount,
    'cop',
    { barbershopId, plan, months: String(months), type: 'subscription' }
  )

  return { clientSecret, paymentIntentId, amount, plan, months }
}

// Webhook de Stripe para confirmar pago de suscripción
const handleSubscriptionWebhook = async (rawBody, signature) => {
  const stripeService = require('./stripe.service')

  const event = stripeService.constructWebhookEvent(rawBody, signature)

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    if (pi.metadata?.type !== 'subscription') return { received: true }

    const { barbershopId, plan, months } = pi.metadata
    const numMonths = parseInt(months)
    const amount = pi.amount / 100

    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setUTCMonth(endDate.getUTCMonth() + numMonths)

    await prisma.subscription.upsert({
      where: { barbershopId },
      update: { plan, status: 'ACTIVE', startDate, endDate, amountPaid: amount, autoRenew: true },
      create: { barbershopId, plan, status: 'ACTIVE', startDate, endDate, amountPaid: amount, paymentMethod: 'CARD', autoRenew: true }
    })

    await prisma.barbershop.update({
      where: { id: barbershopId },
      data: { plan, planExpiresAt: endDate, isFeatured: plan === 'PREMIUM' }
    })

    const barbershop = await prisma.barbershop.findUnique({ where: { id: barbershopId } })
    await prisma.notification.create({
      data: {
        userId: barbershop.ownerId,
        title: '¡Suscripción activada!',
        body: `Tu barbería ahora tiene plan ${plan} activo hasta el ${endDate.toLocaleDateString('es-CO')} 🎉`,
        type: 'SUBSCRIPTION_ACTIVATED'
      }
    })
  }

  return { received: true }
}

module.exports = {
  createSubscription,
  getMySubscriptions,
  getAllSubscriptions,
  cancelAutoRenew,
  checkExpiredSubscriptions,
  createCheckout,
  handleSubscriptionWebhook
}
