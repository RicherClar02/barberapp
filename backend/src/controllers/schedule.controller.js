const scheduleService = require('../services/schedule.service')

// El dueño crea o actualiza los horarios de la semana completa
// Body: { schedules: [{ dayOfWeek, openTime, closeTime, isOpen }, ...] }
const setWeekController = async (req, res) => {
  try {
    const { schedules } = req.body

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ message: 'Se requiere un array de horarios' })
    }

    const result = await scheduleService.setWeekSchedule(req.params.shopId, schedules, req.user.id)
    res.status(201).json({ message: 'Horarios guardados exitosamente', schedules: result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Retorna los horarios de una barbería — público
const getByShopController = async (req, res) => {
  try {
    const schedules = await scheduleService.getSchedulesByShop(req.params.shopId)
    res.status(200).json({ schedules })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Actualiza un día específico del horario
const updateDayController = async (req, res) => {
  try {
    const schedule = await scheduleService.updateDaySchedule(
      req.params.shopId,
      req.params.day,
      req.body,
      req.user.id
    )
    res.status(200).json({ message: 'Horario actualizado', schedule })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { setWeekController, getByShopController, updateDayController }
