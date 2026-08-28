const barberCardService = require('../services/barber-card.service')
const { safeMessage } = require('../utils/safeError')

const getBarberCardController = async (req, res) => {
  try {
    const card = await barberCardService.getBarberCard(
      req.params.barberId,
      req.user || null
    )
    res.status(200).json(card)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

module.exports = { getBarberCardController }
