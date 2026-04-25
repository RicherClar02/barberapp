const express = require('express')
const router = express.Router()
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')
const {
  getActiveController,
  getShopOffersController,
  createController,
  updateController,
  deleteController,
  validateCodeController
} = require('../controllers/offer.controller')

/**
 * @swagger
 * tags:
 *   name: Offers
 *   description: Gestión de ofertas y cupones de descuento
 */

/**
 * @swagger
 * /api/offers/active:
 *   get:
 *     summary: Obtener ofertas activas (pública, filtrable por barbería)
 *     tags: [Offers]
 *     parameters:
 *       - in: query
 *         name: barbershopId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: "{ offers: [...] }"
 */
router.get('/active', getActiveController)

/**
 * @swagger
 * /api/offers/validate:
 *   post:
 *     summary: Validar un código de descuento
 *     tags: [Offers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, barbershopId]
 *             properties:
 *               code:
 *                 type: string
 *               barbershopId:
 *                 type: integer
 *               serviceId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: "{ valid, discountType, discountValue, offer }"
 *       400:
 *         description: Código inválido o expirado
 */
router.post('/validate', validateCodeController)

/**
 * @swagger
 * /api/offers/shop/{shopId}:
 *   get:
 *     summary: Ver todas las ofertas de una barbería
 *     tags: [Offers]
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
 *         description: "{ offers: [...] }"
 *       403:
 *         description: Solo OWNER
 */
router.get('/shop/:shopId', authMiddleware, requireRole('OWNER'), getShopOffersController)

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Crear una nueva oferta
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barbershopId, code, discountType, discountValue, startsAt, endsAt]
 *             properties:
 *               barbershopId:
 *                 type: integer
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               discountValue:
 *                 type: number
 *               maxUses:
 *                 type: integer
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *               serviceId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: "{ message, offer }"
 *       400:
 *         description: Error de validación o plan no permite ofertas
 */
router.post('/', authMiddleware, requireRole('OWNER'), createController)

/**
 * @swagger
 * /api/offers/{id}:
 *   put:
 *     summary: Actualizar una oferta
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               discountValue:
 *                 type: number
 *               maxUses:
 *                 type: integer
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: "{ message, offer }"
 */
router.put('/:id', authMiddleware, requireRole('OWNER'), updateController)

/**
 * @swagger
 * /api/offers/{id}:
 *   delete:
 *     summary: Desactivar una oferta
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: "{ message: 'Oferta desactivada' }"
 */
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteController)

module.exports = router
