const earningsService = require('../services/earnings.service')

const getBarberEarningsController = async (req, res) => {
  try {
    const { period } = req.query
    const earnings = await earningsService.getBarberEarnings(
      req.params.barberId,
      period,
      req.user.id,
      req.user.role
    )
    res.status(200).json({ earnings })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getShopEarningsController = async (req, res) => {
  try {
    const { period } = req.query
    const earnings = await earningsService.getShopEarnings(
      req.params.shopId,
      period,
      req.user.id
    )
    res.status(200).json({ earnings })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getBarberTodayController = async (req, res) => {
  try {
    const quick = await earningsService.getBarberTodayQuick(
      req.params.barberId,
      req.user.id
    )
    res.status(200).json(quick)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { getBarberEarningsController, getShopEarningsController, getBarberTodayController }
