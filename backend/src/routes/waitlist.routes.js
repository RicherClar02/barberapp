const express = require('express')
const router = express.Router()
const { joinController, getMyController, leaveController, getShopController } = require('../controllers/waitlist.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Waitlist
 *   description: Lista de espera para citas
 */

/**
 * @swagger
 * /api/waitlist:
 *   post:
 *     summary: Unirse a la lista de espera
 *     tags: [Waitlist]
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
 *               - barberId
 *               - serviceId
 *               - date
 *             properties:
 *               barbershopId:
 *                 type: string
 *               barberId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-15"
 *               preferredTime:
 *                 type: string
 *                 example: "10:00"
 *     responses:
 *       201:
 *         description: Unido a la lista de espera
 *       400:
 *         description: Ya estás en la lista o datos inválidos
 *       403:
 *         description: Solo rol CLIENT
 */
router.post('/', authMiddleware, requireRole('CLIENT'), joinController)

/**
 * @swagger
 * /api/waitlist/my:
 *   get:
 *     summary: Ver mis listas de espera activas
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de esperas activas con posición y estado
 *       403:
 *         description: Solo rol CLIENT
 */
router.get('/my', authMiddleware, requireRole('CLIENT'), getMyController)

/**
 * @swagger
 * /api/waitlist/shop/{shopId}:
 *   get:
 *     summary: Ver lista de espera de la barbería
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: barberId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de espera con nombre cliente, whatsapp, servicio y posición
 *       400:
 *         description: Sin permiso sobre la barbería
 *       403:
 *         description: Solo OWNER o BARBER
 */
router.get('/shop/:shopId', authMiddleware, requireRole('OWNER', 'BARBER'), getShopController)

/**
 * @swagger
 * /api/waitlist/{id}:
 *   delete:
 *     summary: Salir de la lista de espera
 *     tags: [Waitlist]
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
 *         description: Saliste de la lista de espera
 *       400:
 *         description: Entrada no encontrada o no pertenece al usuario
 *       403:
 *         description: Solo rol CLIENT
 */
router.delete('/:id', authMiddleware, requireRole('CLIENT'), leaveController)

module.exports = router
