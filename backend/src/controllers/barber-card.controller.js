const barberCardService = require('../services/barber-card.service')

const getBarberCardController = async (req, res) => {
  try {
    const card = await barberCardService.getBarberCard(
      req.params.barberId,
      req.user ? req.user.role : null
    )
    res.status(200).json(card)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { getBarberCardController }
