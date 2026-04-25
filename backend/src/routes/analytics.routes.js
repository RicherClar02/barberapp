const express = require('express')
const router = express.Router()
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')
const {
  shopOverviewController,
  shopClientsController,
  shopBarbersController,
  platformController
} = require('../controllers/analytics.controller')

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Estadísticas y reportes de rendimiento
 */

/**
 * @swagger
 * /api/analytics/shop/{shopId}/overview:
 *   get:
 *     summary: Resumen general de la barbería (ingresos, citas, tendencias)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: month
 *     responses:
 *       200:
 *         description: "{ revenue, appointmentsCount, topServices, topBarbers, busyHours, newClients, returningClients, comparisonVsPrior }"
 *       403:
 *         description: Solo OWNER o ADMIN
 */
router.get('/shop/:shopId/overview', authMiddleware, requireRole('OWNER', 'ADMIN'), shopOverviewController)

/**
 * @swagger
 * /api/analytics/shop/{shopId}/clients:
 *   get:
 *     summary: Análisis de clientes de la barbería
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: "{ totalClients, newThisMonth, topClients, retentionRate }"
 *       403:
 *         description: Solo OWNER o ADMIN
 */
router.get('/shop/:shopId/clients', authMiddleware, requireRole('OWNER', 'ADMIN'), shopClientsController)

/**
 * @swagger
 * /api/analytics/shop/{shopId}/barbers:
 *   get:
 *     summary: Rendimiento de los barberos de la barbería
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: "{ barbers: [{ name, cutsCount, revenue, avgRating, cancelRate }] }"
 *       403:
 *         description: Solo OWNER o ADMIN
 */
router.get('/shop/:shopId/barbers', authMiddleware, requireRole('OWNER', 'ADMIN'), shopBarbersController)

/**
 * @swagger
 * /api/analytics/platform:
 *   get:
 *     summary: Estadísticas globales de la plataforma
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ totalShops, totalUsers, totalAppointments, revenueByPlan, topShops }"
 *       403:
 *         description: Solo ADMIN
 */
router.get('/platform', authMiddleware, requireRole('ADMIN'), platformController)

module.exports = router
