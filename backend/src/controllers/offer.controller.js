const offerService = require('../services/offer.service')

const getActiveController = async (req, res) => {
  try {
    const offers = await offerService.getActiveOffers(req.query.barbershopId)
    res.status(200).json({ offers })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getShopOffersController = async (req, res) => {
  try {
    const offers = await offerService.getShopOffers(req.params.shopId, req.user.id)
    res.status(200).json({ offers })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createController = async (req, res) => {
  try {
    const offer = await offerService.createOffer(req.body, req.user.id)
    res.status(201).json({ message: 'Oferta creada', offer })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateController = async (req, res) => {
  try {
    const offer = await offerService.updateOffer(req.params.id, req.body, req.user.id)
    res.status(200).json({ message: 'Oferta actualizada', offer })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const deleteController = async (req, res) => {
  try {
    await offerService.deleteOffer(req.params.id, req.user.id)
    res.status(200).json({ message: 'Oferta desactivada' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const validateCodeController = async (req, res) => {
  try {
    const { code, barbershopId, serviceId } = req.body
    if (!code || !barbershopId) return res.status(400).json({ message: 'code y barbershopId son requeridos' })
    const result = await offerService.validateCode(code, barbershopId, serviceId)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { getActiveController, getShopOffersController, createController, updateController, deleteController, validateCodeController }
