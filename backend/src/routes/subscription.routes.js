const express = require('express')
const router = express.Router()
const { createController, getMyController, getAllController, cancelAutoRenewController, checkoutController, subscriptionWebhookController } = require('../controllers/subscription.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Suscripciones de barberías (BASIC $30.000 / STANDARD $60.000 / PREMIUM $120.000 COP/mes)
 */

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Crear o renovar suscripción para una barbería
 *     tags: [Subscriptions]
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
 *               - plan
 *               - months
 *             properties:
 *               barbershopId:
 *                 type: string
 *               plan:
 *                 type: string
 *                 enum: [BASIC, STANDARD, PREMIUM]
 *                 example: PREMIUM
 *               months:
 *                 type: integer
 *                 example: 3
 *                 description: Número de meses a pagar
 *               paymentMethod:
 *                 type: string
 *                 example: "NEQUI"
 *     responses:
 *       201:
 *         description: Suscripción creada/renovada. Plan actualizado en barbería. PREMIUM activa isFeatured.
 *       400:
 *         description: Plan inválido, barbería no encontrada o sin permiso
 *       403:
 *         description: Solo OWNER
 */
router.post('/', authMiddleware, requireRole('OWNER'), createController)

/**
 * @swagger
 * /api/subscriptions/my:
 *   get:
 *     summary: Ver suscripciones activas de mis barberías
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista con plan, estado, días restantes y fecha de vencimiento
 *       403:
 *         description: Solo OWNER
 */
router.get('/my', authMiddleware, requireRole('OWNER'), getMyController)

/**
 * @swagger
 * /api/subscriptions/all:
 *   get:
 *     summary: Ver todas las suscripciones (ADMIN)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, EXPIRED, CANCELLED, PENDING_PAYMENT]
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *           enum: [BASIC, STANDARD, PREMIUM]
 *     responses:
 *       200:
 *         description: Lista de todas las suscripciones con info de barbería
 *       403:
 *         description: Solo ADMIN
 */
router.get('/all', authMiddleware, requireRole('ADMIN'), getAllController)

/**
 * @swagger
 * /api/subscriptions/{id}/cancel:
 *   put:
 *     summary: Cancelar renovación automática de una suscripción
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Renovación automática desactivada. La suscripción sigue activa hasta su vencimiento.
 *       400:
 *         description: Suscripción no encontrada o sin permiso
 *       403:
 *         description: Solo OWNER
 */
router.put('/:id/cancel', authMiddleware, requireRole('OWNER'), cancelAutoRenewController)

/**
 * @swagger
 * /api/subscriptions/checkout:
 *   post:
 *     summary: Iniciar pago de suscripción con Stripe
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barbershopId, plan, months]
 *             properties:
 *               barbershopId:
 *                 type: string
 *               plan:
 *                 type: string
 *                 enum: [BASIC, STANDARD, PREMIUM]
 *               months:
 *                 type: integer
 *                 description: ">=12 aplica descuento anual"
 *     responses:
 *       201:
 *         description: "{ clientSecret, paymentIntentId, amount, plan, months }"
 */
router.post('/checkout', authMiddleware, requireRole('OWNER'), checkoutController)

/**
 * @swagger
 * /api/subscriptions/webhook:
 *   post:
 *     summary: Webhook Stripe para activar suscripción tras pago
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: "{ received: true }"
 */
router.post('/webhook', require('express').raw({ type: 'application/json' }), subscriptionWebhookController)

module.exports = router
