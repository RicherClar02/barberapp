const Stripe = require('stripe')

// TODO: configurar STRIPE_SECRET_KEY en .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Crear intención de pago (amount en pesos COP, se convierte a centavos)
const createPaymentIntent = async (amount, currency = 'cop', metadata = {}) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata
  })
  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id }
}

// Verificar estado de un PaymentIntent
const confirmPayment = async (paymentIntentId) => {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  return { status: pi.status, amount: pi.amount / 100, currency: pi.currency }
}

// Crear reembolso total o parcial
const createRefund = async (paymentIntentId, amount = null) => {
  const params = { payment_intent: paymentIntentId }
  if (amount) params.amount = Math.round(amount * 100)
  const refund = await stripe.refunds.create(params)
  return { refundId: refund.id, status: refund.status }
}

// Construir y verificar evento de webhook
const constructWebhookEvent = (rawBody, signature) => {
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
}

module.exports = { createPaymentIntent, confirmPayment, createRefund, constructWebhookEvent }
