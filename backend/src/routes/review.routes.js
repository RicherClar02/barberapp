const express = require('express')
const router = express.Router()
const { createController, getByShopController, getByBarberController, deleteController } = require('../controllers/review.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Reseñas y valoraciones de barberías y barberos
 */

/**
 * @swagger
 * /api/reviews/barbershop/{shopId}:
 *   get:
 *     summary: Ver reseñas de una barbería
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Reseñas por página
 *     responses:
 *       200:
 *         description: Lista de reseñas con paginación, promedio y total
 *       500:
 *         description: Error del servidor
 */
router.get('/barbershop/:shopId', getByShopController)

/**
 * @swagger
 * /api/reviews/barber/{barberId}:
 *   get:
 *     summary: Ver reseñas de un barbero
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del barbero
 *     responses:
 *       200:
 *         description: Lista de reseñas del barbero con promedio y total
 *       500:
 *         description: Error del servidor
 */
router.get('/barber/:barberId', getByBarberController)

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Crear una reseña para una cita completada
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - rating
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 example: "uuid-de-la-cita"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Excelente servicio, muy profesional"
 *     responses:
 *       201:
 *         description: Reseña creada exitosamente
 *       400:
 *         description: Cita no completada, ya reseñada, rating inválido o cita no pertenece al cliente
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol CLIENT
 */
router.post('/', authMiddleware, requireRole('CLIENT'), createController)

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Eliminar una reseña inapropiada
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la reseña
 *     responses:
 *       200:
 *         description: Reseña eliminada
 *       400:
 *         description: Reseña no encontrada
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol ADMIN
 */
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteController)

module.exports = router
