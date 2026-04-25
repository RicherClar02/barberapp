const express = require('express')
const router = express.Router()
const {
  getAvailabilityController,
  createController,
  getMyController,
  getShopController,
  confirmController,
  cancelController,
  completeController,
  noShowController
} = require('../controllers/appointment.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Gestión de citas y disponibilidad
 */

/**
 * @swagger
 * /api/appointments/availability/{shopId}/{barberId}/{date}:
 *   get:
 *     summary: Consultar slots disponibles de un barbero en una fecha
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del barbero
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha a consultar
 *         example: "2025-06-15"
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del servicio (para calcular duración de slots)
 *     responses:
 *       200:
 *         description: Lista de slots disponibles con startTime y endTime
 *       400:
 *         description: serviceId no proporcionado, barbero no encontrado o servicio inactivo
 */
router.get('/availability/:shopId/:barberId/:date', getAvailabilityController)

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Crear una nueva cita
 *     tags: [Appointments]
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
 *               - startTime
 *             properties:
 *               barbershopId:
 *                 type: string
 *                 example: "uuid-de-la-barberia"
 *               barberId:
 *                 type: string
 *                 example: "uuid-del-barbero"
 *               serviceId:
 *                 type: string
 *                 example: "uuid-del-servicio"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-15"
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               notes:
 *                 type: string
 *                 example: "Prefiero degradado bajo"
 *     responses:
 *       201:
 *         description: Cita creada con estado PENDING
 *       400:
 *         description: Validación fallida (barbería inactiva, barbero no pertenece, conflicto de horario, etc.)
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol CLIENT
 */
router.post('/', authMiddleware, requireRole('CLIENT'), createController)

/**
 * @swagger
 * /api/appointments/my:
 *   get:
 *     summary: Ver mis citas (cliente autenticado)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de citas del cliente con detalle de barbería, barbero y servicio
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol CLIENT
 */
router.get('/my', authMiddleware, requireRole('CLIENT'), getMyController)

/**
 * @swagger
 * /api/appointments/shop/{shopId}:
 *   get:
 *     summary: Ver agenda de la barbería
 *     tags: [Appointments]
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
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar por fecha
 *         example: "2025-06-15"
 *       - in: query
 *         name: barberId
 *         schema:
 *           type: string
 *         description: Filtrar por barbero
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Lista de citas de la barbería con cliente, barbero y servicio
 *       400:
 *         description: Sin permiso sobre la barbería
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER o BARBER
 */
router.get('/shop/:shopId', authMiddleware, requireRole('OWNER', 'BARBER'), getShopController)

/**
 * @swagger
 * /api/appointments/{id}/confirm:
 *   put:
 *     summary: Confirmar una cita pendiente
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita confirmada (PENDING → CONFIRMED)
 *       400:
 *         description: Cita no encontrada, no está pendiente o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER o BARBER
 */
router.put('/:id/confirm', authMiddleware, requireRole('OWNER', 'BARBER'), confirmController)

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   put:
 *     summary: Cancelar una cita
 *     description: CLIENT puede cancelar citas PENDING o CONFIRMED. OWNER puede cancelar cualquiera.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelReason:
 *                 type: string
 *                 example: "No puedo asistir por motivos personales"
 *     responses:
 *       200:
 *         description: Cita cancelada con razón guardada
 *       400:
 *         description: Cita no encontrada, estado no cancelable o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo CLIENT u OWNER
 */
router.put('/:id/cancel', authMiddleware, requireRole('CLIENT', 'OWNER', 'BARBER'), cancelController)

/**
 * @swagger
 * /api/appointments/{id}/complete:
 *   put:
 *     summary: Marcar cita como completada
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita marcada como COMPLETED
 *       400:
 *         description: Cita no encontrada, estado inválido o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER o BARBER
 */
router.put('/:id/complete', authMiddleware, requireRole('OWNER', 'BARBER'), completeController)

/**
 * @swagger
 * /api/appointments/{id}/no-show:
 *   put:
 *     summary: Marcar cita como no-show (cliente no asistió)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita marcada como NO_SHOW
 *       400:
 *         description: Cita no encontrada, estado inválido o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER o BARBER
 */
router.put('/:id/no-show', authMiddleware, requireRole('OWNER', 'BARBER'), noShowController)

module.exports = router
