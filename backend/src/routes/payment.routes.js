const express = require('express')
const router = express.Router()
const {
  cashPaymentController,
  getByAppointmentController,
  getShopPaymentsController,
  getSummaryController,
  refundController,
  stripeCreateIntentController,
  stripeWebhookController,
  stripeRefundController,
  epaycoCreateController,
  epaycoConfirmController,
  epaycoVerifyController
} = require('../controllers/payment.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Gestión de pagos, transacciones y dashboard financiero
 */

/**
 * @swagger
 * /api/payments/cash/{appointmentId}:
 *   post:
 *     summary: Registrar pago en efectivo
 *     description: Crea el pago con método CASH y status COMPLETED. Confirma la cita automáticamente.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       201:
 *         description: Pago en efectivo registrado y cita confirmada
 *       400:
 *         description: Cita no encontrada, ya tiene pago o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER o BARBER
 */
router.post('/cash/:appointmentId', authMiddleware, requireRole('OWNER', 'BARBER'), cashPaymentController)

/**
 * @swagger
 * /api/payments/appointment/{appointmentId}:
 *   get:
 *     summary: Ver pago de una cita específica
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Detalle del pago con información de la cita
 *       400:
 *         description: Cita no encontrada, sin pago o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo CLIENT (dueño de la cita) u OWNER
 */
router.get('/appointment/:appointmentId', authMiddleware, requireRole('CLIENT', 'OWNER'), getByAppointmentController)

/**
 * @swagger
 * /api/payments/shop/{shopId}:
 *   get:
 *     summary: Ver transacciones de una barbería
 *     description: Lista de pagos con filtros y resumen de total recaudado
 *     tags: [Payments]
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial del filtro
 *         example: "2025-06-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final del filtro
 *         example: "2025-06-30"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *         description: Filtrar por estado del pago
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [CARD, PSE, NEQUI, DAVIPLATA, CASH]
 *         description: Filtrar por método de pago
 *     responses:
 *       200:
 *         description: Lista de pagos con resumen (total recaudado, cantidad de transacciones)
 *       400:
 *         description: Barbería no encontrada o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.get('/shop/:shopId', authMiddleware, requireRole('OWNER'), getShopPaymentsController)

/**
 * @swagger
 * /api/payments/summary/{shopId}:
 *   get:
 *     summary: Dashboard financiero de la barbería
 *     description: "Ingresos del día/semana/mes, desglose por método de pago, top 5 servicios más vendidos, citas completadas vs canceladas"
 *     tags: [Payments]
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
 *         description: Resumen financiero completo
 *       400:
 *         description: Barbería no encontrada o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.get('/summary/:shopId', authMiddleware, requireRole('OWNER'), getSummaryController)

/**
 * @swagger
 * /api/payments/refund/{appointmentId}:
 *   post:
 *     summary: Registrar reembolso manual
 *     description: Cambia el estado del pago a REFUNDED. La integración con pasarelas se implementará posteriormente.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Reembolso registrado
 *       400:
 *         description: Sin pago, ya reembolsado, pago no completado o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER o ADMIN
 */
router.post('/refund/:appointmentId', authMiddleware, requireRole('OWNER', 'ADMIN'), refundController)

/**
 * @swagger
 * /api/payments/stripe/create-intent:
 *   post:
 *     summary: Crear intención de pago con Stripe
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointmentId]
 *             properties:
 *               appointmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: "{ clientSecret, paymentIntentId }"
 */
router.post('/stripe/create-intent', authMiddleware, requireRole('CLIENT'), stripeCreateIntentController)

/**
 * @swagger
 * /api/payments/stripe/webhook:
 *   post:
 *     summary: Webhook de Stripe (solo Stripe puede llamarlo)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: "{ received: true }"
 */
router.post('/stripe/webhook', require('express').raw({ type: 'application/json' }), stripeWebhookController)

/**
 * @swagger
 * /api/payments/stripe/refund:
 *   post:
 *     summary: Reembolsar pago con Stripe
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointmentId]
 *             properties:
 *               appointmentId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: "{ refundId, status, message }"
 */
router.post('/stripe/refund', authMiddleware, requireRole('OWNER', 'ADMIN'), stripeRefundController)

/**
 * @swagger
 * /api/payments/epayco/create:
 *   post:
 *     summary: Iniciar pago con ePayco (PSE, Nequi, Daviplata)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointmentId, method]
 *             properties:
 *               appointmentId:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [PSE, NEQUI, DAVIPLATA]
 *     responses:
 *       201:
 *         description: Respuesta de ePayco con URL o referencia de pago
 */
router.post('/epayco/create', authMiddleware, requireRole('CLIENT'), epaycoCreateController)

/**
 * @swagger
 * /api/payments/epayco/confirm:
 *   post:
 *     summary: Webhook de confirmación ePayco
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: "{ received: true }"
 */
router.post('/epayco/confirm', epaycoConfirmController)

/**
 * @swagger
 * /api/payments/epayco/verify/{transactionId}:
 *   get:
 *     summary: Verificar estado de un pago ePayco
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ status, amount, method, paymentStatus }"
 */
router.get('/epayco/verify/:transactionId', authMiddleware, requireRole('CLIENT'), epaycoVerifyController)

module.exports = router
