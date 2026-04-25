const express = require('express')
const router = express.Router()
const { getMyLoyaltyController, getClientsRankingController, redeemController } = require('../controllers/loyalty.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Loyalty
 *   description: Sistema de fidelización de clientes
 */

/**
 * @swagger
 * /api/loyalty/{shopId}:
 *   get:
 *     summary: Ver mis puntos de fidelidad en una barbería
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: "totalCuts, cuántos faltan para corte gratis, freeCutsAvailable"
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol CLIENT
 */
router.get('/:shopId', authMiddleware, requireRole('CLIENT'), getMyLoyaltyController)

/**
 * @swagger
 * /api/loyalty/shop/{shopId}/clients:
 *   get:
 *     summary: Ver ranking de clientes frecuentes
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: Lista de clientes ordenados por cortes acumulados
 *       400:
 *         description: Sin permiso sobre la barbería
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.get('/shop/:shopId/clients', authMiddleware, requireRole('OWNER'), getClientsRankingController)

/**
 * @swagger
 * /api/loyalty/redeem:
 *   post:
 *     summary: Canjear corte gratis
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barbershopId
 *             properties:
 *               barbershopId:
 *                 type: string
 *                 example: "uuid-de-la-barberia"
 *     responses:
 *       200:
 *         description: Corte gratis canjeado exitosamente
 *       400:
 *         description: No tienes cortes gratis disponibles o sin historial
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol CLIENT
 */
router.post('/redeem', authMiddleware, requireRole('CLIENT'), redeemController)

module.exports = router
