const configService = require('../services/config.service')

const getConfigController = async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.shopId)
    res.status(200).json({ config })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

const createConfigController = async (req, res) => {
  try {
    const config = await configService.createConfig(req.params.shopId, req.body, req.user.id)
    res.status(201).json({ message: 'Configuración creada exitosamente', config })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateConfigController = async (req, res) => {
  try {
    const config = await configService.updateConfig(req.params.shopId, req.body, req.user.id)
    res.status(200).json({ message: 'Configuración actualizada', config })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { getConfigController, createConfigController, updateConfigController }
