const express = require('express')
const router = express.Router()
const { sendMessage, getConversationHistory } = require('../controllers/chatbot.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')
const { chatbotLimiter } = require('../middleware/rateLimiters')
const { validateChatMessage } = require('../middleware/validate.middleware')

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: Asistente virtual de barbería con IA
 */

/**
 * @swagger
 * /api/chatbot/message:
 *   post:
 *     summary: Enviar mensaje al asistente virtual
 *     tags: [Chatbot]
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
 *               - text
 *             properties:
 *               barbershopId:
 *                 type: string
 *                 example: "uuid-de-la-barberia"
 *               text:
 *                 type: string
 *                 example: "Quiero reservar un corte el viernes a las 10am"
 *     responses:
 *       200:
 *         description: Respuesta del asistente con intent detectado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: object
 *                   description: Mensaje guardado en BD
 *                 intent:
 *                   type: string
 *                   enum: [book_appointment, cancel_appointment, check_availability, get_prices, get_hours, faq]
 *                 reply:
 *                   type: string
 *                   example: "¡Claro! ¿Con cuál barbero te gustaría reservar?"
 *       400:
 *         description: Faltan campos requeridos
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo clientes pueden usar el chatbot
 */
router.post('/message', authMiddleware, requireRole('CLIENT'), chatbotLimiter, validateChatMessage, sendMessage)

/**
 * @swagger
 * /api/chatbot/history/{barbershopId}:
 *   get:
 *     summary: Obtener historial de conversación con una barbería
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barbershopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número máximo de mensajes
 *     responses:
 *       200:
 *         description: Lista de mensajes ordenados por fecha
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo clientes
 */
router.get('/history/:barbershopId', authMiddleware, requireRole('CLIENT'), getConversationHistory)

module.exports = router
