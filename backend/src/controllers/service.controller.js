const serviceService = require('../services/service.service')

const createController = async (req, res) => {
  try {
    const service = await serviceService.createService(req.body, req.user.id)
    res.status(201).json({ message: 'Servicio creado exitosamente', service })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Trae los servicios de una barbería — el :shopId viene por la URL
const getByShopController = async (req, res) => {
  try {
    const services = await serviceService.getServicesByShop(req.params.shopId)
    res.status(200).json({ services })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateController = async (req, res) => {
  try {
    const service = await serviceService.updateService(req.params.id, req.body, req.user.id)
    res.status(200).json({ message: 'Servicio actualizado', service })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Hace un soft delete — marca el servicio como inactivo
// No se borra de la base de datos para mantener el historial
const deleteController = async (req, res) => {
  try {
    await serviceService.deleteService(req.params.id, req.user.id)
    res.status(200).json({ message: 'Servicio eliminado correctamente' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { createController, getByShopController, updateController, deleteController }