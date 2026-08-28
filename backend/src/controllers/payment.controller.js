const paymentService = require('../services/payment.service')
const { safeMessage } = require('../utils/safeError')

const cashPaymentController = async (req, res) => {
  try {
    const payment = await paymentService.registerCashPayment(req.params.appointmentId, req.user.id, req.user.role)
    res.status(201).json({ message: 'Pago en efectivo registrado', payment })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

const getByAppointmentController = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentByAppointment(req.params.appointmentId, req.user.id, req.user.role)
    res.status(200).json({ payment })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

const getShopPaymentsController = async (req, res) => {
  try {
    const result = await paymentService.getShopPayments(req.params.shopId, req.query, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

const getSummaryController = async (req, res) => {
  try {
    const summary = await paymentService.getFinancialSummary(req.params.shopId, req.user.id)
    res.status(200).json({ summary })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

const refundController = async (req, res) => {
  try {
    const payment = await paymentService.refundPayment(req.params.appointmentId, req.user.id, req.user.role)
    res.status(200).json({ message: 'Reembolso registrado', payment })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

// ─── STRIPE ──────────────────────────────────────────────────────────────────

const stripeCreateIntentController = async (req, res) => {
  try {
    const { appointmentId } = req.body
    if (!appointmentId) return res.status(400).json({ message: 'appointmentId es requerido' })
    const result = await paymentService.createStripeIntent(appointmentId, req.user.id)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

const stripeWebhookController = async (req, res) => {
  const { logInvalidWebhook } = require('../utils/securityLog')
  const signature = req.headers['stripe-signature']

  // Rechazar cualquier webhook sin firma con 401 (anti-spoofing)
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    logInvalidWebhook('stripe', req.ip, signature ? 'STRIPE_WEBHOOK_SECRET no configurado' : 'Sin header stripe-signature')
    return res.status(401).json({ message: 'Firma de webhook requerida' })
  }

  try {
    const result = await paymentService.handleStripeWebhook(req.body, signature)
    res.status(200).json(result)
  } catch (error) {
    // constructEvent lanza si la firma no es válida
    logInvalidWebhook('stripe', req.ip, error.message)
    res.status(401).json({ message: 'Firma de webhook inválida' })
  }
}

const stripeRefundController = async (req, res) => {
  try {
    const { appointmentId, reason } = req.body
    if (!appointmentId) return res.status(400).json({ message: 'appointmentId es requerido' })
    const result = await paymentService.createStripeRefund(appointmentId, reason || 'Sin motivo', req.user.id, req.user.role)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

// ─── EPAYCO ──────────────────────────────────────────────────────────────────

const epaycoCreateController = async (req, res) => {
  try {
    const { appointmentId, method } = req.body
    if (!appointmentId || !method) return res.status(400).json({ message: 'appointmentId y method son requeridos' })
    const result = await paymentService.createEpaycoPayment(appointmentId, method, req.user.id)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

const epaycoConfirmController = async (req, res) => {
  const { logInvalidWebhook } = require('../utils/securityLog')
  try {
    const result = await paymentService.handleEpaycoWebhook(req.body)
    res.status(200).json(result)
  } catch (error) {
    if (error.message.includes('Firma ePayco inválida')) {
      logInvalidWebhook('epayco', req.ip, 'x_signature no coincide')
      return res.status(401).json({ message: 'Firma de webhook inválida' })
    }
    res.status(400).json({ message: safeMessage(error) })
  }
}

const epaycoVerifyController = async (req, res) => {
  try {
    const result = await paymentService.verifyEpaycoTransaction(req.params.transactionId, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

module.exports = {
  cashPaymentController,
  getByAppointmentController,
  getShopPaymentsController,
  getSummaryController,
  refundController,
  stripeCreateIntentController,
  stripeWebhookController,
  stripeRefundController,
  epaycoCreateController,
  epaycoConfirmController,
  epaycoVerifyController
}
