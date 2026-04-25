const express = require('express')
const router = express.Router()
const { getConfigController, createConfigController, updateConfigController } = require('../controllers/config.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Config
 *   description: Configuración de barbería (porcentajes, fidelización, duración de citas)
 */

/**
 * @swagger
 * /api/config/{shopId}:
 *   get:
 *     summary: Ver configuración de una barbería
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: Configuración de la barbería
 *       404:
 *         description: No hay configuración para esta barbería
 */
router.get('/:shopId', getConfigController)

/**
 * @swagger
 * /api/config/{shopId}:
 *   post:
 *     summary: Crear configuración inicial de la barbería
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               barberPercentage:
 *                 type: number
 *                 example: 60
 *                 description: "Porcentaje para el barbero (debe sumar 100 con shopPercentage)"
 *               shopPercentage:
 *                 type: number
 *                 example: 40
 *                 description: "Porcentaje para la barbería"
 *               loyaltyEnabled:
 *                 type: boolean
 *                 example: true
 *               cutsForFreeService:
 *                 type: integer
 *                 example: 10
 *                 description: "Cada cuántos cortes hay uno gratis"
 *               cancellationWindowMin:
 *                 type: integer
 *                 example: 60
 *                 description: "Minutos antes para cancelar sin penalidad"
 *               appointmentDuration:
 *                 type: integer
 *                 example: 40
 *                 description: "Duración fija de cita en minutos"
 *               toleranceMinutes:
 *                 type: integer
 *                 example: 10
 *                 description: "Tolerancia de llegada en minutos"
 *     responses:
 *       201:
 *         description: Configuración creada
 *       400:
 *         description: Ya existe configuración, porcentajes no suman 100 o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.post('/:shopId', authMiddleware, requireRole('OWNER'), createConfigController)

/**
 * @swagger
 * /api/config/{shopId}:
 *   put:
 *     summary: Actualizar configuración de la barbería
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               barberPercentage:
 *                 type: number
 *                 example: 70
 *               shopPercentage:
 *                 type: number
 *                 example: 30
 *               loyaltyEnabled:
 *                 type: boolean
 *               cutsForFreeService:
 *                 type: integer
 *               appointmentDuration:
 *                 type: integer
 *               toleranceMinutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Configuración actualizada
 *       400:
 *         description: Porcentajes no suman 100, sin configuración o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.put('/:shopId', authMiddleware, requireRole('OWNER'), updateConfigController)

module.exports = router
