const paymentService = require('../services/payment.service')

const cashPaymentController = async (req, res) => {
  try {
    const payment = await paymentService.registerCashPayment(req.params.appointmentId, req.user.id, req.user.role)
    res.status(201).json({ message: 'Pago en efectivo registrado', payment })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getByAppointmentController = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentByAppointment(req.params.appointmentId, req.user.id, req.user.role)
    res.status(200).json({ payment })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getShopPaymentsController = async (req, res) => {
  try {
    const result = await paymentService.getShopPayments(req.params.shopId, req.query, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getSummaryController = async (req, res) => {
  try {
    const summary = await paymentService.getFinancialSummary(req.params.shopId, req.user.id)
    res.status(200).json({ summary })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const refundController = async (req, res) => {
  try {
    const payment = await paymentService.refundPayment(req.params.appointmentId, req.user.id, req.user.role)
    res.status(200).json({ message: 'Reembolso registrado', payment })
  } catch (error) {
    res.status(400).json({ message: error.message })
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
    res.status(400).json({ message: error.message })
  }
}

const stripeWebhookController = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature']
    const result = await paymentService.handleStripeWebhook(req.body, signature)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const stripeRefundController = async (req, res) => {
  try {
    const { appointmentId, reason } = req.body
    if (!appointmentId) return res.status(400).json({ message: 'appointmentId es requerido' })
    const result = await paymentService.createStripeRefund(appointmentId, reason || 'Sin motivo', req.user.id, req.user.role)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
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
    res.status(400).json({ message: error.message })
  }
}

const epaycoConfirmController = async (req, res) => {
  try {
    const result = await paymentService.handleEpaycoWebhook(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const epaycoVerifyController = async (req, res) => {
  try {
    const result = await paymentService.verifyEpaycoTransaction(req.params.transactionId, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
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
