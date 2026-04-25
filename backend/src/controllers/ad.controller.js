const adService = require('../services/ad.service')

const getActiveController = async (req, res) => {
  try {
    const ads = await adService.getActiveAds()
    res.status(200).json({ ads })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const clickController = async (req, res) => {
  try {
    await adService.registerClick(req.params.id)
    res.status(200).json({ message: 'Click registrado' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createController = async (req, res) => {
  try {
    const ad = await adService.createAd(req.body, req.user.id)
    res.status(201).json({ message: 'Anuncio creado exitosamente', ad })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateController = async (req, res) => {
  try {
    const ad = await adService.updateAd(req.params.id, req.body, req.user.id)
    res.status(200).json({ message: 'Anuncio actualizado', ad })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const activateController = async (req, res) => {
  try {
    const { amountPaid } = req.body
    if (!amountPaid) return res.status(400).json({ message: 'Se requiere amountPaid' })

    const ad = await adService.activateAd(req.params.id, amountPaid)
    res.status(200).json({ message: 'Anuncio activado y marcado como pagado', ad })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getShopAdsController = async (req, res) => {
  try {
    const ads = await adService.getShopAds(req.params.shopId, req.user.id)
    res.status(200).json({ ads })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const deleteController = async (req, res) => {
  try {
    await adService.deleteAd(req.params.id, req.user.id, req.user.role)
    res.status(200).json({ message: 'Anuncio desactivado' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { getActiveController, clickController, createController, updateController, activateController, getShopAdsController, deleteController }
