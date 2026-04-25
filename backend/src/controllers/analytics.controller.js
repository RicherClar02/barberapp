const analyticsService = require('../services/analytics.service')

const shopOverviewController = async (req, res) => {
  try {
    const data = await analyticsService.getShopOverview(req.params.shopId, req.query.period, req.user.id)
    res.status(200).json(data)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const shopClientsController = async (req, res) => {
  try {
    const data = await analyticsService.getShopClients(req.params.shopId, req.user.id)
    res.status(200).json(data)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const shopBarbersController = async (req, res) => {
  try {
    const data = await analyticsService.getShopBarbers(req.params.shopId, req.user.id)
    res.status(200).json(data)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const platformController = async (req, res) => {
  try {
    const data = await analyticsService.getPlatformAnalytics()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { shopOverviewController, shopClientsController, shopBarbersController, platformController }
