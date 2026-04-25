const express = require('express')
const router = express.Router()
const { getBarberCardController } = require('../controllers/barber-card.controller')
const { authMiddleware } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: BarberCard
 *   description: Tarjeta visual completa del barbero
 */

/**
 * @swagger
 * /api/barber-card/{barberId}:
 *   get:
 *     summary: Obtener tarjeta completa del barbero
 *     description: |
 *       Retorna info del barbero, estadísticas del día, próximas citas y últimas reseñas.
 *       Los campos clientPhone y clientWhatsapp solo aparecen si el token pertenece a un BARBER u OWNER.
 *     tags: [BarberCard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del barbero
 *     responses:
 *       200:
 *         description: "{ barber, today, upcomingAppointments, recentReviews }"
 *       400:
 *         description: Barbero no encontrado
 *       401:
 *         description: Token no proporcionado
 */
router.get('/:barberId', authMiddleware, getBarberCardController)

module.exports = router
