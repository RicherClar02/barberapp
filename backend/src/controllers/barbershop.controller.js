const barbershopService = require('../services/barbershop.service')
const { safeMessage } = require('../utils/safeError')
const { resolveMapLink } = require('../utils/googleMaps')

// Recibe los datos del body y llama al servicio para crear la barbería
// El ownerId lo saca del token JWT (req.user.id), no del body
// Así garantizamos que nadie puede crear una barbería a nombre de otro
const createController = async (req, res) => {
  try {
    const barbershop = await barbershopService.createBarbershop(req.body, req.user.id)
    res.status(201).json({ message: 'Barbería creada exitosamente', barbershop })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

// Recibe filtros opcionales por query params y devuelve la lista
// Ejemplo: GET /api/barbershops?department=Meta&city=Villavicencio&search=gold
// Si hay usuario autenticado y no envía filtros, usa su ciudad por defecto
const getAllController = async (req, res) => {
  try {
    const barbershops = await barbershopService.getAllBarbershops(req.query, req.user || null)
    res.status(200).json({ barbershops })
  } catch (error) {
    res.status(500).json({ message: safeMessage(error) })
  }
}

// Recibe el ID de la barbería por URL y devuelve su perfil completo
// Ejemplo: GET /api/barbershops/abc-123
const getByIdController = async (req, res) => {
  try {
    const barbershop = await barbershopService.getBarbershopById(req.params.id)
    res.status(200).json({ barbershop })
  } catch (error) {
    res.status(404).json({ message: safeMessage(error) })
  }
}

// Actualiza la barbería — solo accesible para el dueño autenticado
const updateController = async (req, res) => {
  try {
    const barbershop = await barbershopService.updateBarbershop(req.params.id, req.body, req.user.id)
    res.status(200).json({ message: 'Barbería actualizada', barbershop })
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

// Devuelve las barberías del dueño que está autenticado
// Se usa en el dashboard del dueño para ver "mis barberías"
const getMyBarbershopsController = async (req, res) => {
  try {
    const barbershops = await barbershopService.getMyBarbershops(req.user.id)
    res.status(200).json({ barbershops })
  } catch (error) {
    res.status(500).json({ message: safeMessage(error) })
  }
}

// Retorna el % de completitud de la ficha de la barbería y qué falta
const getCompletenessController = async (req, res) => {
  try {
    const completeness = await barbershopService.getCompleteness(req.params.id, req.user.id)
    res.status(200).json(completeness)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

// Traduce el link de Google Maps que pegó el dueño a lat/lng.
// No guarda nada: devuelve las coordenadas para que el formulario las muestre
// y el dueño confirme antes de mandarlas con el resto de la ficha.
const resolveMapLinkController = async (req, res) => {
  try {
    const coordinates = await resolveMapLink(req.body?.url)
    res.status(200).json(coordinates)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

module.exports = { createController, getAllController, getByIdController, updateController, getMyBarbershopsController, getCompletenessController, resolveMapLinkController }