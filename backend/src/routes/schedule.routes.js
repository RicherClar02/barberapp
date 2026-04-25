const express = require('express')
const router = express.Router()
const { setWeekController, getByShopController, updateDayController } = require('../controllers/schedule.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Schedules
 *   description: Horarios de atención por barbería
 */

/**
 * @swagger
 * /api/schedules/{shopId}:
 *   get:
 *     summary: Ver horarios de una barbería
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: Horarios de los 7 días de la semana ordenados por día
 *       500:
 *         description: Error del servidor
 */
router.get('/:shopId', getByShopController)

/**
 * @swagger
 * /api/schedules/{shopId}:
 *   post:
 *     summary: Crear o actualizar horarios de la semana completa
 *     tags: [Schedules]
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
 *             required:
 *               - schedules
 *             properties:
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: integer
 *                       description: "0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado"
 *                       example: 1
 *                     openTime:
 *                       type: string
 *                       example: "08:00"
 *                     closeTime:
 *                       type: string
 *                       example: "20:00"
 *                     isOpen:
 *                       type: boolean
 *                       example: true
 *                 example:
 *                   - { dayOfWeek: 0, openTime: "09:00", closeTime: "14:00", isOpen: true }
 *                   - { dayOfWeek: 1, openTime: "08:00", closeTime: "20:00", isOpen: true }
 *                   - { dayOfWeek: 2, openTime: "08:00", closeTime: "20:00", isOpen: true }
 *                   - { dayOfWeek: 3, openTime: "08:00", closeTime: "20:00", isOpen: true }
 *                   - { dayOfWeek: 4, openTime: "08:00", closeTime: "20:00", isOpen: true }
 *                   - { dayOfWeek: 5, openTime: "08:00", closeTime: "20:00", isOpen: true }
 *                   - { dayOfWeek: 6, openTime: "08:00", closeTime: "18:00", isOpen: true }
 *     responses:
 *       201:
 *         description: Horarios guardados exitosamente
 *       400:
 *         description: Datos inválidos o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.post('/:shopId', authMiddleware, requireRole('OWNER'), setWeekController)

/**
 * @swagger
 * /api/schedules/{shopId}/{day}:
 *   put:
 *     summary: Actualizar horario de un día específico
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *       - in: path
 *         name: day
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: "Día de la semana (0=Domingo, 1=Lunes ... 6=Sábado)"
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openTime:
 *                 type: string
 *                 example: "09:00"
 *               closeTime:
 *                 type: string
 *                 example: "18:00"
 *               isOpen:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Horario del día actualizado
 *       400:
 *         description: Día inválido, sin permiso o sin horario registrado
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.put('/:shopId/:day', authMiddleware, requireRole('OWNER'), updateDayController)

module.exports = router
