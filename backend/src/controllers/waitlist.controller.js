const waitlistService = require('../services/waitlist.service')

const joinController = async (req, res) => {
  try {
    const entry = await waitlistService.joinWaitlist(req.body, req.user.id)
    res.status(201).json({ message: 'Te uniste a la lista de espera', entry })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getMyController = async (req, res) => {
  try {
    const entries = await waitlistService.getMyWaitlist(req.user.id)
    res.status(200).json({ entries })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const leaveController = async (req, res) => {
  try {
    const result = await waitlistService.leaveWaitlist(req.params.id, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getShopController = async (req, res) => {
  try {
    const { date, barberId } = req.query
    const entries = await waitlistService.getShopWaitlist(
      req.params.shopId,
      req.user.id,
      req.user.role,
      { date, barberId }
    )
    res.status(200).json({ entries })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { joinController, getMyController, leaveController, getShopController }
