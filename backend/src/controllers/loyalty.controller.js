const loyaltyService = require('../services/loyalty.service')
const { safeMessage } = require('../utils/safeError')

// Cliente ve sus puntos de fidelidad en una barbería
const getMyLoyaltyController = async (req, res) => {
  try {
    const loyalty = await loyaltyService.getClientLoyalty(req.params.shopId, req.user.id)
    res.status(200).json({ loyalty })
  } catch (error) {
    res.status(500).json({ message: safeMessage(error) })
  }
}

// Dueño ve ranking de clientes frecuentes
const getClientsRankingController = async (req, res) => {
  try {
    const clients = await loyaltyService.getShopClientsRanking(req.params.shopId, req.user.id)
    res.status(200).json({ clients })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

// Cliente canjea un corte gratis
const redeemController = async (req, res) => {
  try {
    const { barbershopId } = req.body
    if (!barbershopId) return res.status(400).json({ message: 'Se requiere barbershopId' })

    const loyalty = await loyaltyService.redeemFreeCut(barbershopId, req.user.id)
    res.status(200).json({ message: 'Corte gratis canjeado exitosamente', loyalty })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

module.exports = { getMyLoyaltyController, getClientsRankingController, redeemController }
