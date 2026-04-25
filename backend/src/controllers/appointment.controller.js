const appointmentService = require('../services/appointment.service')

// Retorna los slots disponibles para un barbero en una fecha
// Query param: serviceId (obligatorio para calcular duración de slots)
const getAvailabilityController = async (req, res) => {
  try {
    const { shopId, barberId, date } = req.params
    const { serviceId } = req.query

    if (!serviceId) {
      return res.status(400).json({ message: 'Se requiere el serviceId como query param' })
    }

    const availability = await appointmentService.getAvailability(shopId, barberId, date, serviceId)
    res.status(200).json(availability)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Cliente crea una nueva cita
const createController = async (req, res) => {
  try {
    const appointment = await appointmentService.createAppointment(req.body, req.user.id)
    res.status(201).json({ message: 'Cita creada exitosamente', appointment })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Cliente ve sus citas
const getMyController = async (req, res) => {
  try {
    const appointments = await appointmentService.getMyAppointments(req.user.id)
    res.status(200).json({ appointments })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Dueño o barbero ve la agenda de la barbería
const getShopController = async (req, res) => {
  try {
    const appointments = await appointmentService.getShopAppointments(
      req.params.shopId,
      req.query,
      req.user.id,
      req.user.role
    )
    res.status(200).json({ appointments })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Confirmar cita → CONFIRMED
const confirmController = async (req, res) => {
  try {
    const appointment = await appointmentService.confirmAppointment(req.params.id, req.user.id, req.user.role)
    res.status(200).json({ message: 'Cita confirmada', appointment })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Cancelar cita → CANCELLED
const cancelController = async (req, res) => {
  try {
    const { cancelReason } = req.body
    const appointment = await appointmentService.cancelAppointment(req.params.id, req.user.id, req.user.role, cancelReason)
    res.status(200).json({ message: 'Cita cancelada', appointment })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Completar cita → COMPLETED
const completeController = async (req, res) => {
  try {
    const appointment = await appointmentService.completeAppointment(req.params.id, req.user.id, req.user.role)
    res.status(200).json({ message: 'Cita completada', appointment })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Marcar como no-show → NO_SHOW
const noShowController = async (req, res) => {
  try {
    const appointment = await appointmentService.noShowAppointment(req.params.id, req.user.id, req.user.role)
    res.status(200).json({ message: 'Cita marcada como no-show', appointment })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = {
  getAvailabilityController,
  createController,
  getMyController,
  getShopController,
  confirmController,
  cancelController,
  completeController,
  noShowController
}
