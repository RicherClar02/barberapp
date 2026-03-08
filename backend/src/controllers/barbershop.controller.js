const barbershopService = require('../services/barbershop.service')

// Recibe los datos del body y llama al servicio para crear la barbería
// El ownerId lo saca del token JWT (req.user.id), no del body
// Así garantizamos que nadie puede crear una barbería a nombre de otro
const createController = async (req, res) => {
  try {
    const barbershop = await barbershopService.createBarbershop(req.body, req.user.id)
    res.status(201).json({ message: 'Barbería creada exitosamente', barbershop })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Recibe filtros opcionales por query params y devuelve la lista
// Ejemplo: GET /api/barbershops?city=Bogota&search=gold
const getAllController = async (req, res) => {
  try {
    const barbershops = await barbershopService.getAllBarbershops(req.query)
    res.status(200).json({ barbershops })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Recibe el ID de la barbería por URL y devuelve su perfil completo
// Ejemplo: GET /api/barbershops/abc-123
const getByIdController = async (req, res) => {
  try {
    const barbershop = await barbershopService.getBarbershopById(req.params.id)
    res.status(200).json({ barbershop })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

// Actualiza la barbería — solo accesible para el dueño autenticado
const updateController = async (req, res) => {
  try {
    const barbershop = await barbershopService.updateBarbershop(req.params.id, req.body, req.user.id)
    res.status(200).json({ message: 'Barbería actualizada', barbershop })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Devuelve las barberías del dueño que está autenticado
// Se usa en el dashboard del dueño para ver "mis barberías"
const getMyBarbershopsController = async (req, res) => {
  try {
    const barbershops = await barbershopService.getMyBarbershops(req.user.id)
    res.status(200).json({ barbershops })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { createController, getAllController, getByIdController, updateController, getMyBarbershopsController }