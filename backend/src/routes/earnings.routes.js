const express = require('express')
const router = express.Router()
const {
  getBarberEarningsController,
  getShopEarningsController,
  getBarberTodayController
} = require('../controllers/earnings.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Earnings
 *   description: Ganancias de barberos y barberías
 */

/**
 * @swagger
 * /api/earnings/barber/{barberId}:
 *   get:
 *     summary: Ganancias de un barbero en un período
 *     tags: [Earnings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del barbero
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: month
 *         description: Período de consulta
 *     responses:
 *       200:
 *         description: "{ totalEarned, cutsCount, period, barberPercentage, breakdown }"
 *       400:
 *         description: Barbero no encontrado o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo BARBER u OWNER
 */
router.get('/barber/:barberId', authMiddleware, requireRole('BARBER', 'OWNER'), getBarberEarningsController)

/**
 * @swagger
 * /api/earnings/shop/{shopId}:
 *   get:
 *     summary: Ganancias totales de una barbería en un período
 *     tags: [Earnings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: month
 *         description: Período de consulta
 *     responses:
 *       200:
 *         description: "{ totalRevenue, shopEarnings, barbersEarnings, cutsCount, topBarber, breakdown }"
 *       400:
 *         description: Barbería no encontrada o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER
 */
router.get('/shop/:shopId', authMiddleware, requireRole('OWNER'), getShopEarningsController)

/**
 * @swagger
 * /api/earnings/barber/{barberId}/today:
 *   get:
 *     summary: Vista rápida del día para un barbero
 *     tags: [Earnings]
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
 *         description: "{ todayEarnings, todayCuts, nextAppointment }"
 *       400:
 *         description: Barbero no encontrado o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo BARBER
 */
router.get('/barber/:barberId/today', authMiddleware, requireRole('BARBER'), getBarberTodayController)

module.exports = router
