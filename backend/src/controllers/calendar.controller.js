const calendarService = require('../services/calendar.service')
const { safeMessage } = require('../utils/safeError')

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
    res.status(400).json({ message: safeMessage(error) })
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
    res.status(400).json({ message: safeMessage(error) })
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
    res.status(400).json({ message: safeMessage(error) })
  }
}

module.exports = { getBarberCalendarController, getBarberDayController, getShopDayController }
