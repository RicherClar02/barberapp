const reviewService = require('../services/review.service')

// Cliente crea una reseña para una cita completada
const createController = async (req, res) => {
  try {
    const review = await reviewService.createReview(req.body, req.user.id)
    res.status(201).json({ message: 'Reseña creada exitosamente', review })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Ver reseñas de una barbería con paginación
const getByShopController = async (req, res) => {
  try {
    const result = await reviewService.getReviewsByShop(req.params.shopId, req.query)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Ver reseñas de un barbero
const getByBarberController = async (req, res) => {
  try {
    const result = await reviewService.getReviewsByBarber(req.params.barberId)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Admin elimina una reseña inapropiada
const deleteController = async (req, res) => {
  try {
    const result = await reviewService.deleteReview(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = { createController, getByShopController, getByBarberController, deleteController }
