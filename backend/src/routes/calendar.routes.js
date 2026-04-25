const express = require('express')
const router = express.Router()
const { getBarberCalendarController, getBarberDayController, getShopDayController } = require('../controllers/calendar.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Calendar
 *   description: Calendario del barbero y agenda de la barbería
 */

/**
 * @swagger
 * /api/calendar/barber/{barberId}:
 *   get:
 *     summary: Ver calendario del barbero (mensual o semanal)
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: "2025-06"
 *         description: "Mes en formato YYYY-MM"
 *       - in: query
 *         name: week
 *         schema:
 *           type: string
 *           example: "2025-W24"
 *         description: "Semana ISO en formato YYYY-WNN"
 *     responses:
 *       200:
 *         description: "Array de días con totalAppointments, completedAppointments, cancelledAppointments, occupiedSlots, freeSlots, earnings"
 *       400:
 *         description: Barbero no encontrado o sin permiso
 *       403:
 *         description: Solo BARBER u OWNER
 */
router.get('/barber/:barberId', authMiddleware, requireRole('BARBER', 'OWNER'), getBarberCalendarController)

/**
 * @swagger
 * /api/calendar/barber/{barberId}/day/{date}:
 *   get:
 *     summary: Vista detallada de un día del barbero
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-15"
 *     responses:
 *       200:
 *         description: "Lista de citas con cliente (nombre, phone, whatsapp), servicio, y ganancias por cita"
 *       400:
 *         description: Barbero no encontrado o sin permiso
 *       403:
 *         description: Solo BARBER u OWNER
 */
router.get('/barber/:barberId/day/:date', authMiddleware, requireRole('BARBER', 'OWNER'), getBarberDayController)

/**
 * @swagger
 * /api/calendar/shop/{shopId}/day/{date}:
 *   get:
 *     summary: Agenda completa de la barbería en un día (columnas por barbero)
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-15"
 *     responses:
 *       200:
 *         description: Array de barberos, cada uno con sus citas del día
 *       400:
 *         description: Barbería no encontrada o sin permiso
 *       403:
 *         description: Solo OWNER
 */
router.get('/shop/:shopId/day/:date', authMiddleware, requireRole('OWNER'), getShopDayController)

module.exports = router
