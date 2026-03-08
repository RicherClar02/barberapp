const barberService = require('../services/barber.service')

// El dueño agrega un barbero a su barbería
// Recibe userId del barbero y barbershopId en el body
const addBarberController = async (req, res) => {
  try {
    const barber = await barberService.addBarber(req.body, req.user.id)
    res.status(201).json({ message: 'Barbero agregado exitosamente', barber })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Lista todos los barberos de una barbería
// El :shopId viene por la URL
const getByShopController = async (req, res) => {
  try {
    const barbers = await barberService.getBarbersByShop(req.params.shopId)
    res.status(200).json({ barbers })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Perfil completo de un barbero por su ID
const getByIdController = async (req, res) => {
  try {
    const barber = await barberService.getBarberById(req.params.id)
    res.status(200).json({ barber })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

// El dueño actualiza datos del barbero
const updateBarberController = async (req, res) => {
  try {
    const barber = await barberService.updateBarber(req.params.id, req.body, req.user.id)
    res.status(200).json({ message: 'Barbero actualizado', barber })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { addBarberController, getByShopController, getByIdController, updateBarberController }