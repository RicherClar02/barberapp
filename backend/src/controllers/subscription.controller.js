const subscriptionService = require('../services/subscription.service')

const createController = async (req, res) => {
  try {
    const sub = await subscriptionService.createSubscription(req.body, req.user.id)
    res.status(201).json({ message: 'Suscripción creada/renovada exitosamente', subscription: sub })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getMyController = async (req, res) => {
  try {
    const subscriptions = await subscriptionService.getMySubscriptions(req.user.id)
    res.status(200).json({ subscriptions })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getAllController = async (req, res) => {
  try {
    const { status, plan } = req.query
    const subscriptions = await subscriptionService.getAllSubscriptions({ status, plan })
    res.status(200).json({ subscriptions })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const cancelAutoRenewController = async (req, res) => {
  try {
    const sub = await subscriptionService.cancelAutoRenew(req.params.id, req.user.id)
    res.status(200).json({ message: 'Renovación automática cancelada', subscription: sub })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const checkoutController = async (req, res) => {
  try {
    const result = await subscriptionService.createCheckout(req.body, req.user.id)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const subscriptionWebhookController = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature']
    const result = await subscriptionService.handleSubscriptionWebhook(req.body, signature)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { createController, getMyController, getAllController, cancelAutoRenewController, checkoutController, subscriptionWebhookController }
