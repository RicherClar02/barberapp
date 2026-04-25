const calendarService = require('../services/calendar.service')

const getBarberCalendarController = async (req, res) => {
  try {
    const calendar = await calendarService.getBarberCalendar(
      req.params.barberId,
      req.query,
      req.user.id,
      req.user.role
    )
    res.status(200).json(calendar)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getBarberDayController = async (req, res) => {
  try {
    const day = await calendarService.getBarberDay(
      req.params.barberId,
      req.params.date,
      req.user.id,
      req.user.role
    )
    res.status(200).json(day)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getShopDayController = async (req, res) => {
  try {
    const day = await calendarService.getShopDay(
      req.params.shopId,
      req.params.date,
      req.user.id
    )
    res.status(200).json(day)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { getBarberCalendarController, getBarberDayController, getShopDayController }
