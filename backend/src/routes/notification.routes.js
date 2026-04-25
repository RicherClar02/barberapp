const express = require('express')
const router = express.Router()
const {
  savePreferencesController,
  getPreferencesController,
  getMyNotificationsController,
  markAsReadController,
  markAllAsReadController
} = require('../controllers/notification.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notificaciones y preferencias de envío (WhatsApp/Push)
 */

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Ver mis preferencias de notificación
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferencias actuales del cliente
 *       401:
 *         description: Token no proporcionado
 */
router.get('/preferences', authMiddleware, getPreferencesController)

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Guardar preferencias de notificación
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               whatsappNumber:
 *                 type: string
 *                 example: "+573001234567"
 *               preferWhatsapp:
 *                 type: boolean
 *                 example: true
 *               preferPush:
 *                 type: boolean
 *                 example: false
 *               reminderEnabled:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferencias guardadas
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token no proporcionado
 */
router.put('/preferences', authMiddleware, savePreferencesController)

/**
 * @swagger
 * /api/notifications/my:
 *   get:
 *     summary: Ver historial de notificaciones
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Últimas 50 notificaciones del usuario
 *       401:
 *         description: Token no proporcionado
 */
router.get('/my', authMiddleware, getMyNotificationsController)

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Marcar todas las notificaciones como leídas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas marcadas como leídas
 *       401:
 *         description: Token no proporcionado
 */
router.put('/read-all', authMiddleware, markAllAsReadController)

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Marcar una notificación como leída
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación marcada como leída
 *       400:
 *         description: Notificación no encontrada o no pertenece al usuario
 *       401:
 *         description: Token no proporcionado
 */
router.put('/:id/read', authMiddleware, markAsReadController)

module.exports = router
